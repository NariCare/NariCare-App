const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  charset: 'utf8mb4',
  timezone: '+00:00'
};

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  logger.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test connection on module load
pool.getConnection()
  .then(connection => {
    logger.info('Database connection pool created successfully');
    connection.release();
  })
  .catch(err => {
    logger.error('Failed to create database connection pool:', err.message);
    process.exit(1);
  });

// Helper function to execute queries with error handling
const executeQuery = async (query, params = []) => {
  try {
    const [results] = await pool.execute(query, params);
    return results;
  } catch (error) {
    logger.error('Database query error:', {
      query: query.substring(0, 100) + '...',
      error: error.message,
      params: params
    });
    throw error;
  }
};

// Helper function for transactions
const executeTransaction = async (queries) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const results = [];
    for (const { query, params } of queries) {
      const [result] = await connection.execute(query, params);
      results.push(result);
    }
    
    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    logger.error('Transaction error:', error.message);
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  pool,
  executeQuery,
  executeTransaction
};