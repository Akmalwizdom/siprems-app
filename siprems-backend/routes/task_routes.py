from flask import Blueprint, request, jsonify
from utils.jwt_handler import require_auth
from services.task_service import TaskService
from tasks.ml_tasks import train_product_model_task, train_all_models

task_bp = Blueprint('tasks', __name__, url_prefix='/tasks')


@task_bp.route('/<task_id>', methods=['GET'])
@require_auth
def get_task_status(task_id):
    """Get the status of a specific task"""
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


@task_bp.route('/training/product/<product_sku>', methods=['POST'])
@require_auth
def train_product_async(product_sku):
    """Train a model for a specific product asynchronously"""
    try:
        # Submit async training task
        task = train_product_model_task.delay(product_sku)
        
        return jsonify({
            'task_id': task.id,
            'status': 'submitted',
            'message': f'Training task submitted for product {product_sku}',
            'product_sku': product_sku
        }), 202
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@task_bp.route('/training/all', methods=['POST'])
@require_auth
def train_all_models_async():
    """Train models for all products asynchronously"""
    try:
        # Submit async training task for all models
        task = train_all_models.delay()
        
        return jsonify({
            'task_id': task.id,
            'status': 'submitted',
            'message': 'Training task submitted for all products'
        }), 202
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@task_bp.route('/active', methods=['GET'])
@require_auth
def get_active_tasks():
    """Get list of active tasks"""
    try:
        result = TaskService.get_active_tasks()
        return jsonify(result), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@task_bp.route('/scheduled', methods=['GET'])
@require_auth
def get_scheduled_tasks():
    """Get list of scheduled tasks"""
    try:
        result = TaskService.get_scheduled_tasks()
        return jsonify(result), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@task_bp.route('/<task_id>/cancel', methods=['POST'])
@require_auth
def cancel_task(task_id):
    """Cancel a specific task"""
    try:
        result = TaskService.cancel_task(task_id)
        return jsonify(result), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
