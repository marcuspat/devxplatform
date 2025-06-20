import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import path from 'path';

import { PlatformEngine, ServiceType, ProgrammingLanguage, Framework } from '@devex/platform-core';
import { createLogger } from '@devex/platform-core';
import { loadPlatformConfig } from '@devex/platform-core';

export class GenerateCommand {
  build(): Command {
    return new Command('generate')
      .alias('gen')
      .description('Generate a new service or component')
      .argument('[name]', 'Name of the service to generate')
      .option('-t, --type <type>', 'Service type (api, webapp, microservice, etc.)')
      .option('-l, --language <language>', 'Programming language')
      .option('-f, --framework <framework>', 'Framework to use')
      .option('-o, --output <path>', 'Output directory')
      .option('--force', 'Overwrite existing files')
      .option('--interactive', 'Interactive mode')
      .action(async (name, options) => {
        await this.execute(name, options);
      });
  }

  private async execute(name: string, options: any): Promise<void> {
    try {
      const logger = createLogger({ level: process.env.LOG_LEVEL || 'info' });
      
      let serviceName = name;
      let serviceType = options.type;
      let language = options.language;
      let framework = options.framework;
      let outputPath = options.output;

      // Interactive mode or missing required options
      if (options.interactive || !serviceName || !serviceType || !language) {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'Service name:',
            default: serviceName,
            when: !serviceName,
            validate: (input) => {
              if (!input.trim()) return 'Service name is required';
              if (!/^[a-zA-Z][a-zA-Z0-9-_]*$/.test(input)) {
                return 'Service name must start with a letter and contain only letters, numbers, hyphens, and underscores';
              }
              return true;
            },
          },
          {
            type: 'list',
            name: 'type',
            message: 'Service type:',
            choices: Object.values(ServiceType),
            default: serviceType,
            when: !serviceType,
          },
          {
            type: 'list',
            name: 'language',
            message: 'Programming language:',
            choices: Object.values(ProgrammingLanguage),
            default: language,
            when: !language,
          },
          {
            type: 'list',
            name: 'framework',
            message: 'Framework:',
            choices: (answers) => {
              const lang = answers.language || language;
              return this.getFrameworksForLanguage(lang);
            },
            default: framework,
            when: !framework,
          },
          {
            type: 'input',
            name: 'output',
            message: 'Output directory:',
            default: outputPath || `./${serviceName || 'service'}`,
            when: !outputPath,
          },
        ]);

        serviceName = answers.name || serviceName;
        serviceType = answers.type || serviceType;
        language = answers.language || language;
        framework = answers.framework || framework;
        outputPath = answers.output || outputPath;
      }

      // Validate required options
      if (!serviceName || !serviceType || !language) {
        throw new Error('Service name, type, and language are required');
      }

      // Create service configuration
      const serviceConfig = {
        name: serviceName,
        version: '0.1.0',
        description: `Generated ${serviceType} service`,
        type: serviceType as ServiceType,
        language: language as ProgrammingLanguage,
        framework: framework as Framework | undefined,
      };

      // Load platform configuration
      const platformConfig = await loadPlatformConfig();
      
      // Create platform engine
      const engine = new PlatformEngine({
        config: platformConfig,
        logger,
      });

      // Generate service
      const spinner = ora('Generating service...').start();
      
      try {
        await engine.generateService(serviceConfig, {
          outputPath: path.resolve(outputPath),
          force: options.force,
          dryRun: options.dryRun,
          verbose: options.verbose,
        });

        spinner.succeed('Service generated successfully!');
        
        console.log(chalk.green('\n✓ Service generated successfully!'));
        console.log(chalk.gray(`  Output: ${path.resolve(outputPath)}`));
        console.log(chalk.gray(`  Type: ${serviceType}`));
        console.log(chalk.gray(`  Language: ${language}`));
        if (framework) {
          console.log(chalk.gray(`  Framework: ${framework}`));
        }

        if (!options.dryRun) {
          console.log(chalk.cyan('\nNext steps:'));
          console.log(chalk.cyan(`  cd ${outputPath}`));
          console.log(chalk.cyan('  npm install'));
          console.log(chalk.cyan('  npm run dev'));
        }
      } catch (error) {
        spinner.fail('Service generation failed');
        throw error;
      } finally {
        await engine.shutdown();
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private getFrameworksForLanguage(language: ProgrammingLanguage): Framework[] {
    const frameworkMap: Record<ProgrammingLanguage, Framework[]> = {
      [ProgrammingLanguage.TypeScript]: [
        Framework.Express,
        Framework.NestJS,
        Framework.NextJS,
        Framework.React,
      ],
      [ProgrammingLanguage.JavaScript]: [
        Framework.Express,
        Framework.React,
        Framework.Vue,
        Framework.Angular,
      ],
      [ProgrammingLanguage.Python]: [
        Framework.FastAPI,
        Framework.Django,
        Framework.Flask,
      ],
      [ProgrammingLanguage.Go]: [
        Framework.Gin,
        Framework.Echo,
        Framework.Fiber,
      ],
      [ProgrammingLanguage.Java]: [],
      [ProgrammingLanguage.Rust]: [],
    };

    return frameworkMap[language] || [];
  }
}