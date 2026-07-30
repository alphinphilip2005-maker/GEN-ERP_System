const express = require('express');
const router = express.Router();
const { Stock, Item, InventoryHistory, PurchaseOrder, PurchaseOrderItem, User, Mrn, MrnItem, Project, Grn, GrnItem, MaterialRejection } = require('../models');
const { Op } = require('sequelize');

// GET history for a specific item
router.get('/history/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;

    // 1. Fetch any items logged in InventoryHistory
    const loggedHistory = await InventoryHistory.findAll({
      where: { item_id: itemId },
      order: [['created_at', 'DESC']]
    });

    const results = loggedHistory.map(h => h.toJSON());

    // 2. Dynamically reconstruct history from GRN Receipts for Incoming PR Flow
    const receivedItems = await GrnItem.findAll({
      where: {
        item_id: itemId,
        accepted_qty: { [Op.gt]: 0 }
      },
      include: [
        { 
          model: Grn, 
          include: [
            { model: PurchaseOrder, attributes: ['project_name', 'po_no'] }
          ]
        },
        { model: User, as: 'Inspector', attributes: ['name'] }
      ]
    });

    receivedItems.forEach(gi => {
      if (!gi.Grn) return;
      const exists = results.some(r => r.type === 'PR_Flow' && r.source_reference === gi.Grn.grn_no);
      if (!exists) {
        results.push({
          id: `grn_${gi.id}`,
          item_id: itemId,
          quantity: gi.accepted_qty,
          type: 'PR_Flow',
          source_reference: gi.Grn.grn_no,
          from_project: null,
          to_project: gi.Grn.PurchaseOrder?.project_name || 'General Project',
          user_name: gi.Inspector?.name || 'Inspection Officer',
          created_at: gi.inspected_date || gi.Grn.created_at || gi.Grn.updated_at,
          updated_at: gi.inspected_date || gi.Grn.updated_at
        });
      }
    });

    // 3. Dynamically reconstruct history from issued Project Transfer MRNs (if not already logged)
    const issuedTransfers = await Mrn.findAll({
      where: {
        mrn_type: 'Project_Transfer',
        status: { [Op.in]: ['Issued', 'Partial'] }
      },
      include: [
        {
          model: MrnItem,
          where: { item_id: itemId }
        },
        { model: Project, as: 'FromProject', attributes: ['project_name'] },
        { model: Project, as: 'ToProject', attributes: ['project_name'] },
        { model: User, as: 'Issuer', attributes: ['name'] }
      ]
    });

    issuedTransfers.forEach(mrn => {
      mrn.MrnItems.forEach(item => {
        if (Number(item.issued_quantity) > 0) {
          const exists = results.some(r => r.type === 'Project_Transfer' && r.source_reference === mrn.mrn_no);
          if (!exists) {
            results.push({
              id: `mrn_${mrn.id}_${item.id}`,
              item_id: itemId,
              quantity: item.issued_quantity,
              type: 'Project_Transfer',
              source_reference: mrn.mrn_no,
              from_project: mrn.FromProject?.project_name || 'General Project',
              to_project: mrn.ToProject?.project_name || 'General Project',
              user_name: mrn.Issuer?.name || 'Store Personnel',
              created_at: mrn.updated_at || mrn.created_at,
              updated_at: mrn.updated_at || mrn.created_at
            });
          }
        }
      });
    });

    // 3b. Dynamically reconstruct history from closed Material Rejection Logs (for bad stock addition)
    const closedRejections = await MaterialRejection.findAll({
      where: {
        item_id: itemId,
        status: 'Closed',
        is_stock_updated: true,
        disposition: { [Op.ne]: 'Returnable' }
      },
      include: [
        { model: Grn, attributes: ['grn_no'] },
        { model: Project, attributes: ['project_name'] }
      ]
    });

    closedRejections.forEach(mr => {
      const exists = results.some(r => r.type === 'Material_Rejection' && r.source_reference === (mr.Grn?.grn_no || `MRL-${mr.id}`));
      if (!exists) {
        results.push({
          id: `mrl_${mr.id}`,
          item_id: itemId,
          quantity: mr.rejected_qty,
          type: 'Material_Rejection',
          source_reference: mr.Grn?.grn_no || 'MRL Audit',
          from_project: null,
          to_project: mr.Project?.project_name || 'General Project',
          movement_details: mr.disposition || 'Rejected Stock',
          user_name: 'MRL Disposition Manager',
          created_at: mr.closing_date || mr.updated_at || mr.created_at,
          updated_at: mr.closing_date || mr.updated_at
        });
      }
    });

    // 4. Sort the combined list by created_at DESC (latest additions/transfers on top!)
    results.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // 5. Fallback: If absolutely no history is found but item is currently in Stock, add a seeder log entry
    if (results.length === 0) {
      const stock = await Stock.findOne({ where: { item_id: itemId } });
      if (stock && Number(stock.quantity) > 0) {
        results.push({
          id: 'init',
          item_id: itemId,
          quantity: stock.quantity,
          type: 'PR_Flow',
          source_reference: 'PO-2026-INIT',
          from_project: null,
          to_project: stock.project_name || 'General Project',
          user_name: 'System Seeder',
          created_at: stock.updated_at || stock.created_at,
          updated_at: stock.updated_at || stock.created_at
        });
      }
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET all stock levels
router.get('/', async (req, res) => {
  try {
    const stocks = await Stock.findAll({
      include: [{ model: Item }]
    });
    res.json(stocks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update stock (Simple increment/decrement for manual adjustment)
router.post('/adjust', async (req, res) => {
  try {
    const { item_id, quantity, type } = req.body; // type: 'add' or 'subtract'
    
    const [stock, created] = await Stock.findOrCreate({
      where: { item_id },
      defaults: { quantity: 0 }
    });

    const change = type === 'subtract' ? -Number(quantity) : Number(quantity);
    stock.quantity = Number(stock.quantity) + change;
    
    await stock.save();
    res.json(stock);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
