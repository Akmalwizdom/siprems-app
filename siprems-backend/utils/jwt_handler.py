import jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, current_app
from utils.config import get_config

config = get_config()

class JWTHandler:
    """JWT token generation and validation handler"""
    
    @staticmethod
    def generate_access_token(user_id, email):
        """Generate JWT access token"""
        payload = {
            'user_id': user_id,
            'email': email,
            'type': 'access',
            'iat': datetime.utcnow(),
            'exp': datetime.utcnow() + timedelta(minutes=config.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        }
        token = jwt.encode(
            payload,
            config.JWT_SECRET_KEY,
            algorithm=config.JWT_ALGORITHM
        )
        return token
    
    @staticmethod
    def generate_refresh_token(user_id, email):
        """Generate JWT refresh token"""
        payload = {
            'user_id': user_id,
            'email': email,
            'type': 'refresh',
            'iat': datetime.utcnow(),
            'exp': datetime.utcnow() + timedelta(days=config.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
        }
        token = jwt.encode(
            payload,
            config.JWT_SECRET_KEY,
            algorithm=config.JWT_ALGORITHM
        )
        return token
    
    @staticmethod
    def verify_token(token, token_type='access'):
        """Verify JWT token and return payload"""
        try:
            payload = jwt.decode(
                token,
                config.JWT_SECRET_KEY,
                algorithms=[config.JWT_ALGORITHM]
            )
            
            if payload.get('type') != token_type:
                return None
            
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    @staticmethod
    def get_token_from_request():
        """Extract token from Authorization header"""
        auth_header = request.headers.get('Authorization', '')
        if not auth_header:
            return None
        
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return None
        
        return parts[1]


def require_auth(f):
    """Decorator to require JWT authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = JWTHandler.get_token_from_request()
        
        if not token:
            return jsonify({'error': 'Missing authorization token'}), 401
        
        payload = JWTHandler.verify_token(token, token_type='access')
        
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        request.user_id = payload.get('user_id')
        request.email = payload.get('email')
        
        return f(*args, **kwargs)
    
    return decorated_function


def optional_auth(f):
    """Decorator for optional JWT authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = JWTHandler.get_token_from_request()
        
        request.user_id = None
        request.email = None
        
        if token:
            payload = JWTHandler.verify_token(token, token_type='access')
            if payload:
                request.user_id = payload.get('user_id')
                request.email = payload.get('email')
        
        return f(*args, **kwargs)
    
    return decorated_function
