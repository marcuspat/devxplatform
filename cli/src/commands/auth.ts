import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { config } from '../lib/config.js';
import { api } from '../lib/api.js';
import { logger } from '../utils/logger.js';
import terminalLink from 'terminal-link';

export const authCommand = new Command('auth')
  .description('Authenticate with DevX Platform')
  .addCommand(
    new Command('login')
      .description('Login to DevX Platform')
      .option('--token <token>', 'Use API token for authentication')
      .option('--sso', 'Use SSO authentication')
      .action(async (options) => {
        try {
          if (options.token) {
            // Token-based auth
            const spinner = ora('Validating API token...').start();
            try {
              const user = await api.validateToken(options.token);
              config.set('auth.token', options.token);
              config.set('auth.user', user);
              spinner.succeed(chalk.green('Authentication successful!'));
              console.log(`Logged in as ${chalk.bold(user.email)}`);
            } catch (error) {
              spinner.fail(chalk.red('Invalid API token'));
              process.exit(1);
            }
          } else if (options.sso) {
            // SSO auth
            console.log(chalk.blue('Starting SSO authentication...'));
            const authUrl = await api.initiateSSOAuth();
            const link = terminalLink('Click here to authenticate', authUrl, {
              fallback: () => `Open this URL in your browser:\n${authUrl}`,
            });
            console.log('\n' + link);
            
            const spinner = ora('Waiting for authentication...').start();
            
            // Poll for auth completion
            const token = await api.pollSSOAuth(authUrl);
            const user = await api.validateToken(token);
            
            config.set('auth.token', token);
            config.set('auth.user', user);
            spinner.succeed(chalk.green('Authentication successful!'));
            console.log(`Logged in as ${chalk.bold(user.email)}`);
          } else {
            // Interactive login
            const { email, password } = await inquirer.prompt([
              {
                type: 'input',
                name: 'email',
                message: 'Email:',
                validate: (input) => {
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  return emailRegex.test(input) || 'Please enter a valid email';
                },
              },
              {
                type: 'password',
                name: 'password',
                message: 'Password:',
                mask: '*',
              },
            ]);

            const spinner = ora('Authenticating...').start();
            try {
              const { token, user } = await api.login(email, password);
              config.set('auth.token', token);
              config.set('auth.user', user);
              spinner.succeed(chalk.green('Authentication successful!'));
              console.log(`Logged in as ${chalk.bold(user.email)}`);
            } catch (error: any) {
              spinner.fail(chalk.red('Authentication failed'));
              console.error(chalk.red('Error:'), error.message);
              process.exit(1);
            }
          }

          logger.info('User authenticated successfully');
        } catch (error: any) {
          console.error(chalk.red('Error:'), error.message);
          logger.error('Auth login failed', error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('logout')
      .description('Logout from DevX Platform')
      .action(async () => {
        try {
          const user = config.get('auth.user');
          if (!user) {
            console.log(chalk.yellow('Not currently logged in'));
            return;
          }

          config.delete('auth.token');
          config.delete('auth.user');
          console.log(chalk.green('Successfully logged out'));
          logger.info('User logged out');
        } catch (error: any) {
          console.error(chalk.red('Error:'), error.message);
          logger.error('Auth logout failed', error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('whoami')
      .description('Show current user')
      .action(async () => {
        try {
          const user = config.get('auth.user');
          const token = config.get('auth.token');
          
          if (!user || !token) {
            console.log(chalk.yellow('Not logged in'));
            console.log('Run ' + chalk.cyan('devex auth login') + ' to authenticate');
            return;
          }

          // Validate token is still valid
          const spinner = ora('Validating session...').start();
          try {
            const currentUser = await api.getCurrentUser();
            spinner.stop();
            
            console.log(chalk.bold('Current User:'));
            console.log(`  Email:    ${currentUser.email}`);
            console.log(`  Name:     ${currentUser.name}`);
            console.log(`  Role:     ${currentUser.role}`);
            console.log(`  Team:     ${currentUser.team}`);
            console.log(`  API Key:  ${token.substring(0, 8)}...`);
          } catch (error) {
            spinner.fail(chalk.red('Session expired'));
            config.delete('auth.token');
            config.delete('auth.user');
            console.log('Please run ' + chalk.cyan('devex auth login') + ' to re-authenticate');
          }
        } catch (error: any) {
          console.error(chalk.red('Error:'), error.message);
          logger.error('Auth whoami failed', error);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('token')
      .description('Manage API tokens')
      .option('--create', 'Create a new API token')
      .option('--list', 'List all API tokens')
      .option('--revoke <id>', 'Revoke an API token')
      .action(async (options) => {
        try {
          if (options.create) {
            const { name, expires } = await inquirer.prompt([
              {
                type: 'input',
                name: 'name',
                message: 'Token name:',
                validate: (input) => input.length > 0 || 'Token name is required',
              },
              {
                type: 'list',
                name: 'expires',
                message: 'Expiration:',
                choices: [
                  { name: '30 days', value: 30 },
                  { name: '90 days', value: 90 },
                  { name: '1 year', value: 365 },
                  { name: 'Never', value: 0 },
                ],
              },
            ]);

            const spinner = ora('Creating API token...').start();
            try {
              const token = await api.createAPIToken(name, expires);
              spinner.succeed(chalk.green('API token created successfully!'));
              console.log('\n' + chalk.bold('Token:') + ' ' + chalk.yellow(token.value));
              console.log(chalk.red('\n⚠  This token will only be shown once. Please save it securely.'));
            } catch (error) {
              spinner.fail(chalk.red('Failed to create token'));
              throw error;
            }
          } else if (options.list) {
            const spinner = ora('Fetching API tokens...').start();
            try {
              const tokens = await api.listAPITokens();
              spinner.stop();
              
              if (tokens.length === 0) {
                console.log(chalk.yellow('No API tokens found'));
                return;
              }

              console.log(chalk.bold('\nAPI Tokens:'));
              tokens.forEach((token: any) => {
                const expiresText = token.expiresAt ? 
                  new Date(token.expiresAt).toLocaleDateString() : 
                  'Never';
                console.log(`\n  ${chalk.bold(token.name)}`);
                console.log(`    ID:       ${token.id}`);
                console.log(`    Created:  ${new Date(token.createdAt).toLocaleDateString()}`);
                console.log(`    Expires:  ${expiresText}`);
                console.log(`    Last Use: ${token.lastUsed ? new Date(token.lastUsed).toLocaleDateString() : 'Never'}`);
              });
            } catch (error) {
              spinner.fail(chalk.red('Failed to fetch tokens'));
              throw error;
            }
          } else if (options.revoke) {
            const { confirm } = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'confirm',
                message: `Revoke token ${options.revoke}?`,
                default: false,
              },
            ]);

            if (confirm) {
              const spinner = ora('Revoking token...').start();
              try {
                await api.revokeAPIToken(options.revoke);
                spinner.succeed(chalk.green('Token revoked successfully'));
              } catch (error) {
                spinner.fail(chalk.red('Failed to revoke token'));
                throw error;
              }
            }
          } else {
            console.log(chalk.yellow('Please specify an action: --create, --list, or --revoke <id>'));
          }
        } catch (error: any) {
          console.error(chalk.red('Error:'), error.message);
          logger.error('Auth token command failed', error);
          process.exit(1);
        }
      })
  );