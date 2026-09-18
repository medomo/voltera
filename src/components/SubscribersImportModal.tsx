import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, FileSpreadsheet, FileText, FileJson, CheckCircle2, AlertTriangle, 
  X, RefreshCw, Sparkles, Download, ShieldCheck, Filter, ArrowRight, 
  Database, UserCheck, AlertCircle, Copy, Check
} from 'lucide-react';
import { Subscriber, User } from '../types';
import { 
  parseSubscribersFromFile, 
  parseSubscribersFromText, 
  downloadSubscribersSampleTemplate, 
  ParseResult, 
  ParsedSubscriberRow,
  translateTariff,
  translateStatus
} from '../utils/subscriberExportImportUtils';
import { getNextSubscriberCode } from '../utils/sequenceUtils';
import { syncBulkSubscribersToCloud, deduplicateSubscribers } from '../lib/database';

interface SubscribersImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingSubscribers: Subscriber[];
  currentUser: User;
  onSubscribersImported: (updatedList: Subscriber[], addedCount: number, updatedCount: number) => void;
  onAddAuditLog: (log: any) => void;
}

export const SubscribersImportModal: React.FC<SubscribersImportModalProps> = ({
  isOpen,
  onClose,
  existingSubscribers,
  currentUser,
  onSubscribersImported,
  onAddAuditLog
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [duplicatePolicy, setDuplicatePolicy] = useState<'skip' | 'update' | 'force_new'>('skip');
  const [filterMode, setFilterMode] = useState<'all' | 'valid' | 'duplicates' | 'errors'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importSuccessResult, setImportSuccessResult] = useState<{ added: number; updated: number; skipped: number } | null>(null);

  const resetState = () => {
    setSelectedFile(null);
    setPastedText('');
    setParseResult(null);
    setImportSuccessResult(null);
    setIsParsing(false);
    setIsImporting(false);
    setCurrentPage(1);
    setFilterMode('all');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileSelect = async (file: File) => {
    if (!file) return;
    setSelectedFile(file);
    setIsParsing(true);
    try {
      const result = await parseSubscribersFromFile(file, existingSubscribers);
      setParseResult(result);
      setCurrentPage(1);
    } catch (err: any) {
      alert(`عذراً، حدث خطأ أثناء قراءة الملف: ${err.message || err}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleParsePastedText = () => {
    if (!pastedText.trim()) {
      alert('يرجى لصق بيانات المشتركين أولاً.');
      return;
    }
    setIsParsing(true);
    try {
      const result = parseSubscribersFromText(pastedText, existingSubscribers);
      setParseResult(result);
      setCurrentPage(1);
    } catch (err: any) {
      alert(`عذراً، حدث خطأ أثناء تحليل النص: ${err.message || err}`);
    } finally {
      setIsParsing(false);
    }
  };

  // Filtered rows for the preview table
  const filteredRows = useMemo(() => {
    if (!parseResult) return [];
    switch (filterMode) {
      case 'valid':
        return parseResult.rows.filter(r => r.isValid && !r.isDuplicateInFile && !r.isExistingInDb);
      case 'duplicates':
        return parseResult.rows.filter(r => r.isDuplicateInFile || r.isExistingInDb);
      case 'errors':
        return parseResult.rows.filter(r => !r.isValid);
      default:
        return parseResult.rows;
    }
  }, [parseResult, filterMode]);

  const itemsPerPage = 15;
  const totalPages = Math.ceil(filteredRows.length / itemsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(start, start + itemsPerPage);
  }, [filteredRows, currentPage]);

  const handleExecuteImport = async () => {
    if (!parseResult || parseResult.rows.length === 0) return;

    setIsImporting(true);
    setImportProgress(20);

    try {
      const existingMap = new Map<string, Subscriber>();
      existingSubscribers.forEach(s => {
        const key = (s.meterNumber || '').trim().toLowerCase();
        if (key) existingMap.set(key, s);
      });

      let addedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;

      const workingList = [...existingSubscribers];
      const seenMetersInSession = new Set<string>(existingSubscribers.map(s => (s.meterNumber || '').trim().toLowerCase()));

      let currentCodeSeq = 1000;
      existingSubscribers.forEach(s => {
        const code = s.subscriberCode || s.id;
        const matches = code.match(/\d+/g);
        if (matches) {
          matches.forEach(m => {
            const num = parseInt(m, 10);
            if (!isNaN(num) && num > currentCodeSeq && num < 99999999) currentCodeSeq = num;
          });
        }
      });

      const newSubsToAdd: Subscriber[] = [];

      for (let i = 0; i < parseResult.rows.length; i++) {
        const row = parseResult.rows[i];
        if (!row.isValid) {
          skippedCount++;
          continue;
        }

        const meterLower = row.meterNumber.trim().toLowerCase();

        // Check if existing in DB
        const existingSub = existingMap.get(meterLower);

        if (existingSub) {
          if (duplicatePolicy === 'skip') {
            skippedCount++;
            continue;
          } else if (duplicatePolicy === 'update') {
            // Update existing subscriber data
            const subIdx = workingList.findIndex(s => s.id === existingSub.id);
            if (subIdx !== -1) {
              const validCoords = (row.coordinates && typeof row.coordinates.lat === 'number' && typeof row.coordinates.lng === 'number') 
                ? row.coordinates 
                : (workingList[subIdx].coordinates || undefined);

              workingList[subIdx] = {
                ...workingList[subIdx],
                name: row.name || workingList[subIdx].name,
                phone: row.phone || workingList[subIdx].phone,
                zone: row.zone || workingList[subIdx].zone,
                transformer: row.transformer || workingList[subIdx].transformer,
                tariffType: row.tariffType || workingList[subIdx].tariffType,
                status: row.status || workingList[subIdx].status,
                initialReading: (row.initialReading !== undefined && row.initialReading > 0) ? row.initialReading : workingList[subIdx].initialReading,
                currentReading: (workingList[subIdx].currentReading === 0 && row.initialReading > 0) ? row.initialReading : workingList[subIdx].currentReading,
                openingBalance: row.openingBalance !== undefined ? row.openingBalance : workingList[subIdx].openingBalance,
                ...(validCoords ? { coordinates: validCoords } : {})
              };
              if (!validCoords) {
                delete (workingList[subIdx] as any).coordinates;
              }
              updatedCount++;
            }
            continue;
          } else if (duplicatePolicy === 'force_new') {
            // Generate unique meter number
            const uniqueMeter = `${row.meterNumber}-NEW-${Date.now().toString().slice(-4)}`;
            currentCodeSeq++;
            const validCoords = (row.coordinates && typeof row.coordinates.lat === 'number' && typeof row.coordinates.lng === 'number') ? row.coordinates : undefined;
            const newSub: Subscriber = {
              id: `sub-${Date.now()}-${i}`,
              subscriberCode: `SUB-${currentCodeSeq}`,
              name: row.name,
              phone: row.phone || '000000000',
              meterNumber: uniqueMeter,
              zone: row.zone || 'المنطقة الرئيسية',
              transformer: row.transformer || '',
              tariffType: row.tariffType,
              status: row.status,
              initialReading: row.initialReading || 0,
              currentReading: row.initialReading || 0,
              openingBalance: row.openingBalance || 0,
              currentBalance: row.openingBalance || 0,
              ...(validCoords ? { coordinates: validCoords } : {}),
              createdAt: new Date().toISOString()
            };
            newSubsToAdd.push(newSub);
            addedCount++;
            continue;
          }
        }

        // Brand new subscriber
        if (seenMetersInSession.has(meterLower)) {
          // Duplicate within same imported file
          if (duplicatePolicy === 'skip') {
            skippedCount++;
            continue;
          } else if (duplicatePolicy === 'force_new') {
            const uniqueMeter = `${row.meterNumber}-${i + 1}`;
            currentCodeSeq++;
            const validCoords = (row.coordinates && typeof row.coordinates.lat === 'number' && typeof row.coordinates.lng === 'number') ? row.coordinates : undefined;
            const newSub: Subscriber = {
              id: `sub-${Date.now()}-${i}`,
              subscriberCode: `SUB-${currentCodeSeq}`,
              name: row.name,
              phone: row.phone || '000000000',
              meterNumber: uniqueMeter,
              zone: row.zone || 'المنطقة الرئيسية',
              transformer: row.transformer || '',
              tariffType: row.tariffType,
              status: row.status,
              initialReading: row.initialReading || 0,
              currentReading: row.initialReading || 0,
              openingBalance: row.openingBalance || 0,
              currentBalance: row.openingBalance || 0,
              ...(validCoords ? { coordinates: validCoords } : {}),
              createdAt: new Date().toISOString()
            };
            newSubsToAdd.push(newSub);
            seenMetersInSession.add(uniqueMeter.toLowerCase());
            addedCount++;
            continue;
          } else {
            skippedCount++;
            continue;
          }
        }

        seenMetersInSession.add(meterLower);
        currentCodeSeq++;
        const validCoords = (row.coordinates && typeof row.coordinates.lat === 'number' && typeof row.coordinates.lng === 'number') ? row.coordinates : undefined;
        const newSub: Subscriber = {
          id: `sub-${Date.now()}-${i}`,
          subscriberCode: row.subscriberCode || `SUB-${currentCodeSeq}`,
          name: row.name,
          phone: row.phone || '000000000',
          meterNumber: row.meterNumber,
          zone: row.zone || 'المنطقة الرئيسية',
          transformer: row.transformer || '',
          tariffType: row.tariffType,
          status: row.status,
          initialReading: row.initialReading || 0,
          currentReading: row.initialReading || 0,
          openingBalance: row.openingBalance || 0,
          currentBalance: row.openingBalance || 0,
          ...(validCoords ? { coordinates: validCoords } : {}),
          createdAt: new Date().toISOString()
        };
        newSubsToAdd.push(newSub);
        addedCount++;
      }

      setImportProgress(60);

      const finalList = deduplicateSubscribers([...newSubsToAdd, ...workingList]);

      setImportProgress(85);

      // Sync with cloud database
      await syncBulkSubscribersToCloud(finalList);

      setImportProgress(100);

      onSubscribersImported(finalList, addedCount, updatedCount);

      onAddAuditLog({
        id: `log-${Date.now()}`,
        userId: currentUser.id,
        username: currentUser.username,
        action: 'استيراد مشتركين مجمع',
        details: `تمت عملية استيراد المشتركين بنجاح: إضافة ${addedCount} مشترك جديد، وتحديث ${updatedCount} مشترك، وتجاهل ${skippedCount} مكرر/غير صالح.`,
        timestamp: new Date().toISOString()
      });

      setImportSuccessResult({
        added: addedCount,
        updated: updatedCount,
        skipped: skippedCount
      });
    } catch (err: any) {
      alert(`حدث خطأ أثناء إتمام عملية الاستيراد والمزامنة: ${err.message || err}`);
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        onClick={handleClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right z-10 my-auto flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="p-5 md:p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 shrink-0">
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center justify-end gap-2">
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-mono">
                  Smart Importer 2.0
                </span>
                <h3 className="text-lg font-black text-white">استيراد المشتركين الشامل</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                استيراد سجلات المشتركين من ملفات Excel (.xlsx / .xls) أو CSV أو لصق الجداول مباشرة مع التحقق الذكي من التكرار
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl">
              <Upload className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 md:p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          {importSuccessResult ? (
            /* Success Summary View */
            <div className="py-8 px-4 text-center space-y-6">
              <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h4 className="text-xl font-black text-white">تم استيراد وتحديث المشتركين بنجاح!</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  تم حفظ كافة السجلات وتثبيتها في قاعدة بيانات Firebase Firestore وتحديث أرصدة الحسابات فوراً.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400 block font-bold">مشتركون جدد</span>
                  <span className="text-2xl font-black font-mono text-emerald-400">+{importSuccessResult.added}</span>
                </div>
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400 block font-bold">مشتركون تم تحديثهم</span>
                  <span className="text-2xl font-black font-mono text-cyan-400">{importSuccessResult.updated}</span>
                </div>
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400 block font-bold">تم تخطيهم (مكرر/فارغ)</span>
                  <span className="text-2xl font-black font-mono text-slate-500">{importSuccessResult.skipped}</span>
                </div>
              </div>

              <div className="pt-4 flex justify-center gap-3">
                <button
                  onClick={handleClose}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-8 py-3 rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  إتمام وإغلاق النافذة
                </button>
              </div>
            </div>
          ) : !parseResult ? (
            /* Upload & Source Input Step */
            <div className="space-y-6">
              {/* Method Switcher Tabs */}
              <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 max-w-md mx-auto">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'upload'
                      ? 'bg-amber-500 text-slate-950 shadow-lg font-black'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>رفع ملف Excel أو CSV</span>
                </button>
                <button
                  onClick={() => setActiveTab('paste')}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'paste'
                      ? 'bg-amber-500 text-slate-950 shadow-lg font-black'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Copy className="w-4 h-4" />
                  <span>لصق جدول نصي مباشر</span>
                </button>
              </div>

              {activeTab === 'upload' ? (
                /* Drag & Drop File Zone */
                <div className="space-y-4">
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl p-8 md:p-12 text-center transition-all cursor-pointer relative overflow-hidden ${
                      isDragging 
                        ? 'border-amber-500 bg-amber-500/10' 
                        : 'border-slate-700/80 bg-slate-950/60 hover:border-slate-600 hover:bg-slate-950/90'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv,.tsv,.txt,.json"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          handleFileSelect(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />

                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-slate-900 border border-slate-800 text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner group-hover:scale-105 transition-transform">
                        {isParsing ? (
                          <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
                        ) : (
                          <Upload className="w-8 h-8" />
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <h4 className="text-base font-bold text-slate-100">
                          {isParsing ? 'جاري تحليل وقراءة الملف...' : 'اسحب وأفلت الملف هنا أو اضغط للاختيار من جهازك'}
                        </h4>
                        <p className="text-xs text-slate-400">
                          يدعم ملفات <span className="font-mono text-emerald-400 font-bold">Excel (.xlsx / .xls)</span> و <span className="font-mono text-cyan-400 font-bold">CSV</span> و <span className="font-mono text-amber-400 font-bold">JSON</span>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-2.5 px-6 rounded-xl text-xs inline-flex items-center gap-2 cursor-pointer shadow-md"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                        <span>تحديد ملف من الجهاز</span>
                      </button>
                    </div>
                  </div>

                  {/* Template Download Banner */}
                  <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-right">
                      <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                        <Download className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-200">تحميل القالب النموذجي الجاهز للاستيراد</h5>
                        <p className="text-[11px] text-slate-400">
                          قالب مرتب يحتوي على العناوين الصحيحة (الاسم، رقم العداد، الهاتف، المربع، المحول، التعرفة، الرصيد) مع أمثلة
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => downloadSubscribersSampleTemplate('xlsx')}
                        className="flex-1 sm:flex-initial bg-slate-900 hover:bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>قالب Excel (.xlsx)</span>
                      </button>
                      <button
                        onClick={() => downloadSubscribersSampleTemplate('csv')}
                        className="flex-1 sm:flex-initial bg-slate-900 hover:bg-cyan-950/40 text-cyan-400 border border-cyan-500/30 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>قالب CSV</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Paste Table Text Zone */
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <button
                        onClick={() => {
                          setPastedText(
                            `اسم المشترك\tرقم العداد\tرقم الهاتف\tالمربع الجغرافي\tالمحول\tنوع التعرفة\tالقراءة الابتدائية\tالرصيد الافتتاحي\n` +
                            `علي صالح أحمد\tM-201\t770112233\tالمنطقة (أ) - وسط المدينة\tمحول السوق\tسكني\t100\t0\n` +
                            `مخبز البركة الآلي\tM-202\t775443322\tالمنطقة (ب) - الشارع العام\tمحول التجاري\tتجاري\t520\t2500`
                          );
                        }}
                        className="text-amber-400 hover:underline font-bold text-[11px] cursor-pointer"
                      >
                        + إدراج نص تجريبي من إكسل
                      </button>
                      <label className="text-slate-300 font-bold">
                        انسخ صفوف المشتركين من Excel أو Google Sheets والصقها هنا:
                      </label>
                    </div>

                    <textarea
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      placeholder="الصق أعمدة المشتركين هنا (الاسم، رقم العداد، الهاتف، المربع، المحول، التعرفة، الرصيد الافتتاحي)..."
                      rows={9}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleParsePastedText}
                      disabled={isParsing || !pastedText.trim()}
                      className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black px-6 py-3 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
                    >
                      {isParsing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      <span>تحليل ومعاينة البيانات الملصوقة</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Review, Validation & Duplicate Policy Step */
            <div className="space-y-6">
              {/* Top Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl text-right">
                  <span className="text-[11px] text-slate-400 block font-bold">إجمالي السجلات بالملف</span>
                  <span className="text-xl font-black font-mono text-slate-100">{parseResult.totalParsed}</span>
                </div>

                <div className="bg-slate-950 border border-emerald-500/30 p-3.5 rounded-2xl text-right">
                  <span className="text-[11px] text-emerald-400 block font-bold">جاهز وصالح للاستيراد</span>
                  <span className="text-xl font-black font-mono text-emerald-400">{parseResult.validCount}</span>
                </div>

                <div className="bg-slate-950 border border-amber-500/30 p-3.5 rounded-2xl text-right">
                  <span className="text-[11px] text-amber-400 block font-bold">مكرر / مسجل مسبقاً</span>
                  <span className="text-xl font-black font-mono text-amber-400">
                    {parseResult.existingInDbCount + parseResult.duplicateInFileCount}
                  </span>
                </div>

                <div className="bg-slate-950 border border-rose-500/30 p-3.5 rounded-2xl text-right">
                  <span className="text-[11px] text-rose-400 block font-bold">بيانات ناقصة / غير صالحة</span>
                  <span className="text-xl font-black font-mono text-rose-400">{parseResult.errorCount}</span>
                </div>
              </div>

              {/* Duplicate Handling Policy Selector */}
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-amber-500/30 p-4.5 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  <h4 className="text-xs font-black text-white">سياسة التعامل مع أرقام العدادات والمشتركين المكررين:</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <label 
                    className={`flex items-start gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                      duplicatePolicy === 'skip' 
                        ? 'bg-amber-500/10 border-amber-500 text-slate-100 ring-1 ring-amber-500/30' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dupPolicy"
                      checked={duplicatePolicy === 'skip'}
                      onChange={() => setDuplicatePolicy('skip')}
                      className="mt-0.5 text-amber-500 accent-amber-500 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold block text-slate-200">تخطي المكررين (موصى به)</span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        تجاهل أي مشترك موجود مسبقاً بنفس رقم العداد لمنع تكرار الحسابات.
                      </span>
                    </div>
                  </label>

                  <label 
                    className={`flex items-start gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                      duplicatePolicy === 'update' 
                        ? 'bg-amber-500/10 border-amber-500 text-slate-100 ring-1 ring-amber-500/30' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dupPolicy"
                      checked={duplicatePolicy === 'update'}
                      onChange={() => setDuplicatePolicy('update')}
                      className="mt-0.5 text-amber-500 accent-amber-500 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold block text-slate-200">تحديث بيانات المشتركين الحاليين</span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        تحديث الهاتف، المنطقة، المحول، والتعرفة للمشترك المسجل مسبقاً.
                      </span>
                    </div>
                  </label>

                  <label 
                    className={`flex items-start gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
                      duplicatePolicy === 'force_new' 
                        ? 'bg-amber-500/10 border-amber-500 text-slate-100 ring-1 ring-amber-500/30' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="dupPolicy"
                      checked={duplicatePolicy === 'force_new'}
                      onChange={() => setDuplicatePolicy('force_new')}
                      className="mt-0.5 text-amber-500 accent-amber-500 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold block text-slate-200">توليد أرقام جديدة للمكرر</span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        إنشاء حساب جديد مع إضافة لاحقة فريدة لرقم العداد المكرر.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Filter Tabs for Preview Table */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => { setFilterMode('all'); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filterMode === 'all' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    عرض الكل ({parseResult.totalParsed})
                  </button>
                  <button
                    onClick={() => { setFilterMode('valid'); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filterMode === 'valid' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    الصالح فقط ({parseResult.validCount})
                  </button>
                  <button
                    onClick={() => { setFilterMode('duplicates'); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filterMode === 'duplicates' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    المكرر فقط ({parseResult.existingInDbCount + parseResult.duplicateInFileCount})
                  </button>
                  <button
                    onClick={() => { setFilterMode('errors'); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filterMode === 'errors' ? 'bg-rose-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    الأخطاء فقط ({parseResult.errorCount})
                  </button>
                </div>

                <button
                  onClick={resetState}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer font-bold"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>إعادة اختيار ملف آخر</span>
                </button>
              </div>

              {/* Preview Table */}
              <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto max-h-[350px]">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-slate-300 border-b border-slate-800 font-bold sticky top-0 z-10">
                        <th className="p-3 w-12 text-center">#</th>
                        <th className="p-3">اسم المشترك</th>
                        <th className="p-3">رقم العداد</th>
                        <th className="p-3">الهاتف</th>
                        <th className="p-3">المربع الجغرافي</th>
                        <th className="p-3">المحول</th>
                        <th className="p-3">التعرفة</th>
                        <th className="p-3 text-cyan-400">القراءة الافتتاحية</th>
                        <th className="p-3">الرصيد الافتتاحي</th>
                        <th className="p-3 text-center">حالة السجل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {paginatedRows.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="p-6 text-center text-slate-500">
                            لا توجد صفوف تطابق الفلتر المحدد.
                          </td>
                        </tr>
                      ) : (
                        paginatedRows.map((row) => (
                          <tr key={row.rawIndex} className="hover:bg-slate-900/50 transition-colors">
                            <td className="p-3 text-center font-mono text-slate-500">{row.rawIndex}</td>
                            <td className="p-3 font-bold text-slate-100">{row.name}</td>
                            <td className="p-3 font-mono font-bold text-amber-400">{row.meterNumber}</td>
                            <td className="p-3 font-mono text-slate-400 dir-ltr text-right">{row.phone || '-'}</td>
                            <td className="p-3 text-slate-300">{row.zone}</td>
                            <td className="p-3 text-slate-400">{row.transformer || '-'}</td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                {translateTariff(row.tariffType)}
                              </span>
                            </td>
                            <td className="p-3 font-mono font-bold text-cyan-400">
                              <span className="bg-cyan-950/60 text-cyan-300 border border-cyan-800/40 px-2 py-0.5 rounded-md">
                                {row.initialReading.toLocaleString()}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-slate-300">{row.openingBalance.toLocaleString()}</td>
                            <td className="p-3 text-center">
                              {!row.isValid ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30" title={row.errors.join('، ')}>
                                  <AlertTriangle className="w-3 h-3" />
                                  {row.errors[0] || 'غير صالح'}
                                </span>
                              ) : row.isExistingInDb ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                  <UserCheck className="w-3 h-3" />
                                  مسجل مسبقاً
                                </span>
                              ) : row.isDuplicateInFile ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                  <AlertCircle className="w-3 h-3" />
                                  مكرر بالملف
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                  <Check className="w-3 h-3" />
                                  جاهز للاستيراد
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Pagination */}
                {totalPages > 1 && (
                  <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                    <div>
                      صفحة <span className="font-bold text-slate-200">{currentPage}</span> من <span className="font-bold text-slate-200">{totalPages}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-lg text-slate-300 cursor-pointer"
                      >
                        السابق
                      </button>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 rounded-lg text-slate-300 cursor-pointer"
                      >
                        التالي
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        {!importSuccessResult && (
          <div className="p-4 md:p-5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0">
            <button
              onClick={handleClose}
              disabled={isImporting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              إلغاء
            </button>

            {parseResult && (
              <button
                onClick={handleExecuteImport}
                disabled={isImporting || parseResult.validCount === 0}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50 text-slate-950 font-black px-7 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>جارِ الاستيراد والمزامنة السحابية ({importProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 text-slate-950" />
                    <span>
                      تأكيد استيراد المشتركين الآن
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};
