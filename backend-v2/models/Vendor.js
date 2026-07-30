const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Vendor = sequelize.define('Vendor', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  vendor_code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  street: {
    type: DataTypes.STRING,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true
  },
  country: {
    type: DataTypes.STRING,
    allowNull: true
  },
  pin: {
    type: DataTypes.STRING,
    allowNull: true
  },
  contact_person: {
    type: DataTypes.STRING,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  gst_number: {
    type: DataTypes.STRING,
    allowNull: true
  },
  pan: {
    type: DataTypes.STRING,
    allowNull: true
  },
  msme: {
    type: DataTypes.STRING,
    allowNull: true
  },
  contact_details: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  bank_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  account_number: {
    type: DataTypes.STRING,
    allowNull: true
  },
  ifsc_code: {
    type: DataTypes.STRING,
    allowNull: true
  },
  account_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  branch_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  approval_status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Approved' // Existing ones are approved, new ones can be Pending via API
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Vendor;
