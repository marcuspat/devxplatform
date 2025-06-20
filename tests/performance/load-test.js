import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const successRate = new Rate('success');
const apiLatency = new Trend('api_latency');
const apiThroughput = new Counter('api_throughput');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 users
    { duration: '5m', target: 50 },   // Ramp up to 50 users
    { duration: '10m', target: 100 }, // Stay at 100 users
    { duration: '5m', target: 200 },  // Ramp up to 200 users
    { duration: '10m', target: 200 }, // Stay at 200 users
    { duration: '5m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'], // 95% of requests under 1s, 99% under 2s
    http_req_failed: ['rate<0.05'],                   // Error rate under 5%
    errors: ['rate<0.05'],                            // Custom error rate under 5%
    success: ['rate>0.95'],                           // Success rate above 95%
  },
  ext: {
    loadimpact: {
      projectID: 3478725,
      name: 'API Load Test',
    },
  },
};

// Test setup
export function setup() {
  // Perform any setup tasks
  const res = http.get(`${__ENV.BASE_URL || 'http://localhost:8080'}/health`);
  check(res, {
    'Setup - API is healthy': (r) => r.status === 200,
  });
  return { baseUrl: __ENV.BASE_URL || 'http://localhost:8080' };
}

// Virtual user scenario
export default function (data) {
  const baseUrl = data.baseUrl;
  
  // Scenario 1: Health check
  const healthRes = http.get(`${baseUrl}/health`, {
    tags: { name: 'HealthCheck' },
  });
  
  check(healthRes, {
    'Health check status is 200': (r) => r.status === 200,
    'Health check response time < 100ms': (r) => r.timings.duration < 100,
  });
  
  errorRate.add(healthRes.status !== 200);
  successRate.add(healthRes.status === 200);
  
  sleep(1);
  
  // Scenario 2: API Status
  const statusRes = http.get(`${baseUrl}/api/v1/status`, {
    tags: { name: 'APIStatus' },
  });
  
  check(statusRes, {
    'API status is 200': (r) => r.status === 200,
    'API status has correct content type': (r) => r.headers['Content-Type'] === 'application/json',
    'API status response is valid': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'ok';
      } catch (e) {
        return false;
      }
    },
  });
  
  apiLatency.add(statusRes.timings.duration);
  apiThroughput.add(1);
  errorRate.add(statusRes.status !== 200);
  successRate.add(statusRes.status === 200);
  
  sleep(2);
  
  // Scenario 3: Create resource (POST)
  const payload = JSON.stringify({
    name: `Test Item ${__VU}-${__ITER}`,
    description: 'Load test item',
    value: Math.floor(Math.random() * 1000),
  });
  
  const createRes = http.post(`${baseUrl}/api/v1/items`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.API_TOKEN || 'test-token'}`,
    },
    tags: { name: 'CreateItem' },
  });
  
  const itemId = createRes.status === 201 ? JSON.parse(createRes.body).id : null;
  
  check(createRes, {
    'Create item status is 201': (r) => r.status === 201,
    'Create item returns ID': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.id !== undefined;
      } catch (e) {
        return false;
      }
    },
  });
  
  apiLatency.add(createRes.timings.duration);
  apiThroughput.add(1);
  errorRate.add(createRes.status !== 201);
  successRate.add(createRes.status === 201);
  
  sleep(1);
  
  // Scenario 4: Read resource (GET)
  if (itemId) {
    const getRes = http.get(`${baseUrl}/api/v1/items/${itemId}`, {
      headers: {
        'Authorization': `Bearer ${__ENV.API_TOKEN || 'test-token'}`,
      },
      tags: { name: 'GetItem' },
    });
    
    check(getRes, {
      'Get item status is 200': (r) => r.status === 200,
      'Get item returns correct ID': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.id === itemId;
        } catch (e) {
          return false;
        }
      },
    });
    
    apiLatency.add(getRes.timings.duration);
    apiThroughput.add(1);
    errorRate.add(getRes.status !== 200);
    successRate.add(getRes.status === 200);
  }
  
  sleep(1);
  
  // Scenario 5: List resources with pagination
  const listRes = http.get(`${baseUrl}/api/v1/items?page=1&limit=10`, {
    headers: {
      'Authorization': `Bearer ${__ENV.API_TOKEN || 'test-token'}`,
    },
    tags: { name: 'ListItems' },
  });
  
  check(listRes, {
    'List items status is 200': (r) => r.status === 200,
    'List items returns array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.items);
      } catch (e) {
        return false;
      }
    },
    'List items response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  apiLatency.add(listRes.timings.duration);
  apiThroughput.add(1);
  errorRate.add(listRes.status !== 200);
  successRate.add(listRes.status === 200);
  
  sleep(2);
  
  // Scenario 6: Update resource (PUT)
  if (itemId) {
    const updatePayload = JSON.stringify({
      name: `Updated Item ${__VU}-${__ITER}`,
      description: 'Updated load test item',
      value: Math.floor(Math.random() * 2000),
    });
    
    const updateRes = http.put(`${baseUrl}/api/v1/items/${itemId}`, updatePayload, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${__ENV.API_TOKEN || 'test-token'}`,
      },
      tags: { name: 'UpdateItem' },
    });
    
    check(updateRes, {
      'Update item status is 200': (r) => r.status === 200,
    });
    
    apiLatency.add(updateRes.timings.duration);
    apiThroughput.add(1);
    errorRate.add(updateRes.status !== 200);
    successRate.add(updateRes.status === 200);
  }
  
  sleep(1);
  
  // Scenario 7: Delete resource (DELETE)
  if (itemId) {
    const deleteRes = http.del(`${baseUrl}/api/v1/items/${itemId}`, null, {
      headers: {
        'Authorization': `Bearer ${__ENV.API_TOKEN || 'test-token'}`,
      },
      tags: { name: 'DeleteItem' },
    });
    
    check(deleteRes, {
      'Delete item status is 204': (r) => r.status === 204,
    });
    
    apiLatency.add(deleteRes.timings.duration);
    apiThroughput.add(1);
    errorRate.add(deleteRes.status !== 204);
    successRate.add(deleteRes.status === 204);
  }
  
  sleep(3);
}

// Test teardown
export function teardown(data) {
  // Perform any cleanup tasks
  console.log('Test completed');
  
  // Final health check
  const res = http.get(`${data.baseUrl}/health`);
  check(res, {
    'Teardown - API is still healthy': (r) => r.status === 200,
  });
}

// Custom function to handle batch operations
export function batchOperations() {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:8080';
  const batchSize = 50;
  const items = [];
  
  // Create batch payload
  for (let i = 0; i < batchSize; i++) {
    items.push({
      name: `Batch Item ${__VU}-${__ITER}-${i}`,
      description: 'Batch load test item',
      value: Math.floor(Math.random() * 1000),
    });
  }
  
  const batchRes = http.post(`${baseUrl}/api/v1/items/batch`, JSON.stringify({ items }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.API_TOKEN || 'test-token'}`,
    },
    tags: { name: 'BatchCreate' },
  });
  
  check(batchRes, {
    'Batch create status is 201': (r) => r.status === 201,
    'Batch create processed all items': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.created === batchSize;
      } catch (e) {
        return false;
      }
    },
    'Batch operation response time < 2000ms': (r) => r.timings.duration < 2000,
  });
  
  apiLatency.add(batchRes.timings.duration);
  apiThroughput.add(batchSize);
  errorRate.add(batchRes.status !== 201);
  successRate.add(batchRes.status === 201);
}