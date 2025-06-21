import { Router } from 'express';
import { usersRouter } from './users';
import { productsRouter } from './products';

export const apiRouter = Router();

// API versioning
const v1Router = Router();

// Mount route modules
v1Router.use('/users', usersRouter);
v1Router.use('/products', productsRouter);

// Mount versioned API
apiRouter.use('/v1', v1Router);

// API root endpoint
apiRouter.get('/', (_req, res) => {
  res.json({
    message: 'REST API Template',
    version: 'v1',
    endpoints: {
      users: '/api/v1/users',
      products: '/api/v1/products',
      health: '/health',
      documentation: '/api-docs',
    },
  });
});