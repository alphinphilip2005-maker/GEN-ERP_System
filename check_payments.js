require('dotenv').config({ path: './backend-v2/.env' });
const sequelize = require('./backend-v2/db');
const { Payment, PurchaseOrder, Grn, GrnItem, PurchaseOrderItem } = require('./backend-v2/models');

async function checkPayments() {
  try {
    const payments = await Payment.findAll({
      include: [{ model: PurchaseOrder }]
    });

    console.log('--- Payments Table ---');
    payments.forEach(p => {
      console.log(`PO: ${p.PurchaseOrder ? p.PurchaseOrder.po_no : 'N/A'}, Total: ${p.total_amount}, Paid: ${p.paid_amount}, Status: ${p.status}`);
    });
  } catch (err) {
    console.error('Error querying payments:', err);
  } finally {
    process.exit();
  }
}

checkPayments();
