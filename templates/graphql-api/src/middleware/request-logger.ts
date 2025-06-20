import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { httpLogger } from '../utils/logger';

export interface RequestWithId extends Request {
  id?: string;
}

export function requestLogger(
  req: RequestWithId,
  res: Response,
  next: NextFunction
): void {
  // Skip GraphQL introspection queries in production
  if (req.body?.operationName === 'IntrospectionQuery') {
    return next();
  }

  // Assign request ID
  req.id = req.headers['x-request-id'] as string || uuidv4();
  res.setHeader('X-Request-ID', req.id);

  const startTime = Date.now();

  // Log request (excluding GraphQL queries which are logged separately)
  if (req.path !== '/graphql') {
    httpLogger.info({
      type: 'request',
      requestId: req.id,
      method: req.method,
      url: req.url,
      query: req.query,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // Log response
  const originalSend = res.send;
  res.send = function (data: any) {
    res.send = originalSend;
    
    const duration = Date.now() - startTime;
    
    if (req.path !== '/graphql') {
      httpLogger.info({
        type: 'response',
        requestId: req.id,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        contentLength: res.get('content-length'),
      });
    }

    return res.send(data);
  };

  next();
}