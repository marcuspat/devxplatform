import { Router, Request, Response } from 'express';

export const productsRouter = Router();

// Example endpoint
productsRouter.get('/', (req: Request, res: Response) => {
  // TODO: Implement product listing
  res.json({
    data: [],
    message: 'Products endpoint - implement your business logic here',
  });
});