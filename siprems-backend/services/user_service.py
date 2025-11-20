from models.user_model import UserModel
from utils.password_handler import PasswordHandler
from utils.jwt_handler import JWTHandler

class UserService:
    """User service for authentication operations"""
    
    @staticmethod
    def register_user(email, full_name, password):
        """Register a new user"""
        # Check if user already exists
        if UserModel.user_exists(email):
            raise ValueError('Email already registered')
        
        # Validate password strength
        is_strong, message = PasswordHandler.is_password_strong(password)
        if not is_strong:
            raise ValueError(message)
        
        # Hash password
        password_hash = PasswordHandler.hash_password(password)
        
        # Create user
        user = UserModel.create_user(email, full_name, password_hash)
        
        if not user:
            raise Exception('Failed to create user')
        
        return user
    
    @staticmethod
    def login_user(email, password):
        """Authenticate user and return tokens"""
        # Get user by email
        user = UserModel.get_user_by_email(email)
        
        if not user:
            raise ValueError('Invalid email or password')
        
        if not user.get('is_active'):
            raise ValueError('Account is deactivated')
        
        # Verify password
        if not PasswordHandler.verify_password(user.get('password_hash'), password):
            raise ValueError('Invalid email or password')
        
        # Update last login
        UserModel.update_user_last_login(user.get('user_id'))
        
        # Generate tokens
        access_token = JWTHandler.generate_access_token(user.get('user_id'), user.get('email'))
        refresh_token = JWTHandler.generate_refresh_token(user.get('user_id'), user.get('email'))
        
        return {
            'user_id': user.get('user_id'),
            'email': user.get('email'),
            'full_name': user.get('full_name'),
            'access_token': access_token,
            'refresh_token': refresh_token
        }
    
    @staticmethod
    def refresh_access_token(refresh_token):
        """Generate new access token using refresh token"""
        payload = JWTHandler.verify_token(refresh_token, token_type='refresh')
        
        if not payload:
            raise ValueError('Invalid or expired refresh token')
        
        # Generate new access token
        access_token = JWTHandler.generate_access_token(
            payload.get('user_id'),
            payload.get('email')
        )
        
        return {
            'access_token': access_token,
            'refresh_token': refresh_token
        }
    
    @staticmethod
    def get_user_profile(user_id):
        """Get user profile information"""
        user = UserModel.get_user_by_id(user_id)
        
        if not user:
            raise ValueError('User not found')
        
        return {
            'user_id': user.get('user_id'),
            'email': user.get('email'),
            'full_name': user.get('full_name'),
            'created_at': user.get('created_at'),
            'is_active': user.get('is_active')
        }
    
    @staticmethod
    def change_password(user_id, old_password, new_password):
        """Change user password"""
        user = UserModel.get_user_by_id(user_id)
        
        if not user:
            raise ValueError('User not found')
        
        # Get full user record with password hash
        user_full = UserModel.get_user_by_email(user.get('email'))
        
        # Verify old password
        if not PasswordHandler.verify_password(user_full.get('password_hash'), old_password):
            raise ValueError('Current password is incorrect')
        
        # Validate new password strength
        is_strong, message = PasswordHandler.is_password_strong(new_password)
        if not is_strong:
            raise ValueError(message)
        
        # Hash new password
        new_password_hash = PasswordHandler.hash_password(new_password)
        
        # Update password
        UserModel.update_user_password(user_id, new_password_hash)
        
        return {'message': 'Password changed successfully'}
