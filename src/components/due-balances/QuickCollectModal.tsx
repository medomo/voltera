import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Check, Wallet, User, Hash, Calendar, FileText, 
  Building2, ArrowRight, ShieldCheck, Sparkles, AlertCircle
} from 'lucide-react';
import { SubscriberBalanceItem } from './types';
import { SystemSettings, User as CurrentUser } from '../../types';

interface QuickCollectModalProps {
  item: SubscriberBalanceItem | null;
  onClose: () => void;
  settings: SystemSettings;
  currentUser: CurrentUser;
  collectorsList?: string[];
  onConfirmPayment: (paymentData: {
    subscriberId: string;
    subscriberName: string;
    meterNumber: string;
    amountPaid: number;
    paymentMethod: string;
    paymentDate: string;
    collectorName: string;
    receiptNumber: string;
    notes: string;
  }) => void | Promise<void>;
}

export const QuickCollectModal: React.FC<QuickCollectModalProps> = ({
  item,
  onClose,
  settings,
  currentUser,
  collectorsList = [],
  onConfirmPayment
}) => {
  if (!item) return null;

  const currency = settings.currency || 'ريال';
  const defaultAmount = item.totalDue > 0 ? item.totalDue : 0;
  
  const [amount, setAmount] = useState<string>(String(defaultAmount));
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'network' | 'cheque'>('cash');
  const [collectorName, setCollectorName] = useState<string>(
    item.collectorName && item.collectorName !== 'غير محدد' 
      ? item.collectorName 
      : currentUser.name || 'المحصل الميداني'
  );
  const [receiptNumber, setReceiptNumber] = useState<string>(
    () => `REC-${Date.now().toString().slice(-6)}`
  );
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const numAmount = Number(amount) || 0;
  const remainingAfterPayment = Math.max(0, item.totalDue - numAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numAmount <= 0) {
      setErrorMsg('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await onConfirmPayment({
        subscriberId: item.subscriber.id,
        subscriberName: item.name,
        meterNumber: item.meterNumber,
        amountPaid: numAmount,
        paymentMethod,
        paymentDate,
        collectorName,
        receiptNumber,
        notes: notes.trim()
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ أثناء تسجيل السند، يرجى المحاولة مرة أخرى');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[230] flex items-center justify-center p-3 sm:p-4 text-right font-sans">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">تسجيل تحصيل وسند قبض فوري</h3>
                <p className="text-xs text-slate-400 font-bold">تحديث رصيد المشترك مباشرة في كشف المستحقات</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto custom-scrollbar">
            {errorMsg && (
              <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl flex items-center gap-2 text-rose-300 text-xs font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Subscriber Info Card */}
            <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-500 font-bold block">المشترك:</span>
                  <span className="font-black text-white text-sm truncate block">{item.name}</span>
                </div>
                <div className="text-left font-mono">
                  <span className="text-[10px] text-slate-500 font-bold block">رقم العداد:</span>
                  <span className="font-bold text-amber-400 text-sm">{item.meterNumber}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="bg-slate-900/60 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-bold">المتأخرات</span>
                  <span className="font-mono font-bold text-rose-400 text-xs">{item.overdueAmount.toLocaleString()} {currency}</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-bold">آخر فاتورة</span>
                  <span className="font-mono font-bold text-amber-400 text-xs">{item.currentDue.toLocaleString()} {currency}</span>
                </div>
                <div className="bg-slate-900/90 p-2 rounded-xl border border-sky-500/30">
                  <span className="text-[10px] text-sky-400 block font-bold">المطلوب الكلي</span>
                  <span className="font-mono font-black text-sky-300 text-xs">{item.totalDue.toLocaleString()} {currency}</span>
                </div>
              </div>
            </div>

            {/* Amount Field with Quick Selection Pills */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-300 flex items-center justify-between">
                <span>المبلغ المدفوع / المحصل:</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  المتبقي بعد السداد: <strong className="text-sky-400 font-mono">{remainingAfterPayment.toLocaleString()} {currency}</strong>
                </span>
              </label>
              
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-base text-white font-mono font-black outline-none focus:border-emerald-500 transition-colors"
                  required
                />
                <span className="absolute left-3.5 top-3 text-xs font-bold text-slate-400">
                  {currency}
                </span>
              </div>

              {/* Quick Amount Options */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setAmount(String(item.totalDue))}
                  className="px-2.5 py-1 bg-sky-950/60 hover:bg-sky-900 text-sky-300 border border-sky-500/30 rounded-lg text-[11px] font-bold cursor-pointer"
                >
                  كامل المبلغ ({item.totalDue.toLocaleString()})
                </button>
                {item.currentDue > 0 && item.currentDue !== item.totalDue && (
                  <button
                    type="button"
                    onClick={() => setAmount(String(item.currentDue))}
                    className="px-2.5 py-1 bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-bold cursor-pointer"
                  >
                    آخر فاتورة ({item.currentDue.toLocaleString()})
                  </button>
                )}
                {item.overdueAmount > 0 && item.overdueAmount !== item.totalDue && (
                  <button
                    type="button"
                    onClick={() => setAmount(String(item.overdueAmount))}
                    className="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/30 rounded-lg text-[11px] font-bold cursor-pointer"
                  >
                    المتأخرات فقط ({item.overdueAmount.toLocaleString()})
                  </button>
                )}
              </div>
            </div>

            {/* Payment Method & Receipt Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1.5">
                <label className="font-black text-slate-300">طريقة السداد:</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-emerald-500 cursor-pointer font-bold"
                >
                  <option value="cash">💵 نقداً (كاش)</option>
                  <option value="transfer">🏦 تحويل بنكي / صرافة</option>
                  <option value="network">💳 شبكة / نقطة بيع</option>
                  <option value="cheque">📄 شيك بنكي</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-black text-slate-300">رقم السند الدفتري:</label>
                <input
                  type="text"
                  value={receiptNumber}
                  onChange={e => setReceiptNumber(e.target.value)}
                  placeholder="رقم السند"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Collector & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1.5">
                <label className="font-black text-slate-300">المحصل المسؤول:</label>
                <div className="relative">
                  <input
                    type="text"
                    value={collectorName}
                    onChange={e => setCollectorName(e.target.value)}
                    list="collectors-datalist"
                    placeholder="اسم المحصل"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-emerald-500 font-bold"
                  />
                  <datalist id="collectors-datalist">
                    {collectorsList.map((c, i) => (
                      <option key={i} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-black text-slate-300">تاريخ السداد:</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5 text-xs">
              <label className="font-black text-slate-300">ملاحظات إضافية (اختياري):</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="مثال: سداد عبر الكريمي / دفعة تحت الحساب..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-emerald-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/25 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'جاري حفظ السند...' : 'تأكيد وقبض المبلغ'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                إلغاء
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
