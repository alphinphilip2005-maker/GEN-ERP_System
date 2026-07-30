const { PurchaseRequest } = require('../models');
const { Op } = require('sequelize');

async function debugData() {
  try {
    const prs = await PurchaseRequest.findAll();
    console.log('--- ALL PRs ---');
    prs.forEach(pr => {
      console.log(`ID: ${pr.id}, No: ${pr.pr_no}, Dept: ${pr.department}, Status: ${pr.status}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

debugData();
