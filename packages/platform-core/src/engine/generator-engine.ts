import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';

import type {
  ServiceConfig,
  GeneratorOptions,
  GeneratorContext,
  Logger,
  ServiceTemplate,
} from '../types/index.js';
import { GeneratorError } from '../types/index.js';
import { TemplateEngine } from './template-engine.js';
import { createGeneratorUtils } from '../utils/generator-utils.js';
import { loadTemplate } from '../utils/template-loader.js';

export interface GeneratorEngineOptions {
  templatesPath: string;
  logger: Logger;
}

export class GeneratorEngine {
  private readonly templatesPath: string;
  private readonly logger: Logger;
  private readonly templateEngine: TemplateEngine;
  private readonly templates: Map<string, ServiceTemplate> = new Map();

  constructor(options: GeneratorEngineOptions) {
    this.templatesPath = options.templatesPath;
    this.logger = options.logger;
    this.templateEngine = new TemplateEngine();
    
    this.loadTemplates();
  }

  private loadTemplates(): void {
    // This would load templates from the templates directory
    // For now, we'll implement this later
    this.logger.info('Loading templates from', this.templatesPath);
  }

  async generate(config: ServiceConfig, options: GeneratorOptions): Promise<void> {
    this.logger.info('Starting service generation', {
      service: config.name,
      type: config.type,
      outputPath: options.outputPath,
    });

    // Create generator context
    const context: GeneratorContext = {
      config,
      options,
      templateEngine: this.templateEngine,
      logger: this.logger,
      utils: createGeneratorUtils(),
    };

    // Find appropriate template
    const template = await this.findTemplate(config);
    if (!template) {
      throw new GeneratorError(
        `No template found for service type: ${config.type} with language: ${config.language}`,
      );
    }

    // Check if output directory exists
    if (!options.force && await this.pathExists(options.outputPath)) {
      throw new GeneratorError(
        `Output directory already exists: ${options.outputPath}. Use --force to overwrite.`,
      );
    }

    // Create output directory
    if (!options.dryRun) {
      await fs.mkdir(options.outputPath, { recursive: true });
    }

    // Process template files
    for (const file of template.files) {
      await this.processTemplateFile(file, context, template);
    }

    // Generate package.json or equivalent
    await this.generatePackageFile(context, template);

    // Generate infrastructure files if configured
    if (config.infrastructure) {
      await this.generateInfrastructureFiles(context);
    }

    // Run post-generation tasks
    await this.runPostGenerationTasks(context, template);

    this.logger.info('Service generation completed', {
      service: config.name,
      filesGenerated: template.files.length,
    });
  }

  private async findTemplate(config: ServiceConfig): Promise<ServiceTemplate | null> {
    // Look for a matching template based on service type and language
    const templateKey = `${config.type}-${config.language}`;
    
    // First check cached templates
    if (this.templates.has(templateKey)) {
      return this.templates.get(templateKey) ?? null;
    }

    // Try to load template from filesystem
    const templatePath = path.join(
      this.templatesPath,
      config.type,
      config.language,
      'template.json',
    );

    try {
      const template = await loadTemplate(templatePath);
      this.templates.set(templateKey, template);
      return template;
    } catch (error) {
      this.logger.warn(`Template not found: ${templatePath}`);
      return null;
    }
  }

  private async processTemplateFile(
    file: { path: string; template: string; condition?: string; binary?: boolean },
    context: GeneratorContext,
    template: ServiceTemplate,
  ): Promise<void> {
    // Check condition if specified
    if (file.condition && !this.evaluateCondition(file.condition, context)) {
      this.logger.debug(`Skipping file due to condition: ${file.path}`);
      return;
    }

    const outputPath = path.join(context.options.outputPath, file.path);
    const outputDir = path.dirname(outputPath);

    // Create directory if it doesn't exist
    if (!context.options.dryRun) {
      await fs.mkdir(outputDir, { recursive: true });
    }

    if (file.binary) {
      // Copy binary file
      const sourcePath = path.join(this.templatesPath, template.name, file.template);
      if (!context.options.dryRun) {
        await fs.copyFile(sourcePath, outputPath);
      }
    } else {
      // Render template
      const templatePath = path.join(this.templatesPath, template.name, file.template);
      const rendered = await context.templateEngine.renderFile(templatePath, {
        ...context.config,
        utils: context.utils,
      });

      if (!context.options.dryRun) {
        await fs.writeFile(outputPath, rendered, 'utf-8');
      }
    }

    this.logger.debug(`Generated file: ${outputPath}`);
  }

  private evaluateCondition(condition: string, context: GeneratorContext): boolean {
    // Simple condition evaluation
    // In a real implementation, this would use a proper expression evaluator
    try {
      // Check for simple property existence
      if (condition.startsWith('config.')) {
        const property = condition.substring(7);
        const value = this.getNestedProperty(context.config, property);
        return Boolean(value);
      }
      
      return true;
    } catch (error) {
      this.logger.warn(`Failed to evaluate condition: ${condition}`, error);
      return false;
    }
  }

  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private async generatePackageFile(
    context: GeneratorContext,
    template: ServiceTemplate,
  ): Promise<void> {
    const { config, options } = context;

    // Generate package.json for Node.js projects
    if (['typescript', 'javascript'].includes(config.language)) {
      const packageJson = {
        name: config.name,
        version: config.version,
        description: config.description,
        type: 'module',
        scripts: template.scripts ?? {},
        dependencies: {},
        devDependencies: {},
      };

      // Add dependencies from template
      if (template.dependencies) {
        for (const dep of template.dependencies) {
          if (!dep.condition || this.evaluateCondition(dep.condition, context)) {
            if (dep.dev) {
              packageJson.devDependencies[dep.name] = dep.version;
            } else {
              packageJson.dependencies[dep.name] = dep.version;
            }
          }
        }
      }

      const outputPath = path.join(options.outputPath, 'package.json');
      if (!options.dryRun) {
        await fs.writeFile(outputPath, JSON.stringify(packageJson, null, 2), 'utf-8');
      }
    }

    // Handle other languages (Python requirements.txt, Go go.mod, etc.)
    // Implementation would go here
  }

  private async generateInfrastructureFiles(context: GeneratorContext): Promise<void> {
    const { config, options } = context;

    if (!config.infrastructure) return;

    // Generate Docker files
    if (config.infrastructure.containerization?.docker) {
      await this.generateDockerFiles(context);
    }

    // Generate Kubernetes manifests
    if (config.infrastructure.orchestration?.kubernetes) {
      await this.generateKubernetesFiles(context);
    }

    // Generate CI/CD configuration
    if (config.infrastructure.cicd) {
      await this.generateCICDFiles(context);
    }
  }

  private async generateDockerFiles(context: GeneratorContext): Promise<void> {
    // Implementation for Docker file generation
    this.logger.debug('Generating Docker files');
  }

  private async generateKubernetesFiles(context: GeneratorContext): Promise<void> {
    // Implementation for Kubernetes manifest generation
    this.logger.debug('Generating Kubernetes manifests');
  }

  private async generateCICDFiles(context: GeneratorContext): Promise<void> {
    // Implementation for CI/CD configuration generation
    this.logger.debug('Generating CI/CD configuration');
  }

  private async runPostGenerationTasks(
    context: GeneratorContext,
    template: ServiceTemplate,
  ): Promise<void> {
    // Run any post-generation scripts or tasks
    this.logger.debug('Running post-generation tasks');
  }

  private async pathExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  getAvailableTemplates(): string[] {
    // Return list of available templates
    return Array.from(this.templates.keys());
  }
}