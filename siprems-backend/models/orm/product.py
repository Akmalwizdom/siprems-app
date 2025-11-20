"""Product ORM model for inventory management."""

from datetime import datetime
from typing import Optional

from sqlalchemy import Column, Integer, String, Float, DateTime, Index
from models.orm.base import Base


class Product(Base):
    """
    Product model for inventory management and tracking.

    Attributes:
        product_id: Unique product identifier (primary key).
        sku: Stock Keeping Unit (unique).
        name: Product name.
        category: Product category for classification.
        variation: Product variation or variant type.
        price: Current unit price.
        stock: Current stock quantity.
        created_at: Product creation timestamp.
    """

    __tablename__ = "products"

    product_id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False, index=True)
    variation = Column(String(255), nullable=True)
    price = Column(Float, nullable=False)
    stock = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("idx_category_stock", "category", "stock"),
    )

    def __repr__(self) -> str:
        """String representation of Product."""
        return f"<Product(product_id={self.product_id}, sku='{self.sku}', name='{self.name}')>"

    def to_dict(self) -> dict:
        """
        Convert product to dictionary.

        Returns:
            Dictionary representation of product data.
        """
        return {
            "product_id": self.product_id,
            "sku": self.sku,
            "name": self.name,
            "category": self.category,
            "variation": self.variation,
            "price": self.price,
            "stock": self.stock,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
