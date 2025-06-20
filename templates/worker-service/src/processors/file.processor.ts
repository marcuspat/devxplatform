import { Job } from 'bullmq';
import sharp from 'sharp';
import fs from 'fs-extra';
import path from 'path';
import { config } from '../config';
import { logger } from '../utils/logger';
import { FileJobData } from '../queues';

export async function fileProcessor(job: Job<FileJobData>): Promise<void> {
  const { type, inputPath, outputPath, options } = job.data;
  
  logger.info(`Processing ${type} file job ${job.id}`, {
    inputPath,
    outputPath,
    options,
  });

  try {
    // Ensure input file exists
    if (!await fs.pathExists(inputPath)) {
      throw new Error(`Input file does not exist: ${inputPath}`);
    }

    // Update progress
    await job.updateProgress(10);

    switch (type) {
      case 'image':
        await processImage(job, inputPath, outputPath, options);
        break;
      case 'document':
        await processDocument(job, inputPath, outputPath, options);
        break;
      case 'video':
        await processVideo(job, inputPath, outputPath, options);
        break;
      default:
        throw new Error(`Unsupported file type: ${type}`);
    }

    logger.info(`File processing completed for job ${job.id}`);
    await job.updateProgress(100);

  } catch (error) {
    logger.error(`File processing failed for job ${job.id}:`, error);
    throw error;
  }
}

async function processImage(
  job: Job<FileJobData>,
  inputPath: string,
  outputPath?: string,
  options?: FileJobData['options']
): Promise<void> {
  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    logger.info(`Processing image: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);
    await job.updateProgress(30);

    let pipeline = image;

    // Apply transformations
    if (options?.resize) {
      pipeline = pipeline.resize(options.resize.width, options.resize.height, {
        fit: 'cover',
        withoutEnlargement: true,
      });
      await job.updateProgress(50);
    }

    // Set format and quality
    if (options?.format) {
      switch (options.format.toLowerCase()) {
        case 'jpeg':
        case 'jpg':
          pipeline = pipeline.jpeg({ quality: options.quality || 80 });
          break;
        case 'png':
          pipeline = pipeline.png({ quality: options.quality || 80 });
          break;
        case 'webp':
          pipeline = pipeline.webp({ quality: options.quality || 80 });
          break;
        default:
          logger.warn(`Unsupported image format: ${options.format}`);
      }
    }

    await job.updateProgress(70);

    // Determine output path
    const finalOutputPath = outputPath || generateOutputPath(inputPath, options?.format);
    
    // Ensure output directory exists
    await fs.ensureDir(path.dirname(finalOutputPath));

    // Save processed image
    await pipeline.toFile(finalOutputPath);
    
    await job.updateProgress(90);

    // Get file size info
    const inputStats = await fs.stat(inputPath);
    const outputStats = await fs.stat(finalOutputPath);
    
    logger.info(`Image processing completed`, {
      inputSize: inputStats.size,
      outputSize: outputStats.size,
      compression: ((inputStats.size - outputStats.size) / inputStats.size * 100).toFixed(2) + '%',
      outputPath: finalOutputPath,
    });

  } catch (error) {
    logger.error('Image processing error:', error);
    throw error;
  }
}

async function processDocument(
  job: Job<FileJobData>,
  inputPath: string,
  outputPath?: string,
  options?: FileJobData['options']
): Promise<void> {
  // Document processing placeholder
  // In a real implementation, you might use libraries like:
  // - pdf2pic for PDF to image conversion
  // - mammoth for DOCX to HTML conversion
  // - libreoffice for various document conversions
  
  logger.info('Document processing is not implemented in this example');
  await job.updateProgress(50);
  
  // Simple file copy for demo
  const finalOutputPath = outputPath || generateOutputPath(inputPath, 'processed');
  await fs.ensureDir(path.dirname(finalOutputPath));
  await fs.copy(inputPath, finalOutputPath);
  
  await job.updateProgress(100);
}

async function processVideo(
  job: Job<FileJobData>,
  inputPath: string,
  outputPath?: string,
  options?: FileJobData['options']
): Promise<void> {
  // Video processing placeholder
  // In a real implementation, you might use ffmpeg:
  // - ffmpeg-fluent for Node.js wrapper
  // - @ffmpeg-installer/ffmpeg for bundled ffmpeg
  
  logger.info('Video processing is not implemented in this example');
  await job.updateProgress(50);
  
  // Simple file copy for demo
  const finalOutputPath = outputPath || generateOutputPath(inputPath, 'processed');
  await fs.ensureDir(path.dirname(finalOutputPath));
  await fs.copy(inputPath, finalOutputPath);
  
  await job.updateProgress(100);
}

function generateOutputPath(inputPath: string, suffix?: string): string {
  const parsedPath = path.parse(inputPath);
  const outputDir = path.join(config.files.uploadDir, 'processed');
  
  if (suffix && suffix !== parsedPath.ext.slice(1)) {
    // Different format
    return path.join(outputDir, `${parsedPath.name}_processed.${suffix}`);
  } else {
    // Same format
    return path.join(outputDir, `${parsedPath.name}_processed${parsedPath.ext}`);
  }
}