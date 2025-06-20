import * as grpc from '@grpc/grpc-js';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';

// Methods that don't require authentication
const PUBLIC_METHODS = [
  '/health.Health/Check',
  '/health.Health/Watch',
  '/user.UserService/CreateUser', // Allow user registration
];

// Admin-only methods
const ADMIN_METHODS = [
  '/user.UserService/DeleteUser',
];

interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

export const authInterceptor: grpc.ServerInterceptor = (call, callback, next) => {
  const methodName = call.getPath();
  
  // Skip authentication for public methods
  if (PUBLIC_METHODS.includes(methodName)) {
    return next(call, callback);
  }

  try {
    // Extract token from metadata
    const authorization = call.metadata.get('authorization')[0] as string;
    
    if (!authorization) {
      return callback({
        code: grpc.status.UNAUTHENTICATED,
        message: 'No authorization token provided',
      });
    }

    // Parse Bearer token
    const token = authorization.replace('Bearer ', '');
    if (!token) {
      return callback({
        code: grpc.status.UNAUTHENTICATED,
        message: 'Invalid authorization format',
      });
    }

    // Verify JWT token
    const payload = jwt.verify(token, config.auth.jwtSecret) as TokenPayload;
    
    // Check admin permissions
    if (ADMIN_METHODS.includes(methodName) && payload.role !== 'admin') {
      return callback({
        code: grpc.status.PERMISSION_DENIED,
        message: 'Insufficient permissions',
      });
    }

    // Add user info to call metadata for use in service methods
    call.metadata.set('user-id', payload.id);
    call.metadata.set('user-email', payload.email);
    call.metadata.set('user-role', payload.role);

    const requestId = call.metadata.get('x-request-id')[0] as string;
    logger.debug({
      requestId,
      method: methodName,
      user: {
        id: payload.id,
        email: payload.email,
        role: payload.role,
      },
      message: 'Authentication successful',
    });

    next(call, callback);
  } catch (error) {
    const requestId = call.metadata.get('x-request-id')[0] as string;
    logger.warn({
      requestId,
      method: methodName,
      error: error instanceof Error ? error.message : 'Unknown auth error',
      message: 'Authentication failed',
    });

    if (error instanceof jwt.JsonWebTokenError) {
      callback({
        code: grpc.status.UNAUTHENTICATED,
        message: 'Invalid token',
      });
    } else if (error instanceof jwt.TokenExpiredError) {
      callback({
        code: grpc.status.UNAUTHENTICATED,
        message: 'Token expired',
      });
    } else {
      callback({
        code: grpc.status.INTERNAL,
        message: 'Authentication error',
      });
    }
  }
};