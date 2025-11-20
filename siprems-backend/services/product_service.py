"""Product service for business logic operations."""
from utils.models_orm import Product
from utils.database import get_session, DatabaseManager
from sqlalchemy.exc import IntegrityError


class ProductService:
    """Business logic layer for product operations."""

    @staticmethod
    def get_all_products(limit=None, offset=0):
        """Get all products."""
        with DatabaseManager() as session:
            query = session.query(Product).order_by(Product.created_at.desc())

            if limit:
                query = query.limit(limit).offset(offset)

            products = query.all()
            return [
                {
                    "product_id": p.product_id,
                    "name": p.name,
                    "category": p.category,
                    "variation": p.variation,
                    "price": float(p.price),
                    "stock": p.stock,
                    "sku": p.sku,
                    "created_at": p.created_at.isoformat(),
                }
                for p in products
            ]

    @staticmethod
    def get_product_by_sku(sku):
        """Get a product by SKU."""
        with DatabaseManager() as session:
            product = session.query(Product).filter(Product.sku == sku).first()

            if not product:
                raise ValueError(f"Product with SKU {sku} not found")

            return {
                "product_id": product.product_id,
                "name": product.name,
                "category": product.category,
                "variation": product.variation,
                "price": float(product.price),
                "stock": product.stock,
                "sku": product.sku,
                "created_at": product.created_at.isoformat(),
            }

    @staticmethod
    def get_product_by_id(product_id):
        """Get a product by ID."""
        with DatabaseManager() as session:
            product = session.query(Product).filter(Product.product_id == product_id).first()

            if not product:
                raise ValueError(f"Product with ID {product_id} not found")

            return {
                "product_id": product.product_id,
                "name": product.name,
                "category": product.category,
                "variation": product.variation,
                "price": float(product.price),
                "stock": product.stock,
                "sku": product.sku,
                "created_at": product.created_at.isoformat(),
            }

    @staticmethod
    def create_product(data):
        """Create a new product with validation."""
        required_fields = ["name", "category", "price", "stock", "sku"]
        for field in required_fields:
            if field not in data:
                raise ValueError(f"Missing required field: {field}")

        with DatabaseManager() as session:
            existing = session.query(Product).filter(Product.sku == data["sku"]).first()
            if existing:
                raise ValueError(f"Product with SKU {data['sku']} already exists")

            try:
                product = Product(
                    name=data["name"],
                    category=data["category"],
                    variation=data.get("variation"),
                    price=float(data["price"]),
                    stock=int(data["stock"]),
                    sku=data["sku"],
                )
                session.add(product)
                session.commit()

                return {
                    "product_id": product.product_id,
                    "name": product.name,
                    "category": product.category,
                    "variation": product.variation,
                    "price": float(product.price),
                    "stock": product.stock,
                    "sku": product.sku,
                    "created_at": product.created_at.isoformat(),
                }
            except IntegrityError:
                session.rollback()
                raise ValueError(f"Product with SKU {data['sku']} already exists")
            except Exception as e:
                session.rollback()
                raise e

    @staticmethod
    def update_product(sku, data):
        """Update a product with validation."""
        required_fields = ["name", "category", "price", "stock", "sku"]
        for field in required_fields:
            if field not in data:
                raise ValueError(f"Missing required field: {field}")

        with DatabaseManager() as session:
            product = session.query(Product).filter(Product.sku == sku).first()
            if not product:
                raise ValueError(f"Product with SKU {sku} not found")

            if data["sku"] != sku:
                existing = session.query(Product).filter(Product.sku == data["sku"]).first()
                if existing:
                    raise ValueError(f"Product with SKU {data['sku']} already exists")

            try:
                product.name = data["name"]
                product.category = data["category"]
                product.variation = data.get("variation")
                product.price = float(data["price"])
                product.stock = int(data["stock"])
                product.sku = data["sku"]
                session.commit()

                return {
                    "product_id": product.product_id,
                    "name": product.name,
                    "category": product.category,
                    "variation": product.variation,
                    "price": float(product.price),
                    "stock": product.stock,
                    "sku": product.sku,
                    "created_at": product.created_at.isoformat(),
                }
            except IntegrityError:
                session.rollback()
                raise ValueError(f"Product with SKU {data['sku']} already exists")
            except Exception as e:
                session.rollback()
                raise e

    @staticmethod
    def delete_product(sku):
        """Delete a product."""
        with DatabaseManager() as session:
            product = session.query(Product).filter(Product.sku == sku).first()
            if not product:
                raise ValueError(f"Product with SKU {sku} not found")

            try:
                session.delete(product)
                session.commit()
                return {"message": f"Product with SKU {sku} deleted successfully"}
            except Exception as e:
                session.rollback()
                raise e

    @staticmethod
    def get_low_stock_items(threshold=5):
        """Get products with stock below threshold."""
        with DatabaseManager() as session:
            products = (
                session.query(Product)
                .filter(Product.stock <= threshold)
                .order_by(Product.stock.asc())
                .all()
            )

            return [
                {
                    "product_id": p.product_id,
                    "name": p.name,
                    "category": p.category,
                    "variation": p.variation,
                    "price": float(p.price),
                    "stock": p.stock,
                    "sku": p.sku,
                }
                for p in products
            ]

    @staticmethod
    def get_product_count():
        """Get total count of products."""
        with DatabaseManager() as session:
            return session.query(Product).count()

    @staticmethod
    def update_product_stock(product_id, quantity_change):
        """Update product stock (positive or negative)."""
        with DatabaseManager() as session:
            product = session.query(Product).filter(Product.product_id == product_id).first()
            if not product:
                raise ValueError(f"Product with ID {product_id} not found")

            product.stock += quantity_change
            session.commit()

            return {
                "product_id": product.product_id,
                "name": product.name,
                "stock": product.stock,
            }

    @staticmethod
    def get_total_inventory_value():
        """Get total value of all inventory."""
        with DatabaseManager() as session:
            products = session.query(Product).all()
            total = sum(float(p.price) * p.stock for p in products)
            return total

    @staticmethod
    def get_products_by_category(category, limit=100):
        """Get products by category with pagination."""
        with DatabaseManager() as session:
            products = (
                session.query(Product)
                .filter(Product.category == category)
                .order_by(Product.name.asc())
                .limit(limit)
                .all()
            )

            return [
                {
                    "product_id": p.product_id,
                    "name": p.name,
                    "category": p.category,
                    "variation": p.variation,
                    "price": float(p.price),
                    "stock": p.stock,
                    "sku": p.sku,
                }
                for p in products
            ]
