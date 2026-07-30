const { Payment, PaymentHistory } = require('../models');

async function resetPaymentAndHistory() {
  const paymentId = 23;
  const p = await Payment.findByPk(paymentId);
  if (!p) {
    console.log('Payment not found');
    return;
  }

  console.log('Resetting Payment ID 23...');
  p.total_amount = 6801.00;
  p.paid_amount = 0;
  p.status = 'OPEN';
  await p.save();

  console.log('Clearing History for Payment ID 23...');
  await PaymentHistory.destroy({ where: { payment_id: paymentId } });

  const updated = await Payment.findByPk(paymentId, { raw: true });
  console.log('Updated Payment Record:');
  console.log(JSON.stringify(updated, null, 2));

  process.exit();
}

resetPaymentAndHistory();
