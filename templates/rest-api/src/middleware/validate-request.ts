import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { StatusCodes } from 'http-status-codes';
import { AppError } from './error-handler';

interface ValidationResult {
  body?: unknown;
  query?: unknown;
  params?: unknown;
}

export function validateRequest(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const validationObject = {
      body: req.body as unknown,
      query: req.query as unknown,
      params: req.params as unknown,
    };
    
    const { error, value } = schema.validate(validationObject, {
      abortEarly: false,
      stripUnknown: true,
    }) as { error?: Joi.ValidationError; value?: ValidationResult };
    
    if (error) {
      const details = error.details.reduce((acc, detail) => {
        const field = detail.path.join('.');
        // Use Object.assign to avoid dynamic property access
        return Object.assign(acc, { [field]: detail.message });
      }, {} as Record<string, string>);
      
      throw new AppError(
        'Validation failed',
        StatusCodes.BAD_REQUEST,
        'VALIDATION_ERROR',
        details
      );
    }
    
    // Replace request properties with validated values
    if (value) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
      req.body = value.body ?? req.body;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
      req.query = value.query ?? req.query;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
      req.params = value.params ?? req.params;
    }
    
    next();
  };
}