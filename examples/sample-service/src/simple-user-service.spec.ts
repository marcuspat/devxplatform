import { 
  SimpleUserService, 
  UserRepository, 
  ExternalAPIClient, 
  User 
} from './simple-user-service';
import { jest } from '@jest/globals';

/**
 * Comprehensive test suite for SimpleUserService with 90%+ coverage
 */
describe('SimpleUserService', () => {
  let userService: SimpleUserService;
  let mockRepository: jest.Mocked<UserRepository>;
  let mockExternalAPI: jest.Mocked<ExternalAPIClient>;
  let mockLogger: jest.Mocked<any>;
  let sampleUser: User;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();

    // Setup mocks
    mockRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };

    mockExternalAPI = {
      validateEmail: jest.fn(),
      sendWelcomeEmail: jest.fn()
    };

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    // Sample data
    sampleUser = {
      id: '123',
      email: 'test@example.com',
      name: 'Test User',
      isActive: true,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01')
    };

    // Create service
    userService = new SimpleUserService(
      mockRepository,
      mockExternalAPI,
      mockLogger
    );
  });

  afterEach(async () => {
    await userService.shutdown();
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with all dependencies', () => {
      expect(userService).toBeInstanceOf(SimpleUserService);
    });

    it('should setup circuit breaker event listeners', () => {
      const eventSpy = jest.spyOn(userService, 'emit');
      
      // Trigger circuit breaker events through internal methods
      const circuitBreaker = (userService as any).circuitBreaker;
      circuitBreaker.emit('open');
      circuitBreaker.emit('close');
      
      expect(mockLogger.warn).toHaveBeenCalledWith('Circuit breaker opened for email validation');
      expect(mockLogger.info).toHaveBeenCalledWith('Circuit breaker closed for email validation');
    });
  });

  describe('getUserById', () => {
    it('should return user from database', async () => {
      mockRepository.findById.mockResolvedValue(sampleUser);

      const result = await userService.getUserById('123');

      expect(result).toEqual(sampleUser);
      expect(mockRepository.findById).toHaveBeenCalledWith('123');
    });

    it('should return cached user when available', async () => {
      // First call to populate cache
      mockRepository.findById.mockResolvedValue(sampleUser);
      await userService.getUserById('123');

      // Second call should use cache
      mockRepository.findById.mockClear();
      const eventSpy = jest.spyOn(userService, 'emit');
      
      const result = await userService.getUserById('123');

      expect(result).toEqual(sampleUser);
      expect(mockRepository.findById).not.toHaveBeenCalled();
      expect(eventSpy).toHaveBeenCalledWith('cache:hit', { userId: '123' });
    });

    it('should remove expired cache entries', async () => {
      // First call to populate cache
      mockRepository.findById.mockResolvedValue(sampleUser);
      await userService.getUserById('123');

      // Advance time beyond cache TTL
      jest.advanceTimersByTime(400000); // 6+ minutes

      // Second call should hit database again
      mockRepository.findById.mockResolvedValue(sampleUser);
      const result = await userService.getUserById('123');

      expect(result).toEqual(sampleUser);
      expect(mockRepository.findById).toHaveBeenCalledTimes(2);
    });

    it('should handle timeout errors', async () => {
      // Mock a slow database response
      mockRepository.findById.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 10000))
      );

      const promise = userService.getUserById('123');
      
      // Advance time to trigger timeout
      jest.advanceTimersByTime(6000);
      
      await expect(promise).rejects.toThrow('Operation timeout');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get user by ID',
        expect.objectContaining({ userId: '123' })
      );
    });

    it('should throw error for missing user ID', async () => {
      await expect(userService.getUserById('')).rejects.toThrow('User ID is required');
      await expect(userService.getUserById(null as any)).rejects.toThrow('User ID is required');
    });

    it('should return null when user not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await userService.getUserById('999');

      expect(result).toBeNull();
    });

    it('should emit user:retrieved event', async () => {
      mockRepository.findById.mockResolvedValue(sampleUser);
      const eventSpy = jest.spyOn(userService, 'emit');

      await userService.getUserById('123');

      expect(eventSpy).toHaveBeenCalledWith('user:retrieved', {
        userId: '123',
        source: 'database'
      });
    });
  });

  describe('getUserByEmail', () => {
    it('should return user and cache it', async () => {
      mockRepository.findByEmail.mockResolvedValue(sampleUser);

      const result = await userService.getUserByEmail('test@example.com');

      expect(result).toEqual(sampleUser);
      expect(mockRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should retry on failure', async () => {
      mockRepository.findByEmail
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValue(sampleUser);

      const result = await userService.getUserByEmail('test@example.com');

      expect(result).toEqual(sampleUser);
      expect(mockRepository.findByEmail).toHaveBeenCalledTimes(2);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Retrying getUserByEmail',
        expect.objectContaining({ email: 'test@example.com' })
      );
    });

    it('should throw error for missing email', async () => {
      await expect(userService.getUserByEmail('')).rejects.toThrow('Email is required');
    });

    it('should return null when user not found', async () => {
      mockRepository.findByEmail.mockResolvedValue(null);

      const result = await userService.getUserByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('createUser', () => {
    const newUserData = {
      email: 'new@example.com',
      name: 'New User',
      isActive: true
    };

    it('should create user successfully', async () => {
      mockExternalAPI.validateEmail.mockResolvedValue(true);
      mockRepository.findByEmail.mockResolvedValue(null); // User doesn't exist
      mockRepository.create.mockResolvedValue(sampleUser);
      mockExternalAPI.sendWelcomeEmail.mockResolvedValue(true);

      const eventSpy = jest.spyOn(userService, 'emit');
      const result = await userService.createUser(newUserData);

      expect(result).toEqual(sampleUser);
      expect(mockExternalAPI.validateEmail).toHaveBeenCalledWith(newUserData.email);
      expect(mockRepository.create).toHaveBeenCalledWith(newUserData);
      expect(eventSpy).toHaveBeenCalledWith('user:created', { user: sampleUser });
    });

    it('should use fallback email validation when circuit breaker opens', async () => {
      mockExternalAPI.validateEmail.mockRejectedValue(new Error('Service unavailable'));
      mockRepository.findByEmail.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(sampleUser);

      const result = await userService.createUser(newUserData);

      expect(result).toEqual(sampleUser);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Email validation failed, using fallback',
        expect.any(Object)
      );
    });

    it('should reject invalid email in fallback validation', async () => {
      mockExternalAPI.validateEmail.mockRejectedValue(new Error('Service unavailable'));
      
      await expect(userService.createUser({
        ...newUserData,
        email: 'invalid-email'
      })).rejects.toThrow('Invalid email address');
    });

    it('should reject if user already exists', async () => {
      mockExternalAPI.validateEmail.mockResolvedValue(true);
      mockRepository.findByEmail.mockResolvedValue(sampleUser); // User exists

      await expect(userService.createUser(newUserData))
        .rejects.toThrow('User with this email already exists');
    });

    it('should throw error for missing required fields', async () => {
      await expect(userService.createUser({ name: 'Test' } as any))
        .rejects.toThrow('Email and name are required');

      await expect(userService.createUser({ email: 'test@test.com' } as any))
        .rejects.toThrow('Email and name are required');
    });

    it('should handle welcome email failure gracefully', async () => {
      mockExternalAPI.validateEmail.mockResolvedValue(true);
      mockRepository.findByEmail.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(sampleUser);
      mockExternalAPI.sendWelcomeEmail.mockRejectedValue(new Error('Email service down'));

      const result = await userService.createUser(newUserData);

      expect(result).toEqual(sampleUser);
      
      // Allow async email sending to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to send welcome email',
        expect.objectContaining({ userId: sampleUser.id })
      );
    });

    it('should log successful welcome email', async () => {
      mockExternalAPI.validateEmail.mockResolvedValue(true);
      mockRepository.findByEmail.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(sampleUser);
      mockExternalAPI.sendWelcomeEmail.mockResolvedValue(true);

      await userService.createUser(newUserData);
      
      // Allow async email sending to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Welcome email sent',
        { userId: sampleUser.id }
      );
    });
  });

  describe('updateUser', () => {
    const updates = { name: 'Updated Name' };

    it('should update user successfully', async () => {
      const updatedUser = { ...sampleUser, ...updates };
      mockRepository.update.mockResolvedValue(updatedUser);
      const eventSpy = jest.spyOn(userService, 'emit');

      const result = await userService.updateUser('123', updates);

      expect(result).toEqual(updatedUser);
      expect(mockRepository.update).toHaveBeenCalledWith('123', updates);
      expect(eventSpy).toHaveBeenCalledWith('user:updated', { user: updatedUser });
    });

    it('should return null when user not found', async () => {
      mockRepository.update.mockResolvedValue(null);

      const result = await userService.updateUser('999', updates);

      expect(result).toBeNull();
    });

    it('should throw error for missing user ID', async () => {
      await expect(userService.updateUser('', updates))
        .rejects.toThrow('User ID is required');
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      mockRepository.delete.mockResolvedValue(true);
      const eventSpy = jest.spyOn(userService, 'emit');

      const result = await userService.deleteUser('123');

      expect(result).toBe(true);
      expect(mockRepository.delete).toHaveBeenCalledWith('123');
      expect(eventSpy).toHaveBeenCalledWith('user:deleted', { userId: '123' });
    });

    it('should return false when user not found', async () => {
      mockRepository.delete.mockResolvedValue(false);

      const result = await userService.deleteUser('999');

      expect(result).toBe(false);
    });

    it('should throw error for missing user ID', async () => {
      await expect(userService.deleteUser(''))
        .rejects.toThrow('User ID is required');
    });

    it('should remove user from cache when deleted', async () => {
      // First, cache the user
      mockRepository.findById.mockResolvedValue(sampleUser);
      await userService.getUserById('123');
      
      // Then delete
      mockRepository.delete.mockResolvedValue(true);
      await userService.deleteUser('123');
      
      // Verify cache is cleared by checking database is called again
      mockRepository.findById.mockResolvedValue(sampleUser);
      await userService.getUserById('123');
      
      expect(mockRepository.findById).toHaveBeenCalledTimes(2);
    });
  });

  describe('getMetrics', () => {
    it('should return service metrics', () => {
      const metrics = userService.getMetrics();

      expect(metrics).toHaveProperty('circuitBreaker');
      expect(metrics).toHaveProperty('cache');
      expect(metrics.circuitBreaker).toHaveProperty('state');
      expect(metrics.circuitBreaker).toHaveProperty('stats');
      expect(metrics.cache).toHaveProperty('size');
    });

    it('should reflect circuit breaker state', () => {
      const circuitBreaker = (userService as any).circuitBreaker;
      
      let metrics = userService.getMetrics();
      expect(metrics.circuitBreaker.state).toBe('closed');
      
      // Force circuit breaker to open (simplified)
      circuitBreaker.opened = true;
      
      metrics = userService.getMetrics();
      expect(metrics.circuitBreaker.state).toBe('open');
    });

    it('should reflect cache size', async () => {
      let metrics = userService.getMetrics();
      expect(metrics.cache.size).toBe(0);
      
      // Add user to cache
      mockRepository.findById.mockResolvedValue(sampleUser);
      await userService.getUserById('123');
      
      metrics = userService.getMetrics();
      expect(metrics.cache.size).toBe(1);
    });
  });

  describe('shutdown', () => {
    it('should shutdown gracefully', async () => {
      // Add some cached data
      mockRepository.findById.mockResolvedValue(sampleUser);
      await userService.getUserById('123');
      
      let metrics = userService.getMetrics();
      expect(metrics.cache.size).toBe(1);
      
      await userService.shutdown();
      
      expect(mockLogger.info).toHaveBeenCalledWith('Shutting down SimpleUserService');
      
      // Check cache is cleared
      metrics = userService.getMetrics();
      expect(metrics.cache.size).toBe(0);
    });
  });

  describe('private helper methods', () => {
    it('should handle withTimeout correctly', async () => {
      const slowOperation = jest.fn(
        () => new Promise(resolve => setTimeout(resolve, 10000))
      );
      const fastOperation = jest.fn(() => Promise.resolve('fast'));
      
      // Test timeout
      const timeoutPromise = (userService as any).withTimeout(slowOperation, 1000);
      jest.advanceTimersByTime(2000);
      await expect(timeoutPromise).rejects.toThrow('Operation timeout');
      
      // Test successful operation
      const result = await (userService as any).withTimeout(fastOperation, 1000);
      expect(result).toBe('fast');
    });

    it('should handle cache operations correctly', () => {
      const testUser = { ...sampleUser, id: 'test-id' };
      
      // Test cache miss
      let cached = (userService as any).getCachedUser('test-id');
      expect(cached).toBeNull();
      
      // Test cache set and hit
      (userService as any).cacheUser(testUser);
      cached = (userService as any).getCachedUser('test-id');
      expect(cached).toEqual(testUser);
      
      // Test cache removal
      (userService as any).removeCachedUser('test-id');
      cached = (userService as any).getCachedUser('test-id');
      expect(cached).toBeNull();
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle concurrent cache operations', async () => {
      mockRepository.findById.mockResolvedValue(sampleUser);
      
      // Simulate concurrent requests for the same user
      const promises = [
        userService.getUserById('123'),
        userService.getUserById('123'),
        userService.getUserById('123')
      ];
      
      const results = await Promise.all(promises);
      
      // All should return the same user
      results.forEach(result => {
        expect(result).toEqual(sampleUser);
      });
    });

    it('should handle repository errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockRepository.findById.mockRejectedValue(dbError);
      
      await expect(userService.getUserById('123')).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get user by ID',
        expect.objectContaining({ error: dbError })
      );
    });

    it('should handle external API timeouts', async () => {
      const timeoutError = new Error('Request timeout');
      mockExternalAPI.validateEmail.mockRejectedValue(timeoutError);
      mockRepository.findByEmail.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(sampleUser);
      
      // Should fall back to local validation
      const result = await userService.createUser({
        email: 'valid@example.com',
        name: 'Test User',
        isActive: true
      });
      
      expect(result).toEqual(sampleUser);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Email validation failed, using fallback',
        expect.objectContaining({ error: timeoutError })
      );
    });
  });
});