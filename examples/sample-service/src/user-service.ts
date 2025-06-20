import CircuitBreaker from 'opossum';
import { backOff } from 'exponential-backoff';
import { EventEmitter } from 'events';
import { Logger } from 'winston';
import axios, { AxiosInstance } from 'axios';
import Redis from 'ioredis';
import { EventEmitter } from 'events';

export interface User {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(page: number, limit: number): Promise<User[]>;
  create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  update(id: string, updates: Partial<User>): Promise<User | null>;
  delete(id: string): Promise<boolean>;
  count(): Promise<number>;
}

export interface ExternalAPIClient {
  validateEmail(email: string): Promise<boolean>;
  sendWelcomeEmail(user: User): Promise<boolean>;
  syncUserProfile(user: User): Promise<void>;
}

export interface UserServiceConfig {
  logger?: Logger;
  redis?: Redis;
  externalAPI?: ExternalAPIClient;
  circuitBreakerTimeout?: number;
  retryAttempts?: number;
  bulkheadSize?: number;
  cacheTimeout?: number;
}

/**
 * Comprehensive user service demonstrating all resilience patterns
 */
export class UserService extends EventEmitter {
  private repository: UserRepository;
  private redis: Redis;
  private externalAPI: ExternalAPIClient;
  private logger: Logger;
  private healthManager: HealthCheckManager;
  
  // Resilience patterns
  private circuitBreaker: any;
  private bulkhead: Bulkhead<any>;
  private fallbackHandler: FallbackHandler<User>;
  private fallbackDataHandler: FallbackHandler<User[]>;
  
  private config: Required<UserServiceConfig>;
  
  constructor(
    repository: UserRepository,
    config: UserServiceConfig = {}
  ) {
    super();
    
    this.repository = repository;
    this.redis = config.redis || new Redis();
    this.externalAPI = config.externalAPI || new DefaultExternalAPIClient();
    this.logger = config.logger || console as any;
    
    this.config = {
      logger: this.logger,
      redis: this.redis,
      externalAPI: this.externalAPI,
      circuitBreakerTimeout: config.circuitBreakerTimeout || 5000,
      retryAttempts: config.retryAttempts || 3,
      bulkheadSize: config.bulkheadSize || 10,
      cacheTimeout: config.cacheTimeout || 300000
    };
    
    this.initializeResiliencePatterns();
    this.setupHealthChecks();
    this.registerShutdownHandlers();
  }

  private initializeResiliencePatterns(): void {
    // Circuit breaker for external API calls
    this.circuitBreaker = createCircuitBreaker(
      async (operation: () => Promise<any>) => operation(),
      {
        timeout: this.config.circuitBreakerTimeout,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
        name: 'UserService-ExternalAPI',
        logger: this.logger
      }
    );

    // Bulkhead for limiting concurrent operations
    this.bulkhead = new Bulkhead({
      maxConcurrent: this.config.bulkheadSize,
      maxQueueSize: 50,
      name: 'UserService-Operations'
    });
    
    // Fallback handlers
    this.fallbackHandler = new FallbackHandler<User>({
      name: 'UserService-SingleUser',
      cache: true,
      cacheTimeout: this.config.cacheTimeout,
      logger: this.logger
    });
    
    this.fallbackDataHandler = new FallbackHandler<User[]>({
      name: 'UserService-UserList',
      cache: true,
      cacheTimeout: this.config.cacheTimeout,
      logger: this.logger
    });
  }

  private setupHealthChecks(): void {
    this.healthManager = new HealthCheckManager('1.0.0');
    
    // Database health check
    this.healthManager.register(
      CommonHealthChecks.database('user-database', async () => {
        await this.repository.count();
      })
    );
    
    // Redis health check
    this.healthManager.register({
      name: 'redis',
      check: async () => {
        const start = Date.now();
        await this.redis.ping();
        return {
          name: 'redis',
          status: 'healthy',
          duration: Date.now() - start,
          timestamp: new Date()
        };
      },
      critical: true,
      timeout: 5000,
      interval: 30000
    });
  }

  private registerShutdownHandlers(): void {
    onShutdown('user-service-cleanup', async () => {
      await this.shutdown();
    }, { priority: 5 });
  }

  /**
   * Get user by ID with full resilience patterns
   */
  async getUserById(id: string): Promise<User | null> {
    if (!id) {
      throw new Error('User ID is required');
    }

    return this.fallbackHandler.execute(
      // Primary: Database with circuit breaker
      async () => {
        return withTimeout(
          () => this.repository.findById(id),
          this.config.circuitBreakerTimeout
        );
      },
      // Fallback: Cache lookup
      async () => {
        const cached = await this.getCachedUser(id);
        if (!cached) {
          throw new Error(`User ${id} not found in cache`);
        }
        return cached;
      },
      `user:${id}`
    ).then(result => {
      if (result.value) {
        this.cacheUser(result.value);
        this.emit('user:retrieved', { userId: id, source: result.source });
      }
      return result.value;
    });
  }

  /**
   * Get user by email with retry pattern
   */
  async getUserByEmail(email: string): Promise<User | null> {
    if (!email) {
      throw new Error('Email is required');
    }

    return withRetry(
      async () => {
        const user = await this.repository.findByEmail(email);
        if (user) {
          await this.cacheUser(user);
        }
        return user;
      },
      {
        maxAttempts: this.config.retryAttempts,
        initialDelay: 100,
        factor: 2,
        onRetry: (error, attempt) => {
          this.logger.warn(`Retry attempt ${attempt} for getUserByEmail`, { email, error: error.message });
        }
      }
    );
  }

  /**
   * Get all users with fallback and bulkhead
   */
  async getAllUsers(page = 1, limit = 10): Promise<User[]> {
    return this.bulkhead.execute({
      id: `get-all-users-${Date.now()}`,
      execute: async () => {
        return this.fallbackDataHandler.execute(
          // Primary: Database query
          async () => {
            const users = await this.repository.findAll(page, limit);
            // Cache each user individually
            await Promise.all(users.map(user => this.cacheUser(user)));
            return users;
          },
          // Fallback: Return cached users
          async () => {
            this.logger.warn('Falling back to cached users for getAllUsers');
            return this.getCachedUserList(page, limit);
          },
          `users:page:${page}:limit:${limit}`
        ).then(result => result.value);
      },
      priority: 1
    });
  }

  /**
   * Create user with external API validation
   */
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    if (!userData.email || !userData.name) {
      throw new Error('Email and name are required');
    }

    // Validate email with external service using circuit breaker
    const isValidEmail = await this.circuitBreaker.execute(async () => {
      return this.externalAPI.validateEmail(userData.email);
    }).catch((error: Error) => {
      this.logger.warn('Email validation failed, using fallback validation', { error: error.message });
      // Fallback: Basic email validation
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email);
    });

    if (!isValidEmail) {
      throw new Error('Invalid email address');
    }

    // Check if user already exists
    const existingUser = await this.getUserByEmail(userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create user in database
    const user = await this.repository.create(userData);
    
    // Cache the new user
    await this.cacheUser(user);
    
    // Send welcome email (fire and forget with circuit breaker)
    this.circuitBreaker.execute(async () => {
      await this.externalAPI.sendWelcomeEmail(user);
    }).catch((error: Error) => {
      this.logger.error('Failed to send welcome email', { userId: user.id, error: error.message });
    });
    
    this.emit('user:created', { user });
    return user;
  }

  /**
   * Update user with optimistic concurrency
   */
  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    if (!id) {
      throw new Error('User ID is required');
    }

    const user = await this.bulkhead.execute({
      id: `update-user-${id}`,
      execute: async () => {
        const updatedUser = await this.repository.update(id, updates);
        
        if (updatedUser) {
          // Update cache
          await this.cacheUser(updatedUser);
          
          // Sync with external service
          this.circuitBreaker.execute(async () => {
            await this.externalAPI.syncUserProfile(updatedUser);
          }).catch((error: Error) => {
            this.logger.warn('Failed to sync user profile', { userId: id, error: error.message });
          });
          
          this.emit('user:updated', { user: updatedUser });
        }
        
        return updatedUser;
      },
      priority: 2
    });

    return user;
  }

  /**
   * Delete user with cleanup
   */
  async deleteUser(id: string): Promise<boolean> {
    if (!id) {
      throw new Error('User ID is required');
    }

    const deleted = await this.repository.delete(id);
    
    if (deleted) {
      // Remove from cache
      await this.removeCachedUser(id);
      this.emit('user:deleted', { userId: id });
    }
    
    return deleted;
  }

  /**
   * Get service health status
   */
  async getHealthStatus() {
    return this.healthManager.getHealth();
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      circuitBreaker: this.circuitBreaker.getMetrics(),
      bulkhead: this.bulkhead.getMetrics(),
      fallback: {
        cacheSize: this.fallbackHandler.getCacheSize()
      }
    };
  }

  // Private cache methods
  private async cacheUser(user: User): Promise<void> {
    try {
      await this.redis.setex(
        `user:${user.id}`, 
        this.config.cacheTimeout / 1000, 
        JSON.stringify(user)
      );
    } catch (error) {
      this.logger.warn('Failed to cache user', { userId: user.id, error });
    }
  }

  private async getCachedUser(id: string): Promise<User | null> {
    try {
      const cached = await this.redis.get(`user:${id}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.warn('Failed to get cached user', { userId: id, error });
      return null;
    }
  }

  private async getCachedUserList(page: number, limit: number): Promise<User[]> {
    try {
      const pattern = 'user:*';
      const keys = await this.redis.keys(pattern);
      const start = (page - 1) * limit;
      const end = start + limit;
      const selectedKeys = keys.slice(start, end);
      
      if (selectedKeys.length === 0) {
        return [];
      }
      
      const users = await this.redis.mget(...selectedKeys);
      return users
        .filter(user => user !== null)
        .map(user => JSON.parse(user!))
        .filter((user): user is User => user !== null);
    } catch (error) {
      this.logger.warn('Failed to get cached user list', { page, limit, error });
      return [];
    }
  }

  private async removeCachedUser(id: string): Promise<void> {
    try {
      await this.redis.del(`user:${id}`);
    } catch (error) {
      this.logger.warn('Failed to remove cached user', { userId: id, error });
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down UserService...');
    
    // Shutdown resilience patterns
    this.circuitBreaker.shutdown();
    await this.bulkhead.shutdown();
    this.fallbackHandler.clearCache();
    this.fallbackDataHandler.clearCache();
    
    // Shutdown health checks
    this.healthManager.shutdown();
    
    // Close Redis connection
    await this.redis.quit();
    
    // Remove all event listeners
    this.removeAllListeners();
    
    this.logger.info('UserService shutdown complete');
  }
}

/**
 * Default external API client implementation
 */
export class DefaultExternalAPIClient implements ExternalAPIClient {
  private httpClient: AxiosInstance;

  constructor(baseURL = 'https://api.example.com') {
    this.httpClient = axios.create({
      baseURL,
      timeout: 5000
    });
  }

  async validateEmail(email: string): Promise<boolean> {
    try {
      const response = await this.httpClient.post('/validate-email', { email });
      return response.data.valid === true;
    } catch (error) {
      // On error, assume email is invalid
      throw new Error('Email validation service unavailable');
    }
  }

  async sendWelcomeEmail(user: User): Promise<boolean> {
    try {
      await this.httpClient.post('/send-welcome-email', { 
        email: user.email, 
        name: user.name 
      });
      return true;
    } catch (error) {
      throw new Error('Welcome email service unavailable');
    }
  }

  async syncUserProfile(user: User): Promise<void> {
    try {
      await this.httpClient.put(`/users/${user.id}`, user);
    } catch (error) {
      throw new Error('User sync service unavailable');
    }
  }
}