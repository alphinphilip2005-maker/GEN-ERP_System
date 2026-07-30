const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const User = require('./User');
const Module = require('./Module');
const Item = require('./Item');
const ItemCategory = require('./ItemCategory');
const Uom = require('./Uom');
const Project = require('./Project');
const Vendor = require('./Vendor');
const BomProject = require('./BomProject');
const BomItem = require('./BomItem');
const BomRevision = require('./BomRevision');
const Notification = require('./Notification');
const PurchaseRequest = require('./PurchaseRequest');
const PurchaseRequestItem = require('./PurchaseRequestItem');
const Stock = require('./Stock');
const Quote = require('./Quote');
const PurchaseOrder = require('./PurchaseOrder');
const PurchaseOrderItem = require('./PurchaseOrderItem');
const Grn = require('./Grn');
const GrnItem = require('./GrnItem');
const Mrn = require('./Mrn');
const MrnItem = require('./MrnItem');
const MaterialIssueNote = require('./MaterialIssueNote');
const ProjectInventory = require('./ProjectInventory');
const Payment = require('./Payment');
const PaymentHistory = require('./PaymentHistory');
const MaterialRejection = require('./MaterialRejection');
const InventoryHistory = require('./InventoryHistory');

const Permission = sequelize.define('Permission', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  can_view: { type: DataTypes.BOOLEAN, defaultValue: false },
  can_edit: { type: DataTypes.BOOLEAN, defaultValue: false },
  can_delete: { type: DataTypes.BOOLEAN, defaultValue: false },
  can_approve: { type: DataTypes.BOOLEAN, defaultValue: false },
  can_create: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  timestamps: false
});

// Associations
User.hasMany(Permission, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Permission.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Project, { foreignKey: 'project_lead_id', onDelete: 'SET NULL' });
Project.belongsTo(User, { as: 'Lead', foreignKey: 'project_lead_id' });

Module.hasMany(Permission, { foreignKey: 'module_id', onDelete: 'CASCADE' });
Permission.belongsTo(Module, { foreignKey: 'module_id' });

BomProject.hasMany(BomItem, { foreignKey: 'bom_project_id', onDelete: 'CASCADE' });
BomItem.belongsTo(BomProject, { foreignKey: 'bom_project_id' });

BomProject.hasMany(BomRevision, { foreignKey: 'bom_project_id', onDelete: 'CASCADE' });
BomRevision.belongsTo(BomProject, { foreignKey: 'bom_project_id' });

BomRevision.hasMany(BomItem, { foreignKey: 'bom_revision_id', onDelete: 'CASCADE' });
BomItem.belongsTo(BomRevision, { foreignKey: 'bom_revision_id' });

Item.hasMany(BomItem, { foreignKey: 'item_id', onDelete: 'RESTRICT' });
BomItem.belongsTo(Item, { foreignKey: 'item_id' });

User.hasMany(Notification, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'user_id' });

// Project - BOM Link
Project.hasMany(BomProject, { foreignKey: 'project_id', onDelete: 'SET NULL' });
BomProject.belongsTo(Project, { foreignKey: 'project_id' });

// Purchase Request Associations
User.hasMany(PurchaseRequest, { foreignKey: 'requested_by_id', onDelete: 'CASCADE' });
PurchaseRequest.belongsTo(User, { as: 'Requester', foreignKey: 'requested_by_id' });

Project.hasMany(PurchaseRequest, { foreignKey: 'project_id', onDelete: 'CASCADE' });
PurchaseRequest.belongsTo(Project, { foreignKey: 'project_id' });

BomRevision.hasMany(PurchaseRequest, { foreignKey: 'bom_revision_id', onDelete: 'SET NULL' });
PurchaseRequest.belongsTo(BomRevision, { foreignKey: 'bom_revision_id' });

PurchaseRequest.hasMany(PurchaseRequestItem, { foreignKey: 'pr_id', onDelete: 'CASCADE' });
PurchaseRequestItem.belongsTo(PurchaseRequest, { foreignKey: 'pr_id' });

Item.hasMany(PurchaseRequestItem, { foreignKey: 'item_id', onDelete: 'RESTRICT' });
PurchaseRequestItem.belongsTo(Item, { foreignKey: 'item_id' });

// Stock Associations
Item.hasOne(Stock, { foreignKey: 'item_id', onDelete: 'CASCADE' });
Stock.belongsTo(Item, { foreignKey: 'item_id' });

// Inventory History Associations
Item.hasMany(InventoryHistory, { foreignKey: 'item_id', onDelete: 'CASCADE' });
InventoryHistory.belongsTo(Item, { foreignKey: 'item_id' });

// Quote Associations
PurchaseRequestItem.hasMany(Quote, { foreignKey: 'pr_item_id', onDelete: 'CASCADE' });
Quote.belongsTo(PurchaseRequestItem, { foreignKey: 'pr_item_id' });

Vendor.hasMany(Quote, { foreignKey: 'vendor_id', onDelete: 'CASCADE' });
Quote.belongsTo(Vendor, { foreignKey: 'vendor_id' });

Quote.hasOne(PurchaseRequestItem, { foreignKey: 'selected_quote_id', constraints: false }); // Optional linkage

// Purchase Order Associations
PurchaseOrder.hasMany(PurchaseOrderItem, { as: 'Items', foreignKey: 'po_id', onDelete: 'CASCADE' });
PurchaseOrderItem.belongsTo(PurchaseOrder, { foreignKey: 'po_id' });

PurchaseOrder.belongsTo(PurchaseRequest, { foreignKey: 'pr_id' });
PurchaseRequest.hasMany(PurchaseOrder, { foreignKey: 'pr_id' });

PurchaseOrder.belongsTo(Vendor, { as: 'ToVendor', foreignKey: 'to_vendor_id' });
Vendor.hasMany(PurchaseOrder, { foreignKey: 'to_vendor_id' });

PurchaseOrder.belongsTo(User, { as: 'PurchaseManager', foreignKey: 'purchase_manager_id' });
User.hasMany(PurchaseOrder, { foreignKey: 'purchase_manager_id' });

PurchaseOrderItem.belongsTo(Item, { foreignKey: 'item_id' });
Item.hasMany(PurchaseOrderItem, { foreignKey: 'item_id' });

// GRN Associations
Grn.belongsTo(PurchaseOrder, { foreignKey: 'po_id' });
PurchaseOrder.hasMany(Grn, { foreignKey: 'po_id' });

Grn.belongsTo(User, { as: 'Creator', foreignKey: 'created_by_id' });
User.hasMany(Grn, { foreignKey: 'created_by_id' });

Grn.hasMany(GrnItem, { foreignKey: 'grn_id', onDelete: 'CASCADE' });
GrnItem.belongsTo(Grn, { foreignKey: 'grn_id' });

GrnItem.belongsTo(Item, { foreignKey: 'item_id' });
Item.hasMany(GrnItem, { foreignKey: 'item_id' });

GrnItem.belongsTo(User, { as: 'Inspector', foreignKey: 'inspected_by_id' });
User.hasMany(GrnItem, { foreignKey: 'inspected_by_id' });

// MRN Associations
Mrn.belongsTo(User, { as: 'Requester', foreignKey: 'requested_by_id' });
User.hasMany(Mrn, { foreignKey: 'requested_by_id' });

Mrn.belongsTo(User, { as: 'Approver', foreignKey: 'approved_by_id' });
User.hasMany(Mrn, { foreignKey: 'approved_by_id' });

Mrn.belongsTo(User, { as: 'Issuer', foreignKey: 'issued_by_id' });
User.hasMany(Mrn, { foreignKey: 'issued_by_id' });

Mrn.belongsTo(Project, { foreignKey: 'project_id' });
Project.hasMany(Mrn, { foreignKey: 'project_id' });

Mrn.belongsTo(Project, { as: 'FromProject', foreignKey: 'from_project_id' });
Mrn.belongsTo(Project, { as: 'ToProject', foreignKey: 'to_project_id' });

Mrn.hasMany(MrnItem, { foreignKey: 'mrn_id', onDelete: 'CASCADE' });
MrnItem.belongsTo(Mrn, { foreignKey: 'mrn_id' });

MrnItem.belongsTo(Item, { foreignKey: 'item_id' });
Item.hasMany(MrnItem, { foreignKey: 'item_id' });

MaterialIssueNote.belongsTo(Mrn, { foreignKey: 'mrn_id' });
Mrn.hasMany(MaterialIssueNote, { foreignKey: 'mrn_id' });

MaterialIssueNote.belongsTo(User, { as: 'IssuedBy', foreignKey: 'issued_by_id' });
User.hasMany(MaterialIssueNote, { foreignKey: 'issued_by_id' });

ProjectInventory.belongsTo(Project, { foreignKey: 'project_id' });
Project.hasMany(ProjectInventory, { foreignKey: 'project_id' });

ProjectInventory.belongsTo(Item, { foreignKey: 'item_id' });
Item.hasMany(ProjectInventory, { foreignKey: 'item_id' });

// Payment Associations
PurchaseOrder.hasOne(Payment, { foreignKey: 'po_id', onDelete: 'CASCADE' });
Payment.belongsTo(PurchaseOrder, { foreignKey: 'po_id' });

Payment.hasMany(PaymentHistory, { foreignKey: 'payment_id', onDelete: 'CASCADE' });
PaymentHistory.belongsTo(Payment, { foreignKey: 'payment_id' });

// Material Rejection Associations
MaterialRejection.belongsTo(Grn, { foreignKey: 'grn_id' });
Grn.hasMany(MaterialRejection, { foreignKey: 'grn_id' });

MaterialRejection.belongsTo(Item, { foreignKey: 'item_id' });
Item.hasMany(MaterialRejection, { foreignKey: 'item_id' });

MaterialRejection.belongsTo(Vendor, { foreignKey: 'vendor_id' });
Vendor.hasMany(MaterialRejection, { foreignKey: 'vendor_id' });

MaterialRejection.belongsTo(Project, { foreignKey: 'project_id' });
Project.hasMany(MaterialRejection, { foreignKey: 'project_id' });


module.exports = { User, Module, Permission, Item, ItemCategory, Uom, Project, Vendor, BomProject, BomItem, BomRevision, Notification, PurchaseRequest, PurchaseRequestItem, Stock, Quote, PurchaseOrder, PurchaseOrderItem, Grn, GrnItem, Mrn, MrnItem, MaterialIssueNote, ProjectInventory, Payment, PaymentHistory, MaterialRejection, InventoryHistory };
