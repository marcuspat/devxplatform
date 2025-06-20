/**
 * K6 Load Test Templates
 * These templates are written in TypeScript but will be transpiled to JS for k6
 */

// Base configuration types
export interface LoadTestConfig {
  baseUrl: string;
  duration: string;
  vus: number;
  thresholds?: Record<string, string[]>;
  scenarios?: Record<string, any>;
}

/**
 * Basic load test template
 */
export const basicLoadTest = `
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');

export const options = {
  vus: 10, // Virtual users
  duration: '30s',
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95% of requests must complete below 500ms
    'http_req_failed': ['rate<0.1'], // Error rate must be below 10%
    'errors': ['rate<0.1'] // Custom error rate
  },
};

export default function() {
  const res = http.get('__BASE_URL__/api/health');
  
  // Record custom metrics
  errorRate.add(res.status !== 200);
  apiLatency.add(res.timings.duration);
  
  // Checks
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'response has data': (r) => r.body.length > 0,
  });
  
  sleep(1);
}
`;

/**
 * Stress test template
 */
export const stressTestTemplate = `
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 300 }, // Ramp up to 300 users
    { duration: '5m', target: 300 }, // Stay at 300 users
    { duration: '10m', target: 0 }, // Ramp down to 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(90)<1000'], // 90% of requests under 1s
    'http_req_failed': ['rate<0.2'], // Error rate under 20%
  },
};

export default function() {
  const responses = http.batch([
    ['GET', '__BASE_URL__/api/users'],
    ['GET', '__BASE_URL__/api/products'],
    ['GET', '__BASE_URL__/api/orders'],
  ]);
  
  responses.forEach(res => {
    check(res, {
      'status is 200': (r) => r.status === 200,
    });
  });
}
`;

/**
 * Spike test template
 */
export const spikeTestTemplate = `
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 0 },
    { duration: '10s', target: 10 },
    { duration: '10s', target: 1000 }, // Spike to 1000 users
    { duration: '3m', target: 1000 }, // Stay at 1000
    { duration: '10s', target: 10 }, // Scale down
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000'], // 95% under 2s even during spike
    'http_req_failed': ['rate<0.5'], // Error rate under 50%
  },
};

export default function() {
  const res = http.get('__BASE_URL__/api/health');
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(0.1);
}
`;

/**
 * API endpoint test template
 */
export const apiEndpointTestTemplate = `
import http from 'k6/http';
import { check, group } from 'k6';
import { Rate } from 'k6/metrics';

const failureRate = new Rate('failed_requests');

export const options = {
  scenarios: {
    contacts: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 50,
      maxVUs: 100,
    },
  },
  thresholds: {
    'failed_requests': ['rate<0.1'],
    'http_req_duration': [
      'p(95)<500', // 95% of requests under 500ms
      'p(99)<1000', // 99% of requests under 1s
    ],
  },
};

const BASE_URL = '__BASE_URL__';

export default function() {
  const authToken = login();
  
  group('User API', () => {
    const headers = { 'Authorization': \`Bearer \${authToken}\` };
    
    // Get user profile
    let res = http.get(\`\${BASE_URL}/api/users/me\`, { headers });
    check(res, {
      'get profile status 200': (r) => r.status === 200,
      'profile has email': (r) => JSON.parse(r.body).email !== undefined,
    }) || failureRate.add(1);
    
    // Update user profile
    const payload = JSON.stringify({
      name: 'Updated Name',
      bio: 'Updated bio',
    });
    
    res = http.put(\`\${BASE_URL}/api/users/me\`, payload, {
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
    });
    
    check(res, {
      'update profile status 200': (r) => r.status === 200,
    }) || failureRate.add(1);
  });
  
  group('Product API', () => {
    // List products
    let res = http.get(\`\${BASE_URL}/api/products?limit=10\`);
    check(res, {
      'list products status 200': (r) => r.status === 200,
      'products is array': (r) => Array.isArray(JSON.parse(r.body).data),
    }) || failureRate.add(1);
    
    // Get single product
    const products = JSON.parse(res.body).data;
    if (products.length > 0) {
      res = http.get(\`\${BASE_URL}/api/products/\${products[0].id}\`);
      check(res, {
        'get product status 200': (r) => r.status === 200,
      }) || failureRate.add(1);
    }
  });
}

function login() {
  const res = http.post(\`\${BASE_URL}/api/auth/login\`, JSON.stringify({
    email: 'test@example.com',
    password: 'password123',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(res, {
    'login successful': (r) => r.status === 200,
  });
  
  return JSON.parse(res.body).token;
}
`;

/**
 * WebSocket test template
 */
export const websocketTestTemplate = `
import ws from 'k6/ws';
import { check } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

export default function() {
  const url = 'ws://__BASE_URL__/ws';
  const params = { tags: { my_tag: 'websocket' } };
  
  const res = ws.connect(url, params, function(socket) {
    socket.on('open', () => {
      console.log('WebSocket connection opened');
      
      // Send a message
      socket.send(JSON.stringify({
        type: 'subscribe',
        channel: 'updates',
      }));
      
      // Send periodic ping
      socket.setInterval(() => {
        socket.ping();
      }, 5000);
    });
    
    socket.on('message', (data) => {
      const message = JSON.parse(data);
      check(message, {
        'message has type': (m) => m.type !== undefined,
        'message has data': (m) => m.data !== undefined,
      });
    });
    
    socket.on('close', () => {
      console.log('WebSocket connection closed');
    });
    
    socket.on('error', (e) => {
      console.error('WebSocket error:', e);
    });
    
    // Keep connection open for 20 seconds
    socket.setTimeout(() => {
      socket.close();
    }, 20000);
  });
  
  check(res, { 'Connected successfully': (r) => r && r.status === 101 });
}
`;

/**
 * Database performance test template
 */
export const databasePerfTestTemplate = `
import http from 'k6/http';
import { check, group } from 'k6';
import { Trend } from 'k6/metrics';

// Custom metrics for database operations
const dbReadLatency = new Trend('db_read_latency');
const dbWriteLatency = new Trend('db_write_latency');
const dbQueryLatency = new Trend('db_query_latency');

export const options = {
  scenarios: {
    reads: {
      executor: 'constant-vus',
      vus: 20,
      duration: '5m',
      tags: { operation: 'read' },
    },
    writes: {
      executor: 'constant-vus',
      vus: 5,
      duration: '5m',
      tags: { operation: 'write' },
    },
    complex_queries: {
      executor: 'constant-vus',
      vus: 10,
      duration: '5m',
      tags: { operation: 'query' },
    },
  },
  thresholds: {
    'db_read_latency': ['p(95)<100'], // 95% of DB reads under 100ms
    'db_write_latency': ['p(95)<200'], // 95% of DB writes under 200ms
    'db_query_latency': ['p(95)<500'], // 95% of complex queries under 500ms
  },
};

const BASE_URL = '__BASE_URL__';

export default function() {
  const operation = __EXEC.scenario.tags.operation;
  
  switch (operation) {
    case 'read':
      testReads();
      break;
    case 'write':
      testWrites();
      break;
    case 'query':
      testComplexQueries();
      break;
  }
}

function testReads() {
  group('Database Reads', () => {
    // Simple read by ID
    let res = http.get(\`\${BASE_URL}/api/users/\${randomUserId()}\`);
    dbReadLatency.add(res.timings.duration);
    check(res, { 'read status 200': (r) => r.status === 200 });
    
    // List with pagination
    res = http.get(\`\${BASE_URL}/api/products?page=1&limit=20\`);
    dbReadLatency.add(res.timings.duration);
    check(res, { 'list status 200': (r) => r.status === 200 });
  });
}

function testWrites() {
  group('Database Writes', () => {
    // Create
    const payload = JSON.stringify({
      name: \`Product \${Date.now()}\`,
      price: Math.random() * 1000,
      category: 'test',
    });
    
    let res = http.post(\`\${BASE_URL}/api/products\`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    dbWriteLatency.add(res.timings.duration);
    check(res, { 'create status 201': (r) => r.status === 201 });
    
    // Update
    if (res.status === 201) {
      const productId = JSON.parse(res.body).id;
      const updatePayload = JSON.stringify({ price: Math.random() * 1000 });
      
      res = http.patch(\`\${BASE_URL}/api/products/\${productId}\`, updatePayload, {
        headers: { 'Content-Type': 'application/json' },
      });
      dbWriteLatency.add(res.timings.duration);
      check(res, { 'update status 200': (r) => r.status === 200 });
    }
  });
}

function testComplexQueries() {
  group('Complex Queries', () => {
    // Aggregation query
    let res = http.get(\`\${BASE_URL}/api/analytics/sales?groupBy=category&dateRange=30d\`);
    dbQueryLatency.add(res.timings.duration);
    check(res, { 'aggregation status 200': (r) => r.status === 200 });
    
    // Full-text search
    res = http.get(\`\${BASE_URL}/api/search?q=laptop&filters=category:electronics,price:100-1000\`);
    dbQueryLatency.add(res.timings.duration);
    check(res, { 'search status 200': (r) => r.status === 200 });
    
    // Complex join query
    res = http.get(\`\${BASE_URL}/api/users/\${randomUserId()}/orders?include=products,shipping\`);
    dbQueryLatency.add(res.timings.duration);
    check(res, { 'join query status 200': (r) => r.status === 200 });
  });
}

function randomUserId() {
  return Math.floor(Math.random() * 1000) + 1;
}
`;

/**
 * Load test generator class
 */
export class LoadTestGenerator {
  /**
   * Generate a custom load test script
   */
  static generate(config: LoadTestConfig, template: string): string {
    let script = template;
    
    // Replace placeholders
    script = script.replace(/__BASE_URL__/g, config.baseUrl);
    
    // Override options if provided
    if (config.vus || config.duration || config.thresholds || config.scenarios) {
      const options: any = {};
      
      if (config.vus) options.vus = config.vus;
      if (config.duration) options.duration = config.duration;
      if (config.thresholds) options.thresholds = config.thresholds;
      if (config.scenarios) options.scenarios = config.scenarios;
      
      script = script.replace(
        /export const options = {[^}]+};/,
        `export const options = ${JSON.stringify(options, null, 2)};`
      );
    }
    
    return script;
  }

  /**
   * Generate a test suite with multiple scenarios
   */
  static generateSuite(name: string, scenarios: Array<{
    name: string;
    config: LoadTestConfig;
    template: string;
  }>): string {
    const scripts = scenarios.map(scenario => {
      const script = this.generate(scenario.config, scenario.template);
      return `
// Scenario: ${scenario.name}
export function ${scenario.name.replace(/\s+/g, '_')}() {
${script}
}
      `;
    });
    
    return `
// Load Test Suite: ${name}
import { group } from 'k6';

${scripts.join('\n')}

export default function() {
  ${scenarios.map(s => `
  group('${s.name}', () => {
    ${s.name.replace(/\s+/g, '_')}();
  });`).join('\n')}
}
    `;
  }
}