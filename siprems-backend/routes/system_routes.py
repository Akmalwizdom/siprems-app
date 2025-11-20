from flask import Blueprint, jsonify, current_app
from services.transaction_service import TransactionService
from services.product_service import ProductService
from utils.db import db_query
from utils.jwt_handler import require_auth

system_bp = Blueprint('system', __name__)

@system_bp.route('/dashboard-stats', methods=['GET'])
@require_auth
def get_dashboard_stats():
    """Get dashboard statistics"""
    try:
        stats = TransactionService.get_dashboard_stats()
        product_stats = ProductService.get_inventory_stats()

        return jsonify({
            'cards': {
                'daily_transactions': stats['daily_transactions'],
                'active_products': product_stats['active_products'],
                'low_stock_items': product_stats['low_stock_items']
            },
            'salesTrend': stats['sales_trend'],
            'stockComparison': stats['stock_comparison']
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@system_bp.route('/settings/status', methods=['GET'])
def get_system_status():
    """Get system status"""
    try:
        db_query("SELECT 1", fetch_all=False)
        db_status = "Connected"
    except Exception:
        db_status = "Disconnected"

    return jsonify({
        'version': '2.0.0',
        'last_updated': 'Refactored with Blueprint Architecture',
        'ai_model': 'Prophet v1.1 (Python)',
        'database_status': db_status
    }), 200
