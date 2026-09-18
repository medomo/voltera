const fs = require('fs');
let code = fs.readFileSync('src/components/AdminAccounting.tsx', 'utf8');

code = code.replace(/  \]\);/g, "  ];\n  });");
fs.writeFileSync('src/components/AdminAccounting.tsx', code);
