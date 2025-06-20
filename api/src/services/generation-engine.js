const path = require('path');
const fs = require('fs-extra');
const TemplateScanner = require('./template-scanner');
const FileGenerator = require('./file-generator');
const VariableSubstitution = require('./variable-substitution');

class GenerationEngine {
  constructor(options = {}) {
    this.templatesPath = options.templatesPath || path.join(__dirname, '../../../templates');
    this.outputPath = options.outputPath || path.join(__dirname, '../../../generated');
    this.templateScanner = new TemplateScanner(this.templatesPath);
    this.fileGenerator = new FileGenerator(this.outputPath);
    this.variableSubstitution = new VariableSubstitution();
    
    // Cache for template configurations
    this.templateCache = new Map();
    this.lastScanTime = null;
    this.scanCacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Initialize the generation engine
   */
  async initialize() {
    try {
      // Ensure required directories exist
      await fs.ensureDir(this.templatesPath);
      await fs.ensureDir(this.outputPath);
      
      // Scan templates on initialization
      await this.scanTemplates();
      
      console.log('Generation engine initialized successfully');
    } catch (error) {
      throw new Error(`Failed to initialize generation engine: ${error.message}`);
    }
  }

  /**
   * Get all available templates
   * @param {boolean} forceRefresh Force refresh of template cache
   * @returns {Promise<Array>} Array of template configurations
   */
  async getTemplates(forceRefresh = false) {
    const now = Date.now();
    const shouldRefresh = forceRefresh || 
                         !this.lastScanTime || 
                         (now - this.lastScanTime) > this.scanCacheTimeout;

    if (shouldRefresh) {
      await this.scanTemplates();
    }

    return Array.from(this.templateCache.values());
  }

  /**
   * Get a specific template by ID
   * @param {string} templateId Template ID
   * @returns {Promise<Object>} Template configuration
   */
  async getTemplate(templateId) {
    await this.getTemplates(); // Ensure templates are loaded
    
    const template = this.templateCache.get(templateId);
    if (!template) {
      throw new Error(`Template '${templateId}' not found`);
    }
    
    return template;
  }

  /**
   * Generate a project from template
   * @param {string} templateId Template ID
   * @param {Object} variables Template variables
   * @param {Object} options Generation options
   * @returns {Promise<Object>} Generation result
   */
  async generateProject(templateId, variables = {}, options = {}) {
    try {
      // Get template configuration
      const templateConfig = await this.getTemplate(templateId);
      
      // Validate template
      await this.validateTemplate(templateConfig);
      
      // Generate default options
      const generationOptions = {
        createArchive: true,
        generateReadme: true,
        generateDeployment: false,
        generateCICD: false,
        ignoreFiles: [],
        ...options
      };

      // Generate the project
      const result = await this.fileGenerator.generateProject(
        templateConfig,
        variables,
        generationOptions
      );

      // Store generation result for tracking
      await this.storeGenerationResult(result);

      return result;
    } catch (error) {
      throw new Error(`Project generation failed: ${error.message}`);
    }
  }

  /**
   * Generate multiple projects (batch generation)
   * @param {Array} requests Array of generation requests
   * @returns {Promise<Array>} Array of generation results
   */
  async generateProjects(requests) {
    const results = [];
    const errors = [];

    for (let i = 0; i < requests.length; i++) {
      const request = requests[i];
      try {
        console.log(`Generating project ${i + 1}/${requests.length}: ${request.templateId}`);
        
        const result = await this.generateProject(
          request.templateId,
          request.variables,
          request.options
        );
        
        results.push({
          index: i,
          success: true,
          result
        });
      } catch (error) {
        console.error(`Error generating project ${i + 1}:`, error);
        errors.push({
          index: i,
          error: error.message,
          request
        });
        
        results.push({
          index: i,
          success: false,
          error: error.message
        });
      }
    }

    return {
      results,
      errors,
      totalRequests: requests.length,
      successCount: results.filter(r => r.success).length,
      errorCount: errors.length
    };
  }

  /**
   * Get generation statistics
   * @returns {Promise<Object>} Generation statistics
   */
  async getGenerationStats() {
    try {
      const templates = await this.getTemplates();
      const generatedProjects = await this.getGeneratedProjects();
      
      // Calculate usage statistics
      const templateUsage = {};
      generatedProjects.forEach(project => {
        const templateId = project.templateConfig.id;
        templateUsage[templateId] = (templateUsage[templateId] || 0) + 1;
      });

      // Calculate size statistics
      const totalSize = generatedProjects.reduce((sum, project) => {
        return sum + (project.size?.bytes || 0);
      }, 0);

      return {
        totalTemplates: templates.length,
        totalGenerated: generatedProjects.length,
        templateUsage,
        totalSize: {
          bytes: totalSize,
          human: this.fileGenerator.formatBytes(totalSize)
        },
        templateTypes: this.groupBy(templates, 'type'),
        languages: this.groupBy(templates, 'language'),
        frameworks: this.groupBy(templates, 'framework'),
        recentGenerations: generatedProjects
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 10)
      };
    } catch (error) {
      throw new Error(`Failed to get generation stats: ${error.message}`);
    }
  }

  /**
   * Validate template variables
   * @param {string} templateId Template ID
   * @param {Object} variables Variables to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateTemplateVariables(templateId, variables) {
    const templateConfig = await this.getTemplate(templateId);
    return this.variableSubstitution.validateVariables(
      variables,
      templateConfig.variables || []
    );
  }

  /**
   * Get default variables for a template
   * @param {string} templateId Template ID
   * @param {Object} customVariables Custom variables
   * @returns {Promise<Object>} Default variables
   */
  async getTemplateDefaults(templateId, customVariables = {}) {
    const templateConfig = await this.getTemplate(templateId);
    return this.variableSubstitution.generateDefaultVariables(
      templateConfig,
      customVariables
    );
  }

  /**
   * Clean up old generated projects
   * @param {number} maxAge Maximum age in milliseconds
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanup(maxAge = 24 * 60 * 60 * 1000) { // Default: 24 hours
    try {
      const generatedProjects = await this.getGeneratedProjects();
      const now = Date.now();
      let cleanedCount = 0;
      let errorCount = 0;
      let freedBytes = 0;

      for (const project of generatedProjects) {
        const projectAge = now - new Date(project.createdAt).getTime();
        
        if (projectAge > maxAge) {
          try {
            // Remove project directory
            if (await fs.pathExists(project.projectPath)) {
              const stats = await this.fileGenerator.calculateProjectSize(project.projectPath);
              await fs.remove(project.projectPath);
              freedBytes += stats.bytes;
            }

            // Remove archive
            if (project.archivePath && await fs.pathExists(project.archivePath)) {
              const archiveStats = await fs.stat(project.archivePath);
              await fs.remove(project.archivePath);
              freedBytes += archiveStats.size;
            }

            // Remove from results database/file
            await this.removeGenerationResult(project.generationId);
            
            cleanedCount++;
          } catch (error) {
            console.error(`Error cleaning up project ${project.generationId}:`, error);
            errorCount++;
          }
        }
      }

      return {
        cleanedCount,
        errorCount,
        freedBytes,
        freedSpace: this.fileGenerator.formatBytes(freedBytes)
      };
    } catch (error) {
      throw new Error(`Cleanup failed: ${error.message}`);
    }
  }

  /**
   * Private methods
   */

  async scanTemplates() {
    try {
      console.log('Scanning templates...');
      const templates = await this.templateScanner.scanTemplates();
      
      // Update cache
      this.templateCache.clear();
      templates.forEach(template => {
        this.templateCache.set(template.id, template);
      });
      
      this.lastScanTime = Date.now();
      console.log(`Found ${templates.length} templates`);
      
      return templates;
    } catch (error) {
      throw new Error(`Template scanning failed: ${error.message}`);
    }
  }

  async validateTemplate(templateConfig) {
    // Check if template path exists
    if (!await fs.pathExists(templateConfig.path)) {
      throw new Error(`Template path does not exist: ${templateConfig.path}`);
    }

    // Check if package.json exists
    const packageJsonPath = path.join(templateConfig.path, 'package.json');
    if (!await fs.pathExists(packageJsonPath)) {
      throw new Error(`Template package.json not found: ${packageJsonPath}`);
    }

    // Validate package.json
    try {
      await fs.readJson(packageJsonPath);
    } catch (error) {
      throw new Error(`Template package.json is invalid: ${error.message}`);
    }
  }

  async storeGenerationResult(result) {
    try {
      const resultsPath = path.join(this.outputPath, 'results.json');
      let results = [];

      // Load existing results
      if (await fs.pathExists(resultsPath)) {
        try {
          results = await fs.readJson(resultsPath);
        } catch (error) {
          console.warn('Error reading existing results, starting fresh');
        }
      }

      // Add new result
      results.push({
        generationId: result.generationId,
        templateConfig: result.templateConfig,
        variables: result.variables,
        files: result.files,
        validation: result.validation,
        createdAt: result.createdAt,
        size: result.size,
        projectPath: result.projectPath,
        archivePath: result.archivePath
      });

      // Keep only last 1000 results
      if (results.length > 1000) {
        results = results.slice(-1000);
      }

      // Save results
      await fs.writeJson(resultsPath, results, { spaces: 2 });
    } catch (error) {
      console.error('Error storing generation result:', error);
    }
  }

  async getGeneratedProjects() {
    try {
      const resultsPath = path.join(this.outputPath, 'results.json');
      
      if (await fs.pathExists(resultsPath)) {
        return await fs.readJson(resultsPath);
      }
      
      return [];
    } catch (error) {
      console.error('Error reading generated projects:', error);
      return [];
    }
  }

  async removeGenerationResult(generationId) {
    try {
      const resultsPath = path.join(this.outputPath, 'results.json');
      let results = await this.getGeneratedProjects();
      
      results = results.filter(r => r.generationId !== generationId);
      
      await fs.writeJson(resultsPath, results, { spaces: 2 });
    } catch (error) {
      console.error('Error removing generation result:', error);
    }
  }

  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const group = item[key] || 'unknown';
      groups[group] = (groups[group] || 0) + 1;
      return groups;
    }, {});
  }
}

module.exports = GenerationEngine;