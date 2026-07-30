const sequelize = require('./db');
const models = require('./models');

async function resync() {
  try {
    await sequelize.authenticate();
    // alter: true will add the missing product_id and qc_required columns
    await sequelize.sync({ alter: true });
    console.log('Database schema force synced.');
    process.exit(0);
  } catch (err) {
    console.error('Error syncing:', err);
    process.exit(1);
  }
}
resync();
