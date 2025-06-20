import { Command } from 'commander';
import chalk from 'chalk';
import { promises as fs } from 'fs';
import path from 'path';

export class InitCommand {
  build(): Command {
    return new Command('init')
      .description('Initialize a new DevEX platform project')
      .option('-n, --name <name>', 'Project name', 'my-devex-project')
      .option('-t, --template <template>', 'Project template', 'basic')
      .action(async (options) => {
        await this.execute(options);
      });
  }

  private async execute(options: any): Promise<void> {
    try {
      const projectName = options.name;
      const template = options.template;

      console.log(chalk.cyan(`Initializing DevEX platform project: ${projectName}`));

      // Create project directory
      await fs.mkdir(projectName, { recursive: true });

      // Create platform configuration
      const platformConfig = {
        version: '1.0.0',
        templatesPath: './templates',
        outputPath: './services',
        generators: [
          {
            name: 'service',
            enabled: true,
          },
          {
            name: 'api',
            enabled: true,
          },
        ],
        plugins: [],
      };

      const configPath = path.join(projectName, 'devex.config.json');
      await fs.writeFile(configPath, JSON.stringify(platformConfig, null, 2));

      // Create templates directory structure
      const templatesDir = path.join(projectName, 'templates');
      await fs.mkdir(templatesDir, { recursive: true });

      // Create services directory
      const servicesDir = path.join(projectName, 'services');
      await fs.mkdir(servicesDir, { recursive: true });

      // Create README
      const readme = `# ${projectName}

DevEX Platform Project

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install -g @devex/cli
   \`\`\`

2. Generate a new service:
   \`\`\`bash
   devex generate my-api --type api --language typescript --framework express
   \`\`\`

3. List available templates:
   \`\`\`bash
   devex list templates
   \`\`\`

## Configuration

The platform configuration is stored in \`devex.config.json\`.

## Templates

Custom templates can be added to the \`templates/\` directory.

## Services

Generated services are placed in the \`services/\` directory.
`;

      const readmePath = path.join(projectName, 'README.md');
      await fs.writeFile(readmePath, readme);

      console.log(chalk.green('✓ Project initialized successfully!'));
      console.log(chalk.gray(`  Directory: ${projectName}`));
      console.log(chalk.gray(`  Configuration: ${configPath}`));
      console.log(chalk.gray(`  Templates: ${templatesDir}`));
      console.log(chalk.gray(`  Services: ${servicesDir}`));

      console.log(chalk.cyan('\nNext steps:'));
      console.log(chalk.cyan(`  cd ${projectName}`));
      console.log(chalk.cyan('  devex generate --interactive'));
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }
}