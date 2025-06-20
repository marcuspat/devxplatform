# gRPC Service Template

Production-ready gRPC service template with TypeScript, protocol buffers, and comprehensive monitoring.

## Features

- ✅ **12-Factor App Principles**: Environment-based configuration, stateless design
- ✅ **Protocol Buffers**: Type-safe message definitions with code generation
- ✅ **TypeScript**: Full type safety throughout the service
- ✅ **Structured Logging**: Winston with JSON formatting and request correlation
- ✅ **Health Checks**: Standard gRPC health checking protocol
- ✅ **Error Handling**: Comprehensive error handling with proper gRPC status codes
- ✅ **Authentication**: JWT-based authentication with role-based access control
- ✅ **Rate Limiting**: Per-client rate limiting with proper backpressure
- ✅ **Metrics**: Prometheus metrics for monitoring and alerting
- ✅ **Interceptors**: Modular request/response processing pipeline
- ✅ **Docker Support**: Multi-stage Dockerfile with security best practices
- ✅ **Testing**: Jest with gRPC testing utilities
- ✅ **Graceful Shutdown**: Proper connection draining and resource cleanup

## Project Structure

```
├── src/
│   ├── generated/        # Generated protobuf code (auto-generated)
│   ├── interceptors/     # gRPC interceptors
│   ├── services/         # Service implementations
│   ├── utils/            # Utility functions
│   ├── config/           # Configuration management
│   ├── index.ts          # Application entry point
│   ├── server.ts         # gRPC server setup
│   └── metrics.ts        # Prometheus metrics
├── proto/                # Protocol buffer definitions
│   ├── user.proto        # User service definition
│   └── health.proto      # Health check service
├── Dockerfile            # Docker configuration
├── docker-compose.yml    # Docker Compose setup
├── prometheus.yml        # Prometheus configuration
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── jest.config.js        # Jest configuration
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Protocol Buffers compiler (protoc)
- Docker (optional)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Generate protobuf code:
```bash
npm run proto:generate
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Start development server:
```bash
npm run dev
```

### Docker

Build and run with Docker:
```bash
docker-compose up
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run validate` - Run linting, tests, and build
- `npm run proto:generate` - Generate TypeScript from proto files
- `npm run proto:clean` - Clean generated proto files

## Service Definitions

### User Service

The User service provides CRUD operations for user management:

- `GetUser` - Retrieve a user by ID
- `ListUsers` - List users with pagination
- `CreateUser` - Create a new user
- `UpdateUser` - Update an existing user
- `DeleteUser` - Delete a user
- `StreamUserUpdates` - Stream real-time user updates
- `BatchCreateUsers` - Create multiple users in a batch

### Health Service

Standard gRPC health checking service:

- `Check` - Check service health status
- `Watch` - Stream health status updates

## Client Usage

### Using grpcurl

```bash
# Check health
grpcurl -plaintext localhost:50051 health.Health/Check

# Create a user
grpcurl -plaintext -d '{
  "email": "user@example.com",
  "username": "johndoe",
  "first_name": "John",
  "last_name": "Doe",
  "password": "securepassword"
}' localhost:50051 user.UserService/CreateUser

# Get a user
grpcurl -plaintext -d '{"id": "123"}' localhost:50051 user.UserService/GetUser

# List users
grpcurl -plaintext -d '{
  "page": 1,
  "page_size": 10
}' localhost:50051 user.UserService/ListUsers
```

### Using grpcui

Access the web-based gRPC client at http://localhost:8080 when running with Docker Compose.

## Authentication

Include JWT token in metadata:

```javascript
const metadata = new grpc.Metadata();
metadata.set('authorization', 'Bearer your-jwt-token');
```

## Monitoring

### Metrics

Prometheus metrics are available at http://localhost:9090/metrics:

- `grpc_requests_total` - Total gRPC requests by method and status
- `grpc_request_duration_seconds` - Request duration histogram
- `grpc_active_connections` - Active connection count
- `users_total` - Total users in the system
- `health_check_status` - Health check status by service

### Health Checks

- Standard gRPC health check: Call `health.Health/Check`
- HTTP health endpoint: GET http://localhost:9090/health

## Configuration

Environment variables (see `.env.example`):

- `NODE_ENV` - Environment (development/production/test)
- `GRPC_HOST` - Server host
- `GRPC_PORT` - Server port
- `LOG_LEVEL` - Logging level
- `JWT_SECRET` - JWT signing secret
- `TLS_CERT_PATH` - TLS certificate path (production)
- `RATE_LIMIT_MAX_REQUESTS` - Rate limit per client
- `METRICS_ENABLED` - Enable Prometheus metrics

## Security Features

- TLS encryption (configurable)
- JWT authentication with role-based access
- Rate limiting per client IP
- Input validation for all requests
- Error sanitization in production
- Non-root Docker user

## Testing

Run tests:
```bash
npm test
```

Run with coverage:
```bash
npm test -- --coverage
```

## Deployment

### Production Build

1. Build Docker image:
```bash
docker build -t grpc-service .
```

2. Run with TLS:
```bash
docker run -p 50051:50051 \
  -e NODE_ENV=production \
  -e TLS_CERT_PATH=/certs/server.crt \
  -e TLS_KEY_PATH=/certs/server.key \
  -v /path/to/certs:/certs \
  grpc-service
```

### Kubernetes

Example deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grpc-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: grpc-service
  template:
    metadata:
      labels:
        app: grpc-service
    spec:
      containers:
      - name: grpc-service
        image: grpc-service:latest
        ports:
        - containerPort: 50051
        - containerPort: 9090
        env:
        - name: NODE_ENV
          value: "production"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: grpc-secrets
              key: jwt-secret
        livenessProbe:
          httpGet:
            path: /health
            port: 9090
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 9090
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Development

### Adding New Services

1. Define service in proto file:
```protobuf
service MyService {
  rpc MyMethod(MyRequest) returns (MyResponse);
}
```

2. Generate code:
```bash
npm run proto:generate
```

3. Implement service:
```typescript
export class MyServiceImplementation {
  async myMethod(call, callback) {
    // Implementation
  }
}
```

4. Register in server:
```typescript
server.addService(MyServiceService, new MyServiceImplementation());
```

### Adding Interceptors

Create interceptor function:
```typescript
export const myInterceptor: grpc.ServerInterceptor = (call, callback, next) => {
  // Pre-processing
  next(call, (error, response) => {
    // Post-processing
    callback(error, response);
  });
};
```

## License

MIT