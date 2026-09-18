import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Download, FileSpreadsheet, FileText, FileJson, Check, X, 
  Settings2, CheckSquare, Square, Users, Filter, Sparkles
} from 'lucide-react';
import { Subscriber } from '../types';
import { 
  SUBSCRIBER_EXPORT_COLUMNS, 
  exportSubscribersToExcel, 
  exportSubscribersToCSV, 
  exportSubscribersToJSON 
} from '../utils/subscriberExportImportUtils';

interface SubscribersExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  allSubscribers: Subscriber[];
  filteredSubscribers: Subscriber[];
  selectedIds: string[];
}

export const SubscribersExportModal: React.FC<SubscribersExportModalProps> = ({
  isOpen,
  onClose,
  allSubscribers,
  filteredSubscribers,
  selectedIds
}) => {
  const [scope, setScope] = useState<'all' | 'filtered' | 'selected'>(
    selectedIds.length > 0 ? 'selected' : (filteredSubscribers.length < allSubscribers.length ? 'filtered' : 'all')
  );
  const [format, setFormat] = useState<'xlsx' | 'csv' | 'json'>('xlsx');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    SUBSCRIBER_EXPORT_COLUMNS.filter(c => c.default).map(c => c.id)
  );
  const [customFileName, setCustomFileName] = useState('');

  if (!isOpen) return null;

  // Determine which list to export
  const getExportData = (): Subscriber[] => {
    switch (scope) {
      case 'selected':
        return allSubscribers.filter(s => selectedIds.includes(s.id));
      case 'filtered':
        return filteredSubscribers;
      default:
        return allSubscribers;
    }
  };

  const targetSubscribers = getExportData();

  const toggleColumn = (id: string) => {
    setSelectedColumns(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const selectAllColumns = () => {
    setSelectedColumns(SUBSCRIBER_EXPORT_COLUMNS.map(c => c.id));
  };

  const selectDefaultColumns = () => {
    setSelectedColumns(SUBSCRIBER_EXPORT_COLUMNS.filter(c => c.default).map(c => c.id));
  };

  const handleExecuteExport = () => {
    if (targetSubscribers.length === 0) {
      alert('لا توجد سجلات لتصديرها وفق النطاق المحدد.');
      return;
    }

    if (selectedColumns.length === 0) {
      alert('يرجى تحديد عمود واحد على الأقل للتصدير.');
      return;
    }

    const defaultName = `سجل_المشتركين_${scope === 'selected' ? 'المحددين_' : scope === 'filtered' ? 'المصفى_' : 'الكامل_'}${new Date().toISOString().split('T')[0]}`;
    const filename = (customFileName.trim() || defaultName).replace(/[^a-zA-Z0-9_\u0600-\u06FF\s-]/g, '');

    const options = {
      filename,
      format,
      customColumns: selectedColumns
    };

    if (format === 'xlsx') {
      exportSubscribersToExcel(targetSubscribers, options);
    } else if (format === 'csv') {
      exportSubscribersToCSV(targetSubscribers, options);
    } else if (format === 'json') {
      exportSubscribersToJSON(targetSubscribers, options);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right z-10 my-auto flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="p-5 md:p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 shrink-0">
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center justify-end gap-2">
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 font-mono">
                  UTF-8 & Excel Ready
                </span>
                <h3 className="text-lg font-black text-white">تصدير سجل المشتركين المعتمد</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                تصدير السجلات بترتيب منطقي وعناوين عربية سليمة 100% متوافقة مع Excel
              </p>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl">
              <Download className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-5 md:p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          {/* 1. Export Scope Selection */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-300 block">
              1. نطاق المشتركين المراد تصديرهم:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                  scope === 'all'
                    ? 'bg-amber-500/10 border-amber-500 text-slate-100 ring-1 ring-amber-500/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Users className={`w-4 h-4 ${scope === 'all' ? 'text-amber-400' : 'text-slate-500'}`} />
                  <span className="font-mono text-xs font-bold text-amber-400">{allSubscribers.length}</span>
                </div>
                <div className="text-xs font-bold text-slate-200">كامل المشتركين</div>
                <div className="text-[10px] text-slate-500">جميع السجلات المسجلة بالنظام</div>
              </button>

              <button
                type="button"
                onClick={() => setScope('filtered')}
                className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                  scope === 'filtered'
                    ? 'bg-amber-500/10 border-amber-500 text-slate-100 ring-1 ring-amber-500/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Filter className={`w-4 h-4 ${scope === 'filtered' ? 'text-amber-400' : 'text-slate-500'}`} />
                  <span className="font-mono text-xs font-bold text-amber-400">{filteredSubscribers.length}</span>
                </div>
                <div className="text-xs font-bold text-slate-200">المشتركون المصفون</div>
                <div className="text-[10px] text-slate-500">وفق البحث والفلاتر النشطة</div>
              </button>

              <button
                type="button"
                disabled={selectedIds.length === 0}
                onClick={() => setScope('selected')}
                className={`p-3 rounded-2xl border text-right transition-all cursor-pointer ${
                  selectedIds.length === 0
                    ? 'opacity-40 bg-slate-950 border-slate-850 cursor-not-allowed text-slate-600'
                    : scope === 'selected'
                    ? 'bg-amber-500/10 border-amber-500 text-slate-100 ring-1 ring-amber-500/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <CheckSquare className={`w-4 h-4 ${scope === 'selected' ? 'text-amber-400' : 'text-slate-500'}`} />
                  <span className="font-mono text-xs font-bold text-amber-400">{selectedIds.length}</span>
                </div>
                <div className="text-xs font-bold text-slate-200">المحددون فقط</div>
                <div className="text-[10px] text-slate-500">تم اختيارهم يدوياً من الجدول</div>
              </button>
            </div>
          </div>

          {/* 2. Format Selection */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-300 block">
              2. تنسيق الملف المخرَج:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setFormat('xlsx')}
                className={`p-3.5 rounded-2xl border text-right flex items-center gap-3 transition-all cursor-pointer ${
                  format === 'xlsx'
                    ? 'bg-emerald-500/10 border-emerald-500 text-slate-100 ring-1 ring-emerald-500/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">إكسل (.xlsx)</div>
                  <div className="text-[10px] text-slate-400">تنسيق RTL معتمد ومقروء 100%</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormat('csv')}
                className={`p-3.5 rounded-2xl border text-right flex items-center gap-3 transition-all cursor-pointer ${
                  format === 'csv'
                    ? 'bg-cyan-500/10 border-cyan-500 text-slate-100 ring-1 ring-cyan-500/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">CSV عربي (BOM)</div>
                  <div className="text-[10px] text-slate-400">ترميز UTF-8 بدون تشويه</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormat('json')}
                className={`p-3.5 rounded-2xl border text-right flex items-center gap-3 transition-all cursor-pointer ${
                  format === 'json'
                    ? 'bg-purple-500/10 border-purple-500 text-slate-100 ring-1 ring-purple-500/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
                  <FileJson className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">ملف JSON</div>
                  <div className="text-[10px] text-slate-400">لقواعد البيانات والنسخ الاحتياطي</div>
                </div>
              </button>
            </div>
          </div>

          {/* 3. Column Selection */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllColumns}
                  className="text-[11px] text-amber-400 hover:underline font-bold cursor-pointer"
                >
                  تحديد الكل ({SUBSCRIBER_EXPORT_COLUMNS.length})
                </button>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={selectDefaultColumns}
                  className="text-[11px] text-slate-400 hover:text-white font-bold cursor-pointer"
                >
                  الافتراضي
                </button>
              </div>
              <label className="text-xs font-bold text-slate-300">
                3. الأعمدة المضمنة ({selectedColumns.length} محددة):
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-950 p-3.5 rounded-2xl border border-slate-800 max-h-48 overflow-y-auto">
              {SUBSCRIBER_EXPORT_COLUMNS.map(col => {
                const isSelected = selectedColumns.includes(col.id);
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => toggleColumn(col.id)}
                    className={`p-2 rounded-xl text-right text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-900 text-slate-500 border border-slate-800 hover:text-slate-300'
                    }`}
                  >
                    <span>{col.label}</span>
                    {isSelected ? <Check className="w-3.5 h-3.5 text-amber-400" /> : <Square className="w-3.5 h-3.5 text-slate-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Optional Custom File Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400">
              اسم الملف المخصص (اختياري):
            </label>
            <input
              type="text"
              placeholder={`سجل_المشتركين_${new Date().toISOString().split('T')[0]}`}
              value={customFileName}
              onChange={(e) => setCustomFileName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 md:p-5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            إلغاء
          </button>

          <button
            onClick={handleExecuteExport}
            disabled={targetSubscribers.length === 0}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-7 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95"
          >
            <Download className="w-4 h-4 text-slate-950" />
            <span>تصدير وتحميل ({targetSubscribers.length} مشترك)</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
