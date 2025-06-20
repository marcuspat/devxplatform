import { Command } from 'commander';
import chalk from 'chalk';

import { ServiceType, ProgrammingLanguage, Framework } from '@devex/platform-core';

export class ListCommand {
  build(): Command {
    const command = new Command('list')
      .description('List available options');

    command
      .command('types')
      .description('List available service types')
      .action(() => this.listServiceTypes());

    command
      .command('languages')
      .description('List available programming languages')
      .action(() => this.listLanguages());

    command
      .command('frameworks')
      .description('List available frameworks')
      .option('-l, --language <language>', 'Filter by programming language')
      .action((options) => this.listFrameworks(options));

    command
      .command('templates')
      .description('List available templates (placeholder)')
      .action(() => this.listTemplates());

    return command;
  }

  private listServiceTypes(): void {
    console.log(chalk.cyan('Available service types:'));
    console.log();
    
    Object.values(ServiceType).forEach(type => {
      console.log(chalk.green(`  ${type}`));
    });
  }

  private listLanguages(): void {
    console.log(chalk.cyan('Available programming languages:'));
    console.log();
    
    Object.values(ProgrammingLanguage).forEach(lang => {
      console.log(chalk.green(`  ${lang}`));
    });
  }

  private listFrameworks(options: any): void {
    console.log(chalk.cyan('Available frameworks:'));
    console.log();

    const frameworks = Object.values(Framework);
    const languageFilter = options.language as ProgrammingLanguage;

    if (languageFilter) {
      console.log(chalk.gray(`Filtered by language: ${languageFilter}`));
      console.log();
    }

    frameworks.forEach(framework => {
      if (!languageFilter || this.isFrameworkCompatible(framework, languageFilter)) {
        console.log(chalk.green(`  ${framework}`));
      }
    });
  }

  private listTemplates(): void {
    console.log(chalk.cyan('Available templates:'));
    console.log();
    console.log(chalk.yellow('Note: Template discovery is not yet implemented.'));
    console.log(chalk.gray('Templates will be loaded from the configured templates directory.'));
  }

  private isFrameworkCompatible(framework: Framework, language: ProgrammingLanguage): boolean {
    const compatibility: Record<Framework, ProgrammingLanguage[]> = {
      [Framework.Express]: [ProgrammingLanguage.TypeScript, ProgrammingLanguage.JavaScript],
      [Framework.Fastify]: [ProgrammingLanguage.TypeScript, ProgrammingLanguage.JavaScript],
      [Framework.NestJS]: [ProgrammingLanguage.TypeScript],
      [Framework.NextJS]: [ProgrammingLanguage.TypeScript, ProgrammingLanguage.JavaScript],
      [Framework.React]: [ProgrammingLanguage.TypeScript, ProgrammingLanguage.JavaScript],
      [Framework.Vue]: [ProgrammingLanguage.TypeScript, ProgrammingLanguage.JavaScript],
      [Framework.Angular]: [ProgrammingLanguage.TypeScript],
      [Framework.Svelte]: [ProgrammingLanguage.TypeScript, ProgrammingLanguage.JavaScript],
      [Framework.FastAPI]: [ProgrammingLanguage.Python],
      [Framework.Django]: [ProgrammingLanguage.Python],
      [Framework.Flask]: [ProgrammingLanguage.Python],
      [Framework.Gin]: [ProgrammingLanguage.Go],
      [Framework.Echo]: [ProgrammingLanguage.Go],
      [Framework.Fiber]: [ProgrammingLanguage.Go],
    };

    return compatibility[framework]?.includes(language) ?? false;
  }
}