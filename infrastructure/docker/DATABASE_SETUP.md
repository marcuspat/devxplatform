# Database Infrastructure Setup - DevX Platform

## Overview

This document describes the complete PostgreSQL database infrastructure setup for the DevX Platform, including schema, migrations, and connectivity.

## ✅ Completed Setup

### 1. Database Schema (`/infrastructure/docker/init-scripts/01-init-db.sql`)

**Core Tables:**
- `users` - User accounts and authentication
- `templates.templates` - Service templates library
- `projects` - User projects and their configurations
- `services` - Individual services within projects *(NEW)*
- `generation_history` - History of code/service generations *(NEW)*
- `templates.categories` - Template categorization
- `templates.technologies` - Technology definitions
- `activity_logs` - System activity tracking

**Key Features:**
- UUID primary keys with automatic generation
- Comprehensive indexing for performance
- JSONB columns for flexible metadata storage
- Automatic `updated_at` triggers
- Proper foreign key relationships
- Schema separation (`devx` and `templates`)

### 2. Migration System (`/api/src/migrations/`)

**Components:**
- `MigrationRunner` class for automated migrations
- Version-controlled SQL migration files
- Checksum validation for integrity
- Transaction-based execution
- CLI tools for migration management

**Migration Files:**
- `001_create_base_schema.sql` - Base schema safety migration
- `002_add_api_keys_table.sql` - API authentication system

**Commands:**
```bash
npm run migrate:up      # Run pending migrations
npm run migrate:status  # Check migration status
npm run migrate:create  # Create new migration file
```

### 3. Database Connectivity (`/api/config/database.js`)

**Features:**
- PostgreSQL connection pooling
- Environment-based configuration
- Health check capabilities
- Graceful connection management
- SSL support for production

**Connection Pool Settings:**
- Max connections: 20
- Idle timeout: 30 seconds
- Connection timeout: 2 seconds

### 4. API Integration (`/api/src/index.js`)

**Enhanced API Features:**
- Database-powered template endpoints
- Automatic migration execution on startup
- Health checks with database connectivity
- Database status endpoint (`/api/database/status`)
- Graceful shutdown with connection cleanup
- Fallback to in-memory data during DB errors

### 5. Environment Configuration (`/api/.env.example`)

**Database Variables:**
```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=devxplatform
POSTGRES_USER=devx
POSTGRES_PASSWORD=devx_secure_password
DATABASE_URL=postgresql://devx:devx_secure_password@localhost:5432/devxplatform
```

## 🚀 How to Use

### Quick Start
```bash
# 1. Start the database services
cd infrastructure/docker
docker-compose up postgres redis -d

# 2. Start the API (migrations run automatically)
cd ../../api
npm install
npm start
```

### Development Commands
```bash
# Check database schema validity
npm run test:db

# Run migrations manually
npm run migrate:up

# Check migration status
npm run migrate:status

# Create new migration
npm run migrate:create add_new_feature
```

### Endpoints
- `GET /health` - Health check with database status
- `GET /api/database/status` - Detailed database and migration status
- `GET /api/templates` - Database-powered templates (fallback to mock data)
- `GET /api/templates/categories` - Template categories from database

## 📊 Database Schema Details

### Services Table (NEW)
```sql
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    template_id UUID REFERENCES templates.templates(id),
    user_id UUID REFERENCES users(id) NOT NULL,
    project_id UUID REFERENCES projects(id),
    service_type VARCHAR(50) NOT NULL DEFAULT 'api',
    port INTEGER,
    health_check_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'inactive',
    deployment_config JSONB DEFAULT '{}',
    environment_vars JSONB DEFAULT '{}',
    resource_limits JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deployed_at TIMESTAMP WITH TIME ZONE
);
```

### Generation History Table (NEW)
```sql
CREATE TABLE generation_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) NOT NULL,
    template_id UUID REFERENCES templates.templates(id),
    project_id UUID REFERENCES projects(id),
    service_id UUID REFERENCES services(id),
    generation_type VARCHAR(50) NOT NULL,
    input_params JSONB DEFAULT '{}',
    output_files JSONB DEFAULT '[]',
    generation_status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);
```

## 🔧 Configuration

### Docker Compose Integration
The PostgreSQL service is pre-configured in `docker-compose.yml` with:
- Database initialization scripts
- Health checks
- Data persistence
- Network connectivity

### Connection String Formats
```bash
# Development (local)
DATABASE_URL=postgresql://devx:devx_secure_password@localhost:5432/devxplatform

# Docker environment
DATABASE_URL=postgresql://devx:devx_secure_password@postgres:5432/devxplatform
```

## 🧪 Testing & Validation

Run the comprehensive database validation:
```bash
npm run test:db
```

This validates:
- ✅ Database schema completeness
- ✅ Migration system functionality
- ✅ Database configuration
- ✅ Environment variables

## 🔒 Security Considerations

- Database credentials via environment variables
- Connection pooling with limits
- SQL injection protection via parameterized queries
- SSL connections in production
- Schema separation for data organization

## 📈 Performance Features

- Comprehensive indexing strategy
- Connection pooling for scalability
- JSONB for flexible metadata storage
- Optimized query patterns in API endpoints
- Proper foreign key relationships

## 🔄 Migration Strategy

1. **Development**: Migrations run automatically on API startup
2. **Production**: Run migrations explicitly before deployment
3. **Version Control**: All schema changes tracked in migration files
4. **Rollback**: Prepared for future rollback capabilities

---

**Status**: ✅ Complete and ready for use
**Last Updated**: 2025-06-19
**Next Steps**: Test with full Docker Compose stack