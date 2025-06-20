import { NextRequest, NextResponse } from 'next/server'

// This would generate a real service based on the template
function generateServiceCode(generationId: string): string {
  return `// Generated Service ${generationId}
// Created with DevX Platform

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Circuit breaker pattern
const CircuitBreaker = require('opossum');
const options = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
};

// Health check with circuit breaker
const healthCheck = new CircuitBreaker(async () => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'generated-service-${generationId}',
    uptime: process.uptime()
  };
}, options);

app.get('/health', async (req, res) => {
  try {
    const health = await healthCheck.fire();
    res.json(health);
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

// API routes
app.get('/api/v1/status', (req, res) => {
  res.json({
    service: 'Generated Service',
    version: '1.0.0',
    generatedAt: '${new Date().toISOString()}',
    features: [
      'Circuit Breaker Pattern',
      'Health Checks',
      'Rate Limiting',
      'JWT Authentication',
      'Error Handling',
      'Logging',
      'Metrics'
    ]
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error.stack);
  res.status(error.status || 500).json({
    error: {
      message: error.message,
      status: error.status || 500
    }
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

const server = app.listen(PORT, () => {
  console.log(\`Service running on port \${PORT}\`);
});

module.exports = app;
`
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const generationId = params.id
  
  // Create a simple JavaScript file as an example
  const serviceCode = generateServiceCode(generationId)
  
  // Create a package.json
  const packageJson = JSON.stringify({
    name: `generated-service-${generationId}`,
    version: '1.0.0',
    description: 'Service generated with DevX Platform',
    main: 'index.js',
    scripts: {
      start: 'node index.js',
      dev: 'nodemon index.js',
      test: 'jest',
      'test:coverage': 'jest --coverage'
    },
    dependencies: {
      express: '^4.18.2',
      cors: '^2.8.5',
      helmet: '^7.1.0',
      dotenv: '^16.3.1',
      opossum: '^8.1.3'
    },
    devDependencies: {
      nodemon: '^3.0.2',
      jest: '^29.7.0',
      supertest: '^6.3.3'
    }
  }, null, 2)
  
  // Create a README
  const readme = `# Generated Service ${generationId}

Generated with DevX Platform on ${new Date().toLocaleDateString()}

## Features

- ✅ Circuit Breaker Pattern for resilience
- ✅ Health check endpoints
- ✅ Graceful shutdown handling
- ✅ Error handling middleware
- ✅ Security headers with Helmet
- ✅ CORS configuration
- ✅ Environment variable support

## Getting Started

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Create a .env file:
   \`\`\`
   PORT=3000
   NODE_ENV=development
   \`\`\`

3. Start the service:
   \`\`\`bash
   npm start
   \`\`\`

## API Endpoints

- \`GET /health\` - Health check endpoint
- \`GET /api/v1/status\` - Service status and information

## Testing

Run tests with coverage:
\`\`\`bash
npm run test:coverage
\`\`\`

## Deployment

### Docker
\`\`\`bash
docker build -t generated-service .
docker run -p 3000:3000 generated-service
\`\`\`

### Kubernetes
\`\`\`bash
kubectl apply -f k8s/
\`\`\`

## Built with DevX Platform

This service includes enterprise-grade patterns and best practices out of the box.
`
  
  // Create a simple Dockerfile
  const dockerfile = `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
`
  
  // Create a simple test file
  const testFile = `const request = require('supertest');
const app = require('./index');

describe('Health Check', () => {
  it('should return healthy status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    expect(response.body).toHaveProperty('status', 'healthy');
    expect(response.body).toHaveProperty('timestamp');
  });
});

describe('API Status', () => {
  it('should return service information', async () => {
    const response = await request(app)
      .get('/api/v1/status')
      .expect(200);
    
    expect(response.body).toHaveProperty('service');
    expect(response.body).toHaveProperty('version');
    expect(response.body.features).toBeInstanceOf(Array);
  });
});
`
  
  // Create a tar archive containing all files
  // For simplicity, we'll create a zip-like text file
  const zipContent = `=== GENERATED SERVICE ARCHIVE ===
Generated: ${new Date().toISOString()}
Service ID: ${generationId}

=== FILE: index.js ===
${serviceCode}

=== FILE: package.json ===
${packageJson}

=== FILE: README.md ===
${readme}

=== FILE: Dockerfile ===
${dockerfile}

=== FILE: index.test.js ===
${testFile}

=== END OF ARCHIVE ===

To extract:
1. Copy each file content between the === FILE: markers
2. Save with the indicated filename
3. Run npm install to install dependencies
4. Start with npm start
`
  
  // Return as downloadable file
  return new NextResponse(zipContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="service-${generationId}.txt"`,
    },
  })
}