#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import figlet from 'figlet';

import { GenerateCommand } from './commands/generate.js';
import { InitCommand } from './commands/init.js';
import { ListCommand } from './commands/list.js';
import { ConfigCommand } from './commands/config.js';

const program = new Command();

// Display banner
console.log(
  chalk.cyan(
    figlet.textSync('DevEX Platform', {
      font: 'Small',
      horizontalLayout: 'default',
      verticalLayout: 'default',
    })
  )
);

program
  .name('devex')
  .description('DevEX Platform - Enterprise service generation and development portal')
  .version('0.1.0');

// Register commands
const generateCommand = new GenerateCommand();
const initCommand = new InitCommand();
const listCommand = new ListCommand();
const configCommand = new ConfigCommand();

program.addCommand(generateCommand.build());
program.addCommand(initCommand.build());
program.addCommand(listCommand.build());
program.addCommand(configCommand.build());

// Global options
program
  .option('-v, --verbose', 'verbose output')
  .option('--dry-run', 'show what would be done without making changes')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.verbose) {
      process.env.LOG_LEVEL = 'debug';
    }
  });

// Error handling
program.exitOverride((err) => {
  if (err.code === 'commander.help') {
    process.exit(0);
  }
  if (err.code === 'commander.version') {
    process.exit(0);
  }
  
  console.error(chalk.red('Error:'), err.message);
  process.exit(1);
});

program.parse();