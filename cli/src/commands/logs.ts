import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { api } from '../lib/api.js';
import { logger } from '../utils/logger.js';

const logLevelColors = {
  error: chalk.red,
  warn: chalk.yellow,
  info: chalk.blue,
  debug: chalk.gray,
  trace: chalk.dim.gray,
};

export const logsCommand = new Command('logs')
  .description('View service logs')
  .argument('<service>', 'Service name')
  .option('-f, --follow', 'Follow log output (tail -f)')
  .option('-t, --tail <lines>', 'Number of lines to show from the end', '100')
  .option('--since <time>', 'Show logs since timestamp (e.g., 2h, 30m)')
  .option('--until <time>', 'Show logs until timestamp')
  .option('-l, --level <level>', 'Filter by log level (error, warn, info, debug)')
  .option('--json', 'Output logs as JSON')
  .option('--no-timestamps', 'Hide timestamps')
  .option('--no-colors', 'Disable colored output')
  .action(async (serviceName, options) => {
    try {
      // Validate service exists
      const spinner = ora('Connecting to log stream...').start();
      
      try {
        await api.getService(serviceName);
        spinner.stop();
      } catch (error) {
        spinner.fail(chalk.red(`Service '${serviceName}' not found`));
        process.exit(1);
      }

      console.log(chalk.gray(`Showing logs for ${chalk.bold(serviceName)}...\n`));

      if (options.follow) {
        // Stream logs
        console.log(chalk.yellow('⚠  Following logs. Press Ctrl+C to exit.\n'));
        
        const logStream = await api.streamLogs(serviceName, {
          tail: parseInt(options.tail),
          since: options.since,
          level: options.level,
        });

        logStream.on('data', (log: any) => {
          if (options.json) {
            console.log(JSON.stringify(log));
          } else {
            formatAndPrintLog(log, options);
          }
        });

        logStream.on('error', (error: any) => {
          console.error(chalk.red('\nError:'), error.message);
          process.exit(1);
        });

        // Handle graceful shutdown
        process.on('SIGINT', () => {
          console.log(chalk.gray('\n\nStopping log stream...'));
          process.exit(0);
        });
      } else {
        // Fetch logs
        try {
          const logs = await api.getLogs(serviceName, {
            tail: parseInt(options.tail),
            since: options.since,
            until: options.until,
            level: options.level,
          });

          if (logs.length === 0) {
            console.log(chalk.yellow('No logs found for the specified criteria.'));
            return;
          }

          if (options.json) {
            console.log(JSON.stringify(logs, null, 2));
          } else {
            logs.forEach(log => formatAndPrintLog(log, options));
          }

          console.log(chalk.gray(`\n─── Showing ${logs.length} log entries ───`));
        } catch (error: any) {
          throw error;
        }
      }

      logger.info(`Viewed logs for ${serviceName}`);
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      logger.error('Logs command failed', error);
      process.exit(1);
    }
  });

function formatAndPrintLog(log: any, options: any) {
  const parts = [];

  // Timestamp
  if (options.timestamps !== false) {
    const timestamp = new Date(log.timestamp).toISOString();
    parts.push(chalk.gray(timestamp));
  }

  // Instance ID
  if (log.instance) {
    parts.push(chalk.cyan(`[${log.instance}]`));
  }

  // Log level
  const levelColor = options.colors !== false ? logLevelColors[log.level as keyof typeof logLevelColors] || chalk.white : (text: string) => text;
  parts.push(levelColor(log.level.toUpperCase().padEnd(5)));

  // Message
  let message = log.message;
  if (options.colors !== false) {
    // Highlight common patterns
    message = message
      .replace(/error/gi, chalk.red('error'))
      .replace(/warning/gi, chalk.yellow('warning'))
      .replace(/success/gi, chalk.green('success'))
      .replace(/(https?:\/\/[^\s]+)/g, chalk.cyan.underline('$1'))
      .replace(/(['"])[^'"]*\1/g, chalk.green('$&'))
      .replace(/\b\d+\b/g, chalk.magenta('$&'));
  }
  parts.push(message);

  // Additional fields
  if (log.fields && Object.keys(log.fields).length > 0) {
    const fields = Object.entries(log.fields)
      .map(([key, value]) => `${chalk.gray(key)}=${chalk.yellow(JSON.stringify(value))}`)
      .join(' ');
    parts.push(chalk.gray(`{${fields}}`));
  }

  console.log(parts.join(' '));
}