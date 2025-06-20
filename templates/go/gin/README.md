# Gin REST API Service Template

A production-ready REST API service built with Go and the Gin framework, featuring JWT authentication, PostgreSQL database integration, Redis caching, and comprehensive middleware.

## Features

- **High Performance**: Built with Go and Gin framework for optimal performance
- **JWT Authentication**: Secure token-based authentication system
- **Database Integration**: PostgreSQL with migrations and connection pooling
- **Redis Support**: Caching and session management
- **Middleware Stack**: CORS, rate limiting, logging, security headers, and more
- **API Documentation**: Auto-generated Swagger/OpenAPI documentation
- **Health Checks**: Kubernetes-ready health and readiness probes
- **Observability**: Structured logging with Zap and Prometheus metrics
- **Production Ready**: Docker support, graceful shutdown, and error handling
- **Testing**: Comprehensive test structure and examples

## Project Structure

```
.
├── cmd/                    # Application entry points
│   └── main.go            # Main application
├── internal/              # Private application code
│   ├── api/               # HTTP layer
│   │   ├── handlers/      # HTTP handlers (controllers)
│   │   ├── middleware/    # HTTP middleware
│   │   └── router.go      # Route definitions
│   ├── config/            # Configuration management
│   ├── database/          # Database layer
│   ├── models/            # Data models
│   ├── services/          # Business logic layer
│   └── utils/             # Utility functions
├── migrations/            # Database migrations
├── docs/                  # API documentation
├── tests/                 # Test files
├── scripts/               # Build and deployment scripts
├── Dockerfile            # Docker configuration
├── docker-compose.yml    # Docker Compose setup
├── Makefile              # Build automation
├── go.mod                # Go modules
└── config.yaml.example   # Configuration template
```

## Quick Start

### Prerequisites

- Go 1.21 or higher
- PostgreSQL 13 or higher
- Redis 6 or higher (optional)
- Docker and Docker Compose (optional)

### 1. Clone and Setup

```bash
# Copy configuration
cp config.yaml.example config.yaml

# Install dependencies
make deps

# Install development tools (optional)
make install-tools
```

### 2. Database Setup

```bash
# Start PostgreSQL (or use Docker Compose)
docker run -d \
  --name postgres \
  -e POSTGRES_DB=gin_service \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:15-alpine

# Run migrations
make migrate-up
```

### 3. Run the Application

```bash
# Run directly
make run

# Or with hot reload (requires air)
make dev

# Or with Docker Compose
make docker-compose-up
```

The API will be available at:
- **API**: http://localhost:8080/api/v1
- **Health**: http://localhost:8080/health
- **Docs**: http://localhost:8080/docs/index.html
- **Metrics**: http://localhost:8080/metrics

## API Endpoints

### Authentication

```bash
# Register a new user
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "password123",
    "full_name": "John Doe"
  }'

# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "password123"
  }'
```

### User Management

```bash
# Get current user profile (requires auth)
curl -X GET http://localhost:8080/api/v1/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Update profile
curl -X PUT http://localhost:8080/api/v1/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Smith"
  }'

# List users (admin only)
curl -X GET http://localhost:8080/api/v1/users \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

### Health Checks

```bash
# Basic health check
curl http://localhost:8080/health

# Detailed health check
curl http://localhost:8080/health/detailed

# Kubernetes readiness probe
curl http://localhost:8080/ready

# Kubernetes liveness probe
curl http://localhost:8080/live
```

## Configuration

Configuration can be provided via YAML file or environment variables:

### Environment Variables

```bash
# Service Configuration
export SERVICE_NAME="gin-service"
export SERVICE_ENVIRONMENT="production"

# Server Configuration
export SERVER_PORT="8080"
export SERVER_READ_TIMEOUT="10"

# Database Configuration
export DATABASE_URL="postgres://user:pass@localhost:5432/db?sslmode=disable"
export DATABASE_MAX_OPEN_CONNS="25"

# JWT Configuration
export JWT_SECRET="your-secret-key"
export JWT_EXPIRATION_TIME="3600"

# Redis Configuration
export REDIS_URL="localhost:6379"

# Rate Limiting
export RATE_ENABLED="true"
export RATE_RPS="100"
export RATE_BURST="200"
```

### YAML Configuration

See `config.yaml.example` for a complete configuration example.

## Development

### Available Make Commands

```bash
make help              # Show all available commands
make build             # Build the application
make test              # Run tests
make test-coverage     # Run tests with coverage
make lint              # Run linter
make fmt               # Format code
make swagger           # Generate API documentation
make migrate-up        # Run database migrations
make docker-build      # Build Docker image
make setup             # Initial project setup
```

### Database Migrations

```bash
# Create a new migration
make migrate-create NAME=add_user_table

# Run migrations
make migrate-up

# Rollback migrations
make migrate-down

# Check migration status
make migrate-version
```

### API Documentation

Generate and view Swagger documentation:

```bash
# Generate docs
make swagger

# View at http://localhost:8080/docs/index.html
make run
```

### Testing

```bash
# Run all tests
make test

# Run tests with coverage
make test-coverage

# Run tests with race detection
make test-race

# Run benchmarks
make benchmark
```

## Production Deployment

### Docker

```bash
# Build image
make docker-build

# Run container
docker run -p 8080:8080 \
  -e DATABASE_URL="postgres://..." \
  -e JWT_SECRET="your-secret" \
  gin-service:latest
```

### Docker Compose

```bash
# Start all services
make docker-compose-up

# View logs
make docker-compose-logs

# Stop services
make docker-compose-down
```

### Kubernetes

Example Kubernetes deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gin-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: gin-service
  template:
    metadata:
      labels:
        app: gin-service
    spec:
      containers:
      - name: gin-service
        image: gin-service:latest
        ports:
        - containerPort: 8080
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: gin-service-secrets
              key: database-url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: gin-service-secrets
              key: jwt-secret
        livenessProbe:
          httpGet:
            path: /live
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "64Mi"
            cpu: "250m"
          limits:
            memory: "128Mi"
            cpu: "500m"
```

## Security Features

- **JWT Authentication**: Secure token-based auth with configurable expiration
- **Password Hashing**: Bcrypt for secure password storage
- **Rate Limiting**: Configurable rate limiting per IP
- **Security Headers**: CSRF, XSS, and other security headers
- **Input Validation**: Request validation using struct tags
- **CORS**: Configurable CORS policies
- **HTTPS Ready**: TLS/SSL termination support

## Monitoring and Observability

### Structured Logging

The service uses Zap for structured JSON logging:

```json
{
  "level": "info",
  "ts": "2023-12-01T10:00:00.000Z",
  "caller": "handlers/user_handler.go:45",
  "msg": "User registered successfully",
  "user_id": 123,
  "request_id": "req-123-456-789"
}
```

### Metrics

Prometheus metrics are exposed at `/metrics`:

- HTTP request duration and count
- Active connections
- Database connection pool stats
- Custom business metrics

### Health Checks

- `/health` - Basic health status
- `/health/detailed` - Health with dependency checks
- `/ready` - Kubernetes readiness probe
- `/live` - Kubernetes liveness probe

## Best Practices

### Code Organization

1. **Layered Architecture**: Clear separation between handlers, services, and repositories
2. **Dependency Injection**: Services and handlers receive dependencies via constructors
3. **Error Handling**: Consistent error handling with proper HTTP status codes
4. **Validation**: Input validation at the HTTP layer using struct tags
5. **Logging**: Structured logging with correlation IDs

### Performance

1. **Connection Pooling**: Database connection pooling with configurable limits
2. **Middleware Optimization**: Efficient middleware stack with minimal overhead
3. **Graceful Shutdown**: Proper cleanup of resources on shutdown
4. **Memory Management**: Careful memory allocation in hot paths

### Security

1. **Input Sanitization**: All user inputs are validated and sanitized
2. **SQL Injection Prevention**: Use of parameterized queries
3. **Secret Management**: Sensitive data stored in environment variables
4. **Minimal Attack Surface**: Only necessary endpoints exposed

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check database is running
   docker ps
   
   # Verify connection string
   echo $DATABASE_URL
   ```

2. **Migration Errors**
   ```bash
   # Check migration status
   make migrate-version
   
   # Force to specific version if needed
   make migrate-force VERSION=1
   ```

3. **JWT Token Issues**
   ```bash
   # Verify JWT secret is set
   echo $JWT_SECRET
   
   # Check token expiration in logs
   docker logs gin-service 2>&1 | grep "token"
   ```

### Debug Mode

Enable debug logging for development:

```bash
export LOG_LEVEL=debug
make run
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Run linter and formatter
6. Submit a pull request

## License

MIT