const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Mrn = sequelize.define('Mrn', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  mrn_no: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  slip_no: {
    type: DataTypes.STRING,
    allowNull: true
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
  project_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Projects',
      key: 'id'
    }
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true
  },
  designation: {
    type: DataTypes.STRING,
    allowNull: true
  },
  supervisor_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  store_in_charge_name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Pending' // Pending, Approved, Issued, Partial, Cancelled
  },
  approved_by_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  issued_by_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  mrn_type: {
    type: DataTypes.ENUM('Store', 'Project_Transfer'),
    allowNull: false,
    defaultValue: 'Store'
  },
  from_project_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Projects', key: 'id' }
  },
  to_project_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Projects', key: 'id' }
  },
  store_location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  to_store_location: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Mrn;
