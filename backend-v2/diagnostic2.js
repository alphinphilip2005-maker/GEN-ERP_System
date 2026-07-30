const { BomRevision, BomItem, Item, Project, Stock, BomProject } = require('./models');

async function exactReplication() {
  try {
    console.log("--- LOOKING FOR JCB (R08) ---");
    const targetRevNo = 8;

    // Find the BomRevision that matches
    const allRevs = await BomRevision.findAll({
      include: [{
        model: BomProject,
        include: [{ model: Project }]
      }]
    });

    const myRev = allRevs.find(r => r.revision_no == targetRevNo && r.BomProject?.Project?.project_name === 'JCB');

    if (!myRev) {
      console.log("COULD NOT FIND BOM REVISION R08 FOR PROJECT JCB IN DB.");
      console.log("All Revisions Found:");
      allRevs.forEach(r => console.log(`- ID:${r.id} No:${r.revision_no} Proj:${r.BomProject?.Project?.project_name}`));
      process.exit(0);
    }

    console.log(`FOUND TARGET REVISION ID: ${myRev.id}`);

    const bis = await BomItem.findAll({
      where: { bom_revision_id: myRev.id },
      include: [{ model: Item }]
    });

    console.log(`Revision has ${bis.length} distinct items.`);

    for (const bi of bis) {
      const stockWhere = {
        item_id: bi.item_id,
        location: 'KINFRA',
        project_name: 'JCB'
      };
      const sum = await Stock.sum('quantity', { where: stockWhere });
      console.log(`* Item ID:${bi.item_id} "${bi.Item?.item_name}" -> Stock in KINFRA/JCB: ${sum || 0}`);
    }

    console.log("--- END DIAGNOSTICS ---");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

exactReplication();
