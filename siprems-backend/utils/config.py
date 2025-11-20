import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Base configuration"""
    DEBUG = False
    TESTING = False

    # Database Configuration
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_NAME = os.getenv('DB_NAME', 'siprems_db')
    DB_USER = os.getenv('DB_USER', 'postgres')
    DB_PASSWORD = os.getenv('DB_PASSWORD', 'mysecretpassword')
    DB_PORT = os.getenv('DB_PORT', '5432')

    # Gemini AI Configuration
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')

    # JWT Configuration
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'dev-secret-key-change-in-production')
    JWT_ALGORITHM = 'HS256'
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRE_MINUTES', '30'))
    JWT_REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv('JWT_REFRESH_TOKEN_EXPIRE_DAYS', '7'))

    # CORS Configuration
    CORS_ALLOWED_ORIGINS = os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:5173,http://localhost:3000').split(',')

    # Security Configuration
    SESSION_COOKIE_SECURE = False
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    BCRYPT_LOG_ROUNDS = 12

    # Rate Limiting Configuration
    RATELIMIT_STORAGE_URL = os.getenv('RATELIMIT_STORAGE_URL', 'memory://')
    RATELIMIT_DEFAULT = '100/hour'

    # Flask Configuration
    JSON_SORT_KEYS = False

    # API Configuration
    API_MAX_FORECAST_DAYS = 365
    API_MIN_FORECAST_DAYS = 1

    # Celery Configuration
    CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
    CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/1')
    CELERY_TASK_SERIALIZER = 'json'
    CELERY_RESULT_SERIALIZER = 'json'
    CELERY_ACCEPT_CONTENT = ['json']
    CELERY_TIMEZONE = 'UTC'
    CELERY_ENABLE_UTC = True
    CELERY_TASK_TRACK_STARTED = True
    CELERY_TASK_TIME_LIMIT = 30 * 60
    CELERY_TASK_SOFT_TIME_LIMIT = 25 * 60

    # Model Storage Configuration
    MODELS_DIR = os.getenv('MODELS_DIR', '/app/models')
    MODELS_META_DIR = os.path.join(MODELS_DIR, 'meta')

    # Scheduled Tasks Configuration
    CELERY_BEAT_SCHEDULE = {
        'train-all-models-nightly': {
            'task': 'tasks.ml_tasks.train_all_models',
            'schedule': 7200.0,  # Every 2 hours for demo, change to crontab(hour=2, minute=0) for nightly
        },
    }

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    SESSION_COOKIE_SECURE = False
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'dev-secret-key-change-in-production')

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    SESSION_COOKIE_SECURE = True
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')
    if not JWT_SECRET_KEY:
        raise ValueError('JWT_SECRET_KEY must be set in production')

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    JWT_SECRET_KEY = 'test-secret-key'

def get_config(config_name=None):
    """Get configuration based on environment"""
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')

    config_map = {
        'development': DevelopmentConfig,
        'production': ProductionConfig,
        'testing': TestingConfig,
    }

    return config_map.get(config_name, DevelopmentConfig)
