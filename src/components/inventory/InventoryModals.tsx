import React, { useState, useEffect } from 'react';
import { InventoryItem, InventoryTransaction, SystemSettings } from '../../types';
import { 
  X, Plus, Edit2, ArrowUpRight, ArrowDownRight, ArrowRightLeft, 
  AlertTriangle, SlidersHorizontal, Barcode, Printer, Upload, 
  Download, FileSpreadsheet, Check, Building2, User, Tag, Sparkles
} from 'lucide-react';

// ==========================================
// 1. ADD / EDIT ITEM MODAL
// ==========================================
interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<InventoryItem>) => void;
  initialItem?: InventoryItem | null;
  categories: Record<string, { label: string; icon: string }>;
  warehouses: string[];
  settings?: SystemSettings;
}

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialItem,
  categories,
  warehouses,
  settings
}) => {
  const currency = settings?.currency || 'ر.ي';
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState<string>('cables');
  const [warehouse, setWarehouse] = useState<string>('المستودع الرئيسي');
  const [quantity, setQuantity] = useState<number>(0);
  const [unit, setUnit] = useState('متر');
  const [minAlertLevel, setMinAlertLevel] = useState<number>(10);
  const [reorderQuantity, setReorderQuantity] = useState<number>(50);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [location, setLocation] = useState('');
  const [supplier, setSupplier] = useState('');
  const [brand, setBrand] = useState('');
  const [specification, setSpecification] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialItem) {
      setName(initialItem.name || '');
      setCode(initialItem.code || '');
      setCategory(initialItem.category || 'cables');
      setWarehouse(initialItem.warehouse || 'المستودع الرئيسي');
      setQuantity(initialItem.quantity || 0);
      setUnit(initialItem.unit || 'حبة');
      setMinAlertLevel(initialItem.minAlertLevel || 10);
      setReorderQuantity(initialItem.reorderQuantity || (initialItem.minAlertLevel * 3) || 50);
      setCostPrice(initialItem.costPrice || initialItem.unitPrice || 0);
      setSellingPrice(initialItem.sellingPrice || 0);
      setLocation(initialItem.location || '');
      setSupplier(initialItem.supplier || '');
      setBrand(initialItem.brand || '');
      setSpecification(initialItem.specification || '');
      setNotes(initialItem.notes || '');
    } else {
      setName('');
      setCode(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
      setCategory('cables');
      setWarehouse(warehouses[0] || 'المستودع الرئيسي');
      setQuantity(0);
      setUnit('حبة');
      setMinAlertLevel(10);
      setReorderQuantity(50);
      setCostPrice(0);
      setSellingPrice(0);
      setLocation('');
      setSupplier('');
      setBrand('');
      setSpecification('');
      setNotes('');
    }
  }, [initialItem, isOpen, warehouses]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      code: code.trim(),
      category,
      warehouse,
      quantity: Number(quantity),
      unit,
      minAlertLevel: Number(minAlertLevel),
      reorderQuantity: Number(reorderQuantity),
      costPrice: Number(costPrice),
      unitPrice: Number(costPrice),
      sellingPrice: Number(sellingPrice),
      location: location.trim(),
      supplier: supplier.trim(),
      brand: brand.trim(),
      specification: specification.trim(),
      notes: notes.trim(),
      lastUpdated: new Date().toISOString()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl w-full max-w-2xl text-right my-8">
        <div className="flex justify-between items-center pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              {initialItem ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                {initialItem ? 'تعديل بيانات الصنف المخزني' : 'إضافة صنف وتجهيز كهربائي جديد'}
              </h3>
              <p className="text-xs text-slate-400">سجل بيانات الصنف والمواصفات الفنية وموقع التخزين</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Main Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-300 mb-1">اسم الصنف / المادة *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="مثال: كابل ألمنيوم مسلح 35 ملم 4 خط"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-amber-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">كود الصنف (SKU)</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="CBL-35MM-01"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-amber-400 font-mono font-bold outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">التصنيف</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 outline-none focus:border-amber-500 cursor-pointer"
              >
                {Object.entries(categories).map(([k, v]) => {
                  const catVal = v as { label: string; icon: string };
                  return (
                    <option key={k} value={k}>{catVal.icon} {catVal.label}</option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">المستودع المخزن فيه</label>
              <select
                value={warehouse}
                onChange={e => setWarehouse(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 outline-none focus:border-amber-500 cursor-pointer"
              >
                {warehouses.map(wh => (
                  <option key={wh} value={wh}>{wh}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">موقع التخزين / الرف</label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="مثال: رف B4 - هنجر 2"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Quantities & Units */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">الرصيد الأولي</label>
              <input
                type="number"
                step="any"
                required
                value={quantity}
                onChange={e => setQuantity(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono font-bold outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">وحدة القياس</label>
              <select
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-amber-500"
              >
                <option value="حبة">حبة / قطعة</option>
                <option value="متر">متر (Meter)</option>
                <option value="لفة">لفة / بكرة (Roll)</option>
                <option value="كيلوجرام">كيلوجرام (KG)</option>
                <option value="لتر">لتر (Litre)</option>
                <option value="صندوق">صندوق / كرتون</option>
                <option value="طقم">طقم / Set</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-amber-400 mb-1">حد الأمان (تنبيه)</label>
              <input
                type="number"
                step="any"
                value={minAlertLevel}
                onChange={e => setMinAlertLevel(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-amber-400 font-mono font-bold outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-sky-400 mb-1">كمية إعادة الطلب</label>
              <input
                type="number"
                step="any"
                value={reorderQuantity}
                onChange={e => setReorderQuantity(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-sky-400 font-mono font-bold outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">سعر التكلفة للوحدة ({currency})</label>
              <input
                type="number"
                step="any"
                value={costPrice}
                onChange={e => setCostPrice(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-emerald-400 font-mono font-bold outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">سعر البيع / احتساب الخدمة ({currency})</label>
              <input
                type="number"
                step="any"
                value={sellingPrice}
                onChange={e => setSellingPrice(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-amber-400 font-mono font-bold outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Technical Specs and Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">الماركة / الشركة المصنعة</label>
              <input
                type="text"
                value={brand}
                onChange={e => setBrand(e.target.value)}
                placeholder="مثال: السويدي، ABB، Schneider"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">المورد المعتمد</label>
              <input
                type="text"
                value={supplier}
                onChange={e => setSupplier(e.target.value)}
                placeholder="اسم المورد أو الوكيل"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">المواصفة والجهد / القدرة</label>
              <input
                type="text"
                value={specification}
                onChange={e => setSpecification(e.target.value)}
                placeholder="مثال: 400V / 100A / 3-Phase"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">ملاحظات إضافية</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="أي ملاحظات حول الصنف أو شروط التخزين..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex gap-2 pt-3 border-t border-slate-800">
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>{initialItem ? 'حفظ التعديلات' : 'إضافة الصنف إلى المستودع'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 2. TRANSACTION VOUCHER MODAL
// ==========================================
interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  type: 'in' | 'out' | 'damage' | 'adjustment' | 'transfer' | 'return';
  warehouses: string[];
  employees?: any[];
  subscribers?: any[];
  currentUser?: { name: string };
  settings?: SystemSettings;
  onSubmit: (tx: Omit<InventoryTransaction, 'id'>, newQuantity: number) => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  item,
  type,
  warehouses,
  employees = [],
  subscribers = [],
  currentUser,
  settings,
  onSubmit
}) => {
  const currency = settings?.currency || 'ر.ي';
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [targetWarehouse, setTargetWarehouse] = useState<string>('');
  const [technician, setTechnician] = useState<string>('');
  const [subscriberId, setSubscriberId] = useState<string>('');
  const [refNo, setRefNo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (item && isOpen) {
      setQuantity(1);
      setUnitPrice(item.costPrice || item.unitPrice || 0);
      const prefix = type === 'in' ? 'RCV' : type === 'out' ? 'ISS' : type === 'transfer' ? 'TRF' : type === 'damage' ? 'DMG' : type === 'return' ? 'RET' : 'ADJ';
      setRefNo(`${prefix}-${Math.floor(10000 + Math.random() * 90000)}`);
      setTargetWarehouse(warehouses.find(w => w !== (item.warehouse || 'المستودع الرئيسي')) || warehouses[0] || 'المستودع الرئيسي');
      setTechnician('');
      setSubscriberId('');
      setNotes('');
    }
  }, [item, type, isOpen, warehouses]);

  if (!isOpen || !item) return null;

  const currentQty = item.quantity;
  let computedNewQty = currentQty;

  if (type === 'in' || type === 'return') {
    computedNewQty = currentQty + Number(quantity);
  } else if (type === 'out' || type === 'damage' || type === 'transfer') {
    computedNewQty = Math.max(0, currentQty - Number(quantity));
  } else if (type === 'adjustment') {
    computedNewQty = Number(quantity);
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0 && type !== 'adjustment') {
      alert('يرجى إدخال كمية صحيحة أكبر من صفر');
      return;
    }

    if ((type === 'out' || type === 'transfer' || type === 'damage') && quantity > currentQty) {
      if (!confirm(`تحذير: الكمية المطلوبة (${quantity}) أكبر من الرصيد المتوفر (${currentQty}). هل تريد المتابعة على أية حال؟`)) {
        return;
      }
    }

    const subObj = subscribers.find(s => s.id === subscriberId);

    onSubmit({
      itemId: item.id,
      itemName: item.name,
      type,
      quantity: Number(quantity),
      unitPrice: Number(unitPrice),
      totalValue: Number(quantity) * Number(unitPrice),
      date: new Date().toISOString(),
      user: currentUser?.name || 'مدير النظام',
      warehouse: item.warehouse || 'المستودع الرئيسي',
      toWarehouse: type === 'transfer' ? targetWarehouse : undefined,
      technician: technician.trim() || undefined,
      subscriberId: subObj?.id,
      subscriberName: subObj?.name,
      refNo: refNo.trim(),
      notes: notes.trim()
    }, computedNewQty);

    onClose();
  };

  const getTitle = () => {
    switch (type) {
      case 'in': return 'إذن توريد وإدخال مواد (Inward Receipt)';
      case 'out': return 'إذن صرف وتجهيز مواد (Material Issue)';
      case 'transfer': return 'إذن تحويل بين المستودعات (Inter-store Transfer)';
      case 'return': return 'إذن إرجاع مواد للمستودع (Material Return)';
      case 'damage': return 'محضر إتلاف وتسجيل تالف (Damaged Write-off)';
      case 'adjustment': return 'تسوية رصيد الصنف يدوياً (Stock Adjustment)';
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl w-full max-w-lg text-right">
        <div className="flex justify-between items-center pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${
              type === 'in' ? 'bg-emerald-500/10 text-emerald-400' :
              type === 'out' ? 'bg-sky-500/10 text-sky-400' :
              type === 'transfer' ? 'bg-amber-500/10 text-amber-400' :
              type === 'damage' ? 'bg-rose-500/10 text-rose-400' : 'bg-purple-500/10 text-purple-400'
            }`}>
              {type === 'in' ? <ArrowUpRight className="w-5 h-5" /> :
               type === 'out' ? <ArrowDownRight className="w-5 h-5" /> :
               type === 'transfer' ? <ArrowRightLeft className="w-5 h-5" /> : <SlidersHorizontal className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-black text-white">{getTitle()}</h3>
              <p className="text-xs text-amber-400 font-bold font-mono">{item.name} ({item.code || '-'})</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4 pt-4">
          {/* Item Current Stock Info */}
          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block">المستودع الحالي والرصيد</span>
              <span className="font-bold text-slate-200 text-xs">{item.warehouse || 'المستودع الرئيسي'}</span>
            </div>
            <div className="text-left font-mono">
              <span className="text-xl font-black text-white">{currentQty}</span>
              <span className="text-xs text-slate-400 mr-1 font-sans">{item.unit}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                {type === 'adjustment' ? 'الرصيد الفعلي الجديد *' : 'الكمية المراد حركتها *'}
              </label>
              <input
                type="number"
                step="any"
                required
                value={quantity}
                onChange={e => setQuantity(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm font-mono font-black text-white outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">سعر الوحدة ({currency})</label>
              <input
                type="number"
                step="any"
                value={unitPrice}
                onChange={e => setUnitPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-emerald-400 outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Transfer Target Warehouse */}
          {type === 'transfer' && (
            <div>
              <label className="block text-xs font-bold text-amber-400 mb-1">المستودع المحول إليه (الوجهة) *</label>
              <select
                value={targetWarehouse}
                onChange={e => setTargetWarehouse(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-white outline-none focus:border-amber-500 cursor-pointer"
              >
                {warehouses.map(wh => (
                  <option key={wh} value={wh}>{wh}</option>
                ))}
              </select>
            </div>
          )}

          {/* Technician Assignment for Out / Transfer */}
          {(type === 'out' || type === 'transfer') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">الفني المستلم (عهدة)</label>
                <input
                  type="text"
                  value={technician}
                  onChange={e => setTechnician(e.target.value)}
                  placeholder="اسم الفني أو اختر من القائمة"
                  list="tech-suggestions"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-amber-500"
                />
                <datalist id="tech-suggestions">
                  {employees.map((emp, i) => (
                    <option key={i} value={emp.name || emp.fullName} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">رقم السند / الإذن</label>
                <input
                  type="text"
                  value={refNo}
                  onChange={e => setRefNo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-amber-400 outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">البيان والملاحظات</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="رقم أمر العمل، سبب الصرف، رقم الفاتورة..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-amber-500"
            />
          </div>

          {/* Calculation preview */}
          <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs font-mono">
            <span className="text-slate-400 font-sans">الرصيد بعد تنفيذ الحركة:</span>
            <span className="font-black text-amber-400 text-sm">
              {computedNewQty} {item.unit}
            </span>
          </div>

          <div className="flex gap-2 pt-3 border-t border-slate-800">
            <button
              type="submit"
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              <Check className="w-4 h-4" />
              <span>تأكيد وتسجيل الحركة المخزنية</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 3. BARCODE & QR LABEL PRINT MODAL
// ==========================================
interface BarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  settings?: SystemSettings;
}

export const BarcodeModal: React.FC<BarcodeModalProps> = ({
  isOpen,
  onClose,
  item,
  settings
}) => {
  const [labelCount, setLabelCount] = useState(4);
  const currency = settings?.currency || 'ر.ي';

  if (!isOpen || !item) return null;

  const sku = item.code || `SKU-${item.id.slice(-6)}`;
  const price = item.sellingPrice || item.costPrice || 0;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-white text-slate-900 rounded-3xl p-6 shadow-2xl w-full max-w-md text-right border border-slate-200">
        <div className="flex justify-between items-center pb-4 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Barcode className="w-5 h-5 text-amber-500" />
            <span>طباعة ملصقات الباركود والرفوف</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Label Count in modal */}
        <div className="my-4 flex items-center justify-between text-xs print:hidden bg-slate-100 p-3 rounded-xl">
          <span className="font-bold text-slate-700">عدد الملصقات للطباعة:</span>
          <div className="flex items-center gap-2">
            {[1, 2, 4, 8].map(cnt => (
              <button
                key={cnt}
                onClick={() => setLabelCount(cnt)}
                className={`px-2.5 py-1 rounded-lg font-mono font-bold ${
                  labelCount === cnt ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-300'
                }`}
              >
                {cnt}
              </button>
            ))}
          </div>
        </div>

        {/* Printable Stickers Area */}
        <div className="grid grid-cols-2 gap-3 p-2 bg-slate-50 rounded-2xl border border-dashed border-slate-300" id="printable-labels">
          {Array.from({ length: labelCount }).map((_, idx) => (
            <div key={idx} className="bg-white p-3 rounded-xl border border-slate-300 text-center shadow-xs space-y-1">
              <div className="text-[10px] font-bold text-slate-600 truncate">{settings?.stationName || 'محطة الكهرباء'}</div>
              <div className="text-xs font-black text-slate-900 line-clamp-1">{item.name}</div>
              
              {/* Simulated Visual Barcode Bars */}
              <div className="py-1 flex justify-center items-center gap-0.5 h-10 overflow-hidden">
                {sku.split('').map((char, cIdx) => (
                  <div 
                    key={cIdx} 
                    className="bg-slate-900 h-8" 
                    style={{ width: `${(char.charCodeAt(0) % 4) + 1.5}px` }} 
                  />
                ))}
              </div>

              <div className="font-mono text-[11px] font-bold text-slate-800 tracking-wider">{sku}</div>
              <div className="text-[10px] font-bold text-emerald-700">
                {price > 0 ? `${price.toLocaleString()} ${currency}` : item.location || '-'}
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 mt-4 border-t border-slate-200 print:hidden">
          <button
            onClick={() => window.print()}
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الملصقات فوراً</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 4. BULK IMPORT MODAL (EXCEL / CSV / JSON)
// ==========================================
interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: InventoryItem[]) => void;
  warehouses: string[];
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  warehouses
}) => {
  const [jsonText, setJsonText] = useState('');
  const [targetWh, setTargetWh] = useState(warehouses[0] || 'المستودع الرئيسي');

  if (!isOpen) return null;

  const sampleJson = JSON.stringify([
    {
      name: "كابل مسلح 16 ملم 4 خط",
      code: "CBL-16-4C",
      category: "cables",
      quantity: 500,
      unit: "متر",
      costPrice: 4200,
      sellingPrice: 5000,
      minAlertLevel: 50,
      location: "هنجر 1 - رف A",
      brand: "السويدي"
    },
    {
      name: "قاطع رئيسي 100 أمبير 3 فاز",
      code: "BRK-100A-3P",
      category: "breakers",
      quantity: 25,
      unit: "حبة",
      costPrice: 35000,
      sellingPrice: 42000,
      minAlertLevel: 5,
      location: "مستودع المحطات",
      brand: "ABB"
    }
  ], null, 2);

  const handleProcessImport = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        alert('الملف يجب أن يحتوي على مصفوفة أصناف صالحة.');
        return;
      }

      const importedItems: InventoryItem[] = parsed.map(p => ({
        id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: p.name || 'صنف غير مسمى',
        code: p.code || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        category: p.category || 'other',
        warehouse: p.warehouse || targetWh,
        quantity: Number(p.quantity || 0),
        unit: p.unit || 'حبة',
        costPrice: Number(p.costPrice || p.unitPrice || 0),
        unitPrice: Number(p.costPrice || p.unitPrice || 0),
        sellingPrice: Number(p.sellingPrice || 0),
        minAlertLevel: Number(p.minAlertLevel || 10),
        reorderQuantity: Number(p.reorderQuantity || 50),
        location: p.location || '',
        supplier: p.supplier || '',
        brand: p.brand || '',
        specification: p.specification || '',
        notes: p.notes || '',
        lastUpdated: new Date().toISOString()
      }));

      onImport(importedItems);
      alert(`تم استيراد ${importedItems.length} صنف بنجاح إلى ${targetWh}!`);
      onClose();
    } catch (e) {
      alert('خطأ في صيغة البيانات المدخلة. تأكد من صحة تنسيق JSON.');
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl w-full max-w-xl text-right">
        <div className="flex justify-between items-center pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">استيراد الأصناف المجمع (Bulk Import)</h3>
              <p className="text-xs text-slate-400">إدخال كميات كبيرة من الأصناف إلى قاعدة بيانات المستودع</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 pt-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">المستودع المستهدف للاستيراد</label>
            <select
              value={targetWh}
              onChange={e => setTargetWh(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-white outline-none focus:border-amber-500 cursor-pointer"
            >
              {warehouses.map(wh => (
                <option key={wh} value={wh}>{wh}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-slate-300">بيانات الأصناف (JSON Array)</label>
              <button
                type="button"
                onClick={() => setJsonText(sampleJson)}
                className="text-[11px] text-amber-400 hover:underline font-bold"
              >
                تعبئة عينة جاهزة
              </button>
            </div>
            <textarea
              rows={8}
              value={jsonText}
              onChange={e => setJsonText(e.target.value)}
              placeholder="ألصق كود JSON للأصناف هنا..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-emerald-400 outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex gap-2 pt-3 border-t border-slate-800">
            <button
              onClick={handleProcessImport}
              disabled={!jsonText.trim()}
              className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              <Check className="w-4 h-4" />
              <span>بدء استيراد وتخزين الأصناف</span>
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
