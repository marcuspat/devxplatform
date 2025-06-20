import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { StatusCodes } from 'http-status-codes';
import { AppError } from './error-handler';

export function validateRequest(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const validationObject = {
      body: req.body,
      query: req.query,
      params: req.params,
    };
    
    const { error, value } = schema.validate(validationObject, {
      abortEarly: false,
      stripUnknown: true,
    });
    
    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      
      throw new AppError(
        'Validation failed',
        StatusCodes.BAD_REQUEST,
        'VALIDATION_ERROR',
        details
      );
    }
    
    // Replace request properties with validated values
    req.body = value.body || req.body;
    req.query = value.query || req.query;
    req.params = value.params || req.params;
    
    next();
  };
}