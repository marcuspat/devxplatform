const express = require('express');
const multer = require('multer');
const Joi = require('joi');
const path = require('path');
const fs = require('fs-extra');
const GenerationEngine = require('../services/generation-engine');

const router = express.Router();

// Initialize generation engine
const generationEngine = new GenerationEngine({
  templatesPath: path.join(__dirname, '../../../templates'),
  outputPath: path.join(__dirname, '../../../generated')
});

// Initialize on startup
generationEngine.initialize().catch(error => {
  console.error('Failed to initialize generation engine:', error);
});

// Configure multer for file uploads
const upload = multer({
  dest: 'temp/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Validation schemas
const generateProjectSchema = Joi.object({
  templateId: Joi.string().required(),
  variables: Joi.object().default({}),
  options: Joi.object({
    createArchive: Joi.boolean().default(true),
    generateReadme: Joi.boolean().default(true),
    generateDeployment: Joi.boolean().default(false),
    generateCICD: Joi.boolean().default(false),
    ignoreFiles: Joi.array().items(Joi.string()).default([])
  }).default({})
});

const batchGenerateSchema = Joi.object({
  requests: Joi.array().items(
    Joi.object({
      templateId: Joi.string().required(),
      variables: Joi.object().default({}),
      options: Joi.object().default({})
    })
  ).min(1).max(10).required() // Limit batch size
});

const validateVariablesSchema = Joi.object({
  templateId: Joi.string().required(),
  variables: Joi.object().required()
});

/**
 * GET /api/generation/templates
 * Get all available templates
 */
router.get('/templates', async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const templates = await generationEngine.getTemplates(forceRefresh);
    
    res.json({
      success: true,
      data: {
        templates,
        total: templates.length,
        lastScan: generationEngine.lastScanTime
      }
    });
  } catch (error) {
    console.error('Error getting templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get templates',
      message: error.message
    });
  }
});

/**
 * GET /api/generation/templates/:templateId
 * Get specific template details
 */
router.get('/templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const template = await generationEngine.getTemplate(templateId);
    
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error getting template:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: 'Failed to get template',
      message: error.message
    });
  }
});

/**
 * POST /api/generation/generate
 * Generate a single project from template
 */
router.post('/generate', async (req, res) => {
  try {
    // Validate request
    const { error, value } = generateProjectSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: error.details[0].message
      });
    }

    const { templateId, variables, options } = value;
    
    // Generate project
    const result = await generationEngine.generateProject(templateId, variables, options);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error generating project:', error);
    res.status(500).json({
      success: false,
      error: 'Project generation failed',
      message: error.message
    });
  }
});

/**
 * POST /api/generation/batch
 * Generate multiple projects in batch
 */
router.post('/batch', async (req, res) => {
  try {
    // Validate request
    const { error, value } = batchGenerateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: error.details[0].message
      });
    }

    const { requests } = value;
    
    // Generate projects in batch
    const result = await generationEngine.generateProjects(requests);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in batch generation:', error);
    res.status(500).json({
      success: false,
      error: 'Batch generation failed',
      message: error.message
    });
  }
});

/**
 * POST /api/generation/validate
 * Validate template variables
 */
router.post('/validate', async (req, res) => {
  try {
    // Validate request
    const { error, value } = validateVariablesSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: error.details[0].message
      });
    }

    const { templateId, variables } = value;
    
    // Validate variables
    const validation = await generationEngine.validateTemplateVariables(templateId, variables);
    
    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Error validating variables:', error);
    res.status(500).json({
      success: false,
      error: 'Variable validation failed',
      message: error.message
    });
  }
});

/**
 * GET /api/generation/templates/:templateId/defaults
 * Get default variables for a template
 */
router.get('/templates/:templateId/defaults', async (req, res) => {
  try {
    const { templateId } = req.params;
    const customVariables = req.query.variables ? JSON.parse(req.query.variables) : {};
    
    const defaults = await generationEngine.getTemplateDefaults(templateId, customVariables);
    
    res.json({
      success: true,
      data: defaults
    });
  } catch (error) {
    console.error('Error getting template defaults:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: 'Failed to get template defaults',
      message: error.message
    });
  }
});

/**
 * GET /api/generation/stats
 * Get generation statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await generationEngine.getGenerationStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting generation stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get generation statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/generation/projects
 * Get list of generated projects
 */
router.get('/projects', async (req, res) => {
  try {
    const projects = await generationEngine.getGeneratedProjects();
    
    // Apply filters
    let filteredProjects = projects;
    
    if (req.query.templateId) {
      filteredProjects = filteredProjects.filter(p => 
        p.templateConfig.id === req.query.templateId
      );
    }
    
    if (req.query.limit) {
      const limit = parseInt(req.query.limit);
      filteredProjects = filteredProjects.slice(0, limit);
    }
    
    res.json({
      success: true,
      data: {
        projects: filteredProjects,
        total: projects.length,
        filtered: filteredProjects.length
      }
    });
  } catch (error) {
    console.error('Error getting generated projects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get generated projects',
      message: error.message
    });
  }
});

/**
 * GET /api/generation/projects/:generationId/download
 * Download generated project archive
 */
router.get('/projects/:generationId/download', async (req, res) => {
  try {
    const { generationId } = req.params;
    const projects = await generationEngine.getGeneratedProjects();
    const project = projects.find(p => p.generationId === generationId);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    if (!project.archivePath || !await fs.pathExists(project.archivePath)) {
      return res.status(404).json({
        success: false,
        error: 'Project archive not found'
      });
    }
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${project.templateConfig.name}-${generationId}.zip"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(project.archivePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Error downloading project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download project',
      message: error.message
    });
  }
});

/**
 * DELETE /api/generation/projects/:generationId
 * Delete a generated project
 */
router.delete('/projects/:generationId', async (req, res) => {
  try {
    const { generationId } = req.params;
    const projects = await generationEngine.getGeneratedProjects();
    const project = projects.find(p => p.generationId === generationId);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    // Remove project files
    if (await fs.pathExists(project.projectPath)) {
      await fs.remove(project.projectPath);
    }
    
    // Remove archive
    if (project.archivePath && await fs.pathExists(project.archivePath)) {
      await fs.remove(project.archivePath);
    }
    
    // Remove from results
    await generationEngine.removeGenerationResult(generationId);
    
    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete project',
      message: error.message
    });
  }
});

/**
 * POST /api/generation/cleanup
 * Clean up old generated projects
 */
router.post('/cleanup', async (req, res) => {
  try {
    const maxAge = req.body.maxAge || (24 * 60 * 60 * 1000); // Default: 24 hours
    const result = await generationEngine.cleanup(maxAge);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({
      success: false,
      error: 'Cleanup failed',
      message: error.message
    });
  }
});

/**
 * POST /api/generation/upload-template
 * Upload a custom template
 */
router.post('/upload-template', upload.single('template'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No template file uploaded'
      });
    }
    
    // TODO: Implement custom template upload and extraction
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Template upload functionality coming soon',
      data: {
        filename: req.file.originalname,
        size: req.file.size
      }
    });
    
    // Clean up uploaded file
    await fs.remove(req.file.path);
    
  } catch (error) {
    console.error('Error uploading template:', error);
    res.status(500).json({
      success: false,
      error: 'Template upload failed',
      message: error.message
    });
  }
});

/**
 * GET /api/generation/health
 * Health check for generation service
 */
router.get('/health', async (req, res) => {
  try {
    const templates = await generationEngine.getTemplates();
    const stats = await generationEngine.getGenerationStats();
    
    res.json({
      success: true,
      data: {
        status: 'healthy',
        templates: templates.length,
        totalGenerated: stats.totalGenerated,
        lastScan: generationEngine.lastScanTime,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Generation service health check failed:', error);
    res.status(503).json({
      success: false,
      error: 'Service unhealthy',
      message: error.message
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Generation API error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

module.exports = router;