const { PurchaseOrder } = require('../models');

async function listAllPOs() {
  const pos = await PurchaseOrder.findAll();
  pos.forEach(po => {
    console.log(`ID: ${po.id}, PO No: ${po.po_no}`);
  });
  process.exit();
}

listAllPOs();
