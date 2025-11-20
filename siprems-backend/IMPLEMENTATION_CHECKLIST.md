# SIPREMS Optimization Implementation Checklist

## Pre-Deployment Checklist

### Infrastructure Setup
- [ ] Redis instance running on port 6379
- [ ] PostgreSQL database accessible
- [ ] Python 3.8+ installed
- [ ] pip package manager available

### Dependency Installation
```bash
pip install -r requirements.txt
```
- [ ] flask-compress installed
- [ ] redis-py installed
- [ ] All other dependencies current

### Environment Variables
- [ ] `REDIS_URL` set (default: `redis://localhost:6379/2`)
- [ ] `CACHE_ENABLED` set to `true`
- [ ] `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` configured
- [ ] `FLASK_ENV` set to `production` for production deployments

### Database Preparation
- [ ] All tables created (`schema.sql`)
- [ ] Data seeded with `seed.py`
- [ ] Indexes created:
```sql
-- Run these if not already in schema.sql
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_transactions_product_date ON transactions(product_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_is_promo ON transactions(is_promo);
CREATE INDEX IF NOT EXISTS idx_transactions_date_range ON transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_quantity_date ON transactions(quantity_sold, transaction_date) WHERE quantity_sold > 0;
```
- [ ] Indexes verified: `SELECT * FROM pg_indexes WHERE schemaname = 'public';`

---

## Deployment Checklist

### Application Startup
```bash
# Development
python app.py

# Production (with gunicorn)
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```
- [ ] Application starts without errors
- [ ] No Redis connection errors if cache disabled
- [ ] All blueprints registered

### Verify Optimization Endpoints
```bash
# Health check
curl http://localhost:5000/health
# Expected: {"status": "healthy"}

# Cache statistics
curl http://localhost:5000/cache-stats
# Expected: {"available": true, "used_memory_human": "...", "connected_clients": ..., "total_keys": ...}

# Performance metrics
curl http://localhost:5000/metrics
# Expected: JSON with summary and detailed metrics
```
- [ ] `/health` returns 200 with healthy status
- [ ] `/cache-stats` shows Redis is connected
- [ ] `/metrics` returns valid JSON

---

## Feature Verification Checklist

### 1. Caching Layer
- [ ] Cache operations in `utils/cache_service.py` working
- [ ] TTL policies defined for all data types
- [ ] Cache invalidation triggers on writes

**Test**:
```bash
# First call (cache miss)
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/products

# Check metrics for cache miss
curl http://localhost:5000/cache-stats

# Second call (cache hit)
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/products

# Cache hit should be in metrics
```

### 2. Database Indexes
- [ ] All 9 indexes created successfully
- [ ] Indexes being used by query planner

**Test**:
```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Should see increasing numbers for frequently used indexes
```

### 3. Query Optimization
- [ ] Product model using explicit columns
- [ ] Transaction model using efficient aggregations
- [ ] No GENERATE_SERIES in queries

**Test**:
```bash
# Check query performance
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/products

# Check metrics
curl http://localhost:5000/metrics | jq '.summary.db_query_SELECT'

# Should see response times < 50ms for cached queries
```

### 4. Response Compression
- [ ] flask-compress middleware active
- [ ] gzip compression applied to responses

**Test**:
```bash
# Check response size
curl -H "Accept-Encoding: gzip" -I http://localhost:5000/api/products

# Look for: Content-Encoding: gzip

# Verify compression ratio
UNCOMPRESSED=$(curl -H "Accept-Encoding: identity" http://localhost:5000/api/products | wc -c)
COMPRESSED=$(curl -H "Accept-Encoding: gzip" http://localhost:5000/api/products | gunzip | wc -c)
echo "Compression ratio: $(echo "scale=2; $UNCOMPRESSED / $COMPRESSED" | bc)x"
```

### 5. Performance Instrumentation
- [ ] Metrics service active
- [ ] All decorators working
- [ ] Metrics endpoint returning data

**Test**:
```bash
# Make some requests
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/products
curl -X POST -H "Authorization: Bearer <token>" http://localhost:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"product_sku":"BRD-001","days":7}'

# Check metrics
curl http://localhost:5000/metrics | jq '.'

# Should show metrics for http_get_products, db_query_SELECT, etc.
```

### 6. Route Caching Integration
- [ ] Product endpoints cached
- [ ] Prediction endpoints cached
- [ ] Chat endpoints cached
- [ ] Cache invalidation working

**Test Product Caching**:
```bash
# First call - should hit database
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/products

# Check metrics
curl http://localhost:5000/metrics | jq '.summary.db_query_SELECT'

# Second call - should use cache (faster)
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/products

# Metrics should show increased count but no new SELECT
```

**Test Cache Invalidation**:
```bash
# Get products (cached)
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/products

# Create new product (should invalidate cache)
curl -X POST -H "Authorization: Bearer <token>" http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","category":"Test","price":100,"stock":10,"sku":"TEST-001"}'

# Get products again (should fetch fresh from database)
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/products
```

### 7. ML Computation Offloading
- [ ] Synchronous prediction endpoint working
- [ ] Asynchronous prediction endpoint available
- [ ] Celery workers processing tasks
- [ ] Task status endpoint working

**Test**:
```bash
# Synchronous (cached)
curl -X POST -H "Authorization: Bearer <token>" http://localhost:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"product_sku":"BRD-001","days":7}'

# Asynchronous
TASK_ID=$(curl -X POST -H "Authorization: Bearer <token>" http://localhost:5000/api/predict/async \
  -H "Content-Type: application/json" \
  -d '{"product_sku":"BRD-001","days":30}' | jq -r '.task_id')

# Check task status
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/predict/task/$TASK_ID
```

---

## Performance Benchmarking

### Baseline Performance Test
```bash
#!/bin/bash

echo "Running performance benchmarks..."

# Warm up
for i in {1..3}; do
  curl -s -H "Authorization: Bearer <token>" http://localhost:5000/api/products > /dev/null
done

# Product listing (should be very fast with cache)
echo "GET /products:"
time curl -s -H "Authorization: Bearer <token>" http://localhost:5000/api/products | jq -r 'length'

# Single product (should be very fast with cache)
echo "GET /products/BRD-001:"
time curl -s -H "Authorization: Bearer <token>" http://localhost:5000/api/products/BRD-001 | jq -r '.name'

# Predictions
echo "POST /predict:"
time curl -s -X POST -H "Authorization: Bearer <token>" http://localhost:5000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"product_sku":"BRD-001","days":7}' | jq -r '.accuracy'

# Cache stats
echo "Cache Statistics:"
curl -s http://localhost:5000/cache-stats | jq '.'
```

---

## Troubleshooting Quick Reference

### Issue: Cache operations failing silently
**Symptoms**: No cache errors but caching not working
**Solution**:
```bash
# Check Redis connection
redis-cli ping  # Should return PONG

# Check cache stats endpoint
curl http://localhost:5000/cache-stats  # Check 'available' field

# Restart Redis
docker restart siprems-redis
```

### Issue: Slow predictions despite optimization
**Symptoms**: Predictions still taking > 2 seconds
**Solution**:
```bash
# Check if using cache
curl -X POST http://localhost:5000/api/predict -d '{"product_sku":"BRD-001"}' \
  && curl http://localhost:5000/api/predict -d '{"product_sku":"BRD-001"}'
# Second call should be much faster

# Check metrics for slow queries
curl http://localhost:5000/metrics | jq '.summary.db_query_SELECT'
# If avg_ms > 1000, check indexes

# Check if using async endpoint
curl -X POST http://localhost:5000/api/predict/async -d '{"product_sku":"BRD-001"}'
```

### Issue: High memory usage in Redis
**Symptoms**: Redis memory keeps growing
**Solution**:
```bash
# Check what's taking memory
redis-cli --bigkeys

# Check cache stats
curl http://localhost:5000/cache-stats

# Reduce TTL for long_lived cache policy in cache_service.py
# Or clear cache
redis-cli FLUSHDB
```

### Issue: Database slow despite indexes
**Symptoms**: Query plans not using indexes
**Solution**:
```sql
-- Check index statistics are fresh
ANALYZE products;
ANALYZE transactions;

-- Check if indexes are being used
EXPLAIN ANALYZE SELECT * FROM products WHERE sku = 'BRD-001';

-- Rebuild indexes if needed
REINDEX TABLE products;
```

---

## Configuration Tuning

### Cache TTL Policies
**File**: `utils/cache_service.py` → `TTL_POLICIES` dict

**Adjust based on**:
- Data change frequency
- Cache hit rates (monitor via `/metrics`)
- Memory usage

**Example**:
```python
TTL_POLICIES = {
    'product_info': 3600,        # Increase if products rarely change
    'product_list': 1800,        # Decrease if adding products frequently
    'prediction_result': 7200,   # Increase for stable forecasts
    'ai_response': 3600,         # Increase if same questions asked often
    # ...
}
```

### Compression Settings
**File**: `app.py` → `Compress()` initialization

**Tuning**:
```python
app.config['COMPRESS_LEVEL'] = 6      # 1-9 (higher = smaller but slower)
app.config['COMPRESS_MIN_SIZE'] = 500 # Minimum size to compress
```

### Query Batch Size
**File**: `models/product_model.py` → `get_all_products(limit=...)`

**Adjust based on**:
- Memory available
- Network bandwidth
- Client capabilities

---

## Monitoring Setup

### Prometheus Scraping
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'siprems'
    static_configs:
      - targets: ['localhost:5000']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### Grafana Dashboard
Create dashboard with:
- Cache hit rate: `total_keys / (total_keys + misses)`
- Query response time: `avg_ms` from `/metrics`
- Database load: Count of `db_query_*` metrics
- Response compression ratio

### Log Monitoring
```bash
# Watch for slow queries
tail -f app.log | grep "Slow query"

# Watch for cache operations
tail -f app.log | grep "Cache"

# Watch for errors
tail -f app.log | grep "ERROR"
```

---

## Production Checklist

- [ ] Redis cluster configured for HA
- [ ] Database backups automated
- [ ] Connection pooling configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Metrics monitoring active
- [ ] Error tracking (Sentry) configured
- [ ] Load balancer health checks configured
- [ ] Cache invalidation strategy documented
- [ ] Disaster recovery plan documented

---

## Performance Baseline

**Expected Results After Optimization**:

| Metric | Target |
|--------|--------|
| GET /products | < 100ms (cached) |
| GET /products/<sku> | < 50ms (cached) |
| POST /predict | < 2000ms (optimized + cached) |
| POST /chat | < 200ms (cached) |
| Response size | < 1MB (compressed) |
| Database CPU | 30-50% reduction |
| Network bandwidth | 60-70% reduction |

---

## Support & Documentation

- **Architecture**: `OPTIMIZATION_ARCHITECTURE.md`
- **Patches Summary**: `OPTIMIZATION_PATCHES_SUMMARY.md`
- **Setup Script**: `setup_optimization.sh`
- **Cache API**: `utils/cache_service.py` docstrings
- **Metrics API**: `utils/metrics_service.py` docstrings

---

## Quick Commands Reference

```bash
# Start everything
docker-compose up -d
pip install -r requirements.txt
python app.py

# Test basic endpoints
curl http://localhost:5000/health
curl http://localhost:5000/cache-stats
curl http://localhost:5000/metrics

# Run performance test
./benchmark.sh

# Clear cache
redis-cli FLUSHDB

# Check database
psql -U postgres -d siprems_db -c "SELECT COUNT(*) FROM products;"

# Monitor metrics real-time
watch -n 1 'curl -s http://localhost:5000/metrics | jq .summary'
```

---

## Next Steps After Verification

1. ✅ Monitor metrics daily
2. ✅ Adjust TTL policies based on hit rates
3. ✅ Review slow query logs weekly
4. ✅ Rebuild indexes monthly
5. ✅ Plan for Redis cluster upgrade
6. ✅ Document custom cache patterns
7. ✅ Train team on optimization strategy
