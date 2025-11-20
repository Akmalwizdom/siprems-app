from werkzeug.security import generate_password_hash, check_password_hash
from utils.config import get_config

config = get_config()

class PasswordHandler:
    """Password hashing and verification handler"""
    
    @staticmethod
    def hash_password(password):
        """Hash a password using werkzeug's secure method"""
        if not password or len(password) < 8:
            raise ValueError('Password must be at least 8 characters long')
        
        return generate_password_hash(
            password,
            method='pbkdf2:sha256',
            salt_length=16
        )
    
    @staticmethod
    def verify_password(password_hash, password):
        """Verify a password against its hash"""
        try:
            return check_password_hash(password_hash, password)
        except Exception:
            return False
    
    @staticmethod
    def is_password_strong(password):
        """Validate password strength"""
        if not password:
            return False, 'Password is required'
        
        if len(password) < 8:
            return False, 'Password must be at least 8 characters'
        
        if not any(char.isupper() for char in password):
            return False, 'Password must contain at least one uppercase letter'
        
        if not any(char.isdigit() for char in password):
            return False, 'Password must contain at least one number'
        
        return True, 'Password is strong'
