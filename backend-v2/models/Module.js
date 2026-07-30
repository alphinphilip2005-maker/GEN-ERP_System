const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Module = sequelize.define('Module', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  module_name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  }
}, {
  timestamps: false
});

module.exports = Module;
