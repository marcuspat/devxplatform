import { Request, Response, NextFunction } from 'express';

export interface CORSOptions {
  origin?: boolean | string | string[] | ((origin: string, callback: (err: Error | null, allow?: boolean) => void) => void);
  methods?: string | string[];
  allowedHeaders?: string | string[];
  exposedHeaders?: string | string[];
  credentials?: boolean;
  maxAge?: number;
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
}

// Default CORS options
const defaultOptions: CORSOptions = {
  origin: '*',
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Correlation-Id', 'X-API-Key'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset', 'X-Correlation-Id', 'X-Request-Id'],
  credentials: true,
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// CORS middleware
export function cors(options: CORSOptions = {}) {
  const config = { ...defaultOptions, ...options };

  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin || '';
    
    // Handle origin
    if (config.origin === true || config.origin === '*') {
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (typeof config.origin === 'string') {
      res.setHeader('Access-Control-Allow-Origin', config.origin);
    } else if (Array.isArray(config.origin)) {
      if (config.origin.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
      }
    } else if (typeof config.origin === 'function') {
      config.origin(origin, (err, allow) => {
        if (err) {
          return next(err);
        }
        if (allow) {
          res.setHeader('Access-Control-Allow-Origin', origin);
          res.setHeader('Vary', 'Origin');
        }
      });
    }

    // Handle credentials
    if (config.credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // Handle exposed headers
    if (config.exposedHeaders) {
      const exposedHeaders = Array.isArray(config.exposedHeaders) 
        ? config.exposedHeaders.join(', ') 
        : config.exposedHeaders;
      res.setHeader('Access-Control-Expose-Headers', exposedHeaders);
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      // Handle allowed methods
      if (config.methods) {
        const methods = Array.isArray(config.methods) 
          ? config.methods.join(', ') 
          : config.methods;
        res.setHeader('Access-Control-Allow-Methods', methods);
      }

      // Handle allowed headers
      if (config.allowedHeaders) {
        const allowedHeaders = Array.isArray(config.allowedHeaders) 
          ? config.allowedHeaders.join(', ') 
          : config.allowedHeaders;
        res.setHeader('Access-Control-Allow-Headers', allowedHeaders);
      } else if (req.headers['access-control-request-headers']) {
        // Allow requested headers
        res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers']);
      }

      // Handle max age
      if (config.maxAge) {
        res.setHeader('Access-Control-Max-Age', config.maxAge.toString());
      }

      if (config.preflightContinue) {
        next();
      } else {
        res.status(config.optionsSuccessStatus || 204).end();
      }
    } else {
      next();
    }
  };
}

// Strict CORS for production
export function strictCORS(allowedOrigins: string[], additionalOptions?: Partial<CORSOptions>) {
  return cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    ...additionalOptions
  });
}

// Development CORS (permissive)
export function developmentCORS(additionalOptions?: Partial<CORSOptions>) {
  return cors({
    origin: true,
    credentials: true,
    ...additionalOptions
  });
}

// API-specific CORS
export function apiCORS(options?: Partial<CORSOptions>) {
  return cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Correlation-Id'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    credentials: false,
    ...options
  });
}