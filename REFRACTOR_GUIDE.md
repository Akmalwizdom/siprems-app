# SIPREMS Refactoring Guide - Complete Documentation

## Table of Contents

1. [Overview](#overview)
2. [Frontend Refactoring](#frontend-refactoring)
3. [Backend Architecture](#backend-architecture)
4. [Security Implementation](#security-implementation)
5. [Database Migration (SQLAlchemy ORM)](#database-migration-sqlalchemy-orm)
6. [Performance Optimization](#performance-optimization)
7. [Asynchronous Processing (Celery)](#asynchronous-processing-celery)
8. [Scaling & Deployment](#scaling--deployment)
9. [Quick Reference](#quick-reference)

---

## Overview

SIPREMS has undergone a comprehensive refactoring from a monolithic application to a modern, scalable, secure system. This includes:

- **Frontend**: React with routing, form validation, and modern UI patterns
- **Backend**: Modular Flask architecture with SQLAlchemy ORM
- **Security**: JWT authentication, input validation, rate limiting
- **Performance**: Redis caching, database indexing, query optimization
- **Async**: Celery workers for ML computations
- **Scaling**: Docker Compose with load balancing, connection pooling

**Status**: ✅ **Production Ready**

---

## Frontend Refactoring

### Architecture & Routing

The frontend now uses **react-router-dom v6** with protected routes and client-side routing.

#### Route Structure
```
/login                 → Public login page
/                      → Dashboard (protected)
/products              → Products management
/transactions          → Transactions management
/prediction            → Predictions
/insights              → Analytics insights
/calendar              → Calendar view
/settings              → Settings
```

#### Protected Routes
```typescript
<Route
  path="/*"
  element={
    <ProtectedRoute>
      <MainLayout>
        {/* Protected pages */}
      </MainLayout>
    </ProtectedRoute>
  }
/>
```

### Form Validation & State Management

**Zod + React Hook Form**: Type-safe validation schemas

```typescript
const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(productSchema)
});
```

**Key Features:**
- Type-safe schema definitions
- Automatic validation error messages
- Form state management
- Async form submission handling

### Data Table Component

Reusable table with pagination, sorting, and custom rendering:

```typescript
<DataTable
  columns={columns}
  data={products}
  pageSize={10}
  isLoading={loading}
  emptyMessage="No products found"
/>
```

**Features:**
- ✅ Sortable columns
- ✅ Pagination with page navigation
- ✅ Custom column rendering
- ✅ Loading skeletons
- ✅ Empty state handling

### Toast Notifications

Simple toast API for user feedback:

```typescript
showToast.success('Product created!');
showToast.error('Operation failed');
showToast.promise(asyncOperation, {
  loading: 'Processing...',
  success: 'Done!',
  error: 'Failed'
});
```

### Responsive Design

- Mobile-first approach
- Tailwind CSS breakpoints: sm, md, lg, xl
- Dark mode support with `dark:` prefix

### UI Components

Pre-built reusable components:
- DataTable, Card, Button, Dialog, Input, Select, Pagination
- CardSkeleton for loading states
- Motion animations

---

## Backend Architecture

### Modular Structure

**Factory Pattern** with Flask Blueprints:

```python
app = create_app(config)
```

Benefits:
- Separation of concerns
- Easy testing with different configs
- Loose coupling

### Layered Architecture

```
routes/          → HTTP endpoints (Blueprints)
  ↓
services/        → Business logic
  ↓
models/          → Data access layer (ORM)
  ↓
database         → PostgreSQL
```

### API Routes

**Protected Endpoints** (require JWT):
- `/products/*` - Product management
- `/transactions/*` - Transaction management
- `/events/*` - Event management
- `/predict/*` - Stock predictions
- `/chat/*` - AI chat

**Public Endpoints**:
- `/auth/register` - User registration
- `/auth/login` - User authentication
- `/auth/refresh` - Token refresh
- `/health` - Health check
- `/settings/status` - System status

### Configuration Management

**Environment-based** configuration via `utils/config.py`:

```env
FLASK_ENV=production
DB_HOST=localhost
DB_NAME=siprems_db
DB_PASSWORD=your_password
JWT_SECRET_KEY=your_secret
CORS_ALLOWED_ORIGINS=your_domain
```

---

## Security Implementation

### JWT Authentication

**Access Tokens** (30 minutes):
- Short-lived for security
- Included in `Authorization: Bearer <token>` header
- Verified on every protected request

**Refresh Tokens** (7 days):
- Longer-lived for convenience
- Used to get new access tokens
- Never exposed in URLs

#### Authentication Flow

1. **Register**: `POST /auth/register`
   ```json
   {
     "email": "user@example.com",
     "password": "SecurePass123",
     "full_name": "John Doe"
   }
   ```

2. **Login**: `POST /auth/login`
   ```json
   {
     "email": "user@example.com",
     "password": "SecurePass123"
   }
   ```
   Returns: `{ access_token, refresh_token, user_id, email, full_name }`

3. **Use Token**: Include in API requests
   ```bash
   curl -H "Authorization: Bearer <access_token>" http://localhost/api/products
   ```

4. **Refresh**: When access token expires
   ```json
   POST /auth/refresh
   { "refresh_token": "<refresh_token>" }
   ```

### Input Validation

**Marshmallow Schemas** validate all requests:

```python
class ProductSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=1, max=255))
    price = fields.Float(required=True, validate=validate.Range(min=0))
    category = fields.Str(required=True)

valid, validated_data, errors = validate_request_data(ProductSchema, data)
if not valid:
    return jsonify({'error': 'Validation failed', 'details': errors}), 400
```

### Security Headers

**Flask-Talisman** adds security headers:
- HSTS (HTTP Strict Transport Security)
- CSP (Content Security Policy)
- X-Frame-Options (clickjacking protection)
- X-Content-Type-Options (MIME sniffing prevention)

### CORS Whitelist

Only specified origins allowed:

```env
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

### Rate Limiting

**Flask-Limiter** prevents abuse:
- Default: 100 requests/hour per IP
- Configurable per endpoint
- Uses Redis in production

### Password Security

- PBKDF2-SHA256 hashing with 16-byte salt
- Minimum 8 characters, uppercase, and number required
- ~300ms hashing time (intentional for security)

---

## Database Migration (SQLAlchemy ORM)

### Session Management

Context manager for automatic transaction handling:

```python
from utils.db_session import get_db_session

with get_db_session() as session:
    product = session.query(Product).filter_by(sku="BRD-001").first()
    # Auto-commits on successful exit, rolls back on exception
```

**Features:**
- Automatic commit/rollback
- Connection pooling (pool_size=10, max_overflow=20)
- Connection recycling (3600 seconds)
- Pre-ping for connection health

### ORM Models

**Directory**: `models/orm/`

#### User Model
- user_id (PK)
- email (unique, indexed)
- full_name
- password_hash
- is_active
- created_at, updated_at

#### Product Model
- product_id (PK)
- sku (unique, indexed)
- name, category (indexed)
- price, stock
- created_at

#### Transaction Model
- transaction_id (PK)
- product_id (FK)
- quantity_sold, price_per_unit
- is_promo
- transaction_date (indexed)

#### Event Model
- event_id (PK)
- event_name
- event_date (indexed)
- type (holiday/custom, indexed)
- description
- include_in_prediction
- created_at

### Data Access Layer

**Consistent Interface** across all models:

```python
# Get all with pagination
products = ProductModel.get_all_products(limit=10, offset=0)

# Get by unique identifier
product = ProductModel.get_product_by_sku("BRD-001")

# Create
ProductModel.create_product(name, category, price, stock, sku)

# Update
ProductModel.update_product(sku, name, category, price, stock)

# Delete
ProductModel.delete_product(sku)
```

### Query Examples

**Single Record**:
```python
with get_db_session() as session:
    product = session.query(Product).filter(Product.sku == "BRD-001").first()
```

**Multiple Records with Filter**:
```python
with get_db_session() as session:
    products = session.query(Product).filter(Product.category == "Electronics").all()
```

**Aggregation**:
```python
from sqlalchemy import func

with get_db_session() as session:
    total_value = session.query(
        func.sum(Product.price * Product.stock)
    ).scalar()
```

**Join Query**:
```python
with get_db_session() as session:
    results = session.query(Transaction, Product).join(
        Product, Transaction.product_id == Product.product_id
    ).all()
```

### Benefits

- ✅ SQL injection prevention (automatic parameterization)
- ✅ Type safety with full IDE support
- ✅ Object-oriented data access
- ✅ Connection pooling built-in
- ✅ Easy to test with mocks

---

## Performance Optimization

### Redis Caching Layer

**TTL Policies** (configurable per data type):

```python
TTL_POLICIES = {
    'product_info': 3600,           # 1 hour
    'product_list': 1800,            # 30 minutes
    'prediction_result': 7200,       # 2 hours
    'ai_response': 3600,             # 1 hour
    'dashboard_stats': 300,          # 5 minutes
}
```

**Usage**:
```python
from utils.cache_service import get_cache_service

cache = get_cache_service()

# Get from cache
value = cache.get('product:SKU-001')

# Set with TTL
cache.set('product:SKU-001', data, ttl=3600)

# Delete pattern
cache.delete_pattern('product:*')

# Clear all
cache.clear()
```

**Automatic Cache Invalidation**:
- Write operations (POST, PUT, DELETE) invalidate related caches
- Pattern-based invalidation for related data

### Database Indexing

Strategic indexes for query acceleration:

```sql
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_transactions_product_date ON transactions(product_id, transaction_date);
CREATE INDEX idx_transactions_date_range ON transactions(transaction_date DESC);
CREATE INDEX idx_transactions_is_promo ON transactions(is_promo);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_type ON events(type);
```

### Query Optimization

**Explicit Column Selection** (not SELECT *):
```python
# Reduces data transfer, enables better optimization
session.query(Product.id, Product.name, Product.price).all()
```

**Efficient Aggregations**:
- Single query instead of multiple
- Type casting (`::numeric`)
- COALESCE for NULL handling

### Response Compression

**gzip Compression** via flask-compress:
- Automatic for JSON responses > 500 bytes
- 70% size reduction typical
- Browser compatible

### Monitoring

**Metrics Endpoint**: `GET /metrics`
```json
{
  "summary": {
    "db_query_SELECT": {
      "count": 150,
      "avg_ms": 12.34,
      "p95_ms": 25.67
    },
    "http_predict_stock": {
      "count": 45,
      "avg_ms": 456.78
    }
  }
}
```

**Cache Statistics**: `GET /cache-stats`
```json
{
  "available": true,
  "used_memory_human": "2.5M",
  "connected_clients": 3,
  "total_keys": 156
}
```

### Expected Improvements

| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| GET /products | 450ms | 50ms | 9x faster |
| GET /products/<sku> | 200ms | 20ms | 10x faster |
| POST /predict | 3500ms | 1200ms | 2.9x faster |
| Response size | 2.5MB | 750KB | 3.3x smaller |

---

## Asynchronous Processing (Celery)

### Architecture

```
API Request
  ↓
Submit Celery Task
  ↓
Return task_id (202 Accepted)
  ↓
Client polls /tasks/<task_id>
  ↓
Worker processes in background
  ↓
Result stored in Redis
```

### Core Tasks

#### Train Product Model
```python
@celery_app.task
def train_product_model_task(product_sku):
    """Train Prophet model for single product"""
```

**Endpoint**: `POST /tasks/training/product/<sku>`

#### Predict Stock
```python
@celery_app.task
def predict_stock_task(product_sku, forecast_days=7):
    """Async prediction with auto-training"""
```

**Endpoint**: `POST /predict/async`

#### Train All Models
```python
@celery_app.task
def train_all_models():
    """Nightly training for all products (2:00 AM UTC)"""
```

**Endpoint**: `POST /tasks/training/all`

### API Usage

**Submit Task**:
```bash
curl -X POST http://localhost:5000/predict/async \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"product_sku": "BRD-001", "days": 7}'

# Response (202 Accepted)
{"task_id": "abc123...", "status": "submitted"}
```

**Check Status**:
```bash
curl http://localhost:5000/predict/task/abc123 \
  -H "Authorization: Bearer <token>"

# Response
{
  "task_id": "abc123",
  "status": "SUCCESS",
  "result": {
    "product_sku": "BRD-001",
    "chart_data": [...],
    "accuracy": 85.3
  }
}
```

**Monitor Tasks**:
```bash
curl http://localhost:5000/tasks/active \
  -H "Authorization: Bearer <token>"
```

### Task Status Codes

| Status | HTTP | Meaning |
|--------|------|---------|
| PENDING | 202 | Waiting to start |
| STARTED | 200 | Currently running |
| SUCCESS | 200 | Completed successfully |
| FAILURE | 400 | Failed with error |
| RETRY | 200 | Retrying after error |

### Configuration

**Environment Variables**:
```env
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/1
```

**Scheduled Training** (2 AM UTC):
```python
CELERY_BEAT_SCHEDULE = {
    'train-all-models-nightly': {
        'task': 'tasks.ml_tasks.train_all_models',
        'schedule': crontab(hour=2, minute=0),
    }
}
```

### Error Handling

- Automatic retry (up to 3 times)
- Exponential backoff: 2^retry_count seconds
- Soft timeout: 25 minutes (graceful)
- Hard timeout: 30 minutes (forceful)

### Docker Services

```yaml
redis:
  image: redis:7
  
celery_worker:
  image: siprems-backend:latest
  command: celery -A celery_app worker
  
celery_beat:
  image: siprems-backend:latest
  command: celery -A celery_app beat
```

---

## Scaling & Deployment

### Stateless API Design

**Principles**:
- No in-memory state (all in Redis/Database)
- Request-independent (any instance can serve any request)
- Distributed sessions (Redis-backed)
- Shared ML models (Docker volume)

### Docker Compose Production Setup

**Services**:
- PostgreSQL (database)
- pgBouncer (connection pooling, 25 connections default)
- Redis (cache, sessions, message broker)
- Backend instances (2+ stateless Flask apps)
- Nginx (load balancer)
- Celery Worker (background tasks)
- Celery Beat (scheduled tasks)

### Connection Pooling

**pgBouncer Configuration**:
```ini
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 10
reserve_pool_size = 5
```

**Benefit**: 1000+ concurrent clients using only 25 DB connections (96% reduction)

### Load Balancing

**Nginx Round-Robin**:
```nginx
upstream backend {
    keepalive 32;
    server backend_1:5000 weight=1;
    server backend_2:5000 weight=1;
    server backend_3:5000 weight=1;
}
```

**Rate Limiting**:
- API endpoints: 10 req/s
- Chat: 5 req/s
- Predictions: 3 req/s

### Health Checks

**Fast Health Check** (for load balancer):
```bash
curl http://localhost:5000/health
{"status": "healthy"}
```

**Full Readiness Check** (all dependencies):
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

### Horizontal Scaling

**Adding Instances**:

1. Edit `docker-compose.yml`
2. Add `backend_3`, `backend_4`, etc.
3. Update `nginx/nginx.conf` upstream block
4. Deploy: `docker-compose up -d backend_3`
5. Reload Nginx: `docker exec siprems-nginx nginx -s reload`

**Scaling Formula**:
```
instances = (expected_rps / 25) + 1
         = (100 req/sec / 25) + 1
         = 5 instances
```

### Deployment Checklist

#### Pre-Deployment
- [ ] Docker >= 20.10
- [ ] Docker Compose >= 2.0
- [ ] 4GB RAM minimum
- [ ] Ports 80, 5432, 6379 available
- [ ] `.env` file configured with secrets

#### Quick Start (5 minutes)

```bash
# 1. Create environment
cat > .env << EOF
FLASK_ENV=production
DB_PASSWORD=your_secure_password
DB_USER=postgres
DB_NAME=siprems_db
GEMINI_API_KEY=your_api_key
CORS_ALLOWED_ORIGINS=https://yourdomain.com
EOF

# 2. Start services
docker-compose up -d

# 3. Wait for health
sleep 40

# 4. Initialize database
docker exec siprems-postgres-db psql -U postgres -d siprems_db -f /schema.sql
docker exec siprems-backend-1 python seed.py

# 5. Verify
curl http://localhost/health
```

#### Production Tuning

**PostgreSQL**:
```sql
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET work_mem = '16MB';
ALTER SYSTEM SET max_parallel_workers_per_gather = 2;
```

**Redis**:
```bash
redis-cli CONFIG SET maxmemory 2gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

**Gunicorn** (alternative to Flask dev server):
```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### Monitoring

**Health Check Script**:
```bash
./health_check.sh http://localhost
```

**Performance Metrics**:
```bash
curl http://localhost/metrics | jq '.summary'
```

**View Logs**:
```bash
docker-compose logs -f backend_1
docker-compose logs -f nginx
```

---

## Quick Reference

### Common Commands

#### Backend Development
```bash
# Install dependencies
pip install -r requirements.txt

# Run development server
python app.py

# Run with Gunicorn (production)
gunicorn -w 4 app:app
```

#### Database
```bash
# Initialize database
psql -U postgres -f schema.sql

# Seed with sample data
python seed.py

# Run migrations
psql -U postgres -d siprems_db -f migrations.sql
```

#### Docker Operations
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# View running services
docker-compose ps

# Restart specific service
docker-compose restart backend_1
```

#### Testing & Validation
```bash
# Check health
curl http://localhost/health

# Check readiness
curl http://localhost/ready

# Get metrics
curl http://localhost/metrics | jq '.'

# Get cache stats
curl http://localhost/cache-stats | jq '.'
```

### API Examples

#### Authentication
```bash
# Register
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123",
    "full_name": "John Doe"
  }'

# Login
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'

# Use token (replace <token> with actual token)
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/products
```

#### Products
```bash
# List products
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/products

# Create product
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Widget",
    "category": "Electronics",
    "price": 29.99,
    "stock": 100,
    "sku": "WID-001"
  }'

# Update product
curl -X PUT http://localhost:5000/api/products/WID-001 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Widget", "price": 39.99}'
```

#### Async Predictions
```bash
# Submit prediction
curl -X POST http://localhost:5000/predict/async \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"product_sku": "BRD-001", "days": 7}'

# Check task status (replace <task_id>)
curl http://localhost:5000/predict/task/<task_id> \
  -H "Authorization: Bearer <token>"
```

### Environment Variables

**Development** (`.env`):
```env
FLASK_ENV=development
DB_HOST=localhost
DB_NAME=siprems_db
DB_USER=postgres
DB_PASSWORD=dev-password
GEMINI_API_KEY=your-dev-key
JWT_SECRET_KEY=dev-secret
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
CACHE_ENABLED=true
REDIS_URL=redis://localhost:6379/2
```

**Production** (`.env.production`):
```env
FLASK_ENV=production
DB_HOST=db.example.com
DB_NAME=siprems_prod
DB_USER=siprems_user
DB_PASSWORD=very-secure-password-min-32-chars
GEMINI_API_KEY=your-prod-key
JWT_SECRET_KEY=very-secure-jwt-secret-min-32-chars
CORS_ALLOWED_ORIGINS=https://yourdomain.com
CACHE_ENABLED=true
REDIS_URL=redis://redis.example.com:6379/2
```

### File Locations

**Key Files**:
- `app.py` - Application factory
- `celery_app.py` - Celery initialization
- `utils/config.py` - Configuration management
- `utils/jwt_handler.py` - JWT authentication
- `utils/cache_service.py` - Redis caching
- `models/orm/` - SQLAlchemy ORM models
- `routes/` - API endpoints
- `services/` - Business logic
- `tasks/ml_tasks.py` - Celery tasks
- `docker-compose.yml` - Docker Compose configuration

**Frontend**:
- `Siprems/src/App.tsx` - Main app with routing
- `Siprems/src/components/` - React components
- `Siprems/src/utils/api.ts` - API client
- `Siprems/src/utils/schemas.ts` - Form validation

### Troubleshooting

#### "Database connection refused"
- Ensure PostgreSQL is running: `docker-compose ps db`
- Check DB_HOST is correct
- Verify DB_PASSWORD is set

#### "Redis connection refused"
- Ensure Redis is running: `docker-compose ps redis`
- Check REDIS_URL environment variable
- Verify Redis port (6379)

#### "Invalid or expired token"
- Token may have expired; use refresh endpoint
- Check JWT_SECRET_KEY matches production
- Ensure Authorization header has correct format: `Bearer <token>`

#### "Validation failed"
- Check request data matches schema
- Ensure required fields are present
- Verify field types and lengths

#### "Rate limit exceeded"
- Wait 1 hour for rate limit reset
- Implement exponential backoff in client
- Increase limit in production if needed

### Performance Tips

1. **Use Pagination**: Limit data returned per request
2. **Enable Caching**: Redis significantly speeds up queries
3. **Add Indexes**: Critical for large tables
4. **Connection Pooling**: pgBouncer reduces DB load
5. **Compression**: gzip reduces bandwidth 70%
6. **Async Tasks**: Offload long operations to Celery
7. **Monitoring**: Use `/metrics` to identify bottlenecks
8. **Scale Out**: Add backend instances as load increases

### Security Best Practices

1. ✅ Use strong passwords (min 32 characters in production)
2. ✅ Keep JWT_SECRET_KEY private (don't commit to git)
3. ✅ Use HTTPS in production (set FLASK_ENV=production)
4. ✅ Configure CORS properly (only trusted domains)
5. ✅ Enable rate limiting (prevent abuse)
6. ✅ Validate all input (server-side)
7. ✅ Hash passwords (PBKDF2-SHA256)
8. ✅ Rotate secrets regularly
9. ✅ Monitor logs for suspicious activity
10. ✅ Keep dependencies updated

---

## Additional Resources

### Documentation Files

For detailed information on specific topics:
- **Architecture**: See `ARCHITECTURE.md`
- **Security**: See `SECURITY_REFACTORING.md`
- **ORM**: See `ORM_MIGRATION_GUIDE.md` and `ORM_QUICKSTART.md`
- **Optimization**: See `OPTIMIZATION_ARCHITECTURE.md`
- **Scaling**: See `SCALING_ARCHITECTURE.md`
- **Deployment**: See `DEPLOYMENT_QUICK_START.md`
- **Celery**: See `ML_PIPELINE_REFACTORING.md` and `CELERY_QUICKSTART.md`

### External Resources

- [React Documentation](https://react.dev)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [SQLAlchemy Docs](https://docs.sqlalchemy.org/)
- [Celery Docs](https://docs.celeryproject.org/)
- [Docker Documentation](https://docs.docker.com/)
- [JWT.io](https://jwt.io/)
- [OWASP Security](https://owasp.org/)

---

## Support & Feedback

### Getting Help

1. Check this guide for quick answers
2. Review architecture documentation for details
3. Check logs: `docker-compose logs -f`
4. Use `/metrics` endpoint to diagnose performance issues
5. Use `/health` and `/ready` endpoints for system status

### Reporting Issues

Document the following:
- Steps to reproduce
- Expected vs actual behavior
- Error logs (if applicable)
- Environment details (development vs production)
- Any recent changes

---

**Last Updated**: Refactoring Complete
**Version**: 1.0
**Status**: ✅ Production Ready
