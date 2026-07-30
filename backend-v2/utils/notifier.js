const { User, Notification } = require('../models');
const { Op } = require('sequelize');

/**
 * Centeralized Notifier to broadcast messages to specific departments
 */
const notifyDepartment = async (department, { type, message, link }, transaction = null) => {
  try {
    const users = await User.findAll({ 
      where: {
        [Op.or]: [
          { department },
          { role: 'admin' }
        ]
      }
    });
    if (!users || users.length === 0) return;

    const notifs = users.map(u => ({
      user_id: u.id,
      type: type || 'INFO',
      message,
      link: link || null,
      is_read: false
    }));

    await Notification.bulkCreate(notifs, { transaction });
    console.log(`Notifications sent to ${users.length} users in ${department} department.`);

    // Also send email notifications asynchronously (do NOT await, to avoid blocking response/timeouts)
    (async () => {
      try {
        const { sendEmailNotification } = require('./email');
        for (const u of users) {
          if (u.email) {
            await sendEmailNotification(
              u.email,
              `Gen ERP Department Alert: ${department}`,
              message
            );
          }
        }
      } catch (err) {
        console.error('Failed to dispatch department emails:', err);
      }
    })();
  } catch (err) {
    console.error(`Failed to notify department ${department}:`, err);
  }
};

/**
 * Notify a specific user by ID
 */
const notifyUser = async (userId, { type, message, link }, transaction = null) => {
  try {
    await Notification.create({
      user_id: userId,
      type: type || 'INFO',
      message,
      link: link || null,
      is_read: false
    }, { transaction });

    // Send email notification asynchronously
    (async () => {
      try {
        const user = await User.findByPk(userId);
        if (user && user.email) {
          const { sendEmailNotification } = require('./email');
          await sendEmailNotification(
            user.email,
            `Gen ERP Notification Alert`,
            message
          );
        }
      } catch (err) {
        console.error('Failed to send user email notification:', err);
      }
    })();
  } catch (err) {
    console.error(`Failed to notify user ${userId}:`, err);
  }
};

module.exports = {
  notifyDepartment,
  notifyUser
};
