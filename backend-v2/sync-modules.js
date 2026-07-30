const sequelize = require('./db');
const { Module } = require('./models');

const MODULES = [
  'Item Master',
  'Vendor Master',
  'BOM',
  'Purchase Request',
  'Quotation Management',
  'Purchase Order',
  'GRN',
  'IQC',
  'Inventory',
  'MRN',
  'Material Rejection Log',
  'Payment Management'
];

async function syncModules() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    for (const name of MODULES) {
      const [module, created] = await Module.findOrCreate({
        where: { module_name: name },
        defaults: { module_name: name }
      });
      if (created) {
        console.log(`Created module: ${name}`);
      } else {
        console.log(`Module already exists: ${name}`);
      }
    }

    console.log('Modules synced successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error syncing modules:', error);
    process.exit(1);
  }
}

syncModules();
