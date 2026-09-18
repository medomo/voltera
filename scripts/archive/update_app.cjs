const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Imports
code = code.replace(
  "import { User, Subscriber, MeterReading, Payment, SystemSettings, AuditLog } from './types';",
  "import { User, Subscriber, MeterReading, Payment, SystemSettings, AuditLog, InventoryItem, InventoryTransaction } from './types';"
);

code = code.replace(
  "INITIAL_PAYMENTS, DEFAULT_SETTINGS, INITIAL_AUDIT_LOGS } from './initialData';",
  "INITIAL_PAYMENTS, DEFAULT_SETTINGS, INITIAL_AUDIT_LOGS, INITIAL_INVENTORY, INITIAL_INVENTORY_TRANSACTIONS } from './initialData';"
);

// State
const stateOld = "  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);";
const stateNew = "  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);\n  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);\n  const [inventoryTransactions, setInventoryTransactions] = useState<InventoryTransaction[]>(INITIAL_INVENTORY_TRANSACTIONS);";
code = code.replace(stateOld, stateNew);

// Admin Props
const adminPropsOld = "settings={settings}";
const adminPropsNew = "settings={settings}\n        inventory={inventory}\n        inventoryTransactions={inventoryTransactions}\n        onUpdateInventory={setInventory}\n        onUpdateInventoryTransactions={setInventoryTransactions}";
code = code.replace(adminPropsOld, adminPropsNew);

fs.writeFileSync('src/App.tsx', code);
console.log('App.tsx updated.');
