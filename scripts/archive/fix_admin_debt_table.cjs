const fs = require('fs');

const path = 'src/components/AdminDebt.tsx';
let code = fs.readFileSync(path, 'utf8');

// The thead part
const oldThead = `<th className="py-3 px-4 w-24">إجراءات</th>
                    <th className="py-3 px-4">رقم العداد</th>
                    <th className="py-3 px-4">الهاتف</th>
                    <th className="py-3 px-4">المبلغ المستحق</th>
                    <th className="py-3 px-4 text-right">اسم المشترك</th>`;

const newThead = `<th className="py-3 px-4 text-right">اسم المشترك</th>
                    <th className="py-3 px-4">المبلغ المستحق</th>
                    <th className="py-3 px-4">الهاتف</th>
                    <th className="py-3 px-4">رقم العداد</th>
                    <th className="py-3 px-4 w-24">إجراءات</th>`;

code = code.replace(oldThead, newThead);

// The tbody part
const oldRow = `<td className="py-3 px-4 flex justify-start gap-2">
                          <button className="p-1.5 bg-slate-800 text-sky-400 hover:text-white rounded-lg transition-colors" title="إرسال رسالة تذكير">
                            <Phone className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setPrintingSub(s)}
                            className="p-1.5 bg-slate-800 text-amber-400 hover:text-white rounded-lg transition-colors cursor-pointer" 
                            title="طباعة مطالبة"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-xs">{s.meterNumber}</td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-xs" dir="ltr">{s.phone}</td>
                        <td className="py-3 px-4">
                          <span className="bg-rose-500/10 text-rose-400 py-1 px-2 rounded-lg font-bold font-mono text-xs border border-rose-500/20">
                            {s.currentBalance.toLocaleString()} {settings.currency}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-200">
                          <div className="flex items-center justify-start gap-2">
                            <span>{s.name}</span>
                            {s.currentBalance > 100000 && <AlertCircle className="w-3.5 h-3.5 text-rose-500" />}
                          </div>
                        </td>`;

const newRow = `<td className="py-3 px-4 font-bold text-slate-200">
                          <div className="flex items-center justify-start gap-2">
                            <span>{s.name}</span>
                            {s.currentBalance > 100000 && <AlertCircle className="w-3.5 h-3.5 text-rose-500" />}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="bg-rose-500/10 text-rose-400 py-1 px-2 rounded-lg font-bold font-mono text-xs border border-rose-500/20">
                            {s.currentBalance.toLocaleString()} {settings.currency}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-xs" dir="ltr">{s.phone}</td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-xs">{s.meterNumber}</td>
                        <td className="py-3 px-4 flex justify-end gap-2">
                          <button className="p-1.5 bg-slate-800 text-sky-400 hover:text-white rounded-lg transition-colors" title="إرسال رسالة تذكير">
                            <Phone className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setPrintingSub(s)}
                            className="p-1.5 bg-slate-800 text-amber-400 hover:text-white rounded-lg transition-colors cursor-pointer" 
                            title="طباعة مطالبة"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </td>`;

code = code.replace(oldRow, newRow);

fs.writeFileSync(path, code);
