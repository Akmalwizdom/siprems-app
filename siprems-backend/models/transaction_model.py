from utils.db import db_query, db_execute
import datetime

class TransactionModel:
    """Data access layer for transactions"""
    
    @staticmethod
    def get_all_transactions(limit=100, offset=0):
        """Get recent transactions with product details using pagination"""
        query = """
            SELECT 
                t.transaction_id, 
                t.transaction_date,
                p.name as product_name,
                p.sku,
                t.quantity_sold, 
                t.price_per_unit,
                t.is_promo
            FROM transactions t
            JOIN products p ON t.product_id = p.product_id
            ORDER BY t.transaction_date DESC
            LIMIT %s OFFSET %s;
        """
        return db_query(query, (limit, offset), fetch_all=True)
    
    @staticmethod
    def get_transaction_by_id(transaction_id):
        """Get a single transaction by ID"""
        query = """
            SELECT 
                t.transaction_id, 
                t.transaction_date,
                p.name as product_name,
                p.sku,
                t.quantity_sold, 
                t.price_per_unit,
                t.is_promo
            FROM transactions t
            JOIN products p ON t.product_id = p.product_id
            WHERE t.transaction_id = %s;
        """
        return db_query(query, (transaction_id,), fetch_all=False)
    
    @staticmethod
    def create_transaction(product_id, quantity_sold, price_per_unit, is_promo=False):
        """Create a new transaction"""
        query = """
            INSERT INTO transactions (product_id, quantity_sold, price_per_unit, transaction_date, is_promo)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING transaction_id, product_id, quantity_sold, price_per_unit, transaction_date, is_promo;
        """
        params = (
            product_id,
            quantity_sold,
            price_per_unit,
            datetime.datetime.now(datetime.timezone.utc),
            is_promo
        )
        return db_execute(query, params)
    
    @staticmethod
    def get_daily_transaction_count():
        """Get number of transactions today"""
        query = """
            SELECT COUNT(*) as count FROM transactions 
            WHERE DATE(transaction_date) = CURRENT_DATE;
        """
        result = db_query(query, fetch_all=False)
        return result['count'] if result else 0
    
    @staticmethod
    def get_sales_trend(days=7):
        """Get sales trend for the last N days using efficient aggregation"""
        query = """
            SELECT 
                DATE(t.transaction_date) as date,
                COALESCE(SUM(t.quantity_sold), 0) as sales
            FROM transactions t
            WHERE t.transaction_date >= CURRENT_DATE - INTERVAL '%s days'
            GROUP BY DATE(t.transaction_date)
            ORDER BY date ASC;
        """
        return db_query(query, (f'{days - 1} days',), fetch_all=True)
    
    @staticmethod
    def get_stock_comparison(limit=5):
        """Get products with lowest stock"""
        query = """
            SELECT 
                p.name as product, 
                p.stock as current,
                CASE
                    WHEN p.stock < 20 THEN 40
                    ELSE p.stock + 20
                END as optimal
            FROM products p
            ORDER BY p.stock ASC
            LIMIT %s;
        """
        return db_query(query, (limit,), fetch_all=True)
    
    @staticmethod
    def get_transactions_by_product_sku(sku, limit=100):
        """Get all transactions for a specific product"""
        query = """
            SELECT 
                t.transaction_id,
                t.transaction_date,
                t.quantity_sold,
                t.price_per_unit,
                t.is_promo
            FROM transactions t
            JOIN products p ON t.product_id = p.product_id
            WHERE p.sku = %s
            ORDER BY t.transaction_date DESC
            LIMIT %s;
        """
        return db_query(query, (sku, limit), fetch_all=True)
    
    @staticmethod
    def get_total_revenue():
        """Get total revenue from all transactions"""
        query = """
            SELECT COALESCE(SUM(quantity_sold * price_per_unit), 0)::numeric as total_revenue 
            FROM transactions;
        """
        result = db_query(query, fetch_all=False)
        return float(result['total_revenue']) if result else 0.0
    
    @staticmethod
    def get_product_sales_stats(sku, days=30):
        """Get sales statistics for a specific product"""
        query = """
            SELECT 
                COUNT(t.transaction_id) as total_transactions,
                SUM(t.quantity_sold) as total_quantity,
                SUM(t.quantity_sold * t.price_per_unit) as total_revenue,
                AVG(t.quantity_sold) as avg_quantity,
                MAX(t.quantity_sold) as max_quantity,
                MIN(t.quantity_sold) as min_quantity
            FROM transactions t
            JOIN products p ON t.product_id = p.product_id
            WHERE p.sku = %s
            AND t.transaction_date >= CURRENT_DATE - INTERVAL '%s days';
        """
        return db_query(query, (sku, f'{days} days'), fetch_all=False)
