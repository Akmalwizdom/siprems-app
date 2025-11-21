"""Settings routes for store configuration management."""

from flask import Blueprint, jsonify, request
from services.settings_service import SettingsService
from utils.jwt_handler import require_auth

settings_bp = Blueprint('settings', __name__)


@settings_bp.route('/store', methods=['GET'])
@require_auth
def get_store_settings():
    """Get store settings for the current user."""
    try:
        user_id = request.user_id
        settings = SettingsService.get_store_settings(user_id)

        if not settings:
            return jsonify({'error': 'Store not found'}), 404

        return jsonify(settings), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@settings_bp.route('/store', methods=['POST'])
@require_auth
def create_store():
    """Create a new store for the current user."""
    try:
        data = request.get_json()
        user_id = request.user_id

        name = data.get('name')
        address = data.get('address')

        if not name:
            return jsonify({'error': 'Store name is required'}), 400

        store = SettingsService.create_store(user_id, name, address)

        return jsonify({
            'store': store,
            'opening_hours': {}
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@settings_bp.route('/store', methods=['PUT'])
@require_auth
def update_store_settings():
    """Update store basic settings (name and address)."""
    try:
        data = request.get_json()
        user_id = request.user_id

        name = data.get('name')
        address = data.get('address')

        settings = SettingsService.update_store_settings(user_id, name, address)

        if not settings:
            return jsonify({'error': 'Store not found'}), 404

        return jsonify(settings), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@settings_bp.route('/operating-hours', methods=['GET'])
@require_auth
def get_operating_hours():
    """Get operating hours for the current user's store."""
    try:
        user_id = request.user_id
        settings = SettingsService.get_store_settings(user_id)

        if not settings:
            return jsonify({'error': 'Store not found'}), 404

        return jsonify(settings['opening_hours']), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@settings_bp.route('/operating-hours', methods=['PUT'])
@require_auth
def update_operating_hours():
    """Update operating hours for all days of the week."""
    try:
        data = request.get_json()
        user_id = request.user_id

        opening_hours = data.get('opening_hours')

        if not opening_hours:
            return jsonify({'error': 'Opening hours data is required'}), 400

        settings = SettingsService.set_operating_hours(user_id, opening_hours)

        if not settings:
            return jsonify({'error': 'Store not found'}), 404

        return jsonify(settings), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@settings_bp.route('/save-all', methods=['PUT'])
@require_auth
def save_all_settings():
    """Save all settings at once (store info and opening hours)."""
    try:
        data = request.get_json()
        user_id = request.user_id

        name = data.get('name')
        address = data.get('address')
        opening_hours = data.get('opening_hours')

        settings = SettingsService.save_all_settings(
            user_id,
            name,
            address,
            opening_hours,
        )

        if not settings:
            return jsonify({'error': 'Store not found'}), 404

        return jsonify(settings), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
