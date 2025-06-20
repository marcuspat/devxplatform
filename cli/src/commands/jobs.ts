import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { logger } from '../utils/logger.js';
import { api } from '../lib/api.js';

export const jobsCommand = new Command('jobs')
  .description('Manage asynchronous jobs')
  .addCommand(
    new Command('status')
      .description('Get job status')
      .argument('<jobId>', 'Job ID')
      .option('-q, --queue <queue>', 'Queue name', 'service_generation')
      .action(async (jobId, options) => {
        try {
          const spinner = ora('Fetching job status...').start();
          
          const jobStatus = await api.getJobStatus(jobId, options.queue);
          
          spinner.succeed(chalk.green('Job status retrieved'));
          
          console.log('\n' + chalk.bold('Job Status:'));
          console.log(chalk.gray('─'.repeat(50)));
          console.log(`${chalk.bold('ID:')}           ${jobStatus.id}`);
          console.log(`${chalk.bold('Name:')}         ${jobStatus.name}`);
          console.log(`${chalk.bold('Queue:')}        ${options.queue}`);
          console.log(`${chalk.bold('Status:')}       ${getStatusColor(jobStatus)}`);
          console.log(`${chalk.bold('Attempts:')}     ${jobStatus.attemptsMade || 0}/${jobStatus.opts?.attempts || 3}`);
          
          if (jobStatus.progress) {
            console.log(`${chalk.bold('Progress:')}     ${jobStatus.progress.percentage || 0}%`);
            console.log(`${chalk.bold('Stage:')}        ${jobStatus.progress.stage || 'Unknown'}`);
            console.log(`${chalk.bold('Message:')}      ${jobStatus.progress.message || 'No message'}`);
          }
          
          if (jobStatus.processedOn) {
            console.log(`${chalk.bold('Started:')}      ${new Date(jobStatus.processedOn).toLocaleString()}`);
          }
          
          if (jobStatus.finishedOn) {
            console.log(`${chalk.bold('Finished:')}     ${new Date(jobStatus.finishedOn).toLocaleString()}`);
            
            const duration = jobStatus.finishedOn - (jobStatus.processedOn || jobStatus.timestamp);
            console.log(`${chalk.bold('Duration:')}     ${Math.round(duration / 1000)}s`);
          }
          
          if (jobStatus.failedReason) {
            console.log(`${chalk.bold('Error:')}        ${chalk.red(jobStatus.failedReason)}`);
          }
          
          if (jobStatus.returnvalue) {
            console.log('\n' + chalk.bold('Result:'));
            if (jobStatus.returnvalue.success) {
              console.log(`${chalk.bold('Service ID:')}   ${jobStatus.returnvalue.serviceId || 'N/A'}`);
              console.log(`${chalk.bold('Service URL:')}  ${jobStatus.returnvalue.serviceUrl || 'N/A'}`);
              console.log(`${chalk.bold('Duration:')}     ${jobStatus.returnvalue.duration ? Math.round(jobStatus.returnvalue.duration / 1000) + 's' : 'N/A'}`);
            } else {
              console.log(`${chalk.red('Job failed:')}   ${jobStatus.returnvalue.error || 'Unknown error'}`);
            }
          }
          
          console.log(chalk.gray('─'.repeat(50)));
          
        } catch (error: any) {
          console.error(chalk.red('Error:'), error.message);
          logger.error('Job status command failed', error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('cancel')
      .description('Cancel a job')
      .argument('<jobId>', 'Job ID')
      .option('-q, --queue <queue>', 'Queue name', 'service_generation')
      .action(async (jobId, options) => {
        try {
          const spinner = ora('Cancelling job...').start();
          
          await api.cancelJob(jobId, options.queue);
          
          spinner.succeed(chalk.green('Job cancelled successfully'));
          console.log(`Job ${chalk.cyan(jobId)} has been cancelled.`);
          
        } catch (error: any) {
          console.error(chalk.red('Error:'), error.message);
          logger.error('Job cancel command failed', error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('retry')
      .description('Retry a failed job')
      .argument('<jobId>', 'Job ID')
      .option('-q, --queue <queue>', 'Queue name', 'service_generation')
      .action(async (jobId, options) => {
        try {
          const spinner = ora('Retrying job...').start();
          
          await api.retryJob(jobId, options.queue);
          
          spinner.succeed(chalk.green('Job retry initiated'));
          console.log(`Job ${chalk.cyan(jobId)} has been queued for retry.`);
          console.log(`Use ${chalk.cyan(`devex jobs status ${jobId}`)} to monitor progress.`);
          
        } catch (error: any) {
          console.error(chalk.red('Error:'), error.message);
          logger.error('Job retry command failed', error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('stats')
      .description('Show queue statistics')
      .action(async () => {
        try {
          const spinner = ora('Fetching queue statistics...').start();
          
          const stats = await api.getQueueStats();
          
          spinner.succeed(chalk.green('Queue statistics retrieved'));
          
          console.log('\n' + chalk.bold('Queue Statistics:'));
          console.log(chalk.gray('─'.repeat(70)));
          
          Object.entries(stats).forEach(([queueName, queueStats]: [string, any]) => {
            console.log(`\n${chalk.bold(chalk.cyan(queueName.toUpperCase()))}:`);
            console.log(`  ${chalk.bold('Waiting:')}    ${queueStats.waiting || 0}`);
            console.log(`  ${chalk.bold('Active:')}     ${queueStats.active || 0}`);
            console.log(`  ${chalk.bold('Completed:')}  ${queueStats.completed || 0}`);
            console.log(`  ${chalk.bold('Failed:')}     ${queueStats.failed || 0}`);
            console.log(`  ${chalk.bold('Delayed:')}    ${queueStats.delayed || 0}`);
            console.log(`  ${chalk.bold('Paused:')}     ${queueStats.paused ? 'Yes' : 'No'}`);
          });
          
          console.log(chalk.gray('─'.repeat(70)));
          
        } catch (error: any) {
          console.error(chalk.red('Error:'), error.message);
          logger.error('Queue stats command failed', error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('monitor')
      .description('Monitor job progress in real-time')
      .argument('<jobId>', 'Job ID')
      .option('-q, --queue <queue>', 'Queue name', 'service_generation')
      .action(async (jobId, options) => {
        try {
          console.log(`Monitoring job ${chalk.cyan(jobId)} in queue ${chalk.cyan(options.queue)}...`);
          console.log('Press Ctrl+C to stop monitoring.\n');
          
          const spinner = ora('Waiting for job updates...').start();
          
          let isCompleted = false;
          const interval = setInterval(async () => {
            try {
              const jobStatus = await api.getJobStatus(jobId, options.queue);
              
              if (jobStatus.progress && jobStatus.progress.message) {
                spinner.text = `${jobStatus.progress.message} (${jobStatus.progress.percentage || 0}%)`;
              }
              
              if (jobStatus.finishedOn && !isCompleted) {
                isCompleted = true;
                clearInterval(interval);
                
                if (jobStatus.returnvalue && jobStatus.returnvalue.success) {
                  spinner.succeed(chalk.green('Job completed successfully!'));
                  console.log(`Service generation completed for: ${chalk.cyan(jobStatus.data?.serviceName || 'Unknown')}`);
                } else {
                  spinner.fail(chalk.red('Job failed!'));
                  console.log(`Error: ${jobStatus.failedReason || 'Unknown error'}`);
                }
                
                process.exit(0);
              }
              
              if (jobStatus.failedReason && !isCompleted) {
                isCompleted = true;
                clearInterval(interval);
                spinner.fail(chalk.red('Job failed!'));
                console.log(`Error: ${jobStatus.failedReason}`);
                process.exit(1);
              }
              
            } catch (error: any) {
              if (!error.message.includes('Job not found')) {
                clearInterval(interval);
                spinner.fail(chalk.red('Monitoring failed'));
                console.error(chalk.red('Error:'), error.message);
                process.exit(1);
              }
            }
          }, 2000);
          
          // Handle Ctrl+C
          process.on('SIGINT', () => {
            clearInterval(interval);
            spinner.stop();
            console.log('\nMonitoring stopped.');
            process.exit(0);
          });
          
        } catch (error: any) {
          console.error(chalk.red('Error:'), error.message);
          logger.error('Job monitor command failed', error);
          process.exit(1);
        }
      })
  );

function getStatusColor(jobStatus: any): string {
  if (jobStatus.finishedOn) {
    if (jobStatus.returnvalue && jobStatus.returnvalue.success) {
      return chalk.green('Completed');
    } else {
      return chalk.red('Failed');
    }
  }
  
  if (jobStatus.processedOn) {
    return chalk.yellow('Active');
  }
  
  if (jobStatus.failedReason) {
    return chalk.red('Failed');
  }
  
  return chalk.blue('Waiting');
}