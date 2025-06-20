// Simplified Resource Estimation Engine without ML dependencies
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
      'web-app': {
        baseResources: {
          cpu: 0.25,
          memory: 0.5,
          storage: 5,
          network: 50
        },
        scalingFactors: {
          visitors: 0.00005,
          pageViews: 0.00001,
          assets: 0.01
        },
        recommendedTiers: {
          small: { cpu: 0.5, memory: 1, storage: 10 },
          medium: { cpu: 1, memory: 2, storage: 25 },
          large: { cpu: 2, memory: 4, storage: 50 }
        }
      },
      'database': {
        baseResources: {
          cpu: 1,
          memory: 2,
          storage: 20,
          iops: 1000
        },
        scalingFactors: {
          connections: 0.01,
          transactions: 0.00001,
          dataSize: 1
        },
        recommendedTiers: {
          small: { cpu: 2, memory: 4, storage: 50 },
          medium: { cpu: 4, memory: 8, storage: 200 },
          large: { cpu: 8, memory: 16, storage: 500 }
        }
      },
      'worker-service': {
        baseResources: {
          cpu: 1,
          memory: 2,
          storage: 10,
          queue: 1000
        },
        scalingFactors: {
          jobs: 0.001,
          concurrency: 0.1,
          jobSize: 0.01
        },
        recommendedTiers: {
          small: { cpu: 1, memory: 2, storage: 20 },
          medium: { cpu: 2, memory: 4, storage: 50 },
          large: { cpu: 4, memory: 8, storage: 100 }
        }
      }
    };

    // Initialize simple patterns for estimation
    this.patterns = {
      cpuUsagePattern: {
        morning: 0.6,
        afternoon: 0.8,
        evening: 0.9,
        night: 0.4
      },
      memoryUsagePattern: {
        baseline: 0.7,
        peak: 0.95,
        idle: 0.5
      }
    };
  }

  /**
   * Estimate resources based on service type and workload
   */
  estimateResources(serviceType, workloadParams = {}) {
    const config = this.serviceConfigs[serviceType] || this.serviceConfigs['rest-api'];
    const baseResources = { ...config.baseResources };
    
    // Calculate additional resources based on workload
    Object.entries(workloadParams).forEach(([key, value]) => {
      if (config.scalingFactors[key]) {
        baseResources.cpu += value * config.scalingFactors[key];
        baseResources.memory += value * config.scalingFactors[key] * 0.5;
      }
    });

    // Apply safety margin (20%)
    const safetyMargin = 1.2;
    Object.keys(baseResources).forEach(key => {
      baseResources[key] = Math.ceil(baseResources[key] * safetyMargin * 10) / 10;
    });

    return {
      estimated: baseResources,
      recommended: this.getRecommendedTier(serviceType, baseResources),
      confidence: 0.85, // Fixed confidence for simplified version
      factors: workloadParams
    };
  }

  /**
   * Get recommended tier based on estimated resources
   */
  getRecommendedTier(serviceType, estimatedResources) {
    const config = this.serviceConfigs[serviceType] || this.serviceConfigs['rest-api'];
    const tiers = config.recommendedTiers;
    
    // Find the best matching tier
    let selectedTier = 'small';
    let selectedTierResources = tiers.small;
    
    for (const [tierName, tierResources] of Object.entries(tiers)) {
      if (estimatedResources.cpu <= tierResources.cpu && 
          estimatedResources.memory <= tierResources.memory) {
        selectedTier = tierName;
        selectedTierResources = tierResources;
        break;
      }
    }
    
    return {
      tier: selectedTier,
      resources: selectedTierResources
    };
  }

  /**
   * Analyze resource utilization patterns
   */
  analyzeUtilizationPatterns(metrics) {
    // Simple pattern analysis without ML
    const avgCpu = metrics.reduce((sum, m) => sum + (m.cpu || 0), 0) / metrics.length;
    const avgMemory = metrics.reduce((sum, m) => sum + (m.memory || 0), 0) / metrics.length;
    const maxCpu = Math.max(...metrics.map(m => m.cpu || 0));
    const maxMemory = Math.max(...metrics.map(m => m.memory || 0));
    
    return {
      average: { cpu: avgCpu, memory: avgMemory },
      peak: { cpu: maxCpu, memory: maxMemory },
      utilization: {
        cpu: (avgCpu / maxCpu) * 100,
        memory: (avgMemory / maxMemory) * 100
      },
      recommendation: this.getOptimizationRecommendation(avgCpu, maxCpu, avgMemory, maxMemory)
    };
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendation(avgCpu, maxCpu, avgMemory, maxMemory) {
    const recommendations = [];
    
    if (avgCpu < maxCpu * 0.3) {
      recommendations.push({
        type: 'downsize',
        resource: 'cpu',
        reason: 'CPU utilization is consistently low',
        potential_savings: '20-30%'
      });
    }
    
    if (maxCpu > 0.9) {
      recommendations.push({
        type: 'upsize',
        resource: 'cpu',
        reason: 'CPU peaks are near capacity',
        impact: 'Improved performance during peak times'
      });
    }
    
    if (avgMemory < maxMemory * 0.4) {
      recommendations.push({
        type: 'downsize',
        resource: 'memory',
        reason: 'Memory utilization is consistently low',
        potential_savings: '15-25%'
      });
    }
    
    return recommendations;
  }

  /**
   * Predict future resource needs (simplified)
   */
  predictFutureNeeds(historicalData, growthRate = 0.1) {
    const lastDataPoint = historicalData[historicalData.length - 1];
    const predictions = [];
    
    // Simple linear projection
    for (let i = 1; i <= 6; i++) { // 6 months prediction
      predictions.push({
        month: i,
        cpu: lastDataPoint.cpu * Math.pow(1 + growthRate, i),
        memory: lastDataPoint.memory * Math.pow(1 + growthRate, i),
        storage: lastDataPoint.storage * Math.pow(1 + growthRate, i)
      });
    }
    
    return {
      predictions,
      growthRate,
      confidence: 0.75,
      method: 'linear_projection'
    };
  }

  /**
   * Perform capacity planning
   */
  capacityPlanning(currentUsage, expectedGrowth, timeHorizon = 12) {
    const monthlyGrowthRate = expectedGrowth / 12;
    const projections = [];
    
    for (let month = 1; month <= timeHorizon; month++) {
      const factor = Math.pow(1 + monthlyGrowthRate, month);
      projections.push({
        month,
        resources: {
          cpu: Math.ceil(currentUsage.cpu * factor * 10) / 10,
          memory: Math.ceil(currentUsage.memory * factor * 10) / 10,
          storage: Math.ceil(currentUsage.storage * factor),
          network: Math.ceil(currentUsage.network * factor)
        },
        cost_multiplier: factor
      });
    }
    
    return {
      current: currentUsage,
      projections,
      recommendations: this.getCapacityRecommendations(projections),
      scaling_triggers: this.getScalingTriggers(currentUsage)
    };
  }

  /**
   * Get capacity recommendations
   */
  getCapacityRecommendations(projections) {
    const recommendations = [];
    const threeMonthProjection = projections[2];
    const sixMonthProjection = projections[5];
    
    if (threeMonthProjection.resources.cpu > 4) {
      recommendations.push({
        timeframe: '3 months',
        action: 'Plan for horizontal scaling',
        reason: 'CPU requirements will exceed single instance capacity'
      });
    }
    
    if (sixMonthProjection.resources.storage > 500) {
      recommendations.push({
        timeframe: '6 months',
        action: 'Implement data archival strategy',
        reason: 'Storage growth will become costly'
      });
    }
    
    return recommendations;
  }

  /**
   * Get scaling triggers
   */
  getScalingTriggers(currentUsage) {
    return {
      cpu: {
        scale_up: currentUsage.cpu * 0.8,
        scale_down: currentUsage.cpu * 0.3
      },
      memory: {
        scale_up: currentUsage.memory * 0.85,
        scale_down: currentUsage.memory * 0.4
      },
      requests: {
        scale_up: 1000, // requests per minute
        scale_down: 100
      }
    };
  }

  /**
   * Simple anomaly detection
   */
  detectAnomalies(metrics) {
    const anomalies = [];
    
    // Calculate mean and standard deviation
    const cpuValues = metrics.map(m => m.cpu || 0);
    const memoryValues = metrics.map(m => m.memory || 0);
    
    const cpuMean = cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length;
    const memoryMean = memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length;
    
    const cpuStdDev = Math.sqrt(cpuValues.reduce((sq, n) => sq + Math.pow(n - cpuMean, 2), 0) / cpuValues.length);
    const memoryStdDev = Math.sqrt(memoryValues.reduce((sq, n) => sq + Math.pow(n - memoryMean, 2), 0) / memoryValues.length);
    
    // Detect anomalies (values outside 2 standard deviations)
    metrics.forEach((metric, index) => {
      if (Math.abs(metric.cpu - cpuMean) > 2 * cpuStdDev) {
        anomalies.push({
          index,
          type: 'cpu',
          value: metric.cpu,
          expected: cpuMean,
          deviation: Math.abs(metric.cpu - cpuMean) / cpuStdDev
        });
      }
      
      if (Math.abs(metric.memory - memoryMean) > 2 * memoryStdDev) {
        anomalies.push({
          index,
          type: 'memory',
          value: metric.memory,
          expected: memoryMean,
          deviation: Math.abs(metric.memory - memoryMean) / memoryStdDev
        });
      }
    });
    
    return {
      anomalies,
      summary: {
        total: anomalies.length,
        cpu_anomalies: anomalies.filter(a => a.type === 'cpu').length,
        memory_anomalies: anomalies.filter(a => a.type === 'memory').length
      }
    };
  }
}

module.exports = ResourceEstimationEngine;