const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  { host: process.env.DB_HOST, dialect: 'mysql', logging: false }
);

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database.');

    const qi = sequelize.getQueryInterface();

    // Check and add mrn_type
    try {
      await qi.addColumn('Mrns', 'mrn_type', {
        type: Sequelize.ENUM('Store', 'Project_Transfer'),
        allowNull: false,
        defaultValue: 'Store'
      });
      console.log('✅ Added: mrn_type');
    } catch (e) { console.log('⚠️  mrn_type already exists or error:', e.message); }

    // Check and add from_project_id
    try {
      await qi.addColumn('Mrns', 'from_project_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Projects', key: 'id' }
      });
      console.log('✅ Added: from_project_id');
    } catch (e) { console.log('⚠️  from_project_id already exists or error:', e.message); }

    // Check and add to_project_id
    try {
      await qi.addColumn('Mrns', 'to_project_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Projects', key: 'id' }
      });
      console.log('✅ Added: to_project_id');
    } catch (e) { console.log('⚠️  to_project_id already exists or error:', e.message); }

    // Check and add store_location
    try {
      await qi.addColumn('Mrns', 'store_location', {
        type: Sequelize.STRING,
        allowNull: true
      });
      console.log('✅ Added: store_location');
    } catch (e) { console.log('⚠️  store_location already exists or error:', e.message); }

    console.log('\n✅ Migration complete! Restart the backend server now.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
