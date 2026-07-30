const { Module } = require('./models');

async function run() {
  const list = await Module.findAll();
  console.log('--- CURRENT MODULES ---');
  list.forEach(m => console.log(`ID ${m.id}: "${m.module_name}"`));
  console.log('-----------------------');
  process.exit(0);
}
run();
