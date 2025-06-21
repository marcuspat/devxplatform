// Jest setup file for gRPC service tests
import { config } from 'dotenv';

// Load environment variables from .env file for testing
config({ path: '.env.test' });

// Set default test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.GRPC_PORT = '50052'; // Use different port for tests

// Global test setup
// (Configuration only, no tests in setup file)