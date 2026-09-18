const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

const anchor = `        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Mobile Sidebar Toggle Button */}`;

const bellUI = `        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Real-time Notification Center */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer flex items-center justify-center transition-all focus:outline-none shrink-0"
              title="مركز التنبيهات المباشرة"
            >
              <Bell className="w-4 h-4 text-slate-600" />
              {adminNotifications.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-bold w-4.5 h-4.5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                  {adminNotifications.length}
                </span>
              )}
            </button>

            {/* Dropdown for Notifications */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute left-0 sm:right-0 sm:left-auto top-full mt-3 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-50 text-right"
                >
                  <div className="bg-slate-900 px-4 py-3 flex justify-between items-center">
                    <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{adminNotifications.length} جديد</span>
                    <h3 className="text-white text-sm font-bold flex items-center gap-2">
                      <span>تنبيهات الإدارة المباشرة</span>
                      <BellRing className="w-4 h-4 text-amber-400" />
                    </h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto p-2 space-y-1 bg-slate-50">
                    {adminNotifications.length === 0 ? (
                      <p className="text-center py-6 text-xs text-slate-500 font-semibold">لا توجد تنبيهات جديدة</p>
                    ) : (
                      adminNotifications.map(notif => (
                        <div key={notif.id} className="p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-100 transition-colors cursor-default shadow-xs flex flex-col gap-1.5">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-mono text-slate-400">{notif.time.substring(11, 16)}</span>
                            <span className={\`text-[10px] font-bold px-2 py-0.5 rounded-md \${
                              notif.type === 'high_consumption' ? 'bg-amber-100 text-amber-700' :
                              notif.type === 'high_payment' ? 'bg-emerald-100 text-emerald-700' :
                              'bg-rose-100 text-rose-700'
                            }\`}>
                              {notif.type === 'high_consumption' ? 'استهلاك مرتفع' : notif.type === 'high_payment' ? 'قبض ضخم' : 'إيقاف ائتماني'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 font-medium leading-relaxed">{notif.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Sidebar Toggle Button */}`;

code = code.replace(anchor, bellUI);
fs.writeFileSync('src/components/AdminDashboard.tsx', code);
console.log('Bell UI added.');
