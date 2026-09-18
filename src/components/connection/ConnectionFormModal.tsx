import React, { useState, useEffect } from 'react';
import { X, Sparkles, Zap, Package, PlusCircle, Trash2, Plus, AlertTriangle, CheckCircle2, User, Phone, MapPin, Wrench, DollarSign, Boxes, Building } from 'lucide-react';
import { ServiceConnection, ConnectionMaterialItem, InventoryItem, Subscriber, Employee, SystemSettings } from '../../types';
import { DEFAULT_CONNECTION_TEMPLATES } from './connectionTemplates';

interface Props {
  initialData?: ServiceConnection | null;
  settings: SystemSettings;
  subscribers: Subscriber[];
  inventory: InventoryItem[];
  employees: Employee[];
  onSave: (connection: Partial<ServiceConnection>, materials: ConnectionMaterialItem[], autoCreateSub: boolean) => void;
  onClose: () => void;
}

export const ConnectionFormModal: React.FC<Props> = ({
  initialData,
  settings,
  subscribers,
  inventory,
  employees,
  onSave,
  onClose
}) => {
  const isEditing = !!initialData;

  const [formData, setFormData] = useState<Partial<ServiceConnection>>({
    date: new Date().toISOString().substring(0, 10),
    voucherNo: `CON-${Date.now().toString().slice(-4)}`,
    subscriberName: '',
    subscriberId: '',
    phone: '',
    meterNumber: '',
    zone: settings.zones?.[0] || 'المنطقة الأولى',
    tariffType: 'residential',
    serviceType: 'new_connection',
    connectionFee: 15000,
    meterCost: 35000,
    insuranceDeposit: 10000,
    installationLaborFee: 5000,
    materialsFee: 0,
    otherFees: 0,
    totalFee: 65000,
    paidAmount: 65000,
    paymentMethod: 'cash',
    bankAccountId: '',
    assignedTechnician: '',
    notes: '',
    status: 'completed',
    deductMaterialsFromInventory: true
  });

  const [materials, setMaterials] = useState<ConnectionMaterialItem[]>([]);
  const [autoCreateSubscriber, setAutoCreateSubscriber] = useState<boolean>(!isEditing);
  const [selectedWarehouseItemId, setSelectedWarehouseItemId] = useState<string>('');
  const [customMaterial, setCustomMaterial] = useState<{ name: string; quantity: number; unit: string; unitPrice: number }>({
    name: '',
    quantity: 1,
    unit: 'متر',
    unitPrice: 0
  });

  // Populate initial data when editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        date: initialData.date || new Date().toISOString().substring(0, 10),
        voucherNo: initialData.voucherNo || `CON-${initialData.id.slice(-4)}`
      });
      if (initialData.materialsList && initialData.materialsList.length > 0) {
        setMaterials([...initialData.materialsList]);
      } else if (initialData.materialsUsed) {
        setMaterials([{
          id: `mat-${Date.now()}`,
          name: initialData.materialsUsed,
          quantity: 1,
          unit: 'طقم',
          unitPrice: initialData.materialsFee || 0
        }]);
      }
      setAutoCreateSubscriber(false);
    }
  }, [initialData]);

  // Recalculate materials fee when materials list changes
  useEffect(() => {
    const sumMaterials = materials.reduce((acc, m) => acc + (Number(m.quantity || 0) * Number(m.unitPrice || 0)), 0);
    setFormData(prev => {
      const calculatedTotal = Number(prev.connectionFee || 0) +
        Number(prev.meterCost || 0) +
        Number(prev.insuranceDeposit || 0) +
        Number(prev.installationLaborFee || 0) +
        sumMaterials +
        Number(prev.otherFees || 0);

      return {
        ...prev,
        materialsFee: sumMaterials,
        totalFee: calculatedTotal
      };
    });
  }, [materials]);

  // Apply template
  const applyTemplate = (tpl: typeof DEFAULT_CONNECTION_TEMPLATES[0]) => {
    const tplMaterials = tpl.defaultMaterials.map(m => ({
      ...m,
      id: `mat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    }));

    const matTotal = tplMaterials.reduce((acc, m) => acc + (Number(m.quantity || 0) * Number(m.unitPrice || 0)), 0);
    const total = tpl.connectionFee + tpl.meterCost + tpl.insuranceDeposit + tpl.installationLaborFee + matTotal;

    setFormData(prev => ({
      ...prev,
      serviceType: tpl.serviceType,
      tariffType: tpl.tariffType,
      connectionFee: tpl.connectionFee,
      meterCost: tpl.meterCost,
      insuranceDeposit: tpl.insuranceDeposit,
      installationLaborFee: tpl.installationLaborFee,
      materialsFee: matTotal,
      otherFees: 0,
      totalFee: total,
      paidAmount: total,
      notes: tpl.description || prev.notes
    }));

    setMaterials(tplMaterials);
  };

  const calculatedComponentsSum = Number(formData.connectionFee || 0) +
    Number(formData.meterCost || 0) +
    Number(formData.insuranceDeposit || 0) +
    Number(formData.installationLaborFee || 0) +
    Number(formData.materialsFee || 0) +
    Number(formData.otherFees || 0);

  const isFeeMismatch = Math.abs(calculatedComponentsSum - Number(formData.totalFee || 0)) > 1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subscriberName?.trim()) {
      alert('يرجى كتابة اسم المشترك');
      return;
    }

    onSave(formData, materials, autoCreateSubscriber);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-950 p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-2xl">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                {isEditing ? 'تعديل بيانات وسند إدخال الخدمة' : 'تسجيل طلب وسند إدخال خدمة كهربائية جديد'}
              </h3>
              <p className="text-xs text-slate-400 font-bold mt-0.5">
                حساب الرسوم آلياً، تخصيص المواد والمستودع، والترحيل المحاسبي اللحظي
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Quick Template Picker (Shown when creating or on demand) */}
          <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                باقات ونماذج الخدمة الجاهزة (تعبئة فورية للرسوم والمواد بنقرة واحدة):
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {DEFAULT_CONNECTION_TEMPLATES.map(tpl => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => applyTemplate(tpl)}
                  className="text-right p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 transition-all text-xs group cursor-pointer"
                >
                  <div className="font-bold text-white group-hover:text-amber-400 flex items-center justify-between">
                    <span className="truncate">{tpl.title}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                    <span className="bg-slate-950 px-1.5 py-0.5 rounded text-amber-300 font-mono">
                      {(tpl.connectionFee + tpl.meterCost + tpl.insuranceDeposit + tpl.installationLaborFee).toLocaleString()} {settings.currency}
                    </span>
                    <span className="text-slate-500">{tpl.badge}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Section 1: Subscriber & Service Info */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-4">
            <div className="text-xs font-black text-amber-400 flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <User className="w-4 h-4" />
              1. بيانات المشترك والخدمة والعداد
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-300 mb-1">اسم المشترك / المستفيد *</label>
                <input
                  type="text"
                  required
                  list="subscriber-names-list"
                  value={formData.subscriberName || ''}
                  onChange={e => {
                    const name = e.target.value;
                    const matchedSub = subscribers.find(s => s.name.trim().toLowerCase() === name.trim().toLowerCase());
                    if (matchedSub) {
                      setFormData(prev => ({
                        ...prev,
                        subscriberName: matchedSub.name,
                        subscriberId: matchedSub.id,
                        phone: matchedSub.phone || prev.phone,
                        meterNumber: matchedSub.meterNumber || prev.meterNumber,
                        zone: matchedSub.zone || prev.zone,
                        tariffType: matchedSub.tariffType || prev.tariffType
                      }));
                      setAutoCreateSubscriber(false);
                    } else {
                      setFormData(prev => ({ ...prev, subscriberName: name }));
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:border-amber-500 focus:outline-none"
                  placeholder="الاسم الثلاثي أو الرباعي"
                />
                <datalist id="subscriber-names-list">
                  {subscribers.map(s => (
                    <option key={s.id} value={s.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">رقم الهاتف / الجوال</label>
                <input
                  type="text"
                  value={formData.phone || ''}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:border-amber-500 focus:outline-none"
                  placeholder="770000000"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">رقم العداد المركب</label>
                <input
                  type="text"
                  value={formData.meterNumber || ''}
                  onChange={e => setFormData({ ...formData, meterNumber: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono font-bold focus:border-amber-500 focus:outline-none"
                  placeholder="M-102938"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">نوع الخدمة والعملية</label>
                <select
                  value={formData.serviceType || 'new_connection'}
                  onChange={e => setFormData({ ...formData, serviceType: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:border-amber-500 focus:outline-none"
                >
                  <option value="new_connection">توصيل وعداد جديد</option>
                  <option value="phase_upgrade">ترقية 3-Phase</option>
                  <option value="relocation">نقل موقع عداد</option>
                  <option value="reconnect">إعادة إطلاق تيار</option>
                  <option value="meter_replacement">استبدال وتغيير عداد</option>
                  <option value="maintenance">صيانة وتوسعة شبكة</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">المربع / الحي السكني</label>
                <select
                  value={formData.zone || ''}
                  onChange={e => setFormData({ ...formData, zone: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:border-amber-500 focus:outline-none"
                >
                  {(settings.zones || ['المنطقة الأولى', 'المنطقة الثانية']).map(z => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">نوع التعرفة</label>
                <select
                  value={formData.tariffType || 'residential'}
                  onChange={e => setFormData({ ...formData, tariffType: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:border-amber-500 focus:outline-none"
                >
                  <option value="residential">منزلي (سكني)</option>
                  <option value="commercial">تجاري</option>
                  <option value="industrial">صناعي</option>
                  <option value="agricultural">زراعي / مضخات</option>
                </select>
              </div>
            </div>

            {/* Auto-create subscriber checkbox */}
            {!isEditing && (
              <div className="pt-2 border-t border-slate-800/80">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-bold">
                  <input
                    type="checkbox"
                    checked={autoCreateSubscriber}
                    onChange={e => setAutoCreateSubscriber(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                  />
                  <span>إضافة المشترك تلقائياً إلى قاعدة بيانات المشتركين مع فتح حساب جديد برقم العداد المحدد</span>
                </label>
              </div>
            )}
          </div>

          {/* Section 2: Financial Fees Breakdown & Calculations */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4" />
                2. تفصيل الرسوم المالية والتحصيل
              </span>
              {isFeeMismatch && (
                <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  مجموع البنود ({calculatedComponentsSum.toLocaleString()}) يختلف عن الإجمالي المحدد
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">رسوم التوصيل</label>
                <input
                  type="number"
                  min="0"
                  value={formData.connectionFee ?? ''}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setFormData(prev => ({
                      ...prev,
                      connectionFee: val,
                      totalFee: val + Number(prev.meterCost || 0) + Number(prev.insuranceDeposit || 0) + Number(prev.installationLaborFee || 0) + Number(prev.materialsFee || 0) + Number(prev.otherFees || 0)
                    }));
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono font-bold text-right focus:border-amber-500 focus:outline-none"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">قيمة العداد</label>
                <input
                  type="number"
                  min="0"
                  value={formData.meterCost ?? ''}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setFormData(prev => ({
                      ...prev,
                      meterCost: val,
                      totalFee: Number(prev.connectionFee || 0) + val + Number(prev.insuranceDeposit || 0) + Number(prev.installationLaborFee || 0) + Number(prev.materialsFee || 0) + Number(prev.otherFees || 0)
                    }));
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono font-bold text-right focus:border-amber-500 focus:outline-none"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">تأمين العداد (مسترد)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.insuranceDeposit ?? ''}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setFormData(prev => ({
                      ...prev,
                      insuranceDeposit: val,
                      totalFee: Number(prev.connectionFee || 0) + Number(prev.meterCost || 0) + val + Number(prev.installationLaborFee || 0) + Number(prev.materialsFee || 0) + Number(prev.otherFees || 0)
                    }));
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono font-bold text-right focus:border-amber-500 focus:outline-none"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">أجور التركيب واليد</label>
                <input
                  type="number"
                  min="0"
                  value={formData.installationLaborFee ?? ''}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setFormData(prev => ({
                      ...prev,
                      installationLaborFee: val,
                      totalFee: Number(prev.connectionFee || 0) + Number(prev.meterCost || 0) + Number(prev.insuranceDeposit || 0) + val + Number(prev.materialsFee || 0) + Number(prev.otherFees || 0)
                    }));
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono font-bold text-right focus:border-amber-500 focus:outline-none"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">قيمة المواد</label>
                <div className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-2.5 py-1.5 text-amber-400 font-mono font-bold text-right">
                  {(formData.materialsFee || 0).toLocaleString()}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">رسوم أخرى</label>
                <input
                  type="number"
                  min="0"
                  value={formData.otherFees ?? ''}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setFormData(prev => ({
                      ...prev,
                      otherFees: val,
                      totalFee: Number(prev.connectionFee || 0) + Number(prev.meterCost || 0) + Number(prev.insuranceDeposit || 0) + Number(prev.installationLaborFee || 0) + Number(prev.materialsFee || 0) + val
                    }));
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white font-mono font-bold text-right focus:border-amber-500 focus:outline-none"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Total and Paid Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
              <div>
                <label className="block text-xs font-black text-amber-400 mb-1">إجمالي الرسوم المستحقة *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.totalFee ?? ''}
                  onChange={e => setFormData({ ...formData, totalFee: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2 text-sm text-white font-mono font-black text-right focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-black text-emerald-400">المبلغ المقبوض الآن *</label>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, paidAmount: prev.totalFee || 0 }))}
                    className="text-[10px] text-emerald-400 hover:underline font-bold"
                  >
                    سداد كامل
                  </button>
                </div>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.paidAmount ?? ''}
                  onChange={e => setFormData({ ...formData, paidAmount: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl px-3 py-2 text-sm text-white font-mono font-black text-right focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-rose-400 mb-1">المبلغ المتبقي (ذمة مؤجلة)</label>
                <div className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono font-black text-right text-rose-400">
                  {Math.max(0, Number(formData.totalFee || 0) - Number(formData.paidAmount || 0)).toLocaleString()} {settings.currency}
                </div>
              </div>
            </div>

            {/* Payment method & Bank account */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">طريقة القبض والإيداع</label>
                <select
                  value={formData.paymentMethod || 'cash'}
                  onChange={e => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:border-amber-500 focus:outline-none"
                >
                  <option value="cash">نقداً في الصندوق الرئيسي (كاش)</option>
                  <option value="bank_transfer">تحويل بنكي / محفظة إلكترونية</option>
                </select>
              </div>

              {formData.paymentMethod === 'bank_transfer' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">الحساب البنكي المودع إليه</label>
                  <select
                    value={formData.bankAccountId || ''}
                    onChange={e => setFormData({ ...formData, bankAccountId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">اختر الحساب البنكي</option>
                    {(settings.bankAccounts || []).map(b => (
                      <option key={b.id} value={b.id}>
                        {b.bankName} - {b.accountNumber} ({b.accountHolder})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Technical Assignment & Warehouse Materials */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                <Wrench className="w-4 h-4" />
                3. التجهيزات والمواد المصروفة والفني المسؤول
              </span>
              <label className="flex items-center gap-1.5 text-xs text-slate-300 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.deductMaterialsFromInventory}
                  onChange={e => setFormData({ ...formData, deductMaterialsFromInventory: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-700 text-amber-500"
                />
                <span>خصم المواد تلقائياً من رصيد المستودع</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">الفني المسؤول عن التنفيذ</label>
                <input
                  type="text"
                  list="technicians-list"
                  value={formData.assignedTechnician || ''}
                  onChange={e => setFormData({ ...formData, assignedTechnician: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:border-amber-500 focus:outline-none"
                  placeholder="اسم الفني أو المهندس"
                />
                <datalist id="technicians-list">
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">رقم السند الدفتري / الإشاري</label>
                <input
                  type="text"
                  value={formData.voucherNo || ''}
                  onChange={e => setFormData({ ...formData, voucherNo: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-right focus:border-amber-500 focus:outline-none"
                  placeholder="CON-2026-XXXX"
                />
              </div>
            </div>

            {/* Warehouse picker and custom add */}
            <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                <div className="sm:col-span-8">
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">
                    اختر صنفاً من المستودع / المخزن الرئيسي
                  </label>
                  <select
                    value={selectedWarehouseItemId}
                    onChange={e => setSelectedWarehouseItemId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">-- اختر صنفاً من المستودع --</option>
                    {inventory.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} | المتوفر: {item.quantity} {item.unit} | السعر: {(item.unitPrice || item.costPrice || 0).toLocaleString()} {settings.currency}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <button
                    type="button"
                    disabled={!selectedWarehouseItemId}
                    onClick={() => {
                      const found = inventory.find(i => i.id === selectedWarehouseItemId);
                      if (found) {
                        setMaterials(prev => [
                          ...prev,
                          {
                            id: `mat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                            itemId: found.id,
                            name: found.name,
                            quantity: 1,
                            unit: found.unit || 'حبة',
                            unitPrice: found.unitPrice || found.costPrice || 0,
                            notes: `صرف مستودع (متوفر: ${found.quantity})`
                          }
                        ]);
                        setSelectedWarehouseItemId('');
                      }
                    }}
                    className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black py-1.5 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    إضافة من المستودع
                  </button>
                </div>
              </div>

              {/* Custom manual item input */}
              <div className="pt-2 border-t border-slate-800/80">
                <span className="block text-[10px] font-bold text-slate-400 mb-1.5">أو إدخال صنف مخصص يدوياً:</span>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      placeholder="اسم المادة"
                      value={customMaterial.name}
                      onChange={e => setCustomMaterial({ ...customMaterial, name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      min="0.1"
                      step="any"
                      placeholder="الكمية"
                      value={customMaterial.quantity || ''}
                      onChange={e => setCustomMaterial({ ...customMaterial, quantity: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono text-center font-bold focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <select
                      value={customMaterial.unit}
                      onChange={e => setCustomMaterial({ ...customMaterial, unit: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white font-bold focus:border-amber-500 focus:outline-none"
                    >
                      <option value="متر">متر</option>
                      <option value="حبة">حبة</option>
                      <option value="لفة">لفة</option>
                      <option value="طقم">طقم</option>
                      <option value="كيلو">كيلو</option>
                      <option value="قطعة">قطعة</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      min="0"
                      placeholder="السعر"
                      value={customMaterial.unitPrice || ''}
                      onChange={e => setCustomMaterial({ ...customMaterial, unitPrice: Number(e.target.value) })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono text-right focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      disabled={!customMaterial.name.trim()}
                      onClick={() => {
                        if (!customMaterial.name.trim()) return;
                        setMaterials(prev => [
                          ...prev,
                          {
                            id: `mat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                            name: customMaterial.name.trim(),
                            quantity: customMaterial.quantity || 1,
                            unit: customMaterial.unit || 'متر',
                            unitPrice: customMaterial.unitPrice || 0,
                            notes: 'صنف يدوي مخصص'
                          }
                        ]);
                        setCustomMaterial({ name: '', quantity: 1, unit: 'متر', unitPrice: 0 });
                      }}
                      className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 hover:text-white font-bold py-1.5 px-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      + إضافة
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Materials list table */}
            {materials.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-bold">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">الصنف</th>
                      <th className="p-2 text-center">الكمية</th>
                      <th className="p-2 text-center">الوحدة</th>
                      <th className="p-2 text-center">السعر</th>
                      <th className="p-2 text-center">الإجمالي</th>
                      <th className="p-2 text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {materials.map((m, idx) => {
                      const invMatch = m.itemId ? inventory.find(i => i.id === m.itemId) : null;
                      const isOverStock = invMatch && Number(m.quantity || 0) > invMatch.quantity;

                      return (
                        <tr key={m.id || idx}>
                          <td className="p-2 font-mono text-slate-500">{idx + 1}</td>
                          <td className="p-2 font-bold">
                            <div>{m.name}</div>
                            {invMatch && (
                              <span className={`text-[10px] ${isOverStock ? 'text-rose-400' : 'text-slate-500'}`}>
                                رصيد المخزن: {invMatch.quantity} {invMatch.unit}
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-center font-mono font-bold">{m.quantity}</td>
                          <td className="p-2 text-center">{m.unit}</td>
                          <td className="p-2 text-center font-mono">{(m.unitPrice || 0).toLocaleString()}</td>
                          <td className="p-2 text-center font-mono font-bold text-amber-400">
                            {(Number(m.quantity || 0) * Number(m.unitPrice || 0)).toLocaleString()}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => setMaterials(prev => prev.filter((_, i) => i !== idx))}
                              className="text-rose-400 hover:text-rose-300 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold text-slate-300 mb-1">ملاحظات وشروط إضافية</label>
            <textarea
              rows={2}
              value={formData.notes || ''}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold focus:border-amber-500 focus:outline-none"
              placeholder="أي ملاحظات حول التوصيل، موقع العداد، أو الاتفاق المالي..."
            />
          </div>

          {/* Submit Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 cursor-pointer flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isEditing ? 'حفظ التعديلات' : 'حفظ وتسجيل السند رسمياً'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
