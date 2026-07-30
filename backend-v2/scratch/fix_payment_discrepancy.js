const { PurchaseOrder, PurchaseOrderItem, Payment } = require('../models');

async function fixPaymentDiscrepancy() {
  const poNo = '2026-GRI/PO/55-2';
  const po = await PurchaseOrder.findOne({
    where: { po_no: poNo },
    include: [{ model: PurchaseOrderItem, as: 'Items' }]
  });

  if (!po) {
    console.log('PO not found');
    return;
  }

  const items = po.Items;
  const subtotal = items.reduce((acc, item) => {
    const amt = parseFloat(item.amount || 0);
    console.log(`Adding Item ${item.item_id}: Amount=${amt}`);
    return acc + amt;
  }, 0);

  const totalAmount = Math.round(subtotal * 100) / 100;
  console.log('\nCalculated Subtotal:', subtotal);
  console.log('Rounded Total:', totalAmount);

  const payment = await Payment.findOne({ where: { po_id: po.id } });
  if (payment) {
    console.log('Current Payment Total:', payment.total_amount);
    if (payment.total_amount != totalAmount) {
      console.log('DISCREPANCY DETECTED! Updating payment record...');
      payment.total_amount = totalAmount;
      await payment.save();
      console.log('Payment record fixed.');
    } else {
      console.log('No discrepancy between database items and payment record.');
    }
  }

  process.exit();
}

fixPaymentDiscrepancy();
