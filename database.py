import os
from sqlmodel import create_engine, SQLModel
from models import User, Collection, Feed

# Configuration de la base de données avec support PostgreSQL et SQLite
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///suprss.db")

# Configuration spécifique selon le type de BDD
if DATABASE_URL.startswith("postgresql"):
    # Configuration PostgreSQL
    engine = create_engine(
        DATABASE_URL,
        echo=True,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        pool_recycle=300
    )
else:
    # Configuration SQLite (fallback)
    engine = create_engine(
        DATABASE_URL,
        echo=True,
        connect_args={"check_same_thread": False}
    )

def create_db_and_tables():
    """Créer toutes les tables de la base de données"""
    SQLModel.metadata.create_all(engine)

def get_database_url():
    """Retourner l'URL de la base de données actuelle"""
    return DATABASE_URL
