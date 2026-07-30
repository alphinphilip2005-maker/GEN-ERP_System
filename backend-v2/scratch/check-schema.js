const { Mrn } = require('../models');
const sequelize = require('../db');

async function checkSchema() {
  try {
    const tableInfo = await sequelize.getQueryInterface().describeTable('Mrns');
    console.log(JSON.stringify(tableInfo, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkSchema();
