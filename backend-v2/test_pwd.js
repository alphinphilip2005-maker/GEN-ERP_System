const { Sequelize } = require('sequelize');

async function testConnection(password) {
  const sequelize = new Sequelize('gen_erp_v2', 'root', password, {
    host: 'localhost',
    dialect: 'mysql',
    logging: false
  });
  try {
    await sequelize.authenticate();
    console.log(`Success with password: "${password}"`);
    return true;
  } catch (err) {
    console.log(`Failed with password: "${password}" - ${err.message}`);
    return false;
  }
}

async function run() {
  await testConnection('');
  await testConnection('root');
  await testConnection('password');
  await testConnection('Genrobotic@123');
  process.exit();
}
run();
