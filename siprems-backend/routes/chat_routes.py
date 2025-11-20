from flask import Blueprint, request, jsonify, current_app
from utils.jwt_handler import require_auth
from utils.metrics_service import track_http_request
import uuid

chat_bp = Blueprint('chat', __name__, url_prefix='/chat')

@chat_bp.route('', methods=['POST'])
@require_auth
@track_http_request()
def chat_with_ai():
    """Chat with AI assistant (stateless with Redis-backed history)"""
    chat_service = current_app.chat_service

    if not chat_service.is_available():
        return jsonify({
            'error': 'Gemini AI model is not properly configured on the server.'
        }), 503

    try:
        data = request.get_json()
        message = data.get('message', '').strip()
        user_id = data.get('user_id')  # Optional: from request
        session_id = data.get('session_id')  # Optional: from request

        if not message:
            return jsonify({'error': 'Message cannot be empty.'}), 400

        # Generate session_id if not provided
        if not session_id:
            session_id = str(uuid.uuid4())

        # Get response from AI (conversation history managed in Redis)
        response = chat_service.send_message(
            message=message,
            user_id=user_id,
            session_id=session_id
        )

        return jsonify({
            'role': 'assistant',
            'content': response,
            'session_id': session_id,
            'timestamp': str(__import__('datetime').datetime.utcnow().isoformat())
        }), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Error communicating with AI: {str(e)}'}), 500


@chat_bp.route('/history/<session_id>', methods=['GET'])
@require_auth
def get_chat_history(session_id):
    """Get conversation history for a session"""
    try:
        user_id = request.args.get('user_id')
        chat_service = current_app.chat_service

        history = chat_service.get_conversation_history(user_id, session_id)

        return jsonify({
            'session_id': session_id,
            'user_id': user_id,
            'history': history
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@chat_bp.route('/<session_id>', methods=['DELETE'])
@require_auth
def clear_chat_session(session_id):
    """Clear conversation history for a session"""
    try:
        user_id = request.args.get('user_id')
        chat_service = current_app.chat_service

        success = chat_service.clear_session(user_id, session_id)

        return jsonify({
            'success': success,
            'message': 'Chat session cleared' if success else 'Failed to clear session'
        }), 200 if success else 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500
