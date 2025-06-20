import { Router, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { 
  emailQueue, 
  fileQueue, 
  reportQueue, 
  cleanupQueue, 
  webhookQueue,
  allQueues,
  EmailJobData,
  FileJobData,
  ReportJobData,
  CleanupJobData,
  WebhookJobData
} from '../../queues';

export const jobsRouter = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(config.files.uploadDir, 'incoming');
    await fs.ensureDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = file.originalname;
    const extension = path.extname(originalName);
    const basename = path.basename(originalName, extension);
    cb(null, `${basename}_${timestamp}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.files.maxFileSize,
  },
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase().slice(1);
    if (config.files.allowedTypes.includes(extension)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${extension} not allowed`));
    }
  },
});

// Get queue statistics
jobsRouter.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats: Record<string, any> = {};
    
    for (const [queueName, queue] of Object.entries(allQueues)) {
      const waiting = await queue.getWaiting();
      const active = await queue.getActive();
      const completed = await queue.getCompleted();
      const failed = await queue.getFailed();
      
      stats[queueName] = {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
      };
    }
    
    res.json({ stats });
  } catch (error) {
    logger.error('Error getting queue stats:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Failed to get queue statistics',
    });
  }
});

// Email jobs
jobsRouter.post('/email', async (req: Request, res: Response) => {
  try {
    const jobData: EmailJobData = req.body;
    
    // Validate required fields
    if (!jobData.to || !jobData.subject) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: 'Missing required fields: to, subject',
      });
    }
    
    const job = await emailQueue.add('send-email', jobData, {
      delay: req.body.delay || 0,
    });
    
    res.status(StatusCodes.CREATED).json({
      jobId: job.id,
      message: 'Email job created successfully',
    });
  } catch (error) {
    logger.error('Error creating email job:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Failed to create email job',
    });
  }
});

// File processing jobs
jobsRouter.post('/files', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: 'No file uploaded',
      });
    }
    
    const { type = 'image', options } = req.body;
    
    const jobData: FileJobData = {
      type,
      inputPath: req.file.path,
      options: options ? JSON.parse(options) : undefined,
    };
    
    const job = await fileQueue.add('process-file', jobData);
    
    res.status(StatusCodes.CREATED).json({
      jobId: job.id,
      fileName: req.file.filename,
      message: 'File processing job created successfully',
    });
  } catch (error) {
    logger.error('Error creating file processing job:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Failed to create file processing job',
    });
  }
});

// Report generation jobs
jobsRouter.post('/reports', async (req: Request, res: Response) => {
  try {
    const jobData: ReportJobData = req.body;
    
    // Validate required fields
    if (!jobData.type || !jobData.dateRange || !jobData.format) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: 'Missing required fields: type, dateRange, format',
      });
    }
    
    const job = await reportQueue.add('generate-report', jobData);
    
    res.status(StatusCodes.CREATED).json({
      jobId: job.id,
      message: 'Report generation job created successfully',
    });
  } catch (error) {
    logger.error('Error creating report job:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Failed to create report job',
    });
  }
});

// Cleanup jobs
jobsRouter.post('/cleanup', async (req: Request, res: Response) => {
  try {
    const jobData: CleanupJobData = req.body;
    
    // Validate required fields
    if (!jobData.type || !jobData.olderThan) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: 'Missing required fields: type, olderThan',
      });
    }
    
    const job = await cleanupQueue.add('cleanup', jobData);
    
    res.status(StatusCodes.CREATED).json({
      jobId: job.id,
      message: 'Cleanup job created successfully',
    });
  } catch (error) {
    logger.error('Error creating cleanup job:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Failed to create cleanup job',
    });
  }
});

// Webhook jobs
jobsRouter.post('/webhooks', async (req: Request, res: Response) => {
  try {
    const jobData: WebhookJobData = req.body;
    
    // Validate required fields
    if (!jobData.url || !jobData.method) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: 'Missing required fields: url, method',
      });
    }
    
    const job = await webhookQueue.add('webhook', jobData);
    
    res.status(StatusCodes.CREATED).json({
      jobId: job.id,
      message: 'Webhook job created successfully',
    });
  } catch (error) {
    logger.error('Error creating webhook job:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Failed to create webhook job',
    });
  }
});

// Get job status
jobsRouter.get('/:queueName/:jobId', async (req: Request, res: Response) => {
  try {
    const { queueName, jobId } = req.params;
    
    if (!allQueues[queueName as keyof typeof allQueues]) {
      return res.status(StatusCodes.NOT_FOUND).json({
        error: 'Queue not found',
      });
    }
    
    const queue = allQueues[queueName as keyof typeof allQueues];
    const job = await queue.getJob(jobId);
    
    if (!job) {
      return res.status(StatusCodes.NOT_FOUND).json({
        error: 'Job not found',
      });
    }
    
    const state = await job.getState();
    
    res.json({
      id: job.id,
      name: job.name,
      data: job.data,
      state,
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
    });
  } catch (error) {
    logger.error('Error getting job status:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Failed to get job status',
    });
  }
});

// Cancel job
jobsRouter.delete('/:queueName/:jobId', async (req: Request, res: Response) => {
  try {
    const { queueName, jobId } = req.params;
    
    if (!allQueues[queueName as keyof typeof allQueues]) {
      return res.status(StatusCodes.NOT_FOUND).json({
        error: 'Queue not found',
      });
    }
    
    const queue = allQueues[queueName as keyof typeof allQueues];
    const job = await queue.getJob(jobId);
    
    if (!job) {
      return res.status(StatusCodes.NOT_FOUND).json({
        error: 'Job not found',
      });
    }
    
    await job.remove();
    
    res.json({
      message: 'Job cancelled successfully',
    });
  } catch (error) {
    logger.error('Error cancelling job:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Failed to cancel job',
    });
  }
});

// List jobs in a queue
jobsRouter.get('/:queueName', async (req: Request, res: Response) => {
  try {
    const { queueName } = req.params;
    const { state = 'waiting', start = 0, end = 10 } = req.query;
    
    if (!allQueues[queueName as keyof typeof allQueues]) {
      return res.status(StatusCodes.NOT_FOUND).json({
        error: 'Queue not found',
      });
    }
    
    const queue = allQueues[queueName as keyof typeof allQueues];
    
    let jobs;
    switch (state) {
      case 'waiting':
        jobs = await queue.getWaiting(Number(start), Number(end));
        break;
      case 'active':
        jobs = await queue.getActive(Number(start), Number(end));
        break;
      case 'completed':
        jobs = await queue.getCompleted(Number(start), Number(end));
        break;
      case 'failed':
        jobs = await queue.getFailed(Number(start), Number(end));
        break;
      default:
        return res.status(StatusCodes.BAD_REQUEST).json({
          error: 'Invalid state. Must be one of: waiting, active, completed, failed',
        });
    }
    
    const jobData = await Promise.all(
      jobs.map(async (job) => ({
        id: job.id,
        name: job.name,
        data: job.data,
        state: await job.getState(),
        progress: job.progress,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
      }))
    );
    
    res.json({
      queue: queueName,
      state,
      jobs: jobData,
    });
  } catch (error) {
    logger.error('Error listing jobs:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Failed to list jobs',
    });
  }
});