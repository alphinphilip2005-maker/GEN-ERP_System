const sequelize = require('./db');
const { User, Permission } = require('./models');

async function updatePermissions() {
  try {
    await sequelize.authenticate();
    
    const users = await User.findAll();
    const prModule = await require('./models').Module.findOne({ where: { module_name: 'Purchase Request' } });
    if (!prModule) throw new Error("Purchase Request module not found in DB");

    for (const user of users) {
      if (user.role === 'admin') continue; // Admins skip

      // Find or establish PR permission record
      let perm = await Permission.findOne({ where: { user_id: user.id, module_id: prModule.id } });
      if (!perm) {
        perm = await Permission.create({
          user_id: user.id,
          module_id: prModule.id,
          can_view: false,
          can_create: false,
          can_edit: false,
          can_delete: false,
          can_approve: false
        });
      }

      // Apply the user's specific rules:
      const dept = user.department;
      
      if (['Quality', 'Production', 'R&D', 'O&M'].includes(dept)) {
        await perm.update({
          can_view: true,
          can_create: true,
          can_edit: true,
          can_delete: true,
          can_approve: false // They can't approve their own
        });
      } 
      else if (dept === 'Purchase') {
        await perm.update({
          can_view: true,
          can_create: false, // Or true if purchase makes them too, but instruction says they approve
          can_edit: false,
          can_delete: false,
          can_approve: true
        });
      }
      else if (dept === 'Store') {
        await perm.update({
          can_view: true,
          can_create: false,
          can_edit: false,
          can_delete: false,
          can_approve: false
        });
      }
    }

    console.log('Successfully updated all User Database Permissions according to the exact rules!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

updatePermissions();
