# FastAPI REST Service Template

A production-ready FastAPI template with async support, featuring best practices for building scalable microservices.

## Features

- **Async/Await Support**: Full asynchronous request handling
- **Database Integration**: Async SQLAlchemy with PostgreSQL
- **Redis Caching**: Built-in Redis support for caching
- **Authentication**: JWT-based authentication system
- **API Documentation**: Auto-generated OpenAPI/Swagger docs
- **Structured Logging**: JSON-formatted logs with structlog
- **Monitoring**: Prometheus metrics and health checks
- **Error Handling**: Comprehensive exception handling
- **Rate Limiting**: Configurable rate limiting
- **Docker Support**: Multi-stage Dockerfile and docker-compose
- **Testing**: Pytest with async support

## Project Structure

```
.
├── app/
│   ├── api/              # API endpoints
│   │   ├── v1/          # API version 1
│   │   │   ├── auth.py  # Authentication endpoints
│   │   │   ├── health.py # Health check endpoints
│   │   │   └── users.py # User management endpoints
│   ├── models/          # SQLAlchemy models
│   ├── schemas/         # Pydantic schemas
│   ├── services/        # Business logic
│   ├── repositories/    # Data access layer
│   ├── middleware/      # Custom middleware
│   ├── config.py        # Configuration management
│   ├── database.py      # Database setup
│   ├── redis.py         # Redis setup
│   └── exceptions.py    # Custom exceptions
├── tests/               # Test suite
├── main.py             # Application entry point
├── requirements.txt    # Python dependencies
├── Dockerfile          # Docker configuration
├── docker-compose.yml  # Docker Compose setup
└── .env.example        # Environment variables template
```

## Quick Start

1. **Clone and setup environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run with Docker Compose**:
   ```bash
   docker-compose up
   ```

4. **Or run locally**:
   ```bash
   python main.py
   ```

## API Documentation

Once running, access:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- OpenAPI JSON: http://localhost:8000/openapi.json

## Configuration

All configuration is managed through environment variables. See `.env.example` for available options.

Key configurations:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `SECRET_KEY`: JWT secret key (min 32 characters)
- `LOG_LEVEL`: Logging level (DEBUG, INFO, WARNING, ERROR)
- `RATE_LIMIT_REQUESTS`: Requests per window
- `RATE_LIMIT_WINDOW`: Rate limit window in seconds

## Development

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_health.py
```

### Database Migrations

Using Alembic for database migrations:

```bash
# Create a migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Code Quality

```bash
# Format code
black .

# Lint
flake8 .

# Type checking
mypy .
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/token` - Get access token
- `GET /api/v1/auth/me` - Get current user info

### Users
- `GET /api/v1/users/` - List users (paginated)
- `POST /api/v1/users/` - Create user
- `GET /api/v1/users/{id}` - Get user by ID
- `PUT /api/v1/users/{id}` - Update user
- `DELETE /api/v1/users/{id}` - Delete user

### Health
- `GET /health` - Basic health check
- `GET /ready` - Readiness check
- `GET /api/v1/health/detailed` - Detailed health status

### Monitoring
- `GET /metrics` - Prometheus metrics

## Production Deployment

1. **Security**:
   - Generate strong SECRET_KEY
   - Use HTTPS
   - Configure CORS properly
   - Enable rate limiting

2. **Performance**:
   - Adjust worker count based on CPU cores
   - Configure database connection pooling
   - Use Redis for caching
   - Enable response compression

3. **Monitoring**:
   - Set up Prometheus/Grafana
   - Configure structured logging
   - Implement distributed tracing
   - Set up alerts

## License

MIT