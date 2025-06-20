/**
 * Test setup configuration
 */

// Set test timeout
jest.setTimeout(30000);

// Mock external dependencies globally
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    setex: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    mget: jest.fn().mockResolvedValue([]),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    ping: jest.fn().mockResolvedValue('PONG'),
    quit: jest.fn().mockResolvedValue('OK'),
    flushall: jest.fn().mockResolvedValue('OK')
  }));
});

jest.mock('axios', () => ({
  create: jest.fn(() => ({
    post: jest.fn().mockResolvedValue({ data: { valid: true } }),
    put: jest.fn().mockResolvedValue({}),
    get: jest.fn().mockResolvedValue({ data: {} })
  }))
}));

// Mock winston logger
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    log: jest.fn()
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    printf: jest.fn(),
    colorize: jest.fn(),
    simple: jest.fn()
  },
  transports: {
    Console: jest.fn()
  }
}));

// Suppress console logs during tests unless explicitly needed
const originalConsole = { ...console };
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Restore console for specific tests that need it
beforeEach(() => {
  // Reset all mocks
  jest.clearAllMocks();
});

afterAll(() => {
  // Restore original console
  global.console = originalConsole;
});