const { Notification } = require('../models');

async function checkNotifs() {
  const notifs = await Notification.findAll({
    where: { user_id: [7, 11] },
    order: [['created_at', 'DESC']]
  });
  console.log(JSON.stringify(notifs, null, 2));
}

checkNotifs().catch(console.error).finally(() => process.exit());
