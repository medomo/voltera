cat << 'INNER_EOF' > admindebt_chunk.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Subscriber, SystemSettings } from '../types';
import { Banknote, Search, AlertCircle, Phone, Printer, Zap } from 'lucide-react';

interface AdminDebtProps {
  subscribers: Subscriber[];
  settings: SystemSettings;
}

export const AdminDebt: React.FC<AdminDebtProps> = ({ subscribers, settings }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [printingSub, setPrintingSub] = useState<Subscriber | null>(null);

  const debtors = useMemo(() => {
    return subscribers
      .filter(s => s.currentBalance > 0)
      .filter(s => s.name.includes(searchQuery) || s.phone.includes(searchQuery) || s.meterNumber.includes(searchQuery))
      .sort((a, b) => b.currentBalance - a.currentBalance);
  }, [subscribers, searchQuery]);

  const totalDebt = debtors.reduce((sum, s) => sum + s.currentBalance, 0);

  useEffect(() => {
    if (printingSub) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [printingSub]);

  return (
    <>
      <motion.div
        key="debt-sec"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="space-y-6 text-right"
      >
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 border-b border-slate-800 pb-4">
            <div className="bg-slate-950 px-4 py-2 rounded-xl border border-rose-500/30 flex items-center gap-3 w-full md:w-auto justify-center">
              <span className="text-xl font-mono font-bold text-rose-400">{totalDebt.toLocaleString()}</span>
              <span className="text-xs text-rose-500 font-bold uppercase">{settings.currency}</span>
              <span className="text-sm text-slate-400 mx-2">إجمالي المتأخرات</span>
            </div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center justify-end gap-2">
              <span>إدارة الديون والمتأخرات</span>
              <Banknote className="w-5 h-5 text-amber-500" />
            </h2>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-slate-500" />
            </div>
            <input
              type="text"
              placeholder="بحث في قائمة المدينين بالاسم، الهاتف، أو العداد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pr-10 pl-4 text-slate-200 text-sm text-right focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 text-xs uppercase font-bold">
                  <tr>
                    <th className="py-3 px-4 w-24">إجراءات</th>
                    <th className="py-3 px-4">رقم العداد</th>
                    <th className="py-3 px-4">الهاتف</th>
                    <th className="py-3 px-4">المبلغ المستحق</th>
                    <th className="py-3 px-4 text-right">اسم المشترك</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {debtors.length > 0 ? (
                    debtors.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 flex justify-start gap-2">
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
                          <div className="flex items-center justify-end gap-2">
                            <span>{s.name}</span>
                            {s.currentBalance > 100000 && <AlertCircle className="w-3.5 h-3.5 text-rose-500" />}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        لا يوجد مدينين مطابقين للبحث أو لا يوجد ديون مستحقة.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Printable Demand Area */}
      {printingSub && (
        <div className="fixed inset-0 z-[100] bg-white text-black overflow-y-auto print:bg-white print:m-0 print:p-0">
          <div className="bg-slate-900 text-white p-4 flex justify-between items-center print:hidden">
            <button onClick={() => setPrintingSub(null)} className="text-slate-300 hover:text-white px-4 py-2 border border-slate-700 rounded-lg cursor-pointer">إغلاق وتراجع</button>
            <button onClick={() => window.print()} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-2 px-6 rounded-lg flex items-center gap-2 cursor-pointer">
              <Printer className="w-5 h-5" />
              <span>طباعة المطالبة</span>
            </button>
          </div>

          <div className="max-w-md mx-auto p-8 mt-8 bg-white border border-gray-200 shadow-xl print:shadow-none print:border-none print:mt-0 print:max-w-full" dir="rtl">
            <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
              <div className="flex justify-center mb-2">
                <Zap className="w-10 h-10 text-black" />
              </div>
              <h1 className="text-2xl font-black text-black">{settings.stationName}</h1>
              <p className="text-gray-600 text-sm mt-1">{settings.logoText}</p>
              <div className="text-xs text-gray-500 mt-2 space-y-1">
                <p>الهاتف: {settings.phone}</p>
                <p>العنوان: {settings.address}</p>
              </div>
            </div>

            <div className="text-center bg-gray-100 py-2 mb-6 rounded">
              <h2 className="text-lg font-bold tracking-widest uppercase">مطالبة مالية - متأخرات</h2>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
              <div className="space-y-2">
                <p><span className="font-bold text-gray-600">اسم المشترك:</span> <span className="font-bold">{printingSub.name}</span></p>
                <p><span className="font-bold text-gray-600">رقم المشترك:</span> <span className="font-mono">{printingSub.id.substring(0, 8)}</span></p>
                <p><span className="font-bold text-gray-600">رقم العداد:</span> <span className="font-mono">{printingSub.meterNumber}</span></p>
              </div>
              <div className="space-y-2 text-left">
                <p><span className="font-bold text-gray-600">تاريخ المطالبة:</span> <span className="font-mono">{new Date().toLocaleDateString('en-GB')}</span></p>
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 p-4 rounded-lg flex flex-col justify-center items-center mb-8 gap-2">
              <span className="font-bold text-rose-800 text-lg">الرصيد المستحق الدفع:</span>
              <span className="font-mono font-bold text-3xl text-rose-600">{printingSub.currentBalance.toLocaleString()} <span className="text-sm font-sans">{settings.currency}</span></span>
            </div>

            <div className="text-center text-sm text-gray-800 space-y-2">
              <p>عزيزي المشترك، نرجو منكم سرعة المبادرة بتسديد المبالغ المستحقة عليكم لضمان استمرار الخدمة.</p>
              <p className="font-bold text-rose-600">في حالة عدم السداد خلال 3 أيام، سيتم فصل التيار الكهربائي.</p>
              <p className="mt-8 font-mono text-[10px] text-gray-400">Printed: {new Date().toLocaleString()}</p>
            </div>
          </div>

          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              body * { visibility: hidden; }
              #root { display: none; }
              .fixed.inset-0, .fixed.inset-0 * { visibility: visible; }
              .fixed.inset-0 { position: absolute; left: 0; top: 0; width: 100%; }
            }
          `}} />
        </div>
      )}
    </>
  );
};
INNER_EOF
cp admindebt_chunk.tsx src/components/AdminDebt.tsx
