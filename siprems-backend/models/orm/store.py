"""Store ORM model for store configuration and management."""

from datetime import datetime
from typing import Optional

from sqlalchemy import Column, Integer, String, DateTime
from models.orm.base import Base


class Store(Base):
    """
    Store model for managing store configuration and information.

    Attributes:
        store_id: Unique store identifier (primary key).
        user_id: Associated user ID (foreign key reference).
        name: Store name.
        address: Store address.
        created_at: Store creation timestamp.
        updated_at: Last update timestamp.
    """

    __tablename__ = "stores"

    store_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    address = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self) -> str:
        """String representation of Store."""
        return f"<Store(store_id={self.store_id}, name='{self.name}', user_id={self.user_id})>"

    def to_dict(self) -> dict:
        """
        Convert store to dictionary.

        Returns:
            Dictionary representation of store data.
        """
        return {
            "store_id": self.store_id,
            "user_id": self.user_id,
            "name": self.name,
            "address": self.address,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
