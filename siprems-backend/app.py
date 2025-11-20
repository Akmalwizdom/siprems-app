from flask import Flask, jsonify
from flask_cors import CORS
from flask_talisman import Talisman
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_compress import Compress
from utils.config import get_config
from utils.cache_service import init_cache
from utils.metrics_service import init_metrics, get_metrics_service
from ml_engine import MLEngine
from utils.db import get_db_connection
from services.prediction_service import PredictionService
from services.chat_service import ChatService
from routes import (
    auth_bp,
    product_bp,
    transaction_bp,
    event_bp,
    prediction_bp,
    chat_bp,
    system_bp,
    task_bp
)

def create_app(config=None):
    """
    Application factory function.
    Creates and configures the Flask application.

    Args:
        config: Configuration object (optional). If None, uses environment config.

    Returns:
        Configured Flask application instance
    """
    app = Flask(__name__)

    # Load configuration
    if config is None:
        config = get_config()
    app.config.from_object(config)

    # Initialize response compression
    Compress(app)

    # Configure CORS with whitelist
    cors_config = {
        'origins': config.CORS_ALLOWED_ORIGINS,
        'methods': ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        'allow_headers': ['Content-Type', 'Authorization'],
        'supports_credentials': True,
        'max_age': 3600
    }
    CORS(app, resources={r"/api/*": cors_config}, **cors_config)

    # Add security headers
    Talisman(
        app,
        force_https=not app.debug,
        strict_transport_security=True,
        strict_transport_security_max_age=31536000,
        content_security_policy={
            'default-src': "'self'",
            'script-src': "'self'",
            'style-src': "'self' 'unsafe-inline'",
            'img-src': "'self' data:",
        },
        content_security_policy_nonce_in=['script-src']
    )

    # Initialize rate limiter
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=['100 per hour'],
        storage_uri=config.RATELIMIT_STORAGE_URL
    )

    # Initialize cache service
    cache_service = init_cache(config)
    app.cache_service = cache_service

    # Initialize metrics service
    metrics_service = init_metrics()
    app.metrics_service = metrics_service

    # Initialize services
    ml_engine = MLEngine(get_db_connection)
    app.ml_engine = ml_engine

    prediction_service = PredictionService(ml_engine)
    app.prediction_service = prediction_service

    chat_service = ChatService(config)
    app.chat_service = chat_service

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(product_bp)
    app.register_blueprint(transaction_bp)
    app.register_blueprint(event_bp)
    app.register_blueprint(prediction_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(system_bp)
    app.register_blueprint(task_bp)

    # Health check endpoint
    @app.route('/health', methods=['GET'])
    def health():
        return jsonify({'status': 'healthy'}), 200

    # Metrics endpoint
    @app.route('/metrics', methods=['GET'])
    def metrics():
        metrics_service = get_metrics_service()
        return jsonify(metrics_service.export_metrics()), 200

    # Cache stats endpoint
    @app.route('/cache-stats', methods=['GET'])
    def cache_stats():
        return jsonify(cache_service.get_stats()), 200

    # Error handlers
    @app.errorhandler(429)
    def ratelimit_handler(e):
        return jsonify({'error': 'Rate limit exceeded'}), 429

    @app.errorhandler(401)
    def unauthorized_handler(e):
        return jsonify({'error': 'Unauthorized'}), 401

    @app.errorhandler(403)
    def forbidden_handler(e):
        return jsonify({'error': 'Forbidden'}), 403

    @app.errorhandler(404)
    def not_found_handler(e):
        return jsonify({'error': 'Not found'}), 404

    @app.errorhandler(500)
    def internal_error_handler(e):
        return jsonify({'error': 'Internal server error'}), 500

    return app

# Create app instance for backward compatibility
app = create_app()

# For backward compatibility, expose key services at module level
ml_engine = app.ml_engine
prediction_service = app.prediction_service
chat_service = app.chat_service

if __name__ == '__main__':
    app.run(debug=True, port=5000)
