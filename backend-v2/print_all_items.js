const { Item } = require('./models');

async function printItems() {
  try {
    const items = await Item.findAll({ order: [['id', 'ASC']] });
    console.log(`Total items in DB: ${items.length}`);
    items.forEach(i => {
      console.log(`ID: ${i.id} | Code: ${i.item_code} | Name: ${i.item_name}`);
    });
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

printItems();
