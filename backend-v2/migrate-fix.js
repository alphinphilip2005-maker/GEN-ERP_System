const sequelize = require('./db');

async function migrate() {
  try {
    console.log('Starting migration: Adding line_status to PurchaseRequestItems...');
    const [results, metadata] = await sequelize.query(
      "ALTER TABLE PurchaseRequestItems ADD COLUMN line_status VARCHAR(255) DEFAULT 'Approved' NOT NULL;"
    );
    console.log('Migration successful!');
    process.exit(0);
  } catch (err) {
    if (err.message.includes('duplicate column name')) {
      console.log('Column line_status already exists. Skipping.');
      process.exit(0);
    }
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
