const { Stock, Item, Project } = require('./models');
const { Op } = require('sequelize');

async function runMrnDiagnostic() {
  try {
    console.log("--- START MRN PROJECT-ITEMS DIAGNOSTIC ---");
    const targetLoc = 'KINFRA';
    const projId = 3; // JCB

    const project = await Project.findByPk(projId);
    if (!project) {
      console.log("Project JCB not found ID 3");
      process.exit(0);
    }
    console.log(`Analyzing Project: ${project.project_name}`);

    const stockWhere = {
      project_name: project.project_name,
      quantity: { [Op.gt]: 0 }
    };
    
    if (targetLoc) {
      stockWhere.location = targetLoc;
    }

    const stocks = await Stock.findAll({
      where: stockWhere,
      include: [{ model: Item }]
    });
    
    console.log(`Found ${stocks.length} matching active stock rows.`);
    
    const items = stocks.map(s => ({
      item_id: s.item_id,
      item_name: s.Item?.item_name,
      available_stock: parseFloat(s.quantity) || 0
    }));

    console.log("Final JSON Payload returned to Frontend:");
    console.log(JSON.stringify(items, null, 2));
    
    console.log("--- END ---");
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

runMrnDiagnostic();
