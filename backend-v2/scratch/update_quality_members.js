const sequelize = require('../db');
const { User } = require('../models');

async function updateQualityMembers() {
  try {
    await sequelize.authenticate();
    
    // Update Adithya
    await User.update(
      { designation: 'Quality Member (QA)', department: 'Quality' },
      { where: { email: 'adithya.jisha@btech.christuniversity.in' } }
    );

    // Update Mahadev
    await User.update(
      { designation: 'Quality Member (QC)', department: 'Quality' },
      { where: { email: 'mahadev@generp.com' } }
    );

    // Update Cimil
    await User.update(
      { designation: 'Quality Lead', department: 'Quality' },
      { where: { email: 'cimil.charly@btech.christuniversity.in' } }
    );

    console.log('Quality member profiles updated successfully.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

updateQualityMembers();
