"""User data access layer using SQLAlchemy ORM."""

from datetime import datetime
from typing import Optional, Dict, Any

from sqlalchemy.orm import Session

from models.orm.user import User
from utils.db_session import get_db_session


class UserModel:
    """
    Data access layer for user operations.

    Handles all database operations related to user accounts including
    authentication, profile management, and account lifecycle.
    """

    @staticmethod
    def create_user(email: str, full_name: str, password_hash: str) -> Dict[str, Any]:
        """
        Create a new user account.

        Args:
            email: User email address (must be unique).
            full_name: User's full name.
            password_hash: Hashed password (use bcrypt or similar).

        Returns:
            Created user dictionary (excludes password hash).

        Raises:
            Exception: Database operation errors (e.g., duplicate email).
        """
        with get_db_session() as session:
            user = User(
                email=email,
                full_name=full_name,
                password_hash=password_hash,
                is_active=True,
            )
            session.add(user)
            session.flush()
            user_dict = user.to_dict()
        return user_dict

    @staticmethod
    def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a user by email address.

        Returns password hash for authentication verification.

        Args:
            email: User email address.

        Returns:
            User dictionary including password hash, or None if not found.

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            user = session.query(User).filter(User.email == email).first()

            if not user:
                return None

            user_dict = user.to_dict()
            user_dict["password_hash"] = user.password_hash
            return user_dict

    @staticmethod
    def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
        """
        Retrieve a user by user ID.

        Does not include password hash for security.

        Args:
            user_id: Unique user identifier.

        Returns:
            User dictionary or None if not found.

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            user = session.query(User).filter(User.user_id == user_id).first()
            return user.to_dict() if user else None

    @staticmethod
    def user_exists(email: str) -> bool:
        """
        Check if a user with the given email exists.

        Args:
            email: User email address to check.

        Returns:
            True if user exists, False otherwise.

        Raises:
            Exception: Database operation errors.
        """
        user = UserModel.get_user_by_email(email)
        return user is not None

    @staticmethod
    def update_user_last_login(user_id: int) -> None:
        """
        Update user's last login timestamp to current time.

        Args:
            user_id: Unique user identifier.

        Returns:
            None

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            user = session.query(User).filter(User.user_id == user_id).first()

            if user:
                user.updated_at = datetime.utcnow()
                session.flush()

    @staticmethod
    def update_user_password(user_id: int, password_hash: str) -> None:
        """
        Update a user's password.

        Args:
            user_id: Unique user identifier.
            password_hash: New hashed password (use bcrypt or similar).

        Returns:
            None

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            user = session.query(User).filter(User.user_id == user_id).first()

            if user:
                user.password_hash = password_hash
                user.updated_at = datetime.utcnow()
                session.flush()

    @staticmethod
    def deactivate_user(user_id: int) -> None:
        """
        Deactivate a user account.

        Marks the user as inactive. The user will not be able to log in.

        Args:
            user_id: Unique user identifier.

        Returns:
            None

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            user = session.query(User).filter(User.user_id == user_id).first()

            if user:
                user.is_active = False
                user.updated_at = datetime.utcnow()
                session.flush()

    @staticmethod
    def activate_user(user_id: int) -> None:
        """
        Activate a user account.

        Marks the user as active. The user will be able to log in.

        Args:
            user_id: Unique user identifier.

        Returns:
            None

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            user = session.query(User).filter(User.user_id == user_id).first()

            if user:
                user.is_active = True
                user.updated_at = datetime.utcnow()
                session.flush()
