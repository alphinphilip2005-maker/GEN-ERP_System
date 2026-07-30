const { User, Module, Permission } = require('./models');
const { Op } = require('sequelize');

async function run() {
  try {
    console.log('Starting Quality Dept Seed script...');

    // 1. Get Quality Modules
    const targetModules = await Module.findAll({
      where: {
        module_name: { [Op.in]: ['IQC', 'Material Rejection Log'] }
      }
    });

    if (targetModules.length === 0) {
      console.error('Did not find IQC/MRL modules!');
      process.exit(1);
    }
    
    console.log(`Located target modules: ${targetModules.map(m => m.module_name).join(', ')}`);

    // 2. Get all existing Users in Quality Dept (case insensitive check)
    const allUsers = await User.findAll();
    const qualityUsers = allUsers.filter(u => (u.department || '').toLowerCase().trim() === 'quality');

    console.log(`Found ${qualityUsers.length} existing users in the Quality Department.`);

    let updatedCount = 0;
    for (const user of qualityUsers) {
      console.log(`Processing User: ${user.name} (${user.email})`);
      
      for (const mod of targetModules) {
        const [perm, created] = await Permission.findOrCreate({
          where: { user_id: user.id, module_id: mod.id },
          defaults: {
            user_id: user.id,
            module_id: mod.id,
            can_view: true,
            can_edit: true,
            can_create: true,
            can_delete: true,
            can_approve: true
          }
        });

        if (!created) {
          // Force all permissions to true
          await perm.update({
            can_view: true,
            can_edit: true,
            can_create: true,
            can_delete: true,
            can_approve: true
          });
        }
      }
      updatedCount++;
    }

    console.log(`Successfully provisioned all Quality users (${updatedCount} accounts fully updated).`);
    process.exit(0);

  } catch (err) {
    console.error('Fatal seeding failure:', err);
    process.exit(1);
  }
}
run();
