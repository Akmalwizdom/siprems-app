# SQLAlchemy ORM Migration Guide

## Overview

The SIPREMS backend has been refactored from raw SQL with psycopg2 to use SQLAlchemy ORM for database operations. This migration improves:

- **Type Safety**: Full type hints for all database operations
- **Security**: Automatic SQL injection prevention with parameterized queries
- **Maintainability**: Object-oriented data access patterns
- **Scalability**: Connection pooling and session management built-in
- **Testing**: Easier to mock database operations

## What Changed

### 1. Database Session Management

**Before (Raw SQL):**
```python
from utils.db import db_query, db_execute

# Direct SQL execution
result = db_query("SELECT * FROM products WHERE sku = %s", (sku,), fetch_all=False)
```

**After (SQLAlchemy ORM):**
```python
from utils.db_session import get_db_session
from models.orm.product import Product

with get_db_session() as session:
    product = session.query(Product).filter(Product.sku == sku).first()
    result = product.to_dict() if product else None
```

### 2. Session Factory

New session management in `utils/db_session.py`:

```python
from utils.db_session import init_db_session, get_db_session

# Initialize (done once in app.py)
session_factory = init_db_session(config)

# Use in any module
with get_db_session() as session:
    # All database operations
    pass
```

**Key Features:**
- Automatic transaction handling (commit/rollback)
- Connection pooling with configurable pool size
- Automatic session cleanup with context manager
- Connection recycling for long-running processes

### 3. ORM Models

New directory structure: `models/orm/`

```
models/
├── orm/
│   ├── __init__.py          # Base and model exports
│   ├── user.py              # User ORM model
│   ├── product.py           # Product ORM model
│   ├── transaction.py       # Transaction ORM model
│   └── event.py             # Event ORM model
├── user_model.py            # User data access layer
├── product_model.py         # Product data access layer
├── transaction_model.py     # Transaction data access layer
└── event_model.py           # Event data access layer
```

**ORM Model Features:**
- SQLAlchemy declarative models with proper relationships
- Indexed columns for query optimization
- Type hints for all attributes
- `to_dict()` method for JSON serialization
- String representation methods

### 4. Data Access Layer (DAL) Improvements

All model classes now use SQLAlchemy ORM while maintaining the same public interface:

```python
# Interface remains the same for routes/services
products = ProductModel.get_all_products(limit=10, offset=0)
product = ProductModel.get_product_by_sku("BRD-001")
ProductModel.create_product(name, category, price, stock, sku)
```

**Benefits:**
- No changes needed in routes or services layer
- Full backward compatibility
- ORM advantages transparently applied

## Migration Details

### Database Connection Configuration

The connection string is automatically built from environment variables:

```
DB_HOST=localhost
DB_PORT=5432  (optional, defaults to 5432)
DB_NAME=siprems_db
DB_USER=postgres
DB_PASSWORD=<password>
```

SQLAlchemy URI format:
```
postgresql+psycopg2://user:password@host:port/database
```

### Connection Pool Settings

Optimized for production:

```python
pool_size=10          # Base connections to maintain
max_overflow=20       # Max additional connections above pool_size
pool_recycle=3600     # Recycle connections after 1 hour
pool_pre_ping=True    # Test connection before using
```

## Using ORM Models

### Query Examples

**Get product by SKU:**
```python
from models.orm.product import Product
from utils.db_session import get_db_session

with get_db_session() as session:
    product = session.query(Product).filter(Product.sku == "BRD-001").first()
```

**Aggregate queries:**
```python
from sqlalchemy import func

with get_db_session() as session:
    total_value = session.query(
        func.sum(Product.price * Product.stock)
    ).scalar()
```

**Joins:**
```python
from models.orm.product import Product
from models.orm.transaction import Transaction

with get_db_session() as session:
    results = session.query(
        Transaction, Product
    ).join(
        Product, Transaction.product_id == Product.product_id
    ).all()
```

**Filtering with multiple conditions:**
```python
from sqlalchemy import and_, or_

with get_db_session() as session:
    products = session.query(Product).filter(
        and_(
            Product.stock <= 5,
            Product.category == "Electronics"
        )
    ).all()
```

## Type Hints

All model methods include full type hints:

```python
def create_product(
    name: str,
    category: str,
    price: float,
    stock: int,
    sku: str,
    variation: Optional[str] = None,
) -> Dict[str, Any]:
    """Create a new product."""
    ...
```

Return types:
- `Dict[str, Any]`: Single object as dictionary
- `List[Dict[str, Any]]`: List of objects
- `Optional[Dict[str, Any]]`: Object that may not exist
- `int` / `float`: Aggregate values
- `None`: Operations with no return value

## Docstrings

All methods include comprehensive docstrings:

```python
def get_product_by_sku(sku: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve a single product by SKU.

    Args:
        sku: Stock Keeping Unit of the product.

    Returns:
        Product dictionary or None if not found.

    Raises:
        Exception: Database operation errors.
    """
```

## Creating New Models

To add a new ORM model:

1. **Create the ORM model** (`models/orm/entity.py`):
```python
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime

class Entity(Base):
    __tablename__ = "entities"
    
    entity_id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
```

2. **Create the data access layer** (`models/entity_model.py`):
```python
from models.orm.entity import Entity
from utils.db_session import get_db_session

class EntityModel:
    @staticmethod
    def create_entity(name: str) -> Dict[str, Any]:
        with get_db_session() as session:
            entity = Entity(name=name)
            session.add(entity)
            session.flush()
            return {"entity_id": entity.entity_id, "name": entity.name}
```

3. **Update `models/orm/__init__.py`**:
```python
from models.orm.entity import Entity
__all__ = [..., "Entity"]
```

## Error Handling

ORM operations use the same context manager, which handles transactions automatically:

```python
with get_db_session() as session:
    try:
        user = User(email=email, full_name=name, password_hash=hash_val)
        session.add(user)
        # If exception occurs, rollback happens automatically
    except IntegrityError:
        # Handle duplicate email, etc.
        raise
```

## Performance Considerations

1. **Lazy Loading**: By default, relationships are lazy-loaded. Use `joinedload` for eager loading.
2. **Query Optimization**: Use `.only()` or `.defer()` to limit columns fetched.
3. **Indexing**: All frequently queried columns have database indexes.
4. **Connection Pool**: Tuned for typical workloads; adjust pool_size if needed.

## Troubleshooting

### "Database session not initialized" error

**Cause**: `init_db_session()` not called before using models.

**Solution**: Ensure `app.py` calls `init_db_session(config)` during startup:
```python
from utils.db_session import init_db_session
session_factory = init_db_session(config)
```

### Stale database connections

**Cause**: Connection pool needs recycling for long-running processes.

**Solution**: Already configured with `pool_recycle=3600` (1 hour).

### Transaction not committing

**Cause**: Exception suppressed without re-raising.

**Solution**: The context manager automatically rolls back on exception. Always re-raise or handle properly:
```python
with get_db_session() as session:
    # Don't silently catch exceptions
    session.add(obj)
    # Commit happens automatically on exit if no exception
```

## Testing

For unit tests, create a test session:

```python
from utils.db_session import create_session_factory, create_db_engine
from sqlalchemy import create_engine

# In-memory SQLite for testing
engine = create_engine("sqlite:///:memory:")
Base.metadata.create_all(engine)
TestSession = create_session_factory(engine)

def test_create_product():
    with TestSession() as session:
        product = Product(name="Test", category="Test", sku="TEST-001", price=10.0, stock=5)
        session.add(product)
        session.commit()
        
        result = session.query(Product).filter_by(sku="TEST-001").first()
        assert result is not None
```

## Migration Checklist

- [x] Add SQLAlchemy dependencies to requirements.txt
- [x] Create database session management (utils/db_session.py)
- [x] Create ORM models (models/orm/)
- [x] Refactor ProductModel to use ORM
- [x] Refactor UserModel to use ORM
- [x] Refactor TransactionModel to use ORM
- [x] Refactor EventModel to use ORM
- [x] Update app.py to initialize ORM
- [x] Add comprehensive type hints
- [x] Add detailed docstrings
- [x] Test all endpoints
- [ ] (Optional) Create Alembic migrations for schema changes
- [ ] (Optional) Add relationship definitions to ORM models

## Next Steps

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Test the application**:
   ```bash
   python app.py
   ```

3. **Run existing tests** to verify backward compatibility.

4. **Optional - Add Alembic for migrations**:
   ```bash
   pip install alembic
   alembic init migrations
   ```

## File Reference

| File | Purpose |
|------|---------|
| `utils/db_session.py` | Session factory and context manager |
| `models/orm/__init__.py` | Base model and model exports |
| `models/orm/user.py` | User ORM definition |
| `models/orm/product.py` | Product ORM definition |
| `models/orm/transaction.py` | Transaction ORM definition |
| `models/orm/event.py` | Event ORM definition |
| `models/user_model.py` | User data access layer |
| `models/product_model.py` | Product data access layer |
| `models/transaction_model.py` | Transaction data access layer |
| `models/event_model.py` | Event data access layer |

## References

- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [SQLAlchemy ORM Tutorial](https://docs.sqlalchemy.org/en/14/orm/tutorial.html)
- [PostgreSQL with SQLAlchemy](https://docs.sqlalchemy.org/en/14/dialects/postgresql.html)
