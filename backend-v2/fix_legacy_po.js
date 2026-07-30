const { PurchaseOrder, PurchaseOrderItem, Quote, PurchaseRequestItem } = require('./models');

async function fixSpecificPO() {
  try {
    const poNo = '2026-GRI/PO/70-1';
    const po = await PurchaseOrder.findOne({
      where: { po_no: poNo },
      include: [{ model: PurchaseOrderItem, as: 'Items' }]
    });

    if (!po) {
      console.log('PO not found:', poNo);
      process.exit(0);
    }

    console.log(`Found PO ${poNo}. Processing items...`);

    for (const item of po.Items) {
      console.log(`Current item: ${item.id} | Quantity: ${item.quantity} | UnitPrice: ${item.unit_price} | Amount: ${item.amount}`);
      
      // Based on input, amount is 10000, should be 2000.
      // We set amount explicitly to 2000, and unit_price accurately.
      const targetAmount = 2000;
      item.amount = targetAmount;
      item.unit_price = targetAmount / Number(item.quantity);
      
      await item.save();
      console.log(`Updated item ${item.id} to Amount: ${item.amount}, UnitPrice: ${item.unit_price}`);
    }
    
    console.log('Successfully fixed PO data.');
    process.exit(0);
  } catch (err) {
    console.error('Error running script:', err);
    process.exit(1);
  }
}

fixSpecificPO();
