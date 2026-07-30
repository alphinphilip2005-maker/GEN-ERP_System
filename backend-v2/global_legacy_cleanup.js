const { PurchaseOrder, PurchaseOrderItem, Quote, PurchaseRequestItem } = require('./models');

async function fixAllLegacyPOData() {
  try {
    console.log('Starting global legacy PO pricing cleanup...');
    
    // Find PO items that belong to POs linked to a PR with an accepted quote
    const items = await PurchaseOrderItem.findAll({
      include: [{
        model: PurchaseOrder,
        include: [{ 
          model: PurchaseRequestItem,
          as: 'PurchaseRequestItems' 
        }]
      }]
    });
    
    // Simpler, let's look up the specific Quote to ensure absolute correctness for each PO item
    // Get ALL POs that reference a PQ_ID or PR_ID
    const allPOs = await PurchaseOrder.findAll({
      where: { pq_id: { [require('sequelize').Op.ne]: null } },
      include: [{ model: PurchaseOrderItem, as: 'Items' }]
    });

    console.log(`Found ${allPOs.length} POs that refer to an awarded Quote.`);

    let updatedCount = 0;

    for (const po of allPOs) {
      // For each PO, lookup ALL approved quotes for this specific vendor inside that PR/PQ
      const quotes = await Quote.findAll({
        where: { 
            status: 'Approved',
            vendor_id: po.to_vendor_id
        }
      });
      
      if (quotes.length === 0) continue;

      for (const item of po.Items) {
         // Find if there is a direct matching quote for this item
         const matchedQuote = quotes.find(q => {
             // We match the item_id if they are directly linked, or by comparing quantities 
             return true; // This is high level, let's filter accurately 
         });
         
         // Let's match properly. Find the PR Item associated with this PO item first!
         const prItem = await PurchaseRequestItem.findOne({
             where: {
                 pr_id: po.pr_id,
                 item_id: item.item_id
             }
         });
         
         if (!prItem || !prItem.selected_quote_id) continue;
         
         const quote = await Quote.findByPk(prItem.selected_quote_id);
         if (!quote) continue;
         
         const actualQuotedTotal = Number(quote.price);
         const currentAmount = Number(item.amount);
         
         if (currentAmount > actualQuotedTotal && currentAmount === (actualQuotedTotal * Number(item.quantity))) {
             console.log(`MATCH FOUND on PO ${po.po_no}: Inflated Amount ${currentAmount} detected for item ${item.id}. Correcting to ${actualQuotedTotal}.`);
             item.amount = actualQuotedTotal;
             item.unit_price = actualQuotedTotal / Number(item.quantity);
             await item.save();
             updatedCount++;
         }
      }
    }

    console.log(`Global cleanup complete. Fixed ${updatedCount} legacy inflated entries.`);
    process.exit(0);
  } catch (err) {
    console.error('Critical global cleanup error:', err);
    process.exit(1);
  }
}

fixAllLegacyPOData();
