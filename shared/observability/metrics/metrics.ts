import { Registry, Counter, Histogram, Gauge, Summary, register } from 'prom-client';
import { Request, Response, NextFunction } from 'express';

export interface MetricsConfig {
  serviceName: string;
  customMetrics?: CustomMetricDefinition[];
  enableDefaultMetrics?: boolean;
}

export interface CustomMetricDefinition {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  help: string;
  labelNames?: string[];
  buckets?: number[]; // For histogram
  percentiles?: number[]; // For summary
}

class MetricsService {
  private registry: Registry;
  private metrics: Map<string, Counter | Gauge | Histogram | Summary> = new Map();
  private serviceName: string;

  // Default metrics
  private httpRequestDuration: Histogram;
  private httpRequestTotal: Counter;
  private httpRequestErrors: Counter;
  private activeConnections: Gauge;

  constructor(config: MetricsConfig) {
    this.serviceName = config.serviceName;
    this.registry = new Registry();
    
    // Enable default Node.js metrics
    if (config.enableDefaultMetrics !== false) {
      const collectDefaultMetrics = require('prom-client').collectDefaultMetrics;
      collectDefaultMetrics({ register: this.registry });
    }

    // Initialize default HTTP metrics
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry]
    });

    this.httpRequestTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry]
    });

    this.httpRequestErrors = new Counter({
      name: 'http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'error_type'],
      registers: [this.registry]
    });

    this.activeConnections = new Gauge({
      name: 'http_active_connections',
      help: 'Number of active HTTP connections',
      registers: [this.registry]
    });

    // Register custom metrics
    if (config.customMetrics) {
      config.customMetrics.forEach(metric => this.registerCustomMetric(metric));
    }
  }

  private registerCustomMetric(definition: CustomMetricDefinition): void {
    const baseConfig = {
      name: definition.name,
      help: definition.help,
      labelNames: definition.labelNames || [],
      registers: [this.registry]
    };

    let metric: Counter | Gauge | Histogram | Summary;

    switch (definition.type) {
      case 'counter':
        metric = new Counter(baseConfig);
        break;
      case 'gauge':
        metric = new Gauge(baseConfig);
        break;
      case 'histogram':
        metric = new Histogram({
          ...baseConfig,
          buckets: definition.buckets || [0.1, 0.5, 1, 2, 5, 10]
        });
        break;
      case 'summary':
        metric = new Summary({
          ...baseConfig,
          percentiles: definition.percentiles || [0.5, 0.9, 0.95, 0.99]
        });
        break;
    }

    this.metrics.set(definition.name, metric);
  }

  // Get a custom metric
  getMetric(name: string): Counter | Gauge | Histogram | Summary | undefined {
    return this.metrics.get(name);
  }

  // Increment a counter
  incrementCounter(name: string, labels?: Record<string, string>, value: number = 1): void {
    const metric = this.metrics.get(name);
    if (metric && metric instanceof Counter) {
      if (labels) {
        metric.labels(labels).inc(value);
      } else {
        metric.inc(value);
      }
    }
  }

  // Set a gauge value
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const metric = this.metrics.get(name);
    if (metric && metric instanceof Gauge) {
      if (labels) {
        metric.labels(labels).set(value);
      } else {
        metric.set(value);
      }
    }
  }

  // Observe a histogram value
  observeHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const metric = this.metrics.get(name);
    if (metric && metric instanceof Histogram) {
      if (labels) {
        metric.labels(labels).observe(value);
      } else {
        metric.observe(value);
      }
    }
  }

  // Get metrics for Prometheus endpoint
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  // Get metrics content type
  getContentType(): string {
    return this.registry.contentType;
  }

  // Express middleware for collecting HTTP metrics
  httpMetricsMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      this.activeConnections.inc();

      // Capture the route pattern
      const route = req.route?.path || req.path;

      res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const labels = {
          method: req.method,
          route: route,
          status_code: res.statusCode.toString()
        };

        this.httpRequestDuration.observe(labels, duration);
        this.httpRequestTotal.inc(labels);
        this.activeConnections.dec();

        if (res.statusCode >= 400) {
          this.httpRequestErrors.inc({
            method: req.method,
            route: route,
            error_type: res.statusCode >= 500 ? 'server_error' : 'client_error'
          });
        }
      });

      next();
    };
  }
}

// Factory function for creating metrics service
export function createMetricsService(config: MetricsConfig): MetricsService {
  return new MetricsService(config);
}

// Express endpoint for metrics
export function metricsEndpoint(metricsService: MetricsService) {
  return async (_req: Request, res: Response) => {
    try {
      const metrics = await metricsService.getMetrics();
      res.set('Content-Type', metricsService.getContentType());
      res.end(metrics);
    } catch (error) {
      res.status(500).end();
    }
  };
}

// Helper for measuring async operation duration
export async function measureDuration<T>(
  histogram: Histogram,
  labels: Record<string, string>,
  operation: () => Promise<T>
): Promise<T> {
  const end = histogram.startTimer(labels);
  try {
    return await operation();
  } finally {
    end();
  }
}