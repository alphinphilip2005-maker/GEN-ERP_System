const { Payment } = require('../models');

async function readPaymentDetailed() {
  const p = await Payment.findByPk(23, { raw: true });
  console.log('RAW PAYMENT RECORD ID 23:');
  console.log(JSON.stringify(p, null, 2));
  process.exit();
}

readPaymentDetailed();
