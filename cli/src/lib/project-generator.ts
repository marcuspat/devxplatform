import { join, resolve, dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import { TemplateEngine, TemplateContext } from './template-engine.js';
import { getTemplateById, Template } from './templates.js';
import { config } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface ProjectGeneratorOptions {
  serviceName: string;
  templateId: string;
  outputDir: string;
  overwrite?: boolean;
  features?: Record<string, boolean>;
  author?: string;
  email?: string;
  organization?: string;
  environment?: string;
  port?: number;
  cpu?: number;
  memory?: number;
}

export class ProjectGenerator {
  private templateEngine: TemplateEngine;
  private templatesDir: string;

  constructor() {
    // Templates directory is relative to this file
    this.templatesDir = resolve(__dirname, '../templates');
    this.templateEngine = new TemplateEngine(this.templatesDir);
  }

  /**
   * Generate a new project from a template
   */
  async generateProject(options: ProjectGeneratorOptions): Promise<void> {
    const {
      serviceName,
      templateId,
      outputDir,
      overwrite = false,
      features = {},
      author,
      email,
      organization,
      environment = 'development',
      port = 3000,
      cpu = 0.5,
      memory = 1,
    } = options;

    logger.info(`Starting project generation for ${serviceName}`);

    // Validate template exists
    const template = getTemplateById(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Check if output directory exists
    const targetDir = resolve(outputDir, serviceName);
    if (existsSync(targetDir) && !overwrite) {
      throw new Error(`Directory already exists: ${targetDir}. Use --overwrite to replace it.`);
    }

    // Create output directory
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    // Create template context
    const context = this.createTemplateContext({
      serviceName,
      template,
      features,
      author,
      email,
      organization,
      environment,
      port,
      cpu,
      memory,
    });

    logger.debug('Template context created:', context);

    // Generate project files
    await this.templateEngine.processTemplate(templateId, targetDir, context);

    // Post-generation tasks
    await this.runPostGenerationTasks(targetDir, template, context);

    logger.info(`Project generated successfully: ${targetDir}`);
  }

  /**
   * Create template context with all necessary variables
   */
  private createTemplateContext(options: {
    serviceName: string;
    template: Template;
    features: Record<string, boolean>;
    author?: string;
    email?: string;
    organization?: string;
    environment: string;
    port: number;
    cpu: number;
    memory: number;
  }): TemplateContext {
    const {
      serviceName,
      template,
      features,
      author,
      email,
      organization,
      environment,
      port,
      cpu,
      memory,
    } = options;

    // Get user info from config or defaults
    const userInfo = config.get('auth.user') || {};
    const defaultAuthor = author || userInfo.name || 'Developer';
    const defaultEmail = email || userInfo.email || 'developer@example.com';
    const defaultOrg = organization || userInfo.team || 'My Organization';

    // Merge template features with user-specified features
    const mergedFeatures = {
      ...this.getDefaultFeatures(template),
      ...features,
    };

    return TemplateEngine.createContext({
      // Service metadata
      serviceName,
      serviceDescription: `A ${template.name.toLowerCase()} service built with ${template.framework || template.language}`,
      
      // Template info
      templateId: template.id,
      templateName: template.name,
      language: template.language,
      framework: template.framework,
      
      // Configuration
      environment,
      port,
      version: '1.0.0',
      
      // Resources
      cpu,
      memory,
      
      // User info
      author: defaultAuthor,
      email: defaultEmail,
      organization: defaultOrg,
      
      // Features
      features: mergedFeatures,
      
      // Timestamps
      timestamp: new Date().toISOString(),
      year: new Date().getFullYear().toString(),
      date: new Date().toISOString().split('T')[0],
    });
  }

  /**
   * Get default features for a template
   */
  private getDefaultFeatures(template: Template): Record<string, boolean> {
    const features: Record<string, boolean> = {};

    // Set default features based on template type and features
    template.features.forEach(feature => {
      switch (feature.toLowerCase()) {
        case 'jwt auth':
        case 'authentication':
          features.auth = true;
          break;
        case 'openapi':
        case 'swagger':
          features.swagger = true;
          break;
        case 'database':
        case 'prisma':
          features.database = false; // Default to false, user can enable
          break;
        case 'redis':
        case 'cache':
          features.redis = false; // Default to false, user can enable
          break;
        case 'websockets':
        case 'socket.io':
          features.websockets = true;
          break;
        case 'graphql':
          features.graphql = true;
          break;
        case 'testing':
        case 'jest':
          features.testing = true;
          break;
        case 'docker':
          features.docker = true;
          break;
        case 'logging':
        case 'winston':
          features.logging = true;
          break;
        default:
          // Convert feature name to camelCase flag
          const featureName = feature.toLowerCase().replace(/\s+/g, '_');
          features[featureName] = true;
      }
    });

    return features;
  }

  /**
   * Run post-generation tasks
   */
  private async runPostGenerationTasks(
    projectDir: string,
    template: Template,
    context: TemplateContext
  ): Promise<void> {
    logger.info('Running post-generation tasks...');

    // Create logs directory
    const logsDir = join(projectDir, 'logs');
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true });
    }

    // Set up git repository if not exists
    const gitDir = join(projectDir, '.git');
    if (!existsSync(gitDir)) {
      logger.info('Initializing git repository...');
      // Note: We would run git init here in a real implementation
      // For now, just log the intent
      logger.debug('Git init would be run here');
    }

    // Create additional directories based on template
    if (template.category === 'backend') {
      const dirs = ['logs', 'uploads', 'tmp'];
      dirs.forEach(dir => {
        const fullDir = join(projectDir, dir);
        if (!existsSync(fullDir)) {
          mkdirSync(fullDir, { recursive: true });
        }
      });
    }

    logger.info('Post-generation tasks completed');
  }

  /**
   * List available templates
   */
  getAvailableTemplates(): Template[] {
    return Object.values(getTemplateById);
  }

  /**
   * Validate project name
   */
  validateProjectName(name: string): boolean {
    // Use the same validation as service name
    const pattern = /^[a-z][a-z0-9-]*$/;
    return pattern.test(name) && name.length >= 3 && name.length <= 50;
  }

  /**
   * Get template by ID with validation
   */
  getTemplate(templateId: string): Template {
    const template = getTemplateById(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }
    return template;
  }

  /**
   * Check if directory is empty or doesn't exist
   */
  isDirectoryEmpty(dirPath: string): boolean {
    if (!existsSync(dirPath)) {
      return true;
    }
    
    try {
      const files = require('fs').readdirSync(dirPath);
      return files.length === 0;
    } catch {
      return false;
    }
  }

  /**
   * Generate project with interactive prompts
   */
  async generateInteractive(options: Partial<ProjectGeneratorOptions>): Promise<void> {
    // This would include interactive prompts in a full implementation
    // For now, delegate to generateProject with defaults
    const fullOptions: ProjectGeneratorOptions = {
      serviceName: options.serviceName || 'my-service',
      templateId: options.templateId || 'rest-api',
      outputDir: options.outputDir || process.cwd(),
      overwrite: options.overwrite || false,
      features: options.features || {},
      ...options,
    };

    return this.generateProject(fullOptions);
  }
}