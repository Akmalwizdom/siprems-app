"""SQLAlchemy Base configuration for ORM models."""

from sqlalchemy.orm import declarative_base

# Single Base instance shared across all models
Base = declarative_base()
