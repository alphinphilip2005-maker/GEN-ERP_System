const sequelize = require('./db');
const { User, Permission, Module } = require('./models');
const bcrypt = require('bcrypt');

async function seed() {
  try {
    await sequelize.authenticate();
    
    // Check if purchase manager exists
    let manager = await User.findOne({ where: { email: 'purchase@generp.com' } });
    if (!manager) {
      const hash = await bcrypt.hash('Purchase@123', 10);
      manager = await User.create({
        name: 'Purchase Manager',
        email: 'purchase@generp.com',
        password_hash: hash,
        employee_id: 'EMP-PUR-001',
        designation: 'Purchasing Head',
        department: 'Purchase',
        role: 'manager'
      });
      console.log('Created Purchase Manager: purchase@generp.com / Purchase@123');
      
      // Grant permissions
      const modules = await Module.findAll();
      const permsToCreate = modules.map(mod => ({
        user_id: manager.id,
        module: mod.module_name,
        can_view: true,
        can_create: mod.module_name === 'Purchase Order' || mod.module_name === 'Quotation Management',
        can_edit: true,
        can_delete: false,
        can_approve: true
      }));
      await Permission.bulkCreate(permsToCreate);
      console.log('Granted viewing permissions to Purchase Manager');
    } else {
      console.log('Purchase Manager already exists.');
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
