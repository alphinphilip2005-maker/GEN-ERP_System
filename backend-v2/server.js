// @ts-nocheck
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./db');
const { User, Module, Permission } = require('./models');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const moduleRoutes = require('./routes/module.routes');

const itemRoutes = require('./routes/item.routes');
const itemCategoryRoutes = require('./routes/item-category.routes');
const uomRoutes = require('./routes/uom.routes');
const projectRoutes = require('./routes/project.routes');
const vendorRoutes = require('./routes/vendor.routes');
const bomRoutes = require('./routes/bom.routes');
const notificationRoutes = require('./routes/notification.routes');
const purchaseRequestRoutes = require('./routes/purchase-request.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const quoteRoutes = require('./routes/quote.routes');
const poRoutes = require('./routes/po.routes');
const grnRoutes = require('./routes/grn.routes');
const uploadRoutes = require('./routes/upload.routes');
const mrnRoutes = require('./routes/mrn.routes');
const paymentRoutes = require('./routes/payment.routes');
const materialRejectionRoutes = require('./routes/material-rejection.routes');

const path = require('path');

const app = express();

// Ensure uploads directory exists
const fs = require('fs');
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/item-categories', itemCategoryRoutes);
app.use('/api/uom', uomRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/boms', bomRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/purchase-requests', purchaseRequestRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/po', poRoutes);
app.use('/api/grn', grnRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/mrn', mrnRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/material-rejections', materialRejectionRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.send('Gen ERP Backend V2 is running.');
});

// Sync database and start server
const PORT = Number(process.env.PORT) || 3000;
const MODULES = [
  'Item Master',
  'Item Category',
  'UOM Master',
  'Project Master',
  'Vendor Master',
  'BOM',
  'Purchase Request',
  'Quotation Management',
  'Purchase Order',
  'GRN',
  'IQC',
  'Inventory',
  'MRN',
  'Payment Management',
  'Material Rejection Log'
];

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use.`);
      console.error('Another backend instance is probably already running on this port.');
      console.error(`Stop the existing process or start this server on a different port, for example: set PORT=${port + 1} && node server.js`);
      process.exit(1);
    }

    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

sequelize.sync().then(async () => {
  console.log('Database synced via Sequelize.');

  // Seed modules if none exist
  const count = await Module.count();
  if (count === 0) {
    await Module.bulkCreate(MODULES.map(name => ({ module_name: name })));
    console.log('Seeded', MODULES.length, 'modules.');
  }

  // Seed a default admin user if none exist
  const userCount = await User.count();
  if (userCount === 0) {
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash('Admin@123', 10);
    await User.create({
      name: 'Admin User',
      email: 'admin@generp.com',
      password_hash: hash,
      employee_id: 'EMP001',
      designation: 'Administrator',
      department: 'IT',
      role: 'admin'
    });
    console.log('Seeded default admin: admin@generp.com / Admin@123');
  }

  // Seed Item Categories if none exist
  const { ItemCategory } = require('./models');
  const catCount = await ItemCategory.count();
  if (catCount === 0) {
    const CATEGORIES = [
      'Assembly component', 'Cables and wires', 'PCB Component', 'ACCESSORY',
      'Production Consumable', 'Product consumable', 'TOOL', 'ASSEMBLY ITEMS',
      'PRODUCTION CONSUMABLES', 'FASTNERS', 'PNEUMATIC ITEM', 'PRODUCT CONSUMBLES',
      'MACHINING', 'STRUCTURAL ITEM', 'LASERCUT', 'SHEET METAL', 'HYDRAULICS ITEM',
      'PACKING MATERIAL', 'Mechanical', 'Electronics', 'ELECTRONICS/ MECHANICAL',
      'Elctronics'
    ];
    await ItemCategory.bulkCreate(CATEGORIES.map(name => ({ name })));
    console.log(`Seeded ${CATEGORIES.length} default Item Categories.`);
  }

  // Seed UOMs if none exist
  const { Uom } = require('./models');
  const uomCount = await Uom.count();
  if (uomCount === 0) {
    const UOMS = ['PCS', 'KG', 'MTR', 'LTR', 'BOX', 'SET', 'PKT', 'ROLL', 'Nos'];
    await Uom.bulkCreate(UOMS.map(name => ({ name })));
    console.log(`Seeded ${UOMS.length} default UOMs.`);
  }

  startServer(PORT);
}).catch(err => {
  console.error('Unable to connect to the database:', err);
});
