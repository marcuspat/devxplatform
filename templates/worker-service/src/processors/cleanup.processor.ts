import { Job } from 'bullmq';
import fs from 'fs-extra';
import path from 'path';
import { config } from '../config';
import { logger } from '../utils/logger';
import { CleanupJobData } from '../queues';

export async function cleanupProcessor(job: Job<CleanupJobData>): Promise<void> {
  const { type, olderThan, dryRun = false } = job.data;
  
  logger.info(`Processing ${type} cleanup job ${job.id}`, {
    olderThan,
    dryRun,
  });

  try {
    const cutoffDate = new Date(olderThan);
    
    if (isNaN(cutoffDate.getTime())) {
      throw new Error(`Invalid date format: ${olderThan}`);
    }

    await job.updateProgress(10);

    let cleanupStats;
    switch (type) {
      case 'files':
        cleanupStats = await cleanupFiles(cutoffDate, dryRun);
        break;
      case 'logs':
        cleanupStats = await cleanupLogs(cutoffDate, dryRun);
        break;
      case 'database':
        cleanupStats = await cleanupDatabase(cutoffDate, dryRun);
        break;
      default:
        throw new Error(`Unknown cleanup type: ${type}`);
    }

    await job.updateProgress(100);

    logger.info(`${type} cleanup completed for job ${job.id}`, {
      ...cleanupStats,
      dryRun,
    });

  } catch (error) {
    logger.error(`Cleanup failed for job ${job.id}:`, error);
    throw error;
  }
}

async function cleanupFiles(cutoffDate: Date, dryRun: boolean): Promise<any> {
  const stats = {
    filesScanned: 0,
    filesDeleted: 0,
    bytesFreed: 0,
    errors: 0,
  };

  const uploadDir = config.files.uploadDir;
  
  if (!await fs.pathExists(uploadDir)) {
    logger.warn(`Upload directory does not exist: ${uploadDir}`);
    return stats;
  }

  try {
    await cleanupDirectory(uploadDir, cutoffDate, dryRun, stats);
  } catch (error) {
    logger.error('Error during file cleanup:', error);
    stats.errors++;
  }

  return stats;
}

async function cleanupDirectory(
  dirPath: string,
  cutoffDate: Date,
  dryRun: boolean,
  stats: any
): Promise<void> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    try {
      if (entry.isDirectory()) {
        // Recursively clean subdirectories
        await cleanupDirectory(fullPath, cutoffDate, dryRun, stats);
        
        // Check if directory is now empty and old enough to delete
        const dirStats = await fs.stat(fullPath);
        if (dirStats.mtime < cutoffDate) {
          const isEmpty = (await fs.readdir(fullPath)).length === 0;
          if (isEmpty) {
            if (!dryRun) {
              await fs.remove(fullPath);
            }
            stats.filesDeleted++;
            logger.debug(`${dryRun ? '[DRY RUN] ' : ''}Removed empty directory: ${fullPath}`);
          }
        }
      } else if (entry.isFile()) {
        stats.filesScanned++;
        
        const fileStats = await fs.stat(fullPath);
        
        // Check if file is older than cutoff date
        if (fileStats.mtime < cutoffDate) {
          if (!dryRun) {
            await fs.remove(fullPath);
          }
          stats.filesDeleted++;
          stats.bytesFreed += fileStats.size;
          
          logger.debug(`${dryRun ? '[DRY RUN] ' : ''}Deleted old file: ${fullPath}`, {
            size: fileStats.size,
            modified: fileStats.mtime.toISOString(),
          });
        }
      }
    } catch (error) {
      logger.error(`Error processing ${fullPath}:`, error);
      stats.errors++;
    }
  }
}

async function cleanupLogs(cutoffDate: Date, dryRun: boolean): Promise<any> {
  const stats = {
    logFilesScanned: 0,
    logFilesDeleted: 0,
    bytesFreed: 0,
    errors: 0,
  };

  // Common log directories
  const logDirs = [
    '/var/log/app',
    './logs',
    './log',
  ];

  for (const logDir of logDirs) {
    if (await fs.pathExists(logDir)) {
      try {
        const entries = await fs.readdir(logDir);
        
        for (const entry of entries) {
          const filePath = path.join(logDir, entry);
          const fileStats = await fs.stat(filePath);
          
          // Only process log files
          if (fileStats.isFile() && /\.(log|out|err)(\.\d+)?$/.test(entry)) {
            stats.logFilesScanned++;
            
            if (fileStats.mtime < cutoffDate) {
              if (!dryRun) {
                await fs.remove(filePath);
              }
              stats.logFilesDeleted++;
              stats.bytesFreed += fileStats.size;
              
              logger.debug(`${dryRun ? '[DRY RUN] ' : ''}Deleted old log file: ${filePath}`, {
                size: fileStats.size,
                modified: fileStats.mtime.toISOString(),
              });
            }
          }
        }
      } catch (error) {
        logger.error(`Error cleaning log directory ${logDir}:`, error);
        stats.errors++;
      }
    }
  }

  return stats;
}

async function cleanupDatabase(cutoffDate: Date, dryRun: boolean): Promise<any> {
  const stats = {
    tablesProcessed: 0,
    recordsDeleted: 0,
    errors: 0,
  };

  // Database cleanup placeholder
  // In a real implementation, you would:
  // 1. Connect to your database
  // 2. Delete old records from specific tables
  // 3. Run VACUUM/OPTIMIZE commands if needed
  
  logger.info(`${dryRun ? '[DRY RUN] ' : ''}Database cleanup would delete records older than ${cutoffDate.toISOString()}`);

  // Example cleanup operations (pseudocode):
  const cleanupQueries = [
    {
      table: 'audit_logs',
      query: 'DELETE FROM audit_logs WHERE created_at < ?',
    },
    {
      table: 'temporary_files',
      query: 'DELETE FROM temporary_files WHERE created_at < ?',
    },
    {
      table: 'expired_sessions',
      query: 'DELETE FROM user_sessions WHERE expires_at < ?',
    },
  ];

  for (const { table, query } of cleanupQueries) {
    try {
      stats.tablesProcessed++;
      
      if (!dryRun) {
        // Execute cleanup query here
        // const result = await db.query(query, [cutoffDate]);
        // stats.recordsDeleted += result.affectedRows;
        
        logger.info(`Would execute: ${query} with cutoff date ${cutoffDate.toISOString()}`);
      } else {
        logger.info(`[DRY RUN] Would execute: ${query} with cutoff date ${cutoffDate.toISOString()}`);
      }
    } catch (error) {
      logger.error(`Error cleaning table ${table}:`, error);
      stats.errors++;
    }
  }

  return stats;
}