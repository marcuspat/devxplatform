// Database Migration System using Knex.js

// knexfile.js - Knex configuration
module.exports = {
  development: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'myapp_dev',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      directory: './db/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './db/seeds',
    },
  },
  
  production: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 20,
    },
    migrations: {
      directory: './db/migrations',
      tableName: 'knex_migrations',
    },
  },
};

// Migration Helper Class
class MigrationHelper {
  constructor(knex) {
    this.knex = knex;
  }

  // Create a timestamp-based table with common fields
  async createTimestampedTable(tableName, schemaCallback) {
    return this.knex.schema.createTable(tableName, (table) => {
      table.increments('id').primary();
      schemaCallback(table);
      table.timestamps(true, true);
      table.index('created_at');
      table.index('updated_at');
    });
  }

  // Add common indexes
  async addCommonIndexes(tableName, columns) {
    return this.knex.schema.alterTable(tableName, (table) => {
      columns.forEach(column => {
        table.index(column);
      });
    });
  }

  // Add foreign key with cascade options
  async addForeignKey(tableName, columnName, referencedTable, referencedColumn = 'id') {
    return this.knex.schema.alterTable(tableName, (table) => {
      table.foreign(columnName)
        .references(referencedColumn)
        .inTable(referencedTable)
        .onDelete('CASCADE')
        .onUpdate('CASCADE');
    });
  }
}

// Example Migration: Create Users Table
// File: migrations/20240101120000_create_users_table.js
exports.up = async function(knex) {
  const helper = new MigrationHelper(knex);
  
  // Create users table
  await helper.createTimestampedTable('users', (table) => {
    table.uuid('uuid').defaultTo(knex.raw('gen_random_uuid()')).unique();
    table.string('email', 255).notNullable().unique();
    table.string('username', 50).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('first_name', 100);
    table.string('last_name', 100);
    table.date('birth_date');
    table.enum('role', ['user', 'admin', 'moderator']).defaultTo('user');
    table.boolean('is_active').defaultTo(true);
    table.boolean('email_verified').defaultTo(false);
    table.timestamp('last_login_at');
    table.jsonb('metadata').defaultTo('{}');
  });
  
  // Add indexes
  await helper.addCommonIndexes('users', ['email', 'username', 'is_active']);
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('users');
};

// Example Migration: Create Posts Table with Foreign Keys
// File: migrations/20240101130000_create_posts_table.js
exports.up = async function(knex) {
  const helper = new MigrationHelper(knex);
  
  // Create posts table
  await helper.createTimestampedTable('posts', (table) => {
    table.uuid('uuid').defaultTo(knex.raw('gen_random_uuid()')).unique();
    table.integer('user_id').unsigned().notNullable();
    table.string('title', 255).notNullable();
    table.string('slug', 255).notNullable().unique();
    table.text('content');
    table.enum('status', ['draft', 'published', 'archived']).defaultTo('draft');
    table.integer('view_count').defaultTo(0);
    table.jsonb('tags').defaultTo('[]');
    table.timestamp('published_at');
  });
  
  // Add foreign key
  await helper.addForeignKey('posts', 'user_id', 'users');
  
  // Add indexes
  await helper.addCommonIndexes('posts', ['slug', 'status', 'published_at']);
  
  // Add full-text search index for PostgreSQL
  if (knex.client.config.client === 'postgresql') {
    await knex.raw(`
      CREATE INDEX posts_search_idx ON posts 
      USING gin(to_tsvector('english', title || ' ' || coalesce(content, '')))
    `);
  }
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('posts');
};

// Migration Runner with enhanced features
class MigrationRunner {
  constructor(knex) {
    this.knex = knex;
  }

  // Run all pending migrations
  async migrate() {
    try {
      const [batch, migrations] = await this.knex.migrate.latest();
      if (migrations.length === 0) {
        console.log('Already up to date');
      } else {
        console.log(`Batch ${batch} run: ${migrations.length} migrations`);
        migrations.forEach(migration => {
          console.log(`- ${migration}`);
        });
      }
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  // Rollback last batch
  async rollback() {
    try {
      const [batch, migrations] = await this.knex.migrate.rollback();
      if (migrations.length === 0) {
        console.log('Already at the base migration');
      } else {
        console.log(`Batch ${batch} rolled back: ${migrations.length} migrations`);
        migrations.forEach(migration => {
          console.log(`- ${migration}`);
        });
      }
    } catch (error) {
      console.error('Rollback failed:', error);
      throw error;
    }
  }

  // Get migration status
  async status() {
    try {
      const completed = await this.knex.migrate.list();
      const pending = await this.knex.migrate.currentVersion();
      
      console.log('Completed migrations:');
      completed[0].forEach(migration => {
        console.log(`✓ ${migration}`);
      });
      
      if (completed[1].length > 0) {
        console.log('\nPending migrations:');
        completed[1].forEach(migration => {
          console.log(`- ${migration}`);
        });
      }
    } catch (error) {
      console.error('Failed to get migration status:', error);
      throw error;
    }
  }

  // Create a new migration file
  async create(name) {
    try {
      const migration = await this.knex.migrate.make(name);
      console.log(`Created migration: ${migration}`);
      return migration;
    } catch (error) {
      console.error('Failed to create migration:', error);
      throw error;
    }
  }
}

// Database Schema Builder utilities
class SchemaBuilder {
  constructor(knex) {
    this.knex = knex;
  }

  // Create audit trigger for PostgreSQL
  async createAuditTrigger(tableName) {
    if (this.knex.client.config.client !== 'postgresql') {
      console.warn('Audit triggers are only supported in PostgreSQL');
      return;
    }

    // Create audit table if not exists
    const auditTableExists = await this.knex.schema.hasTable('audit_log');
    if (!auditTableExists) {
      await this.knex.schema.createTable('audit_log', (table) => {
        table.increments('id').primary();
        table.string('table_name', 63).notNullable();
        table.string('operation', 10).notNullable();
        table.integer('user_id').unsigned();
        table.jsonb('old_data');
        table.jsonb('new_data');
        table.jsonb('changed_fields');
        table.timestamp('created_at').defaultTo(this.knex.fn.now());
        table.index(['table_name', 'created_at']);
      });
    }

    // Create trigger function
    await this.knex.raw(`
      CREATE OR REPLACE FUNCTION audit_trigger_function()
      RETURNS TRIGGER AS $$
      DECLARE
        changed_fields jsonb;
      BEGIN
        IF TG_OP = 'UPDATE' THEN
          SELECT jsonb_object_agg(key, value) INTO changed_fields
          FROM jsonb_each(to_jsonb(NEW))
          WHERE to_jsonb(NEW) -> key IS DISTINCT FROM to_jsonb(OLD) -> key;
          
          INSERT INTO audit_log (table_name, operation, old_data, new_data, changed_fields, user_id)
          VALUES (TG_TABLE_NAME, TG_OP, to_jsonb(OLD), to_jsonb(NEW), changed_fields, current_setting('app.current_user_id', true)::integer);
        ELSIF TG_OP = 'INSERT' THEN
          INSERT INTO audit_log (table_name, operation, new_data, user_id)
          VALUES (TG_TABLE_NAME, TG_OP, to_jsonb(NEW), current_setting('app.current_user_id', true)::integer);
        ELSIF TG_OP = 'DELETE' THEN
          INSERT INTO audit_log (table_name, operation, old_data, user_id)
          VALUES (TG_TABLE_NAME, TG_OP, to_jsonb(OLD), current_setting('app.current_user_id', true)::integer);
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger on table
    await this.knex.raw(`
      CREATE TRIGGER audit_trigger
      AFTER INSERT OR UPDATE OR DELETE ON ${tableName}
      FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
    `);
  }

  // Create updated_at trigger
  async createUpdatedAtTrigger(tableName) {
    if (this.knex.client.config.client === 'postgresql') {
      await this.knex.raw(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ language 'plpgsql';
        
        CREATE TRIGGER update_${tableName}_updated_at 
        BEFORE UPDATE ON ${tableName} 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);
    }
  }
}

module.exports = {
  MigrationHelper,
  MigrationRunner,
  SchemaBuilder,
};
