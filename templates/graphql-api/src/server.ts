import express, { Express } from 'express';
import { ApolloServer } from 'apollo-server-express';
import { buildSchema } from 'type-graphql';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import depthLimit from 'graphql-depth-limit';
import costAnalysis from 'graphql-query-complexity';
import { Server } from 'http';

import { config } from './config';
import { logger } from './utils/logger';
import { requestLogger } from './middleware/request-logger';
import { healthRouter } from './routes/health';
import { authChecker } from './auth/auth-checker';
import { Context } from './types/context';
import { createContext } from './utils/context';

// Import resolvers
import { UserResolver } from './resolvers/user.resolver';
import { ProductResolver } from './resolvers/product.resolver';

export async function createServer(): Promise<{ app: Express; httpServer: Server }> {
  const app = express();

  // Security middleware (with GraphQL-specific CSP)
  app.use(
    helmet({
      contentSecurityPolicy: config.isProduction
        ? undefined
        : {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
              imgSrc: ["'self'", "data:", "https:"],
            },
          },
    })
  );
  
  app.use(cors(config.cors));
  app.use(compression());

  // Rate limiting for non-GraphQL endpoints
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/graphql',
  });
  app.use(limiter);

  // Body parsing
  app.use(express.json({ limit: config.bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: config.bodyLimit }));

  // Request logging
  app.use(requestLogger);

  // Health checks
  app.use('/health', healthRouter);

  // Build GraphQL schema
  const schema = await buildSchema({
    resolvers: [UserResolver, ProductResolver],
    authChecker,
    validate: true,
    emitSchemaFile: config.isDevelopment
      ? {
          path: './schema.graphql',
          commentDescriptions: true,
          sortedSchema: true,
        }
      : false,
  });

  // Create Apollo Server
  const apolloServer = new ApolloServer({
    schema,
    context: createContext,
    introspection: !config.isProduction,
    plugins: [
      {
        requestDidStart() {
          return {
            willSendResponse(requestContext) {
              const { request, response } = requestContext;
              logger.info({
                type: 'graphql',
                query: request.query,
                variables: request.variables,
                operationName: request.operationName,
                status: response.errors ? 'error' : 'success',
                errors: response.errors,
              });
            },
          };
        },
      },
    ],
    validationRules: [
      depthLimit(config.graphql.maxDepth),
      costAnalysis({
        maximumCost: config.graphql.maxComplexity,
        defaultCost: 1,
        scalarCost: 1,
        objectCost: 2,
        listFactor: 10,
        introspectionCost: 1000,
        createError: (max, actual) => {
          return new Error(
            `Query exceeded maximum complexity of ${max}. Actual complexity: ${actual}`
          );
        },
      }),
    ],
    formatError: (err) => {
      // Log errors
      logger.error({
        message: err.message,
        locations: err.locations,
        path: err.path,
        extensions: err.extensions,
      });

      // Don't expose internal errors in production
      if (config.isProduction && !err.extensions?.code?.startsWith('GRAPHQL_')) {
        return new Error('Internal server error');
      }

      return err;
    },
  });

  // Start Apollo Server
  await apolloServer.start();

  // Apply Apollo middleware
  apolloServer.applyMiddleware({
    app,
    path: '/graphql',
    cors: false, // Using Express CORS
  });

  const httpServer = app.listen({ port: 0 }); // Port 0 to let OS assign

  logger.info('GraphQL server initialized successfully');
  
  return { app, httpServer };
}