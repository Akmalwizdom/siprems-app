from flask import Blueprint, request, jsonify
from services.event_service import EventService
from utils.jwt_handler import require_auth
from utils.validators import EventSchema, validate_request_data

event_bp = Blueprint('events', __name__)

@event_bp.route('', methods=['GET'])
@require_auth
def get_events():
    """Get all events"""
    try:
        events = EventService.get_all_events()
        return jsonify(events), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@event_bp.route('', methods=['POST'])
@require_auth
def add_event():
    """Create a new event"""
    try:
        data = request.get_json()
        valid, validated_data, errors = validate_request_data(EventSchema, data)
        if not valid:
            return jsonify({'error': 'Validation failed', 'details': errors}), 400

        event = EventService.create_event(validated_data)
        return jsonify(event), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@event_bp.route('/<int:event_id>', methods=['GET'])
@require_auth
def get_event(event_id):
    """Get a specific event"""
    try:
        event = EventService.get_event_by_id(event_id)
        return jsonify(event), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@event_bp.route('/<int:event_id>', methods=['DELETE'])
@require_auth
def delete_event(event_id):
    """Delete an event"""
    try:
        EventService.delete_event(event_id)
        return jsonify({'message': 'Event deleted successfully'}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
