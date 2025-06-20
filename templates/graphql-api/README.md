# GraphQL API Template

Production-ready GraphQL API template with Apollo Server, TypeScript, and type-graphql.

## Features

- ✅ **12-Factor App Principles**: Environment-based configuration, stateless design
- ✅ **TypeScript**: Full type safety with type-graphql decorators
- ✅ **Apollo Server**: Industry-standard GraphQL server
- ✅ **Type-GraphQL**: Code-first GraphQL schema generation
- ✅ **Structured Logging**: Winston with JSON formatting
- ✅ **Health Checks**: Liveness and readiness probes
- ✅ **Error Handling**: Centralized error handling with proper formatting
- ✅ **Input Validation**: Automatic validation with class-validator
- ✅ **Security**: Helmet, CORS, rate limiting, query depth limiting
- ✅ **DataLoader**: Efficient data fetching with batching
- ✅ **Docker Support**: Multi-stage Dockerfile and docker-compose
- ✅ **Testing**: Jest with GraphQL testing utilities
- ✅ **Graceful Shutdown**: Proper signal handling and cleanup

## Project Structure

```
├── src/
│   ├── auth/             # Authentication utilities
│   ├── config/           # Configuration management
│   ├── middleware/       # Express middleware
│   ├── resolvers/        # GraphQL resolvers
│   ├── routes/           # REST endpoints (health)
│   ├── schemas/          # GraphQL type definitions
│   ├── types/            # TypeScript types
│   ├── utils/            # Utility functions
│   ├── __tests__/        # Test files
│   ├── index.ts          # Application entry point
│   └── server.ts         # Server setup
├── schema.graphql        # Generated GraphQL schema (dev only)
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
- `npm run generate` - Generate TypeScript types from schema

## GraphQL Playground

When running in development mode, GraphQL Playground is available at:
`http://localhost:4000/graphql`

## Example Queries

### Register a new user
```graphql
mutation {
  register(input: {
    email: "user@example.com"
    username: "johndoe"
    firstName: "John"
    lastName: "Doe"
    password: "securepassword"
  }) {
    user {
      id
      email
      username
      fullName
    }
    token
  }
}
```

### Login
```graphql
mutation {
  login(input: {
    email: "user@example.com"
    password: "securepassword"
  }) {
    user {
      id
      email
      role
    }
    token
  }
}
```

### Get current user (requires authentication)
```graphql
query {
  me {
    id
    email
    username
    fullName
    role
  }
}
```

### List users with pagination
```graphql
query {
  users(limit: 10, offset: 0) {
    items {
      id
      email
      username
      fullName
    }
    total
    hasMore
  }
}
```

## Authentication

Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

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
- `GRAPHQL_MAX_DEPTH` - Maximum query depth
- `GRAPHQL_MAX_COMPLEXITY` - Maximum query complexity
- `DATABASE_URL` - Database connection string
- `JWT_SECRET` - JWT signing secret

## Security Features

- Query depth limiting to prevent DoS attacks
- Query complexity analysis
- Rate limiting on GraphQL endpoint
- CORS configuration
- Helmet.js for security headers
- JWT authentication
- Input validation with class-validator

## Testing

Run tests:
```bash
npm test
```

Run with coverage:
```bash
npm test -- --coverage
```

## Type Safety

This template uses type-graphql for code-first GraphQL development:

1. Define your types using TypeScript classes and decorators
2. Schema is automatically generated from your code
3. Full type safety from resolvers to client

## Deployment

1. Build Docker image:
```bash
docker build -t graphql-api .
```

2. Run container:
```bash
docker run -p 4000:4000 --env-file .env graphql-api
```

## License

MIT