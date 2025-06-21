import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export const loggingInterceptor = (call: any, callback: any, next: any) => {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  // Extract method name
  const methodName = call.getPath();
  const metadata = call.metadata;
  
  // Log request
  logger.info({
    type: 'grpc_request',
    requestId,
    method: methodName,
    peer: call.getPeer(),
    metadata: metadata.getMap(),
  });

  // Wrap callback to log response
  const wrappedCallback = (error: any, value?: any) => {
    const duration = Date.now() - startTime;
    
    if (error) {
      logger.error({
        type: 'grpc_response',
        requestId,
        method: methodName,
        duration,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
    } else {
      logger.info({
        type: 'grpc_response',
        requestId,
        method: methodName,
        duration,
        status: 'success',
      });
    }
    
    callback(error, value);
  };

  // Store request ID in call metadata for other interceptors
  call.metadata.set('x-request-id', requestId);

  next(call, wrappedCallback);
};