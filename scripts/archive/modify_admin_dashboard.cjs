const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

// Add Import
code = code.replace(
  "import { AdminRoles } from './AdminRoles';",
  "import { AdminRoles } from './AdminRoles';\nimport { AdminInventory } from './AdminInventory';"
);
code = code.replace(
  "import { User, Subscriber, MeterReading, Payment, SystemSettings, AuditLog } from '../types';",
  "import { User, Subscriber, MeterReading, Payment, SystemSettings, AuditLog, InventoryItem, InventoryTransaction } from '../types';"
);

// Add props
code = code.replace(
  "auditLogs: AuditLog[];",
  "auditLogs: AuditLog[];\n  inventory: InventoryItem[];\n  inventoryTransactions: InventoryTransaction[];\n  onUpdateInventory: (items: InventoryItem[]) => void;\n  onUpdateInventoryTransactions: (txs: InventoryTransaction[]) => void;"
);

// Update destructuring
code = code.replace(
  "  onAddAuditLog",
  "  inventory,\n  inventoryTransactions,\n  onUpdateInventory,\n  onUpdateInventoryTransactions,\n  onAddAuditLog"
);

// Update ActiveSection type
code = code.replace(
  "type ActiveSection = 'dashboard' | 'subscribers' | 'reports' | 'debt' | 'zones' | 'roles' | 'admin-db' | 'admin-security' | 'admin-settings' | 'admin-postings' | 'admin-system' | 'admin-services' | 'sms-templates' | 'sms-subscriptions' | 'sms-send' | 'sms-failed';",
  "type ActiveSection = 'dashboard' | 'subscribers' | 'reports' | 'debt' | 'zones' | 'roles' | 'inventory' | 'admin-db' | 'admin-security' | 'admin-settings' | 'admin-postings' | 'admin-system' | 'admin-services' | 'sms-templates' | 'sms-subscriptions' | 'sms-send' | 'sms-failed';"
);

// Add sidebar link
const newLink = `            <button
              onClick={() => { setActiveSection('inventory'); setSidebarOpen(false); }}
              className={\`flex items-center justify-end gap-3 px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer \${
                activeSection === 'inventory'
                  ? 'bg-slate-800 text-white font-bold border-r-4 border-yellow-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }\`}
            >
              <span>المخزون والمستودع</span>
              <Package className="w-4 h-4 shrink-0" />
            </button>`;

code = code.replace(
  `            <button
              onClick={() => { setActiveSection('dashboard'); setSidebarOpen(false); }}`,
  `${newLink}\n            <button
              onClick={() => { setActiveSection('dashboard'); setSidebarOpen(false); }}`
);

// Render component
const renderInventory = `        {activeSection === 'inventory' && (
          <AdminInventory 
            inventory={inventory}
            inventoryTransactions={inventoryTransactions}
            onUpdateInventory={onUpdateInventory}
            onUpdateInventoryTransactions={onUpdateInventoryTransactions}
            currentUser={currentUser}
            logAction={logAction}
          />
        )}`;

code = code.replace(
  "{activeSection === 'reports' && (",
  `${renderInventory}\n\n        {activeSection === 'reports' && (`
);

fs.writeFileSync('src/components/AdminDashboard.tsx', code);
console.log('AdminDashboard updated.');
