class CostOptimizationEngine {
  constructor() {
    // Cost optimization rules and thresholds
    this.optimizationRules = {
      // CPU utilization thresholds
      cpu: {
        overprovisioned: 0.30, // Below 30% utilization
        underutilized: 0.50,   // Below 50% utilization
        optimal: 0.70,         // 50-70% is optimal
        overutilized: 0.90     // Above 90% needs scaling
      },
      // Memory utilization thresholds
      memory: {
        overprovisioned: 0.25,
        underutilized: 0.45,
        optimal: 0.65,
        overutilized: 0.85
      },
      // Storage utilization thresholds
      storage: {
        overprovisioned: 0.20,
        underutilized: 0.40,
        optimal: 0.70,
        overutilized: 0.90
      }
    };

    // Reserved instance savings (typical percentages)
    this.reservedInstanceSavings = {
      '1year': { upfront: 0.35, partial: 0.28, none: 0.20 },
      '3year': { upfront: 0.52, partial: 0.43, none: 0.33 }
    };

    // Spot instance average savings
    this.spotInstanceSavings = 0.70; // 70% average savings

    // Auto-scaling efficiency factors
    this.autoScalingFactors = {
      reactive: 0.15,  // 15% savings from reactive scaling
      predictive: 0.25, // 25% savings from predictive scaling
      scheduled: 0.30   // 30% savings from scheduled scaling
    };
  }

  /**
   * Analyze resource utilization and generate optimization recommendations
   */
  analyzeResourceUtilization(resourceMetrics, currentCosts, serviceConfig) {
    const recommendations = [];
    let potentialSavings = 0;

    // Analyze CPU utilization
    if (resourceMetrics.cpu) {
      const cpuAnalysis = this.analyzeCPUUtilization(resourceMetrics.cpu, currentCosts, serviceConfig);
      recommendations.push(...cpuAnalysis.recommendations);
      potentialSavings += cpuAnalysis.savings;
    }

    // Analyze Memory utilization
    if (resourceMetrics.memory) {
      const memoryAnalysis = this.analyzeMemoryUtilization(resourceMetrics.memory, currentCosts, serviceConfig);
      recommendations.push(...memoryAnalysis.recommendations);
      potentialSavings += memoryAnalysis.savings;
    }

    // Analyze Storage utilization
    if (resourceMetrics.storage) {
      const storageAnalysis = this.analyzeStorageUtilization(resourceMetrics.storage, currentCosts, serviceConfig);
      recommendations.push(...storageAnalysis.recommendations);
      potentialSavings += storageAnalysis.savings;
    }

    // Analyze Network costs
    if (resourceMetrics.network) {
      const networkAnalysis = this.analyzeNetworkCosts(resourceMetrics.network, currentCosts, serviceConfig);
      recommendations.push(...networkAnalysis.recommendations);
      potentialSavings += networkAnalysis.savings;
    }

    return {
      recommendations: this.prioritizeRecommendations(recommendations),
      totalPotentialSavings: potentialSavings,
      utilizationSummary: this.generateUtilizationSummary(resourceMetrics),
      optimizationScore: this.calculateOptimizationScore(resourceMetrics)
    };
  }

  /**
   * Analyze CPU utilization patterns
   */
  analyzeCPUUtilization(cpuMetrics, currentCosts, serviceConfig) {
    const recommendations = [];
    let savings = 0;
    const avgUtilization = cpuMetrics.average || 0;
    const peakUtilization = cpuMetrics.peak || 0;
    const variance = cpuMetrics.variance || 0;

    if (avgUtilization < this.optimizationRules.cpu.overprovisioned) {
      // Severe overprovisioning
      const recommendation = {
        type: 'rightsizing',
        category: 'cpu',
        priority: 'high',
        title: 'Severe CPU Overprovisioning Detected',
        description: `Average CPU utilization is only ${(avgUtilization * 100).toFixed(1)}%. Consider downsizing instances.`,
        action: 'Downsize CPU allocation by 50%',
        potentialSavings: currentCosts.compute * 0.4,
        confidence: 0.9,
        effort: 'medium'
      };
      recommendations.push(recommendation);
      savings += recommendation.potentialSavings;
    } else if (avgUtilization < this.optimizationRules.cpu.underutilized) {
      // Moderate underutilization
      const recommendation = {
        type: 'rightsizing',
        category: 'cpu',
        priority: 'medium',
        title: 'CPU Underutilization',
        description: `CPU utilization could be optimized (current: ${(avgUtilization * 100).toFixed(1)}%).`,
        action: 'Downsize CPU allocation by 25%',
        potentialSavings: currentCosts.compute * 0.2,
        confidence: 0.75,
        effort: 'low'
      };
      recommendations.push(recommendation);
      savings += recommendation.potentialSavings;
    }

    if (peakUtilization > this.optimizationRules.cpu.overutilized && variance > 0.3) {
      // High variance with peaks suggests need for auto-scaling
      const recommendation = {
        type: 'auto_scaling',
        category: 'cpu',
        priority: 'high',
        title: 'Implement CPU-based Auto Scaling',
        description: `High CPU variance (${(variance * 100).toFixed(1)}%) with peaks at ${(peakUtilization * 100).toFixed(1)}%.`,
        action: 'Configure horizontal auto-scaling',
        potentialSavings: currentCosts.compute * this.autoScalingFactors.predictive,
        confidence: 0.8,
        effort: 'high'
      };
      recommendations.push(recommendation);
      savings += recommendation.potentialSavings;
    }

    return { recommendations, savings };
  }

  /**
   * Analyze Memory utilization patterns
   */
  analyzeMemoryUtilization(memoryMetrics, currentCosts, serviceConfig) {
    const recommendations = [];
    let savings = 0;
    const avgUtilization = memoryMetrics.average || 0;
    const peakUtilization = memoryMetrics.peak || 0;

    if (avgUtilization < this.optimizationRules.memory.overprovisioned) {
      const recommendation = {
        type: 'rightsizing',
        category: 'memory',
        priority: 'high',
        title: 'Memory Overprovisioning',
        description: `Memory utilization is very low (${(avgUtilization * 100).toFixed(1)}%).`,
        action: 'Reduce memory allocation by 40%',
        potentialSavings: currentCosts.compute * 0.3,
        confidence: 0.85,
        effort: 'medium'
      };
      recommendations.push(recommendation);
      savings += recommendation.potentialSavings;
    }

    // Memory leak detection
    if (memoryMetrics.trend && memoryMetrics.trend === 'increasing') {
      const recommendation = {
        type: 'optimization',
        category: 'memory',
        priority: 'high',
        title: 'Potential Memory Leak Detected',
        description: 'Memory usage shows consistent upward trend.',
        action: 'Investigate and fix memory leaks',
        potentialSavings: currentCosts.compute * 0.15,
        confidence: 0.7,
        effort: 'high'
      };
      recommendations.push(recommendation);
      savings += recommendation.potentialSavings;
    }

    return { recommendations, savings };
  }

  /**
   * Analyze Storage utilization and costs
   */
  analyzeStorageUtilization(storageMetrics, currentCosts, serviceConfig) {
    const recommendations = [];
    let savings = 0;

    // Storage tiering recommendations
    if (storageMetrics.accessPattern) {
      const infrequentAccess = storageMetrics.accessPattern.infrequent || 0;
      const archiveEligible = storageMetrics.accessPattern.archive || 0;

      if (infrequentAccess > 0.3) {
        const recommendation = {
          type: 'storage_tiering',
          category: 'storage',
          priority: 'medium',
          title: 'Move to Infrequent Access Storage',
          description: `${(infrequentAccess * 100).toFixed(1)}% of storage is infrequently accessed.`,
          action: 'Migrate to cheaper storage tier',
          potentialSavings: currentCosts.storage * infrequentAccess * 0.4,
          confidence: 0.8,
          effort: 'low'
        };
        recommendations.push(recommendation);
        savings += recommendation.potentialSavings;
      }

      if (archiveEligible > 0.2) {
        const recommendation = {
          type: 'storage_archiving',
          category: 'storage',
          priority: 'low',
          title: 'Archive Old Data',
          description: `${(archiveEligible * 100).toFixed(1)}% of storage could be archived.`,
          action: 'Move to archive storage',
          potentialSavings: currentCosts.storage * archiveEligible * 0.7,
          confidence: 0.75,
          effort: 'medium'
        };
        recommendations.push(recommendation);
        savings += recommendation.potentialSavings;
      }
    }

    // Snapshot optimization
    if (storageMetrics.snapshots && storageMetrics.snapshots.retention > 90) {
      const recommendation = {
        type: 'snapshot_optimization',
        category: 'storage',
        priority: 'low',
        title: 'Optimize Snapshot Retention',
        description: 'Long snapshot retention period detected.',
        action: 'Reduce snapshot retention to 30 days',
        potentialSavings: currentCosts.storage * 0.15,
        confidence: 0.6,
        effort: 'low'
      };
      recommendations.push(recommendation);
      savings += recommendation.potentialSavings;
    }

    return { recommendations, savings };
  }

  /**
   * Analyze Network costs and patterns
   */
  analyzeNetworkCosts(networkMetrics, currentCosts, serviceConfig) {
    const recommendations = [];
    let savings = 0;

    // CDN recommendations
    if (networkMetrics.bandwidth && networkMetrics.bandwidth.outbound > 1000) { // GB/month
      const staticContent = networkMetrics.staticContentRatio || 0.6;
      if (staticContent > 0.4 && !serviceConfig.hasCDN) {
        const recommendation = {
          type: 'cdn_implementation',
          category: 'network',
          priority: 'high',
          title: 'Implement Content Delivery Network',
          description: `${(staticContent * 100).toFixed(1)}% of bandwidth is static content.`,
          action: 'Deploy CDN for static assets',
          potentialSavings: currentCosts.network * staticContent * 0.6,
          confidence: 0.85,
          effort: 'medium'
        };
        recommendations.push(recommendation);
        savings += recommendation.potentialSavings;
      }
    }

    // Data compression
    if (!serviceConfig.hasCompression && networkMetrics.compressibleRatio > 0.5) {
      const recommendation = {
        type: 'data_compression',
        category: 'network',
        priority: 'medium',
        title: 'Enable Data Compression',
        description: 'Significant bandwidth savings possible through compression.',
        action: 'Enable gzip/brotli compression',
        potentialSavings: currentCosts.network * 0.3,
        confidence: 0.8,
        effort: 'low'
      };
      recommendations.push(recommendation);
      savings += recommendation.potentialSavings;
    }

    return { recommendations, savings };
  }

  /**
   * Analyze reserved instance opportunities
   */
  analyzeReservedInstanceOpportunities(usageMetrics, currentCosts, provider = 'aws') {
    const recommendations = [];
    let savings = 0;

    // Check for consistent usage patterns
    const consistentUsage = usageMetrics.consistency || 0; // 0-1 score
    const avgUtilization = usageMetrics.avgUtilization || 0;

    if (consistentUsage > 0.7 && avgUtilization > 0.6) {
      // Strong candidate for reserved instances
      const oneYearSavings = currentCosts.compute * this.reservedInstanceSavings['1year'].partial;
      const threeYearSavings = currentCosts.compute * this.reservedInstanceSavings['3year'].partial;

      recommendations.push({
        type: 'reserved_instances',
        category: 'pricing',
        priority: 'high',
        title: '1-Year Reserved Instance Opportunity',
        description: `Consistent usage pattern (${(consistentUsage * 100).toFixed(1)}% consistency) detected.`,
        action: 'Purchase 1-year partial upfront reserved instances',
        potentialSavings: oneYearSavings,
        confidence: 0.9,
        effort: 'low'
      });

      recommendations.push({
        type: 'reserved_instances',
        category: 'pricing',
        priority: 'medium',
        title: '3-Year Reserved Instance Opportunity',
        description: 'Consider longer-term commitment for maximum savings.',
        action: 'Purchase 3-year partial upfront reserved instances',
        potentialSavings: threeYearSavings,
        confidence: 0.75,
        effort: 'low'
      });

      savings += Math.max(oneYearSavings, threeYearSavings);
    }

    return { recommendations, savings };
  }

  /**
   * Analyze spot instance opportunities
   */
  analyzeSpotInstanceOpportunities(workloadCharacteristics, currentCosts) {
    const recommendations = [];
    let savings = 0;

    const isStateless = workloadCharacteristics.stateless || false;
    const faultTolerant = workloadCharacteristics.faultTolerant || false;
    const batchProcessing = workloadCharacteristics.batchProcessing || false;

    if ((isStateless || faultTolerant || batchProcessing) && workloadCharacteristics.flexibleTiming) {
      const spotSavings = currentCosts.compute * this.spotInstanceSavings;
      
      const recommendation = {
        type: 'spot_instances',
        category: 'pricing',
        priority: 'medium',
        title: 'Spot Instance Opportunity',
        description: 'Workload characteristics suitable for spot instances.',
        action: 'Migrate fault-tolerant workloads to spot instances',
        potentialSavings: spotSavings,
        confidence: 0.7,
        effort: 'high',
        risks: ['Instance interruption', 'Requires fault-tolerant architecture']
      };
      
      recommendations.push(recommendation);
      savings += spotSavings;
    }

    return { recommendations, savings };
  }

  /**
   * Generate database-specific optimization recommendations
   */
  analyzeDatabaseOptimization(dbMetrics, currentCosts, dbConfig) {
    const recommendations = [];
    let savings = 0;

    // Connection pooling
    if (dbMetrics.connections && dbMetrics.connections.max > 100 && !dbConfig.hasConnectionPooling) {
      const recommendation = {
        type: 'connection_pooling',
        category: 'database',
        priority: 'medium',
        title: 'Implement Connection Pooling',
        description: 'High connection count without pooling detected.',
        action: 'Configure connection pooling',
        potentialSavings: currentCosts.database * 0.15,
        confidence: 0.8,
        effort: 'medium'
      };
      recommendations.push(recommendation);
      savings += recommendation.potentialSavings;
    }

    // Read replicas for read-heavy workloads
    if (dbMetrics.readWriteRatio && dbMetrics.readWriteRatio > 3) {
      const recommendation = {
        type: 'read_replicas',
        category: 'database',
        priority: 'medium',
        title: 'Add Read Replicas',
        description: `High read-to-write ratio (${dbMetrics.readWriteRatio}:1) detected.`,
        action: 'Deploy read replicas to reduce primary load',
        potentialSavings: currentCosts.database * 0.2,
        confidence: 0.75,
        effort: 'high'
      };
      recommendations.push(recommendation);
      savings += recommendation.potentialSavings;
    }

    // Index optimization
    if (dbMetrics.slowQueries && dbMetrics.slowQueries > 0.05) { // 5% slow queries
      const recommendation = {
        type: 'query_optimization',
        category: 'database',
        priority: 'high',
        title: 'Optimize Database Queries',
        description: `${(dbMetrics.slowQueries * 100).toFixed(1)}% of queries are slow.`,
        action: 'Review and optimize slow queries, add indexes',
        potentialSavings: currentCosts.database * 0.25,
        confidence: 0.85,
        effort: 'high'
      };
      recommendations.push(recommendation);
      savings += recommendation.potentialSavings;
    }

    return { recommendations, savings };
  }

  /**
   * Prioritize recommendations based on impact and effort
   */
  prioritizeRecommendations(recommendations) {
    return recommendations.sort((a, b) => {
      // Priority score based on savings, confidence, and inverse effort
      const scoreA = (a.potentialSavings * a.confidence) / this.getEffortScore(a.effort);
      const scoreB = (b.potentialSavings * b.confidence) / this.getEffortScore(b.effort);
      
      return scoreB - scoreA;
    });
  }

  /**
   * Convert effort level to numeric score
   */
  getEffortScore(effort) {
    const effortScores = { low: 1, medium: 2, high: 3 };
    return effortScores[effort] || 2;
  }

  /**
   * Generate utilization summary
   */
  generateUtilizationSummary(resourceMetrics) {
    const summary = {};
    
    if (resourceMetrics.cpu) {
      summary.cpu = {
        status: this.getUtilizationStatus(resourceMetrics.cpu.average, 'cpu'),
        average: (resourceMetrics.cpu.average * 100).toFixed(1) + '%',
        peak: (resourceMetrics.cpu.peak * 100).toFixed(1) + '%'
      };
    }
    
    if (resourceMetrics.memory) {
      summary.memory = {
        status: this.getUtilizationStatus(resourceMetrics.memory.average, 'memory'),
        average: (resourceMetrics.memory.average * 100).toFixed(1) + '%',
        peak: (resourceMetrics.memory.peak * 100).toFixed(1) + '%'
      };
    }
    
    if (resourceMetrics.storage) {
      summary.storage = {
        status: this.getUtilizationStatus(resourceMetrics.storage.utilization, 'storage'),
        utilization: (resourceMetrics.storage.utilization * 100).toFixed(1) + '%'
      };
    }
    
    return summary;
  }

  /**
   * Get utilization status label
   */
  getUtilizationStatus(utilization, resourceType) {
    const rules = this.optimizationRules[resourceType];
    
    if (utilization < rules.overprovisioned) return 'severely_overprovisioned';
    if (utilization < rules.underutilized) return 'underutilized';
    if (utilization <= rules.optimal) return 'optimal';
    if (utilization <= rules.overutilized) return 'well_utilized';
    return 'overutilized';
  }

  /**
   * Calculate optimization score (0-100)
   */
  calculateOptimizationScore(resourceMetrics) {
    let totalScore = 0;
    let resourceCount = 0;

    // Score each resource type
    if (resourceMetrics.cpu) {
      totalScore += this.getResourceScore(resourceMetrics.cpu.average, 'cpu');
      resourceCount++;
    }
    
    if (resourceMetrics.memory) {
      totalScore += this.getResourceScore(resourceMetrics.memory.average, 'memory');
      resourceCount++;
    }
    
    if (resourceMetrics.storage) {
      totalScore += this.getResourceScore(resourceMetrics.storage.utilization, 'storage');
      resourceCount++;
    }

    return resourceCount > 0 ? Math.round(totalScore / resourceCount) : 0;
  }

  /**
   * Get resource optimization score (0-100)
   */
  getResourceScore(utilization, resourceType) {
    const rules = this.optimizationRules[resourceType];
    
    if (utilization < rules.overprovisioned) return 20;
    if (utilization < rules.underutilized) return 40;
    if (utilization <= rules.optimal) return 100;
    if (utilization <= rules.overutilized) return 80;
    return 30; // Overutilized
  }

  /**
   * Generate cost optimization action plan
   */
  generateActionPlan(recommendations, timeline = 'quarterly') {
    const actionPlan = {
      immediate: [], // 0-30 days
      shortTerm: [], // 1-3 months
      longTerm: []   // 3+ months
    };

    recommendations.forEach(rec => {
      if (rec.effort === 'low' && rec.priority === 'high') {
        actionPlan.immediate.push(rec);
      } else if (rec.effort === 'medium' || rec.priority === 'medium') {
        actionPlan.shortTerm.push(rec);
      } else {
        actionPlan.longTerm.push(rec);
      }
    });

    return {
      actionPlan,
      timeline,
      totalPotentialSavings: recommendations.reduce((sum, rec) => sum + rec.potentialSavings, 0),
      implementationComplexity: this.assessImplementationComplexity(recommendations)
    };
  }

  /**
   * Assess overall implementation complexity
   */
  assessImplementationComplexity(recommendations) {
    const effortCounts = { low: 0, medium: 0, high: 0 };
    
    recommendations.forEach(rec => {
      effortCounts[rec.effort]++;
    });

    if (effortCounts.high > effortCounts.low + effortCounts.medium) {
      return 'high';
    } else if (effortCounts.medium > effortCounts.low) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Generate executive summary of optimization opportunities
   */
  generateExecutiveSummary(analysis) {
    const totalSavings = analysis.totalPotentialSavings;
    const highPriorityRecs = analysis.recommendations.filter(r => r.priority === 'high').length;
    const quickWins = analysis.recommendations.filter(r => r.effort === 'low' && r.priority === 'high').length;

    return {
      overview: `Identified ${analysis.recommendations.length} optimization opportunities with potential savings of $${totalSavings.toFixed(2)} per month.`,
      keyFindings: [
        `${highPriorityRecs} high-priority recommendations requiring immediate attention`,
        `${quickWins} quick wins available for immediate implementation`,
        `Overall optimization score: ${analysis.optimizationScore}/100`
      ],
      nextSteps: [
        'Implement quick wins within 30 days',
        'Develop plan for medium-effort optimizations',
        'Conduct detailed analysis for complex recommendations'
      ],
      riskAssessment: this.assessOptimizationRisks(analysis.recommendations)
    };
  }

  /**
   * Assess risks associated with optimization recommendations
   */
  assessOptimizationRisks(recommendations) {
    const risks = [];
    
    const hasSpotInstances = recommendations.some(r => r.type === 'spot_instances');
    if (hasSpotInstances) {
      risks.push('Spot instance implementations may increase operational complexity');
    }
    
    const hasRightsizing = recommendations.some(r => r.type === 'rightsizing');
    if (hasRightsizing) {
      risks.push('Resource rightsizing requires careful performance monitoring');
    }
    
    const hasArchitecture = recommendations.some(r => r.effort === 'high');
    if (hasArchitecture) {
      risks.push('Some recommendations require significant architectural changes');
    }

    return risks.length > 0 ? risks : ['Low risk - most recommendations are operational improvements'];
  }
}

module.exports = CostOptimizationEngine;