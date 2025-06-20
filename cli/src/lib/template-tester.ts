import { promises as fs } from 'fs';
import path from 'path';
import { CodeValidator, ValidationResult } from './code-validator.js';
import { logger } from '../utils/logger.js';
import chalk from 'chalk';
import { v4 as uuidv4 } from 'uuid';

export interface TemplateTestConfig {
  templateId: string;
  templatePath: string;
  testVariables: Record<string, any>;
  expectedFiles: string[];
  skipValidation?: boolean;
  timeout?: number;
}

export interface TemplateTestResult {
  templateId: string;
  success: boolean;
  generatedPath: string;
  validationResults?: ValidationResult[];
  errors: string[];
  warnings: string[];
  duration: number;
  filesGenerated: string[];
  filesExpected: string[];
  filesMissing: string[];
}

export class TemplateTester {
  private codeValidator: CodeValidator;
  private tempDir: string;

  constructor() {
    this.codeValidator = new CodeValidator();
    this.tempDir = path.join(process.cwd(), '.temp-validation');
  }

  async testTemplate(config: TemplateTestConfig): Promise<TemplateTestResult> {
    const startTime = Date.now();
    const testId = uuidv4();
    const testPath = path.join(this.tempDir, testId);
    
    logger.info(`Testing template: ${config.templateId}`);

    const result: TemplateTestResult = {
      templateId: config.templateId,
      success: false,
      generatedPath: testPath,
      errors: [],
      warnings: [],
      duration: 0,
      filesGenerated: [],
      filesExpected: config.expectedFiles,
      filesMissing: []
    };

    try {
      // Ensure temp directory exists
      await fs.mkdir(this.tempDir, { recursive: true });
      
      // Generate project from template
      await this.generateFromTemplate(config, testPath);
      
      // Check if expected files were generated
      result.filesGenerated = await this.getGeneratedFiles(testPath);
      result.filesMissing = config.expectedFiles.filter(
        file => !result.filesGenerated.includes(file)
      );

      if (result.filesMissing.length > 0) {
        result.errors.push(`Missing expected files: ${result.filesMissing.join(', ')}`);
      }

      // Run validation if not skipped
      if (!config.skipValidation && result.filesMissing.length === 0) {
        try {
          result.validationResults = await this.codeValidator.validateProject(testPath);
          
          // Check if validation passed
          const hasErrors = result.validationResults.some(r => r.errors.length > 0);
          if (hasErrors) {
            result.errors.push('Code validation failed');
          }
        } catch (error: any) {
          result.errors.push(`Validation error: ${error.message}`);
        }
      }

      result.success = result.errors.length === 0;
      result.duration = Date.now() - startTime;

      logger.info(`Template test completed: ${config.templateId} - ${result.success ? 'PASSED' : 'FAILED'}`);

    } catch (error: any) {
      result.errors.push(`Template generation error: ${error.message}`);
      result.duration = Date.now() - startTime;
      logger.error(`Template test failed: ${config.templateId}`, error);
    } finally {
      // Clean up test directory
      await this.cleanup(testPath);
    }

    return result;
  }

  async testAllTemplates(templateConfigs: TemplateTestConfig[]): Promise<TemplateTestResult[]> {
    logger.info(`Testing ${templateConfigs.length} templates...`);
    
    const results: TemplateTestResult[] = [];
    
    for (const config of templateConfigs) {
      const result = await this.testTemplate(config);
      results.push(result);
    }

    return results;
  }

  private async generateFromTemplate(config: TemplateTestConfig, outputPath: string): Promise<void> {
    // Copy template files to output path
    await this.copyTemplate(config.templatePath, outputPath);
    
    // Process template variables
    await this.processTemplateVariables(outputPath, config.testVariables);
  }

  private async copyTemplate(templatePath: string, outputPath: string): Promise<void> {
    await fs.mkdir(outputPath, { recursive: true });
    
    const entries = await fs.readdir(templatePath, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(templatePath, entry.name);
      const destPath = path.join(outputPath, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyTemplate(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  private async processTemplateVariables(projectPath: string, variables: Record<string, any>): Promise<void> {
    const processFile = async (filePath: string) => {
      try {
        let content = await fs.readFile(filePath, 'utf-8');
        
        // Replace template variables
        for (const [key, value] of Object.entries(variables)) {
          const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
          content = content.replace(regex, String(value));
        }
        
        await fs.writeFile(filePath, content);
      } catch (error) {
        // Skip binary files or files that can't be processed
      }
    };

    const processDirectory = async (dirPath: string) => {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Skip node_modules and other ignored directories
          if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
            await processDirectory(fullPath);
          }
        } else {
          await processFile(fullPath);
        }
      }
    };

    await processDirectory(projectPath);
  }

  private async getGeneratedFiles(projectPath: string): Promise<string[]> {
    const files: string[] = [];
    
    const scanDirectory = async (dirPath: string, relativePath: string = '') => {
      try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          const relativeFilePath = path.join(relativePath, entry.name);
          
          if (entry.isDirectory()) {
            // Skip node_modules and other ignored directories
            if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
              await scanDirectory(fullPath, relativeFilePath);
            }
          } else {
            files.push(relativeFilePath);
          }
        }
      } catch (error) {
        // Skip directories that can't be read
      }
    };

    await scanDirectory(projectPath);
    return files;
  }

  private async cleanup(testPath: string): Promise<void> {
    try {
      await fs.rm(testPath, { recursive: true, force: true });
    } catch (error) {
      logger.warn(`Failed to cleanup test directory: ${testPath}`);
    }
  }

  generateTestReport(results: TemplateTestResult[]): string {
    let report = '\n' + chalk.bold('Template Test Report') + '\n';
    report += chalk.gray('='.repeat(50)) + '\n\n';

    let totalTests = results.length;
    let passedTests = results.filter(r => r.success).length;
    let failedTests = totalTests - passedTests;

    for (const result of results) {
      if (result.success) {
        report += chalk.green(`✓ ${result.templateId}`);
      } else {
        report += chalk.red(`✗ ${result.templateId}`);
      }
      
      report += chalk.gray(` (${result.duration}ms)`);
      report += '\n';

      // Show files generated vs expected
      if (result.filesExpected.length > 0) {
        report += chalk.blue('  Expected files:\n');
        for (const file of result.filesExpected) {
          const generated = result.filesGenerated.includes(file);
          const status = generated ? chalk.green('✓') : chalk.red('✗');
          report += `    ${status} ${file}\n`;
        }
      }

      // Show missing files
      if (result.filesMissing.length > 0) {
        report += chalk.red('  Missing files:\n');
        for (const file of result.filesMissing) {
          report += `    ✗ ${file}\n`;
        }
      }

      // Show validation results summary
      if (result.validationResults) {
        const validationErrors = result.validationResults.reduce((sum, r) => sum + r.errors.length, 0);
        const validationWarnings = result.validationResults.reduce((sum, r) => sum + r.warnings.length, 0);
        
        if (validationErrors > 0) {
          report += chalk.red(`  Validation: ${validationErrors} errors, ${validationWarnings} warnings\n`);
        } else {
          report += chalk.green(`  Validation: passed (${validationWarnings} warnings)\n`);
        }
      }

      // Show errors
      if (result.errors.length > 0) {
        report += chalk.red('  Errors:\n');
        for (const error of result.errors) {
          report += `    ${error}\n`;
        }
      }

      // Show warnings
      if (result.warnings.length > 0) {
        report += chalk.yellow('  Warnings:\n');
        for (const warning of result.warnings) {
          report += `    ${warning}\n`;
        }
      }

      report += '\n';
    }

    // Summary
    report += chalk.bold('Summary:\n');
    report += `${chalk.green(`${passedTests}/${totalTests} templates passed`)}\n`;
    report += `${chalk.red(`${failedTests} templates failed`)}\n`;
    
    const successRate = Math.round((passedTests / totalTests) * 100);
    report += `Success rate: ${successRate}%\n`;

    const overallSuccess = failedTests === 0;
    report += '\n' + chalk.bold(`Overall Result: ${overallSuccess ? chalk.green('ALL TESTS PASSED') : chalk.red('SOME TESTS FAILED')}`);

    return report;
  }
}

// Predefined test configurations for built-in templates
export const defaultTemplateTests: TemplateTestConfig[] = [
  {
    templateId: 'rest-api',
    templatePath: path.join(process.cwd(), 'templates', 'rest-api'),
    testVariables: {
      serviceName: 'test-api',
      port: 3000,
      description: 'Test REST API service'
    },
    expectedFiles: [
      'package.json',
      'tsconfig.json',
      'src/index.ts',
      'src/server.ts',
      'src/routes/health.ts',
      'src/middleware/error-handler.ts',
      'Dockerfile',
      'docker-compose.yml'
    ]
  },
  {
    templateId: 'graphql-api',
    templatePath: path.join(process.cwd(), 'templates', 'graphql-api'),
    testVariables: {
      serviceName: 'test-graphql',
      port: 4000,
      description: 'Test GraphQL API service'
    },
    expectedFiles: [
      'package.json',
      'tsconfig.json',
      'src/index.ts',
      'src/server.ts',
      'src/resolvers/user.resolver.ts',
      'src/schemas/user.schema.ts',
      'Dockerfile',
      'docker-compose.yml'
    ]
  },
  {
    templateId: 'grpc-service',
    templatePath: path.join(process.cwd(), 'templates', 'grpc-service'),
    testVariables: {
      serviceName: 'test-grpc',
      port: 50051,
      description: 'Test gRPC service'
    },
    expectedFiles: [
      'package.json',
      'tsconfig.json',
      'src/index.ts',
      'src/server.ts',
      'src/services/user.service.ts',
      'proto/user.proto',
      'Dockerfile',
      'docker-compose.yml'
    ]
  },
  {
    templateId: 'worker-service',
    templatePath: path.join(process.cwd(), 'templates', 'worker-service'),
    testVariables: {
      serviceName: 'test-worker',
      redisUrl: 'redis://localhost:6379',
      description: 'Test worker service'
    },
    expectedFiles: [
      'package.json',
      'tsconfig.json',
      'src/index.ts',
      'src/worker.ts',
      'src/processors/email.processor.ts',
      'Dockerfile',
      'docker-compose.yml'
    ]
  },
  {
    templateId: 'webapp-nextjs',
    templatePath: path.join(process.cwd(), 'templates', 'webapp-nextjs'),
    testVariables: {
      serviceName: 'test-webapp',
      port: 3000,
      description: 'Test Next.js web application'
    },
    expectedFiles: [
      'package.json',
      'tsconfig.json',
      'next.config.js',
      'src/app/layout.tsx',
      'src/app/page.tsx',
      'src/components/hero.tsx',
      'Dockerfile',
      'docker-compose.yml'
    ]
  },
  {
    templateId: 'go-gin',
    templatePath: path.join(process.cwd(), 'templates', 'go', 'gin'),
    testVariables: {
      serviceName: 'test-go-api',
      port: 8080,
      description: 'Test Go Gin API service'
    },
    expectedFiles: [
      'go.mod',
      'cmd/main.go',
      'internal/api/router.go',
      'internal/api/handlers/health_handler.go',
      'internal/api/handlers/user_handler.go',
      'internal/services/user_service.go',
      'Dockerfile',
      'docker-compose.yml',
      'Makefile'
    ]
  },
  {
    templateId: 'python-fastapi',
    templatePath: path.join(process.cwd(), 'templates', 'python', 'fastapi'),
    testVariables: {
      serviceName: 'test-python-api',
      port: 8000,
      description: 'Test Python FastAPI service'
    },
    expectedFiles: [
      'requirements.txt',
      'main.py',
      'app/api/v1/users.py',
      'app/api/v1/health.py',
      'app/models/user.py',
      'app/services/user_service.py',
      'Dockerfile',
      'docker-compose.yml'
    ]
  },
  {
    templateId: 'python-flask',
    templatePath: path.join(process.cwd(), 'templates', 'python', 'flask'),
    testVariables: {
      serviceName: 'test-flask-api',
      port: 5000,
      description: 'Test Python Flask API service'
    },
    expectedFiles: [
      'requirements.txt',
      'app.py',
      'app/api/users.py',
      'app/api/health.py',
      'app/models/user.py',
      'Dockerfile',
      'docker-compose.yml'
    ]
  }
];