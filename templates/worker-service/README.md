# Worker Service Template

Production-ready worker service template with BullMQ job processing, comprehensive monitoring, and scalable architecture.

## Features

- ✅ **12-Factor App Principles**: Environment-based configuration, stateless design
- ✅ **BullMQ Job Processing**: Redis-backed job queues with retry logic and monitoring
- ✅ **Multiple Worker Types**: Email, file processing, reports, cleanup, webhooks
- ✅ **Structured Logging**: Winston with JSON formatting and job correlation
- ✅ **Health Checks**: Liveness and readiness probes for containers
- ✅ **Error Handling**: Comprehensive error handling with retry strategies
- ✅ **File Processing**: Image processing with Sharp, document handling
- ✅ **Email Service**: Template-based email sending with attachments
- ✅ **Webhook Processing**: HTTP webhook delivery with retry and backoff
- ✅ **Report Generation**: Scheduled report generation with multiple formats
- ✅ **Cleanup Jobs**: Automated cleanup of files, logs, and database records
- ✅ **Metrics & Monitoring**: Prometheus metrics with Grafana dashboards
- ✅ **Bull Board UI**: Web-based queue monitoring dashboard
- ✅ **Docker Support**: Multi-container setup with Redis and monitoring
- ✅ **Graceful Shutdown**: Proper job completion and resource cleanup
- ✅ **Scalable**: Horizontal scaling with multiple worker instances

## Project Structure

```
├── src/
│   ├── api/              # REST API for job management
│   │   ├── routes/       # API routes
│   │   └── server.ts     # Express server setup
│   ├── processors/       # Job processors
│   │   ├── email.processor.ts
│   │   ├── file.processor.ts
│   │   ├── report.processor.ts
│   │   ├── cleanup.processor.ts
│   │   └── webhook.processor.ts
│   ├── queues/           # Queue definitions and job types
│   ├── config/           # Configuration management
│   ├── middleware/       # Express middleware
│   ├── utils/            # Utility functions
│   ├── index.ts          # Main entry point
│   ├── worker.ts         # Worker entry point
│   └── metrics.ts        # Prometheus metrics
├── uploads/              # File storage directory
├── Dockerfile            # Docker configuration
├── docker-compose.yml    # Multi-service setup
├── prometheus.yml        # Prometheus configuration
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── jest.config.js        # Jest configuration
```

## Getting Started

### Prerequisites

- Node.js 18+
- Redis 6+
- npm or yarn
- Docker (optional)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Start Redis (if running locally):
```bash
redis-server
```

4. Start the service:
```bash
# API only
npm run dev

# Worker only
MODE=worker npm run dev

# Both API and worker
MODE=both npm run dev
```

### Docker

Start all services with Docker Compose:
```bash
docker-compose up
```

This starts:
- API server (port 3000)
- Worker processes (2 replicas)
- Redis (port 6379)
- Prometheus (port 9091)
- Grafana (port 3001)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run worker` - Start worker processes only
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run validate` - Run linting, tests, and build

## Job Types

### Email Jobs

Send emails with templates and attachments:

```bash
curl -X POST http://localhost:3000/api/jobs/email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "subject": "Welcome!",
    "template": "welcome",
    "variables": {
      "name": "John Doe"
    }
  }'
```

### File Processing Jobs

Process images, documents, and videos:

```bash
curl -X POST http://localhost:3000/api/jobs/files \
  -F "file=@image.jpg" \
  -F "type=image" \
  -F "options={\"resize\":{\"width\":800,\"height\":600}}"
```

### Report Generation Jobs

Generate reports in various formats:

```bash
curl -X POST http://localhost:3000/api/jobs/reports \
  -H "Content-Type: application/json" \
  -d '{
    "type": "user-activity",
    "dateRange": {
      "start": "2023-01-01",
      "end": "2023-12-31"
    },
    "format": "pdf",
    "email": "admin@example.com"
  }'
```

### Cleanup Jobs

Automated cleanup of old files and data:

```bash
curl -X POST http://localhost:3000/api/jobs/cleanup \
  -H "Content-Type: application/json" \
  -d '{
    "type": "files",
    "olderThan": "2023-01-01T00:00:00Z",
    "dryRun": false
  }'
```

### Webhook Jobs

Send HTTP webhooks with retry logic:

```bash
curl -X POST http://localhost:3000/api/jobs/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://api.example.com/webhook",
    "method": "POST",
    "payload": {
      "event": "user.created",
      "data": {"userId": "123"}
    }
  }'
```

## Monitoring

### Queue Dashboard

Bull Board provides a web interface for monitoring queues:
- **URL**: http://localhost:3000/admin/queues
- **Features**: Job status, retry controls, job details

### Metrics

Prometheus metrics are available at http://localhost:9090/metrics:

- `jobs_total` - Total jobs processed by queue and status
- `job_duration_seconds` - Job processing duration
- `queue_size` - Number of jobs in each queue state
- `emails_total` - Email processing metrics
- `files_processed_total` - File processing metrics
- `webhooks_total` - Webhook delivery metrics

### Grafana Dashboards

Access Grafana at http://localhost:3001 (admin/admin) for:
- Queue performance metrics
- Worker health monitoring
- System resource usage
- Job success/failure rates

### Health Checks

- **Liveness**: `GET /health/live`
- **Readiness**: `GET /health/ready` (includes Redis and queue checks)
- **Detailed**: `GET /health` (full system information)

## Configuration

Key environment variables:

### Service Configuration
- `NODE_ENV` - Environment (development/production/test)
- `PORT` - API server port
- `MODE` - Service mode (api/worker/both)

### Redis Configuration
- `REDIS_URL` - Redis connection string
- `REDIS_MAX_RETRIES_PER_REQUEST` - Connection retry limit

### Worker Configuration
- `WORKER_EMAIL_CONCURRENCY` - Email worker concurrency
- `WORKER_FILE_CONCURRENCY` - File processing concurrency
- `WORKER_WEBHOOK_CONCURRENCY` - Webhook worker concurrency

### File Processing
- `UPLOAD_DIR` - File upload directory
- `MAX_FILE_SIZE` - Maximum file size in bytes
- `ALLOWED_FILE_TYPES` - Comma-separated allowed file types

### Email Configuration
- `EMAIL_HOST` - SMTP server host
- `EMAIL_USER` - SMTP username
- `EMAIL_PASS` - SMTP password

## Scaling

### Horizontal Scaling

Scale worker processes:
```bash
docker-compose up --scale worker=5
```

### Queue-Specific Workers

Run dedicated workers for specific job types:

```bash
# Email-only worker
WORKER_EMAIL_CONCURRENCY=10 \
WORKER_FILE_CONCURRENCY=0 \
WORKER_REPORT_CONCURRENCY=0 \
WORKER_CLEANUP_CONCURRENCY=0 \
WORKER_WEBHOOK_CONCURRENCY=0 \
npm run worker
```

### Load Balancing

Use multiple API instances behind a load balancer:
```bash
docker-compose up --scale api=3
```

## Error Handling

### Retry Logic

Jobs automatically retry with exponential backoff:
- Default: 3 attempts
- Backoff: Exponential (2s, 4s, 8s)
- Customizable per job type

### Dead Letter Queue

Failed jobs are moved to failed state for manual inspection and retry.

### Error Monitoring

All errors are logged with context:
- Job ID and queue name
- Error message and stack trace
- Retry attempt information
- Correlation IDs for tracing

## Development

### Adding New Job Types

1. Define job data interface in `src/queues/index.ts`
2. Create queue instance
3. Implement processor function
4. Add processor to worker
5. Create API endpoint

### Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- processors/email.processor.test.ts

# Run with coverage
npm test -- --coverage
```

### Debugging

Enable debug logging:
```bash
LOG_LEVEL=debug npm run dev
```

## Production Deployment

### Kubernetes

Example deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: worker-service-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: worker-service-api
  template:
    metadata:
      labels:
        app: worker-service-api
    spec:
      containers:
      - name: api
        image: worker-service:latest
        env:
        - name: MODE
          value: "api"
        - name: REDIS_URL
          value: "redis://redis-service:6379"
        ports:
        - containerPort: 3000
        - containerPort: 9090
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: worker-service-worker
spec:
  replicas: 5
  selector:
    matchLabels:
      app: worker-service-worker
  template:
    metadata:
      labels:
        app: worker-service-worker
    spec:
      containers:
      - name: worker
        image: worker-service:latest
        command: ["node", "dist/worker.js"]
        env:
        - name: MODE
          value: "worker"
        - name: REDIS_URL
          value: "redis://redis-service:6379"
```

### Security Considerations

- Use Redis AUTH in production
- Implement API authentication
- Secure file upload validation
- Rate limiting on API endpoints
- Regular security updates

### Performance Tuning

- Adjust worker concurrency based on workload
- Monitor Redis memory usage
- Optimize job data size
- Use job result expiration
- Implement job deduplication

## License

MIT