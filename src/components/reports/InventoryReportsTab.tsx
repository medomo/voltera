import React from 'react';
import { motion } from 'motion/react';
import { 
  Package, AlertTriangle, CheckCircle2, TrendingDown, 
  Download, Layers, DollarSign, ShieldAlert, Boxes
} from 'lucide-react';
import { BaseReportProps } from './types';
import { exportToCSV } from '../../utils/exportUtils';

export const InventoryReportsTab: React.FC<BaseReportProps> = ({
  inventory = [],
  settings
}) => {
  const currency = settings.currency || 'ر.ي';

  const totalInventoryValue = inventory.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)), 0);
  const lowStockItems = inventory.filter(item => (Number(item.quantity) || 0) <= (Number(item.minQuantity) || 5));
  const normalStockItems = inventory.filter(item => (Number(item.quantity) || 0) > (Number(item.minQuantity) || 5));

  // Categories Breakdown
  const categoryBreakdown = React.useMemo(() => {
    const map: Record<string, { count: number; value: number }> = {};
    inventory.forEach(item => {
      const cat = item.category || 'مواد عامة';
      if (!map[cat]) map[cat] = { count: 0, value: 0 };
      map[cat].count += 1;
      map[cat].value += (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    });

    return Object.entries(map).map(([category, data]) => ({
      category,
      count: data.count,
      value: data.value
    })).sort((a, b) => b.value - a.value);
  }, [inventory]);

  const handleExportLowStock = () => {
    const rows = lowStockItems.map(i => ({
      code: i.code || '—',
      name: i.name,
      quantity: i.quantity,
      minQuantity: i.minQuantity,
      unitPrice: i.unitPrice,
      totalValue: (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
      category: i.category || 'عام'
    }));
    exportToCSV(rows, 'low_stock_audit_report', [
      { key: 'code', label: 'رقم الصنف' },
      { key: 'name', label: 'اسم المادة / الصنف' },
      { key: 'quantity', label: 'الكمية المتوفرة' },
      { key: 'minQuantity', label: 'الحد الأدنى' },
      { key: 'unitPrice', label: 'سعر الوحدة' },
      { key: 'totalValue', label: 'إجمالي القيمة' },
      { key: 'category', label: 'التصنيف' }
    ]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 text-right"
      dir="rtl"
    >
      {/* 1. INVENTORY SUMMARY KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <div className="p-2.5 bg-purple-500/10 rounded-2xl text-purple-400">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400">تقييم المستودع</span>
          </div>
          <p className="text-xs text-slate-400 font-bold">إجمالي القيمة المالية للمخزون</p>
          <h3 className="text-2xl font-black text-purple-400 font-mono mt-1">
            {totalInventoryValue.toLocaleString()} <span className="text-xs font-sans text-slate-400">{currency}</span>
          </h3>
          <p className="text-[10px] text-slate-500 font-bold mt-1">قيمة الأصول والمواد في المستودعات</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <div className="p-2.5 bg-sky-500/10 rounded-2xl text-sky-400">
              <Boxes className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400">الأصناف المسجلة</span>
          </div>
          <p className="text-xs text-slate-400 font-bold">إجمالي أصناف المواد والمعدات</p>
          <h3 className="text-2xl font-black text-white font-mono mt-1">
            {inventory.length} <span className="text-xs font-sans text-slate-400">صنف</span>
          </h3>
          <p className="text-[10px] text-slate-500 font-bold mt-1">كابلات وقواطع ومحولات وعدادات</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <div className="p-2.5 bg-rose-500/10 rounded-2xl text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg">
              حد الطلب
            </span>
          </div>
          <p className="text-xs text-slate-400 font-bold">أصناف منخفضة / نواقص عاجلة</p>
          <h3 className="text-2xl font-black text-rose-400 font-mono mt-1">
            {lowStockItems.length} <span className="text-xs font-sans text-slate-400">أصناف</span>
          </h3>
          <p className="text-[10px] text-rose-400 font-bold mt-1">تجاوزت الحد الأدنى للأمان</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <div className="p-2.5 bg-emerald-500/10 rounded-2xl text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400">مستقر</span>
          </div>
          <p className="text-xs text-slate-400 font-bold">أصناف بمستوى آمن</p>
          <h3 className="text-2xl font-black text-emerald-400 font-mono mt-1">
            {normalStockItems.length} <span className="text-xs font-sans text-slate-400">صنف</span>
          </h3>
          <p className="text-[10px] text-slate-500 font-bold mt-1">متوفرة بكميات كافية للتشغيل</p>
        </div>
      </div>

      {/* 2. CATEGORY VALUATION BREAKDOWN */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3.5">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <span>توزيع تقييم المخزون حسب تصنيفات المواد والمهمات</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">{categoryBreakdown.length} تصنيفات</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {categoryBreakdown.map((cat, idx) => {
            const share = totalInventoryValue > 0 ? (cat.value / totalInventoryValue) * 100 : 0;
            return (
              <div key={idx} className="bg-slate-950/70 border border-slate-800/80 p-3.5 rounded-2xl space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-black text-white text-xs">{cat.category}</span>
                  <span className="text-[10px] font-mono text-slate-400">{cat.count} أصناف</span>
                </div>
                <div className="text-base font-black font-mono text-purple-400">
                  {cat.value.toLocaleString()} <span className="text-[10px] font-sans text-slate-400">{currency}</span>
                </div>
                <div className="text-[10px] font-bold text-slate-500">
                  الحصة: <span className="font-mono text-slate-300">{share.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. LOW STOCK AUDIT TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <span>تقرير نواقص المستودع والأصناف المنخفضة عن حد الأمان</span>
            </h3>
            <p className="text-xs text-slate-400 font-bold mt-0.5">قائمة المواد التي تتطلب أوامر شراء وتوريد عاجلة لتأمين استمرارية الشبكة</p>
          </div>

          <button
            type="button"
            onClick={handleExportLowStock}
            className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير نواقص المخزون CSV</span>
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th className="p-3 text-center">رقم الصنف</th>
                <th className="p-3">اسم المادة / الصنف</th>
                <th className="p-3 text-center">الكمية المتوفرة</th>
                <th className="p-3 text-center">حد الأمان الأدنى</th>
                <th className="p-3 text-center">سعر الوحدة</th>
                <th className="p-3 text-center">التصنيف</th>
                <th className="p-3 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-bold text-slate-200">
              {lowStockItems.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-slate-800/40 transition-colors bg-rose-500/5">
                  <td className="p-3 text-center font-mono text-slate-400">{item.code || `ITM-${100 + idx}`}</td>
                  <td className="p-3 font-black text-white">{item.name}</td>
                  <td className="p-3 text-center font-mono font-black text-rose-400 text-sm">
                    {item.quantity} {item.unit || 'حبة'}
                  </td>
                  <td className="p-3 text-center font-mono text-slate-400">{item.minQuantity} {item.unit || 'حبة'}</td>
                  <td className="p-3 text-center font-mono text-slate-300">{item.unitPrice?.toLocaleString() || 0} {currency}</td>
                  <td className="p-3 text-center text-slate-400">{item.category || 'عام'}</td>
                  <td className="p-3 text-center">
                    <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded text-[10px] font-black">
                      نقص حرج
                    </span>
                  </td>
                </tr>
              ))}
              {lowStockItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-emerald-400">
                    <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-400" />
                    <span>المخزون مكتمل ولا توجد أي نواقص عن حد الأمان حالياً ✓</span>
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
