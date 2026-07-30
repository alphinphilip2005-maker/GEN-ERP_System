const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const MaterialRejection = sequelize.define('MaterialRejection', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  rejection_no: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  grn_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  grn_item_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  item_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  vendor_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  project_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  received_qty: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  rejected_qty: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  action_taken: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  root_cause: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  disposition: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'Opened' // Opened, Closed, On Progress
  },
  closing_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  is_stock_updated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  media_urls: {
    type: DataTypes.TEXT, // JSON string of images/videos
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'MaterialRejections',
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = MaterialRejection;
