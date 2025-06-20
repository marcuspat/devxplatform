#!/bin/bash
set -e

# Start Celery Worker Script
# Usage: ./scripts/start_worker.sh [options]

# Default values
CONCURRENCY=4
LOGLEVEL=info
QUEUES="default,email,processing,maintenance,monitoring,priority"
MAX_TASKS_PER_CHILD=1000
TIME_LIMIT=3600
SOFT_TIME_LIMIT=3300

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -c|--concurrency)
            CONCURRENCY="$2"
            shift 2
            ;;
        -l|--loglevel)
            LOGLEVEL="$2"
            shift 2
            ;;
        -Q|--queues)
            QUEUES="$2"
            shift 2
            ;;
        --max-tasks-per-child)
            MAX_TASKS_PER_CHILD="$2"
            shift 2
            ;;
        --time-limit)
            TIME_LIMIT="$2"
            shift 2
            ;;
        --soft-time-limit)
            SOFT_TIME_LIMIT="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  -c, --concurrency          Number of worker processes (default: 4)"
            echo "  -l, --loglevel             Log level (default: info)"
            echo "  -Q, --queues               Comma-separated list of queues (default: default,email,processing,maintenance,monitoring,priority)"
            echo "  --max-tasks-per-child      Max tasks per worker process (default: 1000)"
            echo "  --time-limit               Hard time limit for tasks (default: 3600)"
            echo "  --soft-time-limit          Soft time limit for tasks (default: 3300)"
            echo "  -h, --help                 Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "Starting Celery worker with the following configuration:"
echo "  Concurrency: $CONCURRENCY"
echo "  Log Level: $LOGLEVEL"
echo "  Queues: $QUEUES"
echo "  Max Tasks Per Child: $MAX_TASKS_PER_CHILD"
echo "  Time Limit: $TIME_LIMIT seconds"
echo "  Soft Time Limit: $SOFT_TIME_LIMIT seconds"
echo ""

# Load environment variables if .env file exists
if [ -f .env ]; then
    echo "Loading environment variables from .env file..."
    export $(cat .env | grep -v '#' | xargs)
fi

# Start the worker
exec celery -A app.celery_app worker \
    --loglevel="$LOGLEVEL" \
    --concurrency="$CONCURRENCY" \
    --queues="$QUEUES" \
    --max-tasks-per-child="$MAX_TASKS_PER_CHILD" \
    --time-limit="$TIME_LIMIT" \
    --soft-time-limit="$SOFT_TIME_LIMIT" \
    --without-gossip \
    --without-mingle \
    --without-heartbeat