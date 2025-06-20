import { EventEmitter } from 'events';
import { Logger } from 'winston';

export interface ShutdownHandler {
  name: string;
  handler: () => Promise<void>;
  timeout?: number;
  priority?: number;
}

export interface GracefulShutdownConfig {
  timeout?: number;
  logger?: Logger;
  signals?: NodeJS.Signals[];
  exitOnTimeout?: boolean;
  forceExitDelay?: number;
}

/**
 * Graceful shutdown manager for handling application termination
 */
export class GracefulShutdownManager extends EventEmitter {
  private handlers: ShutdownHandler[] = [];
  private isShuttingDown = false;
  private config: Required<GracefulShutdownConfig>;
  private shutdownPromise?: Promise<void>;

  constructor(config: GracefulShutdownConfig = {}) {
    super();
    this.config = {
      timeout: config.timeout || 30000,
      logger: config.logger!,
      signals: config.signals || ['SIGTERM', 'SIGINT', 'SIGUSR2'],
      exitOnTimeout: config.exitOnTimeout ?? true,
      forceExitDelay: config.forceExitDelay || 1000
    };

    this.setupSignalHandlers();
  }

  private setupSignalHandlers(): void {
    this.config.signals.forEach(signal => {
      process.once(signal, async () => {
        this.log('info', `Received ${signal}, starting graceful shutdown...`);
        await this.shutdown();
      });
    });

    // Handle uncaught errors
    process.once('uncaughtException', async (error) => {
      this.log('error', 'Uncaught exception, starting emergency shutdown', error);
      await this.shutdown(true);
    });

    process.once('unhandledRejection', async (reason) => {
      this.log('error', 'Unhandled rejection, starting emergency shutdown', reason);
      await this.shutdown(true);
    });
  }

  private log(level: string, message: string, meta?: any): void {
    if (this.config.logger) {
      this.config.logger.log(level, `[GracefulShutdown] ${message}`, meta);
    } else {
      console.log(`[GracefulShutdown] ${level}: ${message}`, meta || '');
    }
  }

  /**
   * Register a shutdown handler
   */
  register(handler: ShutdownHandler): void {
    if (this.isShuttingDown) {
      throw new Error('Cannot register handlers during shutdown');
    }

    this.handlers.push(handler);
    this.handlers.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    this.log('info', `Registered shutdown handler: ${handler.name}`);
  }

  /**
   * Unregister a shutdown handler
   */
  unregister(name: string): void {
    const index = this.handlers.findIndex(h => h.name === name);
    if (index !== -1) {
      this.handlers.splice(index, 1);
      this.log('info', `Unregistered shutdown handler: ${name}`);
    }
  }

  /**
   * Execute graceful shutdown
   */
  async shutdown(emergency = false): Promise<void> {
    if (this.shutdownPromise) {
      return this.shutdownPromise;
    }

    this.isShuttingDown = true;
    this.emit('shutdown:start');

    this.shutdownPromise = this.executeShutdown(emergency);
    return this.shutdownPromise;
  }

  private async executeShutdown(emergency: boolean): Promise<void> {
    const startTime = Date.now();
    const timeout = emergency ? this.config.timeout / 2 : this.config.timeout;

    try {
      // Execute all handlers with timeout
      await Promise.race([
        this.executeHandlers(),
        new Promise<void>((_, reject) => {
          setTimeout(() => reject(new Error('Shutdown timeout')), timeout);
        })
      ]);

      const duration = Date.now() - startTime;
      this.log('info', `Graceful shutdown completed in ${duration}ms`);
      this.emit('shutdown:complete', { duration });
      
      // Give a moment for logs to flush
      await new Promise(resolve => setTimeout(resolve, 100));
      
      process.exit(0);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.log('error', `Shutdown failed after ${duration}ms`, error);
      this.emit('shutdown:error', { error, duration });

      if (this.config.exitOnTimeout) {
        this.log('warn', `Force exiting in ${this.config.forceExitDelay}ms...`);
        setTimeout(() => process.exit(1), this.config.forceExitDelay);
      }
    }
  }

  private async executeHandlers(): Promise<void> {
    const results = await Promise.allSettled(
      this.handlers.map(async (handler) => {
        const startTime = Date.now();
        try {
          if (handler.timeout) {
            await Promise.race([
              handler.handler(),
              new Promise<void>((_, reject) => {
                setTimeout(() => reject(new Error(`Handler timeout: ${handler.name}`)), handler.timeout);
              })
            ]);
          } else {
            await handler.handler();
          }
          
          const duration = Date.now() - startTime;
          this.log('info', `Handler '${handler.name}' completed in ${duration}ms`);
          this.emit('handler:complete', { name: handler.name, duration });
        } catch (error) {
          const duration = Date.now() - startTime;
          this.log('error', `Handler '${handler.name}' failed after ${duration}ms`, error);
          this.emit('handler:error', { name: handler.name, error, duration });
          throw error;
        }
      })
    );

    // Check for failures
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      throw new Error(`${failures.length} shutdown handlers failed`);
    }
  }

  /**
   * Check if shutdown is in progress
   */
  isShuttingDownNow(): boolean {
    return this.isShuttingDown;
  }
}

/**
 * Global instance for convenience
 */
let globalManager: GracefulShutdownManager | null = null;

/**
 * Get or create global shutdown manager
 */
export function getGlobalShutdownManager(config?: GracefulShutdownConfig): GracefulShutdownManager {
  if (!globalManager) {
    globalManager = new GracefulShutdownManager(config);
  }
  return globalManager;
}

/**
 * Decorator for auto-registering shutdown handlers
 */
export function OnShutdown(name: string, options?: { timeout?: number; priority?: number }) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const manager = getGlobalShutdownManager();
    
    // Register on first import
    setImmediate(() => {
      manager.register({
        name,
        handler: async () => {
          const instance = new target.constructor();
          await instance[propertyKey]();
        },
        timeout: options?.timeout,
        priority: options?.priority
      });
    });
  };
}

/**
 * Utility function for registering simple shutdown handlers
 */
export function onShutdown(
  name: string,
  handler: () => Promise<void>,
  options?: { timeout?: number; priority?: number }
): void {
  const manager = getGlobalShutdownManager();
  manager.register({
    name,
    handler,
    timeout: options?.timeout,
    priority: options?.priority
  });
}