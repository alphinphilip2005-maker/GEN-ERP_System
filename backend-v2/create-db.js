const mysql = require('mysql2/promise');
require('dotenv').config();

async function createDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  try {
    const dbName = process.env.DB_NAME || 'gen_erp_v2';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    console.log(`Database "${dbName}" created or already exists.`);
  } catch (error) {
    console.error('Error creating database:', error);
  } finally {
    await connection.end();
  }
}

createDatabase();
