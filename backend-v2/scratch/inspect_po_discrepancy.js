const { PurchaseOrder, PurchaseOrderItem } = require('../models');

async function inspectPO() {
  const poNo = '2026-GRI/PO/55-2';
  const po = await PurchaseOrder.findOne({
    where: { po_no: poNo },
    include: [{ model: PurchaseOrderItem, as: 'Items' }]
  });

  if (!po) {
    console.log('PO not found');
    return;
  }

  console.log('PO ID:', po.id);
  console.log('PO Status:', po.status);
  console.log('PO is_approved:', po.is_approved);

  const items = po.Items;
  console.log('\nItems:');
  items.forEach(item => {
    console.log(`Item ID: ${item.item_id}, Qty: ${item.quantity}, Unit Price: ${item.unit_price}, Amount: ${item.amount}`);
  });

  const { Payment } = require('../models');
  const payment = await Payment.findOne({ where: { po_id: po.id } });
  if (payment) {
    console.log('\nPayment Record:');
    console.log('Total Amount:', payment.total_amount);
  } else {
    console.log('\nPayment Record not found');
  }

  process.exit();
}

inspectPO();
