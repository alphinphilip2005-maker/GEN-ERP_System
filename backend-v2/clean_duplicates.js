const sequelize = require('./db');

async function cleanDuplicates() {
  console.log('=== CLEANING DUPLICATE ITEMS FROM DATABASE ===\n');

  // 1. Clean PurchaseRequestItems — keep the row with the lowest id (first inserted), delete the rest
  const [prDupes] = await sequelize.query(`
    SELECT pr_id, item_id, COUNT(*) as count, MIN(id) as keep_id
    FROM PurchaseRequestItems
    WHERE item_id IS NOT NULL
    GROUP BY pr_id, item_id
    HAVING COUNT(*) > 1
  `);

  let prDeleted = 0;
  for (const row of prDupes) {
    const [result] = await sequelize.query(`
      DELETE FROM PurchaseRequestItems
      WHERE pr_id = ${row.pr_id} AND item_id = ${row.item_id} AND id != ${row.keep_id}
    `);
    prDeleted += result.affectedRows || 0;
    console.log(`PR ${row.pr_id} item_id ${row.item_id}: kept id=${row.keep_id}, deleted ${row.count - 1} duplicates`);
  }
  console.log(`\n✅ PR Items: removed ${prDeleted} duplicate rows\n`);

  // 2. Clean PurchaseOrderItems — keep lowest id
  const [poDupes] = await sequelize.query(`
    SELECT po_id, item_id, COUNT(*) as count, MIN(id) as keep_id
    FROM PurchaseOrderItems
    WHERE item_id IS NOT NULL
    GROUP BY po_id, item_id
    HAVING COUNT(*) > 1
  `);

  let poDeleted = 0;
  for (const row of poDupes) {
    const [result] = await sequelize.query(`
      DELETE FROM PurchaseOrderItems
      WHERE po_id = ${row.po_id} AND item_id = ${row.item_id} AND id != ${row.keep_id}
    `);
    poDeleted += result.affectedRows || 0;
    console.log(`PO ${row.po_id} item_id ${row.item_id}: kept id=${row.keep_id}, deleted ${row.count - 1} duplicates`);
  }
  console.log(`\n✅ PO Items: removed ${poDeleted} duplicate rows\n`);

  // 3. Clean GrnItems — keep lowest id
  const [grnDupes] = await sequelize.query(`
    SELECT grn_id, item_id, COUNT(*) as count, MIN(id) as keep_id
    FROM GrnItems
    WHERE item_id IS NOT NULL
    GROUP BY grn_id, item_id
    HAVING COUNT(*) > 1
  `);

  let grnDeleted = 0;
  for (const row of grnDupes) {
    const [result] = await sequelize.query(`
      DELETE FROM GrnItems
      WHERE grn_id = ${row.grn_id} AND item_id = ${row.item_id} AND id != ${row.keep_id}
    `);
    grnDeleted += result.affectedRows || 0;
    console.log(`GRN ${row.grn_id} item_id ${row.item_id}: kept id=${row.keep_id}, deleted ${row.count - 1} duplicates`);
  }
  console.log(`\n✅ GRN Items: removed ${grnDeleted} duplicate rows\n`);

  console.log('=== CLEANUP COMPLETE ===');
  console.log(`Total rows deleted: ${prDeleted + poDeleted + grnDeleted}`);
  process.exit(0);
}

cleanDuplicates().catch(e => { console.error(e); process.exit(1); });
