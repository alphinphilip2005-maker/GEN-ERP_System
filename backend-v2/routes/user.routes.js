const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { User, Permission, Module } = require('../models');
const authMiddleware = require('../middlewares/authMiddleware');
const validateUser = require('../middlewares/validateUser');

// GET all users with their permissions
router.get('/', authMiddleware, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password_hash'] },
      include: [{ model: Permission, include: [Module] }]
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// GET single user
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash'] },
      include: [{ model: Permission, include: [Module] }]
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user' });
  }
});

// POST - create a new user
router.post('/', [authMiddleware, validateUser], async (req, res) => {
  const { name, email, password, employee_id, designation, department, phone, rights } = req.body;

  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) return res.status(409).json({ message: 'Email already exists' });

    const password_hash = await bcrypt.hash(password, 10);
    const newUser = await User.create({ name, email, password_hash, employee_id, designation, department, phone });

    // Automatically ensure universal baseline default: EVERY new user gets Inventory view rights!
    const invMod = await Module.findOne({ where: { module_name: 'Inventory' } });
    
    // NEW REGULATION: Quality department automatically gets full IQC and MRL rights!
    const isQualityDept = (department || '').toLowerCase().trim() === 'quality';
    let qModIds = [];
    if (isQualityDept) {
      const qMods = await Module.findAll({ where: { module_name: ['IQC', 'Material Rejection Log'] } });
      qModIds = qMods.map(m => m.id);
    }

    // Initialize standard array if none provided
    let activeRights = rights && Array.isArray(rights) ? [...rights] : [];
    
    // Automatically push defaults if not manually defined by user payload!
    if (invMod) {
      const hasInv = activeRights.some(r => Number(r.module_id) === Number(invMod.id));
      if (!hasInv) {
        activeRights.push({
          module_id: invMod.id,
          can_view: true,
          can_edit: false,
          can_delete: false,
          can_approve: false,
          can_create: false
        });
      }
    }

    // Auto-push Quality defaults if it is a quality user!
    for (const qId of qModIds) {
       const alreadyHas = activeRights.some(r => Number(r.module_id) === Number(qId));
       if (!alreadyHas) {
          activeRights.push({
            module_id: qId,
            can_view: true,
            can_edit: true,
            can_delete: true,
            can_approve: true,
            can_create: true
          });
       }
    }

    if (activeRights.length > 0) {
      const formattedRights = activeRights.map(r => ({
        user_id: newUser.id,
        module_id: r.module_id,
        can_view: r.can_view || false,
        can_edit: r.can_edit || false,
        can_delete: r.can_delete || false,
        can_approve: r.can_approve || false,
        can_create: r.can_create || false
      }));
      await Permission.bulkCreate(formattedRights);
    }

    res.status(201).json({ message: 'User created successfully', userId: newUser.id });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
});

// PUT - update user details
router.put('/:id', authMiddleware, async (req, res) => {
  const { name, email, employee_id, designation, department, phone, password } = req.body;
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const updates = { name, email, employee_id, designation, department, phone };
    if (password) {
      updates.password_hash = await bcrypt.hash(password, 10);
    }

    await user.update(updates);
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user' });
  }
});

// DELETE user
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    await user.destroy();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user' });
  }
});

// GET rights for a user
router.get('/:id/rights', authMiddleware, async (req, res) => {
  try {
    const permissions = await Permission.findAll({
      where: { user_id: req.params.id },
      include: [Module]
    });
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching permissions' });
  }
});

// PUT - update user rights
router.put('/:id/rights', authMiddleware, async (req, res) => {
  const { rights } = req.body;
  if (!rights || !Array.isArray(rights)) {
    return res.status(400).json({ message: 'Rights payload must be an array' });
  }

  try {
    await Permission.destroy({ where: { user_id: req.params.id } });
    const formattedRights = rights.map(r => ({
      user_id: req.params.id,
      module_id: r.module_id,
      can_view: r.can_view || false,
      can_edit: r.can_edit || false,
      can_delete: r.can_delete || false,
      can_approve: r.can_approve || false,
      can_create: r.can_create || false
    }));
    await Permission.bulkCreate(formattedRights);
    res.json({ message: 'User rights updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user rights' });
  }
});

module.exports = router;
