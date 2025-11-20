"""SQLAlchemy ORM models for SIPREMS backend."""

from sqlalchemy.orm import declarative_base

# Create a single Base instance that all models inherit from
Base = declarative_base()

# Import models after Base is created
from models.orm.user import User
from models.orm.product import Product
from models.orm.transaction import Transaction
from models.orm.event import Event

__all__ = ["Base", "User", "Product", "Transaction", "Event"]
