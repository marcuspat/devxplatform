import * as grpc from '@grpc/grpc-js';
import { logger } from './utils/logger';
import { config } from './config';
import { UserServiceImplementation } from './services/user.service';
import { HealthServiceImplementation } from './services/health.service';
// import { loggingInterceptor } from './interceptors/logging.interceptor';
// import { errorInterceptor } from './interceptors/error.interceptor';
// import { authInterceptor } from './interceptors/auth.interceptor';
// import { rateLimitInterceptor } from './interceptors/rate-limit.interceptor';

// Import generated gRPC service definitions
import { UserServiceService } from './generated/user_grpc_pb';
import { HealthService } from './generated/health_grpc_pb';

export function createServer(): grpc.Server {
  const server = new grpc.Server({
    'grpc.max_receive_message_length': config.grpc.maxReceiveMessageLength,
    'grpc.max_send_message_length': config.grpc.maxSendMessageLength,
    'grpc.keepalive_time_ms': config.grpc.keepaliveTimeMs,
    'grpc.keepalive_timeout_ms': config.grpc.keepaliveTimeoutMs,
    'grpc.keepalive_permit_without_calls': config.grpc.keepalivePermitWithoutCalls,
    'grpc.max_concurrent_streams': config.grpc.maxConcurrentStreams,
  });

  // Create interceptors chain
  const _interceptors: grpc.ServerInterceptor[] = [
    // loggingInterceptor,
    // errorInterceptor,
    // rateLimitInterceptor,
    // authInterceptor,
  ];

  // Add services with interceptors
  server.addService(
    UserServiceService,
    new UserServiceImplementation() as any
  );

  server.addService(
    HealthService,
    new HealthServiceImplementation() as any
  );

  logger.info('gRPC server initialized successfully');
  return server;
}

// Helper to wrap service methods with interceptors
function _wrapServiceWithInterceptors(
  service: any,
  interceptors: grpc.ServerInterceptor[]
): any {
  const wrappedService: any = {};
  
  for (const methodName in service) {
    if (typeof service[methodName] === 'function') {
      wrappedService[methodName] = (call: any, callback: any) => {
        // Apply interceptors in reverse order
        let handler = service[methodName].bind(service);
        
        for (let i = interceptors.length - 1; i >= 0; i--) {
          const interceptor = interceptors[i];
          const _previousHandler = handler;
          handler = (call: any, callback: any) => {
            interceptor(call, callback);
          };
        }
        
        handler(call, callback);
      };
    }
  }
  
  return wrappedService;
}