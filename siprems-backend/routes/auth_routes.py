from flask import Blueprint, request, jsonify
import logging
from services.user_service import UserService
from utils.validators import (
    AuthLoginSchema, AuthRegisterSchema, RefreshTokenSchema,
    validate_request_data
)
from utils.jwt_handler import require_auth, optional_auth

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        # Validate request data
        data = request.get_json() or {}

        valid, validated_data, errors = validate_request_data(AuthRegisterSchema, data)
        if not valid:
            # Extract first validation error for cleaner message
            error_msg = 'Invalid input'
            if isinstance(errors, dict):
                for field, messages in errors.items():
                    if isinstance(messages, list) and messages:
                        error_msg = messages[0]
                        break
                    elif isinstance(messages, str):
                        error_msg = messages
                        break
            return jsonify({'message': error_msg}), 400

        # Register user
        user = UserService.register_user(
            email=validated_data['email'],
            full_name=validated_data['full_name'],
            password=validated_data['password']
        )

        return jsonify({
            'message': 'Registration successful',
            'user': {
                'user_id': user.get('user_id'),
                'email': user.get('email'),
                'full_name': user.get('full_name')
            }
        }), 201

    except ValueError as e:
        return jsonify({'message': str(e)}), 400
    except Exception as e:
        logger.error(f"Registration error: {str(e)}", exc_info=True)
        return jsonify({'message': 'Registration failed. Please try again later.'}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user and return JWT tokens"""
    try:
        # Validate request data
        data = request.get_json() or {}
        valid, validated_data, errors = validate_request_data(AuthLoginSchema, data)
        if not valid:
            # Extract first validation error for cleaner message
            error_msg = 'Invalid input'
            if isinstance(errors, dict):
                for field, messages in errors.items():
                    if isinstance(messages, list) and messages:
                        error_msg = messages[0]
                        break
                    elif isinstance(messages, str):
                        error_msg = messages
                        break
            return jsonify({'message': error_msg}), 400

        # Authenticate user
        result = UserService.login_user(
            email=validated_data['email'],
            password=validated_data['password']
        )

        return jsonify(result), 200

    except ValueError as e:
        return jsonify({'message': str(e)}), 401
    except Exception as e:
        return jsonify({'message': 'Login failed'}), 500


@auth_bp.route('/refresh', methods=['POST'])
def refresh_token():
    """Refresh access token using refresh token"""
    try:
        # Validate request data
        data = request.get_json() or {}
        valid, validated_data, errors = validate_request_data(RefreshTokenSchema, data)
        if not valid:
            return jsonify({'error': 'Validation failed', 'details': errors}), 400
        
        # Refresh token
        result = UserService.refresh_access_token(validated_data['refresh_token'])
        
        return jsonify(result), 200
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 401
    except Exception as e:
        return jsonify({'error': 'Token refresh failed', 'details': str(e)}), 500


@auth_bp.route('/profile', methods=['GET'])
@require_auth
def get_profile():
    """Get current user profile"""
    try:
        user_id = request.user_id
        profile = UserService.get_user_profile(user_id)
        return jsonify(profile), 200
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': 'Failed to fetch profile', 'details': str(e)}), 500


@auth_bp.route('/change-password', methods=['POST'])
@require_auth
def change_password():
    """Change user password"""
    try:
        user_id = request.user_id
        data = request.get_json() or {}
        
        old_password = data.get('old_password')
        new_password = data.get('new_password')
        
        if not old_password or not new_password:
            return jsonify({'error': 'Old password and new password are required'}), 400
        
        result = UserService.change_password(user_id, old_password, new_password)
        return jsonify(result), 200
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': 'Failed to change password', 'details': str(e)}), 500


@auth_bp.route('/logout', methods=['POST'])
@require_auth
def logout():
    """Logout user (invalidate tokens on client side)"""
    return jsonify({'message': 'Logout successful'}), 200
