# Flask Microservice Template

A production-ready Flask microservice template with modern best practices.

## Features

- **Application Factory Pattern**: Modular and testable architecture
- **SQLAlchemy ORM**: Database abstraction with migrations
- **JWT Authentication**: Secure token-based authentication
- **RESTful API Design**: Clean and consistent API structure
- **Request Validation**: Marshmallow schemas for validation
- **Error Handling**: Comprehensive exception handling
- **Caching**: Redis-based caching support
- **Rate Limiting**: API rate limiting per endpoint
- **CORS Support**: Configurable cross-origin resource sharing
- **Structured Logging**: JSON-formatted logs
- **Testing**: Pytest with fixtures and coverage
- **Docker Support**: Containerized deployment

## Project Structure

```
.
├── app/
│   ├── api/              # API blueprints
│   │   ├── auth.py      # Authentication endpoints
│   │   ├── health.py    # Health check endpoints
│   │   └── users.py     # User management endpoints
│   ├── models/          # Database models
│   ├── schemas/         # Marshmallow schemas
│   ├── services/        # Business logic layer
│   ├── utils/           # Utility functions
│   ├── __init__.py      # Application factory
│   ├── config.py        # Configuration classes
│   └── exceptions.py    # Custom exceptions
├── migrations/          # Database migrations
├── tests/              # Test suite
├── app.py             # Development entry point
├── wsgi.py            # Production WSGI entry point
├── requirements.txt   # Python dependencies
├── Dockerfile         # Docker configuration
└── docker-compose.yml # Docker Compose setup
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

3. **Initialize database**:
   ```bash
   flask db init
   flask db migrate -m "Initial migration"
   flask db upgrade
   ```

4. **Run with Docker Compose**:
   ```bash
   docker-compose up
   ```

5. **Or run locally**:
   ```bash
   flask run
   ```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/logout` - Logout user

### Users
- `GET /api/v1/users/` - List users (paginated)
- `GET /api/v1/users/{id}` - Get user by ID
- `PUT /api/v1/users/{id}` - Update user
- `DELETE /api/v1/users/{id}` - Delete user (admin only)
- `POST /api/v1/users/{id}/activate` - Activate user (admin only)
- `POST /api/v1/users/{id}/deactivate` - Deactivate user (admin only)

### Health
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed health status
- `GET /api/ready` - Readiness check

## Configuration

Configuration is managed through environment variables and config classes:

- `FLASK_CONFIG`: Configuration name (development/testing/production)
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `SECRET_KEY`: Application secret key
- `JWT_SECRET_KEY`: JWT signing key

See `.env.example` for all available options.

## Development

### Database Migrations

```bash
# Create a new migration
flask db migrate -m "Description of changes"

# Apply migrations
flask db upgrade

# Rollback migration
flask db downgrade
```

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test
pytest tests/test_health.py
```

### Flask Shell

```bash
# Start interactive shell with app context
flask shell

# Available objects: app, db, User
>>> User.query.all()
```

## Production Deployment

### Using Gunicorn

```bash
gunicorn --bind 0.0.0.0:5000 --workers 4 wsgi:application
```

### Docker Deployment

```bash
# Build image
docker build -t flask-service .

# Run container
docker run -p 5000:5000 --env-file .env flask-service
```

### Environment Variables

Critical production settings:
- Set strong `SECRET_KEY` and `JWT_SECRET_KEY`
- Configure `DATABASE_URL` for production database
- Set `FLASK_CONFIG=production`
- Configure proper `CORS_ORIGINS`
- Adjust rate limiting as needed

## Monitoring

The service exposes Prometheus metrics at `/metrics` endpoint for monitoring.

## License

MIT