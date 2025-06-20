import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(StatusCodes.NOT_FOUND).json({
    error: {
      code: 'NOT_FOUND',
      message: `Resource not found: ${req.method} ${req.path}`,
    },
  });
}