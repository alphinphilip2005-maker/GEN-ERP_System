const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Quote, Vendor, PurchaseRequestItem, Notification, Item, User, PurchaseRequest, Project, BomRevision } = require('../models');

// ─── Helper: evaluate all quotes for a PR item ────────────────────────────────
// Business rule:
//   • ALL quotes > ₹5,000  → all stay Pending, notify manager
//   • At least one ≤ ₹5,000 → auto-select the lowest-price quote
// Helper removed to support purely manual approval as requested


// ─── POST / — Create a single quote ──────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { pr_item_id, vendor_id, price, delivery_time, remarks, quote_url } = req.body;

    if (!price || price <= 0) {
      return res.status(400).json({ message: 'Price must be greater than 0' });
    }

    const vendor = await Vendor.findByPk(vendor_id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    if (vendor.approval_status !== 'Approved') {
      return res.status(400).json({ message: 'Cannot quote using an unapproved vendor' });
    }

    const prItem = await PurchaseRequestItem.findByPk(pr_item_id);
    if (!prItem) return res.status(404).json({ message: 'PR Item not found' });

    // Validation: Don't repeat the same vendor + price for the same item
    const existingQuote = await Quote.findOne({
      where: {
        pr_item_id,
        vendor_id,
        price: Number(price)
      }
    });

    if (existingQuote) {
      return res.status(400).json({ 
        message: `A quotation from this vendor for ₹${price} already exists for this item.` 
      });
    }

    const quote = await Quote.create({
      pr_item_id,
      vendor_id,
      price: Number(price),
      delivery_time,
      remarks,
      quote_url,
      status: 'Pending'
    });

    // Auto-evaluation removed to support manual approval per user request


    // Return the quote with its final status
    const finalQuote = await Quote.findByPk(quote.id, { include: [Vendor] });
    res.status(201).json(finalQuote);
  } catch (err) {
    console.error('Create quote error:', err);
    res.status(400).json({ message: err.message });
  }
});

// ─── POST /bulk-import — Import multiple quotes from Excel ────────────────────
router.post('/bulk-import', async (req, res) => {
  try {
    const { pr_item_id, quotes } = req.body;
    if (!pr_item_id || !Array.isArray(quotes) || quotes.length === 0) {
      return res.status(400).json({ message: 'pr_item_id and a non-empty quotes array are required' });
    }

    const prItem = await PurchaseRequestItem.findByPk(pr_item_id);
    if (!prItem) return res.status(404).json({ message: 'PR Item not found' });

    const results = [];
    const localVendorCache = new Map();

    for (const row of quotes) {
      const { vendor_name, price, delivery_time, remarks } = row;
      if (!vendor_name) continue;
      const trimmedName = vendor_name.trim();

      try {
        let matchedVendor = localVendorCache.get(trimmedName.toLowerCase());

        if (!matchedVendor) {
          // Match vendor by name (case-insensitive)
          matchedVendor = await Vendor.findOne({
            where: { name: trimmedName }
          });

          if (!matchedVendor) {
            const lastVendor = await Vendor.findOne({
              where: { vendor_code: { [Op.like]: 'VEN-%' } },
              order: [['vendor_code', 'DESC']]
            });

            let nextNum = 1;
            if (lastVendor) {
              const currentNum = parseInt(lastVendor.vendor_code.replace('VEN-', ''));
              if (!isNaN(currentNum)) nextNum = currentNum + 1;
            }

            const vendorCode = `VEN-${nextNum.toString().padStart(3, '0')}`;
            matchedVendor = await Vendor.create({
              name: trimmedName,
              vendor_code: vendorCode,
              approval_status: 'Approved',
              street: 'Added via Excel Import',
              city: 'Auto-created',
              state: 'Auto-created',
              country: 'Auto-created',
              pin: '000000'
            });
          }
          localVendorCache.set(trimmedName.toLowerCase(), matchedVendor);
        }

        if (matchedVendor.approval_status !== 'Approved') {
          results.push({ vendor_name, success: false, error: `Vendor "${vendor_name}" is not approved` });
          continue;
        }

        if (!price || Number(price) <= 0) {
          results.push({ vendor_name, success: false, error: 'Price must be greater than 0' });
          continue;
        }

        // Duplicate Check
        const existing = await Quote.findOne({
          where: {
            pr_item_id,
            vendor_id: matchedVendor.id,
            price: Number(price)
          }
        });

        if (existing) {
          results.push({ 
            vendor_name, 
            success: false, 
            error: `Duplicate entry: Quote for ₹${price} already exists for this vendor.` 
          });
          continue;
        }

        const q = await Quote.create({
          pr_item_id,
          vendor_id: matchedVendor.id,
          price: Number(price),
          delivery_time: delivery_time || null,
          remarks: remarks || null,
          status: 'Pending'
        });

        results.push({ vendor_name, success: true, quote_id: q.id });
      } catch (rowErr) {
        results.push({ vendor_name, success: false, error: rowErr.message });
      }
    }

    // Re-evaluation removed per user request


    const successCount = results.filter(r => r.success).length;
    res.status(201).json({ message: `${successCount}/${results.length} quotes imported successfully`, results });
  } catch (err) {
    console.error('Bulk import error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /pr-item/:pr_item_id — Get quotes for a PR item ─────────────────────
router.get('/pr-item/:pr_item_id', async (req, res) => {
  try {
    const quotes = await Quote.findAll({
      where: { pr_item_id: req.params.pr_item_id },
      include: [Vendor]
    });
    res.json(quotes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /all-active — Unified endpoint for Manager Hub (Pending + Awarded) ───
router.get('/all-active', async (req, res) => {
  try {
    // Fetch all quotes that are either Pending or Approved
    const quotes = await Quote.findAll({
      where: {
        status: { [Op.in]: ['Pending', 'Approved'] }
      },
      include: [Vendor],
      order: [['created_at', 'DESC']]
    });

    if (quotes.length === 0) return res.json([]);
    
    // Fetch associated items and PRs
    const prItemIds = [...new Set(quotes.map(q => q.pr_item_id))];
    const prItems = await PurchaseRequestItem.findAll({
      where: { id: prItemIds },
      include: [
        Item,
        { model: PurchaseRequest, include: [{ model: User, as: 'Requester', attributes: ['name'] }, { model: Project }] }
      ]
    });

    const prItemMap = {};
    for (const pri of prItems) prItemMap[pri.id] = pri;

    const result = quotes.map(q => {
      const plain = q.toJSON();
      const pri = prItemMap[q.pr_item_id];
      if (pri) {
        plain.PurchaseRequestItem = pri.toJSON();
        plain.PurchaseRequest = pri.PurchaseRequest ? pri.PurchaseRequest.toJSON() : null;
      } else {
        plain.PurchaseRequestItem = null;
        plain.PurchaseRequest = null;
      }
      return plain;
    });

    res.json(result);
  } catch (err) {
    console.error('All active quotes error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ─── PUT /:id/status — Approve or Reject a quote (manager action) ─────────────
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Use Approved, Rejected, or Pending.' });
    }

    const quote = await Quote.findByPk(req.params.id, {
      include: [Vendor]
    });
    if (!quote) return res.status(404).json({ message: 'Quote not found' });

    // If reverting to Pending, clear item selection
    if (status === 'Pending') {
      const prItem = await PurchaseRequestItem.findByPk(quote.pr_item_id);
      if (prItem && prItem.selected_quote_id === quote.id) {
        prItem.selected_quote_id = null;
        prItem.unit_price = null;
        prItem.total_price = null;
        await prItem.save();
      }
    }

    quote.status = status;
    await quote.save();

    // If manager approved a quote, ensure no other quote is already approved for this item
    if (status === 'Approved') {
      const existingApproved = await Quote.findOne({
        where: { 
          pr_item_id: quote.pr_item_id, 
          status: 'Approved',
          id: { [Op.ne]: quote.id } // Not the current one
        }
      });

      if (existingApproved) {
        return res.status(400).json({ message: 'Another quotation for this item has already been approved.' });
      }

      // Automatically select this quote for the PR Item
      const prItem = await PurchaseRequestItem.findByPk(quote.pr_item_id);
      if (prItem) {
        const quotePriceNum = Number(quote.price);
        prItem.selected_quote_id = quote.id;
        prItem.unit_price = quotePriceNum / Math.max(Number(prItem.quantity) || 1, 1);
        prItem.total_price = quotePriceNum;
        await prItem.save();
      }

      // Notify Purchase Department that a quote was approved
      const { notifyDepartment } = require('../utils/notifier');
      await notifyDepartment('Purchase', {
        type: 'QUOTE_APPROVED',
        message: `Quotation from ${quote.Vendor ? quote.Vendor.name : 'Vendor'} for ₹${quote.price} has been APPROVED. You can now generate a Purchase Order.`,
        link: `/admin/purchase-requests`
      });
    }

    if (status === 'Rejected') {
      const { notifyDepartment } = require('../utils/notifier');
      await notifyDepartment('Purchase', {
        type: 'QUOTE_REJECTED',
        message: `Quotation from ${quote.Vendor ? quote.Vendor.name : 'Vendor'} for ₹${quote.price} has been REJECTED.`,
        link: `/admin/purchase-requests`
      });
    }

    res.json(quote);
  } catch (err) {
    console.error('Update quote status error:', err);
    res.status(400).json({ message: err.message });
  }
});

// ─── POST /:id/select — Manually select a quote (manager override) ────────────
router.post('/:id/select', async (req, res) => {
  try {
    const quote = await Quote.findByPk(req.params.id, { include: [Vendor] });
    if (!quote) return res.status(404).json({ message: 'Quote not found' });
    if (quote.status !== 'Approved') {
      return res.status(400).json({ message: 'Only Approved quotes can be selected' });
    }

    const prItem = await PurchaseRequestItem.findByPk(quote.pr_item_id);
    const quotePriceNum = Number(quote.price);
    prItem.selected_quote_id = quote.id;
    prItem.unit_price = quotePriceNum / Math.max(Number(prItem.quantity) || 1, 1);
    prItem.total_price = quotePriceNum;
    await prItem.save();

    res.json({ message: 'Quote selected successfully', prItem });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ─── DELETE /:id — Delete a quote ─────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const quote = await Quote.findByPk(req.params.id);
    if (!quote) return res.status(404).json({ message: 'Quote not found' });

    // If approved, clear the selection on the PR item
    if (quote.status === 'Approved') {
      const prItem = await PurchaseRequestItem.findByPk(quote.pr_item_id);
      if (prItem && prItem.selected_quote_id === quote.id) {
        prItem.selected_quote_id = null;
        prItem.unit_price = null;
        prItem.total_price = null;
        await prItem.save();
      }
    }

    await quote.destroy();
    res.json({ message: 'Quote deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
