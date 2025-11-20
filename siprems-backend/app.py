"""Flask application factory and configuration."""

from typing import Optional

from flask import Flask, jsonify
from flask_cors import CORS
from flask_talisman import Talisman
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_compress import Compress

from utils.config import get_config
from utils.cache_service import init_cache
from utils.metrics_service import init_metrics, get_metrics_service
from utils.db_session import init_db_session, get_db_session, get_db_engine
from ml_engine import MLEngine
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
    task_bp,
)

def create_app(config: Optional[object] = None) -> Flask:
    """
    Application factory function.

    Creates and configures the Flask application with SQLAlchemy ORM,
    security, caching, and service integrations.

    Args:
        config: Configuration object (optional). If None, uses environment config.

    Returns:
        Configured Flask application instance with all dependencies initialized.

    Raises:
        Exception: If database connection or service initialization fails.
    """
    app = Flask(__name__)

    # Load configuration
    if config is None:
        config = get_config()
    app.config.from_object(config)

    # Initialize database session management
    session_factory = init_db_session(config)
    app.db_session_factory = session_factory
    app.get_db_session = get_db_session
    app.get_db_engine = get_db_engine

    # Initialize response compression
    Compress(app)

    # Configure CORS with whitelist
    cors_config = {
        "origins": config.CORS_ALLOWED_ORIGINS,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "max_age": 3600,
    }
    CORS(app, resources={r"/api/*": cors_config, r"/auth/*": cors_config}, **cors_config)

    # Add security headers
    Talisman(
        app,
        force_https=not app.debug,
        strict_transport_security=True,
        strict_transport_security_max_age=31536000,
        content_security_policy={
            "default-src": "'self'",
            "script-src": "'self'",
            "style-src": "'self' 'unsafe-inline'",
            "img-src": "'self' data:",
        },
        content_security_policy_nonce_in=["script-src"],
    )

    # Initialize rate limiter
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=["100 per hour"],
        storage_uri=config.RATELIMIT_STORAGE_URL,
    )

    # Initialize cache service
    cache_service = init_cache(config)
    app.cache_service = cache_service

    # Initialize metrics service
    metrics_service = init_metrics()
    app.metrics_service = metrics_service

    # Initialize services
    ml_engine = MLEngine(get_db_engine)
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

    @app.route("/health", methods=["GET"])
    def health() -> tuple:
        """
        Fast health check endpoint for load balancers.

        Returns:
            JSON response with status and HTTP 200.
        """
        return jsonify({"status": "healthy"}), 200

    @app.route("/ready", methods=["GET"])
    def readiness() -> tuple:
        """
        Readiness check endpoint verifying all service dependencies.

        Checks database, Redis, and chat service connectivity.

        Returns:
            JSON response with readiness status and dependency checks.
            Returns 200 if ready, 503 if not ready.
        """
        try:
            # Check database connectivity
            with app.get_db_session() as session:
                session.execute("SELECT 1")

            # Check Redis connectivity
            cache_service = app.cache_service
            redis_available = cache_service.is_available()

            # Check chat service connectivity
            chat_available = app.chat_service.is_available()

            return jsonify(
                {
                    "status": "ready",
                    "checks": {
                        "database": "ok",
                        "redis": "ok" if redis_available else "degraded",
                        "chat_service": "ok" if chat_available else "unavailable",
                        "timestamp": __import__("datetime").datetime.utcnow().isoformat(),
                    },
                }
            ), 200
        except Exception as e:
            return jsonify({"status": "not_ready", "error": str(e)}), 503

    @app.route("/metrics", methods=["GET"])
    def metrics() -> tuple:
        """
        Export application metrics.

        Returns:
            JSON response with application metrics.
        """
        metrics_service = get_metrics_service()
        return jsonify(metrics_service.export_metrics()), 200

    @app.route("/cache-stats", methods=["GET"])
    def cache_stats() -> tuple:
        """
        Get cache statistics.

        Returns:
            JSON response with Redis cache statistics.
        """
        return jsonify(cache_service.get_stats()), 200

    @app.errorhandler(429)
    def ratelimit_handler(e) -> tuple:
        """Handle rate limit exceeded errors."""
        return jsonify({"error": "Rate limit exceeded"}), 429

    @app.errorhandler(401)
    def unauthorized_handler(e) -> tuple:
        """Handle authorization errors."""
        return jsonify({"error": "Unauthorized"}), 401

    @app.errorhandler(403)
    def forbidden_handler(e) -> tuple:
        """Handle forbidden access errors."""
        return jsonify({"error": "Forbidden"}), 403

    @app.errorhandler(404)
    def not_found_handler(e) -> tuple:
        """Handle resource not found errors."""
        return jsonify({"error": "Not found"}), 404

    @app.errorhandler(500)
    def internal_error_handler(e) -> tuple:
        """Handle internal server errors."""
        return jsonify({"error": "Internal server error"}), 500

    return app


# Create app instance for backward compatibility
app: Flask = create_app()

# For backward compatibility, expose key services at module level
ml_engine: MLEngine = app.ml_engine
prediction_service: PredictionService = app.prediction_service
chat_service: ChatService = app.chat_service

if __name__ == "__main__":
    app.run(host='0.0.0.0', debug=True, port=5000)
