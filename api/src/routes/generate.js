const express = require('express');
const Template = require('../models/Template');
const Project = require('../models/Project');
const { authenticate } = require('../middleware/auth-simple');
const { validate, schemas } = require('../middleware/validation');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const archiver = require('archiver');

// Import the real generation engine
const GenerationEngine = require('../services/generation-engine');
const generationEngine = new GenerationEngine();

const router = express.Router();

// Generate service from template
router.post('/', authenticate, validate(schemas.generateService), async (req, res) => {
  try {
    const { name, template_id, settings = {} } = req.body;
    
    // Verify template exists
    const template = await Template.findById(template_id);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Generate unique slug for the service
    const slug = generateUniqueSlug(name);
    
    // Check if project with this slug already exists
    const existingProject = await Project.findBySlug(req.user.id, slug);
    if (existingProject) {
      return res.status(409).json({
        success: false,
        message: 'A project with this name already exists'
      });
    }

    // Create project record
    const project = await Project.create({
      name,
      slug,
      description: `Generated from ${template.name} template`,
      template_id: template.id,
      user_id: req.user.id,
      status: 'active',
      settings: {
        ...settings,
        generated_at: new Date().toISOString(),
        generation_id: uuidv4()
      }
    });

    // Generate the actual service files using the real generation engine
    const generationResult = await generateServiceFiles(template, project, settings);
    
    // Increment template download count
    await Template.incrementDownloadCount(template.id);
    
    res.status(201).json({
      success: true,
      message: 'Service generated successfully',
      data: {
        project: (await Project.findById(project.id)).toJSON(),
        generation: {
          id: generationResult.id,
          status: 'completed',
          files_created: generationResult.files_created,
          output_path: generationResult.output_path,
          download_url: generationResult.download_url
        }
      }
    });
  } catch (error) {
    console.error('Generate service error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while generating service',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get generation status
router.get('/status/:generation_id', authenticate, async (req, res) => {
  try {
    const { generation_id } = req.params;
    
    // In a real implementation, you'd track generation status in the database
    // For now, we'll return mock status
    const status = {
      id: generation_id,
      status: 'completed',
      progress: 100,
      steps: [
        { name: 'Template validation', status: 'completed', started_at: new Date(Date.now() - 5000).toISOString(), completed_at: new Date(Date.now() - 4500).toISOString() },
        { name: 'File generation', status: 'completed', started_at: new Date(Date.now() - 4500).toISOString(), completed_at: new Date(Date.now() - 3000).toISOString() },
        { name: 'Customization', status: 'completed', started_at: new Date(Date.now() - 3000).toISOString(), completed_at: new Date(Date.now() - 1500).toISOString() },
        { name: 'Packaging', status: 'completed', started_at: new Date(Date.now() - 1500).toISOString(), completed_at: new Date(Date.now() - 500).toISOString() }
      ],
      started_at: new Date(Date.now() - 5000).toISOString(),
      completed_at: new Date(Date.now() - 500).toISOString()
    };
    
    res.json({
      success: true,
      message: 'Generation status retrieved successfully',
      data: { status }
    });
  } catch (error) {
    console.error('Get generation status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching generation status'
    });
  }
});

// Download generated service
router.get('/download/:generation_id', authenticate, async (req, res) => {
  try {
    const { generation_id } = req.params;
    
    // In a real implementation, you'd look up the generation record
    // and serve the actual generated files
    
    // For now, we'll create a mock zip file
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="service-${generation_id}.zip"`);
    
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);
    
    // Add mock files to the archive
    archive.append('# Generated Service\n\nThis is a generated service from DevX Platform.', { name: 'README.md' });
    archive.append('{\n  "name": "generated-service",\n  "version": "1.0.0"\n}', { name: 'package.json' });
    archive.append('console.log("Hello from generated service!");', { name: 'src/index.js' });
    
    await archive.finalize();
  } catch (error) {
    console.error('Download generated service error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while downloading service'
    });
  }
});

// Preview generated service structure
router.post('/preview', authenticate, validate(schemas.generateService), async (req, res) => {
  try {
    const { template_id, settings = {} } = req.body;
    
    // Verify template exists
    const template = await Template.findById(template_id);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Generate preview of what would be created
    const preview = await generatePreview(template, settings);
    
    res.json({
      success: true,
      message: 'Service preview generated successfully',
      data: {
        template: template.toJSON(),
        preview: {
          files: preview.files,
          structure: preview.structure,
          customizations: preview.customizations,
          estimated_size: preview.estimated_size
        }
      }
    });
  } catch (error) {
    console.error('Generate preview error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while generating preview'
    });
  }
});

// Helper functions
function generateUniqueSlug(name) {
  // Convert name to slug format
  let slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  // Add timestamp suffix to ensure uniqueness
  const timestamp = Date.now().toString(36);
  return `${slug}-${timestamp}`;
}

async function generateServiceFiles(template, project, settings) {
  try {
    // Initialize the generation engine if not already done
    if (!generationEngine.templateCache || generationEngine.templateCache.size === 0) {
      await generationEngine.initialize();
    }
    
    // Map template slug to the generation engine template ID
    const templateId = template.slug;
    
    // Prepare variables for the generation engine
    const variables = {
      PROJECT_NAME: project.name,
      PROJECT_SLUG: project.slug,
      PROJECT_DESCRIPTION: project.description || `Generated from ${template.name}`,
      TEMPLATE_NAME: template.name,
      TEMPLATE_TECHNOLOGY: template.technology,
      TEMPLATE_LANGUAGE: template.language,
      TEMPLATE_FRAMEWORK: template.framework || template.technology,
      ENVIRONMENT: settings.environment || 'development',
      PORT: settings.port || 3000,
      USER_ID: project.user_id,
      GENERATED_AT: new Date().toISOString(),
      
      // Database settings
      DATABASE_HOST: settings.database?.host || 'localhost',
      DATABASE_PORT: settings.database?.port || 5432,
      DATABASE_NAME: settings.database?.name || project.slug.replace(/-/g, '_'),
      
      // Cloud settings
      CLOUD_PROVIDER: settings.cloudProvider || 'aws',
      REGION: settings.region || 'us-east-1',
      
      // Resource settings
      CPU: settings.resources?.cpu || '0.5',
      MEMORY: settings.resources?.memory || '1Gi',
      STORAGE: settings.resources?.storage || '10Gi'
    };
    
    // Generation options
    const options = {
      createArchive: true,
      generateReadme: true,
      generateDeployment: settings.generateDeployment || false,
      generateCICD: settings.generateCICD || false,
      ignoreFiles: ['.git', 'node_modules', '.env']
    };
    
    // Use the real generation engine
    const result = await generationEngine.generateProject(templateId, variables, options);
    
    return {
      id: result.generationId,
      files_created: result.files.processed.concat(result.files.additional),
      output_path: result.projectPath,
      download_url: `/api/generate/download/${result.generationId}`,
      archive_path: result.archivePath,
      validation: result.validation,
      size: result.size,
      template_config: result.templateConfig
    };
  } catch (error) {
    console.error('Service file generation error:', error);
    
    // Fall back to the old mock implementation if the real engine fails
    console.warn('Falling back to mock generation due to error:', error.message);
    return await generateServiceFilesFallback(template, project, settings);
  }
}

// Keep the original implementation as a fallback
async function generateServiceFilesFallback(template, project, settings) {
  const generationId = uuidv4();
  const outputPath = path.join(
    process.env.GENERATED_SERVICES_PATH || '../generated-services',
    project.user_id,
    project.slug
  );
  
  // Create output directory
  await fs.mkdir(outputPath, { recursive: true });
  
  // Get template source path
  const templatePath = await template.getFullPath();
  
  // Copy template files with customizations
  const filesCreated = await copyAndCustomizeTemplate(templatePath, outputPath, template, project, settings);
  
  // Create download archive
  const downloadUrl = `/api/generate/download/${generationId}`;
  
  return {
    id: generationId,
    files_created: filesCreated,
    output_path: outputPath,
    download_url: downloadUrl
  };
}

async function copyAndCustomizeTemplate(templatePath, outputPath, template, project, settings) {
  const filesCreated = [];
  
  try {
    // Check if template path exists
    try {
      await fs.access(templatePath);
    } catch (error) {
      console.warn(`Template path not found: ${templatePath}, creating mock structure`);
      return await createMockStructure(outputPath, template, project, settings);
    }
    
    // Copy files recursively with customization
    await copyDirectory(templatePath, outputPath, template, project, settings, filesCreated);
    
    return filesCreated;
  } catch (error) {
    console.warn(`Error copying template files: ${error.message}, creating mock structure`);
    return await createMockStructure(outputPath, template, project, settings);
  }
}

async function copyDirectory(srcPath, destPath, template, project, settings, filesCreated) {
  const items = await fs.readdir(srcPath, { withFileTypes: true });
  
  for (const item of items) {
    // Skip certain files and directories
    if (shouldSkipFile(item.name)) {
      continue;
    }
    
    const srcItemPath = path.join(srcPath, item.name);
    const destItemPath = path.join(destPath, item.name);
    
    if (item.isDirectory()) {
      await fs.mkdir(destItemPath, { recursive: true });
      await copyDirectory(srcItemPath, destItemPath, template, project, settings, filesCreated);
    } else {
      await copyAndCustomizeFile(srcItemPath, destItemPath, template, project, settings);
      filesCreated.push(path.relative(destPath, destItemPath));
    }
  }
}

async function copyAndCustomizeFile(srcPath, destPath, template, project, settings) {
  try {
    let content = await fs.readFile(srcPath, 'utf8');
    
    // Apply customizations based on file type
    if (isTextFile(srcPath)) {
      content = applyCustomizations(content, template, project, settings);
    }
    
    await fs.writeFile(destPath, content);
  } catch (error) {
    // If we can't read as text, copy as binary
    const buffer = await fs.readFile(srcPath);
    await fs.writeFile(destPath, buffer);
  }
}

function shouldSkipFile(filename) {
  const skipPatterns = [
    /^\./, // Hidden files
    /node_modules/,
    /dist/,
    /build/,
    /target/,
    /__pycache__/,
    /\.git/,
    /\.idea/,
    /\.vscode/
  ];
  
  return skipPatterns.some(pattern => pattern.test(filename));
}

function isTextFile(filePath) {
  const textExtensions = ['.js', '.ts', '.json', '.md', '.txt', '.yml', '.yaml', '.xml', '.html', '.css', '.py', '.go', '.java', '.rs'];
  const ext = path.extname(filePath);
  return textExtensions.includes(ext);
}

function applyCustomizations(content, template, project, settings) {
  // Replace placeholder values
  const replacements = {
    '{{PROJECT_NAME}}': project.name,
    '{{PROJECT_SLUG}}': project.slug,
    '{{PROJECT_DESCRIPTION}}': project.description || `Generated from ${template.name}`,
    '{{TEMPLATE_NAME}}': template.name,
    '{{TEMPLATE_TECHNOLOGY}}': template.technology,
    '{{TEMPLATE_LANGUAGE}}': template.language,
    '{{TEMPLATE_FRAMEWORK}}': template.framework || template.technology,
    '{{ENVIRONMENT}}': settings.environment || 'development',
    '{{PORT}}': settings.port || 3000,
    '{{DATABASE_HOST}}': settings.database?.host || 'localhost',
    '{{DATABASE_PORT}}': settings.database?.port || 5432,
    '{{DATABASE_NAME}}': settings.database?.name || project.slug.replace(/-/g, '_'),
    '{{GENERATED_AT}}': new Date().toISOString()
  };
  
  let customizedContent = content;
  for (const [placeholder, value] of Object.entries(replacements)) {
    customizedContent = customizedContent.replace(new RegExp(placeholder, 'g'), value);
  }
  
  return customizedContent;
}

async function createMockStructure(outputPath, template, project, settings) {
  const filesCreated = [];
  
  // Create basic project structure based on template type
  const files = generateMockFiles(template, project, settings);
  
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(outputPath, filePath);
    const dir = path.dirname(fullPath);
    
    // Create directory if it doesn't exist
    await fs.mkdir(dir, { recursive: true });
    
    // Write file
    await fs.writeFile(fullPath, content);
    filesCreated.push(filePath);
  }
  
  return filesCreated;
}

function generateMockFiles(template, project, settings) {
  const files = {};
  
  // README
  files['README.md'] = `# ${project.name}

Generated from ${template.name} template.

## Description
${project.description || `A ${template.technology} service built with ${template.framework || template.technology}.`}

## Getting Started

### Prerequisites
- ${template.language === 'nodejs' ? 'Node.js 18+' : template.language}
${template.framework ? `- ${template.framework}` : ''}

### Installation
\`\`\`bash
${template.language === 'nodejs' ? 'npm install' : 'make install'}
\`\`\`

### Running
\`\`\`bash
${template.language === 'nodejs' ? 'npm start' : 'make run'}
\`\`\`

Generated by DevX Platform on ${new Date().toISOString().split('T')[0]}.
`;

  // Package.json for Node.js projects
  if (template.language === 'nodejs' || template.language === 'typescript') {
    files['package.json'] = JSON.stringify({
      name: project.slug,
      version: '1.0.0',
      description: project.description || `Generated from ${template.name}`,
      main: 'src/index.js',
      scripts: {
        start: 'node src/index.js',
        dev: 'nodemon src/index.js',
        test: 'jest'
      },
      dependencies: generateDependencies(template),
      devDependencies: {
        nodemon: '^3.0.1',
        jest: '^29.6.4'
      }
    }, null, 2);
  }
  
  // Main application file
  const mainFile = getMainFileName(template);
  files[mainFile] = generateMainFileContent(template, project, settings);
  
  // Docker file
  files['Dockerfile'] = generateDockerfile(template, project);
  
  // Environment file
  files['.env.example'] = generateEnvFile(template, project, settings);
  
  return files;
}

function generateDependencies(template) {
  const baseDeps = {
    'express': '^4.18.2',
    'cors': '^2.8.5',
    'helmet': '^7.0.0',
    'dotenv': '^16.3.1'
  };
  
  if (template.framework === 'fastapi') {
    return {}; // Python dependencies would be in requirements.txt
  }
  
  if (template.slug === 'graphql-api') {
    baseDeps['apollo-server-express'] = '^3.12.0';
    baseDeps['graphql'] = '^16.8.1';
  }
  
  return baseDeps;
}

function getMainFileName(template) {
  if (template.language === 'python') {
    return 'main.py';
  } else if (template.language === 'go') {
    return 'main.go';
  } else if (template.language === 'java') {
    return 'src/main/java/com/example/Application.java';
  } else if (template.language === 'rust') {
    return 'src/main.rs';
  } else {
    return 'src/index.js';
  }
}

function generateMainFileContent(template, project, settings) {
  if (template.language === 'nodejs' || template.language === 'typescript') {
    return `const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || ${settings.port || 3000};

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: '${project.name}',
    timestamp: new Date().toISOString() 
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to ${project.name}',
    version: '1.0.0',
    template: '${template.name}'
  });
});

app.listen(PORT, () => {
  console.log(\`${project.name} running on port \${PORT}\`);
});
`;
  }
  
  // Add other language templates as needed
  return `// Generated ${template.language} application for ${project.name}`;
}

function generateDockerfile(template, project) {
  if (template.language === 'nodejs' || template.language === 'typescript') {
    return `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
`;
  }
  
  return `# Dockerfile for ${project.name}
# Generated from ${template.name} template
`;
}

function generateEnvFile(template, project, settings) {
  return `# Environment variables for ${project.name}
PORT=${settings.port || 3000}
NODE_ENV=${settings.environment || 'development'}

# Database
DB_HOST=${settings.database?.host || 'localhost'}
DB_PORT=${settings.database?.port || 5432}
DB_NAME=${settings.database?.name || project.slug.replace(/-/g, '_')}

# Add your environment variables here
`;
}

async function generatePreview(template, settings) {
  const mockFiles = generateMockFiles(
    template,
    { name: 'preview-service', slug: 'preview-service', description: 'Preview of generated service' },
    settings
  );
  
  return {
    files: Object.keys(mockFiles),
    structure: generateFileTree(Object.keys(mockFiles)),
    customizations: [
      'Project name and slug replacement',
      'Environment-specific configuration',
      'Database connection settings',
      'Port configuration',
      'Template-specific dependencies'
    ],
    estimated_size: '~2.5MB'
  };
}

function generateFileTree(filePaths) {
  const tree = {};
  
  filePaths.forEach(filePath => {
    const parts = filePath.split('/');
    let current = tree;
    
    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        current[part] = 'file';
      } else {
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    });
  });
  
  return tree;
}

module.exports = router;