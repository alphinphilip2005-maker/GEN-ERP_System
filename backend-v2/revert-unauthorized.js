const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
  logging: false
});

const Users = sequelize.define('Users', {
  name: DataTypes.STRING,
  department: DataTypes.STRING,
  designation: DataTypes.STRING,
}, { timestamps: false });

async function revert() {
  try {
    // Revert Admin User
    const [updatedCount] = await Users.update(
      { department: 'ADMIN' }, // Assuming ADMIN was original
      { where: { designation: 'Administrator' } }
    );
    console.log(`Updated ${updatedCount} admin user(s) back to ADMIN department.`);

    // Check for any test users created by subagent (usually have 'test' in email or name)
    // We don't want to delete without knowing, but we can list them.
    const testUsers = await Users.findAll({ 
      where: { 
        [Sequelize.Op.or]: [
          { name: { [Sequelize.Op.like]: '%test%' } },
          { name: 'Nikitha Biju' }, // Subagent edited this one
          { name: 'Alex zion' }      // Subagent edited this one
        ]
      } 
    });
    
    console.log('Detected potentially modified users:', testUsers.map(u => u.name));
    
    await sequelize.close();
  } catch (err) {
    console.error('Error during reversion:', err);
  }
}

revert();
