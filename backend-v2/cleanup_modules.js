const { Module, Permission } = require('./models');
const { Op } = require('sequelize');

async function run() {
  try {
    console.log('Starting module cleanup...');

    // 1. Locate ID of 'Stock' and 'Stock Out' to preserve permissions properly.
    const stockMod = await Module.findOne({ where: { module_name: 'Stock' } });
    const stockOutMod = await Module.findOne({ where: { module_name: 'Stock Out' } });

    if (stockOutMod) {
      // RENAME 'Stock Out' to 'Inventory' to fulfill directive and preserve checks!
      await stockOutMod.update({ module_name: 'Inventory' });
      console.log('Renamed "Stock Out" (ID ' + stockOutMod.id + ') to "Inventory".');
    } else {
      // If for some reason it was already renamed or missing, check Stock
      if (stockMod) {
         await stockMod.update({ module_name: 'Inventory' });
         console.log('Renamed "Stock" (ID ' + stockMod.id + ') to "Inventory" as fallback.');
      }
    }

    // 2. Now explicitly delete the other garbage modules.
    const targetsToDelete = ['Production Planning', 'WIP'];
    
    // If StockOut was renamed to Inventory, delete the obsolete "Stock" module!
    // But transfer any permissions from Stock if desired? Actually, user screenshot showed "Stock Out" carried the valid checkmark, so I just delete the empty "Stock" to avoid duplicate entries.
    targetsToDelete.push('Stock');

    const count = await Module.destroy({
      where: {
        module_name: { [Op.in]: targetsToDelete }
      }
    });
    console.log('Successfully deleted ' + count + ' obsolete modules (' + targetsToDelete.join(', ') + ').');

    // Re-Audit state for visual proof
    const fin = await Module.findAll();
    console.log('\nFinal Final Module Listing:');
    fin.forEach(m => console.log(' - ' + m.module_name));

    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}
run();
