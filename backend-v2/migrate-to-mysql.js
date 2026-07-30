const { Sequelize } = require('sequelize');

async function migrate() {
  console.log('Starting data migration from SQLite to MySQL...');

  // 1. Setup SQLite connection (raw, read-only)
  const sqliteDb = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false
  });

  // 2. Load the MySQL models (db.js is now configured for MySQL)
  const mysqlDb = require('./db');
  const models = require('./models');

  try {
    await sqliteDb.authenticate();
    console.log('Connected to SQLite database.sqlite');
    await mysqlDb.authenticate();
    console.log('Connected to MySQL database');
  } catch (err) {
    console.error('Database connection error:', err.message);
    console.log('Please make sure MySQL (XAMPP/WAMP) is running and the database exists.');
    process.exit(1);
  }

  // 3. Sync MySQL models (creates tables if they don't exist)
  await mysqlDb.sync({ force: false, alter: true });
  console.log('MySQL schema synced.');

  // Disable foreign key checks in MySQL temporarily
  await mysqlDb.query('SET FOREIGN_KEY_CHECKS = 0');

  // List of tables in correct insertion order (or we can just ignore foreign keys and insert all)
  const tables = [
    'Modules', 'Users', 'Permissions', 'ItemCategories', 'Uoms', 'Items', 'Vendors', 'Projects', 
    'BomProjects', 'BomRevisions', 'BomItems', 'PurchaseRequests', 'PurchaseRequestItems', 
    'Quotes', 'PurchaseOrders', 'PurchaseOrderItems', 'Grns', 'GrnItems', 'Stocks', 
    'MaterialRejections', 'Mrns', 'MrnItems', 'ProjectInventories', 'MaterialIssueNotes',
    'Payments', 'PaymentHistories', 'Notifications'
  ];

  for (const tableName of tables) {
    try {
      const rows = await sqliteDb.query(`SELECT * FROM ${tableName}`, { type: Sequelize.QueryTypes.SELECT });
      if (rows.length > 0) {
        // Find the model
        const modelName = Object.keys(models).find(key => models[key].tableName === tableName);
        if (modelName) {
           await models[modelName].bulkCreate(rows, { ignoreDuplicates: true });
           console.log(`Migrated ${rows.length} rows to ${tableName}`);
        } else {
           // fallback raw insert (if any)
        }
      }
    } catch(e) {
      console.log(`Skipped table ${tableName} (might be empty or missing in SQLite)`);
    }
  }

  await mysqlDb.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('Migration complete!');
  process.exit(0);
}

migrate();
