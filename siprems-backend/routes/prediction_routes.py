from flask import Blueprint, request, jsonify, current_app
from utils.jwt_handler import require_auth
from tasks.ml_tasks import predict_stock_task
from services.task_service import TaskService

prediction_bp = Blueprint('predictions', __name__, url_prefix='/predict')

@prediction_bp.route('', methods=['POST'])
@require_auth
def predict_stock():
    """Predict stock levels for a product (synchronous)"""
    try:
        data = request.get_json()
        prediction_service = current_app.prediction_service
        result = prediction_service.predict_stock(data)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@prediction_bp.route('/async', methods=['POST'])
@require_auth
def predict_stock_async():
    """Predict stock levels asynchronously, returns task_id"""
    try:
        data = request.get_json() or {}

        if 'product_sku' not in data:
            return jsonify({'error': 'Product SKU is required'}), 400

        product_sku = data['product_sku']
        forecast_days = int(data.get('days', 7))

        if forecast_days < 1 or forecast_days > 365:
            return jsonify({'error': 'Days must be between 1 and 365'}), 400

        # Submit async task
        task = predict_stock_task.delay(product_sku, forecast_days)

        return jsonify({
            'task_id': task.id,
            'status': 'submitted',
            'message': f'Prediction task submitted for {product_sku}',
            'product_sku': product_sku,
            'forecast_days': forecast_days
        }), 202

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@prediction_bp.route('/task/<task_id>', methods=['GET'])
@require_auth
def get_prediction_task_status(task_id):
    """Get status of a prediction task"""
    try:
        status = TaskService.get_task_status(task_id)

        # Return appropriate HTTP status based on task status
        if status['status'] == 'PENDING':
            http_status = 202
        elif status['status'] == 'FAILURE':
            http_status = 400
        elif status['status'] == 'SUCCESS':
            http_status = 200
        else:
            http_status = 200

        return jsonify(status), http_status

    except Exception as e:
        return jsonify({'error': str(e)}), 500
