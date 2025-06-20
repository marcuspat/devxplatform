const fs = require('fs-extra');
const path = require('path');

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // Create test directories
  const testDirs = [
    path.join(__dirname, '../../generated'),
    path.join(__dirname, '../../temp'),
    path.join(__dirname, '../../test-templates'),
    path.join(__dirname, '../../test-output')
  ];
  
  for (const dir of testDirs) {
    await fs.ensureDir(dir);
  }
  
  console.log('Test environment setup complete');
});

// Global test cleanup
afterAll(async () => {
  // Cleanup test directories
  const testDirs = [
    path.join(__dirname, '../../test-templates'),
    path.join(__dirname, '../../test-output'),
    path.join(__dirname, '../../temp')
  ];
  
  for (const dir of testDirs) {
    try {
      await fs.remove(dir);
    } catch (error) {
      console.warn(`Warning: Could not cleanup test directory ${dir}:`, error.message);
    }
  }
  
  console.log('Test cleanup complete');
});

// Mock console methods for cleaner test output
const originalConsole = console;
global.console = {
  ...originalConsole,
  // Suppress non-error logs during tests unless verbose
  log: process.env.VERBOSE_TESTS ? originalConsole.log : () => {},
  info: process.env.VERBOSE_TESTS ? originalConsole.info : () => {},
  warn: originalConsole.warn,
  error: originalConsole.error
};