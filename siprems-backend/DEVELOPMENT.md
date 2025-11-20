# Development Guide

## Project Overview

This is the Siprems backend API for inventory prediction. It's built with Flask, uses SQLAlchemy ORM, and PostgreSQL as the database.

## Technology Stack

- **Framework**: Flask
- **ORM**: SQLAlchemy 2.0
- **Database**: PostgreSQL
- **Database Migrations**: Alembic
- **Testing**: Pytest
- **Linting**: Black, Flake8, Bandit
- **Task Queue**: Celery with Redis

## Setup

### Prerequisites

- Python 3.9+
- PostgreSQL 12+
- Redis (for caching and Celery)

### Installation

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd siprems-backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Initialize database**
   ```bash
   make db-init
   ```

6. **Install pre-commit hooks (optional)**
   ```bash
   make install-hooks
   ```

## Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Flask
FLASK_ENV=development
FLASK_APP=app.py

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=siprems_db
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_URL=redis://localhost:6379/2

# JWT
JWT_SECRET_KEY=your-secret-key-here
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Gemini AI
GEMINI_API_KEY=your-api-key

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1

# Caching
CACHE_ENABLED=true

# SQLAlchemy
SQLALCHEMY_ECHO=false
```

## Development Workflow

### Running the Application

1. **Start the Flask development server**
   ```bash
   python app.py
   ```

   Or use Flask CLI:
   ```bash
   flask run
   ```

2. **Start Celery worker** (in another terminal)
   ```bash
   celery -A celery_app worker --loglevel=info
   ```

3. **Start Celery beat scheduler** (for scheduled tasks)
   ```bash
   celery -A celery_app beat --loglevel=info
   ```

### Code Quality

#### Formatting Code

```bash
make format
```

This runs:
- Black for code formatting
- isort for import sorting

#### Linting

```bash
make lint
```

This runs Flake8 to check code style.

#### Security Checks

```bash
make lint-security
```

This runs Bandit to check for security vulnerabilities.

#### Run All Checks

```bash
make lint-all
```

## Database

### Schema

The database has the following main tables:
- `users` - User accounts and authentication
- `products` - Product inventory
- `transactions` - Sales transactions
- `events` - Holidays and special events

### Migrations

We use Alembic for database migrations.

**Creating a new migration:**
```bash
alembic revision --autogenerate -m "Description of changes"
```

**Running migrations:**
```bash
alembic upgrade head
```

**Rolling back migrations:**
```bash
alembic downgrade -1
```

For more details, see [DATABASE.md](./DATABASE.md)

## Testing

### Running Tests

```bash
make test
```

### Running Tests with Coverage

```bash
make test-cov
```

This generates an HTML coverage report in the `htmlcov/` directory.

### Writing Tests

All tests should be placed in the `tests/` directory with filenames starting with `test_`.

Example test structure:
```python
import pytest
from services.product_service import ProductService

class TestProductService:
    def test_create_product_success(self):
        data = {
            "name": "Test Product",
            "category": "Electronics",
            "price": 99.99,
            "stock": 50,
            "sku": "TEST-SKU"
        }
        
        product = ProductService.create_product(data)
        assert product["name"] == "Test Product"
```

See [TESTING.md](./TESTING.md) for detailed testing guidelines.

## Project Structure

```
siprems-backend/
├── routes/              # Flask route blueprints
│   ├── auth_routes.py
│   ├── product_routes.py
│   ├── transaction_routes.py
│   ├── event_routes.py
│   └── ...
├── services/            # Business logic layer
│   ├── user_service.py
│   ├── product_service.py
│   ├── transaction_service.py
│   └── ...
├── utils/               # Utilities and helpers
│   ├── database.py      # SQLAlchemy configuration
│   ├── models_orm.py    # SQLAlchemy ORM models
│   ├── config.py        # Configuration management
│   ├── jwt_handler.py   # JWT authentication
│   └── ...
├── models/              # Old models (deprecated, for reference)
├── alembic/             # Database migrations
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
├── tests/               # Test files
│   ├── conftest.py      # Pytest fixtures
│   ├── test_product_service.py
│   ├── test_user_service.py
│   └── ...
├── app.py               # Application factory
├── celery_app.py        # Celery configuration
├── requirements.txt     # Python dependencies
├── pyproject.toml       # Black and pytest config
├── .flake8              # Flake8 config
├── Makefile             # Development commands
└── alembic.ini          # Alembic config
```

## Coding Standards

### Python Style

We follow PEP 8 with some modifications (see `.flake8` and `pyproject.toml`):

- **Line length**: 100 characters
- **Imports**: Organized with isort (Black compatible)
- **Formatting**: Black formatting rules

### Documentation

- All modules should have a docstring
- All functions/methods should have docstrings
- Use Google-style docstrings

Example:
```python
def get_product_by_sku(sku: str) -> dict:
    """
    Get a product by SKU.
    
    Args:
        sku: The product SKU
        
    Returns:
        Product dictionary with all fields
        
    Raises:
        ValueError: If product not found
    """
    # Implementation
```

### Error Handling

- Use specific exceptions (not bare `Exception`)
- Log errors with meaningful context
- Return appropriate HTTP status codes

## API Documentation

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for detailed API endpoint documentation.

## Common Tasks

### Adding a New Feature

1. Create/update SQLAlchemy models in `utils/models_orm.py`
2. Create Alembic migration: `alembic revision --autogenerate -m "Description"`
3. Implement service layer in `services/`
4. Create routes in `routes/`
5. Write tests in `tests/`
6. Run linting and tests: `make check`

### Debugging

Enable SQLAlchemy logging by setting in `.env`:
```env
SQLALCHEMY_ECHO=true
```

### Clearing Cache

```python
from utils.cache_service import get_cache_service

cache = get_cache_service()
cache.clear_all()
```

## Useful Commands

```bash
# Development
make help              # Show all available commands
make install          # Install dependencies
make format           # Format code
make lint             # Run linters
make test             # Run tests
make test-cov         # Run tests with coverage

# Database
make db-init          # Initialize database
make db-migrate       # Run migrations

# Cleanup
make clean            # Remove temporary files
```

## Troubleshooting

### Database Connection Issues

1. Verify PostgreSQL is running
2. Check credentials in `.env`
3. Ensure database exists: `createdb siprems_db`

### Import Errors

Make sure the project root is in your PYTHONPATH:
```bash
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
```

### Celery Worker Not Starting

1. Verify Redis is running
2. Check CELERY_BROKER_URL in `.env`
3. Check worker logs for errors

## Resources

- [Flask Documentation](https://flask.palletsprojects.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Alembic Documentation](https://alembic.sqlalchemy.org/)
- [Pytest Documentation](https://docs.pytest.org/)
- [Black Documentation](https://black.readthedocs.io/)

## Support

For issues or questions, please refer to the project documentation or create an issue in the repository.
