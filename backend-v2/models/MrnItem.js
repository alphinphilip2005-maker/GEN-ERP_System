const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const MrnItem = sequelize.define('MrnItem', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  mrn_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Mrns',
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
  requested_quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  issued_quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  uom: {
    type: DataTypes.STRING,
    allowNull: true
  },
  specification: {
    type: DataTypes.STRING,
    allowNull: true
  },
  batch_no: {
    type: DataTypes.STRING,
    allowNull: true
  },
  product_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  is_bom_item: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  timestamps: false
});

module.exports = MrnItem;
