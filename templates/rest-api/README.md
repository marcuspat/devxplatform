# REST API Template

Production-ready REST API template with Express, TypeScript, and OpenAPI specification.

## Features

- ✅ **12-Factor App Principles**: Environment-based configuration, stateless design
- ✅ **TypeScript**: Full type safety and modern JavaScript features
- ✅ **OpenAPI/Swagger**: API specification and validation
- ✅ **Structured Logging**: Winston with JSON formatting
- ✅ **Health Checks**: Liveness and readiness probes
- ✅ **Error Handling**: Centralized error handling with proper HTTP status codes
- ✅ **Input Validation**: Request validation with Joi
- ✅ **Security**: Helmet, CORS, rate limiting
- ✅ **Docker Support**: Multi-stage Dockerfile and docker-compose
- ✅ **Testing**: Jest with TypeScript support
- ✅ **Graceful Shutdown**: Proper signal handling and cleanup

## Project Structure

```
├── src/
│   ├── config/           # Configuration management
│   ├── middleware/       # Express middleware
│   ├── routes/           # API routes
│   ├── schemas/          # Validation schemas
│   ├── utils/            # Utility functions
│   ├── __tests__/        # Test files
│   ├── index.ts          # Application entry point
│   └── server.ts         # Express server setup
├── openapi.yaml          # OpenAPI specification
├── Dockerfile            # Docker configuration
├── docker-compose.yml    # Docker Compose setup
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── jest.config.js        # Jest configuration
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Docker (optional)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Start development server:
```bash
npm run dev
```

### Docker

Build and run with Docker:
```bash
docker-compose up
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run validate` - Run linting, tests, and build

## API Documentation

- OpenAPI specification: `/openapi.yaml`
- Swagger UI: `http://localhost:3000/api-docs` (when running)

## Health Checks

- Liveness: `GET /health/live`
- Readiness: `GET /health/ready`
- Detailed: `GET /health`

## Environment Variables

See `.env.example` for all available environment variables.

Key variables:
- `NODE_ENV` - Environment (development/production/test)
- `PORT` - Server port
- `LOG_LEVEL` - Logging level
- `DATABASE_URL` - Database connection string
- `JWT_SECRET` - JWT signing secret

## Security Best Practices

- Helmet.js for security headers
- CORS configuration
- Rate limiting on API endpoints
- Input validation on all requests
- JWT authentication ready
- Non-root Docker user

## Testing

Run tests:
```bash
npm test
```

Run with coverage:
```bash
npm test -- --coverage
```

## Deployment

1. Build Docker image:
```bash
docker build -t rest-api .
```

2. Run container:
```bash
docker run -p 3000:3000 --env-file .env rest-api
```

## License

MIT