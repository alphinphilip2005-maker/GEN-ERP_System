const express = require('express');
const router = express.Router();
const sequelize = require('../db');
const { PurchaseRequest, PurchaseRequestItem, User, Project, BomRevision, BomItem, Item, Stock, Notification, Quote, Vendor, PurchaseOrder } = require('../models');
const { Op } = require('sequelize');

// Helper for notifications via Permissions
const notifyUsersByRole = async (rolesOptions, message, type, link) => {
  try {
    const { User, Permission, Module, Notification } = require('../models');
    
    // Find PR module
    const prModule = await Module.findOne({ where: { module_name: 'Purchase Request' } });
    if (!prModule) return;

    // Build the query to find users matching the specific permission flags
    const whereClause = { module_id: prModule.id };
    
    // Look for users that match any of the required roles logic
    let roleConditions = [];
    if (rolesOptions.approvers) roleConditions.push({ can_approve: true });
    if (rolesOptions.watchers_only) roleConditions.push({ can_view: true, can_create: false, can_approve: false });
    if (rolesOptions.creators) roleConditions.push({ can_create: true });
    
    if (roleConditions.length > 0) {
      whereClause[Op.or] = roleConditions;
    }

    const perms = await Permission.findAll({ where: whereClause, include: [User] });
    
    // De-duplicate users (in case multiple perms match somehow, though shouldn't happen)
    const uniqueUserIds = [...new Set(perms.map(p => p.user_id))];

    const notifications = uniqueUserIds.map(userId => ({
      user_id: userId,
      message,
      type,
      link
    }));

    if (notifications.length > 0) {
      await Notification.bulkCreate(notifications);
    }
  } catch (err) {
    console.error('Notification error:', err);
  }
};

// Standard notify specific user(s) exactly
const notifyUsers = async (criteria, message, type, link) => {
  try {
    const users = await require('../models').User.findAll({ where: criteria });
    const notifications = users.map(user => ({
      user_id: user.id,
      message,
      type,
      link
    }));
    if (notifications.length > 0) {
      await require('../models').Notification.bulkCreate(notifications);
    }
  } catch (err) {
    console.error('Notification error:', err);
  }
};

// GET all PRs
const authMiddleware = require('../middlewares/authMiddleware');
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { id, role, department, designation } = req.user;
    
    const userDesignation = (designation || '').toLowerCase();
    const userRole = (role || '').toLowerCase();
    const userDept = (department || '').toLowerCase();
    const email = (req.user.email || '').toLowerCase();
    const isRnDUser = /r.*d|research/i.test(userDept) || /r.*d|research/i.test(userDesignation) || 
                      email.includes('ashik') || email.includes('alphin');

    // Determine if user has full visibility (Admin, Purchase/Store depts, or Managers)
    const canSeeAll = 
      userRole === 'admin' || 
      userDept.includes('purchase') || 
      userDept.includes('store') ||
      userDept.includes('finance') ||
      userDept.includes('accounts') ||
      userDept.includes('quality') ||
      userDept.includes('production') ||
      userDept.includes('o&m') ||
      userDept === 'om' ||
      userDesignation.includes('manager') ||
      userDesignation.includes('approver') ||
      userDesignation.includes('head') ||
      isRnDUser ||
      req.query.status === 'Submitted';

    const whereClause = {};
    if (!canSeeAll) {
      const email = (req.user.email || '').toLowerCase();
      const isRnDUser = /r.*d|research/i.test(userDept) || /r.*d|research/i.test(userDesignation) || 
                        email.includes('ashik') || email.includes('alphin');
      
      const isQualityUser = userDept.includes('quality') || userDesignation.includes('qa') || userDesignation.includes('qc');
      const isOmUser = userDept.includes('o&m') || userDept === 'om' || email.includes('nikitha');
      
      if (isRnDUser || isQualityUser || isOmUser) {
        whereClause[Op.or] = [
          { requested_by_id: id },
          { department: { [Op.in]: ['R&D', 'RD', 'Research', 'ADMIN', 'Admin', 'Quality', 'QUALITY', 'O&M', 'o&m'] } },
          { pr_no: { [Op.like]: '%R&D%' } },
          { pr_no: { [Op.like]: '%ADMIN%' } },
          { pr_no: { [Op.like]: '%QUALITY%' } }
        ];
      } else {
        whereClause.requested_by_id = id;
      }
    }

    if (req.query.status) {
      whereClause.status = req.query.status;
    }

    // Keep the debug log to track issues
    const fs = require('fs');
    const logPath = require('path').join(__dirname, '../visibility_debug.log');
    const logMsg = `[${new Date().toISOString()}] User: ${req.user.name} | Dept: ${userDept} | Desig: ${userDesignation} | isRnD: ${/r.*d|research/i.test(userDept) || (req.user.email || '').toLowerCase().includes('ashik')} | where: ${JSON.stringify(whereClause)}\n`;
    try { fs.appendFileSync(logPath, logMsg); } catch(e) {}

    const prs = await PurchaseRequest.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'Requester', attributes: ['id', 'name', 'department', 'designation'], required: false },
        { model: Project, attributes: ['id', 'project_name', 'project_code'], required: false },
        { model: BomRevision, attributes: ['id', 'revision_no'], required: false },
        { 
          model: PurchaseOrder,
          required: false,
          include: [
            { model: Vendor, as: 'ToVendor', attributes: ['id', 'name'] },
            { model: require('../models').Grn, required: false }
          ]
        },
        { 
          model: PurchaseRequestItem,
          include: [
            { model: Item, required: false },
            { 
              model: Quote, 
              required: false,
              include: [{ model: Vendor, attributes: ['id', 'name'] }]
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json(prs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET next PR number
router.get('/next-number', async (req, res) => {
  try {
    const { dept } = req.query;
    if (!dept) return res.status(400).json({ message: 'Department is required' });

    const year = new Date().getFullYear();
    const searchPattern = `${year} GRI/%/PR/%`;
    
    const prs = await PurchaseRequest.findAll({
      where: {
        pr_no: { [Op.like]: searchPattern }
      }
    });

    let maxSerial = 0;
    prs.forEach(pr => {
      if (pr.pr_no) {
        const parts = pr.pr_no.split('/');
        const serialStr = parts[parts.length - 1];
        const serial = parseInt(serialStr, 10);
        if (!isNaN(serial) && serial > maxSerial) {
          maxSerial = serial;
        }
      }
    });

    const nextSerial = maxSerial + 1;
    const prefix = `${year} GRI/${dept.toUpperCase()}/PR/`;
    const nextPrNo = `${prefix}${nextSerial.toString().padStart(3, '0')}`;
    res.json({ nextPrNo });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET all approved BOM revisions for a specific project
router.get('/approved-boms/:projectId', async (req, res) => {
  try {
    const { BomProject } = require('../models');
    
    const revisions = await BomRevision.findAll({
      where: { status: 'Approved' },
      include: [{ 
        model: BomProject, 
        attributes: ['id', 'project_name'],
        where: { project_id: req.params.projectId }
      }],
      order: [['created_at', 'DESC']]
    });

    res.json(revisions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET items for a specific BOM revision
router.get('/bom-items/:revisionId', async (req, res) => {
  try {
    const { revisionId } = req.params;
    const { location, project_name } = req.query;
    
    // 1. Fetch clean, unique rows from BomItem associated with this revision only.
    const bomItems = await BomItem.findAll({
      where: { bom_revision_id: revisionId },
      include: [{ model: Item }] // Remove direct Stock include here to kill the row-duplication join
    });

    const payloadItems = [];

    // 2. For each item, perform a specialized summation based on live filters provided!
    for (const bi of bomItems) {
      const baseJson = bi.toJSON();
      
      // Build highly specific where conditions for stock lookup
      const stockWhere = { item_id: bi.item_id };
      if (location) stockWhere.location = location;
      if (project_name) stockWhere.project_name = project_name;

      // Dynamically aggregate accurate stock for THIS specific bucket (project + location)
      const rawSum = await Stock.sum('quantity', { where: stockWhere });
      const accurateStock = parseFloat(rawSum) || 0;

      payloadItems.push({
        ...baseJson,
        current_stock: Math.max(0, accurateStock) // clamp negatives to 0
      });
    }

    res.json({
      items: payloadItems
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create PR
router.post('/', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { items, ...prData } = req.body;

    // Auto-generate PR Number if not provided
    if (!prData.pr_no) {
      const year = new Date().getFullYear();
      const dept = prData.department || 'GEN';
      const searchPattern = `${year} GRI/%/PR/%`;
      
      const prs = await PurchaseRequest.findAll({
        where: { pr_no: { [Op.like]: searchPattern } }
      });

      let maxSerial = 0;
      prs.forEach(p => {
        if (p.pr_no) {
          const parts = p.pr_no.split('/');
          const serialStr = parts[parts.length - 1];
          const serial = parseInt(serialStr, 10);
          if (!isNaN(serial) && serial > maxSerial) {
            maxSerial = serial;
          }
        }
      });

      const nextSerial = maxSerial + 1;
      const prefix = `${year} GRI/${dept.toUpperCase()}/PR/`;
      prData.pr_no = `${prefix}${nextSerial.toString().padStart(3, '0')}`;
    }

    // Remove empty project_id to prevent constraint errors
    if (!prData.project_id) {
       prData.project_id = null;
    }

    const finalStatus = prData.status || 'Draft';
    const pr = await PurchaseRequest.create({
      ...prData,
      status: finalStatus,
      submitted_at: finalStatus === 'Submitted' ? new Date() : null,
      approved_at: null // Manual approval required
    }, { transaction: t });

      // Deduplicate by item_id before inserting — merge quantities if same item appears twice
      const prItemMap = new Map();
      for (const item of items) {
        const key = item.item_id ? `item_${item.item_id}` : `custom_${(item.custom_item_name || item.searchQuery || '').toLowerCase().trim()}`;
        if (prItemMap.has(key)) {
          // Merge: sum quantities
          const existing = prItemMap.get(key);
          existing.quantity = (parseFloat(existing.quantity) || 0) + (parseFloat(item.quantity) || 0);
        } else {
          if (item.item_id) {
            prItemMap.set(key, { ...item, pr_id: pr.id });
          } else {
            prItemMap.set(key, {
              ...item,
              item_id: null,
              custom_item_name: item.custom_item_name || item.searchQuery,
              custom_item_code: item.item_code,
              pr_id: pr.id
            });
          }
        }
      }

      const prItemsToInsert = Array.from(prItemMap.values());
      if (prItemsToInsert.length > 0) {
        await PurchaseRequestItem.bulkCreate(prItemsToInsert, { transaction: t });
      }

    await t.commit();
    
    // Notifications if submitted
    if (finalStatus === 'Submitted') {
      const message = `A new Purchase Request (${pr.pr_no}) has been created and is awaiting approval.`;
      await notifyUsersByRole({ approvers: true, watchers_only: true }, message, 'PR_SUBMITTED', `/admin/purchase-requests/${pr.id}`);

      // Specifically notify R&D Department Head
      try {
        const { Op } = require('sequelize');
        const { User: UserModel, Notification: NotificationModel } = require('../models');
        const rdHeads = await UserModel.findAll({
          where: {
            [Op.or]: [
              { designation: { [Op.like]: '%R&D Head%' } },
              { designation: { [Op.like]: '%Dept Head%' } },
              { designation: { [Op.like]: '%Department Head%' } },
              { designation: { [Op.like]: '%Head%' }, department: 'R&D' }
            ]
          }
        });
        for (const head of rdHeads) {
          await NotificationModel.create({
            user_id: head.id,
            type: 'PR_SUBMITTED',
            message: `Purchase Request ${pr.pr_no} has been submitted and is awaiting approval.`,
            link: `/admin/purchase-requests/${pr.id}`,
            is_read: false
          });

          if (head.email) {
            try {
              const { sendEmailNotification } = require('../utils/email');
              await sendEmailNotification(
                head.email,
                `Gen ERP: Purchase Request Submitted (${pr.pr_no})`,
                `Purchase Request ${pr.pr_no} has been submitted and is awaiting approval. You can view the details on your dashboard.`
              );
            } catch(e) {}
          }
        }
      } catch(err) {
        console.error('Failed to notify R&D heads:', err);
      }
    }

    res.status(201).json(pr);
  } catch (err) {
    await t.rollback();
    console.error('PR CREATE ERROR:', err);
    res.status(400).json({ message: err.message });
  }
});

// DELETE PR
router.delete('/:id', async (req, res) => {
  try {
    const pr = await PurchaseRequest.findByPk(req.params.id);
    if (!pr) return res.status(404).json({ message: 'Purchase Request not found' });
    if (pr.status !== 'Draft') {
        return res.status(403).json({ message: 'Only Draft PRs can be deleted' });
    }
    await pr.destroy();
    res.json({ message: 'Purchase Request deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single PR with items
router.get('/:id', async (req, res) => {
  try {
    const pr = await PurchaseRequest.findByPk(req.params.id, {
      include: [
        { model: User, as: 'Requester', attributes: ['id', 'name'] },
        { model: Project, attributes: ['id', 'project_name', 'project_code'], required: false },
        { model: BomRevision, attributes: ['id', 'revision_no', 'bom_project_id'], required: false },
        { model: PurchaseOrder, required: false },
        {
          model: PurchaseRequestItem,
          include: [
            { 
              model: Item,
              include: [{ model: Stock }]
            },
            {
              model: Quote,
              required: false,
              include: [{ model: Vendor, attributes: ['id', 'name'] }]
            }
          ]
        }
      ]
    });
    if (!pr) return res.status(404).json({ message: 'Purchase Request not found' });
    res.json(pr);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// (Approval/Rejection stage removed)


// PUT update PR
router.put('/:id', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const pr = await PurchaseRequest.findByPk(req.params.id, { transaction: t });
    if (!pr) {
      await t.rollback();
      return res.status(404).json({ message: 'Purchase Request not found' });
    }

    if (pr.status === 'Approved' || pr.status === 'Closed') {
      await t.rollback();
      return res.status(403).json({ message: 'Cannot edit an approved or closed Purchase Request' });
    }

    const { items, ...prData } = req.body;
    
    if (!prData.project_id) prData.project_id = null;

    const finalStatus = prData.status || pr.status;
    const updates = { ...prData, status: finalStatus };
    
    if (pr.status !== 'Submitted' && finalStatus === 'Submitted') {
      updates.submitted_at = new Date();
    }

    await pr.update(updates, { transaction: t });

    // Replace items if provided
    if (items) {
      await PurchaseRequestItem.destroy({ where: { pr_id: pr.id }, transaction: t });

      // Deduplicate by item_id before inserting
      const prItemMap = new Map();
      for (const item of items) {
        const key = item.item_id ? `item_${item.item_id}` : `custom_${(item.custom_item_name || item.searchQuery || '').toLowerCase().trim()}`;
        if (prItemMap.has(key)) {
          const existing = prItemMap.get(key);
          existing.quantity = (parseFloat(existing.quantity) || 0) + (parseFloat(item.quantity) || 0);
        } else {
          if (item.item_id) {
            prItemMap.set(key, { ...item, pr_id: pr.id });
          } else {
            prItemMap.set(key, {
              ...item,
              item_id: null,
              custom_item_name: item.custom_item_name || item.searchQuery,
              custom_item_code: item.item_code,
              pr_id: pr.id
            });
          }
        }
      }

      const prItemsToInsert = Array.from(prItemMap.values());
      if (prItemsToInsert.length > 0) {
        await PurchaseRequestItem.bulkCreate(prItemsToInsert, { transaction: t });
      }
    }

    await t.commit();

    // Trigger notification if newly submitted
    if (pr.status === 'Submitted' && prData.status === 'Submitted') {
      const message = `Purchase Request (${pr.pr_no}) has been released and is awaiting manager approval.`;
      await notifyUsersByRole({ approvers: true, watchers_only: true }, message, 'PR_SUBMITTED', `/admin/purchase-requests/${pr.id}`);

      // Specifically notify R&D Department Head
      try {
        const { Op } = require('sequelize');
        const { User: UserModel, Notification: NotificationModel } = require('../models');
        const rdHeads = await UserModel.findAll({
          where: {
            [Op.or]: [
              { designation: { [Op.like]: '%R&D Head%' } },
              { designation: { [Op.like]: '%Dept Head%' } },
              { designation: { [Op.like]: '%Department Head%' } },
              { designation: { [Op.like]: '%Head%' }, department: 'R&D' }
            ]
          }
        });
        for (const head of rdHeads) {
          await NotificationModel.create({
            user_id: head.id,
            type: 'PR_SUBMITTED',
            message: `Purchase Request ${pr.pr_no} has been submitted and is awaiting approval.`,
            link: `/admin/purchase-requests/${pr.id}`,
            is_read: false
          });

          if (head.email) {
            try {
              const { sendEmailNotification } = require('../utils/email');
              await sendEmailNotification(
                head.email,
                `Gen ERP: Purchase Request Submitted (${pr.pr_no})`,
                `Purchase Request ${pr.pr_no} has been submitted and is awaiting approval. You can view the details on your dashboard.`
              );
            } catch(e) {}
          }
        }
      } catch(err) {
        console.error('Failed to notify R&D heads:', err);
      }
    }

    res.json(pr);
  } catch (err) {
    await t.rollback();
    res.status(400).json({ message: err.message });
  }
});

// (Moved delete up)

// PATCH/PUT update status
const handleStatusUpdate = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { status, remarks, items } = req.body;

    const pr = await PurchaseRequest.findByPk(id, { transaction: t });
    if (!pr) {
      await t.rollback();
      return res.status(404).json({ message: 'Purchase Request not found' });
    }

    const oldStatus = pr.status;
    const updates = { status };
    if (remarks) updates.remarks = remarks;
    
    if (status === 'Approved') updates.approved_at = new Date();
    if (status === 'Rejected') updates.rejected_at = new Date();

    await pr.update(updates, { transaction: t });

    // If item-level approvals were provided (from pr-create or similar)
    if (items && items.length > 0) {
      for (const itemDecision of items) {
        await PurchaseRequestItem.update(
          { line_status: itemDecision.line_status },
          { where: { id: itemDecision.id, pr_id: pr.id }, transaction: t }
        );
      }
    }

    await t.commit();

    // Notifications
    const message = `Purchase Request ${pr.pr_no} has been ${status.toLowerCase()}.`;
    await notifyUsersByRole({ creators: true, watchers_only: true }, message, 'PR_STATUS_CHANGE', `/admin/purchase-requests/${pr.id}`);
    
    // Specifically notify requester
    if (pr.requested_by_id) {
      await notifyUsers({ id: pr.requested_by_id }, `Your PR ${pr.pr_no} was ${status.toLowerCase()}.`, 'INFO', `/admin/purchase-requests/${pr.id}`);
    }

    res.json(pr);
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
};

router.patch('/:id/status', handleStatusUpdate);
router.put('/:id/status', handleStatusUpdate);

// GET PR Lifecycle Tracking Data
router.get('/:id/tracker', async (req, res) => {
  try {
    const { Quote, PurchaseOrder, Grn, IqcInspection, Vendor } = require('../models');

    // 1. Fetch PR
    const pr = await PurchaseRequest.findByPk(req.params.id, {
      include: [{ model: User, as: 'Requester', attributes: ['id', 'name'] }]
    });
    if (!pr) return res.status(404).json({ message: 'Purchase Request not found' });

    // 2. Fetch all Quotations for this PR
    const quotes = await Quote.findAll({
      where: { pr_item_id: { [Op.in]: sequelize.literal(`(SELECT id FROM PurchaseRequestItems WHERE pr_id = ${pr.id})`) } },
      include: [{ model: Vendor, attributes: ['id', 'name'] }]
    });

    // 3. Find POs related to these quotes
    const pos = await PurchaseOrder.findAll({
      where: { quote_id: { [Op.in]: quotes.map(q => q.id).concat([0]) } },
      include: [{ model: Vendor, attributes: ['id', 'name'] }]
    });

    // 4. Find GRNs and QC for these POs
    const grns = await Grn.findAll({
      where: { po_id: { [Op.in]: pos.map(p => p.id).concat([0]) } }
    });

    const qcs = await IqcInspection.findAll({
      where: { grn_id: { [Op.in]: grns.map(g => g.id).concat([0]) } }
    });

    res.json({
      pr,
      quotes,
      pos,
      grns,
      qcs
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
