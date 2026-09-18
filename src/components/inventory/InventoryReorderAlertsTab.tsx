import React, { useState } from 'react';
import { InventoryItem, SystemSettings } from '../../types';
import { 
  AlertTriangle, ShieldAlert, ArrowUpRight, ShoppingCart, 
  Printer, CheckCircle2, DollarSign, Package, FileText, Check
} from 'lucide-react';
import { motion } from 'motion/react';
import { printData } from '../../utils/exportUtils';

interface InventoryReorderAlertsTabProps {
  inventory: InventoryItem[];
  settings?: SystemSettings;
  onOpenRestockModal: (item: InventoryItem) => void;
}

export const InventoryReorderAlertsTab: React.FC<InventoryReorderAlertsTabProps> = ({
  inventory,
  settings,
  onOpenRestockModal
}) => {
  const currency = settings?.currency || 'ر.ي';
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('all');

  // Low and zero stock items
  const lowStockItems = inventory.filter(item => {
    const qty = Number(item.quantity || 0);
    const minLvl = Number(item.minAlertLevel || 0);
    return qty <= minLvl;
  });

  // Extract unique suppliers
  const suppliers = Array.from(new Set(lowStockItems.map(i => i.supplier).filter(Boolean))) as string[];

  // Filtered by supplier
  const filteredLowStock = lowStockItems.filter(item => {
    if (selectedSupplierFilter !== 'all' && item.supplier !== selectedSupplierFilter) return false;
    return true;
  });

  // Compute replenishment budget required
  const totalReplenishmentCost = filteredLowStock.reduce((sum, item) => {
    const qty = Number(item.quantity || 0);
    const targetQty = Number(item.reorderQuantity || (item.minAlertLevel * 3) || 10);
    const needed = Math.max(0, targetQty - qty);
    const cost = Number(item.costPrice || item.unitPrice || 0);
    return sum + (needed * cost);
  }, 0);

  // Generate Purchase Requisition Order for printing
  const handlePrintPurchaseRequisition = () => {
    printData(
      `مسودة طلب شراء ومطالبة توريد نواقص المخزون - ${settings?.stationName || 'محطة الكهرباء'}`,
      filteredLowStock.map((item, idx) => {
        const qty = Number(item.quantity || 0);
        const minLvl = Number(item.minAlertLevel || 0);
        const targetQty = Number(item.reorderQuantity || (minLvl * 3) || 10);
        const needed = Math.max(0, targetQty - qty);
        const cost = Number(item.costPrice || item.unitPrice || 0);

        return {
          idx: idx + 1,
          code: item.code || '-',
          name: item.name,
          currentQty: `${qty} ${item.unit}`,
          minLvl: `${minLvl} ${item.unit}`,
          neededQty: `${needed} ${item.unit}`,
          estCost: cost > 0 ? cost.toLocaleString() : '-',
          totalEst: (cost * needed).toLocaleString(),
          supplier: item.supplier || '-'
        };
      }),
      [
        { key: 'idx', label: '#' },
        { key: 'code', label: 'كود SKU' },
        { key: 'name', label: 'الصنف المطلوب' },
        { key: 'currentQty', label: 'الرصيد الحالي' },
        { key: 'minLvl', label: 'حد الأمان' },
        { key: 'neededQty', label: 'الكمية المقترحة للشراء' },
        { key: 'estCost', label: `سعر الوحدة التقديري (${currency})` },
        { key: 'totalEst', label: `إجمالي التقدير (${currency})` },
        { key: 'supplier', label: 'المورد المفضل' }
      ]
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 text-right">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black text-white">مركز تنبيهات حد الأمان وإعادة الطلب</h3>
                <span className="px-2.5 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-full text-xs font-bold font-mono">
                  {lowStockItems.length} صنف يحتاج توريد
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تنبؤ ذكي بالأصناف التي قاربت على النفاد وحساب التكلفة التقديرية لإعادة تعبئة المستودع
              </p>
            </div>
          </div>

          <button
            onClick={handlePrintPurchaseRequisition}
            disabled={filteredLowStock.length === 0}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة مسودة أمر شراء / Requisition</span>
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 font-bold block">إجمالي أصناف النواقص</span>
              <span className="text-xl font-black text-white font-mono">{filteredLowStock.length}</span>
            </div>
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 font-bold block">أصناف نفدت بالكامل (0)</span>
              <span className="text-xl font-black text-rose-400 font-mono">
                {filteredLowStock.filter(i => i.quantity <= 0).length}
              </span>
            </div>
            <Package className="w-5 h-5 text-rose-400" />
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 font-bold block">الميزانية التقديرية لإعادة الطلب</span>
              <span className="text-xl font-black text-emerald-400 font-mono">
                {totalReplenishmentCost.toLocaleString()} {currency}
              </span>
            </div>
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        {/* Supplier Filter if any */}
        {suppliers.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
            <span className="text-xs font-bold text-slate-400">تصفية حسب المورد:</span>
            <select
              value={selectedSupplierFilter}
              onChange={e => setSelectedSupplierFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-300 text-xs font-bold rounded-lg px-3 py-1 outline-none cursor-pointer"
            >
              <option value="all">كافة الموردين ({suppliers.length})</option>
              {suppliers.map(sup => (
                <option key={sup} value={sup}>{sup}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Alerts Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">الكود SKU</th>
                <th className="px-4 py-3">اسم الصنف</th>
                <th className="px-4 py-3">المستودع</th>
                <th className="px-4 py-3 text-center">الرصيد الحالي</th>
                <th className="px-4 py-3 text-center">حد الأمان</th>
                <th className="px-4 py-3 text-center">الكمية المقترحة للطلب</th>
                <th className="px-4 py-3 text-center">التكلفة التقديرية</th>
                <th className="px-4 py-3">المورد المعتمد</th>
                <th className="px-4 py-3 text-center">إجراء فوري</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {filteredLowStock.length > 0 ? (
                filteredLowStock.map(item => {
                  const qty = Number(item.quantity || 0);
                  const minLvl = Number(item.minAlertLevel || 0);
                  const targetQty = Number(item.reorderQuantity || (minLvl * 3) || 10);
                  const needed = Math.max(0, targetQty - qty);
                  const cost = Number(item.costPrice || item.unitPrice || 0);
                  const isZero = qty <= 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-amber-400">{item.code || '-'}</td>
                      <td className="px-4 py-3 font-bold text-white">
                        <div>{item.name}</div>
                        {item.specification && <div className="text-[10px] text-slate-400 font-normal">{item.specification}</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{item.warehouse || 'المستودع الرئيسي'}</td>
                      <td className="px-4 py-3 text-center font-mono font-black text-sm">
                        <span className={isZero ? 'text-rose-400' : 'text-amber-400'}>{qty}</span>
                        <span className="text-[10px] text-slate-500 font-sans mr-1">{item.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-slate-300">
                        {minLvl} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-sky-400">
                        +{needed} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-emerald-400">
                        {(cost * needed).toLocaleString()} {currency}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{item.supplier || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => onOpenRestockModal(item)}
                          className="px-3 py-1 bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 font-bold rounded-lg text-xs flex items-center justify-center gap-1 mx-auto transition-colors cursor-pointer"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>توريد فوري</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400 font-bold">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                    <span>مستويات المخزون ممتازة! لا توجد أصناف تحت حد الأمان حالياً.</span>
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
