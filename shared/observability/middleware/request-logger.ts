import { Request, Response, NextFunction } from 'express';
import { Logger } from '../logging/logger';
import { getCorrelationContext } from './correlation';

export interface RequestLoggerOptions {
  logger: Logger;
  excludePaths?: string[];
  excludeHeaders?: string[];
  logBody?: boolean;
  logResponseBody?: boolean;
  maxBodyLength?: number;
  sensitiveFields?: string[];
}

// Default sensitive fields to redact
const DEFAULT_SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'api_key',
  'apiKey',
  'credit_card',
  'creditCard',
  'ssn',
  'pin'
];

// Redact sensitive data from objects
function redactSensitive(
  obj: any,
  sensitiveFields: string[] = DEFAULT_SENSITIVE_FIELDS
): any {
  if (!obj || typeof obj !== 'object') return obj;

  const result = Array.isArray(obj) ? [...obj] : { ...obj };

  for (const key in result) {
    const lowerKey = key.toLowerCase();
    if (sensitiveFields.some(field => lowerKey.includes(field.toLowerCase()))) {
      result[key] = '[REDACTED]';
    } else if (typeof result[key] === 'object') {
      result[key] = redactSensitive(result[key], sensitiveFields);
    }
  }

  return result;
}

// Truncate large strings
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '... (truncated)';
}

export function requestLoggerMiddleware(options: RequestLoggerOptions) {
  const {
    logger,
    excludePaths = ['/health', '/metrics'],
    excludeHeaders = ['cookie', 'authorization'],
    logBody = true,
    logResponseBody = false,
    maxBodyLength = 1000,
    sensitiveFields = DEFAULT_SENSITIVE_FIELDS
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip excluded paths
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    const startTime = Date.now();
    const correlationContext = getCorrelationContext();

    // Log request
    const requestLog = {
      type: 'request',
      method: req.method,
      path: req.path,
      query: redactSensitive(req.query, sensitiveFields),
      headers: Object.keys(req.headers).reduce((acc, key) => {
        if (!excludeHeaders.includes(key.toLowerCase())) {
          acc[key] = req.headers[key];
        }
        return acc;
      }, {} as any),
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      ...correlationContext
    };

    if (logBody && req.body && Object.keys(req.body).length > 0) {
      const bodyString = JSON.stringify(req.body);
      requestLog['body'] = redactSensitive(
        JSON.parse(truncate(bodyString, maxBodyLength)),
        sensitiveFields
      );
    }

    logger.info('Incoming request', requestLog);

    // Capture response
    const originalSend = res.send;
    const originalJson = res.json;
    let responseBody: any;

    res.send = function(data: any) {
      responseBody = data;
      return originalSend.call(this, data);
    };

    res.json = function(data: any) {
      responseBody = data;
      return originalJson.call(this, data);
    };

    // Log response
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const responseLog = {
        type: 'response',
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        contentLength: res.get('content-length'),
        ...correlationContext
      };

      if (logResponseBody && responseBody) {
        try {
          const bodyString = typeof responseBody === 'string' 
            ? responseBody 
            : JSON.stringify(responseBody);
          responseLog['body'] = redactSensitive(
            JSON.parse(truncate(bodyString, maxBodyLength)),
            sensitiveFields
          );
        } catch (e) {
          // If can't parse, just log as string
          responseLog['body'] = truncate(String(responseBody), maxBodyLength);
        }
      }

      if (res.statusCode >= 400) {
        logger.warn('Request completed with error', responseLog);
      } else {
        logger.info('Request completed', responseLog);
      }
    });

    // Log errors
    res.on('error', (error: Error) => {
      logger.error('Response error', error, {
        type: 'response_error',
        method: req.method,
        path: req.path,
        ...correlationContext
      });
    });

    next();
  };
}

// Simplified logging middleware for high-traffic endpoints
export function simpleRequestLogger(logger: Logger) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('Request', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration,
        ...getCorrelationContext()
      });
    });

    next();
  };
}