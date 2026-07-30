const express = require('express');
const router = express.Router();
const sequelize = require('../db');
const { BomProject, BomItem, BomRevision, Item, User, Notification, Stock } = require('../models');
const { Op } = require('sequelize');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');

// Multer config for Excel uploads
const upload = multer({ dest: 'uploads/' });

// Format revision to always be 2 digits (e.g., '0' -> '00', '1' -> '01')
const formatRevision = (num) => num.toString().padStart(2, '0');

const normalizeRowKeys = (row) => {
  const normalized = {};
  Object.entries(row || {}).forEach(([key, value]) => {
    normalized[String(key).trim().toLowerCase()] = value;
  });
  return normalized;
};

// Helper for sending notifications
const notifyUsers = async (criteria, message, type, link) => {
  try {
    const users = await User.findAll({ where: criteria });
    const notifications = users.map(user => ({
      user_id: user.id,
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

// Get all BOM Projects
router.get('/', async (req, res) => {
  try {
    const boms = await BomProject.findAll({
      order: [['created_at', 'DESC']]
    });
    res.json(boms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Download BOM Template - MUST be before /:id to avoid route conflict
router.get('/template', (req, res) => {
  const path = require('path');
  // Template is in project root: c:/Users/uiuxg/Antigravity/bom template/
  const templatePath = path.join(__dirname, '../../bom template/BOM - TEMPLATE.xlsx');
  
  if (require('fs').existsSync(templatePath)) {
    res.download(templatePath, 'BOM_Template.xlsx');
  } else {
    res.status(404).json({ message: 'Template file not found at: ' + templatePath });
  }
});

// Get single BOM Project with items for the CURRENT revision
router.get('/:id', async (req, res) => {
  try {
    const project = await BomProject.findByPk(req.params.id, {
      include: [
        {
          model: BomRevision
        }
      ],
      order: [[BomRevision, 'created_at', 'DESC']]
    });

    if (!project) return res.status(404).json({ message: 'BOM Project not found' });
    
    // Fetch items for the LATEST revision associated with this project
    // (Regardless of whether it matches the official project.current_revision)
    const latestRev = await BomRevision.findOne({
      where: { bom_project_id: project.id },
      order: [['created_at', 'DESC']]
    });

    let items = [];
    if (latestRev) {
      items = await BomItem.findAll({
        where: { bom_revision_id: latestRev.id },
        include: [{ 
          model: Item,
          include: [{ model: Stock }]
        }]
      });
    }

    // Combine project data with the working (latest) revision's items
    res.json({ 
      ...project.toJSON(), 
      BomItems: items,
      latest_revision: latestRev ? latestRev.toJSON() : null
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new BOM Project and its initial revision items
router.post('/', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { project_name, project_id, uploaded_by, current_revision, released_on, items } = req.body;
    
    const relDate = released_on ? new Date(released_on) : new Date();
    const revNo = current_revision || '00';

    const project = await BomProject.create({
      project_name,
      project_id: project_id || null,
      current_revision: revNo,
      released_on: relDate,
      uploaded_by
    }, { transaction: t });

    const revision = await BomRevision.create({
      bom_project_id: project.id,
      revision_no: revNo,
      change_description: 'Initial BOM Creation',
      revised_on: relDate,
      revised_by: uploaded_by,
      status: 'Pending',
      is_approved: false
    }, { transaction: t });

    // Link items to the initial revision — deduplicate by item_id
    if (items && items.length > 0) {
      const bomItemMap = new Map();
      for (const item of items) {
        if (!item.item_id) continue;
        if (!bomItemMap.has(item.item_id)) {
          bomItemMap.set(item.item_id, {
            bom_project_id: project.id,
            bom_revision_id: revision.id,
            item_id: item.item_id,
            quantity: item.quantity,
            assembly: item.assembly || null,
            rate: item.rate || 0,
            price: item.price || 0,
            actual_qty: item.actual_qty || 0,
            vendor_name: item.vendor_name || null,
            remarks: item.remarks || null
          });
        }
      }
      await BomItem.bulkCreate(Array.from(bomItemMap.values()), { transaction: t });
    }

    await t.commit();
    res.status(201).json(project);

    // Notify R&D Head
    await notifyUsers(
      { department: 'R&D', designation: 'R&D Head' },
      `New BOM project "${project_name}" has been uploaded by ${uploaded_by || 'a user'}.`,
      'BOM_UPLOAD',
      `/admin/bom/${project.id}`
    );

    // Notify Quality Team
    await notifyUsers(
      { department: 'Quality' },
      `New BOM project "${project_name}" has been uploaded by ${uploaded_by || 'a user'}.`,
      'BOM_UPLOAD',
      `/admin/bom/${project.id}`
    );
  } catch (err) {
    if (t) await t.rollback();
    res.status(400).json({ message: err.message });
  }
});

// Update BOM Items and Save a New Revision snapshot
router.put('/:id', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const projectId = req.params.id;
    const { items, change_description, revised_by, approved_by, is_draft } = req.body;

    const project = await BomProject.findByPk(projectId, { transaction: t });
    if (!project) {
        await t.rollback();
        return res.status(404).json({ message: 'BOM Project not found' });
    }

    // Safely find the LATEST overall revision for this project
    const latestRev = await BomRevision.findOne({
      where: { bom_project_id: projectId },
      order: [['created_at', 'DESC']],
      transaction: t
    });

    let revision_id;

    // RULE: If there are NO revisions yet, OR the latest one is already APPROVED
    // then any subsequent update MUST create a NEW revision row.
    // In LATE-VERSIONING mode, the next number is NOT yet assigned; 
    // it stays at the current version string until Approve.
    if (!latestRev || latestRev.status === 'Approved') {
      const nextRevStr = project.current_revision; // Use same base number for the pending update

      const newRev = await BomRevision.create({
        bom_project_id: projectId,
        revision_no: nextRevStr,
        change_description: is_draft ? 'Drafting New Revision' : (change_description || 'Update to current version'),
        revised_on: new Date(),
        revised_by: revised_by,
        status: 'Pending'
      }, { transaction: t });

      revision_id = newRev.id;
    } else {
      // Latest revision is still PENDING: Update/Overwrite this pending record
      revision_id = latestRev.id;
      
      await latestRev.update({
        change_description: is_draft ? latestRev.change_description : (change_description || latestRev.change_description),
        revised_on: new Date(),
        revised_by: revised_by || latestRev.revised_by
      }, { transaction: t });

      // Clear old items for this pending revision record ONLY
      await BomItem.destroy({ 
        where: { bom_revision_id: revision_id }, 
        transaction: t 
      });
    }

    // Update project released_on date but NEVER the current_revision string here
    await project.update({
      released_on: new Date()
    }, { transaction: t });

    // Insert new item snapshot for the determined revision_id — deduplicate by item_id
    if (items && items.length > 0) {
      const snapshotMap = new Map();
      for (const item of items) {
        if (!item.item_id) continue;
        if (!snapshotMap.has(item.item_id)) {
          snapshotMap.set(item.item_id, {
            bom_project_id: projectId,
            bom_revision_id: revision_id,
            item_id: item.item_id,
            quantity: item.quantity,
            assembly: item.assembly || null,
            rate: item.rate || 0,
            price: item.price || 0,
            actual_qty: item.actual_qty || 0,
            vendor_name: item.vendor_name || null,
            remarks: item.remarks || null
          });
        }
      }
      await BomItem.bulkCreate(Array.from(snapshotMap.values()), { transaction: t });
    }

    await t.commit();
    res.json({ 
      message: is_draft ? 'Draft updated successfully' : 'New revision released successfully (Pending Approval)', 
      current_revision: project.current_revision, 
      latest_revision: latestRev ? latestRev.revision_no : project.current_revision 
    });

    if (!is_draft) {
      // Notify R&D Head
      await notifyUsers(
        { department: 'R&D', designation: 'R&D Head' },
        `New revision for BOM project "${project.project_name}" has been uploaded by ${revised_by || 'a user'}.`,
        'BOM_UPLOAD',
        `/admin/bom/${project.id}`
      );

      // Notify Quality Team
      await notifyUsers(
        { department: 'Quality' },
        `New revision for BOM project "${project.project_name}" has been uploaded by ${revised_by || 'a user'}.`,
        'BOM_UPLOAD',
        `/admin/bom/${project.id}`
      );
    }

  } catch (err) {
    if (t) await t.rollback();
    res.status(500).json({ message: err.message });
  }
});

// Delete a BOM Project
router.delete('/:id', async (req, res) => {
  try {
    const project = await BomProject.findByPk(req.params.id);
    if (!project) return res.status(404).json({ message: 'BOM Project not found' });
    await project.destroy(); // Will cascade delete items and revisions based on models/index.js rules
    res.json({ message: 'BOM Project deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Parse Excel File and Validate against Item Master
router.post('/parse-excel', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  try {
    const workbook = xlsx.readFile(req.file.path);
    const allData = [];

    console.log(`Excel Upload: Processing ${workbook.SheetNames.length} sheets:`, workbook.SheetNames);

    // Loop through ALL sheets in the workbook
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const sheetRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      const [headerRow = [], ...dataRows] = sheetRows;
      const normalizedHeaders = headerRow.map((header) => String(header).trim().toLowerCase());

      console.log(`Sheet "${sheetName}": Found ${dataRows.length} potential rows.`);

      dataRows.forEach((values, rowIndex) => {
        const hasData = Array.isArray(values) && values.some((value) => String(value).trim() !== '');
        if (!hasData) return;

        const normalizedRow = {};
        normalizedHeaders.forEach((header, colIndex) => {
          normalizedRow[header] = values[colIndex];
        });

        normalizedRow['sheetcategory'] = sheetName;
        normalizedRow['__sheet_name'] = sheetName;
        normalizedRow['__row_number'] = rowIndex + 2;
        allData.push(normalizedRow);
      });
    });

    console.log(`Total rows extracted across all sheets: ${allData.length}`);

    if (allData.length === 0) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Excel file is empty across all sheets' });
    }

    // Capture unique item codes for batch lookup
    const codesInExcel = [...new Set(allData.map(row => 
      String(row['item code'] || row['item_code'] || row['itemcode'] || '').trim()
    ).filter(c => c !== ''))];
    console.log(`Unique items identified for lookup: ${codesInExcel.length}`);

    // Find all matching items in Item Master
    const masterItems = await Item.findAll(); // Small-scale lookup for reliability
    
    // Create a robust map with normalized keys (trimmed and lowercase)
    const masterMap = new Map();
    masterItems.forEach(i => {
      const normalizedCode = String(i.item_code || '').trim().toLowerCase();
      if (normalizedCode) masterMap.set(normalizedCode, i);
    });

    const validItems = [];
    const missingItems = [];

    // Process each row
    allData.forEach((row, index) => {
      // Normalize Excel input code
      const rawCode = String(row['item code'] || row['item_code'] || row['itemcode'] || '').trim();
      const code = rawCode.toLowerCase();
      
      const qty = parseFloat(row['quantity'] || row['qty'] || row['qty '] || 1);
      
      if (!rawCode) return; // Skip empty codes

      const master = masterMap.get(code);

      const assembly =
        row['assembly'] ||
        row['sub assembly level 2'] ||
        row['sub assembly level 1'] ||
        row['category'] ||
        row['sheetcategory'] ||
        '';

      if (master) {
        // Merge item with master details
        validItems.push({
          item_id: master.id,
          item_code: master.item_code, // Maintain original database casing
          item_name: master.item_name,
          description: master.description,
          uom: master.uom,
          material: master.material,
          quantity: qty,
          assembly
        });
      } else {
        missingItems.push({
          row: row['__row_number'] || index + 2,
          sheet: row['__sheet_name'] || row['sheetcategory'] || 'Unknown Sheet',
          code: rawCode
        });
      }
    });

    console.log(`BOM Capture: ${validItems.length} matched, ${missingItems.length} missing.`);

    // Clean up file
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    res.json({
      validItems,
      missingItems,
      summary: {
        total: allData.length,
        valid: validItems.length,
        missing: missingItems.length
      }
    });

  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: 'Error processing Excel: ' + err.message });
  }
});

// Approve a specific BOM Revision
router.patch('/revisions/:id/approve', async (req, res) => {
  try {
    const { is_approved, approved_by, status } = req.body;
    const revision = await BomRevision.findByPk(req.params.id);
    if (!revision) return res.status(404).json({ message: 'Revision not found' });

    // Determine target status
    let finalStatus = status || (is_approved ? 'Approved' : 'Pending');

    // Approved revisions are final. Do not allow them to be reverted from history.
    if (revision.status === 'Approved' && !is_approved) {
      return res.status(400).json({ message: 'Approved revisions cannot be unchecked.' });
    }

    // IF APPROVED: Assign the NEXT version number only once and update project
    if (finalStatus === 'Approved') {
      const project = await BomProject.findByPk(revision.bom_project_id);
      if (!project) return res.status(404).json({ message: 'Parent project not found' });

      const alreadyApproved = revision.status === 'Approved' && revision.is_approved;
      let approvedRevisionNo = revision.revision_no;

      if (!alreadyApproved) {
        const previousRevision = await BomRevision.findOne({
          where: {
            bom_project_id: revision.bom_project_id,
            created_at: { [Op.lt]: revision.created_at }
          },
          order: [['created_at', 'DESC']]
        });

        // Keep the initial BOM approval at its starting revision (typically 00).
        if (!previousRevision) {
          approvedRevisionNo = revision.revision_no || project.current_revision;
        } else {
          // Subsequent approvals advance the official revision number.
          const currentRevInt = parseInt(project.current_revision, 10);
          approvedRevisionNo = formatRevision(currentRevInt + 1);
        }
      }

      await revision.update({
        revision_no: approvedRevisionNo,
        is_approved: true,
        approved_by: approved_by,
        status: 'Approved'
      });

      if (!alreadyApproved) {
        await project.update({
          current_revision: approvedRevisionNo,
          released_on: revision.revised_on
        });
      }
    } else {
      // For Rejection or other status changes
      await revision.update({
        is_approved: false,
        status: finalStatus
      });
    }

    res.json({ message: `Revision marked as ${finalStatus}`, revision });

    // If approved, notify teams
    if (finalStatus === 'Approved') {
      const project = await BomProject.findByPk(revision.bom_project_id);
      const uploaderEmail = project.uploaded_by; // Assuming this is email or we need to find user
      
      const teamMessage = `BOM for project "${project.project_name}" (Revision ${revision.revision_no}) has been approved by R&D Head and is ready for further action.`;
      
      // Notify Store Team
      await notifyUsers({ department: 'Store' }, teamMessage, 'BOM_APPROVAL', `/admin/bom/${project.id}`);
      // Notify Purchase Team
      await notifyUsers({ department: 'Purchase' }, teamMessage, 'BOM_APPROVAL', `/admin/bom/${project.id}`);
      // Notify Production Team
      await notifyUsers({ department: 'Production' }, teamMessage, 'BOM_APPROVAL', `/admin/bom/${project.id}`);
      // Notify QC Team
      await notifyUsers({ department: 'Quality' }, teamMessage, 'BOM_APPROVAL', `/admin/bom/${project.id}`);
      
      // Notify Uploader
      if (uploaderEmail) {
        const uploaderUser = await User.findOne({ where: { [Op.or]: [{ email: uploaderEmail }, { name: uploaderEmail }] } });
        if (uploaderUser) {
          await Notification.create({
            user_id: uploaderUser.id,
            message: `Your BOM for project "${project.project_name}" has been approved.`,
            type: 'BOM_APPROVAL',
            link: `/admin/bom/${project.id}`
          });
        }
      }
    } else if (finalStatus === 'Rejected') {
      const project = await BomProject.findByPk(revision.bom_project_id);
      const uploaderEmail = project.uploaded_by; 
      
      if (uploaderEmail) {
        const uploaderUser = await User.findOne({ where: { [Op.or]: [{ email: uploaderEmail }, { name: uploaderEmail }] } });
        if (uploaderUser) {
          await Notification.create({
            user_id: uploaderUser.id,
            message: `Your BOM update for project "${project.project_name}" has been rejected.`,
            type: 'BOM_REJECTION',
            link: `/admin/bom/${project.id}`
          });
        }
      }
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get items for a specific REVISION (Snapshot)
router.get('/revisions/:id/items', async (req, res) => {
  try {
    const items = await BomItem.findAll({
      where: { bom_revision_id: req.params.id },
      include: [{ model: Item }]
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Compare a revision with its predecessor (Diff)
router.get('/revisions/:id/diff', async (req, res) => {
  try {
    const currentRev = await BomRevision.findByPk(req.params.id);
    if (!currentRev) return res.status(404).json({ message: 'Revision not found' });

    // Find previous revision for this project
    const prevRev = await BomRevision.findOne({
      where: { 
        bom_project_id: currentRev.bom_project_id, 
        created_at: { [Op.lt]: currentRev.created_at } 
      },
      order: [['created_at', 'DESC']]
    });

    const currentItems = await BomItem.findAll({ 
      where: { bom_revision_id: currentRev.id },
      include: [{ model: Item }]
    });

    const prevItems = prevRev ? await BomItem.findAll({ 
        where: { bom_revision_id: prevRev.id },
        include: [{ model: Item }]
    }) : [];

    // Calculate Diff
    const prevMap = new Map(prevItems.map(i => [i.item_id, i]));
    const currentMap = new Map(currentItems.map(i => [i.item_id, i]));

    const added = currentItems.filter(i => !prevMap.has(i.item_id));
    const removed = prevItems.filter(i => !currentMap.has(i.item_id));
    const changed = currentItems.filter(i => {
      const prev = prevMap.get(i.item_id);
      return prev && (prev.quantity !== i.quantity || prev.assembly !== i.assembly);
    }).map(i => ({
        ...i.toJSON(),
        prev_quantity: prevMap.get(i.item_id).quantity,
        prev_assembly: prevMap.get(i.item_id).assembly
    }));

    res.json({
      addedItems: added,
      removedItems: removed,
      modifiedItems: changed,
      summary: {
          added: added.length,
          removed: removed.length,
          changed: changed.length
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
module.exports = router;
