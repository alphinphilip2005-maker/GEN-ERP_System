const { User } = require('../models');

async function check() {
  const users = await User.findAll({
    where: { name: ['Adithya', 'Mahadev', 'Cimil'] }
  });
  console.log('Quality Team Members:');
  console.log(JSON.stringify(users.map(u => ({
    name: u.name,
    email: u.email,
    dept: u.department,
    desig: u.designation
  })), null, 2));
  process.exit();
}

check();
