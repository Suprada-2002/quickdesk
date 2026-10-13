from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

# Create database engine with connection pooling
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

# Thread-local session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for SQLAlchemy declarative models
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a scoped database session and guarantees closure."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
