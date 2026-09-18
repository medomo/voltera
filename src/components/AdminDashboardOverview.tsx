import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Subscriber, MeterReading, Payment, SystemSettings, User, AuditLog, InventoryItem, TariffType
} from '../types';
import { 
  Calendar, Clock, TrendingUp, TrendingDown, DollarSign, Zap, Users, Wallet,
  Receipt, ArrowUpRight, ArrowDownRight, Filter, ChevronLeft, ChevronRight,
  Printer, Download, ShieldCheck, Activity, BarChart3, PieChart as PieChartIcon,
  CheckCircle2, AlertCircle, RefreshCw, Layers, MapPin, Search, Eye, Sparkles
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Cell, PieChart, Pie
} from 'recharts';
import { getExactSubscriberBalance } from '../utils/balanceUtils';
import { safePrint } from '../utils/exportUtils';

export interface AdminDashboardOverviewProps {
  subscribers: Subscriber[];
  readings: MeterReading[];
  payments: Payment[];
  settings: SystemSettings;
  currentUser: User;
  users: User[];
  expenses?: any[];
  purchases?: any[];
  treasuryTransfers?: any[];
  auditLogs: AuditLog[];
  inventory?: InventoryItem[];
  onNavigateSection: (section: string) => void;
}

type TimePreset = 'today' | 'yesterday' | 'this_month' | 'last_month' | 'last_30_days' | 'custom_month' | 'custom_range';

export const AdminDashboardOverview: React.FC<AdminDashboardOverviewProps> = ({
  subscribers,
  readings,
  payments,
  settings,
  currentUser,
  users,
  expenses = [],
  purchases = [],
  treasuryTransfers = [],
  auditLogs,
  inventory = [],
  onNavigateSection
}) => {
  // --- STATE FOR TIME FILTERING ---
  const [timePreset, setTimePreset] = useState<TimePreset>('this_month');
  
  // Current real date strings
  const todayStr = useMemo(() => new Date().toISOString().substring(0, 10), []);
  const currentMonthStr = useMemo(() => new Date().toISOString().substring(0, 7), []);

  // Custom month selection (e.g. "2026-08")
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  
  // Custom date range
  const [customStartDate, setCustomStartDate] = useState<string>(`${currentMonthStr}-01`);
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);

  // Drill-down selected day modal
  const [drillDownDay, setDrillDownDay] = useState<string | null>(null);

  // Active chart view tab
  const [chartViewTab, setChartViewTab] = useState<'financial' | 'energy' | 'zones' | 'collectors'>('financial');

  // Discover all months available in system data
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    months.add(currentMonthStr);

    readings.forEach(r => {
      if (r.readingDate && r.readingDate.length >= 7) months.add(r.readingDate.substring(0, 7));
      if (r.billingMonth && r.billingMonth.length >= 7) months.add(r.billingMonth.substring(0, 7));
    });

    payments.forEach(p => {
      if (p.paymentDate && p.paymentDate.length >= 7) months.add(p.paymentDate.substring(0, 7));
    });

    expenses.forEach(e => {
      if (e.date && e.date.length >= 7) months.add(e.date.substring(0, 7));
    });

    purchases.forEach(p => {
      if (p.date && p.date.length >= 7) months.add(p.date.substring(0, 7));
    });

    return Array.from(months).sort().reverse();
  }, [readings, payments, expenses, purchases, currentMonthStr]);

  // Determine current active date range [startDate, endDate] & [prevStartDate, prevEndDate] for comparisons
  const dateRangeInfo = useMemo(() => {
    let start = '';
    let end = '';
    let prevStart = '';
    let prevEnd = '';
    let periodLabel = '';

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');

    if (timePreset === 'today') {
      start = todayStr;
      end = todayStr;
      
      const yDate = new Date(now);
      yDate.setDate(yDate.getDate() - 1);
      const yStr = `${yDate.getFullYear()}-${pad(yDate.getMonth() + 1)}-${pad(yDate.getDate())}`;
      prevStart = yStr;
      prevEnd = yStr;
      periodLabel = `اليوم (${todayStr})`;
    } else if (timePreset === 'yesterday') {
      const yDate = new Date(now);
      yDate.setDate(yDate.getDate() - 1);
      const yStr = `${yDate.getFullYear()}-${pad(yDate.getMonth() + 1)}-${pad(yDate.getDate())}`;
      start = yStr;
      end = yStr;

      const dayBefore = new Date(now);
      dayBefore.setDate(dayBefore.getDate() - 2);
      const dbStr = `${dayBefore.getFullYear()}-${pad(dayBefore.getMonth() + 1)}-${pad(dayBefore.getDate())}`;
      prevStart = dbStr;
      prevEnd = dbStr;
      periodLabel = `أمس (${yStr})`;
    } else if (timePreset === 'this_month') {
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const lastDay = new Date(year, month, 0).getDate();
      start = `${year}-${pad(month)}-01`;
      end = `${year}-${pad(month)}-${pad(lastDay)}`;

      // Prev Month
      const prevMonthDate = new Date(year, month - 2, 1);
      const pYear = prevMonthDate.getFullYear();
      const pMonth = prevMonthDate.getMonth() + 1;
      const pLastDay = new Date(pYear, pMonth, 0).getDate();
      prevStart = `${pYear}-${pad(pMonth)}-01`;
      prevEnd = `${pYear}-${pad(pMonth)}-${pad(pLastDay)}`;
      periodLabel = `هذا الشهر (${year}-${pad(month)})`;
    } else if (timePreset === 'last_month') {
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const pYear = prevMonthDate.getFullYear();
      const pMonth = prevMonthDate.getMonth() + 1;
      const pLastDay = new Date(pYear, pMonth, 0).getDate();
      start = `${pYear}-${pad(pMonth)}-01`;
      end = `${pYear}-${pad(pMonth)}-${pad(pLastDay)}`;

      // Two Months ago
      const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const tYear = twoMonthsAgo.getFullYear();
      const tMonth = twoMonthsAgo.getMonth() + 1;
      const tLastDay = new Date(tYear, tMonth, 0).getDate();
      prevStart = `${tYear}-${pad(tMonth)}-01`;
      prevEnd = `${tYear}-${pad(tMonth)}-${pad(tLastDay)}`;
      periodLabel = `الشهر الماضي (${pYear}-${pad(pMonth)})`;
    } else if (timePreset === 'last_30_days') {
      end = todayStr;
      const d30 = new Date(now);
      d30.setDate(d30.getDate() - 30);
      start = `${d30.getFullYear()}-${pad(d30.getMonth() + 1)}-${pad(d30.getDate())}`;

      const d60 = new Date(now);
      d60.setDate(d60.getDate() - 60);
      prevStart = `${d60.getFullYear()}-${pad(d60.getMonth() + 1)}-${pad(d60.getDate())}`;
      prevEnd = start;
      periodLabel = `آخر 30 يوماً`;
    } else if (timePreset === 'custom_month') {
      const parts = selectedMonth.split('-');
      const year = parseInt(parts[0], 10) || now.getFullYear();
      const month = parseInt(parts[1], 10) || now.getMonth() + 1;
      const lastDay = new Date(year, month, 0).getDate();
      start = `${year}-${pad(month)}-01`;
      end = `${year}-${pad(month)}-${pad(lastDay)}`;

      const prevMonthDate = new Date(year, month - 2, 1);
      const pYear = prevMonthDate.getFullYear();
      const pMonth = prevMonthDate.getMonth() + 1;
      const pLastDay = new Date(pYear, pMonth, 0).getDate();
      prevStart = `${pYear}-${pad(pMonth)}-01`;
      prevEnd = `${pYear}-${pad(pMonth)}-${pad(pLastDay)}`;
      periodLabel = `شهر (${selectedMonth})`;
    } else if (timePreset === 'custom_range') {
      start = customStartDate || `${currentMonthStr}-01`;
      end = customEndDate || todayStr;
      
      // Calculate length of period in days
      const sDate = new Date(start);
      const eDate = new Date(end);
      const diffTime = Math.abs(eDate.getTime() - sDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

      const pEndDate = new Date(sDate);
      pEndDate.setDate(pEndDate.getDate() - 1);
      const pStartDate = new Date(pEndDate);
      pStartDate.setDate(pStartDate.getDate() - diffDays);

      prevStart = `${pStartDate.getFullYear()}-${pad(pStartDate.getMonth() + 1)}-${pad(pStartDate.getDate())}`;
      prevEnd = `${pEndDate.getFullYear()}-${pad(pEndDate.getMonth() + 1)}-${pad(pEndDate.getDate())}`;
      periodLabel = `فترة مخصصة (${start} إلى ${end})`;
    }

    return { start, end, prevStart, prevEnd, periodLabel };
  }, [timePreset, selectedMonth, customStartDate, customEndDate, todayStr, currentMonthStr]);

  // Helper date checking function
  const isDateInRange = (dateStr: string | undefined, start: string, end: string) => {
    if (!dateStr) return false;
    const cleanDate = dateStr.substring(0, 10);
    return cleanDate >= start && cleanDate <= end;
  };

  // --- FILTER DATA FOR CURRENT & PREVIOUS PERIODS ---
  const periodData = useMemo(() => {
    const { start, end, prevStart, prevEnd } = dateRangeInfo;

    // Current Period Readings
    const currentReadings = readings.filter(r => 
      !r.isRejected && (
        isDateInRange(r.readingDate, start, end) || 
        (r.billingMonth && r.billingMonth.substring(0, 7) === start.substring(0, 7) && timePreset === 'custom_month')
      )
    );

    // Current Period Payments
    const currentPayments = payments.filter(p => 
      !p.isRejected && isDateInRange(p.paymentDate, start, end)
    );

    // Current Period Expenses
    const currentExpenses = expenses.filter(e => 
      !e.isRejected && (e as any).status !== 'rejected' && isDateInRange(e.date, start, end)
    );

    // Current Period Purchases
    const currentPurchases = purchases.filter(p => 
      !p.isRejected && (p as any).status !== 'rejected' && isDateInRange(p.date, start, end)
    );

    // Current Period Subscribers created
    const newSubscribers = subscribers.filter(s => 
      isDateInRange(s.createdAt, start, end)
    );

    // Previous Period Readings
    const prevReadings = readings.filter(r => 
      !r.isRejected && (
        isDateInRange(r.readingDate, prevStart, prevEnd) || 
        (r.billingMonth && r.billingMonth.substring(0, 7) === prevStart.substring(0, 7) && timePreset === 'custom_month')
      )
    );

    // Previous Period Payments
    const prevPayments = payments.filter(p => 
      !p.isRejected && isDateInRange(p.paymentDate, prevStart, prevEnd)
    );

    // Previous Period Expenses
    const prevExpenses = expenses.filter(e => 
      !e.isRejected && (e as any).status !== 'rejected' && isDateInRange(e.date, prevStart, prevEnd)
    );

    // Previous Period Purchases
    const prevPurchases = purchases.filter(p => 
      !p.isRejected && (p as any).status !== 'rejected' && isDateInRange(p.date, prevStart, prevEnd)
    );

    // Aggregations Current
    const totalCollected = currentPayments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    const totalBilled = currentReadings.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
    const totalKwh = currentReadings.reduce((sum, r) => sum + (r.consumption || 0), 0);
    const totalExpenseAmount = currentExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalPurchaseAmount = currentPurchases.reduce((sum, p) => sum + (Number(p.totalCost || p.amount) || 0), 0);
    const totalOutflow = totalExpenseAmount + totalPurchaseAmount;
    const netCashflow = totalCollected - totalOutflow;
    const collectionEfficiency = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;
    const profitMargin = totalCollected > 0 ? ((totalCollected - totalOutflow) / totalCollected) * 100 : 0;
    const avgReceipt = currentPayments.length > 0 ? totalCollected / currentPayments.length : 0;
    const avgKwhRate = totalKwh > 0 ? totalBilled / totalKwh : (settings.tariffRates?.residential || 0);

    // Aggregations Previous
    const prevTotalCollected = prevPayments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    const prevTotalBilled = prevReadings.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
    const prevTotalKwh = prevReadings.reduce((sum, r) => sum + (r.consumption || 0), 0);
    const prevTotalOutflow = prevExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) + 
                             prevPurchases.reduce((sum, p) => sum + (Number(p.totalCost || p.amount) || 0), 0);
    const prevNetCashflow = prevTotalCollected - prevTotalOutflow;

    // Delta Growth Calculations
    const calcDelta = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    const deltaRevenue = calcDelta(totalCollected, prevTotalCollected);
    const deltaBilled = calcDelta(totalBilled, prevTotalBilled);
    const deltaKwh = calcDelta(totalKwh, prevTotalKwh);
    const deltaNetCash = calcDelta(netCashflow, prevNetCashflow);

    return {
      currentReadings,
      currentPayments,
      currentExpenses,
      currentPurchases,
      newSubscribers,
      totalCollected,
      totalBilled,
      totalKwh,
      totalExpenseAmount,
      totalPurchaseAmount,
      totalOutflow,
      netCashflow,
      collectionEfficiency,
      profitMargin,
      avgReceipt,
      avgKwhRate,
      prevTotalCollected,
      prevTotalBilled,
      prevTotalKwh,
      prevNetCashflow,
      deltaRevenue,
      deltaBilled,
      deltaKwh,
      deltaNetCash
    };
  }, [readings, payments, expenses, purchases, subscribers, dateRangeInfo, settings.tariffRates, timePreset]);

  // Overall Global System Metrics (for total standing balance & total subscribers)
  const globalMetrics = useMemo(() => {
    const activeSubscribersCount = subscribers.filter(s => s.status === 'active').length;
    const totalReceivables = subscribers.reduce((sum, sub) => {
      const bal = getExactSubscriberBalance(sub, readings, payments);
      return sum + (bal > 0 ? bal : 0);
    }, 0);

    return {
      activeSubscribersCount,
      totalSubscribersCount: subscribers.length,
      totalReceivables
    };
  }, [subscribers, readings, payments]);

  // --- DAY-BY-DAY BREAKDOWN MAP FOR THE SELECTED RANGE ---
  const dailyBreakdown = useMemo(() => {
    const { start, end } = dateRangeInfo;
    const dayMap = new Map<string, {
      date: string;
      paymentsCount: number;
      collected: number;
      readingsCount: number;
      billed: number;
      kwh: number;
      expenses: number;
      purchases: number;
      netFlow: number;
    }>();

    // Initialize all dates in range
    const sDate = new Date(start);
    const eDate = new Date(end);
    const cur = new Date(sDate);
    const pad = (n: number) => String(n).padStart(2, '0');

    while (cur <= eDate) {
      const dStr = `${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`;
      dayMap.set(dStr, {
        date: dStr,
        paymentsCount: 0,
        collected: 0,
        readingsCount: 0,
        billed: 0,
        kwh: 0,
        expenses: 0,
        purchases: 0,
        netFlow: 0
      });
      cur.setDate(cur.getDate() + 1);
    }

    // Populate with payments
    periodData.currentPayments.forEach(p => {
      const d = p.paymentDate?.substring(0, 10);
      if (d && dayMap.has(d)) {
        const item = dayMap.get(d)!;
        item.paymentsCount += 1;
        item.collected += (p.amountPaid || 0);
      }
    });

    // Populate with readings
    periodData.currentReadings.forEach(r => {
      const d = r.readingDate?.substring(0, 10);
      if (d && dayMap.has(d)) {
        const item = dayMap.get(d)!;
        item.readingsCount += 1;
        item.billed += (r.totalAmount || 0);
        item.kwh += (r.consumption || 0);
      }
    });

    // Populate with expenses
    periodData.currentExpenses.forEach(e => {
      const d = e.date?.substring(0, 10);
      if (d && dayMap.has(d)) {
        const item = dayMap.get(d)!;
        item.expenses += (Number(e.amount) || 0);
      }
    });

    // Populate with purchases
    periodData.currentPurchases.forEach(p => {
      const d = p.date?.substring(0, 10);
      if (d && dayMap.has(d)) {
        const item = dayMap.get(d)!;
        item.purchases += (Number(p.totalCost || p.amount) || 0);
      }
    });

    // Compute net flows
    dayMap.forEach(item => {
      item.netFlow = item.collected - (item.expenses + item.purchases);
    });

    // Return as array sorted by date
    const list = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    return list;
  }, [dateRangeInfo, periodData]);

  // Chart data for daily trend
  const dailyChartData = useMemo(() => {
    return dailyBreakdown.map(d => {
      const dayNum = d.date.substring(8, 10);
      return {
        name: `يوم ${dayNum}`,
        fullDate: d.date,
        collected: d.collected,
        billed: d.billed,
        kwh: d.kwh,
        outflow: d.expenses + d.purchases,
        netFlow: d.netFlow
      };
    });
  }, [dailyBreakdown]);

  // Collector Performance for Period
  const collectorPerformance = useMemo(() => {
    const map = new Map<string, { username: string; name: string; totalAmount: number; count: number }>();

    users.filter(u => u.role === 'collector' || u.role === 'admin').forEach(u => {
      map.set(u.username, {
        username: u.username,
        name: u.name || u.username,
        totalAmount: 0,
        count: 0
      });
    });

    periodData.currentPayments.forEach(p => {
      const username = p.receivedBy || 'غير محدد';
      if (!map.has(username)) {
        map.set(username, {
          username,
          name: username,
          totalAmount: 0,
          count: 0
        });
      }
      const c = map.get(username)!;
      c.totalAmount += (p.amountPaid || 0);
      c.count += 1;
    });

    return Array.from(map.values())
      .filter(c => c.totalAmount > 0 || c.count > 0)
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [users, periodData.currentPayments]);

  // Zone Consumption for Period
  const zoneStats = useMemo(() => {
    const map = new Map<string, { zone: string; kwh: number; billed: number; subscribers: number }>();
    
    subscribers.forEach(s => {
      const z = s.zone || 'غير مصنف';
      if (!map.has(z)) {
        map.set(z, { zone: z, kwh: 0, billed: 0, subscribers: 0 });
      }
      map.get(z)!.subscribers += 1;
    });

    // Match readings to subscriber zones
    const subZoneMap = new Map<string, string>();
    subscribers.forEach(s => subZoneMap.set(s.id, s.zone || 'غير مصنف'));

    periodData.currentReadings.forEach(r => {
      const z = subZoneMap.get(r.subscriberId) || 'غير مصنف';
      if (!map.has(z)) {
        map.set(z, { zone: z, kwh: 0, billed: 0, subscribers: 0 });
      }
      const item = map.get(z)!;
      item.kwh += (r.consumption || 0);
      item.billed += (r.totalAmount || 0);
    });

    return Array.from(map.values()).sort((a, b) => b.kwh - a.kwh);
  }, [subscribers, periodData.currentReadings]);

  // Tariff Distribution for Period
  const tariffStats = useMemo(() => {
    const stats: Record<TariffType, { count: number; kwh: number; billed: number }> = {
      residential: { count: 0, kwh: 0, billed: 0 },
      commercial: { count: 0, kwh: 0, billed: 0 },
      industrial: { count: 0, kwh: 0, billed: 0 },
      government: { count: 0, kwh: 0, billed: 0 },
      agricultural: { count: 0, kwh: 0, billed: 0 },
      mosque: { count: 0, kwh: 0, billed: 0 },
      other: { count: 0, kwh: 0, billed: 0 }
    };

    const subTariffMap = new Map<string, TariffType>();
    subscribers.forEach(s => {
      const t = s.tariffType || 'residential';
      subTariffMap.set(s.id, t);
      if (stats[t]) {
        stats[t].count += 1;
      }
    });

    periodData.currentReadings.forEach(r => {
      const t = subTariffMap.get(r.subscriberId) || 'residential';
      if (stats[t]) {
        stats[t].kwh += (r.consumption || 0);
        stats[t].billed += (r.totalAmount || 0);
      }
    });

    return [
      { name: 'سكني', key: 'residential', ...stats.residential, color: '#0ea5e9' },
      { name: 'تجاري', key: 'commercial', ...stats.commercial, color: '#f59e0b' },
      { name: 'صناعي', key: 'industrial', ...stats.industrial, color: '#10b981' },
      { name: 'حكومي', key: 'government', ...stats.government, color: '#6366f1' },
      { name: 'زراعي', key: 'agricultural', ...stats.agricultural, color: '#84cc16' },
      { name: 'مساجد وخيري', key: 'mosque', ...stats.mosque, color: '#14b8a6' },
      { name: 'أخرى', key: 'other', ...stats.other, color: '#8b5cf6' }
    ].filter(item => item.count > 0 || item.kwh > 0 || item.billed > 0 || ['residential', 'commercial', 'industrial'].includes(item.key));
  }, [subscribers, periodData.currentReadings]);

  // Month navigation step
  const handleStepMonth = (direction: 'prev' | 'next') => {
    setTimePreset('custom_month');
    const parts = selectedMonth.split('-');
    let year = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);

    if (direction === 'prev') {
      month -= 1;
      if (month < 1) {
        month = 12;
        year -= 1;
      }
    } else {
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    setSelectedMonth(`${year}-${pad(month)}`);
  };

  return (
    <div className="space-y-6 dir-rtl text-right font-sans">
      
      {/* 1. TOP EXECUTIVE TIME CONTROLLER & NAVIGATOR */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          
          {/* Header Title with Period Indicator */}
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20 shadow-inner">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">لوحة القيادة والمؤشرات المتقدمة</h2>
                <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold font-mono">
                  {dateRangeInfo.periodLabel}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                رصد وتحليل تفصيلي لحركة التحصيل، الطاقة المستهلكة، الفوترة، والمصروفات حسب اليوم والشهر بدقة لحظية.
              </p>
            </div>
          </div>

          {/* Quick Actions & Print */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => safePrint()}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              title="طباعة ملخص مؤشرات الفترة"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>طباعة المؤشرات</span>
            </button>

            <button
              onClick={() => onNavigateSection('admin-postings')}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-amber-500/10 active:scale-95"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>الترحيلات المالية</span>
            </button>
          </div>
        </div>

        {/* Time Presets Switcher Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
          
          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
            <button
              onClick={() => setTimePreset('today')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                timePreset === 'today'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>اليوم</span>
            </button>

            <button
              onClick={() => setTimePreset('yesterday')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                timePreset === 'yesterday'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>أمس</span>
            </button>

            <button
              onClick={() => setTimePreset('this_month')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                timePreset === 'this_month'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>هذا الشهر</span>
            </button>

            <button
              onClick={() => setTimePreset('last_month')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                timePreset === 'last_month'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>الشهر الماضي</span>
            </button>

            <button
              onClick={() => setTimePreset('last_30_days')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                timePreset === 'last_30_days'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>آخر 30 يوماً</span>
            </button>

            <button
              onClick={() => setTimePreset('custom_month')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                timePreset === 'custom_month'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>اختيار شهر محدد</span>
            </button>

            <button
              onClick={() => setTimePreset('custom_range')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                timePreset === 'custom_range'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>نطاق مخصص</span>
            </button>
          </div>

          {/* Dynamic Controls based on preset */}
          <div className="flex items-center gap-2">
            {timePreset === 'custom_month' && (
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 p-1 rounded-2xl">
                <button
                  onClick={() => handleStepMonth('prev')}
                  className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl transition-all cursor-pointer"
                  title="الشهر السابق"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-white text-xs font-mono font-bold px-2 py-1 outline-none cursor-pointer"
                >
                  {availableMonths.map(m => (
                    <option key={m} value={m} className="bg-slate-900 text-white">
                      {m}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => handleStepMonth('next')}
                  className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl transition-all cursor-pointer"
                  title="الشهر التالي"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}

            {timePreset === 'custom_range' && (
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-1.5 rounded-2xl text-xs">
                <div className="flex items-center gap-1 text-slate-400">
                  <span>من:</span>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-slate-900 text-white px-2 py-1 rounded-lg border border-slate-800 font-mono text-xs outline-none"
                  />
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <span>إلى:</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-slate-900 text-white px-2 py-1 rounded-lg border border-slate-800 font-mono text-xs outline-none"
                  />
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 2. ADVANCED KPI METRIC CARDS (With Period-Based Delta Percentages) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Collections */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 font-bold">إجمالي التحصيلات (المقبوض)</span>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          
          <div className="flex items-baseline gap-2">
            <span className="text-2xl lg:text-3xl font-black font-mono text-emerald-400 tracking-tight">
              {periodData.totalCollected.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-slate-400">{settings.currency}</span>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              عدد السندات: <strong className="text-white font-mono">{periodData.currentPayments.length}</strong>
            </span>

            {/* Growth indicator badge */}
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
              periodData.deltaRevenue >= 0 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {periodData.deltaRevenue >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              <span>{Math.abs(periodData.deltaRevenue).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Card 2: Billed Invoices & kWh Consumed */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-lg relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 font-bold">الطاقة والفوترة المصدرة</span>
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
              <Zap className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl lg:text-3xl font-black font-mono text-amber-400 tracking-tight">
              {periodData.totalKwh.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-slate-400">ك.و</span>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              المفوتر: <strong className="text-white font-mono">{periodData.totalBilled.toLocaleString()}</strong> {settings.currency}
            </span>

            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
              periodData.deltaKwh >= 0 
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {periodData.deltaKwh >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              <span>{Math.abs(periodData.deltaKwh).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Card 3: Net Operating Cashflow */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-lg relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 font-bold">صافي التدفق المالي (الربح)</span>
            <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-2xl border border-cyan-500/20">
              <Wallet className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className={`text-2xl lg:text-3xl font-black font-mono tracking-tight ${
              periodData.netCashflow >= 0 ? 'text-cyan-400' : 'text-rose-400'
            }`}>
              {periodData.netCashflow.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-slate-400">{settings.currency}</span>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              المصروفات: <strong className="text-rose-400 font-mono">{periodData.totalOutflow.toLocaleString()}</strong>
            </span>

            <span className="text-[10px] font-mono text-cyan-300 font-bold bg-cyan-950/40 px-2 py-0.5 rounded-md border border-cyan-800/40">
              هامش {periodData.profitMargin.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Card 4: Collection Efficiency & Standing Debt */}
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-lg relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-400 font-bold">كفاءة التحصيل والديون</span>
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl lg:text-3xl font-black font-mono text-blue-400 tracking-tight">
              {periodData.collectionEfficiency.toFixed(1)}%
            </span>
            <span className="text-xs font-bold text-slate-400">نسبة التحصيل</span>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              المديونية الكلية: <strong className="text-amber-400 font-mono">{globalMetrics.totalReceivables.toLocaleString()}</strong>
            </span>

            <span className="text-[10px] text-slate-400 font-bold">
              {globalMetrics.activeSubscribersCount} نشط
            </span>
          </div>
        </div>

      </div>

      {/* 3. INTERACTIVE CHARTS & VISUAL ANALYTICS SECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        
        {/* Chart View Switcher Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-400" />
              <span>التحليل البياني التفصيلي للحركة اليومية والشهرية</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              تتبع المسار اليومي للمقبوضات والفوترة واستهلاك الطاقة خلال الفترة المحددة
            </p>
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
            <button
              onClick={() => setChartViewTab('financial')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                chartViewTab === 'financial'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              المالية والتحصيل
            </button>
            <button
              onClick={() => setChartViewTab('energy')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                chartViewTab === 'energy'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              استهلاك الطاقة (kWh)
            </button>
            <button
              onClick={() => setChartViewTab('zones')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                chartViewTab === 'zones'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              توزيع المناطق
            </button>
            <button
              onClick={() => setChartViewTab('collectors')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                chartViewTab === 'collectors'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              أداء المحصلين
            </button>
          </div>
        </div>

        {/* Tab 1: Financial Chart (Daily Collections vs Invoiced vs Expenses) */}
        {chartViewTab === 'financial' && (
          <div className="space-y-4">
            <div className="flex items-center justify-end gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-slate-300">التحصيلات النقدية</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-slate-300">الفوترة الصادرة</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="text-slate-300">المصروفات والمشتريات</span>
              </div>
            </div>

            <div className="h-72 w-full dir-ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCollectedDaily" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorBilledDaily" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorOutflowDaily" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val} />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl shadow-2xl text-right dir-rtl font-sans space-y-1.5">
                            <p className="text-white font-bold text-xs border-b border-slate-800 pb-1">{item.fullDate}</p>
                            <p className="text-xs text-emerald-400">
                              المحصل: <strong className="font-mono">{item.collected.toLocaleString()}</strong> {settings.currency}
                            </p>
                            <p className="text-xs text-amber-400">
                              المفوتر: <strong className="font-mono">{item.billed.toLocaleString()}</strong> {settings.currency}
                            </p>
                            <p className="text-xs text-rose-400">
                              المصروفات: <strong className="font-mono">{item.outflow.toLocaleString()}</strong> {settings.currency}
                            </p>
                            <p className="text-xs text-cyan-400 pt-1 border-t border-slate-800">
                              صافي اليوم: <strong className="font-mono">{item.netFlow.toLocaleString()}</strong> {settings.currency}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area type="monotone" dataKey="collected" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCollectedDaily)" />
                  <Area type="monotone" dataKey="billed" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorBilledDaily)" />
                  <Area type="monotone" dataKey="outflow" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorOutflowDaily)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tab 2: Energy Consumption Chart */}
        {chartViewTab === 'energy' && (
          <div className="space-y-4">
            <div className="h-72 w-full dir-ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val} kWh`} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl shadow-xl text-right dir-rtl font-sans">
                            <p className="text-white font-bold text-xs">{item.fullDate}</p>
                            <p className="text-xs text-cyan-400 mt-1">
                              الطاقة المستهلكة: <strong className="font-mono">{item.kwh.toLocaleString()}</strong> ك.و
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="kwh" fill="#06b6d4" radius={[6, 6, 0, 0]} maxBarSize={30}>
                    {dailyChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill="#06b6d4" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tab 3: Zones Distribution */}
        {chartViewTab === 'zones' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300">استهلاك الطاقة حسب المربعات والمناطق</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {zoneStats.map((z, idx) => (
                  <div key={z.zone} className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-mono font-bold text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-white">{z.zone}</span>
                    </div>
                    <div className="text-left font-mono">
                      <span className="text-cyan-400 font-bold">{z.kwh.toLocaleString()} ك.و</span>
                      <span className="text-[10px] text-slate-500 block">{z.subscribers} مشترك</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300">توزيع الاستهلاك حسب قطاع التعرفة</h4>
              <div className="space-y-3">
                {tariffStats.map(t => (
                  <div key={t.key} className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                        <span>القطاع {t.name}</span>
                      </span>
                      <span className="font-mono text-slate-300">{t.kwh.toLocaleString()} ك.و ({periodData.totalKwh > 0 ? ((t.kwh / periodData.totalKwh) * 100).toFixed(1) : 0}%)</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          backgroundColor: t.color, 
                          width: `${periodData.totalKwh > 0 ? Math.min(100, (t.kwh / periodData.totalKwh) * 100) : 0}%` 
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Collectors Leaderboard */}
        {chartViewTab === 'collectors' && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300">ترتيب كفاءة وتحصيلات المحصلين خلال الفترة</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {collectorPerformance.map((c, idx) => {
                const sharePercent = periodData.totalCollected > 0 ? (c.totalAmount / periodData.totalCollected) * 100 : 0;
                return (
                  <div key={c.username} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between gap-3 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                          idx === 0 ? 'bg-amber-500 text-slate-950' : idx === 1 ? 'bg-slate-300 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}>
                          #{idx + 1}
                        </div>
                        <div>
                          <p className="font-bold text-white text-xs">{c.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">@{c.username}</p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-[10px] font-mono font-bold">
                        {c.count} سند
                      </span>
                    </div>

                    <div>
                      <div className="flex items-baseline justify-between text-xs mb-1">
                        <span className="text-slate-400">إجمالي المقبوض:</span>
                        <span className="font-mono text-emerald-400 font-bold">{c.totalAmount.toLocaleString()} {settings.currency}</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${sharePercent}%` }} />
                      </div>
                      <p className="text-[9px] text-slate-500 text-left font-mono mt-1">{sharePercent.toFixed(1)}% من إجمالي تحصيلات الفترة</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* 4. DAY-BY-DAY DETAILED LEDGER & BREAKDOWN TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <span>جدول اليوميات والتدفق المالي التفصيلي (اليوم / الشهر)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              بيان تفصيلي لكل يوم في الفترة المحددة يوضح المقبوضات، الفوترة، الطاقة، والمصروفات وصافي السيولة
            </p>
          </div>

          <span className="text-xs text-slate-400 font-mono bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            عدد الأيام: <strong className="text-white">{dailyBreakdown.length}</strong> يوم
          </span>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-950/60">
                <th className="p-3">التاريخ واليوم</th>
                <th className="p-3 text-center">سندات التحصيل</th>
                <th className="p-3">إجمالي المقبوض ({settings.currency})</th>
                <th className="p-3 text-center">القراءات</th>
                <th className="p-3">الطاقة (ك.و)</th>
                <th className="p-3">المفوتر ({settings.currency})</th>
                <th className="p-3">المصروفات</th>
                <th className="p-3">صافي التدفق اليومي</th>
                <th className="p-3 text-center">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {dailyBreakdown.map((d) => {
                const hasActivity = d.collected > 0 || d.billed > 0 || d.expenses > 0 || d.purchases > 0;
                const isTodayRow = d.date === todayStr;

                return (
                  <tr 
                    key={d.date}
                    className={`hover:bg-slate-800/50 transition-colors ${
                      isTodayRow ? 'bg-amber-500/5 ring-1 ring-amber-500/20' : ''
                    }`}
                  >
                    <td className="p-3 font-mono font-bold text-white flex items-center gap-2">
                      {isTodayRow && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" title="اليوم الحالي" />
                      )}
                      <span>{d.date}</span>
                    </td>

                    <td className="p-3 text-center font-mono text-slate-300">
                      {d.paymentsCount > 0 ? (
                        <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-md font-bold">
                          {d.paymentsCount}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    <td className="p-3 font-mono font-bold text-emerald-400">
                      {d.collected > 0 ? d.collected.toLocaleString() : <span className="text-slate-600">0</span>}
                    </td>

                    <td className="p-3 text-center font-mono text-slate-300">
                      {d.readingsCount > 0 ? (
                        <span className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-md font-bold">
                          {d.readingsCount}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    <td className="p-3 font-mono text-cyan-400 font-bold">
                      {d.kwh > 0 ? d.kwh.toLocaleString() : <span className="text-slate-600">0</span>}
                    </td>

                    <td className="p-3 font-mono text-amber-300">
                      {d.billed > 0 ? d.billed.toLocaleString() : <span className="text-slate-600">0</span>}
                    </td>

                    <td className="p-3 font-mono text-rose-400">
                      {(d.expenses + d.purchases) > 0 ? (d.expenses + d.purchases).toLocaleString() : <span className="text-slate-600">0</span>}
                    </td>

                    <td className={`p-3 font-mono font-black ${
                      d.netFlow > 0 ? 'text-cyan-400' : d.netFlow < 0 ? 'text-rose-400' : 'text-slate-500'
                    }`}>
                      {d.netFlow !== 0 ? d.netFlow.toLocaleString() : '0'}
                    </td>

                    <td className="p-3 text-center">
                      <button
                        onClick={() => setDrillDownDay(d.date)}
                        disabled={!hasActivity}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          hasActivity 
                            ? 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700' 
                            : 'bg-slate-900 text-slate-700 border-slate-800/40 cursor-not-allowed'
                        }`}
                        title="فحص حركة هذا اليوم"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. DRILL-DOWN DAY MODAL */}
      <AnimatePresence>
        {drillDownDay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
            >
              {/* Modal Header */}
              <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-400" />
                    <span>تفاصيل العمليات والحركة لليوم: {drillDownDay}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    كافة سندات القبض وقراءات العدادات والمصروفات المسجلة في هذا اليوم
                  </p>
                </div>

                <button
                  onClick={() => setDrillDownDay(null)}
                  className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-6">
                
                {/* Day Summary Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-right">
                    <span className="text-[10px] text-slate-400 font-bold block">تحصيلات اليوم</span>
                    <span className="text-base font-black font-mono text-emerald-400">
                      {payments
                        .filter(p => !p.isRejected && p.paymentDate?.substring(0, 10) === drillDownDay)
                        .reduce((sum, p) => sum + (p.amountPaid || 0), 0)
                        .toLocaleString()} {settings.currency}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-right">
                    <span className="text-[10px] text-slate-400 font-bold block">طاقة اليوم (ك.و)</span>
                    <span className="text-base font-black font-mono text-cyan-400">
                      {readings
                        .filter(r => !r.isRejected && r.readingDate?.substring(0, 10) === drillDownDay)
                        .reduce((sum, r) => sum + (r.consumption || 0), 0)
                        .toLocaleString()} ك.و
                    </span>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-right">
                    <span className="text-[10px] text-slate-400 font-bold block">مصروفات اليوم</span>
                    <span className="text-base font-black font-mono text-rose-400">
                      {expenses
                        .filter(e => e.date?.substring(0, 10) === drillDownDay)
                        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
                        .toLocaleString()} {settings.currency}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-right">
                    <span className="text-[10px] text-slate-400 font-bold block">عدد السندات والعمليات</span>
                    <span className="text-base font-black font-mono text-amber-400">
                      {payments.filter(p => !p.isRejected && p.paymentDate?.substring(0, 10) === drillDownDay).length +
                       readings.filter(r => !r.isRejected && r.readingDate?.substring(0, 10) === drillDownDay).length} عملية
                    </span>
                  </div>
                </div>

                {/* Day's Payments Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span>سندات التحصيل الصادرة في هذا اليوم</span>
                  </h4>
                  
                  {payments.filter(p => !p.isRejected && p.paymentDate?.substring(0, 10) === drillDownDay).length === 0 ? (
                    <p className="text-xs text-slate-500 bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                      لا توجد سندات تحصيل مسجلة في هذا اليوم.
                    </p>
                  ) : (
                    <div className="overflow-x-auto bg-slate-950 rounded-2xl border border-slate-800">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400">
                            <th className="p-2.5">رقم السند</th>
                            <th className="p-2.5">اسم المشترك</th>
                            <th className="p-2.5">المبلغ المحصل</th>
                            <th className="p-2.5">المحصل</th>
                            <th className="p-2.5">طريقة الدفع</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50 font-mono">
                          {payments
                            .filter(p => !p.isRejected && p.paymentDate?.substring(0, 10) === drillDownDay)
                            .map(p => (
                              <tr key={p.id} className="hover:bg-slate-900/50">
                                <td className="p-2.5 text-amber-400 font-bold">{p.receiptNumber}</td>
                                <td className="p-2.5 text-white font-sans">{p.subscriberName}</td>
                                <td className="p-2.5 text-emerald-400 font-bold">{p.amountPaid.toLocaleString()} {settings.currency}</td>
                                <td className="p-2.5 text-slate-300 font-sans">{p.receivedBy}</td>
                                <td className="p-2.5 text-slate-400 font-sans">{p.paymentMethod || 'نقدي'}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Day's Readings Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>قراءات العدادات وفواتير الاستهلاك لليوم</span>
                  </h4>
                  
                  {readings.filter(r => !r.isRejected && r.readingDate?.substring(0, 10) === drillDownDay).length === 0 ? (
                    <p className="text-xs text-slate-500 bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                      لا توجد قراءات عداد مسجلة في هذا اليوم.
                    </p>
                  ) : (
                    <div className="overflow-x-auto bg-slate-950 rounded-2xl border border-slate-800">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400">
                            <th className="p-2.5">رقم الفاتورة</th>
                            <th className="p-2.5">المشترك</th>
                            <th className="p-2.5">رقم العداد</th>
                            <th className="p-2.5">الاستهلاك (ك.و)</th>
                            <th className="p-2.5">المبلغ المطلوب</th>
                            <th className="p-2.5">الحالة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50 font-mono">
                          {readings
                            .filter(r => !r.isRejected && r.readingDate?.substring(0, 10) === drillDownDay)
                            .map(r => (
                              <tr key={r.id} className="hover:bg-slate-900/50">
                                <td className="p-2.5 text-amber-400">{r.invoiceNumber || r.id.substring(0, 8)}</td>
                                <td className="p-2.5 text-white font-sans">{r.subscriberName}</td>
                                <td className="p-2.5 text-slate-400">{r.meterNumber}</td>
                                <td className="p-2.5 text-cyan-400 font-bold">{r.consumption} ك.و</td>
                                <td className="p-2.5 text-amber-300 font-bold">{r.totalAmount.toLocaleString()} {settings.currency}</td>
                                <td className="p-2.5 font-sans">
                                  {r.isPosted ? (
                                    <span className="text-emerald-400 font-bold text-[10px]">مرحلة</span>
                                  ) : (
                                    <span className="text-amber-400 font-bold text-[10px]">بانتظار الاعتماد</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setDrillDownDay(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-5 rounded-xl text-xs transition-all cursor-pointer"
                >
                  إغلاق
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
