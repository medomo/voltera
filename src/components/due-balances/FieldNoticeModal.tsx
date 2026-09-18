import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Printer, X, FileText, Zap, Building2, Calendar, Phone } from 'lucide-react';
import { SubscriberBalanceItem } from './types';
import { SystemSettings, User } from '../../types';
import { safePrint } from '../../utils/exportUtils';

interface FieldNoticeModalProps {
  item: SubscriberBalanceItem | null;
  onClose: () => void;
  settings: SystemSettings;
  currentUser: User;
}

export const FieldNoticeModal: React.FC<FieldNoticeModalProps> = ({
  item,
  onClose,
  settings,
  currentUser
}) => {
  const printableSlipRef = useRef<HTMLDivElement>(null);

  if (!item) return null;

  const currency = settings.currency || 'ريال';
  const stationName = settings.stationName || settings.companyName || 'محطة الكهرباء التجارية';
  const currentDate = new Date().toLocaleDateString('ar-YE', { year: 'numeric', month: 'long', day: 'numeric' });

  const handlePrint = () => {
    safePrint();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 text-right font-sans">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm print:hidden"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh] print:static print:max-h-none print:w-full print:shadow-none print:border-none print:bg-white print:p-0"
        >
          {/* Header Bar */}
          <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between print:hidden">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">إشعار مطالبة وسداد فوري رسمي</h3>
                <p className="text-[11px] text-slate-400">جاهز للطباعة والتسليم الميداني للمشترك</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة الإشعار</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printable Slip Body */}
          <div 
            ref={printableSlipRef} 
            className="p-6 overflow-y-auto bg-slate-950 text-white print:bg-white print:text-black print:p-8 space-y-4 text-xs print:text-[11pt]"
          >
            {/* Station Header */}
            <div className="border-b-2 border-amber-500/50 pb-3 flex justify-between items-start print:border-black">
              <div>
                <h2 className="text-base font-black text-amber-400 print:text-black">{stationName}</h2>
                <p className="text-[11px] text-slate-400 print:text-slate-700">قسم التحصيل والمتابعة الميدانية</p>
                {settings.phone && (
                  <p className="text-[10px] text-slate-400 print:text-slate-700">هاتف الطوارئ والاستعلام: {settings.phone}</p>
                )}
              </div>
              <div className="text-left">
                <span className="inline-block px-2.5 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-lg font-black text-[11px] print:border-black print:text-black">
                  إشعار مطالبة رسمية بالدفع
                </span>
                <p className="text-[10px] text-slate-400 font-mono mt-1 print:text-slate-700">{currentDate}</p>
              </div>
            </div>

            {/* Subscriber Info Box */}
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl print:bg-slate-50 print:border-black print:rounded-lg space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 print:text-slate-600">اسم المشترك: </span>
                  <strong className="text-white print:text-black font-bold">{item.name}</strong>
                </div>
                <div>
                  <span className="text-slate-400 print:text-slate-600">رقم العداد: </span>
                  <strong className="font-mono text-amber-400 print:text-black font-black">{item.meterNumber}</strong>
                </div>
                <div>
                  <span className="text-slate-400 print:text-slate-600">المنطقة / المربع: </span>
                  <strong className="text-white print:text-black font-bold">{item.zone || 'غير محدد'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 print:text-slate-600">المحول: </span>
                  <strong className="text-white print:text-black font-bold">{item.transformer || 'غير محدد'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 print:text-slate-600">رقم الهاتف: </span>
                  <strong className="font-mono text-white print:text-black font-bold">{item.phone || '-'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 print:text-slate-600">نوع الاشتراك: </span>
                  <strong className="text-white print:text-black font-bold">{item.tariffType}</strong>
                </div>
              </div>
            </div>

            {/* Due Breakdown Table */}
            <table className="w-full border-collapse text-center border border-slate-800 print:border-black">
              <thead>
                <tr className="bg-slate-900 text-slate-300 print:bg-slate-200 print:text-black font-bold border-b border-slate-800 print:border-black">
                  <th className="p-2 border-l border-slate-800 print:border-black">البيان</th>
                  <th className="p-2 border-l border-slate-800 print:border-black">المبلغ</th>
                  <th className="p-2">العملة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-black">
                <tr>
                  <td className="p-2 text-right pr-3 font-bold border-l border-slate-800 print:border-black">المتأخرات السابقة المتراكمة</td>
                  <td className="p-2 font-mono font-bold text-rose-400 print:text-black border-l border-slate-800 print:border-black">
                    {item.overdueAmount.toLocaleString()}
                  </td>
                  <td className="p-2 font-bold">{currency}</td>
                </tr>
                <tr>
                  <td className="p-2 text-right pr-3 font-bold border-l border-slate-800 print:border-black">مبلغ استهلاك آخر دورة / فاتورة</td>
                  <td className="p-2 font-mono font-bold text-amber-400 print:text-black border-l border-slate-800 print:border-black">
                    {item.currentDue.toLocaleString()}
                  </td>
                  <td className="p-2 font-bold">{currency}</td>
                </tr>
                <tr className="bg-amber-500/10 print:bg-slate-100 font-black">
                  <td className="p-2 text-right pr-3 border-l border-slate-800 print:border-black">إجمالي المبلغ المطلوب سداده فوراً</td>
                  <td className="p-2 font-mono text-base text-amber-400 print:text-black border-l border-slate-800 print:border-black">
                    {item.totalDue.toLocaleString()}
                  </td>
                  <td className="p-2 font-bold">{currency}</td>
                </tr>
              </tbody>
            </table>

            {/* Warning Note */}
            <div className="p-3 bg-rose-950/20 border border-rose-500/30 rounded-xl text-[10px] print:text-[10pt] print:bg-white print:border-black text-rose-300 print:text-black space-y-1">
              <strong className="block font-bold">⚠️ تنبيه رسمي هام:</strong>
              <p>
                نرجو من الأخ المشترك التكرم بسرعة سداد المبلغ الموضح أعلاه لمحصل المحطة أو زيارة الإدارة خلال مدة أقصاها (48 ساعة) تجنباً لقطع التيار الكهربائي وتحمل رسوم إعادة التوصيل.
              </p>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800 print:border-black text-center text-[10px] print:text-[10pt] font-bold">
              <div>
                <p className="text-slate-400 print:text-black mb-6">مسؤول التحصيل / المندوب:</p>
                <p className="border-t border-dotted border-slate-600 print:border-black pt-1">
                  التوقيع: ................................
                </p>
              </div>
              <div>
                <p className="text-slate-400 print:text-black mb-6">المستلم / المشترك:</p>
                <p className="border-t border-dotted border-slate-600 print:border-black pt-1">
                  التوقيع: ................................
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
