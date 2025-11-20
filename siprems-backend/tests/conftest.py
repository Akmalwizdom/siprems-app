"""Pytest configuration and fixtures."""
import os
import sys
from datetime import datetime

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app import create_app
from utils.config import TestingConfig
from utils.database import Base
from utils.models_orm import User, Product, Transaction, Event, EventType


@pytest.fixture(scope="session")
def test_app():
    """Create application for testing."""
    app = create_app(TestingConfig)
    app.config["TESTING"] = True
    return app


@pytest.fixture(scope="session")
def test_engine():
    """Create test database engine."""
    url = "sqlite:///:memory:"
    engine = create_engine(url, echo=False)
    Base.metadata.create_all(engine)
    return engine


@pytest.fixture(scope="function")
def test_session(test_engine):
    """Create test database session."""
    connection = test_engine.connect()
    transaction = connection.begin()
    session = sessionmaker(bind=connection)()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(test_app):
    """Create test client."""
    return test_app.test_client()


@pytest.fixture
def runner(test_app):
    """Create CLI runner."""
    return test_app.test_cli_runner()


@pytest.fixture
def auth_headers(client):
    """Create authorization headers for authenticated requests."""
    test_user = {
        "email": "test@example.com",
        "full_name": "Test User",
        "password": "SecurePassword123!",
    }

    client.post("/auth/register", json=test_user)
    response = client.post(
        "/auth/login",
        json={"email": test_user["email"], "password": test_user["password"]},
    )

    if response.status_code == 200:
        token = response.get_json().get("access_token")
        return {"Authorization": f"Bearer {token}"}

    return {}


@pytest.fixture
def sample_user(test_session):
    """Create sample user for testing."""
    from utils.password_handler import PasswordHandler

    user = User(
        email="sample@example.com",
        full_name="Sample User",
        password_hash=PasswordHandler.hash_password("TestPassword123!"),
        is_active=True,
    )
    test_session.add(user)
    test_session.commit()
    return user


@pytest.fixture
def sample_product(test_session):
    """Create sample product for testing."""
    product = Product(
        name="Test Product",
        category="Test Category",
        variation="Test Variation",
        price=99.99,
        stock=100,
        sku="TEST-SKU-001",
    )
    test_session.add(product)
    test_session.commit()
    return product


@pytest.fixture
def sample_transaction(test_session, sample_product):
    """Create sample transaction for testing."""
    transaction = Transaction(
        product_id=sample_product.product_id,
        quantity_sold=10,
        price_per_unit=sample_product.price,
        is_promo=False,
        transaction_date=datetime.utcnow(),
    )
    test_session.add(transaction)
    test_session.commit()
    return transaction


@pytest.fixture
def sample_event(test_session):
    """Create sample event for testing."""
    event = Event(
        event_name="Test Holiday",
        event_date="2024-12-25",
        type=EventType.HOLIDAY,
        description="Test holiday event",
        include_in_prediction=True,
    )
    test_session.add(event)
    test_session.commit()
    return event
