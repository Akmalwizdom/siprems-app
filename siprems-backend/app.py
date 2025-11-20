from flask import Flask
from flask_cors import CORS
from utils.config import get_config
from ml_engine import MLEngine
from utils.db import get_db_connection
from services.prediction_service import PredictionService
from services.chat_service import ChatService
from routes import (
    product_bp,
    transaction_bp,
    event_bp,
    prediction_bp,
    chat_bp,
    system_bp
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
    
    # Enable CORS
    CORS(app)
    
    # Initialize services
    ml_engine = MLEngine(get_db_connection)
    app.ml_engine = ml_engine
    
    prediction_service = PredictionService(ml_engine)
    app.prediction_service = prediction_service
    
    chat_service = ChatService(config)
    app.chat_service = chat_service
    
    # Register blueprints
    app.register_blueprint(product_bp)
    app.register_blueprint(transaction_bp)
    app.register_blueprint(event_bp)
    app.register_blueprint(prediction_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(system_bp)
    
    # Health check endpoint
    @app.route('/health', methods=['GET'])
    def health():
        return {'status': 'healthy'}, 200
    
    return app

# Create app instance for backward compatibility
app = create_app()

# For backward compatibility, expose key services at module level
ml_engine = app.ml_engine
prediction_service = app.prediction_service
chat_service = app.chat_service

if __name__ == '__main__':
    app.run(debug=True, port=5000)
