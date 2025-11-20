"""
SQLAlchemy ORM models for the application.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Numeric, Boolean, DateTime, ForeignKey, Enum, Text, Date, Index
from sqlalchemy.orm import relationship
from utils.database import Base
import enum


class EventType(str, enum.Enum):
    """Event type enumeration."""
    HOLIDAY = "holiday"
    PROMOTION = "promotion"
    SEASONAL = "seasonal"
    CUSTOM = "custom"


class User(Base):
    """User model for authentication."""
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        """String representation."""
        return f"<User(user_id={self.user_id}, email='{self.email}')>"


class Product(Base):
    """Product model."""
    __tablename__ = "products"

    product_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=True, index=True)
    variation = Column(String(100), nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    stock = Column(Integer, default=0, nullable=False)
    sku = Column(String(100), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    transactions = relationship("Transaction", back_populates="product", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_products_category", "category"),
    )

    def __repr__(self):
        """String representation."""
        return f"<Product(product_id={self.product_id}, sku='{self.sku}', name='{self.name}')>"


class Transaction(Base):
    """Transaction model."""
    __tablename__ = "transactions"

    transaction_id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.product_id", ondelete="RESTRICT"), nullable=False)
    quantity_sold = Column(Integer, nullable=False)
    price_per_unit = Column(Numeric(10, 2), nullable=False)
    transaction_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_promo = Column(Boolean, default=False)

    product = relationship("Product", back_populates="transactions")

    __table_args__ = (
        Index("idx_transaction_date", "transaction_date"),
        Index("idx_product_id", "product_id"),
        Index("idx_transactions_product_date", "product_id", "transaction_date"),
        Index("idx_transactions_is_promo", "is_promo"),
        Index("idx_transactions_date_range", "transaction_date"),
        Index("idx_transactions_quantity_date", "quantity_sold", "transaction_date"),
    )

    def __repr__(self):
        """String representation."""
        return f"<Transaction(transaction_id={self.transaction_id}, product_id={self.product_id})>"


class Event(Base):
    """Event model for holidays and special events."""
    __tablename__ = "events"

    event_id = Column(Integer, primary_key=True, autoincrement=True)
    event_name = Column(String(255), nullable=False)
    event_date = Column(Date, nullable=False)
    type = Column(Enum(EventType), nullable=False)
    description = Column(Text, nullable=True)
    include_in_prediction = Column(Boolean, default=True)

    __table_args__ = (
        Index("idx_events_date", "event_date"),
        Index("idx_events_type", "type"),
    )

    def __repr__(self):
        """String representation."""
        return f"<Event(event_id={self.event_id}, event_name='{self.event_name}')>"
