# Testing Guide

## Overview

This project uses Pytest for unit and integration testing. All tests are located in the `tests/` directory.

## Test Structure

```
tests/
├── __init__.py
├── conftest.py              # Pytest fixtures and configuration
├── test_product_service.py  # Product service tests
├── test_user_service.py     # User service tests
├── test_transaction_service.py  # Transaction service tests
└── test_api/               # API integration tests (future)
```

## Running Tests

### Run All Tests

```bash
pytest
```

Or using make:
```bash
make test
```

### Run Specific Test File

```bash
pytest tests/test_product_service.py
```

### Run Specific Test Class

```bash
pytest tests/test_product_service.py::TestProductService
```

### Run Specific Test Method

```bash
pytest tests/test_product_service.py::TestProductService::test_create_product_success
```

### Run with Coverage

```bash
make test-cov
```

This generates:
- Terminal report with coverage percentages
- HTML report in `htmlcov/index.html`

### Run with Verbose Output

```bash
pytest -v
```

### Run with Markers

```bash
pytest -m "unit"      # Run only unit tests
pytest -m "integration"  # Run only integration tests
```

### Run in Watch Mode

```bash
pytest-watch
```

## Test Organization

### Unit Tests

Unit tests should test individual functions/methods in isolation.

**Example:**
```python
def test_create_product_success(self):
    """Test successful product creation."""
    data = {
        "name": "Test Product",
        "category": "Electronics",
        "price": 99.99,
        "stock": 50,
        "sku": "TEST-SKU"
    }
    
    product = ProductService.create_product(data)
    
    assert product["name"] == "Test Product"
    assert product["sku"] == "TEST-SKU"
    assert product["stock"] == 50
```

### Integration Tests

Integration tests verify that multiple components work together correctly.

**Example:**
```python
def test_transaction_updates_product_stock(self):
    """Test that creating a transaction updates product stock."""
    # Create product
    product = ProductService.create_product({
        "name": "Test",
        "category": "Electronics",
        "price": 99.99,
        "stock": 100,
        "sku": "TEST"
    })
    
    # Create transaction
    transaction = TransactionService.create_transaction({
        "product_sku": "TEST",
        "quantity": 10
    })
    
    # Verify stock was updated
    updated = ProductService.get_product_by_sku("TEST")
    assert updated["stock"] == 90
```

## Fixtures

Fixtures provide test data and setup/teardown. They're defined in `conftest.py`.

### Available Fixtures

#### `test_app`
Flask application configured for testing.

```python
def test_app_exists(test_app):
    assert test_app.config["TESTING"] is True
```

#### `client`
Flask test client for making HTTP requests.

```python
def test_get_products(client, auth_headers):
    response = client.get("/products", headers=auth_headers)
    assert response.status_code == 200
```

#### `auth_headers`
Authorization headers for authenticated requests.

```python
def test_create_product(client, auth_headers):
    response = client.post(
        "/products",
        json={"name": "Test", ...},
        headers=auth_headers
    )
```

#### `sample_user`, `sample_product`, `sample_transaction`, `sample_event`
Pre-created test objects.

```python
def test_user_login(sample_user):
    # sample_user is already created in database
    assert sample_user.email == "sample@example.com"
```

### Creating Custom Fixtures

Add fixtures to `conftest.py`:

```python
@pytest.fixture
def authenticated_user(client):
    """Create and return authenticated user."""
    user_data = {
        "email": "auth@example.com",
        "full_name": "Auth User",
        "password": "SecurePass123!"
    }
    
    client.post("/auth/register", json=user_data)
    
    response = client.post(
        "/auth/login",
        json={"email": user_data["email"], "password": user_data["password"]}
    )
    
    return response.get_json()
```

## Assertions

### Common Assertions

```python
# Equality
assert user["email"] == "test@example.com"

# Containment
assert "error" in response.json

# Type checking
assert isinstance(products, list)

# Comparisons
assert product["stock"] > 0
assert len(products) >= 5

# Exceptions
with pytest.raises(ValueError) as exc_info:
    ProductService.get_product_by_sku("INVALID")
assert "not found" in str(exc_info.value)

# Floating point comparisons
assert revenue == pytest.approx(expected, rel=0.01)
```

## Mocking

Use `unittest.mock` for mocking external dependencies:

```python
from unittest.mock import patch, MagicMock

def test_with_mocked_redis(self):
    with patch('utils.cache_service.redis') as mock_redis:
        mock_redis.get.return_value = None
        # Test code
```

## Best Practices

### 1. Test Names

Use descriptive names that explain what is being tested:

```python
# Good
def test_create_product_with_duplicate_sku_raises_error(self):

# Bad
def test_product(self):
```

### 2. One Assertion Per Test (Usually)

Keep tests focused on one aspect:

```python
# Good
def test_product_has_correct_price(self):
    product = ProductService.create_product(data)
    assert float(product["price"]) == 99.99

# Less ideal
def test_product_creation(self):
    product = ProductService.create_product(data)
    assert product["name"] == "Test"
    assert float(product["price"]) == 99.99
    assert product["stock"] == 50
```

### 3. Use AAA Pattern

Arrange, Act, Assert:

```python
def test_update_product_stock(self):
    # Arrange
    product = ProductService.create_product(data)
    product_id = product["product_id"]
    
    # Act
    result = ProductService.update_product_stock(product_id, -10)
    
    # Assert
    assert result["stock"] == 90
```

### 4. Test Edge Cases

```python
def test_create_transaction_with_zero_quantity(self):
    """Edge case: creating transaction with zero quantity."""
    with pytest.raises(ValueError):
        TransactionService.create_transaction({
            "product_sku": "TEST",
            "quantity": 0
        })
```

### 5. Clean Test Data

Tests should be isolated and not affect each other:

```python
def test_user_registration(self):
    """This test starts with clean state."""
    # Database is reset before this test
    result = UserService.register_user(...)
    assert result  # Should not fail due to previous tests
```

## Coverage

### Check Coverage

```bash
pytest --cov=./ --cov-report=term-missing
```

### Coverage Minimum

The project aims for at least 70% code coverage. Check `pyproject.toml`:

```toml
[tool.pytest.ini_options]
addopts = "--cov-fail-under=70"
```

### Exclude From Coverage

Files can be excluded in `.coverage` or `pyproject.toml`:

```toml
[tool.coverage.run]
omit = [
    "*/tests/*",
    "*/venv/*",
    "alembic/*",
]
```

## Test Categories

### Unit Tests

Testing individual functions/methods:
- Service layer methods
- Utility functions
- Data validation

### Integration Tests

Testing multiple components:
- Service + Database interactions
- API endpoints + Services
- Complex workflows

### API Tests

Testing HTTP endpoints:
- Request/response formats
- Error handling
- Authentication/Authorization

## Common Issues

### Issue: Tests Fail Intermittently

**Cause**: Tests are not properly isolated or depend on execution order.

**Solution**: Ensure each test is independent and uses fixtures properly.

### Issue: Database Already Exists Error

**Cause**: Test database wasn't cleaned up from previous run.

**Solution**: Pytest sessions handle cleanup automatically with fixtures.

### Issue: Import Errors in Tests

**Cause**: Python path not configured correctly.

**Solution**: Ensure `conftest.py` adds parent directory to sys.path:

```python
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
```

## CI/CD Integration

Tests are automatically run in CI/CD pipelines. See [GitHub Actions Configuration](./.github/workflows/main.yml).

## Performance

### Slow Tests

Identify slow tests:
```bash
pytest --durations=10
```

This shows the 10 slowest tests. Optimize database queries or use mocking.

### Parallel Execution

Run tests in parallel with pytest-xdist:

```bash
pip install pytest-xdist
pytest -n auto
```

## Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [Pytest Best Practices](https://docs.pytest.org/en/latest/goodpractices.html)
- [Testing Flask Applications](https://flask.palletsprojects.com/testing/)
- [SQLAlchemy Testing](https://docs.sqlalchemy.org/testing/)

## Next Steps

1. Write tests for all new features
2. Maintain coverage above 70%
3. Run `make check` before committing
4. Use pre-commit hooks for automatic checks
