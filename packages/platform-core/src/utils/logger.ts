import winston from 'winston';
import chalk from 'chalk';

import type { Logger } from '../types/index.js';

const { combine, timestamp, printf, colorize } = winston.format;

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${chalk.gray(timestamp)} ${level}: ${message}`;
  
  if (Object.keys(metadata).length > 0) {
    msg += ` ${chalk.gray(JSON.stringify(metadata))}`;
  }
  
  return msg;
});

export function createLogger(options?: {
  level?: string;
  file?: string;
  console?: boolean;
}): Logger {
  const transports: winston.transport[] = [];
  
  // Console transport
  if (options?.console !== false) {
    transports.push(
      new winston.transports.Console({
        format: combine(
          colorize({ all: true }),
          timestamp({ format: 'HH:mm:ss' }),
          consoleFormat,
        ),
      }),
    );
  }
  
  // File transport
  if (options?.file) {
    transports.push(
      new winston.transports.File({
        filename: options.file,
        format: combine(
          timestamp(),
          winston.format.json(),
        ),
      }),
    );
  }
  
  const winstonLogger = winston.createLogger({
    level: options?.level || 'info',
    transports,
  });
  
  // Create a Logger implementation
  return {
    debug: (message: string, ...args: unknown[]): void => {
      winstonLogger.debug(message, ...args);
    },
    info: (message: string, ...args: unknown[]): void => {
      winstonLogger.info(message, ...args);
    },
    warn: (message: string, ...args: unknown[]): void => {
      winstonLogger.warn(message, ...args);
    },
    error: (message: string, ...args: unknown[]): void => {
      winstonLogger.error(message, ...args);
    },
  };
}

export class ConsoleLogger implements Logger {
  constructor(private readonly prefix?: string) {}
  
  private format(level: string, message: string, ...args: unknown[]): void {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const prefix = this.prefix ? `[${this.prefix}] ` : '';
    
    console.log(`${chalk.gray(timestamp)} ${level}: ${prefix}${message}`, ...args);
  }
  
  debug(message: string, ...args: unknown[]): void {
    this.format(chalk.blue('DEBUG'), message, ...args);
  }
  
  info(message: string, ...args: unknown[]): void {
    this.format(chalk.green('INFO'), message, ...args);
  }
  
  warn(message: string, ...args: unknown[]): void {
    this.format(chalk.yellow('WARN'), message, ...args);
  }
  
  error(message: string, ...args: unknown[]): void {
    this.format(chalk.red('ERROR'), message, ...args);
  }
}