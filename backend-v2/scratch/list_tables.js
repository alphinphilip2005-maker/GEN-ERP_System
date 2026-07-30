const sequelize = require('../db');
const { BomProject, BomItem, BomRevision } = require('../models');

async function checkTables() {
  try {
    const [results] = await sequelize.query("SHOW TABLES");
    console.log("Tables in database:");
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("Error listing tables:", err);
    process.exit(1);
  }
}

checkTables();
