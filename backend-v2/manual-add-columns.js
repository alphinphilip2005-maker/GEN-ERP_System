const sequelize = require('./db');

async function migrate() {
  try {
    await sequelize.authenticate();
    
    // Add Audit Trail columns
    const columns = [
      { name: 'submitted_at', type: 'DATETIME' },
      { name: 'approved_at', type: 'DATETIME' },
      { name: 'rejected_at', type: 'DATETIME' }
    ];

    for (const col of columns) {
      try {
        await sequelize.query(`ALTER TABLE PurchaseRequests ADD COLUMN ${col.name} ${col.type};`);
        console.log(`Added ${col.name} column`);
      } catch(e) { 
        console.log(`${col.name} might already exist or error: ${e.message}`); 
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

migrate();
