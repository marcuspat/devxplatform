# DevX Platform Docker Deployment

This directory contains the Docker Compose configuration for the DevX Platform, including all necessary services for a complete development environment.

## Services

The platform consists of the following services:

- **PostgreSQL**: Primary database with UUID support and custom schemas
- **Redis**: Cache and job queue backend 
- **API**: Node.js/Express REST API backend
- **Portal**: Next.js web application frontend
- **Worker**: Background job processing service
- **Nginx**: Reverse proxy and load balancer
- **PgAdmin**: Database administration tool (optional)

## Quick Start

1. **Clone and navigate to the project:**
   ```bash
   cd /path/to/devxplatform/infrastructure/docker
   ```

2. **Copy environment variables:**
   ```bash
   cp .env.example .env
   ```

3. **Customize environment variables:**
   Edit `.env` file with your settings, especially:
   - Database passwords
   - Redis password
   - JWT secret
   - API endpoints

4. **Start all services:**
   ```bash
   docker-compose up -d
   ```

5. **Check service health:**
   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

## Service Access

After starting the services, you can access:

- **Main Application**: http://localhost:3000 (via Nginx)
- **API Documentation**: http://localhost:3001/health
- **Worker Metrics**: http://localhost:3003/health
- **Database Admin**: http://localhost:5050 (PgAdmin)
- **Direct Portal**: http://localhost:3002
- **Direct Nginx**: http://localhost:80

## Environment Configuration

Key environment variables in `.env`:

### Database
- `POSTGRES_DB`: Database name
- `POSTGRES_USER`: Database user
- `POSTGRES_PASSWORD`: Database password (change in production!)

### Security
- `JWT_SECRET`: JWT signing secret (use 256-bit key in production!)
- `REDIS_PASSWORD`: Redis password (change in production!)

### Networking
- `API_PORT`: API service port (default: 3001)
- `PORTAL_PORT`: Portal service port (default: 3000)
- `WORKER_PORT`: Worker service port (default: 3003)
- `NGINX_PORT`: Nginx port (default: 80)

## Development Commands

### Start services
```bash
# Start all services
docker-compose up -d

# Start with logs
docker-compose up

# Start specific service
docker-compose up -d postgres redis
```

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f worker
```

### Database operations
```bash
# Access PostgreSQL
docker-compose exec postgres psql -U devx -d devxplatform

# View database logs
docker-compose logs postgres

# Reset database (WARNING: destroys data)
docker-compose down -v
docker-compose up -d postgres
```

### Service management
```bash
# Restart service
docker-compose restart api

# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: destroys data)
docker-compose down -v

# Rebuild service
docker-compose build api
docker-compose up -d api
```

## Production Deployment

For production deployment:

1. **Update environment variables:**
   - Change all default passwords
   - Use strong JWT secrets
   - Set `NODE_ENV=production`
   - Configure proper CORS origins

2. **Security considerations:**
   - Remove development ports exposure
   - Use proper SSL certificates
   - Enable firewall rules
   - Use external managed databases for critical data

3. **Monitoring:**
   - Enable health checks
   - Configure log aggregation
   - Set up monitoring dashboards
   - Configure alerting

4. **Scaling:**
   - Use Docker Swarm or Kubernetes
   - Configure load balancing
   - Set up horizontal scaling for workers

## Database Schema

The database is automatically initialized with:
- UUID extensions
- Custom schemas (`devx`, `templates`)
- User management tables
- Template and project tables
- Activity logging
- Proper indexes and constraints

## Worker Jobs

The worker service processes these job types:
- `send-email`: Email notifications
- `process-file`: File processing tasks
- `generate-report`: Report generation
- `deploy-template`: Template deployment
- `cleanup`: Maintenance tasks

## Health Checks

All services include health checks:
- **PostgreSQL**: `pg_isready` command
- **Redis**: Redis ping command
- **API**: HTTP health endpoint
- **Portal**: HTTP health endpoint  
- **Worker**: HTTP health endpoint
- **Nginx**: HTTP health endpoint

## Troubleshooting

### Common Issues

1. **Port conflicts:**
   ```bash
   # Check what's using port
   lsof -i :3001
   
   # Change port in .env file
   API_PORT=3011
   ```

2. **Database connection failed:**
   ```bash
   # Check database status
   docker-compose logs postgres
   
   # Verify database is ready
   docker-compose exec postgres pg_isready -U devx
   ```

3. **Redis connection failed:**
   ```bash
   # Check Redis status
   docker-compose logs redis
   
   # Test Redis connection
   docker-compose exec redis redis-cli -a devx_redis_password ping
   ```

4. **Build failures:**
   ```bash
   # Clean Docker cache
   docker system prune -f
   
   # Rebuild without cache
   docker-compose build --no-cache
   ```

### Service Dependencies

Services start in order:
1. PostgreSQL, Redis (base services)
2. API (depends on database and Redis)
3. Worker (depends on database and Redis)
4. Portal (depends on API)
5. Nginx (depends on Portal and API)

## Development vs Production

### Development Features
- Hot reload for API and Portal
- Debug logging enabled
- Development database seeds
- PgAdmin for database management
- Exposed service ports

### Production Changes Needed
- Remove development ports
- Use production-grade secrets
- Configure SSL/TLS
- Set up proper logging
- Configure monitoring
- Use external managed services
- Enable security hardening

## Support

For issues and questions:
1. Check service logs: `docker-compose logs <service>`
2. Verify health checks: `docker-compose ps`
3. Review environment configuration
4. Check Docker resources and disk space