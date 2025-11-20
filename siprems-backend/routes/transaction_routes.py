from flask import Blueprint, request, jsonify
from services.transaction_service import TransactionService
from utils.jwt_handler import require_auth
from utils.validators import TransactionSchema, validate_request_data

transaction_bp = Blueprint('transactions', __name__, url_prefix='/transactions')

@transaction_bp.route('', methods=['GET'])
@require_auth
def get_transactions():
    """Get recent transactions"""
    try:
        limit = request.args.get('limit', 100, type=int)
        if limit > 1000:
            limit = 1000
        transactions = TransactionService.get_all_transactions(limit)
        return jsonify(transactions), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@transaction_bp.route('', methods=['POST'])
@require_auth
def add_transaction():
    """Create a new transaction"""
    try:
        data = request.get_json()
        valid, validated_data, errors = validate_request_data(TransactionSchema, data)
        if not valid:
            return jsonify({'error': 'Validation failed', 'details': errors}), 400

        transaction = TransactionService.create_transaction(validated_data)
        return jsonify(transaction), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@transaction_bp.route('/<int:transaction_id>', methods=['GET'])
@require_auth
def get_transaction(transaction_id):
    """Get a specific transaction"""
    try:
        transaction = TransactionService.get_transaction_by_id(transaction_id)
        return jsonify(transaction), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
