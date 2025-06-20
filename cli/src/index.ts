#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import updateNotifier from 'update-notifier';

// Commands
import { createCommand } from './commands/create.js';
import { validateCommand } from './commands/validate.js';
import { listCommand } from './commands/list.js';
import { deployCommand } from './commands/deploy.js';
import { logsCommand } from './commands/logs.js';
import { statusCommand } from './commands/status.js';
import { authCommand } from './commands/auth.js';
import { configCommand } from './commands/config.js';
import { jobsCommand } from './commands/jobs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')
);

// Check for updates
const notifier = updateNotifier({ pkg: packageJson });
notifier.notify();

// Create the main program
const program = new Command();

program
  .name('devex')
  .description(
    chalk.bold.blue('DevX Platform CLI') +
    '\n\n' +
    'Accelerate your development workflow with self-service infrastructure'
  )
  .version(packageJson.version, '-v, --version', 'Display version number')
  .helpOption('-h, --help', 'Display help for command')
  .addHelpText('after', `\n${chalk.gray('Examples:')}
  $ devex create my-service
  $ devex list --all
  $ devex deploy my-service --env production
  $ devex logs my-service --tail
  $ devex status
  $ devex jobs status <jobId>
  $ devex jobs stats\n`);

// Add commands
program.addCommand(createCommand);
program.addCommand(listCommand);
program.addCommand(deployCommand);
program.addCommand(logsCommand);
program.addCommand(statusCommand);
program.addCommand(authCommand);
program.addCommand(configCommand);
program.addCommand(jobsCommand);

// Global error handling
program.exitOverride();

try {
  await program.parseAsync(process.argv);
} catch (error: any) {
  if (error.code === 'commander.missingArgument') {
    console.error(chalk.red('Error:'), error.message);
  } else if (error.code === 'commander.unknownCommand') {
    console.error(chalk.red('Error:'), 'Unknown command');
    program.outputHelp();
  } else if (error.code === 'commander.help') {
    // Help was requested, exit gracefully
    process.exit(0);
  } else {
    console.error(chalk.red('Error:'), error.message || 'An unexpected error occurred');
  }
  process.exit(1);
}