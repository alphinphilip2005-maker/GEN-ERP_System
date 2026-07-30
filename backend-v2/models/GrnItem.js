const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const GrnItem = sequelize.define('GrnItem', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  grn_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Grns',
      key: 'id'
    }
  },
  item_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Items',
      key: 'id'
    }
  },
  ordered_qty: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  received_qty: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0
  },
  accepted_qty: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: null
  },
  rejected_qty: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: null
  },
  qc_status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Pending' // 'Pending', 'Approved', 'Rejected'
  },
  rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  rejection_images: {
    type: DataTypes.TEXT, 
    allowNull: true
  },
  rejection_video: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  bill_url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  inspected_by_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  inspected_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: false
});

module.exports = GrnItem;
