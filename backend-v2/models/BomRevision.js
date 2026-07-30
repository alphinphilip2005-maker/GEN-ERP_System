const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const BomRevision = sequelize.define('BomRevision', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  bom_project_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  revision_no: {
    type: DataTypes.STRING,
    allowNull: false
  },
  change_description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  revised_on: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  revised_by: {
    type: DataTypes.STRING,
    allowNull: true
  },
  is_approved: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  approved_by: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'),
    allowNull: false,
    defaultValue: 'Pending'
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = BomRevision;
