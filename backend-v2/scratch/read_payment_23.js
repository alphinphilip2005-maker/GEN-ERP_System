const { Payment } = require('../models');

async function readPayment() {
  const p = await Payment.findByPk(23);
  if (p) {
    console.log('Payment ID 23:');
    console.log('Total Amount:', p.total_amount);
    console.log('Paid Amount:', p.paid_amount);
    console.log('Status:', p.status);
    console.log('PO ID:', p.po_id);
  } else {
    console.log('Payment 23 not found');
  }
  process.exit();
}

readPayment();
