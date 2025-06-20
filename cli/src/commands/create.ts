import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { resolve } from 'path';
import { logger } from '../utils/logger.js';
import { templates } from '../lib/templates.js';
import { validateServiceName } from '../utils/validators.js';
import { ProjectGenerator } from '../lib/project-generator.js';
import { QualityGatesManager } from '../lib/quality-gates.js';

export const createCommand = new Command('create')
  .description('Create a new service from a template')
  .argument('[name]', 'Service name')
  .option('-t, --template <template>', 'Template to use')
  .option('-o, --output <directory>', 'Output directory', process.cwd())
  .option('--overwrite', 'Overwrite existing directory')
  .option('--port <port>', 'Service port', '3000')
  .option('--cpu <cores>', 'CPU allocation in cores', '0.5')
  .option('--memory <gb>', 'Memory allocation in GB', '1')
  .option('--database', 'Enable database support')
  .option('--redis', 'Enable Redis support')
  .option('--swagger', 'Enable Swagger documentation')
  .option('--author <author>', 'Author name')
  .option('--email <email>', 'Author email')
  .option('--organization <org>', 'Organization name')
  .option('-y, --yes', 'Skip confirmation prompts')
  .option('--skip-validation', 'Skip quality gates validation')
  .option('--validation-level <level>', 'Validation level (basic|standard|strict)', 'standard')
  .option('--fail-on-warnings', 'Fail if validation has warnings')
  .action(async (name, options) => {
    try {
      const generator = new ProjectGenerator();
      let serviceName = name;
      let selectedTemplate = options.template;

      // Validate service name if provided
      if (serviceName) {
        const validation = validateServiceName(serviceName);
        if (validation !== true) {
          throw new Error(typeof validation === 'string' ? validation : 'Invalid service name');
        }
      }

      // Interactive prompts if not provided
      if (!serviceName) {
        const { inputName } = await inquirer.prompt([
          {
            type: 'input',
            name: 'inputName',
            message: 'Service name:',
            validate: validateServiceName,
          },
        ]);
        serviceName = inputName;
      }

      if (!selectedTemplate) {
        const { template } = await inquirer.prompt([
          {
            type: 'list',
            name: 'template',
            message: 'Select a template:',
            choices: templates.map(t => ({
              name: `${t.name} - ${chalk.gray(t.description)}`,
              value: t.id,
            })),
          },
        ]);
        selectedTemplate = template;
      }

      // Get template info
      const template = generator.getTemplate(selectedTemplate);
      const outputDir = resolve(options.output);
      const projectPath = resolve(outputDir, serviceName);

      // Check if directory exists
      if (!generator.isDirectoryEmpty(projectPath) && !options.overwrite) {
        const { overwrite } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'overwrite',
            message: `Directory ${projectPath} is not empty. Overwrite?`,
            default: false,
          },
        ]);
        
        if (!overwrite) {
          console.log(chalk.yellow('Service creation cancelled.'));
          return;
        }
        options.overwrite = true;
      }

      // Build features object
      const features: Record<string, boolean> = {
        database: options.database || false,
        redis: options.redis || false,
        swagger: options.swagger || true, // Default to true for documentation
      };

      // Show configuration summary
      console.log('\n' + chalk.bold('Service Configuration:'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`${chalk.bold('Name:')}         ${serviceName}`);
      console.log(`${chalk.bold('Template:')}     ${template.name} (${template.language})`);
      console.log(`${chalk.bold('Output Dir:')}   ${projectPath}`);
      console.log(`${chalk.bold('Port:')}         ${options.port}`);
      console.log(`${chalk.bold('CPU:')}          ${options.cpu} cores`);
      console.log(`${chalk.bold('Memory:')}       ${options.memory} GB`);
      console.log(`${chalk.bold('Features:')}     ${Object.entries(features).filter(([_, enabled]) => enabled).map(([name]) => name).join(', ') || 'None'}`);
      console.log(`${chalk.bold('Author:')}       ${options.author || 'Not specified'}`);
      console.log(`${chalk.bold('Email:')}        ${options.email || 'Not specified'}`);
      console.log(chalk.gray('─'.repeat(50)) + '\n');

      // Confirmation
      if (!options.yes) {
        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: 'Create service with this configuration?',
            default: true,
          },
        ]);

        if (!confirm) {
          console.log(chalk.yellow('Service creation cancelled.'));
          return;
        }
      }

      // Generate the project
      const spinner = ora('Generating project files...').start();

      try {
        await generator.generateProject({
          serviceName,
          templateId: selectedTemplate,
          outputDir,
          overwrite: options.overwrite,
          features,
          author: options.author,
          email: options.email,
          organization: options.organization,
          port: parseInt(options.port),
          cpu: parseFloat(options.cpu),
          memory: parseFloat(options.memory),
        });

        spinner.succeed(chalk.green('Project generated successfully!'));

        // Run quality gates validation if not skipped
        if (!options.skipValidation) {
          console.log('\n' + chalk.bold('🔍 Running Quality Gates Validation...'));
          
          const validationSpinner = ora('Validating generated code...').start();
          
          try {
            const gatesManager = new QualityGatesManager();
            const validationOptions = {
              skipOptional: options.validationLevel === 'basic',
              failFast: options.validationLevel === 'strict'
            };
            
            const report = await gatesManager.runQualityGates(projectPath, undefined, validationOptions);
            
            validationSpinner.stop();
            
            // Show validation results
            const validationOutput = gatesManager.generateQualityGatesReport(report);
            console.log(validationOutput);
            
            // Check if we should fail on warnings or errors
            const shouldFail = report.overallResult === 'FAILED' || 
                             (options.failOnWarnings && report.overallResult === 'WARNING');
            
            if (shouldFail) {
              console.log(chalk.red('\n❌ Service creation failed due to validation issues'));
              console.log(chalk.yellow('You can use --skip-validation to bypass quality gates'));
              process.exit(1);
            } else if (report.overallResult === 'WARNING') {
              console.log(chalk.yellow('\n⚠️ Service created with validation warnings'));
            } else {
              console.log(chalk.green('\n✅ Service created and validated successfully'));
            }
            
          } catch (validationError: any) {
            validationSpinner.fail('Validation failed');
            console.log(chalk.red(`Validation error: ${validationError.message}`));
            
            if (options.validationLevel === 'strict') {
              console.log(chalk.red('\n❌ Service creation failed due to validation error'));
              process.exit(1);
            } else {
              console.log(chalk.yellow('\n⚠️ Service created but validation failed'));
            }
          }
        }

        console.log('\n' + chalk.bold('Project Details:'));
        console.log(`${chalk.bold('Name:')}       ${serviceName}`);
        console.log(`${chalk.bold('Path:')}       ${projectPath}`);
        console.log(`${chalk.bold('Template:')}   ${template.name}`);
        console.log(`${chalk.bold('Language:')}   ${template.language}`);
        if (template.framework) {
          console.log(`${chalk.bold('Framework:')}  ${template.framework}`);
        }

        console.log('\n' + chalk.bold('Next Steps:'));
        console.log(`  ${chalk.gray('1.')} ${chalk.cyan(`cd ${serviceName}`)}`);
        console.log(`  ${chalk.gray('2.')} ${chalk.cyan('npm install')}`);
        console.log(`  ${chalk.gray('3.')} ${chalk.cyan('cp .env.example .env')}`);
        console.log(`  ${chalk.gray('4.')} ${chalk.cyan('npm run dev')}`);
        
        if (features.database) {
          console.log(`  ${chalk.gray('5.')} ${chalk.cyan('npm run db:migrate')} ${chalk.gray('(setup database)')}`);
        }
        
        console.log('\n' + chalk.bold('Additional Commands:'));
        console.log(`  ${chalk.gray('•')} Run tests: ${chalk.cyan('npm test')}`);
        console.log(`  ${chalk.gray('•')} Build: ${chalk.cyan('npm run build')}`);
        console.log(`  ${chalk.gray('•')} Docker: ${chalk.cyan('npm run docker:build')}`);
        console.log(`  ${chalk.gray('•')} Lint: ${chalk.cyan('npm run lint')}`);

        logger.info(`Service created: ${serviceName} at ${projectPath}`);
      } catch (error: any) {
        spinner.fail(chalk.red('Failed to generate project'));
        throw error;
      }
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      logger.error('Create command failed', error);
      process.exit(1);
    }
  });