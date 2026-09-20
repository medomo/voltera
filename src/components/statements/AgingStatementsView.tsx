import React, { useState, useMemo } from 'react';
import { Subscriber, MeterReading, Payment, SystemSettings } from '../../types';
import { isItemForSubscriber } from '../../utils/balanceUtils';
import { safePrint } from '../../utils/exportUtils';
import { 
  Clock, Search, Printer, Download, AlertTriangle, AlertCircle, 
  CheckCircle2, ChevronLeft, ShieldAlert, Zap, Filter, Users
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell
} from 'recharts';

interface AgingStatementsViewProps {
  subscribers: Subscriber[];
  readings: MeterReading[];
  payments: Payment[];
  settings: SystemSettings;
  onOpenIndividualStatement: (sub: Subscriber) => void;
}

export const AgingStatementsView: React.FC<AgingStatementsViewProps> = ({
  subscribers = [],
  readings = [],
  payments = [],
  settings,
  onOpenIndividualStatement
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'current'>('all');

  // Compute Aging Buckets for each indebted subscriber
  const agingData = useMemo(() => {
    const today = new Date();

    const debtorSubs = subscribers.filter(s => s.currentBalance > 0.01);

    return debtorSubs.map(sub => {
      const subReadings = readings
        .filter(r => !r.isRejected && isItemForSubscriber(r, sub))
        .sort((a, b) => (b.readingDate || b.billingMonth).localeCompare(a.readingDate || a.billingMonth));
      
      const subPayments = payments
        .filter(p => !p.isRejected && isItemForSubscriber(p, sub))
        .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));

      const lastReading = subReadings[0];
      const lastPayment = subPayments[0];

      // Calculate days since last payment or last reading
      const lastActionDateStr = lastPayment?.paymentDate || lastReading?.readingDate || '2026-01-01';
      const lastActionDate = new Date(lastActionDateStr);
      const diffTime = Math.abs(today.getTime() - lastActionDate.getTime());
      const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const balance = sub.currentBalance;

      // Classify into brackets
      let bracket: '0_30' | '31_60' | '61_90' | '91_180' | '180_plus' = '0_30';
      let riskLevel: 'current' | 'medium' | 'high' | 'critical' = 'current';

      if (daysOverdue > 180 || balance > 50000) {
        bracket = '180_plus';
        riskLevel = 'critical';
      } else if (daysOverdue > 90 || balance > 25000) {
        bracket = '91_180';
        riskLevel = 'high';
      } else if (daysOverdue > 60 || balance > 10000) {
        bracket = '61_90';
        riskLevel = 'medium';
      } else if (daysOverdue > 30) {
        bracket = '31_60';
        riskLevel = 'medium';
      } else {
        bracket = '0_30';
        riskLevel = 'current';
      }

      return {
        ...sub,
        daysOverdue,
        lastActionDate: lastActionDateStr,
        bracket,
        riskLevel,
        lastPaymentAmount: lastPayment?.amountPaid || 0,
        lastPaymentDate: lastPayment?.paymentDate || 'لا يوجد سداد سابق'
      };
    });
  }, [subscribers, readings, payments]);

  // Filtered List
  const filteredList = useMemo(() => {
    return agingData.filter(sub => {
      if (zoneFilter !== 'all' && sub.zone !== zoneFilter) return false;
      if (riskFilter !== 'all' && sub.riskLevel !== riskFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match = 
          sub.name.toLowerCase().includes(q) ||
          sub.meterNumber.toLowerCase().includes(q) ||
          (sub.phone && sub.phone.includes(q));
        if (!match) return false;
      }
      return true;
    }).sort((a, b) => b.currentBalance - a.currentBalance);
  }, [agingData, zoneFilter, riskFilter, searchQuery]);

  // Summary by Buckets
  const bucketTotals = useMemo(() => {
    const b0_30 = agingData.filter(s => s.bracket === '0_30');
    const b31_60 = agingData.filter(s => s.bracket === '31_60');
    const b61_90 = agingData.filter(s => s.bracket === '61_90');
    const b91_180 = agingData.filter(s => s.bracket === '91_180');
    const b180_plus = agingData.filter(s => s.bracket === '180_plus');

    return {
      b0_30: { count: b0_30.length, amount: b0_30.reduce((s, i) => s + i.currentBalance, 0) },
      b31_60: { count: b31_60.length, amount: b31_60.reduce((s, i) => s + i.currentBalance, 0) },
      b61_90: { count: b61_90.length, amount: b61_90.reduce((s, i) => s + i.currentBalance, 0) },
      b91_180: { count: b91_180.length, amount: b91_180.reduce((s, i) => s + i.currentBalance, 0) },
      b180_plus: { count: b180_plus.length, amount: b180_plus.reduce((s, i) => s + i.currentBalance, 0) },
      totalOverdueDebt: agingData.reduce((s, i) => s + i.currentBalance, 0),
      criticalCount: agingData.filter(s => s.riskLevel === 'critical').length
    };
  }, [agingData]);

  // Chart Data
  const chartData = useMemo(() => [
    { name: '1-30 يوم (حالي)', amount: bucketTotals.b0_30.amount, count: bucketTotals.b0_30.count, color: '#10b981' },
    { name: '31-60 يوم', amount: bucketTotals.b31_60.amount, count: bucketTotals.b31_60.count, color: '#f59e0b' },
    { name: '61-90 يوم', amount: bucketTotals.b61_90.amount, count: bucketTotals.b61_90.count, color: '#f97316' },
    { name: '91-180 يوم', amount: bucketTotals.b91_180.amount, count: bucketTotals.b91_180.count, color: '#ef4444' },
    { name: '+180 يوم (حرج)', amount: bucketTotals.b180_plus.amount, count: bucketTotals.b180_plus.count, color: '#991b1b' },
  ], [bucketTotals]);

  // Export CSV
  const exportAgingToCSV = () => {
    const headers = ['رقم الحساب', 'اسم المشترك', 'رقم العداد', 'المنطقة', 'الهاتف', 'إجمالي المديونية', 'أيام التأخر التقريبية', 'شريحة العمر', 'درجة المخاطرة', 'آخر سداد'];
    const rows = filteredList.map(s => [
      s.subscriberCode || s.id,
      (s.name || '').replace(/,/g, ' - '),
      s.meterNumber,
      s.zone || 'الرئيسية',
      s.phone || '',
      s.currentBalance,
      s.daysOverdue,
      s.bracket,
      s.riskLevel === 'critical' ? 'حرج جداً' : s.riskLevel === 'high' ? 'عالي' : s.riskLevel === 'medium' ? 'متوسط' : 'عادي',
      s.lastPaymentDate
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `تحليل_أعمار_الديون_والمستحقات_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-right">
      {/* 1. AGING BUCKETS METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Bucket 1: 0-30 Days */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-emerald-700">1 إلى 30 يوم (حالي)</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <h4 className="text-xl font-black font-mono text-slate-800">
            {bucketTotals.b0_30.amount.toLocaleString()}
            <span className="text-xs font-sans text-slate-400 font-bold mr-1">{settings.currency}</span>
          </h4>
          <span className="text-[10px] text-slate-500 font-bold block mt-1">{bucketTotals.b0_30.count} مشترك</span>
        </div>

        {/* Bucket 2: 31-60 Days */}
        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-amber-700">31 إلى 60 يوم</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <h4 className="text-xl font-black font-mono text-slate-800">
            {bucketTotals.b31_60.amount.toLocaleString()}
            <span className="text-xs font-sans text-slate-400 font-bold mr-1">{settings.currency}</span>
          </h4>
          <span className="text-[10px] text-slate-500 font-bold block mt-1">{bucketTotals.b31_60.count} مشترك</span>
        </div>

        {/* Bucket 3: 61-90 Days */}
        <div className="bg-white p-4 rounded-2xl border border-orange-200 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-orange-700">61 إلى 90 يوم</span>
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
          </div>
          <h4 className="text-xl font-black font-mono text-slate-800">
            {bucketTotals.b61_90.amount.toLocaleString()}
            <span className="text-xs font-sans text-slate-400 font-bold mr-1">{settings.currency}</span>
          </h4>
          <span className="text-[10px] text-slate-500 font-bold block mt-1">{bucketTotals.b61_90.count} مشترك</span>
        </div>

        {/* Bucket 4: 91-180 Days */}
        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-rose-700">91 إلى 180 يوم</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          </div>
          <h4 className="text-xl font-black font-mono text-slate-800">
            {bucketTotals.b91_180.amount.toLocaleString()}
            <span className="text-xs font-sans text-slate-400 font-bold mr-1">{settings.currency}</span>
          </h4>
          <span className="text-[10px] text-slate-500 font-bold block mt-1">{bucketTotals.b91_180.count} مشترك</span>
        </div>

        {/* Bucket 5: 180+ Days (Critical) */}
        <div className="bg-rose-50 p-4 rounded-2xl border border-rose-300 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-black text-rose-900 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              <span>أكثر من 180 يوم (حرج)</span>
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-700 animate-ping" />
          </div>
          <h4 className="text-xl font-black font-mono text-rose-800">
            {bucketTotals.b180_plus.amount.toLocaleString()}
            <span className="text-xs font-sans text-slate-500 font-bold mr-1">{settings.currency}</span>
          </h4>
          <span className="text-[10px] text-rose-700 font-bold block mt-1">{bucketTotals.b180_plus.count} مشترك متأخر جداً</span>
        </div>
      </div>

      {/* 2. AGING CHART & FILTER BAR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>توزيع حجم المديونيات حسب الشرائح الزمنية (Aging Distribution):</span>
            </h4>
            <span className="text-xs font-mono font-black text-rose-600">
              إجمالي الديون القائمة: {bucketTotals.totalOverdueDebt.toLocaleString()} {settings.currency}
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: any) => [`${Number(value).toLocaleString()} ${settings.currency}`, 'المبلغ']} />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Filter controls panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-black text-slate-800 mb-3 flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-amber-500" />
              <span>تصفية ديون المشتركين والمتابعة</span>
            </h4>

            <div className="space-y-3 text-xs font-bold">
              <div>
                <label className="block text-slate-600 mb-1">المنطقة / المربع:</label>
                <select
                  value={zoneFilter}
                  onChange={(e) => setZoneFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-800 focus:outline-none"
                >
                  <option value="all">كافة المناطق</option>
                  {(settings.zones || []).map((z, i) => (
                    <option key={i} value={z}>{z}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">مستوى الخطورة / الشريحة:</label>
                <select
                  value={riskFilter}
                  onChange={(e: any) => setRiskFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-800 focus:outline-none"
                >
                  <option value="all">كافة المشتركين المدينين ({agingData.length})</option>
                  <option value="critical">حرج جداً (+180 يوم) ({bucketTotals.b180_plus.count})</option>
                  <option value="high">مخاطر عالية (91-180 يوم) ({bucketTotals.b91_180.count})</option>
                  <option value="medium">متأخرات متوسطة (31-90 يوم) ({bucketTotals.b31_60.count + bucketTotals.b61_90.count})</option>
                  <option value="current">ديون حالية (1-30 يوم) ({bucketTotals.b0_30.count})</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">بحث سريع:</label>
                <input
                  type="text"
                  placeholder="اسم، عداد، هاتف..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-800 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={exportAgingToCSV}
              className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>تصدير Excel</span>
            </button>
            <button
              onClick={() => safePrint()}
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-amber-400 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة كشف</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. AGING DETAILED TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <h4 className="font-black text-sm">جدول تحليل أعمار الديون والمطالبات المستحقة</h4>
          </div>
          <span className="text-xs text-amber-300 font-mono font-bold">
            عدد السجلات: {filteredList.length} مشترك
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-100 text-slate-800 font-black border-b border-slate-200 text-[11px]">
              <tr>
                <th className="p-3 text-center w-12">م</th>
                <th className="p-3 text-right">المشترك والعداد</th>
                <th className="p-3 text-center w-28">المنطقة</th>
                <th className="p-3 text-center w-28">رقم الهاتف</th>
                <th className="p-3 text-center w-32 text-rose-600">المبلغ المستحق</th>
                <th className="p-3 text-center w-28">أيام التأخر</th>
                <th className="p-3 text-center w-28">شريحة الدين</th>
                <th className="p-3 text-center w-28">درجة المخاطرة</th>
                <th className="p-3 text-center w-28">آخر سداد مسجل</th>
                <th className="p-3 text-center w-24">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold text-slate-800 text-[11px]">
              {filteredList.map((sub, index) => (
                <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-center font-mono text-slate-400">{index + 1}</td>
                  <td className="p-3">
                    <div className="font-black text-slate-900 text-xs">{sub.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      عداد: <span className="font-bold text-slate-800">{sub.meterNumber}</span>
                    </div>
                  </td>
                  <td className="p-3 text-center text-slate-700">{sub.zone || 'الرئيسية'}</td>
                  <td className="p-3 text-center font-mono text-slate-700" dir="ltr">{sub.phone || '-'}</td>
                  <td className="p-3 text-center font-mono font-black text-rose-600 text-xs">
                    {sub.currentBalance.toLocaleString()} {settings.currency}
                  </td>
                  <td className="p-3 text-center font-mono text-slate-800">
                    {sub.daysOverdue} يوم
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                      sub.bracket === '180_plus' ? 'bg-rose-100 text-rose-900' :
                      sub.bracket === '91_180' ? 'bg-rose-50 text-rose-700' :
                      sub.bracket === '61_90' ? 'bg-orange-100 text-orange-800' :
                      sub.bracket === '31_60' ? 'bg-amber-100 text-amber-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      {sub.bracket === '180_plus' ? '+180 يوم' :
                       sub.bracket === '91_180' ? '91-180 يوم' :
                       sub.bracket === '61_90' ? '61-90 يوم' :
                       sub.bracket === '31_60' ? '31-60 يوم' : '1-30 يوم'}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      sub.riskLevel === 'critical' ? 'bg-rose-600 text-white animate-pulse' :
                      sub.riskLevel === 'high' ? 'bg-rose-100 text-rose-800' :
                      sub.riskLevel === 'medium' ? 'bg-amber-100 text-amber-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      {sub.riskLevel === 'critical' ? 'حرج جداً' :
                       sub.riskLevel === 'high' ? 'مرتفع' :
                       sub.riskLevel === 'medium' ? 'متوسط' : 'طبيعي'}
                    </span>
                  </td>
                  <td className="p-3 text-center font-mono text-[10px] text-slate-600">
                    {sub.lastPaymentDate}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => onOpenIndividualStatement(sub)}
                      className="bg-amber-50 hover:bg-amber-100 text-amber-800 px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 transition-all cursor-pointer mx-auto border border-amber-200"
                    >
                      <span>كشف</span>
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400 font-bold">
                    لا توجد ديون مطابقة لمعايير الفلترة المحددة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
