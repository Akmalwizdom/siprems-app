"""Product data access layer using SQLAlchemy ORM."""

from typing import List, Optional, Dict, Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from models.orm.product import Product
from utils.db_session import get_db_session


class ProductModel:
    """
    Data access layer for product operations.

    Handles all database operations related to products including
    CRUD operations, inventory management, and analytics.
    """

    @staticmethod
    def get_all_products(
        limit: Optional[int] = None, offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Retrieve all products with optional pagination.

        Retrieves products ordered by creation date in descending order.

        Args:
            limit: Maximum number of products to return. If None, returns all.
            offset: Number of products to skip (for pagination).

        Returns:
            List of product dictionaries.

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            query = session.query(Product).order_by(Product.created_at.desc())

            if limit:
                query = query.limit(limit).offset(offset)

            products = query.all()
            return [product.to_dict() for product in products]

    @staticmethod
    def get_product_by_sku(sku: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a single product by SKU.

        Args:
            sku: Stock Keeping Unit of the product.

        Returns:
            Product dictionary or None if not found.

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            product = session.query(Product).filter(Product.sku == sku).first()
            return product.to_dict() if product else None

    @staticmethod
    def get_product_by_id(product_id: int) -> Optional[Dict[str, Any]]:
        """
        Retrieve a single product by ID.

        Args:
            product_id: Unique product identifier.

        Returns:
            Product dictionary or None if not found.

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            product = (
                session.query(Product).filter(Product.product_id == product_id).first()
            )
            return product.to_dict() if product else None

    @staticmethod
    def create_product(
        name: str,
        category: str,
        price: float,
        stock: int,
        sku: str,
        variation: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Create a new product.

        Args:
            name: Product name.
            category: Product category.
            price: Unit price of the product.
            stock: Initial stock quantity.
            sku: Stock Keeping Unit (must be unique).
            variation: Optional product variation.

        Returns:
            Created product dictionary.

        Raises:
            Exception: Database operation errors (e.g., duplicate SKU).
        """
        with get_db_session() as session:
            product = Product(
                name=name,
                category=category,
                variation=variation,
                price=price,
                stock=stock,
                sku=sku,
            )
            session.add(product)
            session.flush()
            result = product.to_dict()
            return result

    @staticmethod
    def update_product(
        sku: str,
        name: str,
        category: str,
        price: float,
        stock: int,
        new_sku: Optional[str] = None,
        variation: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Update an existing product.

        Args:
            sku: Current SKU of the product to update.
            name: Updated product name.
            category: Updated product category.
            price: Updated unit price.
            stock: Updated stock quantity.
            new_sku: New SKU (optional rename).
            variation: Updated product variation.

        Returns:
            Updated product dictionary or None if not found.

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            product = session.query(Product).filter(Product.sku == sku).first()

            if not product:
                return None

            product.name = name
            product.category = category
            product.variation = variation
            product.price = price
            product.stock = stock
            if new_sku:
                product.sku = new_sku

            session.flush()
            result = product.to_dict()
            return result

    @staticmethod
    def delete_product(sku: str) -> Optional[Dict[str, Any]]:
        """
        Delete a product by SKU.

        Args:
            sku: Stock Keeping Unit of the product to delete.

        Returns:
            Deleted product dictionary or None if not found.

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            product = session.query(Product).filter(Product.sku == sku).first()

            if not product:
                return None

            result = product.to_dict()
            session.delete(product)
            return result

    @staticmethod
    def get_low_stock_items(threshold: int = 5) -> List[Dict[str, Any]]:
        """
        Retrieve products with stock below a threshold.

        Args:
            threshold: Stock level threshold. Defaults to 5.

        Returns:
            List of low-stock product dictionaries.

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            products = (
                session.query(Product)
                .filter(Product.stock <= threshold)
                .order_by(Product.stock.asc())
                .all()
            )
            return [product.to_dict() for product in products]

    @staticmethod
    def get_product_count() -> int:
        """
        Get total count of products in the inventory.

        Returns:
            Total number of products.

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            count = session.query(func.count(Product.product_id)).scalar()
            return count or 0

    @staticmethod
    def update_product_stock(product_id: int, quantity_change: int) -> Optional[Dict[str, Any]]:
        """
        Update product stock by a quantity delta.

        Can be used to increase (positive) or decrease (negative) stock.

        Args:
            product_id: Unique product identifier.
            quantity_change: Change in stock quantity (positive or negative).

        Returns:
            Updated product dictionary or None if not found.

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            product = (
                session.query(Product).filter(Product.product_id == product_id).first()
            )

            if not product:
                return None

            product.stock += quantity_change
            session.flush()
            return product.to_dict()

    @staticmethod
    def get_total_inventory_value() -> float:
        """
        Calculate total monetary value of all inventory.

        Returns:
            Total inventory value (sum of price * stock for all products).

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            result = session.query(
                func.coalesce(func.sum(Product.price * Product.stock), 0)
            ).scalar()
            return float(result) if result else 0.0

    @staticmethod
    def get_products_by_category(category: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Retrieve products filtered by category.

        Args:
            category: Product category to filter by.
            limit: Maximum number of products to return. Defaults to 100.

        Returns:
            List of product dictionaries sorted by name.

        Raises:
            Exception: Database operation errors.
        """
        with get_db_session() as session:
            products = (
                session.query(Product)
                .filter(Product.category == category)
                .order_by(Product.name.asc())
                .limit(limit)
                .all()
            )
            return [product.to_dict() for product in products]
