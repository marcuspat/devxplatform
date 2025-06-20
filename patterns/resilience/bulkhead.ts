import { EventEmitter } from 'events';
import { Worker } from 'worker_threads';
import * as os from 'os';

export interface BulkheadConfig {
  maxConcurrent: number;
  maxQueueSize?: number;
  timeout?: number;
  name?: string;
}

export interface BulkheadMetrics {
  activeCount: number;
  queuedCount: number;
  totalExecuted: number;
  totalRejected: number;
  totalTimeout: number;
  averageWaitTime: number;
  averageExecutionTime: number;
}

export interface Task<T> {
  id: string;
  execute: () => Promise<T>;
  priority?: number;
  timeout?: number;
  timestamp: number;
}

/**
 * Bulkhead pattern implementation for resource isolation
 */
export class Bulkhead<T = any> extends EventEmitter {
  private config: Required<BulkheadConfig>;
  private activeCount = 0;
  private queue: Array<{
    task: Task<T>;
    resolve: (value: T) => void;
    reject: (error: Error) => void;
  }> = [];
  private metrics: BulkheadMetrics;
  private waitTimes: number[] = [];
  private executionTimes: number[] = [];

  constructor(config: BulkheadConfig) {
    super();
    this.config = {
      maxConcurrent: config.maxConcurrent,
      maxQueueSize: config.maxQueueSize ?? 100,
      timeout: config.timeout ?? 60000,
      name: config.name ?? 'Bulkhead'
    };

    this.metrics = {
      activeCount: 0,
      queuedCount: 0,
      totalExecuted: 0,
      totalRejected: 0,
      totalTimeout: 0,
      averageWaitTime: 0,
      averageExecutionTime: 0
    };
  }

  /**
   * Execute a task with bulkhead isolation
   */
  async execute<R>(task: Task<R>): Promise<R> {
    if (this.activeCount >= this.config.maxConcurrent) {
      if (this.queue.length >= this.config.maxQueueSize) {
        this.metrics.totalRejected++;
        this.emit('rejected', { taskId: task.id, reason: 'Queue full' });
        throw new Error(`Bulkhead queue full (${this.config.name})`);
      }

      // Queue the task
      return new Promise<R>((resolve, reject) => {
        this.queue.push({ task: task as any, resolve: resolve as any, reject });
        this.sortQueue();
        this.metrics.queuedCount = this.queue.length;
        this.emit('queued', { taskId: task.id, queueSize: this.queue.length });
      });
    }

    // Execute immediately
    return this.executeTask(task as any) as Promise<R>;
  }

  private sortQueue(): void {
    this.queue.sort((a, b) => {
      // Sort by priority (higher first), then by timestamp (older first)
      const priorityDiff = (b.task.priority || 0) - (a.task.priority || 0);
      return priorityDiff !== 0 ? priorityDiff : a.task.timestamp - b.task.timestamp;
    });
  }

  private async executeTask(task: Task<T>): Promise<T> {
    this.activeCount++;
    this.metrics.activeCount = this.activeCount;
    this.emit('execute:start', { taskId: task.id, activeCount: this.activeCount });

    const startTime = Date.now();
    const waitTime = startTime - task.timestamp;
    this.waitTimes.push(waitTime);

    try {
      const timeout = task.timeout || this.config.timeout;
      const result = await Promise.race([
        task.execute(),
        new Promise<never>((_, reject) => {
          setTimeout(() => {
            this.metrics.totalTimeout++;
            reject(new Error(`Task timeout after ${timeout}ms`));
          }, timeout);
        })
      ]);

      const executionTime = Date.now() - startTime;
      this.executionTimes.push(executionTime);
      this.metrics.totalExecuted++;
      this.updateAverages();
      
      this.emit('execute:success', { 
        taskId: task.id, 
        executionTime, 
        waitTime 
      });

      return result;
    } catch (error) {
      this.emit('execute:error', { taskId: task.id, error });
      throw error;
    } finally {
      this.activeCount--;
      this.metrics.activeCount = this.activeCount;
      this.processQueue();
    }
  }

  private processQueue(): void {
    if (this.queue.length > 0 && this.activeCount < this.config.maxConcurrent) {
      const { task, resolve, reject } = this.queue.shift()!;
      this.metrics.queuedCount = this.queue.length;
      
      this.executeTask(task)
        .then(resolve)
        .catch(reject);
    }
  }

  private updateAverages(): void {
    if (this.waitTimes.length > 0) {
      this.metrics.averageWaitTime = 
        this.waitTimes.reduce((a, b) => a + b, 0) / this.waitTimes.length;
    }
    
    if (this.executionTimes.length > 0) {
      this.metrics.averageExecutionTime = 
        this.executionTimes.reduce((a, b) => a + b, 0) / this.executionTimes.length;
    }
  }

  getMetrics(): BulkheadMetrics {
    return { ...this.metrics };
  }

  /**
   * Check if bulkhead can accept more tasks
   */
  canAccept(): boolean {
    return this.activeCount < this.config.maxConcurrent || 
           this.queue.length < this.config.maxQueueSize;
  }

  /**
   * Get current utilization percentage
   */
  getUtilization(): number {
    return (this.activeCount / this.config.maxConcurrent) * 100;
  }

  /**
   * Clear the queue
   */
  clearQueue(): void {
    const cleared = this.queue.length;
    this.queue.forEach(({ reject }) => {
      reject(new Error('Queue cleared'));
    });
    this.queue = [];
    this.metrics.queuedCount = 0;
    this.emit('queue:cleared', { cleared });
  }

  /**
   * Shutdown the bulkhead
   */
  async shutdown(): Promise<void> {
    this.clearQueue();
    // Wait for active tasks to complete
    while (this.activeCount > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    this.removeAllListeners();
  }
}

/**
 * Thread pool bulkhead for CPU-intensive tasks
 */
export class ThreadPoolBulkhead extends EventEmitter {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private taskQueue: Array<{
    script: string;
    data?: any;
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }> = [];
  private maxWorkers: number;
  private workerScript: string;

  constructor(workerScript: string, maxWorkers?: number) {
    super();
    this.workerScript = workerScript;
    this.maxWorkers = maxWorkers || os.cpus().length;
    this.initializeWorkers();
  }

  private initializeWorkers(): void {
    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = new Worker(this.workerScript);
      worker.on('error', (error) => {
        this.emit('worker:error', { workerId: i, error });
      });
      this.workers.push(worker);
      this.availableWorkers.push(worker);
    }
  }

  async execute(script: string, data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const worker = this.availableWorkers.pop();
      
      if (!worker) {
        // Queue the task
        this.taskQueue.push({ script, data, resolve, reject });
        this.emit('task:queued', { queueSize: this.taskQueue.length });
        return;
      }

      this.runTask(worker, script, data, resolve, reject);
    });
  }

  private runTask(
    worker: Worker,
    script: string,
    data: any,
    resolve: (value: any) => void,
    reject: (error: Error) => void
  ): void {
    const messageHandler = (result: any) => {
      worker.off('message', messageHandler);
      worker.off('error', errorHandler);
      
      this.availableWorkers.push(worker);
      resolve(result);
      
      // Process queue
      if (this.taskQueue.length > 0) {
        const task = this.taskQueue.shift()!;
        this.runTask(worker, task.script, task.data, task.resolve, task.reject);
      }
    };

    const errorHandler = (error: Error) => {
      worker.off('message', messageHandler);
      worker.off('error', errorHandler);
      
      this.availableWorkers.push(worker);
      reject(error);
    };

    worker.on('message', messageHandler);
    worker.on('error', errorHandler);
    worker.postMessage({ script, data });
  }

  async shutdown(): Promise<void> {
    // Clear queue
    this.taskQueue.forEach(({ reject }) => {
      reject(new Error('Thread pool shutting down'));
    });
    this.taskQueue = [];

    // Terminate all workers
    await Promise.all(this.workers.map(worker => worker.terminate()));
    this.workers = [];
    this.availableWorkers = [];
    this.removeAllListeners();
  }
}

/**
 * Semaphore-based bulkhead for fine-grained resource control
 */
export class SemaphoreBulkhead {
  private permits: number;
  private waiting: Array<() => void> = [];
  private readonly maxPermits: number;

  constructor(permits: number) {
    this.permits = permits;
    this.maxPermits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise<void>(resolve => {
      this.waiting.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    
    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift()!;
      this.permits--;
      resolve();
    }
  }

  async withPermit<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  getAvailablePermits(): number {
    return this.permits;
  }

  getWaitingCount(): number {
    return this.waiting.length;
  }

  getUtilization(): number {
    return ((this.maxPermits - this.permits) / this.maxPermits) * 100;
  }
}