# Celery ML Pipeline - Quick Start Guide

## 30-Second Setup

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Start Redis (Docker)
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

### 3. Start Celery Worker (Terminal 1)
```bash
celery -A celery_app worker --loglevel=info
```

### 4. Start Celery Beat (Terminal 2, optional)
```bash
celery -A celery_app beat --loglevel=info
```

### 5. Start Flask App (Terminal 3)
```bash
python app.py
```

## Docker Compose (Recommended)

```bash
# Start all services at once
docker-compose up -d

# View logs
docker-compose logs -f celery_worker
docker-compose logs -f celery_beat

# Stop all services
docker-compose down
```

## Testing the ML Pipeline

### Test 1: Async Prediction

```bash
# Submit a prediction task
curl -X POST http://localhost:5000/predict/async \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_token>" \
  -d '{
    "product_sku": "BRD-001",
    "days": 7
  }'

# Response: {"task_id": "abc123..."}

# Check status (poll multiple times)
curl http://localhost:5000/predict/task/abc123 \
  -H "Authorization: Bearer <your_token>"
```

### Test 2: Train Product Model

```bash
# Submit training task
curl -X POST http://localhost:5000/tasks/training/product/BRD-001 \
  -H "Authorization: Bearer <your_token>"

# Response: {"task_id": "xyz789..."}

# Check status
curl http://localhost:5000/tasks/xyz789 \
  -H "Authorization: Bearer <your_token>"
```

### Test 3: Train All Models

```bash
# Submit training for all products
curl -X POST http://localhost:5000/tasks/training/all \
  -H "Authorization: Bearer <your_token>"

# Response: {"task_id": "all123..."}

# Check progress
curl http://localhost:5000/tasks/all123 \
  -H "Authorization: Bearer <your_token>"
```

### Test 4: Monitor Active Tasks

```bash
# List all running tasks
curl http://localhost:5000/tasks/active \
  -H "Authorization: Bearer <your_token>"

# List scheduled tasks
curl http://localhost:5000/tasks/scheduled \
  -H "Authorization: Bearer <your_token>"
```

## Task Status Codes

| Status | HTTP | Meaning |
|--------|------|---------|
| PENDING | 202 | Task waiting to start |
| STARTED | 200 | Task currently running |
| SUCCESS | 200 | Task completed successfully |
| FAILURE | 400 | Task failed (check error) |
| RETRY | 200 | Task retrying after error |
| REVOKED | 200 | Task was cancelled |

## Common Issues & Solutions

### Redis Connection Error
```
Error: ConnectionError: Error -2 connecting to localhost:6379

Solution:
# Start Redis first
docker run -d -p 6379:6379 redis:7-alpine

# Or in docker-compose
docker-compose up -d redis
```

### Worker Not Processing Tasks
```
Solution:
# Check worker is running
ps aux | grep celery

# Check Redis connectivity
redis-cli ping  # should return PONG

# Restart worker
pkill -f "celery.*worker"
celery -A celery_app worker --loglevel=info
```

### Models Directory Missing
```
Error: FileNotFoundError: No such file or directory: '/app/models'

Solution:
# Create models directory
mkdir -p /app/models/meta

# In Docker, volume should be mounted automatically
docker-compose up -d
```

### Task Stuck in PENDING
```
Solution:
# Check worker logs
celery -A celery_app worker --loglevel=debug

# Ensure Redis is accessible
redis-cli -h localhost ping

# Restart both Redis and worker
docker-compose restart redis celery_worker
```

## File Locations

```
├── celery_app.py                 # Celery initialization
├── tasks/
│   ├── __init__.py              # Tasks package
│   └── ml_tasks.py              # ML training/prediction tasks
├── routes/
│   ├── prediction_routes.py      # /predict endpoints
│   └── task_routes.py           # /tasks endpoints
├── services/
│   └── task_service.py          # Task management service
├── models/                       # Trained models (volume)
│   ├── model_SKU.json
│   └── meta/
│       └── meta_SKU.json
└── docker-compose.yml            # Service definitions
```

## Configuration Files

### `.env.example`
```
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1
MODELS_DIR=/app/models
```

### `utils/config.py`
```python
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', ...)
CELERY_BEAT_SCHEDULE = {
    'train-all-models-nightly': {
        'task': 'tasks.ml_tasks.train_all_models',
        'schedule': crontab(hour=2, minute=0),  # 2 AM UTC
    }
}
```

## Next Steps

1. **Read Full Documentation:** See `ML_PIPELINE_REFACTORING.md`
2. **Monitor Tasks:** Use Flower for UI monitoring
3. **Optimize:** Adjust worker concurrency for your hardware
4. **Scale:** Add more workers for higher throughput
5. **Deploy:** Update Kubernetes/production deployment

## Support

For detailed information about:
- **Architecture**: See ML_PIPELINE_REFACTORING.md
- **API Reference**: See routes/prediction_routes.py and routes/task_routes.py
- **Task Details**: See tasks/ml_tasks.py
- **Task Management**: See services/task_service.py

---

**Status:** ✅ Ready for Development & Production
