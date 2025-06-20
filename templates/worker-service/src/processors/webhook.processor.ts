import { Job } from 'bullmq';
import fetch from 'node-fetch';
import { config } from '../config';
import { logger } from '../utils/logger';
import { WebhookJobData } from '../queues';

export async function webhookProcessor(job: Job<WebhookJobData>): Promise<void> {
  const { url, method, headers = {}, payload, retryCount = 0 } = job.data;
  
  logger.info(`Processing webhook job ${job.id}`, {
    url,
    method,
    retryCount,
    attempt: job.attemptsMade + 1,
  });

  try {
    await job.updateProgress(10);

    // Prepare request options
    const requestOptions: any = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Worker-Service/1.0',
        ...headers,
      },
      timeout: config.webhook.timeout,
    };

    // Add body for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(method) && payload) {
      requestOptions.body = JSON.stringify(payload);
    }

    await job.updateProgress(30);

    // Make the HTTP request
    const startTime = Date.now();
    const response = await fetch(url, requestOptions);
    const duration = Date.now() - startTime;

    await job.updateProgress(70);

    // Read response body
    let responseBody;
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      try {
        responseBody = await response.json();
      } catch (error) {
        responseBody = await response.text();
      }
    } else {
      responseBody = await response.text();
    }

    await job.updateProgress(90);

    // Log the result
    const logData = {
      jobId: job.id,
      url,
      method,
      statusCode: response.status,
      duration,
      responseSize: responseBody ? JSON.stringify(responseBody).length : 0,
      attempt: job.attemptsMade + 1,
    };

    if (response.ok) {
      logger.info('Webhook request successful', logData);
    } else {
      logger.warn('Webhook request failed with HTTP error', {
        ...logData,
        responseBody: responseBody ? JSON.stringify(responseBody).substring(0, 500) : null,
      });

      // Throw error for retry if status indicates a temporary issue
      if (isRetryableStatus(response.status)) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }

    await job.updateProgress(100);

    return {
      statusCode: response.status,
      responseBody,
      duration,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error(`Webhook request failed for job ${job.id}`, {
      url,
      method,
      error: errorMessage,
      attempt: job.attemptsMade + 1,
      maxAttempts: job.opts.attempts,
    });

    // Add delay before retry for rate limiting
    if (job.attemptsMade < (job.opts.attempts || 1) - 1) {
      const delay = calculateRetryDelay(job.attemptsMade + 1);
      logger.info(`Will retry webhook in ${delay}ms`, {
        jobId: job.id,
        nextAttempt: job.attemptsMade + 2,
      });
    }

    throw error;
  }
}

function isRetryableStatus(statusCode: number): boolean {
  // Retry on server errors and rate limiting
  return statusCode >= 500 || statusCode === 429 || statusCode === 408;
}

function calculateRetryDelay(attemptNumber: number): number {
  // Exponential backoff with jitter
  const baseDelay = 1000; // 1 second
  const maxDelay = 60000; // 1 minute
  const exponentialDelay = baseDelay * Math.pow(2, attemptNumber - 1);
  const jitter = Math.random() * 1000; // Add up to 1 second of jitter
  
  return Math.min(exponentialDelay + jitter, maxDelay);
}