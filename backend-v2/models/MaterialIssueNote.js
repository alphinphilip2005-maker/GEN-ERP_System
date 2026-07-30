const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const MaterialIssueNote = sequelize.define('MaterialIssueNote', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  min_no: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  mrn_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Mrns',
      key: 'id'
    }
  },
  issue_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  issued_by_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'Completed'
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = MaterialIssueNote;
