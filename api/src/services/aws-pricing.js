// Try to load AWS SDK, fall back to mock if not available
let AWS;
try {
  AWS = require('aws-sdk');
} catch (error) {
  console.warn('AWS SDK not found, using mock pricing data');
  AWS = null;
}

class AWSPricingService {
  constructor() {
    this.mockMode = !AWS;
    
    if (AWS) {
      // Initialize AWS Pricing API client
      this.pricing = new AWS.Pricing({
        region: 'us-east-1', // Pricing API is only available in us-east-1
        apiVersion: '2017-10-15'
      });

      // Initialize Cost Explorer for historical data
      this.costExplorer = new AWS.CostExplorer({
        region: 'us-east-1',
        apiVersion: '2017-10-25'
      });
    }

    // Cache for pricing data to reduce API calls
    this.priceCache = new Map();
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
    
    // Mock pricing data for when AWS SDK is not available
    this.mockPricing = {
      'ec2': {
        't3.micro': { onDemand: 0.0104, spot: 0.0031 },
        't3.small': { onDemand: 0.0208, spot: 0.0062 },
        't3.medium': { onDemand: 0.0416, spot: 0.0125 },
        't3.large': { onDemand: 0.0832, spot: 0.0250 },
        't3.xlarge': { onDemand: 0.1664, spot: 0.0499 }
      },
      'rds': {
        'db.t3.micro': { onDemand: 0.017 },
        'db.t3.small': { onDemand: 0.034 },
        'db.t3.medium': { onDemand: 0.068 }
      },
      's3': {
        'standard': 0.023,
        'standardIA': 0.0125,
        'glacier': 0.004
      }
    };
  }

  /**
   * Get pricing for AWS EC2 instances
   */
  async getEC2Pricing(instanceType, region = 'us-east-1', tenancy = 'Shared') {
    const cacheKey = `ec2-${instanceType}-${region}-${tenancy}`;
    
    if (this.priceCache.has(cacheKey)) {
      const cached = this.priceCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }
    }

    // Use mock data if AWS SDK is not available
    if (this.mockMode) {
      const mockPrice = this.mockPricing.ec2[instanceType] || this.mockPricing.ec2['t3.micro'];
      const pricingData = {
        instanceType,
        region,
        hourlyRate: mockPrice.onDemand,
        monthlyRate: mockPrice.onDemand * 24 * 30.44,
        currency: 'USD',
        specs: {
          vcpu: instanceType.includes('micro') ? '1' : instanceType.includes('small') ? '1' : '2',
          memory: instanceType.includes('micro') ? '1 GiB' : instanceType.includes('small') ? '2 GiB' : '4 GiB',
          storage: 'EBS only',
          networkPerformance: 'Up to 5 Gigabit'
        }
      };

      // Cache the result
      this.priceCache.set(cacheKey, {
        data: pricingData,
        timestamp: Date.now()
      });

      return pricingData;
    }

    try {
      const params = {
        ServiceCode: 'AmazonEC2',
        Filters: [
          {
            Type: 'TERM_MATCH',
            Field: 'instanceType',
            Value: instanceType
          },
          {
            Type: 'TERM_MATCH',
            Field: 'location',
            Value: this.getLocationName(region)
          },
          {
            Type: 'TERM_MATCH',
            Field: 'tenancy',
            Value: tenancy
          },
          {
            Type: 'TERM_MATCH',
            Field: 'operatingSystem',
            Value: 'Linux'
          },
          {
            Type: 'TERM_MATCH',
            Field: 'preInstalledSw',
            Value: 'NA'
          }
        ]
      };

      const result = await this.pricing.getProducts(params).promise();
      
      if (result.PriceList && result.PriceList.length > 0) {
        const product = JSON.parse(result.PriceList[0]);
        const onDemandPricing = this.extractOnDemandPricing(product);
        
        const pricingData = {
          instanceType,
          region,
          hourlyRate: onDemandPricing.pricePerHour,
          monthlyRate: onDemandPricing.pricePerHour * 24 * 30.44, // Average month hours
          currency: onDemandPricing.currency,
          specs: product.product.attributes
        };

        // Cache the result
        this.priceCache.set(cacheKey, {
          data: pricingData,
          timestamp: Date.now()
        });

        return pricingData;
      }

      throw new Error(`No pricing data found for instance type: ${instanceType}`);
    } catch (error) {
      console.error('Error fetching EC2 pricing:', error);
      throw error;
    }
  }

  /**
   * Get pricing for RDS instances
   */
  async getRDSPricing(instanceClass, engine = 'mysql', region = 'us-east-1') {
    const cacheKey = `rds-${instanceClass}-${engine}-${region}`;
    
    if (this.priceCache.has(cacheKey)) {
      const cached = this.priceCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }
    }

    try {
      const params = {
        ServiceCode: 'AmazonRDS',
        Filters: [
          {
            Type: 'TERM_MATCH',
            Field: 'instanceType',
            Value: instanceClass
          },
          {
            Type: 'TERM_MATCH',
            Field: 'location',
            Value: this.getLocationName(region)
          },
          {
            Type: 'TERM_MATCH',
            Field: 'databaseEngine',
            Value: engine
          },
          {
            Type: 'TERM_MATCH',
            Field: 'deploymentOption',
            Value: 'Single-AZ'
          }
        ]
      };

      const result = await this.pricing.getProducts(params).promise();
      
      if (result.PriceList && result.PriceList.length > 0) {
        const product = JSON.parse(result.PriceList[0]);
        const onDemandPricing = this.extractOnDemandPricing(product);
        
        const pricingData = {
          instanceClass,
          engine,
          region,
          hourlyRate: onDemandPricing.pricePerHour,
          monthlyRate: onDemandPricing.pricePerHour * 24 * 30.44,
          currency: onDemandPricing.currency,
          specs: product.product.attributes
        };

        this.priceCache.set(cacheKey, {
          data: pricingData,
          timestamp: Date.now()
        });

        return pricingData;
      }

      throw new Error(`No pricing data found for RDS instance: ${instanceClass}`);
    } catch (error) {
      console.error('Error fetching RDS pricing:', error);
      throw error;
    }
  }

  /**
   * Get S3 storage pricing
   */
  async getS3Pricing(storageClass = 'Standard', region = 'us-east-1') {
    const cacheKey = `s3-${storageClass}-${region}`;
    
    if (this.priceCache.has(cacheKey)) {
      const cached = this.priceCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }
    }

    try {
      const params = {
        ServiceCode: 'AmazonS3',
        Filters: [
          {
            Type: 'TERM_MATCH',
            Field: 'location',
            Value: this.getLocationName(region)
          },
          {
            Type: 'TERM_MATCH',
            Field: 'storageClass',
            Value: storageClass
          },
          {
            Type: 'TERM_MATCH',
            Field: 'volumeType',
            Value: 'Standard'
          }
        ]
      };

      const result = await this.pricing.getProducts(params).promise();
      
      if (result.PriceList && result.PriceList.length > 0) {
        const product = JSON.parse(result.PriceList[0]);
        const onDemandPricing = this.extractOnDemandPricing(product);
        
        const pricingData = {
          storageClass,
          region,
          pricePerGB: onDemandPricing.pricePerHour, // For S3, this is actually per GB-month
          currency: onDemandPricing.currency,
          specs: product.product.attributes
        };

        this.priceCache.set(cacheKey, {
          data: pricingData,
          timestamp: Date.now()
        });

        return pricingData;
      }

      throw new Error(`No pricing data found for S3 storage class: ${storageClass}`);
    } catch (error) {
      console.error('Error fetching S3 pricing:', error);
      throw error;
    }
  }

  /**
   * Get historical cost data using Cost Explorer
   */
  async getHistoricalCosts(startDate, endDate, granularity = 'MONTHLY', groupBy = ['SERVICE']) {
    try {
      const params = {
        TimePeriod: {
          Start: format(startDate, 'yyyy-MM-dd'),
          End: format(endDate, 'yyyy-MM-dd')
        },
        Granularity: granularity,
        Metrics: ['BlendedCost', 'UnblendedCost', 'UsageQuantity'],
        GroupBy: groupBy.map(dimension => ({
          Type: 'DIMENSION',
          Key: dimension
        }))
      };

      const result = await this.costExplorer.getCostAndUsage(params).promise();
      
      return {
        timePeriod: result.TimePeriod,
        total: result.Total,
        resultsByTime: result.ResultsByTime.map(period => ({
          timePeriod: period.TimePeriod,
          total: period.Total,
          groups: period.Groups?.map(group => ({
            keys: group.Keys,
            metrics: group.Metrics
          }))
        })),
        dimensionKey: result.DimensionKey
      };
    } catch (error) {
      console.error('Error fetching historical costs:', error);
      throw error;
    }
  }

  /**
   * Get cost and usage forecast
   */
  async getCostForecast(startDate, endDate, metric = 'BLENDED_COST') {
    try {
      const params = {
        TimePeriod: {
          Start: format(startDate, 'yyyy-MM-dd'),
          End: format(endDate, 'yyyy-MM-dd')
        },
        Metric: metric,
        Granularity: 'MONTHLY'
      };

      const result = await this.costExplorer.getCostForecast(params).promise();
      
      return {
        total: result.Total,
        forecastResultsByTime: result.ForecastResultsByTime.map(period => ({
          timePeriod: period.TimePeriod,
          meanValue: period.MeanValue,
          predictionIntervalLowerBound: period.PredictionIntervalLowerBound,
          predictionIntervalUpperBound: period.PredictionIntervalUpperBound
        }))
      };
    } catch (error) {
      console.error('Error fetching cost forecast:', error);
      throw error;
    }
  }

  /**
   * Extract on-demand pricing from product data
   */
  extractOnDemandPricing(product) {
    const terms = product.terms;
    const onDemand = terms.OnDemand;
    
    if (!onDemand) {
      throw new Error('No on-demand pricing found');
    }

    const termKey = Object.keys(onDemand)[0];
    const priceDimensions = onDemand[termKey].priceDimensions;
    const dimensionKey = Object.keys(priceDimensions)[0];
    const pricePerUnit = priceDimensions[dimensionKey].pricePerUnit;
    
    return {
      pricePerHour: parseFloat(pricePerUnit.USD || '0'),
      currency: 'USD',
      unit: priceDimensions[dimensionKey].unit
    };
  }

  /**
   * Convert AWS region code to location name used in pricing API
   */
  getLocationName(region) {
    const regionMap = {
      'us-east-1': 'US East (N. Virginia)',
      'us-east-2': 'US East (Ohio)',
      'us-west-1': 'US West (N. California)',
      'us-west-2': 'US West (Oregon)',
      'eu-west-1': 'Europe (Ireland)',
      'eu-west-2': 'Europe (London)',
      'eu-west-3': 'Europe (Paris)',
      'eu-central-1': 'Europe (Frankfurt)',
      'ap-southeast-1': 'Asia Pacific (Singapore)',
      'ap-southeast-2': 'Asia Pacific (Sydney)',
      'ap-northeast-1': 'Asia Pacific (Tokyo)',
      'ap-northeast-2': 'Asia Pacific (Seoul)',
      'ap-south-1': 'Asia Pacific (Mumbai)',
      'ca-central-1': 'Canada (Central)',
      'sa-east-1': 'South America (Sao Paulo)'
    };

    return regionMap[region] || 'US East (N. Virginia)';
  }

  /**
   * Clear pricing cache
   */
  clearCache() {
    this.priceCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.priceCache.size,
      keys: Array.from(this.priceCache.keys())
    };
  }
}

module.exports = AWSPricingService;