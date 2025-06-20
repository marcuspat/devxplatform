const Handlebars = require('handlebars');

class VariableSubstitution {
  constructor() {
    this.setupHelpers();
  }

  /**
   * Setup Handlebars helpers for advanced templating
   */
  setupHelpers() {
    // Helper for kebab-case conversion
    Handlebars.registerHelper('kebabCase', function(str) {
      return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    });

    // Helper for snake_case conversion
    Handlebars.registerHelper('snakeCase', function(str) {
      return str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
    });

    // Helper for PascalCase conversion
    Handlebars.registerHelper('pascalCase', function(str) {
      return str.replace(/(?:^|-)(\w)/g, (match, letter) => letter.toUpperCase());
    });

    // Helper for camelCase conversion
    Handlebars.registerHelper('camelCase', function(str) {
      return str.replace(/-(\w)/g, (match, letter) => letter.toUpperCase());
    });

    // Helper for uppercase conversion
    Handlebars.registerHelper('upperCase', function(str) {
      return str.toUpperCase();
    });

    // Helper for lowercase conversion
    Handlebars.registerHelper('lowerCase', function(str) {
      return str.toLowerCase();
    });

    // Helper for port generation based on service type
    Handlebars.registerHelper('defaultPort', function(serviceType) {
      const defaultPorts = {
        'rest-api': 3000,
        'graphql-api': 4000,
        'grpc-service': 50051,
        'worker-service': 3001,
        'webapp-nextjs': 3000
      };
      return defaultPorts[serviceType] || 3000;
    });

    // Helper for conditional rendering
    Handlebars.registerHelper('if_eq', function(a, b, options) {
      return a === b ? options.fn(this) : options.inverse(this);
    });

    // Helper for date formatting
    Handlebars.registerHelper('currentDate', function() {
      return new Date().toISOString();
    });

    // Helper for year
    Handlebars.registerHelper('currentYear', function() {
      return new Date().getFullYear();
    });

    // Helper for generating random strings
    Handlebars.registerHelper('randomString', function(length = 32) {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    });

    // Helper for version bumping
    Handlebars.registerHelper('bumpVersion', function(version, type = 'patch') {
      const parts = version.split('.').map(Number);
      switch (type) {
        case 'major':
          parts[0]++;
          parts[1] = 0;
          parts[2] = 0;
          break;
        case 'minor':
          parts[1]++;
          parts[2] = 0;
          break;
        default: // patch
          parts[2]++;
          break;
      }
      return parts.join('.');
    });
  }

  /**
   * Process template content with variable substitution
   * @param {string} content Template content
   * @param {Object} variables Variables to substitute
   * @returns {string} Processed content
   */
  processContent(content, variables) {
    try {
      const template = Handlebars.compile(content);
      return template(variables);
    } catch (error) {
      throw new Error(`Template processing failed: ${error.message}`);
    }
  }

  /**
   * Process filename with variable substitution
   * @param {string} filename Original filename
   * @param {Object} variables Variables to substitute
   * @returns {string} Processed filename
   */
  processFilename(filename, variables) {
    try {
      // Handle special filename patterns
      let processedFilename = filename;

      // Replace common patterns
      Object.entries(variables).forEach(([key, value]) => {
        const patterns = [
          new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
          new RegExp(`__${key.toUpperCase()}__`, 'g'),
          new RegExp(`{{kebabCase ${key}}}`, 'g'),
          new RegExp(`{{snakeCase ${key}}}`, 'g'),
          new RegExp(`{{pascalCase ${key}}}`, 'g'),
          new RegExp(`{{camelCase ${key}}}`, 'g')
        ];

        patterns.forEach((pattern, index) => {
          let replacement = String(value);
          switch (index) {
            case 2: // kebabCase
              replacement = this.toKebabCase(String(value));
              break;
            case 3: // snakeCase
              replacement = this.toSnakeCase(String(value));
              break;
            case 4: // pascalCase
              replacement = this.toPascalCase(String(value));
              break;
            case 5: // camelCase
              replacement = this.toCamelCase(String(value));
              break;
          }
          processedFilename = processedFilename.replace(pattern, replacement);
        });
      });

      return processedFilename;
    } catch (error) {
      throw new Error(`Filename processing failed: ${error.message}`);
    }
  }

  /**
   * Validate variables against template requirements
   * @param {Object} variables Provided variables
   * @param {Array} requiredVariables Required variables from template
   * @returns {Object} Validation result
   */
  validateVariables(variables, requiredVariables) {
    const errors = [];
    const warnings = [];

    // Check required variables
    requiredVariables.forEach(required => {
      if (required.required && !variables[required.name]) {
        errors.push(`Required variable '${required.name}' is missing`);
      }

      if (variables[required.name]) {
        // Type validation
        const value = variables[required.name];
        switch (required.type) {
          case 'number':
            if (isNaN(Number(value))) {
              errors.push(`Variable '${required.name}' must be a number`);
            }
            break;
          case 'boolean':
            if (typeof value !== 'boolean' && !['true', 'false'].includes(String(value).toLowerCase())) {
              errors.push(`Variable '${required.name}' must be a boolean`);
            }
            break;
          case 'email':
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              errors.push(`Variable '${required.name}' must be a valid email address`);
            }
            break;
          case 'url':
            try {
              new URL(value);
            } catch {
              errors.push(`Variable '${required.name}' must be a valid URL`);
            }
            break;
        }

        // Pattern validation
        if (required.pattern && !new RegExp(required.pattern).test(value)) {
          errors.push(`Variable '${required.name}' does not match required pattern: ${required.pattern}`);
        }

        // Length validation
        if (required.minLength && String(value).length < required.minLength) {
          errors.push(`Variable '${required.name}' must be at least ${required.minLength} characters long`);
        }

        if (required.maxLength && String(value).length > required.maxLength) {
          errors.push(`Variable '${required.name}' must be no more than ${required.maxLength} characters long`);
        }
      }
    });

    // Check for unused variables
    Object.keys(variables).forEach(key => {
      if (!requiredVariables.find(req => req.name === key)) {
        warnings.push(`Variable '${key}' is provided but not used in template`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Generate default variables for a template
   * @param {Object} templateConfig Template configuration
   * @param {Object} customVariables Custom variables provided by user
   * @returns {Object} Complete variables object
   */
  generateDefaultVariables(templateConfig, customVariables = {}) {
    const defaultVariables = {
      // Project basics
      projectName: customVariables.projectName || 'my-service',
      serviceName: customVariables.serviceName || customVariables.projectName || 'my-service',
      description: customVariables.description || `A ${templateConfig.type} service`,
      version: customVariables.version || '1.0.0',
      author: customVariables.author || 'Developer',
      email: customVariables.email || 'developer@example.com',
      
      // Technical details
      nodeVersion: customVariables.nodeVersion || '18',
      port: customVariables.port || this.getDefaultPort(templateConfig.type),
      
      // Environment
      environment: customVariables.environment || 'development',
      
      // Database
      databaseUrl: customVariables.databaseUrl || 'postgresql://user:password@localhost:5432/mydb',
      redisUrl: customVariables.redisUrl || 'redis://localhost:6379',
      
      // Security
      jwtSecret: customVariables.jwtSecret || this.generateRandomString(64),
      apiKey: customVariables.apiKey || this.generateRandomString(32),
      
      // Timestamps
      createdAt: new Date().toISOString(),
      year: new Date().getFullYear(),
      
      // Template metadata
      templateType: templateConfig.type,
      templateVersion: templateConfig.version,
      language: templateConfig.language || 'javascript',
      framework: templateConfig.framework || 'express'
    };

    // Merge with custom variables
    return { ...defaultVariables, ...customVariables };
  }

  /**
   * Helper methods for case conversion
   */
  toKebabCase(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }

  toSnakeCase(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
  }

  toPascalCase(str) {
    return str.replace(/(?:^|-)(\w)/g, (match, letter) => letter.toUpperCase()).replace(/-/g, '');
  }

  toCamelCase(str) {
    const pascal = this.toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
  }

  generateRandomString(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  getDefaultPort(templateType) {
    const defaultPorts = {
      'rest-api': 3000,
      'graphql-api': 4000,
      'grpc-service': 50051,
      'worker-service': 3001,
      'webapp-nextjs': 3000
    };
    return defaultPorts[templateType] || 3000;
  }
}

module.exports = VariableSubstitution;