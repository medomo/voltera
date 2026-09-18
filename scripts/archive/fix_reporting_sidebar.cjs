const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

// 1. Update expandedMenus
code = code.replace(
  /const \[expandedMenus, setExpandedMenus\] = useState<Record<string, boolean>>\(\{\s+subscribers: true,\s+finance: true,\s+sms: false,\s+system: false,\s+inventory: false,\s+hr: false,\s+operations: false\s+\}\);/,
  `const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    subscribers: true,
    finance: true,
    sms: false,
    system: false,
    inventory: false,
    hr: false,
    operations: false,
    reporting: false
  });`
);

// 2. Add Sidebar Menu Item for Reporting (Right after Operations)
const operationsMenuFind = `<span>الطلبات الفنية</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>`;

const reportingMenu = `
            {/* Group: Reporting */}
            <div className="mt-2">
              <button
                onClick={() => toggleMenu('reporting')}
                className="w-full flex items-center justify-between text-xs text-slate-400 font-bold px-2 py-2 mb-1 hover:text-slate-200 hover:bg-slate-800/30 rounded-lg transition-colors cursor-pointer focus:outline-none"
              >
                <span className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-pink-500" />
                  <span>وحدة التقارير الشاملة</span>
                </span>
                <ChevronDown className={\`w-3.5 h-3.5 transition-transform duration-200 \${expandedMenus.reporting ? '' : 'rotate-90'}\`} />
              </button>
              
              <AnimatePresence>
                {expandedMenus.reporting && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col gap-0.5 pr-3 border-r-2 border-slate-800/60 mr-2 overflow-hidden"
                  >
                    <button
                      onClick={() => { setActiveSection('reporting-financial'); setSidebarOpen(false); }}
                      className={\`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer \${
                        activeSection === 'reporting-financial'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }\`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>تقارير مالية</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('reporting-consumption'); setSidebarOpen(false); }}
                      className={\`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer \${
                        activeSection === 'reporting-consumption'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }\`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>تقارير استهلاك</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('reporting-inventory'); setSidebarOpen(false); }}
                      className={\`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer \${
                        activeSection === 'reporting-inventory'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }\`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>تقارير الجرد</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('reporting-statements'); setSidebarOpen(false); }}
                      className={\`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer \${
                        activeSection === 'reporting-statements'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }\`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>كشوف الحسابات</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>`;

code = code.replace(operationsMenuFind, operationsMenuFind + reportingMenu);

// 3. Render AdminReports in main content area
// Replace the old AdminReports render
const oldRender = `{activeSection === 'reports' && (
              <AdminReports subscribers={subscribers} readings={readings} payments={payments} settings={settings} />
            )}`;

const newRender = `
            {activeSection === 'reporting-financial' && (
              <AdminReports subscribers={subscribers} readings={readings} payments={payments} settings={settings} inventory={inventory} inventoryTransactions={inventoryTransactions} activeTab="financial" />
            )}
            {activeSection === 'reporting-consumption' && (
              <AdminReports subscribers={subscribers} readings={readings} payments={payments} settings={settings} inventory={inventory} inventoryTransactions={inventoryTransactions} activeTab="consumption" />
            )}
            {activeSection === 'reporting-inventory' && (
              <AdminReports subscribers={subscribers} readings={readings} payments={payments} settings={settings} inventory={inventory} inventoryTransactions={inventoryTransactions} activeTab="inventory" />
            )}
            {activeSection === 'reporting-statements' && (
              <AdminReports subscribers={subscribers} readings={readings} payments={payments} settings={settings} inventory={inventory} inventoryTransactions={inventoryTransactions} activeTab="statements" />
            )}
`;

code = code.replace(oldRender, newRender);

// Wait, the sidebar item for 'reports' might still exist in some top section. Let's remove it.
const oldReportMenu = `<button
                      onClick={() => { setActiveSection('reports'); setSidebarOpen(false); }}
                      className={\`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer \${
                        activeSection === 'reports'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }\`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>التقارير المتقدمة</span>
                    </button>`;
code = code.replace(oldReportMenu, '');

fs.writeFileSync('src/components/AdminDashboard.tsx', code);
