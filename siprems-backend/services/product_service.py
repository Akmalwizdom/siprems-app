from models.orm.product import Product as ProductModel

class ProductService:
    """Business logic layer for product operations"""
    
    @staticmethod
    def get_all_products():
        """Get all products"""
        return ProductModel.get_all_products()
    
    @staticmethod
    def get_product_by_sku(sku):
        """Get a product by SKU"""
        product = ProductModel.get_product_by_sku(sku)
        if not product:
            raise ValueError(f"Product with SKU {sku} not found")
        return product
    
    @staticmethod
    def get_product_by_id(product_id):
        """Get a product by ID"""
        product = ProductModel.get_product_by_id(product_id)
        if not product:
            raise ValueError(f"Product with ID {product_id} not found")
        return product
    
    @staticmethod
    def create_product(data):
        """Create a new product with validation"""
        # Validation
        required_fields = ['name', 'category', 'price', 'stock', 'sku']
        for field in required_fields:
            if field not in data:
                raise ValueError(f"Missing required field: {field}")
        
        # Check if SKU already exists
        existing = ProductModel.get_product_by_sku(data['sku'])
        if existing:
            raise ValueError(f"Product with SKU {data['sku']} already exists")
        
        # Create product
        return ProductModel.create_product(
            name=data['name'],
            category=data['category'],
            price=float(data['price']),
            stock=int(data['stock']),
            sku=data['sku'],
            variation=data.get('variation')
        )
    
    @staticmethod
    def update_product(sku, data):
        """Update a product with validation"""
        # Verify product exists
        existing = ProductModel.get_product_by_sku(sku)
        if not existing:
            raise ValueError(f"Product with SKU {sku} not found")
        
        # Validation
        required_fields = ['name', 'category', 'price', 'stock', 'sku']
        for field in required_fields:
            if field not in data:
                raise ValueError(f"Missing required field: {field}")
        
        # Update product
        return ProductModel.update_product(
            sku=sku,
            name=data['name'],
            category=data['category'],
            price=float(data['price']),
            stock=int(data['stock']),
            new_sku=data['sku'],
            variation=data.get('variation')
        )
    
    @staticmethod
    def delete_product(sku):
        """Delete a product"""
        product = ProductModel.get_product_by_sku(sku)
        if not product:
            raise ValueError(f"Product with SKU {sku} not found")
        
        return ProductModel.delete_product(sku)
    
    @staticmethod
    def get_low_stock_items(threshold=5):
        """Get products with low stock"""
        return ProductModel.get_low_stock_items(threshold)
    
    @staticmethod
    def get_inventory_stats():
        """Get inventory statistics"""
        return {
            'active_products': ProductModel.get_product_count(),
            'low_stock_items': len(ProductModel.get_low_stock_items()),
            'total_inventory_value': ProductModel.get_total_inventory_value()
        }
