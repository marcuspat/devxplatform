import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { table } from 'table';
import { api } from '../lib/api.js';
import { logger } from '../utils/logger.js';
import { formatDate, formatUptime } from '../utils/formatters.js';

export const listCommand = new Command('list')
  .description('List all services')
  .alias('ls')
  .option('-a, --all', 'Show all services including archived')
  .option('-e, --env <environment>', 'Filter by environment')
  .option('-s, --status <status>', 'Filter by status (healthy, warning, error)')
  .option('--json', 'Output as JSON')
  .option('--no-header', 'Hide table header')
  .action(async (options) => {
    try {
      const spinner = ora('Fetching services...').start();

      try {
        const services = await api.listServices({
          includeArchived: options.all,
          environment: options.env,
          status: options.status,
        });

        spinner.stop();

        if (services.length === 0) {
          console.log(chalk.yellow('No services found.'));
          return;
        }

        if (options.json) {
          console.log(JSON.stringify(services, null, 2));
          return;
        }

        // Prepare table data
        const tableData = [];
        
        if (!options.noHeader) {
          tableData.push([
            chalk.bold('NAME'),
            chalk.bold('STATUS'),
            chalk.bold('TYPE'),
            chalk.bold('ENV'),
            chalk.bold('INSTANCES'),
            chalk.bold('CPU'),
            chalk.bold('MEMORY'),
            chalk.bold('UPTIME'),
          ]);
        }

        services.forEach(service => {
          const statusColor = 
            service.status === 'healthy' ? chalk.green :
            service.status === 'warning' ? chalk.yellow :
            chalk.red;

          const statusIcon = 
            service.status === 'healthy' ? '✓' :
            service.status === 'warning' ? '⚠' :
            '✗';

          tableData.push([
            service.name,
            statusColor(`${statusIcon} ${service.status}`),
            service.type,
            service.environment,
            `${service.instances.running}/${service.instances.desired}`,
            `${service.resources.cpu}%`,
            `${service.resources.memory}%`,
            formatUptime(service.uptime),
          ]);
        });

        const tableConfig = {
          border: {
            topBody: chalk.gray('─'),
            topJoin: chalk.gray('┬'),
            topLeft: chalk.gray('┌'),
            topRight: chalk.gray('┐'),
            bottomBody: chalk.gray('─'),
            bottomJoin: chalk.gray('┴'),
            bottomLeft: chalk.gray('└'),
            bottomRight: chalk.gray('┘'),
            bodyLeft: chalk.gray('│'),
            bodyRight: chalk.gray('│'),
            bodyJoin: chalk.gray('│'),
            joinBody: chalk.gray('─'),
            joinLeft: chalk.gray('├'),
            joinRight: chalk.gray('┤'),
            joinJoin: chalk.gray('┼'),
          },
        };

        console.log(table(tableData, tableConfig));

        // Summary
        const healthyCount = services.filter(s => s.status === 'healthy').length;
        const warningCount = services.filter(s => s.status === 'warning').length;
        const errorCount = services.filter(s => s.status === 'error').length;

        console.log(chalk.bold('\nSummary:'));
        console.log(
          `  Total: ${services.length} | ` +
          chalk.green(`Healthy: ${healthyCount}`) + ' | ' +
          chalk.yellow(`Warning: ${warningCount}`) + ' | ' +
          chalk.red(`Error: ${errorCount}`)
        );

        logger.info(`Listed ${services.length} services`);
      } catch (error: any) {
        spinner.fail(chalk.red('Failed to fetch services'));
        throw error;
      }
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      logger.error('List command failed', error);
      process.exit(1);
    }
  });