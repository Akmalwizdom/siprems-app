from utils.db import db_query, db_execute

class ProductModel:
    """Data access layer for products"""
    
    @staticmethod
    def get_all_products():
        """Get all products ordered by creation date"""
        query = "SELECT * FROM products ORDER BY created_at DESC;"
        return db_query(query, fetch_all=True)
    
    @staticmethod
    def get_product_by_sku(sku):
        """Get a single product by SKU"""
        query = "SELECT * FROM products WHERE sku = %s;"
        return db_query(query, (sku,), fetch_all=False)
    
    @staticmethod
    def get_product_by_id(product_id):
        """Get a single product by ID"""
        query = "SELECT * FROM products WHERE product_id = %s;"
        return db_query(query, (product_id,), fetch_all=False)
    
    @staticmethod
    def create_product(name, category, price, stock, sku, variation=None):
        """Create a new product"""
        query = """
            INSERT INTO products (name, category, variation, price, stock, sku)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING *;
        """
        params = (name, category, variation, price, stock, sku)
        return db_execute(query, params)
    
    @staticmethod
    def update_product(sku, name, category, price, stock, new_sku=None, variation=None):
        """Update a product by SKU"""
        # If SKU is being changed, use the old SKU in WHERE clause
        where_sku = new_sku if new_sku and new_sku != sku else sku
        
        query = """
            UPDATE products
            SET name = %s, category = %s, variation = %s, price = %s, stock = %s, sku = %s
            WHERE sku = %s
            RETURNING *;
        """
        params = (name, category, variation, price, stock, new_sku or sku, sku)
        return db_execute(query, params)
    
    @staticmethod
    def delete_product(sku):
        """Delete a product by SKU"""
        query = "DELETE FROM products WHERE sku = %s RETURNING *;"
        return db_execute(query, (sku,))
    
    @staticmethod
    def get_low_stock_items(threshold=5):
        """Get products with stock below threshold"""
        query = "SELECT * FROM products WHERE stock <= %s ORDER BY stock ASC;"
        return db_query(query, (threshold,), fetch_all=True)
    
    @staticmethod
    def get_product_count():
        """Get total count of products"""
        query = "SELECT COUNT(*) as count FROM products;"
        result = db_query(query, fetch_all=False)
        return result['count'] if result else 0
    
    @staticmethod
    def update_product_stock(product_id, quantity_change):
        """Update product stock (positive or negative)"""
        query = "UPDATE products SET stock = stock + %s WHERE product_id = %s RETURNING *;"
        return db_execute(query, (quantity_change, product_id))
    
    @staticmethod
    def get_total_inventory_value():
        """Get total value of all inventory"""
        query = "SELECT COALESCE(SUM(price * stock), 0) as total_value FROM products;"
        result = db_query(query, fetch_all=False)
        return float(result['total_value']) if result else 0.0
