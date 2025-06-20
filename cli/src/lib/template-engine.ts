import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, copyFileSync } from 'fs';
import { join, relative, dirname, extname } from 'path';
import { logger } from '../utils/logger.js';

export interface TemplateContext {
  // Service metadata
  serviceName: string;
  serviceNamePascal: string;
  serviceNameCamel: string;
  serviceDescription: string;
  
  // Template info
  templateId: string;
  templateName: string;
  language: string;
  framework?: string;
  
  // Configuration
  environment: string;
  port: number;
  version: string;
  
  // Resources
  cpu: number;
  memory: number;
  
  // Additional context
  author: string;
  email: string;
  organization: string;
  
  // Feature flags
  features: Record<string, boolean>;
  
  // Custom variables
  [key: string]: any;
}

export class TemplateEngine {
  private templateDir: string;
  
  constructor(templateDir: string) {
    this.templateDir = templateDir;
  }
  
  /**
   * Process a template and generate files
   */
  async processTemplate(templateId: string, outputDir: string, context: TemplateContext): Promise<void> {
    const templatePath = join(this.templateDir, templateId);
    
    if (!existsSync(templatePath)) {
      throw new Error(`Template not found: ${templateId}`);
    }
    
    logger.info(`Processing template: ${templateId}`);
    logger.debug('Template context:', context);
    
    // Create output directory
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    
    // Process template directory recursively
    await this.processDirectory(templatePath, outputDir, context);
    
    logger.info(`Template processed successfully: ${outputDir}`);
  }
  
  /**
   * Process a directory recursively
   */
  private async processDirectory(sourcePath: string, outputPath: string, context: TemplateContext): Promise<void> {
    const items = readdirSync(sourcePath);
    
    for (const item of items) {
      const sourceItemPath = join(sourcePath, item);
      const stat = statSync(sourceItemPath);
      
      // Process file/directory name with template variables
      const processedItemName = this.processString(item, context);
      const outputItemPath = join(outputPath, processedItemName);
      
      if (stat.isDirectory()) {
        // Create directory and process contents
        if (!existsSync(outputItemPath)) {
          mkdirSync(outputItemPath, { recursive: true });
        }
        await this.processDirectory(sourceItemPath, outputItemPath, context);
      } else {
        // Process file
        await this.processFile(sourceItemPath, outputItemPath, context);
      }
    }
  }
  
  /**
   * Process a single file
   */
  private async processFile(sourcePath: string, outputPath: string, context: TemplateContext): Promise<void> {
    const ext = extname(sourcePath);
    const isTemplate = ext === '.template' || sourcePath.includes('.template.');
    
    if (isTemplate) {
      // Remove .template extension from output path
      const cleanOutputPath = outputPath.replace(/\.template(?:\.|$)/, ext === '.template' ? '' : '.');
      await this.processTemplateFile(sourcePath, cleanOutputPath, context);
    } else if (this.isTextFile(ext)) {
      // Process text files for variable substitution
      await this.processTextFile(sourcePath, outputPath, context);
    } else {
      // Copy binary files as-is
      this.copyBinaryFile(sourcePath, outputPath);
    }
  }
  
  /**
   * Process a template file (.template extension)
   */
  private async processTemplateFile(sourcePath: string, outputPath: string, context: TemplateContext): Promise<void> {
    try {
      const content = readFileSync(sourcePath, 'utf-8');
      const processedContent = this.processString(content, context);
      
      // Ensure output directory exists
      const outputDir = dirname(outputPath);
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }
      
      writeFileSync(outputPath, processedContent, 'utf-8');
      logger.debug(`Processed template file: ${sourcePath} -> ${outputPath}`);
    } catch (error) {
      logger.error(`Failed to process template file: ${sourcePath}`, error);
      throw error;
    }
  }
  
  /**
   * Process a text file for variable substitution
   */
  private async processTextFile(sourcePath: string, outputPath: string, context: TemplateContext): Promise<void> {
    try {
      const content = readFileSync(sourcePath, 'utf-8');
      const processedContent = this.processString(content, context);
      
      // Ensure output directory exists
      const outputDir = dirname(outputPath);
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }
      
      writeFileSync(outputPath, processedContent, 'utf-8');
      logger.debug(`Processed text file: ${sourcePath} -> ${outputPath}`);
    } catch (error) {
      logger.error(`Failed to process text file: ${sourcePath}`, error);
      throw error;
    }
  }
  
  /**
   * Copy binary file as-is
   */
  private copyBinaryFile(sourcePath: string, outputPath: string): void {
    try {
      // Ensure output directory exists
      const outputDir = dirname(outputPath);
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }
      
      copyFileSync(sourcePath, outputPath);
      logger.debug(`Copied binary file: ${sourcePath} -> ${outputPath}`);
    } catch (error) {
      logger.error(`Failed to copy binary file: ${sourcePath}`, error);
      throw error;
    }
  }
  
  /**
   * Process string with template variables and conditionals
   */
  private processString(content: string, context: TemplateContext): string {
    let processed = content;
    
    // Process variables: {{variable}}
    processed = this.processVariables(processed, context);
    
    // Process conditionals: {{#if condition}} ... {{/if}}
    processed = this.processConditionals(processed, context);
    
    // Process loops: {{#each array}} ... {{/each}}
    processed = this.processLoops(processed, context);
    
    return processed;
  }
  
  /**
   * Process template variables
   */
  private processVariables(content: string, context: TemplateContext): string {
    return content.replace(/\{\{([^#\/]\w*(?:\.\w+)*)\}\}/g, (match, variable) => {
      const value = this.getNestedProperty(context, variable.trim());
      return value !== undefined ? String(value) : match;
    });
  }
  
  /**
   * Process conditional blocks
   */
  private processConditionals(content: string, context: TemplateContext): string {
    return content.replace(/\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, block) => {
      const conditionResult = this.evaluateCondition(condition.trim(), context);
      return conditionResult ? block : '';
    });
  }
  
  /**
   * Process loop blocks
   */
  private processLoops(content: string, context: TemplateContext): string {
    return content.replace(/\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, arrayName, block) => {
      const array = this.getNestedProperty(context, arrayName.trim());
      if (!Array.isArray(array)) {
        return '';
      }
      
      return array.map((item, index) => {
        const itemContext = {
          ...context,
          this: item,
          '@index': index,
          '@first': index === 0,
          '@last': index === array.length - 1,
        };
        return this.processString(block, itemContext);
      }).join('');
    });
  }
  
  /**
   * Evaluate a condition
   */
  private evaluateCondition(condition: string, context: TemplateContext): boolean {
    try {
      // Simple condition evaluation
      // Supports: variable, !variable, variable === 'value', variable !== 'value'
      
      if (condition.startsWith('!')) {
        const variable = condition.slice(1).trim();
        const value = this.getNestedProperty(context, variable);
        return !value;
      }
      
      if (condition.includes('===')) {
        const [left, right] = condition.split('===').map(s => s.trim());
        const leftValue = this.getNestedProperty(context, left);
        const rightValue = right.startsWith('"') || right.startsWith("'") 
          ? right.slice(1, -1) 
          : this.getNestedProperty(context, right);
        return leftValue === rightValue;
      }
      
      if (condition.includes('!==')) {
        const [left, right] = condition.split('!==').map(s => s.trim());
        const leftValue = this.getNestedProperty(context, left);
        const rightValue = right.startsWith('"') || right.startsWith("'") 
          ? right.slice(1, -1) 
          : this.getNestedProperty(context, right);
        return leftValue !== rightValue;
      }
      
      // Simple boolean check
      const value = this.getNestedProperty(context, condition);
      return Boolean(value);
    } catch (error) {
      logger.warn(`Failed to evaluate condition: ${condition}`, error);
      return false;
    }
  }
  
  /**
   * Get nested property from object using dot notation
   */
  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
  
  /**
   * Check if file is a text file that should be processed
   */
  private isTextFile(ext: string): boolean {
    const textExtensions = [
      '.js', '.ts', '.jsx', '.tsx', '.vue', '.svelte',
      '.html', '.htm', '.css', '.scss', '.sass', '.less',
      '.json', '.yaml', '.yml', '.toml', '.ini',
      '.md', '.txt', '.env', '.example',
      '.dockerfile', '.gitignore', '.gitattributes',
      '.sh', '.bash', '.zsh', '.fish',
      '.py', '.rb', '.php', '.go', '.rs', '.java',
      '.c', '.cpp', '.h', '.hpp',
      '.sql', '.prisma', '.graphql', '.gql',
      '.proto', '.thrift',
      '.xml', '.svg',
      '', // Files without extension
    ];
    
    return textExtensions.includes(ext.toLowerCase());
  }
  
  /**
   * Create template context with smart defaults
   */
  static createContext(options: Partial<TemplateContext>): TemplateContext {
    const serviceName = options.serviceName || 'my-service';
    
    return {
      // Service metadata
      serviceName,
      serviceNamePascal: this.toPascalCase(serviceName),
      serviceNameCamel: this.toCamelCase(serviceName),
      serviceDescription: options.serviceDescription || `A ${serviceName} service`,
      
      // Template info
      templateId: options.templateId || 'rest-api',
      templateName: options.templateName || 'REST API',
      language: options.language || 'TypeScript',
      framework: options.framework,
      
      // Configuration
      environment: options.environment || 'development',
      port: options.port || 3000,
      version: options.version || '1.0.0',
      
      // Resources
      cpu: options.cpu || 0.5,
      memory: options.memory || 1,
      
      // Additional context
      author: options.author || 'DevX Platform',
      email: options.email || 'developer@example.com',
      organization: options.organization || 'My Organization',
      
      // Feature flags
      features: options.features || {},
      
      // Copy any additional properties
      ...options,
    };
  }
  
  /**
   * Convert string to PascalCase
   */
  private static toPascalCase(str: string): string {
    return str
      .split(/[-_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }
  
  /**
   * Convert string to camelCase
   */
  private static toCamelCase(str: string): string {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }
}