const { User } = require('../models');

async function check() {
  const users = await User.findAll({
    where: { department: 'Quality' }
  });
  console.log('Users in Quality Department:');
  console.log(JSON.stringify(users.map(u => ({
    name: u.name,
    email: u.email,
    dept: u.department,
    desig: u.designation
  })), null, 2));
  process.exit();
}

check();
