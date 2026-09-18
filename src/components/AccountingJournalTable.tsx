import React from 'react';
import { Eye, Edit3, Trash2, RotateCcw, XCircle, Lock, FileText, Calendar, ArrowUpRight, ArrowDownLeft, DollarSign, AlignRight } from 'lucide-react';
import { SystemSettings } from '../types';

export interface JournalEntry {
  id: string;
  voucherNumber: string;
  date: string;
  type: 'billing' | 'receipt' | 'expense' | 'advance' | 'manual' | 'adjustment';
  typeLabel: string;
  debitAccountCode: string;
  debitAccountName: string;
  creditAccountCode: string;
  creditAccountName: string;
  amount: number;
  description: string;
  referenceId?: string;
  isPosted?: boolean;
}

interface AccountingJournalTableProps {
  entries: JournalEntry[];
  settings: SystemSettings;
  manualJournalIds: string[];
  isMonthClosed: (dateStr: string) => boolean;
  onSelectForPrint: (entry: JournalEntry) => void;
  onReverseEntry: (entry: JournalEntry) => void;
  onEditEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  onRejectOrDeleteEntry: (entry: JournalEntry) => void;
}

export const AccountingJournalTable: React.FC<AccountingJournalTableProps> = ({
  entries,
  settings,
  manualJournalIds,
  isMonthClosed,
  onSelectForPrint,
  onReverseEntry,
  onEditEntry,
  onDeleteEntry,
  onRejectOrDeleteEntry,
}) => {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800/90 bg-slate-950/40 shadow-2xl backdrop-blur-xl">
      <table className="w-full text-xs text-right dir-rtl border-collapse">
        <thead className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-slate-200 font-bold border-b border-slate-800">
          <tr>
            <th className="p-4 text-center">
              <div className="flex items-center justify-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>رقم السند</span>
              </div>
            </th>
            <th className="p-4">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>التاريخ</span>
              </div>
            </th>
            <th className="p-4">نوع الحركة</th>
            <th className="p-4">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>الجانب المدين (من حـ/)</span>
              </div>
            </th>
            <th className="p-4">
              <div className="flex items-center gap-1.5 text-rose-400">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>الجانب الدائن (إلى حـ/)</span>
              </div>
            </th>
            <th className="p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-amber-400">
                <DollarSign className="w-3.5 h-3.5" />
                <span>المبلغ المالي</span>
              </div>
            </th>
            <th className="p-4">
              <div className="flex items-center gap-1.5">
                <AlignRight className="w-3.5 h-3.5 text-slate-400" />
                <span>البيان والشرح التفصيلي</span>
              </div>
            </th>
            <th className="p-4 text-center">الإجراءات</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 font-medium text-slate-200">
          {entries.map((entry, idx) => {
            const isClosed = isMonthClosed(entry.date);
            const isManual = entry.type === 'manual' || manualJournalIds.includes(entry.id);

            const rowBorderColor = entry.type === 'billing' 
              ? 'border-r-sky-500' 
              : entry.type === 'receipt' 
              ? 'border-r-emerald-500' 
              : entry.type === 'expense' 
              ? 'border-r-rose-500' 
              : 'border-r-amber-500';

            return (
              <tr
                key={entry.id}
                className={`transition-colors duration-150 border-r-4 ${rowBorderColor} ${
                  idx % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-950/30'
                } hover:bg-slate-850/60 ${
                  isClosed ? 'bg-rose-950/20' : ''
                }`}
              >
                <td className="p-4 font-mono font-black text-amber-400 text-center">
                  <div className="flex items-center justify-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800/80">
                    {isClosed && (
                      <Lock
                        className="w-3.5 h-3.5 text-rose-400 shrink-0"
                        title="فترة مالية مقفلة"
                      />
                    )}
                    <span className="tracking-wider">{entry.voucherNumber}</span>
                  </div>
                </td>
                <td className="p-4 font-mono text-slate-400">
                  <span className="bg-slate-950/40 px-2 py-0.5 rounded border border-slate-800/50 text-[11px]">{entry.date}</span>
                  {isClosed && (
                    <span className="block text-[9px] text-rose-400 font-bold mt-1">
                      مقفل 🔒
                    </span>
                  )}
                </td>
                <td className="p-4">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
                      entry.typeLabel === 'قيد تسوية عكسي'
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : entry.type === 'receipt'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : entry.type === 'billing'
                        ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                        : entry.type === 'expense'
                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        : entry.type === 'manual'
                        ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                        : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    }`}
                  >
                    {entry.typeLabel}
                  </span>
                </td>
                <td className="p-4 font-bold text-emerald-400">
                  <div className="flex flex-col">
                    <span className="text-slate-200">{entry.debitAccountName}</span>
                    <span className="font-mono text-[10px] text-emerald-400/80 mt-0.5">
                      كود: {entry.debitAccountCode}
                    </span>
                  </div>
                </td>
                <td className="p-4 font-bold text-rose-400">
                  <div className="flex flex-col">
                    <span className="text-slate-200">{entry.creditAccountName}</span>
                    <span className="font-mono text-[10px] text-rose-400/80 mt-0.5">
                      كود: {entry.creditAccountCode}
                    </span>
                  </div>
                </td>
                <td className="p-4 text-center font-mono">
                  <div className="inline-block bg-slate-950/80 border border-slate-800 px-3 py-1 rounded-xl">
                    <span className="font-black text-amber-400 text-sm">
                      {entry.amount.toLocaleString()}
                    </span>{' '}
                    <span className="text-[10px] text-slate-500 font-bold">
                      {settings.currency}
                    </span>
                  </div>
                </td>
                <td className="p-4 text-slate-300 max-w-xs truncate text-[11px]">
                  {entry.description}
                </td>
                <td className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => onSelectForPrint(entry)}
                      className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/30 text-amber-400 rounded-xl transition-all cursor-pointer shadow-xs"
                      title="معاينة وطباعة سند القيد"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {isClosed ? (
                      <button
                        onClick={() => onReverseEntry(entry)}
                        className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-black shadow-xs"
                        title="إنشاء قيد تسوية عكسي لتصحيح هذه المعاملة المقفلة في الفترة المفتوحة الحالية"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>قيد عكسي</span>
                      </button>
                    ) : isManual ? (
                      <>
                        <button
                          onClick={() => onEditEntry(entry)}
                          className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/30 text-cyan-400 rounded-xl transition-all cursor-pointer shadow-xs"
                          title="تعديل القيد المحاسبي اليدوي"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteEntry(entry.id)}
                          className="p-2 bg-slate-950 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/30 text-rose-400 rounded-xl transition-all cursor-pointer shadow-xs"
                          title="حذف القيد المحاسبي اليدوي"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => onRejectOrDeleteEntry(entry)}
                        className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-black shadow-xs"
                        title="رفض المعاملة وحذف القيد المحاسبي نهائياً"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>رفض القيد</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}

          {entries.length === 0 && (
            <tr>
              <td colSpan={8} className="p-12 text-center text-slate-500 font-bold">
                لا توجد قيود يومية مطابقة لخيارات البحث المحددة.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
