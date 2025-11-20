# SQLAlchemy ORM Quick Start Guide

A quick reference guide for working with the SQLAlchemy ORM in SIPREMS backend.

## Basic Setup

### Initialize DB Session (in app.py)
```python
from utils.db_session import init_db_session
from utils.config import get_config

config = get_config()
session_factory = init_db_session(config)
```

## Common Operations

### Get All Records
```python
from models.orm.product import Product
from utils.db_session import get_db_session

with get_db_session() as session:
    products = session.query(Product).all()
    for product in products:
        print(product.to_dict())
```

### Get Single Record by ID
```python
with get_db_session() as session:
    product = session.query(Product).filter(Product.product_id == 1).first()
    if product:
        return product.to_dict()
```

### Get Single Record by Condition
```python
with get_db_session() as session:
    product = session.query(Product).filter(Product.sku == "BRD-001").first()
```

### Filtering with Multiple Conditions
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

### Create New Record
```python
with get_db_session() as session:
    product = Product(
        name="Widget",
        category="Gadgets",
        sku="WID-001",
        price=19.99,
        stock=100
    )
    session.add(product)
    # Auto-commits on successful context manager exit
    # Returns: product.to_dict() after flush
```

### Update Record
```python
with get_db_session() as session:
    product = session.query(Product).filter_by(sku="BRD-001").first()
    if product:
        product.name = "Updated Name"
        product.price = 29.99
        # Auto-commits on context manager exit
```

### Delete Record
```python
with get_db_session() as session:
    product = session.query(Product).filter_by(sku="BRD-001").first()
    if product:
        session.delete(product)
        # Auto-commits on context manager exit
```

## Common Queries

### Count Records
```python
from sqlalchemy import func

with get_db_session() as session:
    count = session.query(func.count(Product.product_id)).scalar()
    print(f"Total products: {count}")
```

### Aggregate Sum
```python
total_value = session.query(
    func.sum(Product.price * Product.stock)
).scalar()
```

### Aggregate Average
```python
avg_price = session.query(
    func.avg(Product.price)
).scalar()
```

### Pagination
```python
limit = 10
offset = 20

products = session.query(Product)\
    .limit(limit)\
    .offset(offset)\
    .all()
```

### Ordering
```python
# Ascending
products = session.query(Product).order_by(Product.name.asc()).all()

# Descending
products = session.query(Product).order_by(Product.stock.desc()).all()
```

## Join Queries

### Simple Join
```python
from models.orm.product import Product
from models.orm.transaction import Transaction

with get_db_session() as session:
    results = session.query(
        Transaction,
        Product
    ).join(
        Product,
        Transaction.product_id == Product.product_id
    ).all()
```

### Select Specific Columns from Join
```python
with get_db_session() as session:
    results = session.query(
        Product.name,
        func.sum(Transaction.quantity_sold).label("total_sold")
    ).join(
        Transaction,
        Transaction.product_id == Product.product_id
    ).group_by(Product.name).all()
    
    for name, total in results:
        print(f"{name}: {total} units sold")
```

## Error Handling

### Handle Duplicate Key
```python
from sqlalchemy.exc import IntegrityError

try:
    with get_db_session() as session:
        product = Product(
            name="Duplicate",
            category="Test",
            sku="DUP-001",
            price=10.0,
            stock=5
        )
        session.add(product)
except IntegrityError:
    print("Product with this SKU already exists")
```

### Automatic Rollback
```python
# If an exception occurs, rollback is automatic
with get_db_session() as session:
    product = Product(...)
    session.add(product)
    # If this raises an exception, the transaction rolls back
    result = some_risky_operation()
```

## Data Access Layer Pattern

When adding new model methods, follow this pattern:

```python
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from utils.db_session import get_db_session
from models.orm.entity import Entity

class EntityModel:
    """Data access layer for entities."""
    
    @staticmethod
    def get_entity(entity_id: int) -> Optional[Dict[str, Any]]:
        """
        Retrieve a single entity by ID.
        
        Args:
            entity_id: Unique entity identifier.
        
        Returns:
            Entity dictionary or None if not found.
        
        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            entity = session.query(Entity).filter(
                Entity.id == entity_id
            ).first()
            return entity.to_dict() if entity else None
    
    @staticmethod
    def get_all_entities(limit: int = 100) -> List[Dict[str, Any]]:
        """
        Retrieve all entities with pagination.
        
        Args:
            limit: Maximum results to return.
        
        Returns:
            List of entity dictionaries.
        """
        with get_db_session() as session:
            entities = session.query(Entity).limit(limit).all()
            return [e.to_dict() for e in entities]
```

## Transaction Control

### Explicit Commit
```python
with get_db_session() as session:
    product = Product(...)
    session.add(product)
    # Commits automatically when exiting context
```

### Multiple Operations in One Transaction
```python
with get_db_session() as session:
    # All these operations happen in one transaction
    product1 = Product(...)
    session.add(product1)
    
    product2 = Product(...)
    session.add(product2)
    
    # Both commit or both rollback together
```

### Flush Without Commit
```python
with get_db_session() as session:
    product = Product(...)
    session.add(product)
    session.flush()  # Writes to DB but doesn't commit
    # Can still rollback after flush
```

## Working with Relationships

### Define Relationship in ORM Model
```python
from sqlalchemy.orm import relationship

class User(Base):
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True)
    name = Column(String)
    
    # Define relationship
    orders = relationship("Order", back_populates="user")
```

### Access Related Data
```python
with get_db_session() as session:
    user = session.query(User).first()
    for order in user.orders:  # Access related orders
        print(order.to_dict())
```

## Type Hints Reference

```python
# Single object
def get_product(...) -> Optional[Dict[str, Any]]:

# List of objects
def get_products(...) -> List[Dict[str, Any]]:

# Scalar values
def get_count(...) -> int:
def get_total(...) -> float:

# Nothing returned
def create_record(...) -> None:
```

## Common Mistakes to Avoid

### ❌ Don't: Forget context manager
```python
# Wrong - session not closed
session = get_session()
product = session.query(Product).first()
```

### ✅ Do: Use context manager
```python
# Correct - automatic cleanup
with get_db_session() as session:
    product = session.query(Product).first()
```

### ❌ Don't: Access objects after context
```python
with get_db_session() as session:
    product = session.query(Product).first()
    
# ❌ Wrong - session closed, object may be detached
print(product.name)
```

### ✅ Do: Convert to dict inside context
```python
with get_db_session() as session:
    product = session.query(Product).first()
    result = product.to_dict()

# ✅ Correct - dict is serializable
print(result)
```

### ❌ Don't: Use raw string values
```python
# Wrong - SQL injection possible if not careful
query = f"SELECT * FROM products WHERE name = '{name}'"
```

### ✅ Do: Use parameterized queries
```python
# Correct - SQLAlchemy handles parameterization
products = session.query(Product).filter(
    Product.name == name
).all()
```

## Performance Tips

1. **Use eager loading for known relationships**:
```python
from sqlalchemy.orm import joinedload

products = session.query(Product).options(
    joinedload(Product.transactions)
).all()
```

2. **Limit columns in aggregations**:
```python
session.query(Product.id, Product.name).all()  # Only get needed columns
```

3. **Use indexes** (automatically created from model definitions):
```python
Product.sku  # Indexed for fast lookups
Product.category  # Indexed
```

4. **Batch operations**:
```python
with get_db_session() as session:
    for data in items:
        product = Product(**data)
        session.add(product)
    # All committed together
```

## Debugging

### Enable SQL Logging
```python
from utils.db_session import create_db_engine
engine = create_db_engine()
engine.echo = True  # Print all SQL statements
```

### Inspect Query Before Execution
```python
query = session.query(Product).filter(Product.sku == "BRD-001")
print(str(query))  # See the generated SQL
result = query.all()
```

## Reference

- **Session Context Manager**: `get_db_session()`
- **Engine Access**: `get_db_engine()`
- **Session Factory**: Initialized via `init_db_session(config)`
- **ORM Models**: `models/orm/` directory
- **Data Access Layers**: `models/` directory (*.py files)
- **Configuration**: `utils/config.py`
- **Detailed Guide**: See `ORM_MIGRATION_GUIDE.md`
