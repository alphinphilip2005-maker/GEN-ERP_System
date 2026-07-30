const { Mrn } = require('../models');
const { Op } = require('sequelize');

async function check() {
  const counts = await Mrn.findAll({
    attributes: ['department', [require('sequelize').fn('COUNT', 'id'), 'count']],
    group: ['department']
  });
  console.log('MRN Counts by Department:');
  console.log(JSON.stringify(counts, null, 2));

  const total = await Mrn.count();
  console.log(`Total MRNs in system: ${total}`);
  process.exit();
}

check();
