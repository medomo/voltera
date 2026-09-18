const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "  INITIAL_PAYMENTS, DEFAULT_SETTINGS, INITIAL_AUDIT_LOGS } from './initialData';",
  "  INITIAL_PAYMENTS, DEFAULT_SETTINGS, INITIAL_AUDIT_LOGS, INITIAL_INVENTORY, INITIAL_INVENTORY_TRANSACTIONS } from './initialData';"
);

fs.writeFileSync('src/App.tsx', code);
