# Celery ML Pipeline - Code Patches & Implementation Reference

This document provides code snippets and patches for implementing async tasks in your application.

## Patch 1: Adding New Async Task

### Template

```python
# In tasks/ml_tasks.py

@celery_app.task(bind=True, max_retries=3)
def my_custom_task(self, param1, param2):
    """
    Description of what this task does.
    
    Args:
        param1: First parameter
        param2: Second parameter
        
    Returns:
        dict with task results
    """
    try:
        logger.info(f"Starting task with params: {param1}, {param2}")
        
        # Do work here
        result = do_something(param1, param2)
        
        logger.info(f"Task completed successfully")
        
        return {
            "status": "success",
            "result": result,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except Exception as exc:
        logger.error(f"Task failed: {exc}", exc_info=True)
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=min(2 ** self.request.retries, 600))
```

### Usage

```python
# In your route handler
from tasks.ml_tasks import my_custom_task

task = my_custom_task.delay(param1_value, param2_value)
return jsonify({'task_id': task.id}), 202
```

## Patch 2: Adding New Async Route

### Template

```python
# In routes/your_routes.py

from flask import Blueprint, request, jsonify
from utils.jwt_handler import require_auth
from tasks.ml_tasks import your_task
from services.task_service import TaskService

your_bp = Blueprint('your_feature', __name__, url_prefix='/your-feature')


@your_bp.route('/async', methods=['POST'])
@require_auth
def your_async_operation():
    """Async version of operation"""
    try:
        data = request.get_json() or {}
        
        # Validate input
        if 'required_param' not in data:
            return jsonify({'error': 'required_param is required'}), 400
        
        # Submit async task
        task = your_task.delay(
            data['required_param'],
            data.get('optional_param', 'default')
        )
        
        return jsonify({
            'task_id': task.id,
            'status': 'submitted',
            'message': 'Operation submitted successfully'
        }), 202
    
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@your_bp.route('/task/<task_id>', methods=['GET'])
@require_auth
def get_your_task_status(task_id):
    """Check status of async operation"""
    try:
        status = TaskService.get_task_status(task_id)
        
        # Return appropriate HTTP status
        if status['status'] == 'PENDING':
            http_status = 202
        elif status['status'] == 'FAILURE':
            http_status = 400
        else:
            http_status = 200
        
        return jsonify(status), http_status
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

### Registration

```python
# In routes/__init__.py
from routes.your_routes import your_bp

__all__ = [..., 'your_bp']

# In app.py
from routes import your_bp

# Register
app.register_blueprint(your_bp)
```

## Patch 3: Frontend Implementation (Polling)

### Simple Polling

```typescript
async function submitAsyncTask(
  endpoint: string,
  payload: any,
  accessToken: string
): Promise<any> {
  // Submit task
  const submitResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  if (!submitResponse.ok) {
    throw new Error(`Failed to submit task: ${submitResponse.statusText}`);
  }

  const { task_id } = await submitResponse.json();

  // Poll for completion
  return pollTaskStatus(task_id, accessToken);
}

async function pollTaskStatus(
  taskId: string,
  accessToken: string,
  maxAttempts: number = 60,
  pollIntervalMs: number = 2000
): Promise<any> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    const statusResponse = await fetch(
      `http://localhost:5000/predict/task/${taskId}`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    if (!statusResponse.ok) {
      throw new Error(`Failed to get task status: ${statusResponse.statusText}`);
    }

    const status = await statusResponse.json();

    if (status.status === 'SUCCESS') {
      return status.result;
    } else if (status.status === 'FAILURE') {
      throw new Error(`Task failed: ${status.error}`);
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    attempts++;
  }

  throw new Error('Task polling timeout');
}

// Usage
try {
  const result = await submitAsyncTask(
    'http://localhost:5000/predict/async',
    { product_sku: 'BRD-001', days: 7 },
    accessToken
  );
  console.log('Prediction result:', result);
} catch (error) {
  console.error('Prediction failed:', error);
}
```

### Advanced Polling with Progress

```typescript
interface TaskProgress {
  taskId: string;
  status: 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE';
  progress?: number;
  message?: string;
  result?: any;
  error?: string;
}

async function pollWithProgress(
  taskId: string,
  accessToken: string,
  onProgress?: (progress: TaskProgress) => void
): Promise<any> {
  let lastStatus = '';

  while (true) {
    const response = await fetch(`http://localhost:5000/predict/task/${taskId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    const data = await response.json();

    // Call progress callback if provided
    if (onProgress && data.status !== lastStatus) {
      onProgress({
        taskId,
        status: data.status,
        message: data.message,
        progress: data.progress
      });
      lastStatus = data.status;
    }

    if (data.status === 'SUCCESS') {
      return data.result;
    } else if (data.status === 'FAILURE') {
      throw new Error(data.error || 'Task failed');
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Usage with progress
const result = await pollWithProgress(taskId, accessToken, (progress) => {
  console.log(`Status: ${progress.status} - ${progress.message}`);
  updateProgressBar(progress.progress);
});
```

## Patch 4: Custom Scheduled Task

### Create New Scheduled Task

```python
# In utils/config.py

from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    # Existing task
    'train-all-models-nightly': {
        'task': 'tasks.ml_tasks.train_all_models',
        'schedule': crontab(hour=2, minute=0),  # 2 AM UTC
    },
    
    # New task: Clean up old predictions every day at 3 AM
    'cleanup-old-predictions': {
        'task': 'tasks.ml_tasks.cleanup_old_predictions',
        'schedule': crontab(hour=3, minute=0),  # 3 AM UTC
    },
    
    # New task: Validation check every 6 hours
    'validate-models': {
        'task': 'tasks.ml_tasks.validate_all_models',
        'schedule': 21600.0,  # Every 6 hours (seconds)
    },
}
```

### Implement the Task

```python
# In tasks/ml_tasks.py

@celery_app.task
def cleanup_old_predictions():
    """Remove predictions older than 30 days"""
    try:
        logger.info("Starting cleanup of old predictions")
        
        cutoff_date = datetime.utcnow() - timedelta(days=30)
        # Your cleanup logic here
        
        logger.info("Cleanup completed")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Cleanup failed: {e}")
        return {"status": "error", "reason": str(e)}
```

## Patch 5: Error Handling in Tasks

### Retry with Custom Logic

```python
@celery_app.task(bind=True, autoretry_for=(Exception,), 
                 retry_kwargs={'max_retries': 5})
def resilient_task(self, param):
    """Task with advanced error handling"""
    try:
        logger.info(f"Attempt {self.request.retries + 1}")
        
        # Try to do something
        result = risky_operation(param)
        
        return {"status": "success", "result": result}
    
    except SpecificError as e:
        logger.warning(f"Specific error, retrying: {e}")
        # Retry with backoff
        raise self.retry(exc=e, countdown=2 ** self.request.retries)
    
    except FatalError as e:
        logger.error(f"Fatal error, not retrying: {e}")
        # Don't retry for fatal errors
        return {"status": "failed", "error": str(e)}
    
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        # Retry on unexpected errors
        if self.request.retries < 3:
            raise self.retry(exc=e, countdown=60)
        else:
            return {"status": "failed", "error": str(e)}
```

## Patch 6: Task Validation

### Input Validation

```python
from marshmallow import ValidationError
from utils.validators import ProductSchema

@celery_app.task(bind=True)
def validate_and_predict_task(self, product_data):
    """Task with input validation"""
    try:
        # Validate input
        schema = ProductSchema()
        validated = schema.load(product_data)
        
        # Use validated data
        logger.info(f"Predicting for {validated['sku']}")
        
        result = predict_stock_task(validated['sku'], validated.get('days', 7))
        return result
    
    except ValidationError as e:
        logger.error(f"Validation failed: {e.messages}")
        return {
            "status": "validation_failed",
            "errors": e.messages
        }
    
    except Exception as e:
        logger.error(f"Task failed: {e}")
        raise self.retry(exc=e, countdown=60)
```

## Patch 7: Monitor Task Metrics

### Add Task Metrics

```python
import time
from datetime import datetime

@celery_app.task(bind=True)
def timed_task(self, param):
    """Task that tracks execution time"""
    start_time = time.time()
    
    try:
        logger.info(f"Task started at {datetime.utcnow().isoformat()}")
        
        # Do work
        result = expensive_operation(param)
        
        elapsed = time.time() - start_time
        logger.info(f"Task completed in {elapsed:.2f} seconds")
        
        return {
            "status": "success",
            "result": result,
            "execution_time_seconds": elapsed,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"Task failed after {elapsed:.2f}s: {e}")
        raise self.retry(exc=e, countdown=60)
```

## Patch 8: Task Chaining

### Sequential Tasks

```python
from celery import chain, group, chord

# Chain: Task B runs after Task A
workflow = chain(
    train_product_model_task.s('BRD-001'),
    predict_stock_task.s(7)
)

# Execute
result = workflow.apply_async()
task_id = result.id
```

### Parallel Tasks

```python
# Group: Run multiple tasks in parallel
parallel_tasks = group(
    train_product_model_task.s('BRD-001'),
    train_product_model_task.s('CKE-001'),
    train_product_model_task.s('CNF-001'),
)

# Execute all at once
result = parallel_tasks.apply_async()
```

### Chord (Map-Reduce Pattern)

```python
# Chord: Run tasks in parallel, then aggregate
workflow = chord(
    [train_product_model_task.s(sku) for sku in skus]
)(aggregate_results.s())

result = workflow.apply_async()
```

## Quick Reference: Task Decorators

```python
# Basic task
@celery_app.task
def simple_task():
    pass

# Task with retry
@celery_app.task(bind=True, max_retries=3)
def task_with_retry(self, param):
    try:
        # work
    except Exception as exc:
        raise self.retry(exc=exc)

# Task with timeout
@celery_app.task(time_limit=600)  # 10 minutes
def task_with_timeout():
    pass

# Task with custom queue
@celery_app.task(queue='high_priority')
def priority_task():
    pass

# Task with binding (access self)
@celery_app.task(bind=True)
def bound_task(self):
    logger.info(f"Task ID: {self.request.id}")
```

## Common Patterns

### Pattern 1: Async with Notification

```python
@celery_app.task
def predict_and_notify(product_sku):
    """Predict and send notification"""
    result = predict_stock_task(product_sku)
    
    if result['status'] == 'success':
        send_notification(product_sku, result)
    
    return result
```

### Pattern 2: Conditional Task

```python
@celery_app.task
def conditional_training(product_sku, force=False):
    """Train only if needed"""
    if force or needs_training(product_sku):
        return train_product_model_task(product_sku)
    else:
        return {"status": "skipped", "reason": "Already trained"}
```

### Pattern 3: Batch Processing

```python
@celery_app.task
def batch_process():
    """Process items in batches"""
    items = get_items_to_process()
    results = {}
    
    for item_batch in chunks(items, 10):
        for item in item_batch:
            result = process_item.delay(item)
            results[item] = result.id
    
    return results
```

---

**Reference Version:** 1.0
**Status:** Ready for Implementation
