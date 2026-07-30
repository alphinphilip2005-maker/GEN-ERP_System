const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const BomItem = sequelize.define('BomItem', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  bom_project_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  bom_revision_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  item_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: false,
    defaultValue: 1
  },
  assembly: {
    type: DataTypes.STRING,
    allowNull: true
  },
  rate: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    defaultValue: 0
  },
  price: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    defaultValue: 0
  },
  actual_qty: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: true,
    defaultValue: 0
  },
  vendor_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = BomItem;
