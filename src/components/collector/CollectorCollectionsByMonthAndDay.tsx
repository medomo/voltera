import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, CalendarDays, Clock, Banknote, Receipt, 
  TrendingUp, Search, Filter, Printer, CheckCircle2, 
  AlertCircle, ChevronRight, ChevronDown, ChevronUp, 
  RotateCcw, Wallet, Building2, UserRound, ArrowUpDown, 
  FileText, Copy, Share2, Layers, Sparkles, Check, 
  MapPin, Edit3, X, Eye, Calculator
} from 'lucide-react';
import { Subscriber, MeterReading, Payment, User, SystemSettings } from '../../types';
import { normalizeArabicText, normalizeMeterNumber } from '../../utils/arabicSearchUtils';

interface CollectorCollectionsByMonthAndDayProps {
  currentUser: User;
  settings: SystemSettings;
  subscribers: Subscriber[];
  readings: MeterReading[];
  payments: Payment[];
  dailyGoal: number;
  monthlyGoal: number;
  onPrintReceipt: (payment: Payment, sub?: Subscriber) => void;
  onPrintShiftReport: (dayDate?: string, customPayments?: Payment[]) => void;
  onStartEditPayment: (payment: Payment) => void;
  onStartEditReading: (reading: MeterReading) => void;
  onDeletePayment: (paymentId: string) => void;
  onDeleteReading: (readingId: string) => void;
  onSelectSubscriberForReading?: (sub: Subscriber) => void;
  onSelectSubscriberForPayment?: (sub: Subscriber) => void;
  onSelectSubscriberForStatement?: (sub: Subscriber) => void;
  getActionTimeRemaining: (item: { isPosted: boolean; readingDate?: string; paymentDate?: string }) => { allowed: boolean; label: string };
  initialMode?: 'daily' | 'monthly' | 'operations_log';
  uniqueZones: string[];
}

export const CollectorCollectionsByMonthAndDay: React.FC<CollectorCollectionsByMonthAndDayProps> = ({
  currentUser,
  settings,
  subscribers,
  readings,
  payments,
  dailyGoal,
  monthlyGoal,
  onPrintReceipt,
  onPrintShiftReport,
  onStartEditPayment,
  onStartEditReading,
  onDeletePayment,
  onDeleteReading,
  onSelectSubscriberForReading,
  onSelectSubscriberForPayment,
  onSelectSubscriberForStatement,
  getActionTimeRemaining,
  initialMode = 'daily',
  uniqueZones,
}) => {
  // Main view mode
  const [viewMode, setViewMode] = useState<'daily' | 'monthly' | 'operations_log'>(initialMode);

  // Today & This Month constants
  const todayStr = useMemo(() => new Date().toISOString().substring(0, 10), []);
  const thisMonthStr = useMemo(() => todayStr.substring(0, 7), [todayStr]);

  // Selected Day & Selected Month for drilldowns
  const [selectedDayDate, setSelectedDayDate] = useState<string>(todayStr);
  const [selectedMonthStr, setSelectedMonthStr] = useState<string>(thisMonthStr);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | 'cash' | 'e-wallet' | 'bank'>('all');
  const [postingStatusFilter, setPostingStatusFilter] = useState<'all' | 'posted' | 'unposted'>('all');

  // Expanded days accordion set (for multiple days preview)
  const [expandedDays, setExpandedDays] = useState<Set<string>>(() => new Set([todayStr]));

  // Copied alert state
  const [copiedDayText, setCopiedDayText] = useState<string | null>(null);

  // Print monthly statement modal state
  const [showMonthlyPrintModal, setShowMonthlyPrintModal] = useState(false);

  // Fast subscriber lookup map
  const subMap = useMemo(() => {
    const map = new Map<string, Subscriber>();
    subscribers.forEach(s => map.set(s.id, s));
    return map;
  }, [subscribers]);

  // Helper date formatters
  const formatMonthArabic = (monthStr: string) => {
    if (!monthStr || monthStr.length < 7) return monthStr;
    const [year, month] = monthStr.split('-');
    const names: { [k: string]: string } = {
      '01': 'يناير', '02': 'فبراير', '03': 'مارس', '04': 'أبريل',
      '05': 'مايو', '06': 'يونيو', '07': 'يوليو', '08': 'أغسطس',
      '09': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر',
    };
    return `${names[month] || month} ${year}`;
  };

  const formatDateArabic = (dateStr: string) => {
    if (!dateStr || typeof dateStr !== 'string' || dateStr.length < 10) return String(dateStr || '');
    try {
      const d = new Date(String(dateStr).replace(' ', 'T'));
      if (isNaN(d.getTime())) return dateStr;
      const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const dayName = days[d.getDay()];
      const [year, month, day] = dateStr.substring(0, 10).split('-');
      const names: { [k: string]: string } = {
        '01': 'يناير', '02': 'فبراير', '03': 'مارس', '04': 'أبريل',
        '05': 'مايو', '06': 'يونيو', '07': 'يوليو', '08': 'أغسطس',
        '09': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر',
      };
      return `${dayName} ${parseInt(day, 10)} ${names[month] || month} ${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  // Collector's own payments
  const myAllPayments = useMemo(() => {
    return payments.filter(p => p.receivedBy === currentUser.username);
  }, [payments, currentUser.username]);

  // Collector's own readings
  const myAllReadings = useMemo(() => {
    return readings.filter(r => r.enteredBy === currentUser.username);
  }, [readings, currentUser.username]);

  // -------------------------------------------------------------
  // GROUPING BY DAY
  // -------------------------------------------------------------
  interface DayGroup {
    date: string;
    formattedDate: string;
    payments: Payment[];
    totalAmount: number;
    cashAmount: number;
    walletAmount: number;
    bankAmount: number;
    receiptsCount: number;
    uniqueSubsCount: number;
    avgAmount: number;
  }

  const daysGroups = useMemo(() => {
    const map = new Map<string, Payment[]>();

    myAllPayments.forEach(p => {
      const d = p.paymentDate ? p.paymentDate.substring(0, 10) : todayStr;
      if (!map.has(d)) {
        map.set(d, []);
      }
      map.get(d)!.push(p);
    });

    // Ensure today's date exists even if no payments yet
    if (!map.has(todayStr)) {
      map.set(todayStr, []);
    }

    const groups: DayGroup[] = [];
    map.forEach((pays, date) => {
      const total = pays.reduce((sum, p) => sum + p.amountPaid, 0);
      const cash = pays.filter(p => p.paymentMethod === 'cash').reduce((sum, p) => sum + p.amountPaid, 0);
      const wallet = pays.filter(p => p.paymentMethod === 'e-wallet').reduce((sum, p) => sum + p.amountPaid, 0);
      const bank = pays.filter(p => p.paymentMethod === 'transfer').reduce((sum, p) => sum + p.amountPaid, 0);
      const uniqueSubs = new Set(pays.map(p => p.subscriberId)).size;
      const avg = pays.length > 0 ? Math.round(total / pays.length) : 0;

      groups.push({
        date,
        formattedDate: formatDateArabic(date),
        payments: pays.sort((a, b) => (b.paymentDate || '').localeCompare(a.paymentDate || '')),
        totalAmount: total,
        cashAmount: cash,
        walletAmount: wallet,
        bankAmount: bank,
        receiptsCount: pays.length,
        uniqueSubsCount: uniqueSubs,
        avgAmount: avg,
      });
    });

    // Sort descending (newest date first)
    return groups.sort((a, b) => b.date.localeCompare(a.date));
  }, [myAllPayments, todayStr]);

  // Filtered Day Groups based on Search and Zone/Payment Method filters
  const filteredDaysGroups = useMemo(() => {
    return daysGroups.map(dg => {
      const filteredPayments = dg.payments.filter(p => {
        // Zone filter
        if (zoneFilter !== 'all') {
          const sub = subMap.get(p.subscriberId);
          if (!sub || sub.zone !== zoneFilter) return false;
        }

        // Payment Method filter
        if (paymentMethodFilter !== 'all') {
          if (paymentMethodFilter === 'bank') {
            if (p.paymentMethod !== 'bank' && p.paymentMethod !== 'transfer') return false;
          } else if (p.paymentMethod !== paymentMethodFilter) {
            return false;
          }
        }

        // Posting status filter
        if (postingStatusFilter === 'posted' && !p.isPosted) return false;
        if (postingStatusFilter === 'unposted' && p.isPosted) return false;

        // Search Query
        if (searchQuery) {
          const qNorm = normalizeArabicText(searchQuery);
          const qMeter = normalizeMeterNumber(searchQuery);
          const nameNorm = normalizeArabicText(p.subscriberName);
          const receiptNorm = normalizeMeterNumber(p.receiptNumber);
          const sub = subMap.get(p.subscriberId);
          const meterNorm = sub ? normalizeMeterNumber(sub.meterNumber) : '';
          const matchName = nameNorm.includes(qNorm);
          const matchReceipt = qMeter && receiptNorm.includes(qMeter);
          const matchMeter = qMeter && meterNorm.includes(qMeter);
          if (!matchName && !matchReceipt && !matchMeter) return false;
        }

        return true;
      });

      const total = filteredPayments.reduce((sum, p) => sum + p.amountPaid, 0);
      const cash = filteredPayments.filter(p => p.paymentMethod === 'cash').reduce((sum, p) => sum + p.amountPaid, 0);
      const wallet = filteredPayments.filter(p => p.paymentMethod === 'e-wallet').reduce((sum, p) => sum + p.amountPaid, 0);
      const bank = filteredPayments.filter(p => p.paymentMethod === 'bank' || p.paymentMethod === 'transfer').reduce((sum, p) => sum + p.amountPaid, 0);

      return {
        ...dg,
        payments: filteredPayments,
        totalAmount: total,
        cashAmount: cash,
        walletAmount: wallet,
        bankAmount: bank,
        receiptsCount: filteredPayments.length,
        uniqueSubsCount: new Set(filteredPayments.map(p => p.subscriberId)).size,
        avgAmount: filteredPayments.length > 0 ? Math.round(total / filteredPayments.length) : 0,
      };
    });
  }, [daysGroups, zoneFilter, paymentMethodFilter, postingStatusFilter, searchQuery, subMap]);

  // Selected Day Group
  const activeDayGroup = useMemo(() => {
    return filteredDaysGroups.find(dg => dg.date === selectedDayDate) || filteredDaysGroups[0] || null;
  }, [filteredDaysGroups, selectedDayDate]);

  // -------------------------------------------------------------
  // GROUPING BY MONTH
  // -------------------------------------------------------------
  interface MonthDaySummary {
    dayDate: string;
    dayFormatted: string;
    receiptsCount: number;
    cashAmount: number;
    nonCashAmount: number;
    totalAmount: number;
    percentOfMonth: number;
  }

  interface MonthGroup {
    monthStr: string;
    formattedMonth: string;
    payments: Payment[];
    totalAmount: number;
    cashAmount: number;
    walletAmount: number;
    bankAmount: number;
    receiptsCount: number;
    uniqueSubsCount: number;
    activeDaysCount: number;
    avgDailyAmount: number;
    daysSummary: MonthDaySummary[];
  }

  const monthsGroups = useMemo(() => {
    const map = new Map<string, Payment[]>();

    myAllPayments.forEach(p => {
      const m = p.paymentDate ? p.paymentDate.substring(0, 7) : thisMonthStr;
      if (!map.has(m)) {
        map.set(m, []);
      }
      map.get(m)!.push(p);
    });

    if (!map.has(thisMonthStr)) {
      map.set(thisMonthStr, []);
    }

    const groups: MonthGroup[] = [];

    map.forEach((pays, monthStr) => {
      const total = pays.reduce((sum, p) => sum + p.amountPaid, 0);
      const cash = pays.filter(p => p.paymentMethod === 'cash').reduce((sum, p) => sum + p.amountPaid, 0);
      const wallet = pays.filter(p => p.paymentMethod === 'e-wallet').reduce((sum, p) => sum + p.amountPaid, 0);
      const bank = pays.filter(p => p.paymentMethod === 'transfer').reduce((sum, p) => sum + p.amountPaid, 0);
      const uniqueSubs = new Set(pays.map(p => p.subscriberId)).size;

      // Group days inside this month
      const daysInMonthMap = new Map<string, Payment[]>();
      pays.forEach(p => {
        const d = p.paymentDate ? p.paymentDate.substring(0, 10) : `${monthStr}-01`;
        if (!daysInMonthMap.has(d)) daysInMonthMap.set(d, []);
        daysInMonthMap.get(d)!.push(p);
      });

      const daysSummary: MonthDaySummary[] = [];
      daysInMonthMap.forEach((dayPays, dayDate) => {
        const dTotal = dayPays.reduce((sum, p) => sum + p.amountPaid, 0);
        const dCash = dayPays.filter(p => p.paymentMethod === 'cash').reduce((sum, p) => sum + p.amountPaid, 0);
        const dNonCash = dTotal - dCash;
        const pct = total > 0 ? Math.round((dTotal / total) * 100) : 0;

        daysSummary.push({
          dayDate,
          dayFormatted: formatDateArabic(dayDate),
          receiptsCount: dayPays.length,
          cashAmount: dCash,
          nonCashAmount: dNonCash,
          totalAmount: dTotal,
          percentOfMonth: pct,
        });
      });

      daysSummary.sort((a, b) => b.dayDate.localeCompare(a.dayDate));

      const activeDays = daysInMonthMap.size;
      const avgDaily = activeDays > 0 ? Math.round(total / activeDays) : 0;

      groups.push({
        monthStr,
        formattedMonth: formatMonthArabic(monthStr),
        payments: pays.sort((a, b) => (b.paymentDate || '').localeCompare(a.paymentDate || '')),
        totalAmount: total,
        cashAmount: cash,
        walletAmount: wallet,
        bankAmount: bank,
        receiptsCount: pays.length,
        uniqueSubsCount: uniqueSubs,
        activeDaysCount: activeDays,
        avgDailyAmount: avgDaily,
        daysSummary,
      });
    });

    return groups.sort((a, b) => b.monthStr.localeCompare(a.monthStr));
  }, [myAllPayments, thisMonthStr]);

  // Selected Month Group
  const activeMonthGroup = useMemo(() => {
    return monthsGroups.find(mg => mg.monthStr === selectedMonthStr) || monthsGroups[0] || null;
  }, [monthsGroups, selectedMonthStr]);

  // Toggle Day Expansion
  const toggleDayExpansion = (date: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  // Copy day collection summary text
  const handleCopyDaySummary = (dg: DayGroup) => {
    let txt = `⚡ *ملخص تحصيل يوم ${dg.formattedDate}*\n`;
    txt += `المحصل: ${currentUser.name}\n`;
    txt += `💵 إجمالي التحصيل: ${dg.totalAmount.toLocaleString()} ${settings.currency}\n`;
    txt += `🧾 عدد السندات: ${dg.receiptsCount}\n`;
    txt += `💰 نقداً (كاش): ${dg.cashAmount.toLocaleString()} ${settings.currency}\n`;
    txt += `📱 محافظ إلكترونية: ${dg.walletAmount.toLocaleString()} ${settings.currency}\n`;
    txt += `🏦 تحويلات بنكية: ${dg.bankAmount.toLocaleString()} ${settings.currency}\n`;
    txt += `👥 عدد المشتركين المسددين: ${dg.uniqueSubsCount}\n`;

    navigator.clipboard.writeText(txt);
    setCopiedDayText(dg.date);
    setTimeout(() => setCopiedDayText(null), 2500);
  };

  return (
    <div id="collector-collections-month-and-day" className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 flex flex-col gap-5 text-right" dir="rtl">
      {/* 1. Header Bar: Main View Switcher & Action Tools */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <span>بيانات وتحليلات التحصيل بالشهر واليوم</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {myAllPayments.length} سند مسجل
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                استعراض كامل ومفصل لجميع المقبوضات المالية مقسمة حسب الأيام والشهور مع أدوات الطباعة والفرز المتقدم
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Tabs Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl w-full lg:w-auto">
          <button
            type="button"
            onClick={() => setViewMode('daily')}
            className={`flex-1 lg:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              viewMode === 'daily'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>التحصيل باليوم</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('monthly')}
            className={`flex-1 lg:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              viewMode === 'monthly'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>التحصيل بالشهر</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('operations_log')}
            className={`flex-1 lg:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              viewMode === 'operations_log'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>سجل العمليات الميدانية</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Filter & Search Bar */}
      <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-150 flex flex-wrap gap-3 items-center justify-between">
        {/* Search input */}
        <div className="relative flex-1 min-w-[220px]">
          <input
            type="text"
            placeholder="بحث باسم المشترك، رقم السند، أو رقم العداد..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 pr-9 text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Zone Filter */}
        <div className="w-full sm:w-auto">
          <select
            value={zoneFilter}
            onChange={e => setZoneFilter(e.target.value)}
            className="w-full sm:w-auto bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-700 font-bold focus:outline-none focus:border-emerald-600"
          >
            <option value="all">كافة المربعات ({subscribers.length})</option>
            {uniqueZones.map(z => (
              <option key={z} value={z}>مربع: {z}</option>
            ))}
          </select>
        </div>

        {/* Payment Method Filter */}
        <div className="w-full sm:w-auto">
          <select
            value={paymentMethodFilter}
            onChange={e => setPaymentMethodFilter(e.target.value as any)}
            className="w-full sm:w-auto bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-700 font-bold focus:outline-none focus:border-emerald-600"
          >
            <option value="all">كافة طرق الدفع</option>
            <option value="cash">نقداً (كاش)</option>
            <option value="e-wallet">محفظة إلكترونية</option>
            <option value="bank">تحويل بنكي</option>
          </select>
        </div>

        {/* Posting Status Filter */}
        <div className="w-full sm:w-auto">
          <select
            value={postingStatusFilter}
            onChange={e => setPostingStatusFilter(e.target.value as any)}
            className="w-full sm:w-auto bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-700 font-bold focus:outline-none focus:border-emerald-600"
          >
            <option value="all">كافة الحالات</option>
            <option value="unposted">بانتظار الترحيل</option>
            <option value="posted">مرحل ومعتمد</option>
          </select>
        </div>

        {/* Reset Filter Button */}
        {(searchQuery || zoneFilter !== 'all' || paymentMethodFilter !== 'all' || postingStatusFilter !== 'all') && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setZoneFilter('all');
              setPaymentMethodFilter('all');
              setPostingStatusFilter('all');
            }}
            className="flex items-center gap-1 px-3 py-2 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>مسح التصفية</span>
          </button>
        )}
      </div>

      {/* ========================================================= */}
      {/* 3. VIEW 1: DAILY COLLECTION BREAKDOWN (التحصيل باليوم)   */}
      {/* ========================================================= */}
      {viewMode === 'daily' && (
        <div className="flex flex-col gap-5">
          {/* Quick Date Shortcuts Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white p-3.5 rounded-2xl">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-slate-300">عرض الأيام المسجلة:</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {filteredDaysGroups.slice(0, 6).map(dg => {
                const isSelected = dg.date === selectedDayDate;
                const isToday = dg.date === todayStr;
                return (
                  <button
                    key={dg.date}
                    type="button"
                    onClick={() => {
                      setSelectedDayDate(dg.date);
                      if (!expandedDays.has(dg.date)) {
                        toggleDayExpansion(dg.date);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    {isToday && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>}
                    <span>{isToday ? 'اليوم' : dg.date}</span>
                    <span className="text-[10px] opacity-80">({dg.receiptsCount})</span>
                  </button>
                );
              })}

              {/* Specific Day Picker input */}
              <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-xl text-xs">
                <span className="text-[10px] text-slate-400">تاريخ:</span>
                <input
                  type="date"
                  value={selectedDayDate}
                  onChange={e => {
                    setSelectedDayDate(e.target.value);
                    toggleDayExpansion(e.target.value);
                  }}
                  className="bg-transparent text-white text-xs focus:outline-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Active Selected Day Overview Banner */}
          {activeDayGroup && (
            <div className="bg-gradient-to-r from-slate-900 to-slate-850 text-white p-4 sm:p-5 rounded-3xl border border-slate-800 flex flex-col gap-4 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-2xl">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                      <span>إجمالي تحصيل يوم: {activeDayGroup.formattedDate}</span>
                      {activeDayGroup.date === todayStr && (
                        <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                          اليوم الحالي
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      تم تحصيل <strong className="text-amber-400 font-mono">{activeDayGroup.totalAmount.toLocaleString()} {settings.currency}</strong> من خلال <strong className="text-slate-200 font-mono">{activeDayGroup.receiptsCount}</strong> سند مالي
                    </p>
                  </div>
                </div>

                {/* Print & Share actions for this Day */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopyDaySummary(activeDayGroup)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    title="نسخ ملخص اليوم للمشاركة"
                  >
                    {copiedDayText === activeDayGroup.date ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">تم النسخ!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ الملخص</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onPrintShiftReport(activeDayGroup.date, activeDayGroup.payments)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs shadow-sm transition-all cursor-pointer"
                    title="طباعة تقرير الإغلاق المالي لهذا اليوم"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>طباعة إغلاق اليوم (80mm)</span>
                  </button>
                </div>
              </div>

              {/* 4 Cards for Day Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
                  <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1">
                    <Banknote className="w-3 h-3 text-emerald-400" />
                    <span>المحصل نقداً (كاش)</span>
                  </span>
                  <span className="text-sm sm:text-base font-black text-emerald-400 font-mono mt-1">
                    {activeDayGroup.cashAmount.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">{settings.currency}</span>
                  </span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
                  <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1">
                    <Wallet className="w-3 h-3 text-cyan-400" />
                    <span>محافظ إلكترونية</span>
                  </span>
                  <span className="text-sm sm:text-base font-black text-cyan-400 font-mono mt-1">
                    {activeDayGroup.walletAmount.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">{settings.currency}</span>
                  </span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
                  <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-indigo-400" />
                    <span>تحويلات بنكية</span>
                  </span>
                  <span className="text-sm sm:text-base font-black text-indigo-300 font-mono mt-1">
                    {activeDayGroup.bankAmount.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">{settings.currency}</span>
                  </span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
                  <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1">
                    <Receipt className="w-3 h-3 text-amber-400" />
                    <span>متوسط قيمة السند</span>
                  </span>
                  <span className="text-sm sm:text-base font-black text-amber-300 font-mono mt-1">
                    {activeDayGroup.avgAmount.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">{settings.currency}</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Days Accordion List */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs text-slate-600 font-bold">
              <span>قائمة الأيام المسجلة ({filteredDaysGroups.length} يوم):</span>
              <span className="text-slate-400 font-normal">اضغط على اليوم لاستعراض أو إخفاء سنداته التفصيلية</span>
            </div>

            {filteredDaysGroups.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200 text-slate-400">
                <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-bold">لا توجد بيانات تحصيل تطابق معايير البحث الحالية.</p>
              </div>
            ) : (
              filteredDaysGroups.map(dg => {
                const isExpanded = expandedDays.has(dg.date);
                const isToday = dg.date === todayStr;

                return (
                  <div 
                    key={dg.date} 
                    className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                      isExpanded ? 'border-emerald-300 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Day Accordion Header */}
                    <div 
                      onClick={() => toggleDayExpansion(dg.date)}
                      className={`p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                        isExpanded ? 'bg-emerald-50/40' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl text-xs font-black ${
                          isToday ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-700'
                        }`}>
                          <Calendar className="w-4 h-4" />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-sm text-slate-900">
                              {dg.formattedDate}
                            </h4>
                            {isToday && (
                              <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                                اليوم
                              </span>
                            )}
                            <span className="text-[11px] font-bold text-slate-500 font-mono">
                              ({dg.receiptsCount} سند)
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                            كاش: {dg.cashAmount.toLocaleString()} | محافظ: {dg.walletAmount.toLocaleString()} | بنك: {dg.bankAmount.toLocaleString()} {settings.currency}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-left font-mono">
                          <span className="block text-[10px] text-slate-400 font-sans font-bold">إجمالي اليوم</span>
                          <span className="text-base font-black text-emerald-700">
                            {dg.totalAmount.toLocaleString()} <span className="text-xs font-sans font-bold">{settings.currency}</span>
                          </span>
                        </div>

                        <div className="p-1.5 rounded-lg bg-slate-100 text-slate-500">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Day Expanded Receipts Table */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="border-t border-slate-150 p-3.5 sm:p-4 bg-slate-50/50 flex flex-col gap-3"
                        >
                          <div className="flex items-center justify-between text-xs text-slate-700 font-bold border-b border-slate-200/80 pb-2">
                            <div className="flex items-center gap-1.5">
                              <Receipt className="w-4 h-4 text-emerald-600" />
                              <span>سندات التحصيل الصادرة في هذا اليوم ({dg.payments.length} سند):</span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onPrintShiftReport(dg.date, dg.payments);
                              }}
                              className="flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-100/80 hover:bg-amber-200/80 px-2.5 py-1 rounded-lg cursor-pointer transition-all"
                            >
                              <Printer className="w-3 h-3" />
                              <span>طباعة تقرير هذا اليوم</span>
                            </button>
                          </div>

                          {dg.payments.length === 0 ? (
                            <p className="text-center py-6 text-xs text-slate-400 font-semibold">
                              لم يتم تسجيل أي سندات مالية في هذا اليوم بعد.
                            </p>
                          ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                              {dg.payments.map(p => {
                                const sub = subMap.get(p.subscriberId);
                                const actionState = getActionTimeRemaining(p);
                                const timeStr = p.paymentDate && p.paymentDate.length >= 16 ? p.paymentDate.substring(11, 16) : '--:--';

                                return (
                                  <div 
                                    key={p.id}
                                    className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5"
                                  >
                                    <div className="flex items-start gap-2.5">
                                      <div className="p-2 bg-slate-100 rounded-lg shrink-0 mt-0.5">
                                        <Receipt className="w-4 h-4 text-emerald-600" />
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <h5 className="font-extrabold text-xs sm:text-sm text-slate-900">{p.subscriberName}</h5>
                                          <span className="text-[10px] font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                                            سند #{p.receiptNumber}
                                          </span>
                                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                            p.paymentMethod === 'cash' 
                                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                              : p.paymentMethod === 'e-wallet'
                                              ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                          }`}>
                                            {p.paymentMethod === 'cash' ? 'كاش' : p.paymentMethod === 'e-wallet' ? 'محفظة' : 'تحويل'}
                                          </span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 font-medium mt-1">
                                          <span className="flex items-center gap-0.5">
                                            <Clock className="w-3 h-3 text-slate-400" />
                                            <span>{timeStr}</span>
                                          </span>
                                          {sub?.meterNumber && (
                                            <span>عداد: <strong className="font-mono text-slate-700">{sub.meterNumber}</strong></span>
                                          )}
                                          {sub?.zone && (
                                            <span>مربع: <strong className="text-slate-700">{sub.zone}</strong></span>
                                          )}
                                          {p.remainingBalance !== undefined && (
                                            <span>الرصيد بعد السداد: <strong className={`font-mono ${p.remainingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{p.remainingBalance.toLocaleString()} {settings.currency}</strong></span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Amount and Action Buttons */}
                                    <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0">
                                      <div className="text-left font-mono">
                                        <span className="text-sm sm:text-base font-black text-emerald-700">
                                          {p.amountPaid.toLocaleString()} <span className="text-[10px] font-sans font-bold text-slate-500">{settings.currency}</span>
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-1.5">
                                        {/* Print Single Receipt */}
                                        <button
                                          type="button"
                                          onClick={() => onPrintReceipt(p, sub)}
                                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                          title="طباعة السند حرارياً"
                                        >
                                          <Printer className="w-3.5 h-3.5" />
                                        </button>

                                        {/* Edit / Delete if allowed */}
                                        {actionState.allowed && (
                                          <>
                                            <button
                                              type="button"
                                              onClick={() => onStartEditPayment(p)}
                                              className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                              title="تعديل السريع للسند"
                                            >
                                              <Edit3 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => onDeletePayment(p.id)}
                                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                              title="إلغاء العملية"
                                            >
                                              <X className="w-3.5 h-3.5" />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. VIEW 2: MONTHLY COLLECTION BREAKDOWN (التحصيل بالشهر) */}
      {/* ========================================================= */}
      {viewMode === 'monthly' && (
        <div className="flex flex-col gap-5">
          {/* Month Selector Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white p-3.5 rounded-2xl">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-slate-300">الشهور المسجلة:</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {monthsGroups.map(mg => {
                const isSelected = mg.monthStr === selectedMonthStr;
                const isThisMonth = mg.monthStr === thisMonthStr;
                return (
                  <button
                    key={mg.monthStr}
                    type="button"
                    onClick={() => setSelectedMonthStr(mg.monthStr)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    {isThisMonth && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>}
                    <span>{mg.formattedMonth}</span>
                    <span className="text-[10px] opacity-80">({mg.receiptsCount})</span>
                  </button>
                );
              })}

              {/* Custom Month Picker */}
              <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-xl text-xs">
                <span className="text-[10px] text-slate-400">شهر آخر:</span>
                <input
                  type="month"
                  value={selectedMonthStr}
                  onChange={e => setSelectedMonthStr(e.target.value)}
                  className="bg-transparent text-white text-xs focus:outline-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Active Month Highlights Banner */}
          {activeMonthGroup ? (
            <div className="flex flex-col gap-5">
              <div className="bg-gradient-to-r from-slate-900 to-slate-850 text-white p-5 rounded-3xl border border-slate-800 flex flex-col gap-4 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-2xl">
                      <CalendarDays className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                        <span>تقرير التحصيل لشهر: {activeMonthGroup.formattedMonth}</span>
                        {activeMonthGroup.monthStr === thisMonthStr && (
                          <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                            الشهر الحالي
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        إجمالي التحصيل: <strong className="text-amber-400 font-mono">{activeMonthGroup.totalAmount.toLocaleString()} {settings.currency}</strong> | عدد الأيام النشطة: <strong className="text-slate-200">{activeMonthGroup.activeDaysCount} يوم</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowMonthlyPrintModal(true)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs shadow-sm transition-all cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-300" />
                      <span>طباعة كشف التحصيل الشهري</span>
                    </button>
                  </div>
                </div>

                {/* Monthly 4 Key Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
                    <span className="text-[11px] text-slate-400 font-bold">إجمالي التحصيل الشهري</span>
                    <span className="text-sm sm:text-base font-black text-emerald-400 font-mono mt-1">
                      {activeMonthGroup.totalAmount.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">{settings.currency}</span>
                    </span>
                  </div>

                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
                    <span className="text-[11px] text-slate-400 font-bold">عدد السندات الصادرة</span>
                    <span className="text-sm sm:text-base font-black text-amber-400 font-mono mt-1">
                      {activeMonthGroup.receiptsCount} <span className="text-[10px] font-normal text-slate-400">سند</span>
                    </span>
                  </div>

                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
                    <span className="text-[11px] text-slate-400 font-bold">المشتركون المسددون</span>
                    <span className="text-sm sm:text-base font-black text-indigo-300 font-mono mt-1">
                      {activeMonthGroup.uniqueSubsCount} <span className="text-[10px] font-normal text-slate-400">مشترك</span>
                    </span>
                  </div>

                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
                    <span className="text-[11px] text-slate-400 font-bold">متوسط التحصيل اليومي</span>
                    <span className="text-sm sm:text-base font-black text-cyan-300 font-mono mt-1">
                      {activeMonthGroup.avgDailyAmount.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">{settings.currency}</span>
                    </span>
                  </div>
                </div>

                {/* Payment Methods Breakdown for this Month */}
                <div className="grid grid-cols-3 gap-2 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80 text-[11px]">
                  <div className="flex items-center justify-between px-2 py-1 bg-slate-900/80 rounded-lg">
                    <span className="text-slate-400 font-bold flex items-center gap-1">
                      <Banknote className="w-3 h-3 text-emerald-400" />
                      <span>كاش:</span>
                    </span>
                    <span className="font-mono font-bold text-emerald-400">{activeMonthGroup.cashAmount.toLocaleString()} {settings.currency}</span>
                  </div>

                  <div className="flex items-center justify-between px-2 py-1 bg-slate-900/80 rounded-lg">
                    <span className="text-slate-400 font-bold flex items-center gap-1">
                      <Wallet className="w-3 h-3 text-cyan-400" />
                      <span>محافظ:</span>
                    </span>
                    <span className="font-mono font-bold text-cyan-400">{activeMonthGroup.walletAmount.toLocaleString()} {settings.currency}</span>
                  </div>

                  <div className="flex items-center justify-between px-2 py-1 bg-slate-900/80 rounded-lg">
                    <span className="text-slate-400 font-bold flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-indigo-400" />
                      <span>تحويلات:</span>
                    </span>
                    <span className="font-mono font-bold text-indigo-400">{activeMonthGroup.bankAmount.toLocaleString()} {settings.currency}</span>
                  </div>
                </div>
              </div>

              {/* Month Days Table */}
              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                  <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <span>جدول تفصيل أيام شهر {activeMonthGroup.formattedMonth} ({activeMonthGroup.daysSummary.length} يوم نشط)</span>
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    انقر على أي يوم لاستعراض سنداته التفصيلية
                  </span>
                </div>

                {activeMonthGroup.daysSummary.length === 0 ? (
                  <p className="text-center py-8 text-xs text-slate-400 font-semibold">
                    لا توجد أي سندات مسجلة في هذا الشهر.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-200/60 text-slate-700 font-black border-b border-slate-200">
                          <th className="py-2.5 px-3 rounded-r-xl">اليوم والتاريخ</th>
                          <th className="py-2.5 px-3">عدد السندات</th>
                          <th className="py-2.5 px-3">المحصل كاش</th>
                          <th className="py-2.5 px-3">محافظ وبنوك</th>
                          <th className="py-2.5 px-3">إجمالي اليوم</th>
                          <th className="py-2.5 px-3">نسبة المساهمة</th>
                          <th className="py-2.5 px-3 rounded-l-xl text-center">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150">
                        {activeMonthGroup.daysSummary.map(day => (
                          <tr key={day.dayDate} className="hover:bg-emerald-50/30 transition-colors">
                            <td className="py-2.5 px-3 font-extrabold text-slate-900">
                              <div className="flex items-center gap-2">
                                <span>{day.dayFormatted}</span>
                                {day.dayDate === todayStr && (
                                  <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">اليوم</span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                              {day.receiptsCount} سند
                            </td>
                            <td className="py-2.5 px-3 font-mono text-emerald-600 font-bold">
                              {day.cashAmount.toLocaleString()} {settings.currency}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-cyan-600 font-bold">
                              {day.nonCashAmount.toLocaleString()} {settings.currency}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-900 font-black">
                              {day.totalAmount.toLocaleString()} {settings.currency}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className="bg-emerald-500 h-full rounded-full"
                                    style={{ width: `${day.percentOfMonth}%` }}
                                  />
                                </div>
                                <span className="font-mono text-[10px] text-slate-500 font-bold">{day.percentOfMonth}%</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedDayDate(day.dayDate);
                                  setViewMode('daily');
                                  if (!expandedDays.has(day.dayDate)) {
                                    toggleDayExpansion(day.dayDate);
                                  }
                                }}
                                className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3" />
                                <span>استعراض السندات</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* All Months Performance Grid */}
              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col gap-3">
                <h4 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  <span>مقارنة أداء التحصيل عبر الشهور المختلفة:</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {monthsGroups.map(mg => (
                    <button
                      key={mg.monthStr}
                      type="button"
                      onClick={() => setSelectedMonthStr(mg.monthStr)}
                      className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                        mg.monthStr === selectedMonthStr
                          ? 'border-indigo-400 bg-white ring-2 ring-indigo-500/30 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-slate-900">{mg.formattedMonth}</span>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-mono">
                          {mg.receiptsCount} سند
                        </span>
                      </div>

                      <div className="text-left font-mono mt-1">
                        <span className="text-sm sm:text-base font-black text-emerald-700">
                          {mg.totalAmount.toLocaleString()} <span className="text-[10px] font-sans font-bold text-slate-500">{settings.currency}</span>
                        </span>
                      </div>

                      <div className="border-t border-slate-100 pt-1.5 flex justify-between text-[10px] text-slate-500">
                        <span>أيام النشاط: {mg.activeDaysCount} يوم</span>
                        <span>مشتركون: {mg.uniqueSubsCount}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200 text-slate-400">
              <CalendarDays className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-bold">لا توجد أي بيانات تحصيل شهرية مسجلة بعد.</p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. VIEW 3: OPERATIONS LOG (سجل العمليات الميدانية)         */}
      {/* ========================================================= */}
      {viewMode === 'operations_log' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-800">السجل الحي والمباشر لعمليات المحصل</h3>
              <p className="text-xs text-slate-500 font-semibold">استعراض لكافة الفواتير المقروءة وسندات التحصيل الصادرة مع إمكانية التعديل السريع</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">
                إجمالي العمليات: {myAllReadings.length + myAllPayments.length} عملية
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Receipts Log */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <h4 className="text-xs font-extrabold text-emerald-800 flex items-center gap-1">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span>سندات التحصيل ({myAllPayments.length})</span>
                </h4>
                <span className="text-xs font-mono font-bold text-emerald-700">
                  {myAllPayments.reduce((s, p) => s + p.amountPaid, 0).toLocaleString()} {settings.currency}
                </span>
              </div>

              {myAllPayments.length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-400 font-semibold">لم تقم بأي عمليات تحصيل بعد.</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {myAllPayments.map(p => {
                    const actionState = getActionTimeRemaining(p);
                    const sub = subMap.get(p.subscriberId);

                    return (
                      <div key={p.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-2">
                        <div className="flex justify-between items-start text-xs">
                          <div>
                            <p className="font-extrabold text-slate-900">{p.subscriberName}</p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                              سند: #{p.receiptNumber} | {p.paymentDate || 'تاريخ غير محدد'}
                            </p>
                          </div>
                          <div className="text-left font-mono">
                            <span className="font-black text-emerald-700 text-sm">
                              {p.amountPaid.toLocaleString()} {settings.currency}
                            </span>
                            <span className="block text-[9px] text-slate-400 font-sans font-bold">
                              {p.paymentMethod === 'cash' ? 'نقداً' : p.paymentMethod === 'e-wallet' ? 'محفظة' : 'تحويل'}
                            </span>
                          </div>
                        </div>

                        <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-[10px]">
                          <span className={`px-2 py-0.5 rounded-full font-bold ${
                            p.isPosted ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {p.isPosted ? 'مرحل ومعتمد' : 'بانتظار الاعتماد'}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onPrintReceipt(p, sub)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1"
                            >
                              <Printer className="w-3 h-3" />
                              <span>طباعة</span>
                            </button>

                            {actionState.allowed && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => onStartEditPayment(p)}
                                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-md font-bold transition-all cursor-pointer"
                                >
                                  تعديل
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeletePayment(p.id)}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md font-bold transition-all cursor-pointer"
                                >
                                  إلغاء
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Readings Log */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <h4 className="text-xs font-extrabold text-amber-800 flex items-center gap-1">
                  <Calculator className="w-4 h-4 text-amber-600" />
                  <span>الفواتير والقراءات ({myAllReadings.length})</span>
                </h4>
                <span className="text-xs font-mono font-bold text-amber-700">
                  {myAllReadings.reduce((s, r) => s + r.totalAmount, 0).toLocaleString()} {settings.currency}
                </span>
              </div>

              {myAllReadings.length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-400 font-semibold">لم تقم بتسجيل أي قراءات بعد.</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {myAllReadings.map(r => {
                    const actionState = getActionTimeRemaining(r);
                    return (
                      <div key={r.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-2">
                        <div className="flex justify-between items-start text-xs">
                          <div>
                            <p className="font-extrabold text-slate-900">{r.subscriberName}</p>
                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                              القراءة: {r.currentReading} ك.و (استهلاك: {r.consumption}) | {r.readingDate || 'تاريخ غير محدد'}
                            </p>
                          </div>
                          <div className="text-left font-mono">
                            <span className="font-black text-amber-700 text-sm">
                              {r.totalAmount.toLocaleString()} {settings.currency}
                            </span>
                          </div>
                        </div>

                        <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-[10px]">
                          <span className={`px-2 py-0.5 rounded-full font-bold ${
                            r.isPosted ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {r.isPosted ? 'مرحلة ومعتمدة' : 'بانتظار الاعتماد'}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {actionState.allowed && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => onStartEditReading(r)}
                                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-md font-bold transition-all cursor-pointer"
                                >
                                  تعديل
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteReading(r.id)}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md font-bold transition-all cursor-pointer"
                                >
                                  إلغاء
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Monthly Print Report Modal */}
      {showMonthlyPrintModal && activeMonthGroup && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 text-right flex flex-col gap-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-600" />
                <h3 className="font-black text-base text-slate-900">
                  كشف التحصيل الشهري للمحصل: {activeMonthGroup.formattedMonth}
                </h3>
              </div>
              <button 
                onClick={() => setShowMonthlyPrintModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Printable Content Frame */}
            <div id="monthly-collector-print-area" className="border border-slate-200 p-5 rounded-2xl bg-white space-y-4 text-xs">
              <div className="text-center border-b pb-3">
                <h2 className="text-base font-black text-slate-900">{settings.stationName}</h2>
                <h4 className="text-sm font-bold text-slate-700 mt-1">كشف التحصيل الشهري المعتمد للمحصل الميداني</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">الشهر: {activeMonthGroup.formattedMonth} | اسم المحصل: {currentUser.name}</p>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border font-bold text-center">
                <div>
                  <span className="text-slate-500 block text-[10px]">إجمالي المقبوضات:</span>
                  <span className="text-sm font-black text-emerald-700 font-mono">
                    {activeMonthGroup.totalAmount.toLocaleString()} {settings.currency}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">عدد السندات الصادرة:</span>
                  <span className="text-sm font-black text-slate-800 font-mono">
                    {activeMonthGroup.receiptsCount} سند
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">أيام العمل النشطة:</span>
                  <span className="text-sm font-black text-indigo-700 font-mono">
                    {activeMonthGroup.activeDaysCount} يوم
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <h5 className="font-bold text-slate-700">بيان تفصيلي بأيام الشهر:</h5>
                <table className="w-full border-collapse border border-slate-200 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800">
                      <th className="border p-1.5">التاريخ</th>
                      <th className="border p-1.5">عدد السندات</th>
                      <th className="border p-1.5">نقداً (كاش)</th>
                      <th className="border p-1.5">محافظ وتحويلات</th>
                      <th className="border p-1.5">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeMonthGroup.daysSummary.map(d => (
                      <tr key={d.dayDate} className="text-center">
                        <td className="border p-1.5 font-bold">{d.dayFormatted}</td>
                        <td className="border p-1.5 font-mono">{d.receiptsCount}</td>
                        <td className="border p-1.5 font-mono">{d.cashAmount.toLocaleString()}</td>
                        <td className="border p-1.5 font-mono">{d.nonCashAmount.toLocaleString()}</td>
                        <td className="border p-1.5 font-mono font-black">{d.totalAmount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-6 border-t text-[11px] text-slate-600 font-bold">
                <div className="text-center">
                  <span>توقيع المحصل الميداني</span>
                  <div className="h-10"></div>
                  <span>{currentUser.name}</span>
                </div>
                <div className="text-center">
                  <span>اعتماد الإدارة والحسابات</span>
                  <div className="h-10"></div>
                  <span>الختم الرسمي للمحطة</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الكشف الآن</span>
              </button>
              <button
                type="button"
                onClick={() => setShowMonthlyPrintModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
