"""
SQLAlchemy database configuration and initialization.
"""
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, Session, sessionmaker
from sqlalchemy.pool import QueuePool
from utils.config import get_config
import logging

logger = logging.getLogger(__name__)

Base = declarative_base()


def get_database_url(config=None):
    """
    Build the database URL from configuration.

    Args:
        config: Configuration object (optional)

    Returns:
        Database URL string for SQLAlchemy
    """
    if config is None:
        config = get_config()

    url = (
        f"postgresql://{config.DB_USER}:{config.DB_PASSWORD}"
        f"@{config.DB_HOST}:{config.DB_PORT}/{config.DB_NAME}"
    )
    return url


def create_db_engine(config=None, echo=False):
    """
    Create and configure SQLAlchemy engine.

    Args:
        config: Configuration object (optional)
        echo: Whether to log SQL statements (optional)

    Returns:
        SQLAlchemy Engine instance
    """
    if config is None:
        config = get_config()

    database_url = get_database_url(config)

    engine = create_engine(
        database_url,
        poolclass=QueuePool,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        echo=echo,
        connect_args={
            "connect_timeout": 10,
            "options": "-c statement_timeout=30000",
        },
    )

    @event.listens_for(engine, "connect")
    def receive_connect(dbapi_conn, connection_record):
        """Enable foreign keys on PostgreSQL connections."""
        dbapi_conn.isolation_level = None

    return engine


def init_db(app=None, config=None):
    """
    Initialize database and create tables.

    Args:
        app: Flask application instance (optional)
        config: Configuration object (optional)

    Returns:
        Engine instance
    """
    if config is None:
        config = get_config()

    engine = create_db_engine(config)

    Base.metadata.create_all(engine)

    if app:
        app.db_engine = engine

    return engine


def get_session_factory(config=None):
    """
    Create session factory for database sessions.

    Args:
        config: Configuration object (optional)

    Returns:
        Session factory
    """
    if config is None:
        config = get_config()

    engine = create_db_engine(config)
    return sessionmaker(bind=engine, expire_on_commit=False)


def get_session(config=None):
    """
    Get a database session.

    Args:
        config: Configuration object (optional)

    Returns:
        SQLAlchemy Session instance
    """
    SessionFactory = get_session_factory(config)
    return SessionFactory()


class DatabaseManager:
    """Context manager for database operations."""

    def __init__(self, config=None):
        """Initialize database manager."""
        self.config = config or get_config()
        self.session = None

    def __enter__(self):
        """Enter context manager."""
        self.session = get_session(self.config)
        return self.session

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit context manager."""
        if exc_type is not None:
            self.session.rollback()
        self.session.close()
