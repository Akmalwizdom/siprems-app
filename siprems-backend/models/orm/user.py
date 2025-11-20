"""User ORM model for authentication and user management."""

from datetime import datetime
from typing import Optional

from sqlalchemy import Column, Integer, String, Boolean, DateTime
from models.orm import Base


class User(Base):
    """
    User model for authentication and account management.

    Attributes:
        user_id: Unique user identifier (primary key).
        email: User email address (unique).
        full_name: User's full name.
        password_hash: Hashed password using bcrypt or similar.
        is_active: Account activation status.
        created_at: Account creation timestamp.
        updated_at: Last update timestamp.
    """

    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self) -> str:
        """String representation of User."""
        return f"<User(user_id={self.user_id}, email='{self.email}')>"

    def to_dict(self) -> dict:
        """
        Convert user to dictionary, excluding password hash.

        Returns:
            Dictionary representation of user data.
        """
        return {
            "user_id": self.user_id,
            "email": self.email,
            "full_name": self.full_name,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
