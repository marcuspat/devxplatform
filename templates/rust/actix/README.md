# Actix Web Template

A production-ready REST API template built with Actix-web, featuring authentication, database integration, and comprehensive middleware.

## Features

- **Actix-web 4.5**: High-performance, actor-based web framework
- **PostgreSQL Integration**: Using SQLx for async database operations
- **JWT Authentication**: Secure token-based authentication
- **Request ID Tracking**: Automatic request ID generation and tracking
- **Health Checks**: Liveness and readiness endpoints
- **Error Handling**: Centralized error handling with proper HTTP status codes
- **Logging**: Structured logging with tracing
- **CORS Support**: Configurable CORS middleware
- **Docker Support**: Multi-stage Dockerfile for optimized builds
- **Environment Configuration**: Flexible configuration management

## Prerequisites

- Rust 1.75 or higher
- PostgreSQL 14 or higher
- Docker (optional)

## Quick Start

1. **Clone and setup**:
   ```bash
   cargo build
   ```

2. **Set environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run database migrations**:
   ```bash
   sqlx migrate run
   ```

4. **Run the application**:
   ```bash
   cargo run
   ```

## Project Structure

```
src/
├── main.rs          # Application entry point
├── config.rs        # Configuration management
├── errors.rs        # Error types and handling
├── handlers/        # Request handlers
│   ├── health.rs    # Health check endpoints
│   └── users.rs     # User management endpoints
├── middleware/      # Custom middleware
│   ├── auth.rs      # JWT authentication
│   └── request_id.rs # Request ID tracking
├── models/          # Data models
│   └── user.rs      # User model and DTOs
├── services/        # Business logic
│   └── user_service.rs # User service
└── utils/           # Utility functions
    ├── jwt.rs       # JWT token handling
    └── hash.rs      # Password hashing
```

## API Endpoints

### Health Checks
- `GET /api/v1/health` - Health check
- `GET /api/v1/ready` - Readiness check (includes database)

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token

### Users (Protected)
- `GET /api/v1/users` - List users (paginated)
- `GET /api/v1/users/{id}` - Get user by ID
- `POST /api/v1/users` - Create new user
- `PUT /api/v1/users/{id}` - Update user
- `DELETE /api/v1/users/{id}` - Delete user

## Configuration

The application uses a layered configuration approach:

1. Default values in code
2. Configuration files (`config/default.toml`, `config/production.toml`)
3. Environment variables (prefixed with `ACTIX_`)

### Environment Variables

```bash
# Server Configuration
ACTIX_SERVER__HOST=0.0.0.0
ACTIX_SERVER__PORT=8080
ACTIX_SERVER__WORKERS=4

# Database Configuration
ACTIX_DATABASE__URL=postgresql://user:password@localhost/dbname
ACTIX_DATABASE__MAX_CONNECTIONS=10

# JWT Configuration
ACTIX_JWT__SECRET=your-secret-key
ACTIX_JWT__ACCESS_TOKEN_EXPIRY=3600
ACTIX_JWT__REFRESH_TOKEN_EXPIRY=86400

# Redis Configuration
ACTIX_REDIS__URL=redis://localhost:6379
```

## Database Schema

Create the users table:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
```

## Testing

Run tests:
```bash
cargo test
```

Run with coverage:
```bash
cargo tarpaulin --out Html
```

## Docker

Build the image:
```bash
docker build -t actix-template .
```

Run the container:
```bash
docker run -p 8080:8080 \
  -e ACTIX_DATABASE__URL=postgresql://user:password@host/db \
  -e ACTIX_JWT__SECRET=your-secret \
  actix-template
```

## Development

### Adding New Endpoints

1. Create handler in `src/handlers/`
2. Define models in `src/models/`
3. Implement business logic in `src/services/`
4. Register routes in `main.rs`

### Adding Middleware

1. Create middleware in `src/middleware/`
2. Implement `Transform` and `Service` traits
3. Add to application in `main.rs`

## Performance

- Uses Actix-web's actor system for high concurrency
- Connection pooling for database
- Async/await throughout
- Efficient JSON serialization with serde

## Security

- Password hashing with bcrypt
- JWT tokens for authentication
- CORS protection
- SQL injection prevention with parameterized queries
- Request ID tracking for audit trails

## License

MIT