const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Quote = sequelize.define('Quote', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  pr_item_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'PurchaseRequestItems',
      key: 'id'
    }
  },
  vendor_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Vendors',
      key: 'id'
    }
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  delivery_time: {
    type: DataTypes.STRING,
    allowNull: true
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Pending' // Can be Pending, Approved, Rejected
  },
  quote_url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  quote_no: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Quote;
