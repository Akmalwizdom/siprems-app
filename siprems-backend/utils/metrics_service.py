import time
import logging
import json
from datetime import datetime
from functools import wraps
from typing import Callable, Optional, Dict, Any
from collections import defaultdict
import threading

logger = logging.getLogger(__name__)

class MetricsService:
    """Service for collecting and reporting performance metrics"""
    
    def __init__(self):
        """Initialize metrics service"""
        self.metrics = defaultdict(list)
        self.lock = threading.Lock()
        self.enabled = True
    
    def record_metric(self, name: str, duration: float, tags: Optional[Dict[str, str]] = None, status: str = 'success'):
        """Record a single metric"""
        if not self.enabled:
            return
        
        try:
            with self.lock:
                metric_data = {
                    'timestamp': datetime.utcnow().isoformat(),
                    'duration_ms': round(duration * 1000, 2),
                    'status': status,
                    'tags': tags or {}
                }
                self.metrics[name].append(metric_data)
                
                # Keep only last 1000 metrics per name to avoid unbounded growth
                if len(self.metrics[name]) > 1000:
                    self.metrics[name] = self.metrics[name][-1000:]
        except Exception as e:
            logger.warning(f"Error recording metric {name}: {e}")
    
    def get_metric_summary(self, name: str) -> Dict[str, Any]:
        """Get summary statistics for a metric"""
        if name not in self.metrics or not self.metrics[name]:
            return {'count': 0}
        
        durations = [m['duration_ms'] for m in self.metrics[name]]
        
        return {
            'count': len(durations),
            'min_ms': round(min(durations), 2),
            'max_ms': round(max(durations), 2),
            'avg_ms': round(sum(durations) / len(durations), 2),
            'p95_ms': round(sorted(durations)[int(len(durations) * 0.95)] if durations else 0, 2),
            'p99_ms': round(sorted(durations)[int(len(durations) * 0.99)] if durations else 0, 2),
        }
    
    def get_all_metrics_summary(self) -> Dict[str, Dict[str, Any]]:
        """Get summary for all metrics"""
        return {name: self.get_metric_summary(name) for name in self.metrics}
    
    def get_recent_metrics(self, name: str, limit: int = 10) -> list:
        """Get recent metrics for a specific name"""
        if name not in self.metrics:
            return []
        return self.metrics[name][-limit:]
    
    def clear_metrics(self, name: Optional[str] = None):
        """Clear metrics"""
        with self.lock:
            if name:
                self.metrics[name] = []
            else:
                self.metrics.clear()
    
    def export_metrics(self) -> Dict[str, Any]:
        """Export all metrics as JSON"""
        with self.lock:
            return {
                'timestamp': datetime.utcnow().isoformat(),
                'summary': self.get_all_metrics_summary(),
                'detailed': dict(self.metrics)
            }


# Global metrics instance
_metrics_instance: Optional[MetricsService] = None

def get_metrics_service() -> MetricsService:
    """Get or create global metrics service instance"""
    global _metrics_instance
    if _metrics_instance is None:
        _metrics_instance = MetricsService()
    return _metrics_instance

def init_metrics() -> MetricsService:
    """Initialize metrics service"""
    global _metrics_instance
    _metrics_instance = MetricsService()
    return _metrics_instance


def track_performance(metric_name: str, tags: Optional[Dict[str, str]] = None) -> Callable:
    """
    Decorator to track function performance.
    
    Args:
        metric_name: Name for the metric
        tags: Optional tags for the metric
    
    Example:
        @track_performance('predict_stock', tags={'product': 'SKU-001'})
        def predict_stock(sku):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            metrics = get_metrics_service()
            start_time = time.time()
            
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                metrics.record_metric(metric_name, duration, tags=tags, status='success')
                return result
            except Exception as e:
                duration = time.time() - start_time
                metrics.record_metric(metric_name, duration, tags=tags, status='error')
                logger.error(f"Error in {metric_name}: {str(e)}")
                raise
        
        return wrapper
    return decorator


def track_db_query(query_type: str) -> Callable:
    """
    Decorator to track database query performance.
    
    Args:
        query_type: Type of query (SELECT, INSERT, UPDATE, DELETE)
    
    Example:
        @track_db_query('SELECT')
        def get_products():
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            metrics = get_metrics_service()
            start_time = time.time()
            
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                
                metric_name = f'db_query_{query_type}'
                tags = {'query_type': query_type}
                metrics.record_metric(metric_name, duration, tags=tags, status='success')
                
                # Log slow queries
                if duration > 1.0:
                    logger.warning(f"Slow query detected ({metric_name}): {duration:.3f}s")
                
                return result
            except Exception as e:
                duration = time.time() - start_time
                metrics.record_metric(f'db_query_{query_type}', duration, tags={'query_type': query_type}, status='error')
                raise
        
        return wrapper
    return decorator


def track_http_request() -> Callable:
    """
    Decorator to track HTTP request performance.
    
    Example:
        @track_http_request()
        def predict_stock():
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            metrics = get_metrics_service()
            start_time = time.time()
            
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                
                metric_name = f'http_{func.__name__}'
                metrics.record_metric(metric_name, duration, status='success')
                
                return result
            except Exception as e:
                duration = time.time() - start_time
                metrics.record_metric(f'http_{func.__name__}', duration, status='error')
                raise
        
        return wrapper
    return decorator


class QueryLogger:
    """Context manager for logging database queries"""
    
    def __init__(self, query: str, params: Optional[tuple] = None):
        self.query = query
        self.params = params
        self.start_time = None
        self.metrics = get_metrics_service()
    
    def __enter__(self):
        self.start_time = time.time()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = time.time() - self.start_time
        
        # Extract query type
        query_type = self.query.strip().split()[0].upper()
        metric_name = f'db_query_{query_type}'
        
        status = 'error' if exc_type else 'success'
        self.metrics.record_metric(metric_name, duration, status=status)
        
        # Log slow queries
        if duration > 1.0:
            logger.warning(f"Slow query ({query_type}): {duration:.3f}s - {self.query[:100]}...")
        
        return False
