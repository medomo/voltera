const fs = require('fs');
const code = fs.readFileSync('src/components/AdminInventory.tsx', 'utf8');
console.log(code.substring(0, 1500));
