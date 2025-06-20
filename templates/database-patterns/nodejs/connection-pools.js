// Database Connection Pool Configurations for Node.js

// PostgreSQL with pg library
const { Pool } = require('pg');

class PostgreSQLPool {
  constructor(config = {}) {
    this.config = {
      host: config.host || process.env.POSTGRES_HOST || 'localhost',
      port: config.port || process.env.POSTGRES_PORT || 5432,
      database: config.database || process.env.POSTGRES_DB || 'myapp',
      user: config.user || process.env.POSTGRES_USER || 'postgres',
      password: config.password || process.env.POSTGRES_PASSWORD,
      // Connection pool settings
      max: config.maxConnections || 20,
      min: config.minConnections || 2,
      idleTimeoutMillis: config.idleTimeout || 30000,
      connectionTimeoutMillis: config.connectionTimeout || 2000,
      // Advanced settings
      allowExitOnIdle: config.allowExitOnIdle || false,
      ssl: config.ssl || process.env.NODE_ENV === 'production',
    };
    
    this.pool = new Pool(this.config);
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.pool.on('error', (err, client) => {
      console.error('Unexpected error on idle client', err);
    });

    this.pool.on('connect', (client) => {
      console.log('New client connected to PostgreSQL');
    });

    this.pool.on('acquire', (client) => {
      console.log('Client acquired from pool');
    });

    this.pool.on('remove', (client) => {
      console.log('Client removed from pool');
    });
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Query executed', { text, duration, rows: res.rowCount });
      return res;
    } catch (err) {
      console.error('Query error', { text, error: err.message });
      throw err;
    }
  }

  async getClient() {
    const client = await this.pool.connect();
    return client;
  }

  async end() {
    await this.pool.end();
  }
}

// MySQL with mysql2 library
const mysql = require('mysql2/promise');

class MySQLPool {
  constructor(config = {}) {
    this.config = {
      host: config.host || process.env.MYSQL_HOST || 'localhost',
      port: config.port || process.env.MYSQL_PORT || 3306,
      database: config.database || process.env.MYSQL_DB || 'myapp',
      user: config.user || process.env.MYSQL_USER || 'root',
      password: config.password || process.env.MYSQL_PASSWORD,
      // Connection pool settings
      connectionLimit: config.maxConnections || 20,
      queueLimit: config.queueLimit || 0,
      waitForConnections: config.waitForConnections !== false,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      // Advanced settings
      charset: config.charset || 'utf8mb4',
      timezone: config.timezone || 'Z',
      ssl: config.ssl || process.env.NODE_ENV === 'production',
      multipleStatements: config.multipleStatements || false,
    };
    
    this.pool = mysql.createPool(this.config);
  }

  async query(sql, params) {
    const start = Date.now();
    try {
      const [rows, fields] = await this.pool.execute(sql, params);
      const duration = Date.now() - start;
      console.log('Query executed', { sql, duration, affectedRows: rows.affectedRows });
      return [rows, fields];
    } catch (err) {
      console.error('Query error', { sql, error: err.message });
      throw err;
    }
  }

  async getConnection() {
    const connection = await this.pool.getConnection();
    return connection;
  }

  async end() {
    await this.pool.end();
  }

  getPoolStats() {
    return {
      all: this.pool._allConnections.length,
      free: this.pool._freeConnections.length,
      queue: this.pool._connectionQueue.length,
    };
  }
}

// MongoDB with mongoose
const mongoose = require('mongoose');

class MongoDBPool {
  constructor(config = {}) {
    this.config = {
      uri: config.uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/myapp',
      options: {
        maxPoolSize: config.maxConnections || 20,
        minPoolSize: config.minConnections || 2,
        serverSelectionTimeoutMS: config.serverSelectionTimeout || 5000,
        socketTimeoutMS: config.socketTimeout || 45000,
        family: 4,
        // Advanced settings
        retryWrites: config.retryWrites !== false,
        w: config.writeConcern || 'majority',
        readPreference: config.readPreference || 'primary',
        readConcern: { level: config.readConcernLevel || 'majority' },
      },
    };
  }

  async connect() {
    try {
      await mongoose.connect(this.config.uri, this.config.options);
      console.log('Connected to MongoDB');
      this.setupEventHandlers();
    } catch (err) {
      console.error('MongoDB connection error:', err);
      throw err;
    }
  }

  setupEventHandlers() {
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });
  }

  async disconnect() {
    await mongoose.disconnect();
  }

  getConnection() {
    return mongoose.connection;
  }

  getConnectionState() {
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    return states[mongoose.connection.readyState];
  }
}

// Redis connection pool with ioredis
const Redis = require('ioredis');

class RedisPool {
  constructor(config = {}) {
    this.config = {
      host: config.host || process.env.REDIS_HOST || 'localhost',
      port: config.port || process.env.REDIS_PORT || 6379,
      password: config.password || process.env.REDIS_PASSWORD,
      db: config.db || 0,
      // Connection pool settings
      maxRetriesPerRequest: config.maxRetries || 3,
      enableReadyCheck: true,
      lazyConnect: false,
      // Cluster settings (if using Redis Cluster)
      enableCluster: config.cluster || false,
      clusterNodes: config.clusterNodes || [],
    };

    if (this.config.enableCluster) {
      this.client = new Redis.Cluster(this.config.clusterNodes, {
        redisOptions: this.config,
      });
    } else {
      this.client = new Redis(this.config);
    }

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.client.on('connect', () => {
      console.log('Redis client connected');
    });

    this.client.on('error', (err) => {
      console.error('Redis error:', err);
    });

    this.client.on('close', () => {
      console.log('Redis connection closed');
    });

    this.client.on('reconnecting', () => {
      console.log('Redis reconnecting...');
    });
  }

  getClient() {
    return this.client;
  }

  async disconnect() {
    await this.client.quit();
  }
}

// Connection Manager for managing multiple database connections
class ConnectionManager {
  constructor() {
    this.connections = new Map();
  }

  async addPostgreSQL(name, config) {
    const pool = new PostgreSQLPool(config);
    this.connections.set(name, { type: 'postgresql', instance: pool });
    return pool;
  }

  async addMySQL(name, config) {
    const pool = new MySQLPool(config);
    this.connections.set(name, { type: 'mysql', instance: pool });
    return pool;
  }

  async addMongoDB(name, config) {
    const pool = new MongoDBPool(config);
    await pool.connect();
    this.connections.set(name, { type: 'mongodb', instance: pool });
    return pool;
  }

  async addRedis(name, config) {
    const pool = new RedisPool(config);
    this.connections.set(name, { type: 'redis', instance: pool });
    return pool;
  }

  get(name) {
    const connection = this.connections.get(name);
    return connection ? connection.instance : null;
  }

  async closeAll() {
    for (const [name, conn] of this.connections) {
      console.log(`Closing connection: ${name}`);
      try {
        switch (conn.type) {
          case 'postgresql':
          case 'mysql':
            await conn.instance.end();
            break;
          case 'mongodb':
          case 'redis':
            await conn.instance.disconnect();
            break;
        }
      } catch (err) {
        console.error(`Error closing ${name}:`, err);
      }
    }
    this.connections.clear();
  }
}

module.exports = {
  PostgreSQLPool,
  MySQLPool,
  MongoDBPool,
  RedisPool,
  ConnectionManager,
};
