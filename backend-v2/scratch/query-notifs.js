const { Notification } = require('../models');

async function checkNotifs() {
  const notifs = await Notification.findAll({
    order: [['created_at', 'DESC']],
    limit: 5
  });
  console.log(JSON.stringify(notifs, null, 2));
}

checkNotifs().catch(console.error).finally(() => process.exit());
