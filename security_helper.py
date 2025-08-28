#!/usr/bin/env python3
"""
🛡️ SUPRSS Security Helper
Utilitaire pour améliorer la sécurité des crédentiels et de l'application.

Usage:
    python security_helper.py encrypt-env        # Chiffre le fichier .env
    python security_helper.py decrypt-env        # Déchiffre le fichier .env
    python security_helper.py generate-keys      # Génère de nouvelles clés sécurisées
    python security_helper.py check-security     # Audit de sécurité basique
    python security_helper.py setup-security     # Configuration sécurité complète
    python security_helper.py production-mode    # Configure pour la production
"""

import os
import sys
import json
import base64
import hashlib
import secrets
from datetime import datetime
from pathlib import Path
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import getpass


class SUPRSSSecurityHelper:
    """Gestionnaire de sécurité pour SUPRSS"""
    
    def __init__(self):
        self.env_file = Path(".env")
        self.env_encrypted_file = Path(".env.encrypted")
        self.security_config_file = Path(".suprss_security.json")
        
    def derive_key(self, password: str, salt: bytes) -> bytes:
        """Dérive une clé de chiffrement à partir d'un mot de passe"""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        return base64.urlsafe_b64encode(kdf.derive(password.encode()))
    
    def encrypt_env_file(self):
        """Chiffre le fichier .env avec un mot de passe maître"""
        if not self.env_file.exists():
            print("❌ Fichier .env introuvable. Créez-le d'abord.")
            return False
            
        print("🔐 Chiffrement du fichier .env")
        password = getpass.getpass("Entrez un mot de passe maître pour chiffrer .env: ")
        confirm_password = getpass.getpass("Confirmez le mot de passe: ")
        
        if password != confirm_password:
            print("❌ Les mots de passe ne correspondent pas.")
            return False
            
        # Génération du sel
        salt = os.urandom(16)
        key = self.derive_key(password, salt)
        
        # Chiffrement
        fernet = Fernet(key)
        env_content = self.env_file.read_text()
        encrypted_content = fernet.encrypt(env_content.encode())
        
        # Sauvegarde du fichier chiffré
        encrypted_data = {
            "salt": base64.b64encode(salt).decode(),
            "encrypted_content": base64.b64encode(encrypted_content).decode(),
            "created_at": datetime.now().isoformat()
        }
        
        with open(self.env_encrypted_file, 'w') as f:
            json.dump(encrypted_data, f, indent=2)
            
        print(f"✅ Fichier .env chiffré sauvegardé : {self.env_encrypted_file}")
        print("⚠️  IMPORTANT : Gardez votre mot de passe maître en sécurité !")
        
        # Propose de supprimer le .env original
        print("\n📋 Options post-chiffrement :")
        print("1. Garder .env original (recommandé pour le développement)")
        print("2. Supprimer .env original (plus sécurisé pour la production)")
        print("3. L'application peut maintenant utiliser automatiquement .env.encrypted")
        
        response = input("Supprimer le fichier .env original ? (y/N): ")
        if response.lower() == 'y':
            self.env_file.unlink()
            print("🗑️  Fichier .env original supprimé.")
            print("💡 L'application déchiffrera automatiquement .env.encrypted au démarrage")
        else:
            print("📁 Fichier .env original conservé")
            
        return True
    
    def decrypt_env_file(self):
        """Déchiffre le fichier .env.encrypted"""
        if not self.env_encrypted_file.exists():
            print("❌ Fichier .env.encrypted introuvable.")
            return False
            
        print("🔓 Déchiffrement du fichier .env")
        password = getpass.getpass("Entrez le mot de passe maître: ")
        
        # Lecture du fichier chiffré
        with open(self.env_encrypted_file, 'r') as f:
            encrypted_data = json.load(f)
            
        salt = base64.b64decode(encrypted_data["salt"])
        encrypted_content = base64.b64decode(encrypted_data["encrypted_content"])
        
        # Déchiffrement
        key = self.derive_key(password, salt)
        fernet = Fernet(key)
        
        try:
            decrypted_content = fernet.decrypt(encrypted_content)
            env_content = decrypted_content.decode()
            
            # Sauvegarde du fichier déchiffré
            with open(self.env_file, 'w') as f:
                f.write(env_content)
                
            print(f"✅ Fichier .env restauré depuis {self.env_encrypted_file}")
            return True
            
        except Exception as e:
            print(f"❌ Erreur de déchiffrement : Mot de passe incorrect ?")
            return False
    
    def generate_secure_keys(self):
        """Génère de nouvelles clés sécurisées"""
        print("🔑 Génération de nouvelles clés sécurisées")
        
        keys = {
            "SECRET_KEY": secrets.token_hex(32),
            "JWT_REFRESH_SECRET": secrets.token_hex(32),
            "ENCRYPTION_KEY": secrets.token_hex(32),
            "CSRF_SECRET": secrets.token_hex(16)
        }
        
        print("\n📋 Nouvelles clés générées :")
        print("=" * 50)
        for key, value in keys.items():
            print(f"{key}={value}")
        print("=" * 50)
        
        # Propose de mettre à jour .env
        if self.env_file.exists():
            response = input("\nMettre à jour automatiquement .env ? (y/N): ")
            if response.lower() == 'y':
                self.update_env_file(keys)
                print("✅ Fichier .env mis à jour avec les nouvelles clés.")
                
        return keys
    
    def update_env_file(self, new_keys: dict):
        """Met à jour le fichier .env avec de nouvelles clés"""
        if not self.env_file.exists():
            print("❌ Fichier .env introuvable.")
            return False
            
        # Lecture du contenu actuel
        lines = self.env_file.read_text().split('\n')
        updated_lines = []
        
        for line in lines:
            if '=' in line and not line.strip().startswith('#'):
                key = line.split('=')[0].strip()
                if key in new_keys:
                    updated_lines.append(f"{key}={new_keys[key]}")
                else:
                    updated_lines.append(line)
            else:
                updated_lines.append(line)
        
        # Ajout des nouvelles clés si elles n'existent pas
        existing_keys = [line.split('=')[0].strip() for line in lines if '=' in line and not line.strip().startswith('#')]
        for key, value in new_keys.items():
            if key not in existing_keys:
                updated_lines.append(f"{key}={value}")
        
        # Sauvegarde
        self.env_file.write_text('\n'.join(updated_lines))
        return True
    
    def security_audit(self):
        """Effectue un audit de sécurité basique"""
        print("🔍 Audit de sécurité SUPRSS")
        print("=" * 40)
        
        issues = []
        recommendations = []
        
        # Vérification du fichier .env
        if self.env_file.exists():
            env_content = self.env_file.read_text()
            
            # Vérification SECRET_KEY
            if "SECRET_KEY=your-secret-key-here" in env_content:
                issues.append("❌ SECRET_KEY utilise la valeur par défaut")
                recommendations.append("Exécutez: python security_helper.py generate-keys")
            elif "SECRET_KEY=" in env_content:
                secret_key = [line for line in env_content.split('\n') if line.startswith('SECRET_KEY=')]
                if secret_key and len(secret_key[0].split('=')[1]) < 32:
                    issues.append("⚠️  SECRET_KEY trop courte (< 32 caractères)")
            
            # Vérification des mots de passe par défaut
            default_passwords = [
                "your-secret-key-here",
                "your-app-password", 
                "suprss_pass",
                "password123"
            ]
            for default in default_passwords:
                if default in env_content:
                    issues.append(f"❌ Mot de passe par défaut détecté: {default}")
            
            # Vérification des permissions du fichier
            permissions = oct(self.env_file.stat().st_mode)[-3:]
            if permissions != "600":
                issues.append(f"⚠️  Permissions .env trop ouvertes: {permissions} (recommandé: 600)")
                recommendations.append("Exécutez: chmod 600 .env")
        
        else:
            issues.append("❌ Fichier .env introuvable")
        
        # Vérification .gitignore
        gitignore = Path(".gitignore")
        if gitignore.exists():
            gitignore_content = gitignore.read_text()
            if ".env" not in gitignore_content:
                issues.append("❌ .env n'est pas dans .gitignore")
                recommendations.append("Ajoutez '.env' dans .gitignore")
        else:
            issues.append("⚠️  Fichier .gitignore introuvable")
        
        # Affichage des résultats
        if not issues:
            print("✅ Aucun problème de sécurité détecté !")
        else:
            print("\n🚨 Problèmes détectés :")
            for issue in issues:
                print(f"  {issue}")
                
            if recommendations:
                print("\n💡 Recommandations :")
                for rec in recommendations:
                    print(f"  {rec}")
        
        return len(issues) == 0
    
    def setup_security(self):
        """Configuration complète de la sécurité"""
        print("🛡️  Configuration sécurisée de SUPRSS")
        print("=" * 40)
        
        # 1. Génération de nouvelles clés
        print("\n1. Génération de clés sécurisées...")
        keys = self.generate_secure_keys()
        
        # 2. Configuration des permissions
        print("\n2. Configuration des permissions...")
        if self.env_file.exists():
            os.chmod(self.env_file, 0o600)
            print("✅ Permissions .env définies à 600")
        
        # 3. Vérification .gitignore
        print("\n3. Vérification .gitignore...")
        gitignore = Path(".gitignore")
        if gitignore.exists():
            gitignore_content = gitignore.read_text()
            if ".env" not in gitignore_content:
                gitignore.write_text(gitignore_content + "\n.env\n.env.encrypted\n.suprss_security.json\n")
                print("✅ .env ajouté à .gitignore")
            else:
                print("✅ .gitignore déjà configuré")
        
        # 4. Proposition de chiffrement
        print("\n4. Chiffrement du fichier .env...")
        response = input("Voulez-vous chiffrer le fichier .env ? (y/N): ")
        if response.lower() == 'y':
            self.encrypt_env_file()
        
        # 5. Création du fichier de configuration sécurisée
        security_config = {
            "security_version": "1.0",
            "last_audit": datetime.now().isoformat(),
            "security_features": {
                "encrypted_env": self.env_encrypted_file.exists(),
                "secure_permissions": True,
                "gitignore_configured": True
            }
        }
        
        with open(self.security_config_file, 'w') as f:
            json.dump(security_config, f, indent=2)
        
        print("\n✅ Configuration sécurisée terminée !")
        print("📝 Fichier de configuration créé : .suprss_security.json")
    
    def setup_production_mode(self):
        """Configure l'application pour un environnement de production sécurisé"""
        print("🏭 Configuration mode PRODUCTION")
        print("=" * 40)
        
        if not self.env_encrypted_file.exists():
            print("❌ Aucun fichier .env.encrypted trouvé.")
            print("💡 Chiffrez d'abord avec: python security_helper.py encrypt-env")
            return False
        
        # Supprime le .env original si il existe
        if self.env_file.exists():
            response = input("Supprimer .env original pour la production ? (y/N): ")
            if response.lower() == 'y':
                self.env_file.unlink()
                print("🗑️  Fichier .env supprimé pour la sécurité")
        
        # Instructions pour la production
        print("\n📋 Instructions pour le mode production :")
        print("1. Définissez la variable d'environnement SUPRSS_MASTER_PASSWORD")
        print("2. Ou l'application demandera le mot de passe au démarrage")
        print("3. Le fichier .env sera déchiffré automatiquement en mémoire")
        print("\n💡 Exemple Docker:")
        print("   docker run -e SUPRSS_MASTER_PASSWORD='votre-mot-de-passe' ...")
        
        return True


def main():
    """Point d'entrée principal"""
    helper = SUPRSSSecurityHelper()
    
    if len(sys.argv) < 2:
        print(__doc__)
        return
    
    command = sys.argv[1]
    
    commands = {
        'encrypt-env': helper.encrypt_env_file,
        'decrypt-env': helper.decrypt_env_file,
        'generate-keys': helper.generate_secure_keys,
        'check-security': helper.security_audit,
        'setup-security': helper.setup_security,
        'production-mode': helper.setup_production_mode
    }
    
    if command in commands:
        try:
            commands[command]()
        except KeyboardInterrupt:
            print("\n\n❌ Opération annulée.")
        except Exception as e:
            print(f"\n❌ Erreur : {e}")
    else:
        print(f"❌ Commande inconnue : {command}")
        print(__doc__)


if __name__ == "__main__":
    main()