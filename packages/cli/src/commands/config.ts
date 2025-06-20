import { Command } from 'commander';
import chalk from 'chalk';
import { promises as fs } from 'fs';

import { loadPlatformConfig } from '@devex/platform-core';

export class ConfigCommand {
  build(): Command {
    const command = new Command('config')
      .description('Manage platform configuration');

    command
      .command('show')
      .description('Show current configuration')
      .action(() => this.showConfig());

    command
      .command('validate')
      .description('Validate configuration file')
      .option('-f, --file <file>', 'Configuration file path')
      .action((options) => this.validateConfig(options));

    return command;
  }

  private async showConfig(): Promise<void> {
    try {
      const config = await loadPlatformConfig();
      
      console.log(chalk.cyan('Current platform configuration:'));
      console.log();
      console.log(JSON.stringify(config, null, 2));
    } catch (error) {
      console.error(chalk.red('Error loading configuration:'), 
        error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async validateConfig(options: any): Promise<void> {
    try {
      const configPath = options.file;
      
      if (configPath && !(await this.fileExists(configPath))) {
        throw new Error(`Configuration file not found: ${configPath}`);
      }

      const config = await loadPlatformConfig(configPath);
      
      console.log(chalk.green('✓ Configuration is valid'));
      console.log(chalk.gray(`  Version: ${config.version}`));
      console.log(chalk.gray(`  Templates path: ${config.templatesPath}`));
      console.log(chalk.gray(`  Output path: ${config.outputPath}`));
      console.log(chalk.gray(`  Generators: ${config.generators.length}`));
      console.log(chalk.gray(`  Plugins: ${config.plugins?.length || 0}`));
    } catch (error) {
      console.error(chalk.red('Configuration validation failed:'), 
        error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}