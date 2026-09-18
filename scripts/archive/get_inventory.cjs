const fs = require('fs');
const code = fs.readFileSync('src/components/AdminInventory.tsx', 'utf8');
console.log(code.substring(1500, 3000));
