const { Sequelize } = require('sequelize');
require('dotenv').config();

// Assuming MySQL, but cleanly defaults so it can be swapped.
const sequelize = new Sequelize(
  process.env.DB_NAME || 'gen_erp_v2',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: false
  }
);

module.exports = sequelize;
