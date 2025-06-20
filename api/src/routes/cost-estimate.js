const express = require('express');
const Template = require('../models/Template');
const { optionalAuth } = require('../middleware/auth-simple');

const router = express.Router();

// Base pricing tiers (monthly USD)
const PRICING_TIERS = {
  hobby: {
    name: 'Hobby',
    base_cost: 0,
    compute_per_gb_hour: 0.05,
    storage_per_gb_month: 0.10,
    bandwidth_per_gb: 0.12,
    database_per_gb_month: 0.20,
    included_compute_hours: 100,
    included_storage_gb: 1,
    included_bandwidth_gb: 10
  },
  starter: {
    name: 'Starter',
    base_cost: 7,
    compute_per_gb_hour: 0.04,
    storage_per_gb_month: 0.08,
    bandwidth_per_gb: 0.10,
    database_per_gb_month: 0.18,
    included_compute_hours: 500,
    included_storage_gb: 10,
    included_bandwidth_gb: 100
  },
  professional: {
    name: 'Professional',
    base_cost: 25,
    compute_per_gb_hour: 0.03,
    storage_per_gb_month: 0.06,
    bandwidth_per_gb: 0.08,
    database_per_gb_month: 0.15,
    included_compute_hours: 2000,
    included_storage_gb: 50,
    included_bandwidth_gb: 500
  },
  enterprise: {
    name: 'Enterprise',
    base_cost: 100,
    compute_per_gb_hour: 0.025,
    storage_per_gb_month: 0.05,
    bandwidth_per_gb: 0.06,
    database_per_gb_month: 0.12,
    included_compute_hours: 10000,
    included_storage_gb: 200,
    included_bandwidth_gb: 2000
  }
};

// Resource requirements by template type
const TEMPLATE_RESOURCES = {
  'rest-api': {
    cpu_cores: 0.5,
    memory_gb: 1,
    storage_gb: 5,
    database_gb: 2,
    estimated_requests_per_month: 100000
  },
  'graphql-api': {
    cpu_cores: 0.7,
    memory_gb: 1.5,
    storage_gb: 5,
    database_gb: 3,
    estimated_requests_per_month: 75000
  },
  'webapp-nextjs': {
    cpu_cores: 0.8,
    memory_gb: 2,
    storage_gb: 10,
    database_gb: 5,
    estimated_requests_per_month: 50000
  },
  'worker-service': {
    cpu_cores: 1,
    memory_gb: 2,
    storage_gb: 8,
    database_gb: 10,
    estimated_requests_per_month: 500000
  },
  'fastapi': {
    cpu_cores: 0.6,
    memory_gb: 1.2,
    storage_gb: 5,
    database_gb: 3,
    estimated_requests_per_month: 120000
  },
  'gin': {
    cpu_cores: 0.4,
    memory_gb: 0.8,
    storage_gb: 3,
    database_gb: 2,
    estimated_requests_per_month: 150000
  },
  'springboot': {
    cpu_cores: 1.2,
    memory_gb: 3,
    storage_gb: 8,
    database_gb: 5,
    estimated_requests_per_month: 80000
  }
};

// Get cost estimate
router.post('/', optionalAuth, async (req, res) => {
  try {
    const {
      template_id,
      template_slug,
      tier = 'starter',
      instances = 1,
      environment = 'development',
      usage_estimates = {}
    } = req.body;

    if (!template_id && !template_slug) {
      return res.status(400).json({
        success: false,
        message: 'Either template_id or template_slug is required'
      });
    }

    // Get template information
    let template;
    if (template_id) {
      template = await Template.findById(template_id);
    } else {
      template = await Template.findBySlug(template_slug);
    }

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Get pricing tier
    const pricingTier = PRICING_TIERS[tier];
    if (!pricingTier) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pricing tier'
      });
    }

    // Calculate cost estimate
    const estimate = calculateCostEstimate(template, pricingTier, instances, environment, usage_estimates);

    res.json({
      success: true,
      message: 'Cost estimate calculated successfully',
      data: {
        template: {
          id: template.id,
          name: template.name,
          slug: template.slug,
          technology: template.technology,
          language: template.language
        },
        estimate,
        pricing_tier: pricingTier,
        parameters: {
          instances,
          environment,
          usage_estimates
        }
      }
    });
  } catch (error) {
    console.error('Cost estimate error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while calculating cost estimate'
    });
  }
});

// Get pricing tiers
router.get('/tiers', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Pricing tiers retrieved successfully',
      data: {
        tiers: PRICING_TIERS
      }
    });
  } catch (error) {
    console.error('Get pricing tiers error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching pricing tiers'
    });
  }
});

// Get template resource requirements
router.get('/resources/:template_slug', async (req, res) => {
  try {
    const { template_slug } = req.params;
    
    const template = await Template.findBySlug(template_slug);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    const resources = getTemplateResources(template);
    
    res.json({
      success: true,
      message: 'Template resource requirements retrieved successfully',
      data: {
        template: {
          id: template.id,
          name: template.name,
          slug: template.slug
        },
        resources
      }
    });
  } catch (error) {
    console.error('Get template resources error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching template resources'
    });
  }
});

// Calculate detailed cost breakdown
router.post('/breakdown', optionalAuth, async (req, res) => {
  try {
    const {
      services = [],
      tier = 'starter',
      environment = 'production'
    } = req.body;

    if (!Array.isArray(services) || services.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Services array is required and must not be empty'
      });
    }

    const pricingTier = PRICING_TIERS[tier];
    if (!pricingTier) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pricing tier'
      });
    }

    const breakdown = await calculateMultiServiceBreakdown(services, pricingTier, environment);

    res.json({
      success: true,
      message: 'Cost breakdown calculated successfully',
      data: {
        breakdown,
        pricing_tier: pricingTier,
        environment
      }
    });
  } catch (error) {
    console.error('Cost breakdown error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while calculating cost breakdown'
    });
  }
});

// Helper functions
function calculateCostEstimate(template, pricingTier, instances, environment, usageEstimates) {
  const resources = getTemplateResources(template);
  
  // Apply environment multipliers
  const envMultiplier = getEnvironmentMultiplier(environment);
  
  // Calculate monthly hours for instances
  const monthlyHours = 24 * 30; // 720 hours per month
  const totalComputeHours = instances * monthlyHours * resources.cpu_cores * envMultiplier;
  
  // Calculate storage requirements
  const totalStorageGb = instances * resources.storage_gb * envMultiplier;
  const totalDatabaseGb = instances * resources.database_gb * envMultiplier;
  
  // Calculate bandwidth (estimate based on requests and average response size)
  const avgResponseSizeKb = 50; // 50KB average response
  const requestsPerMonth = usageEstimates.requests_per_month || resources.estimated_requests_per_month;
  const bandwidthGb = (requestsPerMonth * avgResponseSizeKb) / (1024 * 1024); // Convert to GB
  
  // Calculate costs
  const computeCost = Math.max(0, (totalComputeHours - pricingTier.included_compute_hours) * pricingTier.compute_per_gb_hour);
  const storageCost = Math.max(0, (totalStorageGb - pricingTier.included_storage_gb) * pricingTier.storage_per_gb_month);
  const databaseCost = totalDatabaseGb * pricingTier.database_per_gb_month;
  const bandwidthCost = Math.max(0, (bandwidthGb - pricingTier.included_bandwidth_gb) * pricingTier.bandwidth_per_gb);
  
  const totalCost = pricingTier.base_cost + computeCost + storageCost + databaseCost + bandwidthCost;
  
  return {
    monthly_cost: Math.round(totalCost * 100) / 100,
    yearly_cost: Math.round(totalCost * 12 * 100) / 100,
    breakdown: {
      base_cost: pricingTier.base_cost,
      compute_cost: Math.round(computeCost * 100) / 100,
      storage_cost: Math.round(storageCost * 100) / 100,
      database_cost: Math.round(databaseCost * 100) / 100,
      bandwidth_cost: Math.round(bandwidthCost * 100) / 100
    },
    resources: {
      instances,
      cpu_cores_per_instance: resources.cpu_cores,
      memory_gb_per_instance: resources.memory_gb,
      storage_gb_total: totalStorageGb,
      database_gb_total: totalDatabaseGb,
      estimated_requests_per_month: requestsPerMonth,
      bandwidth_gb_per_month: Math.round(bandwidthGb * 100) / 100,
      compute_hours_per_month: Math.round(totalComputeHours)
    },
    included_resources: {
      compute_hours: pricingTier.included_compute_hours,
      storage_gb: pricingTier.included_storage_gb,
      bandwidth_gb: pricingTier.included_bandwidth_gb
    },
    environment_multiplier: envMultiplier
  };
}

async function calculateMultiServiceBreakdown(services, pricingTier, environment) {
  const serviceBreakdowns = [];
  let totalMonthlyCost = pricingTier.base_cost;
  
  for (const service of services) {
    const template = await Template.findBySlug(service.template_slug);
    if (!template) {
      continue;
    }
    
    const estimate = calculateCostEstimate(
      template,
      pricingTier,
      service.instances || 1,
      environment,
      service.usage_estimates || {}
    );
    
    serviceBreakdowns.push({
      service_name: service.name || template.name,
      template: template.slug,
      estimate
    });
    
    // Add to total (subtract base cost to avoid double counting)
    totalMonthlyCost += estimate.monthly_cost - pricingTier.base_cost;
  }
  
  return {
    total_monthly_cost: Math.round(totalMonthlyCost * 100) / 100,
    total_yearly_cost: Math.round(totalMonthlyCost * 12 * 100) / 100,
    base_cost: pricingTier.base_cost,
    services: serviceBreakdowns
  };
}

function getTemplateResources(template) {
  // Get base resources for the template
  const baseResources = TEMPLATE_RESOURCES[template.slug] || TEMPLATE_RESOURCES['rest-api'];
  
  // Apply technology-specific adjustments
  let multiplier = 1;
  
  switch (template.language) {
    case 'java':
      multiplier = 1.5; // Java typically uses more memory
      break;
    case 'go':
      multiplier = 0.7; // Go is more efficient
      break;
    case 'rust':
      multiplier = 0.6; // Rust is very efficient
      break;
    case 'python':
      multiplier = 1.2; // Python uses more resources
      break;
    default:
      multiplier = 1;
  }
  
  return {
    cpu_cores: baseResources.cpu_cores * multiplier,
    memory_gb: baseResources.memory_gb * multiplier,
    storage_gb: baseResources.storage_gb,
    database_gb: baseResources.database_gb,
    estimated_requests_per_month: baseResources.estimated_requests_per_month
  };
}

function getEnvironmentMultiplier(environment) {
  switch (environment) {
    case 'development':
      return 0.5; // Development uses fewer resources
    case 'staging':
      return 0.8; // Staging uses less than production
    case 'production':
      return 1.0; // Production baseline
    default:
      return 1.0;
  }
}

module.exports = router;