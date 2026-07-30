const { PurchaseOrder, Payment } = require('../models');

async function checkAllPayments() {
  const poNo = '2026-GRI/PO/55-2';
  const po = await PurchaseOrder.findOne({
    where: { po_no: poNo }
  });

  if (!po) {
    console.log('PO not found');
    return;
  }

  const payments = await Payment.findAll({ where: { po_id: po.id } });
  console.log(`Found ${payments.length} payment records for PO ${poNo}:`);
  payments.forEach(p => {
    console.log(`Payment ID: ${p.id}, Total: ${p.total_amount}, Status: ${p.status}`);
  });

  process.exit();
}

checkAllPayments();
