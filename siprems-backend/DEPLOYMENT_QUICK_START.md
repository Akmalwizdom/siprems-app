# SIPREMS Deployment Quick Start

## 🚀 Quick Deployment (5 minutes)

### Step 1: Prepare Environment
```bash
cd siprems-backend

# Create .env file
cat > .env << 'EOF'
FLASK_ENV=production
DB_USER=postgres
DB_PASSWORD=mysecretpassword
DB_NAME=siprems_db
GEMINI_API_KEY=your_actual_api_key
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
NGINX_PORT=80
EOF
```

### Step 2: Start All Services
```bash
docker-compose up -d

# Wait for services to initialize
sleep 40

# Verify status
docker-compose ps
```

### Step 3: Initialize Database
```bash
docker exec siprems-postgres-db psql -U postgres -d siprems_db -f /docker-entrypoint-initdb.d/schema.sql

# Seed with sample data
docker exec siprems-backend-1 python seed.py
```

### Step 4: Verify Deployment
```bash
# Run health check script
chmod +x health_check.sh
./health_check.sh http://localhost

# Or manually check endpoints
curl http://localhost/health
curl http://localhost/ready
curl http://localhost/metrics | jq '.'
```

✅ **Your SIPREMS deployment is ready!**

---

## 📊 System Status

### Check Service Health
```bash
# All services
docker-compose ps

# Specific service logs
docker-compose logs backend_1
docker-compose logs nginx
docker-compose logs pgbouncer

# Real-time logs
docker-compose logs -f nginx
```

### Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| **API** | `http://localhost` | Main API endpoint |
| **Backend 1** | `http://localhost:5001/health` | Direct access |
| **Backend 2** | `http://localhost:5002/health` | Direct access |
| **Metrics** | `http://localhost/metrics` | Performance data |
| **Cache Stats** | `http://localhost/cache-stats` | Redis status |
| **DB (Direct)** | `localhost:5432` | PostgreSQL |
| **DB Pool** | `localhost:6432` | pgBouncer |
| **Redis** | `localhost:6379` | Cache/Broker |

---

## 🔧 Common Operations

### Add a Backend Instance (Scale Up)

```bash
# Edit docker-compose.yml
# 1. Copy backend_2 service block
# 2. Change container_name to "siprems-backend-3"
# 3. Change port to "5003:5000"
# 4. Save

# Start the new instance
docker-compose up -d backend_3

# Update Nginx
# Edit nginx/nginx.conf, add under upstream backend:
# server backend_3:5000 weight=1;

# Reload Nginx
docker exec siprems-nginx nginx -s reload

# Verify
curl http://localhost:5003/health
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend_1 nginx

# Full restart (with rebuild)
docker-compose down
docker-compose up -d

# Rebuild images
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Update Configuration

```bash
# Edit .env file
vim .env

# Restart affected services
docker-compose up -d backend_1 backend_2

# Or specific service
docker-compose restart celery_worker
```

### View Logs

```bash
# Last 50 lines
docker-compose logs -n 50 backend_1

# Stream in real-time
docker-compose logs -f backend_1

# All services
docker-compose logs -f

# Filter by keyword
docker-compose logs | grep ERROR
```

---

## 📈 Performance Monitoring

### Check Load
```bash
# View Nginx metrics
curl http://localhost/metrics | jq '.summary | keys'

# Watch performance in real-time
watch -n 2 'curl -s http://localhost/metrics | jq ".summary | {
  db_queries: .db_query_SELECT,
  api_calls: .http_get_products,
  cache: .cache_hits
}"'
```

### Database Connections
```bash
# Check pgBouncer pool status
docker exec siprems-pgbouncer psql -h localhost -p 6432 -U postgres -d pgbouncer -c "SHOW POOLS;"

# Check active connections
docker exec siprems-postgres-db psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
```

### Cache Effectiveness
```bash
# Check cache hits/misses
curl http://localhost/cache-stats | jq '.total_keys'

# Monitor in real-time
watch -n 5 'curl -s http://localhost/cache-stats | jq "."'
```

---

## 🐛 Troubleshooting

### Service Won't Start

```bash
# Check logs for errors
docker-compose logs backend_1

# Common issues:
# - Port already in use: lsof -i :5000
# - Insufficient disk space: df -h
# - Memory issues: docker stats

# Solution: Check .env variables and restart
docker-compose restart backend_1
```

### Database Connection Issues

```bash
# Test database connection
docker exec siprems-pgbouncer psql -h localhost -p 6432 -U postgres -d siprems_db -c "SELECT 1;"

# Test direct connection
docker exec siprems-postgres-db psql -U postgres -d siprems_db -c "SELECT 1;"

# Increase pool size if getting "too many connections"
# Edit docker-compose.yml, increase DEFAULT_POOL_SIZE
```

### High Memory Usage

```bash
# Check Redis memory
docker exec siprems-redis redis-cli INFO memory

# Clear cache if full
docker exec siprems-redis redis-cli FLUSHDB

# Check what's taking space
docker exec siprems-redis redis-cli --bigkeys

# Reduce in-memory metrics
# Set smaller retention in utils/metrics_service.py
```

### Slow Response Times

```bash
# Check metrics
curl http://localhost/metrics | jq '.summary.db_query_SELECT'

# If database slow:
# 1. Check if indexes exist: ANALYZE;
# 2. Check running queries: SELECT * FROM pg_stat_activity;
# 3. Increase work_mem in PostgreSQL config

# If cache hit rate low:
# 1. Check /cache-stats endpoint
# 2. Verify CACHE_ENABLED=true in .env
# 3. Check Redis connectivity
```

---

## 🚢 Production Deployment

### Before Going Live

- [ ] Update FLASK_ENV to `production`
- [ ] Set strong DB password (not default)
- [ ] Set strong REDIS password
- [ ] Configure CORS properly (not localhost)
- [ ] Enable SSL/HTTPS in Nginx config
- [ ] Set up automated backups
- [ ] Configure monitoring/alerts
- [ ] Load test with expected traffic
- [ ] Test failover (stop one backend, verify others handle traffic)

### SSL/HTTPS Setup

```bash
# 1. Obtain certificates (Let's Encrypt, AWS, etc.)
# 2. Place in ./certs/ directory:
#    - cert.pem
#    - key.pem

# 3. Uncomment HTTPS section in nginx/nginx.conf

# 4. Redirect HTTP to HTTPS:
docker exec siprems-nginx nginx -s reload
```

### Backup Strategy

```bash
# PostgreSQL backup
docker exec siprems-postgres-db pg_dump -U postgres siprems_db > backup.sql

# Redis snapshot
docker exec siprems-redis redis-cli SAVE

# Copy backup outside container
docker cp siprems-postgres-db:/backup.sql ./backups/
```

---

## 📋 Scaling Reference

### When to Scale

| Metric | Threshold | Action |
|--------|-----------|--------|
| CPU (Backend) | > 70% | Add 1-2 backend instances |
| CPU (Database) | > 75% | Vertical scale (more memory/CPU) |
| Redis Memory | > 80% | Increase max memory or clear cache |
| Response Time | > 1s | Check database, add indexes |
| DB Connections | > 80 | Increase pool size |

### Scaling Steps

**Add 2 more backend instances**:
```bash
# Edit docker-compose.yml, add backend_3 and backend_4

# Start them
docker-compose up -d backend_3 backend_4

# Update Nginx
# Edit nginx/nginx.conf, add backend_3 and backend_4

# Reload
docker exec siprems-nginx nginx -s reload
```

**Scale database vertically**:
```bash
# Edit docker-compose.yml PostgreSQL environment
POSTGRES_INITDB_ARGS: "-c shared_buffers=512MB -c work_mem=32MB"

# Restart
docker-compose restart db
```

---

## 🔍 Useful Commands

```bash
# View all running containers
docker-compose ps

# Stop all services
docker-compose stop

# Remove all services (keep volumes)
docker-compose down

# Remove everything including volumes
docker-compose down -v

# Build images
docker-compose build

# View resource usage
docker stats

# Inspect container
docker inspect siprems-backend-1 | jq '.Config.Env'

# Execute command in running container
docker-compose exec backend_1 python -c "import sys; print(sys.version)"

# Copy files from container
docker cp siprems-backend-1:/app/models/meta /tmp/

# View real-time logs
docker-compose logs -f --tail=100

# Prune unused resources
docker system prune -a --volumes
```

---

## 📚 Documentation Files

- **SCALING_ARCHITECTURE.md** - Complete scaling guide with architecture diagrams
- **OPTIMIZATION_ARCHITECTURE.md** - Caching, indexing, and performance tuning
- **OPTIMIZATION_PATCHES_SUMMARY.md** - Summary of all optimizations
- **IMPLEMENTATION_CHECKLIST.md** - Detailed deployment checklist

---

## 🆘 Support

### Quick Health Check
```bash
./health_check.sh http://localhost
```

### Check Specific Component
```bash
# Backend health
curl -v http://localhost/health

# Full readiness check
curl -v http://localhost/ready

# Performance metrics
curl http://localhost/metrics | jq '.'

# Cache status
curl http://localhost/cache-stats | jq '.'
```

### Common Ports
- **80**: Nginx (main entry point)
- **5001, 5002**: Backend instances
- **5432**: PostgreSQL (direct)
- **6432**: pgBouncer
- **6379**: Redis

### Debug Logs
```bash
# Backend error log
docker-compose logs backend_1 | grep ERROR

# Nginx error log
docker-compose logs nginx | grep error

# Full logs from past hour
docker-compose logs --since=1h

# Save logs to file
docker-compose logs > deployment.log
```

---

**Status**: ✅ Ready for production deployment!

For advanced configuration, see **SCALING_ARCHITECTURE.md**
