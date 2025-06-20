const express = require('express');
const { pool } = require('../../config/database');
const { auth } = require('../middleware/auth-simple');

const router = express.Router();

// Get cost analytics overview
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Mock cost data for demo
    const costData = {
      summary: {
        currentMonth: 237.45,
        lastMonth: 198.32,
        projected: 289.50,
        changePercent: '+19.7%'
      },
      trend: [
        { month: 'Jul', cost: 150.20 },
        { month: 'Aug', cost: 178.90 },
        { month: 'Sep', cost: 198.32 },
        { month: 'Oct', cost: 237.45 }
      ],
      breakdown: [
        { category: 'Compute', cost: 95.80, percentage: 40.3 },
        { category: 'Storage', cost: 47.49, percentage: 20.0 },
        { category: 'Database', cost: 59.36, percentage: 25.0 },
        { category: 'Network', cost: 35.60, percentage: 14.7 }
      ],
      topServices: [
        { name: 'API Service', cost: 89.30, percentage: 37.6 },
        { name: 'Web App', cost: 67.40, percentage: 28.4 },
        { name: 'Database', cost: 48.90, percentage: 20.6 },
        { name: 'Cache Layer', cost: 31.85, percentage: 13.4 }
      ]
    };
    
    res.json({
      success: true,
      message: 'Cost analytics retrieved successfully',
      data: costData
    });
  } catch (error) {
    console.error('Cost analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching cost analytics'
    });
  }
});

// Get cost breakdown by service
router.get('/breakdown', auth, async (req, res) => {
  try {
    const breakdown = {
      services: [
        {
          id: 'service-1',
          name: 'User API',
          type: 'REST API',
          environment: 'production',
          monthlyCost: 89.30,
          breakdown: {
            compute: 45.20,
            storage: 15.30,
            network: 28.80
          },
          trend: 'increasing',
          changePercent: '+12.5%'
        },
        {
          id: 'service-2',
          name: 'Dashboard',
          type: 'Web App',
          environment: 'production',
          monthlyCost: 67.40,
          breakdown: {
            compute: 35.10,
            storage: 12.30,
            network: 20.00
          },
          trend: 'stable',
          changePercent: '+2.1%'
        }
      ],
      total: 156.70,
      period: 'October 2024'
    };
    
    res.json({
      success: true,
      message: 'Cost breakdown retrieved successfully',
      data: breakdown
    });
  } catch (error) {
    console.error('Cost breakdown error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching cost breakdown'
    });
  }
});

// Get cost projections
router.get('/projections', auth, async (req, res) => {
  try {
    const projections = {
      monthly: [
        { month: 'Nov 2024', projected: 289.50, confidence: 0.85 },
        { month: 'Dec 2024', projected: 312.80, confidence: 0.80 },
        { month: 'Jan 2025', projected: 335.20, confidence: 0.75 },
        { month: 'Feb 2025', projected: 358.90, confidence: 0.70 },
        { month: 'Mar 2025', projected: 380.40, confidence: 0.65 },
        { month: 'Apr 2025', projected: 402.30, confidence: 0.60 }
      ],
      assumptions: {
        growthRate: '7.5% monthly',
        trafficIncrease: '10% monthly',
        scalingPolicy: 'Auto-scaling enabled'
      },
      recommendations: [
        {
          type: 'optimization',
          priority: 'high',
          description: 'Consider Reserved Instances for stable workloads',
          potential_savings: '$45-60/month'
        },
        {
          type: 'architecture',
          priority: 'medium',
          description: 'Implement caching layer for API responses',
          potential_savings: '$20-30/month'
        }
      ]
    };
    
    res.json({
      success: true,
      message: 'Cost projections retrieved successfully',
      data: projections
    });
  } catch (error) {
    console.error('Cost projections error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching cost projections'
    });
  }
});

// Get cost optimization recommendations
router.get('/optimizations', auth, async (req, res) => {
  try {
    const optimizations = {
      totalPotentialSavings: 125.50,
      monthlySpend: 237.45,
      savingsPercentage: 52.8,
      recommendations: [
        {
          id: 'opt-1',
          category: 'Compute',
          service: 'API Service',
          recommendation: 'Right-size EC2 instances',
          currentCost: 45.20,
          optimizedCost: 32.80,
          savings: 12.40,
          effort: 'low',
          impact: 'high'
        },
        {
          id: 'opt-2',
          category: 'Storage',
          service: 'All Services',
          recommendation: 'Move infrequent data to S3 Glacier',
          currentCost: 47.49,
          optimizedCost: 35.20,
          savings: 12.29,
          effort: 'medium',
          impact: 'medium'
        },
        {
          id: 'opt-3',
          category: 'Database',
          service: 'RDS Instance',
          recommendation: 'Use Aurora Serverless for dev/test',
          currentCost: 59.36,
          optimizedCost: 42.10,
          savings: 17.26,
          effort: 'high',
          impact: 'high'
        }
      ]
    };
    
    res.json({
      success: true,
      message: 'Cost optimizations retrieved successfully',
      data: optimizations
    });
  } catch (error) {
    console.error('Cost optimizations error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching cost optimizations'
    });
  }
});

module.exports = router;