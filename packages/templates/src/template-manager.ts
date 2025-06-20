import path from 'path';
import { promises as fs } from 'fs';

import type {
  ServiceConfig,
  ServiceTemplate,
  GeneratorContext,
  Logger,
} from '@devex/platform-core';
import { TemplateError } from '@devex/platform-core';

import { TemplateRegistry } from './template-registry.js';
import { TemplateRenderer } from './template-renderer.js';

export interface TemplateManagerOptions {
  templatesPath: string;
  logger: Logger;
}

export class TemplateManager {
  private readonly registry: TemplateRegistry;
  private readonly renderer: TemplateRenderer;
  private readonly logger: Logger;

  constructor(options: TemplateManagerOptions) {
    this.logger = options.logger;
    this.registry = new TemplateRegistry({
      templatesPath: options.templatesPath,
      logger: this.logger,
    });
    this.renderer = new TemplateRenderer();
  }

  async initialize(): Promise<void> {
    await this.registry.loadTemplates();
    this.logger.info('Template manager initialized', {
      templatesLoaded: this.registry.getTemplateCount(),
    });
  }

  async getTemplate(config: ServiceConfig): Promise<ServiceTemplate | null> {
    return this.registry.findTemplate(config.type, config.language, config.framework);
  }

  async renderTemplate(
    template: ServiceTemplate,
    context: GeneratorContext,
  ): Promise<Map<string, string>> {
    const rendered = new Map<string, string>();

    for (const file of template.files) {
      if (file.condition && !this.evaluateCondition(file.condition, context)) {
        continue;
      }

      if (file.binary) {
        // Binary files are copied as-is
        const sourcePath = path.join(this.registry.getTemplatesPath(), template.name, file.template);
        const content = await fs.readFile(sourcePath);
        rendered.set(file.path, content.toString('base64'));
      } else {
        // Render text files
        const templatePath = path.join(this.registry.getTemplatesPath(), template.name, file.template);
        const content = await this.renderer.renderFile(templatePath, {
          config: context.config,
          utils: context.utils,
          // Add custom template data
          projectName: context.config.name,
          projectVersion: context.config.version,
          projectDescription: context.config.description,
          year: new Date().getFullYear(),
        });
        rendered.set(file.path, content);
      }
    }

    return rendered;
  }

  async generateFromTemplate(
    config: ServiceConfig,
    context: GeneratorContext,
  ): Promise<void> {
    const template = await this.getTemplate(config);
    if (!template) {
      throw new TemplateError(
        `No template found for ${config.type} with ${config.language}`,
      );
    }

    this.logger.info('Generating from template', {
      template: template.name,
      outputPath: context.options.outputPath,
    });

    // Render all template files
    const renderedFiles = await this.renderTemplate(template, context);

    // Write files to output directory
    for (const [filePath, content] of renderedFiles) {
      const outputPath = path.join(context.options.outputPath, filePath);
      const outputDir = path.dirname(outputPath);

      if (!context.options.dryRun) {
        await fs.mkdir(outputDir, { recursive: true });

        if (content.includes('base64:')) {
          // Write binary file
          const binaryContent = Buffer.from(content.replace('base64:', ''), 'base64');
          await fs.writeFile(outputPath, binaryContent);
        } else {
          // Write text file
          await fs.writeFile(outputPath, content, 'utf-8');
        }
      }

      this.logger.debug('Generated file', { path: outputPath });
    }

    // Generate package file
    await this.generatePackageFile(template, context);

    this.logger.info('Template generation completed', {
      filesGenerated: renderedFiles.size,
    });
  }

  private async generatePackageFile(
    template: ServiceTemplate,
    context: GeneratorContext,
  ): Promise<void> {
    const { config, options } = context;

    if (['typescript', 'javascript'].includes(config.language)) {
      const packageJson = {
        name: config.name,
        version: config.version,
        description: config.description,
        type: 'module',
        scripts: template.scripts || {},
        dependencies: {},
        devDependencies: {},
      };

      // Add dependencies
      if (template.dependencies) {
        for (const dep of template.dependencies) {
          if (!dep.condition || this.evaluateCondition(dep.condition, context)) {
            const target = dep.dev ? packageJson.devDependencies : packageJson.dependencies;
            target[dep.name] = dep.version;
          }
        }
      }

      if (!options.dryRun) {
        const outputPath = path.join(options.outputPath, 'package.json');
        await fs.writeFile(outputPath, JSON.stringify(packageJson, null, 2), 'utf-8');
      }
    }
  }

  private evaluateCondition(condition: string, context: GeneratorContext): boolean {
    // Simple condition evaluation
    try {
      const parts = condition.split('.');
      let value: any = context;

      for (const part of parts) {
        value = value?.[part];
        if (value === undefined) return false;
      }

      return Boolean(value);
    } catch {
      return false;
    }
  }

  getAvailableTemplates(): ServiceTemplate[] {
    return this.registry.getAllTemplates();
  }

  registerCustomTemplate(template: ServiceTemplate): void {
    this.registry.registerTemplate(template);
  }

  registerHelper(name: string, helper: (...args: any[]) => any): void {
    this.renderer.registerHelper(name, helper);
  }

  registerPartial(name: string, partial: string): void {
    this.renderer.registerPartial(name, partial);
  }
}