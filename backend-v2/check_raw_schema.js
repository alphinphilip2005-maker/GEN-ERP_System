const sequelize = require('./db');

async function checkSchema() {
  try {
    const [results] = await sequelize.query("SELECT COLUMN_NAME, IS_NULLABLE, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'grnitems'");
    console.log('RAW GRNITEMS SCHEMA:');
    console.log(JSON.stringify(results, null, 2));

    const [rejection] = await sequelize.query("SELECT COLUMN_NAME, IS_NULLABLE, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MaterialRejections'");
    console.log('\nRAW MATERIAL REJECTIONS SCHEMA:');
    console.log(JSON.stringify(rejection, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

checkSchema();
