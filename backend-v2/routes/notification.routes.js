const express = require('express');
const router = express.Router();
const { Notification } = require('../models');

// Get all notifications for a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { user_id: req.params.userId },
      order: [['created_at', 'DESC']]
    });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark a notification as read
router.patch('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    
    await notification.update({ is_read: true });
    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark all notifications as read for a user
router.patch('/user/:userId/read-all', async (req, res) => {
  try {
    await Notification.update(
      { is_read: true },
      { where: { user_id: req.params.userId, is_read: false } }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete a notification
router.delete('/:id', async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    
    await notification.destroy();
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
