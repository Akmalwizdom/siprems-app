from routes.auth_routes import auth_bp
from routes.product_routes import product_bp
from routes.transaction_routes import transaction_bp
from routes.event_routes import event_bp
from routes.prediction_routes import prediction_bp
from routes.chat_routes import chat_bp
from routes.system_routes import system_bp

__all__ = ['auth_bp', 'product_bp', 'transaction_bp', 'event_bp', 'prediction_bp', 'chat_bp', 'system_bp']
