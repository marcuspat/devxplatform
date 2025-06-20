# Celery Worker Template

A production-ready Celery worker template for asynchronous task processing with comprehensive monitoring, error handling, and scalability features.

## Features

- **Multiple Task Types**: Email, data processing, maintenance, and monitoring tasks
- **Robust Error Handling**: Exponential backoff, retry strategies, and dead letter queues
- **Monitoring & Metrics**: Prometheus metrics, health checks, and Flower integration
- **Queue Management**: Multiple queues with different priorities and configurations
- **Structured Logging**: JSON-formatted logs with correlation IDs
- **Auto-scaling**: Support for horizontal and vertical scaling
- **Production Ready**: Docker support, health checks, and graceful shutdown
- **Testing**: Comprehensive test suite with mocked dependencies

## Project Structure

```
.
├── app/
│   ├── tasks/           # Task definitions
│   │   ├── email.py     # Email sending tasks
│   │   ├── processing.py # Data processing tasks
│   │   ├── maintenance.py # System maintenance tasks
│   │   └── monitoring.py # Monitoring and health tasks
│   ├── utils/           # Utility functions
│   │   ├── retry.py     # Retry logic and backoff strategies
│   │   └── monitoring.py # Prometheus metrics and health checks
│   ├── celery_app.py    # Celery application configuration
│   └── config.py        # Application configuration
├── scripts/             # Management scripts
│   ├── start_worker.sh  # Worker startup script
│   ├── start_beat.sh    # Beat scheduler script
│   └── monitor.sh       # Monitoring and management script
├── tests/               # Test suite
├── worker.py           # Main worker entry point
├── Dockerfile          # Docker configuration
├── docker-compose.yml  # Docker Compose setup
└── requirements.txt    # Python dependencies
```

## Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit configuration
vim .env
```

### 2. Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Start Redis (required)
redis-server

# Start worker
./scripts/start_worker.sh

# Start beat scheduler (in another terminal)
./scripts/start_beat.sh

# Monitor worker (in another terminal)
./scripts/monitor.sh workers
```

### 3. Docker Development

```bash
# Start all services
docker-compose up

# View logs
docker-compose logs -f worker

# Scale workers
docker-compose up --scale worker=3
```

## Task Types

### Email Tasks

```python
from app.tasks.email import send_email, send_bulk_email

# Send single email
result = send_email.delay(
    to_email='user@example.com',
    subject='Welcome!',
    body='Welcome to our service!'
)

# Send bulk emails
result = send_bulk_email.delay(
    recipients=['user1@example.com', 'user2@example.com'],
    subject='Newsletter',
    body='Monthly newsletter content'
)
```

### Data Processing Tasks

```python
from app.tasks.processing import process_data, batch_process_data

# Process single data item
result = process_data.delay(
    data={'user_id': 123, 'action': 'signup'},
    processing_type='transform'
)

# Batch processing
result = batch_process_data.delay(
    data_batch=[{'id': 1}, {'id': 2}, {'id': 3}],
    processing_type='validate',
    parallel=True
)
```

### Monitoring Tasks

```python
from app.tasks.monitoring import health_check, generate_report

# Health check
result = health_check.delay()

# Generate monitoring report
result = generate_report.delay(
    report_type='daily',
    include_metrics=True
)
```

## Configuration

### Environment Variables

Key configuration options in `.env`:

```bash
# Celery Configuration
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1
CELERY_TASK_TIME_LIMIT=3600
CELERY_WORKER_PREFETCH_MULTIPLIER=4

# Monitoring
PROMETHEUS_PORT=9090
SENTRY_DSN=https://your-sentry-dsn

# Email Settings
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# Task Behavior
TASK_MAX_RETRIES=3
TASK_RETRY_DELAY=60
TASK_RATE_LIMIT=100/m
```

### Queue Configuration

The worker supports multiple queues with different priorities:

- `priority`: High priority tasks (immediate processing)
- `default`: Standard tasks
- `email`: Email sending tasks
- `processing`: Data processing tasks
- `maintenance`: System maintenance tasks
- `monitoring`: Health checks and metrics

## Monitoring

### Prometheus Metrics

The worker exposes metrics on `/metrics` endpoint:

- `celery_task_total`: Total tasks processed
- `celery_task_duration_seconds`: Task execution time
- `celery_active_tasks`: Currently active tasks
- `celery_queue_length`: Queue lengths
- `celery_worker_memory_usage_bytes`: Worker memory usage
- `celery_worker_cpu_usage_percent`: Worker CPU usage

### Health Checks

Built-in health checks monitor:

- Redis broker connectivity
- Result backend status
- Disk space availability
- Memory usage
- Task queue health

### Flower Dashboard

Access the Flower web interface:

```bash
# Start Flower
./scripts/monitor.sh flower

# Access at http://localhost:5555
```

## Management Scripts

### Worker Management

```bash
# Start worker with custom settings
./scripts/start_worker.sh --concurrency 8 --queues priority,default

# Monitor worker status
./scripts/monitor.sh workers

# Real-time monitoring
./scripts/monitor.sh top

# Test task execution
./scripts/monitor.sh test
```

### Beat Scheduler

```bash
# Start beat scheduler
./scripts/start_beat.sh

# Custom schedule file
./scripts/start_beat.sh --schedule /custom/path/schedule
```

### Monitoring Commands

```bash
# Show active workers
./scripts/monitor.sh workers

# Show queue statistics
./scripts/monitor.sh queues

# Show worker statistics
./scripts/monitor.sh stats

# Ping all workers
./scripts/monitor.sh ping

# Purge all queues (dangerous!)
./scripts/monitor.sh purge
```

## Production Deployment

### Docker Deployment

```bash
# Build production image
docker build -t celery-worker:latest .

# Run with custom configuration
docker run -d \
  --name celery-worker \
  -e CELERY_BROKER_URL=redis://redis:6379/0 \
  -e CELERY_RESULT_BACKEND=redis://redis:6379/1 \
  -e ENVIRONMENT=production \
  celery-worker:latest
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: celery-worker
spec:
  replicas: 3
  selector:
    matchLabels:
      app: celery-worker
  template:
    metadata:
      labels:
        app: celery-worker
    spec:
      containers:
      - name: worker
        image: celery-worker:latest
        env:
        - name: CELERY_BROKER_URL
          value: "redis://redis:6379/0"
        - name: ENVIRONMENT
          value: "production"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### Auto-scaling Configuration

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: celery-worker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: celery-worker
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Pods
    pods:
      metric:
        name: celery_queue_length
      target:
        type: AverageValue
        averageValue: "10"
```

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test category
pytest tests/test_tasks.py -v

# Run performance tests
pytest tests/test_performance.py --benchmark-only
```

## Best Practices

### Task Design

1. **Idempotent Tasks**: Ensure tasks can be safely retried
2. **Small Payloads**: Keep task arguments minimal
3. **Timeout Handling**: Set appropriate time limits
4. **Error Handling**: Use structured exception handling

### Performance Optimization

1. **Queue Routing**: Route tasks to appropriate queues
2. **Batch Processing**: Group related operations
3. **Connection Pooling**: Reuse database connections
4. **Memory Management**: Monitor worker memory usage

### Monitoring & Alerting

1. **Health Checks**: Implement comprehensive health monitoring
2. **Metrics Collection**: Track key performance indicators
3. **Alert Thresholds**: Set up meaningful alerts
4. **Log Aggregation**: Centralize log collection

## Troubleshooting

### Common Issues

1. **High Memory Usage**: Adjust `max-tasks-per-child`
2. **Task Timeouts**: Increase time limits or optimize tasks
3. **Queue Backlog**: Scale workers or optimize task processing
4. **Connection Errors**: Check Redis/broker connectivity

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=DEBUG

# Run worker in foreground
celery -A app.celery_app worker --loglevel=debug
```

## License

MIT