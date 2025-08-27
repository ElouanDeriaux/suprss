"""
🛡️ Middleware de Sécurité Avancé pour SUPRSS
Ajoute des couches de sécurité supplémentaires à l'application.
"""

import os
import json
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
import requests
import logging
from dataclasses import dataclass
from pathlib import Path

# Configuration du logging sécurisé
security_logger = logging.getLogger("suprss_security")
security_logger.setLevel(logging.INFO)
handler = logging.FileHandler("security_audit.log")
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
security_logger.addHandler(handler)


@dataclass
class SecurityEvent:
    """Représente un événement de sécurité"""
    event_type: str
    user_ip: str
    user_agent: str
    timestamp: datetime
    details: Dict[str, Any]
    risk_level: str  # low, medium, high, critical


class GeolocationValidator:
    """Validateur de géolocalisation pour détecter les connexions anormales"""
    
    def __init__(self):
        self.allowed_countries = os.getenv("ALLOWED_COUNTRIES", "").split(",")
        self.blocked_countries = os.getenv("BLOCKED_COUNTRIES", "").split(",")
        self.cache_file = Path("ip_cache.json")
        self.ip_cache = self._load_ip_cache()
    
    def _load_ip_cache(self) -> dict:
        """Charge le cache des IPs"""
        if self.cache_file.exists():
            try:
                with open(self.cache_file, 'r') as f:
                    return json.load(f)
            except:
                pass
        return {}
    
    def _save_ip_cache(self):
        """Sauvegarde le cache des IPs"""
        try:
            with open(self.cache_file, 'w') as f:
                json.dump(self.ip_cache, f)
        except:
            pass
    
    def get_ip_info(self, ip_address: str) -> Optional[Dict[str, Any]]:
        """Récupère les informations de géolocalisation d'une IP"""
        if ip_address in self.ip_cache:
            cached = self.ip_cache[ip_address]
            if datetime.fromisoformat(cached['cached_at']) > datetime.now() - timedelta(days=7):
                return cached['data']
        
        try:
            # Utilisation d'un service de géolocalisation gratuit
            response = requests.get(f"http://ip-api.com/json/{ip_address}", timeout=5)
            if response.status_code == 200:
                data = response.json()
                if data['status'] == 'success':
                    self.ip_cache[ip_address] = {
                        'data': data,
                        'cached_at': datetime.now().isoformat()
                    }
                    self._save_ip_cache()
                    return data
        except:
            pass
        
        return None
    
    def is_ip_allowed(self, ip_address: str) -> tuple[bool, str]:
        """Vérifie si une IP est autorisée"""
        # IPs locales toujours autorisées
        if ip_address.startswith(('127.', '192.168.', '10.', '172.')) or ip_address == '::1':
            return True, "local_ip"
        
        ip_info = self.get_ip_info(ip_address)
        if not ip_info:
            return True, "geolocation_unavailable"  # Autoriser si géolocalisation non disponible
        
        country_code = ip_info.get('countryCode', '')
        
        # Vérification des pays bloqués
        if self.blocked_countries and country_code in self.blocked_countries:
            return False, f"blocked_country_{country_code}"
        
        # Vérification des pays autorisés
        if self.allowed_countries and country_code not in self.allowed_countries:
            return False, f"country_not_allowed_{country_code}"
        
        return True, f"allowed_country_{country_code}"


class SecurityAuditLogger:
    """Logger d'audit de sécurité"""
    
    def __init__(self):
        self.suspicious_ips = {}
        self.failed_attempts = {}
        self.max_failed_attempts = int(os.getenv("MAX_FAILED_ATTEMPTS", "5"))
        self.lockout_duration = int(os.getenv("LOCKOUT_DURATION_MINUTES", "15"))
    
    def log_security_event(self, event: SecurityEvent):
        """Enregistre un événement de sécurité"""
        security_logger.info(
            f"Security Event: {event.event_type} | IP: {event.user_ip} | "
            f"Risk: {event.risk_level} | Details: {json.dumps(event.details)}"
        )
        
        # Détection de tentatives répétées
        if event.event_type in ["failed_login", "invalid_token"]:
            self._track_failed_attempt(event.user_ip)
    
    def _track_failed_attempt(self, ip_address: str):
        """Suit les tentatives échouées par IP"""
        now = datetime.now()
        
        if ip_address not in self.failed_attempts:
            self.failed_attempts[ip_address] = []
        
        # Nettoyer les anciennes tentatives
        self.failed_attempts[ip_address] = [
            attempt for attempt in self.failed_attempts[ip_address]
            if now - attempt < timedelta(minutes=self.lockout_duration)
        ]
        
        # Ajouter la nouvelle tentative
        self.failed_attempts[ip_address].append(now)
        
        # Vérifier si l'IP doit être bloquée
        if len(self.failed_attempts[ip_address]) >= self.max_failed_attempts:
            self.suspicious_ips[ip_address] = now + timedelta(minutes=self.lockout_duration)
            
            security_logger.warning(
                f"IP {ip_address} blocked due to {len(self.failed_attempts[ip_address])} "
                f"failed attempts in {self.lockout_duration} minutes"
            )
    
    def is_ip_blocked(self, ip_address: str) -> bool:
        """Vérifie si une IP est bloquée"""
        if ip_address in self.suspicious_ips:
            if datetime.now() < self.suspicious_ips[ip_address]:
                return True
            else:
                # La période de blocage est expirée
                del self.suspicious_ips[ip_address]
        return False


class SecurityMiddleware:
    """Middleware de sécurité principal"""
    
    def __init__(self):
        self.geo_validator = GeolocationValidator()
        self.audit_logger = SecurityAuditLogger()
        self.security_enabled = os.getenv("ENABLE_ADVANCED_SECURITY", "true").lower() == "true"
        self.csrf_protection = os.getenv("ENABLE_CSRF_PROTECTION", "true").lower() == "true"
    
    async def security_check(self, request: Request, response: Response) -> Optional[Response]:
        """Effectue les vérifications de sécurité"""
        if not self.security_enabled:
            return None
        
        client_ip = self._get_client_ip(request)
        user_agent = request.headers.get("user-agent", "")
        
        # 1. Vérification des IPs bloquées
        if self.audit_logger.is_ip_blocked(client_ip):
            self._log_security_event(
                "blocked_ip_access", client_ip, user_agent,
                {"reason": "too_many_failed_attempts"}, "high"
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Trop de tentatives échouées. Réessayez plus tard."
            )
        
        # 2. Validation géographique
        if request.url.path.startswith("/auth/"):
            allowed, reason = self.geo_validator.is_ip_allowed(client_ip)
            if not allowed:
                self._log_security_event(
                    "geo_blocked_access", client_ip, user_agent,
                    {"reason": reason}, "medium"
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Accès non autorisé depuis votre localisation."
                )
        
        # 3. Détection d'anomalies dans les User-Agents
        if self._is_suspicious_user_agent(user_agent):
            self._log_security_event(
                "suspicious_user_agent", client_ip, user_agent,
                {"user_agent": user_agent}, "medium"
            )
        
        # 4. Protection CSRF pour les routes sensibles
        if self.csrf_protection and request.method in ["POST", "PUT", "DELETE"]:
            if not await self._validate_csrf_token(request):
                self._log_security_event(
                    "csrf_token_invalid", client_ip, user_agent,
                    {"path": request.url.path}, "high"
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Token CSRF invalide."
                )
        
        return None
    
    def _get_client_ip(self, request: Request) -> str:
        """Récupère l'IP réelle du client"""
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"
    
    def _is_suspicious_user_agent(self, user_agent: str) -> bool:
        """Détecte les User-Agents suspects"""
        suspicious_patterns = [
            "bot", "crawler", "spider", "scraper",
            "curl", "wget", "python-requests",
            "sqlmap", "nmap", "nikto"
        ]
        
        user_agent_lower = user_agent.lower()
        return any(pattern in user_agent_lower for pattern in suspicious_patterns)
    
    async def _validate_csrf_token(self, request: Request) -> bool:
        """Valide le token CSRF"""
        # Implémentation basique - à adapter selon vos besoins
        csrf_token = request.headers.get("X-CSRF-Token")
        if not csrf_token:
            return False
        
        # Ici vous devriez valider le token avec votre mécanisme de session
        # Pour l'exemple, on accepte tout token non vide
        return len(csrf_token) > 10
    
    def _log_security_event(self, event_type: str, ip: str, user_agent: str, 
                          details: Dict[str, Any], risk_level: str):
        """Enregistre un événement de sécurité"""
        event = SecurityEvent(
            event_type=event_type,
            user_ip=ip,
            user_agent=user_agent,
            timestamp=datetime.now(),
            details=details,
            risk_level=risk_level
        )
        self.audit_logger.log_security_event(event)


# Instance globale du middleware de sécurité
security_middleware = SecurityMiddleware()


async def security_middleware_handler(request: Request, call_next):
    """Handler du middleware de sécurité pour FastAPI"""
    response = Response()
    
    # Vérifications de sécurité avant traitement
    security_response = await security_middleware.security_check(request, response)
    if security_response:
        return security_response
    
    # Traitement normal de la requête
    response = await call_next(request)
    
    # Ajout d'headers de sécurité
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = "default-src 'self'"
    
    return response


def log_login_attempt(ip_address: str, user_agent: str, success: bool, username: str = ""):
    """Fonction utilitaire pour logger les tentatives de connexion"""
    event_type = "successful_login" if success else "failed_login"
    risk_level = "low" if success else "medium"
    
    event = SecurityEvent(
        event_type=event_type,
        user_ip=ip_address,
        user_agent=user_agent,
        timestamp=datetime.now(),
        details={"username": username, "success": success},
        risk_level=risk_level
    )
    
    security_middleware.audit_logger.log_security_event(event)