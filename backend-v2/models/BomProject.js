const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const BomProject = sequelize.define('BomProject', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  project_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  project_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Projects',
      key: 'id'
    }
  },
  current_revision: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '00'
  },
  released_on: {
    type: DataTypes.DATE,
    allowNull: true
  },
  uploaded_by: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = BomProject;
