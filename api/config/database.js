const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'devx',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'devxplatform',
  password: process.env.POSTGRES_PASSWORD || 'devx_password',
  port: process.env.POSTGRES_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test the connection
pool.on('connect', (client) => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err, client) => {
  console.error('PostgreSQL connection error:', err);
});

// Initialize database connection and check if tables exist
const initDatabase = async () => {
  try {
    const client = await pool.connect();
    
    // Check if our main tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'devx' OR table_schema = 'templates'
    `);
    
    const tableNames = tablesResult.rows.map(row => row.table_name);
    console.log('Available database tables:', tableNames);
    
    if (tableNames.length === 0) {
      console.warn('No database tables found. Please run the database initialization scripts.');
    }
    
    client.release();
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    return false;
  }
};

module.exports = {
  pool,
  initDatabase,
};