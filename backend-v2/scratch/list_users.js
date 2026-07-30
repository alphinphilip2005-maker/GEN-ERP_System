const { User } = require('../models');

async function listUsers() {
  try {
    const users = await User.findAll({});
    console.log('--- USERS IN DATABASE ---');
    users.forEach(u => {
      console.log({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department,
        designation: u.designation
      });
    });
  } catch (err) {
    console.error('Error listing users:', err);
  }
  process.exit(0);
}

listUsers();
