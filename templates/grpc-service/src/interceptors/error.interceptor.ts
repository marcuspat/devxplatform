import * as grpc from '@grpc/grpc-js';
import { logger } from '../utils/logger';
import { config } from '../config';

export const errorInterceptor = (call: any, callback: any, next: any) => {
  const wrappedCallback = (error: any, value?: any) => {
    if (error) {
      const requestId = call.metadata.get('x-request-id')[0] as string;
      
      // Log error details
      logger.error({
        requestId,
        method: call.getPath(),
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          stack: error.stack,
        },
      });

      // Sanitize error for production
      if (config.isProduction) {
        // Don't expose internal error details in production
        const sanitizedError: grpc.ServiceError = {
          code: error.code,
          message: getSanitizedErrorMessage(error),
          name: error.name,
          details: getSanitizedErrorMessage(error),
          metadata: new grpc.Metadata(),
        };
        
        callback(sanitizedError);
      } else {
        callback(error);
      }
    } else {
      callback(null, value);
    }
  };

  try {
    next(call, wrappedCallback);
  } catch (uncaughtError) {
    // Handle uncaught errors in the service implementation
    logger.error({
      method: call.getPath(),
      uncaughtError,
    });

    const serviceError: grpc.ServiceError = {
      code: grpc.status.INTERNAL,
      message: config.isProduction 
        ? 'Internal server error' 
        : `Uncaught error: ${uncaughtError}`,
      name: 'InternalError',
      details: config.isProduction 
        ? 'Internal server error' 
        : `Uncaught error: ${uncaughtError}`,
      metadata: new grpc.Metadata(),
    };

    callback(serviceError);
  }
};

function getSanitizedErrorMessage(error: grpc.ServiceError): string {
  // Map internal errors to user-friendly messages
  switch (error.code) {
    case grpc.status.INVALID_ARGUMENT:
    case grpc.status.ALREADY_EXISTS:
    case grpc.status.NOT_FOUND:
    case grpc.status.PERMISSION_DENIED:
    case grpc.status.UNAUTHENTICATED:
      return error.message; // These are safe to expose
    
    case grpc.status.INTERNAL:
    case grpc.status.UNKNOWN:
    case grpc.status.DATA_LOSS:
    default:
      return 'An internal error occurred';
  }
}