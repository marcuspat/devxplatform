const express = require('express');
const Project = require('../models/Project');
const { authenticate } = require('../middleware/auth-simple');

const router = express.Router();

// List services (essentially projects that are deployed)
router.get('/', authenticate, async (req, res) => {
  try {
    const filters = { status: 'active' };
    const projects = await Project.findByUserId(req.user.id, filters);
    
    // Transform projects to service format
    let services = projects.map(project => ({
      id: project.id,
      name: project.name,
      slug: project.slug,
      status: getServiceStatus(project),
      type: getServiceType(project.template?.technology, project.template?.framework),
      environment: project.settings?.environment || 'development',
      url: project.deployment_url,
      repository_url: project.repository_url,
      template: project.template,
      instances: generateInstanceData(),
      resources: generateResourceData(),
      uptime: calculateUptime(project.created_at),
      metrics: generateMetrics(),
      version: project.settings?.version || 'v1.0.0',
      cpu: generateResourceData().cpu,
      memory: generateResourceData().memory,
      requests: `${generateMetrics().requests_per_minute}/min`,
      created_at: project.created_at,
      updated_at: project.updated_at
    }));

    // If no services exist, return sample data for demo
    if (services.length === 0) {
      services = generateSampleServices();
    }
    
    res.json({
      success: true,
      message: 'Services retrieved successfully',
      data: {
        services
      }
    });
  } catch (error) {
    console.error('List services error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching services'
    });
  }
});

// Get service by name/slug
router.get('/:slug', authenticate, async (req, res) => {
  try {
    const { slug } = req.params;
    const project = await Project.findBySlug(req.user.id, slug);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    const service = {
      id: project.id,
      name: project.name,
      slug: project.slug,
      description: project.description,
      status: getServiceStatus(project),
      type: getServiceType(project.template?.technology, project.template?.framework),
      environment: project.settings?.environment || 'development',
      url: project.deployment_url,
      repository_url: project.repository_url,
      template: project.template,
      instances: generateInstanceData(),
      resources: generateResourceData(),
      uptime: calculateUptime(project.created_at),
      metrics: generateMetrics(),
      health_checks: generateHealthChecks(),
      settings: project.settings,
      created_at: project.created_at,
      updated_at: project.updated_at
    };
    
    res.json({
      success: true,
      message: 'Service retrieved successfully',
      data: {
        service
      }
    });
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching service'
    });
  }
});

// Get service status
router.get('/:slug/status', authenticate, async (req, res) => {
  try {
    const { slug } = req.params;
    const project = await Project.findBySlug(req.user.id, slug);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    const status = {
      service_name: project.name,
      slug: project.slug,
      health: getServiceHealth(project),
      version: 'v1.0.0', // Would come from deployment metadata
      environment: project.settings?.environment || 'development',
      uptime: calculateUptime(project.created_at),
      last_deploy: project.updated_at,
      instances: generateInstanceData(),
      resources: generateResourceData(),
      metrics: generateMetrics(),
      events: generateRecentEvents(project)
    };
    
    res.json({
      success: true,
      message: 'Service status retrieved successfully',
      data: {
        status
      }
    });
  } catch (error) {
    console.error('Get service status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching service status'
    });
  }
});

// Build service
router.post('/:slug/build', authenticate, async (req, res) => {
  try {
    const { slug } = req.params;
    const project = await Project.findBySlug(req.user.id, slug);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Mock build process
    const buildId = `build_${Date.now()}`;
    
    res.json({
      success: true,
      message: 'Service build initiated',
      data: {
        build: {
          id: buildId,
          service_name: project.name,
          status: 'in_progress',
          started_at: new Date().toISOString(),
          logs_url: `/api/services/${slug}/builds/${buildId}/logs`
        }
      }
    });
  } catch (error) {
    console.error('Build service error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while building service'
    });
  }
});

// Run tests for service
router.post('/:slug/test', authenticate, async (req, res) => {
  try {
    const { slug } = req.params;
    const project = await Project.findBySlug(req.user.id, slug);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Mock test results
    const testResults = {
      id: `test_${Date.now()}`,
      service_name: project.name,
      status: 'completed',
      results: {
        passed: 42,
        failed: 0,
        total: 42,
        coverage: 85.5
      },
      duration: 12.5,
      started_at: new Date(Date.now() - 12500).toISOString(),
      completed_at: new Date().toISOString()
    };
    
    res.json({
      success: true,
      message: 'Service tests completed',
      data: {
        test_results: testResults
      }
    });
  } catch (error) {
    console.error('Test service error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while testing service'
    });
  }
});

// Scale service
router.post('/:slug/scale', authenticate, async (req, res) => {
  try {
    const { slug } = req.params;
    const { instances } = req.body;
    
    if (!instances || instances < 1 || instances > 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid instance count. Must be between 1 and 10.'
      });
    }

    const project = await Project.findBySlug(req.user.id, slug);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Update project settings with new instance count
    const settings = { ...project.settings, instances };
    await project.update({ settings });
    
    res.json({
      success: true,
      message: 'Service scaling initiated',
      data: {
        service_name: project.name,
        previous_instances: project.settings?.instances || 1,
        target_instances: instances,
        status: 'scaling'
      }
    });
  } catch (error) {
    console.error('Scale service error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while scaling service'
    });
  }
});

// Stop service
router.post('/:slug/stop', authenticate, async (req, res) => {
  try {
    const { slug } = req.params;
    const project = await Project.findBySlug(req.user.id, slug);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    await project.update({ status: 'stopped' });
    
    res.json({
      success: true,
      message: 'Service stopped successfully',
      data: {
        service_name: project.name,
        status: 'stopped'
      }
    });
  } catch (error) {
    console.error('Stop service error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while stopping service'
    });
  }
});

// Start service
router.post('/:slug/start', authenticate, async (req, res) => {
  try {
    const { slug } = req.params;
    const project = await Project.findBySlug(req.user.id, slug);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    await project.update({ status: 'active' });
    
    res.json({
      success: true,
      message: 'Service started successfully',
      data: {
        service_name: project.name,
        status: 'active'
      }
    });
  } catch (error) {
    console.error('Start service error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while starting service'
    });
  }
});

// Deploy service
router.post('/:slug/deploy', authenticate, async (req, res) => {
  try {
    const { slug } = req.params;
    const project = await Project.findBySlug(req.user.id, slug);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Generate deployment ID
    const deploymentId = `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Mock deployment process
    const deployment = {
      id: deploymentId,
      service_name: project.name,
      service_slug: project.slug,
      status: 'in_progress',
      environment: project.settings?.environment || 'production',
      version: `v${Math.floor(Math.random() * 10) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
      started_at: new Date().toISOString(),
      estimated_duration: '3-5 minutes',
      steps: [
        { name: 'Building container image', status: 'in_progress', started_at: new Date().toISOString() },
        { name: 'Running tests', status: 'pending' },
        { name: 'Deploying to cluster', status: 'pending' },
        { name: 'Health checks', status: 'pending' },
        { name: 'Traffic switching', status: 'pending' }
      ],
      logs_url: `/api/services/${slug}/deployments/${deploymentId}/logs`
    };

    // Update project status to deploying
    await project.update({ status: 'deploying' });
    
    res.json({
      success: true,
      message: 'Deployment initiated successfully',
      data: {
        deployment
      }
    });
  } catch (error) {
    console.error('Deploy service error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while deploying service'
    });
  }
});

// Helper functions
function getServiceStatus(project) {
  switch (project.status) {
    case 'active':
      return project.deployment_url ? 'healthy' : 'running';
    case 'deploying':
      return 'deploying';
    case 'stopped':
      return 'stopped';
    case 'failed':
      return 'error';
    default:
      return 'unknown';
  }
}

function getServiceHealth(project) {
  if (project.status === 'active' && project.deployment_url) {
    return 'healthy';
  } else if (project.status === 'active') {
    return 'warning';
  } else {
    return 'unhealthy';
  }
}

function getServiceType(technology, framework) {
  if (framework) {
    return `${framework} (${technology})`;
  }
  return technology || 'Unknown';
}

function generateInstanceData() {
  const desired = Math.floor(Math.random() * 3) + 1;
  const running = Math.floor(Math.random() * desired) + 1;
  return {
    running,
    desired,
    pending: Math.max(0, desired - running),
    failed: 0
  };
}

function generateResourceData() {
  return {
    cpu: Math.floor(Math.random() * 80) + 10,
    memory: Math.floor(Math.random() * 70) + 20,
    disk: Math.floor(Math.random() * 40) + 10,
    network_in: Math.floor(Math.random() * 100) + 10,
    network_out: Math.floor(Math.random() * 80) + 5
  };
}

function generateMetrics() {
  return {
    requests_per_minute: Math.floor(Math.random() * 500) + 50,
    errors_per_minute: Math.floor(Math.random() * 5),
    avg_response_time: Math.floor(Math.random() * 200) + 50,
    p99_response_time: Math.floor(Math.random() * 500) + 100
  };
}

function generateHealthChecks() {
  return [
    {
      name: 'HTTP Health Check',
      status: 'passing',
      last_check: new Date().toISOString(),
      response_time: Math.floor(Math.random() * 50) + 10
    },
    {
      name: 'Database Connection',
      status: 'passing',
      last_check: new Date().toISOString(),
      response_time: Math.floor(Math.random() * 20) + 5
    }
  ];
}

function calculateUptime(createdAt) {
  const now = new Date();
  const created = new Date(createdAt);
  const uptimeMs = now - created;
  return Math.floor(uptimeMs / 1000); // Return uptime in seconds
}

function generateRecentEvents(project) {
  return [
    {
      type: 'info',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      message: 'Service health check passed'
    },
    {
      type: 'info',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      message: `Service ${project.name} started successfully`
    }
  ];
}

function generateSampleServices() {
  const baseDate = new Date(Date.now() - 86400000 * 7); // 7 days ago
  
  return [
    {
      id: 'service-1',
      name: 'User Authentication API',
      slug: 'user-auth-api',
      status: 'healthy',
      type: 'REST API (Node.js)',
      environment: 'production',
      url: 'https://auth-api.example.com',
      template: { technology: 'Node.js', framework: 'Express' },
      instances: generateInstanceData(),
      resources: generateResourceData(),
      uptime: calculateUptime(baseDate),
      metrics: generateMetrics(),
      version: 'v2.1.0',
      cpu: Math.floor(Math.random() * 40) + 20,
      memory: Math.floor(Math.random() * 50) + 30,
      requests: `${Math.floor(Math.random() * 200) + 100}/min`,
      created_at: baseDate.toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'service-2',
      name: 'Product Catalog Service',
      slug: 'product-catalog',
      status: 'healthy',
      type: 'gRPC Service (Go)',
      environment: 'production',
      url: 'grpc://catalog.example.com:443',
      template: { technology: 'Go', framework: 'gRPC' },
      instances: generateInstanceData(),
      resources: generateResourceData(),
      uptime: calculateUptime(new Date(Date.now() - 86400000 * 14)),
      metrics: generateMetrics(),
      version: 'v1.5.2',
      cpu: Math.floor(Math.random() * 30) + 15,
      memory: Math.floor(Math.random() * 40) + 25,
      requests: `${Math.floor(Math.random() * 150) + 80}/min`,
      created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
      updated_at: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: 'service-3',
      name: 'Dashboard Frontend',
      slug: 'dashboard-frontend',
      status: 'warning',
      type: 'Next.js App',
      environment: 'production',
      url: 'https://dashboard.example.com',
      template: { technology: 'Next.js', framework: 'React' },
      instances: generateInstanceData(),
      resources: generateResourceData(),
      uptime: calculateUptime(new Date(Date.now() - 86400000 * 30)),
      metrics: generateMetrics(),
      version: 'v3.0.1',
      cpu: Math.floor(Math.random() * 60) + 40,
      memory: Math.floor(Math.random() * 70) + 50,
      requests: `${Math.floor(Math.random() * 500) + 300}/min`,
      created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
      updated_at: new Date(Date.now() - 1800000).toISOString()
    },
    {
      id: 'service-4',
      name: 'Payment Processing',
      slug: 'payment-service',
      status: 'healthy',
      type: 'REST API (Python)',
      environment: 'production',
      url: 'https://payments.example.com',
      template: { technology: 'Python', framework: 'FastAPI' },
      instances: generateInstanceData(),
      resources: generateResourceData(),
      uptime: calculateUptime(new Date(Date.now() - 86400000 * 60)),
      metrics: generateMetrics(),
      version: 'v1.8.3',
      cpu: Math.floor(Math.random() * 35) + 10,
      memory: Math.floor(Math.random() * 45) + 20,
      requests: `${Math.floor(Math.random() * 100) + 50}/min`,
      created_at: new Date(Date.now() - 86400000 * 60).toISOString(),
      updated_at: new Date(Date.now() - 900000).toISOString()
    }
  ];
}

module.exports = router;