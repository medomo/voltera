const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

// 1. Update expandedMenus
code = code.replace(
  /const \[expandedMenus, setExpandedMenus\] = useState<Record<string, boolean>>\(\{\s+subscribers: true,\s+finance: true,\s+sms: false,\s+system: false,\s+inventory: false\s+\}\);/,
  `const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    subscribers: true,
    finance: true,
    sms: false,
    system: false,
    inventory: false,
    hr: false
  });`
);

// 2. Add Sidebar Menu Item for HR (Right after Inventory)
const inventoryMenu = `</button>
                    <button
                      onClick={() => { setActiveSection('inventory-alerts'); setSidebarOpen(false); }}
                      className={\`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer \${
                        activeSection === 'inventory-alerts'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }\`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>الجرد والتنبيهات</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>`;

const hrMenu = `
            {/* Group: HR */}
            <div className="mt-2">
              <button
                onClick={() => toggleMenu('hr')}
                className="w-full flex items-center justify-between text-xs text-slate-400 font-bold px-2 py-2 mb-1 hover:text-slate-200 hover:bg-slate-800/30 rounded-lg transition-colors cursor-pointer focus:outline-none"
              >
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-500" />
                  <span>وحدة الموارد البشرية (HR)</span>
                </span>
                <ChevronDown className={\`w-3.5 h-3.5 transition-transform duration-200 \${expandedMenus.hr ? '' : 'rotate-90'}\`} />
              </button>
              
              <AnimatePresence>
                {expandedMenus.hr && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col gap-0.5 pr-3 border-r-2 border-slate-800/60 mr-2 overflow-hidden"
                  >
                    <button
                      onClick={() => { setActiveSection('hr-employees'); setSidebarOpen(false); }}
                      className={\`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer \${
                        activeSection === 'hr-employees'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }\`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>ملفات الموظفين</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('hr-payroll'); setSidebarOpen(false); }}
                      className={\`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer \${
                        activeSection === 'hr-payroll'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }\`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>الرواتب والسلف</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>`;

code = code.replace(inventoryMenu, inventoryMenu + hrMenu);

// 3. Render AdminHR in main content area
const addImport = `import { AdminInventory } from './AdminInventory';\nimport { AdminHR } from './AdminHR';`;
code = code.replace(`import { AdminInventory } from './AdminInventory';`, addImport);

const inventoryRender = `{activeSection === 'inventory-alerts' && (
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

const hrRender = `
        {activeSection === 'hr-employees' && (
          <AdminHR 
            settings={settings}
            currentUser={currentUser}
            activeTab="employees"
          />
        )}
        {activeSection === 'hr-payroll' && (
          <AdminHR 
            settings={settings}
            currentUser={currentUser}
            activeTab="payroll"
          />
        )}`;

code = code.replace(inventoryRender, inventoryRender + hrRender);

fs.writeFileSync('src/components/AdminDashboard.tsx', code);
