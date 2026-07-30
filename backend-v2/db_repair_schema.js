const sequelize = require('./db');
const models = require('./models'); // Loads all models to register with sequelize

async function repair() {
  console.log('--- [GEN ERP] Starting Database Schema Repair ---');
  try {
    console.log('Attempting to auto-alter tables to add missing columns...');
    // alter: true detects missing columns and adds them without dropping data
    await sequelize.sync({ alter: true }); 
    console.log('✅ SUCCESS: Database schema has been fully synchronized and updated.');
    console.log('Any missing IQC, GRN, or MRN columns have been automatically created.');
  } catch (error) {
    console.error('❌ ERROR during schema update:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

repair();
