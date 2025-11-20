# StockPredict Backend Architecture

## Overview

The backend has been refactored from a monolithic structure to a modular, scalable architecture using Flask Blueprints and separation of concerns.

## Directory Structure

```
siprems-backend/
├── routes/              # Flask Blueprints for endpoints
│   ├── __init__.py
│   ├── auth_routes.py
│   ├── product_routes.py
│   ├── transaction_routes.py
│   ├── event_routes.py
│   ├── prediction_routes.py
│   ├── chat_routes.py
│   ├── system_routes.py
│   └── task_routes.py
├── services/            # Business logic layer
│   ├── __init__.py
│   ├── user_service.py
│   ├── product_service.py
│   ├── transaction_service.py
│   ├── event_service.py
│   ├── prediction_service.py
│   ├── chat_service.py
│   └── task_service.py
├── models/              # Data access layer
│   ├── orm/             # SQLAlchemy ORM models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── product.py
│   │   ├── transaction.py
│   │   └── event.py
│   ├── __init__.py
│   ├── user_model.py
│   ├── product_model.py
│   ├── transaction_model.py
│   └── event_model.py
├── utils/               # Utilities and helpers
│   ├── __init__.py
│   ├── config.py        # Configuration management
│   ├── db.py            # Legacy database utilities
│   ├── db_session.py    # SQLAlchemy session management
│   ├── cache_service.py # Redis cache service
│   ├── metrics_service.py # Metrics collection
│   └── password_handler.py # Password hashing utilities
├── tasks/               # Celery tasks
│   ├── __init__.py
│   └── ml_tasks.py
├── nginx/               # Nginx configuration
│   ├── Dockerfile
│   └── nginx.conf
├── pgbouncer/           # PostgreSQL connection pooling
│   ├── pgbouncer.ini
│   └── users.txt
├── app.py               # Application factory and entry point
├── celery_app.py        # Celery application setup
├── ml_engine.py         # Machine learning engine
├── seed.py              # Database seeding script
├── schema.sql           # Database schema
├── docker-compose.yml   # Docker compose configuration
├── requirements.txt     # Python dependencies
├── ORM_MIGRATION_GUIDE.md # ORM migration guide
└── ARCHITECTURE.md      # This file
```

## Architecture Layers

### 1. **Routes Layer** (`routes/`)
- Flask Blueprints for handling HTTP requests
- Maps endpoints to service methods
- Handles request/response formatting and HTTP status codes
- Validates request data and returns appropriate error responses

### 2. **Services Layer** (`services/`)
- Contains business logic and validation
- Orchestrates models and external services
- Handles data transformation and formatting
- Implements domain-specific logic

### 3. **Models Layer** (`models/`)
- Data access layer (DAL) - responsible for database queries
- CRUD operations for each entity
- SQL execution and result mapping
- No business logic - pure data access

### 4. **Utils Layer** (`utils/`)
- **config.py**: Configuration management with support for multiple environments
- **db.py**: Database connection utilities and helper functions

## Data Flow

```
HTTP Request
    ↓
Routes (Request validation & formatting)
    ↓
Services (Business logic & validation)
    ↓
Models (Database queries)
    ↓
Database
    ↓
Models (Return raw data)
    ↓
Services (Format & transform)
    ↓
Routes (Response formatting)
    ↓
HTTP Response
```

## API Endpoints

### Products
- `GET /products` - Get all products
- `POST /products` - Create a new product
- `GET /products/<sku>` - Get a product by SKU
- `PUT /products/<sku>` - Update a product
- `DELETE /products/<sku>` - Delete a product
- `GET /products/stats` - Get product statistics

### Transactions
- `GET /transactions` - Get recent transactions
- `POST /transactions` - Record a new transaction
- `GET /transactions/<id>` - Get a specific transaction

### Events
- `GET /events` - Get all events
- `POST /events` - Create a new event
- `GET /events/<id>` - Get a specific event
- `DELETE /events/<id>` - Delete an event

### Predictions
- `POST /predict` - Generate stock predictions

### Chat
- `POST /chat` - Chat with AI assistant

### System
- `GET /dashboard-stats` - Get dashboard statistics
- `GET /settings/status` - Get system status

## Key Components

### Factory Pattern
The application uses a factory pattern via `create_app()` function in `app.py`:

```python
app = create_app(config)
```

Benefits:
- Easy testing with different configurations
- Multiple app instances for different purposes
- Cleaner initialization logic
- Environment-specific setup

### Configuration Management
Configuration is handled via `utils/config.py`:

```python
config = get_config()  # Auto-detect environment
```

Supports multiple environments:
- Development
- Production
- Testing

### Database Access - SQLAlchemy ORM

Database operations now use SQLAlchemy ORM with session management:

```python
from utils.db_session import get_db_session
from models.orm.product import Product

# Query with ORM
with get_db_session() as session:
    product = session.query(Product).filter_by(sku="BRD-001").first()
    products = session.query(Product).limit(10).all()

    # Create new record
    new_product = Product(name="Item", category="Cat", sku="NEW", price=10.0, stock=5)
    session.add(new_product)
    # Commit happens automatically on context manager exit
```

**Benefits of ORM:**
- Type-safe queries with full IDE support
- Automatic SQL injection prevention
- Efficient connection pooling
- Transparent transaction management
- Easy to test with mock data

### Legacy Database Access (Deprecated)

Raw SQL operations are still supported for backward compatibility:

```python
from utils.db import db_query, db_execute

# Legacy - prefer ORM for new code
result = db_query("SELECT * FROM products", fetch_all=True)
result = db_execute("INSERT INTO products ...", params)
```

**Note**: New code should use SQLAlchemy ORM exclusively. See ORM_MIGRATION_GUIDE.md for details.

## Service Integration

### ML Engine
The MLEngine is integrated via the PredictionService:

```python
from services.prediction_service import PredictionService

prediction_service = PredictionService(ml_engine)
result = prediction_service.predict_stock(data)
```

### Chat Service
The ChatService wraps Gemini AI:

```python
from services.chat_service import ChatService

chat_service = ChatService(config)
if chat_service.is_available():
    response = chat_service.send_message(message)
```

## Backward Compatibility

The refactored backend maintains full backward compatibility:

1. **Same API Endpoints**: All endpoints remain accessible at the same URLs
2. **Same Request/Response Format**: Request and response structures unchanged
3. **Same Error Handling**: Error messages and HTTP status codes consistent
4. **Drop-in Replacement**: Can replace old app.py without changing frontend code

## Adding New Features

### Adding a New Endpoint

1. **Create a Model** (`models/new_model.py`):
```python
class NewModel:
    @staticmethod
    def get_all_items():
        query = "SELECT * FROM new_table"
        return db_query(query, fetch_all=True)
```

2. **Create a Service** (`services/new_service.py`):
```python
class NewService:
    @staticmethod
    def get_items():
        return NewModel.get_all_items()
```

3. **Create Routes** (`routes/new_routes.py`):
```python
from flask import Blueprint, jsonify
from services.new_service import NewService

new_bp = Blueprint('new', __name__, url_prefix='/new')

@new_bp.route('', methods=['GET'])
def get_items():
    items = NewService.get_items()
    return jsonify(items), 200
```

4. **Register Blueprint** (in `app.py`):
```python
from routes.new_routes import new_bp
app.register_blueprint(new_bp)
```

## Testing

Services and models can be tested independently:

```python
from services.product_service import ProductService

def test_get_product():
    product = ProductService.get_product_by_sku('BRD-001')
    assert product is not None
```

## Performance Considerations

1. **Database Connections**: Context managers ensure proper cleanup
2. **Query Optimization**: Models handle efficient query construction
3. **Caching**: Can be added at service layer as needed
4. **Pagination**: Transaction and event endpoints support limits

## Environment Variables

Required environment variables (from `.env`):

```
DB_HOST=localhost
DB_NAME=siprems_db
DB_USER=postgres
DB_PASSWORD=mysecretpassword
GEMINI_API_KEY=your_api_key
FLASK_ENV=development
```

## Running the Application

### Development
```bash
python app.py
```

### Production
```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### Database Setup
```bash
psql -U postgres -f schema.sql
python seed.py
```

## Maintenance

- **Adding new models**: Follow the model layer pattern
- **Adding business logic**: Implement in services
- **Adding endpoints**: Create routes and register blueprints
- **Updating database**: Modify models, not routes

## Future Enhancements

- Add request/response validation using Marshmallow
- Implement caching layer (Redis)
- Add API rate limiting
- Implement pagination for list endpoints
- Add comprehensive logging
- Add database migrations (Alembic)
