const { SimpleLinearRegression } = require('ml-regression');

class ResourceEstimationEngine {
  constructor() {
    // Service type configurations with resource estimation patterns
    this.serviceConfigs = {
      'rest-api': {
        baseResources: {
          cpu: 0.5, // vCPU
          memory: 1, // GB
          storage: 10, // GB
          network: 100 // GB/month
        },
        scalingFactors: {
          requests: 0.0001, // Additional CPU per request/day
          users: 0.01, // Additional memory per concurrent user
          dataSize: 0.1 // Additional storage per GB of data
        },
        recommendedTiers: {
          small: { cpu: 1, memory: 2, storage: 20 },
          medium: { cpu: 2, memory: 4, storage: 50 },
          large: { cpu: 4, memory: 8, storage: 100 }
        }
      },
      'graphql-api': {
        baseResources: {
          cpu: 0.8,
          memory: 1.5,
          storage: 15,
          network: 150
        },
        scalingFactors: {
          requests: 0.00015,
          users: 0.015,
          dataSize: 0.12
        },
        recommendedTiers: {
          small: { cpu: 1, memory: 2, storage: 30 },
          medium: { cpu: 2, memory: 4, storage: 60 },
          large: { cpu: 4, memory: 8, storage: 120 }
        }
      },
      'grpc-service': {
        baseResources: {
          cpu: 0.6,
          memory: 1.2,
          storage: 12,
          network: 80
        },
        scalingFactors: {
          requests: 0.00012,
          users: 0.012,
          dataSize: 0.08
        },
        recommendedTiers: {
          small: { cpu: 1, memory: 2, storage: 25 },
          medium: { cpu: 2, memory: 4, storage: 50 },
          large: { cpu: 4, memory: 8, storage: 100 }
        }
      },
      'webapp-nextjs': {
        baseResources: {
          cpu: 1,
          memory: 2,
          storage: 25,
          network: 200,
          cdn: 500 // GB/month CDN
        },
        scalingFactors: {
          requests: 0.0002,
          users: 0.02,
          dataSize: 0.15
        },
        recommendedTiers: {
          small: { cpu: 1, memory: 2, storage: 50, cdn: 1000 },
          medium: { cpu: 2, memory: 4, storage: 100, cdn: 2000 },
          large: { cpu: 4, memory: 8, storage: 200, cdn: 5000 }
        }
      },
      'worker-service': {
        baseResources: {
          cpu: 0.5,
          memory: 1,
          storage: 8,
          network: 50
        },
        scalingFactors: {
          jobs: 0.001, // CPU per job/hour
          queueSize: 0.1, // Memory per queue item
          dataSize: 0.05
        },
        recommendedTiers: {
          small: { cpu: 1, memory: 1, storage: 20 },
          medium: { cpu: 2, memory: 2, storage: 40 },
          large: { cpu: 4, memory: 4, storage: 80 }
        }
      },
      'database': {
        baseResources: {
          cpu: 1,
          memory: 2,
          storage: 50,
          iops: 1000
        },
        scalingFactors: {
          connections: 0.05, // Memory per connection
          dataSize: 1.2, // Storage multiplier for indexes/logs
          queries: 0.00001 // CPU per query/day
        },
        recommendedTiers: {
          small: { cpu: 1, memory: 4, storage: 100, iops: 3000 },
          medium: { cpu: 2, memory: 8, storage: 200, iops: 6000 },
          large: { cpu: 4, memory: 16, storage: 500, iops: 12000 }
        }
      }
    };

    // Machine learning models for cost prediction
    this.costModels = new Map();
    this.initializeCostModels();
  }

  /**
   * Initialize machine learning models for cost prediction
   */
  initializeCostModels() {
    // Training data for different service types (simplified examples)
    const trainingData = {
      'rest-api': {
        x: [100, 1000, 5000, 10000, 50000], // requests per day
        y: [50, 150, 400, 750, 2500] // monthly cost in USD
      },
      'webapp-nextjs': {
        x: [1000, 5000, 20000, 50000, 100000], // page views per day
        y: [80, 200, 600, 1200, 3000]
      },
      'database': {
        x: [10, 50, 100, 500, 1000], // GB of data
        y: [100, 300, 500, 1500, 2800]
      }
    };

    // Create regression models
    for (const [serviceType, data] of Object.entries(trainingData)) {
      const regression = new SimpleLinearRegression(data.x, data.y);
      this.costModels.set(serviceType, regression);
    }
  }

  /**
   * Estimate resources for a service configuration
   */
  estimateResources(serviceType, requirements) {
    const config = this.serviceConfigs[serviceType];
    if (!config) {
      throw new Error(`Unsupported service type: ${serviceType}`);
    }

    const baseResources = { ...config.baseResources };
    const scalingFactors = config.scalingFactors;

    // Apply scaling based on requirements
    if (requirements.expectedRequests) {
      baseResources.cpu += requirements.expectedRequests * scalingFactors.requests;
    }

    if (requirements.concurrentUsers) {
      baseResources.memory += requirements.concurrentUsers * scalingFactors.users;
    }

    if (requirements.dataSize) {
      baseResources.storage += requirements.dataSize * scalingFactors.dataSize;
    }

    if (requirements.jobs && scalingFactors.jobs) {
      baseResources.cpu += requirements.jobs * scalingFactors.jobs;
    }

    if (requirements.connections && scalingFactors.connections) {
      baseResources.memory += requirements.connections * scalingFactors.connections;
    }

    if (requirements.queries && scalingFactors.queries) {
      baseResources.cpu += requirements.queries * scalingFactors.queries;
    }

    // Round up to reasonable values
    const estimatedResources = {
      cpu: Math.ceil(baseResources.cpu * 10) / 10,
      memory: Math.ceil(baseResources.memory),
      storage: Math.ceil(baseResources.storage / 10) * 10,
      network: Math.ceil(baseResources.network / 50) * 50
    };

    // Add service-specific resources
    if (baseResources.cdn) {
      estimatedResources.cdn = Math.ceil(baseResources.cdn / 100) * 100;
    }
    if (baseResources.iops) {
      estimatedResources.iops = Math.ceil(baseResources.iops / 1000) * 1000;
    }

    return {
      serviceType,
      estimatedResources,
      recommendedTier: this.getRecommendedTier(config, estimatedResources),
      confidence: this.calculateConfidence(requirements),
      scalingRecommendations: this.getScalingRecommendations(serviceType, estimatedResources)
    };
  }

  /**
   * Get recommended tier based on estimated resources
   */
  getRecommendedTier(config, resources) {
    const tiers = config.recommendedTiers;
    
    // Check if resources fit in small tier
    if (resources.cpu <= tiers.small.cpu && 
        resources.memory <= tiers.small.memory && 
        resources.storage <= tiers.small.storage) {
      return { name: 'small', ...tiers.small };
    }
    
    // Check if resources fit in medium tier
    if (resources.cpu <= tiers.medium.cpu && 
        resources.memory <= tiers.medium.memory && 
        resources.storage <= tiers.medium.storage) {
      return { name: 'medium', ...tiers.medium };
    }
    
    // Use large tier or custom configuration
    if (resources.cpu <= tiers.large.cpu && 
        resources.memory <= tiers.large.memory && 
        resources.storage <= tiers.large.storage) {
      return { name: 'large', ...tiers.large };
    }

    // Custom tier for high-resource requirements
    return {
      name: 'custom',
      cpu: Math.ceil(resources.cpu / 2) * 2,
      memory: Math.ceil(resources.memory / 4) * 4,
      storage: Math.ceil(resources.storage / 100) * 100
    };
  }

  /**
   * Calculate confidence score for estimation
   */
  calculateConfidence(requirements) {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on available data
    if (requirements.expectedRequests) confidence += 0.15;
    if (requirements.concurrentUsers) confidence += 0.15;
    if (requirements.dataSize) confidence += 0.1;
    if (requirements.performanceRequirements) confidence += 0.1;
    
    return Math.min(confidence, 0.95); // Cap at 95%
  }

  /**
   * Get scaling recommendations
   */
  getScalingRecommendations(serviceType, resources) {
    const recommendations = [];
    
    if (resources.cpu > 2) {
      recommendations.push({
        type: 'horizontal',
        reason: 'High CPU requirements detected',
        suggestion: 'Consider load balancing across multiple instances'
      });
    }
    
    if (resources.memory > 4) {
      recommendations.push({
        type: 'vertical',
        reason: 'High memory requirements detected',
        suggestion: 'Monitor memory usage and consider caching strategies'
      });
    }
    
    if (resources.storage > 100) {
      recommendations.push({
        type: 'storage',
        reason: 'High storage requirements detected',
        suggestion: 'Consider object storage for large files and database optimization'
      });
    }

    if (serviceType === 'webapp-nextjs' && resources.network > 500) {
      recommendations.push({
        type: 'cdn',
        reason: 'High bandwidth requirements detected',
        suggestion: 'Implement CDN for static assets and image optimization'
      });
    }
    
    return recommendations;
  }

  /**
   * Predict cost using machine learning models
   */
  predictCost(serviceType, usageMetric) {
    const model = this.costModels.get(serviceType);
    if (!model) {
      return null;
    }
    
    return {
      predictedMonthlyCost: model.predict(usageMetric),
      confidence: this.calculateMLConfidence(serviceType, usageMetric),
      model: 'Simple Linear Regression'
    };
  }

  /**
   * Calculate ML model confidence
   */
  calculateMLConfidence(serviceType, usageMetric) {
    // Simple confidence based on how close the input is to training data range
    const trainingRanges = {
      'rest-api': [100, 50000],
      'webapp-nextjs': [1000, 100000],
      'database': [10, 1000]
    };
    
    const range = trainingRanges[serviceType];
    if (!range) return 0.5;
    
    if (usageMetric >= range[0] && usageMetric <= range[1]) {
      return 0.85;
    } else if (usageMetric < range[0] * 0.5 || usageMetric > range[1] * 2) {
      return 0.3;
    } else {
      return 0.6;
    }
  }

  /**
   * Estimate resources for microservice architecture
   */
  estimateMicroservicesArchitecture(services) {
    const estimates = [];
    let totalResources = {
      cpu: 0,
      memory: 0,
      storage: 0,
      network: 0
    };

    for (const service of services) {
      const estimate = this.estimateResources(service.type, service.requirements);
      estimates.push({
        serviceName: service.name,
        ...estimate
      });

      // Add to totals
      totalResources.cpu += estimate.estimatedResources.cpu;
      totalResources.memory += estimate.estimatedResources.memory;
      totalResources.storage += estimate.estimatedResources.storage;
      totalResources.network += estimate.estimatedResources.network;
    }

    // Add overhead for microservices (service mesh, monitoring, etc.)
    const overhead = {
      cpu: totalResources.cpu * 0.15,
      memory: totalResources.memory * 0.1,
      storage: totalResources.storage * 0.05,
      network: totalResources.network * 0.1
    };

    return {
      services: estimates,
      totalResources: {
        cpu: totalResources.cpu + overhead.cpu,
        memory: totalResources.memory + overhead.memory,
        storage: totalResources.storage + overhead.storage,
        network: totalResources.network + overhead.network
      },
      overhead,
      architectureRecommendations: this.getMicroservicesRecommendations(estimates.length, totalResources)
    };
  }

  /**
   * Get microservices architecture recommendations
   */
  getMicroservicesRecommendations(serviceCount, totalResources) {
    const recommendations = [];

    if (serviceCount > 10) {
      recommendations.push({
        type: 'orchestration',
        priority: 'high',
        recommendation: 'Consider Kubernetes for container orchestration with this many services'
      });
    }

    if (totalResources.cpu > 20) {
      recommendations.push({
        type: 'infrastructure',
        priority: 'medium',
        recommendation: 'Consider auto-scaling groups to handle variable load'
      });
    }

    if (serviceCount > 5) {
      recommendations.push({
        type: 'monitoring',
        priority: 'high',
        recommendation: 'Implement distributed tracing and centralized logging'
      });
    }

    if (totalResources.storage > 500) {
      recommendations.push({
        type: 'data',
        priority: 'medium',
        recommendation: 'Consider data partitioning and separate database instances'
      });
    }

    return recommendations;
  }

  /**
   * Estimate seasonal scaling requirements
   */
  estimateSeasonalScaling(baseRequirements, seasonalPatterns) {
    const scalingEstimates = {};

    for (const [season, multiplier] of Object.entries(seasonalPatterns)) {
      const scaledRequirements = {
        expectedRequests: baseRequirements.expectedRequests * multiplier,
        concurrentUsers: baseRequirements.concurrentUsers * multiplier,
        dataSize: baseRequirements.dataSize // Data size doesn't scale with traffic
      };

      scalingEstimates[season] = {
        requirements: scaledRequirements,
        multiplier,
        additionalCost: this.calculateAdditionalCost(baseRequirements, scaledRequirements)
      };
    }

    return scalingEstimates;
  }

  /**
   * Calculate additional cost for scaled requirements
   */
  calculateAdditionalCost(baseRequirements, scaledRequirements) {
    // Simplified cost calculation based on resource scaling
    const cpuScale = scaledRequirements.expectedRequests / baseRequirements.expectedRequests;
    const memoryScale = scaledRequirements.concurrentUsers / baseRequirements.concurrentUsers;
    
    return {
      cpuIncrease: (cpuScale - 1) * 100, // Percentage increase
      memoryIncrease: (memoryScale - 1) * 100,
      estimatedCostIncrease: ((cpuScale + memoryScale) / 2 - 1) * 100
    };
  }

  /**
   * Get optimization suggestions
   */
  getOptimizationSuggestions(estimatedResources, requirements) {
    const suggestions = [];

    // CPU optimization
    if (estimatedResources.cpu > 4) {
      suggestions.push({
        category: 'performance',
        type: 'cpu',
        suggestion: 'Consider implementing caching to reduce CPU load',
        potentialSavings: '15-30%'
      });
    }

    // Memory optimization
    if (estimatedResources.memory > 8) {
      suggestions.push({
        category: 'performance',
        type: 'memory',
        suggestion: 'Review memory usage patterns and implement garbage collection tuning',
        potentialSavings: '10-25%'
      });
    }

    // Storage optimization
    if (estimatedResources.storage > 200) {
      suggestions.push({
        category: 'storage',
        type: 'cost',
        suggestion: 'Use tiered storage for infrequently accessed data',
        potentialSavings: '20-40%'
      });
    }

    // Network optimization
    if (estimatedResources.network > 1000) {
      suggestions.push({
        category: 'network',
        type: 'cost',
        suggestion: 'Implement data compression and CDN for static content',
        potentialSavings: '25-50%'
      });
    }

    return suggestions;
  }
}

module.exports = ResourceEstimationEngine;