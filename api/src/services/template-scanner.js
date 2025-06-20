const fs = require('fs-extra');
const path = require('path');
const { glob } = require('glob');

class TemplateScanner {
  constructor(templatesPath) {
    this.templatesPath = templatesPath;
  }

  /**
   * Scan all available templates and their configurations
   * @returns {Promise<Array>} Array of template configurations
   */
  async scanTemplates() {
    try {
      const templateDirs = await this.getTemplateDirectories();
      const templates = [];

      for (const templateDir of templateDirs) {
        const templateConfig = await this.analyzeTemplate(templateDir);
        if (templateConfig) {
          templates.push(templateConfig);
        }
      }

      return templates;
    } catch (error) {
      throw new Error(`Failed to scan templates: ${error.message}`);
    }
  }

  /**
   * Get all template directories
   * @returns {Promise<Array>} Array of template directory paths
   */
  async getTemplateDirectories() {
    const templateDirs = [];
    const entries = await fs.readdir(this.templatesPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const templatePath = path.join(this.templatesPath, entry.name);
        // Check if it has package.json (indicating it's a template)
        const packageJsonPath = path.join(templatePath, 'package.json');
        if (await fs.pathExists(packageJsonPath)) {
          templateDirs.push(templatePath);
        }
      }
    }

    return templateDirs;
  }

  /**
   * Analyze a single template directory
   * @param {string} templatePath Path to template directory
   * @returns {Promise<Object>} Template configuration
   */
  async analyzeTemplate(templatePath) {
    try {
      const templateName = path.basename(templatePath);
      const packageJsonPath = path.join(templatePath, 'package.json');
      const readmePath = path.join(templatePath, 'README.md');
      const dockerfilePath = path.join(templatePath, 'Dockerfile');
      
      let packageJson = null;
      let readme = null;
      let hasDockerfile = false;

      // Read package.json
      if (await fs.pathExists(packageJsonPath)) {
        packageJson = await fs.readJson(packageJsonPath);
      }

      // Read README
      if (await fs.pathExists(readmePath)) {
        readme = await fs.readFile(readmePath, 'utf8');
      }

      // Check for Dockerfile
      hasDockerfile = await fs.pathExists(dockerfilePath);

      // Get file structure
      const fileStructure = await this.getFileStructure(templatePath);

      // Detect template type based on dependencies and structure
      const templateType = this.detectTemplateType(packageJson, fileStructure);

      // Get template variables (placeholders in files)
      const variables = await this.extractTemplateVariables(templatePath);

      return {
        id: templateName,
        name: packageJson?.name || templateName,
        description: packageJson?.description || 'Template description not available',
        type: templateType,
        path: templatePath,
        version: packageJson?.version || '1.0.0',
        dependencies: packageJson?.dependencies || {},
        devDependencies: packageJson?.devDependencies || {},
        scripts: packageJson?.scripts || {},
        hasDockerfile,
        fileStructure,
        variables,
        readme: readme ? readme.substring(0, 500) : null, // First 500 chars
        language: this.detectLanguage(packageJson, fileStructure),
        framework: this.detectFramework(packageJson, fileStructure),
        ports: this.extractPorts(packageJson, fileStructure),
        envVariables: await this.extractEnvVariables(templatePath)
      };
    } catch (error) {
      console.error(`Error analyzing template ${templatePath}:`, error);
      return null;
    }
  }

  /**
   * Get file structure of template
   * @param {string} templatePath Path to template
   * @returns {Promise<Array>} File structure
   */
  async getFileStructure(templatePath) {
    try {
      const files = await glob('**/*', {
        cwd: templatePath,
        ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
        nodir: false
      });

      return files.map(file => ({
        path: file,
        isDirectory: !path.extname(file),
        extension: path.extname(file)
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Detect template type based on dependencies and file structure
   * @param {Object} packageJson Package.json content
   * @param {Array} fileStructure File structure
   * @returns {string} Template type
   */
  detectTemplateType(packageJson, fileStructure) {
    if (!packageJson) return 'unknown';

    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    // GraphQL API
    if (deps['apollo-server-express'] || deps['graphql'] || deps['type-graphql']) {
      return 'graphql-api';
    }

    // gRPC Service
    if (deps['@grpc/grpc-js'] || deps['grpc'] || fileStructure.some(f => f.path.includes('.proto'))) {
      return 'grpc-service';
    }

    // Worker Service
    if (deps['bull'] || deps['agenda'] || deps['bee-queue']) {
      return 'worker-service';
    }

    // Next.js Web App
    if (deps['next'] || deps['react']) {
      return 'webapp-nextjs';
    }

    // REST API (fallback for Express-based apps)
    if (deps['express'] || deps['fastify'] || deps['koa']) {
      return 'rest-api';
    }

    return 'unknown';
  }

  /**
   * Detect primary language
   * @param {Object} packageJson Package.json content
   * @param {Array} fileStructure File structure
   * @returns {string} Primary language
   */
  detectLanguage(packageJson, fileStructure) {
    // Check for TypeScript
    if (packageJson?.devDependencies?.typescript || 
        fileStructure.some(f => f.extension === '.ts')) {
      return 'typescript';
    }

    // Check for Python
    if (fileStructure.some(f => f.extension === '.py')) {
      return 'python';
    }

    // Check for Go
    if (fileStructure.some(f => f.extension === '.go')) {
      return 'go';
    }

    // Check for Java
    if (fileStructure.some(f => f.extension === '.java')) {
      return 'java';
    }

    // Check for Rust
    if (fileStructure.some(f => f.extension === '.rs')) {
      return 'rust';
    }

    return 'javascript';
  }

  /**
   * Detect framework
   * @param {Object} packageJson Package.json content
   * @param {Array} fileStructure File structure
   * @returns {string} Framework
   */
  detectFramework(packageJson, fileStructure) {
    if (!packageJson) return 'unknown';

    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    if (deps['express']) return 'express';
    if (deps['fastify']) return 'fastify';
    if (deps['koa']) return 'koa';
    if (deps['next']) return 'nextjs';
    if (deps['apollo-server-express']) return 'apollo-server';
    if (deps['fastapi']) return 'fastapi';
    if (deps['flask']) return 'flask';
    if (deps['gin-gonic/gin']) return 'gin';

    return 'unknown';
  }

  /**
   * Extract port configurations
   * @param {Object} packageJson Package.json content
   * @param {Array} fileStructure File structure
   * @returns {Array} Port configurations
   */
  extractPorts(packageJson, fileStructure) {
    const ports = [];
    
    // Common default ports
    const defaultPorts = {
      'rest-api': 3000,
      'graphql-api': 4000,
      'grpc-service': 50051,
      'webapp-nextjs': 3000
    };

    // Add default port based on type
    const templateType = this.detectTemplateType(packageJson, fileStructure);
    if (defaultPorts[templateType]) {
      ports.push({
        port: defaultPorts[templateType],
        protocol: 'http',
        description: 'Main application port'
      });
    }

    return ports;
  }

  /**
   * Extract template variables from files
   * @param {string} templatePath Path to template
   * @returns {Promise<Array>} Template variables
   */
  async extractTemplateVariables(templatePath) {
    const variables = new Set();
    
    try {
      const files = await glob('**/*.{js,ts,json,yaml,yml,md,dockerfile}', {
        cwd: templatePath,
        ignore: ['node_modules/**', '.git/**']
      });

      for (const file of files) {
        const filePath = path.join(templatePath, file);
        const content = await fs.readFile(filePath, 'utf8');
        
        // Look for Handlebars-style variables {{variable}}
        const handlebarsMatches = content.match(/\{\{([^}]+)\}\}/g);
        if (handlebarsMatches) {
          handlebarsMatches.forEach(match => {
            const variable = match.replace(/\{\{|\}\}/g, '').trim();
            variables.add(variable);
          });
        }

        // Look for environment variable patterns
        const envMatches = content.match(/process\.env\.([A-Z_]+)/g);
        if (envMatches) {
          envMatches.forEach(match => {
            const variable = match.replace('process.env.', '');
            variables.add(`ENV_${variable}`);
          });
        }
      }
    } catch (error) {
      console.error('Error extracting template variables:', error);
    }

    return Array.from(variables).map(variable => ({
      name: variable,
      type: 'string',
      description: `Template variable: ${variable}`,
      required: false
    }));
  }

  /**
   * Extract environment variables from template
   * @param {string} templatePath Path to template
   * @returns {Promise<Array>} Environment variables
   */
  async extractEnvVariables(templatePath) {
    const envVars = [];
    const envExamplePath = path.join(templatePath, '.env.example');
    
    if (await fs.pathExists(envExamplePath)) {
      try {
        const envContent = await fs.readFile(envExamplePath, 'utf8');
        const lines = envContent.split('\n');
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine && !trimmedLine.startsWith('#')) {
            const [key, value] = trimmedLine.split('=');
            if (key) {
              envVars.push({
                name: key.trim(),
                defaultValue: value ? value.trim() : '',
                description: `Environment variable: ${key.trim()}`
              });
            }
          }
        }
      } catch (error) {
        console.error('Error reading .env.example:', error);
      }
    }

    return envVars;
  }
}

module.exports = TemplateScanner;