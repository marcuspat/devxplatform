import { jest } from '@jest/globals';

/**
 * Base test template with common setup and teardown
 */
export abstract class BaseTestTemplate {
  protected mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    log: jest.fn()
  };

  protected mockDatabase = {
    connect: jest.fn(),
    disconnect: jest.fn(),
    query: jest.fn(),
    transaction: jest.fn()
  };

  protected mockHttpClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn()
  };

  beforeEach(): void {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  }

  afterEach(): void {
    jest.clearAllTimers();
  }

  /**
   * Create a mock with TypeScript support
   */
  protected createMock<T>(implementation?: Partial<T>): jest.Mocked<T> {
    return implementation as jest.Mocked<T>;
  }

  /**
   * Create a spy on an object method
   */
  protected spyOn<T extends object>(
    object: T,
    method: keyof T
  ): jest.SpyInstance {
    return jest.spyOn(object, method as any);
  }

  /**
   * Assert async function throws
   */
  protected async assertThrowsAsync(
    fn: () => Promise<any>,
    error?: string | RegExp | Error
  ): Promise<void> {
    let thrown = false;
    try {
      await fn();
    } catch (e) {
      thrown = true;
      if (error) {
        if (error instanceof RegExp) {
          expect((e as Error).message).toMatch(error);
        } else if (error instanceof Error) {
          expect(e).toEqual(error);
        } else {
          expect((e as Error).message).toBe(error);
        }
      }
    }
    expect(thrown).toBe(true);
  }
}

/**
 * Service test template with dependency injection mocking
 */
export class ServiceTestTemplate extends BaseTestTemplate {
  /**
   * Create a service with mocked dependencies
   */
  protected createServiceWithMocks<T>(
    ServiceClass: new (...args: any[]) => T,
    dependencies: Record<string, any>
  ): { service: T; mocks: typeof dependencies } {
    const service = new ServiceClass(...Object.values(dependencies));
    return { service, mocks: dependencies };
  }

  /**
   * Test template for CRUD operations
   */
  protected generateCrudTests<T>(
    serviceName: string,
    service: any,
    mockRepo: any,
    sampleEntity: T
  ): void {
    describe(`${serviceName} CRUD Operations`, () => {
      describe('create', () => {
        it('should create entity successfully', async () => {
          mockRepo.create.mockResolvedValue(sampleEntity);
          
          const result = await service.create(sampleEntity);
          
          expect(result).toEqual(sampleEntity);
          expect(mockRepo.create).toHaveBeenCalledWith(sampleEntity);
        });

        it('should handle creation errors', async () => {
          const error = new Error('Database error');
          mockRepo.create.mockRejectedValue(error);
          
          await expect(service.create(sampleEntity)).rejects.toThrow(error);
        });
      });

      describe('read', () => {
        it('should find entity by id', async () => {
          mockRepo.findById.mockResolvedValue(sampleEntity);
          
          const result = await service.findById('123');
          
          expect(result).toEqual(sampleEntity);
          expect(mockRepo.findById).toHaveBeenCalledWith('123');
        });

        it('should return null for non-existent entity', async () => {
          mockRepo.findById.mockResolvedValue(null);
          
          const result = await service.findById('999');
          
          expect(result).toBeNull();
        });
      });

      describe('update', () => {
        it('should update entity successfully', async () => {
          mockRepo.update.mockResolvedValue(sampleEntity);
          
          const result = await service.update('123', sampleEntity);
          
          expect(result).toEqual(sampleEntity);
          expect(mockRepo.update).toHaveBeenCalledWith('123', sampleEntity);
        });
      });

      describe('delete', () => {
        it('should delete entity successfully', async () => {
          mockRepo.delete.mockResolvedValue(true);
          
          const result = await service.delete('123');
          
          expect(result).toBe(true);
          expect(mockRepo.delete).toHaveBeenCalledWith('123');
        });
      });
    });
  }
}

/**
 * Controller test template for HTTP endpoints
 */
export class ControllerTestTemplate extends BaseTestTemplate {
  protected mockRequest = {
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null
  };

  protected mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    sendStatus: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis()
  };

  protected mockNext = jest.fn();

  /**
   * Test template for REST endpoints
   */
  protected generateRestEndpointTests(
    controllerName: string,
    controller: any,
    mockService: any
  ): void {
    describe(`${controllerName} REST Endpoints`, () => {
      describe('GET /', () => {
        it('should return all items', async () => {
          const items = [{ id: 1 }, { id: 2 }];
          mockService.findAll.mockResolvedValue(items);
          
          await controller.getAll(this.mockRequest, this.mockResponse);
          
          expect(this.mockResponse.json).toHaveBeenCalledWith(items);
        });

        it('should handle errors', async () => {
          mockService.findAll.mockRejectedValue(new Error('Service error'));
          
          await controller.getAll(this.mockRequest, this.mockResponse, this.mockNext);
          
          expect(this.mockNext).toHaveBeenCalledWith(expect.any(Error));
        });
      });

      describe('GET /:id', () => {
        it('should return item by id', async () => {
          const item = { id: '123', name: 'Test' };
          this.mockRequest.params = { id: '123' };
          mockService.findById.mockResolvedValue(item);
          
          await controller.getById(this.mockRequest, this.mockResponse);
          
          expect(this.mockResponse.json).toHaveBeenCalledWith(item);
        });

        it('should return 404 for non-existent item', async () => {
          this.mockRequest.params = { id: '999' };
          mockService.findById.mockResolvedValue(null);
          
          await controller.getById(this.mockRequest, this.mockResponse);
          
          expect(this.mockResponse.status).toHaveBeenCalledWith(404);
          expect(this.mockResponse.json).toHaveBeenCalledWith({ error: 'Not found' });
        });
      });

      describe('POST /', () => {
        it('should create new item', async () => {
          const newItem = { name: 'New Item' };
          const created = { id: '123', ...newItem };
          this.mockRequest.body = newItem;
          mockService.create.mockResolvedValue(created);
          
          await controller.create(this.mockRequest, this.mockResponse);
          
          expect(this.mockResponse.status).toHaveBeenCalledWith(201);
          expect(this.mockResponse.json).toHaveBeenCalledWith(created);
        });

        it('should validate request body', async () => {
          this.mockRequest.body = {}; // Invalid body
          
          await controller.create(this.mockRequest, this.mockResponse);
          
          expect(this.mockResponse.status).toHaveBeenCalledWith(400);
          expect(this.mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: expect.any(String) })
          );
        });
      });
    });
  }
}

/**
 * Test utilities and helpers
 */
export class TestUtilities {
  /**
   * Create a mock implementation that tracks calls
   */
  static createTrackedMock<T extends (...args: any[]) => any>(
    implementation?: T
  ): jest.MockedFunction<T> & { calls: Parameters<T>[] } {
    const calls: Parameters<T>[] = [];
    const mock = jest.fn((...args: Parameters<T>) => {
      calls.push(args);
      return implementation?.(...args);
    }) as jest.MockedFunction<T> & { calls: Parameters<T>[] };
    
    mock.calls = calls;
    return mock;
  }

  /**
   * Wait for condition to be true
   */
  static async waitFor(
    condition: () => boolean,
    timeout = 5000,
    interval = 100
  ): Promise<void> {
    const startTime = Date.now();
    
    while (!condition()) {
      if (Date.now() - startTime > timeout) {
        throw new Error('Timeout waiting for condition');
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  /**
   * Create a deferred promise for testing async flows
   */
  static createDeferred<T>(): {
    promise: Promise<T>;
    resolve: (value: T) => void;
    reject: (error: Error) => void;
  } {
    let resolve: (value: T) => void;
    let reject: (error: Error) => void;
    
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    
    return { promise, resolve: resolve!, reject: reject! };
  }

  /**
   * Mock time-based functions
   */
  static mockTime(): {
    advanceTime: (ms: number) => void;
    restore: () => void;
  } {
    jest.useFakeTimers();
    
    return {
      advanceTime: (ms: number) => jest.advanceTimersByTime(ms),
      restore: () => jest.useRealTimers()
    };
  }
}

/**
 * Mock builders for common dependencies
 */
export class MockBuilder {
  /**
   * Build a mock Express request
   */
  static request(overrides: Partial<any> = {}): any {
    return {
      body: {},
      params: {},
      query: {},
      headers: {},
      cookies: {},
      user: null,
      session: {},
      method: 'GET',
      url: '/',
      baseUrl: '',
      originalUrl: '/',
      path: '/',
      ...overrides
    };
  }

  /**
   * Build a mock Express response
   */
  static response(): any {
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      sendStatus: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
      redirect: jest.fn().mockReturnThis(),
      render: jest.fn().mockReturnThis(),
      locals: {}
    };
    return res;
  }

  /**
   * Build a mock repository
   */
  static repository<T>(): any {
    return {
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      save: jest.fn(),
      count: jest.fn(),
      exists: jest.fn(),
      aggregate: jest.fn(),
      transaction: jest.fn()
    };
  }

  /**
   * Build a mock event emitter
   */
  static eventEmitter(): any {
    const listeners = new Map<string, Function[]>();
    
    return {
      on: jest.fn((event: string, handler: Function) => {
        if (!listeners.has(event)) {
          listeners.set(event, []);
        }
        listeners.get(event)!.push(handler);
      }),
      
      emit: jest.fn((event: string, ...args: any[]) => {
        const handlers = listeners.get(event) || [];
        handlers.forEach(handler => handler(...args));
      }),
      
      removeListener: jest.fn((event: string, handler: Function) => {
        const handlers = listeners.get(event) || [];
        const index = handlers.indexOf(handler);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
      }),
      
      removeAllListeners: jest.fn(() => listeners.clear())
    };
  }
}