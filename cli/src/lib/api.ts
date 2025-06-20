import axios, { AxiosInstance } from 'axios';
import { config } from './config.js';
import { EventEmitter } from 'events';

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.get('api.url') || process.env.DEVEX_API_URL || 'https://api.devxplatform.com',
      timeout: config.get('api.timeout') || 30000,
      headers: {
        'User-Agent': 'devex-cli/1.0.0',
        'Content-Type': 'application/json',
      },
    });

    // Add auth interceptor
    this.client.interceptors.request.use((request) => {
      const token = config.get('auth.token');
      if (token) {
        request.headers.Authorization = `Bearer ${token}`;
      }
      return request;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Clear invalid auth
          config.delete('auth.token');
          config.delete('auth.user');
          throw new Error('Authentication required. Please run "devex auth login"');
        }
        throw error.response?.data?.message || error.message;
      }
    );
  }

  // Auth methods
  async login(email: string, password: string) {
    const { data } = await this.client.post('/auth/login', { email, password });
    return data;
  }

  async validateToken(token: string) {
    const { data } = await this.client.get('/auth/validate', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data.user;
  }

  async initiateSSOAuth() {
    const { data } = await this.client.post('/auth/sso/initiate');
    return data.authUrl;
  }

  async pollSSOAuth(authUrl: string): Promise<string> {
    // Simulated SSO polling
    return new Promise((resolve) => {
      setTimeout(() => resolve('mock-sso-token'), 3000);
    });
  }

  async getCurrentUser() {
    const { data } = await this.client.get('/auth/me');
    return data;
  }

  async createAPIToken(name: string, expiresInDays: number) {
    const { data } = await this.client.post('/auth/tokens', { name, expiresInDays });
    return data;
  }

  async listAPITokens() {
    const { data } = await this.client.get('/auth/tokens');
    return data.tokens;
  }

  async revokeAPIToken(tokenId: string) {
    await this.client.delete(`/auth/tokens/${tokenId}`);
  }

  // Service methods - Updated for async job flow
  async createService(params: any) {
    try {
      const { data } = await this.client.post('/services', {
        name: params.name,
        template: params.template,
        environment: params.environment,
        resources: params.resources,
        configuration: params.configuration || {},
      });
      
      return {
        id: data.service.id,
        name: data.service.name,
        url: `https://${params.name}.devxplatform.com`,
        dashboardUrl: `https://dashboard.devxplatform.com/services/${params.name}`,
        status: data.service.status,
        jobId: data.job.jobId,
        statusUrl: data.job.statusUrl,
      };
    } catch (error: any) {
      console.error('Service creation failed:', error.response?.data?.message || error.message);
      throw new Error(error.response?.data?.message || 'Failed to create service');
    }
  }

  // Job status methods
  async getJobStatus(jobId: string, queue: string) {
    try {
      const { data } = await this.client.get(`/jobs/${jobId}?queue=${queue}`);
      return data.job;
    } catch (error: any) {
      console.error('Failed to get job status:', error.response?.data?.message || error.message);
      throw new Error(error.response?.data?.message || 'Failed to get job status');
    }
  }

  async cancelJob(jobId: string, queue: string) {
    try {
      const { data } = await this.client.post(`/jobs/${jobId}/cancel`, { queue });
      return data;
    } catch (error: any) {
      console.error('Failed to cancel job:', error.response?.data?.message || error.message);
      throw new Error(error.response?.data?.message || 'Failed to cancel job');
    }
  }

  async retryJob(jobId: string, queue: string) {
    try {
      const { data } = await this.client.post(`/jobs/${jobId}/retry`, { queue });
      return data;
    } catch (error: any) {
      console.error('Failed to retry job:', error.response?.data?.message || error.message);
      throw new Error(error.response?.data?.message || 'Failed to retry job');
    }
  }

  async getQueueStats() {
    try {
      const { data } = await this.client.get('/jobs/queues/stats');
      return data.queues;
    } catch (error: any) {
      console.error('Failed to get queue stats:', error.response?.data?.message || error.message);
      throw new Error(error.response?.data?.message || 'Failed to get queue stats');
    }
  }

  async listServices(filters?: any) {
    // Simulated API response
    return [
      {
        name: 'user-service',
        status: 'healthy',
        type: 'REST API',
        environment: 'production',
        instances: { running: 3, desired: 3 },
        resources: { cpu: 45, memory: 72 },
        uptime: 864000,
      },
      {
        name: 'payment-gateway',
        status: 'warning',
        type: 'gRPC Service',
        environment: 'production',
        instances: { running: 2, desired: 3 },
        resources: { cpu: 78, memory: 85 },
        uptime: 432000,
      },
    ];
  }

  async getService(name: string) {
    const { data } = await this.client.get(`/services/${name}`);
    return data;
  }

  async getServiceStatus(name: string) {
    // Simulated API response
    return {
      health: 'healthy',
      version: 'v2.3.1',
      environment: 'production',
      uptime: 864000,
      lastDeploy: new Date().toISOString(),
      instances: {
        running: 3,
        desired: 3,
        pending: 0,
        failed: 0,
      },
      resources: {
        cpu: 45,
        cpuCores: 2,
        memory: 72,
        memoryBytes: 1073741824,
        disk: 23,
        diskBytes: 10737418240,
      },
      metrics: {
        requests: 1250,
        errors: 3,
        errorRate: 0.24,
        avgLatency: 45,
        p99Latency: 120,
      },
      events: [
        {
          type: 'info',
          timestamp: new Date().toISOString(),
          message: 'Service scaled up to 3 instances',
        },
      ],
    };
  }

  async buildService(name: string, options: any) {
    const { data } = await this.client.post(`/services/${name}/build`, options);
    return data;
  }

  async runTests(name: string) {
    // Simulated test results
    return {
      passed: 42,
      failed: 0,
      total: 42,
    };
  }

  async deployService(name: string, options: any) {
    // Simulated deployment
    return {
      id: 'dep_' + Math.random().toString(36).substr(2, 9),
      version: options.tag || 'latest',
      status: 'in_progress',
      url: `https://${name}.devxplatform.com`,
      startTime: new Date().toISOString(),
    };
  }

  async getDeploymentStatus(deploymentId: string) {
    // Simulated deployment status
    return {
      healthy: true,
      readyInstances: 3,
      desiredInstances: 3,
    };
  }

  async getLogs(serviceName: string, options: any) {
    // Simulated logs
    const logs = [];
    const levels = ['info', 'debug', 'warn', 'error'];
    const messages = [
      'Service started successfully',
      'Handling request from user',
      'Database connection established',
      'Cache miss, fetching from database',
      'Request completed in 45ms',
    ];

    for (let i = 0; i < 20; i++) {
      logs.push({
        timestamp: new Date(Date.now() - i * 60000).toISOString(),
        level: levels[Math.floor(Math.random() * levels.length)],
        instance: `${serviceName}-${Math.floor(Math.random() * 3)}`,
        message: messages[Math.floor(Math.random() * messages.length)],
        fields: i % 3 === 0 ? { userId: '12345', requestId: 'req_abc123' } : {},
      });
    }

    return logs;
  }

  streamLogs(serviceName: string, options: any): EventEmitter {
    const emitter = new EventEmitter();
    
    // Simulate streaming logs
    const interval = setInterval(() => {
      const levels = ['info', 'debug', 'warn', 'error'];
      const messages = [
        'Processing request',
        'Query executed successfully',
        'Cache updated',
        'Health check passed',
        'Metrics published',
      ];

      emitter.emit('data', {
        timestamp: new Date().toISOString(),
        level: levels[Math.floor(Math.random() * levels.length)],
        instance: `${serviceName}-${Math.floor(Math.random() * 3)}`,
        message: messages[Math.floor(Math.random() * messages.length)],
      });
    }, 1000);

    // Clean up on destroy
    emitter.on('close', () => clearInterval(interval));
    emitter.destroy = () => {
      clearInterval(interval);
      emitter.emit('close');
    };

    return emitter;
  }

  async getPlatformStatus() {
    // Simulated platform status
    return {
      health: 'operational',
      version: '2024.1.0',
      region: 'us-west-2',
      uptime: 8640000,
      services: {
        total: 47,
        healthy: 45,
        warning: 2,
        error: 0,
      },
      resources: {
        cpuPercent: 42,
        memoryPercent: 58,
        memoryUsed: 137438953472,
        memoryTotal: 237179869184,
        activeUsers: 234,
        apiRequests: 15420,
      },
      components: {
        'API Gateway': { status: 'operational' },
        'Database Cluster': { status: 'operational' },
        'Message Queue': { status: 'operational' },
        'Object Storage': { status: 'operational' },
        'CDN': { status: 'operational' },
        'Monitoring': { status: 'operational' },
      },
      incidents: [],
    };
  }
}

export const api = new APIClient();