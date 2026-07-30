const s = require('./db');
s.query("SELECT b.bom_revision_id, b.item_id, i.item_code FROM BomItems b JOIN Items i ON b.item_id = i.id WHERE i.item_code LIKE 'test%'")
  .then(([r]) => {
    console.log('--- DUMPING TEST ITEMS IN BOMS ---');
    console.log(r);
  })
  .catch(e => console.error(e))
  .finally(() => process.exit());
