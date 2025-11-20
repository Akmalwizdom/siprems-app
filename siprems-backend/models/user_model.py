from utils.db import db_query, db_execute
from utils.password_handler import PasswordHandler
from datetime import datetime

class UserModel:
    """User data model for authentication"""
    
    @staticmethod
    def create_user(email, full_name, password_hash):
        """Create a new user"""
        query = """
            INSERT INTO users (email, full_name, password_hash, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING user_id, email, full_name, created_at
        """
        params = (email, full_name, password_hash, datetime.utcnow(), datetime.utcnow())
        result = db_execute(query, params)
        return result
    
    @staticmethod
    def get_user_by_email(email):
        """Get user by email"""
        query = """
            SELECT user_id, email, full_name, password_hash, created_at, updated_at, is_active
            FROM users
            WHERE email = %s
        """
        result = db_query(query, (email,), fetch_all=False)
        return result
    
    @staticmethod
    def get_user_by_id(user_id):
        """Get user by ID"""
        query = """
            SELECT user_id, email, full_name, created_at, updated_at, is_active
            FROM users
            WHERE user_id = %s
        """
        result = db_query(query, (user_id,), fetch_all=False)
        return result
    
    @staticmethod
    def user_exists(email):
        """Check if user exists"""
        user = UserModel.get_user_by_email(email)
        return user is not None
    
    @staticmethod
    def update_user_last_login(user_id):
        """Update user's last login timestamp"""
        query = """
            UPDATE users
            SET updated_at = %s
            WHERE user_id = %s
        """
        db_execute(query, (datetime.utcnow(), user_id))
    
    @staticmethod
    def update_user_password(user_id, password_hash):
        """Update user's password"""
        query = """
            UPDATE users
            SET password_hash = %s, updated_at = %s
            WHERE user_id = %s
        """
        db_execute(query, (password_hash, datetime.utcnow(), user_id))
    
    @staticmethod
    def deactivate_user(user_id):
        """Deactivate a user account"""
        query = """
            UPDATE users
            SET is_active = FALSE, updated_at = %s
            WHERE user_id = %s
        """
        db_execute(query, (datetime.utcnow(), user_id))
    
    @staticmethod
    def activate_user(user_id):
        """Activate a user account"""
        query = """
            UPDATE users
            SET is_active = TRUE, updated_at = %s
            WHERE user_id = %s
        """
        db_execute(query, (datetime.utcnow(), user_id))
