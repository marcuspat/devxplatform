# DevX Platform Shared Modules

Comprehensive observability and security modules for all DevX Platform templates.

## 📦 Installation

```bash
npm install @devxplatform/shared
```

## 🔍 Observability Modules

### Structured Logging

```typescript
import { createLogger, Logger } from '@devxplatform/shared';

const logger = createLogger('my-service');

// Log with context
logger.info('User action', {
  userId: '123',
  action: 'login',
  correlationId: 'abc-123'
});

// Log errors with stack traces
logger.error('Operation failed', error, {
  operation: 'database-query',
  query: 'SELECT * FROM users'
});
```

### OpenTelemetry Tracing

```typescript
import { createTracingService, tracingMiddleware } from '@devxplatform/shared';

// Initialize tracing
const tracing = createTracingService({
  serviceName: 'api-service',
  jaegerEndpoint: 'http://localhost:14268/api/traces'
});

await tracing.start();

// Express middleware
app.use(tracingMiddleware('api-service'));

// Manual spans
await tracing.createSpan('database-operation', async (span) => {
  span.setAttributes({ 'db.query': 'SELECT * FROM users' });
  return await db.query('SELECT * FROM users');
});
```

### Prometheus Metrics

```typescript
import { createMetricsService, metricsEndpoint } from '@devxplatform/shared';

const metrics = createMetricsService({
  serviceName: 'api-service',
  customMetrics: [
    {
      name: 'api_calls_total',
      type: 'counter',
      help: 'Total API calls',
      labelNames: ['endpoint', 'method']
    }
  ]
});

// Express middleware
app.use(metrics.httpMetricsMiddleware());

// Custom metrics
metrics.incrementCounter('api_calls_total', {
  endpoint: '/users',
  method: 'GET'
});

// Metrics endpoint
app.get('/metrics', metricsEndpoint(metrics));
```

### Correlation ID Tracking

```typescript
import { correlationMiddleware, getCorrelationContext } from '@devxplatform/shared';

// Express middleware
app.use(correlationMiddleware({
  extractUserId: (req) => req.user?.id
}));

// Access correlation context
app.get('/api/data', (req, res) => {
  const context = getCorrelationContext();
  logger.info('API called', {
    correlationId: context?.correlationId,
    userId: context?.userId
  });
});
```

### Request/Response Logging

```typescript
import { requestLoggerMiddleware } from '@devxplatform/shared';

app.use(requestLoggerMiddleware({
  logger,
  logBody: true,
  logResponseBody: false,
  excludePaths: ['/health', '/metrics'],
  sensitiveFields: ['password', 'token']
}));
```

## 🔐 Security Modules

### JWT Authentication

```typescript
import { createJWTService, jwtAuthMiddleware, requireRole } from '@devxplatform/shared';

const jwtService = createJWTService({
  secret: process.env.JWT_SECRET,
  expiresIn: '15m',
  refreshExpiresIn: '7d',
  issuer: 'my-service'
});

// Generate tokens
const tokens = jwtService.generateTokenPair({
  userId: '123',
  email: 'user@example.com',
  roles: ['user', 'admin']
});

// Protect routes
app.use('/api', jwtAuthMiddleware(jwtService));

// Role-based access
app.get('/admin', 
  jwtAuthMiddleware(jwtService),
  requireRole('admin'),
  (req, res) => res.json({ message: 'Admin only' })
);
```

### API Key Authentication

```typescript
import { 
  createAPIKeyService, 
  apiKeyAuthMiddleware,
  InMemoryAPIKeyValidator 
} from '@devxplatform/shared';

const validator = new InMemoryAPIKeyValidator([
  {
    id: '1',
    name: 'Production API Key',
    key: 'sk_prod_123456',
    scopes: ['read', 'write'],
    rateLimit: 1000
  }
]);

const apiKeyService = createAPIKeyService(validator);

// Protect routes
app.use('/api/v1', apiKeyAuthMiddleware(apiKeyService));
```

### Rate Limiting

```typescript
import { rateLimiter, RedisRateLimitStore } from '@devxplatform/shared';
import Redis from 'ioredis';

const redis = new Redis();
const rateLimitStore = new RedisRateLimitStore(redis, 60000);

// Basic rate limiting
app.use('/api', rateLimiter(rateLimitStore, {
  windowMs: 60000,  // 1 minute
  max: 100,         // 100 requests per minute
  message: 'Too many requests'
}));

// User-specific rate limiting
app.use('/api', rateLimiter(rateLimitStore, {
  windowMs: 60000,
  max: 1000,
  keyGenerator: (req) => req.user?.id || req.ip
}));
```

### CORS Configuration

```typescript
import { cors, strictCORS, apiCORS } from '@devxplatform/shared';

// Development CORS (permissive)
app.use(cors({
  origin: true,
  credentials: true
}));

// Production CORS (strict)
app.use(strictCORS(['https://app.example.com', 'https://admin.example.com']));

// API-specific CORS
app.use('/api', apiCORS({
  origin: '*',
  credentials: false
}));
```

### Security Headers

```typescript
import { securityHeaders, defaultSecurityHeaders } from '@devxplatform/shared';

// Apply all recommended security headers
app.use(defaultSecurityHeaders());

// Custom configuration
app.use(securityHeaders({
  contentSecurityPolicy: {
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", 'https://cdn.example.com']
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### Input Validation

```typescript
import { validate, commonSchemas, preventXSS, preventSQLInjection } from '@devxplatform/shared';
import Joi from 'joi';
import { z } from 'zod';

// Joi validation
const userSchema = Joi.object({
  email: commonSchemas.joi.email.required(),
  password: commonSchemas.joi.password.required(),
  name: Joi.string().min(2).max(50)
});

app.post('/users',
  validate(userSchema, 'body'),
  async (req, res) => {
    // req.body is validated and sanitized
  }
);

// Zod validation
const loginSchema = z.object({
  email: commonSchemas.zod.email,
  password: commonSchemas.zod.password
});

app.post('/login',
  validate(loginSchema, 'body', { sanitize: true }),
  async (req, res) => {
    // req.body is validated and sanitized
  }
);

// Prevent XSS and SQL injection
app.use(preventXSS({ html: true }));
app.use(preventSQLInjection(['query', 'search']));
```

## 🚀 Integration Examples

### Express REST API

```typescript
import express from 'express';
import { 
  // Observability
  createLogger,
  createTracingService,
  createMetricsService,
  correlationMiddleware,
  requestLoggerMiddleware,
  
  // Security
  createJWTService,
  jwtAuthMiddleware,
  rateLimiter,
  RedisRateLimitStore,
  cors,
  apiSecurityHeaders,
  validate
} from '@devxplatform/shared';

const app = express();
const logger = createLogger('rest-api');

// Apply middleware stack
app.use(express.json());
app.use(apiSecurityHeaders());
app.use(cors());
app.use(correlationMiddleware());
app.use(requestLoggerMiddleware({ logger }));

// ... rest of implementation
```

### GraphQL API

```typescript
import { ApolloServer } from '@apollo/server';
import { 
  createLogger,
  getCorrelationContext,
  jwtAuthMiddleware 
} from '@devxplatform/shared';

const server = new ApolloServer({
  schema,
  plugins: [{
    async requestDidStart() {
      return {
        async willSendResponse(requestContext) {
          const context = getCorrelationContext();
          logger.info('GraphQL request', {
            query: requestContext.request.query,
            correlationId: context?.correlationId
          });
        }
      };
    }
  }]
});
```

### Next.js Application

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Add correlation ID
  const correlationId = crypto.randomUUID();
  response.headers.set('x-correlation-id', correlationId);
  
  return response;
}

// API route with auth
import { requireAuth } from '@/lib/auth';

export const GET = requireAuth(async (req) => {
  // Protected route logic
});
```

### Worker Service

```typescript
import { Worker } from 'bullmq';
import { 
  createLogger,
  createMetricsService,
  wrapWithCorrelationContext 
} from '@devxplatform/shared';

const worker = new Worker(
  'email-queue',
  wrapWithCorrelationContext(async (job) => {
    logger.info('Processing job', {
      jobId: job.id,
      correlationId: job.data.correlationId
    });
    
    // Process job...
  })
);
```

## 📊 Monitoring Best Practices

1. **Structured Logging**
   - Always include correlation IDs
   - Log at appropriate levels (info, warn, error)
   - Include relevant context (user ID, request ID, etc.)

2. **Tracing**
   - Create spans for important operations
   - Add relevant attributes to spans
   - Use consistent span naming

3. **Metrics**
   - Track business metrics, not just technical ones
   - Use appropriate metric types (counter, gauge, histogram)
   - Keep cardinality under control

4. **Correlation**
   - Propagate correlation IDs across service boundaries
   - Include correlation IDs in all logs and traces
   - Use correlation IDs for debugging distributed systems

## 🔒 Security Best Practices

1. **Authentication**
   - Use short-lived access tokens (15 minutes)
   - Implement refresh token rotation
   - Store tokens securely (httpOnly cookies)

2. **Rate Limiting**
   - Implement multiple rate limit tiers
   - Use user-specific limits for authenticated requests
   - Implement sliding window for better accuracy

3. **Input Validation**
   - Validate all inputs at the edge
   - Sanitize data to prevent XSS
   - Use parameterized queries to prevent SQL injection

4. **Headers**
   - Apply all security headers in production
   - Use strict CSP policies
   - Enable HSTS with preload

## 🛠️ Development Tips

- Use environment variables for all configuration
- Enable debug logging in development
- Use in-memory stores for local development
- Monitor performance impact of observability

## 📚 Further Reading

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)