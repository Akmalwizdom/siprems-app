from celery import Celery
from celery.signals import task_prerun, task_postrun, task_failure
from utils.config import get_config
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Celery
celery_app = Celery(__name__)

# Load configuration
config = get_config()
celery_app.config_from_object(config)

# Auto-discover tasks
celery_app.autodiscover_tasks(['tasks'])


# Signal handlers for task lifecycle events
@task_prerun.connect
def task_prerun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, **kw):
    """Handle pre-run task events"""
    logger.info(f"Task {task.name} [{task_id}] starting")


@task_postrun.connect
def task_postrun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, retval=None, state=None, **kw):
    """Handle post-run task events"""
    logger.info(f"Task {task.name} [{task_id}] completed with result: {retval}")


@task_failure.connect
def task_failure_handler(sender=None, task_id=None, exception=None, args=None, kwargs=None, traceback=None, einfo=None, **kw):
    """Handle task failure events"""
    logger.error(f"Task {sender.name} [{task_id}] failed with exception: {exception}")
    if einfo:
        logger.error(f"Traceback: {einfo}")


if __name__ == '__main__':
    celery_app.start()
