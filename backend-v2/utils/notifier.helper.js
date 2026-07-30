/**
 * notifier.helper.js
 * Extended notifier helper for MRN module — adapts to the existing Notification model.
 * Provides `broadcast` (by designation/role) and `notifyUser` (by specific user id).
 */
const { User, Notification } = require('../models');
const { Op } = require('sequelize');

/**
 * Broadcast a notification to users matching given designations, plus all admins.
 * @param {string[]} designations - Array of designation strings to target. Pass [] for admins only.
 * @param {object} payload - { title, message, type, link, module, reference_id }
 */
const broadcast = async (designations, { title, message, type, link, module: mod, reference_id } = {}, transaction = null) => {
  try {
    const whereClause = {
      [Op.or]: [
        { role: 'admin' }
      ]
    };

    if (designations && designations.length > 0) {
      whereClause[Op.or].push({ designation: { [Op.in]: designations } });
    }

    const users = await User.findAll({ where: whereClause });
    if (!users || users.length === 0) return;

    const notifs = users.map(u => ({
      user_id: u.id,
      type: type || 'INFO',
      message: title ? `${title}: ${message}` : message,
      link: link || null,
      is_read: false
    }));

    await Notification.bulkCreate(notifs, transaction ? { transaction } : {});
    console.log(`[Notifier] Broadcast sent to ${users.length} users.`);
  } catch (err) {
    console.error('[Notifier] broadcast error:', err.message);
  }
};

/**
 * Notify a specific user by ID.
 * @param {number} userId
 * @param {object} payload - { title, message, type, link }
 */
const notifyUser = async (userId, { title, message, type, link } = {}, transaction = null) => {
  try {
    if (!userId) return;
    await Notification.create({
      user_id: userId,
      type: type || 'INFO',
      message: title ? `${title}: ${message}` : message,
      link: link || null,
      is_read: false
    }, transaction ? { transaction } : {});
  } catch (err) {
    console.error(`[Notifier] notifyUser error for user ${userId}:`, err.message);
  }
};

module.exports = { broadcast, notifyUser };
