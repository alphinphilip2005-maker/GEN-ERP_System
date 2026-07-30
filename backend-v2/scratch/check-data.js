const { Mrn } = require('../models');
const sequelize = require('../db');

async function checkData() {
  try {
    const mrns = await Mrn.findAll({
      limit: 5,
      order: [['created_at', 'DESC']]
    });
    console.log(JSON.stringify(mrns, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkData();
