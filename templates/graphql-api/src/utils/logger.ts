import winston from 'winston';
import { config } from '../config';

const formats = {
  development: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
      return `${timestamp} [${level}]: ${message} ${metaStr}`;
    })
  ),
  
  production: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
};

export const logger = winston.createLogger({
  level: config.logging.level,
  format: formats[config.isProduction ? 'production' : 'development'],
  defaultMeta: {
    service: 'graphql-api',
    environment: config.env,
  },
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
  exitOnError: false,
});

// Create a child logger for HTTP requests
export const httpLogger = logger.child({ type: 'http' });