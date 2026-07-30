const { Grn, GrnItem, PurchaseOrder, Vendor, Project, Item, Notification, PurchaseOrderItem, User, PurchaseRequest, Payment, PaymentHistory, MaterialRejection, Stock } = require('../models');
const sequelize = require('../db');
const { notifyDepartment } = require('../utils/notifier');

exports.getAllGrns = async (req, res) => {
  try {
    const grns = await Grn.findAll({
      include: [
        { 
          model: PurchaseOrder, 
          include: [
            { model: Vendor, as: 'ToVendor', attributes: ['id', 'name'] },
            { 
              model: PurchaseRequest, 
              include: [{ model: Project, attributes: ['id', 'project_name', 'project_code'] }] 
            }
          ]
        },
        { 
          model: GrnItem, 
          include: [{ model: Item, attributes: ['id', 'item_code', 'item_name', 'description', 'uom'] }] 
        }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json(grns);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching GRNs' });
  }
};

exports.getGrnById = async (req, res) => {
  try {
    const grn = await Grn.findByPk(req.params.id, {
      include: [
        { 
          model: PurchaseOrder, 
          include: [
            { model: Vendor, as: 'ToVendor', attributes: ['id', 'name'] },
            { 
              model: PurchaseRequest, 
              include: [{ model: Project, attributes: ['id', 'project_name', 'project_code'] }] 
            }
          ]
        },
        { 
          model: GrnItem, 
          include: [{ model: Item, attributes: ['id', 'item_code', 'item_name', 'description'] }] 
        }
      ]
    });
    if (!grn) return res.status(404).json({ message: 'GRN not found' });
    res.json(grn);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching GRN' });
  }
};

exports.createGrn = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    let { grn_no, po_id, grn_date, warehouse, remarks, items } = req.body;
    
    // items: [{ item_id, ordered_qty, received_qty }]
    
    // 1. Create GRN
    const userId = req.user ? req.user.id : 1; // Default to 1 if no auth

    // Auto-generate sequential GRN if the frontend sent a placeholder
    if (!grn_no || grn_no === 'AUTO-GEN' || grn_no.startsWith('GRN-')) {
      const year = new Date().getFullYear();
      const Op = require('sequelize').Op;
      const searchPattern = `${year}/GRN/%`;
      
      const grns = await Grn.findAll({
        where: { grn_no: { [Op.like]: searchPattern } }
      });

      let maxSerial = 0;
      grns.forEach(g => {
        if (g.grn_no) {
          const parts = g.grn_no.split('/');
          const serialStr = parts[parts.length - 1];
          const serial = parseInt(serialStr, 10);
          if (!isNaN(serial) && serial > maxSerial) {
            maxSerial = serial;
          }
        }
      });

      const nextSerial = maxSerial + 1;
      grn_no = `${year}/GRN/${nextSerial.toString().padStart(4, '0')}`;
    }

    const grn = await Grn.create({
      grn_no, 
      po_id, 
      grn_date, 
      warehouse, 
      remarks,
      status: 'QC Pending',
      created_by_id: userId
    }, { transaction: t });

    let hasPartial = false;

    // 2. Add Items — deduplicate by item_id, summing received_qty if same item appears twice
    if (items && items.length > 0) {
      const grnItemMap = new Map();
      for (const i of items) {
        if (!i.item_id) continue;
        if (i.received_qty < i.ordered_qty) hasPartial = true;

        if (grnItemMap.has(i.item_id)) {
          // Merge: sum received qty
          const existing = grnItemMap.get(i.item_id);
          existing.received_qty = (parseFloat(existing.received_qty) || 0) + (parseFloat(i.received_qty) || 0);
          existing.ordered_qty = (parseFloat(existing.ordered_qty) || 0) + (parseFloat(i.ordered_qty) || 0);
        } else {
          grnItemMap.set(i.item_id, {
            grn_id: grn.id,
            item_id: i.item_id,
            ordered_qty: i.ordered_qty,
            received_qty: i.received_qty,
            bill_url: i.bill_url || null,
            remarks: i.remarks || null,
            qc_status: 'Pending'
          });
        }
      }
      await GrnItem.bulkCreate(Array.from(grnItemMap.values()), { transaction: t });
    }

    // 3. Flowchart Checks & Notifications
    await notifyDepartment('Quality', {
      type: 'GRN_QC_PENDING',
      message: `New GRN ${grn_no} created and is pending QC inspection.`,
      link: `/admin/iqc/${grn.id}`
    }, t);

    // Explicitly notify any users in IQC/QC/QA roles/departments
    try {
      const { Op } = require('sequelize');
      const { User: UserModel, Notification: NotificationModel } = require('../models');
      const iqcUsers = await UserModel.findAll({
        where: {
          [Op.or]: [
            { department: { [Op.like]: '%Quality%' } },
            { department: { [Op.like]: '%IQC%' } },
            { designation: { [Op.like]: '%QC%' } },
            { designation: { [Op.like]: '%QA%' } },
            { designation: { [Op.like]: '%IQC%' } }
          ]
        }
      });
      for (const u of iqcUsers) {
        if (u.department?.toLowerCase() === 'quality') continue;
        await NotificationModel.create({
          user_id: u.id,
          type: 'GRN_CREATED',
          message: `Goods Receiving Note ${grn_no} has been created. Pending IQC inspection.`,
          link: `/admin/iqc/${grn.id}`,
          is_read: false
        }, { transaction: t });
      }
    } catch(err) {
      console.error('Failed to send specific IQC notifications:', err);
    }

    if (hasPartial) {
      await notifyDepartment('Purchase', {
        type: 'GRN_PARTIAL',
        message: `Partial receipt for GRN ${grn_no}. Received quantity is less than Ordered quantity.`,
        link: `/admin/grn/${grn.id}`
      }, t);
    }

    await t.commit();
    res.status(201).json(grn);
  } catch (err) {
    await t.rollback();
    console.error(err);
    res.status(500).json({ message: 'Error creating GRN' });
  }
};

exports.updateGrn = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { grn_date, warehouse, remarks, items } = req.body;

    const grn = await Grn.findByPk(id, { transaction: t });
    if (!grn) throw new Error('GRN not found');

    // 1. Update GRN Header
    grn.grn_date = grn_date || grn.grn_date;
    grn.warehouse = warehouse || grn.warehouse;
    grn.remarks = remarks || grn.remarks;
    await grn.save({ transaction: t });

    // 2. Update Items
    // For simplicity, we remove old items and bulk create new ones with provided data
    if (items && items.length > 0) {
      await GrnItem.destroy({ where: { grn_id: id }, transaction: t });
      
      const grnItems = items.map(i => ({
        grn_id: id,
        item_id: i.item_id,
        ordered_qty: i.ordered_qty,
        received_qty: i.received_qty,
        bill_url: i.bill_url || null,
        remarks: i.remarks || null,
        qc_status: i.qc_status || 'Pending',
        accepted_qty: i.accepted_qty || null,
        rejected_qty: i.rejected_qty || null,
        rejection_reason: i.rejection_reason || null
      }));
      await GrnItem.bulkCreate(grnItems, { transaction: t });
    }

    await t.commit();
    res.json({ message: 'GRN updated successfully', grn });
  } catch (err) {
    await t.rollback();
    console.error(err);
    res.status(500).json({ message: err.message || 'Error updating GRN' });
  }
};

exports.updateGrnQc = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    // body expected: { items: [{ id: grn_item_id, qc_status: 'Approved'/'Rejected', accepted_qty, rejected_qty, rejection_reason, rejection_images }] }
    const { items } = req.body;

    const grn = await Grn.findByPk(id, { transaction: t });
    if (!grn) throw new Error('GRN not found');

    const po = await PurchaseOrder.findByPk(grn.po_id, { 
      include: [{ model: PurchaseRequest, attributes: ['project_id'] }],
      transaction: t 
    });
    const projectName = po && po.project_name ? po.project_name : 'General Project';
    const locationName = po && po.warehouse ? po.warehouse : 'Main Store';

    let allApproved = true;
    let anyRejected = false;

    for (let i of items) {
      const grnItem = await GrnItem.findByPk(i.id, { transaction: t });
      if (grnItem) {
        // Calculate the difference in accepted quantity
        const acceptedDiff = parseFloat(i.accepted_qty || 0) - parseFloat(grnItem.accepted_qty || 0);

        grnItem.qc_status = i.qc_status;
        grnItem.accepted_qty = i.accepted_qty;
        grnItem.rejected_qty = i.rejected_qty;
        grnItem.rejection_reason = i.rejection_reason;
        grnItem.rejection_images = i.rejection_images;
        grnItem.rejection_video = i.rejection_video;
        grnItem.inspected_by_id = req.user ? req.user.id : 1;
        grnItem.inspected_date = new Date();
        await grnItem.save({ transaction: t });

        // Update Good Stock in Inventory (directly reflected)
        if (acceptedDiff !== 0) {
          const finalProjectName = projectName || 'General Project';
          const finalLocationName = locationName || 'Main Store';
          
          let stock = await Stock.findOne({ 
            where: { 
              item_id: grnItem.item_id, 
              project_name: finalProjectName,
              location: finalLocationName
            }, 
            transaction: t 
          });
          
          if (!stock) {
             await Stock.create({ 
               item_id: grnItem.item_id, 
               quantity: acceptedDiff,
               bad_quantity: 0, 
               location: finalLocationName,
               project_name: finalProjectName
             }, { transaction: t });
          } else {
             stock.quantity = parseFloat(stock.quantity || 0) + acceptedDiff;
             await stock.save({ transaction: t });
          }
        }

        if (i.qc_status !== 'Approved') {
          allApproved = false;
        }

        // AUTO-CREATE Material Rejection Log if rejected_qty > 0
        if (parseFloat(i.rejected_qty || 0) > 0) {
          // Check if rejection already exists for this GRN Item to avoid duplicates
          const existingRejection = await MaterialRejection.findOne({
            where: { grn_item_id: grnItem.id },
            transaction: t
          });

          if (!existingRejection) {
            const lastRejection = await MaterialRejection.findOne({
              order: [['id', 'DESC']],
              transaction: t
            });
            const nextId = lastRejection ? lastRejection.id + 1 : 1;
            const rejection_no = `RJ-${nextId.toString().padStart(3, '0')}`;

            await MaterialRejection.create({
              rejection_no,
              grn_id: grn.id,
              grn_item_id: grnItem.id,
              item_id: grnItem.item_id,
              vendor_id: po ? po.to_vendor_id : 1, // Fallback to 1 if po not found
              project_id: (po && po.PurchaseRequest) ? po.PurchaseRequest.project_id : null,
              received_qty: grnItem.received_qty,
              rejected_qty: i.rejected_qty,
              reason: i.rejection_reason,
              status: 'Opened',
              media_urls: JSON.stringify({ 
                images: i.rejection_images ? i.rejection_images.split(',') : [],
                video: i.rejection_video 
              })
            }, { transaction: t });
          } else {
            // Update existing rejection reason if IQC was updated
            existingRejection.rejected_qty = i.rejected_qty;
            existingRejection.reason = i.rejection_reason;
            existingRejection.media_urls = JSON.stringify({ 
                images: i.rejection_images ? i.rejection_images.split(',') : [],
                video: i.rejection_video 
            });
            await existingRejection.save({ transaction: t });
          }
        }
      }
    }

    // Recalculate final GRN status based on ALL items, including the ones just updated
    const allItems = await GrnItem.findAll({ where: { grn_id: id }, transaction: t });
    
    let totalReceived = 0;
    let totalInspected = 0;

    for (const gi of allItems) {
      totalReceived += Number(gi.received_qty || 0);
      totalInspected += Number(gi.accepted_qty || 0) + Number(gi.rejected_qty || 0);
    }

    if (totalInspected === 0) {
      grn.status = 'QC Pending';
    } else if (totalReceived - totalInspected > 0.0001) {
      grn.status = 'Partially Inspected';
    } else {
      grn.status = 'Fully Inspected';
    }

    await grn.save({ transaction: t });

    // Trigger Payment record creation if GRN is Approved (Inspected)
    if (grn.status === 'Approved' || grn.status === 'Fully Inspected' || grn.status === 'Partially Inspected') {
      const po = await PurchaseOrder.findByPk(grn.po_id, {
        include: [{ model: PurchaseOrderItem, as: 'Items' }],
        transaction: t
      });

      if (po && po.is_approved) {
        let poTotalAmount = 0;
        if (po.Items && po.Items.length > 0) {
          po.Items.forEach(item => {
            const price = parseFloat(item.unit_price || 0);
            const qty = parseFloat(item.quantity || 0);
            poTotalAmount += (price * qty);
          });
        }
        const totalAmount = Math.round(poTotalAmount * 100) / 100;

        const [payment, created] = await Payment.findOrCreate({
          where: { po_id: po.id },
          defaults: {
            total_amount: totalAmount,
            status: 'OPEN'
          },
          transaction: t
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
          await payment.save({ transaction: t });
        }
      }
    }
    
    // Notify the creator directly
    await Notification.create({
      user_id: grn.created_by_id,
      type: grn.status === 'Approved' ? 'GRN_APPROVED' : 'GRN_QC_RESULT',
      message: `The inspection for GRN ${grn.grn_no} is complete. Result: ${grn.status === 'Approved' ? 'Inspected' : grn.status}.`,
      link: `/admin/grn/${grn.id}`,
      is_read: false
    }, { transaction: t });

    // Notify Departments
    await notifyDepartment('Store', {
      type: grn.status === 'Approved' ? 'GRN_APPROVED' : 'GRN_QC_RESULT',
      message: `QC Result for GRN ${grn.grn_no}: ${grn.status === 'Approved' ? 'Inspected' : grn.status}.`,
      link: `/admin/grn/${grn.id}`
    }, t);

    await notifyDepartment('Purchase', {
      type: grn.status === 'Approved' ? 'GRN_APPROVED' : 'GRN_QC_RESULT',
      message: `QC Result for GRN ${grn.grn_no}: ${grn.status === 'Approved' ? 'Inspected' : grn.status}.`,
      link: `/admin/grn/${grn.id}`
    }, t);

    await t.commit();
    res.json({ message: 'QC Updated successfully', grn });
  } catch (err) {
    await t.rollback();
    console.error(err);
    res.status(500).json({ message: err.message || 'Error updating QC' });
  }
};
