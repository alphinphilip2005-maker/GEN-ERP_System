const { Mrn } = require('../models');

async function test() {
  try {
    const mrns = await Mrn.findAll({ attributes: ['id', 'mrn_no', 'slip_no'] });
    console.log('EXISTING MRNS:');
    mrns.forEach(m => {
      console.log(`ID: ${m.id} | mrn_no: "${m.mrn_no}" | slip_no: "${m.slip_no}"`);
    });
  } catch (err) {
    console.error('ERROR:', err);
  }
  process.exit(0);
}

test();
