import { Command } from 'commander';
import chalk from 'chalk';
import { config } from '../lib/config.js';
import { logger } from '../utils/logger.js';
import { table } from 'table';

const CONFIG_KEYS = [
  'api.url',
  'api.timeout',
  'auth.token',
  'auth.user',
  'defaults.environment',
  'defaults.region',
  'output.format',
  'output.colors',
  'telemetry.enabled',
];

export const configCommand = new Command('config')
  .description('Manage CLI configuration')
  .addCommand(
    new Command('list')
      .description('List all configuration values')
      .option('--show-secrets', 'Show sensitive values')
      .action((options) => {
        try {
          const tableData = [[
            chalk.bold('Key'),
            chalk.bold('Value'),
          ]];

          CONFIG_KEYS.forEach(key => {
            let value = config.get(key);
            
            if (value !== undefined) {
              // Hide sensitive values unless requested
              if ((key === 'auth.token' || key.includes('secret')) && !options.showSecrets) {
                value = value.substring(0, 8) + '...';
              }
              
              // Format objects
              if (typeof value === 'object') {
                value = JSON.stringify(value);
              }
              
              tableData.push([key, String(value)]);
            }
          });

          if (tableData.length === 1) {
            console.log(chalk.yellow('No configuration found'));
            return;
          }

          console.log(table(tableData, {
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
          }));

          console.log(chalk.gray(`\nConfig file: ${config.path}`));
        } catch (error: any) {
          console.error(chalk.red('Error:'), error.message);
          logger.error('Config list failed', error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('get')
      .description('Get a configuration value')
      .argument('<key>', 'Configuration key')
      .action((key) => {
        try {
          const value = config.get(key);
          if (value === undefined) {
            console.log(chalk.yellow(`Configuration key '${key}' not found`));
            process.exit(1);
          }
          
          if (typeof value === 'object') {
            console.log(JSON.stringify(value, null, 2));
          } else {
            console.log(value);
          }
        } catch (error: any) {
          console.error(chalk.red('Error:'), error.message);
          logger.error('Config get failed', error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('set')
      .description('Set a configuration value')
      .argument('<key>', 'Configuration key')
      .argument('<value>', 'Configuration value')
      .action((key, value) => {
        try {
          // Validate key
          if (!CONFIG_KEYS.includes(key) && !key.startsWith('custom.')) {
            console.log(chalk.yellow(`Warning: '${key}' is not a standard configuration key`));
          }

          // Parse value if it looks like JSON
          let parsedValue: any = value;
          if (value.startsWith('{') || value.startsWith('[')) {
            try {
              parsedValue = JSON.parse(value);
            } catch {
              // Keep as string if JSON parsing fails
            }
          } else if (value === 'true') {
            parsedValue = true;
          } else if (value === 'false') {
            parsedValue = false;
          } else if (!isNaN(Number(value))) {
            parsedValue = Number(value);
          }

          config.set(key, parsedValue);
          console.log(chalk.green(`Configuration updated: ${key} = ${value}`));
          logger.info(`Config set: ${key}`);
        } catch (error: any) {
          console.error(chalk.red('Error:'), error.message);
          logger.error('Config set failed', error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('unset')
      .description('Remove a configuration value')
      .argument('<key>', 'Configuration key')
      .action((key) => {
        try {
          if (!config.has(key)) {
            console.log(chalk.yellow(`Configuration key '${key}' not found`));
            process.exit(1);
          }
          
          config.delete(key);
          console.log(chalk.green(`Configuration removed: ${key}`));
          logger.info(`Config unset: ${key}`);
        } catch (error: any) {
          console.error(chalk.red('Error:'), error.message);
          logger.error('Config unset failed', error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('reset')
      .description('Reset all configuration to defaults')
      .option('-y, --yes', 'Skip confirmation')
      .action(async (options) => {
        try {
          if (!options.yes) {
            const inquirer = (await import('inquirer')).default;
            const { confirm } = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'confirm',
                message: 'This will reset all configuration. Continue?',
                default: false,
              },
            ]);

            if (!confirm) {
              console.log(chalk.yellow('Reset cancelled'));
              return;
            }
          }

          config.clear();
          console.log(chalk.green('Configuration reset to defaults'));
          logger.info('Config reset');
        } catch (error: any) {
          console.error(chalk.red('Error:'), error.message);
          logger.error('Config reset failed', error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('path')
      .description('Show configuration file path')
      .action(() => {
        console.log(config.path);
      })
  );