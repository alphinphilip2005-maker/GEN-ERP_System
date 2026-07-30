const express = require('express');
const router = express.Router();
const { MaterialRejection, Item, Vendor, Project, Grn, User, Notification, Stock, PurchaseOrder, Permission, Module } = require('../models');
const authMiddleware = require('../middlewares/authMiddleware');

// Get all material rejections
router.get('/', async (req, res) => {
  try {
    const rejections = await MaterialRejection.findAll({
      include: [
        { model: Item, attributes: ['item_code', 'item_name'] },
        { model: Vendor, attributes: ['name', 'vendor_code'] },
        { model: Project, attributes: ['project_name'] },
        { model: Grn, attributes: ['grn_no', 'po_id'] }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json(rejections);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update action taken
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { action_taken, remarks, status, closing_date, root_cause, disposition } = req.body;
    const rejection = await MaterialRejection.findByPk(req.params.id);
    if (!rejection) return res.status(404).json({ message: 'Rejection record not found' });

    // Ensure the user has Edit permission for the MRL module
    let canEdit = false;
    if (req.user.role === 'admin') {
      canEdit = true;
    } else {
      const mrlModule = await Module.findOne({ where: { module_name: 'Material Rejection Log' } });
      if (mrlModule) {
         const userPerm = await Permission.findOne({ where: { user_id: req.user.id, module_id: mrlModule.id } });
         if (userPerm && userPerm.can_edit) {
           canEdit = true;
         }
      }
    }

    if (!canEdit) {
      return res.status(403).json({ message: 'You do not have permission to edit the Material Rejection Log.' });
    }

    if (action_taken !== undefined) rejection.action_taken = action_taken;
    if (remarks !== undefined) rejection.remarks = remarks;
    if (root_cause !== undefined) rejection.root_cause = root_cause;
    
    if (disposition !== undefined && disposition !== rejection.disposition) {
      let isAuthorized = false;
      if (req.user.role === 'admin') {
        isAuthorized = true;
      } else if (req.user.department && req.user.department.toLowerCase().trim() === 'quality') {
        isAuthorized = true;
      } else {
        const mrlModule = await Module.findOne({ where: { module_name: 'Material Rejection Log' } });
        if (mrlModule) {
           const userPerm = await Permission.findOne({ where: { user_id: req.user.id, module_id: mrlModule.id } });
           if (userPerm && userPerm.can_edit) {
             isAuthorized = true;
           }
        }
      }

      if (!isAuthorized) {
        return res.status(403).json({ message: 'Only Quality team or authorized users can update the disposition.' });
      }
      rejection.disposition = disposition;
    }
    
    if (status) {
      // Normalize to PascalCase for consistency
      const normalizedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
      
      // Validation: Disposition is required to close a rejection log
      if (normalizedStatus === 'Closed' && !disposition && !rejection.disposition) {
        return res.status(400).json({ message: 'Disposition must be selected before closing the rejection log.' });
      }

      rejection.status = normalizedStatus;
      if (normalizedStatus === 'Closed') {
        rejection.closing_date = new Date();
      } else {
        rejection.closing_date = null;
      }
    } else if (closing_date) {
      rejection.closing_date = closing_date;
    }

    if (rejection.status === 'Closed' && !rejection.is_stock_updated) {
       const prj = await Project.findByPk(rejection.project_id);
       const projectName = prj ? prj.project_name : 'General Project';
       const rejectedQty = parseFloat(rejection.rejected_qty || 0);
       
       // Get location from GRN/PO
       const grn = await Grn.findByPk(rejection.grn_id, {
         include: [{ model: PurchaseOrder }]
       });
       const locationName = (grn && grn.PurchaseOrder && grn.PurchaseOrder.warehouse) ? grn.PurchaseOrder.warehouse : 'Main Store';
       
       let stock = await Stock.findOne({ 
         where: { 
           item_id: rejection.item_id, 
           project_name: projectName,
           location: locationName
         } 
       });
       
       if (!stock) {
         await Stock.create({ 
           item_id: rejection.item_id, 
           quantity: 0, 
           bad_quantity: (rejection.disposition === 'Add to Scrap') ? rejectedQty : 0, 
           location: locationName,
           project_name: projectName
         });
       } else {
         if (rejection.disposition === 'Add to Scrap') {
           stock.bad_quantity = parseFloat(stock.bad_quantity || 0) + rejectedQty;
           await stock.save();
         }
       }
       rejection.is_stock_updated = true;
    }

    await rejection.save();
    res.json(rejection);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Approval Flow
router.post('/:id/approve', async (req, res) => {
  try {
    const { approved, comments } = req.body;
    const rejection = await MaterialRejection.findByPk(req.params.id);
    if (!rejection) return res.status(404).json({ message: 'Rejection record not found' });

    if (approved) {
      rejection.status = 'Closed';
      rejection.closing_date = new Date();
    } else {
      rejection.status = 'Rejected_By_Mgmt';
    }
    
    if (comments) rejection.action_taken = (rejection.action_taken || '') + '\nMgmt Comments: ' + comments;

    await rejection.save();
    res.json(rejection);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
