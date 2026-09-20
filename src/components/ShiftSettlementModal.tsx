import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, CheckCircle2, Printer, Share2, Banknote, Clock, 
  Calendar, ShieldCheck, UserCheck, AlertCircle, FileText, 
  Receipt, ArrowDownToLine, Smartphone, Zap
} from 'lucide-react';
import { User, SystemSettings, Payment, MeterReading, Subscriber, AuditLog, TreasuryTransfer } from '../types';
import { tafqeetArabic } from '../utils/numberToWords';

interface ShiftSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  settings: SystemSettings;
  myPaymentsToday: Payment[];
  myReadingsToday: MeterReading[];
  subscribers: Subscriber[];
  dailyGoal: number;
  progressPercent: number;
  onAddAuditLog?: (log: AuditLog) => void;
  onTriggerDirectPrint?: () => void;
  treasuryTransfers?: TreasuryTransfer[];
  onAddTreasuryTransfer?: (trf: TreasuryTransfer) => void;
  onUpdateTreasuryTransfers?: (trfs: TreasuryTransfer[]) => void;
}

export const ShiftSettlementModal: React.FC<ShiftSettlementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  settings,
  myPaymentsToday,
  myReadingsToday,
  subscribers,
  dailyGoal,
  progressPercent,
  onAddAuditLog,
  onTriggerDirectPrint,
  treasuryTransfers,
  onAddTreasuryTransfer,
  onUpdateTreasuryTransfers
}) => {
  const [recipientName, setRecipientName] = useState('أمين الصندوق الرئيسي');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);

  // Financial breakdown
  const cashTotal = useMemo(() => 
    myPaymentsToday.filter(p => p.paymentMethod === 'cash').reduce((sum, p) => sum + p.amountPaid, 0),
    [myPaymentsToday]
  );

  const walletTotal = useMemo(() => 
    myPaymentsToday.filter(p => p.paymentMethod === 'e-wallet').reduce((sum, p) => sum + p.amountPaid, 0),
    [myPaymentsToday]
  );

  const transferTotal = useMemo(() => 
    myPaymentsToday.filter(p => p.paymentMethod === 'transfer').reduce((sum, p) => sum + p.amountPaid, 0),
    [myPaymentsToday]
  );

  const totalCollected = cashTotal + walletTotal + transferTotal;
  const tafqeetCash = useMemo(() => tafqeetArabic(cashTotal, settings.currency), [cashTotal, settings.currency]);
  const tafqeetTotal = useMemo(() => tafqeetArabic(totalCollected, settings.currency), [totalCollected, settings.currency]);

  // Unique subscribers visited
  const uniqueSubscribersPaid = useMemo(() => 
    new Set(myPaymentsToday.map(p => p.subscriberId)).size,
    [myPaymentsToday]
  );

  const shiftTimes = useMemo(() => {
    const ops = [
      ...myReadingsToday.map(r => ({ date: r.readingDate })),
      ...myPaymentsToday.map(p => ({ date: p.paymentDate }))
    ].filter(op => Boolean(op.date))
    .sort((a, b) => new Date(String(a.date || '').replace(' ', 'T')).getTime() - new Date(String(b.date || '').replace(' ', 'T')).getTime());

    if (ops.length === 0) {
      return { start: '--', end: '--', duration: 'لا توجد عمليات مسجلة' };
    }

    const start = ops[0].date ? String(ops[0].date).substring(11, 16) : '--';
    const end = ops[ops.length - 1].date ? String(ops[ops.length - 1].date).substring(11, 16) : '--';

    try {
      const startTime = new Date(String(ops[0].date || '').replace(' ', 'T')).getTime();
      const endTime = new Date(String(ops[ops.length - 1].date || '').replace(' ', 'T')).getTime();
      const diffMins = Math.max(0, Math.floor((endTime - startTime) / (1000 * 60)));
      const h = Math.floor(diffMins / 60);
      const m = diffMins % 60;
      const duration = h > 0 ? `${h} ساعة و ${m} دقيقة` : `${m} دقيقة`;
      return { start, end, duration };
    } catch {
      return { start, end, duration: '--' };
    }
  }, [myReadingsToday, myPaymentsToday]);

  const handleShareWhatsApp = () => {
    const todayStr = new Date().toLocaleDateString('ar-YE');
    const timeStr = new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' });

    let msg = `⚡ *${settings.stationName}*\n`;
    msg += `💼 *تقرير إغلاق الوردية وتوريد النقدية المعتمد*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `👤 *المحصل الميداني:* ${currentUser.name}\n`;
    msg += `📥 *المستلم (أمين الصندوق):* ${recipientName}\n`;
    msg += `📅 *التاريخ:* ${todayStr} - ${timeStr}\n`;
    msg += `⏱️ *فترة الوردية:* من ${shiftTimes.start} إلى ${shiftTimes.end} (${shiftTimes.duration})\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💵 *البيان المالي للعهدة والنقدية:*\n`;
    msg += `▫️ النقد الفعلي (كاش للتسليم): *${cashTotal.toLocaleString()} ${settings.currency}*\n`;
    msg += `▫️ سداد محافظ إلكترونية: *${walletTotal.toLocaleString()} ${settings.currency}*\n`;
    msg += `▫️ تحويلات بنكية ومصرفية: *${transferTotal.toLocaleString()} ${settings.currency}*\n`;
    msg += `🔹 *إجمالي المحصل الكلي:* *${totalCollected.toLocaleString()} ${settings.currency}*\n`;
    msg += `📝 *فقط:* ${tafqeetTotal}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📊 *إحصاءات النزول الميداني:*\n`;
    msg += `▪️ عدد الفواتير والقراءات: ${myReadingsToday.length} قراءة\n`;
    msg += `▪️ عدد سندات القبض: ${myPaymentsToday.length} سند\n`;
    msg += `▪️ عدد المشتركين الذين سددوا: ${uniqueSubscribersPaid} مشترك\n`;
    msg += `▪️ نسبة تحقيق الهدف اليومي: ${progressPercent}%\n`;
    if (handoverNotes.trim()) {
      msg += `📌 *ملاحظات التوريد:* ${handoverNotes}\n`;
    }
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `تم اعتماد التوريد آلياً عبر نظام فولترا السحابي.`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleCopyText = () => {
    const todayStr = new Date().toLocaleDateString('ar-YE');
    const timeStr = new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' });

    let txt = `⚡ ${settings.stationName}\n`;
    txt += `تقرير إغلاق الوردية وتوريد النقدية\n`;
    txt += `المحصل: ${currentUser.name}\n`;
    txt += `المستلم: ${recipientName}\n`;
    txt += `التاريخ: ${todayStr} ${timeStr}\n`;
    txt += `النقد كاش: ${cashTotal.toLocaleString()} ${settings.currency}\n`;
    txt += `محافظ: ${walletTotal.toLocaleString()} ${settings.currency}\n`;
    txt += `تحويلات: ${transferTotal.toLocaleString()} ${settings.currency}\n`;
    txt += `الإجمالي: ${totalCollected.toLocaleString()} ${settings.currency}\n`;
    txt += `فقط: ${tafqeetTotal}\n`;
    txt += `الفواتير: ${myReadingsToday.length} | السندات: ${myPaymentsToday.length}\n`;
    if (handoverNotes) txt += `ملاحظات: ${handoverNotes}\n`;

    navigator.clipboard.writeText(txt).then(() => {
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 3000);
    });
  };

  const handleConfirmHandover = () => {
    if (onAddAuditLog) {
      onAddAuditLog({
        id: `audit-shift-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'إغلاق وردية وتوريد نقدية',
        details: `قام المحصل ${currentUser.name} بإغلاق ورديته الميدانية وتوريد مبلغ (${totalCollected.toLocaleString()} ${settings.currency}) منها كاش (${cashTotal.toLocaleString()}) إلى ${recipientName}. ${handoverNotes ? 'ملاحظات: ' + handoverNotes : ''}`
      });
    }

    // Save shift record locally
    const shiftRecord = {
      id: `shift-${Date.now()}`,
      collectorId: currentUser.id,
      collectorName: currentUser.name,
      closedAt: new Date().toISOString(),
      recipientName,
      cashTotal,
      walletTotal,
      transferTotal,
      totalCollected,
      readingsCount: myReadingsToday.length,
      paymentsCount: myPaymentsToday.length,
      notes: handoverNotes
    };

    try {
      const existing = JSON.parse(localStorage.getItem('voltera_closed_shifts') || '[]');
      existing.unshift(shiftRecord);
      localStorage.setItem('voltera_closed_shifts', JSON.stringify(existing.slice(0, 30)));
    } catch (e) {
      console.error(e);
    }

    // Create formal treasury transfer voucher if cash was collected
    const handoverAmount = cashTotal > 0 ? cashTotal : totalCollected;
    if (handoverAmount > 0) {
      const trfNo = `TRF-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
      const newTrf: TreasuryTransfer = {
        id: `trf-${Date.now()}`,
        transferNumber: trfNo,
        date: new Date().toISOString().split('T')[0],
        fromAccount: `صندوق المحصل: ${currentUser.name}`,
        toAccount: recipientName || 'الصندوق الرئيسي (الكاش)',
        amount: handoverAmount,
        notes: `توريد إغلاق الوردية للمحصل (${currentUser.name}) إلى (${recipientName}) - نقد كاش (${cashTotal.toLocaleString()} ${settings.currency})${walletTotal > 0 ? ` + محافظ (${walletTotal.toLocaleString()})` : ''}. ${handoverNotes || ''}`.trim(),
        recordedBy: recipientName || currentUser.name
      };

      if (onAddTreasuryTransfer) {
        onAddTreasuryTransfer(newTrf);
      } else if (onUpdateTreasuryTransfers && treasuryTransfers) {
        onUpdateTreasuryTransfers([newTrf, ...treasuryTransfers]);
      }
    }

    setIsSaved(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden text-right"
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-400/20 text-amber-400 rounded-2xl border border-amber-400/30">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>إغلاق الوردية وتوريد العهدة النقدية</span>
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                  نهاية الدوام
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">تسوية المبالغ النقدية وتوثيق التسليم لأمين الصندوق</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          {/* Main Handover Amount Banner */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-850 text-white p-5 rounded-2xl border border-slate-800 shadow-lg flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>صافي النقدية الكاش للتوريد اليدوي</span>
              </span>
              <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                جاهز للتسليم
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight">
                {cashTotal.toLocaleString()} <span className="text-xs sm:text-sm font-normal text-slate-300">{settings.currency}</span>
              </span>
              <span className="text-[10px] text-slate-400">
                من إجمالي محصل: {totalCollected.toLocaleString()} {settings.currency}
              </span>
            </div>

            {/* Tafqeet in Arabic */}
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 text-[11px] font-bold text-amber-300 leading-relaxed">
              <span>فقط: </span>
              <span>{tafqeetCash}</span>
            </div>
          </div>

          {/* Breakdown Grid */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-emerald-50/80 border border-emerald-200/80 p-2.5 rounded-xl">
              <span className="block text-[10px] text-emerald-700 font-bold">نقد مباشر (كاش)</span>
              <span className="block text-xs sm:text-sm font-black text-emerald-900 font-mono mt-0.5">
                {cashTotal.toLocaleString()}
              </span>
              <span className="text-[9px] text-emerald-600 font-semibold">{settings.currency}</span>
            </div>

            <div className="bg-sky-50/80 border border-sky-200/80 p-2.5 rounded-xl">
              <span className="block text-[10px] text-sky-700 font-bold">محافظ إلكترونية</span>
              <span className="block text-xs sm:text-sm font-black text-sky-900 font-mono mt-0.5">
                {walletTotal.toLocaleString()}
              </span>
              <span className="text-[9px] text-sky-600 font-semibold">{settings.currency}</span>
            </div>

            <div className="bg-purple-50/80 border border-purple-200/80 p-2.5 rounded-xl">
              <span className="block text-[10px] text-purple-700 font-bold">تحويلات مصرفية</span>
              <span className="block text-xs sm:text-sm font-black text-purple-900 font-mono mt-0.5">
                {transferTotal.toLocaleString()}
              </span>
              <span className="text-[9px] text-purple-600 font-semibold">{settings.currency}</span>
            </div>
          </div>

          {/* Shift Activity Performance Metrics */}
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-2">
            <h4 className="font-extrabold text-slate-800 text-xs flex items-center justify-between border-b border-slate-200/60 pb-1.5">
              <span>إحصاءات النزول الميداني للوردية</span>
              <span className="text-[10px] font-mono text-slate-500 font-bold">
                {shiftTimes.start} ← {shiftTimes.end} ({shiftTimes.duration})
              </span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1">
              <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-slate-400 text-[10px] block font-bold">قراءات مسجلة</span>
                <span className="font-black text-slate-800 text-xs font-mono">{myReadingsToday.length}</span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-slate-400 text-[10px] block font-bold">سندات صادرة</span>
                <span className="font-black text-slate-800 text-xs font-mono">{myPaymentsToday.length}</span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-slate-400 text-[10px] block font-bold">مشتركون سددوا</span>
                <span className="font-black text-emerald-700 text-xs font-mono">{uniqueSubscribersPaid}</span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-slate-400 text-[10px] block font-bold">إنجاز المستهدف</span>
                <span className="font-black text-amber-600 text-xs font-mono">{progressPercent}%</span>
              </div>
            </div>
          </div>

          {/* Handover Form Inputs */}
          <div className="bg-white border border-slate-200 p-3.5 rounded-2xl space-y-3 shadow-2xs">
            <div>
              <label className="block text-slate-600 font-bold mb-1 text-[11px]">
                المستلم المعتمد للعهدة (أمين الصندوق أو المشرف)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={recipientName}
                  onChange={e => setRecipientName(e.target.value)}
                  placeholder="أدخل اسم أمين الصندوق المستلم..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-xs font-medium focus:outline-none focus:border-slate-900"
                />
              </div>
              {/* Quick presets */}
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {['أمين الصندوق الرئيسي', 'مدير المحطة', 'مشرف المحصلين', 'الإدارة المالية'].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRecipientName(preset)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                      recipientName === preset
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-slate-600 font-bold mb-1 text-[11px]">
                ملاحظات التسليم والتوريد (اختياري)
              </label>
              <input
                type="text"
                value={handoverNotes}
                onChange={e => setHandoverNotes(e.target.value)}
                placeholder="مثال: تم توريد المبلغ نقداً بالكامل، متطابق مع السندات..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-slate-800 text-xs font-medium focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>

          {/* Feedback message when saved */}
          {isSaved && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>تم توثيق إغلاق الوردية وحفظ سند التوريد بنجاح في سجل التدقيق المحلي والمالي!</span>
            </div>
          )}

          {copiedNotice && (
            <div className="p-2.5 bg-sky-50 border border-sky-200 text-sky-800 rounded-xl font-bold text-center">
              تم نسخ تفاصيل التوريد بنجاح إلى الحافظة!
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-3.5 rounded-xl text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>مشاركة واتساب</span>
            </button>

            <button
              type="button"
              onClick={handleCopyText}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold py-2.5 px-3 rounded-xl text-xs transition-all active:scale-95 cursor-pointer"
            >
              <span>نسخ النص</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onTriggerDirectPrint && (
              <button
                type="button"
                onClick={() => {
                  onTriggerDirectPrint();
                }}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-3.5 rounded-xl text-xs transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>طباعة حرارية</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleConfirmHandover}
              disabled={isSaved}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-850 disabled:bg-emerald-700 text-white font-black py-2.5 px-4 rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{isSaved ? 'تم توثيق التوريد ✓' : 'توثيق واعتماد التوريد'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
