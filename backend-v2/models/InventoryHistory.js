const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const InventoryHistory = sequelize.define('InventoryHistory', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  item_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Items',
      key: 'id'
    }
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  type: {
    type: DataTypes.STRING, // 'PR_Flow' or 'Project_Transfer'
    allowNull: false
  },
  source_reference: {
    type: DataTypes.STRING, // e.g. PO Number or MRN Number
    allowNull: true
  },
  from_project: {
    type: DataTypes.STRING,
    allowNull: true
  },
  to_project: {
    type: DataTypes.STRING,
    allowNull: true
  },
  user_name: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = InventoryHistory;
