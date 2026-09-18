const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /INITIAL_AUDIT_LOGS \} from '\.\/initialData';/g,
  "INITIAL_AUDIT_LOGS, INITIAL_INVENTORY, INITIAL_INVENTORY_TRANSACTIONS } from './initialData';"
);

fs.writeFileSync('src/App.tsx', code);
console.log('App.tsx fixed imports.');
