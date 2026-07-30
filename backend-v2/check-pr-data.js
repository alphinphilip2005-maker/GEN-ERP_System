const { PurchaseRequest, User } = require('./models');

async function checkData() {
  try {
    const prs = await PurchaseRequest.findAll({
      limit: 10,
      include: [{ model: User, as: 'Requester' }]
    });
    
    console.log('--- LATEST 10 PRs ---');
    prs.forEach(pr => {
      console.log(`ID: ${pr.id}, No: ${pr.pr_no}, Dept: ${pr.department}, Req: ${pr.Requester?.name} (${pr.Requester?.email})`);
    });
    
    const users = await User.findAll({
      where: { email: ['ashiktomy155@generp.com', 'alphinphilip@generp.com'] }
    });
    
    console.log('\n--- USERS ---');
    users.forEach(u => {
      console.log(`ID: ${u.id}, Name: ${u.name}, Email: ${u.email}, Dept: ${u.department}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkData();
