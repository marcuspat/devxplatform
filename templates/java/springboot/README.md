# Spring Boot DevX Platform Template

Enterprise-grade Spring Boot template with comprehensive features for building production-ready microservices.

## Features

### Core Features
- **Spring Boot 3.2.x** with Java 17
- **RESTful API** with comprehensive CRUD operations
- **JPA/Hibernate** with PostgreSQL and H2 support
- **Spring Security** with configurable authentication
- **Bean Validation** with comprehensive error handling
- **Caching** with Spring Cache abstraction
- **Actuator** endpoints for monitoring and health checks

### Quality & Testing
- **Unit Tests** with JUnit 5 and Mockito
- **Integration Tests** with TestContainers
- **Code Coverage** with JaCoCo (80% minimum)
- **Static Analysis** with SpotBugs
- **Code Quality** with Checkstyle
- **Security Scanning** with OWASP Dependency Check

### Observability
- **Metrics** with Micrometer and Prometheus
- **Structured Logging** with Logback and JSON format
- **Health Checks** with Spring Actuator
- **API Documentation** with OpenAPI 3/Swagger

### Deployment
- **Multi-stage Dockerfile** with security best practices
- **Docker Compose** for local development
- **Production-ready** configuration profiles
- **Container Security** with non-root user and minimal attack surface

## Quick Start

### Prerequisites
- Java 17 or higher
- Maven 3.6+ or Gradle 7+
- Docker (optional)

### Local Development

1. **Clone and build:**
   ```bash
   git clone <repository-url>
   cd springboot-template
   mvn clean install
   ```

2. **Run the application:**
   ```bash
   mvn spring-boot:run
   ```

3. **Access the application:**
   - Application: http://localhost:8080
   - Swagger UI: http://localhost:8080/swagger-ui.html
   - Health Check: http://localhost:8080/api/v1/health
   - Actuator: http://localhost:8080/actuator
   - H2 Console: http://localhost:8080/h2-console (dev profile)

### Docker Development

1. **Run with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

2. **Access services:**
   - Application: http://localhost:8080
   - PostgreSQL: localhost:5432
   - Redis: localhost:6379
   - Prometheus: http://localhost:9090
   - Grafana: http://localhost:3000 (admin/admin123)

## API Endpoints

### User Management
```
POST   /api/v1/users              - Create user
GET    /api/v1/users              - Get all users (paginated)
GET    /api/v1/users/{id}         - Get user by ID
GET    /api/v1/users/username/{username} - Get user by username
PUT    /api/v1/users/{id}         - Update user
PATCH  /api/v1/users/{id}/deactivate - Deactivate user
DELETE /api/v1/users/{id}         - Delete user
GET    /api/v1/users/search?q=term - Search users
GET    /api/v1/users/stats        - Get user statistics
```

### Health & Monitoring
```
GET    /api/v1/health             - Basic health check
GET    /api/v1/health/ready       - Readiness probe
GET    /api/v1/health/live        - Liveness probe
GET    /actuator/health           - Detailed health info
GET    /actuator/metrics          - Application metrics
GET    /actuator/prometheus       - Prometheus metrics
```

## Configuration

### Profiles
- **dev** (default): H2 database, debug logging, H2 console enabled
- **prod**: PostgreSQL database, optimized logging, security headers
- **test**: In-memory H2, minimal logging for testing

### Environment Variables
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=devxplatform
DB_USERNAME=devxplatform
DB_PASSWORD=password

# Application
SPRING_PROFILES_ACTIVE=prod
SERVER_PORT=8080
JAVA_OPTS="-Xmx512m -Xms256m"
```

## Testing

### Run Tests
```bash
# Unit tests
mvn test

# Integration tests
mvn verify

# All tests with coverage
mvn clean verify jacoco:report
```

### Test Coverage
- Minimum coverage: 80%
- Reports: `target/site/jacoco/index.html`

## Code Quality

### Static Analysis
```bash
# SpotBugs
mvn spotbugs:check

# Checkstyle
mvn checkstyle:check

# All quality checks
mvn verify
```

### Security Scanning
```bash
# OWASP Dependency Check
mvn org.owasp:dependency-check-maven:check
```

## Production Deployment

### Docker Image
```bash
# Build image
docker build -t springboot-devx-template .

# Run container
docker run -p 8080:8080 \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e DB_HOST=your-db-host \
  springboot-devx-template
```

### Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: springboot-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: springboot-app
  template:
    metadata:
      labels:
        app: springboot-app
    spec:
      containers:
      - name: springboot-app
        image: springboot-devx-template:latest
        ports:
        - containerPort: 8080
        env:
        - name: SPRING_PROFILES_ACTIVE
          value: "prod"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/v1/health/live
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/v1/health/ready
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 5
```

## Architecture

### Package Structure
```
com.devxplatform.springboot/
├── config/                 # Configuration classes
├── controller/             # REST controllers
├── exception/              # Exception handling
├── model/                  # JPA entities
├── repository/             # Data access layer
├── service/                # Business logic
└── SpringBootTemplateApplication.java
```

### Database Schema
```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Security

### Security Features
- HTTPS enforcement in production
- Security headers (HSTS, CSP, etc.)
- Input validation and sanitization
- SQL injection prevention with JPA
- XSS protection
- CSRF protection (configurable)

### Security Scanning
Regular dependency vulnerability scanning with OWASP Dependency Check.

## Monitoring

### Metrics
- Application metrics via Micrometer
- Custom business metrics
- JVM and system metrics
- Database connection pool metrics

### Logging
- Structured JSON logging
- Request/response logging
- Error tracking and alerting
- Log aggregation ready

### Health Checks
- Database connectivity
- Cache availability
- Custom health indicators
- Kubernetes-ready probes

## Performance

### Optimizations
- Connection pooling with HikariCP
- JPA query optimization
- Caching for frequently accessed data
- Async processing where appropriate
- JVM tuning for containers

### Load Testing
Consider using tools like:
- Apache JMeter
- Artillery
- k6

## Contributing

1. Follow the existing code style
2. Write tests for new features
3. Ensure all quality checks pass
4. Update documentation

## License

MIT License - see LICENSE file for details.