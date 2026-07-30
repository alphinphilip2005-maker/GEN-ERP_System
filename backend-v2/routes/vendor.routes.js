const express = require('express');
const router = express.Router();
const { Vendor } = require('../models');

// Get all vendors
router.get('/', async (req, res) => {
  try {
    const vendors = await Vendor.findAll({ order: [['created_at', 'DESC']] });
    res.json(vendors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single vendor
router.get('/:id', async (req, res) => {
  try {
    const vendor = await Vendor.findByPk(req.params.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    res.json(vendor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Check if vendor code exists
router.get('/check-code/:code', async (req, res) => {
  try {
    const vendor = await Vendor.findOne({ where: { vendor_code: req.params.code } });
    res.json({ exists: !!vendor });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create vendor
router.post('/', async (req, res) => {
  try {
    const vendor = await Vendor.create(req.body);
    res.status(201).json(vendor);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update vendor
router.put('/:id', async (req, res) => {
  try {
    const vendor = await Vendor.findByPk(req.params.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    await vendor.update(req.body);
    res.json(vendor);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete vendor
router.delete('/:id', async (req, res) => {
  try {
    const vendor = await Vendor.findByPk(req.params.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    await vendor.destroy();
    res.json({ message: 'Vendor deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
