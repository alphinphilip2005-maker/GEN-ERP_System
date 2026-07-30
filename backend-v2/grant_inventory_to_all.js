const { User, Module, Permission } = require('./models');

async function run() {
  try {
    console.log('Locating module "Inventory"...');
    const invMod = await Module.findOne({ where: { module_name: 'Inventory' } });
    if (!invMod) {
      console.error('Inventory module not found in DB!');
      process.exit(1);
    }
    console.log(`Found Inventory Module ID: ${invMod.id}`);

    const users = await User.findAll();
    console.log(`Found ${users.length} users to process...`);

    let count = 0;
    for (const user of users) {
      const [perm, created] = await Permission.findOrCreate({
        where: { 
          user_id: user.id, 
          module_id: invMod.id 
        },
        defaults: {
          user_id: user.id,
          module_id: invMod.id,
          can_view: true,
          can_edit: false,
          can_delete: false,
          can_create: false,
          can_approve: false
        }
      });

      if (!created) {
        // If already existed but maybe view wasn't checked, check it now!
        await perm.update({ can_view: true });
      }
      count++;
    }

    console.log(`Successfully enabled "Inventory" view rights for all ${count} users in the database!`);
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}
run();
