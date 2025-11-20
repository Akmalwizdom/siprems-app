from datetime import datetime
from typing import Optional, Dict, Any

from sqlalchemy import Column, Integer, String, Boolean, DateTime
from models.orm.base import Base
from utils.db_session import get_db_session

class User(Base):
    """
    User model for authentication and account management.
    Includes helper methods for Service Layer compatibility.
    """

    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    # last_login = Column(DateTime, nullable=True) # Opsional: aktifkan jika skema DB mendukung

    def __repr__(self) -> str:
        return f"<User(user_id={self.user_id}, email='{self.email}')>"

    def to_dict(self) -> Dict[str, Any]:
        """Convert user to dictionary, excluding password hash."""
        return {
            "user_id": self.user_id,
            "email": self.email,
            "full_name": self.full_name,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    # --- Helper Methods untuk Compatibility dengan UserService ---

    @staticmethod
    def user_exists(email: str) -> bool:
        """Check if a user exists by email."""
        with get_db_session() as session:
            return session.query(User).filter(User.email == email).first() is not None

    @staticmethod
    def create_user(email: str, full_name: str, password_hash: str) -> Dict[str, Any]:
        """Create a new user and return its dictionary representation."""
        with get_db_session() as session:
            new_user = User(
                email=email,
                full_name=full_name,
                password_hash=password_hash,
                is_active=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            session.add(new_user)
            session.commit()
            # Refresh untuk mendapatkan ID
            session.refresh(new_user)
            return new_user.to_dict()

    @staticmethod
    def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
        """Get full user data including password_hash for authentication."""
        with get_db_session() as session:
            user = session.query(User).filter(User.email == email).first()
            if user:
                data = user.to_dict()
                data['password_hash'] = user.password_hash  # Penting untuk login!
                return data
            return None

    @staticmethod
    def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
        """Get user data by ID."""
        with get_db_session() as session:
            user = session.query(User).filter(User.user_id == user_id).first()
            return user.to_dict() if user else None

    @staticmethod
    def update_user_last_login(user_id: int) -> None:
        """Update user's last login timestamp."""
        with get_db_session() as session:
            user = session.query(User).filter(User.user_id == user_id).first()
            if user:
                user.updated_at = datetime.utcnow()
                # user.last_login = datetime.utcnow() # Uncomment jika kolom ada di DB
                session.commit()

    @staticmethod
    def update_user_password(user_id: int, new_password_hash: str) -> None:
        """Update user's password."""
        with get_db_session() as session:
            user = session.query(User).filter(User.user_id == user_id).first()
            if user:
                user.password_hash = new_password_hash
                user.updated_at = datetime.utcnow()
                session.commit()