from flask import Blueprint, request, jsonify, current_app
from utils.jwt_handler import require_auth
from utils.cache_service import get_cache_service, generate_cache_key
from utils.metrics_service import track_http_request
import hashlib

chat_bp = Blueprint('chat', __name__, url_prefix='/chat')

@chat_bp.route('', methods=['POST'])
@require_auth
@track_http_request()
def chat_with_ai():
    """Chat with AI assistant with response caching"""
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

        # Try to get from cache - hash the message for cache key
        cache_service = get_cache_service()
        message_hash = hashlib.md5(message.encode()).hexdigest()
        cache_key = generate_cache_key(message_hash, prefix='ai_response')

        cached_response = cache_service.get(cache_key)
        if cached_response:
            return jsonify({'role': 'assistant', 'content': cached_response, 'from_cache': True}), 200

        # Not in cache, get response from AI
        response = chat_service.send_message(message)

        # Cache the response
        cache_service.set(cache_key, response, ttl=cache_service.TTL_POLICIES.get('ai_response', 3600))

        return jsonify({'role': 'assistant', 'content': response}), 200

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Error communicating with AI: {str(e)}'}), 500
