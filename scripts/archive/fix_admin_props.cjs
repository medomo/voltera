const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

const oldStr = `  onUpdateSettings,
  onUpdateUsers,
  onAddAuditLog,
  onResetDatabase`;

const newStr = `  onUpdateSettings,
  onUpdateUsers,
  onAddAuditLog,
  onResetDatabase,
  inventory,
  inventoryTransactions,
  onUpdateInventory,
  onUpdateInventoryTransactions`;

code = code.replace(oldStr, newStr);

fs.writeFileSync('src/components/AdminDashboard.tsx', code);
console.log('Fixed props destructuring.');
