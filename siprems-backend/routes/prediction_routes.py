from flask import Blueprint, request, jsonify, current_app
from utils.jwt_handler import require_auth

prediction_bp = Blueprint('predictions', __name__, url_prefix='/predict')

@prediction_bp.route('', methods=['POST'])
@require_auth
def predict_stock():
    """Predict stock levels for a product"""
    try:
        data = request.get_json()
        prediction_service = current_app.prediction_service
        result = prediction_service.predict_stock(data)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500
