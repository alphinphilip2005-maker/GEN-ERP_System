const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const PurchaseRequest = sequelize.define('PurchaseRequest', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  pr_no: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  request_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  requested_by_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  designation: {
    type: DataTypes.STRING,
    allowNull: true
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true
  },
  project_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Projects',
      key: 'id'
    }
  },
  product_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  qc_required: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  bom_revision_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'BomRevisions',
      key: 'id'
    }
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Draft'
  },
  submitted_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  rejected_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = PurchaseRequest;
