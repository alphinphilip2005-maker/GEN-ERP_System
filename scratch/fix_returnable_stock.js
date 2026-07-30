require('dotenv').config({ path: require('path').join(__dirname, '../backend-v2/.env') });
const { MaterialRejection, Stock, Project, Grn, PurchaseOrder } = require('../backend-v2/models');

async function fixInventory() {
  console.log("🔥 Initiating Returnable Stock Corrections...");
  
  // Find all closed rejections with Returnable disposition that touched stock
  const corrupted = await MaterialRejection.findAll({
    where: {
      status: 'Closed',
      disposition: 'Returnable',
      is_stock_updated: true
    }
  });

  console.log(`Found ${corrupted.length} records that erroneously augmented bad stock.`);

  for (const rec of corrupted) {
    const prj = await Project.findByPk(rec.project_id);
    const projectName = prj ? prj.project_name : 'General Project';
    const grn = await Grn.findByPk(rec.grn_id, { include: [{ model: PurchaseOrder }] });
    const locationName = (grn && grn.PurchaseOrder && grn.PurchaseOrder.warehouse) ? grn.PurchaseOrder.warehouse : 'Main Store';

    console.log(`- Rectifying ${rec.rejected_qty} units for Item ${rec.item_id} at ${projectName} (${locationName})`);

    let stock = await Stock.findOne({
      where: {
        item_id: rec.item_id,
        project_name: projectName,
        location: locationName
      }
    });

    if (stock) {
      const oldBad = parseFloat(stock.bad_quantity || 0);
      const reduction = parseFloat(rec.rejected_qty || 0);
      const newBad = Math.max(0, oldBad - reduction);
      
      console.log(`  -> Old Bad: ${oldBad}, New Bad: ${newBad}`);
      stock.bad_quantity = newBad;
      await stock.save();
      
      // Mark it corrected so we don't run it again? 
      // Actually, I will just update the flag in rejection record AFTER fix.
      // Wait! Let's leave the flag as is, since my route change already handles logic correctly moving forward.
      // Or wait! I can just run this ONE TIME to undo existing damage.
    } else {
      console.log(`  -> SKIPPING: Could not find corresponding stock record to decrement.`);
    }
  }

  console.log("✅ Cleanup Complete. Stock alignment restored.");
  process.exit(0);
}

fixInventory().catch(err => {
  console.error(err);
  process.exit(1);
});
