const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Project = sequelize.define('Project', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  project_code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  project_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  project_lead_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Project;
