#!/bin/bash
set -e

# Start Celery Beat Script
# Usage: ./scripts/start_beat.sh [options]

# Default values
LOGLEVEL=info
SCHEDULE_FILE="celerybeat-schedule"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -l|--loglevel)
            LOGLEVEL="$2"
            shift 2
            ;;
        -s|--schedule)
            SCHEDULE_FILE="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  -l, --loglevel    Log level (default: info)"
            echo "  -s, --schedule    Schedule file path (default: celerybeat-schedule)"
            echo "  -h, --help        Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "Starting Celery Beat with the following configuration:"
echo "  Log Level: $LOGLEVEL"
echo "  Schedule File: $SCHEDULE_FILE"
echo ""

# Load environment variables if .env file exists
if [ -f .env ]; then
    echo "Loading environment variables from .env file..."
    export $(cat .env | grep -v '#' | xargs)
fi

# Remove existing schedule file to avoid conflicts
if [ -f "$SCHEDULE_FILE" ]; then
    echo "Removing existing schedule file: $SCHEDULE_FILE"
    rm "$SCHEDULE_FILE"
fi

# Start beat
exec celery -A app.celery_app beat \
    --loglevel="$LOGLEVEL" \
    --schedule="$SCHEDULE_FILE"