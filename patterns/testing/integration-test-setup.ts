import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import { Client } from 'pg';
import Redis from 'ioredis';
import { MongoClient } from 'mongodb';
import * as amqp from 'amqplib';

/**
 * Base integration test setup with test containers
 */
export abstract class IntegrationTestSetup {
  protected static containers: Map<string, StartedTestContainer> = new Map();
  protected static connections: Map<string, any> = new Map();

  /**
   * Setup before all tests
   */
  static async setupBeforeAll(): Promise<void> {
    // Override in subclasses
  }

  /**
   * Teardown after all tests
   */
  static async teardownAfterAll(): Promise<void> {
    // Close all connections
    for (const [name, connection] of this.connections.entries()) {
      try {
        if (connection.close) await connection.close();
        if (connection.end) await connection.end();
        if (connection.disconnect) await connection.disconnect();
      } catch (error) {
        console.error(`Error closing connection ${name}:`, error);
      }
    }
    this.connections.clear();

    // Stop all containers
    for (const [name, container] of this.containers.entries()) {
      try {
        await container.stop();
      } catch (error) {
        console.error(`Error stopping container ${name}:`, error);
      }
    }
    this.containers.clear();
  }

  /**
   * Reset data between tests
   */
  static async resetData(): Promise<void> {
    // Override in subclasses
  }
}

/**
 * PostgreSQL integration test setup
 */
export class PostgresTestSetup extends IntegrationTestSetup {
  private static postgresClient: Client;

  static async setupBeforeAll(): Promise<void> {
    // Start PostgreSQL container
    const container = await new GenericContainer('postgres:15')
      .withEnvironment({
        POSTGRES_USER: 'test',
        POSTGRES_PASSWORD: 'test',
        POSTGRES_DB: 'testdb'
      })
      .withExposedPorts(5432)
      .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections'))
      .start();

    this.containers.set('postgres', container);

    // Create client
    const port = container.getMappedPort(5432);
    const host = container.getHost();
    
    this.postgresClient = new Client({
      host,
      port,
      user: 'test',
      password: 'test',
      database: 'testdb'
    });

    await this.postgresClient.connect();
    this.connections.set('postgres', this.postgresClient);

    // Run migrations
    await this.runMigrations();
  }

  static async runMigrations(): Promise<void> {
    // Create test tables
    await this.postgresClient.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.postgresClient.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  static async resetData(): Promise<void> {
    await this.postgresClient.query('TRUNCATE TABLE posts, users RESTART IDENTITY CASCADE');
  }

  static getClient(): Client {
    return this.postgresClient;
  }

  static getConnectionString(): string {
    const container = this.containers.get('postgres')!;
    const port = container.getMappedPort(5432);
    const host = container.getHost();
    return `postgresql://test:test@${host}:${port}/testdb`;
  }
}

/**
 * Redis integration test setup
 */
export class RedisTestSetup extends IntegrationTestSetup {
  private static redisClient: Redis;

  static async setupBeforeAll(): Promise<void> {
    // Start Redis container
    const container = await new GenericContainer('redis:7')
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
      .start();

    this.containers.set('redis', container);

    // Create client
    const port = container.getMappedPort(6379);
    const host = container.getHost();
    
    this.redisClient = new Redis({
      host,
      port,
      maxRetriesPerRequest: 1
    });

    this.connections.set('redis', this.redisClient);
  }

  static async resetData(): Promise<void> {
    await this.redisClient.flushall();
  }

  static getClient(): Redis {
    return this.redisClient;
  }

  static getConnectionString(): string {
    const container = this.containers.get('redis')!;
    const port = container.getMappedPort(6379);
    const host = container.getHost();
    return `redis://${host}:${port}`;
  }
}

/**
 * MongoDB integration test setup
 */
export class MongoTestSetup extends IntegrationTestSetup {
  private static mongoClient: MongoClient;
  private static database: any;

  static async setupBeforeAll(): Promise<void> {
    // Start MongoDB container
    const container = await new GenericContainer('mongo:6')
      .withEnvironment({
        MONGO_INITDB_ROOT_USERNAME: 'test',
        MONGO_INITDB_ROOT_PASSWORD: 'test',
        MONGO_INITDB_DATABASE: 'testdb'
      })
      .withExposedPorts(27017)
      .withWaitStrategy(Wait.forLogMessage('Waiting for connections'))
      .start();

    this.containers.set('mongodb', container);

    // Create client
    const port = container.getMappedPort(27017);
    const host = container.getHost();
    const url = `mongodb://test:test@${host}:${port}/testdb?authSource=admin`;
    
    this.mongoClient = new MongoClient(url);
    await this.mongoClient.connect();
    this.database = this.mongoClient.db('testdb');
    
    this.connections.set('mongodb', this.mongoClient);

    // Create indexes
    await this.createIndexes();
  }

  static async createIndexes(): Promise<void> {
    const users = this.database.collection('users');
    await users.createIndex({ email: 1 }, { unique: true });
  }

  static async resetData(): Promise<void> {
    const collections = await this.database.collections();
    await Promise.all(
      collections.map((collection: any) => collection.deleteMany({}))
    );
  }

  static getClient(): MongoClient {
    return this.mongoClient;
  }

  static getDatabase(): any {
    return this.database;
  }

  static getConnectionString(): string {
    const container = this.containers.get('mongodb')!;
    const port = container.getMappedPort(27017);
    const host = container.getHost();
    return `mongodb://test:test@${host}:${port}/testdb?authSource=admin`;
  }
}

/**
 * RabbitMQ integration test setup
 */
export class RabbitMQTestSetup extends IntegrationTestSetup {
  private static connection: amqp.Connection;
  private static channel: amqp.Channel;

  static async setupBeforeAll(): Promise<void> {
    // Start RabbitMQ container
    const container = await new GenericContainer('rabbitmq:3-management')
      .withEnvironment({
        RABBITMQ_DEFAULT_USER: 'test',
        RABBITMQ_DEFAULT_PASS: 'test'
      })
      .withExposedPorts(5672, 15672)
      .withWaitStrategy(Wait.forLogMessage('Server startup complete'))
      .start();

    this.containers.set('rabbitmq', container);

    // Create connection
    const port = container.getMappedPort(5672);
    const host = container.getHost();
    const url = `amqp://test:test@${host}:${port}`;
    
    this.connection = await amqp.connect(url);
    this.channel = await this.connection.createChannel();
    
    this.connections.set('rabbitmq', this.connection);
  }

  static async resetData(): Promise<void> {
    // Purge all queues
    try {
      const queues = ['test.queue', 'dead.letter.queue'];
      for (const queue of queues) {
        await this.channel.purgeQueue(queue).catch(() => {});
      }
    } catch (error) {
      // Ignore errors for non-existent queues
    }
  }

  static getConnection(): amqp.Connection {
    return this.connection;
  }

  static getChannel(): amqp.Channel {
    return this.channel;
  }

  static getConnectionString(): string {
    const container = this.containers.get('rabbitmq')!;
    const port = container.getMappedPort(5672);
    const host = container.getHost();
    return `amqp://test:test@${host}:${port}`;
  }

  static getManagementUrl(): string {
    const container = this.containers.get('rabbitmq')!;
    const port = container.getMappedPort(15672);
    const host = container.getHost();
    return `http://test:test@${host}:${port}`;
  }
}

/**
 * Elasticsearch integration test setup
 */
export class ElasticsearchTestSetup extends IntegrationTestSetup {
  private static esClient: any;

  static async setupBeforeAll(): Promise<void> {
    // Start Elasticsearch container
    const container = await new GenericContainer('elasticsearch:8.10.2')
      .withEnvironment({
        'discovery.type': 'single-node',
        'xpack.security.enabled': 'false',
        'ES_JAVA_OPTS': '-Xms512m -Xmx512m'
      })
      .withExposedPorts(9200)
      .withWaitStrategy(Wait.forLogMessage('started'))
      .start();

    this.containers.set('elasticsearch', container);

    // Create client (would use @elastic/elasticsearch in real app)
    const port = container.getMappedPort(9200);
    const host = container.getHost();
    
    // Mock client for example
    this.esClient = {
      host: `${host}:${port}`,
      // Add actual Elasticsearch client methods here
    };
    
    this.connections.set('elasticsearch', this.esClient);
  }

  static async resetData(): Promise<void> {
    // Delete test indices
    // await this.esClient.indices.delete({ index: 'test-*' });
  }

  static getClient(): any {
    return this.esClient;
  }

  static getConnectionString(): string {
    const container = this.containers.get('elasticsearch')!;
    const port = container.getMappedPort(9200);
    const host = container.getHost();
    return `http://${host}:${port}`;
  }
}

/**
 * Full stack integration test setup
 */
export class FullStackTestSetup extends IntegrationTestSetup {
  static async setupBeforeAll(): Promise<void> {
    // Start all services in parallel
    await Promise.all([
      PostgresTestSetup.setupBeforeAll(),
      RedisTestSetup.setupBeforeAll(),
      MongoTestSetup.setupBeforeAll(),
      RabbitMQTestSetup.setupBeforeAll()
    ]);
  }

  static async teardownAfterAll(): Promise<void> {
    await Promise.all([
      PostgresTestSetup.teardownAfterAll(),
      RedisTestSetup.teardownAfterAll(),
      MongoTestSetup.teardownAfterAll(),
      RabbitMQTestSetup.teardownAfterAll()
    ]);
  }

  static async resetData(): Promise<void> {
    await Promise.all([
      PostgresTestSetup.resetData(),
      RedisTestSetup.resetData(),
      MongoTestSetup.resetData(),
      RabbitMQTestSetup.resetData()
    ]);
  }

  static getServices() {
    return {
      postgres: PostgresTestSetup.getClient(),
      redis: RedisTestSetup.getClient(),
      mongodb: MongoTestSetup.getDatabase(),
      rabbitmq: {
        connection: RabbitMQTestSetup.getConnection(),
        channel: RabbitMQTestSetup.getChannel()
      }
    };
  }
}

/**
 * Test helpers for integration tests
 */
export class IntegrationTestHelpers {
  /**
   * Wait for service to be ready
   */
  static async waitForService(
    checkFn: () => Promise<boolean>,
    timeout = 30000,
    interval = 1000
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const ready = await checkFn();
        if (ready) return;
      } catch (error) {
        // Service not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error('Service did not become ready in time');
  }

  /**
   * Create test data factories
   */
  static createTestData() {
    return {
      user: (overrides = {}) => ({
        email: `test-${Date.now()}@example.com`,
        name: 'Test User',
        ...overrides
      }),
      
      post: (userId: number, overrides = {}) => ({
        user_id: userId,
        title: 'Test Post',
        content: 'Test content',
        ...overrides
      })
    };
  }
}