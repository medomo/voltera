import React, { useState, useMemo } from 'react';
import { InventoryItem, SystemSettings } from '../../types';
import { 
  Search, LayoutGrid, LayoutList, Plus, Edit2, Trash2, 
  Barcode, MapPin, Tag, ArrowUpRight, ArrowDownRight, 
  AlertTriangle, CheckCircle2, X, SlidersHorizontal, Building2,
  Package, ArrowRightLeft, Sparkles, Filter
} from 'lucide-react';
import { motion } from 'motion/react';

interface InventoryCatalogTabProps {
  inventory: InventoryItem[];
  settings?: SystemSettings;
  categories: Record<string, { label: string; icon: string }>;
  selectedWarehouse: string;
  onOpenAddItem: () => void;
  onOpenEditItem: (item: InventoryItem) => void;
  onOpenTransaction: (item: InventoryItem, type: 'in' | 'out' | 'damage' | 'adjustment' | 'transfer' | 'return') => void;
  onOpenBarcode: (item: InventoryItem) => void;
  onConfirmDelete: (id: string) => void;
}

export const InventoryCatalogTab: React.FC<InventoryCatalogTabProps> = ({
  inventory,
  settings,
  categories,
  selectedWarehouse,
  onOpenAddItem,
  onOpenEditItem,
  onOpenTransaction,
  onOpenBarcode,
  onConfirmDelete
}) => {
  const currency = settings?.currency || 'ر.ي';
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'available' | 'low' | 'out'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'quantity-desc' | 'quantity-asc' | 'value-desc' | 'code'>('name');

  // Filtered and Sorted list
  const filteredItems = useMemo(() => {
    return inventory
      .filter(item => {
        // Warehouse filter
        if (selectedWarehouse !== 'all' && (item.warehouse || 'المستودع الرئيسي') !== selectedWarehouse) {
          return false;
        }

        // Category filter
        if (selectedCategory !== 'all' && item.category !== selectedCategory) {
          return false;
        }

        // Status filter
        const qty = Number(item.quantity || 0);
        const minLvl = Number(item.minAlertLevel || 0);
        if (stockStatusFilter === 'available' && qty <= minLvl) return false;
        if (stockStatusFilter === 'low' && (qty > minLvl || qty <= 0)) return false;
        if (stockStatusFilter === 'out' && qty > 0) return false;

        // Search query
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase().trim();
          const matchName = item.name.toLowerCase().includes(q);
          const matchCode = (item.code || '').toLowerCase().includes(q);
          const matchLocation = (item.location || '').toLowerCase().includes(q);
          const matchSupplier = (item.supplier || '').toLowerCase().includes(q);
          const matchBrand = (item.brand || '').toLowerCase().includes(q);
          const matchSpec = (item.specification || '').toLowerCase().includes(q);
          const matchNotes = (item.notes || '').toLowerCase().includes(q);
          return matchName || matchCode || matchLocation || matchSupplier || matchBrand || matchSpec || matchNotes;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name, 'ar');
        if (sortBy === 'code') return (a.code || '').localeCompare(b.code || '');
        if (sortBy === 'quantity-desc') return Number(b.quantity || 0) - Number(a.quantity || 0);
        if (sortBy === 'quantity-asc') return Number(a.quantity || 0) - Number(b.quantity || 0);
        if (sortBy === 'value-desc') {
          const valA = Number(a.quantity || 0) * (Number(a.costPrice || a.unitPrice || 0));
          const valB = Number(b.quantity || 0) * (Number(b.costPrice || b.unitPrice || 0));
          return valB - valA;
        }
        return 0;
      });
  }, [inventory, selectedWarehouse, selectedCategory, stockStatusFilter, searchTerm, sortBy]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 text-right">
      {/* Search & Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3.5">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="ابحث باسم الصنف، الكود SKU، موقع التخزين، المورد، المواصفات، الماركة..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-4 py-2 text-xs text-right text-white focus:border-amber-500 outline-none transition-all placeholder:text-slate-500 font-bold"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-44">
            <select
              value={stockStatusFilter}
              onChange={e => setStockStatusFilter(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 focus:border-amber-500 outline-none cursor-pointer text-right"
            >
              <option value="all">كل حالات الرصيد</option>
              <option value="available">متوفر في المستودع</option>
              <option value="low">تحت حد الأمان (نواقص)</option>
              <option value="out">منتهي الرصيد (صفر)</option>
            </select>
          </div>

          {/* Sorting */}
          <div className="w-full md:w-44">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 focus:border-amber-500 outline-none cursor-pointer text-right"
            >
              <option value="name">ترتيب أبجدي بالاسم</option>
              <option value="code">ترتيب حسب الكود SKU</option>
              <option value="quantity-desc">الأعلى رصيداً</option>
              <option value="quantity-asc">الأقل رصيداً</option>
              <option value="value-desc">الأعلى قيمة مالية</option>
            </select>
          </div>

          {/* Grid vs Table View Mode */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="عرض بطاقات تفاعلية"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="عرض جدول تفصيلي"
            >
              <LayoutList className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-2 border-t border-slate-800/80">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>جميع التصنيفات</span>
            <span className="bg-black/20 px-1.5 py-0.2 rounded text-[10px] font-mono">{inventory.length}</span>
          </button>

          {Object.entries(categories).map(([key, cat]) => {
            const categoryInfo = cat as { label: string; icon: string };
            const count = inventory.filter(i => i.category === key).length;
            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === key
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <span>{categoryInfo.icon} {categoryInfo.label}</span>
                <span className="bg-black/20 px-1.5 py-0.2 rounded text-[10px] font-mono">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map(item => {
            const qty = Number(item.quantity || 0);
            const minAlert = Number(item.minAlertLevel || 0);
            const unitCost = Number(item.costPrice || item.unitPrice || 0);
            const totalLineVal = qty * unitCost;
            const isLow = qty <= minAlert && qty > 0;
            const isOut = qty <= 0;
            const safePercent = minAlert > 0 ? Math.min(100, Math.round((qty / (minAlert * 2)) * 100)) : 100;

            return (
              <div 
                key={item.id} 
                className={`bg-slate-900 rounded-2xl border p-4 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between relative group ${
                  isOut ? 'border-rose-500/40 bg-rose-950/10' : isLow ? 'border-amber-500/40 bg-amber-950/10' : 'border-slate-800 hover:border-amber-500/50'
                }`}
              >
                <div>
                  {/* Top SKU Badge & Status */}
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="px-2 py-0.5 bg-slate-950 text-slate-300 border border-slate-800 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1">
                      <Tag className="w-3 h-3 text-amber-400" />
                      {item.code || `SKU-${item.id.slice(-4)}`}
                    </span>

                    {isOut ? (
                      <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-md text-[10px] font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>منتهي الرصيد</span>
                      </span>
                    ) : isLow ? (
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-md text-[10px] font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>تحت حد الأمان</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-md text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>متوفر</span>
                      </span>
                    )}
                  </div>

                  {/* Item Name & Details */}
                  <h3 className="font-black text-white text-sm mb-1 line-clamp-2 leading-snug">{item.name}</h3>
                  
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400 font-medium mb-3">
                    <span>{categories[item.category]?.icon} {categories[item.category]?.label || item.category}</span>
                    {item.warehouse && (
                      <span className="text-amber-400/90 flex items-center gap-0.5 font-bold">
                        <Building2 className="w-3 h-3" />
                        {item.warehouse}
                      </span>
                    )}
                    {item.location && (
                      <span className="text-slate-500 flex items-center gap-0.5">
                        <MapPin className="w-3 h-3" />
                        {item.location}
                      </span>
                    )}
                  </div>

                  {/* Stock Quantity Card */}
                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 mb-3">
                    <div className="flex justify-between items-baseline mb-1.5">
                      <span className="text-[11px] text-slate-400 font-bold">الرصيد المتوفر</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-white font-mono">{qty.toLocaleString()}</span>
                        <span className="text-xs font-bold text-slate-400">{item.unit}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-1">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          isOut ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${safePercent}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                      <span>حد التنبيه: {minAlert} {item.unit}</span>
                      {unitCost > 0 && <span>الإجمالي: {totalLineVal.toLocaleString()} {currency}</span>}
                    </div>
                  </div>

                  {/* Pricing and Brand */}
                  <div className="grid grid-cols-2 gap-2 text-right text-[11px] bg-slate-950/50 p-2 rounded-lg border border-slate-800/60 mb-3 font-mono">
                    <div>
                      <span className="text-slate-500 block text-[9px] font-sans">سعر التكلفة</span>
                      <span className="font-bold text-slate-200">{unitCost > 0 ? `${unitCost.toLocaleString()} ${currency}` : '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] font-sans">سعر البيع / الخدمة</span>
                      <span className="font-bold text-amber-400">{item.sellingPrice ? `${item.sellingPrice.toLocaleString()} ${currency}` : '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Actions Toolbar */}
                <div className="border-t border-slate-800/80 pt-2.5 space-y-2">
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      onClick={() => onOpenTransaction(item, 'in')}
                      className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                      title="إذن توريد وإدخال للمستودع"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>توريد</span>
                    </button>

                    <button
                      onClick={() => onOpenTransaction(item, 'out')}
                      className="bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                      title="إذن صرف وإخراج"
                    >
                      <ArrowDownRight className="w-3.5 h-3.5" />
                      <span>صرف</span>
                    </button>

                    <button
                      onClick={() => onOpenTransaction(item, 'transfer')}
                      className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                      title="تحويل بين المستودعات"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>تحويل</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-slate-400">
                    <button
                      onClick={() => onOpenTransaction(item, 'adjustment')}
                      className="text-[11px] text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 p-1 hover:bg-purple-500/10 rounded transition-colors cursor-pointer"
                      title="تسوية جردية سريعة"
                    >
                      <SlidersHorizontal className="w-3 h-3" />
                      <span>تسوية</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onOpenBarcode(item)}
                        className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="طباعة بطاقة الباركود"
                      >
                        <Barcode className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onOpenEditItem(item)}
                        className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="تعديل بيانات الصنف"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onConfirmDelete(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        title="حذف الصنف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">الكود SKU</th>
                  <th className="px-4 py-3">اسم الصنف</th>
                  <th className="px-4 py-3">التصنيف</th>
                  <th className="px-4 py-3">المستودع والموقع</th>
                  <th className="px-4 py-3 text-center">الرصيد المتاح</th>
                  <th className="px-4 py-3 text-center">التكلفة</th>
                  <th className="px-4 py-3 text-center">إجمالي القيمة</th>
                  <th className="px-4 py-3 text-center">الحالة</th>
                  <th className="px-4 py-3 text-center">الإجراءات السريعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {filteredItems.map(item => {
                  const qty = Number(item.quantity || 0);
                  const minAlert = Number(item.minAlertLevel || 0);
                  const unitCost = Number(item.costPrice || item.unitPrice || 0);
                  const isLow = qty <= minAlert && qty > 0;
                  const isOut = qty <= 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-amber-400">{item.code || '-'}</td>
                      <td className="px-4 py-3 font-bold text-white">
                        <div>{item.name}</div>
                        {item.specification && <div className="text-[10px] text-slate-400 font-normal">{item.specification}</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {categories[item.category]?.icon} {categories[item.category]?.label || item.category}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        <div>{item.warehouse || 'المستودع الرئيسي'}</div>
                        {item.location && <div className="text-[10px] text-slate-500">{item.location}</div>}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-white text-sm">
                        {qty.toLocaleString()} <span className="text-xs font-sans text-slate-400">{item.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-slate-300">
                        {unitCost > 0 ? unitCost.toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-black text-emerald-400">
                        {(unitCost * qty).toLocaleString()} {currency}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isOut ? (
                          <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-[10px] font-bold">منتهي</span>
                        ) : isLow ? (
                          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[10px] font-bold">تحت الأمان</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-bold">متوفر</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onOpenTransaction(item, 'in')}
                            className="px-2 py-1 bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 rounded-lg font-bold text-[11px] flex items-center gap-0.5 transition-colors cursor-pointer"
                          >
                            <ArrowUpRight className="w-3 h-3" />
                            <span>توريد</span>
                          </button>

                          <button
                            onClick={() => onOpenTransaction(item, 'out')}
                            className="px-2 py-1 bg-sky-500/15 hover:bg-sky-500/30 text-sky-400 rounded-lg font-bold text-[11px] flex items-center gap-0.5 transition-colors cursor-pointer"
                          >
                            <ArrowDownRight className="w-3 h-3" />
                            <span>صرف</span>
                          </button>

                          <button
                            onClick={() => onOpenEditItem(item)}
                            className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors"
                            title="تعديل الصنف"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onOpenBarcode(item)}
                            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                            title="باركود"
                          >
                            <Barcode className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onConfirmDelete(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredItems.length === 0 && (
        <div className="py-16 text-center text-slate-400 bg-slate-900 rounded-2xl border border-dashed border-slate-800 p-8">
          <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">لا توجد أصناف مخزنية مطابقة للبحث</h3>
          <p className="text-xs text-slate-500 mt-1">جرب تغيير شروط البحث، أو قم بإضافة أصناف جديدة إلى المستودع</p>
          <button
            onClick={onOpenAddItem}
            className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            إضافة صنف جديد الآن
          </button>
        </div>
      )}
    </motion.div>
  );
};
