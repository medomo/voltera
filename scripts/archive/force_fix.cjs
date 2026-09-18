const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
    /INITIAL_AUDIT_LOGS[\s\n\r]*\}[\s\n\r]*from[\s\n\r]*'\.\/initialData';/m,
    "INITIAL_AUDIT_LOGS, INITIAL_INVENTORY, INITIAL_INVENTORY_TRANSACTIONS } from './initialData';"
);

fs.writeFileSync('src/App.tsx', code);
