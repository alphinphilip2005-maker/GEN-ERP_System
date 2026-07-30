const express = require('express');
const router = express.Router();
const { Uom } = require('../models');

// GET all UOMs
router.get('/', async (req, res) => {
  try {
    const uoms = await Uom.findAll({ order: [['name', 'ASC']] });
    res.json(uoms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create new
router.post('/', async (req, res) => {
  try {
    const uom = await Uom.create(req.body);
    res.status(201).json(uom);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update
router.put('/:id', async (req, res) => {
  try {
    const uom = await Uom.findByPk(req.params.id);
    if (!uom) return res.status(404).json({ message: 'UOM not found' });
    await uom.update(req.body);
    res.json(uom);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    const uom = await Uom.findByPk(req.params.id);
    if (!uom) return res.status(404).json({ message: 'UOM not found' });
    await uom.destroy();
    res.json({ message: 'UOM deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
