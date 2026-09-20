import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings2, MoveUp, MoveDown, Eye, EyeOff, RotateCcw, Check, Sparkles } from 'lucide-react';
import { ColumnDefinition } from './types';

interface ColumnSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnDefinition[];
  onChangeColumns: (cols: ColumnDefinition[]) => void;
  onResetDefault: () => void;
}

export const ColumnSettingsDrawer: React.FC<ColumnSettingsDrawerProps> = ({
  isOpen,
  onClose,
  columns,
  onChangeColumns,
  onResetDefault
}) => {
  if (!isOpen) return null;

  const toggleColumn = (id: string) => {
    onChangeColumns(
      columns.map(c => (c.id === id ? { ...c, visible: !c.visible } : c))
    );
  };

  const moveColumn = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= columns.length) return;
    const newCols = [...columns];
    const temp = newCols[index];
    newCols[index] = newCols[targetIndex];
    newCols[targetIndex] = temp;
    onChangeColumns(newCols);
  };

  const applyPreset = (preset: 'standard' | 'field' | 'financial' | 'comprehensive') => {
    switch (preset) {
      case 'field':
        // Field Collector Preset: meter, name, phone, zone, overdue, currentDue, totalDue, fieldPaid, receiptNumber, subscriberSignature, notes
        onChangeColumns(
          columns.map(c => ({
            ...c,
            visible: ['index', 'meterNumber', 'name', 'phone', 'zone', 'overdueAmount', 'currentDue', 'totalDue', 'fieldPaid', 'receiptNumber', 'subscriberSignature', 'notes'].includes(c.id)
          }))
        );
        break;
      case 'financial':
        // Financial Audit Preset: includes collectorName, opening, billed, collected, balances
        onChangeColumns(
          columns.map(c => ({
            ...c,
            visible: ['index', 'meterNumber', 'name', 'zone', 'collectorName', 'openingBalance', 'totalBilled', 'totalCollected', 'overdueAmount', 'currentDue', 'totalDue', 'collectionRate', 'paymentStatusLabel'].includes(c.id)
          }))
        );
        break;
      case 'comprehensive':
        // Show All
        onChangeColumns(columns.map(c => ({ ...c, visible: true })));
        break;
      case 'standard':
      default:
        onResetDefault();
        break;
    }
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="p-4 bg-slate-900 border-b border-slate-800 text-xs shrink-0 print:hidden space-y-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-amber-400" />
          <h4 className="font-black text-white text-xs">إدارة وترتيب أعمدة الكشف والطباعة:</h4>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-400 font-bold">قوالب جاهزة:</span>
          <button
            type="button"
            onClick={() => applyPreset('standard')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold cursor-pointer"
          >
            الافتراضي
          </button>
          <button
            type="button"
            onClick={() => applyPreset('field')}
            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-bold cursor-pointer"
          >
            📋 تحصيل ميداني
          </button>
          <button
            type="button"
            onClick={() => applyPreset('financial')}
            className="px-2.5 py-1 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 rounded-lg text-[11px] font-bold cursor-pointer"
          >
            💰 مالي ومحاسبي
          </button>
          <button
            type="button"
            onClick={() => applyPreset('comprehensive')}
            className="px-2.5 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded-lg text-[11px] font-bold cursor-pointer"
          >
            🌟 إظهار الكل
          </button>
          <button
            type="button"
            onClick={onResetDefault}
            className="px-2.5 py-1 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>إعادة ضبط</span>
          </button>
        </div>
      </div>

      {/* Grid of Columns with checkbox & up/down */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {columns.map((col, idx) => (
          <div
            key={col.id}
            className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
              col.visible
                ? 'bg-slate-950/80 border-amber-500/40 text-white'
                : 'bg-slate-950/30 border-slate-800/80 text-slate-500'
            }`}
          >
            <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-bold flex-1 truncate">
              <input
                type="checkbox"
                checked={col.visible}
                onChange={() => toggleColumn(col.id)}
                className="rounded accent-amber-500 cursor-pointer"
              />
              <span className="truncate" title={col.label}>{col.label}</span>
            </label>

            <div className="flex items-center gap-0.5 shrink-0 mr-1">
              <button
                type="button"
                onClick={() => moveColumn(idx, 'up')}
                disabled={idx === 0}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-20 rounded cursor-pointer"
                title="تقديم العمود"
              >
                <MoveUp className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => moveColumn(idx, 'down')}
                disabled={idx === columns.length - 1}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-20 rounded cursor-pointer"
                title="تأخير العمود"
              >
                <MoveDown className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
