import React, { useState } from 'react';
import { ConsumptionSliceTier } from '../../types';
import { Layers, Plus, Trash2, Edit2, Check, X, AlertCircle, Info } from 'lucide-react';

interface TariffSlicesManagerProps {
  slices: ConsumptionSliceTier[];
  onChange: (slices: ConsumptionSliceTier[]) => void;
  currency: string;
}

export const TariffSlicesManager: React.FC<TariffSlicesManagerProps> = ({
  slices = [],
  onChange,
  currency,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ConsumptionSliceTier>>({});

  const handleStartAdd = () => {
    const lastSlice = slices[slices.length - 1];
    const newMin = lastSlice && lastSlice.maxKwh !== null ? lastSlice.maxKwh + 1 : 0;
    const newSlice: ConsumptionSliceTier = {
      id: `slice-${Date.now()}`,
      name: `الشريحة رقم ${slices.length + 1}`,
      category: 'all',
      minKwh: newMin,
      maxKwh: newMin + 150,
      ratePerKwh: lastSlice ? lastSlice.ratePerKwh : 0,
      fixedAdditionalFee: 0,
      color: slices.length === 0 ? 'emerald' : slices.length === 1 ? 'amber' : slices.length === 2 ? 'rose' : 'purple',
      notes: '',
    };
    setEditForm(newSlice);
    setEditingId(newSlice.id);
  };

  const handleStartEdit = (slice: ConsumptionSliceTier) => {
    setEditingId(slice.id);
    setEditForm({ ...slice });
  };

  const handleSaveEdit = () => {
    if (!editForm.name) {
      alert('يرجى كتابة اسم الشريحة');
      return;
    }

    const existingIndex = slices.findIndex(s => s.id === editingId);
    let updated: ConsumptionSliceTier[];

    const finalItem: ConsumptionSliceTier = {
      id: editForm.id || `slice-${Date.now()}`,
      name: editForm.name || 'شريحة استهلاك',
      category: editForm.category || 'all',
      minKwh: Math.max(0, editForm.minKwh ?? 0),
      maxKwh: editForm.maxKwh === null || editForm.maxKwh === undefined || isNaN(editForm.maxKwh) ? null : Math.max(0, editForm.maxKwh),
      ratePerKwh: Math.max(0, editForm.ratePerKwh ?? 0),
      fixedAdditionalFee: Math.max(0, editForm.fixedAdditionalFee ?? 0),
      color: editForm.color || 'amber',
      notes: editForm.notes || '',
    };

    if (existingIndex >= 0) {
      updated = [...slices];
      updated[existingIndex] = finalItem;
    } else {
      updated = [...slices, finalItem];
    }

    // Sort slices by minKwh ascending
    updated.sort((a, b) => a.minKwh - b.minKwh);
    onChange(updated);
    setEditingId(null);
    setEditForm({});
  };

  const handleDeleteSlice = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الشريحة؟')) {
      onChange(slices.filter(s => s.id !== id));
      if (editingId === id) {
        setEditingId(null);
      }
    }
  };

  const handleClearAllSlices = () => {
    if (window.confirm('هل أنت متأكد من حذف وتصفير كافة الشرائح الاستهلاكية؟')) {
      onChange([]);
      setEditingId(null);
    }
  };

  const handleResetDefaultSlices = () => {
    if (window.confirm('هل ترغب في استعادة الشرائح الاستهلاكية النموذجية القياسية؟')) {
      const defaultSlices: ConsumptionSliceTier[] = [
        {
          id: 'slice-1',
          name: 'الشريحة الأولى (الاستهلاك الأساسي)',
          category: 'all',
          minKwh: 0,
          maxKwh: 100,
          ratePerKwh: 0,
          fixedAdditionalFee: 0,
          color: 'emerald',
          notes: 'دعم صغار المستهلكين المنزليين (0 - 100 ك.و)'
        },
        {
          id: 'slice-2',
          name: 'الشريحة الثانية (الاستهلاك المتوسط)',
          category: 'all',
          minKwh: 101,
          maxKwh: 300,
          ratePerKwh: 0,
          fixedAdditionalFee: 0,
          color: 'amber',
          notes: 'الاستهلاك المنزلي والتجاري المتوسط (101 - 300 ك.و)'
        },
        {
          id: 'slice-3',
          name: 'الشريحة الثالثة (الاستهلاك الكثيف)',
          category: 'all',
          minKwh: 301,
          maxKwh: null,
          ratePerKwh: 0,
          fixedAdditionalFee: 0,
          color: 'rose',
          notes: 'الاستهلاك الكثيف والورش (> 300 ك.و)'
        }
      ];
      onChange(defaultSlices);
      setEditingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Layers className="w-4 h-4" />
          </span>
          <div>
            <h5 className="font-bold text-slate-200 text-xs">مصفوفة الشرائح التصاعدية (Tiered Slices Matrix)</h5>
            <p className="text-[10px] text-slate-400">تحدد أسعار الكيلوواط وسقوف الكميات لكل شريحة استهلاك</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {slices.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllSlices}
              className="text-[11px] text-rose-400 hover:text-rose-300 px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>حذف كافة الشرائح</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleStartAdd}
            className="text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة شريحة جديدة</span>
          </button>
        </div>
      </div>

      {/* Slices Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {slices.map((slice, idx) => {
          const isEditing = editingId === slice.id;

          if (isEditing) {
            return (
              <div
                key={slice.id}
                className="bg-slate-950 p-4 rounded-xl border-2 border-amber-500/80 space-y-3 shadow-lg text-xs"
              >
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <span className="font-bold text-amber-400">تعديل الشريحة #{idx + 1}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      className="p-1 rounded bg-emerald-500 text-slate-950 hover:bg-emerald-400 cursor-pointer"
                      title="حفظ"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                      title="إلغاء"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 text-[10px] mb-1">اسم الشريحة</label>
                  <input
                    type="text"
                    value={editForm.name || ''}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1 px-2 text-slate-200 text-right focus:outline-none focus:border-amber-500 font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">الحد الأدنى (ك.و)</label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.minKwh ?? 0}
                      onChange={e => setEditForm({ ...editForm, minKwh: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1 px-2 text-slate-200 text-right font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">الحد الأعلى (فارغ = مفتوح)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="غير محدود"
                      value={editForm.maxKwh !== null && editForm.maxKwh !== undefined ? editForm.maxKwh : ''}
                      onChange={e => {
                        const val = e.target.value;
                        setEditForm({ ...editForm, maxKwh: val === '' ? null : parseFloat(val) || 0 });
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1 px-2 text-slate-200 text-right font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">سعر الكيلوواط ({currency})</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={editForm.ratePerKwh ?? 0}
                      onChange={e => setEditForm({ ...editForm, ratePerKwh: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1 px-2 text-amber-400 font-bold text-right font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-1">رسم إضافي ({currency})</label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.fixedAdditionalFee ?? 0}
                      onChange={e => setEditForm({ ...editForm, fixedAdditionalFee: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1 px-2 text-slate-200 text-right font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 text-[10px] mb-1">القطاع المطبق عليه</label>
                  <select
                    value={editForm.category || 'all'}
                    onChange={e => setEditForm({ ...editForm, category: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1 px-2 text-slate-300 text-right text-xs"
                  >
                    <option value="all">كافة القطاعات</option>
                    <option value="residential">السكني فقط</option>
                    <option value="commercial">التجاري فقط</option>
                    <option value="industrial">الصناعي فقط</option>
                    <option value="agricultural">الزراعي فقط</option>
                    <option value="government">الحكومي فقط</option>
                  </select>
                </div>
              </div>
            );
          }

          const badgeColor = slice.color === 'emerald'
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            : slice.color === 'rose'
            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            : 'bg-amber-500/10 text-amber-400 border-amber-500/30';

          return (
            <div
              key={slice.id}
              className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between text-xs space-y-3"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                    شريحة #{idx + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(slice)}
                      className="p-1 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                      title="تعديل"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSlice(slice.id)}
                      className="p-1 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="font-bold text-slate-200 text-sm">{slice.name}</div>

                <div className="flex items-center justify-between text-slate-400 text-[11px] bg-slate-900/60 p-2 rounded-lg">
                  <span>نطاق الاستهلاك:</span>
                  <span className="font-mono font-bold text-slate-200">
                    من {slice.minKwh} {slice.maxKwh !== null ? `إلى ${slice.maxKwh}` : 'فما فوق'} ك.و
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>سعر الكيلوواط:</span>
                  <span className="font-mono font-black text-amber-400 text-sm">
                    {slice.ratePerKwh.toLocaleString()} {currency}
                  </span>
                </div>

                {slice.fixedAdditionalFee ? (
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>رسم إضافي:</span>
                    <span className="font-mono text-slate-300">
                      +{slice.fixedAdditionalFee.toLocaleString()} {currency}
                    </span>
                  </div>
                ) : null}
              </div>

              {slice.notes && (
                <div className="text-[10px] text-slate-500 border-t border-slate-900 pt-1.5 flex items-center gap-1">
                  <Info className="w-3 h-3 text-slate-600 shrink-0" />
                  <span className="truncate">{slice.notes}</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Add new slice button card */}
        {editingId === null && (
          <button
            type="button"
            onClick={handleStartAdd}
            className="border-2 border-dashed border-slate-800 hover:border-amber-500/50 rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-amber-400 transition-all cursor-pointer bg-slate-950/20 hover:bg-amber-500/5"
          >
            <Plus className="w-6 h-6" />
            <span className="font-bold text-xs">إضافة شريحة استهلاك جديدة</span>
          </button>
        )}
      </div>
    </div>
  );
};
