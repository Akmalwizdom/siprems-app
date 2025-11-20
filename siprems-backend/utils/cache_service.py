import redis
import json
import hashlib
import time
import logging
from functools import wraps
from typing import Any, Optional, Callable
from utils.config import get_config

logger = logging.getLogger(__name__)

class CacheService:
    """Redis-based caching service with TTL policies"""
    
    # TTL Policy definitions (in seconds)
    TTL_POLICIES = {
        'product_info': 3600,           # 1 hour
        'product_list': 1800,            # 30 minutes
        'product_stats': 1800,           # 30 minutes
        'transaction_history': 900,      # 15 minutes
        'prediction_result': 7200,       # 2 hours
        'ai_response': 3600,             # 1 hour
        'dashboard_stats': 300,          # 5 minutes
        'event_list': 7200,              # 2 hours
        'user_session': 1800,            # 30 minutes
        'short_lived': 300,              # 5 minutes
        'long_lived': 86400,             # 24 hours
    }
    
    def __init__(self, config: Optional[object] = None):
        """Initialize Redis connection"""
        if config is None:
            config = get_config()
        
        self.config = config
        self.redis_url = getattr(config, 'REDIS_URL', 'redis://localhost:6379/2')
        
        try:
            self.client = redis.from_url(self.redis_url, decode_responses=True)
            self.client.ping()
            logger.info("Redis connection established")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}. Cache will be disabled.")
            self.client = None
    
    def is_available(self) -> bool:
        """Check if Redis is available"""
        return self.client is not None
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self.is_available():
            return None
        
        try:
            value = self.client.get(key)
            if value:
                logger.debug(f"Cache HIT: {key}")
                return json.loads(value)
            logger.debug(f"Cache MISS: {key}")
            return None
        except Exception as e:
            logger.warning(f"Cache get error for {key}: {e}")
            return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache with TTL"""
        if not self.is_available():
            return False
        
        try:
            json_value = json.dumps(value)
            if ttl is None:
                ttl = self.TTL_POLICIES.get('short_lived', 300)
            
            self.client.setex(key, ttl, json_value)
            logger.debug(f"Cache SET: {key} with TTL {ttl}s")
            return True
        except Exception as e:
            logger.warning(f"Cache set error for {key}: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if not self.is_available():
            return False
        
        try:
            self.client.delete(key)
            logger.debug(f"Cache DELETE: {key}")
            return True
        except Exception as e:
            logger.warning(f"Cache delete error for {key}: {e}")
            return False
    
    def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern"""
        if not self.is_available():
            return 0
        
        try:
            keys = self.client.keys(pattern)
            if keys:
                deleted = self.client.delete(*keys)
                logger.debug(f"Cache DELETE PATTERN: {pattern} ({deleted} keys)")
                return deleted
            return 0
        except Exception as e:
            logger.warning(f"Cache delete pattern error for {pattern}: {e}")
            return 0
    
    def clear(self) -> bool:
        """Clear all cache"""
        if not self.is_available():
            return False
        
        try:
            self.client.flushdb()
            logger.info("Cache cleared")
            return True
        except Exception as e:
            logger.warning(f"Cache clear error: {e}")
            return False
    
    def get_stats(self) -> dict:
        """Get cache statistics"""
        if not self.is_available():
            return {'available': False}
        
        try:
            info = self.client.info()
            return {
                'available': True,
                'used_memory_human': info.get('used_memory_human', 'N/A'),
                'connected_clients': info.get('connected_clients', 0),
                'total_keys': self.client.dbsize(),
            }
        except Exception as e:
            logger.warning(f"Cache stats error: {e}")
            return {'available': False, 'error': str(e)}


def generate_cache_key(*args, prefix: str = '', **kwargs) -> str:
    """Generate cache key from arguments"""
    key_parts = [prefix] if prefix else []
    
    for arg in args:
        key_parts.append(str(arg))
    
    for k, v in sorted(kwargs.items()):
        key_parts.append(f"{k}:{v}")
    
    key_string = ':'.join(key_parts)
    return key_string


def cached_result(
    ttl_policy: str = 'short_lived',
    key_prefix: str = '',
    invalidate_patterns: Optional[list] = None
) -> Callable:
    """
    Decorator for caching function results.
    
    Args:
        ttl_policy: Key from TTL_POLICIES dict
        key_prefix: Custom prefix for cache key
        invalidate_patterns: List of cache patterns to invalidate on this call
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            cache_service = get_cache_service()
            
            if not cache_service.is_available():
                return func(*args, **kwargs)
            
            # Generate cache key
            func_name = func.__name__
            prefix = key_prefix or func_name
            cache_key = generate_cache_key(*args, prefix=prefix, **kwargs)
            
            # Try to get from cache
            cached_value = cache_service.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # Call function and cache result
            result = func(*args, **kwargs)
            ttl = CacheService.TTL_POLICIES.get(ttl_policy, 300)
            cache_service.set(cache_key, result, ttl)
            
            # Invalidate other patterns if specified
            if invalidate_patterns:
                for pattern in invalidate_patterns:
                    cache_service.delete_pattern(pattern)
            
            return result
        
        return wrapper
    return decorator


# Global cache instance
_cache_instance: Optional[CacheService] = None

def get_cache_service() -> CacheService:
    """Get or create global cache service instance"""
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = CacheService()
    return _cache_instance

def init_cache(config: Optional[object] = None) -> CacheService:
    """Initialize cache service"""
    global _cache_instance
    _cache_instance = CacheService(config)
    return _cache_instance
