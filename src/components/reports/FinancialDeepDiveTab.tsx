import React from 'react';
import { motion } from 'motion/react';
import { 
  Wallet, DollarSign, CreditCard, TrendingUp, TrendingDown, 
  Users, FileSpreadsheet, ArrowUpRight, ArrowDownRight, 
  CheckCircle2, AlertCircle, Sparkles, PieChart as PieIcon, Award
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { BaseReportProps } from './types';

export const FinancialDeepDiveTab: React.FC<BaseReportProps> = ({
  subscribers,
  readings,
  payments,
  settings,
  expenses = [],
  purchases = [],
  employeeTxs = [],
  connections = []
}) => {
  const currency = settings.currency || 'ر.ي';

  // Metrics
  const totalCashCollected = payments.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);
  const totalBilledInvoices = readings.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
  const totalConnectionFees = connections.reduce((sum, c) => sum + (Number(c.paidAmount) || 0), 0);

  const totalOpexExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalPurchases = purchases.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalSalaries = employeeTxs.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  const totalAllExpenses = totalOpexExpenses + totalPurchases + totalSalaries;

  const netCashSurplus = totalCashCollected + totalConnectionFees - totalAllExpenses;

  // Expenses Category Breakdown
  const expenseCategories = React.useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => {
      const cat = e.category || 'مصروفات متنوعة';
      map[cat] = (map[cat] || 0) + (Number(e.amount) || 0);
    });
    if (totalPurchases > 0) map['مشتريات مواد وأصول'] = totalPurchases;
    if (totalSalaries > 0) map['رواتب وأجور الكادر'] = totalSalaries;

    return Object.entries(map).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses, totalPurchases, totalSalaries]);

  const PIE_COLORS = ['#f43f5e', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#64748b'];

  // Collector Leaderboard
  const collectorLeaderboard = React.useMemo(() => {
    const map: Record<string, { collectorName: string; receiptsCount: number; totalCollected: number }> = {};
    payments.forEach(p => {
      const col = p.collectedBy || p.collectorName || 'الصندوق الرئيسي';
      if (!map[col]) map[col] = { collectorName: col, receiptsCount: 0, totalCollected: 0 };
      map[col].receiptsCount += 1;
      map[col].totalCollected += Number(p.amountPaid) || 0;
    });

    return Object.values(map).sort((a, b) => b.totalCollected - a.totalCollected);
  }, [payments]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 text-right"
      dir="rtl"
    >
      {/* 1. FINANCIAL SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <div className="p-2.5 bg-emerald-500/10 rounded-2xl text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400">تدفقات واردة</span>
          </div>
          <p className="text-xs text-slate-400 font-bold">إجمالي التحصيل النقدي الفعلي</p>
          <h3 className="text-2xl font-black text-white font-mono mt-1">
            {totalCashCollected.toLocaleString()} <span className="text-xs text-slate-400 font-sans">{currency}</span>
          </h3>
          <p className="text-[10px] text-emerald-400 font-bold mt-1">من إيصالات سداد المشتركين</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <div className="p-2.5 bg-amber-500/10 rounded-2xl text-amber-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400">مبيعات مفوترة</span>
          </div>
          <p className="text-xs text-slate-400 font-bold">إجمالي الفواتير الصادرة</p>
          <h3 className="text-2xl font-black text-white font-mono mt-1">
            {totalBilledInvoices.toLocaleString()} <span className="text-xs text-slate-400 font-sans">{currency}</span>
          </h3>
          <p className="text-[10px] text-amber-400 font-bold mt-1">طاقة كهربائية مستحقة للتحصيل</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <div className="p-2.5 bg-rose-500/10 rounded-2xl text-rose-400">
              <TrendingDown className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400">تدفقات خارجة</span>
          </div>
          <p className="text-xs text-slate-400 font-bold">إجمالي المنصرفات والمشتريات</p>
          <h3 className="text-2xl font-black text-rose-400 font-mono mt-1">
            {totalAllExpenses.toLocaleString()} <span className="text-xs text-slate-400 font-sans">{currency}</span>
          </h3>
          <p className="text-[10px] text-slate-500 font-bold mt-1">نفقات تشغيلية + وقود ومواد</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <div className={`p-2.5 rounded-2xl ${netCashSurplus >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400">السيولة الصافية</span>
          </div>
          <p className="text-xs text-slate-400 font-bold">صافي الفائض النقدي المحقق</p>
          <h3 className={`text-2xl font-black font-mono mt-1 ${netCashSurplus >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {netCashSurplus.toLocaleString()} <span className="text-xs text-slate-400 font-sans">{currency}</span>
          </h3>
          <p className="text-[10px] text-slate-500 font-bold mt-1">المقبوضات مطروحاً منها كافة المصروفات</p>
        </div>
      </div>

      {/* 2. REVENUE & EXPENSE CATEGORY DISTRIBUTION CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Expenses Distribution Breakdown (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-rose-400" />
              <span>هيكل توزيع المصروفات والنفقات</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-400">{expenseCategories.length} بنود</span>
          </div>

          <div className="h-56 w-full" dir="ltr">
            {expenseCategories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseCategories}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {expenseCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: any) => [`${Number(value).toLocaleString()} ${currency}`, 'القيمة']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs font-bold">
                لا توجد مصروفات مسجلة للفترة المحددة
              </div>
            )}
          </div>

          <div className="space-y-2 text-xs font-bold pt-2 border-t border-slate-800">
            {expenseCategories.slice(0, 4).map((cat, idx) => {
              const pct = totalAllExpenses > 0 ? (cat.value / totalAllExpenses) * 100 : 0;
              return (
                <div key={idx} className="flex justify-between items-center text-slate-300">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></span>
                    <span>{cat.name}</span>
                  </span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-white">{cat.value.toLocaleString()} {currency}</span>
                    <span className="text-slate-500 text-[10px]">({pct.toFixed(1)}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Field Collector Leaderboard (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>كفاءة تحصيلات المحصلين الميدانيين والصناديق</span>
              </h3>
              <p className="text-[11px] text-slate-400 font-bold mt-0.5">ترتيب المحصلين حسب المبالغ الموردة وعدد الإيصالات</p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800 px-3 py-1 rounded-xl">
              {collectorLeaderboard.length} محصل
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3 text-center">الترتيب</th>
                  <th className="p-3">اسم المحصل / الصندوق</th>
                  <th className="p-3 text-center">عدد المقبوضات</th>
                  <th className="p-3 text-center">إجمالي التحصيل</th>
                  <th className="p-3 text-center">المتوسط / إيصال</th>
                  <th className="p-3 text-center">النسبة من الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-bold text-slate-200">
                {collectorLeaderboard.map((col, idx) => {
                  const sharePct = totalCashCollected > 0 ? (col.totalCollected / totalCashCollected) * 100 : 0;
                  const avgPerReceipt = col.receiptsCount > 0 ? Math.round(col.totalCollected / col.receiptsCount) : 0;

                  return (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 text-center font-mono">
                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] text-slate-950 font-black ${
                          idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-slate-300' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-700 text-white'
                        }`}>
                          #{idx + 1}
                        </span>
                      </td>
                      <td className="p-3 font-black text-white flex items-center gap-2">
                        <span>{col.collectorName}</span>
                        {idx === 0 && <Award className="w-3.5 h-3.5 text-amber-400 inline" />}
                      </td>
                      <td className="p-3 text-center font-mono">{col.receiptsCount} إيصال</td>
                      <td className="p-3 text-center font-mono text-emerald-400 font-black">{col.totalCollected.toLocaleString()} {currency}</td>
                      <td className="p-3 text-center font-mono text-slate-300">{avgPerReceipt.toLocaleString()} {currency}</td>
                      <td className="p-3 text-center font-mono">
                        <span className="bg-slate-800 text-amber-400 px-2 py-0.5 rounded-lg text-[11px] font-black border border-slate-700">
                          {sharePct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {collectorLeaderboard.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      لا توجد سجلات تحصيل مسجلة للفترة المحددة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
