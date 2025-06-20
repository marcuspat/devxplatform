import winston from 'winston';
import { Request } from 'express';

export interface LogContext {
  correlationId?: string;
  userId?: string;
  requestId?: string;
  service?: string;
  [key: string]: any;
}

export interface Logger {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
}

class StructuredLogger implements Logger {
  private winston: winston.Logger;
  private serviceName: string;

  constructor(serviceName: string, options?: winston.LoggerOptions) {
    this.serviceName = serviceName;
    
    const defaultFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );

    this.winston = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: defaultFormat,
      defaultMeta: { service: serviceName },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      ],
      ...options
    });

    // Add file transport in production
    if (process.env.NODE_ENV === 'production') {
      this.winston.add(new winston.transports.File({
        filename: 'error.log',
        level: 'error'
      }));
      this.winston.add(new winston.transports.File({
        filename: 'combined.log'
      }));
    }
  }

  private formatContext(context?: LogContext): any {
    return {
      ...context,
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      environment: process.env.NODE_ENV || 'development'
    };
  }

  info(message: string, context?: LogContext): void {
    this.winston.info(message, this.formatContext(context));
  }

  warn(message: string, context?: LogContext): void {
    this.winston.warn(message, this.formatContext(context));
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext = {
      ...this.formatContext(context),
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : undefined
    };
    this.winston.error(message, errorContext);
  }

  debug(message: string, context?: LogContext): void {
    this.winston.debug(message, this.formatContext(context));
  }
}

// Factory function for creating loggers
export function createLogger(serviceName: string, options?: winston.LoggerOptions): Logger {
  return new StructuredLogger(serviceName, options);
}

// Extract correlation ID from request
export function getCorrelationId(req: Request): string {
  return (req.headers['x-correlation-id'] || 
          req.headers['x-request-id'] || 
          generateCorrelationId()) as string;
}

// Generate unique correlation ID
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}