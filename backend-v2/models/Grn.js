const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Grn = sequelize.define('Grn', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  grn_no: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  po_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'PurchaseOrders',
      key: 'id'
    }
  },
  grn_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  warehouse: {
    type: DataTypes.STRING,
    allowNull: true
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_by_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Created' // 'Created', 'QC Pending', 'Approved', 'Rejected'
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Grn;
