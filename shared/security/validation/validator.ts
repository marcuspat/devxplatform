import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { z, ZodError, ZodSchema } from 'zod';
import xss from 'xss';
import DOMPurify from 'isomorphic-dompurify';

export type ValidationSchema = Joi.Schema | ZodSchema;
export type ValidationTarget = 'body' | 'query' | 'params' | 'headers';

export interface ValidationOptions {
  stripUnknown?: boolean;
  abortEarly?: boolean;
  sanitize?: boolean;
  sanitizeHtml?: boolean;
}

// Validation error class
export class ValidationError extends Error {
  public details: any[];
  public statusCode: number = 400;

  constructor(message: string, details: any[]) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

// Sanitization utilities
export const sanitizers = {
  // Basic XSS sanitization
  xss: (value: any): any => {
    if (typeof value === 'string') {
      return xss(value);
    }
    if (typeof value === 'object' && value !== null) {
      const result: any = Array.isArray(value) ? [] : {};
      for (const key in value) {
        result[key] = sanitizers.xss(value[key]);
      }
      return result;
    }
    return value;
  },

  // HTML sanitization
  html: (value: any): any => {
    if (typeof value === 'string') {
      return DOMPurify.sanitize(value);
    }
    if (typeof value === 'object' && value !== null) {
      const result: any = Array.isArray(value) ? [] : {};
      for (const key in value) {
        result[key] = sanitizers.html(value[key]);
      }
      return result;
    }
    return value;
  },

  // SQL injection prevention (escape quotes)
  sql: (value: any): any => {
    if (typeof value === 'string') {
      return value.replace(/['";\\]/g, '\\$&');
    }
    return value;
  },

  // Trim whitespace
  trim: (value: any): any => {
    if (typeof value === 'string') {
      return value.trim();
    }
    if (typeof value === 'object' && value !== null) {
      const result: any = Array.isArray(value) ? [] : {};
      for (const key in value) {
        result[key] = sanitizers.trim(value[key]);
      }
      return result;
    }
    return value;
  }
};

// Validation middleware factory
export function validate(
  schema: ValidationSchema,
  target: ValidationTarget = 'body',
  options: ValidationOptions = {}
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[target];
      let validated: any;

      // Joi validation
      if ('validate' in schema) {
        const joiOptions: Joi.ValidationOptions = {
          abortEarly: options.abortEarly ?? false,
          stripUnknown: options.stripUnknown ?? true,
          convert: true
        };

        const result = schema.validate(data, joiOptions);
        
        if (result.error) {
          const details = result.error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            type: detail.type
          }));
          
          throw new ValidationError('Validation failed', details);
        }

        validated = result.value;
      }
      // Zod validation
      else if ('parse' in schema) {
        try {
          validated = await schema.parseAsync(data);
        } catch (error) {
          if (error instanceof ZodError) {
            const details = error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              type: err.code
            }));
            
            throw new ValidationError('Validation failed', details);
          }
          throw error;
        }
      }
      else {
        throw new Error('Invalid validation schema');
      }

      // Apply sanitization if requested
      if (options.sanitize) {
        validated = sanitizers.xss(validated);
        validated = sanitizers.trim(validated);
      }

      if (options.sanitizeHtml) {
        validated = sanitizers.html(validated);
      }

      // Replace the request data with validated data
      req[target] = validated;

      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(error.statusCode).json({
          error: error.message,
          details: error.details
        });
      }

      return res.status(500).json({
        error: 'Internal validation error'
      });
    }
  };
}

// Common validation schemas
export const commonSchemas = {
  // Joi schemas
  joi: {
    id: Joi.string().alphanum().length(24),
    uuid: Joi.string().uuid(),
    email: Joi.string().email().lowercase().trim(),
    password: Joi.string().min(8).max(128),
    username: Joi.string().alphanum().min(3).max(30),
    url: Joi.string().uri(),
    date: Joi.date().iso(),
    pagination: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      sort: Joi.string().valid('asc', 'desc').default('desc'),
      sortBy: Joi.string()
    })
  },

  // Zod schemas
  zod: {
    id: z.string().regex(/^[a-zA-Z0-9]{24}$/),
    uuid: z.string().uuid(),
    email: z.string().email().toLowerCase().trim(),
    password: z.string().min(8).max(128),
    username: z.string().regex(/^[a-zA-Z0-9]{3,30}$/),
    url: z.string().url(),
    date: z.string().datetime(),
    pagination: z.object({
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(20),
      sort: z.enum(['asc', 'desc']).default('desc'),
      sortBy: z.string().optional()
    })
  }
};

// Schema builders for common patterns
export const schemaBuilders = {
  // Create CRUD schemas
  crud: (resourceSchema: Joi.Schema | ZodSchema) => {
    if ('validate' in resourceSchema) {
      return {
        create: resourceSchema,
        update: resourceSchema.fork([], (schema) => schema.optional()),
        patch: resourceSchema.fork([], (schema) => schema.optional())
      };
    } else {
      return {
        create: resourceSchema,
        update: resourceSchema.partial(),
        patch: resourceSchema.partial()
      };
    }
  },

  // Add pagination to list schemas
  withPagination: (querySchema?: Joi.Schema | ZodSchema) => {
    if (!querySchema) {
      return commonSchemas.joi.pagination;
    }

    if ('validate' in querySchema) {
      return querySchema.concat(commonSchemas.joi.pagination);
    } else {
      return querySchema.merge(commonSchemas.zod.pagination);
    }
  }
};

// SQL injection prevention middleware
export function preventSQLInjection(fields: string[] = []) {
  return (req: Request, res: Response, next: NextFunction) => {
    const targets: ValidationTarget[] = ['body', 'query', 'params'];
    
    for (const target of targets) {
      const data = req[target];
      if (data && typeof data === 'object') {
        for (const key in data) {
          if (fields.length === 0 || fields.includes(key)) {
            data[key] = sanitizers.sql(data[key]);
          }
        }
      }
    }

    next();
  };
}

// XSS prevention middleware
export function preventXSS(options: { html?: boolean } = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.body) {
      req.body = options.html 
        ? sanitizers.html(req.body)
        : sanitizers.xss(req.body);
    }

    if (req.query) {
      req.query = sanitizers.xss(req.query);
    }

    next();
  };
}