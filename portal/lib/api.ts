import { io, Socket } from 'socket.io-client';
import { apiClient as authApiClient } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  language: string;
  framework: string;
  rating: number;
  downloads: number;
  lastUpdated: string;
  features: string[];
  icon: string;
  resources: {
    cpu: number;
    memory: number;
  };
}

export interface Service {
  id: string;
  name: string;
  type: string;
  status: 'healthy' | 'warning' | 'error' | 'provisioning' | 'running' | 'deploying' | 'stopped' | 'unknown';
  version: string;
  instances: number | { running: number; desired: number; pending: number; failed: number };
  cpu: number;
  memory: number;
  requests: string;
  environment: string;
  uptime: number;
  cost?: number;
  template: any;
  createdAt?: string;
  slug?: string;
  url?: string;
  resources?: {
    cpu: number;
    memory: number;
    disk: number;
    network_in: number;
    network_out: number;
  };
  metrics?: {
    requests_per_minute: number;
    errors_per_minute: number;
    avg_response_time: number;
    p99_response_time: number;
  };
}

export interface ServiceCreationJob {
  id: string;
  serviceId: string;
  serviceName: string;
  status: 'initializing' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  steps: string[];
  currentStep: number;
  createdAt: string;
}

export interface CostSummary {
  currentMonth: number;
  lastMonth: number;
  projected: number;
  changePercent: string;
}

export interface CostData {
  summary: CostSummary;
  trend: Array<{ month: string; cost: number }>;
  breakdown: Array<{ category: string; cost: number; percentage: number }>;
  topServices: Array<{ name: string; cost: number; percentage: number }>;
}

export interface PlatformHealth {
  overall: string;
  services: {
    total: number;
    healthy: number;
    warning: number;
    error: number;
  };
  resources: {
    cpuPercent: number;
    memoryPercent: number;
    activeUsers: number;
    apiRequests: number;
  };
  components: Record<string, { status: string }>;
}

class APIClient {
  private baseURL: string;
  private socket: Socket | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private async fetchAPI<T>(endpoint: string, options: any = {}): Promise<T> {
    try {
      const response = await authApiClient({
        url: endpoint,
        method: options.method || 'GET',
        data: options.body ? JSON.parse(options.body) : undefined,
        ...options,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || 'API request failed');
    }
  }

  // Templates API
  async getTemplates(): Promise<Template[]> {
    const data = await this.fetchAPI<{ templates: Template[] }>('/api/templates');
    return data.templates;
  }

  async getTemplate(id: string): Promise<Template> {
    const data = await this.fetchAPI<{ template: Template }>(`/api/templates/${id}`);
    return data.template;
  }

  // Services API
  async getServices(): Promise<Service[]> {
    const data = await this.fetchAPI<{ success: boolean; data: { services: Service[] } }>('/api/services');
    return data.data.services;
  }

  async getService(id: string): Promise<Service> {
    const data = await this.fetchAPI<{ service: Service }>(`/api/services/${id}`);
    return data.service;
  }

  async createService(params: {
    name: string;
    template: string;
    environment?: string;
    resources?: {
      cpu?: number;
      memory?: number;
    };
  }): Promise<{ service: Service; jobId: string }> {
    return this.fetchAPI<{ service: Service; jobId: string }>('/api/services', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getServiceProgress(serviceId: string): Promise<ServiceCreationJob> {
    return this.fetchAPI<ServiceCreationJob>(`/api/services/${serviceId}/progress`);
  }

  // Cost Analytics API
  async getCosts(): Promise<CostData> {
    return this.fetchAPI<CostData>('/api/costs');
  }

  // Platform Health API
  async getPlatformHealth(): Promise<PlatformHealth> {
    return this.fetchAPI<PlatformHealth>('/api/health');
  }

  // WebSocket connection for real-time updates
  connectSocket(): Socket {
    if (!this.socket) {
      this.socket = io(this.baseURL, {
        transports: ['websocket', 'polling'],
      });
    }
    return this.socket;
  }

  subscribeToServiceProgress(serviceId: string, callback: (job: ServiceCreationJob) => void): () => void {
    const socket = this.connectSocket();
    
    socket.emit('subscribe-service-progress', serviceId);
    socket.on('service-progress', callback);

    // Return cleanup function
    return () => {
      socket.off('service-progress', callback);
    };
  }

  disconnectSocket(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.fetchAPI<{ status: string; timestamp: string }>('/health');
  }

  // Deployment APIs
  async deployService(serviceSlug: string): Promise<{ deployment: any }> {
    return this.fetchAPI<{ deployment: any }>(`/api/services/${serviceSlug}/deploy`, {
      method: 'POST',
    });
  }

  // Terminal APIs
  async createTerminalSession(): Promise<{ terminal_url?: string; ssh_command?: string }> {
    return this.fetchAPI<{ terminal_url?: string; ssh_command?: string }>('/api/terminal/create', {
      method: 'POST',
    });
  }

  // Project Import APIs
  async importProject(importData: {
    name: string;
    repository_url?: string;
    git_url?: string;
    technology?: string;
    framework?: string;
  }): Promise<{ project: any }> {
    return this.fetchAPI<{ project: any }>('/api/projects/import', {
      method: 'POST',
      body: JSON.stringify(importData),
    });
  }
}

// Create and export a singleton instance
export const apiClient = new APIClient();

// Export error types for better error handling
export class APIError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'APIError';
  }
}

// Utility function to handle API errors
export const handleAPIError = (error: any): string => {
  if (error instanceof APIError) {
    return error.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};