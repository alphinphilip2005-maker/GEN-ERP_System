const { User } = require('../models');
const sequelize = require('../db');

async function checkNotifyDept() {
  const department = 'Store';
  const users = await User.findAll({ 
    where: {
      [sequelize.Op.or]: [
        { department },
        { role: 'admin' }
      ]
    }
  });
  console.log(`Found ${users.length} users for Store:`, users.map(u => u.name));
}

checkNotifyDept().catch(console.error).finally(() => process.exit());
