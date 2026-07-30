const express = require('express');
const router = express.Router();
const { Item } = require('../models');
const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

// Multer config for Excel uploads
const upload = multer({ dest: 'uploads/' });

// Get all items
const { Stock } = require('../models');
router.get('/', async (req, res) => {
  try {
    const { location, project_name } = req.query;

    // 1. Fetch base items
    const items = await Item.findAll({ 
      order: [['created_at', 'DESC']] 
    });

    // 2. Iteratively synthesize stock for user modal browser with runtime summation!
    const result = [];
    for (const it of items) {
      const itemJson = it.toJSON();
      
      const stockWhere = { item_id: it.id };
      if (location) stockWhere.location = location;
      if (project_name) stockWhere.project_name = project_name;

      const rawSum = await Stock.sum('quantity', { where: stockWhere });
      
      // Map legacy property shape expected by frontend logic
      itemJson.Stock = {
        quantity: parseFloat(rawSum) || 0
      };
      
      result.push(itemJson);
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single item
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Check if item code exists
router.get('/check-code/:code', async (req, res) => {
    try {
      const item = await Item.findOne({ where: { item_code: req.params.code } });
      res.json({ exists: !!item });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });


// Create single item
router.post('/', async (req, res) => {
  try {
    const item = await Item.create(req.body);
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update item
router.put('/:id', async (req, res) => {
  try {
    const item = await Item.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    await item.update(req.body);
    res.json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete item
router.delete('/:id', async (req, res) => {
  try {
    const item = await Item.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    await item.destroy();
    res.json({ message: 'Item deleted' });
  } catch (err) {
    if (err.name === 'SequelizeForeignKeyConstraintError' || err.message.includes('foreign key constraint fails')) {
      return res.status(400).json({ 
        message: 'Cannot delete this item because it is currently used in a Bill of Materials (BOM) or other records. Please remove it from those records first.' 
      });
    }
    res.status(500).json({ message: err.message });
  }
});

// Excel Upload
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    // Map Excel columns to database fields and track row numbers
    const rawItems = data.map((row, index) => ({
      item_code: String(row['Item Code'] || row['item_code'] || '').trim(),
      item_name: String(row['Item Name'] || row['item_name'] || '').trim(),
      description: row['Description'] || row['description'] || '',
      category: row['Category'] || row['category'] || 'General',
      uom: row['UOM'] || row['uom'] || 'PCS',
      brand: row['Brand'] || row['brand'] || '',
      material: row['Material'] || row['Material Type'] || row['material'] || '',
      rowNumber: index + 2 // Assuming header is Row 1
    })).filter(item => item.item_code && item.item_name);

    if (rawItems.length === 0) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'No valid items found in Excel' });
    }

    // 1. Identify internal duplicates within the Excel file
    const uniqueInExcel = [];
    const seenCodes = new Map(); // code -> firstRowNumber
    const internalDuplicateRows = [];

    for (const item of rawItems) {
      if (!seenCodes.has(item.item_code)) {
        seenCodes.set(item.item_code, item.rowNumber);
        uniqueInExcel.push(item);
      } else {
        internalDuplicateRows.push(item.rowNumber);
      }
    }

    // 2. Identify items already in the database
    const existingItems = await Item.findAll({
      where: { item_code: uniqueInExcel.map(i => i.item_code) },
      attributes: ['item_code']
    });
    const existingCodes = new Set(existingItems.map(i => i.item_code));
    
    const itemsToCreate = [];
    const systemDuplicateRows = [];

    for (const item of uniqueInExcel) {
      if (existingCodes.has(item.item_code)) {
        systemDuplicateRows.push(item.rowNumber);
      } else {
        itemsToCreate.push(item);
      }
    }

    const totalSkipped = internalDuplicateRows.length + systemDuplicateRows.length;

    if (itemsToCreate.length === 0) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.json({ 
        message: `No new items were added. All valid items in the file were already in the system.`,
        added: 0,
        skipped: totalSkipped,
        internalDuplicates: internalDuplicateRows,
        systemDuplicates: systemDuplicateRows
      });
    }

    const createdItems = await Item.bulkCreate(itemsToCreate);
    
    // Clean up uploaded file
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    res.json({ 
      message: `${createdItems.length} items successfully imported.`,
      added: createdItems.length,
      skipped: totalSkipped,
      internalDuplicates: internalDuplicateRows,
      systemDuplicates: systemDuplicateRows
    });

  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: 'Error processing Excel file: ' + err.message });
  }
});

module.exports = router;
