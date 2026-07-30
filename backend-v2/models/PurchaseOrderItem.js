const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const PurchaseOrderItem = sequelize.define('PurchaseOrderItem', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  po_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'PurchaseOrders',
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
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  uom: {
    type: DataTypes.STRING,
    allowNull: true
  },
  unit_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  }
}, {
  timestamps: false
});

module.exports = PurchaseOrderItem;
