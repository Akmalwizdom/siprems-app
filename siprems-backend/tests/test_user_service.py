"""Unit tests for UserService."""
import pytest

from services.user_service import UserService
from utils.password_handler import PasswordHandler


class TestUserService:
    """Test cases for UserService."""

    def test_register_user_success(self):
        """Test successful user registration."""
        user = UserService.register_user(
            email="newuser@example.com", full_name="New User", password="SecurePass123!"
        )

        assert user["email"] == "newuser@example.com"
        assert user["full_name"] == "New User"
        assert "user_id" in user

    def test_register_user_weak_password(self):
        """Test registration with weak password."""
        with pytest.raises(ValueError) as exc_info:
            UserService.register_user(
                email="weak@example.com", full_name="Weak User", password="weak"
            )

        assert "strong" in str(exc_info.value).lower()

    def test_register_user_duplicate_email(self):
        """Test registration with duplicate email."""
        UserService.register_user(
            email="duplicate@example.com",
            full_name="User 1",
            password="SecurePass123!",
        )

        with pytest.raises(ValueError) as exc_info:
            UserService.register_user(
                email="duplicate@example.com",
                full_name="User 2",
                password="SecurePass456!",
            )

        assert "already registered" in str(exc_info.value)

    def test_login_user_success(self):
        """Test successful user login."""
        UserService.register_user(
            email="logintest@example.com",
            full_name="Login Test",
            password="SecurePass123!",
        )

        result = UserService.login_user(
            email="logintest@example.com", password="SecurePass123!"
        )

        assert result["email"] == "logintest@example.com"
        assert "access_token" in result
        assert "refresh_token" in result

    def test_login_user_invalid_email(self):
        """Test login with non-existent email."""
        with pytest.raises(ValueError) as exc_info:
            UserService.login_user(
                email="nonexistent@example.com", password="SomePassword123!"
            )

        assert "invalid email or password" in str(exc_info.value).lower()

    def test_login_user_wrong_password(self):
        """Test login with wrong password."""
        UserService.register_user(
            email="wrongpass@example.com",
            full_name="Wrong Pass",
            password="CorrectPass123!",
        )

        with pytest.raises(ValueError) as exc_info:
            UserService.login_user(
                email="wrongpass@example.com", password="WrongPass123!"
            )

        assert "invalid email or password" in str(exc_info.value).lower()

    def test_get_user_profile(self):
        """Test getting user profile."""
        registered = UserService.register_user(
            email="profile@example.com",
            full_name="Profile User",
            password="SecurePass123!",
        )

        profile = UserService.get_user_profile(registered["user_id"])

        assert profile["email"] == "profile@example.com"
        assert profile["full_name"] == "Profile User"
        assert profile["is_active"] is True

    def test_get_user_profile_not_found(self):
        """Test getting profile for non-existent user."""
        with pytest.raises(ValueError) as exc_info:
            UserService.get_user_profile(9999)

        assert "not found" in str(exc_info.value)

    def test_change_password(self):
        """Test changing user password."""
        registered = UserService.register_user(
            email="changepass@example.com",
            full_name="Change Pass",
            password="OldPassword123!",
        )

        result = UserService.change_password(
            registered["user_id"], old_password="OldPassword123!", new_password="NewPassword456!"
        )

        assert "successfully" in result["message"].lower()

        login = UserService.login_user(
            email="changepass@example.com", password="NewPassword456!"
        )

        assert login["email"] == "changepass@example.com"

    def test_change_password_wrong_old(self):
        """Test changing password with wrong old password."""
        registered = UserService.register_user(
            email="changepass2@example.com",
            full_name="Change Pass 2",
            password="CorrectOldPass123!",
        )

        with pytest.raises(ValueError) as exc_info:
            UserService.change_password(
                registered["user_id"],
                old_password="WrongOldPass123!",
                new_password="NewPassword456!",
            )

        assert "incorrect" in str(exc_info.value).lower()

    def test_refresh_access_token(self):
        """Test refreshing access token."""
        registered = UserService.register_user(
            email="refresh@example.com",
            full_name="Refresh User",
            password="SecurePass123!",
        )

        login = UserService.login_user(
            email="refresh@example.com", password="SecurePass123!"
        )

        refresh = UserService.refresh_access_token(login["refresh_token"])

        assert "access_token" in refresh
        assert "refresh_token" in refresh

    def test_refresh_access_token_invalid(self):
        """Test refreshing with invalid token."""
        with pytest.raises(ValueError) as exc_info:
            UserService.refresh_access_token("invalid.token.here")

        assert "invalid" in str(exc_info.value).lower()
