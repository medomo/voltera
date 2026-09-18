const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

const targetLedgerStart = `                {/* Account Ledger Statements (كشف حساب المشترك التاريخي) */}
                {selectedSubForLedger && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 flex flex-col gap-4 text-right"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <button
                        onClick={() => setSelectedSubForLedger(null)}
                        className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 p-1.5 rounded-xl transition-all"
                      >
                        إغلاق الكشف
                      </button>
                      <h3 className="text-sm font-bold text-slate-200">
                        كشف الحساب المالي للمشترك: <span className="text-cyan-400">{selectedSubForLedger.name}</span>
                      </h3>
                    </div>`;

const improvedLedgerStart = `                {/* Account Ledger Statements (كشف حساب المشترك التاريخي) */}
                {selectedSubForLedger && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-slate-900/50 rounded-2xl border border-slate-800 p-6 flex flex-col gap-4 text-right overflow-hidden relative shadow-2xl ring-1 ring-white/5"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-amber-500 to-rose-500"></div>
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                      <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedSubForLedger(null)}
                            className="bg-slate-950 hover:bg-rose-950/50 hover:text-rose-400 border border-slate-800 text-slate-400 p-1.5 px-3 rounded-xl transition-all text-xs font-bold flex items-center gap-2"
                          >
                            <span>إغلاق</span>
                            <UserX className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                                logAction('طباعة كشف حساب', \`طباعة كشف حساب للمشترك \${selectedSubForLedger.name}\`);
                                alert('جاري تجهيز كشف الحساب للطباعة...');
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 px-3 rounded-xl transition-all text-xs font-bold flex items-center gap-2"
                          >
                            <span>طباعة الكشف</span>
                            <Printer className="w-4 h-4" />
                          </button>
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-white">
                            كشف الحساب المالي والتاريخي
                        </h3>
                        <p className="text-sm text-slate-400 mt-1">
                            المشترك: <span className="text-cyan-400 font-bold">{selectedSubForLedger.name}</span> | العداد: <span className="text-amber-400 font-mono">{selectedSubForLedger.meterNumber}</span>
                        </p>
                      </div>
                    </div>
                    
                    {/* Financial Summary Strip */}
                    <div className="grid grid-cols-3 gap-4 bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 my-2">
                        <div className="flex flex-col items-center justify-center border-l border-slate-800">
                            <span className="text-slate-500 text-[10px] font-bold mb-1">إجمالي الفواتير الصادرة</span>
                            <span className="text-rose-400 font-mono font-black text-lg">
                                {readings.filter(r => r.subscriberId === selectedSubForLedger.id).reduce((sum, r) => sum + r.totalAmount, 0).toLocaleString()} {settings.currency}
                            </span>
                        </div>
                        <div className="flex flex-col items-center justify-center border-l border-slate-800">
                            <span className="text-slate-500 text-[10px] font-bold mb-1">إجمالي المدفوعات المستلمة</span>
                            <span className="text-emerald-400 font-mono font-black text-lg">
                                {payments.filter(p => p.subscriberId === selectedSubForLedger.id).reduce((sum, p) => sum + p.amountPaid, 0).toLocaleString()} {settings.currency}
                            </span>
                        </div>
                        <div className="flex flex-col items-center justify-center">
                            <span className="text-slate-500 text-[10px] font-bold mb-1">الرصيد النهائي المستحق</span>
                            <span className={\`font-mono font-black text-xl \${selectedSubForLedger.currentBalance > 0 ? 'text-rose-500' : 'text-emerald-500'}\`}>
                                {selectedSubForLedger.currentBalance.toLocaleString()} {settings.currency}
                            </span>
                        </div>
                    </div>
                    `;

if (code.includes('                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">')) {
  code = code.replace(targetLedgerStart, improvedLedgerStart);
  fs.writeFileSync('src/components/AdminDashboard.tsx', code);
  console.log('Ledger updated.');
} else {
  console.log('Target string not found.');
}
