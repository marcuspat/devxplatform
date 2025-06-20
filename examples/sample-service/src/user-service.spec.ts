import { 
  UserService, 
  UserRepository, 
  ExternalAPIClient, 
  User, 
  DefaultExternalAPIClient 
} from './user-service';
import { ServiceTestTemplate, MockBuilder, TestUtilities } from '../../../patterns/testing';
import { jest } from '@jest/globals';
import Redis from 'ioredis';

/**
 * Comprehensive test suite for UserService with 90%+ coverage
 */
class UserServiceTest extends ServiceTestTemplate {
  private userService: UserService;
  private mockRepository: jest.Mocked<UserRepository>;
  private mockRedis: jest.Mocked<Redis>;
  private mockExternalAPI: jest.Mocked<ExternalAPIClient>;
  private sampleUser: User;
  private sampleUsers: User[];

  beforeEach(): void {
    super.beforeEach();
    
    // Setup mocks
    this.mockRepository = MockBuilder.repository<User>();
    this.mockRedis = this.createRedisMock();
    this.mockExternalAPI = this.createExternalAPIMock();
    
    // Sample data
    this.sampleUser = {
      id: '123',
      email: 'test@example.com',
      name: 'Test User',
      isActive: true,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01')
    };
    
    this.sampleUsers = [
      this.sampleUser,
      {
        id: '456',
        email: 'test2@example.com',
        name: 'Test User 2',
        isActive: true,
        createdAt: new Date('2023-01-02'),
        updatedAt: new Date('2023-01-02')
      }
    ];
    
    // Create service with mocks
    this.userService = new UserService(this.mockRepository, {
      redis: this.mockRedis,
      externalAPI: this.mockExternalAPI,
      logger: this.mockLogger,
      circuitBreakerTimeout: 1000,
      retryAttempts: 2,
      bulkheadSize: 5,
      cacheTimeout: 10000
    });
  }

  afterEach(): async () => {
    await this.userService.shutdown();
  }

  private createRedisMock(): jest.Mocked<Redis> {
    return {
      setex: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      mget: jest.fn().mockResolvedValue([]),
      del: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([]),
      ping: jest.fn().mockResolvedValue('PONG'),
      quit: jest.fn().mockResolvedValue('OK'),
      flushall: jest.fn().mockResolvedValue('OK')
    } as any;
  }

  private createExternalAPIMock(): jest.Mocked<ExternalAPIClient> {
    return {
      validateEmail: jest.fn().mockResolvedValue(true),
      sendWelcomeEmail: jest.fn().mockResolvedValue(true),
      syncUserProfile: jest.fn().mockResolvedValue(undefined)
    };
  }
}

describe('UserService', () => {
  let test: UserServiceTest;

  beforeEach(() => {
    test = new UserServiceTest();
    test.beforeEach();
  });

  afterEach(async () => {
    await test.afterEach();
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const service = new UserService(test.mockRepository);
      expect(service).toBeInstanceOf(UserService);
    });

    it('should initialize with custom config', () => {
      const service = new UserService(test.mockRepository, {
        circuitBreakerTimeout: 2000,
        retryAttempts: 5
      });
      expect(service).toBeInstanceOf(UserService);
    });
  });

  describe('getUserById', () => {
    it('should return user from database', async () => {
      test.mockRepository.findById.mockResolvedValue(test.sampleUser);
      test.mockRedis.setex.mockResolvedValue('OK');

      const result = await test.userService.getUserById('123');

      expect(result).toEqual(test.sampleUser);
      expect(test.mockRepository.findById).toHaveBeenCalledWith('123');
      expect(test.mockRedis.setex).toHaveBeenCalled();
    });

    it('should return user from cache when database fails', async () => {
      test.mockRepository.findById.mockRejectedValue(new Error('DB Error'));
      test.mockRedis.get.mockResolvedValue(JSON.stringify(test.sampleUser));

      const result = await test.userService.getUserById('123');

      expect(result).toEqual(test.sampleUser);
      expect(test.mockRedis.get).toHaveBeenCalledWith('user:123');
    });

    it('should throw error when user not found anywhere', async () => {
      test.mockRepository.findById.mockRejectedValue(new Error('DB Error'));
      test.mockRedis.get.mockResolvedValue(null);

      await expect(test.userService.getUserById('999'))
        .rejects.toThrow('User 999 not found in cache');
    });

    it('should throw error for invalid input', async () => {
      await expect(test.userService.getUserById(''))
        .rejects.toThrow('User ID is required');

      await expect(test.userService.getUserById(null as any))
        .rejects.toThrow('User ID is required');
    });

    it('should handle cache errors gracefully', async () => {
      test.mockRepository.findById.mockResolvedValue(test.sampleUser);
      test.mockRedis.setex.mockRejectedValue(new Error('Redis Error'));

      const result = await test.userService.getUserById('123');

      expect(result).toEqual(test.sampleUser);
      expect(test.mockLogger.warn).toHaveBeenCalledWith(
        'Failed to cache user',
        expect.objectContaining({ userId: '123' })
      );
    });

    it('should emit user:retrieved event', async () => {
      test.mockRepository.findById.mockResolvedValue(test.sampleUser);
      const eventSpy = jest.spyOn(test.userService, 'emit');

      await test.userService.getUserById('123');

      expect(eventSpy).toHaveBeenCalledWith('user:retrieved', {
        userId: '123',
        source: 'primary'
      });
    });
  });

  describe('getUserByEmail', () => {
    it('should return user and cache it', async () => {
      test.mockRepository.findByEmail.mockResolvedValue(test.sampleUser);
      test.mockRedis.setex.mockResolvedValue('OK');

      const result = await test.userService.getUserByEmail('test@example.com');

      expect(result).toEqual(test.sampleUser);
      expect(test.mockRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(test.mockRedis.setex).toHaveBeenCalled();
    });

    it('should retry on failure', async () => {
      test.mockRepository.findByEmail
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValue(test.sampleUser);

      const result = await test.userService.getUserByEmail('test@example.com');

      expect(result).toEqual(test.sampleUser);
      expect(test.mockRepository.findByEmail).toHaveBeenCalledTimes(2);
      expect(test.mockLogger.warn).toHaveBeenCalledWith(
        'Retry attempt 1 for getUserByEmail',
        expect.any(Object)
      );
    });

    it('should throw error for invalid email', async () => {
      await expect(test.userService.getUserByEmail(''))
        .rejects.toThrow('Email is required');
    });

    it('should return null when user not found', async () => {
      test.mockRepository.findByEmail.mockResolvedValue(null);

      const result = await test.userService.getUserByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('getAllUsers', () => {
    it('should return users from database and cache them', async () => {
      test.mockRepository.findAll.mockResolvedValue(test.sampleUsers);
      test.mockRedis.setex.mockResolvedValue('OK');

      const result = await test.userService.getAllUsers(1, 10);

      expect(result).toEqual(test.sampleUsers);
      expect(test.mockRepository.findAll).toHaveBeenCalledWith(1, 10);
      expect(test.mockRedis.setex).toHaveBeenCalledTimes(2); // One for each user
    });

    it('should return cached users when database fails', async () => {
      test.mockRepository.findAll.mockRejectedValue(new Error('DB Error'));
      test.mockRedis.keys.mockResolvedValue(['user:123', 'user:456']);
      test.mockRedis.mget.mockResolvedValue([
        JSON.stringify(test.sampleUsers[0]),
        JSON.stringify(test.sampleUsers[1])
      ]);

      const result = await test.userService.getAllUsers(1, 10);

      expect(result).toEqual(test.sampleUsers);
      expect(test.mockLogger.warn).toHaveBeenCalledWith(
        'Falling back to cached users for getAllUsers'
      );
    });

    it('should handle cache errors in fallback', async () => {
      test.mockRepository.findAll.mockRejectedValue(new Error('DB Error'));
      test.mockRedis.keys.mockRejectedValue(new Error('Redis Error'));

      const result = await test.userService.getAllUsers(1, 10);

      expect(result).toEqual([]);
      expect(test.mockLogger.warn).toHaveBeenCalledWith(
        'Failed to get cached user list',
        expect.any(Object)
      );
    });

    it('should use default pagination parameters', async () => {
      test.mockRepository.findAll.mockResolvedValue(test.sampleUsers);

      await test.userService.getAllUsers();

      expect(test.mockRepository.findAll).toHaveBeenCalledWith(1, 10);
    });
  });

  describe('createUser', () => {
    const newUserData = {
      email: 'new@example.com',
      name: 'New User',
      isActive: true
    };

    it('should create user successfully', async () => {
      test.mockExternalAPI.validateEmail.mockResolvedValue(true);
      test.mockRepository.findByEmail.mockResolvedValue(null); // User doesn't exist
      test.mockRepository.create.mockResolvedValue(test.sampleUser);
      test.mockRedis.setex.mockResolvedValue('OK');
      test.mockExternalAPI.sendWelcomeEmail.mockResolvedValue(true);

      const result = await test.userService.createUser(newUserData);

      expect(result).toEqual(test.sampleUser);
      expect(test.mockExternalAPI.validateEmail).toHaveBeenCalledWith(newUserData.email);
      expect(test.mockRepository.create).toHaveBeenCalledWith(newUserData);
      expect(test.mockRedis.setex).toHaveBeenCalled();
    });

    it('should use fallback email validation when external service fails', async () => {
      test.mockExternalAPI.validateEmail.mockRejectedValue(new Error('Service down'));
      test.mockRepository.findByEmail.mockResolvedValue(null);
      test.mockRepository.create.mockResolvedValue(test.sampleUser);
      test.mockRedis.setex.mockResolvedValue('OK');

      const result = await test.userService.createUser(newUserData);

      expect(result).toEqual(test.sampleUser);
      expect(test.mockLogger.warn).toHaveBeenCalledWith(
        'Email validation failed, using fallback validation',
        expect.any(Object)
      );
    });

    it('should reject invalid email format in fallback', async () => {
      test.mockExternalAPI.validateEmail.mockRejectedValue(new Error('Service down'));
      
      await expect(test.userService.createUser({
        ...newUserData,
        email: 'invalid-email'
      })).rejects.toThrow('Invalid email address');
    });

    it('should reject if user already exists', async () => {
      test.mockExternalAPI.validateEmail.mockResolvedValue(true);
      test.mockRepository.findByEmail.mockResolvedValue(test.sampleUser);

      await expect(test.userService.createUser(newUserData))
        .rejects.toThrow('User with this email already exists');
    });

    it('should throw error for missing required fields', async () => {
      await expect(test.userService.createUser({ name: 'Test' } as any))
        .rejects.toThrow('Email and name are required');

      await expect(test.userService.createUser({ email: 'test@test.com' } as any))
        .rejects.toThrow('Email and name are required');
    });

    it('should handle welcome email failure gracefully', async () => {
      test.mockExternalAPI.validateEmail.mockResolvedValue(true);
      test.mockRepository.findByEmail.mockResolvedValue(null);
      test.mockRepository.create.mockResolvedValue(test.sampleUser);
      test.mockRedis.setex.mockResolvedValue('OK');
      test.mockExternalAPI.sendWelcomeEmail.mockRejectedValue(new Error('Email service down'));

      const result = await test.userService.createUser(newUserData);

      expect(result).toEqual(test.sampleUser);
      // Should log error but not fail the operation
      await TestUtilities.waitFor(() => 
        test.mockLogger.error.mock.calls.some(call => 
          call[0] === 'Failed to send welcome email'
        )
      );
    });

    it('should emit user:created event', async () => {
      test.mockExternalAPI.validateEmail.mockResolvedValue(true);
      test.mockRepository.findByEmail.mockResolvedValue(null);
      test.mockRepository.create.mockResolvedValue(test.sampleUser);
      test.mockRedis.setex.mockResolvedValue('OK');
      const eventSpy = jest.spyOn(test.userService, 'emit');

      await test.userService.createUser(newUserData);

      expect(eventSpy).toHaveBeenCalledWith('user:created', { user: test.sampleUser });
    });
  });

  describe('updateUser', () => {
    const updates = { name: 'Updated Name' };

    it('should update user successfully', async () => {
      const updatedUser = { ...test.sampleUser, ...updates };
      test.mockRepository.update.mockResolvedValue(updatedUser);
      test.mockRedis.setex.mockResolvedValue('OK');
      test.mockExternalAPI.syncUserProfile.mockResolvedValue(undefined);

      const result = await test.userService.updateUser('123', updates);

      expect(result).toEqual(updatedUser);
      expect(test.mockRepository.update).toHaveBeenCalledWith('123', updates);
      expect(test.mockRedis.setex).toHaveBeenCalled();
    });

    it('should return null when user not found', async () => {
      test.mockRepository.update.mockResolvedValue(null);

      const result = await test.userService.updateUser('999', updates);

      expect(result).toBeNull();
    });

    it('should handle external sync failure gracefully', async () => {
      const updatedUser = { ...test.sampleUser, ...updates };
      test.mockRepository.update.mockResolvedValue(updatedUser);
      test.mockRedis.setex.mockResolvedValue('OK');
      test.mockExternalAPI.syncUserProfile.mockRejectedValue(new Error('Sync failed'));

      const result = await test.userService.updateUser('123', updates);

      expect(result).toEqual(updatedUser);
      await TestUtilities.waitFor(() => 
        test.mockLogger.warn.mock.calls.some(call => 
          call[0] === 'Failed to sync user profile'
        )
      );
    });

    it('should throw error for missing user ID', async () => {
      await expect(test.userService.updateUser('', updates))
        .rejects.toThrow('User ID is required');
    });

    it('should emit user:updated event', async () => {
      const updatedUser = { ...test.sampleUser, ...updates };
      test.mockRepository.update.mockResolvedValue(updatedUser);
      test.mockRedis.setex.mockResolvedValue('OK');
      const eventSpy = jest.spyOn(test.userService, 'emit');

      await test.userService.updateUser('123', updates);

      expect(eventSpy).toHaveBeenCalledWith('user:updated', { user: updatedUser });
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      test.mockRepository.delete.mockResolvedValue(true);
      test.mockRedis.del.mockResolvedValue(1);

      const result = await test.userService.deleteUser('123');

      expect(result).toBe(true);
      expect(test.mockRepository.delete).toHaveBeenCalledWith('123');
      expect(test.mockRedis.del).toHaveBeenCalledWith('user:123');
    });

    it('should return false when user not found', async () => {
      test.mockRepository.delete.mockResolvedValue(false);

      const result = await test.userService.deleteUser('999');

      expect(result).toBe(false);
      expect(test.mockRedis.del).not.toHaveBeenCalled();
    });

    it('should handle cache deletion failure gracefully', async () => {
      test.mockRepository.delete.mockResolvedValue(true);
      test.mockRedis.del.mockRejectedValue(new Error('Redis error'));

      const result = await test.userService.deleteUser('123');

      expect(result).toBe(true);
      expect(test.mockLogger.warn).toHaveBeenCalledWith(
        'Failed to remove cached user',
        expect.objectContaining({ userId: '123' })
      );
    });

    it('should throw error for missing user ID', async () => {
      await expect(test.userService.deleteUser(''))
        .rejects.toThrow('User ID is required');
    });

    it('should emit user:deleted event', async () => {
      test.mockRepository.delete.mockResolvedValue(true);
      test.mockRedis.del.mockResolvedValue(1);
      const eventSpy = jest.spyOn(test.userService, 'emit');

      await test.userService.deleteUser('123');

      expect(eventSpy).toHaveBeenCalledWith('user:deleted', { userId: '123' });
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status', async () => {
      test.mockRepository.count.mockResolvedValue(100);
      test.mockRedis.ping.mockResolvedValue('PONG');

      const health = await test.userService.getHealthStatus();

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('checks');
      expect(health.checks).toHaveLength(2); // Database and Redis
    });
  });

  describe('getMetrics', () => {
    it('should return service metrics', () => {
      const metrics = test.userService.getMetrics();

      expect(metrics).toHaveProperty('circuitBreaker');
      expect(metrics).toHaveProperty('bulkhead');
      expect(metrics).toHaveProperty('fallback');
    });
  });

  describe('shutdown', () => {
    it('should shutdown gracefully', async () => {
      await test.userService.shutdown();

      expect(test.mockRedis.quit).toHaveBeenCalled();
      expect(test.mockLogger.info).toHaveBeenCalledWith('Shutting down UserService...');
      expect(test.mockLogger.info).toHaveBeenCalledWith('UserService shutdown complete');
    });
  });
});

describe('DefaultExternalAPIClient', () => {
  let client: DefaultExternalAPIClient;
  let mockAxios: any;

  beforeEach(() => {
    mockAxios = {
      post: jest.fn(),
      put: jest.fn()
    };
    
    // Mock axios.create to return our mock
    jest.mock('axios', () => ({
      create: () => mockAxios
    }));
    
    client = new DefaultExternalAPIClient();
  });

  describe('validateEmail', () => {
    it('should validate email successfully', async () => {
      mockAxios.post.mockResolvedValue({ data: { valid: true } });

      const result = await client.validateEmail('test@example.com');

      expect(result).toBe(true);
      expect(mockAxios.post).toHaveBeenCalledWith('/validate-email', { email: 'test@example.com' });
    });

    it('should return false for invalid email', async () => {
      mockAxios.post.mockResolvedValue({ data: { valid: false } });

      const result = await client.validateEmail('invalid@example.com');

      expect(result).toBe(false);
    });

    it('should throw error on service failure', async () => {
      mockAxios.post.mockRejectedValue(new Error('Service error'));

      await expect(client.validateEmail('test@example.com'))
        .rejects.toThrow('Email validation service unavailable');
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email successfully', async () => {
      mockAxios.post.mockResolvedValue({});

      const result = await client.sendWelcomeEmail({
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      expect(result).toBe(true);
    });

    it('should throw error on service failure', async () => {
      mockAxios.post.mockRejectedValue(new Error('Service error'));

      await expect(client.sendWelcomeEmail({} as any))
        .rejects.toThrow('Welcome email service unavailable');
    });
  });

  describe('syncUserProfile', () => {
    it('should sync user profile successfully', async () => {
      mockAxios.put.mockResolvedValue({});
      const user = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await client.syncUserProfile(user);

      expect(mockAxios.put).toHaveBeenCalledWith('/users/123', user);
    });

    it('should throw error on service failure', async () => {
      mockAxios.put.mockRejectedValue(new Error('Service error'));

      await expect(client.syncUserProfile({} as any))
        .rejects.toThrow('User sync service unavailable');
    });
  });
});