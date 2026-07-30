const { PurchaseOrder, PurchaseOrderItem } = require('../models');

async function debugItems() {
  const poNo = '2026-GRI/PO/55-2';
  const po = await PurchaseOrder.findOne({
    where: { po_no: poNo },
    include: [{ model: PurchaseOrderItem, as: 'Items' }]
  });

  if (!po) {
    console.log('PO not found');
    return;
  }

  console.log('Items for PO:', poNo);
  po.Items.forEach(item => {
    console.log(`ID: ${item.id}, ItemID: ${item.item_id}, Qty: ${item.quantity}, UnitPrice: ${item.unit_price}, Amount: ${item.amount}, RawAmountType: ${typeof item.amount}`);
  });

  process.exit();
}

debugItems();
