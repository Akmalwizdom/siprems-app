from flask import Blueprint, request, jsonify
from services.event_service import EventService

event_bp = Blueprint('events', __name__, url_prefix='/events')

@event_bp.route('', methods=['GET'])
def get_events():
    """Get all events"""
    try:
        events = EventService.get_all_events()
        return jsonify(events), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@event_bp.route('', methods=['POST'])
def add_event():
    """Create a new event"""
    try:
        data = request.get_json()
        event = EventService.create_event(data)
        return jsonify(event), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@event_bp.route('/<int:event_id>', methods=['GET'])
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
def delete_event(event_id):
    """Delete an event"""
    try:
        EventService.delete_event(event_id)
        return jsonify({'message': 'Event deleted successfully'}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
