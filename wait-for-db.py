#!/usr/bin/env python3
"""
Script pour attendre que la base de données soit prête avant de démarrer l'application
"""
import os
import time
import sys
from sqlmodel import create_engine, Session, select

def wait_for_database(max_retries=30, delay=2):
    """Attendre que la base de données soit accessible"""
    database_url = os.getenv("DATABASE_URL", "sqlite:///suprss.db")
    
    print(f"🔄 Attente de la base de données: {database_url.split('@')[-1] if '@' in database_url else 'sqlite'}")
    
    for attempt in range(max_retries):
        try:
            engine = create_engine(database_url)
            with Session(engine) as session:
                session.exec(select(1))
            print("✅ Base de données accessible !")
            return True
        except Exception as e:
            print(f"⏳ Tentative {attempt + 1}/{max_retries} - Erreur: {e}")
            if attempt < max_retries - 1:
                time.sleep(delay)
            else:
                print("❌ Impossible de se connecter à la base de données")
                return False
    
    return False

if __name__ == "__main__":
    if not wait_for_database():
        sys.exit(1)
    print("🚀 Démarrage de l'application...")