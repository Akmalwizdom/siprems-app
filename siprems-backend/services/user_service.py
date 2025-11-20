"""User service for authentication operations."""
from utils.models_orm import User
from utils.database import get_session, DatabaseManager
from utils.password_handler import PasswordHandler
from utils.jwt_handler import JWTHandler
from sqlalchemy.exc import IntegrityError


class UserService:
    """User service for authentication operations."""

    @staticmethod
    def register_user(email, full_name, password):
        """Register a new user."""
        with DatabaseManager() as session:
            try:
                existing_user = session.query(User).filter(User.email == email).first()
                if existing_user:
                    raise ValueError("Email already registered")

                is_strong, message = PasswordHandler.is_password_strong(password)
                if not is_strong:
                    raise ValueError(message)

                password_hash = PasswordHandler.hash_password(password)

                user = User(
                    email=email,
                    full_name=full_name,
                    password_hash=password_hash,
                    is_active=True,
                )
                session.add(user)
                session.commit()

                return {
                    "user_id": user.user_id,
                    "email": user.email,
                    "full_name": user.full_name,
                    "created_at": user.created_at.isoformat(),
                }
            except IntegrityError:
                session.rollback()
                raise ValueError("Email already registered")
            except Exception as e:
                session.rollback()
                raise e

    @staticmethod
    def login_user(email, password):
        """Authenticate user and return tokens."""
        with DatabaseManager() as session:
            user = session.query(User).filter(User.email == email).first()

            if not user:
                raise ValueError("Invalid email or password")

            if not user.is_active:
                raise ValueError("Account is deactivated")

            if not PasswordHandler.verify_password(user.password_hash, password):
                raise ValueError("Invalid email or password")

            access_token = JWTHandler.generate_access_token(user.user_id, user.email)
            refresh_token = JWTHandler.generate_refresh_token(
                user.user_id, user.email
            )

            return {
                "user_id": user.user_id,
                "email": user.email,
                "full_name": user.full_name,
                "access_token": access_token,
                "refresh_token": refresh_token,
            }

    @staticmethod
    def refresh_access_token(refresh_token):
        """Generate new access token using refresh token."""
        payload = JWTHandler.verify_token(refresh_token, token_type="refresh")

        if not payload:
            raise ValueError("Invalid or expired refresh token")

        access_token = JWTHandler.generate_access_token(
            payload.get("user_id"), payload.get("email")
        )

        return {"access_token": access_token, "refresh_token": refresh_token}

    @staticmethod
    def get_user_profile(user_id):
        """Get user profile information."""
        with DatabaseManager() as session:
            user = session.query(User).filter(User.user_id == user_id).first()

            if not user:
                raise ValueError("User not found")

            return {
                "user_id": user.user_id,
                "email": user.email,
                "full_name": user.full_name,
                "created_at": user.created_at.isoformat(),
                "is_active": user.is_active,
            }

    @staticmethod
    def change_password(user_id, old_password, new_password):
        """Change user password."""
        with DatabaseManager() as session:
            user = session.query(User).filter(User.user_id == user_id).first()

            if not user:
                raise ValueError("User not found")

            if not PasswordHandler.verify_password(user.password_hash, old_password):
                raise ValueError("Current password is incorrect")

            is_strong, message = PasswordHandler.is_password_strong(new_password)
            if not is_strong:
                raise ValueError(message)

            new_password_hash = PasswordHandler.hash_password(new_password)
            user.password_hash = new_password_hash
            session.commit()

            return {"message": "Password changed successfully"}
