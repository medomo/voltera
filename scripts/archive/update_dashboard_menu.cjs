const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

// The inventory menu in the sidebar
const oldMenu = `<button
                      onClick={() => { setActiveSection('inventory'); setSidebarOpen(false); }}
                      className={\`flex items-center justify-end gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer \${
                        activeSection === 'inventory'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }\`}
                    >
                      <span>دليل الأصناف والحركات</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                    </button>`;

const newMenu = `<button
                      onClick={() => { setActiveSection('inventory-catalog'); setSidebarOpen(false); }}
                      className={\`flex items-center justify-end gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer \${
                        activeSection === 'inventory-catalog'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }\`}
                    >
                      <span>دليل الأصناف</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                    </button>
                    <button
                      onClick={() => { setActiveSection('inventory-transactions'); setSidebarOpen(false); }}
                      className={\`flex items-center justify-end gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer \${
                        activeSection === 'inventory-transactions'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }\`}
                    >
                      <span>حركات المستودع</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                    </button>
                    <button
                      onClick={() => { setActiveSection('inventory-alerts'); setSidebarOpen(false); }}
                      className={\`flex items-center justify-end gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer \${
                        activeSection === 'inventory-alerts'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }\`}
                    >
                      <span>الجرد والتنبيهات</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                    </button>`;

if (code.includes(oldMenu)) {
  code = code.replace(oldMenu, newMenu);
} else {
  console.log("Could not find oldMenu string!");
}

// Render AdminInventory
const oldRender = `{activeSection === 'inventory' && (
          <AdminInventory 
            inventory={inventory}
            inventoryTransactions={inventoryTransactions}
            onUpdateInventory={onUpdateInventory}
            onUpdateInventoryTransactions={onUpdateInventoryTransactions}
            currentUser={currentUser}
            logAction={logAction}
          />
        )}`;

const newRender = `{activeSection === 'inventory-catalog' && (
          <AdminInventory 
            activeTab="catalog"
            inventory={inventory}
            inventoryTransactions={inventoryTransactions}
            onUpdateInventory={onUpdateInventory}
            onUpdateInventoryTransactions={onUpdateInventoryTransactions}
            currentUser={currentUser}
            logAction={logAction}
          />
        )}
        {activeSection === 'inventory-transactions' && (
          <AdminInventory 
            activeTab="transactions"
            inventory={inventory}
            inventoryTransactions={inventoryTransactions}
            onUpdateInventory={onUpdateInventory}
            onUpdateInventoryTransactions={onUpdateInventoryTransactions}
            currentUser={currentUser}
            logAction={logAction}
          />
        )}
        {activeSection === 'inventory-alerts' && (
          <AdminInventory 
            activeTab="alerts"
            inventory={inventory}
            inventoryTransactions={inventoryTransactions}
            onUpdateInventory={onUpdateInventory}
            onUpdateInventoryTransactions={onUpdateInventoryTransactions}
            currentUser={currentUser}
            logAction={logAction}
          />
        )}`;

if (code.includes(oldRender)) {
  code = code.replace(oldRender, newRender);
} else {
  console.log("Could not find oldRender string!");
}

fs.writeFileSync('src/components/AdminDashboard.tsx', code);
