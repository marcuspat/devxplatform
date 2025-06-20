import CircuitBreaker from 'opossum';
import { backOff } from 'exponential-backoff';
import { EventEmitter } from 'events';
import { Logger } from 'winston';

export interface User {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  update(id: string, updates: Partial<User>): Promise<User | null>;
  delete(id: string): Promise<boolean>;
}

export interface ExternalAPIClient {
  validateEmail(email: string): Promise<boolean>;
  sendWelcomeEmail(user: User): Promise<boolean>;
}

/**
 * Simplified user service demonstrating resilience patterns
 */
export class SimpleUserService extends EventEmitter {
  private repository: UserRepository;
  private externalAPI: ExternalAPIClient;
  private logger: Logger;
  private circuitBreaker: CircuitBreaker<any[], any>;
  private cache = new Map<string, { user: User; timestamp: number }>();
  private readonly CACHE_TTL = 300000; // 5 minutes

  constructor(
    repository: UserRepository,
    externalAPI: ExternalAPIClient,
    logger: Logger
  ) {
    super();
    this.repository = repository;
    this.externalAPI = externalAPI;
    this.logger = logger;
    
    // Initialize circuit breaker for external API
    this.circuitBreaker = new CircuitBreaker(this.externalAPI.validateEmail.bind(this.externalAPI), {
      timeout: 5000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000
    });

    this.circuitBreaker.on('open', () => {
      this.logger.warn('Circuit breaker opened for email validation');
    });

    this.circuitBreaker.on('close', () => {
      this.logger.info('Circuit breaker closed for email validation');
    });
  }

  /**
   * Get user by ID with caching and timeout
   */
  async getUserById(id: string): Promise<User | null> {
    if (!id) {
      throw new Error('User ID is required');
    }

    // Check cache first
    const cached = this.getCachedUser(id);
    if (cached) {
      this.emit('cache:hit', { userId: id });
      return cached;
    }

    try {
      // Database lookup with timeout
      const user = await this.withTimeout(
        () => this.repository.findById(id),
        5000
      );

      if (user) {
        this.cacheUser(user);
        this.emit('user:retrieved', { userId: id, source: 'database' });
      }

      return user;
    } catch (error) {
      this.logger.error('Failed to get user by ID', { userId: id, error });
      throw error;
    }
  }

  /**
   * Get user by email with retry logic
   */
  async getUserByEmail(email: string): Promise<User | null> {
    if (!email) {
      throw new Error('Email is required');
    }

    return this.withRetry(
      async () => {
        const user = await this.repository.findByEmail(email);
        if (user) {
          this.cacheUser(user);
        }
        return user;
      },
      {
        numOfAttempts: 3,
        startingDelay: 100,
        timeMultiple: 2,
        retry: (error: any) => {
          this.logger.warn('Retrying getUserByEmail', { email, error: error.message });
          return true;
        }
      }
    );
  }

  /**
   * Create user with email validation via circuit breaker
   */
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    if (!userData.email || !userData.name) {
      throw new Error('Email and name are required');
    }

    // Validate email with circuit breaker
    let isValidEmail: boolean;
    try {
      isValidEmail = await this.circuitBreaker.fire(userData.email);
    } catch (error) {
      this.logger.warn('Email validation failed, using fallback', { error });
      // Fallback: basic email validation
      isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email);
    }

    if (!isValidEmail) {
      throw new Error('Invalid email address');
    }

    // Check if user exists
    const existingUser = await this.getUserByEmail(userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create user
    const user = await this.repository.create(userData);
    this.cacheUser(user);
    
    // Send welcome email (fire and forget)
    this.sendWelcomeEmailAsync(user);
    
    this.emit('user:created', { user });
    return user;
  }

  /**
   * Update user
   */
  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    if (!id) {
      throw new Error('User ID is required');
    }

    const user = await this.repository.update(id, updates);
    
    if (user) {
      this.cacheUser(user);
      this.emit('user:updated', { user });
    }
    
    return user;
  }

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<boolean> {
    if (!id) {
      throw new Error('User ID is required');
    }

    const deleted = await this.repository.delete(id);
    
    if (deleted) {
      this.removeCachedUser(id);
      this.emit('user:deleted', { userId: id });
    }
    
    return deleted;
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      circuitBreaker: {
        state: this.circuitBreaker.opened ? 'open' : 'closed',
        stats: this.circuitBreaker.stats
      },
      cache: {
        size: this.cache.size
      }
    };
  }

  // Private helper methods

  private async withTimeout<T>(operation: () => Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timeout')), timeout);
      })
    ]);
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    options: any
  ): Promise<T> {
    return backOff(operation, options);
  }

  private getCachedUser(id: string): User | null {
    const cached = this.cache.get(id);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.user;
    }
    if (cached) {
      this.cache.delete(id); // Remove expired cache
    }
    return null;
  }

  private cacheUser(user: User): void {
    this.cache.set(user.id, {
      user,
      timestamp: Date.now()
    });
  }

  private removeCachedUser(id: string): void {
    this.cache.delete(id);
  }

  private async sendWelcomeEmailAsync(user: User): Promise<void> {
    try {
      await this.externalAPI.sendWelcomeEmail(user);
      this.logger.info('Welcome email sent', { userId: user.id });
    } catch (error) {
      this.logger.error('Failed to send welcome email', { userId: user.id, error });
    }
  }

  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down SimpleUserService');
    this.circuitBreaker.shutdown();
    this.cache.clear();
    this.removeAllListeners();
  }
}