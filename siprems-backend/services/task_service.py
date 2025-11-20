from celery_app import celery_app
from celery.result import AsyncResult
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class TaskService:
    """Service for managing async task status and results"""
    
    @staticmethod
    def get_task_status(task_id):
        """
        Get the status of a Celery task.
        
        Args:
            task_id: The Celery task ID
            
        Returns:
            dict with task status and results
        """
        try:
            task_result = AsyncResult(task_id, app=celery_app)
            
            response = {
                "task_id": task_id,
                "status": task_result.status,
                "created_at": datetime.utcnow().isoformat()
            }
            
            if task_result.status == 'PENDING':
                response["message"] = "Task is waiting to be executed"
            
            elif task_result.status == 'STARTED':
                response["message"] = "Task has started execution"
                if task_result.info:
                    response["progress"] = task_result.info.get('progress', {})
            
            elif task_result.status == 'SUCCESS':
                response["message"] = "Task completed successfully"
                response["result"] = task_result.result
            
            elif task_result.status == 'FAILURE':
                response["message"] = "Task failed"
                response["error"] = str(task_result.info)
                response["traceback"] = task_result.traceback
            
            elif task_result.status == 'RETRY':
                response["message"] = "Task is being retried"
                response["error"] = str(task_result.info)
            
            elif task_result.status == 'REVOKED':
                response["message"] = "Task was revoked"
            
            return response
        
        except Exception as e:
            logger.error(f"Error getting task status for {task_id}: {e}")
            return {
                "task_id": task_id,
                "status": "error",
                "message": "Failed to retrieve task status",
                "error": str(e)
            }
    
    @staticmethod
    def wait_for_task(task_id, timeout=300):
        """
        Wait for a task to complete.
        
        Args:
            task_id: The Celery task ID
            timeout: Maximum time to wait in seconds
            
        Returns:
            dict with task result
        """
        try:
            task_result = AsyncResult(task_id, app=celery_app)
            result = task_result.get(timeout=timeout)
            return {
                "task_id": task_id,
                "status": "success",
                "result": result
            }
        except Exception as e:
            logger.error(f"Error waiting for task {task_id}: {e}")
            return {
                "task_id": task_id,
                "status": "error",
                "message": str(e)
            }
    
    @staticmethod
    def cancel_task(task_id):
        """
        Cancel a running task.
        
        Args:
            task_id: The Celery task ID
            
        Returns:
            dict with cancellation result
        """
        try:
            celery_app.control.revoke(task_id, terminate=True)
            return {
                "task_id": task_id,
                "status": "cancelled",
                "message": "Task has been cancelled"
            }
        except Exception as e:
            logger.error(f"Error cancelling task {task_id}: {e}")
            return {
                "task_id": task_id,
                "status": "error",
                "message": str(e)
            }
    
    @staticmethod
    def get_active_tasks():
        """Get list of active tasks"""
        try:
            inspect = celery_app.control.inspect()
            active = inspect.active()
            
            if not active:
                return {"active_tasks": []}
            
            tasks = []
            for worker_name, task_list in active.items():
                for task in task_list:
                    tasks.append({
                        "task_id": task['id'],
                        "task_name": task['name'],
                        "worker": worker_name,
                        "args": task.get('args', []),
                        "kwargs": task.get('kwargs', {})
                    })
            
            return {"active_tasks": tasks}
        
        except Exception as e:
            logger.error(f"Error getting active tasks: {e}")
            return {
                "status": "error",
                "message": str(e)
            }
    
    @staticmethod
    def get_scheduled_tasks():
        """Get list of scheduled tasks"""
        try:
            inspect = celery_app.control.inspect()
            scheduled = inspect.scheduled()
            
            if not scheduled:
                return {"scheduled_tasks": []}
            
            tasks = []
            for worker_name, task_list in scheduled.items():
                for task in task_list:
                    tasks.append({
                        "task_id": task['request']['id'],
                        "task_name": task['request']['name'],
                        "worker": worker_name,
                        "eta": task.get('eta')
                    })
            
            return {"scheduled_tasks": tasks}
        
        except Exception as e:
            logger.error(f"Error getting scheduled tasks: {e}")
            return {
                "status": "error",
                "message": str(e)
            }
