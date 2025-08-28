#!/usr/bin/env python3
"""
🔐 SUPRSS Environment Loader
Module pour charger automatiquement le fichier .env (chiffré ou non).
"""

import os
import sys
import json
import base64
from pathlib import Path
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import getpass
from dotenv import load_dotenv


class EnvironmentLoader:
    """Gestionnaire intelligent de chargement des variables d'environnement"""
    
    def __init__(self):
        self.env_file = Path(".env")
        self.env_encrypted_file = Path(".env.encrypted")
        
    def derive_key(self, password: str, salt: bytes) -> bytes:
        """Dérive une clé de chiffrement à partir d'un mot de passe"""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        return base64.urlsafe_b64encode(kdf.derive(password.encode()))
    
    def decrypt_env_content(self, password: str) -> str:
        """Déchiffre le contenu du fichier .env.encrypted"""
        if not self.env_encrypted_file.exists():
            raise FileNotFoundError("Fichier .env.encrypted introuvable")
            
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
            return decrypted_content.decode()
        except Exception:
            raise ValueError("Mot de passe incorrect ou fichier corrompu")
    
    def create_temp_env_file(self, content: str) -> None:
        """Crée un fichier .env temporaire avec le contenu déchiffré"""
        with open(self.env_file, 'w') as f:
            f.write(content)
        # Sécuriser le fichier temporaire
        os.chmod(self.env_file, 0o600)
    
    def cleanup_temp_env_file(self) -> None:
        """Supprime le fichier .env temporaire"""
        if self.env_file.exists():
            self.env_file.unlink()
    
    def load_environment(self, auto_cleanup: bool = True) -> bool:
        """
        Charge les variables d'environnement intelligemment
        
        Args:
            auto_cleanup: Si True, supprime le fichier .env temporaire après chargement
            
        Returns:
            bool: True si les variables ont été chargées avec succès
        """
        # Cas 1: .env existe déjà (non chiffré)
        if self.env_file.exists():
            load_dotenv(self.env_file)
            return True
            
        # Cas 2: .env.encrypted existe, il faut déchiffrer
        if self.env_encrypted_file.exists():
            # Tentative de récupération du mot de passe depuis l'environnement
            master_password = os.getenv('SUPRSS_MASTER_PASSWORD')
            
            if not master_password:
                # Si pas de mot de passe en variable d'environnement, demander interactivement
                if sys.stdin.isatty():  # Mode interactif
                    print("Fichier .env chiffré détecté.")
                    master_password = getpass.getpass("Entrez le mot de passe maitre: ")
                else:
                    # Mode non-interactif (Docker, etc.)
                    raise EnvironmentError(
                        "Fichier .env chiffré détecté mais pas de mot de passe fourni. "
                        "Définissez SUPRSS_MASTER_PASSWORD ou déchiffrez manuellement avec: "
                        "python security_helper.py decrypt-env"
                    )
            
            try:
                # Déchiffrement
                env_content = self.decrypt_env_content(master_password)
                
                # Création du fichier temporaire
                self.create_temp_env_file(env_content)
                
                # Chargement des variables
                load_dotenv(self.env_file)
                
                # Nettoyage automatique si demandé
                if auto_cleanup:
                    self.cleanup_temp_env_file()
                
                print("Variables d'environnement chargées depuis .env.encrypted")
                return True
                
            except ValueError as e:
                raise EnvironmentError(f"Erreur de déchiffrement: {e}")
            except Exception as e:
                raise EnvironmentError(f"Erreur lors du chargement: {e}")
        
        # Cas 3: Aucun fichier trouvé
        raise FileNotFoundError("Aucun fichier .env ou .env.encrypted trouvé")


def load_env_smart(auto_cleanup: bool = True) -> bool:
    """
    Fonction d'aide pour charger automatiquement l'environnement
    
    Args:
        auto_cleanup: Si True, supprime le fichier .env temporaire après chargement
        
    Returns:
        bool: True si les variables ont été chargées avec succès
    """
    loader = EnvironmentLoader()
    return loader.load_environment(auto_cleanup=auto_cleanup)


# Chargement automatique si ce module est importé
if __name__ != "__main__":
    try:
        load_env_smart()
    except Exception as e:
        print(f"Avertissement: Impossible de charger l'environnement: {e}")


if __name__ == "__main__":
    # Test du module
    try:
        load_env_smart()
        print("Chargement de l'environnement reussi")
    except Exception as e:
        print(f"Erreur: {e}")
        sys.exit(1)