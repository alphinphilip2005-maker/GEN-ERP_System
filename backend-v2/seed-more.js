const sequelize = require('./db');
const { Item, Stock, ItemCategory } = require('./models');

async function seedMore() {
  try {
    await sequelize.authenticate();
    
    // Create new categories
    const elecCat = await ItemCategory.findOrCreate({ where: { name: 'Electrical' }, defaults: { name: 'Electrical' } });
    const consCat = await ItemCategory.findOrCreate({ where: { name: 'Consumables' }, defaults: { name: 'Consumables' } });

    // Electrical Items
    const elecItems = [
      { item_code: 'ITM-E-010', item_name: 'Lithium Polymer Battery 12V', description: 'Rechargeable LiPo Pack', category: 'Electrical', uom: 'PCS' },
      { item_code: 'ITM-E-011', item_name: '16 AWG Copper Wire', description: 'Silicone insulated wire - Red/Black', category: 'Electrical', uom: 'MTR' }
    ];

    // Consumable Items
    const consItems = [
      { item_code: 'ITM-C-001', item_name: '3D Printer Filament PLA', description: 'White PLA 1.75mm 1Kg Spool', category: 'Consumables', uom: 'ROLL' },
      { item_code: 'ITM-C-002', item_name: 'Isopropyl Alcohol 99%', description: 'Cleaning Agent', category: 'Consumables', uom: 'LTR' }
    ];

    const allItems = [...elecItems, ...consItems];
    
    for (const data of allItems) {
      const [item] = await Item.findOrCreate({ where: { item_code: data.item_code }, defaults: data });
      
      // Give them some stock so they appear in Inventory
      const qty = Math.floor(Math.random() * 100) + 20;
      await Stock.findOrCreate({
        where: { item_id: item.id },
        defaults: { quantity: qty, location: 'Shelf B-2' }
      });
    }

    console.log('Successfully seeded Electrical and Consumables categories and items with stock.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seedMore();
