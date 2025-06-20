const fs = require('fs-extra');
const path = require('path');
const { glob } = require('glob');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');
const VariableSubstitution = require('./variable-substitution');

class FileGenerator {
  constructor(outputPath = './generated') {
    this.outputPath = outputPath;
    this.variableSubstitution = new VariableSubstitution();
    this.binaryExtensions = new Set([
      '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.tiff', '.svg',
      '.pdf', '.zip', '.tar', '.gz', '.rar', '.7z',
      '.mp3', '.mp4', '.avi', '.mov', '.wmv', '.flv',
      '.exe', '.dll', '.so', '.dylib',
      '.woff', '.woff2', '.ttf', '.eot'
    ]);
  }

  /**
   * Generate a complete project from template
   * @param {Object} templateConfig Template configuration
   * @param {Object} variables Template variables
   * @param {Object} options Generation options
   * @returns {Promise<Object>} Generation result
   */
  async generateProject(templateConfig, variables, options = {}) {
    const generationId = uuidv4();
    const projectPath = path.join(this.outputPath, generationId);
    
    try {
      // Ensure output directory exists
      await fs.ensureDir(projectPath);

      // Validate variables
      const validation = this.variableSubstitution.validateVariables(
        variables, 
        templateConfig.variables || []
      );

      if (!validation.isValid) {
        throw new Error(`Variable validation failed: ${validation.errors.join(', ')}`);
      }

      // Generate complete variables with defaults
      const completeVariables = this.variableSubstitution.generateDefaultVariables(
        templateConfig, 
        variables
      );

      // Copy and process template files
      const processedFiles = await this.processTemplateFiles(
        templateConfig.path,
        projectPath,
        completeVariables,
        options
      );

      // Generate additional files if needed
      const additionalFiles = await this.generateAdditionalFiles(
        projectPath,
        templateConfig,
        completeVariables,
        options
      );

      // Validate generated project
      const validationResult = await this.validateGeneratedProject(
        projectPath,
        templateConfig
      );

      // Create archive if requested
      let archivePath = null;
      if (options.createArchive) {
        archivePath = await this.createProjectArchive(projectPath, generationId);
      }

      const result = {
        generationId,
        projectPath,
        archivePath,
        templateConfig: {
          id: templateConfig.id,
          name: templateConfig.name,
          type: templateConfig.type,
          version: templateConfig.version
        },
        variables: completeVariables,
        files: {
          processed: processedFiles,
          additional: additionalFiles,
          total: processedFiles.length + additionalFiles.length
        },
        validation: validationResult,
        createdAt: new Date().toISOString(),
        size: await this.calculateProjectSize(projectPath)
      };

      return result;
    } catch (error) {
      // Cleanup on error
      await this.cleanup(projectPath);
      throw error;
    }
  }

  /**
   * Process all template files
   * @param {string} templatePath Source template path
   * @param {string} projectPath Destination project path
   * @param {Object} variables Template variables
   * @param {Object} options Processing options
   * @returns {Promise<Array>} Processed files
   */
  async processTemplateFiles(templatePath, projectPath, variables, options = {}) {
    const processedFiles = [];
    const ignorePatterns = [
      'node_modules/**',
      '.git/**',
      'dist/**',
      'build/**',
      '.env',
      '.DS_Store',
      '*.log',
      ...(options.ignoreFiles || [])
    ];

    // Get all files from template
    const files = await glob('**/*', {
      cwd: templatePath,
      ignore: ignorePatterns,
      nodir: true,
      dot: true
    });

    for (const file of files) {
      try {
        const sourcePath = path.join(templatePath, file);
        const processedFilename = this.variableSubstitution.processFilename(file, variables);
        const destinationPath = path.join(projectPath, processedFilename);

        // Ensure destination directory exists
        await fs.ensureDir(path.dirname(destinationPath));

        const stats = await fs.stat(sourcePath);
        const isBinary = this.isBinaryFile(file);

        if (isBinary) {
          // Copy binary files as-is
          await fs.copy(sourcePath, destinationPath);
        } else {
          // Process text files for variable substitution
          const content = await fs.readFile(sourcePath, 'utf8');
          const processedContent = this.variableSubstitution.processContent(content, variables);
          await fs.writeFile(destinationPath, processedContent, 'utf8');
        }

        processedFiles.push({
          originalPath: file,
          processedPath: processedFilename,
          size: stats.size,
          isBinary,
          processed: !isBinary
        });
      } catch (error) {
        console.error(`Error processing file ${file}:`, error);
        // Continue processing other files
      }
    }

    return processedFiles;
  }

  /**
   * Generate additional files based on template type and options
   * @param {string} projectPath Project path
   * @param {Object} templateConfig Template configuration
   * @param {Object} variables Template variables
   * @param {Object} options Generation options
   * @returns {Promise<Array>} Additional files created
   */
  async generateAdditionalFiles(projectPath, templateConfig, variables, options = {}) {
    const additionalFiles = [];

    try {
      // Generate .env file if template has environment variables
      if (templateConfig.envVariables && templateConfig.envVariables.length > 0) {
        const envPath = path.join(projectPath, '.env');
        const envContent = this.generateEnvFile(templateConfig.envVariables, variables);
        await fs.writeFile(envPath, envContent);
        additionalFiles.push({
          path: '.env',
          type: 'environment',
          size: envContent.length
        });
      }

      // Generate README.md if customization is requested
      if (options.generateReadme) {
        const readmePath = path.join(projectPath, 'README.md');
        const readmeContent = this.generateReadme(templateConfig, variables);
        await fs.writeFile(readmePath, readmeContent);
        additionalFiles.push({
          path: 'README.md',
          type: 'documentation',
          size: readmeContent.length
        });
      }

      // Generate .gitignore if not present
      const gitignorePath = path.join(projectPath, '.gitignore');
      if (!await fs.pathExists(gitignorePath)) {
        const gitignoreContent = this.generateGitignore(templateConfig.language);
        await fs.writeFile(gitignorePath, gitignoreContent);
        additionalFiles.push({
          path: '.gitignore',
          type: 'configuration',
          size: gitignoreContent.length
        });
      }

      // Generate deployment files if requested
      if (options.generateDeployment) {
        const deploymentFiles = await this.generateDeploymentFiles(
          projectPath,
          templateConfig,
          variables
        );
        additionalFiles.push(...deploymentFiles);
      }

      // Generate CI/CD files if requested
      if (options.generateCICD) {
        const cicdFiles = await this.generateCICDFiles(
          projectPath,
          templateConfig,
          variables
        );
        additionalFiles.push(...cicdFiles);
      }

    } catch (error) {
      console.error('Error generating additional files:', error);
    }

    return additionalFiles;
  }

  /**
   * Validate generated project
   * @param {string} projectPath Project path
   * @param {Object} templateConfig Template configuration
   * @returns {Promise<Object>} Validation result
   */
  async validateGeneratedProject(projectPath, templateConfig) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      checks: []
    };

    try {
      // Check if package.json exists and is valid
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        try {
          const packageJson = await fs.readJson(packageJsonPath);
          validation.checks.push({
            type: 'package_json',
            status: 'valid',
            message: 'package.json is valid JSON'
          });

          // Check for required fields
          const requiredFields = ['name', 'version', 'description'];
          for (const field of requiredFields) {
            if (!packageJson[field]) {
              validation.warnings.push(`package.json missing recommended field: ${field}`);
            }
          }
        } catch (error) {
          validation.errors.push(`package.json is invalid: ${error.message}`);
          validation.isValid = false;
        }
      } else {
        validation.errors.push('package.json not found');
        validation.isValid = false;
      }

      // Check for Dockerfile if template has Docker support
      if (templateConfig.hasDockerfile) {
        const dockerfilePath = path.join(projectPath, 'Dockerfile');
        if (await fs.pathExists(dockerfilePath)) {
          validation.checks.push({
            type: 'dockerfile',
            status: 'exists',
            message: 'Dockerfile found'
          });
        } else {
          validation.warnings.push('Dockerfile not found but template supports Docker');
        }
      }

      // Check for main entry point
      const entryPoints = ['src/index.js', 'src/index.ts', 'index.js', 'index.ts', 'src/server.js', 'src/server.ts'];
      let hasEntryPoint = false;
      for (const entryPoint of entryPoints) {
        if (await fs.pathExists(path.join(projectPath, entryPoint))) {
          hasEntryPoint = true;
          validation.checks.push({
            type: 'entry_point',
            status: 'found',
            message: `Entry point found: ${entryPoint}`
          });
          break;
        }
      }

      if (!hasEntryPoint) {
        validation.warnings.push('No standard entry point found');
      }

      // Check for test directory
      const testPaths = ['src/__tests__', 'tests', 'test', '__tests__'];
      let hasTests = false;
      for (const testPath of testPaths) {
        if (await fs.pathExists(path.join(projectPath, testPath))) {
          hasTests = true;
          validation.checks.push({
            type: 'tests',
            status: 'found',
            message: `Test directory found: ${testPath}`
          });
          break;
        }
      }

      if (!hasTests) {
        validation.warnings.push('No test directory found');
      }

    } catch (error) {
      validation.errors.push(`Validation error: ${error.message}`);
      validation.isValid = false;
    }

    return validation;
  }

  /**
   * Create project archive
   * @param {string} projectPath Project path
   * @param {string} generationId Generation ID
   * @returns {Promise<string>} Archive path
   */
  async createProjectArchive(projectPath, generationId) {
    const archivePath = path.join(this.outputPath, `${generationId}.zip`);
    
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(archivePath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve(archivePath));
      archive.on('error', reject);

      archive.pipe(output);
      archive.directory(projectPath, false);
      archive.finalize();
    });
  }

  /**
   * Calculate project size
   * @param {string} projectPath Project path
   * @returns {Promise<Object>} Size information
   */
  async calculateProjectSize(projectPath) {
    let totalSize = 0;
    let fileCount = 0;

    const files = await glob('**/*', {
      cwd: projectPath,
      nodir: true,
      dot: true
    });

    for (const file of files) {
      try {
        const filePath = path.join(projectPath, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
        fileCount++;
      } catch (error) {
        // Skip files that can't be accessed
      }
    }

    return {
      bytes: totalSize,
      files: fileCount,
      human: this.formatBytes(totalSize)
    };
  }

  /**
   * Helper methods
   */
  isBinaryFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return this.binaryExtensions.has(ext);
  }

  generateEnvFile(envVariables, variables) {
    let content = '# Environment Variables\n';
    content += '# Generated by DevX Platform\n\n';

    for (const envVar of envVariables) {
      content += `# ${envVar.description || envVar.name}\n`;
      const value = variables[envVar.name] || envVar.defaultValue || '';
      content += `${envVar.name}=${value}\n\n`;
    }

    return content;
  }

  generateReadme(templateConfig, variables) {
    return `# ${variables.projectName}

${variables.description}

## Generated Information

- **Template**: ${templateConfig.name}
- **Type**: ${templateConfig.type}
- **Language**: ${templateConfig.language}
- **Framework**: ${templateConfig.framework}
- **Generated**: ${new Date().toISOString()}

## Getting Started

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Copy environment variables:
\`\`\`bash
cp .env.example .env
\`\`\`

3. Start development server:
\`\`\`bash
npm run dev
\`\`\`

## Available Scripts

- \`npm run dev\` - Start development server
- \`npm run build\` - Build for production
- \`npm start\` - Start production server
- \`npm test\` - Run tests

## Environment Variables

See \`.env.example\` for configuration options.

## License

MIT
`;
  }

  generateGitignore(language) {
    const common = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Directory for instrumented libs generated by jscoverage/JSCover
lib-cov

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Grunt intermediate storage (https://gruntjs.com/creating-plugins#storing-task-files)
.grunt

# Bower dependency directory (https://bower.io/)
bower_components

# node-waf configuration
.lock-wscript

# Compiled binary addons (https://nodejs.org/api/addons.html)
build/Release

# Dependency directories
node_modules/
jspm_packages/

# TypeScript v1 declaration files
typings/

# TypeScript cache
*.tsbuildinfo

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env
.env.test
.env.local
.env.development.local
.env.test.local
.env.production.local

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Next.js build output
.next

# Nuxt.js build / generate output
.nuxt
dist

# Gatsby files
.cache/
# Comment in the public line in if your project uses Gatsby and *not* Next.js
# https://nextjs.org/docs/api-reference/next.config.js/introduction
# public

# vuepress build output
.vuepress/dist

# Serverless directories
.serverless/

# FuseBox cache
.fusebox/

# DynamoDB Local files
.dynamodb/

# TernJS port file
.tern-port

# Stores VSCode versions used for testing VSCode extensions
.vscode-test

# yarn v2
.yarn/cache
.yarn/unplugged
.yarn/build-state.yml
.yarn/install-state.gz
.pnp.*

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Generated files
generated/
`;

    return common;
  }

  async generateDeploymentFiles(projectPath, templateConfig, variables) {
    const files = [];
    
    // Generate docker-compose.yml if not exists
    const dockerComposePath = path.join(projectPath, 'docker-compose.yml');
    if (!await fs.pathExists(dockerComposePath)) {
      const dockerComposeContent = this.generateDockerCompose(templateConfig, variables);
      await fs.writeFile(dockerComposePath, dockerComposeContent);
      files.push({
        path: 'docker-compose.yml',
        type: 'deployment',
        size: dockerComposeContent.length
      });
    }

    return files;
  }

  async generateCICDFiles(projectPath, templateConfig, variables) {
    const files = [];
    
    // Generate GitHub Actions workflow
    const workflowDir = path.join(projectPath, '.github', 'workflows');
    await fs.ensureDir(workflowDir);
    
    const workflowPath = path.join(workflowDir, 'ci.yml');
    const workflowContent = this.generateGitHubActions(templateConfig, variables);
    await fs.writeFile(workflowPath, workflowContent);
    files.push({
      path: '.github/workflows/ci.yml',
      type: 'cicd',
      size: workflowContent.length
    });

    return files;
  }

  generateDockerCompose(templateConfig, variables) {
    return `version: '3.8'

services:
  ${variables.serviceName}:
    build: .
    ports:
      - "${variables.port}:${variables.port}"
    environment:
      - NODE_ENV=development
      - PORT=${variables.port}
    volumes:
      - .:/usr/src/app
      - /usr/src/app/node_modules
    depends_on:
      - database
      - redis

  database:
    image: postgres:15
    environment:
      - POSTGRES_DB=\${DB_NAME:-mydb}
      - POSTGRES_USER=\${DB_USER:-user}
      - POSTGRES_PASSWORD=\${DB_PASSWORD:-password}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
`;
  }

  generateGitHubActions(templateConfig, variables) {
    return `name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js \${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: \${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Run linting
      run: npm run lint
    
    - name: Build project
      run: npm run build

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Build Docker image
      run: docker build -t ${variables.serviceName}:latest .
    
    - name: Test Docker image
      run: docker run --rm ${variables.serviceName}:latest npm test
`;
  }

  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  async cleanup(projectPath) {
    try {
      await fs.remove(projectPath);
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

module.exports = FileGenerator;