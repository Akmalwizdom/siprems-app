#!/bin/bash

# Celery Worker Startup Script
# Usage: ./start_worker.sh [worker|beat|both]

COMMAND=${1:-both}

echo "Starting SIPREMS Celery Services..."

case $COMMAND in
  worker)
    echo "Starting Celery Worker..."
    celery -A celery_app worker --loglevel=info --concurrency=4
    ;;
  beat)
    echo "Starting Celery Beat Scheduler..."
    celery -A celery_app beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
    ;;
  both)
    echo "Starting both Celery Worker and Beat (development mode)..."
    # For development, run both in the same process
    celery -A celery_app worker --loglevel=info --beat --scheduler django_celery_beat.schedulers:DatabaseScheduler
    ;;
  *)
    echo "Usage: ./start_worker.sh [worker|beat|both]"
    echo "  worker - Start only Celery worker"
    echo "  beat   - Start only Celery Beat scheduler"
    echo "  both   - Start both (default, development mode)"
    exit 1
    ;;
esac
