import React, { useState } from 'react';
import { motion } from 'motion/react';
import { MeterReading, Payment, Subscriber, SystemSettings, User, TreasuryTransfer } from '../types';
import {
  ArrowRightLeft, Lock, Printer, Clock, Banknote, CheckCircle2,
  XCircle, Wallet, AlertCircle, Search, Check, Send
} from 'lucide-react';

interface AdminPostingsProps {
  readings: MeterReading[];
  payments: Payment[];
  subscribers: Subscriber[];
  settings: SystemSettings;
  currentUser: User;
  treasuryTransfers?: TreasuryTransfer[];
  onUpdateReadings: (readings: MeterReading[]) => void;
  onUpdatePayments: (payments: Payment[]) => void;
  onUpdateSubscribers: (subscribers: Subscriber[]) => void;
  onUpdateTreasuryTransfers?: (transfers: TreasuryTransfer[]) => void;
  onAddAuditLog?: (log: any) => void;
  onSendReadingSMS: (r: MeterReading) => void;
  onSendPaymentSMS: (p: Payment) => void;
  onCloseFiscalCycle: () => void;
}

export const AdminPostings: React.FC<AdminPostingsProps> = ({
  readings,
  payments,
  subscribers,
  settings,
  currentUser,
  treasuryTransfers = [],
  onUpdateReadings,
  onUpdatePayments,
  onUpdateSubscribers,
  onUpdateTreasuryTransfers,
  onAddAuditLog,
  onSendReadingSMS,
  onSendPaymentSMS,
  onCloseFiscalCycle,
}) => {
  const [postingSubTab, setPostingSubTab] = useState<'pending' | 'posted' | 'rejected' | 'collectors'>('pending');
  const [postingSearch, setPostingSearch] = useState('');
  const [postingCollectorFilter, setPostingCollectorFilter] = useState('all');
  const [rejectModalItem, setRejectModalItem] = useState<{ type: 'reading' | 'payment', id: string, name: string } | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');

  const logAction = (action: string, details: string) => {
    if (onAddAuditLog) {
      onAddAuditLog({
        id: `audit-${Date.now()}`,
        userId: currentUser.id,
        username: currentUser.name || currentUser.username,
        action,
        details,
        timestamp: new Date().toISOString().substring(0, 19).replace('T', ' ')
      });
    }
  };

  const pendingReadings = readings.filter(r => !r.isPosted && !r.isRejected);
  const pendingPayments = payments.filter(p => !p.isPosted && !p.isRejected);
  const postedReadings = readings.filter(r => r.isPosted);
  const postedPayments = payments.filter(p => p.isPosted);
  const rejectedReadings = readings.filter(r => r.isRejected);
  const rejectedPayments = payments.filter(p => p.isRejected);

  // Single Reading Post
  const postSingleReading = (readingId: string) => {
    const targetReading = readings.find(r => r.id === readingId);
    if (!targetReading) return;

    const postedDate = new Date().toISOString().substring(0, 16).replace('T', ' ');
    const updatedReadings = readings.map(r => 
      r.id === readingId 
        ? { ...r, isPosted: true, postedDate, postedBy: currentUser.name, isRejected: false } 
        : r
    );

    const updatedSubs = subscribers.map(sub => {
      if (sub.id === targetReading.subscriberId) {
        return {
          ...sub,
          currentReading: Math.max(sub.currentReading, targetReading.currentReading),
          currentBalance: sub.currentBalance + targetReading.totalAmount
        };
      }
      return sub;
    });

    onUpdateReadings(updatedReadings);
    onUpdateSubscribers(updatedSubs);
    logAction('ترحيل قراءة عداد', `اعتماد وتطبيق قراءة المشترك (${targetReading.subscriberName}) بقيمة ${targetReading.totalAmount} ${settings.currency}`);
  };

  // Reject Single Reading
  const handleRejectReading = (readingId: string, reason: string) => {
    const targetReading = readings.find(r => r.id === readingId);
    if (!targetReading) return;

    const updatedReadings = readings.map(r => 
      r.id === readingId ? { ...r, isRejected: true, rejectionReason: reason || 'رفض للمراجعة الميدانية' } : r
    );

    onUpdateReadings(updatedReadings);
    logAction('رفض قراءة عداد', `رفض قراءة المشترك (${targetReading.subscriberName}) - السبب: ${reason}`);
    setRejectModalItem(null);
    setRejectionNote('');
  };

  // Unpost Single Reading
  const unpostSingleReading = (readingId: string) => {
    const targetReading = readings.find(r => r.id === readingId);
    if (!targetReading || !targetReading.isPosted) return;

    if (!confirm(`هل أنت متأكد من إلغاء ترحيل قراءة المشترك (${targetReading.subscriberName})؟ سيتم خصم الماليّة المعلقة من رصيده.`)) return;

    const updatedReadings = readings.map(r => 
      r.id === readingId ? { ...r, isPosted: false, postedDate: undefined, postedBy: undefined } : r
    );

    const updatedSubs = subscribers.map(sub => {
      if (sub.id === targetReading.subscriberId) {
        return {
          ...sub,
          currentBalance: Math.max(0, sub.currentBalance - targetReading.totalAmount)
        };
      }
      return sub;
    });

    onUpdateReadings(updatedReadings);
    onUpdateSubscribers(updatedSubs);
    logAction('إلغاء ترحيل قراءة', `إلغاء ترحيل قراءة المشترك (${targetReading.subscriberName}) بقيمة ${targetReading.totalAmount} ${settings.currency}`);
  };

  // Single Payment Post
  const postSinglePayment = (paymentId: string) => {
    const targetPayment = payments.find(p => p.id === paymentId);
    if (!targetPayment) return;

    const postedDate = new Date().toISOString().substring(0, 16).replace('T', ' ');
    const updatedPayments = payments.map(p => 
      p.id === paymentId ? { ...p, isPosted: true, postedDate, postedBy: currentUser.name, isRejected: false } : p
    );

    const updatedSubs = subscribers.map(sub => {
      if (sub.id === targetPayment.subscriberId) {
        return {
          ...sub,
          currentBalance: sub.currentBalance - targetPayment.amountPaid
        };
      }
      return sub;
    });

    onUpdatePayments(updatedPayments);
    onUpdateSubscribers(updatedSubs);
    logAction('ترحيل سند قبض', `اعتماد وترحيل سند رقم (${targetPayment.receiptNumber}) للمشترك (${targetPayment.subscriberName}) بمبلغ ${targetPayment.amountPaid} ${settings.currency}`);
  };

  // Reject Single Payment
  const handleRejectPayment = (paymentId: string, reason: string) => {
    const targetPayment = payments.find(p => p.id === paymentId);
    if (!targetPayment) return;

    const updatedPayments = payments.map(p => 
      p.id === paymentId ? { ...p, isRejected: true, rejectionReason: reason || 'سند مرفوض للتدقيق' } : p
    );

    onUpdatePayments(updatedPayments);
    logAction('رفض سند قبض', `رفض سند رقم (${targetPayment.receiptNumber}) للمشترك (${targetPayment.subscriberName}) - السبب: ${reason}`);
    setRejectModalItem(null);
    setRejectionNote('');
  };

  // Unpost Single Payment
  const unpostSinglePayment = (paymentId: string) => {
    const targetPayment = payments.find(p => p.id === paymentId);
    if (!targetPayment || !targetPayment.isPosted) return;

    if (!confirm(`هل أنت متأكد من إلغاء ترحيل السند رقم (${targetPayment.receiptNumber})؟ سيتم إعادة تسجيل المبلغ كمديونية على المشترك.`)) return;

    const updatedPayments = payments.map(p => 
      p.id === paymentId ? { ...p, isPosted: false, postedDate: undefined, postedBy: undefined } : p
    );

    const updatedSubs = subscribers.map(sub => {
      if (sub.id === targetPayment.subscriberId) {
        return {
          ...sub,
          currentBalance: sub.currentBalance + targetPayment.amountPaid
        };
      }
      return sub;
    });

    onUpdatePayments(updatedPayments);
    onUpdateSubscribers(updatedSubs);
    logAction('إلغاء ترحيل سند قبض', `إلغاء ترحيل سند رقم (${targetPayment.receiptNumber}) للمشترك (${targetPayment.subscriberName})`);
  };

  // Post all pending readings
  const postAllReadings = () => {
    if (pendingReadings.length === 0) {
      alert('لا توجد قراءات معلقة لترحيلها حالياً.');
      return;
    }

    const confirmPost = confirm(`هل أنت متأكد من ترحيل عدد (${pendingReadings.length}) قراءة عداد إلى الحسابات؟ سيتم ترحيل المبالغ لمديونية المشتركين وتحديث قراءاتهم النهائية.`);
    if (!confirmPost) return;

    const postedDate = new Date().toISOString().substring(0, 16).replace('T', ' ');
    const updatedReadings = readings.map(r => {
      if (!r.isPosted && !r.isRejected) {
        return { ...r, isPosted: true, postedDate, postedBy: currentUser.name };
      }
      return r;
    });

    const updatedSubs = subscribers.map(sub => {
      const subPendingReads = pendingReadings.filter(r => r.subscriberId === sub.id);
      if (subPendingReads.length > 0) {
        const totalCharge = subPendingReads.reduce((sum, r) => sum + r.totalAmount, 0);
        const latestReading = Math.max(...subPendingReads.map(r => r.currentReading), sub.currentReading);
        return {
          ...sub,
          currentReading: latestReading,
          currentBalance: sub.currentBalance + totalCharge
        };
      }
      return sub;
    });

    onUpdateReadings(updatedReadings);
    onUpdateSubscribers(updatedSubs);
    logAction('ترحيل القراءات الميدانية', `ترحيل وإقرار عدد ${pendingReadings.length} قراءة، وتحميل المديونيات للمشتركين`);
    alert(`تم بنجاح ترحيل عدد (${pendingReadings.length}) قراءة وتحديث أرصدة المشتركين.`);
  };

  // Post all pending payments
  const postAllPayments = () => {
    if (pendingPayments.length === 0) {
      alert('لا توجد سندات قبض معلقة لترحيلها حالياً.');
      return;
    }

    const confirmPost = confirm(`هل أنت متأكد من ترحيل عدد (${pendingPayments.length}) سند قبض مالي؟ سيتم خصم هذه المبالغ رسمياً من مديونيات المشتركين.`);
    if (!confirmPost) return;

    const postedDate = new Date().toISOString().substring(0, 16).replace('T', ' ');
    const updatedPayments = payments.map(p => {
      if (!p.isPosted && !p.isRejected) {
        return { ...p, isPosted: true, postedDate, postedBy: currentUser.name };
      }
      return p;
    });

    const updatedSubs = subscribers.map(sub => {
      const subPendingPays = pendingPayments.filter(p => p.subscriberId === sub.id);
      if (subPendingPays.length > 0) {
        const totalCredits = subPendingPays.reduce((sum, p) => sum + p.amountPaid, 0);
        return {
          ...sub,
          currentBalance: sub.currentBalance - totalCredits
        };
      }
      return sub;
    });

    onUpdatePayments(updatedPayments);
    onUpdateSubscribers(updatedSubs);
    logAction('ترحيل السندات والمقبوضات', `ترحيل وإقرار عدد ${pendingPayments.length} سند قبض مالي للدفاتر الختامية`);
    alert(`تم بنجاح ترحيل عدد (${pendingPayments.length}) سند مالي وتنزيل مديونيات المشتركين.`);
  };

  // Settle Collector Cash & Create Treasury Transfer Voucher
  const settleCollectorCash = (collectorName: string, totalAmount: number) => {
    if (totalAmount <= 0) return;
    if (!confirm(`هل ترغب بترحيل وتوريد كاش المحصل (${collectorName}) بمبلغ (${totalAmount.toLocaleString()} ${settings.currency}) للصندوق الرئيسي؟`)) return;

    const collectorPays = payments.filter(p => p.receivedBy === collectorName && !p.isPosted && !p.isRejected);
    const postedDate = new Date().toISOString().substring(0, 16).replace('T', ' ');

    const updatedPayments = payments.map(p => 
      (p.receivedBy === collectorName && !p.isPosted && !p.isRejected) 
        ? { ...p, isPosted: true, postedDate, postedBy: currentUser.name } 
        : p
    );

    const updatedSubs = subscribers.map(sub => {
      const cPays = collectorPays.filter(p => p.subscriberId === sub.id);
      if (cPays.length > 0) {
        const total = cPays.reduce((sum, p) => sum + p.amountPaid, 0);
        return { ...sub, currentBalance: sub.currentBalance - total };
      }
      return sub;
    });

    onUpdatePayments(updatedPayments);
    onUpdateSubscribers(updatedSubs);

    const newTrf: TreasuryTransfer = {
      id: Date.now().toString(),
      transferNumber: `TRF-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().split('T')[0],
      fromAccount: `عُهدة المحصل: ${collectorName}`,
      toAccount: 'الصندوق الرئيسي (الكاش)',
      amount: totalAmount,
      notes: `تصفية وتوريد عُهدة التحصيلات الميدانية للمحصل (${collectorName}) - إجمالي ${collectorPays.length} سند`,
      recordedBy: currentUser.name
    };

    const updatedTrfs = [newTrf, ...treasuryTransfers];
    if (onUpdateTreasuryTransfers) {
      onUpdateTreasuryTransfers(updatedTrfs);
    }

    logAction('تصفية عُهدة محصل', `توريد عُهدة المحصل (${collectorName}) بمبلغ ${totalAmount} ${settings.currency} وتوليد سند تحويل رقم (${newTrf.transferNumber})`);
    alert(`تم توريد وتصفية عُهدة المحصل (${collectorName}) بنجاح وتوليد سند تحويل الخزينة (${newTrf.transferNumber}).`);
  };

  return (
    <motion.div
      key="postings-sec"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 text-right font-sans"
    >
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <ArrowRightLeft className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">إدارة الترحيلات المالية والتحويلات الميدانية</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              فحص، مطابقة وإقرار القراءات والسندات الميدانية وتصفية عُهد المحصلين إلى الحسابات الختامية.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onCloseFiscalCycle}
            className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>إغلاق الدورة المالية وتصفير الشهر</span>
          </button>
          <button
            onClick={() => window.print()}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span>طباعة محضر الترحيل</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900/80 border border-amber-500/20 rounded-xl p-4">
          <div className="flex justify-between items-center text-slate-400 text-xs mb-2">
            <span>القراءات المعلقة</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400">
            {pendingReadings.reduce((sum, r) => sum + r.totalAmount, 0).toLocaleString()} {settings.currency}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">عدد ({pendingReadings.length}) قراءة عداد بانتظار الاعتماد</p>
        </div>

        <div className="bg-slate-900/80 border border-emerald-500/20 rounded-xl p-4">
          <div className="flex justify-between items-center text-slate-400 text-xs mb-2">
            <span>المقبوضات المعلقة</span>
            <Banknote className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {pendingPayments.reduce((sum, p) => sum + p.amountPaid, 0).toLocaleString()} {settings.currency}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">عدد ({pendingPayments.length}) سند قبض مالي بانتظار الترحيل</p>
        </div>

        <div className="bg-slate-900/80 border border-sky-500/20 rounded-xl p-4">
          <div className="flex justify-between items-center text-slate-400 text-xs mb-2">
            <span>إجمالي الترحيلات المعتمدة</span>
            <CheckCircle2 className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-bold font-mono text-sky-400">
            {(postedReadings.reduce((s, r) => s + r.totalAmount, 0) + postedPayments.reduce((s, p) => s + p.amountPaid, 0)).toLocaleString()} {settings.currency}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">مرحّلة في الأرصدة الختامية ({postedReadings.length + postedPayments.length} عملية)</p>
        </div>

        <div className="bg-slate-900/80 border border-rose-500/20 rounded-xl p-4">
          <div className="flex justify-between items-center text-slate-400 text-xs mb-2">
            <span>سجلات مرفوضة للتدقيق</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-400">
            {rejectedReadings.length + rejectedPayments.length}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">تحتاج مراجعة مع المحصل الميداني</p>
        </div>

        <div className="bg-slate-900/80 border border-indigo-500/20 rounded-xl p-4">
          <div className="flex justify-between items-center text-slate-400 text-xs mb-2">
            <span>عُهد المحصلين المعلقة</span>
            <Wallet className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold font-mono text-indigo-400">
            {pendingPayments.reduce((s, p) => s + p.amountPaid, 0).toLocaleString()} {settings.currency}
          </div>
          <p className="text-[10px] text-slate-500 mt-1">جاهزة للتوريد إلى الصندوق الرئيسي</p>
        </div>
      </div>

      {/* Sub-Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setPostingSubTab('pending')}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              postingSubTab === 'pending'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>الترحيلات المعلقة</span>
            <span className="px-1.5 py-0.2 bg-slate-950/40 rounded-full text-[10px]">
              {pendingReadings.length + pendingPayments.length}
            </span>
          </button>

          <button
            onClick={() => setPostingSubTab('posted')}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              postingSubTab === 'posted'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>السجلات المرحّلة والمعتمدة</span>
            <span className="px-1.5 py-0.2 bg-slate-950/40 rounded-full text-[10px]">
              {postedReadings.length + postedPayments.length}
            </span>
          </button>

          <button
            onClick={() => setPostingSubTab('rejected')}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              postingSubTab === 'rejected'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            <span>المرفوضة للتدقيق</span>
            <span className="px-1.5 py-0.2 bg-slate-950/40 rounded-full text-[10px]">
              {rejectedReadings.length + rejectedPayments.length}
            </span>
          </button>

          <button
            onClick={() => setPostingSubTab('collectors')}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              postingSubTab === 'collectors'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>تصفية عُهد المحصلين</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
          <input
            type="text"
            placeholder="ابحث باسم المشترك، رقم العداد، رقم السند..."
            value={postingSearch}
            onChange={e => setPostingSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pr-9 pl-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={postingCollectorFilter}
            onChange={e => setPostingCollectorFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl py-2 px-3 focus:outline-none"
          >
            <option value="all">كافة المحصلين الميدانيين</option>
            {Array.from(new Set([...readings.map(r => r.enteredBy), ...payments.map(p => p.receivedBy)])).filter(Boolean).map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {postingSubTab === 'pending' && (
            <div className="flex items-center gap-2">
              <button
                onClick={postAllReadings}
                disabled={pendingReadings.length === 0}
                className="bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                ترحيل كل القراءات ({pendingReadings.length})
              </button>
              <button
                onClick={postAllPayments}
                disabled={pendingPayments.length === 0}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                ترحيل كل السندات ({pendingPayments.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TAB 1: PENDING POSTINGS */}
      {postingSubTab === 'pending' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Meter Readings */}
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <h3 className="font-bold text-slate-200 text-sm">قراءات العدادات بانتظار الاعتماد</h3>
              </div>
              <span className="text-xs text-amber-400 font-mono font-bold">
                {pendingReadings.filter(r => 
                  (!postingSearch || r.subscriberName.includes(postingSearch) || r.meterNumber.includes(postingSearch)) &&
                  (postingCollectorFilter === 'all' || r.enteredBy === postingCollectorFilter)
                ).reduce((s, r) => s + r.totalAmount, 0).toLocaleString()} {settings.currency}
              </span>
            </div>

            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {pendingReadings.filter(r => 
                (!postingSearch || r.subscriberName.includes(postingSearch) || r.meterNumber.includes(postingSearch)) &&
                (postingCollectorFilter === 'all' || r.enteredBy === postingCollectorFilter)
              ).length === 0 ? (
                <div className="text-center py-12 text-slate-600 text-xs">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500/20 mx-auto mb-2" />
                  <p>جميع القراءات الميدانية مرحّلة ومطابقة بالكامل.</p>
                </div>
              ) : (
                pendingReadings.filter(r => 
                  (!postingSearch || r.subscriberName.includes(postingSearch) || r.meterNumber.includes(postingSearch)) &&
                  (postingCollectorFilter === 'all' || r.enteredBy === postingCollectorFilter)
                ).map(r => (
                  <div key={r.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="text-right flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-200 text-xs">{r.subscriberName}</h4>
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded font-mono">
                          عداد #{r.meterNumber}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        القراءة: <strong className="text-amber-400">{r.currentReading}</strong> (السابق: {r.previousReading}) | الاستهلاك: <strong className="text-slate-200">{r.consumption} ك.و.س</strong>
                      </p>
                      <p className="text-[9px] text-slate-500 mt-0.5">
                        المحصل: {r.enteredBy} | التاريخ: {r.readingDate} | الشهر: {r.billingMonth}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <div className="text-left font-mono font-bold text-amber-400 text-sm ml-2">
                        {r.totalAmount.toLocaleString()} {settings.currency}
                      </div>
                      <button
                        onClick={() => postSingleReading(r.id)}
                        className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 border border-emerald-500/20 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                        title="اعتماد وترحيل القراءة"
                      >
                        <Check className="w-4 h-4" />
                        <span>اعتماد</span>
                      </button>
                      <button
                        onClick={() => setRejectModalItem({ type: 'reading', id: r.id, name: r.subscriberName })}
                        className="p-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/20 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                        title="رفض القراءة"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>رفض</span>
                      </button>
                      <button
                        onClick={() => onSendReadingSMS(r)}
                        className="p-1.5 bg-slate-800 text-sky-400 hover:bg-sky-500/20 rounded-lg transition-colors cursor-pointer"
                        title="إرسال SMS"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pending Payments */}
          <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="font-bold text-slate-200 text-sm">سندات القبض النقدية بانتظار الترحيل</h3>
              </div>
              <span className="text-xs text-emerald-400 font-mono font-bold">
                {pendingPayments.filter(p => 
                  (!postingSearch || p.subscriberName.includes(postingSearch) || p.receiptNumber.includes(postingSearch)) &&
                  (postingCollectorFilter === 'all' || p.receivedBy === postingCollectorFilter)
                ).reduce((s, p) => s + p.amountPaid, 0).toLocaleString()} {settings.currency}
              </span>
            </div>

            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {pendingPayments.filter(p => 
                (!postingSearch || p.subscriberName.includes(postingSearch) || p.receiptNumber.includes(postingSearch)) &&
                (postingCollectorFilter === 'all' || p.receivedBy === postingCollectorFilter)
              ).length === 0 ? (
                <div className="text-center py-12 text-slate-600 text-xs">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500/20 mx-auto mb-2" />
                  <p>جميع سندات القبض المستلمة مرحّلة ومرحلة للحسابات.</p>
                </div>
              ) : (
                pendingPayments.filter(p => 
                  (!postingSearch || p.subscriberName.includes(postingSearch) || p.receiptNumber.includes(postingSearch)) &&
                  (postingCollectorFilter === 'all' || p.receivedBy === postingCollectorFilter)
                ).map(p => (
                  <div key={p.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="text-right flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-200 text-xs">{p.subscriberName}</h4>
                        <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded font-mono">
                          سند #{p.receiptNumber}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        الوسيط: <strong className="text-slate-200">{p.paymentMethod === 'cash' ? 'كاش مادي' : p.paymentMethod === 'e-wallet' ? 'محفظة إلكترونية' : 'تحويل بنكي'}</strong>
                      </p>
                      <p className="text-[9px] text-slate-500 mt-0.5">
                        استلمها المحصل: {p.receivedBy} | التاريخ: {p.paymentDate}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <div className="text-left font-mono font-bold text-emerald-400 text-sm ml-2">
                        {p.amountPaid.toLocaleString()} {settings.currency}
                      </div>
                      <button
                        onClick={() => postSinglePayment(p.id)}
                        className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 border border-emerald-500/20 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                        title="اعتماد وترحيل السند"
                      >
                        <Check className="w-4 h-4" />
                        <span>اعتماد</span>
                      </button>
                      <button
                        onClick={() => setRejectModalItem({ type: 'payment', id: p.id, name: p.subscriberName })}
                        className="p-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/20 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                        title="رفض السند"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>رفض</span>
                      </button>
                      <button
                        onClick={() => onSendPaymentSMS(p)}
                        className="p-1.5 bg-slate-800 text-sky-400 hover:bg-sky-500/20 rounded-lg transition-colors cursor-pointer"
                        title="إرسال SMS"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: POSTED ARCHIVE */}
      {postingSubTab === 'posted' && (
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="font-bold text-slate-200 text-sm border-b border-slate-800 pb-3 flex items-center justify-between">
            <span>أرشيف السجلات والقراءات المرحّلة رسمياً</span>
            <span className="text-xs font-mono text-sky-400">إجمالي {postedReadings.length + postedPayments.length} سجل مرحّل</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <th className="p-3">النوع</th>
                  <th className="p-3">اسم المشترك / المرجع</th>
                  <th className="p-3">المبلغ المرحّل</th>
                  <th className="p-3">المحكم/المعتمد</th>
                  <th className="p-3">تاريخ الترحيل</th>
                  <th className="p-3 text-center">الإجراءات والتحكم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {postedReadings.map(r => (
                  <tr key={r.id} className="hover:bg-slate-900/80 transition-colors">
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-md font-bold text-[10px]">
                        قراءة عداد
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-200">{r.subscriberName}</div>
                      <div className="text-[10px] text-slate-500">عداد #{r.meterNumber} | {r.consumption} ك.و.س</div>
                    </td>
                    <td className="p-3 font-mono font-bold text-amber-400">
                      +{r.totalAmount.toLocaleString()} {settings.currency}
                    </td>
                    <td className="p-3 text-slate-300">{r.postedBy || r.enteredBy || 'النظام'}</td>
                    <td className="p-3 text-slate-400 font-mono text-[11px]">{r.postedDate || r.readingDate}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => unpostSingleReading(r.id)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-rose-500/20 text-rose-400 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                      >
                        إلغاء الترحيل
                      </button>
                    </td>
                  </tr>
                ))}

                {postedPayments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-900/80 transition-colors">
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md font-bold text-[10px]">
                        سند قبض
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-200">{p.subscriberName}</div>
                      <div className="text-[10px] text-slate-500">سند #{p.receiptNumber}</div>
                    </td>
                    <td className="p-3 font-mono font-bold text-emerald-400">
                      -{p.amountPaid.toLocaleString()} {settings.currency}
                    </td>
                    <td className="p-3 text-slate-300">{p.postedBy || p.receivedBy || 'النظام'}</td>
                    <td className="p-3 text-slate-400 font-mono text-[11px]">{p.postedDate || p.paymentDate}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => unpostSinglePayment(p.id)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-rose-500/20 text-rose-400 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                      >
                        إلغاء الترحيل
                      </button>
                    </td>
                  </tr>
                ))}

                {postedReadings.length === 0 && postedPayments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-600">
                      لا توجد سجلات مرحّلة سابقة.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: REJECTED ITEMS */}
      {postingSubTab === 'rejected' && (
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="font-bold text-slate-200 text-sm border-b border-slate-800 pb-3 flex items-center justify-between">
            <span className="text-rose-400">سجلات وقراءات مرفوضة لإعادة التدقيق الميداني</span>
            <span className="text-xs font-mono text-slate-400">عدد {rejectedReadings.length + rejectedPayments.length} سجل مرفوض</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rejectedReadings.map(r => (
              <div key={r.id} className="bg-slate-950 p-4 rounded-xl border border-rose-500/30 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 text-[10px] rounded font-bold">قراءة مرفوضة</span>
                    <h4 className="font-bold text-slate-200 text-xs">{r.subscriberName}</h4>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">العداد: #{r.meterNumber} | القراءة: {r.currentReading}</p>
                  <p className="text-xs text-rose-400 font-semibold mt-1">سبب الرفض: {r.rejectionReason || 'عدم تطابق القراءة'}</p>
                  <p className="text-[10px] text-slate-500 mt-1">بإدخال: {r.enteredBy} | {r.readingDate}</p>
                </div>
                <button
                  onClick={() => postSingleReading(r.id)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                >
                  إعادة الاعتماد
                </button>
              </div>
            ))}

            {rejectedPayments.map(p => (
              <div key={p.id} className="bg-slate-950 p-4 rounded-xl border border-rose-500/30 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 text-[10px] rounded font-bold">سند قبض مرفوض</span>
                    <h4 className="font-bold text-slate-200 text-xs">{p.subscriberName}</h4>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">سند #{p.receiptNumber} | المبلغ: {p.amountPaid.toLocaleString()} {settings.currency}</p>
                  <p className="text-xs text-rose-400 font-semibold mt-1">سبب الرفض: {p.rejectionReason || 'عدم تطابق السند المادي'}</p>
                  <p className="text-[10px] text-slate-500 mt-1">المحصل: {p.receivedBy} | {p.paymentDate}</p>
                </div>
                <button
                  onClick={() => postSinglePayment(p.id)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                >
                  إعادة الاعتماد
                </button>
              </div>
            ))}

            {rejectedReadings.length === 0 && rejectedPayments.length === 0 && (
              <div className="col-span-2 text-center py-12 text-slate-600 text-xs">
                لا توجد أي قراءات أو سندات مرفوضة.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: COLLECTOR VAULT SETTLEMENT */}
      {postingSubTab === 'collectors' && (
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 space-y-6">
          <div>
            <h3 className="font-bold text-slate-200 text-sm">تصفية وتوريد عُهد المحصلين الميدانيين للصندوق الرئيسي</h3>
            <p className="text-xs text-slate-400 mt-1">
              يمكنك هنا مراجعة مبالغ التحصيلات النقدية المتراكمة في عُهدة كل محصل وتوريدها مباشرة بحوالة صندوق موثقة للخزينة الرئيسية.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from(new Set(payments.map(p => p.receivedBy))).filter((name): name is string => Boolean(name)).map(collectorName => {
              const colPayments = payments.filter(p => p.receivedBy === collectorName && !p.isPosted && !p.isRejected);
              const colTotal = colPayments.reduce((s, p) => s + p.amountPaid, 0);

              return (
                <div key={collectorName} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-100 text-sm">{collectorName}</h4>
                      <span className="text-[10px] text-slate-500">محصل ميداني</span>
                    </div>
                    <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                      <Wallet className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs text-slate-400">عُهدة نقدية بانتظار التوريد:</div>
                    <div className="text-xl font-mono font-bold text-emerald-400">
                      {colTotal.toLocaleString()} {settings.currency}
                    </div>
                    <p className="text-[10px] text-slate-500">إجمالي عدد ({colPayments.length}) سند غير مورد</p>
                  </div>

                  <button
                    onClick={() => settleCollectorCash(collectorName, colTotal)}
                    disabled={colTotal === 0}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    <span>توريد وتصفية إلى الصندوق الرئيسي</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectModalItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-right space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-slate-100 text-sm">رفض السند/القراءة للتدقيق</h3>
              <button onClick={() => setRejectModalItem(null)} className="text-slate-500 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-300">
              الرجاء كتابة سبب رفض {rejectModalItem.type === 'reading' ? 'قراءة' : 'سند'} المشترك (<strong>{rejectModalItem.name}</strong>):
            </p>

            <div className="flex flex-wrap gap-1.5">
              {['خطأ في القراءة الميدانية', 'مبلغ السند غير مطابق', 'صورة العداد غير واضحة', 'مطلوب إعادة معاينة'].map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setRejectionNote(tag)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px]"
                >
                  {tag}
                </button>
              ))}
            </div>

            <textarea
              value={rejectionNote}
              onChange={e => setRejectionNote(e.target.value)}
              placeholder="اكتب تفاصيل سبب الرفض هنا..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500/50 min-h-[90px] resize-none"
            />

            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (rejectModalItem.type === 'reading') {
                    handleRejectReading(rejectModalItem.id, rejectionNote);
                  } else {
                    handleRejectPayment(rejectModalItem.id, rejectionNote);
                  }
                }}
                className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                تأكيد الرفض
              </button>
              <button
                onClick={() => setRejectModalItem(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
