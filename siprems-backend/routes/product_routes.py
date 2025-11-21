from flask import Blueprint, request, jsonify
from services.product_service import ProductService
from utils.jwt_handler import require_auth
from utils.validators import ProductSchema, validate_request_data
from utils.cache_service import get_cache_service, generate_cache_key
from utils.metrics_service import track_http_request

product_bp = Blueprint('products', __name__)

@product_bp.route('', methods=['GET'])
@require_auth
@track_http_request()
def get_products():
    """Get all products with caching"""
    try:
        # Try to get from cache
        cache_service = get_cache_service()
        cache_key = generate_cache_key(prefix='product_list')

        cached_result = cache_service.get(cache_key)
        if cached_result:
            return jsonify(cached_result), 200

        # Not in cache, fetch from database
        products = ProductService.get_all_products()

        # Cache the result
        cache_service.set(cache_key, products, ttl=cache_service.TTL_POLICIES.get('product_list', 1800))

        return jsonify(products), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@product_bp.route('', methods=['POST'])
@require_auth
def add_product():
    """Create a new product and invalidate cache"""
    try:
        data = request.get_json()
        valid, validated_data, errors = validate_request_data(ProductSchema, data)
        if not valid:
            return jsonify({'error': 'Validation failed', 'details': errors}), 400

        product = ProductService.create_product(validated_data)

        # Invalidate product caches
        cache_service = get_cache_service()
        cache_service.delete_pattern('product_list*')
        cache_service.delete_pattern('product_stats*')

        return jsonify(product), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@product_bp.route('/<string:sku>', methods=['GET'])
@require_auth
@track_http_request()
def get_product(sku):
    """Get a specific product by SKU with caching"""
    try:
        # Try to get from cache
        cache_service = get_cache_service()
        cache_key = generate_cache_key(sku, prefix='product_info')

        cached_result = cache_service.get(cache_key)
        if cached_result:
            return jsonify(cached_result), 200

        # Not in cache, fetch from database
        product = ProductService.get_product_by_sku(sku)

        # Cache the result
        cache_service.set(cache_key, product, ttl=cache_service.TTL_POLICIES.get('product_info', 3600))

        return jsonify(product), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@product_bp.route('/<string:sku>', methods=['PUT'])
@require_auth
def update_product(sku):
    """Update a product by SKU and invalidate cache"""
    try:
        data = request.get_json()
        valid, validated_data, errors = validate_request_data(ProductSchema, data)
        if not valid:
            return jsonify({'error': 'Validation failed', 'details': errors}), 400

        product = ProductService.update_product(sku, validated_data)

        # Invalidate product caches
        cache_service = get_cache_service()
        cache_service.delete(generate_cache_key(sku, prefix='product_info'))
        cache_service.delete_pattern('product_list*')
        cache_service.delete_pattern('product_stats*')
        cache_service.delete_pattern('prediction*')

        return jsonify(product), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@product_bp.route('/<string:sku>', methods=['DELETE'])
@require_auth
def delete_product(sku):
    """Delete a product by SKU and invalidate cache"""
    try:
        ProductService.delete_product(sku)

        # Invalidate product caches
        cache_service = get_cache_service()
        cache_service.delete(generate_cache_key(sku, prefix='product_info'))
        cache_service.delete_pattern('product_list*')
        cache_service.delete_pattern('product_stats*')
        cache_service.delete_pattern('prediction*')

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
@require_auth
@track_http_request()
def get_product_stats():
    """Get product statistics with caching"""
    try:
        # Try to get from cache
        cache_service = get_cache_service()
        cache_key = generate_cache_key(prefix='product_stats')

        cached_result = cache_service.get(cache_key)
        if cached_result:
            return jsonify(cached_result), 200

        # Not in cache, compute statistics
        stats = ProductService.get_inventory_stats()

        # Cache the result
        cache_service.set(cache_key, stats, ttl=cache_service.TTL_POLICIES.get('product_stats', 1800))

        return jsonify(stats), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
