const { User } = require('../models');

async function checkUsers() {
  try {
    const users = await User.findAll();
    console.log('--- Users ---');
    users.forEach(u => {
      console.log(`ID: ${u.id}, Name: ${u.name}, Dept: ${u.department}, Email: ${u.email}`);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkUsers();
