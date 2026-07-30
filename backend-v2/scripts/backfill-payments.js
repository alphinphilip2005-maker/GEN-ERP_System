const sequelize = require('../db');
const { PurchaseOrder, PurchaseOrderItem, Payment, Grn, GrnItem } = require('../models');

async function backfill() {
  try {
    console.log('Syncing database...');
    await sequelize.sync();
    
    console.log('Finding POs with approved GRNs...');
    const grns = await Grn.findAll({
      where: { status: 'Approved' },
      include: [{
        model: PurchaseOrder,
        include: [{ model: PurchaseOrderItem, as: 'Items' }]
      }]
    });

    console.log(`Found ${grns.length} approved GRNs.`);
    
    for (const grn of grns) {
      const po = grn.PurchaseOrder;
      if (!po || !po.is_approved) continue;

      const allApprovedGrns = await Grn.findAll({
        where: { po_id: po.id, status: 'Approved' },
        include: [{ model: GrnItem }]
      });

      let cumulativeSubtotal = 0;
      for (const g of allApprovedGrns) {
        for (const gi of g.GrnItems) {
          const poItem = po.Items.find(pi => pi.item_id === gi.item_id);
          const unitPrice = poItem ? parseFloat(poItem.unit_price || 0) : 0;
          cumulativeSubtotal += (parseFloat(gi.accepted_qty || 0) * unitPrice);
        }
      }

      const totalAmount = Math.round((cumulativeSubtotal * 1.12) * 100) / 100;

      const [payment, created] = await Payment.findOrCreate({
        where: { po_id: po.id },
        defaults: {
          total_amount: totalAmount,
          status: 'OPEN'
        }
      });

      if (!created || payment.total_amount != totalAmount) {
        payment.total_amount = totalAmount;
        await payment.save();
        console.log(`Updated Payment record for PO: ${po.po_no} (Total: ${totalAmount})`);
      } else {
        console.log(`Payment record verified for PO: ${po.po_no}`);
      }
    }

    console.log('Backfill complete.');
    process.exit(0);
  } catch (error) {
    console.error('Backfill failed:', error);
    process.exit(1);
  }
}

backfill();
