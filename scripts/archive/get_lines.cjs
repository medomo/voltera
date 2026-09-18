const fs = require('fs');
const lines = fs.readFileSync('src/components/AdminInventory.tsx', 'utf8').split('\n');
console.log(lines.slice(180, 260).join('\n'));
