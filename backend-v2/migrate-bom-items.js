const sequelize = require('./db');
const { BomProject, BomItem, BomRevision } = require('./models');

async function migrateItems() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    const items = await BomItem.findAll();
    console.log(`Found ${items.length} items to migrate.`);

    for (const item of items) {
      if (item.bom_revision_id) continue;

      // Find the latest revision for this project
      const latestRev = await BomRevision.findOne({
        where: { bom_project_id: item.bom_project_id },
        order: [['created_at', 'DESC']]
      });

      if (latestRev) {
        await item.update({ bom_revision_id: latestRev.id });
        console.log(`Updated Item ${item.id} -> Revision ${latestRev.revision_no} (ID: ${latestRev.id})`);
      } else {
        console.warn(`No revision found for Project ${item.bom_project_id}! Creating initial revision...`);
        // If for some reason a project has no revisions, create one
        const newRev = await BomRevision.create({
          bom_project_id: item.bom_project_id,
          revision_no: '00',
          change_description: 'Initial migration',
          revised_on: new Date(),
          revised_by: 'System'
        });
        await item.update({ bom_revision_id: newRev.id });
      }
    }

    console.log('Migration complete.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrateItems();
