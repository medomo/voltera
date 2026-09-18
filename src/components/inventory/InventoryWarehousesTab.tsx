import React, { useState } from 'react';
import { InventoryItem, InventoryTransaction, SystemSettings } from '../../types';
import { 
  Building2, Plus, ArrowRightLeft, Package, DollarSign, 
  AlertTriangle, MapPin, User, CheckCircle2, ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';

interface WarehouseInfo {
  name: string;
  description: string;
  keeper: string;
  location: string;
  icon: string;
}

interface InventoryWarehousesTabProps {
  inventory: InventoryItem[];
  settings?: SystemSettings;
  warehouses: string[];
  onAddWarehouse: (name: string) => void;
  onOpenTransferForWarehouse: (fromWh: string) => void;
  onSelectWarehouse: (wh: string) => void;
}

export const InventoryWarehousesTab: React.FC<InventoryWarehousesTabProps> = ({
  inventory,
  settings,
  warehouses,
  onAddWarehouse,
  onOpenTransferForWarehouse,
  onSelectWarehouse
}) => {
  const currency = settings?.currency || 'ر.ي';
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWhName, setNewWhName] = useState('');
  const [newWhKeeper, setNewWhKeeper] = useState('');
  const [newWhLocation, setNewWhLocation] = useState('');

  const defaultWarehousesMeta: Record<string, { desc: string; keeper: string; location: string; icon: string }> = {
    'المستودع الرئيسي': {
      desc: 'المستودع المركزي للمواد الأساسية، المحولات، والكابلات الضخمة',
      keeper: 'أمين المستودع العام',
      location: 'مقر المحطة الرئيسي - الهنجر A',
      icon: '🏢'
    },
    'مستودع طوارئ الصيانة والميدان': {
      desc: 'مواد الصيانة السريعة، الفيوزات، القواطع، وأدوات طوارئ الأعطال',
      keeper: 'مشرف فرق الطوارئ',
      location: 'سيارة الخدمة المتنقلة / ورشة الطوارئ',
      icon: '🚐'
    },
    'مستودع المحطات والشبكات': {
      desc: 'قطع غيار المحولات، زيوت التبريد، العوازل، ومعدات الضغط العالي',
      keeper: 'مهندس الشبكات والمحطات',
      location: 'مستودع محطة التحويل الرئيسية',
      icon: '⚡'
    },
    'مستودع وفحص العدادات': {
      desc: 'العدادات الرقمية والذكية، صناديق الحماية، وكابلات التوصيل الفردية',
      keeper: 'فني مختبر المعايرة',
      location: 'مختبر فحص العدادات',
      icon: '📟'
    }
  };

  const handleCreateWarehouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWhName.trim()) return;
    onAddWarehouse(newWhName.trim());
    setNewWhName('');
    setNewWhKeeper('');
    setNewWhLocation('');
    setShowAddModal(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 text-right">
      {/* Header banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-400" />
            <span>إدارة المستودعات والفروع المتعددة</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            تنظيم المخزون عبر فروع ومستودعات مختلفة مع إمكانية التحويل الداخلي بينها ومتابعة عهدة كل مستودع
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة مستودع / فرع جديد</span>
        </button>
      </div>

      {/* Warehouses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {warehouses.map(whName => {
          const meta = defaultWarehousesMeta[whName] || {
            desc: 'مستودع فرعي مخصص للمواد وقطع الغيار',
            keeper: 'مسؤول المستودع',
            location: 'الموقع الميداني',
            icon: '📦'
          };

          const itemsInWh = inventory.filter(i => (i.warehouse || 'المستودع الرئيسي') === whName);
          const totalItems = itemsInWh.length;
          const totalValuation = itemsInWh.reduce((sum, item) => sum + ((item.costPrice || item.unitPrice || 0) * item.quantity), 0);
          const lowStockCount = itemsInWh.filter(item => item.quantity <= item.minAlertLevel && item.quantity > 0).length;

          return (
            <div
              key={whName}
              className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-5 shadow-sm transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl p-2 bg-slate-950 border border-slate-800 rounded-xl">{meta.icon}</span>
                    <div>
                      <h4 className="font-black text-white text-base">{whName}</h4>
                      <p className="text-xs text-slate-400 line-clamp-1">{meta.desc}</p>
                    </div>
                  </div>
                  <span className="bg-slate-950 text-slate-400 border border-slate-800 px-2.5 py-1 rounded-lg text-xs font-mono font-bold">
                    {totalItems} صنف
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800/80 mb-4">
                  <div>
                    <span className="text-slate-500 text-[10px] block font-bold">القيمة التقديرية</span>
                    <span className="font-black text-emerald-400 font-mono text-sm">
                      {totalValuation.toLocaleString()} {currency}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block font-bold">حالة النواقص</span>
                    <span className={`font-bold ${lowStockCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {lowStockCount > 0 ? `${lowStockCount} أصناف تحت الأمان` : 'الأرصدة مستقرة'}
                    </span>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-500" />
                      {meta.keeper}
                    </span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <MapPin className="w-3 h-3" />
                      {meta.location}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => onSelectWarehouse(whName)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>استعراض أصناف هذا المستودع</span>
                  <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                </button>

                <button
                  onClick={() => onOpenTransferForWarehouse(whName)}
                  className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="تحويل مواد من هذا المستودع"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>تحويل مخزني</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Warehouse Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl w-full max-w-md text-right">
            <h3 className="text-base font-black text-white mb-1">إضافة مستودع / موقع تخزين جديد</h3>
            <p className="text-xs text-slate-400 mb-4">إنشاء نقطة تخزين جديدة لإدارة المواد وقطع الغيار والتجهيزات</p>

            <form onSubmit={handleCreateWarehouse} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">اسم المستودع / الفرع *</label>
                <input
                  type="text"
                  required
                  value={newWhName}
                  onChange={e => setNewWhName(e.target.value)}
                  placeholder="مثال: مستودع التوسعة الشمالية / مستودع الكابلات"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-amber-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">أمين المستودع / المسؤول</label>
                <input
                  type="text"
                  value={newWhKeeper}
                  onChange={e => setNewWhKeeper(e.target.value)}
                  placeholder="اسم الموظف أو الفني المسؤول"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">الموقع الجغرافي / المبنى</label>
                <input
                  type="text"
                  value={newWhLocation}
                  onChange={e => setNewWhLocation(e.target.value)}
                  placeholder="مثال: مبنى محطة التحويل - الطابق الأرضي"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl text-xs cursor-pointer shadow-md"
                >
                  حفظ وإضافة المستودع
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
};
