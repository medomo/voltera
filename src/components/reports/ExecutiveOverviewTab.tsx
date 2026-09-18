import React from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, TrendingDown, Wallet, CreditCard, Activity, 
  Map, DollarSign, Zap, Gauge, ShieldAlert, Award, ArrowUpRight,
  CheckCircle2, AlertTriangle, Users, Layers, Sparkles, Scale
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, AreaChart, Area, ComposedChart, Line
} from 'recharts';
import { BaseReportProps } from './types';

export const ExecutiveOverviewTab: React.FC<BaseReportProps> = ({
  subscribers,
  readings,
  payments,
  settings,
  expenses = [],
  purchases = [],
  employeeTxs = [],
  connections = [],
  filters,
  onNavigateToTab
}) => {
  const currency = settings.currency || 'ر.ي';

  // Calculations based on filtered datasets
  const totalCashCollected = payments.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);
  const totalBilledInvoices = readings.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
  const totalConnectionFees = connections.reduce((sum, c) => sum + (Number(c.paidAmount) || 0), 0);

  const totalOpexExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalPurchases = purchases.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalSalaries = employeeTxs.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  const totalAllExpenses = totalOpexExpenses + totalPurchases + totalSalaries;

  const totalRevenueCombined = totalCashCollected + totalConnectionFees;
  const netOperatingProfit = totalRevenueCombined - totalAllExpenses;
  const profitMarginPercent = totalRevenueCombined > 0 ? (netOperatingProfit / totalRevenueCombined) * 100 : 0;
  const collectionEfficiencyPercent = totalBilledInvoices > 0 ? Math.min(100, (totalCashCollected / totalBilledInvoices) * 100) : 100;

  const totalConsumptionKwh = readings.reduce((sum, r) => sum + (Number(r.consumption) || 0), 0);
  const avgConsumptionPerSub = subscribers.length > 0 ? Math.round(totalConsumptionKwh / subscribers.length) : 0;

  const totalOutstandingDebt = subscribers.reduce((sum, s) => sum + (s.currentBalance > 0 ? s.currentBalance : 0), 0);

  // Monthly Multi-Dimensional Trend
  const monthlyTrendData = React.useMemo(() => {
    const map: Record<string, { month: string; collected: number; billed: number; expenses: number; profit: number }> = {};
    
    payments.forEach(p => {
      const m = p.paymentDate.substring(0, 7);
      if (!map[m]) map[m] = { month: m, collected: 0, billed: 0, expenses: 0, profit: 0 };
      map[m].collected += Number(p.amountPaid) || 0;
    });

    readings.forEach(r => {
      const m = (r.readingDate || r.billingMonth).substring(0, 7);
      if (!map[m]) map[m] = { month: m, collected: 0, billed: 0, expenses: 0, profit: 0 };
      map[m].billed += Number(r.totalAmount) || 0;
    });

    expenses.forEach(e => {
      const m = e.date.substring(0, 7);
      if (!map[m]) map[m] = { month: m, collected: 0, billed: 0, expenses: 0, profit: 0 };
      map[m].expenses += Number(e.amount) || 0;
    });

    return Object.values(map).map(item => ({
      ...item,
      profit: item.collected - item.expenses
    })).sort((a, b) => a.month.localeCompare(b.month)).slice(-8);
  }, [payments, readings, expenses]);

  // Zone Performance Breakdown
  const zonePerformance = React.useMemo(() => {
    const zonesList = settings.zones || ['المنطقة الرئيسية'];
    return zonesList.map(zoneName => {
      const zoneSubs = subscribers.filter(s => s.zone === zoneName);
      const zoneReadings = readings.filter(r => {
        const sub = subscribers.find(s => s.id === r.subscriberId);
        return sub ? sub.zone === zoneName : r.zone === zoneName;
      });
      const zonePayments = payments.filter(p => {
        const sub = subscribers.find(s => s.id === p.subscriberId);
        return sub ? sub.zone === zoneName : true;
      });

      const zoneBilled = zoneReadings.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
      const zoneCollected = zonePayments.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);
      const zoneKwh = zoneReadings.reduce((sum, r) => sum + (Number(r.consumption) || 0), 0);
      const zoneDebt = zoneSubs.reduce((sum, s) => sum + (s.currentBalance > 0 ? s.currentBalance : 0), 0);
      const collectionRate = zoneBilled > 0 ? Math.min(100, (zoneCollected / zoneBilled) * 100) : 100;

      return {
        zoneName,
        subscribersCount: zoneSubs.length,
        zoneKwh,
        zoneBilled,
        zoneCollected,
        zoneDebt,
        collectionRate
      };
    }).sort((a, b) => b.zoneBilled - a.zoneBilled);
  }, [settings.zones, subscribers, readings, payments]);

  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-2xl shadow-2xl text-right text-white text-xs font-bold space-y-1 backdrop-blur-md">
          <p className="font-black text-amber-400 border-b border-slate-800 pb-1 font-mono" dir="ltr">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 py-0.5">
              <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span>{entry.name}:</span>
              </span>
              <span className="font-mono font-black text-slate-100">{entry.value.toLocaleString()} {currency}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 text-right"
      dir="rtl"
    >
      {/* 1. TOP STRATEGIC KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Total Cash Collected */}
        <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-3xl shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full font-mono">
              {collectionEfficiencyPercent.toFixed(1)}% كفاءة
            </span>
          </div>
          <p className="text-[11px] font-bold text-slate-400">إجمالي التحصيل الفعلي</p>
          <h3 className="text-xl font-black text-white font-mono mt-1">
            {totalCashCollected.toLocaleString()} <span className="text-xs font-sans text-slate-400">{currency}</span>
          </h3>
          <p className="text-[10px] text-slate-500 font-bold mt-1.5 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>توريدات نقدية محققة للصناديق</span>
          </p>
        </div>

        {/* Card 2: Total Invoiced Billing */}
        <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-3xl shadow-lg relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full font-mono">
              {readings.length} قراءة
            </span>
          </div>
          <p className="text-[11px] font-bold text-slate-400">الفواتير والمبيعات الصادرة</p>
          <h3 className="text-xl font-black text-white font-mono mt-1">
            {totalBilledInvoices.toLocaleString()} <span className="text-xs font-sans text-slate-400">{currency}</span>
          </h3>
          <p className="text-[10px] text-slate-500 font-bold mt-1.5 flex items-center gap-1">
            <Activity className="w-3 h-3 text-amber-400" />
            <span>إجمالي الفواتير المستحقة</span>
          </p>
        </div>

        {/* Card 3: Total Expenses & OPEX */}
        <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-3xl shadow-lg relative overflow-hidden group hover:border-rose-500/40 transition-all">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400">
              <TrendingDown className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full font-mono">
              تشغيلي
            </span>
          </div>
          <p className="text-[11px] font-bold text-slate-400">إجمالي المصروفات والمشتريات</p>
          <h3 className="text-xl font-black text-rose-400 font-mono mt-1">
            {totalAllExpenses.toLocaleString()} <span className="text-xs font-sans text-slate-400">{currency}</span>
          </h3>
          <p className="text-[10px] text-slate-500 font-bold mt-1.5">وقود + صيانة + رواتب ومشتريات</p>
        </div>

        {/* Card 4: Net Operating Profit */}
        <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-3xl shadow-lg relative overflow-hidden group hover:border-indigo-500/40 transition-all">
          <div className="flex justify-between items-start mb-2">
            <div className={`p-2.5 rounded-2xl border ${netOperatingProfit >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border font-mono ${netOperatingProfit >= 0 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}`}>
              {profitMarginPercent.toFixed(1)}% هامش
            </span>
          </div>
          <p className="text-[11px] font-bold text-slate-400">صافي الأرباح التشغيلية</p>
          <h3 className={`text-xl font-black font-mono mt-1 ${netOperatingProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {netOperatingProfit.toLocaleString()} <span className="text-xs font-sans text-slate-400">{currency}</span>
          </h3>
          <p className="text-[10px] text-slate-500 font-bold mt-1.5">الفارق المالي الصافي بعد النفقات</p>
        </div>

        {/* Card 5: Total Distributed Energy */}
        <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-3xl shadow-lg relative overflow-hidden group hover:border-sky-500/40 transition-all">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-2xl text-sky-400">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black px-2 py-0.5 bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-full font-mono">
              {avgConsumptionPerSub} ك.و/مشترك
            </span>
          </div>
          <p className="text-[11px] font-bold text-slate-400">إجمالي الطاقة الموزعة</p>
          <h3 className="text-xl font-black text-sky-400 font-mono mt-1">
            {totalConsumptionKwh.toLocaleString()} <span className="text-xs font-sans text-slate-400">ك.و.س</span>
          </h3>
          <p className="text-[10px] text-slate-500 font-bold mt-1.5">إجمالي استهلاك عدادات المشتركين</p>
        </div>

        {/* Card 6: Total Uncollected Debt */}
        <div className="bg-slate-900 border border-slate-800 p-4.5 rounded-3xl shadow-lg relative overflow-hidden group hover:border-orange-500/40 transition-all">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2.5 bg-orange-500/10 border border-orange-500/20 rounded-2xl text-orange-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black px-2 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full font-mono">
              {subscribers.filter(s => s.currentBalance > 0).length} مدين
            </span>
          </div>
          <p className="text-[11px] font-bold text-slate-400">إجمالي المديونيات القائمة</p>
          <h3 className="text-xl font-black text-orange-400 font-mono mt-1">
            {totalOutstandingDebt.toLocaleString()} <span className="text-xs font-sans text-slate-400">{currency}</span>
          </h3>
          <p className="text-[10px] text-slate-500 font-bold mt-1.5">مستحقات غير محصلة قيد المتابعة</p>
        </div>
      </div>

      {/* 2. MAIN VISUAL DASHBOARD: FINANCIAL PERFORMANCE CHART & STRATEGIC P&L */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Monthly Trend Dynamic Composed Chart (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <BarChart className="w-4 h-4 text-amber-400" />
                <span>المسار الشهري للإيرادات والتحصيل مقابل المصروفات</span>
              </h3>
              <p className="text-[11px] text-slate-400 font-bold mt-0.5">تحليل مقارن للمقبوضات والفواتير والنفقات التشغيلية</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black">
              <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>التحصيل</span>
              </span>
              <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>المفوتر</span>
              </span>
              <span className="flex items-center gap-1 text-rose-400 bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/20">
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                <span>المصروفات</span>
              </span>
            </div>
          </div>

          <div className="h-[290px] w-full pt-2" dir="ltr">
            {monthlyTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }} />
                  <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <RechartsTooltip content={<CustomChartTooltip />} />
                  <Bar dataKey="collected" name="التحصيل النقدي" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="expenses" name="المصروفات والمشتريات" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  <Line type="monotone" dataKey="billed" name="الفواتير المصدرة" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4, fill: '#f59e0b' }} />
                  <Line type="monotone" dataKey="profit" name="صافي الربح" stroke="#38bdf8" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3, fill: '#38bdf8' }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs font-bold">
                لا توجد بيانات مالية متوفرة للفترة المحددة
              </div>
            )}
          </div>
        </div>

        {/* Right: Comprehensive Profit & Loss Statement P&L (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-400" />
              <span>قائمة الأرباح والخسائر التشغيلية (P&L)</span>
            </h3>
            <span className="text-[10px] font-black font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
              ملخص دوري
            </span>
          </div>

          <div className="space-y-3.5 text-xs font-bold">
            {/* Revenues Section */}
            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/80 space-y-2">
              <div className="flex justify-between items-center text-emerald-400 font-black border-b border-slate-800 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-emerald-400 rounded-full"></span>
                  <span>1. الإيرادات والمقبوضات التشغيلية</span>
                </span>
                <span className="font-mono">{totalRevenueCombined.toLocaleString()} {currency}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300 text-[11px] pt-0.5">
                <span className="text-slate-400">تحصيلات فواتير الطاقة:</span>
                <span className="font-mono font-bold text-white">{totalCashCollected.toLocaleString()} {currency}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300 text-[11px]">
                <span className="text-slate-400">رسوم الاشتراكات والتوصيلات:</span>
                <span className="font-mono font-bold text-white">{totalConnectionFees.toLocaleString()} {currency}</span>
              </div>
            </div>

            {/* Expenses Section */}
            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/80 space-y-2">
              <div className="flex justify-between items-center text-rose-400 font-black border-b border-slate-800 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-rose-400 rounded-full"></span>
                  <span>2. التكاليف والنفقات والمشتريات</span>
                </span>
                <span className="font-mono">{totalAllExpenses.toLocaleString()} {currency}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300 text-[11px] pt-0.5">
                <span className="text-slate-400">مصاريف الوقود والتشغيل والصيانة:</span>
                <span className="font-mono font-bold text-white">{totalOpexExpenses.toLocaleString()} {currency}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300 text-[11px]">
                <span className="text-slate-400">مشتريات الشبكة والمواد والمهمات:</span>
                <span className="font-mono font-bold text-white">{totalPurchases.toLocaleString()} {currency}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300 text-[11px]">
                <span className="text-slate-400">رواتب وأجور ومستحقات الكادر:</span>
                <span className="font-mono font-bold text-white">{totalSalaries.toLocaleString()} {currency}</span>
              </div>
            </div>

            {/* Net Result Bar */}
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
              netOperatingProfit >= 0 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              <div>
                <span className="text-[10px] font-bold block text-slate-400">صافي العائد التشغيلي للمحطة</span>
                <span className="text-base font-black font-mono">
                  {netOperatingProfit.toLocaleString()} <span className="text-xs font-sans">{currency}</span>
                </span>
              </div>
              <div className="text-left">
                <span className="text-[10px] font-bold block text-slate-400">نسبة الهامش</span>
                <span className="text-sm font-black font-mono">
                  {profitMarginPercent.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. GEOGRAPHICAL ZONE PERFORMANCE MATRIX TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Map className="w-5 h-5 text-sky-400" />
              <span>مصفوفة الأداء المالي والتشغيلي حسب المناطق الجغرافية</span>
            </h3>
            <p className="text-xs text-slate-400 font-bold mt-0.5">مقارنة كفاءة التحصيل والاستهلاك والديون بين مربعات التوزيع</p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800 px-3 py-1 rounded-xl">
            {zonePerformance.length} مربعات جغرافية
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th className="p-3 text-center">م</th>
                <th className="p-3">اسم المنطقة / المربع</th>
                <th className="p-3 text-center">عدد المشتركين</th>
                <th className="p-3 text-center">الاستهلاك (ك.و.س)</th>
                <th className="p-3 text-center">الفواتير المصدرة</th>
                <th className="p-3 text-center">التحصيل الفعلي</th>
                <th className="p-3 text-center">الديون القائمة</th>
                <th className="p-3 text-center">كفاءة التحصيل %</th>
                <th className="p-3 text-center">حالة التحصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-bold text-slate-200">
              {zonePerformance.map((zp, idx) => {
                const isHighPerformer = zp.collectionRate >= 85;
                const isModerate = zp.collectionRate >= 65 && zp.collectionRate < 85;

                return (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 text-center font-mono text-slate-500 font-bold">#{idx + 1}</td>
                    <td className="p-3 font-black text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      <span>{zp.zoneName}</span>
                    </td>
                    <td className="p-3 text-center font-mono">{zp.subscribersCount} مشترك</td>
                    <td className="p-3 text-center font-mono text-sky-400 font-black">{zp.zoneKwh.toLocaleString()}</td>
                    <td className="p-3 text-center font-mono text-slate-300">{zp.zoneBilled.toLocaleString()} {currency}</td>
                    <td className="p-3 text-center font-mono text-emerald-400 font-black">{zp.zoneCollected.toLocaleString()} {currency}</td>
                    <td className="p-3 text-center font-mono text-orange-400 font-black">{zp.zoneDebt.toLocaleString()} {currency}</td>
                    <td className="p-3 text-center font-mono">
                      <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black border ${
                        isHighPerformer 
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                          : isModerate 
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
                          : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                      }`}>
                        {zp.collectionRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-3 text-center font-black text-[11px]">
                      {isHighPerformer ? (
                        <span className="text-emerald-400 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> ممتاز
                        </span>
                      ) : isModerate ? (
                        <span className="text-amber-400 inline-flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> متوسط
                        </span>
                      ) : (
                        <span className="text-rose-400 inline-flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5" /> متأخر
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {zonePerformance.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    لا توجد بيانات مسجلة للمناطق حالياً
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
