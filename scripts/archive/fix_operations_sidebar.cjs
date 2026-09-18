const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

// 1. Update expandedMenus
code = code.replace(
  /const \[expandedMenus, setExpandedMenus\] = useState<Record<string, boolean>>\(\{\s+subscribers: true,\s+finance: true,\s+sms: false,\s+system: false,\s+inventory: false,\s+hr: false\s+\}\);/,
  `const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    subscribers: true,
    finance: true,
    sms: false,
    system: false,
    inventory: false,
    hr: false,
    operations: false
  });`
);

// 2. Add Sidebar Menu Item for Operations (Right after HR)
const hrMenu = `</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>`;

const operationsMenu = `
            {/* Group: Operations */}
            <div className="mt-2">
              <button
                onClick={() => toggleMenu('operations')}
                className="w-full flex items-center justify-between text-xs text-slate-400 font-bold px-2 py-2 mb-1 hover:text-slate-200 hover:bg-slate-800/30 rounded-lg transition-colors cursor-pointer focus:outline-none"
              >
                <span className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-orange-500" />
                  <span>العمليات والمناطق</span>
                </span>
                <ChevronDown className={\`w-3.5 h-3.5 transition-transform duration-200 \${expandedMenus.operations ? '' : 'rotate-90'}\`} />
              </button>
              
              <AnimatePresence>
                {expandedMenus.operations && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col gap-0.5 pr-3 border-r-2 border-slate-800/60 mr-2 overflow-hidden"
                  >
                    <button
                      onClick={() => { setActiveSection('operations-zones'); setSidebarOpen(false); }}
                      className={\`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer \${
                        activeSection === 'operations-zones'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }\`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>المناطق والمحولات</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('operations-requests'); setSidebarOpen(false); }}
                      className={\`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer \${
                        activeSection === 'operations-requests'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }\`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>الطلبات الفنية</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>`;

// Since hrMenu string is matched, we might have multiple matches, so let's use a regex that matches the exact HR menu block end.
// We can just append it after the HR block. We'll find a unique string in the HR block.
const hrMenuFind = `<span>الرواتب والسلف</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>`;

code = code.replace(hrMenuFind, hrMenuFind + operationsMenu);

// 3. Render AdminOperations in main content area
const addImport = `import { AdminOperations } from './AdminOperations';`;
code = code.replace(`import { AdminZones } from "./AdminZones";`, addImport);

// Replace the old AdminZones render with AdminOperations
const oldRender = `{activeSection === 'zones' && (
              <AdminZones subscribers={subscribers} settings={settings} onUpdateSettings={onUpdateSettings} />
            )}`;

const newRender = `
            {activeSection === 'operations-zones' && (
              <AdminOperations subscribers={subscribers} settings={settings} currentUser={currentUser} onUpdateSettings={onUpdateSettings} activeTab="zones" />
            )}
            {activeSection === 'operations-requests' && (
              <AdminOperations subscribers={subscribers} settings={settings} currentUser={currentUser} onUpdateSettings={onUpdateSettings} activeTab="requests" />
            )}
`;

code = code.replace(oldRender, newRender);

// Wait, the sidebar item for 'zones' might still exist in the "subscribers" menu group.
// Let's remove the old 'zones' menu item if it exists.
const oldZoneMenu = `<button
                      onClick={() => { setActiveSection('zones'); setSidebarOpen(false); }}
                      className={\`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer \${
                        activeSection === 'zones'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }\`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>إدارة المناطق</span>
                    </button>`;
code = code.replace(oldZoneMenu, '');

fs.writeFileSync('src/components/AdminDashboard.tsx', code);
