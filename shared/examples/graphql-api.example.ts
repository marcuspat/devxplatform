import express from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { makeExecutableSchema } from '@graphql-tools/schema';
import Redis from 'ioredis';
import {
  // Observability
  createLogger,
  createTracingService,
  createMetricsService,
  correlationMiddleware,
  getCorrelationContext,
  
  // Security
  createJWTService,
  jwtAuthMiddleware,
  rateLimiter,
  RedisRateLimitStore,
  cors,
  securityHeaders,
  
  // Types
  Logger
} from '../index';

// GraphQL schema
const typeDefs = `
  type User {
    id: ID!
    email: String!
    name: String
    roles: [String!]!
  }

  type AuthPayload {
    token: String!
    refreshToken: String!
    user: User!
  }

  type Query {
    me: User
    users: [User!]!
  }

  type Mutation {
    login(email: String!, password: String!): AuthPayload!
    refreshToken(refreshToken: String!): AuthPayload!
  }
`;

// Initialize services
const logger = createLogger('graphql-api-service');
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379')
});

// Initialize tracing
const tracingService = createTracingService({
  serviceName: 'graphql-api-service',
  enableAutoInstrumentation: true
});

// Initialize metrics
const metricsService = createMetricsService({
  serviceName: 'graphql-api-service',
  customMetrics: [
    {
      name: 'graphql_queries_total',
      type: 'counter',
      help: 'Total number of GraphQL queries',
      labelNames: ['operation', 'operationName']
    },
    {
      name: 'graphql_errors_total',
      type: 'counter',
      help: 'Total number of GraphQL errors',
      labelNames: ['operation', 'errorType']
    },
    {
      name: 'graphql_field_resolution_time',
      type: 'histogram',
      help: 'GraphQL field resolution time',
      labelNames: ['parentType', 'fieldName'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
    }
  ]
});

// Initialize JWT service
const jwtService = createJWTService({
  secret: process.env.JWT_SECRET || 'your-secret-key',
  expiresIn: '15m',
  refreshExpiresIn: '7d',
  issuer: 'graphql-api-service'
});

// GraphQL context
interface GraphQLContext {
  user?: any;
  logger: Logger;
  correlationId?: string;
  metricsService: any;
}

// Resolvers
const resolvers = {
  Query: {
    me: async (_: any, __: any, context: GraphQLContext) => {
      if (!context.user) {
        throw new Error('Not authenticated');
      }
      
      context.logger.info('User fetched their profile', {
        userId: context.user.userId,
        correlationId: context.correlationId
      });

      return {
        id: context.user.userId,
        email: context.user.email,
        name: context.user.name,
        roles: context.user.roles
      };
    },

    users: async (_: any, __: any, context: GraphQLContext) => {
      if (!context.user || !context.user.roles.includes('admin')) {
        throw new Error('Not authorized');
      }

      // Simulate fetching users
      return [
        { id: '1', email: 'user1@example.com', name: 'User 1', roles: ['user'] },
        { id: '2', email: 'user2@example.com', name: 'User 2', roles: ['user', 'admin'] }
      ];
    }
  },

  Mutation: {
    login: async (_: any, args: { email: string; password: string }, context: GraphQLContext) => {
      const tracer = tracingService.getTracer();
      
      return tracer.startActiveSpan('login', async (span) => {
        try {
          // Simulate authentication
          const user = {
            userId: '123',
            email: args.email,
            name: 'Test User',
            roles: ['user']
          };

          const tokens = jwtService.generateTokenPair(user);

          context.logger.info('User logged in', {
            userId: user.userId,
            correlationId: context.correlationId
          });

          context.metricsService.incrementCounter('graphql_queries_total', {
            operation: 'mutation',
            operationName: 'login'
          });

          span.setStatus({ code: 1 }); // OK
          return {
            token: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            user: {
              id: user.userId,
              email: user.email,
              name: user.name,
              roles: user.roles
            }
          };
        } catch (error) {
          span.setStatus({ code: 2, message: (error as Error).message }); // ERROR
          throw error;
        } finally {
          span.end();
        }
      });
    },

    refreshToken: async (_: any, args: { refreshToken: string }, context: GraphQLContext) => {
      try {
        const tokens = await jwtService.refreshAccessToken(
          args.refreshToken,
          async (userId) => ({
            userId,
            email: 'user@example.com',
            name: 'Refreshed User',
            roles: ['user']
          })
        );

        return {
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user: {
            id: '123',
            email: 'user@example.com',
            name: 'Refreshed User',
            roles: ['user']
          }
        };
      } catch (error) {
        context.logger.error('Token refresh failed', error as Error, {
          correlationId: context.correlationId
        });
        throw new Error('Invalid refresh token');
      }
    }
  }
};

// Create executable schema
const schema = makeExecutableSchema({
  typeDefs,
  resolvers
});

// Create Apollo Server with plugins
const server = new ApolloServer({
  schema,
  plugins: [
    // Logging plugin
    {
      async requestDidStart() {
        return {
          async willSendResponse(requestContext) {
            const { response, request, contextValue } = requestContext;
            const context = contextValue as GraphQLContext;
            
            context.logger.info('GraphQL request completed', {
              query: request.query,
              variables: request.variables,
              operationName: request.operationName,
              correlationId: context.correlationId,
              errors: response.body.kind === 'single' ? response.body.singleResult.errors : undefined
            });
          }
        };
      }
    },
    // Metrics plugin
    {
      async requestDidStart() {
        const startTime = Date.now();
        return {
          async willSendResponse(requestContext) {
            const duration = Date.now() - startTime;
            const { response, request } = requestContext;
            const operationType = request.query?.trim().startsWith('mutation') ? 'mutation' : 'query';
            
            metricsService.observeHistogram('graphql_field_resolution_time', duration / 1000, {
              parentType: 'root',
              fieldName: request.operationName || 'anonymous'
            });

            if (response.body.kind === 'single' && response.body.singleResult.errors) {
              metricsService.incrementCounter('graphql_errors_total', {
                operation: operationType,
                errorType: 'execution'
              });
            }
          }
        };
      }
    }
  ]
});

// Initialize Express app
async function createApp() {
  const app = express();

  // Apply middleware
  app.use(express.json());
  app.use(securityHeaders());
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true
  }));
  app.use(correlationMiddleware());
  app.use(metricsService.httpMetricsMiddleware());

  // Rate limiting for GraphQL endpoint
  const rateLimitStore = new RedisRateLimitStore(redis, 60000);
  app.use('/graphql', rateLimiter(rateLimitStore, {
    windowMs: 60000,
    max: 100,
    message: 'Too many requests'
  }));

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Metrics endpoint
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', metricsService.getContentType());
    res.end(await metricsService.getMetrics());
  });

  // GraphQL endpoint with authentication
  app.use('/graphql',
    // Optional JWT authentication
    jwtAuthMiddleware(jwtService, {
      optional: true,
      excludePaths: []
    }),
    expressMiddleware(server, {
      context: async ({ req }) => {
        const correlationContext = getCorrelationContext();
        return {
          user: (req as any).user,
          logger,
          correlationId: correlationContext?.correlationId,
          metricsService
        };
      }
    })
  );

  return app;
}

// Start server
async function start() {
  try {
    await tracingService.start();
    await server.start();
    
    const app = await createApp();
    const port = process.env.PORT || 4000;
    
    app.listen(port, () => {
      logger.info(`GraphQL server ready at http://localhost:${port}/graphql`);
    });
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await server.stop();
  await tracingService.shutdown();
  redis.disconnect();
  process.exit(0);
});

start();