# SIPREMS Scaling Architecture

## Overview

This document describes the complete stateless, scalable architecture for SIPREMS using Docker Compose with load balancing, connection pooling, and horizontal scaling capabilities.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Stateless API Design](#stateless-api-design)
3. [Connection Pooling](#connection-pooling)
4. [Load Balancing](#load-balancing)
5. [Horizontal Scaling](#horizontal-scaling)
6. [Shared Artifacts](#shared-artifacts)
7. [Health Checks](#health-checks)
8. [Deployment Guide](#deployment-guide)
9. [Performance Tuning](#performance-tuning)
10. [Monitoring & Debugging](#monitoring--debugging)

---

## Architecture Overview

### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Requests                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    Nginx Load Balancer                       │
│  - Reverse Proxy  - Rate Limiting  - Response Caching        │
│  - SSL Termination  - Gzip Compression                       │
└──────────────┬─────────────────────────────┬────────────────┘
               │                             │
      ┌────────▼─────────┐         ┌─────────▼────────┐
      │  Backend API #1  │         │  Backend API #2  │
      │  (Stateless)     │         │  (Stateless)     │
      │  Port 5001       │         │  Port 5002       │
      │  4 Workers       │         │  4 Workers       │
      └────────┬─────────┘         └─────────┬────────┘
               │                             │
        ┌──────┴─────────────┬───────────────┘
        │                    │
   ┌────▼────────────┐  ┌────▼────────────┐
   │  pgBouncer      │  │  Redis Cache    │
   │  (Pool: 25)     │  │  (512MB limit)  │
   │  Port 6432      │  │  Port 6379      │
   └────┬────────────┘  └────┬────────────┘
        │                    │
   ┌────▼────────────┐  ┌────▼────────────┐
   │  PostgreSQL     │  │  ML Artifacts   │
   │  Database       │  │  (Shared Vol)   │
   │  Port 5432      │  └──────────────��──┘
   └─────────────────┘

┌────────────────────────────────────────────────────────────┐
│               Background Workers (Celery)                   │
│  - ML Model Training                                        │
│  - Prediction Tasks                                         │
│  - Scheduled Jobs (Beat)                                    │
└────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Role | Scaling | Instance |
|-----------|------|---------|----------|
| **Nginx** | Load balancer, reverse proxy, caching | 1 (can scale) | 1 |
| **Backend API** | Stateless Flask application | ∞ horizontal | 2+ |
| **pgBouncer** | DB connection pooling | 1 | 1 |
| **PostgreSQL** | Primary data store | Vertical | 1 |
| **Redis** | Cache, session, message broker | Vertical | 1 |
| **Celery Worker** | Background task processing | ∞ horizontal | 1+ |
| **Celery Beat** | Task scheduler | 1 | 1 |

---

## Stateless API Design

### Principles

1. **No In-Memory State**: All state externalized to Redis/Database
2. **Request Independence**: Each request can be served by any instance
3. **Shared Storage**: ML models in shared volumes
4. **Distributed Sessions**: Chat history in Redis (not memory)

### Implementation Details

#### Services Initialization

```python
# app.py - Factory pattern for stateless initialization
def create_app(config=None):
    app = Flask(__name__)
    
    # Initialize stateless services
    cache_service = init_cache(config)      # Redis-based
    metrics_service = init_metrics()        # In-memory (non-persistent)
    ml_engine = MLEngine(get_db_connection) # Stateless
    prediction_service = PredictionService(ml_engine)
    chat_service = ChatService(config)      # Stateless (uses Redis)
    
    return app
```

#### ChatService - Stateless Example

**Before (Stateful - ❌ Won't work with multiple instances)**:
```python
class ChatService:
    def __init__(self, config):
        self.chat = self.model.start_chat(history=[])  # In-memory!
```

**After (Stateless - ✓ Works with multiple instances)**:
```python
class ChatService:
    def send_message(self, message, user_id, session_id):
        # Load history from Redis
        history = self._get_conversation_history(user_id, session_id)
        
        # Create fresh chat with loaded history
        chat = self.model.start_chat(history=history)
        response = chat.send_message(message)
        
        # Save updated history to Redis
        self._save_conversation_history(user_id, session_id, updated_history)
        return response
```

### Stateless Components Checklist

- [x] **ChatService**: Uses Redis for conversation history
- [x] **PredictionService**: Fetches data from DB, returns results (no memory)
- [x] **CacheService**: Uses Redis, not in-memory
- [x] **MetricsService**: Accepts degradation (non-persistent metrics OK)
- [x] **MLEngine**: Stateless, fetches data on demand
- [x] **Authentication**: JWT tokens (no server-side sessions)

---

## Connection Pooling

### pgBouncer Configuration

pgBouncer sits between backend instances and PostgreSQL, pooling connections.

```ini
# pgbouncer/pgbouncer.ini
pool_mode = transaction        # One pool per transaction
max_client_conn = 1000        # Max client connections
default_pool_size = 25        # Connections per database/user
min_pool_size = 10            # Minimum idle connections
reserve_pool_size = 5         # Emergency reserve
reserve_pool_timeout = 3      # Seconds before using reserve
```

### Connection Pool Sizing

**Formula**: `pool_size = (core_count * 2) + pending_io_operations`

For 4 cores with typical IO:
- `min_pool_size = 10`
- `default_pool_size = 25`
- `reserve_pool_size = 5`

### Monitoring pgBouncer

```bash
# Check pool status
psql -h localhost -p 6432 -U postgres -d pgbouncer -c "SHOW POOLS;"

# Show active connections
psql -h localhost -p 6432 -U postgres -d pgbouncer -c "SHOW CLIENTS;"

# View statistics
psql -h localhost -p 6432 -U postgres -d pgbouncer -c "SHOW STATS;"
```

### Connection Pool Tuning

If seeing connection exhaustion:
1. Increase `default_pool_size` (start at 25, go up to 50)
2. Reduce query timeout
3. Enable connection cleanup

If memory usage high:
1. Reduce `max_client_conn`
2. Enable `server_idle_timeout`

---

## Load Balancing

### Nginx Configuration

Nginx provides:
- **Round-robin load balancing** across backend instances
- **Connection pooling** (keepalive)
- **Response caching** for GET requests
- **Rate limiting** per endpoint
- **Health checks** before routing

### Load Balancing Strategy

```nginx
upstream backend {
    keepalive 32;                    # HTTP/1.1 keep-alive
    
    server backend_1:5000 weight=1;  # Primary
    server backend_2:5000 weight=1 backup;  # Backup
}

# Round-robin distribution
location /api/ {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Connection "";  # Enable keep-alive
}
```

### Rate Limiting

Different limits per endpoint:

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=predict_limit:10m rate=3r/s;

location /api/ {
    limit_req zone=api_limit burst=20;  # 10 req/s, burst 20
}

location /api/predict {
    limit_req zone=predict_limit burst=5;  # 3 req/s, burst 5
}
```

### Response Caching

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:100m;

location /api/ {
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;        # Cache successful responses 5min
    proxy_cache_bypass $http_cache_control;  # Allow clients to bypass
    add_header X-Cache-Status $upstream_cache_status;
}
```

---

## Horizontal Scaling

### Adding Backend Instances

**Step 1: Update docker-compose.yml**

```yaml
services:
  backend_3:
    image: siprems-backend:latest
    environment:
      DB_HOST: pgbouncer
      REDIS_URL: redis://redis:6379/2
    depends_on:
      - pgbouncer
      - redis
    ports:
      - "5003:5000"
```

**Step 2: Update Nginx configuration**

```nginx
upstream backend {
    server backend_1:5000 weight=1;
    server backend_2:5000 weight=1;
    server backend_3:5000 weight=1;  # New instance
}
```

**Step 3: Reload services**

```bash
docker-compose up -d backend_3
docker exec siprems-nginx nginx -s reload
```

### Scaling Strategy

#### Horizontal Scaling (Recommended)

**When to add instances**:
- CPU usage > 70% consistently
- Response time > 2 seconds
- Queued requests visible

**How to add**:
```bash
# Add 2 more instances
docker-compose up -d backend_3 backend_4

# Update Nginx and reload
docker exec siprems-nginx nginx -s reload
```

#### Vertical Scaling (Database/Redis)

**When to increase**:
- Database CPU/Memory high
- Connection pool exhausted
- Redis eviction happening

**How to increase**:
```yaml
db:
  environment:
    POSTGRES_INITDB_ARGS: "-c shared_buffers=512MB -c work_mem=32MB"

redis:
  command: redis-server --maxmemory 2gb --maxmemory-policy allkeys-lru
```

### Scaling Limits

| Component | Soft Limit | Hard Limit | Mitigation |
|-----------|-----------|-----------|-----------|
| **Backend Instances** | 10 | 100+ | Add load balancers |
| **DB Connections** | 100 | 200 | Use pgBouncer, reduce pool size |
| **Redis Memory** | 512MB | 2GB+ | Enable eviction, use Redis Cluster |
| **Nginx Connections** | 4096 | 65536 | Add more Nginx instances |

---

## Shared Artifacts

### ML Models Storage

Models stored in shared Docker volume accessible to all instances:

```yaml
volumes:
  models_volume:
    driver: local
    driver_opts:
      type: tmpfs
      device: tmpfs
```

All services mount the same volume:

```yaml
services:
  backend_1:
    volumes:
      - models_volume:/app/models
  
  celery_worker:
    volumes:
      - models_volume:/app/models
```

### Model Caching Strategy

```python
MODELS_DIR = /app/models
META_DIR = /app/models/meta

# Models loaded on first use, cached in memory
model_cache = {}

def load_model(product_sku):
    if product_sku not in model_cache:
        model_path = f"{MODELS_DIR}/{product_sku}.pkl"
        model_cache[product_sku] = load(model_path)
    return model_cache[product_sku]
```

### Model Update Strategy

1. **Training**: Celery worker trains model, saves to `/app/models`
2. **Versioning**: Include timestamp in filename: `BRD-001_2024-01-15.pkl`
3. **Caching**: Instances auto-reload on next request
4. **Fallback**: Keep previous version until new one validates

---

## Health Checks

### Health Check Endpoints

#### `/health` (Load Balancer Health Check)
Fast, minimal check for load balancer routing.

```bash
curl http://localhost:5000/health
{"status": "healthy"}
```

#### `/ready` (Readiness Check)
Full dependency check before serving requests.

```bash
curl http://localhost:5000/ready
{
  "status": "ready",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "chat_service": "ok"
  }
}
```

### Docker Compose Health Checks

```yaml
services:
  backend:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Verifying Health

```bash
# Run health check script
./health_check.sh http://localhost

# Check Docker health
docker ps --format "table {{.Names}}\t{{.Status}}"

# Check specific service
docker inspect siprems-backend-1 --format='{{json .State.Health}}'
```

---

## Deployment Guide

### Prerequisites

```bash
docker --version          # >= 20.10
docker-compose --version  # >= 2.0
curl --version           # For health checks
```

### Initial Setup

**Step 1: Clone and navigate**
```bash
cd siprems-backend
```

**Step 2: Create .env file**
```bash
cat > .env << EOF
FLASK_ENV=production
DB_USER=postgres
DB_PASSWORD=mysecretpassword
DB_NAME=siprems_db
GEMINI_API_KEY=your_api_key_here
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
REDIS_PORT=6379
NGINX_PORT=80
EOF
```

**Step 3: Start services**
```bash
docker-compose up -d

# Wait for health checks
sleep 30

# Verify status
docker-compose ps
```

**Step 4: Run migrations**
```bash
docker exec siprems-postgres-db psql -U postgres -d siprems_db -f /docker-entrypoint-initdb.d/schema.sql
```

**Step 5: Seed database**
```bash
docker exec siprems-backend-1 python seed.py
```

### Scaling to 4 Instances

**Step 1: Add backend instances to docker-compose.yml**
```yaml
backend_3:
  # Copy from backend_2, change port to 5003
backend_4:
  # Copy from backend_2, change port to 5004
```

**Step 2: Update Nginx upstream**
```bash
# Edit nginx/nginx.conf, add servers
server backend_3:5000 weight=1;
server backend_4:5000 weight=1;
```

**Step 3: Deploy**
```bash
docker-compose up -d backend_3 backend_4
docker exec siprems-nginx nginx -s reload
```

### Monitoring Deployment

```bash
# Watch all services
docker-compose ps

# View logs
docker-compose logs -f

# Watch specific service
docker-compose logs -f backend_1

# Monitor performance
watch -n 5 'curl -s http://localhost/metrics | jq .summary'
```

---

## Performance Tuning

### PostgreSQL Tuning

```sql
-- Increase cache
ALTER SYSTEM SET shared_buffers = '256MB';

-- Improve sorting
ALTER SYSTEM SET work_mem = '16MB';

-- Enable parallel queries
ALTER SYSTEM SET max_parallel_workers_per_gather = 2;

-- Increase connections
ALTER SYSTEM SET max_connections = 200;

-- Apply changes
SELECT pg_reload_conf();
```

### Redis Tuning

```bash
# Increase memory limit
redis-cli CONFIG SET maxmemory 1gb

# Set eviction policy
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Enable persistence (optional)
redis-cli CONFIG SET save "900 1 300 10 60 10000"
```

### Nginx Tuning

```nginx
worker_processes auto;           # Auto-detect cores
worker_connections 4096;         # Connections per worker
keepalive_timeout 65;            # Connection reuse

# Increase buffer sizes
proxy_buffer_size 128k;
proxy_buffers 4 256k;
```

### Backend Tuning

```python
# In app.py or config
app.run(
    threaded=True,               # Thread per request
    debug=False,                 # Disable debug
    use_reloader=False           # Don't reload
)

# Gunicorn for production
gunicorn -w 4 -t 120 app:app
```

---

## Monitoring & Debugging

### Metrics Endpoints

```bash
# Performance metrics
curl http://localhost/metrics | jq '.summary'

# Cache statistics
curl http://localhost/cache-stats | jq '.'

# Readiness check
curl http://localhost/ready | jq '.'
```

### Common Issues

**Issue**: Backend instance not responding
```bash
# Check logs
docker-compose logs backend_1

# Check health
curl http://localhost:5001/health

# Restart
docker-compose restart backend_1
```

**Issue**: Database connection errors
```bash
# Check pgBouncer pool
psql -h localhost -p 6432 -U postgres -d pgbouncer -c "SHOW POOLS;"

# Check database
docker-compose exec db psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Increase pool size
# Edit docker-compose.yml, increase DEFAULT_POOL_SIZE
```

**Issue**: High memory usage in Redis
```bash
# Check memory
docker exec siprems-redis redis-cli INFO memory

# Check what's taking memory
docker exec siprems-redis redis-cli --bigkeys

# Clear cache
docker exec siprems-redis redis-cli FLUSHDB
```

### Log Aggregation

```bash
# Stream all logs
docker-compose logs -f

# Filter by service
docker-compose logs -f backend_1 nginx

# Filter by keyword
docker-compose logs -f | grep ERROR

# Save logs to file
docker-compose logs > logs.txt
```

### Performance Analysis

```bash
# Check request times
curl -v http://localhost/api/products 2>&1 | grep time

# Check Nginx cache hit rate
docker exec siprems-nginx tail -f /var/log/nginx/access.log | grep X-Cache-Status

# Check database query times
docker exec siprems-postgres-db psql -U postgres -c "SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Docker and docker-compose installed
- [ ] .env file created with all variables
- [ ] Domain/IP configured
- [ ] SSL certificates prepared (if using HTTPS)
- [ ] Backups taken
- [ ] Monitoring configured

### Deployment

- [ ] Run `docker-compose up -d`
- [ ] Wait 40 seconds for health checks
- [ ] Run health check script: `./health_check.sh`
- [ ] Seed database: `docker exec siprems-backend-1 python seed.py`
- [ ] Run migrations
- [ ] Test endpoints: `curl http://localhost/api/products`
- [ ] Monitor logs: `docker-compose logs -f`

### Post-Deployment

- [ ] Verify all services healthy
- [ ] Check metrics: `curl http://localhost/metrics`
- [ ] Load test with ab or wrk
- [ ] Monitor for 24 hours
- [ ] Set up alerts
- [ ] Document any customizations

---

## Horizontal Scaling Summary

```mermaid
graph LR
    Client[Clients]
    
    Client -->|Request| LB[Nginx]
    
    LB -->|Round-robin| B1[Backend 1]
    LB -->|Round-robin| B2[Backend 2]
    LB -->|Round-robin| B3[Backend 3]
    
    B1 -->|Connection Pool| PB[pgBouncer]
    B2 -->|Connection Pool| PB
    B3 -->|Connection Pool| PB
    
    B1 -->|Cache| Redis[Redis]
    B2 -->|Cache| Redis
    B3 -->|Cache| Redis
    
    PB -->|Queries| DB[(PostgreSQL)]
    
    Redis -->|History| Redis
    
    B1 -->|Models| Models[/app/models]
    B2 -->|Models| Models
    B3 -->|Models| Models
    
    W[Celery Workers] -->|Tasks| Redis
    W -->|Update Models| Models
```

### Scaling Arithmetic

- **Requests per second**: 100 req/sec = ~2-4 backend instances
- **Concurrent users**: 1000 users = ~4-8 backend instances
- **Database load**: Monitor CPU > 70% = need vertical scaling
- **Memory per instance**: ~200-300MB per Flask worker

**Formula for Backend Instances**:
```
instances = (expected_rps / 25) + 1
         = (100 / 25) + 1
         = 5 instances (recommended for 100 rps)
```

---

## Migration from Development to Production

1. **Infrastructure**: Use same docker-compose.yml (tested setup)
2. **Secrets**: Move to environment variables, not in code
3. **Scaling**: Start with 2 instances, add more as needed
4. **Monitoring**: Enable logging and metrics collection
5. **Backups**: Automated PostgreSQL backups, Redis snapshots
6. **SSL**: Configure Nginx to terminate SSL
7. **Updates**: Use rolling deployments (update 1 instance at a time)

---

## Summary

✅ **Stateless API**: No in-memory state, all in Redis/DB
✅ **Connection Pooling**: pgBouncer manages DB connections
✅ **Load Balancing**: Nginx distributes traffic round-robin
✅ **Horizontal Scaling**: Add backend instances as needed
✅ **Shared Artifacts**: ML models in shared volumes
✅ **Health Checks**: Comprehensive endpoints for monitoring
✅ **Production Ready**: Logging, metrics, monitoring included

**Expected Performance**:
- **Throughput**: 100+ req/sec per instance
- **Response time**: < 500ms (p95)
- **CPU efficiency**: < 70% with proper sizing
- **Scalability**: Linear with added instances
