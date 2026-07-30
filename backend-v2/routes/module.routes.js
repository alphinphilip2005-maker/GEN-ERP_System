const express = require('express');
const router = express.Router();
const { Module } = require('../models');
const authMiddleware = require('../middlewares/authMiddleware');

// GET all modules
router.get('/', authMiddleware, async (req, res) => {
  try {
    const modules = await Module.findAll({ order: [['id', 'ASC']] });
    res.json(modules);
  } catch (error) {
    console.error('Error fetching modules:', error);
    res.status(500).json({ message: 'Error fetching modules' });
  }
});

module.exports = router;
