from flask import Blueprint, request, jsonify
from services.product_service import ProductService

product_bp = Blueprint('products', __name__, url_prefix='/products')

@product_bp.route('', methods=['GET'])
def get_products():
    """Get all products"""
    try:
        products = ProductService.get_all_products()
        return jsonify(products), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@product_bp.route('', methods=['POST'])
def add_product():
    """Create a new product"""
    try:
        data = request.get_json()
        product = ProductService.create_product(data)
        return jsonify(product), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@product_bp.route('/<string:sku>', methods=['GET'])
def get_product(sku):
    """Get a specific product by SKU"""
    try:
        product = ProductService.get_product_by_sku(sku)
        return jsonify(product), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@product_bp.route('/<string:sku>', methods=['PUT'])
def update_product(sku):
    """Update a product by SKU"""
    try:
        data = request.get_json()
        product = ProductService.update_product(sku, data)
        return jsonify(product), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@product_bp.route('/<string:sku>', methods=['DELETE'])
def delete_product(sku):
    """Delete a product by SKU"""
    try:
        ProductService.delete_product(sku)
        return jsonify({'message': 'Product deleted successfully'}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        if 'foreign key constraint' in str(e).lower():
            return jsonify({
                'error': 'Cannot delete product. Product has transaction history.'
            }), 400
        return jsonify({'error': str(e)}), 500

@product_bp.route('/stats', methods=['GET'])
def get_product_stats():
    """Get product statistics"""
    try:
        stats = ProductService.get_inventory_stats()
        return jsonify(stats), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
