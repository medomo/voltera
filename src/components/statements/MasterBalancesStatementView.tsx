import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Subscriber, MeterReading, Payment, SystemSettings } from '../../types';
import { isItemForSubscriber } from '../../utils/balanceUtils';
import { safePrint } from '../../utils/exportUtils';
import { 
  FileSpreadsheet, Search, Printer, Download, Filter, Map, 
  ArrowUpDown, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw, 
  ExternalLink, Users, Wallet, TrendingUp, TrendingDown, Layers, ChevronLeft
} from 'lucide-react';

interface MasterBalancesStatementViewProps {
  subscribers: Subscriber[];
  readings: MeterReading[];
  payments: Payment[];
  settings: SystemSettings;
  onOpenIndividualStatement: (sub: Subscriber) => void;
}

export const MasterBalancesStatementView: React.FC<MasterBalancesStatementViewProps> = ({
  subscribers = [],
  readings = [],
  payments = [],
  settings,
  onOpenIndividualStatement
}) => {
  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [tariffFilter, setTariffFilter] = useState('all');
  const [balanceStatusFilter, setBalanceStatusFilter] = useState<'all' | 'debtors' | 'creditors' | 'settled' | 'overdue'>('all');
  const [sortBy, setSortBy] = useState<'balance_desc' | 'balance_asc' | 'name' | 'meter' | 'invoiced_desc'>('balance_desc');
  
  // Period filter
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Compute stats and aggregated balances for each subscriber
  const processedSubscribers = useMemo(() => {
    return subscribers.map(sub => {
      // Filter readings and payments for this subscriber
      const subReadings = readings.filter(r => !r.isRejected && isItemForSubscriber(r, sub));
      const subPayments = payments.filter(p => !p.isRejected && isItemForSubscriber(p, sub));

      const openingBal = Number(sub.openingBalance) || 0;

      let periodBilled = 0;
      let periodPaid = 0;
      let periodConsumption = 0;
      let periodOpening = openingBal;

      // If date range is specified
      if (fromDate || toDate) {
        subReadings.forEach(r => {
          const rDate = r.readingDate || (r.billingMonth ? `${r.billingMonth}-01` : '2026-01-01');
          if (fromDate && rDate < fromDate) {
            periodOpening += r.totalAmount;
          } else if (!toDate || rDate <= toDate) {
            periodBilled += r.totalAmount;
            periodConsumption += r.consumption;
          }
        });

        subPayments.forEach(p => {
          const pDate = p.paymentDate || '2026-01-01';
          if (fromDate && pDate < fromDate) {
            periodOpening -= p.amountPaid;
          } else if (!toDate || pDate <= toDate) {
            periodPaid += p.amountPaid;
          }
        });
      } else {
        periodBilled = subReadings.reduce((sum, r) => sum + r.totalAmount, 0);
        periodPaid = subPayments.reduce((sum, p) => sum + p.amountPaid, 0);
        periodConsumption = subReadings.reduce((sum, r) => sum + r.consumption, 0);
      }

      const netBalance = fromDate || toDate ? (periodOpening + periodBilled - periodPaid) : sub.currentBalance;

      return {
        ...sub,
        periodOpening,
        periodBilled,
        periodPaid,
        periodConsumption,
        netBalance,
        totalReadingsCount: subReadings.length,
        totalPaymentsCount: subPayments.length
      };
    });
  }, [subscribers, readings, payments, fromDate, toDate]);

  // Apply Search, Zone, Tariff, and Balance Status Filters
  const filteredAndSortedList = useMemo(() => {
    let result = processedSubscribers.filter(sub => {
      // Zone
      if (zoneFilter !== 'all' && sub.zone !== zoneFilter) return false;
      // Tariff
      if (tariffFilter !== 'all' && sub.tariffType !== tariffFilter) return false;
      // Status
      if (balanceStatusFilter === 'debtors' && sub.netBalance <= 0.01) return false;
      if (balanceStatusFilter === 'creditors' && sub.netBalance >= -0.01) return false;
      if (balanceStatusFilter === 'settled' && (sub.netBalance > 0.01 || sub.netBalance < -0.01)) return false;
      if (balanceStatusFilter === 'overdue' && sub.netBalance < 5000) return false; // Overdue threshold

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches = 
          sub.name.toLowerCase().includes(q) ||
          sub.meterNumber.toLowerCase().includes(q) ||
          (sub.phone && sub.phone.includes(q)) ||
          (sub.subscriberCode && sub.subscriberCode.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'balance_desc') return b.netBalance - a.netBalance;
      if (sortBy === 'balance_asc') return a.netBalance - b.netBalance;
      if (sortBy === 'invoiced_desc') return b.periodBilled - a.periodBilled;
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'ar');
      if (sortBy === 'meter') return a.meterNumber.localeCompare(b.meterNumber);
      return 0;
    });

    return result;
  }, [processedSubscribers, zoneFilter, tariffFilter, balanceStatusFilter, searchQuery, sortBy]);

  // Totals calculations
  const totals = useMemo(() => {
    const totalSubscribersCount = filteredAndSortedList.length;
    const totalOpeningSum = filteredAndSortedList.reduce((s, i) => s + i.periodOpening, 0);
    const totalBilledSum = filteredAndSortedList.reduce((s, i) => s + i.periodBilled, 0);
    const totalPaidSum = filteredAndSortedList.reduce((s, i) => s + i.periodPaid, 0);
    const totalNetBalanceSum = filteredAndSortedList.reduce((s, i) => s + i.netBalance, 0);
    const totalConsumptionKwh = filteredAndSortedList.reduce((s, i) => s + i.periodConsumption, 0);

    const debtorsCount = filteredAndSortedList.filter(s => s.netBalance > 0.01).length;
    const creditorsCount = filteredAndSortedList.filter(s => s.netBalance < -0.01).length;
    const settledCount = filteredAndSortedList.filter(s => s.netBalance >= -0.01 && s.netBalance <= 0.01).length;

    return {
      totalSubscribersCount,
      totalOpeningSum,
      totalBilledSum,
      totalPaidSum,
      totalNetBalanceSum,
      totalConsumptionKwh,
      debtorsCount,
      creditorsCount,
      settledCount
    };
  }, [filteredAndSortedList]);

  // Export to CSV
  const exportMasterToCSV = () => {
    const headers = ['رقم الحساب', 'اسم المشترك', 'رقم العداد', 'المنطقة', 'التعرفة', 'رقم الهاتف', 'رصيد سابق', 'إجمالي الفواتير', 'إجمالي المسدد', 'الرصيد النهائي', 'الحالة'];
    const rows = filteredAndSortedList.map(s => [
      s.subscriberCode || s.id,
      (s.name || '').replace(/,/g, ' - '),
      s.meterNumber,
      s.zone || 'الرئيسية',
      s.tariffType === 'residential' ? 'سكني' : s.tariffType === 'commercial' ? 'تجاري' : 'صناعي',
      s.phone || '',
      s.periodOpening,
      s.periodBilled,
      s.periodPaid,
      s.netBalance,
      s.netBalance > 0.01 ? 'مدين' : s.netBalance < -0.01 ? 'دائن' : 'مصفى'
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `كشف_ميزان_أرصدة_المشتركين_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-right">
      {/* 1. TOP STATS CARDS BANNER */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-slate-500">إجمالي المشتركين في الكشف</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <h4 className="text-2xl font-black font-mono text-slate-800">{totals.totalSubscribersCount}</h4>
          <div className="text-[10px] text-slate-500 mt-1 flex gap-2 font-bold">
            <span className="text-rose-600">مدين: {totals.debtorsCount}</span>
            <span className="text-emerald-600">دائن: {totals.creditorsCount}</span>
            <span className="text-slate-600">مصفى: {totals.settledCount}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 block mb-1">إجمالي أرصدة أول المدة</span>
          <h4 className="text-xl font-black font-mono text-slate-800">
            {totals.totalOpeningSum.toLocaleString()}
            <span className="text-xs font-sans text-slate-400 font-bold mr-1">{settings.currency}</span>
          </h4>
          <span className="text-[10px] text-slate-400 font-bold block mt-1">الرصيد المرحل التراكمي</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-rose-600">إجمالي الفواتير والمطالبات</span>
            <TrendingUp className="w-4 h-4 text-rose-500" />
          </div>
          <h4 className="text-xl font-black font-mono text-rose-700">
            {totals.totalBilledSum.toLocaleString()}
            <span className="text-xs font-sans text-slate-400 font-bold mr-1">{settings.currency}</span>
          </h4>
          <span className="text-[10px] text-slate-500 font-bold block mt-1">
            طاقة: <span className="font-mono text-amber-700 font-black">{totals.totalConsumptionKwh.toLocaleString()}</span> ك.و.س
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-emerald-600">إجمالي المقبوضات والتحصيل</span>
            <TrendingDown className="w-4 h-4 text-emerald-500" />
          </div>
          <h4 className="text-xl font-black font-mono text-emerald-700">
            {totals.totalPaidSum.toLocaleString()}
            <span className="text-xs font-sans text-slate-400 font-bold mr-1">{settings.currency}</span>
          </h4>
          <span className="text-[10px] text-slate-500 font-bold block mt-1">
            نسبة التحصيل: <span className="font-mono font-bold text-emerald-600">
              {totals.totalBilledSum > 0 ? Math.round((totals.totalPaidSum / totals.totalBilledSum) * 100) : 100}%
            </span>
          </span>
        </div>

        <div className={`p-4 rounded-2xl border shadow-sm ${
          totals.totalNetBalanceSum > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'
        }`}>
          <span className="text-[11px] font-black text-slate-700 block mb-1">صافي الرصيد الختامي المستحق</span>
          <h4 className={`text-2xl font-black font-mono ${
            totals.totalNetBalanceSum > 0 ? 'text-rose-700' : 'text-emerald-700'
          }`}>
            {totals.totalNetBalanceSum.toLocaleString()}
            <span className="text-xs font-sans text-slate-500 font-bold mr-1">{settings.currency}</span>
          </h4>
          <span className="text-[10px] font-bold text-slate-600 block mt-1">
            {totals.totalNetBalanceSum > 0 ? 'إجمالي مستحقات قائمة للمحطة' : 'أرصدة مسبقة الدفع'}
          </span>
        </div>
      </div>

      {/* 2. FILTER & SEARCH CONTROL BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              placeholder="بحث بالاسم، رقم العداد، الهاتف، أو الحساب..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pr-9 pl-4 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={exportMasterToCSV}
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>تصدير Excel (CSV)</span>
            </button>
            <button
              onClick={() => safePrint()}
              className="bg-slate-900 hover:bg-slate-800 text-amber-400 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة كشف الميزان A4</span>
            </button>
          </div>
        </div>

        {/* Dropdown Filters & Sorting */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs font-bold">
          <div className="flex flex-wrap items-center gap-2">
            {/* Zone Filter */}
            <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
              <span className="text-slate-500">المنطقة:</span>
              <select
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="all">كافة المناطق</option>
                {(settings.zones || []).map((z, i) => (
                  <option key={i} value={z}>{z}</option>
                ))}
              </select>
            </div>

            {/* Tariff Filter */}
            <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
              <span className="text-slate-500">التعرفة:</span>
              <select
                value={tariffFilter}
                onChange={(e) => setTariffFilter(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="all">كافة الفئات</option>
                <option value="residential">سكني</option>
                <option value="commercial">تجاري</option>
                <option value="industrial">صناعي</option>
                <option value="government">حكومي</option>
              </select>
            </div>

            {/* Balance Status Filter */}
            <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
              <span className="text-slate-500">حالة الرصيد:</span>
              <select
                value={balanceStatusFilter}
                onChange={(e: any) => setBalanceStatusFilter(e.target.value)}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="all">كافة الحسابات ({processedSubscribers.length})</option>
                <option value="debtors">حسابات مدينة / عليها مبالغ ({totals.debtorsCount})</option>
                <option value="creditors">حسابات دائنة / فائض ({totals.creditorsCount})</option>
                <option value="settled">حسابات مصفاة (صفر) ({totals.settledCount})</option>
                <option value="overdue">متأخرات عالية (+5,000)</option>
              </select>
            </div>

            {/* Date range */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              <span className="text-slate-500">فترة:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent font-mono text-[11px] outline-none"
              />
              <span className="text-slate-400">إلى</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent font-mono text-[11px] outline-none"
              />
            </div>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">ترتيب:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="balance_desc">الأعلى مديونية (تنازلي)</option>
              <option value="balance_asc">الأقل مديونية / الدائن (تصاعدي)</option>
              <option value="invoiced_desc">الأعلى استهلاكاً وفوترة</option>
              <option value="name">أبجدياً (اسم المشترك)</option>
              <option value="meter">رقم العداد</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. MASTER BALANCES LEDGER TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-amber-400" />
            <h4 className="font-black text-sm">كشف ميزان الأرصدة والمطابقة الشامل للمشتركين</h4>
          </div>
          <span className="text-xs text-amber-300 font-mono font-bold">
            عدد السجلات: {filteredAndSortedList.length} مشترك
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-100 text-slate-800 font-black border-b border-slate-200 text-[11px]">
              <tr>
                <th className="p-3 text-center w-12">م</th>
                <th className="p-3 text-right">المشترك والعداد</th>
                <th className="p-3 text-center w-28">المنطقة</th>
                <th className="p-3 text-center w-24">التعرفة</th>
                <th className="p-3 text-center w-28">رقم الهاتف</th>
                <th className="p-3 text-center w-28 text-slate-700">رصيد أول المدة</th>
                <th className="p-3 text-center w-28 text-rose-600">الفواتير (+)</th>
                <th className="p-3 text-center w-28 text-emerald-600">المسدد (-)</th>
                <th className="p-3 text-center w-32 text-slate-900">الرصيد المستحق</th>
                <th className="p-3 text-center w-24">الحالة</th>
                <th className="p-3 text-center w-24">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold text-slate-800 text-[11px]">
              {filteredAndSortedList.map((sub, index) => (
                <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-center font-mono text-slate-400">{index + 1}</td>
                  <td className="p-3">
                    <div className="font-black text-slate-900 text-xs">{sub.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      عداد: <span className="font-bold text-slate-800">{sub.meterNumber}</span>
                      {sub.subscriberCode && <span> | كود: {sub.subscriberCode}</span>}
                    </div>
                  </td>
                  <td className="p-3 text-center text-slate-700">{sub.zone || 'الرئيسية'}</td>
                  <td className="p-3 text-center">
                    <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[10px]">
                      {sub.tariffType === 'residential' ? 'سكني' : sub.tariffType === 'commercial' ? 'تجاري' : 'صناعي'}
                    </span>
                  </td>
                  <td className="p-3 text-center font-mono text-slate-700" dir="ltr">{sub.phone || '-'}</td>
                  <td className="p-3 text-center font-mono font-bold text-slate-700">
                    {sub.periodOpening.toLocaleString()}
                  </td>
                  <td className="p-3 text-center font-mono font-black text-rose-600">
                    {sub.periodBilled > 0 ? sub.periodBilled.toLocaleString() : '-'}
                  </td>
                  <td className="p-3 text-center font-mono font-black text-emerald-600">
                    {sub.periodPaid > 0 ? sub.periodPaid.toLocaleString() : '-'}
                  </td>
                  <td className="p-3 text-center font-mono font-black text-xs">
                    <span className={sub.netBalance > 0 ? 'text-rose-600' : sub.netBalance < 0 ? 'text-emerald-600' : 'text-slate-700'}>
                      {sub.netBalance.toLocaleString()} {settings.currency}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      sub.netBalance > 0.01 
                        ? 'bg-rose-100 text-rose-800' 
                        : sub.netBalance < -0.01 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-slate-100 text-slate-600'
                    }`}>
                      {sub.netBalance > 0.01 ? 'مدين' : sub.netBalance < -0.01 ? 'دائن' : 'مصفى'}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => onOpenIndividualStatement(sub)}
                      className="bg-amber-50 hover:bg-amber-100 text-amber-800 px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer mx-auto border border-amber-200"
                      title="فتح كشف الحساب الفردي التفصيلي"
                    >
                      <span>الكشف</span>
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredAndSortedList.length === 0 && (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-slate-400 font-bold">
                    لا توجد بيانات مطابقة لخيارات الفلترة والبحث المحددة
                  </td>
                </tr>
              )}
            </tbody>

            {/* Table Footer Totals */}
            <tfoot className="bg-slate-100 border-t-2 border-slate-900 font-black text-slate-900 text-xs">
              <tr>
                <td colSpan={5} className="p-3 text-left">
                  الإجمالي العام لكافة المشتركين المعروضين ({totals.totalSubscribersCount}):
                </td>
                <td className="p-3 text-center font-mono">
                  {totals.totalOpeningSum.toLocaleString()}
                </td>
                <td className="p-3 text-center font-mono text-rose-600 font-black">
                  {totals.totalBilledSum.toLocaleString()}
                </td>
                <td className="p-3 text-center font-mono text-emerald-600 font-black">
                  {totals.totalPaidSum.toLocaleString()}
                </td>
                <td className="p-3 text-center font-mono text-rose-600 font-black bg-slate-200">
                  {totals.totalNetBalanceSum.toLocaleString()} {settings.currency}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
