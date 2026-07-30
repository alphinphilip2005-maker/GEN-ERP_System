const fs = require('fs');
const content = fs.readFileSync('c:/Users/uiuxg/Antigravity/erp-frontend/src/app/pages/bom-detail/bom-detail.component.ts', 'utf8');
let openCount = 0;
let closeCount = 0;
for (let i = 0; i < content.length; i++) {
  if (content[i] === '{') openCount++;
  if (content[i] === '}') closeCount++;
  if (openCount === closeCount && openCount > 0) {
    console.log(`Braces balanced at character ${i}, line ${content.substring(0, i).split('\n').length}`);
  }
}
console.log(`Total open: ${openCount}, Total close: ${closeCount}`);
