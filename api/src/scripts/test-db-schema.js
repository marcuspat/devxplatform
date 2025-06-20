#!/usr/bin/env node

/**
 * Database Schema Validation Test
 * This script validates the database schema and migration system
 */

const fs = require('fs');
const path = require('path');

function validateSchemaFile() {
  console.log('🔍 Validating database schema file...');
  
  const schemaPath = path.join(__dirname, '../../../infrastructure/docker/init-scripts/01-init-db.sql');
  
  if (!fs.existsSync(schemaPath)) {
    console.error('❌ Schema file not found:', schemaPath);
    return false;
  }
  
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  
  // Check for required tables
  const requiredTables = [
    'users',
    'templates.templates',
    'projects',
    'services',  // Our new table
    'generation_history',  // Our new table
    'templates.categories',
    'templates.technologies',
    'activity_logs'
  ];
  
  const missingTables = [];
  
  for (const table of requiredTables) {
    const tablePattern = new RegExp(`CREATE TABLE.*${table.replace('.', '\\.')}`, 'i');
    if (!tablePattern.test(schemaContent)) {
      missingTables.push(table);
    }
  }
  
  if (missingTables.length > 0) {
    console.error('❌ Missing tables:', missingTables);
    return false;
  }
  
  console.log('✅ All required tables found in schema');
  
  // Check for required indexes
  const requiredIndexes = [
    'idx_users_email',
    'idx_templates_slug',
    'idx_projects_user_id',
    'idx_services_user_id',  // Our new index
    'idx_generation_history_user_id'  // Our new index
  ];
  
  const missingIndexes = [];
  
  for (const index of requiredIndexes) {
    const indexPattern = new RegExp(`CREATE INDEX.*${index}`, 'i');
    if (!indexPattern.test(schemaContent)) {
      missingIndexes.push(index);
    }
  }
  
  if (missingIndexes.length > 0) {
    console.error('❌ Missing indexes:', missingIndexes);
    return false;
  }
  
  console.log('✅ All required indexes found in schema');
  return true;
}

function validateMigrationSystem() {
  console.log('🔍 Validating migration system...');
  
  const migrationRunnerPath = path.join(__dirname, '../migrations/index.js');
  const migrationsDir = path.join(__dirname, '../migrations/migrations');
  
  if (!fs.existsSync(migrationRunnerPath)) {
    console.error('❌ Migration runner not found:', migrationRunnerPath);
    return false;
  }
  
  if (!fs.existsSync(migrationsDir)) {
    console.error('❌ Migrations directory not found:', migrationsDir);
    return false;
  }
  
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  console.log(`✅ Found ${migrationFiles.length} migration files:`, migrationFiles);
  
  // Validate migration runner class
  try {
    const MigrationRunner = require('../migrations/index.js');
    const runner = new MigrationRunner();
    console.log('✅ Migration runner class loaded successfully');
    return true;
  } catch (error) {
    console.error('❌ Error loading migration runner:', error.message);
    return false;
  }
}

function validateDatabaseConfig() {
  console.log('🔍 Validating database configuration...');
  
  const configPath = path.join(__dirname, '../../config/database.js');
  
  if (!fs.existsSync(configPath)) {
    console.error('❌ Database config not found:', configPath);
    return false;
  }
  
  try {
    const config = require(configPath);
    
    if (!config.pool) {
      console.error('❌ Database pool not exported');
      return false;
    }
    
    if (!config.initDatabase) {
      console.error('❌ initDatabase function not exported');
      return false;
    }
    
    console.log('✅ Database configuration is valid');
    return true;
  } catch (error) {
    console.error('❌ Error loading database config:', error.message);
    return false;
  }
}

function validateEnvironmentConfig() {
  console.log('🔍 Validating environment configuration...');
  
  const envExamplePath = path.join(__dirname, '../../.env.example');
  
  if (!fs.existsSync(envExamplePath)) {
    console.error('❌ .env.example not found:', envExamplePath);
    return false;
  }
  
  const envContent = fs.readFileSync(envExamplePath, 'utf8');
  
  const requiredVars = [
    'POSTGRES_HOST',
    'POSTGRES_PORT',
    'POSTGRES_DB',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'DATABASE_URL'
  ];
  
  const missingVars = [];
  
  for (const varName of requiredVars) {
    if (!envContent.includes(varName)) {
      missingVars.push(varName);
    }
  }
  
  if (missingVars.length > 0) {
    console.error('❌ Missing environment variables:', missingVars);
    return false;
  }
  
  console.log('✅ Environment configuration is complete');
  return true;
}

function main() {
  console.log('🧪 Starting Database Infrastructure Validation\\n');
  
  const tests = [
    { name: 'Schema Validation', test: validateSchemaFile },
    { name: 'Migration System', test: validateMigrationSystem },
    { name: 'Database Config', test: validateDatabaseConfig },
    { name: 'Environment Config', test: validateEnvironmentConfig }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const { name, test } of tests) {
    console.log(`\\n--- ${name} ---`);
    try {
      if (test()) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`❌ ${name} failed with error:`, error.message);
      failed++;
    }
  }
  
  console.log('\\n' + '='.repeat(50));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All database infrastructure tests passed!');
    console.log('\\n📋 Summary:');
    console.log('  ✅ Database schema with all required tables');
    console.log('  ✅ Services and generation_history tables added');
    console.log('  ✅ Migration system ready for startup execution');
    console.log('  ✅ Database connectivity configuration');
    console.log('  ✅ Environment variables configured');
    console.log('\\n🚀 Ready to start with docker-compose up!');
    return true;
  } else {
    console.log('❌ Some tests failed. Please fix the issues above.');
    return false;
  }
}

if (require.main === module) {
  const success = main();
  process.exit(success ? 0 : 1);
}

module.exports = { main };