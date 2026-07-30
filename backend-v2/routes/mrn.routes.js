const express = require('express');
const router = express.Router();
const { Mrn, MrnItem, User, Project, Item, Notification, Stock, ProjectInventory, InventoryHistory } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../db');
const auth = require('../middlewares/authMiddleware');

router.use(auth);

// ─── Helpers: Role Detection (Consistent with system heuristics) ────────────────
const isRnD = (u) => /r.*d|research/i.test(u.department || '') || /r.*d|research/i.test(u.designation || '');
const isAdmin = (u) => (u.role || '').toLowerCase() === 'admin';
const isStore = (u) => (u.department || '').toLowerCase() === 'store' || (u.role || '').toLowerCase() === 'store';

const notifyAdminsAndHeads = async (message, type, link, t, excludeUserId = null) => {
  try {
    const targets = await User.findAll({
      where: {
        [Op.or]: [
          { role: 'admin' },
          { designation: { [Op.like]: '%Head%' } },
          { designation: { [Op.like]: '%Manager%' } },
          { department: 'Store' }
        ]
      }
    });
    const notifications = targets
      .filter(u => u.id !== excludeUserId)
      .map(u => ({ user_id: u.id, title: 'MRN Update', message, type, link, is_read: false }));
    if (notifications.length > 0) {
      await Notification.bulkCreate(notifications, { transaction: t });
    }
  } catch (e) {
    console.error('Notification error:', e);
  }
};

// ─── Include options for full MRN payload ─────────────────────────────────────
const fullMrnInclude = [
  { model: User, as: 'Requester', attributes: ['id', 'name', 'email', 'department', 'designation'] },
  { model: User, as: 'Approver', attributes: ['id', 'name'] },
  { model: User, as: 'Issuer', attributes: ['id', 'name'] },
  { model: Project, attributes: ['id', 'project_name', 'project_code', 'project_lead_id'] },
  { model: Project, as: 'FromProject', attributes: ['id', 'project_name', 'project_code', 'project_lead_id'], required: false },
  { model: Project, as: 'ToProject', attributes: ['id', 'project_name', 'project_code', 'project_lead_id'], required: false },
  {
    model: MrnItem,
    include: [{ model: Item, include: [{ model: Stock }] }]
  }
];

// ─── Get Next MRN Number ───────────────────────────────────────────────────────
router.get('/next-number', async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const count = await Mrn.count();
    const nextNum = (count + 1).toString().padStart(4, '0');
    const mrnNo = `MRN-${year}-${nextNum}`;
    res.json({ nextNo: mrnNo });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Get Project Inventory Items (for Project Transfer auto-fetch) ─────────────
router.get('/project-items/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { location } = req.query; // Fetch optional warehouse filtering
    
    const project = await Project.findByPk(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Construct refined dynamic condition
    const stockWhere = {
      project_name: project.project_name,
      quantity: { [Op.gt]: 0 }
    };
    
    // If an explicit location is requested, scope the inventory lookup strictly to that building!
    if (location) {
      stockWhere.location = location;
    }

    // Fetch accurate stock entries for this project + optional location isolation
    const stocks = await Stock.findAll({
      where: stockWhere,
      include: [{ model: Item }]
    });

    const items = stocks.map(s => ({
      item_id: s.item_id,
      item_name: s.Item?.item_name,
      item_code: s.Item?.item_code,
      specification: s.Item?.description,
      uom: s.Item?.Uom?.name || 'PCS',
      available_stock: parseFloat(s.quantity) || 0,
      project_name: s.project_name
    })).filter(i => i.item_name);

    res.json({ project, items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Create MRN ───────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  // 1. Enforce creation rules: R&D dept, Project Lead, Admin
  const user = req.user || {};
  const leadProject = await Project.findOne({ where: { project_lead_id: user.id } });
  
  const canCreate = isAdmin(user) || isRnD(user) || !!leadProject;
  if (!canCreate) {
    return res.status(403).json({ message: 'Access Denied: Only R&D, Admins, or Project Leads are authorized to create MRNs.' });
  }

  const { items, ...mrnData } = req.body;
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    const t = await sequelize.transaction();
    try {
      // Auto-generate MRN number (bulletproof max sequence logic)
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const maxMrn = await Mrn.findOne({
        where: { mrn_no: { [Op.like]: `MRN-${dateStr}-%` } },
        order: [['mrn_no', 'DESC']],
        attributes: ['mrn_no'],
        transaction: t
      });
      let nextSeq = 1;
      if (maxMrn) {
        const parts = maxMrn.mrn_no.split('-');
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) {
          nextSeq = lastSeq + 1;
        }
      }
      const mrn_no = `MRN-${dateStr}-${nextSeq.toString().padStart(4, '0')}`;
      console.log('API CREATION ATTEMPT:', { dateStr, maxMrn: maxMrn ? maxMrn.mrn_no : 'null', nextSeq, mrn_no });

      // For Project Transfer: set project_id to the TO project for display
      if (mrnData.mrn_type === 'Project_Transfer') {
        mrnData.project_id = mrnData.to_project_id || null;
      }

      // Always ensure requested_by_id is populated from authenticated session user
      mrnData.requested_by_id = req.user ? req.user.id : (mrnData.requested_by_id || 1);

      const mrn = await Mrn.create({ ...mrnData, mrn_no }, { transaction: t });

      if (items && items.length > 0) {
        const mrnItems = items.map(item => ({
          mrn_id: mrn.id,
          item_id: item.item_id,
          requested_quantity: item.requested_quantity,
          uom: item.uom,
          specification: item.specification,
          product_id: item.product_id,
          is_bom_item: !!item.is_bom_item
        }));
        await MrnItem.bulkCreate(mrnItems, { transaction: t });
      }

      // Notifications
      const isTransfer = mrnData.mrn_type === 'Project_Transfer';
      const notifyMsg = isTransfer
        ? `New Project Transfer MRN ${mrn_no} submitted — requires approval from the source project lead.`
        : `New Store MRN ${mrn_no} has been created and requires store review.`;

      await notifyAdminsAndHeads(notifyMsg, 'MRN_CREATED', `/admin/mrn/${mrn.id}`, t, req.user.id);

      // For transfers: also notify the FROM project lead specifically
      if (isTransfer && mrnData.from_project_id) {
        const fromProject = await Project.findByPk(mrnData.from_project_id);
        if (fromProject && fromProject.project_lead_id) {
          await Notification.create({
            user_id: fromProject.project_lead_id,
            title: 'Project Transfer Request',
            message: `A transfer request (${mrn_no}) has been raised to take items from your project "${fromProject.project_name}". Please review and approve.`,
            type: 'MRN_TRANSFER',
            link: `/admin/mrn/${mrn.id}`,
            is_read: false
          }, { transaction: t });
        }
      }

      await t.commit();
      return res.status(201).json(mrn);
    } catch (err) {
      await t.rollback();
      const isCollision = err.name === 'SequelizeUniqueConstraintError' || 
                          err.message?.includes('unique') || 
                          (err.errors && err.errors.some(e => e.message?.includes('unique')));
      if (isCollision && attempts < maxAttempts - 1) {
        attempts++;
        console.warn(`MRN creation collision detected (attempt ${attempts}/${maxAttempts}). Retrying with fresh sequence...`);
        // Wait 50-150ms before retrying to let the other concurrent request commit successfully
        await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
        continue;
      }
      console.error('MRN CREATE DETAILED ERROR:', err);
      let msg = err.message;
      if (err.errors && err.errors.length > 0) {
        msg = err.errors.map(e => e.message).join(', ');
      }
      return res.status(400).json({ message: msg });
    }
  }
});

// ─── Get single MRN ───────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const mrn = await Mrn.findByPk(req.params.id, { include: fullMrnInclude });
    if (!mrn) return res.status(404).json({ message: 'MRN not found' });

    const mrnData = mrn.toJSON();
    if (!mrnData.supervisor_name && mrnData.Approver) mrnData.supervisor_name = mrnData.Approver.name;
    if (!mrnData.store_in_charge_name && mrnData.Issuer) mrnData.store_in_charge_name = mrnData.Issuer.name;
    if (!mrnData.designation && mrnData.Requester) mrnData.designation = mrnData.Requester.designation;

    res.json(mrnData);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Get MRNs with pagination, search, and type filter ────────────────────────
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', type = '' } = req.query;
    const offset = (page - 1) * limit;

    const { id, role, department, designation } = req.user;
    const userRole = (role || '').toLowerCase();
    const userDept = (department || '').toLowerCase();
    const userDesignation = (designation || '').toLowerCase();
    const email = (req.user.email || '').toLowerCase();

    const isRnDUser = /r.*d|research/i.test(userDept) || /r.*d|research/i.test(userDesignation) ||
                      email.includes('ashik') || email.includes('alphin');

    const canSeeAll =
      userRole === 'admin' ||
      userDept.includes('store') ||
      userDept.includes('purchase') ||
      userDept.includes('finance') ||
      userDept.includes('accounts') ||
      userDept.includes('quality') ||
      userDept.includes('production') ||
      userDept.includes('o&m') ||
      userDept === 'om' ||
      userDesignation.includes('manager') ||
      userDesignation.includes('head') ||
      isRnDUser;

    const where = {};

    // Visibility filter
    if (!canSeeAll) {
      const isRnDUser = /r.*d|research/i.test(userDept) || /r.*d|research/i.test(userDesignation) ||
                        email.includes('ashik') || email.includes('alphin');
      if (isRnDUser) {
        where[Op.or] = [
          { requested_by_id: id },
          { department: { [Op.in]: ['R&D', 'RD', 'Research', 'ADMIN', 'Admin'] } },
          { mrn_no: { [Op.like]: '%R&D%' } },
          { mrn_no: { [Op.like]: '%ADMIN%' } }
        ];
      } else {
        where[Op.or] = [
          { requested_by_id: id },
          { from_project_id: { [Op.ne]: null } }, // show transfer MRNs to relevant users
          { to_project_id: { [Op.ne]: null } }
        ];
      }
    }

    // Type filter
    if (type && type !== 'all') {
      where.mrn_type = type === 'transfer' ? 'Project_Transfer' : 'Store';
    }

    // Search filter
    if (search) {
      const searchWhere = {
        [Op.or]: [
          { mrn_no: { [Op.like]: `%${search}%` } },
          { department: { [Op.like]: `%${search}%` } }
        ]
      };
      where[Op.and] = where[Op.and] ? [...where[Op.and], searchWhere] : [searchWhere];
    }

    const listInclude = [
      { model: User, as: 'Requester', attributes: ['id', 'name', 'department', 'designation'] },
      { model: User, as: 'Approver', attributes: ['id', 'name'] },
      { model: User, as: 'Issuer', attributes: ['id', 'name'] },
      { model: Project, attributes: ['id', 'project_name', 'project_code'] },
      { model: Project, as: 'FromProject', attributes: ['id', 'project_name'], required: false },
      { model: Project, as: 'ToProject', attributes: ['id', 'project_name'], required: false },
      { model: MrnItem, include: [{ model: Item, attributes: ['id', 'item_name', 'item_code'] }] }
    ];

    const { count, rows } = await Mrn.findAndCountAll({
      where,
      include: listInclude,
      distinct: true,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    const data = rows.map(r => {
      const mrn = r.toJSON();
      if (!mrn.supervisor_name && mrn.Approver) mrn.supervisor_name = mrn.Approver.name;
      if (!mrn.store_in_charge_name && mrn.Issuer) mrn.store_in_charge_name = mrn.Issuer.name;
      return mrn;
    });

    // Log for visibility debug
    try {
      const fs = require('fs');
      const logPath = require('path').join(__dirname, '../visibility_debug.log');
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] MRN Visibility - User: ${req.user.name} | Dept: ${userDept} | canSeeAll: ${canSeeAll} | where: ${JSON.stringify(where)}\n`);
    } catch(e) {}

    res.json({ total: count, pages: Math.ceil(count / limit), data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── Approve MRN (Store) / Approve Transfer (Project Lead of FROM project) ────
router.patch('/:id/approve', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const mrn = await Mrn.findByPk(req.params.id, { 
      include: [
        { model: Project, as: 'FromProject' },
        { model: Project, as: 'ToProject' }
      ], 
      transaction: t 
    });
    if (!mrn) { await t.rollback(); return res.status(404).json({ message: 'MRN not found' }); }

    const user = req.user || {};
    const isTransfer = mrn.mrn_type === 'Project_Transfer';

    let canApprove = false;

    if (isTransfer) {
      // NEW REQUIREMENT: Admins, R&D Team, or Designated Project Leads associated with this specific transaction pair can authorize.
      const isSystemAdmin = isAdmin(user);
      const currentUserId = Number(user.id);
      
      const fromLead = mrn.FromProject?.project_lead_id ? Number(mrn.FromProject.project_lead_id) : null;
      const toLead = mrn.ToProject?.project_lead_id ? Number(mrn.ToProject.project_lead_id) : null;
      
      const isMatchedLead = (currentUserId === fromLead) || (currentUserId === toLead);

      canApprove = isSystemAdmin || isRnD(user) || isMatchedLead;
    } else {
      // Default logic for Standard Store Requisitions stays the same.
      canApprove = isAdmin(user) || isRnD(user) || isStore(user);
    }

    if (!canApprove) {
      await t.rollback();
      return res.status(403).json({ message: 'Access Denied: You lack the necessary department authorization to approve this requisition.' });
    }

    const newStatus = isTransfer ? 'Transfer_Approved' : 'Approved';
    await mrn.update({
      status: newStatus,
      approved_by_id: user.id || null,
      supervisor_name: user.name || 'Authorized Manager'
    }, { transaction: t });

    // Notify requester
    await Notification.create({
      user_id: mrn.requested_by_id,
      message: isTransfer
        ? `Your Project Transfer MRN ${mrn.mrn_no} has been approved. Store will issue the items shortly.`
        : `Your MRN ${mrn.mrn_no} has been approved and is ready for issuance.`,
      type: 'MRN_APPROVED',
      link: `/admin/mrn/${mrn.id}`,
      is_read: false
    }, { transaction: t });

    await notifyAdminsAndHeads(
      `MRN ${mrn.mrn_no} (${isTransfer ? 'Project Transfer' : 'Store'}) has been approved by ${user.name}.`,
      'MRN_APPROVED',
      `/admin/mrn/${mrn.id}`,
      t,
      user.id
    );

    await t.commit();
    res.json({ message: `MRN ${newStatus}`, mrn });
  } catch (err) {
    await t.rollback();
    res.status(400).json({ message: err.message });
  }
});

// ─── Issue Materials ───────────────────────────────────────────────────────────
router.post('/:id/issue', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { issues } = req.body;
    const mrn = await Mrn.findByPk(req.params.id, {
      include: [
        { model: MrnItem },
        { model: User, as: 'Requester' },
        { model: Project, as: 'FromProject' },
        { model: Project, as: 'ToProject' }
      ]
    });
    if (!mrn) throw new Error('MRN not found');

    // Enforce permission: only Store department or Admin can issue items
    const user = req.user || {};
    const isAllowedIssuer = isAdmin(user) || isStore(user);
    if (!isAllowedIssuer) {
      throw new Error('Access Denied: Only the store department or an admin can officially issue items for MRNs.');
    }

    const isTransfer = mrn.mrn_type === 'Project_Transfer';

    for (const issue of issues) {
      const mrnItem = await MrnItem.findOne({ where: { mrn_id: mrn.id, item_id: issue.item_id } });
      if (!mrnItem) continue;

      const newIssuedQty = parseFloat(mrnItem.issued_quantity || 0) + parseFloat(issue.quantity || 0);
      await mrnItem.update({ issued_quantity: newIssuedQty }, { transaction: t });

      if (isTransfer) {
        // ── PROJECT TRANSFER STOCK MOVEMENT ──────────────────────────────────
        const fromLocation = mrn.store_location || null;
        const toLocation = mrn.to_store_location || null;

        // Deduct specifically from SOURCE warehouse row!
        const fromProjectName = mrn.FromProject?.project_name || 'General Project';
        const fromStockWhere = { item_id: issue.item_id, project_name: fromProjectName };
        if (fromLocation) fromStockWhere.location = fromLocation;

        const fromStock = await Stock.findOne({
          where: fromStockWhere,
          transaction: t
        });
        if (fromStock) {
          await fromStock.decrement('quantity', { by: issue.quantity, transaction: t });
        }

        // Add specifically to DESTINATION warehouse row!
        const toProjectName = mrn.ToProject?.project_name || 'General Project';
        const toStockWhere = { item_id: issue.item_id, project_name: toProjectName };
        if (toLocation) toStockWhere.location = toLocation;

        const toStock = await Stock.findOne({
          where: toStockWhere,
          transaction: t
        });

        if (toStock) {
          await toStock.increment('quantity', { by: issue.quantity, transaction: t });
        } else {
          await Stock.create({
            item_id: issue.item_id,
            project_name: toProjectName,
            location: toLocation, // Map new destination accurately
            quantity: issue.quantity,
            bad_quantity: 0
          }, { transaction: t });
        }

        // Log to Inventory History
        await InventoryHistory.create({
          item_id: issue.item_id,
          quantity: issue.quantity,
          type: 'Project_Transfer',
          source_reference: mrn.mrn_no,
          from_project: fromProjectName,
          to_project: toProjectName,
          user_name: user.name || 'Store Personnel'
        }, { transaction: t });

        // ProjectInventory for TO project
        let toProjInv = await ProjectInventory.findOne({
          where: { project_id: mrn.to_project_id, item_id: issue.item_id },
          transaction: t
        });
        if (toProjInv) {
          await toProjInv.increment('available_quantity', { by: issue.quantity, transaction: t });
        } else {
          await ProjectInventory.create({
            project_id: mrn.to_project_id,
            item_id: issue.item_id,
            available_quantity: issue.quantity
          }, { transaction: t });
        }
      } else {
        // ── STORE MRN STOCK MOVEMENT (original logic) ─────────────────────────
        const reqLoc = (mrn.store_location === 'Warehouse' || !mrn.store_location) ? null : mrn.store_location;
        const project = await Project.findByPk(mrn.project_id);
        const projectName = project ? project.project_name : 'General Project';

        // Enforce strict spatial safety: ALL lookups must happen at this specific warehouse!
        const baseWhere = { item_id: issue.item_id };
        if (reqLoc) baseWhere.location = reqLoc;

        // Step 1: Attempt direct reduction of current project's holding at this facility
        let targetStock = await Stock.findOne({
          where: { ...baseWhere, project_name: projectName },
          transaction: t
        });

        // Step 2: Elastic sourcing - draw from generic/other buckets strictly within the same warehouse!
        if (!targetStock) {
          targetStock = await Stock.findOne({ where: baseWhere, transaction: t });
        }

        if (targetStock) {
          await targetStock.decrement('quantity', { by: issue.quantity, transaction: t });
        }

        let projInv = await ProjectInventory.findOne({
          where: { project_id: mrn.project_id, item_id: issue.item_id },
          transaction: t
        });
        if (projInv) {
          await projInv.increment('available_quantity', { by: issue.quantity, transaction: t });
        } else {
          await ProjectInventory.create({
            project_id: mrn.project_id,
            item_id: issue.item_id,
            available_quantity: issue.quantity
          }, { transaction: t });
        }
      }
    }

    // Update MRN status
    const allItems = await MrnItem.findAll({ where: { mrn_id: mrn.id }, transaction: t });
    let fullyIssued = true;
    let someIssued = false;
    for (const item of allItems) {
      const issued = parseFloat(item.issued_quantity) || 0;
      const requested = parseFloat(item.requested_quantity) || 0;
      if (Math.round(issued * 100) < Math.round(requested * 100)) fullyIssued = false;
      if (issued > 0) someIssued = true;
    }

    const newStatus = fullyIssued ? 'Issued' : (someIssued ? 'Partial' : (isTransfer ? 'Transfer_Approved' : 'Approved'));
    await mrn.update({
      status: newStatus,
      issued_by_id: user.id || null,
      store_in_charge_name: user.name || 'Store Personnel'
    }, { transaction: t });

    // Notify requester
    await Notification.create({
      user_id: mrn.requested_by_id,
      message: `Materials have been ${fullyIssued ? 'fully' : 'partially'} issued for your MRN ${mrn.mrn_no}.`,
      type: 'MRN_ISSUED',
      link: `/admin/mrn/${mrn.id}`,
      is_read: false
    }, { transaction: t });

    await notifyAdminsAndHeads(
      `MRN ${mrn.mrn_no} has been ${fullyIssued ? 'fully' : 'partially'} issued by ${user.name}.`,
      'MRN_ISSUED',
      `/admin/mrn/${mrn.id}`,
      t,
      user.id
    );

    await t.commit();
    res.json({ message: 'Materials issued successfully', status: newStatus });
  } catch (err) {
    await t.rollback();
    res.status(400).json({ message: err.message });
  }
});

// ─── Delete MRN ───────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const mrn = await Mrn.findByPk(req.params.id);
    if (!mrn) { await t.rollback(); return res.status(404).json({ message: 'MRN not found' }); }
    if (mrn.status !== 'Pending') {
      await t.rollback();
      return res.status(400).json({ message: 'Only Pending MRNs can be deleted' });
    }
    await MrnItem.destroy({ where: { mrn_id: mrn.id }, transaction: t });
    await mrn.destroy({ transaction: t });
    await t.commit();
    res.json({ message: 'MRN deleted successfully' });
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
