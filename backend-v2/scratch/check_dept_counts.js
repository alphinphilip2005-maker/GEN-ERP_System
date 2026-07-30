const { PurchaseRequest } = require('../models');
const { Op } = require('sequelize');

async function check() {
  const counts = await PurchaseRequest.findAll({
    attributes: ['department', [require('sequelize').fn('COUNT', 'id'), 'count']],
    group: ['department']
  });
  console.log('PR Counts by Department:');
  console.log(JSON.stringify(counts, null, 2));

  const adminPrs = await PurchaseRequest.findAll({
    where: {
      [Op.or]: [
        { department: 'ADMIN' },
        { pr_no: { [Op.like]: '%ADMIN%' } }
      ]
    }
  });
  console.log(`Total ADMIN PRs found: ${adminPrs.length}`);
  if (adminPrs.length > 0) {
    console.log('Sample ADMIN PR:', JSON.stringify({
      pr_no: adminPrs[0].pr_no,
      department: adminPrs[0].department
    }, null, 2));
  }
  process.exit();
}

check();
