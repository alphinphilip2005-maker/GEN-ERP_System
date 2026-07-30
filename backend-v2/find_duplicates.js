const sequelize = require('./db');
const { PurchaseRequestItem, PurchaseOrderItem, GrnItem, Item } = require('./models');

async function findDuplicates() {
  console.log('=== CHECKING FOR DUPLICATE ITEMS IN DATABASE ===\n');

  // 1. Duplicate items in PR Items
  const [prDupes] = await sequelize.query(`
    SELECT pr_id, item_id, COUNT(*) as count 
    FROM PurchaseRequestItems 
    GROUP BY pr_id, item_id 
    HAVING COUNT(*) > 1
    ORDER BY count DESC
    LIMIT 20
  `);
  console.log('--- PR Items Duplicates (same item_id in same pr_id):');
  console.log(prDupes.length > 0 ? JSON.stringify(prDupes, null, 2) : 'None found ✅');

  // 2. Duplicate items in PO Items
  const [poDupes] = await sequelize.query(`
    SELECT po_id, item_id, COUNT(*) as count 
    FROM PurchaseOrderItems 
    GROUP BY po_id, item_id 
    HAVING COUNT(*) > 1
    ORDER BY count DESC
    LIMIT 20
  `);
  console.log('\n--- PO Items Duplicates (same item_id in same po_id):');
  console.log(poDupes.length > 0 ? JSON.stringify(poDupes, null, 2) : 'None found ✅');

  // 3. Duplicate items in GRN Items
  const [grnDupes] = await sequelize.query(`
    SELECT grn_id, item_id, COUNT(*) as count 
    FROM GrnItems 
    GROUP BY grn_id, item_id 
    HAVING COUNT(*) > 1
    ORDER BY count DESC
    LIMIT 20
  `);
  console.log('\n--- GRN Items Duplicates (same item_id in same grn_id):');
  console.log(grnDupes.length > 0 ? JSON.stringify(grnDupes, null, 2) : 'None found ✅');

  // 4. Check Item master duplicates (same item_name or item_code)
  const [itemNameDupes] = await sequelize.query(`
    SELECT item_name, COUNT(*) as count 
    FROM Items 
    GROUP BY item_name 
    HAVING COUNT(*) > 1
    ORDER BY count DESC
    LIMIT 20
  `);
  console.log('\n--- Item Master Duplicates (same item_name):');
  console.log(itemNameDupes.length > 0 ? JSON.stringify(itemNameDupes, null, 2) : 'None found ✅');

  const [itemCodeDupes] = await sequelize.query(`
    SELECT item_code, COUNT(*) as count 
    FROM Items 
    GROUP BY item_code 
    HAVING COUNT(*) > 1
    ORDER BY count DESC
    LIMIT 20
  `);
  console.log('\n--- Item Master Duplicates (same item_code):');
  console.log(itemCodeDupes.length > 0 ? JSON.stringify(itemCodeDupes, null, 2) : 'None found ✅');

  // 5. Check MRN items too
  const [mrnDupes] = await sequelize.query(`
    SELECT mrn_id, item_id, COUNT(*) as count 
    FROM MrnItems 
    GROUP BY mrn_id, item_id 
    HAVING COUNT(*) > 1
    ORDER BY count DESC
    LIMIT 20
  `);
  console.log('\n--- MRN Items Duplicates (same item_id in same mrn_id):');
  console.log(mrnDupes.length > 0 ? JSON.stringify(mrnDupes, null, 2) : 'None found ✅');

  process.exit(0);
}

findDuplicates().catch(e => { console.error(e); process.exit(1); });
