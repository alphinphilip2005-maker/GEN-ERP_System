const { Mrn, User } = require('../models');
const sequelize = require('../db');

async function fixExistingData() {
  try {
    const admin = await User.findOne({ where: { role: 'admin' } });
    const adminName = admin ? admin.name : 'System Admin';
    const adminId = admin ? admin.id : null;

    // Fix MRNs that are Approved or Issued but have blank names
    const mrnsToFix = await Mrn.findAll({
      where: {
        status: ['Approved', 'Issued', 'Partial']
      }
    });

    for (const mrn of mrnsToFix) {
      const updates = {};
      if (!mrn.supervisor_name || mrn.supervisor_name === '') {
        updates.supervisor_name = adminName;
        if (!mrn.approved_by_id) updates.approved_by_id = adminId;
      }
      if (mrn.status === 'Issued' || mrn.status === 'Partial') {
        if (!mrn.store_in_charge_name || mrn.store_in_charge_name === '') {
          updates.store_in_charge_name = adminName;
          if (!mrn.issued_by_id) updates.issued_by_id = adminId;
        }
      }

      if (Object.keys(updates).length > 0) {
        await mrn.update(updates);
        console.log(`Fixed MRN ${mrn.mrn_no}`);
      }
    }

    console.log('Data fix complete.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixExistingData();
