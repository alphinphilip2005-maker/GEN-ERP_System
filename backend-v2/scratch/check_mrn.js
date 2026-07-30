const { Mrn, MrnItem } = require('../models');

async function test() {
  try {
    const mrn = await Mrn.create({
      mrn_no: 'MRN-TEST-1234',
      slip_no: 'SLIP-TEST',
      request_date: new Date(),
      requested_by_id: 1,
      mrn_type: 'Project_Transfer',
      from_project_id: 1,
      to_project_id: 2,
      project_id: 2,
      store_location: 'Main Store',
      status: 'Pending'
    });
    console.log('Created successfully!', mrn.id);
  } catch (err) {
    console.error('ERROR OCCURRED:', err);
  }
  process.exit(0);
}

test();
