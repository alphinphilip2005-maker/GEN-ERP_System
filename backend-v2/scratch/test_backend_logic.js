const { Mrn } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../db');

async function test() {
  const t = await sequelize.transaction();
  try {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const maxMrn = await Mrn.findOne({
      where: { mrn_no: { [Op.like]: `MRN-${dateStr}-%` } },
      order: [['mrn_no', 'DESC']],
      attributes: ['mrn_no'],
      transaction: t
    });
    console.log('maxMrn in transaction:', maxMrn ? maxMrn.mrn_no : 'null');
    let nextSeq = 1;
    if (maxMrn) {
      const parts = maxMrn.mrn_no.split('-');
      console.log('Parts split by -:', parts);
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      console.log('Parsed lastSeq:', lastSeq);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }
    const mrn_no = `MRN-${dateStr}-${nextSeq.toString().padStart(4, '0')}`;
    console.log('Calculated mrn_no:', mrn_no);
    await t.rollback();
  } catch (err) {
    await t.rollback();
    console.error('ERROR:', err);
  }
  process.exit(0);
}

test();
