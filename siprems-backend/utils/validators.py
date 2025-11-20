from marshmallow import Schema, fields, validate, ValidationError, pre_load, post_load
import re

class AuthLoginSchema(Schema):
    """Schema for login validation"""
    email = fields.Email(required=True, error_messages={'required': 'Email is required'})
    password = fields.Str(
        required=True,
        validate=validate.Length(min=8),
        error_messages={'required': 'Password is required'}
    )
    
    @pre_load
    def process_input(self, data, **kwargs):
        """Strip whitespace from fields"""
        if isinstance(data, dict):
            return {k: v.strip() if isinstance(v, str) else v for k, v in data.items()}
        return data


class AuthRegisterSchema(Schema):
    """Schema for user registration validation"""
    email = fields.Email(required=True, error_messages={'required': 'Email is required'})
    password = fields.Str(
        required=True,
        validate=validate.Length(min=8),
        error_messages={'required': 'Password is required'}
    )
    full_name = fields.Str(
        required=True,
        validate=validate.Length(min=2, max=100),
        error_messages={'required': 'Full name is required'}
    )
    
    @pre_load
    def process_input(self, data, **kwargs):
        """Strip whitespace from fields"""
        if isinstance(data, dict):
            return {k: v.strip() if isinstance(v, str) else v for k, v in data.items()}
        return data


class RefreshTokenSchema(Schema):
    """Schema for refresh token validation"""
    refresh_token = fields.Str(required=True, error_messages={'required': 'Refresh token is required'})


class ProductSchema(Schema):
    """Schema for product validation"""
    sku = fields.Str(
        required=True,
        validate=validate.Length(min=3, max=50),
        error_messages={'required': 'SKU is required'}
    )
    product_name = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=255),
        error_messages={'required': 'Product name is required'}
    )
    base_price = fields.Float(required=True, validate=validate.Range(min=0))
    reorder_level = fields.Int(required=True, validate=validate.Range(min=0))
    lead_time_days = fields.Int(required=True, validate=validate.Range(min=0))


class TransactionSchema(Schema):
    """Schema for transaction validation"""
    sku = fields.Str(required=True, validate=validate.Length(min=3, max=50))
    quantity = fields.Int(required=True, validate=validate.Range(min=1))
    unit_cost = fields.Float(required=True, validate=validate.Range(min=0))
    transaction_date = fields.DateTime(allow_none=True)
    transaction_type = fields.Str(
        required=True,
        validate=validate.OneOf(['purchase', 'sale', 'adjustment'])
    )


class EventSchema(Schema):
    """Schema for event validation"""
    event_name = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=255)
    )
    event_type = fields.Str(
        required=True,
        validate=validate.OneOf(['holiday', 'promotion', 'seasonal', 'other'])
    )
    impact_percentage = fields.Float(
        required=True,
        validate=validate.Range(min=-100, max=1000)
    )
    event_date = fields.DateTime(required=True)
    duration_days = fields.Int(validate=validate.Range(min=1))


def validate_request_data(schema_class, data):
    """Validate request data against schema"""
    schema = schema_class()
    try:
        result = schema.load(data)
        return True, result, None
    except ValidationError as err:
        return False, None, err.messages


def validate_json_request(schema_class):
    """Decorator to validate JSON request data"""
    def decorator(f):
        from functools import wraps
        from flask import request, jsonify
        
        @wraps(f)
        def decorated_function(*args, **kwargs):
            data = request.get_json() or {}
            valid, validated_data, errors = validate_request_data(schema_class, data)
            
            if not valid:
                return jsonify({'error': 'Validation failed', 'details': errors}), 400
            
            request.validated_data = validated_data
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator
