// Basic test file to verify Jest setup
describe('Basic Setup', () => {
  it('should have Node.js environment', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('should load configuration', () => {
    expect(process.env.GRPC_PORT).toBe('50052');
  });

  it('should be able to import modules', async () => {
    const { logger } = await import('../utils/logger');
    expect(logger).toBeDefined();
  });
});