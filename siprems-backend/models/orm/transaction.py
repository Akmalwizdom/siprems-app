"""Transaction ORM model for sales and inventory tracking."""

from datetime import datetime
from typing import Optional

from sqlalchemy import Column, Integer, Float, DateTime, Boolean, ForeignKey, Index
from sqlalchemy.orm import relationship
from models.orm.base import Base


class Transaction(Base):
    """
    Transaction model for recording sales and inventory movements.

    Attributes:
        transaction_id: Unique transaction identifier (primary key).
        product_id: Reference to product being transacted.
        quantity_sold: Quantity of product in this transaction.
        price_per_unit: Unit price at time of transaction.
        is_promo: Whether transaction was promotional pricing.
        transaction_date: Timestamp of the transaction.
    """

    __tablename__ = "transactions"

    transaction_id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.product_id"), nullable=False)
    quantity_sold = Column(Integer, nullable=False)
    price_per_unit = Column(Float, nullable=False)
    is_promo = Column(Boolean, default=False, nullable=False)
    transaction_date = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("idx_product_date", "product_id", "transaction_date"),
        Index("idx_transaction_date", "transaction_date"),
    )

    def __repr__(self) -> str:
        """String representation of Transaction."""
        return (
            f"<Transaction(transaction_id={self.transaction_id}, "
            f"product_id={self.product_id}, quantity={self.quantity_sold})>"
        )

    def to_dict(self) -> dict:
        """
        Convert transaction to dictionary.

        Returns:
            Dictionary representation of transaction data.
        """
        return {
            "transaction_id": self.transaction_id,
            "product_id": self.product_id,
            "quantity_sold": self.quantity_sold,
            "price_per_unit": self.price_per_unit,
            "is_promo": self.is_promo,
            "transaction_date": (
                self.transaction_date.isoformat() if self.transaction_date else None
            ),
        }
