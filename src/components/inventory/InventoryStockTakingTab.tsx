import React, { useState } from 'react';
import { InventoryItem, InventoryTransaction, SystemSettings } from '../../types';
import { 
  ClipboardCheck, Printer, CheckCircle2, AlertTriangle, 
  ArrowRightLeft, SlidersHorizontal, FileSpreadsheet, RefreshCw,
  Building2, DollarSign, Check
} from 'lucide-react';
import { motion } from 'motion/react';
import { printData } from '../../utils/exportUtils';

interface InventoryStockTakingTabProps {
  inventory: InventoryItem[];
  settings?: SystemSettings;
  currentUser?: { name: string };
  selectedWarehouse: string;
  warehouses: string[];
  onApplyStockAdjustment: (adjustments: Array<{ item: InventoryItem; actualQty: number; diff: number; reason: string }>) => void;
}

export const InventoryStockTakingTab: React.FC<InventoryStockTakingTabProps> = ({
  inventory,
  settings,
  currentUser,
  selectedWarehouse,
  warehouses,
  onApplyStockAdjustment
}) => {
  const currency = settings?.currency || 'ر.ي';
  const [activeWh, setActiveWh] = useState<string>(selectedWarehouse === 'all' ? (warehouses[0] || 'المستودع الرئيسي') : selectedWarehouse);
  const [actualCounts, setActualCounts] = useState<Record<string, number>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [appliedSuccess, setAppliedSuccess] = useState(false);

  // Filter items in the current stock take warehouse
  const itemsInWh = inventory.filter(i => (i.warehouse || 'المستودع الرئيسي') === activeWh);

  // Update actual count for an item
  const handleCountChange = (itemId: string, val: string) => {
    const num = parseFloat(val);
    setActualCounts(prev => ({
      ...prev,
      [itemId]: isNaN(num) ? 0 : num
    }));
  };

  // Pre-fill all with current book quantity (to start count)
  const handlePrefillBookQuantities = () => {
    const initial: Record<string, number> = {};
    itemsInWh.forEach(item => {
      initial[item.id] = item.quantity;
    });
    setActualCounts(initial);
  };

  // Compute stats
  const itemsWithDiscrepancies = itemsInWh.filter(item => {
    const actual = actualCounts[item.id];
    return actual !== undefined && actual !== item.quantity;
  });

  const totalDiscrepancyValue = itemsWithDiscrepancies.reduce((sum, item) => {
    const actual = actualCounts[item.id] || 0;
    const diff = actual - item.quantity;
    const cost = item.costPrice || item.unitPrice || 0;
    return sum + (diff * cost);
  }, 0);

  // Submit adjustments
  const handleConfirmAdjustments = () => {
    if (itemsWithDiscrepancies.length === 0) {
      alert('لم يتم رصد أي فروقات بين الرصيد الفعلي والرصيد الدفتري.');
      return;
    }

    const payload = itemsWithDiscrepancies.map(item => {
      const actual = actualCounts[item.id] ?? item.quantity;
      const diff = actual - item.quantity;
      return {
        item,
        actualQty: actual,
        diff,
        reason: reasons[item.id] || 'تسوية ناتجة عن محضر جرد دوري'
      };
    });

    onApplyStockAdjustment(payload);
    setAppliedSuccess(true);
    setTimeout(() => setAppliedSuccess(false), 4000);
  };

  // Print blank count sheet
  const handlePrintBlankSheet = () => {
    printData(
      `كشف استمارة الجرد الميداني - ${activeWh}`,
      itemsInWh.map((item, idx) => ({
        idx: idx + 1,
        code: item.code || '-',
        name: item.name,
        unit: item.unit,
        location: item.location || '-',
        bookQty: item.quantity,
        actualQty: '___________',
        notes: '____________________'
      })),
      [
        { key: 'idx', label: '#' },
        { key: 'code', label: 'الكود SKU' },
        { key: 'name', label: 'اسم الصنف' },
        { key: 'unit', label: 'الوحدة' },
        { key: 'location', label: 'الموقع' },
        { key: 'bookQty', label: 'الرصيد الدفتري' },
        { key: 'actualQty', label: 'الرصيد الفعلي المعدود' },
        { key: 'notes', label: 'ملاحظات وتوقيع الجرد' }
      ]
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 text-right">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <ClipboardCheck className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-black text-white">معالج الجرد المخزني والتسويات الدورية</h3>
              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full text-xs font-bold">
                Stock Take Wizard
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              مقارنة الرصيد الدفتري المسجل بالنظام بالكميات الفعلية في الرفوف وحساب العجز أو الفائض مع تسوية القيود بضغطة زر
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrintBlankSheet}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="طباعة استمارة جرد فارغة للجرد اليدوي"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة كشف الجرد اليدوي</span>
            </button>

            <button
              onClick={handlePrefillBookQuantities}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>مطابقة مبدئية مع الدفتري</span>
            </button>
          </div>
        </div>

        {/* Warehouse Selector for Stock Take */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">حدد المستودع المراد جرده:</span>
            <select
              value={activeWh}
              onChange={e => {
                setActiveWh(e.target.value);
                setActualCounts({});
              }}
              className="bg-slate-900 border border-slate-700 text-amber-400 font-bold text-xs rounded-lg px-3 py-1.5 outline-none cursor-pointer"
            >
              {warehouses.map(wh => (
                <option key={wh} value={wh}>{wh}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="text-slate-400">إجمالي أصناف المستودع: <b className="text-white">{itemsInWh.length}</b></span>
            <span className="text-slate-400">الفروقات المرصودة: <b className="text-amber-400">{itemsWithDiscrepancies.length}</b></span>
            <span className="text-slate-400">صافي قيمة الفرق: <b className={totalDiscrepancyValue >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {totalDiscrepancyValue.toLocaleString()} {currency}
            </b></span>
          </div>
        </div>
      </div>

      {appliedSuccess && (
        <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>تم تطبيق التسويات الجردية وتحديث أرصدة المستودع وتوثيق السندات بنجاح!</span>
        </div>
      )}

      {/* Stock Take Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">الكود SKU</th>
                <th className="px-4 py-3">اسم الصنف والمواصفات</th>
                <th className="px-4 py-3">موقع التخزين</th>
                <th className="px-4 py-3 text-center">الرصيد الدفتري</th>
                <th className="px-4 py-3 text-center">الرصيد الفعلي (المعدود)</th>
                <th className="px-4 py-3 text-center">الفرق (عجز / فائض)</th>
                <th className="px-4 py-3 text-center">قيمة الفرق المالية</th>
                <th className="px-4 py-3">سبب الفارق / الملاحظة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {itemsInWh.map(item => {
                const book = item.quantity;
                const actual = actualCounts[item.id];
                const hasInput = actual !== undefined;
                const diff = hasInput ? actual - book : 0;
                const cost = item.costPrice || item.unitPrice || 0;
                const diffVal = diff * cost;

                return (
                  <tr key={item.id} className={`hover:bg-slate-800/40 transition-colors ${
                    hasInput && diff !== 0 ? (diff < 0 ? 'bg-rose-950/20' : 'bg-emerald-950/20') : ''
                  }`}>
                    <td className="px-4 py-3 font-mono font-bold text-amber-400">{item.code || '-'}</td>
                    <td className="px-4 py-3 font-bold text-white">
                      <div>{item.name}</div>
                      {item.specification && <div className="text-[10px] text-slate-400 font-normal">{item.specification}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{item.location || '-'}</td>
                    <td className="px-4 py-3 text-center font-mono font-black text-slate-300 text-sm">
                      {book.toLocaleString()} <span className="text-[10px] font-sans text-slate-500">{item.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        step="any"
                        value={actual ?? ''}
                        onChange={e => handleCountChange(item.id, e.target.value)}
                        placeholder={`${book}`}
                        className="w-24 bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-lg px-2.5 py-1 text-center font-mono font-bold text-white text-sm outline-none"
                      />
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-sm">
                      {!hasInput || diff === 0 ? (
                        <span className="text-slate-500">-</span>
                      ) : diff > 0 ? (
                        <span className="text-emerald-400">+{diff} (فائض)</span>
                      ) : (
                        <span className="text-rose-400">{diff} (عجز)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold">
                      {!hasInput || diff === 0 ? (
                        <span className="text-slate-500">-</span>
                      ) : (
                        <span className={diffVal >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {diffVal.toLocaleString()} {currency}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={reasons[item.id] || ''}
                        onChange={e => setReasons({ ...reasons, [item.id]: e.target.value })}
                        placeholder="سبب التسوية (تالف، تسريب، خطأ قيد...)"
                        disabled={!hasInput || diff === 0}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 outline-none disabled:opacity-30"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Action Footer */}
      {itemsWithDiscrepancies.length > 0 && (
        <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-xl">
          <div className="text-right">
            <h4 className="text-sm font-black text-white">تأكيد التسويات الجردية</h4>
            <p className="text-xs text-slate-400">
              يوجد <b className="text-amber-400">{itemsWithDiscrepancies.length} أصناف</b> بها فروقات جردية سيتم تحديث أرصدتها وتوليد سندات تسوية رسمية لها.
            </p>
          </div>

          <button
            onClick={handleConfirmAdjustments}
            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>اعتماد وتطبيق التسوية الجردية الآن</span>
          </button>
        </div>
      )}
    </motion.div>
  );
};
