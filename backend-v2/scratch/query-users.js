const { User } = require('../models');

async function checkUsers() {
  const users = await User.findAll({ attributes: ['id', 'name', 'department', 'role'] });
  console.log(JSON.stringify(users, null, 2));
}

checkUsers().catch(console.error).finally(() => process.exit());
