const dept = "R&D";
const desig = "Project Lead";
const email = "alphinphilip@generp.com";

const userDept = dept.toLowerCase();
const userDesignation = desig.toLowerCase();
const userEmail = email.toLowerCase();

const isRnDUser = /r.*d|research/i.test(userDept) || /r.*d|research/i.test(userDesignation) || 
                  userEmail.includes('ashik') || userEmail.includes('alphin');

console.log('isRnDUser:', isRnDUser);
process.exit();
