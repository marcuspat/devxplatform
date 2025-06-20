const { SimpleLinearRegression, PolynomialRegression } = require('ml-regression');
const { addDays, addMonths, format, differenceInDays, parseISO } = require('date-fns');

class CostProjectionService {
  constructor() {
    this.projectionModels = new Map();
    this.historicalData = new Map();
    this.seasonalFactors = {
      // Seasonal multipliers for different months (1.0 = normal, >1.0 = higher usage)
      1: 0.95,  // January - Post-holiday slowdown
      2: 0.92,  // February - Lowest usage
      3: 1.05,  // March - Spring uptick
      4: 1.08,  // April - 
      5: 1.12,  // May - 
      6: 1.15,  // June - Summer peak starts
      7: 1.18,  // July - Summer peak
      8: 1.15,  // August - Summer peak
      9: 1.10,  // September - Back to school/work
      10: 1.12, // October - 
      11: 1.20, // November - Black Friday/Holiday prep
      12: 1.25  // December - Holiday peak
    };
  }

  /**
   * Store historical cost data for analysis
   */
  storeHistoricalData(projectId, costData) {
    if (!this.historicalData.has(projectId)) {
      this.historicalData.set(projectId, []);
    }
    
    const projectData = this.historicalData.get(projectId);
    
    // Sort and deduplicate data
    const newData = costData.map(item => ({
      date: typeof item.date === 'string' ? parseISO(item.date) : item.date,
      cost: parseFloat(item.cost),
      usage: item.usage || {},
      services: item.services || {}
    }));
    
    projectData.push(...newData);
    projectData.sort((a, b) => a.date - b.date);
    
    // Remove duplicates
    const uniqueData = projectData.filter((item, index, arr) => 
      index === 0 || item.date.getTime() !== arr[index - 1].date.getTime()
    );
    
    this.historicalData.set(projectId, uniqueData);
    
    // Update projection model with new data
    this.updateProjectionModel(projectId);
  }

  /**
   * Update machine learning model for cost projection
   */
  updateProjectionModel(projectId) {
    const data = this.historicalData.get(projectId);
    if (!data || data.length < 3) {
      return; // Need at least 3 data points
    }

    // Prepare data for regression (days since first data point vs cost)
    const firstDate = data[0].date;
    const x = data.map(item => differenceInDays(item.date, firstDate));
    const y = data.map(item => item.cost);

    try {
      // Try polynomial regression first (better for seasonal patterns)
      if (data.length >= 6) {
        const polyRegression = new PolynomialRegression(x, y, 2);
        this.projectionModels.set(`${projectId}_poly`, polyRegression);
      }
      
      // Always create linear regression as fallback
      const linearRegression = new SimpleLinearRegression(x, y);
      this.projectionModels.set(`${projectId}_linear`, linearRegression);
      
    } catch (error) {
      console.error('Error updating projection model:', error);
    }
  }

  /**
   * Project future costs based on historical data
   */
  projectCosts(projectId, projectionPeriodMonths = 6) {
    const data = this.historicalData.get(projectId);
    if (!data || data.length < 2) {
      throw new Error('Insufficient historical data for projection');
    }

    const lastDate = data[data.length - 1].date;
    const firstDate = data[0].date;
    const projections = [];

    // Get the best available model
    const polyModel = this.projectionModels.get(`${projectId}_poly`);
    const linearModel = this.projectionModels.get(`${projectId}_linear`);
    const model = polyModel || linearModel;

    if (!model) {
      throw new Error('No projection model available');
    }

    // Generate projections for each month
    for (let month = 1; month <= projectionPeriodMonths; month++) {
      const projectionDate = addMonths(lastDate, month);
      const daysSinceFirst = differenceInDays(projectionDate, firstDate);
      
      // Base prediction from ML model
      const basePrediction = model.predict(daysSinceFirst);
      
      // Apply seasonal adjustment
      const seasonalFactor = this.seasonalFactors[projectionDate.getMonth() + 1] || 1.0;
      const seasonallyAdjusted = basePrediction * seasonalFactor;
      
      // Calculate confidence interval
      const confidence = this.calculateConfidenceInterval(data, basePrediction, month);
      
      projections.push({
        date: projectionDate,
        projectedCost: Math.max(0, seasonallyAdjusted),
        basePrediction,
        seasonalFactor,
        confidenceInterval: {
          lower: Math.max(0, seasonallyAdjusted - confidence),
          upper: seasonallyAdjusted + confidence
        },
        confidence: this.calculateConfidenceScore(data.length, month)
      });
    }

    return {
      projectId,
      projections,
      metadata: {
        dataPoints: data.length,
        projectionPeriod: projectionPeriodMonths,
        modelType: polyModel ? 'polynomial' : 'linear',
        lastDataPoint: lastDate,
        generatedAt: new Date()
      }
    };
  }

  /**
   * Calculate confidence interval for predictions
   */
  calculateConfidenceInterval(historicalData, prediction, monthsAhead) {
    if (historicalData.length < 3) return prediction * 0.3;

    // Calculate historical variance
    const costs = historicalData.map(d => d.cost);
    const mean = costs.reduce((sum, cost) => sum + cost, 0) / costs.length;
    const variance = costs.reduce((sum, cost) => sum + Math.pow(cost - mean, 2), 0) / costs.length;
    const stdDev = Math.sqrt(variance);

    // Increase uncertainty with projection distance
    const uncertaintyMultiplier = 1 + (monthsAhead * 0.1);
    
    return stdDev * uncertaintyMultiplier;
  }

  /**
   * Calculate confidence score (0-1)
   */
  calculateConfidenceScore(dataPoints, monthsAhead) {
    // Base confidence decreases with projection distance
    let confidence = Math.max(0.3, 0.9 - (monthsAhead * 0.05));
    
    // Increase confidence with more data points
    if (dataPoints >= 12) confidence += 0.1;
    else if (dataPoints >= 6) confidence += 0.05;
    
    return Math.min(0.95, confidence);
  }

  /**
   * Analyze cost trends and patterns
   */
  analyzeTrends(projectId) {
    const data = this.historicalData.get(projectId);
    if (!data || data.length < 3) {
      throw new Error('Insufficient data for trend analysis');
    }

    const costs = data.map(d => d.cost);
    const dates = data.map(d => d.date);
    
    // Calculate overall trend
    const firstCost = costs[0];
    const lastCost = costs[costs.length - 1];
    const totalGrowth = ((lastCost - firstCost) / firstCost) * 100;
    
    // Calculate monthly growth rate
    const monthlyGrowthRates = [];
    for (let i = 1; i < costs.length; i++) {
      const growth = ((costs[i] - costs[i-1]) / costs[i-1]) * 100;
      monthlyGrowthRates.push(growth);
    }
    
    const avgMonthlyGrowth = monthlyGrowthRates.reduce((sum, rate) => sum + rate, 0) / monthlyGrowthRates.length;
    
    // Detect anomalies (costs > 2 standard deviations from mean)
    const mean = costs.reduce((sum, cost) => sum + cost, 0) / costs.length;
    const stdDev = Math.sqrt(costs.reduce((sum, cost) => sum + Math.pow(cost - mean, 2), 0) / costs.length);
    const anomalies = data.filter(item => Math.abs(item.cost - mean) > 2 * stdDev);
    
    // Seasonal pattern analysis
    const seasonalAnalysis = this.analyzeSeasonalPatterns(data);
    
    return {
      projectId,
      trendAnalysis: {
        totalGrowth: totalGrowth.toFixed(2),
        avgMonthlyGrowth: avgMonthlyGrowth.toFixed(2),
        trend: avgMonthlyGrowth > 5 ? 'increasing' : avgMonthlyGrowth < -5 ? 'decreasing' : 'stable',
        volatility: (stdDev / mean * 100).toFixed(2) // Coefficient of variation
      },
      costStatistics: {
        min: Math.min(...costs),
        max: Math.max(...costs),
        average: mean,
        median: this.calculateMedian(costs),
        standardDeviation: stdDev
      },
      anomalies: anomalies.map(item => ({
        date: item.date,
        cost: item.cost,
        deviationFromMean: ((item.cost - mean) / mean * 100).toFixed(1)
      })),
      seasonalAnalysis,
      recommendations: this.generateTrendRecommendations(totalGrowth, avgMonthlyGrowth, anomalies.length)
    };
  }

  /**
   * Analyze seasonal patterns in cost data
   */
  analyzeSeasonalPatterns(data) {
    const monthlyAverages = {};
    const monthlyCounts = {};
    
    // Group costs by month
    data.forEach(item => {
      const month = item.date.getMonth() + 1; // 1-12
      if (!monthlyAverages[month]) {
        monthlyAverages[month] = 0;
        monthlyCounts[month] = 0;
      }
      monthlyAverages[month] += item.cost;
      monthlyCounts[month]++;
    });
    
    // Calculate averages
    for (const month in monthlyAverages) {
      monthlyAverages[month] /= monthlyCounts[month];
    }
    
    const yearlyAverage = Object.values(monthlyAverages).reduce((sum, avg) => sum + avg, 0) / Object.keys(monthlyAverages).length;
    
    // Calculate seasonal factors
    const seasonalFactors = {};
    for (const month in monthlyAverages) {
      seasonalFactors[month] = monthlyAverages[month] / yearlyAverage;
    }
    
    return {
      monthlyAverages,
      seasonalFactors,
      peakMonth: Object.keys(monthlyAverages).reduce((a, b) => monthlyAverages[a] > monthlyAverages[b] ? a : b),
      lowMonth: Object.keys(monthlyAverages).reduce((a, b) => monthlyAverages[a] < monthlyAverages[b] ? a : b)
    };
  }

  /**
   * Calculate median value
   */
  calculateMedian(values) {
    const sorted = values.slice().sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    } else {
      return sorted[middle];
    }
  }

  /**
   * Generate trend-based recommendations
   */
  generateTrendRecommendations(totalGrowth, avgMonthlyGrowth, anomalyCount) {
    const recommendations = [];
    
    if (avgMonthlyGrowth > 10) {
      recommendations.push({
        type: 'cost_optimization',
        priority: 'high',
        message: 'Rapidly increasing costs detected. Consider implementing cost optimization strategies.',
        action: 'Review resource usage and implement auto-scaling'
      });
    }
    
    if (anomalyCount > 2) {
      recommendations.push({
        type: 'monitoring',
        priority: 'medium',
        message: 'Multiple cost anomalies detected. Enhanced monitoring recommended.',
        action: 'Set up cost alerts and review resource provisioning'
      });
    }
    
    if (totalGrowth > 100) {
      recommendations.push({
        type: 'budget_review',
        priority: 'high',
        message: 'Costs have more than doubled. Budget review recommended.',
        action: 'Update budget allocations and consider cost controls'
      });
    }
    
    if (avgMonthlyGrowth < -10) {
      recommendations.push({
        type: 'underutilization',
        priority: 'medium',
        message: 'Decreasing costs may indicate underutilization of resources.',
        action: 'Review resource allocation and consider downsizing'
      });
    }
    
    return recommendations;
  }

  /**
   * Project costs for a new service based on similar services
   */
  projectNewServiceCosts(serviceType, requirements, similarProjects = []) {
    if (similarProjects.length === 0) {
      throw new Error('No similar projects provided for comparison');
    }

    const similarProjections = [];
    
    for (const projectId of similarProjects) {
      try {
        const projection = this.projectCosts(projectId, 3);
        similarProjections.push(projection);
      } catch (error) {
        console.warn(`Could not project costs for similar project ${projectId}:`, error.message);
      }
    }

    if (similarProjections.length === 0) {
      throw new Error('No valid projections from similar projects');
    }

    // Calculate average costs from similar projects
    const avgCosts = [];
    const projectionLength = Math.min(...similarProjections.map(p => p.projections.length));
    
    for (let i = 0; i < projectionLength; i++) {
      const monthCosts = similarProjections.map(p => p.projections[i].projectedCost);
      const avgCost = monthCosts.reduce((sum, cost) => sum + cost, 0) / monthCosts.length;
      avgCosts.push(avgCost);
    }

    // Apply scaling factor based on requirements comparison
    const scalingFactor = this.calculateScalingFactor(serviceType, requirements);
    
    const newServiceProjections = avgCosts.map((cost, index) => ({
      month: index + 1,
      projectedCost: cost * scalingFactor,
      confidence: Math.max(0.3, 0.7 - (index * 0.05)), // Decreasing confidence over time
      basedOnProjects: similarProjects.length
    }));

    return {
      serviceType,
      requirements,
      projections: newServiceProjections,
      scalingFactor,
      metadata: {
        basedOnProjects: similarProjects,
        generatedAt: new Date()
      }
    };
  }

  /**
   * Calculate scaling factor for new service projections
   */
  calculateScalingFactor(serviceType, requirements) {
    // Base scaling factors by service type
    const baseFactors = {
      'rest-api': 1.0,
      'graphql-api': 1.2,
      'grpc-service': 0.9,
      'webapp-nextjs': 1.5,
      'worker-service': 0.8,
      'database': 1.3
    };

    let scalingFactor = baseFactors[serviceType] || 1.0;

    // Adjust based on requirements
    if (requirements.expectedRequests > 100000) scalingFactor *= 1.5;
    else if (requirements.expectedRequests > 10000) scalingFactor *= 1.2;
    
    if (requirements.concurrentUsers > 1000) scalingFactor *= 1.3;
    else if (requirements.concurrentUsers > 100) scalingFactor *= 1.1;
    
    if (requirements.dataSize > 1000) scalingFactor *= 1.4; // GB
    else if (requirements.dataSize > 100) scalingFactor *= 1.2;

    return Math.min(scalingFactor, 3.0); // Cap at 3x
  }

  /**
   * Generate budget recommendations based on projections
   */
  generateBudgetRecommendations(projections, currentBudget) {
    const recommendations = [];
    const totalProjectedCost = projections.reduce((sum, p) => sum + p.projectedCost, 0);
    const budgetUtilization = (totalProjectedCost / currentBudget) * 100;

    if (budgetUtilization > 90) {
      recommendations.push({
        type: 'budget_increase',
        priority: 'high',
        message: `Projected costs (${totalProjectedCost.toFixed(2)}) will exceed 90% of current budget (${currentBudget})`,
        suggestedBudget: Math.ceil(totalProjectedCost * 1.2)
      });
    } else if (budgetUtilization < 50) {
      recommendations.push({
        type: 'budget_optimization',
        priority: 'low',
        message: `Projected costs are only ${budgetUtilization.toFixed(1)}% of current budget. Consider reallocating funds.`,
        suggestedBudget: Math.ceil(totalProjectedCost * 1.1)
      });
    }

    // Check for month-to-month variations
    const monthlyVariations = [];
    for (let i = 1; i < projections.length; i++) {
      const variation = ((projections[i].projectedCost - projections[i-1].projectedCost) / projections[i-1].projectedCost) * 100;
      monthlyVariations.push(variation);
    }

    const avgVariation = monthlyVariations.reduce((sum, v) => sum + Math.abs(v), 0) / monthlyVariations.length;
    if (avgVariation > 20) {
      recommendations.push({
        type: 'cost_smoothing',
        priority: 'medium',
        message: 'High cost variability detected. Consider reserved instances or committed use discounts.',
      });
    }

    return recommendations;
  }

  /**
   * Clear historical data and models
   */
  clearData(projectId = null) {
    if (projectId) {
      this.historicalData.delete(projectId);
      this.projectionModels.delete(`${projectId}_poly`);
      this.projectionModels.delete(`${projectId}_linear`);
    } else {
      this.historicalData.clear();
      this.projectionModels.clear();
    }
  }

  /**
   * Get service statistics
   */
  getServiceStats() {
    return {
      totalProjects: this.historicalData.size,
      totalModels: this.projectionModels.size,
      projectsWithData: Array.from(this.historicalData.keys()).map(projectId => ({
        projectId,
        dataPoints: this.historicalData.get(projectId).length,
        hasModel: this.projectionModels.has(`${projectId}_linear`)
      }))
    };
  }
}

module.exports = CostProjectionService;