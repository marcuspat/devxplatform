import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';

import type { ServiceTemplate, TemplateFile, TemplateDependency } from '../types/index.js';
import { TemplateError } from '../types/index.js';
import { readJson, findFiles } from './file-utils.js';

export async function loadTemplate(templatePath: string): Promise<ServiceTemplate> {
  try {
    // Check if template.json exists
    const templateJsonPath = path.join(templatePath, 'template.json');
    const templateYamlPath = path.join(templatePath, 'template.yaml');
    const templateYmlPath = path.join(templatePath, 'template.yml');
    
    let templateConfig: any;
    
    if (await fileExists(templateJsonPath)) {
      templateConfig = await readJson(templateJsonPath);
    } else if (await fileExists(templateYamlPath)) {
      templateConfig = await loadYaml(templateYamlPath);
    } else if (await fileExists(templateYmlPath)) {
      templateConfig = await loadYaml(templateYmlPath);
    } else {
      throw new Error('No template configuration file found (template.json, template.yaml, or template.yml)');
    }
    
    // Validate template configuration
    validateTemplateConfig(templateConfig);
    
    // Load template files
    const files = await loadTemplateFiles(templatePath, templateConfig.files || []);
    
    return {
      ...templateConfig,
      files,
    };
  } catch (error) {
    throw new TemplateError(
      `Failed to load template from ${templatePath}`,
      { error: error instanceof Error ? error.message : String(error) },
    );
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadYaml(filePath: string): Promise<any> {
  const content = await fs.readFile(filePath, 'utf-8');
  return yaml.load(content);
}

function validateTemplateConfig(config: any): void {
  if (!config.name) {
    throw new Error('Template must have a name');
  }
  
  if (!config.type) {
    throw new Error('Template must have a type');
  }
  
  if (!config.supportedLanguages || !Array.isArray(config.supportedLanguages)) {
    throw new Error('Template must specify supportedLanguages as an array');
  }
}

async function loadTemplateFiles(
  templatePath: string,
  fileConfigs: any[],
): Promise<TemplateFile[]> {
  const files: TemplateFile[] = [];
  
  // If no files are explicitly configured, scan the template directory
  if (fileConfigs.length === 0) {
    const templateFiles = await findFiles('**/*', {
      cwd: templatePath,
      ignore: ['template.json', 'template.yaml', 'template.yml', 'README.md'],
      nodir: true,
    });
    
    for (const file of templateFiles) {
      files.push({
        path: file,
        template: file,
        binary: isBinaryFile(file),
      });
    }
  } else {
    // Process configured files
    for (const fileConfig of fileConfigs) {
      if (typeof fileConfig === 'string') {
        files.push({
          path: fileConfig,
          template: fileConfig,
          binary: isBinaryFile(fileConfig),
        });
      } else {
        files.push({
          path: fileConfig.path,
          template: fileConfig.template || fileConfig.path,
          condition: fileConfig.condition,
          binary: fileConfig.binary ?? isBinaryFile(fileConfig.path),
        });
      }
    }
  }
  
  return files;
}

function isBinaryFile(filePath: string): boolean {
  const binaryExtensions = [
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg',
    '.pdf', '.zip', '.tar', '.gz', '.rar',
    '.exe', '.dll', '.so', '.dylib',
    '.woff', '.woff2', '.ttf', '.otf', '.eot',
  ];
  
  const ext = path.extname(filePath).toLowerCase();
  return binaryExtensions.includes(ext);
}

export async function loadAllTemplates(templatesDir: string): Promise<Map<string, ServiceTemplate>> {
  const templates = new Map<string, ServiceTemplate>();
  
  try {
    // Find all template directories
    const templateDirs = await findTemplateDirectories(templatesDir);
    
    // Load each template
    for (const templateDir of templateDirs) {
      try {
        const template = await loadTemplate(templateDir);
        const key = `${template.type}-${template.name}`;
        templates.set(key, template);
      } catch (error) {
        console.error(`Failed to load template from ${templateDir}:`, error);
      }
    }
  } catch (error) {
    throw new TemplateError(
      'Failed to load templates',
      { error: error instanceof Error ? error.message : String(error) },
    );
  }
  
  return templates;
}

async function findTemplateDirectories(baseDir: string): Promise<string[]> {
  const dirs: string[] = [];
  
  async function scanDir(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = path.join(dir, entry.name);
        
        // Check if this directory contains a template config
        const hasTemplate = await fileExists(path.join(fullPath, 'template.json')) ||
                          await fileExists(path.join(fullPath, 'template.yaml')) ||
                          await fileExists(path.join(fullPath, 'template.yml'));
        
        if (hasTemplate) {
          dirs.push(fullPath);
        } else {
          // Recursively scan subdirectories
          await scanDir(fullPath);
        }
      }
    }
  }
  
  await scanDir(baseDir);
  return dirs;
}

export function parseTemplateDependencies(dependencies: any[]): TemplateDependency[] {
  return dependencies.map(dep => {
    if (typeof dep === 'string') {
      // Parse simple string format: "package@version"
      const [name, version] = dep.split('@');
      return { name, version: version || 'latest' };
    }
    
    return dep as TemplateDependency;
  });
}

export function evaluateTemplateCondition(
  condition: string,
  context: Record<string, any>,
): boolean {
  // Simple condition evaluation
  // In production, use a proper expression evaluator
  try {
    // Check for simple property existence
    if (condition.includes('.')) {
      const parts = condition.split('.');
      let value = context;
      
      for (const part of parts) {
        value = value?.[part];
        if (value === undefined) {
          return false;
        }
      }
      
      return Boolean(value);
    }
    
    // Check for simple equality
    if (condition.includes('===')) {
      const [left, right] = condition.split('===').map(s => s.trim());
      const leftValue = getValueFromContext(left, context);
      const rightValue = right.replace(/['"]/g, ''); // Remove quotes
      return leftValue === rightValue;
    }
    
    // Default to checking if property exists and is truthy
    return Boolean(context[condition]);
  } catch {
    return false;
  }
}

function getValueFromContext(path: string, context: Record<string, any>): any {
  const parts = path.split('.');
  let value = context;
  
  for (const part of parts) {
    value = value?.[part];
  }
  
  return value;
}