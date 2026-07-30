const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const PurchaseRequestItem = sequelize.define('PurchaseRequestItem', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  pr_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'PurchaseRequests',
      key: 'id'
    }
  },
  item_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Items',
      key: 'id'
    }
  },
  custom_item_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  custom_item_code: {
    type: DataTypes.STRING,
    allowNull: true
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
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  tax_percent: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0
  },
  total_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  links_remarks_contact: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_bom_item: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  line_status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Approved'
  },
  selected_quote_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  timestamps: false
});

module.exports = PurchaseRequestItem;
