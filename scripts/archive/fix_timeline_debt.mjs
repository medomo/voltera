import fs from 'fs';

let content = fs.readFileSync('src/components/AdminSubscribers.tsx', 'utf8');

// 1. Update the table row for debt indicators
const oldTr = /<tr key=\{sub\.id\} className="hover:bg-slate-900\/50 transition-all cursor-pointer">/g;
const newTr = `<tr key={sub.id} className={\`transition-all cursor-pointer \${sub.currentBalance > 50000 ? 'bg-rose-950/20 hover:bg-rose-950/40 border-r-2 border-r-rose-500' : sub.currentBalance > 10000 ? 'bg-amber-950/10 hover:bg-amber-950/30 border-r-2 border-r-amber-500' : 'hover:bg-slate-900/50 border-r-2 border-r-transparent'}\`}>`;
content = content.replace(oldTr, newTr);

// 2. Add Timeline section in the profile modal
const transactionsLedgerRegex = /\{\/\* Transactions Ledger \*\/\}/;

const timelineSection = `                {/* Subscriber Timeline */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-white border-b border-slate-800 pb-2">سجل الأحداث (الخط الزمني)</h4>
                  <div className="relative border-r border-slate-800 pr-4 space-y-6 before:absolute before:inset-y-0 before:right-0 before:w-px before:bg-slate-800">
                    
                    {/* Latest Status Event */}
                    {selectedProfile.status === 'suspended' && (
                      <div className="relative">
                        <span className="absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-slate-950"></span>
                        <div className="bg-rose-950/20 border border-rose-900/30 rounded-lg p-3">
                          <p className="text-xs font-bold text-rose-400">إيقاف الخدمة</p>
                          <p className="text-[10px] text-slate-400 mt-1">تم إيقاف الخدمة بسبب تجاوز الحد المسموح للمديونية.</p>
                        </div>
                      </div>
                    )}

                    {/* High Debt Warning Event */}
                    {selectedProfile.currentBalance > 10000 && (
                      <div className="relative">
                        <span className="absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-slate-950"></span>
                        <div className="bg-amber-950/20 border border-amber-900/30 rounded-lg p-3">
                          <p className="text-xs font-bold text-amber-400">إنذار مديونية</p>
                          <p className="text-[10px] text-slate-400 mt-1">تجاوز الرصيد المستحق حاجز الـ 10,000 {settings.currency}. النظام يوصي بإرسال إشعار.</p>
                        </div>
                      </div>
                    )}

                    {/* Subscription Event */}
                    <div className="relative">
                      <span className="absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-slate-950"></span>
                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                        <p className="text-xs font-bold text-slate-300">إنشاء الاشتراك</p>
                        <p className="text-[10px] text-slate-500 mt-1">تم تسجيل المشترك في النظام وتفعيل الخدمة.</p>
                        <p className="text-[9px] text-slate-600 mt-1 font-mono">{new Date(selectedProfile.createdAt).toLocaleDateString('ar-EG')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transactions Ledger */}`;

content = content.replace(transactionsLedgerRegex, timelineSection);

fs.writeFileSync('src/components/AdminSubscribers.tsx', content);

