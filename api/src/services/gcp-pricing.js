// Try to load Google APIs, fall back to mock if not available
let google;
try {
  google = require('googleapis').google;
} catch (error) {
  console.warn('Google APIs not found, using mock pricing data');
  google = null;
}

class GCPPricingService {
  constructor() {
    this.mockMode = !google;
    
    if (google) {
      // Initialize Google Cloud Billing API
      this.auth = null;
      this.billing = null;
      this.cloudbilling = null;
      this.initializeAuth();
    }
    
    // Cache for pricing data
    this.priceCache = new Map();
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
    
    // Mock pricing data for when Google APIs is not available
    this.mockPricing = {
      'compute': {
        'e2-micro': { price: 0.008, cpu: 0.25, memory: 1 },
        'e2-small': { price: 0.016, cpu: 0.5, memory: 2 },
        'e2-medium': { price: 0.032, cpu: 1, memory: 4 },
        'e2-standard-2': { price: 0.064, cpu: 2, memory: 8 },
        'e2-standard-4': { price: 0.128, cpu: 4, memory: 16 }
      },
      'cloudsql': {
        'db-f1-micro': { price: 0.0175, cpu: 1, memory: 0.6 },
        'db-g1-small': { price: 0.035, cpu: 1, memory: 1.7 },
        'db-n1-standard-1': { price: 0.070, cpu: 1, memory: 3.75 }
      },
      'storage': {
        'standard': 0.020,
        'nearline': 0.010,
        'coldline': 0.004,
        'archive': 0.0012
      }
    };
  }

  /**
   * Initialize Google Cloud authentication
   */
  async initializeAuth() {
    if (this.mockMode) {
      console.log('GCP Pricing Service initialized in mock mode');
      return;
    }

    try {
      // Use service account or application default credentials
      this.auth = new google.auth.GoogleAuth({
        scopes: [
          'https://www.googleapis.com/auth/cloud-platform',
          'https://www.googleapis.com/auth/cloud-billing'
        ]
      });

      // Initialize billing API
      this.cloudbilling = google.cloudbilling({
        version: 'v1',
        auth: this.auth
      });

      // Initialize billing budgets API for cost tracking
      this.billingbudgets = google.billingbudgets({
        version: 'v1',
        auth: this.auth
      });

      console.log('GCP Pricing Service initialized');
    } catch (error) {
      console.error('Error initializing GCP auth:', error);
    }
  }

  /**
   * Get Compute Engine pricing
   */
  async getComputeEnginePricing(machineType, region = 'us-central1') {
    const cacheKey = `gce-${machineType}-${region}`;
    
    if (this.priceCache.has(cacheKey)) {
      const cached = this.priceCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }
    }

    // Use mock data if Google APIs is not available
    if (this.mockMode) {
      const mockPrice = this.mockPricing.compute[machineType] || this.mockPricing.compute['e2-micro'];
      const pricingData = {
        machineType,
        region,
        hourlyRate: mockPrice.price,
        monthlyRate: mockPrice.price * 24 * 30.44,
        currency: 'USD',
        unit: 'hour',
        description: `${machineType} running in ${region}`,
        category: 'Compute',
        specs: {
          cpu: mockPrice.cpu,
          memory: mockPrice.memory
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
      // Get SKUs for Compute Engine
      const response = await this.cloudbilling.services.skus.list({
        parent: 'services/6F81-5844-456A', // Compute Engine service ID
        currencyCode: 'USD'
      });

      const skus = response.data.skus;
      
      // Filter for the specific machine type and region
      const relevantSkus = skus.filter(sku => {
        const description = sku.description.toLowerCase();
        return description.includes(machineType.toLowerCase()) && 
               description.includes('running in') &&
               sku.serviceRegions.includes(region);
      });

      if (relevantSkus.length === 0) {
        throw new Error(`No pricing data found for machine type: ${machineType} in region: ${region}`);
      }

      const sku = relevantSkus[0];
      const pricingInfo = sku.pricingInfo[0];
      const tieredRates = pricingInfo.pricingExpression.tieredRates;
      
      // Get the base rate (usually the first tier)
      const baseRate = tieredRates[0];
      const hourlyRate = (baseRate.unitPrice.nanos / 1000000000 + baseRate.unitPrice.units) / 1000000; // Convert to standard units

      const pricingData = {
        machineType,
        region,
        hourlyRate: hourlyRate,
        monthlyRate: hourlyRate * 24 * 30.44,
        currency: pricingInfo.currencyCode,
        unit: pricingInfo.pricingExpression.usageUnit,
        description: sku.description,
        category: sku.category.resourceFamily
      };

      // Cache the result
      this.priceCache.set(cacheKey, {
        data: pricingData,
        timestamp: Date.now()
      });

      return pricingData;
    } catch (error) {
      console.error('Error fetching GCE pricing:', error);
      throw error;
    }
  }

  /**
   * Get Cloud SQL pricing
   */
  async getCloudSQLPricing(tier, region = 'us-central1') {
    const cacheKey = `cloudsql-${tier}-${region}`;
    
    if (this.priceCache.has(cacheKey)) {
      const cached = this.priceCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }
    }

    try {
      const response = await this.cloudbilling.services.skus.list({
        parent: 'services/9662-B51E-5089', // Cloud SQL service ID
        currencyCode: 'USD'
      });

      const skus = response.data.skus;
      
      const relevantSkus = skus.filter(sku => {
        const description = sku.description.toLowerCase();
        return description.includes(tier.toLowerCase()) && 
               description.includes('sql') &&
               sku.serviceRegions.includes(region);
      });

      if (relevantSkus.length === 0) {
        throw new Error(`No pricing data found for Cloud SQL tier: ${tier} in region: ${region}`);
      }

      const sku = relevantSkus[0];
      const pricingInfo = sku.pricingInfo[0];
      const tieredRates = pricingInfo.pricingExpression.tieredRates;
      const baseRate = tieredRates[0];
      const hourlyRate = (baseRate.unitPrice.nanos / 1000000000 + baseRate.unitPrice.units) / 1000000;

      const pricingData = {
        tier,
        region,
        hourlyRate: hourlyRate,
        monthlyRate: hourlyRate * 24 * 30.44,
        currency: pricingInfo.currencyCode,
        unit: pricingInfo.pricingExpression.usageUnit,
        description: sku.description,
        category: sku.category.resourceFamily
      };

      this.priceCache.set(cacheKey, {
        data: pricingData,
        timestamp: Date.now()
      });

      return pricingData;
    } catch (error) {
      console.error('Error fetching Cloud SQL pricing:', error);
      throw error;
    }
  }

  /**
   * Get Cloud Storage pricing
   */
  async getCloudStoragePricing(storageClass = 'STANDARD', region = 'us-central1') {
    const cacheKey = `storage-${storageClass}-${region}`;
    
    if (this.priceCache.has(cacheKey)) {
      const cached = this.priceCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }
    }

    try {
      const response = await this.cloudbilling.services.skus.list({
        parent: 'services/95FF-2EF5-5EA1', // Cloud Storage service ID
        currencyCode: 'USD'
      });

      const skus = response.data.skus;
      
      const relevantSkus = skus.filter(sku => {
        const description = sku.description.toLowerCase();
        return description.includes(storageClass.toLowerCase()) && 
               description.includes('storage') &&
               sku.serviceRegions.includes(region);
      });

      if (relevantSkus.length === 0) {
        throw new Error(`No pricing data found for storage class: ${storageClass} in region: ${region}`);
      }

      const sku = relevantSkus[0];
      const pricingInfo = sku.pricingInfo[0];
      const tieredRates = pricingInfo.pricingExpression.tieredRates;
      const baseRate = tieredRates[0];
      const monthlyRate = (baseRate.unitPrice.nanos / 1000000000 + baseRate.unitPrice.units) / 1000000;

      const pricingData = {
        storageClass,
        region,
        pricePerGB: monthlyRate,
        currency: pricingInfo.currencyCode,
        unit: pricingInfo.pricingExpression.usageUnit,
        description: sku.description,
        category: sku.category.resourceFamily
      };

      this.priceCache.set(cacheKey, {
        data: pricingData,
        timestamp: Date.now()
      });

      return pricingData;
    } catch (error) {
      console.error('Error fetching Cloud Storage pricing:', error);
      throw error;
    }
  }

  /**
   * Get Cloud Run pricing
   */
  async getCloudRunPricing(region = 'us-central1') {
    const cacheKey = `cloudrun-${region}`;
    
    if (this.priceCache.has(cacheKey)) {
      const cached = this.priceCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }
    }

    try {
      const response = await this.cloudbilling.services.skus.list({
        parent: 'services/152E-C115-5142', // Cloud Run service ID
        currencyCode: 'USD'
      });

      const skus = response.data.skus;
      
      const cpuSku = skus.find(sku => 
        sku.description.toLowerCase().includes('cpu') && 
        sku.serviceRegions.includes(region)
      );
      
      const memorySku = skus.find(sku => 
        sku.description.toLowerCase().includes('memory') && 
        sku.serviceRegions.includes(region)
      );

      const requestSku = skus.find(sku => 
        sku.description.toLowerCase().includes('request') && 
        sku.serviceRegions.includes(region)
      );

      const pricingData = {
        region,
        cpu: this.extractPricingFromSku(cpuSku),
        memory: this.extractPricingFromSku(memorySku),
        requests: this.extractPricingFromSku(requestSku),
        serviceType: 'Cloud Run'
      };

      this.priceCache.set(cacheKey, {
        data: pricingData,
        timestamp: Date.now()
      });

      return pricingData;
    } catch (error) {
      console.error('Error fetching Cloud Run pricing:', error);
      throw error;
    }
  }

  /**
   * Get billing account information
   */
  async getBillingAccounts() {
    try {
      const response = await this.cloudbilling.billingAccounts.list();
      return response.data.billingAccounts || [];
    } catch (error) {
      console.error('Error fetching billing accounts:', error);
      throw error;
    }
  }

  /**
   * Get project billing info
   */
  async getProjectBillingInfo(projectId) {
    try {
      const response = await this.cloudbilling.projects.getBillingInfo({
        name: `projects/${projectId}`
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching project billing info:', error);
      throw error;
    }
  }

  /**
   * Get service list with pricing
   */
  async getServices() {
    try {
      const response = await this.cloudbilling.services.list();
      return response.data.services || [];
    } catch (error) {
      console.error('Error fetching services:', error);
      throw error;
    }
  }

  /**
   * Extract pricing information from SKU
   */
  extractPricingFromSku(sku) {
    if (!sku || !sku.pricingInfo || sku.pricingInfo.length === 0) {
      return null;
    }

    const pricingInfo = sku.pricingInfo[0];
    const tieredRates = pricingInfo.pricingExpression.tieredRates;
    const baseRate = tieredRates[0];
    const price = (baseRate.unitPrice.nanos / 1000000000 + baseRate.unitPrice.units) / 1000000;

    return {
      price,
      currency: pricingInfo.currencyCode,
      unit: pricingInfo.pricingExpression.usageUnit,
      description: sku.description
    };
  }

  /**
   * Estimate monthly costs for a typical application
   */
  async estimateApplicationCost(config) {
    try {
      const estimates = {};
      
      // Compute Engine estimates
      if (config.computeEngine) {
        const pricing = await this.getComputeEnginePricing(
          config.computeEngine.machineType,
          config.computeEngine.region
        );
        estimates.computeEngine = {
          instances: config.computeEngine.instances || 1,
          monthlyRate: pricing.monthlyRate * (config.computeEngine.instances || 1),
          details: pricing
        };
      }

      // Cloud SQL estimates
      if (config.cloudSQL) {
        const pricing = await this.getCloudSQLPricing(
          config.cloudSQL.tier,
          config.cloudSQL.region
        );
        estimates.cloudSQL = {
          instances: config.cloudSQL.instances || 1,
          monthlyRate: pricing.monthlyRate * (config.cloudSQL.instances || 1),
          details: pricing
        };
      }

      // Cloud Storage estimates
      if (config.cloudStorage) {
        const pricing = await this.getCloudStoragePricing(
          config.cloudStorage.storageClass,
          config.cloudStorage.region
        );
        estimates.cloudStorage = {
          sizeGB: config.cloudStorage.sizeGB || 100,
          monthlyRate: pricing.pricePerGB * (config.cloudStorage.sizeGB || 100),
          details: pricing
        };
      }

      // Cloud Run estimates
      if (config.cloudRun) {
        const pricing = await this.getCloudRunPricing(config.cloudRun.region);
        const cpuHours = (config.cloudRun.requests || 1000000) * (config.cloudRun.avgRequestTime || 0.1) / 3600;
        const memoryGBHours = cpuHours * (config.cloudRun.memoryGB || 0.5);
        
        estimates.cloudRun = {
          requests: config.cloudRun.requests || 1000000,
          cpuCost: pricing.cpu.price * cpuHours,
          memoryCost: pricing.memory.price * memoryGBHours,
          requestCost: pricing.requests.price * (config.cloudRun.requests || 1000000),
          monthlyRate: (pricing.cpu.price * cpuHours) + 
                      (pricing.memory.price * memoryGBHours) + 
                      (pricing.requests.price * (config.cloudRun.requests || 1000000)),
          details: pricing
        };
      }

      // Calculate total
      const totalMonthlyRate = Object.values(estimates).reduce((sum, estimate) => {
        return sum + (estimate.monthlyRate || 0);
      }, 0);

      return {
        estimates,
        totalMonthlyRate,
        currency: 'USD',
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error estimating application cost:', error);
      throw error;
    }
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

module.exports = GCPPricingService;