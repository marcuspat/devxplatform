import express from 'express';
import Redis from 'ioredis';
import {
  // Observability
  createLogger,
  createTracingService,
  createMetricsService,
  tracingMiddleware,
  correlationMiddleware,
  requestLoggerMiddleware,
  metricsEndpoint,
  
  // Security
  createJWTService,
  jwtAuthMiddleware,
  createAPIKeyService,
  apiKeyAuthMiddleware,
  InMemoryAPIKeyValidator,
  rateLimiter,
  RedisRateLimitStore,
  cors,
  apiSecurityHeaders,
  validate,
  commonSchemas,
  preventXSS,
  
  // Types
  APIKeyInfo
} from '../index';

// Initialize Express app
const app = express();

// Initialize services
const logger = createLogger('rest-api-service');
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379')
});

// Initialize tracing
const tracingService = createTracingService({
  serviceName: 'rest-api-service',
  jaegerEndpoint: process.env.JAEGER_ENDPOINT
});

// Initialize metrics
const metricsService = createMetricsService({
  serviceName: 'rest-api-service',
  customMetrics: [
    {
      name: 'api_calls_total',
      type: 'counter',
      help: 'Total number of API calls',
      labelNames: ['endpoint', 'method']
    },
    {
      name: 'api_response_time',
      type: 'histogram',
      help: 'API response time in seconds',
      labelNames: ['endpoint', 'method'],
      buckets: [0.1, 0.5, 1, 2, 5]
    }
  ]
});

// Initialize JWT service
const jwtService = createJWTService({
  secret: process.env.JWT_SECRET || 'your-secret-key',
  expiresIn: '15m',
  refreshExpiresIn: '7d',
  issuer: 'rest-api-service'
});

// Initialize API key service
const apiKeyValidator = new InMemoryAPIKeyValidator([
  {
    id: '1',
    name: 'Test API Key',
    key: 'sk_test_123456789',
    scopes: ['read', 'write'],
    rateLimit: 1000
  }
]);

const apiKeyService = createAPIKeyService(apiKeyValidator, {
  headerName: 'x-api-key'
}, logger);

// Apply middleware in correct order
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security headers
app.use(apiSecurityHeaders());

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

// Correlation ID
app.use(correlationMiddleware({
  extractUserId: (req) => (req as any).user?.userId
}));

// Request logging
app.use(requestLoggerMiddleware({
  logger,
  logBody: true,
  excludePaths: ['/health', '/metrics']
}));

// Tracing
app.use(tracingMiddleware('rest-api-service'));

// Metrics collection
app.use(metricsService.httpMetricsMiddleware());

// XSS prevention
app.use(preventXSS());

// Rate limiting
const rateLimitStore = new RedisRateLimitStore(redis, 60000);
app.use('/api', rateLimiter(rateLimitStore, {
  windowMs: 60000,
  max: 100,
  message: 'Too many requests'
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Metrics endpoint
app.get('/metrics', metricsEndpoint(metricsService));

// Public endpoints
app.post('/auth/login', 
  validate(
    commonSchemas.joi.email.required().label('email'),
    'body'
  ),
  async (req, res) => {
    try {
      // Simulate user authentication
      const user = {
        userId: '123',
        email: req.body.email,
        roles: ['user'],
        permissions: ['read']
      };

      const tokens = jwtService.generateTokenPair(user);
      
      logger.info('User logged in', { userId: user.userId });
      
      res.json({
        success: true,
        tokens
      });
    } catch (error) {
      logger.error('Login failed', error as Error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// JWT protected endpoints
app.get('/api/user/profile',
  jwtAuthMiddleware(jwtService),
  (req, res) => {
    const user = (req as any).user;
    res.json({
      userId: user.userId,
      email: user.email,
      roles: user.roles
    });
  }
);

// API key protected endpoints
app.get('/api/data',
  apiKeyAuthMiddleware(apiKeyService),
  async (req, res) => {
    const apiKey = (req as any).apiKey;
    
    // Track API usage
    metricsService.incrementCounter('api_calls_total', {
      endpoint: '/api/data',
      method: 'GET'
    });

    res.json({
      data: 'Protected data',
      apiKeyId: apiKey.id,
      scopes: apiKey.scopes
    });
  }
);

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', err, {
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    error: 'Internal server error',
    correlationId: (req as any).correlationContext?.correlationId
  });
});

// Start server
async function start() {
  try {
    // Start tracing
    await tracingService.start();

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      logger.info(`Server started on port ${port}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await tracingService.shutdown();
  redis.disconnect();
  process.exit(0);
});

start();