import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

// AsyncLocalStorage for correlation context
const correlationStorage = new AsyncLocalStorage<CorrelationContext>();

export interface CorrelationContext {
  correlationId: string;
  requestId: string;
  userId?: string;
  sessionId?: string;
  [key: string]: any;
}

// Express middleware for correlation ID
export function correlationMiddleware(options?: {
  headerName?: string;
  generateId?: () => string;
  extractUserId?: (req: Request) => string | undefined;
}) {
  const headerName = options?.headerName || 'x-correlation-id';
  const generateId = options?.generateId || (() => uuidv4());

  return (req: Request, res: Response, next: NextFunction) => {
    // Extract or generate correlation ID
    const correlationId = req.headers[headerName] as string || generateId();
    const requestId = generateId();

    // Extract user ID if function provided
    const userId = options?.extractUserId?.(req);

    // Create correlation context
    const context: CorrelationContext = {
      correlationId,
      requestId,
      userId,
      sessionId: (req as any).session?.id
    };

    // Store in request for easy access
    (req as any).correlationContext = context;

    // Set response headers
    res.setHeader('x-correlation-id', correlationId);
    res.setHeader('x-request-id', requestId);

    // Run the rest of the request in the correlation context
    correlationStorage.run(context, () => {
      next();
    });
  };
}

// Get current correlation context
export function getCorrelationContext(): CorrelationContext | undefined {
  return correlationStorage.getStore();
}

// Get correlation ID from current context
export function getCorrelationId(): string | undefined {
  return correlationStorage.getStore()?.correlationId;
}

// Add data to correlation context
export function addToCorrelationContext(data: Record<string, any>): void {
  const context = correlationStorage.getStore();
  if (context) {
    Object.assign(context, data);
  }
}

// Axios interceptor for propagating correlation ID
export function createAxiosCorrelationInterceptor() {
  return {
    request: (config: any) => {
      const context = getCorrelationContext();
      if (context) {
        config.headers = config.headers || {};
        config.headers['x-correlation-id'] = context.correlationId;
        config.headers['x-request-id'] = context.requestId;
        if (context.userId) {
          config.headers['x-user-id'] = context.userId;
        }
      }
      return config;
    }
  };
}

// Helper for logging with correlation context
export function withCorrelationContext(data: any): any {
  const context = getCorrelationContext();
  if (context) {
    return {
      ...data,
      correlationId: context.correlationId,
      requestId: context.requestId,
      userId: context.userId,
      sessionId: context.sessionId
    };
  }
  return data;
}

// Wrap async functions to preserve correlation context
export function wrapWithCorrelationContext<T extends (...args: any[]) => any>(
  fn: T
): T {
  return ((...args: Parameters<T>) => {
    const context = getCorrelationContext();
    if (context) {
      return correlationStorage.run(context, () => fn(...args));
    }
    return fn(...args);
  }) as T;
}