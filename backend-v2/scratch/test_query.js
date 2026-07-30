const { Mrn } = require('../models');
const { Op } = require('sequelize');

async function test() {
  try {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    console.log('Querying for dateStr:', dateStr);
    const maxMrn = await Mrn.findOne({
      where: { mrn_no: { [Op.like]: `MRN-${dateStr}-%` } },
      order: [['mrn_no', 'DESC']],
      attributes: ['mrn_no']
    });
    console.log('QueryResult maxMrn:', maxMrn ? maxMrn.toJSON() : 'null');
  } catch (err) {
    console.error('ERROR:', err);
  }
  process.exit(0);
}

test();
