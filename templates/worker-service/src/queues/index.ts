import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';
import { config } from '../config';

// Job type definitions
export interface EmailJobData {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  template?: string;
  variables?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    path: string;
  }>;
}

export interface FileJobData {
  type: 'image' | 'document' | 'video';
  inputPath: string;
  outputPath?: string;
  options?: {
    resize?: { width: number; height: number };
    format?: string;
    quality?: number;
  };
}

export interface ReportJobData {
  type: 'user-activity' | 'sales' | 'analytics';
  userId?: string;
  dateRange: {
    start: string;
    end: string;
  };
  format: 'pdf' | 'csv' | 'excel';
  email?: string;
}

export interface CleanupJobData {
  type: 'files' | 'logs' | 'database';
  olderThan: string; // ISO date string
  dryRun?: boolean;
}

export interface WebhookJobData {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  payload?: any;
  retryCount?: number;
}

// Create queues
export const emailQueue = new Queue<EmailJobData>('email', {
  connection: redisConnection,
  defaultJobOptions: config.queue.defaultJobOptions,
});

export const fileQueue = new Queue<FileJobData>('file', {
  connection: redisConnection,
  defaultJobOptions: config.queue.defaultJobOptions,
});

export const reportQueue = new Queue<ReportJobData>('report', {
  connection: redisConnection,
  defaultJobOptions: {
    ...config.queue.defaultJobOptions,
    attempts: 1, // Reports should not be retried automatically
  },
});

export const cleanupQueue = new Queue<CleanupJobData>('cleanup', {
  connection: redisConnection,
  defaultJobOptions: {
    ...config.queue.defaultJobOptions,
    attempts: 1, // Cleanup jobs should not be retried
  },
});

export const webhookQueue = new Queue<WebhookJobData>('webhook', {
  connection: redisConnection,
  defaultJobOptions: {
    ...config.queue.defaultJobOptions,
    attempts: config.webhook.maxRetries,
  },
});

// Queue event handlers for monitoring
const queues = [emailQueue, fileQueue, reportQueue, cleanupQueue, webhookQueue];
const queueNames = ['email', 'file', 'report', 'cleanup', 'webhook'];

queues.forEach((queue, index) => {
  const queueName = queueNames[index];
  
  queue.on('error', (error) => {
    console.error(`Queue ${queueName} error:`, error);
  });
});

// Export all queues
export const allQueues = {
  email: emailQueue,
  file: fileQueue,
  report: reportQueue,
  cleanup: cleanupQueue,
  webhook: webhookQueue,
};