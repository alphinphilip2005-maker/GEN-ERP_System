const sequelize = require('../db');
const { Module } = require('../models');

const MODULES = [
  'Item Master',
  'Item Category',
  'UOM Master',
  'Project Master',
  'Vendor Master',
  'BOM',
  'Purchase Request',
  'Quotation Management',
  'Purchase Order',
  'GRN',
  'IQC',
  'Stock',
  'MRN',
  'Production Planning',
  'WIP',
  'Stock Out',
  'Payment Management',
  'Material Rejection Log'
];

async function run() {
  await sequelize.authenticate();
  console.log('Database connected successfully.');

  for (const name of MODULES) {
    const [mod, created] = await Module.findOrCreate({ where: { module_name: name } });
    if (created) {
      console.log(`Inserted missing module: ${name}`);
    } else {
      console.log(`Module already exists: ${name}`);
    }
  }
  console.log('All modules synchronized successfully.');
  process.exit(0);
}

run().catch(err => {
  console.error('Error synchronizing modules:', err);
  process.exit(1);
});
