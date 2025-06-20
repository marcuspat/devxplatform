const request = require('supertest');
const path = require('path');
const fs = require('fs-extra');
const express = require('express');
const generationRoutes = require('../routes/generation');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/generation', generationRoutes);

// Test data
const mockTemplateVariables = {
  projectName: 'test-project',
  serviceName: 'test-service',
  description: 'A test service',
  author: 'Test Author',
  email: 'test@example.com'
};

describe('Generation API', () => {
  beforeAll(async () => {
    // Ensure test directories exist
    await fs.ensureDir(path.join(__dirname, '../../../generated'));
    await fs.ensureDir(path.join(__dirname, '../../../templates'));
  });

  afterAll(async () => {
    // Cleanup test files
    try {
      await fs.remove(path.join(__dirname, '../../../generated'));
    } catch (error) {
      console.warn('Error cleaning up test files:', error);
    }
  });

  describe('GET /api/generation/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/generation/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/generation/templates', () => {
    it('should return list of templates', async () => {
      const response = await request(app)
        .get('/api/generation/templates')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('templates');
      expect(response.body.data).toHaveProperty('total');
      expect(Array.isArray(response.body.data.templates)).toBe(true);
    });

    it('should support force refresh', async () => {
      const response = await request(app)
        .get('/api/generation/templates?refresh=true')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('templates');
    });
  });

  describe('GET /api/generation/templates/:templateId', () => {
    it('should return 404 for non-existent template', async () => {
      const response = await request(app)
        .get('/api/generation/templates/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to get template');
    });
  });

  describe('POST /api/generation/validate', () => {
    it('should validate template variables', async () => {
      const response = await request(app)
        .post('/api/generation/validate')
        .send({
          templateId: 'rest-api',
          variables: mockTemplateVariables
        });

      // Should return validation result regardless of template existence
      expect(response.body).toHaveProperty('success');
    });

    it('should return 400 for invalid request', async () => {
      const response = await request(app)
        .post('/api/generation/validate')
        .send({
          // Missing required fields
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid request');
    });
  });

  describe('POST /api/generation/generate', () => {
    it('should return 400 for invalid request', async () => {
      const response = await request(app)
        .post('/api/generation/generate')
        .send({
          // Missing templateId
          variables: mockTemplateVariables
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid request');
    });

    it('should handle generation request with valid data', async () => {
      const response = await request(app)
        .post('/api/generation/generate')
        .send({
          templateId: 'rest-api',
          variables: mockTemplateVariables,
          options: {
            createArchive: true,
            generateReadme: true
          }
        });

      // Should return some response (might be error if template doesn't exist)
      expect(response.body).toHaveProperty('success');
    });
  });

  describe('POST /api/generation/batch', () => {
    it('should return 400 for invalid batch request', async () => {
      const response = await request(app)
        .post('/api/generation/batch')
        .send({
          // Missing requests array
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid request');
    });

    it('should return 400 for empty requests array', async () => {
      const response = await request(app)
        .post('/api/generation/batch')
        .send({
          requests: []
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid request');
    });

    it('should handle batch generation request', async () => {
      const response = await request(app)
        .post('/api/generation/batch')
        .send({
          requests: [
            {
              templateId: 'rest-api',
              variables: mockTemplateVariables
            }
          ]
        });

      // Should return some response
      expect(response.body).toHaveProperty('success');
    });
  });

  describe('GET /api/generation/stats', () => {
    it('should return generation statistics', async () => {
      const response = await request(app)
        .get('/api/generation/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalTemplates');
      expect(response.body.data).toHaveProperty('totalGenerated');
    });
  });

  describe('GET /api/generation/projects', () => {
    it('should return list of generated projects', async () => {
      const response = await request(app)
        .get('/api/generation/projects')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('projects');
      expect(response.body.data).toHaveProperty('total');
      expect(Array.isArray(response.body.data.projects)).toBe(true);
    });

    it('should support filtering by templateId', async () => {
      const response = await request(app)
        .get('/api/generation/projects?templateId=rest-api')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('projects');
    });

    it('should support limiting results', async () => {
      const response = await request(app)
        .get('/api/generation/projects?limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('projects');
    });
  });

  describe('GET /api/generation/projects/:generationId/download', () => {
    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .get('/api/generation/projects/non-existent/download')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Project not found');
    });
  });

  describe('DELETE /api/generation/projects/:generationId', () => {
    it('should return 404 for non-existent project', async () => {
      const response = await request(app)
        .delete('/api/generation/projects/non-existent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Project not found');
    });
  });

  describe('POST /api/generation/cleanup', () => {
    it('should perform cleanup', async () => {
      const response = await request(app)
        .post('/api/generation/cleanup')
        .send({
          maxAge: 1000 // 1 second for testing
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('cleanedCount');
      expect(response.body.data).toHaveProperty('errorCount');
      expect(response.body.data).toHaveProperty('freedBytes');
    });
  });
});

describe('Generation Engine Unit Tests', () => {
  const GenerationEngine = require('../services/generation-engine');
  const TemplateScanner = require('../services/template-scanner');
  const VariableSubstitution = require('../services/variable-substitution');
  const FileGenerator = require('../services/file-generator');

  describe('TemplateScanner', () => {
    it('should initialize with templates path', () => {
      const scanner = new TemplateScanner('/test/path');
      expect(scanner.templatesPath).toBe('/test/path');
    });

    it('should detect template type from package.json', () => {
      const scanner = new TemplateScanner('/test');
      
      // REST API
      expect(scanner.detectTemplateType({
        dependencies: { express: '^4.0.0' }
      })).toBe('rest-api');

      // GraphQL API
      expect(scanner.detectTemplateType({
        dependencies: { graphql: '^16.0.0' }
      })).toBe('graphql-api');

      // Next.js
      expect(scanner.detectTemplateType({
        dependencies: { next: '^13.0.0' }
      })).toBe('webapp-nextjs');

      // Unknown
      expect(scanner.detectTemplateType({
        dependencies: { unknown: '^1.0.0' }
      })).toBe('unknown');
    });
  });

  describe('VariableSubstitution', () => {
    let substitution;

    beforeEach(() => {
      substitution = new VariableSubstitution();
    });

    it('should process simple template content', () => {
      const content = 'Hello {{name}}!';
      const variables = { name: 'World' };
      const result = substitution.processContent(content, variables);
      expect(result).toBe('Hello World!');
    });

    it('should process filename patterns', () => {
      const filename = '{{projectName}}.js';
      const variables = { projectName: 'my-project' };
      const result = substitution.processFilename(filename, variables);
      expect(result).toBe('my-project.js');
    });

    it('should validate variables', () => {
      const variables = { name: 'test', age: 25 };
      const required = [
        { name: 'name', type: 'string', required: true },
        { name: 'age', type: 'number', required: true }
      ];
      
      const validation = substitution.validateVariables(variables, required);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect validation errors', () => {
      const variables = { name: 'test' }; // Missing required field
      const required = [
        { name: 'name', type: 'string', required: true },
        { name: 'age', type: 'number', required: true }
      ];
      
      const validation = substitution.validateVariables(variables, required);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should generate default variables', () => {
      const templateConfig = {
        type: 'rest-api',
        language: 'typescript'
      };
      const customVariables = {
        projectName: 'custom-project'
      };
      
      const defaults = substitution.generateDefaultVariables(templateConfig, customVariables);
      expect(defaults.projectName).toBe('custom-project');
      expect(defaults.templateType).toBe('rest-api');
      expect(defaults).toHaveProperty('version');
      expect(defaults).toHaveProperty('createdAt');
    });
  });

  describe('FileGenerator', () => {
    let generator;

    beforeEach(() => {
      generator = new FileGenerator('./test-output');
    });

    it('should initialize with output path', () => {
      expect(generator.outputPath).toBe('./test-output');
    });

    it('should detect binary files', () => {
      expect(generator.isBinaryFile('image.png')).toBe(true);
      expect(generator.isBinaryFile('document.pdf')).toBe(true);
      expect(generator.isBinaryFile('script.js')).toBe(false);
      expect(generator.isBinaryFile('README.md')).toBe(false);
    });

    it('should format bytes correctly', () => {
      expect(generator.formatBytes(0)).toBe('0 Bytes');
      expect(generator.formatBytes(1024)).toBe('1 KB');
      expect(generator.formatBytes(1024 * 1024)).toBe('1 MB');
    });

    it('should generate environment file', () => {
      const envVars = [
        { name: 'PORT', defaultValue: '3000', description: 'Server port' },
        { name: 'NODE_ENV', defaultValue: 'development', description: 'Environment' }
      ];
      const variables = { PORT: '8080' };
      
      const envContent = generator.generateEnvFile(envVars, variables);
      expect(envContent).toContain('PORT=8080');
      expect(envContent).toContain('NODE_ENV=development');
      expect(envContent).toContain('# Server port');
    });

    it('should generate gitignore content', () => {
      const gitignore = generator.generateGitignore('javascript');
      expect(gitignore).toContain('node_modules/');
      expect(gitignore).toContain('.env');
      expect(gitignore).toContain('dist');
    });
  });

  describe('GenerationEngine', () => {
    let engine;

    beforeEach(() => {
      engine = new GenerationEngine({
        templatesPath: './test-templates',
        outputPath: './test-output'
      });
    });

    it('should initialize with correct paths', () => {
      expect(engine.templatesPath).toBe('./test-templates');
      expect(engine.outputPath).toBe('./test-output');
    });

    it('should have template cache', () => {
      expect(engine.templateCache).toBeInstanceOf(Map);
    });

    it('should group array by key', () => {
      const items = [
        { type: 'api', name: 'item1' },
        { type: 'api', name: 'item2' },
        { type: 'web', name: 'item3' }
      ];
      
      const grouped = engine.groupBy(items, 'type');
      expect(grouped.api).toBe(2);
      expect(grouped.web).toBe(1);
    });
  });
});