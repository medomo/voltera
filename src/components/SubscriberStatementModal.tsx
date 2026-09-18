import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Printer, FileText, CheckCircle2 } from 'lucide-react';
import { Subscriber, MeterReading, Payment, SystemSettings } from '../types';

interface SubscriberStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSub: Subscriber | null;
  readings: MeterReading[];
  payments: Payment[];
  settings: SystemSettings;
  onPrintJob: (job: { type: 'invoice' | 'receipt' | 'statement'; reading?: MeterReading; payment?: Payment; sub?: Subscriber }) => void;
}

export const SubscriberStatementModal: React.FC<SubscriberStatementModalProps> = ({
  isOpen,
  onClose,
  selectedSub,
  readings,
  payments,
  settings,
  onPrintJob
}) => {
  if (!isOpen || !selectedSub) return null;

  const subReadings = readings.filter(r => r.subscriberId === selectedSub.id);
  const subPayments = payments.filter(p => p.subscriberId === selectedSub.id);

  const totalBilled = subReadings.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalPaid = subPayments.reduce((sum, p) => sum + p.amountPaid, 0);

  const operations = [
    ...subReadings.map(r => ({
      id: r.id,
      date: r.readingDate,
      type: 'invoice' as const,
      typeName: 'فاتورة استهلاك تيار',
      amount: r.totalAmount,
      details: `${r.consumption} ك.و (القراءة: ${r.currentReading})`,
      reading: r
    })),
    ...subPayments.map(p => ({
      id: p.id,
      date: p.paymentDate,
      type: 'receipt' as const,
      typeName: 'سند قبض وتوريد',
      amount: p.amountPaid,
      details: `سند رقم: ${p.receiptNumber} (${p.paymentMethod === 'cash' ? 'نقداً' : p.paymentMethod === 'e-wallet' ? 'محفظة' : 'تحويل'})`,
      payment: p
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden dir-rtl"
        >
          {/* Modal Header */}
          <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm sm:text-base text-white">كشف حساب ومعاملات المشترك</h3>
                <p className="text-xs text-slate-400 font-medium">سجل حركة الفواتير والسندات التفصيلي</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content Body */}
          <div className="p-5 overflow-y-auto space-y-5">
            {/* Subscriber Main Banner */}
            <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-amber-100 border border-amber-200 rounded-lg text-[10px] text-amber-900 font-black">
                    {selectedSub.tariffType === 'residential' ? 'سكني' : selectedSub.tariffType === 'commercial' ? 'تجاري' : 'صناعي'}
                  </span>
                  <h4 className="font-black text-slate-900 text-base sm:text-lg">{selectedSub.name}</h4>
                </div>
                <p className="text-xs text-slate-600 font-bold">
                  عداد رقم: <span className="font-mono text-slate-800">{selectedSub.meterNumber}</span> | جوال: <span className="font-mono text-slate-800" dir="ltr">{selectedSub.phone}</span>
                </p>
              </div>

              <button
                onClick={() => onPrintJob({ type: 'statement', sub: selectedSub })}
                className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2.5 px-5 rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-950" />
                <span>طباعة كشف الحساب كاملاً (80mm)</span>
              </button>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200/60 text-center">
                <span className="text-slate-600 block text-xs font-bold">إجمالي المطالبات والفواتير</span>
                <span className="font-mono text-lg font-black text-amber-700 block mt-1">
                  {totalBilled.toLocaleString()} {settings.currency}
                </span>
              </div>

              <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200/60 text-center">
                <span className="text-slate-600 block text-xs font-bold">إجمالي المقبوضات والسندات</span>
                <span className="font-mono text-lg font-black text-emerald-700 block mt-1">
                  {totalPaid.toLocaleString()} {settings.currency}
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                <span className="text-slate-600 block text-xs font-bold">الرصيد المتبقي الحالي</span>
                <span className={`font-mono text-lg font-black block mt-1 ${
                  selectedSub.currentBalance > 0.01 
                    ? 'text-rose-600' 
                    : selectedSub.currentBalance < -0.01 
                      ? 'text-emerald-600' 
                      : 'text-slate-700'
                }`}>
                  {selectedSub.currentBalance < -0.01 
                    ? `${Math.abs(selectedSub.currentBalance).toLocaleString()} (دائن)` 
                    : `${selectedSub.currentBalance.toLocaleString()} ${settings.currency}`}
                </span>
              </div>
            </div>

            {/* Historical Operations List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-500" />
                  <span>سجل العمليات والفواتير وسندات القبض التفصيلية:</span>
                </h4>
                <span className="text-[11px] font-bold text-slate-500 font-mono">
                  إجمالي {operations.length} عملية
                </span>
              </div>
              {operations.length > 0 ? (
                <div className="overflow-hidden border border-slate-200/90 rounded-2xl bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs border-collapse">
                      <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-black">
                        <tr>
                          <th className="py-3 px-4">التاريخ والوقت</th>
                          <th className="py-3 px-4">نوع الحركة</th>
                          <th className="py-3 px-4">البيان والشرح</th>
                          <th className="py-3 px-4 text-center">المبلغ المالي</th>
                          <th className="py-3 px-4 text-center w-32">الطباعة الفورية</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {operations.map((op, idx) => {
                          const isInvoice = op.type === 'invoice';
                          return (
                            <tr 
                              key={idx} 
                              className={`transition-colors border-r-4 ${
                                isInvoice ? 'border-r-amber-500 bg-amber-50/20' : 'border-r-emerald-500 bg-emerald-50/20'
                              } hover:bg-slate-100/60`}
                            >
                              <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                                <span className="bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs font-bold">
                                  {op.date}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-bold">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
                                  isInvoice 
                                    ? 'bg-amber-100 text-amber-900 border-amber-300' 
                                    : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                }`}>
                                  {op.typeName}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-800 font-semibold">{op.details}</td>
                              <td className="py-3 px-4 text-center font-mono">
                                <span className={`font-black text-sm px-2.5 py-0.5 rounded-lg border ${
                                  isInvoice 
                                    ? 'text-amber-800 bg-amber-50 border-amber-200' 
                                    : 'text-emerald-800 bg-emerald-50 border-emerald-200'
                                }`}>
                                  {isInvoice ? '+' : '-'}{op.amount.toLocaleString()} <span className="text-[10px] font-bold text-slate-500">{settings.currency}</span>
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() => {
                                    if (op.type === 'invoice' && op.reading) {
                                      onPrintJob({ type: 'invoice', reading: op.reading, sub: selectedSub });
                                    } else if (op.type === 'receipt' && op.payment) {
                                      onPrintJob({ type: 'receipt', payment: op.payment, sub: selectedSub });
                                    }
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                                >
                                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                                  <span>طباعة إيصال</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-xs text-slate-400 italic bg-slate-50 rounded-2xl border border-slate-200">
                  لا توجد أي فواتير أو سندات قبض سابقة مسجلة لهذا المشترك.
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
