"""Product ORM model for inventory management."""

from datetime import datetime
from typing import Optional

from sqlalchemy import Column, Integer, String, Float, DateTime, Index, Text
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
        cost_price: Cost price of the product.
        price: Selling price of the product.
        stock: Current stock quantity.
        description: Product description.
        created_at: Product creation timestamp.
    """

    __tablename__ = "products"

    product_id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False, index=True)
    variation = Column(String(255), nullable=True)
    cost_price = Column(Float, nullable=True)
    price = Column(Float, nullable=False)
    stock = Column(Integer, default=0, nullable=False)
    description = Column(Text, nullable=True)
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
            "cost_price": self.cost_price,
            "price": self.price,
            "stock": self.stock,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
