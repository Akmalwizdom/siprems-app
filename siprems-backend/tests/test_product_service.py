"""Unit tests for ProductService."""
import pytest

from services.product_service import ProductService
from utils.models_orm import Product
from utils.database import DatabaseManager


class TestProductService:
    """Test cases for ProductService."""

    def test_get_all_products_empty(self, test_session):
        """Test getting all products when none exist."""
        with pytest.raises(Exception):
            products = ProductService.get_all_products()

    def test_create_product_success(self):
        """Test successful product creation."""
        data = {
            "name": "New Product",
            "category": "Electronics",
            "price": 199.99,
            "stock": 50,
            "sku": "PROD-NEW-001",
            "variation": "Blue",
        }

        product = ProductService.create_product(data)

        assert product["name"] == "New Product"
        assert product["sku"] == "PROD-NEW-001"
        assert product["stock"] == 50
        assert float(product["price"]) == 199.99

    def test_create_product_missing_required_field(self):
        """Test product creation with missing required field."""
        data = {
            "name": "New Product",
            "category": "Electronics",
            "price": 199.99,
            "stock": 50,
        }

        with pytest.raises(ValueError) as exc_info:
            ProductService.create_product(data)

        assert "Missing required field: sku" in str(exc_info.value)

    def test_create_product_duplicate_sku(self):
        """Test product creation with duplicate SKU."""
        data1 = {
            "name": "Product 1",
            "category": "Electronics",
            "price": 199.99,
            "stock": 50,
            "sku": "PROD-DUPLICATE",
        }

        data2 = {
            "name": "Product 2",
            "category": "Electronics",
            "price": 299.99,
            "stock": 30,
            "sku": "PROD-DUPLICATE",
        }

        ProductService.create_product(data1)

        with pytest.raises(ValueError) as exc_info:
            ProductService.create_product(data2)

        assert "already exists" in str(exc_info.value)

    def test_get_product_by_sku(self):
        """Test getting product by SKU."""
        data = {
            "name": "Test Product",
            "category": "Test",
            "price": 99.99,
            "stock": 100,
            "sku": "TEST-SKU",
        }

        ProductService.create_product(data)
        product = ProductService.get_product_by_sku("TEST-SKU")

        assert product["sku"] == "TEST-SKU"
        assert product["name"] == "Test Product"

    def test_get_product_by_sku_not_found(self):
        """Test getting non-existent product by SKU."""
        with pytest.raises(ValueError) as exc_info:
            ProductService.get_product_by_sku("NONEXISTENT")

        assert "not found" in str(exc_info.value)

    def test_update_product(self):
        """Test product update."""
        data = {
            "name": "Original Name",
            "category": "Electronics",
            "price": 99.99,
            "stock": 100,
            "sku": "UPDATE-TEST",
        }

        ProductService.create_product(data)

        update_data = {
            "name": "Updated Name",
            "category": "Gadgets",
            "price": 149.99,
            "stock": 75,
            "sku": "UPDATE-TEST",
        }

        updated = ProductService.update_product("UPDATE-TEST", update_data)

        assert updated["name"] == "Updated Name"
        assert updated["category"] == "Gadgets"
        assert float(updated["price"]) == 149.99

    def test_delete_product(self):
        """Test product deletion."""
        data = {
            "name": "Delete Me",
            "category": "Electronics",
            "price": 99.99,
            "stock": 100,
            "sku": "DELETE-TEST",
        }

        ProductService.create_product(data)
        result = ProductService.delete_product("DELETE-TEST")

        assert "successfully" in result["message"]

        with pytest.raises(ValueError):
            ProductService.get_product_by_sku("DELETE-TEST")

    def test_get_low_stock_items(self):
        """Test getting low stock items."""
        products = [
            {
                "name": "Low Stock 1",
                "category": "Electronics",
                "price": 99.99,
                "stock": 3,
                "sku": "LOW-1",
            },
            {
                "name": "Low Stock 2",
                "category": "Electronics",
                "price": 199.99,
                "stock": 2,
                "sku": "LOW-2",
            },
            {
                "name": "High Stock",
                "category": "Electronics",
                "price": 299.99,
                "stock": 100,
                "sku": "HIGH-1",
            },
        ]

        for product in products:
            ProductService.create_product(product)

        low_stock = ProductService.get_low_stock_items(threshold=5)

        assert len(low_stock) == 2
        assert all(item["stock"] <= 5 for item in low_stock)

    def test_get_product_count(self):
        """Test getting product count."""
        products = [
            {
                "name": f"Product {i}",
                "category": "Electronics",
                "price": 99.99,
                "stock": 100,
                "sku": f"COUNT-{i}",
            }
            for i in range(3)
        ]

        for product in products:
            ProductService.create_product(product)

        count = ProductService.get_product_count()
        assert count == 3

    def test_update_product_stock(self):
        """Test updating product stock."""
        data = {
            "name": "Stock Test",
            "category": "Electronics",
            "price": 99.99,
            "stock": 100,
            "sku": "STOCK-TEST",
        }

        created = ProductService.create_product(data)
        product_id = created["product_id"]

        result = ProductService.update_product_stock(product_id, -10)

        assert result["stock"] == 90

        result = ProductService.update_product_stock(product_id, 5)

        assert result["stock"] == 95
