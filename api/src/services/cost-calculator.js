const AWSPricingService = require('./aws-pricing');
const GCPPricingService = require('./gcp-pricing');
const ResourceEstimationEngine = require('./resource-estimator-simple');
const CostProjectionService = require('./cost-projector');
const CostOptimizationEngine = require('./cost-optimizer');

class CostCalculationService {
  constructor() {
    this.awsPricing = new AWSPricingService();
    this.gcpPricing = new GCPPricingService();
    this.resourceEstimator = new ResourceEstimationEngine();
    this.costProjector = new CostProjectionService();
    this.costOptimizer = new CostOptimizationEngine();
    
    // Cost calculation cache
    this.calculationCache = new Map();
    this.cacheExpiry = 1 * 60 * 60 * 1000; // 1 hour
  }

  /**
   * Calculate comprehensive costs for a service configuration
   */
  async calculateServiceCosts(serviceConfig) {
    const cacheKey = this.generateCacheKey(serviceConfig);
    
    // Check cache first
    if (this.calculationCache.has(cacheKey)) {
      const cached = this.calculationCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }
    }

    try {
      // Step 1: Estimate resource requirements
      const resourceEstimate = this.resourceEstimator.estimateResources(
        serviceConfig.type,
        serviceConfig.requirements
      );

      // Step 2: Get pricing from cloud providers
      const awsCosts = await this.calculateAWSCosts(resourceEstimate, serviceConfig.cloud.aws);
      const gcpCosts = await this.calculateGCPCosts(resourceEstimate, serviceConfig.cloud.gcp);

      // Step 3: Calculate total costs and comparison
      const costComparison = this.compareCosts(awsCosts, gcpCosts);

      // Step 4: Generate optimization recommendations
      const optimizationAnalysis = await this.generateOptimizationRecommendations(
        resourceEstimate,
        costComparison,
        serviceConfig
      );

      // Step 5: Project future costs
      const projections = await this.generateCostProjections(
        costComparison,
        serviceConfig,
        resourceEstimate
      );

      const result = {
        serviceConfig: {
          name: serviceConfig.name,
          type: serviceConfig.type,
          requirements: serviceConfig.requirements
        },
        resourceEstimate,
        costs: {
          aws: awsCosts,
          gcp: gcpCosts,
          comparison: costComparison
        },
        optimizations: optimizationAnalysis,
        projections,
        metadata: {
          calculatedAt: new Date().toISOString(),
          currency: 'USD',
          confidence: this.calculateOverallConfidence(resourceEstimate, awsCosts, gcpCosts)
        }
      };

      // Cache the result
      this.calculationCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      console.error('Error calculating service costs:', error);
      throw new Error(`Cost calculation failed: ${error.message}`);
    }
  }

  /**
   * Calculate AWS costs for resource estimate
   */
  async calculateAWSCosts(resourceEstimate, awsConfig = {}) {
    const region = awsConfig.region || 'us-east-1';
    const costs = {
      compute: 0,
      storage: 0,
      network: 0,
      database: 0,
      other: 0,
      breakdown: []
    };

    try {
      // Compute costs (EC2)
      const instanceType = awsConfig.instanceType || this.selectAWSInstanceType(resourceEstimate.estimatedResources);
      const ec2Pricing = await this.awsPricing.getEC2Pricing(instanceType, region);
      
      const computeCost = ec2Pricing.monthlyRate * (awsConfig.instances || 1);
      costs.compute = computeCost;
      costs.breakdown.push({
        service: 'EC2',
        type: 'compute',
        resource: instanceType,
        quantity: awsConfig.instances || 1,
        unitCost: ec2Pricing.monthlyRate,
        totalCost: computeCost
      });

      // Storage costs (EBS)
      if (resourceEstimate.estimatedResources.storage > 0) {
        const storageCost = resourceEstimate.estimatedResources.storage * 0.10; // $0.10/GB-month for gp2
        costs.storage = storageCost;
        costs.breakdown.push({
          service: 'EBS',
          type: 'storage',
          resource: 'gp2',
          quantity: resourceEstimate.estimatedResources.storage,
          unitCost: 0.10,
          totalCost: storageCost
        });
      }

      // Database costs (RDS) if applicable
      if (awsConfig.database) {
        const dbInstanceClass = awsConfig.database.instanceClass || 'db.t3.micro';
        const rdsPricing = await this.awsPricing.getRDSPricing(dbInstanceClass, 'mysql', region);
        
        const dbCost = rdsPricing.monthlyRate;
        costs.database = dbCost;
        costs.breakdown.push({
          service: 'RDS',
          type: 'database',
          resource: dbInstanceClass,
          quantity: 1,
          unitCost: rdsPricing.monthlyRate,
          totalCost: dbCost
        });
      }

      // Network costs (simplified)
      if (resourceEstimate.estimatedResources.network > 0) {
        const networkCost = Math.max(0, (resourceEstimate.estimatedResources.network - 100)) * 0.09; // First 100GB free
        costs.network = networkCost;
        costs.breakdown.push({
          service: 'Data Transfer',
          type: 'network',
          resource: 'outbound',
          quantity: resourceEstimate.estimatedResources.network,
          unitCost: 0.09,
          totalCost: networkCost
        });
      }

      // CDN costs if applicable
      if (resourceEstimate.estimatedResources.cdn) {
        const cdnCost = Math.max(0, (resourceEstimate.estimatedResources.cdn - 1000)) * 0.085; // First 1TB free
        costs.other = cdnCost;
        costs.breakdown.push({
          service: 'CloudFront',
          type: 'cdn',
          resource: 'data transfer',
          quantity: resourceEstimate.estimatedResources.cdn,
          unitCost: 0.085,
          totalCost: cdnCost
        });
      }

      costs.total = costs.compute + costs.storage + costs.network + costs.database + costs.other;
      costs.provider = 'AWS';
      costs.region = region;

      return costs;
    } catch (error) {
      console.error('Error calculating AWS costs:', error);
      return {
        total: 0,
        provider: 'AWS',
        error: error.message,
        breakdown: []
      };
    }
  }

  /**
   * Calculate GCP costs for resource estimate
   */
  async calculateGCPCosts(resourceEstimate, gcpConfig = {}) {
    const region = gcpConfig.region || 'us-central1';
    const costs = {
      compute: 0,
      storage: 0,
      network: 0,
      database: 0,
      other: 0,
      breakdown: []
    };

    try {
      // Compute costs (Compute Engine)
      const machineType = gcpConfig.machineType || this.selectGCPMachineType(resourceEstimate.estimatedResources);
      const gcePricing = await this.gcpPricing.getComputeEnginePricing(machineType, region);
      
      const computeCost = gcePricing.monthlyRate * (gcpConfig.instances || 1);
      costs.compute = computeCost;
      costs.breakdown.push({
        service: 'Compute Engine',
        type: 'compute',
        resource: machineType,
        quantity: gcpConfig.instances || 1,
        unitCost: gcePricing.monthlyRate,
        totalCost: computeCost
      });

      // Storage costs
      if (resourceEstimate.estimatedResources.storage > 0) {
        const storagePricing = await this.gcpPricing.getCloudStoragePricing('STANDARD', region);
        const storageCost = resourceEstimate.estimatedResources.storage * storagePricing.pricePerGB;
        costs.storage = storageCost;
        costs.breakdown.push({
          service: 'Cloud Storage',
          type: 'storage',
          resource: 'Standard',
          quantity: resourceEstimate.estimatedResources.storage,
          unitCost: storagePricing.pricePerGB,
          totalCost: storageCost
        });
      }

      // Database costs (Cloud SQL) if applicable
      if (gcpConfig.database) {
        const dbTier = gcpConfig.database.tier || 'db-f1-micro';
        const sqlPricing = await this.gcpPricing.getCloudSQLPricing(dbTier, region);
        
        const dbCost = sqlPricing.monthlyRate;
        costs.database = dbCost;
        costs.breakdown.push({
          service: 'Cloud SQL',
          type: 'database',
          resource: dbTier,
          quantity: 1,
          unitCost: sqlPricing.monthlyRate,
          totalCost: dbCost
        });
      }

      // Network costs (simplified)
      if (resourceEstimate.estimatedResources.network > 0) {
        const networkCost = Math.max(0, (resourceEstimate.estimatedResources.network - 200)) * 0.12; // First 200GB free
        costs.network = networkCost;
        costs.breakdown.push({
          service: 'Network Egress',
          type: 'network',
          resource: 'outbound',
          quantity: resourceEstimate.estimatedResources.network,
          unitCost: 0.12,
          totalCost: networkCost
        });
      }

      costs.total = costs.compute + costs.storage + costs.network + costs.database + costs.other;
      costs.provider = 'GCP';
      costs.region = region;

      return costs;
    } catch (error) {
      console.error('Error calculating GCP costs:', error);
      return {
        total: 0,
        provider: 'GCP',
        error: error.message,
        breakdown: []
      };
    }
  }

  /**
   * Compare costs between cloud providers
   */
  compareCosts(awsCosts, gcpCosts) {
    const comparison = {
      cheapest: awsCosts.total <= gcpCosts.total ? 'AWS' : 'GCP',
      costDifference: Math.abs(awsCosts.total - gcpCosts.total),
      percentageDifference: awsCosts.total > 0 && gcpCosts.total > 0 
        ? (Math.abs(awsCosts.total - gcpCosts.total) / Math.min(awsCosts.total, gcpCosts.total)) * 100
        : 0,
      breakdown: {
        compute: {
          aws: awsCosts.compute,
          gcp: gcpCosts.compute,
          difference: awsCosts.compute - gcpCosts.compute
        },
        storage: {
          aws: awsCosts.storage,
          gcp: gcpCosts.storage,
          difference: awsCosts.storage - gcpCosts.storage
        },
        network: {
          aws: awsCosts.network,
          gcp: gcpCosts.network,
          difference: awsCosts.network - gcpCosts.network
        },
        database: {
          aws: awsCosts.database,
          gcp: gcpCosts.database,
          difference: awsCosts.database - gcpCosts.database
        }
      }
    };

    return comparison;
  }

  /**
   * Generate optimization recommendations
   */
  async generateOptimizationRecommendations(resourceEstimate, costComparison, serviceConfig) {
    // Mock utilization metrics for demonstration
    const mockMetrics = {
      cpu: {
        average: 0.45,
        peak: 0.78,
        variance: 0.25
      },
      memory: {
        average: 0.52,
        peak: 0.83
      },
      storage: {
        utilization: 0.65,
        accessPattern: {
          infrequent: 0.35,
          archive: 0.15
        }
      },
      network: {
        bandwidth: {
          outbound: resourceEstimate.estimatedResources.network
        },
        staticContentRatio: 0.6,
        compressibleRatio: 0.7
      }
    };

    const currentCosts = {
      compute: Math.max(costComparison.breakdown.compute.aws, costComparison.breakdown.compute.gcp),
      storage: Math.max(costComparison.breakdown.storage.aws, costComparison.breakdown.storage.gcp),
      network: Math.max(costComparison.breakdown.network.aws, costComparison.breakdown.network.gcp),
      database: Math.max(costComparison.breakdown.database.aws, costComparison.breakdown.database.gcp)
    };

    const optimizationAnalysis = this.costOptimizer.analyzeResourceUtilization(
      mockMetrics,
      currentCosts,
      serviceConfig
    );

    return optimizationAnalysis;
  }

  /**
   * Generate cost projections
   */
  async generateCostProjections(costComparison, serviceConfig, resourceEstimate) {
    // Use the cheaper provider for projections
    const baseCost = Math.min(
      costComparison.breakdown.compute.aws + costComparison.breakdown.storage.aws + costComparison.breakdown.network.aws,
      costComparison.breakdown.compute.gcp + costComparison.breakdown.storage.gcp + costComparison.breakdown.network.gcp
    );

    // Generate growth projections based on service type
    const growthRates = {
      'rest-api': 0.05,      // 5% monthly growth
      'graphql-api': 0.07,   // 7% monthly growth
      'webapp-nextjs': 0.08, // 8% monthly growth
      'worker-service': 0.03, // 3% monthly growth
      'database': 0.04       // 4% monthly growth
    };

    const growthRate = growthRates[serviceConfig.type] || 0.05;

    const projections = [];
    for (let month = 1; month <= 12; month++) {
      const projectedCost = baseCost * Math.pow(1 + growthRate, month);
      projections.push({
        month,
        projectedCost,
        growthFromBase: ((projectedCost - baseCost) / baseCost) * 100
      });
    }

    return {
      baseCost,
      growthRate: growthRate * 100,
      projections,
      totalFirstYear: projections.reduce((sum, p) => sum + p.projectedCost, 0)
    };
  }

  /**
   * Select appropriate AWS instance type based on resource requirements
   */
  selectAWSInstanceType(resources) {
    if (resources.cpu <= 1 && resources.memory <= 2) return 't3.micro';
    if (resources.cpu <= 1 && resources.memory <= 4) return 't3.small';
    if (resources.cpu <= 2 && resources.memory <= 4) return 't3.medium';
    if (resources.cpu <= 2 && resources.memory <= 8) return 't3.large';
    if (resources.cpu <= 4 && resources.memory <= 16) return 't3.xlarge';
    return 't3.2xlarge';
  }

  /**
   * Select appropriate GCP machine type based on resource requirements
   */
  selectGCPMachineType(resources) {
    if (resources.cpu <= 1 && resources.memory <= 1) return 'f1-micro';
    if (resources.cpu <= 1 && resources.memory <= 4) return 'n1-standard-1';
    if (resources.cpu <= 2 && resources.memory <= 8) return 'n1-standard-2';
    if (resources.cpu <= 4 && resources.memory <= 16) return 'n1-standard-4';
    if (resources.cpu <= 8 && resources.memory <= 32) return 'n1-standard-8';
    return 'n1-standard-16';
  }

  /**
   * Calculate overall confidence score
   */
  calculateOverallConfidence(resourceEstimate, awsCosts, gcpCosts) {
    let confidence = resourceEstimate.confidence || 0.7;
    
    // Reduce confidence if there were pricing errors
    if (awsCosts.error) confidence -= 0.2;
    if (gcpCosts.error) confidence -= 0.2;
    
    return Math.max(0.3, confidence);
  }

  /**
   * Generate cache key for calculations
   */
  generateCacheKey(serviceConfig) {
    return JSON.stringify({
      type: serviceConfig.type,
      requirements: serviceConfig.requirements,
      cloud: serviceConfig.cloud
    });
  }

  /**
   * Batch calculate costs for multiple services
   */
  async batchCalculateCosts(serviceConfigs) {
    const results = [];
    const errors = [];

    for (const config of serviceConfigs) {
      try {
        const calculation = await this.calculateServiceCosts(config);
        results.push(calculation);
      } catch (error) {
        errors.push({
          serviceConfig: config,
          error: error.message
        });
      }
    }

    return {
      results,
      errors,
      summary: {
        successful: results.length,
        failed: errors.length,
        totalCosts: {
          aws: results.reduce((sum, r) => sum + (r.costs.aws.total || 0), 0),
          gcp: results.reduce((sum, r) => sum + (r.costs.gcp.total || 0), 0)
        }
      }
    };
  }

  /**
   * Clear calculation cache
   */
  clearCache() {
    this.calculationCache.clear();
    this.awsPricing.clearCache();
    this.gcpPricing.clearCache();
  }

  /**
   * Get service statistics
   */
  getServiceStats() {
    return {
      cacheSize: this.calculationCache.size,
      awsCacheStats: this.awsPricing.getCacheStats(),
      gcpCacheStats: this.gcpPricing.getCacheStats(),
      supportedServiceTypes: [
        'rest-api',
        'graphql-api',
        'grpc-service',
        'webapp-nextjs',
        'worker-service',
        'database'
      ]
    };
  }
}

module.exports = CostCalculationService;