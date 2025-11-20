from flask import Blueprint, request, jsonify, current_app

prediction_bp = Blueprint('predictions', __name__, url_prefix='/predict')

@prediction_bp.route('', methods=['POST'])
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
        print(f"Prediction Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
