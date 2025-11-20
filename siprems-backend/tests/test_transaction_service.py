"""Unit tests for TransactionService."""
import pytest

from services.transaction_service import TransactionService
from services.product_service import ProductService


class TestTransactionService:
    """Test cases for TransactionService."""

    @pytest.fixture(autouse=True)
    def setup_product(self):
        """Set up test product."""
        self.product_data = {
            "name": "Test Product",
            "category": "Electronics",
            "price": 99.99,
            "stock": 100,
            "sku": "TRANSACTION-TEST",
        }
        self.product = ProductService.create_product(self.product_data)

    def test_create_transaction_success(self):
        """Test successful transaction creation."""
        data = {"product_sku": "TRANSACTION-TEST", "quantity": 10}

        transaction = TransactionService.create_transaction(data)

        assert transaction["product_sku"] == "TRANSACTION-TEST"
        assert transaction["quantity_sold"] == 10
        assert "transaction_id" in transaction

        updated_product = ProductService.get_product_by_sku("TRANSACTION-TEST")
        assert updated_product["stock"] == 90

    def test_create_transaction_missing_sku(self):
        """Test transaction creation without product SKU."""
        data = {"quantity": 10}

        with pytest.raises(ValueError) as exc_info:
            TransactionService.create_transaction(data)

        assert "sku is required" in str(exc_info.value).lower()

    def test_create_transaction_missing_quantity(self):
        """Test transaction creation without quantity."""
        data = {"product_sku": "TRANSACTION-TEST"}

        with pytest.raises(ValueError) as exc_info:
            TransactionService.create_transaction(data)

        assert "quantity is required" in str(exc_info.value).lower()

    def test_create_transaction_product_not_found(self):
        """Test transaction with non-existent product."""
        data = {"product_sku": "NONEXISTENT", "quantity": 10}

        with pytest.raises(ValueError) as exc_info:
            TransactionService.create_transaction(data)

        assert "not found" in str(exc_info.value)

    def test_create_transaction_insufficient_stock(self):
        """Test transaction with insufficient stock."""
        data = {"product_sku": "TRANSACTION-TEST", "quantity": 150}

        with pytest.raises(ValueError) as exc_info:
            TransactionService.create_transaction(data)

        assert "insufficient stock" in str(exc_info.value).lower()

    def test_create_transaction_with_promo(self):
        """Test creating a promotional transaction."""
        data = {
            "product_sku": "TRANSACTION-TEST",
            "quantity": 5,
            "is_promo": True,
        }

        transaction = TransactionService.create_transaction(data)

        assert transaction["is_promo"] is True

    def test_get_transaction_by_id(self):
        """Test getting transaction by ID."""
        data = {"product_sku": "TRANSACTION-TEST", "quantity": 5}
        created = TransactionService.create_transaction(data)

        transaction = TransactionService.get_transaction_by_id(created["transaction_id"])

        assert transaction["transaction_id"] == created["transaction_id"]
        assert transaction["quantity_sold"] == 5

    def test_get_transaction_by_id_not_found(self):
        """Test getting non-existent transaction."""
        with pytest.raises(ValueError) as exc_info:
            TransactionService.get_transaction_by_id(99999)

        assert "not found" in str(exc_info.value)

    def test_get_daily_transaction_count(self):
        """Test getting daily transaction count."""
        TransactionService.create_transaction(
            {"product_sku": "TRANSACTION-TEST", "quantity": 5}
        )
        TransactionService.create_transaction(
            {"product_sku": "TRANSACTION-TEST", "quantity": 3}
        )

        count = TransactionService.get_daily_transaction_count()

        assert count >= 2

    def test_get_total_revenue(self):
        """Test getting total revenue."""
        TransactionService.create_transaction(
            {"product_sku": "TRANSACTION-TEST", "quantity": 10}
        )
        TransactionService.create_transaction(
            {"product_sku": "TRANSACTION-TEST", "quantity": 5}
        )

        revenue = TransactionService.get_total_revenue()

        expected = (10 + 5) * 99.99
        assert revenue == pytest.approx(expected, rel=0.01)

    def test_get_transactions_by_product_sku(self):
        """Test getting transactions by product SKU."""
        TransactionService.create_transaction(
            {"product_sku": "TRANSACTION-TEST", "quantity": 10}
        )
        TransactionService.create_transaction(
            {"product_sku": "TRANSACTION-TEST", "quantity": 5}
        )

        transactions = TransactionService.get_transactions_by_product_sku("TRANSACTION-TEST")

        assert len(transactions) >= 2
        assert all(t for t in transactions)

    def test_get_product_sales_stats(self):
        """Test getting product sales statistics."""
        TransactionService.create_transaction(
            {"product_sku": "TRANSACTION-TEST", "quantity": 10}
        )
        TransactionService.create_transaction(
            {"product_sku": "TRANSACTION-TEST", "quantity": 20}
        )
        TransactionService.create_transaction(
            {"product_sku": "TRANSACTION-TEST", "quantity": 5}
        )

        stats = TransactionService.get_product_sales_stats("TRANSACTION-TEST")

        assert stats["total_transactions"] >= 3
        assert stats["total_quantity"] >= 35
        assert stats["total_revenue"] > 0

    def test_get_stock_comparison(self):
        """Test getting stock comparison."""
        ProductService.create_product(
            {
                "name": "Low Stock",
                "category": "Electronics",
                "price": 50.00,
                "stock": 5,
                "sku": "LOW-STOCK",
            }
        )

        comparison = TransactionService.get_stock_comparison(limit=2)

        assert len(comparison) <= 2

    def test_get_sales_trend(self):
        """Test getting sales trend."""
        TransactionService.create_transaction(
            {"product_sku": "TRANSACTION-TEST", "quantity": 10}
        )
        TransactionService.create_transaction(
            {"product_sku": "TRANSACTION-TEST", "quantity": 5}
        )

        trend = TransactionService.get_sales_trend(days=7)

        assert isinstance(trend, list)
        assert len(trend) > 0
