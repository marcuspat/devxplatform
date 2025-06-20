const fs = require('fs');
const path = require('path');
const { pool } = require('../../config/database');

class MigrationRunner {
  constructor() {
    this.migrationsDir = path.join(__dirname, 'migrations');
    this.migrationTableName = 'schema_migrations';
  }

  async ensureMigrationsTable() {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.migrationTableName} (
          id SERIAL PRIMARY KEY,
          version VARCHAR(255) UNIQUE NOT NULL,
          filename VARCHAR(255) NOT NULL,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          checksum VARCHAR(255)
        )
      `);
      console.log('✓ Migrations table ensured');
    } catch (error) {
      console.error('Error creating migrations table:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getExecutedMigrations() {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT version, filename, executed_at, checksum 
        FROM ${this.migrationTableName} 
        ORDER BY executed_at ASC
      `);
      return result.rows;
    } catch (error) {
      console.error('Error fetching executed migrations:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getMigrationFiles() {
    const migrationsPath = path.join(__dirname, 'migrations');
    
    // Create migrations directory if it doesn't exist
    if (!fs.existsSync(migrationsPath)) {
      fs.mkdirSync(migrationsPath, { recursive: true });
      console.log('Created migrations directory');
    }

    const files = fs.readdirSync(migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();

    return files.map(filename => ({
      filename,
      version: filename.replace('.sql', ''),
      path: path.join(migrationsPath, filename)
    }));
  }

  generateChecksum(content) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(content).digest('hex');
  }

  async executeMigration(migration) {
    const client = await pool.connect();
    try {
      const content = fs.readFileSync(migration.path, 'utf8');
      const checksum = this.generateChecksum(content);

      // Begin transaction
      await client.query('BEGIN');

      // Execute migration SQL
      await client.query(content);

      // Record migration execution
      await client.query(`
        INSERT INTO ${this.migrationTableName} (version, filename, checksum)
        VALUES ($1, $2, $3)
      `, [migration.version, migration.filename, checksum]);

      // Commit transaction
      await client.query('COMMIT');

      console.log(`✓ Executed migration: ${migration.filename}`);
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`✗ Failed to execute migration ${migration.filename}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async runMigrations() {
    console.log('🔄 Starting database migrations...');
    
    try {
      // Ensure migrations table exists
      await this.ensureMigrationsTable();

      // Get executed migrations
      const executedMigrations = await this.getExecutedMigrations();
      const executedVersions = new Set(executedMigrations.map(m => m.version));

      // Get migration files
      const migrationFiles = await this.getMigrationFiles();

      // Filter pending migrations
      const pendingMigrations = migrationFiles.filter(
        migration => !executedVersions.has(migration.version)
      );

      if (pendingMigrations.length === 0) {
        console.log('✓ No pending migrations');
        return true;
      }

      console.log(`📋 Found ${pendingMigrations.length} pending migrations`);

      // Execute pending migrations
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }

      console.log('✅ All migrations completed successfully');
      return true;

    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  async rollbackMigration(version) {
    // This would implement rollback functionality
    console.log(`Rolling back migration: ${version}`);
    // TODO: Implement rollback logic if needed
    throw new Error('Rollback functionality not implemented yet');
  }

  async getStatus() {
    try {
      const executedMigrations = await this.getExecutedMigrations();
      const migrationFiles = await this.getMigrationFiles();

      const status = {
        executed: executedMigrations.length,
        pending: migrationFiles.length - executedMigrations.length,
        total: migrationFiles.length,
        lastExecuted: executedMigrations[executedMigrations.length - 1] || null
      };

      return status;
    } catch (error) {
      console.error('Error getting migration status:', error);
      throw error;
    }
  }
}

module.exports = MigrationRunner;