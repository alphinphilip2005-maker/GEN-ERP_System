const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User, Permission, Module } = require('../models');

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

  try {
    const user = await User.findOne({ 
      where: { email },
      include: [
        {
          model: Permission,
          include: [{ model: Module }]
        }
      ]
    });
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ message: 'Invalid email or password' });

    const token = jwt.sign(
      { 
        id: user.id, 
        name: user.name,
        email: user.email,
        department: user.department,
        designation: user.designation,
        role: user.role
      }, 
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '8h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        employee_id: user.employee_id,
        designation: user.designation,
        department: user.department,
        role: user.role,
        permissions: user.Permissions ? user.Permissions.map(p => ({
          module: p.Module ? p.Module.module_name : null,
          can_view: p.can_view,
          can_edit: p.can_edit,
          can_delete: p.can_delete,
          can_create: p.can_create,
          can_approve: p.can_approve
        })).filter(p => p.module) : []
      }
    });

  } catch (error) {
    console.error('Login error', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

const authMiddleware = require('../middlewares/authMiddleware');

// Get dynamic fresh user profile and latest permissions
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        {
          model: Permission,
          include: [{ model: Module }]
        }
      ]
    });
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      employee_id: user.employee_id,
      designation: user.designation,
      department: user.department,
      role: user.role,
      permissions: user.Permissions ? user.Permissions.map(p => ({
        module: p.Module ? p.Module.module_name : null,
        can_view: p.can_view,
        can_edit: p.can_edit,
        can_delete: p.can_delete,
        can_create: p.can_create,
        can_approve: p.can_approve
      })).filter(p => p.module) : []
    });
  } catch (error) {
    console.error('Fetch profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
