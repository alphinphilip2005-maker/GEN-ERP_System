const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const PurchaseOrder = sequelize.define('PurchaseOrder', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  po_no: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  po_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  sanction_code: {
    type: DataTypes.STRING,
    allowNull: true
  },
  pr_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'PurchaseRequests',
      key: 'id'
    }
  },
  project_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  teams: {
    type: DataTypes.STRING,
    allowNull: true
  },
  pq_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  pq_no: {
    type: DataTypes.STRING,
    allowNull: true
  },
  to_vendor_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Vendors',
      key: 'id'
    }
  },
  from_branch: {
    type: DataTypes.STRING,
    allowNull: true
  },
  purchase_manager_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  upload_po: {
    type: DataTypes.STRING,
    allowNull: true
  },
  terms_conditions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  warehouse: {
    type: DataTypes.STRING,
    allowNull: true
  },
  all_warehouses: {
    type: DataTypes.STRING,
    allowNull: true
  },
  is_approved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  approved_by_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Generated' // e.g. Generated, Issued, Received
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = PurchaseOrder;
