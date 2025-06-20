import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { trace, context, Span, SpanStatusCode } from '@opentelemetry/api';
import { Request, Response, NextFunction } from 'express';

export interface TracingConfig {
  serviceName: string;
  jaegerEndpoint?: string;
  enableAutoInstrumentation?: boolean;
  sampleRate?: number;
}

class TracingService {
  private sdk: NodeSDK | null = null;
  private serviceName: string;

  constructor(config: TracingConfig) {
    this.serviceName = config.serviceName;

    const jaegerExporter = new JaegerExporter({
      endpoint: config.jaegerEndpoint || process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
    });

    const resource = Resource.default().merge(
      new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
      })
    );

    this.sdk = new NodeSDK({
      resource,
      spanProcessor: new BatchSpanProcessor(jaegerExporter),
      instrumentations: config.enableAutoInstrumentation !== false ? [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': {
            enabled: false, // Disable fs instrumentation to reduce noise
          },
        })
      ] : []
    });
  }

  async start(): Promise<void> {
    try {
      await this.sdk?.start();
      console.log('Tracing initialized');
    } catch (error) {
      console.error('Error initializing tracing:', error);
    }
  }

  async shutdown(): Promise<void> {
    try {
      await this.sdk?.shutdown();
      console.log('Tracing terminated');
    } catch (error) {
      console.error('Error terminating tracing:', error);
    }
  }

  getTracer(name?: string) {
    return trace.getTracer(name || this.serviceName);
  }

  // Helper method to create spans
  createSpan(name: string, fn: (span: Span) => Promise<any>): Promise<any> {
    const tracer = this.getTracer();
    return tracer.startActiveSpan(name, async (span) => {
      try {
        const result = await fn(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    });
  }
}

// Express middleware for tracing
export function tracingMiddleware(serviceName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const tracer = trace.getTracer(serviceName);
    const span = tracer.startSpan(`${req.method} ${req.path}`);
    
    // Add span attributes
    span.setAttributes({
      'http.method': req.method,
      'http.url': req.url,
      'http.target': req.path,
      'http.host': req.hostname,
      'http.scheme': req.protocol,
      'http.user_agent': req.get('user-agent') || '',
      'correlation.id': req.headers['x-correlation-id'] || '',
    });

    // Store span in request for later use
    (req as any).span = span;

    // Capture response details
    const originalSend = res.send;
    res.send = function(data: any) {
      span.setAttributes({
        'http.status_code': res.statusCode,
        'http.response.size': Buffer.byteLength(data),
      });
      
      if (res.statusCode >= 400) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `HTTP ${res.statusCode}`
        });
      }
      
      span.end();
      return originalSend.call(this, data);
    };

    context.with(trace.setSpan(context.active(), span), () => {
      next();
    });
  };
}

// Factory function for creating tracing service
export function createTracingService(config: TracingConfig): TracingService {
  return new TracingService(config);
}

// Helper to extract trace context from headers
export function extractTraceContext(headers: any): any {
  return {
    traceId: headers['x-trace-id'],
    spanId: headers['x-span-id'],
    traceFlags: headers['x-trace-flags']
  };
}

// Helper to inject trace context into headers
export function injectTraceContext(span: Span, headers: any): void {
  const spanContext = span.spanContext();
  headers['x-trace-id'] = spanContext.traceId;
  headers['x-span-id'] = spanContext.spanId;
  headers['x-trace-flags'] = spanContext.traceFlags.toString();
}