"""Database session management with SQLAlchemy ORM."""

from typing import Generator
from contextlib import contextmanager

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool

from utils.config import get_config


def create_db_engine(config=None) -> Engine:
    """
    Create a SQLAlchemy database engine with optimized pool settings.

    Args:
        config: Configuration object. If None, uses environment config.

    Returns:
        SQLAlchemy Engine instance with connection pooling.

    Raises:
        Exception: If database connection fails.
    """
    if config is None:
        config = get_config()

    database_url = (
        f"postgresql+psycopg2://{config.DB_USER}:{config.DB_PASSWORD}"
        f"@{config.DB_HOST}:{getattr(config, 'DB_PORT', 5432)}/{config.DB_NAME}"
    )

    engine = create_engine(
        database_url,
        poolclass=QueuePool,
        pool_size=10,
        max_overflow=20,
        pool_recycle=3600,
        pool_pre_ping=True,
        echo=False,
    )

    @event.listens_for(Engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        """Set connection defaults for PostgreSQL."""
        pass

    return engine


def create_session_factory(engine: Engine = None) -> sessionmaker:
    """
    Create a SQLAlchemy session factory.

    Args:
        engine: SQLAlchemy Engine instance. If None, creates new engine.

    Returns:
        Session factory for creating database sessions.
    """
    if engine is None:
        engine = create_db_engine()

    return sessionmaker(bind=engine, expire_on_commit=False)


# Global session factory
_SessionLocal = None


def init_db_session(config=None) -> sessionmaker:
    """
    Initialize the global database session factory.

    Args:
        config: Configuration object.

    Returns:
        Initialized session factory.
    """
    global _SessionLocal
    engine = create_db_engine(config)
    _SessionLocal = create_session_factory(engine)
    return _SessionLocal


def get_session() -> Session:
    """
    Get a new database session from the global factory.

    Returns:
        SQLAlchemy Session instance.

    Raises:
        RuntimeError: If database session not initialized.
    """
    if _SessionLocal is None:
        raise RuntimeError(
            "Database session not initialized. Call init_db_session() first."
        )
    return _SessionLocal()


@contextmanager
def get_db_session() -> Generator[Session, None, None]:
    """
    Context manager for database sessions with automatic cleanup.

    Yields:
        SQLAlchemy Session instance.

    Raises:
        Exception: Database operations exceptions.

    Example:
        with get_db_session() as session:
            user = session.query(User).filter_by(id=1).first()
    """
    session = get_session()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_db_engine() -> Engine:
    """
    Get the global database engine.

    Returns:
        SQLAlchemy Engine instance.

    Raises:
        RuntimeError: If database not initialized.
    """
    if _SessionLocal is None:
        raise RuntimeError(
            "Database not initialized. Call init_db_session() first."
        )
    return _SessionLocal.kw["bind"]
