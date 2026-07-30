const { PurchaseOrder, MaterialRejection, Grn } = require('../models');

async function test() {
  try {
    const poId = 38;
    const po = await PurchaseOrder.findByPk(poId);
    if (!po) {
      console.log('PO not found');
      return;
    }
    console.log('PO found:', po.po_no, 'Status:', po.status);

    const rejections = await MaterialRejection.findAll({
      where: { status: 'Closed' },
      include: [{
        model: Grn,
        where: { po_id: poId },
        attributes: ['id']
      }]
    });
    console.log('Found closed rejections:', rejections.length);
    for (const rej of rejections) {
      console.log('Reopening rejection:', rej.rejection_no);
      rej.status = 'Opened';
      rej.closing_date = null;
      await rej.save();
    }

    po.status = 'QC REJECTED';
    await po.save();
    console.log('PO status updated successfully!');
  } catch (error) {
    console.error('Error in route logic:', error);
  }
}

test().then(() => process.exit());
