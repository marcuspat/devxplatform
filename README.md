# DevX Platform - Enterprise Service Generator

Generate production-ready microservices in seconds with built-in resilience patterns, 90%+ test coverage, and cloud-native deployment configurations.

## 🚀 Quick Start

### Option 1: Use the Deployed Version
Visit: https://devx-platform-5e3p6aw0h-marcus-patmans-projects.vercel.app

### Option 2: Run Locally

```bash
# Install dependencies
npm install

# Run the frontend (Next.js)
npm run dev

# Open http://localhost:3000
```

## 🎯 How to Use

1. **Enter Service Name**: Give your service a meaningful name (e.g., "user-authentication-api")
2. **Select Template**: Choose from 6 production-ready templates
3. **Click Generate**: The platform creates a complete service with all files
4. **Download**: Get a text file containing all the generated code

## 📋 Available Templates

### 1. REST API Template (Node.js)
- Express.js with TypeScript
- JWT authentication
- OpenAPI/Swagger documentation
- Rate limiting and security headers
- Circuit breaker patterns
- 90%+ test coverage

### 2. GraphQL API Template (Node.js)
- Apollo Server with Type-GraphQL
- DataLoader for N+1 query prevention
- JWT authentication
- Query complexity analysis
- Subscription support

### 3. FastAPI Template (Python)
- Async/await support
- Automatic API documentation
- Pydantic models for validation
- SQLAlchemy integration
- Redis caching

### 4. Gin API Template (Go)
- High-performance HTTP router
- PostgreSQL integration
- JWT middleware
- Swagger documentation
- Docker multi-stage builds

### 5. Next.js Webapp (React)
- Next.js 14 with App Router
- TypeScript and Tailwind CSS
- NextAuth.js authentication
- API routes
- Dark mode support

### 6. Worker Service (Node.js)
- BullMQ job processing
- Redis queue management
- Cron job scheduling
- Retry logic with exponential backoff
- Monitoring dashboard

## 🏗️ What Gets Generated

Each service includes:

```
generated-service/
├── src/                    # Source code with resilience patterns
│   ├── index.ts           # Main application with circuit breakers
│   ├── config/            # Configuration management
│   ├── routes/            # API endpoints
│   ├── middleware/        # Auth, rate limiting, error handling
│   ├── services/          # Business logic with retry patterns
│   └── utils/             # Logging, validation helpers
├── tests/                 # 90%+ test coverage
│   ├── unit/             # Unit tests with mocks
│   ├── integration/      # Integration tests
│   └── e2e/              # End-to-end tests
├── docker/               # Container configuration
│   ├── Dockerfile        # Multi-stage production build
│   └── docker-compose.yml # Local development setup
├── k8s/                  # Kubernetes manifests
│   ├── deployment.yaml   # Deployment with health checks
│   ├── service.yaml      # Service configuration
│   └── ingress.yaml      # Ingress rules
├── .github/              # CI/CD pipelines
│   ├── workflows/
│   │   ├── ci.yml       # Test and build
│   │   └── deploy.yml   # Deploy to cloud
├── README.md            # Complete documentation
├── package.json         # Dependencies
└── .env.example        # Environment variables
```

## 🛡️ Built-in Resilience Patterns

Every generated service includes:

- **Circuit Breaker**: Prevents cascade failures
- **Retry Logic**: Exponential backoff for transient failures
- **Timeout Handling**: Configurable timeouts with fallbacks
- **Graceful Shutdown**: Proper cleanup on SIGTERM
- **Health Checks**: Liveness and readiness probes
- **Rate Limiting**: Protect against abuse
- **Error Handling**: Centralized error management

## 🧪 Testing Features

- **90%+ Coverage**: Comprehensive test suites
- **Unit Tests**: Fast, isolated component testing
- **Integration Tests**: API endpoint testing
- **Load Tests**: Performance testing templates
- **Mocking**: Complete mock utilities
- **Test Data**: Factories for test data generation

## 🚀 Running the Full Stack (Advanced)

To run with the actual backend API:

```bash
# Terminal 1: Start the backend API
cd api
npm install
npm run migrate  # Set up database
npm start        # Runs on port 4000

# Terminal 2: Start the frontend
cd ..
npm run dev      # Runs on port 3000

# Terminal 3: Start worker (optional)
cd worker
npm install
npm start
```

### Backend Requirements
- PostgreSQL 12+
- Redis 6+
- Node.js 18+

## 🔧 Environment Variables

Create `.env.local` in the root:

```env
# Backend API URL (optional)
BACKEND_URL=http://localhost:4000

# Database (for backend)
DATABASE_URL=postgresql://user:pass@localhost:5432/devx

# Redis (for backend)
REDIS_URL=redis://localhost:6379
```

## 📦 Example Generated Service

Here's a snippet of what gets generated:

```javascript
// Generated index.js with resilience patterns
const CircuitBreaker = require('opossum');

// Circuit breaker configuration
const options = {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
};

// Wrap external calls in circuit breaker
const healthCheck = new CircuitBreaker(async () => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };
}, options);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
```

## 🎯 Use Cases

- **Startups**: Launch MVPs in hours instead of weeks
- **Enterprises**: Standardize microservice architecture
- **Agencies**: Deliver client projects faster
- **Learning**: Study production-ready patterns

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - feel free to use for commercial projects!

## 🆘 Support

- **Issues**: https://github.com/yourusername/devx-platform/issues
- **Docs**: Check the `/docs` folder
- **Email**: support@devxplatform.com

---

Built with ❤️ using Next.js, TypeScript, and enterprise-grade patterns.