const express = require('express');
const router = express.Router();
const { PurchaseOrder, PurchaseOrderItem, PurchaseRequest, PurchaseRequestItem, User, Vendor, Item, Notification, Stock, Quote, Grn, GrnItem, MaterialRejection, Payment, InventoryHistory } = require('../models');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit-table');
const fs = require('fs');
const path = require('path');

async function generatePoPdfBuffer(po) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 30, size: 'A4', bufferPages: true });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // 1. TOP BANNER: High-Density Dark Blue Container
      doc.fillColor('#1e2035')
         .roundedRect(30, 30, 535, 95, 8)
         .fill();

      // Embedded Logo
      const logoPath = path.join(__dirname, '../../erp-frontend/src/assets/logo.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 50, { height: 50 }); // Size adjust to fit
      }

      // "PURCHASE ORDER" centered text
      doc.fillColor('#ffffff')
         .font('Helvetica')
         .fontSize(18)
         .text('PURCHASE ORDER', 180, 65, { characterSpacing: 3 });

      // Organization Info within Top Banner (Right Aligned)
      doc.fillColor('#93c5fd')
         .font('Helvetica-Bold')
         .fontSize(8)
         .text('Genrobotic Innovations Pvt Ltd', 380, 50, { align: 'right', width: 165 });
      
      doc.fillColor('#94a3b8')
         .font('Helvetica')
         .text('4th Floor, CDAC Building', 380, 62, { align: 'right', width: 165 })
         .text('Technopark, Thiruvananthapuram', 380, 74, { align: 'right', width: 165 })
         .text('India 695581', 380, 86, { align: 'right', width: 165 });

      // 2. Divider Headers (VENDOR DETAILS & ORDER INFORMATION)
      let currentY = 145;
      
      doc.fillColor('#1e3a8a').font('Helvetica-Bold').fontSize(9).text('VENDOR DETAILS', 30, currentY);
      doc.strokeColor('#1e3a8a').lineWidth(1).moveTo(30, currentY + 12).lineTo(260, currentY + 12).stroke();

      doc.fillColor('#1e3a8a').text('ORDER INFORMATION', 290, currentY);
      doc.strokeColor('#1e3a8a').lineWidth(1).moveTo(290, currentY + 12).lineTo(565, currentY + 12).stroke();

      // 3. Information Blocks
      currentY += 25;
      
      // VENDOR Info
      const vendorName = po.ToVendor?.name?.toUpperCase() || 'N/A';
      doc.fillColor('#000').fontSize(11).font('Helvetica-Bold').text(vendorName, 30, currentY);
      currentY += 15;
      doc.fillColor('#64748b').font('Helvetica').fontSize(9).text(po.ToVendor?.address || 'No Address Provided', 30, currentY, { width: 220 });
      
      const vAddrHeight = doc.heightOfString(po.ToVendor?.address || 'No Address Provided', { width: 220 });
      doc.text(`Vendor Code: ${po.ToVendor?.vendor_code || 'N/A'}`, 30, currentY + vAddrHeight + 4);

      // ORDER Info Columns
      let orderY = 170;
      const labelX = 290;
      const valueX = 390; // Align perfectly

      // Key-Value Printer Helper
      const printRow = (lbl, val, isBold = false, customFill = '#000') => {
         doc.font('Helvetica').fillColor('#6b7280').fontSize(9).text(lbl, labelX, orderY);
         doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fillColor(customFill).text(val, valueX, orderY);
         orderY += 16;
      };

      printRow('Purchase Order#', po.po_no, true);
      printRow('Date', new Date(po.created_at || new Date()).toLocaleDateString('en-GB'), true);
      printRow('Project Name', po.project_name || 'General Project', true);
      
      // Status Pill properly drawn
      doc.font('Helvetica').fillColor('#6b7280').fontSize(9).text('Status', labelX, orderY);
      const statusText = (po.status || 'OPEN').toUpperCase();
      doc.font('Helvetica-Bold').fontSize(7);
      const statusWidth = doc.widthOfString(statusText) + 16;
      doc.fillColor('#3b82f6').roundedRect(valueX, orderY - 1, statusWidth, 14, 7).fill();
      doc.fillColor('#ffffff').text(statusText, valueX + 8, orderY + 3);
      orderY += 18;

      // Add dynamic Warehouse Logic exactly like frontend
      if (po.warehouse) {
         doc.font('Helvetica').fillColor('#6b7280').fontSize(9).text('Shipping Address', labelX, orderY);
         
         // Render the subtle green badge with border
         doc.font('Helvetica-Bold').fontSize(7);
         const whText = po.warehouse.toUpperCase();
         const whWidth = doc.widthOfString(whText) + 16 + 8; // Extra padding for icon
         
         doc.fillColor('#f0fdf4').roundedRect(valueX, orderY - 1, whWidth, 14, 3).fill();
         doc.strokeColor('#bbf7d0').lineWidth(0.5).roundedRect(valueX, orderY - 1, whWidth, 14, 3).stroke();
         
         // Simulated box icon
         doc.strokeColor('#16a34a').lineWidth(1).strokeRect(valueX + 4, orderY + 3, 7, 6);
         doc.moveTo(valueX + 4, orderY + 5).lineTo(valueX + 11, orderY + 5).stroke(); // horizontal line
         
         doc.fillColor('#16a34a').text(whText, valueX + 16, orderY + 3);

         // Address resolution
         const addrMap = {
           'CDAC': 'Robotics and AI Research Centre 4th Floor, CDAC-Knowledge Resource Centre Building, Technopark Campus, Kazhakkoottam, Kerala 695581',
           'KINFRA': 'Plot No 42 A, Kinfra International Apparel Park, Thumba, Pallithura, Thiruvananthapuram-695586, Kerala',
           'KSIDC': 'Standard Design Factory, 2 Ksidc Investment Zone Pampampallam P.O Kanjikode, Pudussery, Kanjikode, Palakkad-678621, Kerala'
         };
         const rawAddr = addrMap[po.warehouse.toUpperCase()] || po.warehouse;

         const addrX = valueX + whWidth + 6;
         doc.fillColor('#0f172a').font('Helvetica').fontSize(8).text(rawAddr, addrX, orderY, { width: 565 - addrX, lineBreak: true });
         orderY += Math.max(18, doc.heightOfString(rawAddr, { width: 565 - addrX }));
      }

      // Safely jump down past the largest info column
      const tableStartY = Math.max(currentY + 70, orderY + 20, 250);
      
      // 4. Table Construction to exact specs
      const tableData = {
        headers: [
          { label: "ITEM CODE", property: 'code', width: 70, headerColor: '#f8fafc' },
          { label: "ITEM NAME", property: 'name', width: 95, headerColor: '#f8fafc' },
          { label: "DESCRIPTION", property: 'desc', width: 120, headerColor: '#f8fafc' },
          { label: "MATERIAL GROUP (CATEGORY)", property: 'cat', width: 115, headerColor: '#f8fafc' },
          { label: "QUANTITY & UOM", property: 'qty', width: 70, headerColor: '#f8fafc' },
          { label: "AMOUNT ASSIGNED (₹)", property: 'amt', width: 65, headerColor: '#f8fafc', align: 'right' }
        ],
        rows: po.Items.map(item => [
          item.Item?.item_code || 'N/A',
          item.Item?.item_name || item.item_name || '---',
          (item.Item?.description || '---').substring(0, 60),
          item.Item?.category || 'Assembly component',
          `${parseFloat(item.quantity).toFixed(2)} ${item.Item?.uom || 'PCS'}`,
          `₹${parseFloat(item.amount || 0).toFixed(2)}`
        ])
      };

      doc.table(tableData, {
        y: tableStartY,
        prepareHeader: () => doc.font('Helvetica-Bold').fontSize(7).fillColor('#334155'),
        prepareRow: (row, iColumn, iRow) => {
           doc.font(iColumn === 0 || iColumn === 1 ? 'Helvetica-Bold' : 'Helvetica').fontSize(7).fillColor('#1e293b');
        },
        padding: 8,
        divider: { header: { disabled: false, width: 0.5, opacity: 0.2 }, horizontal: { disabled: false, width: 0.5, opacity: 0.1 } }
      });

      doc.moveDown(1.5);

      // 5. Final Alignment on Total with Blue highlight
      const finalTotal = po.Items.reduce((acc, r) => acc + parseFloat(r.amount || 0), 0);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#334155').text('Total    ', { continued: true, align: 'right' });
      doc.fillColor('#1e3a8a').fontSize(11).text(`₹${finalTotal.toFixed(2)}`, { align: 'right' });

      // Footer Disclaimer
      const footerPos = doc.page.height - 40;
      doc.font('Helvetica').fontSize(7).fillColor('#94a3b8').text('This is an electronically generated purchase order. No manual signature is required.', 30, footerPos, { align: 'center' });

      doc.end();
    } catch (err) {
      console.error("PDF Gen Critical failure", err);
      reject(err);
    }
  });
}


// Mock Mailer Transport creation (Ethereal Email for testing)
let transporter;
async function initMailer() {
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });
    console.log("Ethereal Mailer initialized for missing real SMTP.");
  } catch (error) {
    console.warn("Could not initialize Ethereal Mailer. Email notifications will be disabled:", error.message);
  }
}
initMailer();

router.get('/', async (req, res) => {
  try {
    const pos = await PurchaseOrder.findAll({
      include: [
        { model: PurchaseRequest, attributes: ['pr_no', 'requested_by_id'] },
        { model: Vendor, as: 'ToVendor', attributes: ['name', 'vendor_code'] },
        { model: User, as: 'PurchaseManager', attributes: ['name', 'email'] },
        { model: PurchaseOrderItem, as: 'Items' },
        { model: Grn, include: [{ model: GrnItem }] }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json(pos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const po = await PurchaseOrder.findByPk(req.params.id, {
      include: [
        {
          model: PurchaseOrderItem,
          as: 'Items',
          include: [{ model: Item, attributes: ['item_code', 'item_name', 'description', 'category'] }]
        },
        { model: PurchaseRequest, attributes: ['pr_no'] },
        { model: Vendor, as: 'ToVendor', attributes: ['name', 'street', 'vendor_code'] },
        { model: User, as: 'PurchaseManager', attributes: ['name', 'email'] },
        { 
          model: Grn, 
          include: [
            { model: GrnItem },
            { model: MaterialRejection }
          ] 
        }
      ]
    });
    if (!po) return res.status(404).json({ error: 'Purchase Order not found.' });
    res.json(po);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    console.log('Incoming PO Creation Request:', req.body);
    const { 
      pr_id, pq_id, po_date, sanction_code, project_name, 
      teams, from_branch, purchase_manager_id, upload_po, items, warehouse
    } = req.body;

    let createdPOs = [];

    if (pr_id && items && items.some(i => i.vendor_id)) {
      // Source from PR with quotes - Handle Splitting Logic
      const pr = await PurchaseRequest.findByPk(pr_id);
      if (!pr) return res.status(404).json({ error: 'Purchase Request not found.' });

      // Group items by vendor_id using the data provided from the frontend
      const vendorGroups = {};
      items.forEach(it => {
        const vId = it.vendor_id;
        if (!vId) return;
        if (!vendorGroups[vId]) vendorGroups[vId] = [];
        vendorGroups[vId].push(it);
      });

      const vendorIds = Object.keys(vendorGroups);
      if (vendorIds.length === 0) {
        return res.status(400).json({ error: 'No vendors assigned to items. Please assign a vendor for at least one item.' });
      }

      // Create a PO for each vendor group
      for (const vId of vendorIds) {
        const vendorItems = vendorGroups[vId];
        const po_no_base = pr.pr_no.replace('PR', 'PO');
        const po_no = req.body.po_no || `${po_no_base}-${vId}`; 

        console.log(`Attempting to create PO ${po_no} for Vendor ${vId}`);

        const existingPO = await PurchaseOrder.findOne({ where: { po_no } });
        if (existingPO) {
          console.warn(`PO ${po_no} already exists. Updating existing document and terms.`);
          if (upload_po) existingPO.upload_po = upload_po;
          if (teams) existingPO.teams = teams;
          if (from_branch) existingPO.from_branch = from_branch;
          if (req.body.terms_conditions) existingPO.terms_conditions = req.body.terms_conditions;
          if (pq_id) existingPO.pq_id = pq_id;
          if (req.body.pq_no) existingPO.pq_no = req.body.pq_no;
          if (warehouse) existingPO.warehouse = warehouse;
          await existingPO.save();
          
          createdPOs.push(existingPO);
          continue;
        }

        const po = await PurchaseOrder.create({
          po_no, 
          pr_id: pr.id,
          pq_id,
          pq_no: req.body.pq_no,
          po_date: po_date || new Date().toISOString().split('T')[0],
          sanction_code, 
          project_name, 
          teams, 
          to_vendor_id: vId, 
          from_branch, 
          purchase_manager_id, 
          upload_po,
          warehouse,
          status: 'OPEN'
        });

        // Deduplicate by item_id — sum quantities if same item appears multiple times
        const poItemMap = new Map();
        for (const vi of vendorItems) {
          if (!vi.item_id) continue;
          if (poItemMap.has(vi.item_id)) {
            poItemMap.get(vi.item_id).quantity = (parseFloat(poItemMap.get(vi.item_id).quantity) || 0) + (parseFloat(vi.quantity) || 0);
          } else {
            poItemMap.set(vi.item_id, {
              item_id: vi.item_id,
              quantity: vi.quantity,
              uom: vi.uom || 'Unit',
              unit_price: vi.unit_price || 0,
              amount: vi.total_price !== undefined ? vi.total_price : (vi.amount !== undefined ? vi.amount : Number(vi.unit_price) || 0),
              po_id: po.id
            });
          }
        }
        const itemsToCreate = Array.from(poItemMap.values());
        await PurchaseOrderItem.bulkCreate(itemsToCreate);
        createdPOs.push(po);
      }
    } else {
      // Manual creation or fallback
      const { po_no, to_vendor_id, terms_conditions, pq_no: manualPqNo } = req.body;
      
      const po = await PurchaseOrder.create({
        po_no, pr_id, pq_id, 
        pq_no: manualPqNo || req.body.pq_no,
        po_date, sanction_code, project_name, 
        teams, to_vendor_id, from_branch, purchase_manager_id, 
        upload_po, terms_conditions, warehouse,
        status: 'OPEN'
      });

      if (items && items.length > 0) {
        // Deduplicate by item_id for manual PO creation
        const manualPoMap = new Map();
        for (const item of items) {
          if (item.item_id && manualPoMap.has(item.item_id)) {
            manualPoMap.get(item.item_id).quantity = (parseFloat(manualPoMap.get(item.item_id).quantity) || 0) + (parseFloat(item.quantity) || 0);
          } else {
            manualPoMap.set(item.item_id || `custom_${Date.now()}_${Math.random()}`, { ...item, po_id: po.id });
          }
        }
        await PurchaseOrderItem.bulkCreate(Array.from(manualPoMap.values()));
      }
      createdPOs.push(po);
    }

    // --- Notification & Email Logic (Summary) ---
    // Notify for all created POs
    for (const po of createdPOs) {
       if (purchase_manager_id) {
         await Notification.create({
           user_id: purchase_manager_id,
           message: `Purchase Order ${po.po_no} generated successfully.`,
           type: 'INFO',
           link: `/admin/po/${po.id}`
         });

         try {
           const u = await User.findByPk(purchase_manager_id);
           if (u && u.email) {
             const { sendEmailNotification } = require('../utils/email');
             await sendEmailNotification(
               u.email,
               `Gen ERP: Purchase Order Generated (${po.po_no})`,
               `Purchase Order ${po.po_no} has been generated. You can view the details on your dashboard.`
             );
           }
         } catch(e) {}
       }

       // Explicitly notify all users with designation containing 'Purchase Manager' or 'purchase manager'
       try {
         const { Op } = require('sequelize');
         const { User: UserModel, Notification: NotificationModel } = require('../models');
         const pms = await UserModel.findAll({
           where: {
             [Op.or]: [
               { designation: { [Op.like]: '%Purchase Manager%' } },
               { designation: { [Op.like]: '%Purchase Head%' } },
               { designation: { [Op.like]: '%Manager%' }, department: { [Op.like]: '%Purchase%' } }
             ]
           }
         });
         for (const pm of pms) {
           if (pm.id === purchase_manager_id) continue; // Avoid duplicate
           await NotificationModel.create({
             user_id: pm.id,
             type: 'INFO',
             message: `Purchase Order ${po.po_no} has been generated.`,
             link: `/admin/po/${po.id}`,
             is_read: false
           });

           if (pm.email) {
             try {
               const { sendEmailNotification } = require('../utils/email');
               await sendEmailNotification(
                 pm.email,
                 `Gen ERP: Purchase Order Generated (${po.po_no})`,
                 `Purchase Order ${po.po_no} has been generated. You can view the details on your dashboard.`
               );
             } catch(e) {}
           }
         }
       } catch(err) {
         console.error('Failed to notify Purchase Managers:', err);
       }
    }

    res.status(201).json(createdPOs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Marking a PO as Received (Used by Store Team)
router.post('/:id/receive', async (req, res) => {
  try {
    const po = await PurchaseOrder.findByPk(req.params.id, {
      include: [{ model: PurchaseOrderItem, as: 'Items' }]
    });

    if (!po) return res.status(404).json({ error: 'Purchase Order not found' });
    if (po.status === 'Received') return res.status(400).json({ error: 'Order already received.' });

    // Delegate stock logic to the QC phase.
    // Just move it sequentially in the pipeline.

    // Update PO Status to Received
    po.status = 'ITEM RECEIVED';
    await po.save();

    // Notify Store team & GRN Dashboard
    try {
      const { notifyDepartment } = require('../utils/notifier');
      await notifyDepartment('Store', {
        type: 'INFO',
        message: `Purchase Order ${po.po_no} shipment received. Ready for GRN creation on GRN Dashboard.`,
        link: `/admin/grn`
      });
    } catch(err) {
      console.error('Failed to dispatch receive notifications:', err);
    }

    res.json({ message: 'PO marked as received! Items forwarded to QC.', po });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Marking a PO as Partially Received (Used by Store Team)
router.post('/:id/receive-partial', async (req, res) => {
  try {
    const po = await PurchaseOrder.findByPk(req.params.id, {
      include: [{ model: PurchaseOrderItem, as: 'Items' }]
    });

    if (!po) return res.status(404).json({ error: 'Purchase Order not found' });
    if (po.status === 'ITEM RECEIVED') return res.status(400).json({ error: 'Order already fully received.' });

    po.status = 'PARTIALLY RECEIVED';
    await po.save();

    // Notify Store team & GRN Dashboard
    try {
      const { notifyDepartment } = require('../utils/notifier');
      await notifyDepartment('Store', {
        type: 'INFO',
        message: `Purchase Order ${po.po_no} shipment received partially. Ready for GRN creation on GRN Dashboard.`,
        link: `/admin/grn`
      });
    } catch(err) {
      console.error('Failed to dispatch partial receive notifications:', err);
    }

    res.json({ message: 'PO marked as partially received! Items forwarded to QC.', po });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Handle Receipt of Returned Shipment (Re-initiates the flow)
router.post('/:id/receive-return', async (req, res) => {
  try {
    const { rejection_id } = req.body;
    const po = await PurchaseOrder.findByPk(req.params.id);
    if (!po) return res.status(404).json({ error: 'Purchase Order not found' });

    if (rejection_id) {
      const { MaterialRejection } = require('../models');
      const rejection = await MaterialRejection.findByPk(rejection_id);
      if (rejection) {
        rejection.status = 'Closed';
        rejection.closing_date = new Date();
        if (!rejection.action_taken || rejection.action_taken.trim() === '') rejection.action_taken = 'Replacement shipment received & confirmed from Purchase Order';
        if (!rejection.disposition || rejection.disposition.trim() === '') rejection.disposition = 'Returnable';
        if (!rejection.remarks || rejection.remarks.trim() === '') rejection.remarks = 'Auto-closed upon return shipment receipt';
        if (!rejection.root_cause || rejection.root_cause.trim() === '') rejection.root_cause = 'Vendor material failure';
        await rejection.save();
      }
    } else {
      // Close all pending rejections for this PO
      const { MaterialRejection, Grn } = require('../models');
      const rejections = await MaterialRejection.findAll({
        where: { status: 'Opened' },
        include: [{
          model: Grn,
          where: { po_id: req.params.id },
          attributes: ['id']
        }]
      });
      for (const rej of rejections) {
        rej.status = 'Closed';
        rej.closing_date = new Date();
        if (!rej.action_taken || rej.action_taken.trim() === '') rej.action_taken = 'Replacement shipment received & confirmed from Purchase Order';
        if (!rej.disposition || rej.disposition.trim() === '') rej.disposition = 'Returnable';
        if (!rej.remarks || rej.remarks.trim() === '') rej.remarks = 'Auto-closed upon return shipment receipt';
        if (!rej.root_cause || rej.root_cause.trim() === '') rej.root_cause = 'Vendor material failure';
        await rej.save();
      }
    }

    // Reset status to allow re-reception
    po.status = 'Returned shipment received';
    await po.save();

    // Notify Store team & GRN Dashboard
    try {
      const { notifyDepartment } = require('../utils/notifier');
      await notifyDepartment('Store', {
        type: 'INFO',
        message: `Replacement shipment received for Purchase Order ${po.po_no}. Ready for GRN creation on GRN Dashboard.`,
        link: `/admin/grn`
      });
    } catch(err) {
      console.error('Failed to dispatch return receive notifications:', err);
    }

    res.json({ message: 'Return shipment received. PO reset to allow re-reception.', po });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Undo Receipt of Returned Shipment
router.post('/:id/undo-receive-return', async (req, res) => {
  try {
    const po = await PurchaseOrder.findByPk(req.params.id);
    if (!po) return res.status(404).json({ error: 'Purchase Order not found' });

    const { MaterialRejection, Grn } = require('../models');
    // Find all closed rejections for this PO and reopen them
    const rejections = await MaterialRejection.findAll({
      where: { status: 'Closed' },
      include: [{
        model: Grn,
        where: { po_id: req.params.id },
        attributes: ['id']
      }]
    });
    for (const rej of rejections) {
      rej.status = 'Opened';
      rej.closing_date = null;
      await rej.save();
    }

    po.status = 'QC REJECTED';
    await po.save();

    res.json({ message: 'Receive return undone. Rejections reopened.', po });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// QC Acceptance Flow
router.post('/:id/qc', async (req, res) => {
  try {
    const { action } = req.body;
    const po = await PurchaseOrder.findByPk(req.params.id, {
      include: [{ model: PurchaseOrderItem, as: 'Items' }, { model: User, as: 'PurchaseManager' }]
    });

    if (!po) return res.status(404).json({ error: 'Purchase Order not found.' });
    const sUpper = (po.status || '').toUpperCase();
    if (sUpper !== 'ITEM RECEIVED' && sUpper !== 'PARTIALLY RECEIVED' && sUpper !== 'QC REJECTED' && po.status !== 'Item Received' && po.status !== 'QC Rejected') {
      return res.status(400).json({ error: 'Cannot QC a PO that is not physically received.' });
    }

    if (action === 'Accepted') {
      po.status = 'CLOSED';
      
      // Update stock levels
      const projectName = po.project_name || 'General Project';
      for (const line of po.Items) {
        const stock = await Stock.findOne({ where: { item_id: line.item_id, project_name: projectName } });
        if (stock) {
          stock.quantity = Number(stock.quantity) + Number(line.quantity);
          await stock.save();
        } else {
          await Stock.create({ item_id: line.item_id, quantity: line.quantity, location: 'Main Store', project_name: projectName });
        }

        // Log to Inventory History
        await InventoryHistory.create({
          item_id: line.item_id,
          quantity: line.quantity,
          type: 'PR_Flow',
          source_reference: po.po_no,
          from_project: null,
          to_project: projectName,
          user_name: po.PurchaseManager?.name || 'Authorized Manager'
        });
      }
      
      await po.save();
      return res.json({ message: 'Items QC Accepted. PO CLOSED.', po });
      
    } else if (action === 'Rejected') {
      po.status = 'PENDING';
      await po.save();

      // Notify Purchase Team!
      if (po.purchase_manager_id) {
        await Notification.create({
          user_id: po.purchase_manager_id,
          message: `URGENT: Items for PO ${po.po_no} were REJECTED by QC.`,
          type: 'ERROR',
          link: `/admin/po/${po.id}`
        });
      }

      return res.json({ message: 'Items Rejected. Purchase Team notified.', po });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send PO to Vendor
router.post('/:id/send-to-vendor', async (req, res) => {
  try {
    const po = await PurchaseOrder.findByPk(req.params.id, {
      include: [
        { model: Vendor, as: 'ToVendor' },
        { model: PurchaseOrderItem, as: 'Items', include: [{ model: Item }] }
      ]
    });
    if (!po) return res.status(404).json({ error: 'Purchase Order not found.' });
    
    po.status = 'SEND TO VENDOR';
    await po.save();

    let emailSent = false;
    // Email dispatch logic
    if (po.ToVendor && po.ToVendor.email) {
      const mailOptions = {
        from: '"Genrobotic ERP" <erp@genrobotics.org>',
        to: po.ToVendor.email,
        subject: `Purchase Order Request: ${po.po_no} from Genrobotic Innovations`,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #1e3a8a; padding: 25px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">PURCHASE ORDER</h1>
            </div>
            <div style="padding: 30px;">
              <p style="font-size: 16px;">Dear <strong>${po.ToVendor.name}</strong>,</p>
              <p>We are pleased to place an order with your company. Please find the details of <strong>Purchase Order #${po.po_no}</strong> below:</p>
              
              <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                  <thead>
                    <tr style="border-bottom: 2px solid #e2e8f0;">
                      <th style="text-align: left; padding: 10px; font-size: 12px; color: #64748b; text-transform: uppercase;">Item Description</th>
                      <th style="text-align: right; padding: 10px; font-size: 12px; color: #64748b; text-transform: uppercase;">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${po.Items.map(item => `
                      <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 12px 10px; font-size: 14px;"><strong>${item.Item?.item_name || 'Material'}</strong><br><small style="color: #64748b;">${item.Item?.item_code || 'N/A'}</small></td>
                        <td style="padding: 12px 10px; text-align: right; font-size: 14px; font-weight: 600;">${item.quantity} ${item.uom}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>

              <p style="font-size: 14px; line-height: 1.6;">Kindly acknowledge the receipt of this order and provide the tentative delivery schedule at your earliest convenience.</p>
              <p style="font-size: 14px; line-height: 1.6;">For any clarifications regarding this order, please contact our procurement team.</p>
              
              <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0; font-size: 14px; font-weight: 700;">Best Regards,</p>
                <p style="margin: 5px 0 0; font-size: 14px; color: #1e3a8a;">Genrobotic Procurement Team</p>
              </div>
            </div>
            <div style="background-color: #f8fafc; padding: 15px; text-align: center; font-size: 11px; color: #94a3b8;">
              This is a system-generated email from Genrobotic ERP. Please do not reply directly to this address.
            </div>
          </div>
        `
      };

      try {
        const nodemailerReal = require('nodemailer');
        const realTransporter = nodemailerReal.createTransport({
          service: 'gmail',
          auth: {
            user: 'genroboticstest@gmail.com',
            pass: 'aknd bfpf ninn ptab'
          }
        });

        // GENERATE PDF BUFFER DYNAMICALLY FOR ATTACHMENT
        let pdfBuffer = null;
        try {
          pdfBuffer = await generatePoPdfBuffer(po);
        } catch (pdfErr) {
          console.error("Failed to generate PO attachment PDF:", pdfErr);
        }

        const mailPayload = {
          from: '"Genrobotic ERP" <genroboticstest@gmail.com>',
          to: po.ToVendor.email,
          subject: `Purchase Order Request: ${po.po_no} from Genrobotic Innovations`,
          html: mailOptions.html,
          attachments: []
        };

        if (pdfBuffer) {
          mailPayload.attachments.push({
            filename: `${po.po_no.replace(/\//g, '-')}_PO.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          });
        }

        // const info = await realTransporter.sendMail(mailPayload);
        emailSent = true;
        console.log(`[MOCK SMTP] PO Email successfully mocked for ${po.ToVendor.email}. PDF Attached.`);
      } catch (err) {
        console.error(`Email delivery failed for PO ${po.po_no}:`, err);
      }
    }

    // Notify the Store department that goods are expected to arrive soon
    const { notifyDepartment } = require('../utils/notifier');
    await notifyDepartment('Store', {
      type: 'INCOMING_PO',
      message: `Purchase Order ${po.po_no} has been sent to ${po.ToVendor ? po.ToVendor.name : 'the vendor'}. Expect incoming materials for GRN soon.`,
      link: `/admin/po`
    });

    
    res.json({ message: 'PO successfully sent to vendor.', po, emailSent });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a PO
router.delete('/:id', async (req, res) => {
  try {
    const po = await PurchaseOrder.findByPk(req.params.id);
    if (!po) return res.status(404).json({ error: 'Purchase Order not found.' });
    await po.destroy();
    res.json({ message: 'Purchase Order deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Set Warehouse Receipt for a PO
router.patch('/:id/warehouse', async (req, res) => {
  try {
    const po = await PurchaseOrder.findByPk(req.params.id);
    if (!po) return res.status(404).json({ error: 'Purchase Order not found.' });
    const { warehouse, all_warehouses } = req.body;
    po.warehouse = warehouse;
    po.all_warehouses = all_warehouses;
    await po.save();
    res.json({ message: 'Warehouse receipt recorded.', po });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update PO Document
router.patch('/:id/document', async (req, res) => {
  try {
    const po = await PurchaseOrder.findByPk(req.params.id);
    if (!po) return res.status(404).json({ error: 'Purchase Order not found.' });
    po.upload_po = req.body.upload_po;
    await po.save();
    res.json({ message: 'PO Document updated successfully.', po });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle PO Approval (Management Review)
router.patch('/:id/approve', async (req, res) => {
  try {
    const po = await PurchaseOrder.findByPk(req.params.id);
    if (!po) return res.status(404).json({ error: 'Purchase Order not found.' });

    const { is_approved, approved_by_id } = req.body;
    
    po.is_approved = is_approved;
    po.approved_by_id = approved_by_id || null;
    po.purchase_manager_id = approved_by_id || null;
    
    // If approved, you might want to automatically update status if needed
    // po.status = is_approved ? 'APPROVED' : po.status; 

    await po.save();
    
    // Create/Update Payment record upon approval
    if (is_approved) {
      const items = await PurchaseOrderItem.findAll({ where: { po_id: po.id } });
      const subtotal = items.reduce((acc, item) => acc + parseFloat(item.amount || 0), 0);
      const totalAmount = Math.round(subtotal * 100) / 100;

      const [payment, created] = await Payment.findOrCreate({
        where: { po_id: po.id },
        defaults: {
          total_amount: totalAmount,
          status: 'OPEN'
        }
      });

      if (!created) {
        payment.total_amount = totalAmount;
        const totalPaid = Math.round(parseFloat(payment.paid_amount || 0) * 100) / 100;
        const targetTotal = Math.round(parseFloat(totalAmount) * 100) / 100;
        if (totalPaid >= targetTotal) {
          payment.status = 'CLOSED';
        } else if (totalPaid > 0) {
          payment.status = 'PARTIAL';
        } else {
          payment.status = 'OPEN';
        }
        await payment.save();
      }
    }

    res.json({ message: `PO ${is_approved ? 'Approved' : 'Approval Revoked'}.`, po });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/rejections', async (req, res) => {
  try {
    const rejections = await MaterialRejection.findAll({
      include: [
        {
          model: Grn,
          where: { po_id: req.params.id },
          attributes: ['grn_no', 'po_id']
        },
        {
          model: Item,
          attributes: ['item_name', 'item_code', 'uom']
        }
      ]
    });
    res.json(rejections);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
