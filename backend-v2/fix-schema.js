const sequelize = require('./db');

async function fixSchema() {
  try {
    const [results] = await sequelize.query("PRAGMA table_info(Notifications)");
    const hasTitle = results.some(col => col.name === 'title');
    
    if (!hasTitle) {
      console.log("Adding 'title' column to Notifications table...");
      await sequelize.query("ALTER TABLE Notifications ADD COLUMN title VARCHAR(255)");
      console.log("Column added successfully.");
    } else {
      console.log("'title' column already exists.");
    }
    
    process.exit(0);
  } catch (err) {
    console.error("Error fixing schema:", err);
    process.exit(1);
  }
}

fixSchema();
