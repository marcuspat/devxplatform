const express = require('express');
const Template = require('../models/Template');
const { optionalAuth } = require('../middleware/auth-simple');
const { validateQuery, schemas } = require('../middleware/validation');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

// Get all templates with filtering
router.get('/', validateQuery(schemas.templateFilters), optionalAuth, async (req, res) => {
  try {
    const filters = {
      category: req.query.category,
      technology: req.query.technology,
      language: req.query.language,
      featured: req.query.featured === 'true',
      search: req.query.search,
      limit: parseInt(req.query.limit) || 20,
      offset: parseInt(req.query.offset) || 0
    };

    // Remove undefined filters
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined || filters[key] === '') {
        delete filters[key];
      }
    });

    const templates = await Template.findAll(filters);
    
    res.json({
      success: true,
      message: 'Templates retrieved successfully',
      data: {
        templates: templates.map(template => template.toJSON()),
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          total: templates.length
        },
        filters: req.query
      }
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching templates'
    });
  }
});

// Get featured templates
router.get('/featured', optionalAuth, async (req, res) => {
  try {
    const templates = await Template.getFeatured();
    
    res.json({
      success: true,
      message: 'Featured templates retrieved successfully',
      data: {
        templates: templates.map(template => template.toJSON())
      }
    });
  } catch (error) {
    console.error('Get featured templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching featured templates'
    });
  }
});

// Get popular templates
router.get('/popular', optionalAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const templates = await Template.getPopular(limit);
    
    res.json({
      success: true,
      message: 'Popular templates retrieved successfully',
      data: {
        templates: templates.map(template => template.toJSON())
      }
    });
  } catch (error) {
    console.error('Get popular templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching popular templates'
    });
  }
});

// Get template categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Template.getCategories();
    
    res.json({
      success: true,
      message: 'Template categories retrieved successfully',
      data: {
        categories
      }
    });
  } catch (error) {
    console.error('Get template categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching categories'
    });
  }
});

// Get template technologies
router.get('/technologies', async (req, res) => {
  try {
    const technologies = await Template.getTechnologies();
    
    res.json({
      success: true,
      message: 'Template technologies retrieved successfully',
      data: {
        technologies
      }
    });
  } catch (error) {
    console.error('Get template technologies error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching technologies'
    });
  }
});

// Get template by slug
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    const template = await Template.findBySlug(slug);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Try to get template file structure and README
    let fileStructure = null;
    let readme = null;
    
    try {
      const templatePath = await template.getFullPath();
      
      // Get file structure
      fileStructure = await getDirectoryStructure(templatePath);
      
      // Try to read README
      const readmePath = path.join(templatePath, 'README.md');
      try {
        readme = await fs.readFile(readmePath, 'utf8');
      } catch (readmeError) {
        // README not found, which is fine
      }
    } catch (fsError) {
      console.warn(`Could not read template files for ${slug}:`, fsError.message);
    }

    res.json({
      success: true,
      message: 'Template retrieved successfully',
      data: {
        template: {
          ...template.toJSON(),
          file_structure: fileStructure,
          readme
        }
      }
    });
  } catch (error) {
    console.error('Get template by slug error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching template'
    });
  }
});

// Download template (increment download count)
router.post('/:slug/download', optionalAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    const template = await Template.findBySlug(slug);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Increment download count
    const newDownloadCount = await Template.incrementDownloadCount(template.id);
    
    res.json({
      success: true,
      message: 'Template download recorded',
      data: {
        template_id: template.id,
        slug: template.slug,
        download_count: newDownloadCount
      }
    });
  } catch (error) {
    console.error('Template download error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while recording download'
    });
  }
});

// Star template
router.post('/:slug/star', optionalAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    const template = await Template.findBySlug(slug);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Increment star count
    const newStarCount = await Template.incrementStarCount(template.id);
    
    res.json({
      success: true,
      message: 'Template starred successfully',
      data: {
        template_id: template.id,
        slug: template.slug,
        star_count: newStarCount
      }
    });
  } catch (error) {
    console.error('Template star error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while starring template'
    });
  }
});

// Helper function to get directory structure
async function getDirectoryStructure(dirPath, maxDepth = 3, currentDepth = 0) {
  if (currentDepth >= maxDepth) {
    return null;
  }

  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    const structure = {};

    for (const item of items) {
      // Skip hidden files and common ignored directories
      if (item.name.startsWith('.') || 
          ['node_modules', 'dist', 'build', 'target', '__pycache__'].includes(item.name)) {
        continue;
      }

      const itemPath = path.join(dirPath, item.name);
      
      if (item.isDirectory()) {
        structure[item.name] = await getDirectoryStructure(itemPath, maxDepth, currentDepth + 1);
      } else {
        structure[item.name] = 'file';
      }
    }

    return structure;
  } catch (error) {
    return null;
  }
}

module.exports = router;