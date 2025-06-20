#!/usr/bin/env node

const MigrationRunner = require('../migrations/index');

async function main() {
  const command = process.argv[2];
  const migrationRunner = new MigrationRunner();

  try {
    switch (command) {
      case 'up':
      case 'run':
        console.log('Running migrations...');
        await migrationRunner.runMigrations();
        break;

      case 'status':
        console.log('Checking migration status...');
        const status = await migrationRunner.getStatus();
        console.log('Migration Status:');
        console.log(`  Total migrations: ${status.total}`);
        console.log(`  Executed: ${status.executed}`);
        console.log(`  Pending: ${status.pending}`);
        if (status.lastExecuted) {
          console.log(`  Last executed: ${status.lastExecuted.filename} at ${status.lastExecuted.executed_at}`);
        }
        break;

      case 'create':
        const name = process.argv[3];
        if (!name) {
          console.error('Usage: npm run migrate create <migration_name>');
          process.exit(1);
        }
        await createMigration(name);
        break;

      default:
        console.log('Available commands:');
        console.log('  up, run    - Run pending migrations');
        console.log('  status     - Show migration status');
        console.log('  create     - Create a new migration file');
        console.log('');
        console.log('Examples:');
        console.log('  npm run migrate up');
        console.log('  npm run migrate status');
        console.log('  npm run migrate create add_user_preferences');
    }
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }

  process.exit(0);
}

async function createMigration(name) {
  const fs = require('fs');
  const path = require('path');
  
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
  const filename = `${timestamp}_${name}.sql`;
  const migrationsDir = path.join(__dirname, '../migrations/migrations');
  const filepath = path.join(migrationsDir, filename);

  // Ensure migrations directory exists
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  const template = `-- Migration: ${filename.replace('.sql', '')}
-- Description: ${name.replace(/_/g, ' ')}

SET search_path TO devx, templates, public;

-- Add your migration SQL here
-- Example:
-- CREATE TABLE IF NOT EXISTS example_table (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     name VARCHAR(255) NOT NULL,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
-- );

SELECT 'Migration ${name} placeholder' as result;
`;

  fs.writeFileSync(filepath, template);
  console.log(`Created migration: ${filename}`);
}

if (require.main === module) {
  main();
}

module.exports = { main };