// Test setup file
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Mock logger in tests to reduce noise
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  httpLogger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Increase timeout for integration tests
jest.setTimeout(10000);

// Add a simple test to satisfy Jest requirements
describe('Test Setup', () => {
  it('should setup test environment correctly', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});