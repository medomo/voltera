import React, { useState, useMemo } from 'react';
import { 
  Calculator, Calendar, TrendingUp, TrendingDown, Percent, ShieldCheck, 
  DollarSign, CheckCircle2, FileText, Printer, Trash2, Eye, Award, Sparkles,
  AlertCircle, ChevronDown, Check, RefreshCw, Landmark, ArrowRight, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Partner, ProfitDistributionBatch, PartnerProfitShareItem, SystemSettings, 
  MeterReading, Payment, Expense, Purchase, User
} from '../../types';
import { safePrint } from '../../utils/exportUtils';

interface ProfitDistributionWizardTabProps {
  partners: Partner[];
  profitDistributions: ProfitDistributionBatch[];
  settings: SystemSettings;
  readings: MeterReading[];
  payments: Payment[];
  expenses: Expense[];
  purchases: Purchase[];
  currentUser: User;
  onExecuteDistribution: (batch: ProfitDistributionBatch) => Promise<void>;
  onDeleteBatch: (batchId: string) => Promise<void>;
}

export const ProfitDistributionWizardTab: React.FC<ProfitDistributionWizardTabProps> = ({
  partners,
  profitDistributions,
  settings,
  readings,
  payments,
  expenses,
  purchases,
  currentUser,
  onExecuteDistribution,
  onDeleteBatch
}) => {
  const currency = settings.currency || 'ر.ي';

  // Date range state
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [periodType, setPeriodType] = useState<'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'custom'>('quarterly');
  const [periodLabel, setPeriodLabel] = useState<string>(`الربع الأول ${currentYear}`);
  const [startDate, setStartDate] = useState<string>(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState<string>(`${currentYear}-03-31`);

  // Revenue Source Mode
  const [revenueMode, setRevenueMode] = useState<'collected' | 'billed' | 'manual'>('collected');
  const [manualRevenueOverride, setManualRevenueOverride] = useState<number>(0);
  const [manualExpenseOverride, setManualExpenseOverride] = useState<number>(0);

  // Reserves % and amounts
  const [legalReservePercent, setLegalReservePercent] = useState<number>(10);
  const [emergencyReservePercent, setEmergencyReservePercent] = useState<number>(5);
  const [maintenanceReservePercent, setMaintenanceReservePercent] = useState<number>(5);
  const [fuelFluctuationReservePercent, setFuelFluctuationReservePercent] = useState<number>(0);
  const [retainedEarningsAmount, setRetainedEarningsAmount] = useState<number>(0);

  // Payout Choice
  const [payoutChoice, setPayoutChoice] = useState<'credited_to_account' | 'paid_in_cash' | 'reinvested'>('credited_to_account');
  const [distributionNotes, setDistributionNotes] = useState<string>('');

  // Partner Bonuses Override state
  const [partnerBonuses, setPartnerBonuses] = useState<Record<string, number>>({});

  // Active viewing batch modal
  const [viewingBatch, setViewingBatch] = useState<ProfitDistributionBatch | null>(null);

  // Quick Period Helpers
  const setQuickPeriod = (type: 'current_month' | 'last_month' | 'q1' | 'q2' | 'q3' | 'q4' | 'h1' | 'h2' | 'full_year') => {
    const y = currentYear;
    switch (type) {
      case 'current_month':
        setPeriodType('monthly');
        const mStr = String(currentMonth).padStart(2, '0');
        const lastDay = new Date(y, currentMonth, 0).getDate();
        setStartDate(`${y}-${mStr}-01`);
        setEndDate(`${y}-${mStr}-${lastDay}`);
        setPeriodLabel(`شهر ${mStr}/${y}`);
        break;
      case 'last_month':
        setPeriodType('monthly');
        const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const prevYear = currentMonth === 1 ? y - 1 : y;
        const pmStr = String(prevMonth).padStart(2, '0');
        const pLastDay = new Date(prevYear, prevMonth, 0).getDate();
        setStartDate(`${prevYear}-${pmStr}-01`);
        setEndDate(`${prevYear}-${pmStr}-${pLastDay}`);
        setPeriodLabel(`شهر ${pmStr}/${prevYear}`);
        break;
      case 'q1':
        setPeriodType('quarterly');
        setStartDate(`${y}-01-01`);
        setEndDate(`${y}-03-31`);
        setPeriodLabel(`الربع الأول (Q1) ${y}`);
        break;
      case 'q2':
        setPeriodType('quarterly');
        setStartDate(`${y}-04-01`);
        setEndDate(`${y}-06-30`);
        setPeriodLabel(`الربع الثاني (Q2) ${y}`);
        break;
      case 'q3':
        setPeriodType('quarterly');
        setStartDate(`${y}-07-01`);
        setEndDate(`${y}-09-30`);
        setPeriodLabel(`الربع الثالث (Q3) ${y}`);
        break;
      case 'q4':
        setPeriodType('quarterly');
        setStartDate(`${y}-10-01`);
        setEndDate(`${y}-12-31`);
        setPeriodLabel(`الربع الرابع (Q4) ${y}`);
        break;
      case 'h1':
        setPeriodType('semi_annual');
        setStartDate(`${y}-01-01`);
        setEndDate(`${y}-06-30`);
        setPeriodLabel(`النصف الأول ${y}`);
        break;
      case 'h2':
        setPeriodType('semi_annual');
        setStartDate(`${y}-07-01`);
        setEndDate(`${y}-12-31`);
        setPeriodLabel(`النصف الثاني ${y}`);
        break;
      case 'full_year':
        setPeriodType('annual');
        setStartDate(`${y}-01-01`);
        setEndDate(`${y}-12-31`);
        setPeriodLabel(`السنة المالية ${y}`);
        break;
    }
  };

  // Accounting calculations based on date filters
  const periodFinancials = useMemo(() => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime() + (24 * 60 * 60 * 1000 - 1);

    // Filter Payments (Collected Cash)
    const periodPayments = payments.filter(p => {
      const t = new Date(p.date).getTime();
      return t >= start && t <= end;
    });
    const collectedRevenue = periodPayments.reduce((s, p) => s + (p.amount || 0), 0);

    // Filter Readings (Billed Revenue)
    const periodReadings = readings.filter(r => {
      const t = new Date(r.date).getTime();
      return t >= start && t <= end;
    });
    const billedRevenue = periodReadings.reduce((s, r) => s + (r.totalAmount || 0), 0);

    // Determine Total Revenue based on mode
    let totalRevenue = collectedRevenue;
    if (revenueMode === 'billed') totalRevenue = billedRevenue;
    if (revenueMode === 'manual') totalRevenue = manualRevenueOverride;

    // Filter Expenses
    const periodExpenses = expenses.filter(e => {
      const t = new Date(e.date).getTime();
      return t >= start && t <= end;
    });
    const totalExp = periodExpenses.reduce((s, e) => s + (e.amount || 0), 0);

    // Filter Purchases (Fuel, Oil, Spare Parts)
    const periodPurchases = purchases.filter(p => {
      const t = new Date(p.date).getTime();
      return t >= start && t <= end;
    });
    const totalPurch = periodPurchases.reduce((s, p) => s + (p.totalAmount || 0), 0);

    // Breakdown
    const fuelPurch = periodPurchases
      .filter(p => (p.category && (p.category.includes('ديزل') || p.category.includes('وقود') || p.category.includes('زيوت'))))
      .reduce((s, p) => s + (p.totalAmount || 0), 0);

    let totalExpenses = totalExp + totalPurch;
    if (manualExpenseOverride > 0) totalExpenses = manualExpenseOverride;

    const grossProfit = Math.max(0, totalRevenue - totalExpenses);

    // Reserves calculations
    const legalReserve = (grossProfit * legalReservePercent) / 100;
    const emergencyReserve = (grossProfit * emergencyReservePercent) / 100;
    const maintenanceReserve = (grossProfit * maintenanceReservePercent) / 100;
    const fuelReserve = (grossProfit * fuelFluctuationReservePercent) / 100;
    const totalDeductions = legalReserve + emergencyReserve + maintenanceReserve + fuelReserve + retainedEarningsAmount;

    const netDistributable = Math.max(0, grossProfit - totalDeductions);

    // Partner shares calculation
    const activePartners = partners.filter(p => p.status === 'active');
    const partnerShares: PartnerProfitShareItem[] = activePartners.map(partner => {
      const calculatedProfit = Math.round((netDistributable * partner.sharePercentage) / 100);
      const bonus = partnerBonuses[partner.id] || 0;
      return {
        partnerId: partner.id,
        partnerName: partner.name,
        sharePercentage: partner.sharePercentage,
        calculatedProfit,
        managementBonus: bonus,
        totalShare: calculatedProfit + bonus,
        payoutStatus: payoutChoice,
        paidDate: new Date().toISOString().split('T')[0]
      };
    });

    return {
      collectedRevenue,
      billedRevenue,
      totalRevenue,
      operationalExpenses: totalExp,
      purchasesExpenses: totalPurch,
      fuelExpenses: fuelPurch,
      totalExpenses,
      grossProfit,
      legalReserve,
      emergencyReserve,
      maintenanceReserve,
      fuelReserve,
      totalDeductions,
      netDistributable,
      partnerShares
    };
  }, [
    startDate, endDate, revenueMode, manualRevenueOverride, manualExpenseOverride,
    payments, readings, expenses, purchases, legalReservePercent, emergencyReservePercent,
    maintenanceReservePercent, fuelFluctuationReservePercent, retainedEarningsAmount,
    partners, partnerBonuses, payoutChoice
  ]);

  const handleExecute = async () => {
    if (periodFinancials.netDistributable <= 0) {
      if (!window.confirm('صافي الربح القابل للتوزيع يساوي صفراً أو أقل. هل تريد المتابعة وترحيل المحضر؟')) {
        return;
      }
    }

    const batchNumber = `DIST-${new Date().getFullYear()}-${String(profitDistributions.length + 1).padStart(2, '0')}`;
    
    const newBatch: ProfitDistributionBatch = {
      id: 'dist_' + Date.now(),
      batchNumber,
      periodType,
      periodLabel: periodLabel || `توزيع ${startDate} إلى ${endDate}`,
      startDate,
      endDate,
      totalRevenue: periodFinancials.totalRevenue,
      billedRevenue: periodFinancials.billedRevenue,
      collectedRevenue: periodFinancials.collectedRevenue,
      totalExpenses: periodFinancials.totalExpenses,
      operationalExpenses: periodFinancials.operationalExpenses,
      purchasesExpenses: periodFinancials.purchasesExpenses,
      fuelExpenses: periodFinancials.fuelExpenses,
      grossProfit: periodFinancials.grossProfit,
      legalReservePercent,
      legalReserveAmount: periodFinancials.legalReserve,
      emergencyReservePercent,
      emergencyReserveAmount: periodFinancials.emergencyReserve,
      maintenanceReservePercent,
      maintenanceReserveAmount: periodFinancials.maintenanceReserve,
      fuelFluctuationReservePercent,
      fuelFluctuationReserveAmount: periodFinancials.fuelReserve,
      retainedEarningsAmount,
      totalDeductions: periodFinancials.totalDeductions,
      netDistributableProfit: periodFinancials.netDistributable,
      partnerShares: periodFinancials.partnerShares,
      payoutChoice,
      status: 'executed',
      approvedBy: currentUser.name,
      approvedDate: new Date().toISOString().split('T')[0],
      notes: distributionNotes,
      createdAt: new Date().toISOString()
    };

    await onExecuteDistribution(newBatch);
  };

  return (
    <div className="space-y-6">
      {/* Main Wizard Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">معالج احتساب وتوزيع الأرباح والاحتياطيات الذكي</h2>
              <p className="text-xs text-slate-400">
                استيراد تلقائي للمؤشرات المالية للفترة المحددة وتوزيع صافي العائد بدقة حسب نسب الشركاء
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">طريقة احتساب الإيراد:</span>
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex text-xs">
              <button
                onClick={() => setRevenueMode('collected')}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  revenueMode === 'collected' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                التحصيل الفعلي (كاش)
              </button>
              <button
                onClick={() => setRevenueMode('billed')}
                className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                  revenueMode === 'billed' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                إجمالي المفوتر (استحقاق)
              </button>
            </div>
          </div>
        </div>

        {/* Quick Period Buttons */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 block">اختر الفترة المالية المعتمدة:</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setQuickPeriod('current_month')}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
            >
              هذا الشهر
            </button>
            <button
              onClick={() => setQuickPeriod('last_month')}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
            >
              الشهر السابق
            </button>
            <button
              onClick={() => setQuickPeriod('q1')}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
            >
              الربع الأول (Q1)
            </button>
            <button
              onClick={() => setQuickPeriod('q2')}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
            >
              الربع الثاني (Q2)
            </button>
            <button
              onClick={() => setQuickPeriod('q3')}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
            >
              الربع الثالث (Q3)
            </button>
            <button
              onClick={() => setQuickPeriod('q4')}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
            >
              الربع الرابع (Q4)
            </button>
            <button
              onClick={() => setQuickPeriod('h1')}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
            >
              النصف الأول (H1)
            </button>
            <button
              onClick={() => setQuickPeriod('full_year')}
              className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
            >
              السنة المالية كاملة
            </button>
          </div>
        </div>

        {/* Date Inputs & Label */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div>
            <label className="text-xs text-slate-400 block mb-1">مسمى ومحضر الفترة</label>
            <input
              type="text"
              value={periodLabel}
              onChange={e => setPeriodLabel(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-semibold"
              placeholder="مثلاً: الربع الأول 2026"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">من تاريخ</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>
        </div>

        {/* Financial Flow Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 space-y-1">
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              إجمالي الإيرادات للفترة
            </span>
            <div className="text-xl font-black text-white font-mono">
              {periodFinancials.totalRevenue.toLocaleString()} <span className="text-xs font-sans text-slate-400">{currency}</span>
            </div>
            <div className="text-[10px] text-slate-400">
              المحصل: {periodFinancials.collectedRevenue.toLocaleString()} | المفوتر: {periodFinancials.billedRevenue.toLocaleString()}
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-rose-500/30 space-y-1">
            <span className="text-xs text-rose-400 font-semibold flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" />
              المصروفات والتشغيل والوقود
            </span>
            <div className="text-xl font-black text-rose-400 font-mono">
              {periodFinancials.totalExpenses.toLocaleString()} <span className="text-xs font-sans text-slate-400">{currency}</span>
            </div>
            <div className="text-[10px] text-slate-400">
              المصروفات: {periodFinancials.operationalExpenses.toLocaleString()} | الوقود: {periodFinancials.fuelExpenses.toLocaleString()}
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-blue-500/30 space-y-1">
            <span className="text-xs text-blue-400 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              مجمل الربح التشغيلي
            </span>
            <div className="text-xl font-black text-blue-300 font-mono">
              {periodFinancials.grossProfit.toLocaleString()} <span className="text-xs font-sans text-slate-400">{currency}</span>
            </div>
            <div className="text-[10px] text-slate-400">
              هامش الربح: {periodFinancials.totalRevenue > 0 ? ((periodFinancials.grossProfit / periodFinancials.totalRevenue) * 100).toFixed(1) : 0}%
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/40 bg-amber-500/5 space-y-1">
            <span className="text-xs text-amber-400 font-semibold flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              صافي القابل للتوزيع للشركاء
            </span>
            <div className="text-xl font-black text-amber-400 font-mono">
              {periodFinancials.netDistributable.toLocaleString()} <span className="text-xs font-sans text-slate-400">{currency}</span>
            </div>
            <div className="text-[10px] text-amber-400/80">
              بعد استقطاع الاحتياطيات ({periodFinancials.totalDeductions.toLocaleString()})
            </div>
          </div>
        </div>

        {/* Reserves & Deductions Controls */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white">الاحتياطيات والاستقطاعات النظامية المخصومة من الأرباح</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
              <label className="text-slate-300 block">الاحتياطي النظامي (%)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={legalReservePercent}
                  onChange={e => setLegalReservePercent(Number(e.target.value))}
                  className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                />
                <span className="text-emerald-400 font-mono font-bold text-[11px]">
                  {periodFinancials.legalReserve.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
              <label className="text-slate-300 block">احتياطي الطوارئ (%)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={emergencyReservePercent}
                  onChange={e => setEmergencyReservePercent(Number(e.target.value))}
                  className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                />
                <span className="text-emerald-400 font-mono font-bold text-[11px]">
                  {periodFinancials.emergencyReserve.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
              <label className="text-slate-300 block">احتياطي إهلاك المولدات (%)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={maintenanceReservePercent}
                  onChange={e => setMaintenanceReservePercent(Number(e.target.value))}
                  className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                />
                <span className="text-emerald-400 font-mono font-bold text-[11px]">
                  {periodFinancials.maintenanceReserve.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
              <label className="text-slate-300 block">مخاطر تقلبات الوقود (%)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={fuelFluctuationReservePercent}
                  onChange={e => setFuelFluctuationReservePercent(Number(e.target.value))}
                  className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                />
                <span className="text-emerald-400 font-mono font-bold text-[11px]">
                  {periodFinancials.fuelReserve.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
              <label className="text-slate-300 block">أرباح مبقاة ومرحلة ({currency})</label>
              <input
                type="number"
                min="0"
                value={retainedEarningsAmount}
                onChange={e => setRetainedEarningsAmount(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-amber-400 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Real-time Partner Shares Simulation Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white">جدول محاكاة حصص الشركاء ومكافآت الإدارة:</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">وجهة الترحيل:</span>
              <select
                value={payoutChoice}
                onChange={e => setPayoutChoice(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-amber-400 font-bold focus:outline-none"
              >
                <option value="credited_to_account">قيد في الحساب الجاري للشريك</option>
                <option value="paid_in_cash">صرف نقدي / بنكي مباشر</option>
                <option value="reinvested">رسملة وزيادة رأس المال التراكمي</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">الشريك</th>
                  <th className="p-3">نسبة الحصة</th>
                  <th className="p-3">الربح المحسوب ({currency})</th>
                  <th className="p-3">مكافأة الإدارة / الجهد</th>
                  <th className="p-3">إجمالي المستحق ({currency})</th>
                  <th className="p-3">طريقة المعالجة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {periodFinancials.partnerShares.map(item => (
                  <tr key={item.partnerId} className="hover:bg-slate-900/40">
                    <td className="p-3 font-sans font-semibold text-white">{item.partnerName}</td>
                    <td className="p-3 text-amber-400 font-bold">{item.sharePercentage}%</td>
                    <td className="p-3 text-slate-200">{item.calculatedProfit.toLocaleString()}</td>
                    <td className="p-3">
                      <input
                        type="number"
                        min="0"
                        value={partnerBonuses[item.partnerId] || 0}
                        onChange={e => setPartnerBonuses({ ...partnerBonuses, [item.partnerId]: Number(e.target.value) })}
                        className="w-24 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-emerald-400 font-mono"
                        placeholder="0"
                      />
                    </td>
                    <td className="p-3 text-emerald-400 font-bold text-sm">
                      {item.totalShare.toLocaleString()}
                    </td>
                    <td className="p-3 font-sans text-[11px] text-slate-400">
                      {payoutChoice === 'credited_to_account' && 'قيد في الحساب الجاري'}
                      {payoutChoice === 'paid_in_cash' && 'صرف نقدي مباشر'}
                      {payoutChoice === 'reinvested' && 'إعادة استثمار ورسملة'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Button & Notes */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <input
            type="text"
            value={distributionNotes}
            onChange={e => setDistributionNotes(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            placeholder="ملاحظات المحضر أو أرقام القرارات الإدارية..."
          />

          <button
            onClick={handleExecute}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>اعتماد وترحيل محضر التوزيع المالي</span>
          </button>
        </div>
      </div>

      {/* Past Profit Distributions History List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">سجل محاضر توزيع الأرباح والقرارات المعتمدة</h3>
          </div>
          <span className="text-xs text-slate-400">إجمالي المحاضر: {profitDistributions.length}</span>
        </div>

        {profitDistributions.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            لم يتم إنشاء أو ترحيل أي محاضر لتوزيع الأرباح حتى الآن.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">رقم المحضر</th>
                  <th className="p-3">الفترة المالية</th>
                  <th className="p-3">إجمالي الإيراد</th>
                  <th className="p-3">المصروفات</th>
                  <th className="p-3">صافي الموزع للشركاء</th>
                  <th className="p-3">تاريخ الاعتماد</th>
                  <th className="p-3">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {profitDistributions.map(batch => (
                  <tr key={batch.id} className="hover:bg-slate-900/40">
                    <td className="p-3 font-bold text-amber-400">{batch.batchNumber}</td>
                    <td className="p-3 font-sans font-medium text-white">{batch.periodLabel}</td>
                    <td className="p-3 text-slate-300">{(batch.totalRevenue || 0).toLocaleString()}</td>
                    <td className="p-3 text-rose-400">{(batch.totalExpenses || 0).toLocaleString()}</td>
                    <td className="p-3 text-emerald-400 font-bold">{(batch.netDistributableProfit || 0).toLocaleString()} {currency}</td>
                    <td className="p-3 text-slate-400 text-[11px]">{batch.approvedDate || batch.createdAt?.split('T')[0]}</td>
                    <td className="p-3 font-sans">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setViewingBatch(batch)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg cursor-pointer"
                          title="عرض وطباعة المحضر الرسمي"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`هل أنت متأكد من حذف محضر التوزيع ${batch.batchNumber}؟`)) {
                              onDeleteBatch(batch.id);
                            }
                          }}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded-lg cursor-pointer"
                          title="حذف المحضر"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Official Batch Print Modal */}
      {viewingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">محضر اجتماع وتوزيع الأرباح الرسمي ({viewingBatch.batchNumber})</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => safePrint('batch-resolution-print')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl cursor-pointer hover:bg-amber-400"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة المحضر</span>
                </button>
                <button onClick={() => setViewingBatch(null)} className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer">
                  <Eye className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div id="batch-resolution-print" className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-4 text-xs">
              {/* Header */}
              <div className="text-center border-b border-slate-800 pb-3 space-y-1">
                <h2 className="text-lg font-black text-white">{settings.stationName || 'شركة المحطة الكهربائية'}</h2>
                <p className="text-xs text-amber-400 font-bold">محضر اجتماع مجلس الشركاء لاعتماد الحسابات وتوزيع الأرباح - {viewingBatch.periodLabel}</p>
                <span className="text-[10px] text-slate-400 font-mono">رقم المحضر: {viewingBatch.batchNumber} | تاريخ الاعتماد: {viewingBatch.approvedDate}</span>
              </div>

              {/* Financial Statement in Resolution */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-900 p-3 rounded-lg border border-slate-800 text-center font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 font-sans block">إجمالي الإيرادات</span>
                  <strong className="text-white">{(viewingBatch.totalRevenue || 0).toLocaleString()}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-sans block">إجمالي المصروفات</span>
                  <strong className="text-rose-400">{(viewingBatch.totalExpenses || 0).toLocaleString()}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-sans block">الاحتياطيات المقتطعة</span>
                  <strong className="text-blue-400">{(viewingBatch.totalDeductions || 0).toLocaleString()}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-sans block">صافي الربح الموزع</span>
                  <strong className="text-emerald-400 font-bold">{(viewingBatch.netDistributableProfit || 0).toLocaleString()} {currency}</strong>
                </div>
              </div>

              {/* Partner Shares Table */}
              <table className="w-full text-right border border-slate-800 rounded-lg overflow-hidden">
                <thead className="bg-slate-900 text-slate-300">
                  <tr>
                    <th className="p-2">الشريك</th>
                    <th className="p-2">النسبة</th>
                    <th className="p-2">الحصة الأساسية</th>
                    <th className="p-2">المكافأة</th>
                    <th className="p-2">صافي المستحق</th>
                    <th className="p-2">توقيع الاستلام</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {viewingBatch.partnerShares.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-sans font-semibold text-white">{item.partnerName}</td>
                      <td className="p-2 text-amber-400">{item.sharePercentage}%</td>
                      <td className="p-2 text-slate-300">{item.calculatedProfit.toLocaleString()}</td>
                      <td className="p-2 text-slate-300">{item.managementBonus.toLocaleString()}</td>
                      <td className="p-2 text-emerald-400 font-bold">{item.totalShare.toLocaleString()} {currency}</td>
                      <td className="p-2 font-sans text-slate-500">_________________</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signatures */}
              <div className="pt-6 border-t border-slate-800 grid grid-cols-3 gap-4 text-center text-slate-400">
                <div>
                  <span className="block font-bold mb-4 text-slate-300">المحاسب المالي</span>
                  <div className="border-t border-dashed border-slate-700 pt-1">التوقيع</div>
                </div>
                <div>
                  <span className="block font-bold mb-4 text-slate-300">المراجع الداخلي</span>
                  <div className="border-t border-dashed border-slate-700 pt-1">التوقيع</div>
                </div>
                <div>
                  <span className="block font-bold mb-4 text-slate-300">المدير العام والختم</span>
                  <div className="border-t border-dashed border-slate-700 pt-1">التوقيع والاعتماد</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
