const { BomItem, Item, Stock, BomRevision } = require('./models');

async function runDiagnostics() {
  try {
    console.log("--- START DIAGNOSTICS ---");
    const targetLoc = 'KINFRA';
    const targetPrj = 'JCB';
    
    // 1. Find the latest revision to test with
    const latestRev = await BomRevision.findOne({ order: [['id', 'DESC']] });
    if (!latestRev) {
       console.log("No BOM revisions found in DB to test.");
       process.exit(0);
    }
    console.log(`Testing with BOM Revision ID: ${latestRev.id}`);

    // 2. Fetch all items for that revision
    const bomItems = await BomItem.findAll({
      where: { bom_revision_id: latestRev.id },
      include: [{ model: Item }]
    });
    console.log(`Found ${bomItems.length} items in this BOM.`);

    // 3. Iterate exactly like the production API does
    for (const bi of bomItems) {
      const itemName = bi.Item ? bi.Item.item_name : 'Unknown';
      
      // Simulate API lookup
      const stockWhere = { item_id: bi.item_id };
      stockWhere.location = targetLoc;
      stockWhere.project_name = targetPrj;
      
      const rawSum = await Stock.sum('quantity', { where: stockWhere });
      console.log(`- Item ${itemName} (ID ${bi.item_id}): Stock Sum at ${targetLoc} for ${targetPrj} => ${rawSum || 0}`);
    }
    
    console.log("--- END DIAGNOSTICS ---");
    process.exit(0);
  } catch (err) {
    console.error("Error during diagnostic:", err);
    process.exit(1);
  }
}

runDiagnostics();
