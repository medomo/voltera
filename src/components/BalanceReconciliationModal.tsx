import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Subscriber, MeterReading, Payment, SystemSettings, User, AuditLog 
} from '../types';
import { 
  performBalanceReconciliation, 
  SubscriberReconciliationItem, 
  BalanceReconciliationReport,
  deriveOpeningFromCurrentBalance
} from '../utils/balanceUtils';
import { 
  Scale, CheckCircle2, AlertTriangle, RefreshCw, X, Download, Printer, 
  Search, ShieldCheck, Check, ArrowRight, Zap, Filter, HelpCircle, Eye,
  ChevronDown, ChevronUp, SlidersHorizontal, ArrowUpDown, ArrowUpRight,
  ArrowDownLeft, FileText, Settings2, Info, CheckCheck
} from 'lucide-react';
import { safePrint, exportToCSV } from '../utils/exportUtils';

interface BalanceReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscribers: Subscriber[];
  readings: MeterReading[];
  payments: Payment[];
  settings: SystemSettings;
  currentUser: User;
  onUpdateSubscribers: (subs: Subscriber[]) => void;
  onAddAuditLog: (log: AuditLog) => void;
  onViewSubscriberProfile?: (subscriber: Subscriber) => void;
}

export const BalanceReconciliationModal: React.FC<BalanceReconciliationModalProps> = ({
  isOpen,
  onClose,
  subscribers,
  readings,
  payments,
  settings,
  currentUser,
  onUpdateSubscribers,
  onAddAuditLog,
  onViewSubscriberProfile
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'mismatched' | 'matched' | 'debtors' | 'creditors'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState('all');
  const [sortBy, setSortBy] = useState<'discrepancy' | 'name' | 'balance' | 'billed'>('discrepancy');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isFixingAll, setIsFixingAll] = useState(false);
  const [fixedSubIds, setFixedSubIds] = useState<Set<string>>(new Set());
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);

  // Run real-time reconciliation calculation
  const report: BalanceReconciliationReport = useMemo(() => {
    return performBalanceReconciliation(subscribers, readings, payments);
  }, [subscribers, readings, payments]);

  // Extract unique zones
  const uniqueZones = useMemo(() => {
    const zones = new Set(subscribers.map(s => s.zone).filter(Boolean) as string[]);
    return Array.from(zones);
  }, [subscribers]);

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    let list = report.items.filter(item => {
      // Tab filter
      if (activeFilter === 'mismatched' && item.isMatched) return false;
      if (activeFilter === 'matched' && !item.isMatched) return false;
      if (activeFilter === 'debtors' && item.calculatedBalance <= 0) return false;
      if (activeFilter === 'creditors' && item.calculatedBalance >= 0) return false;

      // Zone filter
      if (selectedZone !== 'all' && item.subscriber.zone !== selectedZone) return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const name = (item.subscriber.name || '').toLowerCase();
        const meter = (item.subscriber.meterNumber || '').toLowerCase();
        const phone = (item.subscriber.phone || '').toLowerCase();
        const code = (item.subscriber.subscriberCode || '').toLowerCase();
        if (!name.includes(query) && !meter.includes(query) && !phone.includes(query) && !code.includes(query)) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    list.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'discrepancy') {
        comparison = Math.abs(b.discrepancy) - Math.abs(a.discrepancy);
      } else if (sortBy === 'name') {
        comparison = (a.subscriber.name || '').localeCompare(b.subscriber.name || '', 'ar');
      } else if (sortBy === 'balance') {
        comparison = b.calculatedBalance - a.calculatedBalance;
      } else if (sortBy === 'billed') {
        comparison = b.totalBilled - a.totalBilled;
      }
      return sortOrder === 'desc' ? comparison : -comparison;
    });

    return list;
  }, [report.items, activeFilter, selectedZone, searchQuery, sortBy, sortOrder]);

  // Handle single subscriber balance fix (Update Current Balance to match Ledger)
  const handleFixCurrentBalance = (item: SubscriberReconciliationItem) => {
    const updatedSubscribers = subscribers.map(s => {
      if (s.id === item.subscriber.id) {
        return {
          ...s,
          currentBalance: item.calculatedBalance
        };
      }
      return s;
    });

    onUpdateSubscribers(updatedSubscribers);
    setFixedSubIds(prev => new Set(prev).add(item.subscriber.id));

    onAddAuditLog({
      id: `log-${Date.now()}`,
      userId: currentUser.id || 'admin',
      userName: currentUser.name || currentUser.username || 'الإدارة',
      action: 'مطابقة وتصحيح رصيد مسجل',
      details: `تمت مطابقة وتصحيح رصيد المشترك (${item.subscriber.name} - عداد: ${item.subscriber.meterNumber}) من ${item.recordedBalance.toLocaleString()} إلى ${item.calculatedBalance.toLocaleString()} ${settings.currency} (فارق مسوى: ${item.discrepancy.toLocaleString()}).`,
      timestamp: new Date().toISOString(),
      category: 'financial'
    });
  };

  // Handle single subscriber opening balance calibration (Adjust Opening Balance so ledger matches recorded balance)
  const handleCalibrateOpeningBalance = (item: SubscriberReconciliationItem) => {
    const newOpening = deriveOpeningFromCurrentBalance(item.recordedBalance, item.subscriber, readings, payments);
    
    const updatedSubscribers = subscribers.map(s => {
      if (s.id === item.subscriber.id) {
        return {
          ...s,
          openingBalance: newOpening
        };
      }
      return s;
    });

    onUpdateSubscribers(updatedSubscribers);
    setFixedSubIds(prev => new Set(prev).add(item.subscriber.id));

    onAddAuditLog({
      id: `log-${Date.now()}`,
      userId: currentUser.id || 'admin',
      userName: currentUser.name || currentUser.username || 'الإدارة',
      action: 'معايرة رصيد افتتاحي للمشترك',
      details: `تمت معايرة وضبط الرصيد الافتتاحي للمشترك (${item.subscriber.name} - عداد: ${item.subscriber.meterNumber}) من ${item.openingBalance.toLocaleString()} إلى ${newOpening.toLocaleString()} ${settings.currency} ليتوافق دفترياً مع الرصيد المسجل.`,
      timestamp: new Date().toISOString(),
      category: 'financial'
    });
  };

  // Handle batch fix for all mismatched subscribers
  const handleBatchFixAll = () => {
    const mismatchedItems = report.items.filter(i => !i.isMatched);
    if (mismatchedItems.length === 0) {
      alert('جميع أرصدة المشتركين متطابقة محاسبياً بالفعل ولا توجد أي فروقات تتطلب التصحيح.');
      return;
    }

    const confirmed = confirm(
      `هل أنت متأكد من رغبتك في تصحيح ومطابقة أرصدة (${mismatchedItems.length}) مشترك دفعة واحدة؟\n\n` +
      `سيتم تحديث الرصيد المسجل لكل مشترك ليطابق المعادلة الدفترية المعتمدة:\n` +
      `[الرصيد الافتتاحي + مجموع الفواتير المعتمدة - مجموع السندات المحصلة]\n` +
      `بإجمالي فروقات يتم تسويتها: ${report.totalDiscrepancy.toLocaleString()} ${settings.currency}.`
    );

    if (!confirmed) return;

    setIsFixingAll(true);
    const updatedMap = new Map<string, number>();
    mismatchedItems.forEach(item => {
      updatedMap.set(item.subscriber.id, item.calculatedBalance);
    });

    const updatedSubscribers = subscribers.map(s => {
      if (updatedMap.has(s.id)) {
        return {
          ...s,
          currentBalance: updatedMap.get(s.id)!
        };
      }
      return s;
    });

    onUpdateSubscribers(updatedSubscribers);

    onAddAuditLog({
      id: `log-${Date.now()}`,
      userId: currentUser.id || 'admin',
      userName: currentUser.name || currentUser.username || 'الإدارة',
      action: 'مطابقة وتصحيح أرصدة جماعية',
      details: `تمت تسوية وتصحيح أرصدة (${mismatchedItems.length}) مشترك دفعة واحدة لتطابق سجل الفواتير والمقبوضات بإجمالي تسويات ${report.totalDiscrepancy.toLocaleString()} ${settings.currency}.`,
      timestamp: new Date().toISOString(),
      category: 'financial'
    });

    setIsFixingAll(false);
    alert(`✅ تم بنجاح تصحيح ومطابقة أرصدة (${mismatchedItems.length}) مشترك!\nأصبحت جميع الأرصدة متطابقة دفترياً 100% مع الفواتير وسندات القبض.`);
  };

  // Export report to CSV
  const handleExportCSV = () => {
    const columns = [
      { key: 'code', label: 'كود المشترك' },
      { key: 'name', label: 'اسم المشترك' },
      { key: 'meterNumber', label: 'رقم العداد' },
      { key: 'zone', label: 'المنطقة' },
      { key: 'tariffType', label: 'نوع التعرفة' },
      { key: 'openingBalance', label: 'الرصيد الافتتاحي' },
      { key: 'totalBilled', label: 'إجمالي الفواتير' },
      { key: 'totalCollected', label: 'إجمالي السندات المحصلة' },
      { key: 'calculatedBalance', label: 'الرصيد الدفتري المحسوب' },
      { key: 'recordedBalance', label: 'الرصيد المسجل بالنظام' },
      { key: 'discrepancy', label: 'الفارق الحسابي' },
      { key: 'matchStatus', label: 'حالة المطابقة' }
    ];

    const data = filteredItems.map(item => ({
      code: item.subscriber.subscriberCode || item.subscriber.id,
      name: item.subscriber.name,
      meterNumber: item.subscriber.meterNumber,
      zone: item.subscriber.zone || '',
      tariffType: item.subscriber.tariffType || '',
      openingBalance: item.openingBalance,
      totalBilled: item.totalBilled,
      totalCollected: item.totalCollected,
      calculatedBalance: item.calculatedBalance,
      recordedBalance: item.recordedBalance,
      discrepancy: item.discrepancy,
      matchStatus: item.isMatched ? 'متطابق 100%' : 'غير مطابق (يوجد فارق)'
    }));

    exportToCSV(data, `تقرير_فحص_ومطابقة_الارصدة_${new Date().toISOString().substring(0, 10)}`, columns);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 md:p-6 text-right font-sans">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/85 backdrop-blur-md print:hidden"
          onClick={onClose}
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="relative w-full max-w-7xl max-h-[94vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100 z-10 print:max-h-none print:shadow-none print:border-none print:bg-white print:text-black"
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-950/70 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 print:border-b-2 print:border-black print:pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl shrink-0 print:hidden shadow-inner">
                <Scale className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black text-white print:text-black">
                    مركز فحص ومطابقة الأرصدة التلقائية (Real-time Balance Reconciliation)
                  </h2>
                  {report.hasDiscrepancies ? (
                    <span className="px-2.5 py-0.5 bg-rose-500/15 text-rose-400 border border-rose-500/30 rounded-full text-xs font-black flex items-center gap-1 shadow-sm">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{report.mismatchedCount} فروقات مكتشفة</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-black flex items-center gap-1 shadow-sm">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>متطابق دفترياً 100%</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-bold mt-1 print:text-slate-700">
                  تدقيق دفتري ذكي يقارن معادلة <span className="text-amber-400 font-mono font-black">[الرصيد الافتتاحي + الفواتير المعتمدة - السندات المحصلة]</span> مع الرصيد المسجل لكل مشترك
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center print:hidden">
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700 shadow-sm"
                title="تصدير النتائج إلى Excel / CSV"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">تصدير CSV</span>
              </button>

              <button
                type="button"
                onClick={() => safePrint()}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700 shadow-sm"
                title="طباعة تقرير المطابقة والتدقيق"
              >
                <Printer className="w-4 h-4 text-sky-400" />
                <span className="hidden sm:inline">طباعة التقرير</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Status Alert Banner */}
            {report.hasDiscrepancies ? (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shadow-lg shadow-rose-950/20">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-rose-300">
                      تنبيه مالي: تم اكتشاف {report.mismatchedCount} مشترك لديهم تفاوت بين الرصيد المسجل والدفتري
                    </h3>
                    <p className="text-xs text-rose-200/80 font-bold mt-1 leading-relaxed">
                      إجمالي الفروقات المحاسبية المطلقة تبلغ{' '}
                      <span className="font-mono font-black text-rose-300">{report.totalDiscrepancy.toLocaleString()} {settings.currency}</span>.
                      يمكنك مراجعة كل حالة أدناه وتصحيحها فوراً أو استخدام زر التسوية الشاملة لكافة الأرصدة دفعة واحدة.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleBatchFixAll}
                  disabled={isFixingAll}
                  className="w-full lg:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shrink-0"
                >
                  <RefreshCw className={`w-4 h-4 ${isFixingAll ? 'animate-spin' : ''}`} />
                  <span>تصحيح ومطابقة كافة الفروقات فوراً ({report.mismatchedCount}) ⚡</span>
                </button>
              </div>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-lg shadow-emerald-950/20">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-emerald-300">
                      ممتاز! كافة حسابات وأرصدة المشتركين متطابقة دفترياً بنسبة 100%
                    </h3>
                    <p className="text-xs text-emerald-200/80 font-bold mt-0.5">
                      لا توجد أي فروقات حسابية بين الأرصدة الافتتاحية والفواتير المعتمدة وسندات القبض المسجلة في النظام.
                    </p>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-2 text-xs font-mono font-black text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1.5 rounded-xl shadow-inner">
                  <CheckCheck className="w-4 h-4" />
                  <span>نسبة المطابقة: 100%</span>
                </div>
              </div>
            )}

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Card 1: Total Audited */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl">
                <span className="text-[11px] text-slate-400 font-bold block mb-1">إجمالي المشتركين المدققين</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl sm:text-2xl font-black text-white font-mono">{report.totalSubscribers}</span>
                  <span className="text-xs text-slate-500 font-bold">مشترك</span>
                </div>
                <div className="mt-2 text-[10px] text-slate-400 font-bold">
                  فحص لحظي شامل ومباشر
                </div>
              </div>

              {/* Card 2: 100% In-Sync */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl">
                <span className="text-[11px] text-slate-400 font-bold block mb-1">المتطابق دفترياً 100%</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">{report.matchedCount}</span>
                  <span className="text-xs text-emerald-500 font-bold">({report.matchPercentage}%)</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${report.matchPercentage}%` }}
                  />
                </div>
              </div>

              {/* Card 3: Discrepancies */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl">
                <span className="text-[11px] text-slate-400 font-bold block mb-1">فروقات تحتاج تسوية</span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-xl sm:text-2xl font-black font-mono ${report.mismatchedCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {report.mismatchedCount}
                  </span>
                  <span className="text-xs text-slate-500 font-bold">مشترك</span>
                </div>
                <div className="mt-2 text-[10px] text-slate-400 font-bold">
                  {report.mismatchedCount > 0 ? 'تفاوت في الرصيد المسجل' : 'لا توجد فروقات'}
                </div>
              </div>

              {/* Card 4: Total Variance */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl">
                <span className="text-[11px] text-slate-400 font-bold block mb-1">صافي الفروقات المحاسبية</span>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-xl sm:text-2xl font-black font-mono ${report.totalDiscrepancy > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {report.totalDiscrepancy.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-500 font-sans">{settings.currency}</span>
                </div>
                <div className="mt-2 text-[10px] text-slate-400 font-bold">
                  إجمالي المبالغ المعلقة للتسوية
                </div>
              </div>
            </div>

            {/* Financial Ledger Summary Totals */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs shadow-md">
              <div>
                <span className="text-slate-400 block text-[11px] font-bold">مجموع الأرصدة الافتتاحية:</span>
                <span className="text-white font-mono font-black text-sm mt-0.5 block">
                  {report.totalOpeningBalances.toLocaleString()} {settings.currency}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-bold">مجموع الفواتير المعتمدة (+):</span>
                <span className="text-sky-400 font-mono font-black text-sm mt-0.5 block">
                  {report.totalBilled.toLocaleString()} {settings.currency}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-bold">مجموع السندات المحصلة (-):</span>
                <span className="text-emerald-400 font-mono font-black text-sm mt-0.5 block">
                  {report.totalCollected.toLocaleString()} {settings.currency}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] font-bold">الرصيد الدفتري التراكمي:</span>
                <span className="text-amber-400 font-mono font-black text-sm mt-0.5 block">
                  {report.totalCalculatedBalance.toLocaleString()} {settings.currency}
                </span>
              </div>
            </div>

            {/* Filter and Search Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
              {/* Tab filter pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                    activeFilter === 'all'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/15'
                      : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span>كافة المشتركين ({report.totalSubscribers})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFilter('mismatched')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeFilter === 'mismatched'
                      ? 'bg-rose-500 text-white shadow-md shadow-rose-500/15'
                      : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span>الفروقات فقط</span>
                  {report.mismatchedCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-rose-950 text-rose-300 rounded-full text-[10px]">
                      {report.mismatchedCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFilter('matched')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                    activeFilter === 'matched'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/15'
                      : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span>المتطابقين ({report.matchedCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFilter('debtors')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                    activeFilter === 'debtors'
                      ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/15'
                      : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span>المدينين ({report.debtorsCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFilter('creditors')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                    activeFilter === 'creditors'
                      ? 'bg-purple-500 text-white shadow-md shadow-purple-500/15'
                      : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span>الدائنين ({report.creditorsCount})</span>
                </button>
              </div>

              {/* Search, Zone and Sort Controls */}
              <div className="flex flex-wrap items-center gap-2 flex-1 md:max-w-xl">
                <div className="relative flex-1 min-w-[160px]">
                  <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث بالاسم، رقم العداد، الهاتف..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-9 pl-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-amber-500"
                  />
                </div>

                {uniqueZones.length > 0 && (
                  <select
                    value={selectedZone}
                    onChange={(e) => setSelectedZone(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="all">كل المناطق</option>
                    {uniqueZones.map(z => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                )}

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="discrepancy">ترتيب: الفارق الحسابي</option>
                  <option value="name">ترتيب: اسم المشترك</option>
                  <option value="balance">ترتيب: الرصيد الدفتري</option>
                  <option value="billed">ترتيب: حجم الفواتير</option>
                </select>

                <button
                  type="button"
                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  className="p-1.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white cursor-pointer"
                  title={sortOrder === 'desc' ? 'تنازلي' : 'تصاعدي'}
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Reconciliation Ledger Table */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-900/90 text-slate-400 font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-3">المشترك والعداد</th>
                      <th className="p-3 text-center">الرصيد الافتتاحي</th>
                      <th className="p-3 text-center text-sky-400">الفواتير المعتمدة (+)</th>
                      <th className="p-3 text-center text-emerald-400">السندات المحصلة (-)</th>
                      <th className="p-3 text-center text-amber-400">الرصيد الدفتري المحسوب</th>
                      <th className="p-3 text-center">الرصيد المسجل بالنظام</th>
                      <th className="p-3 text-center">الفارق الحسابي</th>
                      <th className="p-3 text-center print:hidden">إجراءات المطابقة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-bold text-slate-200">
                    {filteredItems.map((item) => {
                      const isRecentlyFixed = fixedSubIds.has(item.subscriber.id);
                      const isExpanded = expandedSubId === item.subscriber.id;

                      return (
                        <React.Fragment key={item.subscriber.id}>
                          <tr 
                            className={`hover:bg-slate-800/40 transition-colors ${
                              !item.isMatched ? 'bg-rose-950/15' : ''
                            }`}
                          >
                            {/* Subscriber & Meter */}
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setExpandedSubId(isExpanded ? null : item.subscriber.id)}
                                  className="text-slate-500 hover:text-slate-300 p-0.5 rounded cursor-pointer"
                                  title="عرض تفاصيل الحركات"
                                >
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>
                                <div className={`w-2 h-2 rounded-full shrink-0 ${
                                  item.isMatched ? 'bg-emerald-500' : 'bg-rose-500'
                                }`} />
                                <div>
                                  <span className="font-bold text-white block">{item.subscriber.name}</span>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                    <span className="font-mono text-amber-400">عداد: {item.subscriber.meterNumber}</span>
                                    {item.subscriber.zone && <span>• {item.subscriber.zone}</span>}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Opening Balance */}
                            <td className="p-3 text-center font-mono font-black text-slate-300">
                              {item.openingBalance.toLocaleString()} <span className="text-[10px] text-slate-500">{settings.currency}</span>
                            </td>

                            {/* Billed Invoices */}
                            <td className="p-3 text-center font-mono font-black text-sky-400">
                              {item.totalBilled.toLocaleString()} <span className="text-[10px] text-slate-500">{settings.currency}</span>
                            </td>

                            {/* Collected Receipts */}
                            <td className="p-3 text-center font-mono font-black text-emerald-400">
                              {item.totalCollected.toLocaleString()} <span className="text-[10px] text-slate-500">{settings.currency}</span>
                            </td>

                            {/* Calculated Balance */}
                            <td className="p-3 text-center font-mono font-black text-amber-400">
                              {item.calculatedBalance.toLocaleString()} <span className="text-[10px] text-slate-500">{settings.currency}</span>
                            </td>

                            {/* Recorded Balance */}
                            <td className="p-3 text-center font-mono font-black text-white">
                              {item.recordedBalance.toLocaleString()} <span className="text-[10px] text-slate-500">{settings.currency}</span>
                            </td>

                            {/* Discrepancy */}
                            <td className="p-3 text-center font-mono font-black">
                              {item.isMatched ? (
                                <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-[11px] inline-flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  <span>0.00 (متطابق)</span>
                                </span>
                              ) : (
                                <span className={`px-2.5 py-0.5 rounded-lg text-[11px] inline-flex items-center gap-1 border ${
                                  item.discrepancy > 0 
                                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' 
                                    : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                }`}>
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>{item.discrepancy > 0 ? `+${item.discrepancy.toLocaleString()}` : item.discrepancy.toLocaleString()}</span>
                                </span>
                              )}
                            </td>

                            {/* Action */}
                            <td className="p-3 text-center print:hidden">
                              <div className="flex items-center justify-center gap-1.5">
                                {!item.isMatched ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleFixCurrentBalance(item)}
                                      className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-[11px] font-black flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm"
                                      title="تحديث الرصيد المسجل ليطابق الرصيد الدفتري الحقيقي فوراً"
                                    >
                                      <Zap className="w-3 h-3" />
                                      <span>تصحيح الرصيد ⚡</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleCalibrateOpeningBalance(item)}
                                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-[11px] font-bold border border-slate-700 cursor-pointer transition-colors"
                                      title="معايرة الرصيد الافتتاحي ليتوافق مع الرصيد المسجل الحالي"
                                    >
                                      <Settings2 className="w-3.5 h-3.5 text-amber-400" />
                                    </button>
                                  </div>
                                ) : isRecentlyFixed ? (
                                  <span className="text-emerald-400 text-[11px] font-black flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>تم التصحيح</span>
                                  </span>
                                ) : (
                                  <span className="text-emerald-400/80 text-[11px] font-bold flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    <span>مطابق 100%</span>
                                  </span>
                                )}

                                {onViewSubscriberProfile && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onClose();
                                      onViewSubscriberProfile(item.subscriber);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                    title="معاينة كشف حساب المشترك الكامل"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Transaction & Ledger Breakdown Row */}
                          {isExpanded && (
                            <tr className="bg-slate-900/90 border-y border-slate-800/80">
                              <td colSpan={8} className="p-4">
                                <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-xs space-y-3">
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                      <Info className="w-4 h-4 text-amber-400" />
                                      <span className="font-bold text-white">تفاصيل المعادلة المحاسبية للمشترك: {item.subscriber.name}</span>
                                    </div>
                                    <div className="font-mono text-[11px] text-slate-400">
                                      المعادلة: [{item.openingBalance} افتتاحي] + [{item.totalBilled} فواتير ({item.ledgerDetails.readingsCount})] - [{item.totalCollected} مقبوضات ({item.ledgerDetails.paymentsCount})] = <span className="text-amber-400 font-bold">{item.calculatedBalance} {settings.currency}</span>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-[11px] pt-2 border-t border-slate-800">
                                    <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                                      <span className="text-slate-400 block mb-0.5">عدد الفواتير المعتمدة:</span>
                                      <span className="font-mono font-bold text-sky-400 text-xs">{item.ledgerDetails.readingsCount} فاتورة</span>
                                      {item.ledgerDetails.latestReadingDate && (
                                        <span className="text-[10px] text-slate-500 block mt-0.5">آخر فاتورة: {item.ledgerDetails.latestReadingDate} ({item.ledgerDetails.latestReadingAmount?.toLocaleString()} {settings.currency})</span>
                                      )}
                                    </div>

                                    <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                                      <span className="text-slate-400 block mb-0.5">عدد السندات المحصلة:</span>
                                      <span className="font-mono font-bold text-emerald-400 text-xs">{item.ledgerDetails.paymentsCount} سند قبض</span>
                                      {item.ledgerDetails.latestPaymentDate && (
                                        <span className="text-[10px] text-slate-500 block mt-0.5">آخر سند: {item.ledgerDetails.latestPaymentDate} (سند #{item.ledgerDetails.latestReceiptNumber || '-'})</span>
                                      )}
                                    </div>

                                    <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                                      <span className="text-slate-400 block mb-0.5">الرصيد الافتتاحي المسجل:</span>
                                      <span className="font-mono font-bold text-white text-xs">{item.openingBalance.toLocaleString()} {settings.currency}</span>
                                      <span className="text-[10px] text-slate-500 block mt-0.5">تاريخ التسجيل: {item.subscriber.createdAt ? item.subscriber.createdAt.substring(0, 10) : 'غير محدد'}</span>
                                    </div>

                                    <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                                      <span className="text-slate-400 block mb-0.5">حالة التوازن المحاسبي:</span>
                                      <span className={`font-bold text-xs ${item.isMatched ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {item.statusText}
                                      </span>
                                      {!item.isMatched && (
                                        <span className="text-[10px] text-rose-300/80 block mt-0.5">فارق يحتاج معالجة: {item.discrepancy.toLocaleString()} {settings.currency}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}

                    {filteredItems.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500 font-bold">
                          لا توجد نتائج مطابقة لمعايير البحث الحالية.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0 print:hidden">
            <div className="text-xs text-slate-400 font-bold">
              <span>تم تدقيق <span className="font-mono text-white font-black">{report.totalSubscribers}</span> مشترك • النتيجة: <span className={report.hasDiscrepancies ? 'text-rose-400 font-black' : 'text-emerald-400 font-black'}>{report.hasDiscrepancies ? `يوجد ${report.mismatchedCount} فروقات` : 'كافة الأرصدة مطابقة تماماً'}</span></span>
            </div>

            <div className="flex items-center gap-3">
              {report.hasDiscrepancies && (
                <button
                  type="button"
                  onClick={handleBatchFixAll}
                  disabled={isFixingAll}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFixingAll ? 'animate-spin' : ''}`} />
                  <span>تصحيح ومطابقة كافة الفروقات دفعة واحدة ({report.mismatchedCount})</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
