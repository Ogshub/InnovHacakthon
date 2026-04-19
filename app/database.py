"""
LinguaLink — SQLAlchemy Database Configuration
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import logging

logger = logging.getLogger(__name__)

# Replace in-memory pandas read with persistent SQLite database
SQLALCHEMY_DATABASE_URL = "sqlite:///./lingualink.db"

# connect_args={"check_same_thread": False} is needed only for SQLite
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """FastAPI Dependency for database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
