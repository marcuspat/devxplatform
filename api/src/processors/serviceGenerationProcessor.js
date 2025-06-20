const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const { JOB_PROGRESS_STAGES } = require('../types/jobs');

/**
 * Service Generation Processor
 * Handles the complete service generation workflow
 */
class ServiceGenerationProcessor {
  constructor() {
    this.templatesPath = process.env.TEMPLATES_PATH || path.join(__dirname, '../../../templates');
    this.outputPath = process.env.OUTPUT_PATH || path.join(__dirname, '../../../generated-services');
  }

  /**
   * Process service generation job
   * @param {Object} job - BullMQ job instance
   * @returns {Object} - Job result
   */
  async process(job) {
    const { 
      jobId,
      serviceName, 
      template, 
      environment, 
      resources, 
      configuration = {},
      userId 
    } = job.data;
    
    console.log(`🏗️  Starting service generation for: ${serviceName}`);
    
    try {
      // Stage 1: Initialize
      await this.updateProgress(job, JOB_PROGRESS_STAGES.INITIALIZING, 5, 
        'Initializing service generation...');
      
      const workDir = await this.createWorkDirectory(serviceName);
      
      // Stage 2: Validate template
      await this.updateProgress(job, JOB_PROGRESS_STAGES.VALIDATING_TEMPLATE, 15,
        `Validating template: ${template}`);
      
      const templatePath = await this.validateTemplate(template);
      
      // Stage 3: Generate code
      await this.updateProgress(job, JOB_PROGRESS_STAGES.GENERATING_CODE, 30,
        'Generating service code from template...');
      
      await this.generateServiceCode(templatePath, workDir, {
        serviceName,
        environment,
        resources,
        ...configuration,
      });
      
      // Stage 4: Install dependencies
      await this.updateProgress(job, JOB_PROGRESS_STAGES.INSTALLING_DEPENDENCIES, 50,
        'Installing service dependencies...');
      
      await this.installDependencies(workDir);
      
      // Stage 5: Run tests
      await this.updateProgress(job, JOB_PROGRESS_STAGES.RUNNING_TESTS, 70,
        'Running service tests...');
      
      const testResults = await this.runTests(workDir);
      
      // Stage 6: Build image (if requested)
      let imageTag = null;
      if (configuration.buildImage !== false) {
        await this.updateProgress(job, JOB_PROGRESS_STAGES.BUILDING_IMAGE, 85,
          'Building Docker image...');
        
        imageTag = await this.buildDockerImage(workDir, serviceName, environment);
      }
      
      // Stage 7: Complete
      await this.updateProgress(job, JOB_PROGRESS_STAGES.COMPLETED, 100,
        'Service generation completed successfully!');
      
      const result = {
        success: true,
        serviceId: `srv_${serviceName}_${Date.now()}`,
        serviceName,
        template,
        environment,
        workDir,
        imageTag,
        testResults,
        artifacts: {
          files: await this.getGeneratedFiles(workDir),
          metadata: {
            generatedAt: new Date().toISOString(),
            template,
            environment,
            resources,
            userId,
          },
        },
        duration: Date.now() - job.timestamp,
      };
      
      console.log(`✅ Service generation completed for: ${serviceName}`);
      return result;
      
    } catch (error) {
      console.error(`❌ Service generation failed for ${serviceName}:`, error.message);
      
      await this.updateProgress(job, 'failed', job.progress || 0,
        `Service generation failed: ${error.message}`);
      
      throw error;
    }
  }
  
  /**
   * Update job progress
   */
  async updateProgress(job, stage, percentage, message) {
    const progressData = {
      stage,
      percentage,
      message,
      timestamp: new Date().toISOString(),
    };
    
    await job.updateProgress(progressData);
    console.log(`📊 [${job.data.serviceName}] ${stage}: ${message} (${percentage}%)`);
  }
  
  /**
   * Create work directory for service generation
   */
  async createWorkDirectory(serviceName) {
    const workDir = path.join(this.outputPath, serviceName);
    
    try {
      await fs.access(workDir);
      // Directory exists, remove it
      await fs.rm(workDir, { recursive: true, force: true });
    } catch (error) {
      // Directory doesn't exist, which is fine
    }
    
    await fs.mkdir(workDir, { recursive: true });
    return workDir;
  }
  
  /**
   * Validate that the requested template exists
   */
  async validateTemplate(template) {
    const templatePath = path.join(this.templatesPath, template);
    
    try {
      await fs.access(templatePath);
      
      // Check if it's a valid template (has required files)
      const packageJsonPath = path.join(templatePath, 'package.json');
      await fs.access(packageJsonPath);
      
      return templatePath;
    } catch (error) {
      throw new Error(`Template '${template}' not found or invalid`);
    }
  }
  
  /**
   * Generate service code from template
   */
  async generateServiceCode(templatePath, workDir, variables) {
    // Copy template files to work directory
    await this.copyTemplate(templatePath, workDir);
    
    // Replace variables in template files
    await this.replaceTemplateVariables(workDir, variables);
    
    // Generate specific configuration files
    await this.generateConfigurationFiles(workDir, variables);
  }
  
  /**
   * Copy template to work directory
   */
  async copyTemplate(templatePath, workDir) {
    const copyRecursive = async (src, dest) => {
      const stats = await fs.stat(src);
      
      if (stats.isDirectory()) {
        await fs.mkdir(dest, { recursive: true });
        const files = await fs.readdir(src);
        
        for (const file of files) {
          if (file === 'node_modules' || file === '.git') {
            continue; // Skip these directories
          }
          
          await copyRecursive(
            path.join(src, file),
            path.join(dest, file)
          );
        }
      } else {
        await fs.copyFile(src, dest);
      }
    };
    
    await copyRecursive(templatePath, workDir);
  }
  
  /**
   * Replace template variables in files
   */
  async replaceTemplateVariables(workDir, variables) {
    const replaceInFile = async (filePath) => {
      const content = await fs.readFile(filePath, 'utf-8');
      let updatedContent = content;
      
      // Replace common variables
      updatedContent = updatedContent.replace(/\{\{SERVICE_NAME\}\}/g, variables.serviceName);
      updatedContent = updatedContent.replace(/\{\{ENVIRONMENT\}\}/g, variables.environment);
      updatedContent = updatedContent.replace(/\{\{CPU_CORES\}\}/g, variables.resources?.cpu || '0.5');
      updatedContent = updatedContent.replace(/\{\{MEMORY_GB\}\}/g, variables.resources?.memory || '1');
      
      // Replace any custom variables
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\{\\{${key.toUpperCase()}\\}\\}`, 'g');
        updatedContent = updatedContent.replace(regex, value);
      });
      
      if (content !== updatedContent) {
        await fs.writeFile(filePath, updatedContent);
      }
    };
    
    const processDirectory = async (dirPath) => {
      const files = await fs.readdir(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isDirectory()) {
          await processDirectory(filePath);
        } else if (file.endsWith('.js') || file.endsWith('.json') || file.endsWith('.yml') || file.endsWith('.yaml')) {
          await replaceInFile(filePath);
        }
      }
    };
    
    await processDirectory(workDir);
  }
  
  /**
   * Generate configuration files
   */
  async generateConfigurationFiles(workDir, variables) {
    // Generate docker-compose.yml for local development
    const dockerCompose = {
      version: '3.9',
      services: {
        [variables.serviceName]: {
          build: '.',
          ports: ['3000:3000'],
          environment: {
            NODE_ENV: variables.environment,
            SERVICE_NAME: variables.serviceName,
          },
          volumes: variables.environment === 'development' ? ['.:/app', '/app/node_modules'] : undefined,
        },
      },
    };
    
    await fs.writeFile(
      path.join(workDir, 'docker-compose.yml'),
      require('util').inspect(dockerCompose, { depth: null, compact: false })
        .replace(/'/g, '')
        .replace(/(\w+):/g, '$1:')
    );
    
    // Generate environment-specific config
    const envConfig = {
      serviceName: variables.serviceName,
      environment: variables.environment,
      resources: variables.resources,
      generatedAt: new Date().toISOString(),
    };
    
    await fs.writeFile(
      path.join(workDir, 'devex.config.json'),
      JSON.stringify(envConfig, null, 2)
    );
  }
  
  /**
   * Install dependencies
   */
  async installDependencies(workDir) {
    try {
      // Check if package.json exists
      await fs.access(path.join(workDir, 'package.json'));
      
      // Install dependencies
      execSync('npm install --production', {
        cwd: workDir,
        stdio: 'pipe',
      });
    } catch (error) {
      console.warn(`⚠️ Failed to install dependencies: ${error.message}`);
      // Non-critical error, continue with generation
    }
  }
  
  /**
   * Run tests
   */
  async runTests(workDir) {
    try {
      const packageJsonPath = path.join(workDir, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      if (packageJson.scripts && packageJson.scripts.test) {
        const output = execSync('npm test', {
          cwd: workDir,
          stdio: 'pipe',
          encoding: 'utf-8',
        });
        
        return {
          success: true,
          output,
        };
      } else {
        return {
          success: true,
          message: 'No tests defined',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
  
  /**
   * Build Docker image
   */
  async buildDockerImage(workDir, serviceName, environment) {
    try {
      const imageTag = `${serviceName}:${environment}-${Date.now()}`;
      
      execSync(`docker build -t ${imageTag} .`, {
        cwd: workDir,
        stdio: 'pipe',
      });
      
      return imageTag;
    } catch (error) {
      console.warn(`⚠️ Failed to build Docker image: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Get list of generated files
   */
  async getGeneratedFiles(workDir) {
    const files = [];
    
    const readDirectory = async (dirPath, relativePath = '') => {
      const entries = await fs.readdir(dirPath);
      
      for (const entry of entries) {
        if (entry === 'node_modules' || entry === '.git') {
          continue;
        }
        
        const fullPath = path.join(dirPath, entry);
        const relativeFilePath = path.join(relativePath, entry);
        const stats = await fs.stat(fullPath);
        
        if (stats.isDirectory()) {
          await readDirectory(fullPath, relativeFilePath);
        } else {
          files.push({
            path: relativeFilePath,
            size: stats.size,
            modified: stats.mtime,
          });
        }
      }
    };
    
    await readDirectory(workDir);
    return files;
  }
}

module.exports = ServiceGenerationProcessor;