const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  po_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  total_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  },
  paid_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  settlement_type: {
    type: DataTypes.STRING, // 'Cash', 'Credit'
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('OPEN', 'PARTIAL', 'CLOSED'),
    defaultValue: 'OPEN'
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Payment;
