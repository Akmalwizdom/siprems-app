from models.transaction_model import TransactionModel
from models.product_model import ProductModel

class TransactionService:
    """Business logic layer for transaction operations"""
    
    @staticmethod
    def get_all_transactions(limit=100):
        """Get recent transactions"""
        # Data dari model sudah dalam format dictionary yang benar (tanggal sudah string)
        return TransactionModel.get_all_transactions(limit)
    
    @staticmethod
    def create_transaction(data):
        """Create a new transaction with validation"""
        # Validation
        if 'product_sku' not in data:
            raise ValueError("Product SKU is required")
        if 'quantity' not in data:
            raise ValueError("Quantity is required")
        
        # Get product
        product = ProductModel.get_product_by_sku(data['product_sku'])
        if not product:
            raise ValueError(f"Product with SKU {data['product_sku']} not found")
        
        quantity = int(data['quantity'])
        
        # Check stock availability
        if product['stock'] < quantity:
            raise ValueError(
                f"Insufficient stock. Available: {product['stock']}, Requested: {quantity}"
            )
        
        # Create transaction
        transaction = TransactionModel.create_transaction(
            product_id=product['product_id'],
            quantity_sold=quantity,
            price_per_unit=product['price'],
            is_promo=data.get('is_promo', False)
        )
        
        # Update product stock
        ProductModel.update_product_stock(product['product_id'], -quantity)
        
        # Add product name to response
        transaction['product_name'] = product['name']
        transaction['product_sku'] = product['sku']
        
        return TransactionService._format_transaction(transaction)
    
    @staticmethod
    def get_transaction_by_id(transaction_id):
        """Get a specific transaction"""
        transaction = TransactionModel.get_transaction_by_id(transaction_id)
        if not transaction:
            raise ValueError(f"Transaction {transaction_id} not found")
        return TransactionService._format_transaction(transaction)
    
    @staticmethod
    def get_daily_transaction_count():
        """Get number of transactions today"""
        return TransactionModel.get_daily_transaction_count()
    
    @staticmethod
    def get_dashboard_stats():
        """Get dashboard statistics"""
        sales_trend = TransactionModel.get_sales_trend(days=7)
        
        # Format sales trend for Recharts
        formatted_trend = []
        for row in sales_trend:
            # Handle date formatting safely
            date_val = row['date']
            # Jika date_val masih objek date/datetime (tergantung driver DB), ubah ke string
            if hasattr(date_val, 'strftime'):
                date_str = date_val.strftime('%a')
            else:
                # Jika sudah string, parse dulu atau ambil substring (asumsi 'YYYY-MM-DD')
                try:
                    from datetime import datetime
                    dt = datetime.strptime(str(date_val), '%Y-%m-%d')
                    date_str = dt.strftime('%a')
                except:
                    date_str = str(date_val)

            formatted_trend.append({
                'date': date_str,
                'sales': int(row['sales'])
            })
        
        stock_comparison = TransactionModel.get_stock_comparison(limit=5)
        
        return {
            'daily_transactions': TransactionModel.get_daily_transaction_count(),
            'sales_trend': formatted_trend,
            'stock_comparison': stock_comparison
        }
    
    @staticmethod
    def _format_transaction(transaction):
        """Format transaction for API response"""
        if not transaction:
            return None
        
        formatted = dict(transaction)
        
        # FIX: Cek tipe data sebelum formatting
        # Model layer biasanya sudah mengembalikan string ISO
        if 'transaction_date' in formatted and formatted['transaction_date']:
            val = formatted['transaction_date']
            if hasattr(val, 'isoformat'):
                formatted['transaction_date'] = val.isoformat()
            # Jika sudah string, biarkan saja (jangan panggil isoformat lagi)
        
        return formatted
    
    @staticmethod
    def _format_transactions(transactions):
        """Format multiple transactions"""
        return [TransactionService._format_transaction(t) for t in transactions]