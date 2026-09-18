import React from 'react';
import { InventoryItem, InventoryTransaction, SystemSettings } from '../../types';
import { 
  Package, DollarSign, AlertTriangle, Layers, Building2,
  Printer, Download, Upload, Plus, Trash2, ShieldAlert
} from 'lucide-react';
import { printData, exportToCSV } from '../../utils/exportUtils';

interface InventoryHeaderAndStatsProps {
  inventory: InventoryItem[];
  settings?: SystemSettings;
  selectedWarehouse: string;
  setSelectedWarehouse: (wh: string) => void;
  warehouses: string[];
  onOpenAddItem: () => void;
  onOpenStockTake: () => void;
  onOpenTransfer: () => void;
  onClearAllItems: () => void;
  onImportClick: () => void;
}

export const InventoryHeaderAndStats: React.FC<InventoryHeaderAndStatsProps> = ({
  inventory,
  settings,
  selectedWarehouse,
  setSelectedWarehouse,
  warehouses,
  onOpenAddItem,
  onOpenStockTake,
  onOpenTransfer,
  onClearAllItems,
  onImportClick
}) => {
  const currency = settings?.currency || 'ر.ي';

  // Filter inventory by selected warehouse if specified
  const filteredByWh = selectedWarehouse === 'all' 
    ? inventory 
    : inventory.filter(i => (i.warehouse || 'المستودع الرئيسي') === selectedWarehouse);

  const totalItems = filteredByWh.length;
  const totalValuation = filteredByWh.reduce((sum, item) => {
    const price = Number(item.costPrice || item.unitPrice || 0);
    return sum + (Number(item.quantity || 0) * price);
  }, 0);
  const lowStockCount = filteredByWh.filter(item => Number(item.quantity || 0) <= Number(item.minAlertLevel || 0) && Number(item.quantity || 0) > 0).length;
  const outOfStockCount = filteredByWh.filter(item => Number(item.quantity || 0) <= 0).length;

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl text-right relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl md:text-2xl font-black text-white">إدارة المخزون والمستودعات المركزية</h2>
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono">
                  v3.0 Multi-Store ERP
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-400 font-medium mt-0.5">
                متابعة دقيقة للأصناف، المحولات، الكابلات، العدادات، وأذونات التوريد والصرف والتحويلات بين الفروع
              </p>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Warehouse Quick Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5">
              <Building2 className="w-4 h-4 text-amber-400" />
              <select
                value={selectedWarehouse}
                onChange={e => setSelectedWarehouse(e.target.value)}
                className="bg-transparent text-xs text-slate-200 font-bold outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-white">جميع المستودعات ({warehouses.length})</option>
                {warehouses.map(wh => (
                  <option key={wh} value={wh} className="bg-slate-900 text-white">{wh}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => printData(
                `تقرير دليل الأصناف المخزنية - ${selectedWarehouse === 'all' ? 'كافة المستودعات' : selectedWarehouse}`,
                filteredByWh.map(item => ({
                  code: item.code || '-',
                  name: item.name,
                  warehouse: item.warehouse || 'المستودع الرئيسي',
                  quantity: `${item.quantity} ${item.unit}`,
                  unitPrice: (item.costPrice || item.unitPrice || 0).toLocaleString(),
                  totalVal: ((item.costPrice || item.unitPrice || 0) * item.quantity).toLocaleString(),
                  location: item.location || '-'
                })),
                [
                  { key: 'code', label: 'كود SKU' },
                  { key: 'name', label: 'اسم الصنف' },
                  { key: 'warehouse', label: 'المستودع' },
                  { key: 'quantity', label: 'الرصيد' },
                  { key: 'unitPrice', label: `سعر التكلفة (${currency})` },
                  { key: 'totalVal', label: `إجمالي القيمة (${currency})` },
                  { key: 'location', label: 'موقع التخزين' }
                ]
              )}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="طباعة تقرير المخزون"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">طباعة الدليل</span>
            </button>

            <button
              onClick={() => exportToCSV(
                filteredByWh.map(item => ({
                  code: item.code || '',
                  name: item.name,
                  category: item.category,
                  warehouse: item.warehouse || 'المستودع الرئيسي',
                  quantity: item.quantity,
                  unit: item.unit,
                  costPrice: item.costPrice || item.unitPrice || 0,
                  sellingPrice: item.sellingPrice || 0,
                  totalValuation: (item.costPrice || item.unitPrice || 0) * item.quantity,
                  minAlertLevel: item.minAlertLevel,
                  location: item.location || '',
                  supplier: item.supplier || '',
                  brand: item.brand || ''
                })),
                `inventory_export_${selectedWarehouse}`,
                [
                  { key: 'code', label: 'الكود' },
                  { key: 'name', label: 'اسم الصنف' },
                  { key: 'category', label: 'التصنيف' },
                  { key: 'warehouse', label: 'المستودع' },
                  { key: 'quantity', label: 'الكمية' },
                  { key: 'unit', label: 'الوحدة' },
                  { key: 'costPrice', label: 'سعر التكلفة' },
                  { key: 'sellingPrice', label: 'سعر البيع' },
                  { key: 'totalValuation', label: 'إجمالي القيمة' },
                  { key: 'location', label: 'الموقع' }
                ]
              )}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="تصدير إلى Excel"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">تصدير Excel</span>
            </button>

            <button
              onClick={onImportClick}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="استيراد أصناف من ملف Excel أو CSV"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">استيراد أصناف</span>
            </button>

            <button
              onClick={onOpenAddItem}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة صنف جديد</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-sm text-right flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 mb-0.5">إجمالي أصناف المستودع</p>
            <h3 className="text-xl md:text-2xl font-black text-white font-mono">{totalItems.toLocaleString()} <span className="text-xs font-normal text-slate-500 font-sans">صنف</span></h3>
          </div>
          <div className="w-11 h-11 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-2xl flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-sm text-right flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 mb-0.5">القيمة المالية الإجمالية</p>
            <h3 className="text-xl md:text-2xl font-black text-emerald-400 font-mono">
              {totalValuation.toLocaleString()} <span className="text-xs font-normal text-slate-500 font-sans">{currency}</span>
            </h3>
          </div>
          <div className="w-11 h-11 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-sm text-right flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 mb-0.5">أصناف تحت حد الأمان</p>
            <h3 className="text-xl md:text-2xl font-black text-amber-400 font-mono">{lowStockCount.toLocaleString()} <span className="text-xs font-normal text-slate-500 font-sans">نواقص</span></h3>
          </div>
          <div className="w-11 h-11 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-2xl flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-sm text-right flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 mb-0.5">أصناف نفد رصيدها (صفر)</p>
            <h3 className="text-xl md:text-2xl font-black text-rose-400 font-mono">{outOfStockCount.toLocaleString()} <span className="text-xs font-normal text-slate-500 font-sans">منتهي</span></h3>
          </div>
          <div className="w-11 h-11 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-2xl flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  );
};
