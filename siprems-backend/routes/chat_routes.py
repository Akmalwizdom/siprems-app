from flask import Blueprint, request, jsonify, current_app
from utils.jwt_handler import require_auth

chat_bp = Blueprint('chat', __name__, url_prefix='/chat')

@chat_bp.route('', methods=['POST'])
@require_auth
def chat_with_ai():
    """Chat with AI assistant"""
    chat_service = current_app.chat_service

    if not chat_service.is_available():
        return jsonify({
            'error': 'Gemini AI model is not properly configured on the server.'
        }), 503

    try:
        data = request.get_json()
        message = data.get('message', '').strip()

        if not message:
            return jsonify({'error': 'Message cannot be empty.'}), 400

        response = chat_service.send_message(message)
        return jsonify({'role': 'assistant', 'content': response}), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Error communicating with AI: {str(e)}'}), 500
