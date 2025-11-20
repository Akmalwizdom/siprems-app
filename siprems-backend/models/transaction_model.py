"""Transaction data access layer using SQLAlchemy ORM."""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from sqlalchemy import func, and_, text
from sqlalchemy.orm import Session

from models.orm.transaction import Transaction
from models.orm.product import Product
from utils.db_session import get_db_session


class TransactionModel:
    """
    Data access layer for transaction operations.

    Handles all database operations related to sales transactions including
    CRUD operations and sales analytics.
    """

    @staticmethod
    def get_all_transactions(
        limit: int = 100, offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Retrieve recent transactions with product details using pagination.

        Args:
            limit: Maximum number of transactions to return. Defaults to 100.
            offset: Number of transactions to skip (for pagination).

        Returns:
            List of transaction dictionaries with product information.

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            transactions = (
                session.query(
                    Transaction.transaction_id,
                    Transaction.transaction_date,
                    Product.name.label("product_name"),
                    Product.sku,
                    Transaction.quantity_sold,
                    Transaction.price_per_unit,
                    Transaction.is_promo,
                )
                .join(Product, Transaction.product_id == Product.product_id)
                .order_by(Transaction.transaction_date.desc())
                .limit(limit)
                .offset(offset)
                .all()
            )

            return [
                {
                    "transaction_id": t[0],
                    "transaction_date": t[1].isoformat() if t[1] else None,
                    "product_name": t[2],
                    "sku": t[3],
                    "quantity_sold": t[4],
                    "price_per_unit": t[5],
                    "is_promo": t[6],
                }
                for t in transactions
            ]

    @staticmethod
    def get_transaction_by_id(transaction_id: int) -> Optional[Dict[str, Any]]:
        """
        Retrieve a single transaction with product details.

        Args:
            transaction_id: Unique transaction identifier.

        Returns:
            Transaction dictionary with product details, or None if not found.

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            transaction = (
                session.query(
                    Transaction.transaction_id,
                    Transaction.transaction_date,
                    Product.name.label("product_name"),
                    Product.sku,
                    Transaction.quantity_sold,
                    Transaction.price_per_unit,
                    Transaction.is_promo,
                )
                .join(Product, Transaction.product_id == Product.product_id)
                .filter(Transaction.transaction_id == transaction_id)
                .first()
            )

            if not transaction:
                return None

            return {
                "transaction_id": transaction[0],
                "transaction_date": (
                    transaction[1].isoformat() if transaction[1] else None
                ),
                "product_name": transaction[2],
                "sku": transaction[3],
                "quantity_sold": transaction[4],
                "price_per_unit": transaction[5],
                "is_promo": transaction[6],
            }

    @staticmethod
    def create_transaction(
        product_id: int, quantity_sold: int, price_per_unit: float, is_promo: bool = False
    ) -> Dict[str, Any]:
        """
        Create a new transaction.

        Args:
            product_id: Reference to product being transacted.
            quantity_sold: Quantity of product in transaction.
            price_per_unit: Unit price at time of transaction.
            is_promo: Whether this is a promotional transaction. Defaults to False.

        Returns:
            Created transaction dictionary.

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            transaction = Transaction(
                product_id=product_id,
                quantity_sold=quantity_sold,
                price_per_unit=price_per_unit,
                is_promo=is_promo,
                transaction_date=datetime.now(timezone.utc),
            )
            session.add(transaction)
            session.flush()
            return transaction.to_dict()

    @staticmethod
    def get_daily_transaction_count() -> int:
        """
        Get the number of transactions that occurred today.

        Returns:
            Count of transactions for the current date.

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            count = (
                session.query(func.count(Transaction.transaction_id))
                .filter(
                    func.date(Transaction.transaction_date) == func.current_date()
                )
                .scalar()
            )
            return count or 0

    @staticmethod
    def get_sales_trend(days: int = 7) -> List[Dict[str, Any]]:
        """
        Get sales trend (quantity sold) for the last N days.

        Aggregates transactions by date and sums quantities.

        Args:
            days: Number of days to analyze. Defaults to 7.

        Returns:
            List of dictionaries with date and daily sales totals.

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            results = (
                session.query(
                    func.date(Transaction.transaction_date).label("date"),
                    func.coalesce(func.sum(Transaction.quantity_sold), 0).label("sales"),
                )
                .filter(
                    Transaction.transaction_date
                    >= func.current_date()
                    - text(f"INTERVAL '{days - 1} days'")
                )
                .group_by(func.date(Transaction.transaction_date))
                .order_by("date")
                .all()
            )

            return [
                {
                    "date": str(result[0]),
                    "sales": int(result[1]),
                }
                for result in results
            ]

    @staticmethod
    def get_stock_comparison(limit: int = 5) -> List[Dict[str, Any]]:
        """
        Get products with lowest stock for comparison analysis.

        Calculates optimal stock levels based on current stock.

        Args:
            limit: Maximum number of products to return. Defaults to 5.

        Returns:
            List of product stock comparison dictionaries.

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            products = (
                session.query(
                    Product.name.label("product"),
                    Product.stock.label("current"),
                )
                .order_by(Product.stock.asc())
                .limit(limit)
                .all()
            )

            return [
                {
                    "product": product[0],
                    "current": product[1],
                    "optimal": 40 if product[1] < 20 else product[1] + 20,
                }
                for product in products
            ]

    @staticmethod
    def get_transactions_by_product_sku(sku: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get all transactions for a specific product by SKU.

        Args:
            sku: Product Stock Keeping Unit.
            limit: Maximum number of transactions to return. Defaults to 100.

        Returns:
            List of transaction dictionaries for the product.

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            transactions = (
                session.query(
                    Transaction.transaction_id,
                    Transaction.transaction_date,
                    Transaction.quantity_sold,
                    Transaction.price_per_unit,
                    Transaction.is_promo,
                )
                .join(Product, Transaction.product_id == Product.product_id)
                .filter(Product.sku == sku)
                .order_by(Transaction.transaction_date.desc())
                .limit(limit)
                .all()
            )

            return [
                {
                    "transaction_id": t[0],
                    "transaction_date": t[1].isoformat() if t[1] else None,
                    "quantity_sold": t[2],
                    "price_per_unit": t[3],
                    "is_promo": t[4],
                }
                for t in transactions
            ]

    @staticmethod
    def get_total_revenue() -> float:
        """
        Calculate total revenue from all transactions.

        Returns:
            Total revenue (sum of quantity_sold * price_per_unit).

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            result = session.query(
                func.coalesce(
                    func.sum(
                        Transaction.quantity_sold * Transaction.price_per_unit
                    ),
                    0,
                )
            ).scalar()
            return float(result) if result else 0.0

    @staticmethod
    def get_product_sales_stats(sku: str, days: int = 30) -> Optional[Dict[str, Any]]:
        """
        Get sales statistics for a specific product over a time period.

        Includes transaction count, quantities, revenue, and aggregates.

        Args:
            sku: Product Stock Keeping Unit.
            days: Number of days to analyze. Defaults to 30.

        Returns:
            Dictionary with sales statistics or None if product has no transactions.

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            result = (
                session.query(
                    func.count(Transaction.transaction_id).label("total_transactions"),
                    func.sum(Transaction.quantity_sold).label("total_quantity"),
                    func.sum(
                        Transaction.quantity_sold * Transaction.price_per_unit
                    ).label("total_revenue"),
                    func.avg(Transaction.quantity_sold).label("avg_quantity"),
                    func.max(Transaction.quantity_sold).label("max_quantity"),
                    func.min(Transaction.quantity_sold).label("min_quantity"),
                )
                .join(Product, Transaction.product_id == Product.product_id)
                .filter(
                    and_(
                        Product.sku == sku,
                        Transaction.transaction_date
                        >= func.current_date() - text(f"INTERVAL '{days} days'"),
                    )
                )
                .first()
            )

            if not result or not result[0]:
                return None

            return {
                "total_transactions": result[0],
                "total_quantity": result[1],
                "total_revenue": float(result[2]) if result[2] else 0.0,
                "avg_quantity": float(result[3]) if result[3] else 0.0,
                "max_quantity": result[4],
                "min_quantity": result[5],
            }
