const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

// Update state
code = code.replace(
  "sms: false,\n    system: false\n  });",
  "sms: false,\n    system: false,\n    inventory: false\n  });"
);

// Replace Inventory standalone link with Group
const oldInventoryStr = `            {/* Standalone Link: Inventory */}
            <div className="mt-2">
              <button
                onClick={() => { setActiveSection('inventory'); setSidebarOpen(false); }}
                className={\`flex items-center justify-end gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer \${
                  activeSection === 'inventory'
                    ? 'bg-amber-500/15 text-amber-400 font-bold border-r-2 border-amber-400 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }\`}
              >
                <span>المخزون والمستودعات</span>
                <Package className={\`w-4.5 h-4.5 shrink-0 \${activeSection === 'inventory' ? 'text-amber-400' : 'text-purple-400'}\`} />
              </button>
            </div>`;

const newInventoryStr = `            {/* Group: Inventory */}
            <div className="mt-2">
              <button
                onClick={() => toggleMenu('inventory')}
                className="w-full flex items-center justify-between text-xs text-slate-400 font-bold px-2 py-2 mb-1 hover:text-slate-200 hover:bg-slate-800/30 rounded-lg transition-colors cursor-pointer focus:outline-none"
              >
                <ChevronDown className={\`w-3.5 h-3.5 transition-transform duration-200 \${expandedMenus.inventory ? '' : '-rotate-90'}\`} />
                <span className="flex items-center gap-2">
                  <span>المخزون والمستودع</span>
                  <Package className="w-4 h-4 text-purple-500" />
                </span>
              </button>
              
              <AnimatePresence>
                {expandedMenus.inventory && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col gap-0.5 pr-3 border-r-2 border-slate-800/60 mr-2 overflow-hidden"
                  >
                    <button
                      onClick={() => { setActiveSection('inventory'); setSidebarOpen(false); }}
                      className={\`flex items-center justify-end gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer \${
                        activeSection === 'inventory'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }\`}
                    >
                      <span>دليل الأصناف والحركات</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>`;

code = code.replace(oldInventoryStr, newInventoryStr);

fs.writeFileSync('src/components/AdminDashboard.tsx', code);
