const express = require('express');
const { auth } = require('../middleware/auth-simple');
const costCalculator = require('../services/cost-calculator');
const costProjector = require('../services/cost-projector');
const costOptimizer = require('../services/cost-optimizer');
const resourceEstimator = require('../services/resource-estimator');
const logger = require('winston');

const router = express.Router();

// Get cost analytics overview
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's services for cost calculation
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    const servicesResult = await pool.query(
      'SELECT * FROM devx.services WHERE user_id = $1 AND status != $2',
      [userId, 'deleted']
    );
    
    const services = servicesResult.rows;
    
    if (services.length === 0) {
      return res.json({
        monthlyCost: 0,
        totalServices: 0,
        costTrend: 'stable',
        breakdown: {
          compute: 0,
          storage: 0,
          network: 0,
          database: 0
        },
        topServices: [],
        projections: {
          nextMonth: 0,
          threeMonths: 0,
          sixMonths: 0
        }
      });
    }
    
    // Calculate costs for all services
    let totalMonthlyCost = 0;
    let breakdown = { compute: 0, storage: 0, network: 0, database: 0 };
    let servicesCosts = [];
    
    for (const service of services) {
      try {
        const costEstimate = await costCalculator.calculateServiceCost({
          template: service.template_slug,
          environment: service.environment || 'development',
          resources: service.configuration?.resources || {
            cpu: '0.5',
            memory: '1Gi',
            storage: '10Gi'
          },
          cloudProvider: service.configuration?.cloud_provider || 'aws',
          region: service.configuration?.region || 'us-east-1'
        });
        
        totalMonthlyCost += costEstimate.monthly;
        servicesCosts.push({
          name: service.name,
          cost: costEstimate.monthly,
          template: service.template_slug
        });
        
        // Add to breakdown
        breakdown.compute += costEstimate.breakdown?.compute || costEstimate.monthly * 0.6;
        breakdown.storage += costEstimate.breakdown?.storage || costEstimate.monthly * 0.2;
        breakdown.network += costEstimate.breakdown?.network || costEstimate.monthly * 0.1;
        breakdown.database += costEstimate.breakdown?.database || costEstimate.monthly * 0.1;
        
      } catch (error) {
        logger.warn(`Error calculating cost for service ${service.name}:`, error.message);
        // Use fallback estimate
        const fallbackCost = 25; // $25 default monthly cost
        totalMonthlyCost += fallbackCost;
        servicesCosts.push({
          name: service.name,
          cost: fallbackCost,
          template: service.template_slug
        });
      }
    }
    
    // Sort services by cost (highest first) and take top 5
    const topServices = servicesCosts
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5)
      .map(s => ({
        name: s.name,
        cost: Math.round(s.cost * 100) / 100,
        template: s.template
      }));
    
    // Calculate cost trend (simplified - would be based on historical data in production)
    const costTrend = totalMonthlyCost > 100 ? 'increasing' : totalMonthlyCost > 50 ? 'stable' : 'decreasing';
    
    // Get cost projections
    let projections = {
      nextMonth: totalMonthlyCost,
      threeMonths: totalMonthlyCost * 3,
      sixMonths: totalMonthlyCost * 6
    };
    
    try {
      const projectionData = await costProjector.projectCosts({
        currentMonthlyCost: totalMonthlyCost,
        services: services.length,
        trend: costTrend
      });
      projections = projectionData;
    } catch (error) {
      logger.warn('Error calculating projections:', error.message);
    }
    
    await pool.end();
    
    res.json({
      monthlyCost: Math.round(totalMonthlyCost * 100) / 100,
      totalServices: services.length,
      costTrend,
      breakdown: {
        compute: Math.round(breakdown.compute * 100) / 100,
        storage: Math.round(breakdown.storage * 100) / 100,
        network: Math.round(breakdown.network * 100) / 100,
        database: Math.round(breakdown.database * 100) / 100
      },
      topServices,
      projections: {
        nextMonth: Math.round(projections.nextMonth * 100) / 100,
        threeMonths: Math.round(projections.threeMonths * 100) / 100,
        sixMonths: Math.round(projections.sixMonths * 100) / 100
      }
    });
    
  } catch (error) {
    logger.error('Error fetching cost analytics:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch cost analytics'
    });
  }
});

// Get detailed cost breakdown for a specific service
router.get('/service/:serviceId', auth, async (req, res) => {
  try {
    const { serviceId } = req.params;
    const userId = req.user.id;
    
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    const serviceResult = await pool.query(
      'SELECT * FROM devx.services WHERE id = $1 AND user_id = $2',
      [serviceId, userId]
    );
    
    if (serviceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    const service = serviceResult.rows[0];
    
    const costEstimate = await costCalculator.calculateServiceCost({
      template: service.template_slug,
      environment: service.environment || 'development',
      resources: service.configuration?.resources || {
        cpu: '0.5',
        memory: '1Gi',
        storage: '10Gi'
      },
      cloudProvider: service.configuration?.cloud_provider || 'aws',
      region: service.configuration?.region || 'us-east-1'
    });
    
    await pool.end();
    
    res.json({
      service: {
        id: service.id,
        name: service.name,
        template: service.template_slug,
        environment: service.environment
      },
      costs: costEstimate
    });
    
  } catch (error) {
    logger.error('Error fetching service cost details:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch service cost details'
    });
  }
});

// Get cost optimization recommendations
router.get('/optimize', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    const servicesResult = await pool.query(
      'SELECT * FROM devx.services WHERE user_id = $1 AND status != $2',
      [userId, 'deleted']
    );
    
    const services = servicesResult.rows;
    
    if (services.length === 0) {
      return res.json({ recommendations: [] });
    }
    
    const recommendations = await costOptimizer.analyzeAndOptimize(services);
    
    await pool.end();
    
    res.json({ recommendations });
    
  } catch (error) {
    logger.error('Error generating cost optimization recommendations:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to generate optimization recommendations'
    });
  }
});

// Get cost trends over time (historical data)
router.get('/trends', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = '30d' } = req.query;
    
    // In production, this would query historical cost data
    // For now, generate sample trend data
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const trends = [];
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Generate sample data - in production this would be real historical data
      const baseCost = 45 + Math.sin(i * 0.1) * 10;
      trends.push({
        date: date.toISOString().split('T')[0],
        cost: Math.round(baseCost * 100) / 100
      });
    }
    
    res.json({ trends, period });
    
  } catch (error) {
    logger.error('Error fetching cost trends:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to fetch cost trends'
    });
  }
});

module.exports = router;