import React, { useState } from 'react';
import { Plus, CheckSquare, Trash2, Settings } from 'lucide-react';

export interface ColumnDef {
  key: string;
  label: string;
  type: 'text' | 'number' | 'checkbox' | 'textarea' | 'select' | 'date';
  options?: { label: string; value: string }[];
}

interface Props {
  title: string;
  items: any[];
  columns?: ColumnDef[];
  onUpdateItems: (items: any[]) => void;
  activeColorClass: string;
}

export function GenericConfigTable({ title, items = [], columns, onUpdateItems, activeColorClass }: Props) {
  const defaultColumns: ColumnDef[] = [
    { key: 'name', label: 'الاسم / البيان', type: 'text' },
    { key: 'notes', label: 'ملاحظات', type: 'text' },
    { key: 'status', label: 'الحالة', type: 'checkbox' }
  ];

  const cols = columns || defaultColumns;

  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});

  const handleAdd = () => {
    setForm({
      id: `item-${Date.now()}`
    });
    setIsEditing(true);
    setSelectedId(null);
  };

  const handleEdit = () => {
    if (!selectedId) {
      alert('يرجى تحديد عنصر أولاً');
      return;
    }
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!form.id) return;
    
    if (cols.find(c => c.key === 'name') && !form.name) {
      alert('الرجاء إدخال الاسم');
      return;
    }

    const newItems = [...items];
    const index = newItems.findIndex(u => u.id === form.id);
    if (index >= 0) {
      newItems[index] = { ...newItems[index], ...form };
    } else {
      newItems.push(form);
    }
    onUpdateItems(newItems);
    setIsEditing(false);
    setSelectedId(form.id);
  };

  const handleDelete = () => {
    if (!selectedId) return;
    if (confirm('هل أنت متأكد من الحذف؟')) {
      const newItems = items.filter(u => u.id !== selectedId);
      onUpdateItems(newItems);
      setSelectedId(null);
      setForm({});
      setIsEditing(false);
    }
  };

  const handleSelect = (item: any) => {
    if (isEditing) return;
    setSelectedId(item.id);
    setForm(item);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="border-b border-slate-800 pb-2 mb-4">
        <h3 className="text-sm font-bold text-white flex items-center justify-end gap-2">
          <span>{title}</span>
          <Settings className={`w-4 h-4 ${activeColorClass}`} />
        </h3>
      </div>
      
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-right mb-4">
          {cols.map(col => (
            <div key={col.key} className={`flex items-center justify-end gap-2 ${col.type === 'textarea' ? 'col-span-full' : ''}`}>
              {col.type === 'checkbox' ? (
                <label className="flex items-center gap-2 cursor-pointer bg-slate-800 p-2 rounded w-full justify-end border border-slate-700">
                  <input type="checkbox" disabled={!isEditing} className="rounded bg-slate-950 border-slate-700 text-blue-500 disabled:opacity-50" checked={form[col.key] !== false && form[col.key] !== undefined ? form[col.key] : (col.key === 'status' ? true : false)} onChange={e => setForm({...form, [col.key]: e.target.checked})} />
                  <span className="text-xs text-slate-400">{col.key === 'status' ? 'نشط (مفعل)' : col.label}</span>
                </label>
              ) : col.type === 'select' ? (
                <select disabled={!isEditing} className="bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white text-right w-full disabled:opacity-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={form[col.key] !== undefined ? form[col.key] : ''} onChange={e => setForm({...form, [col.key]: e.target.value})}>
                  <option value="">اختيار...</option>
                  {col.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              ) : col.type === 'textarea' ? (
                <textarea disabled={!isEditing} className="bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white text-right w-full disabled:opacity-50 min-h-[100px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={form[col.key] !== undefined ? form[col.key] : ''} onChange={e => setForm({...form, [col.key]: e.target.value})} />
              ) : (
                <input type={col.type} disabled={!isEditing} className="bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white text-right w-full disabled:opacity-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={form[col.key] !== undefined ? form[col.key] : ''} onChange={e => setForm({...form, [col.key]: col.type === 'number' ? Number(e.target.value) : e.target.value})} />
              )}
              {col.type !== 'checkbox' && <label className="text-xs text-slate-400 w-24 shrink-0 font-medium">{col.label}</label>}
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-2 mb-4">
          {!isEditing ? (
            <>
              <button onClick={handleAdd} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 rounded hover:bg-emerald-600/30 transition-colors text-xs font-bold cursor-pointer">
                <Plus className="w-3.5 h-3.5" /> إضافة
              </button>
              <button onClick={handleEdit} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30 transition-colors text-xs font-bold cursor-pointer">
                <CheckSquare className="w-3.5 h-3.5" /> تعديل
              </button>
              <button onClick={handleDelete} className="flex items-center gap-1 px-3 py-1.5 bg-rose-600/20 text-rose-400 rounded hover:bg-rose-600/30 transition-colors text-xs font-bold cursor-pointer">
                <Trash2 className="w-3.5 h-3.5" /> حذف
              </button>
            </>
          ) : (
            <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded hover:bg-amber-500/30 transition-colors text-xs font-bold cursor-pointer">
              <CheckSquare className="w-3.5 h-3.5" /> حفظ البيانات
            </button>
          )}
        </div>

        {/* Data Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden border-t-0">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-2.5 font-medium whitespace-nowrap">الرقم</th>
                  {cols.map(col => (
                    <th key={col.key} className="p-2.5 font-medium whitespace-nowrap">{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {items.map((item, idx) => (
                  <tr 
                    key={item.id} 
                    onClick={() => handleSelect(item)}
                    className={`cursor-pointer transition-colors ${selectedId === item.id ? 'bg-blue-900/30' : 'hover:bg-slate-800/50'}`}
                  >
                    <td className="p-2.5 text-slate-400 whitespace-nowrap">{idx + 1}</td>
                    {cols.map(col => (
                      <td key={col.key} className="p-2.5 text-slate-300 whitespace-nowrap max-w-[200px] truncate">
                        {col.type === 'checkbox' 
                          ? (item[col.key] ? 'نعم' : 'لا') 
                          : col.type === 'select' 
                            ? (col.options?.find(o => o.value === item[col.key])?.label || item[col.key] || '-')
                            : (item[col.key] || '-')}
                      </td>
                    ))}
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={cols.length + 1} className="p-8 text-center text-slate-500 bg-slate-950/30">
                      لا توجد سجلات، يمكنك إضافة سجل جديد
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
