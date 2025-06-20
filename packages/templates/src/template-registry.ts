import path from 'path';
import { promises as fs } from 'fs';

import type {
  ServiceTemplate,
  ServiceType,
  ProgrammingLanguage,
  Framework,
  Logger,
} from '@devex/platform-core';
import { loadAllTemplates } from '@devex/platform-core';

export interface TemplateRegistryOptions {
  templatesPath: string;
  logger: Logger;
}

export class TemplateRegistry {
  private readonly templatesPath: string;
  private readonly logger: Logger;
  private readonly templates: Map<string, ServiceTemplate> = new Map();
  private readonly templateIndex: Map<string, string[]> = new Map();

  constructor(options: TemplateRegistryOptions) {
    this.templatesPath = options.templatesPath;
    this.logger = options.logger;
  }

  async loadTemplates(): Promise<void> {
    try {
      this.logger.debug('Loading templates from', this.templatesPath);

      // Ensure templates directory exists
      await fs.mkdir(this.templatesPath, { recursive: true });

      // Load all templates from the templates directory
      const loadedTemplates = await loadAllTemplates(this.templatesPath);

      for (const [key, template] of loadedTemplates) {
        this.registerTemplate(template);
      }

      // Also load built-in templates
      await this.loadBuiltInTemplates();

      this.logger.info(`Loaded ${this.templates.size} templates`);
    } catch (error) {
      this.logger.error('Failed to load templates', error);
    }
  }

  private async loadBuiltInTemplates(): Promise<void> {
    // Load templates bundled with the package
    const builtInPath = path.join(import.meta.url.replace('file://', ''), '../../templates');
    
    try {
      const builtInTemplates = await loadAllTemplates(builtInPath);
      for (const [key, template] of builtInTemplates) {
        this.registerTemplate(template, true);
      }
    } catch (error) {
      this.logger.debug('No built-in templates found');
    }
  }

  registerTemplate(template: ServiceTemplate, isBuiltIn = false): void {
    const key = this.getTemplateKey(template);
    this.templates.set(key, template);

    // Update index for quick lookups
    this.updateIndex(template);

    this.logger.debug(`Registered template: ${key}`, {
      builtIn: isBuiltIn,
      languages: template.supportedLanguages,
      frameworks: template.supportedFrameworks,
    });
  }

  findTemplate(
    type: ServiceType,
    language: ProgrammingLanguage,
    framework?: Framework,
  ): ServiceTemplate | null {
    // Try exact match with framework
    if (framework) {
      const exactKey = `${type}-${language}-${framework}`;
      const exactMatch = this.templates.get(exactKey);
      if (exactMatch) return exactMatch;
    }

    // Try match without framework
    const baseKey = `${type}-${language}`;
    const baseMatch = this.templates.get(baseKey);
    if (baseMatch) return baseMatch;

    // Try to find a compatible template
    for (const [key, template] of this.templates) {
      if (
        template.type === type &&
        template.supportedLanguages.includes(language) &&
        (!framework || template.supportedFrameworks?.includes(framework))
      ) {
        return template;
      }
    }

    return null;
  }

  getAllTemplates(): ServiceTemplate[] {
    return Array.from(this.templates.values());
  }

  getTemplatesByType(type: ServiceType): ServiceTemplate[] {
    return this.getAllTemplates().filter(t => t.type === type);
  }

  getTemplatesByLanguage(language: ProgrammingLanguage): ServiceTemplate[] {
    return this.getAllTemplates().filter(t => 
      t.supportedLanguages.includes(language)
    );
  }

  getTemplatesByFramework(framework: Framework): ServiceTemplate[] {
    return this.getAllTemplates().filter(t => 
      t.supportedFrameworks?.includes(framework)
    );
  }

  getTemplateCount(): number {
    return this.templates.size;
  }

  getTemplatesPath(): string {
    return this.templatesPath;
  }

  hasTemplate(key: string): boolean {
    return this.templates.has(key);
  }

  getTemplate(key: string): ServiceTemplate | undefined {
    return this.templates.get(key);
  }

  private getTemplateKey(template: ServiceTemplate): string {
    // Generate a unique key for the template
    const parts = [template.type, template.name];
    
    if (template.supportedLanguages.length === 1) {
      parts.push(template.supportedLanguages[0]);
    }
    
    if (template.supportedFrameworks?.length === 1) {
      parts.push(template.supportedFrameworks[0]);
    }

    return parts.join('-');
  }

  private updateIndex(template: ServiceTemplate): void {
    // Index by type
    const typeKey = `type:${template.type}`;
    if (!this.templateIndex.has(typeKey)) {
      this.templateIndex.set(typeKey, []);
    }
    this.templateIndex.get(typeKey)!.push(template.name);

    // Index by language
    for (const lang of template.supportedLanguages) {
      const langKey = `lang:${lang}`;
      if (!this.templateIndex.has(langKey)) {
        this.templateIndex.set(langKey, []);
      }
      this.templateIndex.get(langKey)!.push(template.name);
    }

    // Index by framework
    if (template.supportedFrameworks) {
      for (const framework of template.supportedFrameworks) {
        const frameworkKey = `framework:${framework}`;
        if (!this.templateIndex.has(frameworkKey)) {
          this.templateIndex.set(frameworkKey, []);
        }
        this.templateIndex.get(frameworkKey)!.push(template.name);
      }
    }
  }

  searchTemplates(query: {
    type?: ServiceType;
    language?: ProgrammingLanguage;
    framework?: Framework;
  }): ServiceTemplate[] {
    let results = this.getAllTemplates();

    if (query.type) {
      results = results.filter(t => t.type === query.type);
    }

    if (query.language) {
      results = results.filter(t => t.supportedLanguages.includes(query.language!));
    }

    if (query.framework) {
      results = results.filter(t => t.supportedFrameworks?.includes(query.framework!));
    }

    return results;
  }
}