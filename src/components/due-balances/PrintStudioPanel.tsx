import React from 'react';
import { motion } from 'motion/react';
import { 
  SlidersHorizontal, Type, LayoutGrid, Palette, FileCheck, Eye, 
  FileDown, Printer, Maximize2, Sparkles, RotateCcw, CheckCircle2,
  FileSpreadsheet, ShieldAlert
} from 'lucide-react';

interface PrintStudioPanelProps {
  isOpen: boolean;
  onClose: () => void;
  printFontFamily: string;
  setPrintFontFamily: (f: string) => void;
  printFontSize: 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge' | 'custom';
  setPrintFontSize: (size: 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge' | 'custom') => void;
  customFontSizePx: number;
  setCustomFontSizePx: (px: number) => void;
  tableDensity: 'compact' | 'standard' | 'spacious';
  setTableDensity: (d: 'compact' | 'standard' | 'spacious') => void;
  printTheme: 'modern' | 'striped' | 'bordered' | 'minimal';
  setPrintTheme: (t: 'modern' | 'striped' | 'bordered' | 'minimal') => void;
  printOrientation: 'portrait' | 'landscape';
  setPrintOrientation: (o: 'portrait' | 'landscape') => void;
  paperMargin: 'compact' | 'standard' | 'spacious';
  setPaperMargin: (m: 'compact' | 'standard' | 'spacious') => void;
  rowsPerPage: number;
  setRowsPerPage: (r: number) => void;
  isCustomRowsPerPage: boolean;
  setIsCustomRowsPerPage: (b: boolean) => void;
  customRowsInput: string;
  setCustomRowsInput: (s: string) => void;
  showHeaderInPrint: boolean;
  setShowHeaderInPrint: (b: boolean) => void;
  showFilterBarInPrint: boolean;
  setShowFilterBarInPrint: (b: boolean) => void;
  showPageNumbersInPrint: boolean;
  setShowPageNumbersInPrint: (b: boolean) => void;
  totalsOnLastPageOnly: boolean;
  setTotalsOnLastPageOnly: (b: boolean) => void;
  showSignatures: boolean;
  setShowSignatures: (b: boolean) => void;
  signer1: string;
  setSigner1: (s: string) => void;
  signer2: string;
  setSigner2: (s: string) => void;
  signer3: string;
  setSigner3: (s: string) => void;
  customPrintNote: string;
  setCustomPrintNote: (s: string) => void;
  totalItemsCount: number;
  onOpenSheetPreview: () => void;
  onExportPDF: () => void;
  onPrint: () => void;
  isExportingPDF: boolean;
}

export const PrintStudioPanel: React.FC<PrintStudioPanelProps> = ({
  isOpen,
  onClose,
  printFontFamily,
  setPrintFontFamily,
  printFontSize,
  setPrintFontSize,
  customFontSizePx,
  setCustomFontSizePx,
  tableDensity,
  setTableDensity,
  printTheme,
  setPrintTheme,
  printOrientation,
  setPrintOrientation,
  paperMargin,
  setPaperMargin,
  rowsPerPage,
  setRowsPerPage,
  isCustomRowsPerPage,
  setIsCustomRowsPerPage,
  customRowsInput,
  setCustomRowsInput,
  showHeaderInPrint,
  setShowHeaderInPrint,
  showFilterBarInPrint,
  setShowFilterBarInPrint,
  showPageNumbersInPrint,
  setShowPageNumbersInPrint,
  totalsOnLastPageOnly,
  setTotalsOnLastPageOnly,
  showSignatures,
  setShowSignatures,
  signer1,
  setSigner1,
  signer2,
  setSigner2,
  signer3,
  setSigner3,
  customPrintNote,
  setCustomPrintNote,
  totalItemsCount,
  onOpenSheetPreview,
  onExportPDF,
  onPrint,
  isExportingPDF
}) => {
  if (!isOpen) return null;

  const estimatedPages = Math.ceil(totalItemsCount / Math.max(1, rowsPerPage));

  // Quick Strategy Presets
  const applyPreset = (preset: 'official' | 'economy' | 'field' | 'minimal') => {
    switch (preset) {
      case 'official':
        setPrintOrientation('portrait');
        setPrintFontSize('medium');
        setTableDensity('standard');
        setPrintTheme('modern');
        setRowsPerPage(14);
        setIsCustomRowsPerPage(false);
        setCustomRowsInput('14');
        setShowHeaderInPrint(true);
        setShowFilterBarInPrint(true);
        setShowPageNumbersInPrint(true);
        setShowSignatures(true);
        setTotalsOnLastPageOnly(true);
        break;
      case 'economy':
        setPrintOrientation('landscape');
        setPrintFontSize('small');
        setTableDensity('compact');
        setPrintTheme('striped');
        setRowsPerPage(25);
        setIsCustomRowsPerPage(false);
        setCustomRowsInput('25');
        setShowHeaderInPrint(true);
        setShowFilterBarInPrint(false);
        setShowPageNumbersInPrint(true);
        setShowSignatures(true);
        setTotalsOnLastPageOnly(true);
        break;
      case 'field':
        setPrintOrientation('portrait');
        setPrintFontSize('large');
        setTableDensity('spacious');
        setPrintTheme('bordered');
        setRowsPerPage(10);
        setIsCustomRowsPerPage(false);
        setCustomRowsInput('10');
        setShowHeaderInPrint(true);
        setShowFilterBarInPrint(true);
        setShowPageNumbersInPrint(true);
        setShowSignatures(true);
        setTotalsOnLastPageOnly(false);
        break;
      case 'minimal':
        setPrintOrientation('portrait');
        setPrintFontSize('small');
        setTableDensity('compact');
        setPrintTheme('minimal');
        setRowsPerPage(18);
        setIsCustomRowsPerPage(false);
        setCustomRowsInput('18');
        setShowHeaderInPrint(true);
        setShowFilterBarInPrint(true);
        setShowPageNumbersInPrint(true);
        setShowSignatures(false);
        setTotalsOnLastPageOnly(true);
        break;
    }
  };

  const handleCustomRowChange = (valStr: string) => {
    setCustomRowsInput(valStr);
    const num = parseInt(valStr, 10);
    if (!isNaN(num) && num > 0 && num <= 100) {
      setRowsPerPage(num);
      setIsCustomRowsPerPage(true);
    }
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="p-3 sm:p-5 bg-gradient-to-b from-slate-900 via-slate-900/98 to-slate-950 border-b border-amber-500/40 text-xs shrink-0 print:hidden shadow-2xl"
    >
      <div className="space-y-4 max-w-7xl mx-auto">
        
        {/* Studio Top Bar: Title, Page Counter & Strategy Presets */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-amber-500 to-amber-300 rounded-xl text-slate-950 font-black shadow-md shadow-amber-500/20">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-white text-xs sm:text-sm flex items-center gap-2">
                <span>استوديو تخصيص الطباعة وتنسيق مخرجات الورق (Print Studio)</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  مفعل وجاهز
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-bold">
                تحكم فوري ودقيق في أحجام الخطوط، كثافة الجداول، هوامش A4، وتنسيقات التقرير
              </p>
            </div>
          </div>

          {/* Quick 1-Click Strategy Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-black text-amber-400/90 flex items-center gap-1 ml-1">
              <Sparkles className="w-3 h-3" /> نماذج جاهزة:
            </span>
            <button
              type="button"
              onClick={() => applyPreset('official')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-bold text-[11px] cursor-pointer transition-all active:scale-95 flex items-center gap-1"
              title="نموذج كشف إداري رسمي متوازن"
            >
              🏢 رسمي متوازن
            </button>
            <button
              type="button"
              onClick={() => applyPreset('economy')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-bold text-[11px] cursor-pointer transition-all active:scale-95 flex items-center gap-1"
              title="نموذج اقتصادي يوفر الورق (أفقي ومكثف)"
            >
              ⚡ توفير ورق (مكثف)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('field')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-bold text-[11px] cursor-pointer transition-all active:scale-95 flex items-center gap-1"
              title="نموذج التحصيل الميداني بخطوط كبيرة وواضحة"
            >
              📋 تحصيل ميداني
            </button>
            <button
              type="button"
              onClick={() => applyPreset('minimal')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-bold text-[11px] cursor-pointer transition-all active:scale-95 flex items-center gap-1"
              title="نموذج أبيض وأسود بسيط بدون تظليلات حبر"
            >
              🖨️ أبيض وأسود
            </button>
          </div>
        </div>

        {/* Studio 4 Main Functional Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
          
          {/* SECTION 1: FONT SIZING & TYPOGRAPHY */}
          <div className="p-3.5 bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl space-y-3 transition-colors">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-amber-400 font-black">
                <Type className="w-4 h-4" />
                <span>نوع وحجم خط الطباعة</span>
              </span>
              <span className="font-mono text-[10px] text-slate-400 font-bold">
                {printFontSize === 'custom' ? `${customFontSizePx}px` : printFontSize}
              </span>
            </div>

            {/* Font Family Selection */}
            <div className="space-y-1">
              <span className="text-slate-400 text-[11px] font-bold">نوع الخط العربي:</span>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'Cairo', label: 'القاهرة (رسمي)' },
                  { id: 'Tajawal', label: 'تجوال (عصري)' },
                  { id: 'Almarai', label: 'المراعي (إداري)' },
                  { id: 'IBM Plex Sans Arabic', label: 'بلكس (محاسبي)' },
                  { id: 'Amiri', label: 'أميري (تراثي)' }
                ].map(font => (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => setPrintFontFamily(font.id)}
                    className={`p-1 rounded-lg text-center font-bold text-[10px] cursor-pointer transition-all border ${
                      printFontFamily === font.id
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-xs'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                    }`}
                  >
                    {font.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size Presets */}
            <div className="space-y-1 pt-1 border-t border-slate-800">
              <span className="text-slate-400 text-[11px] font-bold">حجم خط الجدول:</span>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'xsmall', label: 'دقيق 8.5pt' },
                  { id: 'small', label: 'صغير 9.5pt' },
                  { id: 'medium', label: 'متوسط 11pt' },
                  { id: 'large', label: 'كبير 12.5pt' },
                  { id: 'xlarge', label: 'ضخم 14pt' },
                  { id: 'custom', label: 'مخصص (px)' }
                ].map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setPrintFontSize(f.id as any)}
                    className={`p-1.5 rounded-lg text-center font-bold text-[10px] cursor-pointer transition-all border ${
                      printFontSize === f.id
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-xs'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom font size slider & input */}
            {printFontSize === 'custom' && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }} 
                animate={{ opacity: 1, y: 0 }}
                className="space-y-1.5 p-2 bg-slate-950 border border-slate-800 rounded-xl"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-300 font-bold">
                  <span>الحجم المخصص بالبكسل:</span>
                  <span className="font-mono text-amber-400 font-black">{customFontSizePx}px</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="7"
                    max="20"
                    step="0.5"
                    value={customFontSizePx}
                    onChange={e => setCustomFontSizePx(Number(e.target.value))}
                    className="flex-1 accent-amber-500 cursor-pointer"
                  />
                  <input
                    type="number"
                    min="7"
                    max="20"
                    value={customFontSizePx}
                    onChange={e => setCustomFontSizePx(Math.max(7, Math.min(20, Number(e.target.value))))}
                    className="w-12 bg-slate-900 border border-slate-700 rounded p-1 text-center font-mono text-xs text-white"
                  />
                </div>
              </motion.div>
            )}

            {/* Live Font Sample Badge */}
            <div className="p-2 bg-slate-950/80 border border-slate-800/80 rounded-xl flex items-center justify-between text-[11px]">
              <span className="text-slate-400">معاينة:</span>
              <span 
                className="text-amber-300 font-bold truncate"
                style={{
                  fontFamily: printFontFamily === 'Tajawal' ? "'Tajawal', sans-serif" :
                    printFontFamily === 'Almarai' ? "'Almarai', sans-serif" :
                    printFontFamily === 'IBM Plex Sans Arabic' ? "'IBM Plex Sans Arabic', sans-serif" :
                    printFontFamily === 'Amiri' ? "'Amiri', serif" : "'Cairo', sans-serif",
                  fontSize: printFontSize === 'custom' ? `${customFontSizePx}px` : 
                            printFontSize === 'xsmall' ? '9px' : 
                            printFontSize === 'small' ? '10px' : 
                            printFontSize === 'large' ? '13px' : 
                            printFontSize === 'xlarge' ? '15px' : '11.5px'
                }}
              >
                45,000 ريال (120 ك.و)
              </span>
            </div>
          </div>

          {/* SECTION 2: DENSITY & THEME */}
          <div className="p-3.5 bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl space-y-3 transition-colors">
            <span className="flex items-center gap-1.5 text-amber-400 font-black">
              <LayoutGrid className="w-4 h-4" />
              <span>كثافة الجدول والسمة البصرية</span>
            </span>

            {/* Row Spacing / Density */}
            <div className="space-y-1.5">
              <span className="text-slate-400 text-[11px] font-bold">تباعد الأسطر وارتفاع الخلايا:</span>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'compact', label: 'مضغوط (أوفر)' },
                  { id: 'standard', label: 'متوازن (قياسي)' },
                  { id: 'spacious', label: 'متباعد (مريح)' }
                ].map(d => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setTableDensity(d.id as any)}
                    className={`p-1.5 rounded-xl text-center font-bold text-[10px] cursor-pointer transition-all border ${
                      tableDensity === d.id
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md shadow-amber-500/20'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Print Theme */}
            <div className="space-y-1.5 pt-1.5 border-t border-slate-800">
              <span className="text-slate-400 text-[11px] font-bold">سمة خطوط وألوان الطباعة:</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'modern', label: '🎨 حديث وملون', desc: 'مظهر ملون أنيق' },
                  { id: 'striped', label: '🦓 مخطط ومظلل', desc: 'تظليل سطر وسطر' },
                  { id: 'bordered', label: '📐 شبكة هندسية', desc: 'حدود محددة وواضحة' },
                  { id: 'minimal', label: '📄 هادئ اقتصادي', desc: 'أبيض وأسود بدون حبر' }
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setPrintTheme(t.id as any)}
                    className={`p-1.5 rounded-xl text-right font-bold text-[10px] cursor-pointer transition-all border flex flex-col gap-0.5 ${
                      printTheme === t.id
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md shadow-amber-500/20'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                    }`}
                  >
                    <span>{t.label}</span>
                    <span className={`text-[9px] font-normal ${printTheme === t.id ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                      {t.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 3: ORIENTATION & PAGINATION */}
          <div className="p-3.5 bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl space-y-3 transition-colors">
            <span className="flex items-center gap-1.5 text-amber-400 font-black">
              <Maximize2 className="w-4 h-4" />
              <span>اتجاه الورقة وتقسيم الصفحات</span>
            </span>

            {/* Orientation */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setPrintOrientation('portrait')}
                className={`p-2 rounded-xl text-center font-bold text-[11px] cursor-pointer transition-all border flex items-center justify-center gap-1.5 ${
                  printOrientation === 'portrait'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md shadow-amber-500/20'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                }`}
              >
                <span>📄 طولي (A4 عمودي)</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintOrientation('landscape')}
                className={`p-2 rounded-xl text-center font-bold text-[11px] cursor-pointer transition-all border flex items-center justify-center gap-1.5 ${
                  printOrientation === 'landscape'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md shadow-amber-500/20'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                }`}
              >
                <span>📑 عرضي (A4 أفقي)</span>
              </button>
            </div>

            {/* Paper Margin */}
            <div className="space-y-1 pt-1 border-t border-slate-800">
              <span className="text-slate-400 text-[11px] font-bold">هوامش الورقة A4:</span>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'compact', label: 'ضيق (4mm)' },
                  { id: 'standard', label: 'متوازن (6mm)' },
                  { id: 'spacious', label: 'مريح (10mm)' }
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaperMargin(m.id as any)}
                    className={`p-1 rounded-lg text-center font-bold text-[10px] cursor-pointer transition-all border ${
                      paperMargin === m.id
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-xs'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rows Per Page */}
            <div className="space-y-1.5 pt-1.5 border-t border-slate-800">
              <div className="flex justify-between items-center text-[11px] font-bold text-slate-300">
                <span>المشتركين بكل صفحة:</span>
                <span className="font-mono text-amber-400 font-black bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  {rowsPerPage} مشترك ({estimatedPages} صفحة)
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {[8, 10, 12, 14, 16, 18, 22, 25, 30].map(cnt => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => {
                      setRowsPerPage(cnt);
                      setIsCustomRowsPerPage(false);
                      setCustomRowsInput(String(cnt));
                    }}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer border transition-all ${
                      rowsPerPage === cnt && !isCustomRowsPerPage
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-xs'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                    }`}
                  >
                    {cnt}
                  </button>
                ))}
              </div>

              {/* Direct Custom Number Input */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] text-slate-400">عدد مخصص:</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={customRowsInput}
                  onChange={e => handleCustomRowChange(e.target.value)}
                  placeholder="مثال: 15"
                  className="w-16 bg-slate-950 border border-slate-700 rounded-lg p-1 text-center font-mono text-xs text-amber-400 font-bold focus:border-amber-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400">سطر/صفحة</span>
              </div>
            </div>
          </div>

          {/* SECTION 4: HEADER, FOOTER, SIGNERS & NOTE */}
          <div className="p-3.5 bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl space-y-3 transition-colors">
            <span className="flex items-center gap-1.5 text-amber-400 font-black">
              <FileCheck className="w-4 h-4" />
              <span>عناصر وهوامش التقرير</span>
            </span>

            <div className="space-y-1.5 text-[11px] font-bold text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={showHeaderInPrint}
                  onChange={e => setShowHeaderInPrint(e.target.checked)}
                  className="rounded accent-amber-500 w-3.5 h-3.5"
                />
                <span>إظهار ترويسة وبيانات المحطة</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={showFilterBarInPrint}
                  onChange={e => setShowFilterBarInPrint(e.target.checked)}
                  className="rounded accent-amber-500 w-3.5 h-3.5"
                />
                <span>إظهار شريط معايير التصفية والمنطقة</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={showPageNumbersInPrint}
                  onChange={e => setShowPageNumbersInPrint(e.target.checked)}
                  className="rounded accent-amber-500 w-3.5 h-3.5"
                />
                <span>إظهار أرقام وتذييل الصفحات</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer hover:text-white text-amber-400 transition-colors">
                <input
                  type="checkbox"
                  checked={totalsOnLastPageOnly}
                  onChange={e => setTotalsOnLastPageOnly(e.target.checked)}
                  className="rounded accent-amber-500 w-3.5 h-3.5"
                />
                <span>الإجمالي في الصفحة الأخيرة فقط</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={showSignatures}
                  onChange={e => setShowSignatures(e.target.checked)}
                  className="rounded accent-amber-500 w-3.5 h-3.5"
                />
                <span>إظهار قسم التوقيعات والاعتماد</span>
              </label>
            </div>

            {/* Custom Signers input if enabled */}
            {showSignatures && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="grid grid-cols-3 gap-1 pt-1.5 border-t border-slate-800"
              >
                <input
                  type="text"
                  value={signer1}
                  onChange={e => setSigner1(e.target.value)}
                  placeholder="الموقع 1"
                  className="bg-slate-950 border border-slate-800 rounded p-1 text-[10px] text-white focus:border-amber-500 focus:outline-none"
                  title="الموقع الأول"
                />
                <input
                  type="text"
                  value={signer2}
                  onChange={e => setSigner2(e.target.value)}
                  placeholder="الموقع 2"
                  className="bg-slate-950 border border-slate-800 rounded p-1 text-[10px] text-white focus:border-amber-500 focus:outline-none"
                  title="الموقع الثاني"
                />
                <input
                  type="text"
                  value={signer3}
                  onChange={e => setSigner3(e.target.value)}
                  placeholder="الموقع 3"
                  className="bg-slate-950 border border-slate-800 rounded p-1 text-[10px] text-white focus:border-amber-500 focus:outline-none"
                  title="الموقع الثالث"
                />
              </motion.div>
            )}

            {/* Custom Note input */}
            <div className="pt-1.5 border-t border-slate-800">
              <input
                type="text"
                value={customPrintNote}
                onChange={e => setCustomPrintNote(e.target.value)}
                placeholder="ملاحظة أو تنبيه رسمي مطبوع أسفل الكشف..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-[10px] text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

        </div>

        {/* Quick Action Footer inside Studio */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 bg-slate-950/70 p-3 sm:p-4 rounded-2xl">
          <div className="flex items-center gap-2.5 text-xs text-slate-300 font-bold flex-wrap">
            <span className="text-slate-400">المعاينة الحية:</span>
            <button
              type="button"
              onClick={onOpenSheetPreview}
              className="px-3.5 py-1.5 bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer border border-amber-500/40 flex items-center gap-1.5 active:scale-95 shadow-sm"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>فتح وضع معاينة صفحات A4 الحقيقية</span>
            </button>
            
            <button
              type="button"
              onClick={() => applyPreset('official')}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-800 flex items-center gap-1"
              title="إعادة ضبط الاستوديو للإعدادات الافتراضية القياسية"
            >
              <RotateCcw className="w-3 h-3" />
              <span>إعادة ضبط</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onExportPDF}
              disabled={isExportingPDF}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-600/20 active:scale-95 disabled:opacity-50"
            >
              <FileDown className="w-4 h-4" />
              <span>{isExportingPDF ? 'جاري إنشاء PDF...' : 'تصدير PDF بالتنسيق الحالي'}</span>
            </button>

            <button
              type="button"
              onClick={onPrint}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/25 active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الكشف الآن 🖨️</span>
            </button>
          </div>
        </div>

      </div>
    </motion.div>
  );
};
