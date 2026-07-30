const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'INFO' // e.g., 'BOM_UPLOAD', 'BOM_APPROVAL', 'INFO'
  },
  link: {
    type: DataTypes.STRING,
    allowNull: true
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    afterCreate: async (notification, options) => {
      try {
        const { sendEmailNotification } = require('../utils/email');
        const User = sequelize.models.User;
        if (User) {
          const user = await User.findByPk(notification.user_id, { transaction: options.transaction });
          if (user && user.email) {
            // Fire and forget email to avoid blocking the transaction
            sendEmailNotification(
              user.email,
              notification.title || `New Notification: ${notification.type}`,
              notification.message
            );
          }
        }
      } catch (err) {
        console.error('Error sending email on Notification create:', err);
      }
    },
    afterBulkCreate: async (notifications, options) => {
      try {
        const { sendEmailNotification } = require('../utils/email');
        const User = sequelize.models.User;
        if (User) {
          for (const notification of notifications) {
            const user = await User.findByPk(notification.user_id, { transaction: options.transaction });
            if (user && user.email) {
              // Fire and forget email to avoid blocking the transaction
              sendEmailNotification(
                user.email,
                notification.title || `New Notification: ${notification.type}`,
                notification.message
              );
            }
          }
        }
      } catch (err) {
        console.error('Error sending email on Notification bulkCreate:', err);
      }
    }
  }
});

module.exports = Notification;
