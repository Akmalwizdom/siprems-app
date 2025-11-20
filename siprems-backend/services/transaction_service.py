"""Transaction service for business logic operations."""
from datetime import datetime, timedelta
from utils.models_orm import Transaction, Product
from utils.database import get_session, DatabaseManager
from sqlalchemy import func, desc


class TransactionService:
    """Business logic layer for transaction operations."""

    @staticmethod
    def get_all_transactions(limit=100, offset=0):
        """Get recent transactions."""
        with DatabaseManager() as session:
            transactions = (
                session.query(Transaction)
                .join(Product)
                .order_by(desc(Transaction.transaction_date))
                .limit(limit)
                .offset(offset)
                .all()
            )

            return [
                {
                    "transaction_id": t.transaction_id,
                    "transaction_date": t.transaction_date.isoformat(),
                    "product_name": t.product.name,
                    "product_sku": t.product.sku,
                    "quantity_sold": t.quantity_sold,
                    "price_per_unit": float(t.price_per_unit),
                    "is_promo": t.is_promo,
                }
                for t in transactions
            ]

    @staticmethod
    def create_transaction(data):
        """Create a new transaction with validation."""
        if "product_sku" not in data:
            raise ValueError("Product SKU is required")
        if "quantity" not in data:
            raise ValueError("Quantity is required")

        with DatabaseManager() as session:
            product = session.query(Product).filter(Product.sku == data["product_sku"]).first()
            if not product:
                raise ValueError(f"Product with SKU {data['product_sku']} not found")

            quantity = int(data["quantity"])

            if product.stock < quantity:
                raise ValueError(
                    f"Insufficient stock. Available: {product.stock}, Requested: {quantity}"
                )

            try:
                transaction = Transaction(
                    product_id=product.product_id,
                    quantity_sold=quantity,
                    price_per_unit=product.price,
                    is_promo=data.get("is_promo", False),
                    transaction_date=datetime.utcnow(),
                )
                product.stock -= quantity
                session.add(transaction)
                session.commit()

                return {
                    "transaction_id": transaction.transaction_id,
                    "product_id": product.product_id,
                    "product_name": product.name,
                    "product_sku": product.sku,
                    "quantity_sold": transaction.quantity_sold,
                    "price_per_unit": float(transaction.price_per_unit),
                    "is_promo": transaction.is_promo,
                    "transaction_date": transaction.transaction_date.isoformat(),
                }
            except Exception as e:
                session.rollback()
                raise e

    @staticmethod
    def get_transaction_by_id(transaction_id):
        """Get a specific transaction."""
        with DatabaseManager() as session:
            transaction = (
                session.query(Transaction)
                .filter(Transaction.transaction_id == transaction_id)
                .first()
            )
            if not transaction:
                raise ValueError(f"Transaction {transaction_id} not found")

            return {
                "transaction_id": transaction.transaction_id,
                "transaction_date": transaction.transaction_date.isoformat(),
                "product_name": transaction.product.name,
                "product_sku": transaction.product.sku,
                "quantity_sold": transaction.quantity_sold,
                "price_per_unit": float(transaction.price_per_unit),
                "is_promo": transaction.is_promo,
            }

    @staticmethod
    def get_daily_transaction_count():
        """Get number of transactions today."""
        with DatabaseManager() as session:
            today = datetime.utcnow().date()
            return (
                session.query(func.count(Transaction.transaction_id))
                .filter(func.date(Transaction.transaction_date) == today)
                .scalar()
                or 0
            )

    @staticmethod
    def get_sales_trend(days=7):
        """Get sales trend for the last N days."""
        with DatabaseManager() as session:
            results = (
                session.query(
                    func.date(Transaction.transaction_date).label("date"),
                    func.sum(Transaction.quantity_sold).label("sales"),
                )
                .filter(
                    Transaction.transaction_date
                    >= datetime.utcnow() - timedelta(days=days - 1)
                )
                .group_by(func.date(Transaction.transaction_date))
                .order_by("date")
                .all()
            )

            return [
                {
                    "date": str(r.date),
                    "sales": r.sales or 0,
                }
                for r in results
            ]

    @staticmethod
    def get_stock_comparison(limit=5):
        """Get products with lowest stock."""
        with DatabaseManager() as session:
            products = (
                session.query(Product)
                .order_by(Product.stock.asc())
                .limit(limit)
                .all()
            )

            return [
                {
                    "product": p.name,
                    "current": p.stock,
                    "optimal": 40 if p.stock < 20 else p.stock + 20,
                }
                for p in products
            ]

    @staticmethod
    def get_transactions_by_product_sku(sku, limit=100):
        """Get all transactions for a specific product."""
        with DatabaseManager() as session:
            transactions = (
                session.query(Transaction)
                .join(Product)
                .filter(Product.sku == sku)
                .order_by(desc(Transaction.transaction_date))
                .limit(limit)
                .all()
            )

            return [
                {
                    "transaction_id": t.transaction_id,
                    "transaction_date": t.transaction_date.isoformat(),
                    "quantity_sold": t.quantity_sold,
                    "price_per_unit": float(t.price_per_unit),
                    "is_promo": t.is_promo,
                }
                for t in transactions
            ]

    @staticmethod
    def get_total_revenue():
        """Get total revenue from all transactions."""
        with DatabaseManager() as session:
            result = session.query(
                func.sum(Transaction.quantity_sold * Transaction.price_per_unit)
            ).scalar()
            return float(result) if result else 0.0

    @staticmethod
    def get_product_sales_stats(sku, days=30):
        """Get sales statistics for a specific product."""
        with DatabaseManager() as session:
            cutoff_date = datetime.utcnow() - timedelta(days=days)

            stats = (
                session.query(
                    func.count(Transaction.transaction_id).label("total_transactions"),
                    func.sum(Transaction.quantity_sold).label("total_quantity"),
                    func.sum(Transaction.quantity_sold * Transaction.price_per_unit).label(
                        "total_revenue"
                    ),
                    func.avg(Transaction.quantity_sold).label("avg_quantity"),
                    func.max(Transaction.quantity_sold).label("max_quantity"),
                    func.min(Transaction.quantity_sold).label("min_quantity"),
                )
                .join(Product)
                .filter(Product.sku == sku)
                .filter(Transaction.transaction_date >= cutoff_date)
                .first()
            )

            if not stats:
                raise ValueError(f"No transactions found for product {sku}")

            return {
                "total_transactions": stats.total_transactions or 0,
                "total_quantity": stats.total_quantity or 0,
                "total_revenue": float(stats.total_revenue) if stats.total_revenue else 0.0,
                "avg_quantity": float(stats.avg_quantity) if stats.avg_quantity else 0.0,
                "max_quantity": stats.max_quantity or 0,
                "min_quantity": stats.min_quantity or 0,
            }
