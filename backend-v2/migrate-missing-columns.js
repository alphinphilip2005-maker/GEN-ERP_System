const sequelize = require('./db');

async function migrate() {
  try {
    console.log('Starting migration...');
    const queries = [
      "ALTER TABLE PurchaseRequestItems ADD COLUMN custom_item_name VARCHAR(255);",
      "ALTER TABLE PurchaseRequestItems ADD COLUMN custom_item_code VARCHAR(255);",
      "ALTER TABLE PurchaseRequestItems ADD COLUMN selected_quote_id INTEGER;",
      "ALTER TABLE Vendors ADD COLUMN approval_status VARCHAR(255) DEFAULT 'Approved' NOT NULL;"
    ];

    for (const q of queries) {
      try {
        await sequelize.query(q);
        console.log('Executed:', q);
      } catch (err) {
        if (err.message.includes('duplicate column name')) {
          console.log('Column already exists, skipping:', q);
        } else {
          console.error('Error executing query:', q, err.message);
        }
      }
    }
    console.log('Migration completed!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
