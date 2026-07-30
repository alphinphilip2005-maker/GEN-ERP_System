const express = require('express');
const router = express.Router();
const { Payment, PaymentHistory, PurchaseOrder, Vendor } = require('../models');

// Get all payment records (for Finance/Admin)
router.get('/', async (req, res) => {
  try {
    const payments = await Payment.findAll({
      include: [
        {
          model: PurchaseOrder,
          include: [{ model: Vendor, as: 'ToVendor' }]
        },
        { model: PaymentHistory }
      ],
      order: [['updated_at', 'DESC']]
    });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update payment details (Inline Edit for Due Date / Settlement Type)
router.patch('/:id', async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment record not found.' });

    const { due_date, settlement_type } = req.body;
    
    if (due_date) payment.due_date = due_date;
    if (settlement_type) payment.settlement_type = settlement_type;

    await payment.save();
    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Record a new payment settlement (installment)
router.post('/:id/settle', async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment record not found.' });

    const { amount, payment_date, mode, reference_no, remarks } = req.body;
    const cleanAmount = Math.round(parseFloat(amount) * 100) / 100;

    // Create history entry
    const history = await PaymentHistory.create({
      payment_id: payment.id,
      amount: cleanAmount,
      payment_date,
      mode: mode || 'N/A', // Default to N/A if missing
      reference_no,
      remarks
    });

    // Update main payment record
    const totalPaid = Math.round((parseFloat(payment.paid_amount) + cleanAmount) * 100) / 100;
    payment.paid_amount = totalPaid;

    // Round total_amount for comparison
    const targetTotal = Math.round(parseFloat(payment.total_amount) * 100) / 100;

    // Update status logic
    if (totalPaid >= targetTotal) {
      payment.status = 'CLOSED';
    } else if (totalPaid > 0) {
      payment.status = 'PARTIAL';
    } else {
      payment.status = 'OPEN';
    }

    await payment.save();

    res.json({ message: 'Payment recorded successfully.', history, payment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
