const { Grn } = require('../models');

async function check() {
  const counts = await Grn.findAll({
    attributes: ['status', [require('sequelize').fn('COUNT', 'id'), 'count']],
    group: ['status']
  });
  console.log('GRN Counts by Status:');
  console.log(JSON.stringify(counts, null, 2));
  process.exit();
}

check();
