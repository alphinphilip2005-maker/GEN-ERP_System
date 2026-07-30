const { User } = require('../models');

async function check() {
  try {
    const users = await User.findAll();
    console.log('Search results for Ashik or Alphin:');
    const filtered = users.filter(u => u.name && (u.name.includes('Ashik') || u.name.includes('Alphin')));
    console.log(JSON.stringify(filtered.map(u => ({
      name: u.name,
      email: u.email,
      dept: u.department,
      desig: u.designation
    })), null, 2));
  } catch (e) {
    console.error(e);
  }
  process.exit();
}

check();
