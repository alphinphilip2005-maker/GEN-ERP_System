const { User } = require('../models');

async function checkDesignations() {
  try {
    const users = await User.findAll();
    users.forEach(u => console.log(`${u.name}: ${u.designation}`));
    process.exit(0);
  } catch (err) {
    process.exit(1);
  }
}
checkDesignations();
