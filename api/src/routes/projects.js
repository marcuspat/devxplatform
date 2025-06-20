const express = require('express');
const Project = require('../models/Project');
const Template = require('../models/Template');
const { authenticate } = require('../middleware/auth-simple');
const { validate, validateQuery, schemas } = require('../middleware/validation');

const router = express.Router();

// Get user's projects
router.get('/', authenticate, validateQuery(schemas.projectFilters), async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
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

    const projects = await Project.findByUserId(req.user.id, filters);
    
    res.json({
      success: true,
      message: 'Projects retrieved successfully',
      data: {
        projects: projects.map(project => project.toJSON()),
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          total: projects.length
        }
      }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching projects'
    });
  }
});

// Create new project
router.post('/', authenticate, validate(schemas.createProject), async (req, res) => {
  try {
    const { name, slug, description, template_id, settings } = req.body;
    
    // Verify template exists
    const template = await Template.findById(template_id);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Check if project slug already exists for this user
    const existingProject = await Project.findBySlug(req.user.id, slug);
    if (existingProject) {
      return res.status(409).json({
        success: false,
        message: 'A project with this slug already exists'
      });
    }

    const project = await Project.create({
      name,
      slug,
      description,
      template_id,
      user_id: req.user.id,
      settings: settings || {}
    });

    // Get the created project with all joined data
    const createdProject = await Project.findById(project.id);
    
    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: {
        project: createdProject.toJSON()
      }
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while creating project'
    });
  }
});

// Get project by slug
router.get('/:slug', authenticate, async (req, res) => {
  try {
    const { slug } = req.params;
    const project = await Project.findBySlug(req.user.id, slug);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    res.json({
      success: true,
      message: 'Project retrieved successfully',
      data: {
        project: project.toJSON()
      }
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching project'
    });
  }
});

// Update project
router.put('/:slug', authenticate, validate(schemas.updateProject), async (req, res) => {
  try {
    const { slug } = req.params;
    const project = await Project.findBySlug(req.user.id, slug);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    const updates = req.body;
    await project.update(updates);
    
    res.json({
      success: true,
      message: 'Project updated successfully',
      data: {
        project: project.toJSON()
      }
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while updating project'
    });
  }
});

// Delete project
router.delete('/:slug', authenticate, async (req, res) => {
  try {
    const { slug } = req.params;
    const project = await Project.findBySlug(req.user.id, slug);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    await project.delete();
    
    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while deleting project'
    });
  }
});

// Get project statistics
router.get('/stats/overview', authenticate, async (req, res) => {
  try {
    const stats = await Project.getStatsByUserId(req.user.id);
    
    res.json({
      success: true,
      message: 'Project statistics retrieved successfully',
      data: {
        stats: {
          total_projects: parseInt(stats.total_projects),
          active_projects: parseInt(stats.active_projects),
          archived_projects: parseInt(stats.archived_projects),
          deploying_projects: parseInt(stats.deploying_projects),
          deployed_projects: parseInt(stats.deployed_projects)
        }
      }
    });
  } catch (error) {
    console.error('Get project stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching project statistics'
    });
  }
});

// Get recent project activity
router.get('/activity/recent', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const activity = await Project.getRecentActivity(req.user.id, limit);
    
    res.json({
      success: true,
      message: 'Recent project activity retrieved successfully',
      data: {
        activity
      }
    });
  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching recent activity'
    });
  }
});

// Deploy project (placeholder for actual deployment logic)
router.post('/:slug/deploy', authenticate, async (req, res) => {
  try {
    const { slug } = req.params;
    const project = await Project.findBySlug(req.user.id, slug);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Update project status to deploying
    await project.update({ status: 'deploying' });
    
    // In a real implementation, this would trigger actual deployment
    // For now, we'll simulate it
    const deploymentUrl = `https://${slug}.${req.user.username}.devxplatform.com`;
    
    // Simulate deployment completion after a delay
    setTimeout(async () => {
      try {
        await project.update({ 
          status: 'active',
          deployment_url: deploymentUrl
        });
      } catch (error) {
        console.error('Deployment update error:', error);
      }
    }, 5000);
    
    res.json({
      success: true,
      message: 'Project deployment initiated',
      data: {
        project: project.toJSON(),
        deployment: {
          id: `dep_${Date.now()}`,
          status: 'in_progress',
          url: deploymentUrl,
          started_at: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Deploy project error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while deploying project'
    });
  }
});

// Get project logs (mock implementation)
router.get('/:slug/logs', authenticate, async (req, res) => {
  try {
    const { slug } = req.params;
    const project = await Project.findBySlug(req.user.id, slug);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Mock log data
    const logs = [];
    const levels = ['info', 'debug', 'warn', 'error'];
    const messages = [
      'Application started successfully',
      'Database connection established',
      'Handling incoming request',
      'Response sent to client',
      'Health check completed'
    ];

    for (let i = 0; i < 50; i++) {
      logs.push({
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        level: levels[Math.floor(Math.random() * levels.length)],
        message: messages[Math.floor(Math.random() * messages.length)],
        source: 'application'
      });
    }
    
    res.json({
      success: true,
      message: 'Project logs retrieved successfully',
      data: {
        project_slug: slug,
        logs
      }
    });
  } catch (error) {
    console.error('Get project logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching project logs'
    });
  }
});

// Import project from repository
router.post('/import', authenticate, async (req, res) => {
  try {
    const { name, repository_url, technology, framework } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Project name is required'
      });
    }

    // Generate unique slug
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const uniqueSlug = `${slug}-${Date.now()}`;

    // Detect technology and framework from repository if not provided
    let detectedTech = technology;
    let detectedFramework = framework;

    if (repository_url && !technology) {
      // Mock repository analysis
      if (repository_url.includes('node') || repository_url.includes('javascript')) {
        detectedTech = 'Node.js';
        detectedFramework = 'Express';
      } else if (repository_url.includes('python')) {
        detectedTech = 'Python';
        detectedFramework = 'FastAPI';
      } else if (repository_url.includes('go')) {
        detectedTech = 'Go';
        detectedFramework = 'Gin';
      }
    }

    // Create imported project
    const projectData = {
      name,
      slug: uniqueSlug,
      description: `Imported project: ${name}`,
      user_id: req.user.id,
      repository_url,
      status: 'importing',
      template: {
        name: `${detectedTech || 'Custom'} Import`,
        technology: detectedTech || 'Custom',
        framework: detectedFramework || 'Custom',
        category: 'imported'
      },
      settings: {
        environment: 'development',
        auto_deploy: false,
        notifications: true
      },
      metadata: {
        import_source: 'repository',
        import_date: new Date().toISOString(),
        original_url: repository_url
      }
    };

    const project = await Project.create(projectData);

    // Mock import process steps
    const importProcess = {
      id: `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      project_id: project.id,
      status: 'in_progress',
      steps: [
        { name: 'Cloning repository', status: 'in_progress', started_at: new Date().toISOString() },
        { name: 'Analyzing project structure', status: 'pending' },
        { name: 'Detecting dependencies', status: 'pending' },
        { name: 'Generating configuration', status: 'pending' },
        { name: 'Setting up deployment pipeline', status: 'pending' }
      ],
      estimated_duration: '2-4 minutes',
      started_at: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Project import initiated successfully',
      data: {
        project: project.toJSON(),
        import_process: importProcess
      }
    });
  } catch (error) {
    console.error('Import project error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while importing project'
    });
  }
});

module.exports = router;