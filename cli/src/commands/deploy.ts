import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { api } from '../lib/api.js';
import { logger } from '../utils/logger.js';
import { execSync } from 'child_process';

export const deployCommand = new Command('deploy')
  .description('Deploy a service to an environment')
  .argument('<service>', 'Service name to deploy')
  .option('-e, --env <environment>', 'Target environment', 'development')
  .option('-t, --tag <tag>', 'Docker image tag or git commit')
  .option('--no-build', 'Skip build step')
  .option('--no-tests', 'Skip running tests')
  .option('--force', 'Force deployment even with failures')
  .option('-y, --yes', 'Skip confirmation prompts')
  .action(async (serviceName, options) => {
    try {
      // Validate service exists
      const spinner = ora('Validating service...').start();
      
      let service;
      try {
        service = await api.getService(serviceName);
        spinner.succeed('Service validated');
      } catch (error) {
        spinner.fail(chalk.red(`Service '${serviceName}' not found`));
        process.exit(1);
      }

      // Get deployment tag
      let deployTag = options.tag;
      if (!deployTag) {
        try {
          deployTag = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
        } catch {
          deployTag = 'latest';
        }
      }

      // Show deployment plan
      console.log('\n' + chalk.bold('Deployment Plan:'));
      console.log(chalk.gray('─'.repeat(40)));
      console.log(`${chalk.bold('Service:')}     ${serviceName}`);
      console.log(`${chalk.bold('Environment:')} ${options.env}`);
      console.log(`${chalk.bold('Tag:')}         ${deployTag}`);
      console.log(`${chalk.bold('Build:')}       ${options.build ? 'Yes' : 'No'}`);
      console.log(`${chalk.bold('Tests:')}       ${options.tests ? 'Yes' : 'No'}`);
      console.log(chalk.gray('─'.repeat(40)) + '\n');

      // Show warning for production
      if (options.env === 'production') {
        console.log(chalk.yellow.bold('⚠  WARNING: You are deploying to PRODUCTION!\n'));
      }

      // Confirmation
      if (!options.yes) {
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: `Deploy ${serviceName} to ${options.env}?`,
            default: options.env !== 'production',
          },
        ]);

        if (!confirm) {
          console.log(chalk.yellow('Deployment cancelled.'));
          return;
        }
      }

      // Build step
      if (options.build) {
        const buildSpinner = ora('Building service...').start();
        try {
          await api.buildService(serviceName, { tag: deployTag });
          buildSpinner.succeed('Build completed');
        } catch (error: any) {
          buildSpinner.fail(chalk.red('Build failed'));
          if (!options.force) {
            throw error;
          }
          console.log(chalk.yellow('Continuing with --force flag...'));
        }
      }

      // Test step
      if (options.tests) {
        const testSpinner = ora('Running tests...').start();
        try {
          const testResults = await api.runTests(serviceName);
          if (testResults.passed) {
            testSpinner.succeed(`Tests passed (${testResults.passed}/${testResults.total})`);
          } else {
            testSpinner.fail(chalk.red(`Tests failed (${testResults.failed} failures)`));
            if (!options.force) {
              throw new Error('Tests failed');
            }
            console.log(chalk.yellow('Continuing with --force flag...'));
          }
        } catch (error: any) {
          testSpinner.fail(chalk.red('Test execution failed'));
          if (!options.force) {
            throw error;
          }
        }
      }

      // Deploy
      const deploySpinner = ora('Deploying service...').start();
      
      try {
        const deployment = await api.deployService(serviceName, {
          environment: options.env,
          tag: deployTag,
        });

        deploySpinner.succeed(chalk.green('Deployment successful!'));

        console.log('\n' + chalk.bold('Deployment Details:'));
        console.log(`${chalk.bold('ID:')}          ${deployment.id}`);
        console.log(`${chalk.bold('Version:')}     ${deployment.version}`);
        console.log(`${chalk.bold('Status:')}      ${deployment.status}`);
        console.log(`${chalk.bold('URL:')}         ${chalk.cyan(deployment.url)}`);
        console.log(`${chalk.bold('Started:')}     ${new Date(deployment.startTime).toLocaleString()}`);

        // Monitor rollout
        console.log('\n' + chalk.blue('Monitoring rollout...'));
        const monitorSpinner = ora('Waiting for healthy status...').start();
        
        let healthy = false;
        for (let i = 0; i < 30; i++) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const status = await api.getDeploymentStatus(deployment.id);
          
          if (status.healthy) {
            healthy = true;
            break;
          }
          
          monitorSpinner.text = `Waiting for healthy status... (${status.readyInstances}/${status.desiredInstances} ready)`;
        }

        if (healthy) {
          monitorSpinner.succeed(chalk.green('Service is healthy!'));
          console.log('\n' + chalk.bold.green('✓ Deployment completed successfully'));
        } else {
          monitorSpinner.fail(chalk.red('Service failed to become healthy'));
          console.log(chalk.yellow('\nCheck logs for more information:'));
          console.log(chalk.cyan(`  devex logs ${serviceName} --tail`));
        }

        logger.info(`Deployed ${serviceName} to ${options.env}`);
      } catch (error: any) {
        deploySpinner.fail(chalk.red('Deployment failed'));
        throw error;
      }
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      logger.error('Deploy command failed', error);
      process.exit(1);
    }
  });