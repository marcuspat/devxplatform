#!/bin/bash
set -e

# Celery Monitoring Script
# Usage: ./scripts/monitor.sh [command] [options]

# Load environment variables if .env file exists
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | xargs)
fi

COMMAND=${1:-"help"}

case $COMMAND in
    "workers"|"w")
        echo "Active Workers:"
        celery -A app.celery_app inspect active
        ;;
    
    "queues"|"q")
        echo "Queue Lengths:"
        celery -A app.celery_app inspect active_queues
        ;;
    
    "stats"|"s")
        echo "Worker Statistics:"
        celery -A app.celery_app inspect stats
        ;;
    
    "registered"|"r")
        echo "Registered Tasks:"
        celery -A app.celery_app inspect registered
        ;;
    
    "scheduled"|"sc")
        echo "Scheduled Tasks:"
        celery -A app.celery_app inspect scheduled
        ;;
    
    "reserved"|"re")
        echo "Reserved Tasks:"
        celery -A app.celery_app inspect reserved
        ;;
    
    "ping"|"p")
        echo "Pinging Workers:"
        celery -A app.celery_app inspect ping
        ;;
    
    "flower"|"f")
        PORT=${2:-5555}
        echo "Starting Flower monitoring on port $PORT..."
        celery -A app.celery_app flower --port=$PORT
        ;;
    
    "events"|"e")
        echo "Starting Celery Events Monitor..."
        celery -A app.celery_app events
        ;;
    
    "top"|"t")
        echo "Real-time Task Monitor (press Ctrl+C to exit):"
        while true; do
            clear
            echo "=== Celery Monitor - $(date) ==="
            echo ""
            echo "Active Tasks:"
            celery -A app.celery_app inspect active 2>/dev/null | head -20
            echo ""
            echo "Worker Stats:"
            celery -A app.celery_app inspect stats 2>/dev/null | grep -E "(pool|rusage)" | head -10
            sleep 5
        done
        ;;
    
    "purge")
        echo "WARNING: This will purge all tasks from queues!"
        read -p "Are you sure? (y/N): " confirm
        if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
            celery -A app.celery_app purge
        else
            echo "Purge cancelled."
        fi
        ;;
    
    "shutdown")
        echo "Shutting down all workers..."
        celery -A app.celery_app control shutdown
        ;;
    
    "test")
        echo "Running test tasks..."
        python -c "
from app.tasks.monitoring import health_check
from app.tasks.email import send_email
from app.tasks.processing import process_data

print('Queuing health check task...')
result1 = health_check.delay()
print(f'Health check task ID: {result1.id}')

print('Queuing test email task...')
result2 = send_email.delay(
    to_email='test@example.com',
    subject='Test Email',
    body='This is a test email from Celery worker.'
)
print(f'Email task ID: {result2.id}')

print('Queuing data processing task...')
result3 = process_data.delay(
    data={'test': 'data', 'number': 42},
    processing_type='default'
)
print(f'Processing task ID: {result3.id}')

print('')
print('Tasks queued successfully. Use ./scripts/monitor.sh workers to see active tasks.')
"
        ;;
    
    "logs")
        LINES=${2:-50}
        echo "Showing last $LINES lines of worker logs..."
        # This would show logs from your logging system
        # For now, just show a message
        echo "Logs would be displayed here. Configure your logging system accordingly."
        ;;
    
    "help"|"h"|*)
        echo "Celery Monitoring Script"
        echo ""
        echo "Usage: $0 [command] [options]"
        echo ""
        echo "Commands:"
        echo "  workers, w          Show active workers"
        echo "  queues, q           Show queue information"
        echo "  stats, s            Show worker statistics"
        echo "  registered, r       Show registered tasks"
        echo "  scheduled, sc       Show scheduled tasks"
        echo "  reserved, re        Show reserved tasks"
        echo "  ping, p             Ping all workers"
        echo "  flower, f [port]    Start Flower web interface (default port: 5555)"
        echo "  events, e           Start events monitor"
        echo "  top, t              Real-time monitor (like htop)"
        echo "  purge               Purge all tasks from queues (DANGEROUS)"
        echo "  shutdown            Shutdown all workers"
        echo "  test                Queue test tasks"
        echo "  logs [lines]        Show worker logs (default: 50 lines)"
        echo "  help, h             Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 workers          # Show active workers"
        echo "  $0 flower 8080      # Start Flower on port 8080"
        echo "  $0 top              # Real-time monitoring"
        ;;
esac