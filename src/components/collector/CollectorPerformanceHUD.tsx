import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, Target, TrendingUp, UserCheck, Sparkles, Filter, 
  Calendar, MapPin, CreditCard, Banknote, Wallet, Building2, 
  RotateCcw, Eye, EyeOff, Edit3, CheckCircle2, ChevronDown, 
  ChevronUp, Printer, FileText, ArrowUpDown, Layers, AlertCircle
} from 'lucide-react';
import { Subscriber, MeterReading, Payment, User, SystemSettings } from '../../types';

export interface PerformanceFilterState {
  periodType: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'specific_day' | 'specific_month' | 'custom';
  selectedDate: string; // YYYY-MM-DD
  selectedMonth: string; // YYYY-MM
  customStartDate: string;
  customEndDate: string;
  selectedZone: string;
  selectedPaymentMethod: 'all' | 'cash' | 'e-wallet' | 'bank' | 'transfer';
  selectedPostingStatus: 'all' | 'posted' | 'unposted';
}

interface CollectorPerformanceHUDProps {
  currentUser: User;
  settings: SystemSettings;
  payments: Payment[];
  readings: MeterReading[];
  subscribers: Subscriber[];
  dailyGoal: number;
  onUpdateDailyGoal: (goal: number) => void;
  monthlyGoal: number;
  onUpdateMonthlyGoal: (goal: number) => void;
  filters: PerformanceFilterState;
  onFilterChange: (filters: PerformanceFilterState) => void;
  onResetFilters: () => void;
  uniqueZones: string[];
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onPrintShiftReport?: () => void;
  onViewCollectionsMode?: (mode: 'daily' | 'monthly') => void;
}

export const CollectorPerformanceHUD: React.FC<CollectorPerformanceHUDProps> = ({
  currentUser,
  settings,
  payments,
  readings,
  subscribers,
  dailyGoal,
  onUpdateDailyGoal,
  monthlyGoal,
  onUpdateMonthlyGoal,
  filters,
  onFilterChange,
  onResetFilters,
  uniqueZones,
  isExpanded,
  onToggleExpanded,
  onPrintShiftReport,
  onViewCollectionsMode,
}) => {
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState('');

  // Date constants
  const todayStr = useMemo(() => new Date().toISOString().substring(0, 10), []);
  const thisMonthStr = useMemo(() => todayStr.substring(0, 7), [todayStr]);

  // Determine active goal based on period type
  const isMonthlyPeriod = filters.periodType === 'this_month' || filters.periodType === 'last_month' || filters.periodType === 'specific_month';
  const isWeeklyPeriod = filters.periodType === 'this_week';
  
  const currentActiveGoal = useMemo(() => {
    if (isMonthlyPeriod) return monthlyGoal;
    if (isWeeklyPeriod) return dailyGoal * 7;
    return dailyGoal;
  }, [isMonthlyPeriod, isWeeklyPeriod, monthlyGoal, dailyGoal]);

  const handleOpenEditGoal = () => {
    setGoalInput(currentActiveGoal.toString());
    setIsEditingGoal(true);
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(goalInput, 10);
    if (!isNaN(val) && val > 0) {
      if (isMonthlyPeriod) {
        onUpdateMonthlyGoal(val);
      } else {
        onUpdateDailyGoal(val);
      }
      setIsEditingGoal(false);
    }
  };

  // Helper date match functions
  const isDateInPeriod = (dateStr: string) => {
    if (!dateStr) return false;
    const itemDate = dateStr.substring(0, 10);
    const itemMonth = dateStr.substring(0, 7);

    switch (filters.periodType) {
      case 'today':
        return itemDate === todayStr;
      case 'yesterday': {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().substring(0, 10);
        return itemDate === yStr;
      }
      case 'this_week': {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString().substring(0, 10);
        return itemDate >= weekAgoStr && itemDate <= todayStr;
      }
      case 'this_month':
        return itemMonth === thisMonthStr;
      case 'last_month': {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        const lmStr = d.toISOString().substring(0, 7);
        return itemMonth === lmStr;
      }
      case 'specific_day':
        return itemDate === filters.selectedDate;
      case 'specific_month':
        return itemMonth === filters.selectedMonth;
      case 'custom':
        return itemDate >= filters.customStartDate && itemDate <= filters.customEndDate;
      default:
        return itemDate === todayStr;
    }
  };

  // Map of subscribers for fast zone matching
  const subMap = useMemo(() => {
    const map = new Map<string, Subscriber>();
    subscribers.forEach(s => map.set(s.id, s));
    return map;
  }, [subscribers]);

  // Filtered Payments for this Collector
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      // Must belong to this collector
      if (p.receivedBy !== currentUser.username) return false;

      // Period filter
      if (!isDateInPeriod(p.paymentDate)) return false;

      // Zone filter
      if (filters.selectedZone !== 'all') {
        const sub = subMap.get(p.subscriberId);
        if (!sub || sub.zone !== filters.selectedZone) return false;
      }

      // Payment method filter
      if (filters.selectedPaymentMethod !== 'all') {
        if (filters.selectedPaymentMethod === 'bank' || filters.selectedPaymentMethod === 'transfer') {
          if (p.paymentMethod !== 'bank' && p.paymentMethod !== 'transfer') return false;
        } else if (p.paymentMethod !== filters.selectedPaymentMethod) {
          return false;
        }
      }

      // Posting status filter
      if (filters.selectedPostingStatus === 'posted' && !p.isPosted) return false;
      if (filters.selectedPostingStatus === 'unposted' && p.isPosted) return false;

      return true;
    });
  }, [payments, currentUser.username, filters, subMap, todayStr, thisMonthStr]);

  // Filtered Readings for this Collector
  const filteredReadings = useMemo(() => {
    return readings.filter(r => {
      if (r.enteredBy !== currentUser.username) return false;
      if (!isDateInPeriod(r.readingDate)) return false;

      if (filters.selectedZone !== 'all') {
        const sub = subMap.get(r.subscriberId);
        if (!sub || sub.zone !== filters.selectedZone) return false;
      }

      if (filters.selectedPostingStatus === 'posted' && !r.isPosted) return false;
      if (filters.selectedPostingStatus === 'unposted' && r.isPosted) return false;

      return true;
    });
  }, [readings, currentUser.username, filters, subMap, todayStr, thisMonthStr]);

  // Metrics Calculations
  const totalCollected = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + p.amountPaid, 0);
  }, [filteredPayments]);

  const cashCollected = useMemo(() => {
    return filteredPayments.filter(p => p.paymentMethod === 'cash').reduce((sum, p) => sum + p.amountPaid, 0);
  }, [filteredPayments]);

  const walletCollected = useMemo(() => {
    return filteredPayments.filter(p => p.paymentMethod === 'e-wallet').reduce((sum, p) => sum + p.amountPaid, 0);
  }, [filteredPayments]);

  const bankCollected = useMemo(() => {
    return filteredPayments.filter(p => p.paymentMethod === 'bank' || p.paymentMethod === 'transfer').reduce((sum, p) => sum + p.amountPaid, 0);
  }, [filteredPayments]);

  const receiptsCount = filteredPayments.length;
  const readingsCount = filteredReadings.length;

  const uniquePayingSubs = useMemo(() => {
    return new Set(filteredPayments.map(p => p.subscriberId)).size;
  }, [filteredPayments]);

  const progressPercent = useMemo(() => {
    if (currentActiveGoal <= 0) return 0;
    return Math.min(100, Math.round((totalCollected / currentActiveGoal) * 100));
  }, [totalCollected, currentActiveGoal]);

  const rawProgressPercent = useMemo(() => {
    if (currentActiveGoal <= 0) return 0;
    return Math.round((totalCollected / currentActiveGoal) * 100);
  }, [totalCollected, currentActiveGoal]);

  const avgPerReceipt = useMemo(() => {
    return receiptsCount > 0 ? Math.round(totalCollected / receiptsCount) : 0;
  }, [totalCollected, receiptsCount]);

  // Total subscribers in filtered zone
  const targetSubscribersCount = useMemo(() => {
    if (filters.selectedZone === 'all') return subscribers.length;
    return subscribers.filter(s => s.zone === filters.selectedZone).length;
  }, [subscribers, filters.selectedZone]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.periodType !== 'today') count++;
    if (filters.selectedZone !== 'all') count++;
    if (filters.selectedPaymentMethod !== 'all') count++;
    if (filters.selectedPostingStatus !== 'all') count++;
    return count;
  }, [filters]);

  // Period label in Arabic
  const periodLabel = useMemo(() => {
    switch (filters.periodType) {
      case 'today': return 'اليوم (الحالي)';
      case 'yesterday': return 'أمس';
      case 'this_week': return 'هذا الأسبوع (آخر 7 أيام)';
      case 'this_month': return `هذا الشهر (${filters.selectedMonth || thisMonthStr})`;
      case 'last_month': return 'الشهر السابق';
      case 'specific_day': return `يوم: ${filters.selectedDate}`;
      case 'specific_month': return `شهر: ${filters.selectedMonth}`;
      case 'custom': return `فترة مخصصة: ${filters.customStartDate} إلى ${filters.customEndDate}`;
      default: return 'اليوم';
    }
  }, [filters, thisMonthStr]);

  return (
    <div 
      id="collector-performance-dashboard-hud" 
      className={`bg-slate-900 border border-slate-800 text-white flex flex-col text-right transition-all duration-300 ${
        isExpanded ? 'rounded-2xl p-3.5 sm:p-5 gap-3.5 shadow-xl' : 'rounded-xl px-3 py-2 gap-0 shadow-md'
      }`}
      dir="rtl"
    >
      {/* Top Bar: Title, Quick Progress, Filter Trigger & Toggle */}
      <div className={`flex flex-wrap items-center justify-between gap-2.5 ${isExpanded ? 'border-b border-slate-800/80 pb-3' : 'py-0'}`}>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className={`bg-amber-400/15 text-amber-400 border border-amber-400/25 ${isExpanded ? 'p-2 rounded-xl' : 'p-1.5 rounded-lg'}`}>
            <Activity className={isExpanded ? "w-5 h-5" : "w-3.5 h-3.5"} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`text-slate-100 flex items-center gap-1.5 ${isExpanded ? 'font-black text-sm sm:text-base' : 'font-bold text-xs'}`}>
                <span>لوحة أداء التحصيل الميداني</span>
                <span className="text-[10px] font-medium text-slate-400 font-sans hidden sm:inline">({periodLabel})</span>
              </h3>
              
              <span className={`rounded-full font-black border font-mono ${
                isExpanded ? 'px-2.5 py-0.5 text-xs' : 'px-1.5 py-0.2 text-[10px]'
              } ${
                rawProgressPercent >= 100 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                  : rawProgressPercent >= 50
                  ? 'bg-teal-500/20 text-teal-400 border-teal-500/30'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              }`}>
                {rawProgressPercent}%
              </span>
            </div>

            {isExpanded && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                متابعة فورية للمبالغ المحصلة، المستهدف، والسندات مع إمكانية الفلترة باليوم والشهر
              </p>
            )}
          </div>
        </div>

        {/* Action Controls: Filter Toggle, Print Shift Report, Expand/Collapse */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick Filter Panel Toggle */}
          <button
            type="button"
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
              showFilterPanel || activeFiltersCount > 0
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm shadow-amber-400/20'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="فلترة وتخصيص لوحة الأداء"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>تصفية وفلترة</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 bg-slate-950 text-amber-400 rounded-full text-[10px] font-black flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Direct Shift Report Print Button */}
          {onPrintShiftReport && isExpanded && (
            <button
              type="button"
              onClick={onPrintShiftReport}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
              title="طباعة تقرير الإغلاق المالي"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>إغلاق الوردية</span>
            </button>
          )}

          {/* Hide / Show Toggle Button */}
          <button
            type="button"
            onClick={onToggleExpanded}
            className={`flex items-center bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer ${
              isExpanded 
                ? 'gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium' 
                : 'gap-1 px-2 py-1 rounded-md text-[11px] font-bold'
            }`}
            title={isExpanded ? "طي لوحة الأداء" : "إظهار لوحة الأداء كاملة"}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] font-bold">طي</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3 text-amber-400" />
                <span className="text-[11px] font-bold text-amber-400">إظهار اللوحة</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* FILTER PANEL (Filter controls for Performance Dashboard) */}
      <AnimatePresence>
        {showFilterPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-slate-950/80 border border-slate-800 p-3 sm:p-4 rounded-xl flex flex-col gap-3 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-400">
                <Filter className="w-4 h-4" />
                <span>فلاتر لوحة أداء التحصيل الميداني</span>
              </div>

              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 font-bold cursor-pointer px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>إعادة تعيين (اليوم)</span>
                </button>
              )}
            </div>

            {/* Filter Row 1: Time Period Buttons */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1.5">الفترة الزمنية للتحصيل والأداء:</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'today', label: 'اليوم' },
                  { id: 'yesterday', label: 'أمس' },
                  { id: 'this_week', label: 'هذا الأسبوع' },
                  { id: 'this_month', label: 'هذا الشهر' },
                  { id: 'last_month', label: 'الشهر السابق' },
                  { id: 'specific_day', label: 'يوم محدد...' },
                  { id: 'specific_month', label: 'شهر محدد...' },
                  { id: 'custom', label: 'فترة مخصصة...' },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onFilterChange({ ...filters, periodType: item.id as any })}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                      filters.periodType === item.id
                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-xs'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/80'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conditional Date / Month Pickers */}
            {filters.periodType === 'specific_day' && (
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 flex items-center gap-3">
                <span className="text-slate-300 font-bold shrink-0">اختر التاريخ:</span>
                <input
                  type="date"
                  value={filters.selectedDate}
                  onChange={e => onFilterChange({ ...filters, selectedDate: e.target.value })}
                  className="bg-slate-950 border border-slate-700 text-white rounded px-2.5 py-1 text-xs focus:outline-none focus:border-amber-400"
                />
              </div>
            )}

            {filters.periodType === 'specific_month' && (
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 flex items-center gap-3">
                <span className="text-slate-300 font-bold shrink-0">اختر الشهر:</span>
                <input
                  type="month"
                  value={filters.selectedMonth}
                  onChange={e => onFilterChange({ ...filters, selectedMonth: e.target.value })}
                  className="bg-slate-950 border border-slate-700 text-white rounded px-2.5 py-1 text-xs focus:outline-none focus:border-amber-400"
                />
              </div>
            )}

            {filters.periodType === 'custom' && (
              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">من تاريخ:</span>
                  <input
                    type="date"
                    value={filters.customStartDate}
                    onChange={e => onFilterChange({ ...filters, customStartDate: e.target.value })}
                    className="bg-slate-950 border border-slate-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">إلى تاريخ:</span>
                  <input
                    type="date"
                    value={filters.customEndDate}
                    onChange={e => onFilterChange({ ...filters, customEndDate: e.target.value })}
                    className="bg-slate-950 border border-slate-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            )}

            {/* Filter Row 2: Zone & Payment Method & Posting Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-800/80">
              {/* Zone Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">المربع السكني:</label>
                <select
                  value={filters.selectedZone}
                  onChange={e => onFilterChange({ ...filters, selectedZone: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="all">كافة المربعات ({subscribers.length} مشترك)</option>
                  {uniqueZones.map(zone => (
                    <option key={zone} value={zone}>
                      مربع: {zone} ({subscribers.filter(s => s.zone === zone).length} مشترك)
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Method Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">طريقة السداد:</label>
                <select
                  value={filters.selectedPaymentMethod}
                  onChange={e => onFilterChange({ ...filters, selectedPaymentMethod: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="all">كافة الطرق (نقداً، محفظة، تحويل)</option>
                  <option value="cash">نقداً فقط (كاش)</option>
                  <option value="e-wallet">محفظة إلكترونية فقط</option>
                  <option value="bank">تحويل بنكي / مصرفي فقط</option>
                </select>
              </div>

              {/* Posting Status Filter */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">حالة الترحيل المالي:</label>
                <select
                  value={filters.selectedPostingStatus}
                  onChange={e => onFilterChange({ ...filters, selectedPostingStatus: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="all">الكل (المرحلة وقيد الانتظار)</option>
                  <option value="unposted">بانتظار الاعتماد والترحيل</option>
                  <option value="posted">مرحلة ومعتمدة بالإدارة</option>
                </select>
              </div>
            </div>

            {/* Direct Shortcuts to Full Views */}
            {onViewCollectionsMode && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                <span className="text-[11px] text-slate-400">انتقال سريع لاستعراض البيانات المفصلة:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onViewCollectionsMode('daily')}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-amber-300 font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1"
                  >
                    <Calendar className="w-3 h-3" />
                    <span>كشف التحصيل باليوم</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onViewCollectionsMode('monthly')}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-indigo-300 font-bold rounded-lg text-xs cursor-pointer flex items-center gap-1"
                  >
                    <FileText className="w-3 h-3" />
                    <span>كشف التحصيل بالشهر</span>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main KPI Cards and Progress (Rendered when expanded) */}
      {isExpanded && (
        <>
          {/* Main 4 KPI Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* 1. Target Goal */}
            <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
              <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>
                  {isMonthlyPeriod ? 'المستهدف الشهري' : isWeeklyPeriod ? 'مستهدف الأسبوع' : 'المستهدف اليومي'}
                </span>
              </span>
              
              {isEditingGoal ? (
                <form onSubmit={handleSaveGoal} className="flex items-center gap-1 mt-1.5">
                  <input
                    type="number"
                    value={goalInput}
                    onChange={e => setGoalInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                    placeholder="المبلغ..."
                    autoFocus
                  />
                  <button type="submit" className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded text-[10px] cursor-pointer">حفظ</button>
                  <button type="button" onClick={() => setIsEditingGoal(false)} className="text-slate-400 hover:text-white text-[10px] cursor-pointer px-1">إلغاء</button>
                </form>
              ) : (
                <div className="flex items-baseline justify-between gap-1 mt-1.5">
                  <span className="text-sm sm:text-base font-black text-slate-100 font-mono">
                    {currentActiveGoal.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">{settings.currency}</span>
                  </span>
                  <button 
                    onClick={handleOpenEditGoal}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-bold cursor-pointer flex items-center gap-0.5"
                    title="تعديل قيمة المستهدف للفترة الحالية"
                  >
                    <Edit3 className="w-2.5 h-2.5" />
                    <span>تعديل</span>
                  </button>
                </div>
              )}
            </div>

            {/* 2. Actual Collected Amount */}
            <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
              <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>المحصل الفعلي ({periodLabel})</span>
              </span>
              <span className="text-sm sm:text-base font-black text-emerald-400 font-mono mt-1.5">
                {totalCollected.toLocaleString()} <span className="text-[10px] font-normal text-emerald-500">{settings.currency}</span>
              </span>
            </div>

            {/* 3. Receipts & Paying Subscribers Count */}
            <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
              <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>السندات والمشتركون</span>
              </span>
              <div className="flex items-baseline justify-between gap-1 mt-1.5">
                <span className="text-sm sm:text-base font-black text-amber-400 font-mono">
                  {receiptsCount} <span className="text-[10px] font-normal text-slate-400">سند</span>
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">
                  ({uniquePayingSubs} مشترك من {targetSubscribersCount})
                </span>
              </div>
            </div>

            {/* 4. Average Ticket Size */}
            <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
              <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>متوسط قيمة السند</span>
              </span>
              <span className="text-sm sm:text-base font-black text-indigo-300 font-mono mt-1.5">
                {avgPerReceipt.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">{settings.currency}</span>
              </span>
            </div>
          </div>

          {/* Payment Method Breakdown Bar */}
          <div className="grid grid-cols-3 gap-2 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80 text-[11px]">
            <div className="flex items-center justify-between px-2 py-1 bg-slate-900/80 rounded-lg">
              <span className="text-slate-400 flex items-center gap-1 font-bold">
                <Banknote className="w-3 h-3 text-emerald-400" />
                <span>نقداً (كاش):</span>
              </span>
              <span className="font-mono font-bold text-emerald-400">{cashCollected.toLocaleString()} {settings.currency}</span>
            </div>

            <div className="flex items-center justify-between px-2 py-1 bg-slate-900/80 rounded-lg">
              <span className="text-slate-400 flex items-center gap-1 font-bold">
                <Wallet className="w-3 h-3 text-cyan-400" />
                <span>محافظ إلكترونية:</span>
              </span>
              <span className="font-mono font-bold text-cyan-400">{walletCollected.toLocaleString()} {settings.currency}</span>
            </div>

            <div className="flex items-center justify-between px-2 py-1 bg-slate-900/80 rounded-lg">
              <span className="text-slate-400 flex items-center gap-1 font-bold">
                <Building2 className="w-3 h-3 text-indigo-400" />
                <span>تحويلات بنكية:</span>
              </span>
              <span className="font-mono font-bold text-indigo-400">{bankCollected.toLocaleString()} {settings.currency}</span>
            </div>
          </div>

          {/* Dynamic Progress Bar and Celebration */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
              <span>نسبة تحقيق المستهدف للفترة المحددة</span>
              <span className="font-mono text-slate-200">{rawProgressPercent}% ({totalCollected.toLocaleString()} / {currentActiveGoal.toLocaleString()} {settings.currency})</span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-950/60">
              <div 
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  rawProgressPercent >= 100 
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                    : rawProgressPercent >= 50
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-400'
                    : 'bg-gradient-to-r from-amber-500 to-orange-400'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {rawProgressPercent >= 100 && (
              <p className="text-[11px] text-emerald-400 font-bold flex items-center gap-1.5 justify-center bg-emerald-500/10 py-1 px-3 rounded-lg border border-emerald-500/25 mt-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>ممتاز! تم تجاوز المستهدف المالي المحدد لهذه الفترة بنجاح تام 🌟</span>
              </p>
            )}
          </div>
        </>
      )}

      {/* Compact Mode Summary Row (When collapsed) */}
      {!isExpanded && (
        <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-800/60 mt-1">
          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-medium">المحصل: <strong className="text-emerald-400 font-mono">{totalCollected.toLocaleString()} {settings.currency}</strong></span>
            <span className="text-slate-400 font-medium">السندات: <strong className="text-amber-400 font-mono">{receiptsCount}</strong></span>
            <span className="text-slate-400 font-medium">الفترة: <strong className="text-slate-300">{periodLabel}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400">الهدف: {currentActiveGoal.toLocaleString()}</span>
            <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className={`h-full ${rawProgressPercent >= 100 ? 'bg-emerald-400' : 'bg-amber-400'}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
