import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../utils/logger';
import { config } from '../config';
import { v4 as uuidv4 } from 'uuid';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
  isOperational?: boolean;
}

export class AppError extends Error implements ApiError {
  constructor(
    public message: string,
    public statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR,
    public code?: string,
    public details?: any,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errorId = uuidv4();
  const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  const isOperational = err.isOperational ?? false;

  // Log error
  logger.error({
    errorId,
    message: err.message,
    statusCode,
    code: err.code,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    headers: req.headers,
    body: req.body,
    isOperational,
  });

  // Handle Multer errors
  if (err.message && err.message.includes('File type')) {
    res.status(StatusCodes.BAD_REQUEST).json({
      error: {
        id: errorId,
        code: 'INVALID_FILE_TYPE',
        message: err.message,
      },
    });
    return;
  }

  // Handle file size errors
  if (err.message && err.message.includes('File too large')) {
    res.status(StatusCodes.REQUEST_TOO_LONG).json({
      error: {
        id: errorId,
        code: 'FILE_TOO_LARGE',
        message: 'File size exceeds the maximum allowed limit',
      },
    });
    return;
  }

  // Don't leak error details in production
  const response = {
    error: {
      id: errorId,
      code: err.code || 'INTERNAL_ERROR',
      message: config.isProduction && !isOperational 
        ? 'An error occurred processing your request' 
        : err.message,
      ...(config.isDevelopment && { 
        details: err.details,
        stack: err.stack 
      }),
    },
  };

  res.status(statusCode).json(response);
}