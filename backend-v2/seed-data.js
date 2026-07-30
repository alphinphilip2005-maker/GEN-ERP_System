const sequelize = require('./db');
const { User, Project, Vendor, Item, BomProject, BomRevision, BomItem, Stock, ItemCategory, Uom } = require('./models');

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB for seeding...');

    // Assumes categories and UoMs exist, but we fallback if not
    const category = await ItemCategory.findOne() || await ItemCategory.create({ name: 'Mechanical' });
    const uom = await Uom.findOne() || await Uom.create({ name: 'PCS' });

    // 1. Users - ensure R&D and Production users exist for testing
    let rdUser = await User.findOne({ where: { department: 'R&D' } });
    if (!rdUser) {
      const bcrypt = require('bcrypt');
      const hash = await bcrypt.hash('RD@123', 10);
      rdUser = await User.create({
        name: 'John R&D',
        email: 'rnd@generp.com',
        password_hash: hash,
        employee_id: 'EMP-RD-01',
        designation: 'R&D Engineer',
        department: 'R&D',
        role: 'user'
      });
      console.log('Created R&D User (rnd@generp.com / RD@123)');
    }

    // 2. Project Master
    const project = await Project.create({
      project_code: 'PRJ-ROBO-01',
      project_name: 'Robotic Arm V1',
      project_lead_id: rdUser.id
    });
    console.log('Created Project:', project.project_name);

    // 3. Vendor Master
    const vendor = await Vendor.create({
      vendor_code: 'VEN-001',
      name: 'TechCorp Suppliers',
      city: 'Bangalore',
      country: 'India',
      contact_person: 'Alice',
      email: 'sales@techcorp.com'
    });
    console.log('Created Vendor:', vendor.name);

    // 4. Item Master
    const itemsData = [
      { item_code: 'ITM-M-001', item_name: 'Servo Motor SG90', description: '9g Micro Servo', category: category.name, uom: uom.name },
      { item_code: 'ITM-E-002', item_name: 'Arduino Mega 2560', description: 'Microcontroller board', category: category.name, uom: uom.name },
      { item_code: 'ITM-M-003', item_name: 'M3x10 Screws', description: 'Hex socket cap screws', category: category.name, uom: 'SET' }
    ];
    
    const items = [];
    for (const data of itemsData) {
      const [item] = await Item.findOrCreate({ where: { item_code: data.item_code }, defaults: data });
      items.push(item);

      // Seed Stock too
      await Stock.findOrCreate({
        where: { item_id: item.id },
        defaults: { quantity: Math.floor(Math.random() * 50) + 10 } // random 10 to 60
      });
    }
    console.log('Created Items and Stock');

    // 5. BOM Master (Approved BOM)
    const bomProject = await BomProject.create({
      project_id: project.id,
      project_name: project.project_name,
      uploaded_by: rdUser.email,
      current_revision: '00',
      released_on: new Date()
    });

    const bomRevision = await BomRevision.create({
      bom_project_id: bomProject.id,
      revision_no: '00',
      change_description: 'Initial Release',
      revised_by: rdUser.email,
      status: 'Approved',
      is_approved: true,
      approved_by: 'Admin User',
      revised_on: new Date()
    });

    // Link Items to BOM
    for (let i = 0; i < items.length; i++) {
      await BomItem.create({
        bom_project_id: bomProject.id,
        bom_revision_id: bomRevision.id,
        item_id: items[i].id,
        quantity: [4, 1, 20][i], // 4 motors, 1 arduino, 20 screws
        assembly: 'Main Assembly',
        vendor_name: vendor.name,
      });
    }
    console.log(`Created Approved BOM for ${project.project_name} with ${items.length} items.`);

    console.log('\n--- SEEDING COMPLETE ---');
    process.exit(0);

  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
