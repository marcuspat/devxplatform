import { Router, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { asyncHandler } from '../../utils/async-handler';

export const productsRouter = Router();

// Example endpoint
productsRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  // TODO: Implement product listing
  res.json({
    data: [],
    message: 'Products endpoint - implement your business logic here',
  });
}));