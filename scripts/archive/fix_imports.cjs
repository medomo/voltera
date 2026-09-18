const fs = require('fs');
let codeApp = fs.readFileSync('src/App.tsx', 'utf8');

if (!codeApp.includes("INITIAL_INVENTORY")) {
  codeApp = codeApp.replace(
    "INITIAL_PAYMENTS, DEFAULT_SETTINGS, INITIAL_AUDIT_LOGS } from './initialData';",
    "INITIAL_PAYMENTS, DEFAULT_SETTINGS, INITIAL_AUDIT_LOGS, INITIAL_INVENTORY, INITIAL_INVENTORY_TRANSACTIONS } from './initialData';"
  );
}

fs.writeFileSync('src/App.tsx', codeApp);

let codeAdmin = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

if (!codeAdmin.includes("import { AdminInventory } from")) {
  codeAdmin = "import { AdminInventory } from './AdminInventory';\n" + codeAdmin;
}

fs.writeFileSync('src/components/AdminDashboard.tsx', codeAdmin);
console.log('Fixed all imports manually.');
