import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Printer, Receipt, FileText, Check, ShieldCheck, Zap, QrCode, 
  CheckSquare, Sliders, Type, Scissors, Sparkles, RefreshCw,
  Eye, Copy, Smartphone, AlignLeft, Info, HelpCircle, Layers,
  Edit3, CheckCircle2
} from 'lucide-react';
import { SystemSettings } from '../types';
import { tafqeetArabic } from '../utils/numberToWords';
import { updateThermalSettingsInDatabase } from '../lib/database';

interface ThermalSettingsManagerProps {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  onSaveSettings: () => void;
}

export const ThermalSettingsManager: React.FC<ThermalSettingsManagerProps> = ({
  settings,
  onUpdateSettings,
  onSaveSettings
}) => {
  const [activeTab, setActiveTab] = useState<'paper' | 'elements' | 'texts' | 'styling' | 'test'>('paper');
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [isSavingDb, setIsSavingDb] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Active settings with solid fallbacks
  const paperWidth = settings.receiptPaperWidth || '80mm';
  const fontSize = settings.receiptFontSize || 'normal';
  const darknessLevel = settings.receiptDarknessLevel || 'dark';
  const copiesCount = settings.receiptCopiesCount || 1;
  const showLogo = settings.receiptShowLogo !== false;
  const showStationHeader = settings.receiptShowStationHeader !== false;
  const showBarcode = settings.receiptShowBarcode !== false;
  const showQrCode = settings.receiptShowQrCode !== false;
  const showDigitalStamp = settings.receiptShowDigitalStamp !== false;
  const showReadings = settings.receiptShowPreviousCurrentReadings !== false;
  const showCollector = settings.receiptShowCollectorName !== false;
  const showPhone = settings.receiptShowCustomerPhone !== false;
  const showTafqeet = settings.receiptShowTafqeet !== false;
  const showWarning = settings.receiptShowWarningNotice !== false;
  const showPaymentMethod = settings.receiptShowPaymentMethod !== false;
  const showZone = settings.receiptShowZoneInfo !== false;
  const autoCut = settings.receiptAutoCut !== false;

  const warningText = settings.receiptWarningNoticeText || 'عزيزي المشترك، نرجو سرعة المبادرة بسداد المبالغ المستحقة لضمان استمرار الخدمة الكهربائية وتفادي تراكم المديونية.';
  const footerTerms = settings.notes || 'المحطة غير مسؤولة عن التمديدات الداخلية الخاطئة. يرجى سداد الفاتورة قبل تاريخ 5 من الشهر القادم.';
  const collectorNotice = settings.receiptCollectorNotice || 'مستند تحصيل آلي معتمد إلكترونياً';

  const updateSetting = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    onUpdateSettings({
      ...settings,
      [key]: value
    });
  };

  // Sample simulation data
  const sampleAmount = 37500;
  const sampleConsumption = 150;
  const sampleRate = settings.tariffs?.residential ?? 0;
  const sampleFixedFee = settings.fixedFee ?? 0;
  const sampleServiceFee = settings.serviceFee ?? 0;
  const sampleEnergyCost = sampleConsumption * sampleRate;
  const sampleTotal = sampleEnergyCost + sampleFixedFee + sampleServiceFee;

  const handleCopyTestReceipt = () => {
    const text = `
⚡ ${settings.stationName || 'محطة الكهرباء'} ⚡
${settings.logoText || 'VOLTA'}
هاتف: ${settings.phone || '000000'} | ${settings.address || 'الرئيسي'}
--------------------------------
سند قبض استهلاك كهرباء
رقم السند: #REC-2026-8841
التاريخ: ${new Date().toLocaleDateString('ar-YE')}
المشترك: أحمد محمد علي
العداد: 40918 | المنطقة: الأولى
--------------------------------
القراءة الحالية: 12,450 ك.و
القراءة السابقة: 12,300 ك.و
الاستهلاك: 150 ك.و/س
--------------------------------
قيمة الطاقة: ${sampleEnergyCost.toLocaleString()} ${settings.currency}
الرسوم الثابتة: ${sampleFixedFee.toLocaleString()} ${settings.currency}
رسوم الخدمة: ${sampleServiceFee.toLocaleString()} ${settings.currency}
الإجمالي المستحق: ${sampleTotal.toLocaleString()} ${settings.currency}
${showTafqeet ? `(${tafqeetArabic(sampleTotal, settings.currency)})` : ''}
--------------------------------
${showWarning ? `⚠️ ${warningText}` : ''}
${footerTerms}
ختم إلكتروني معتمد - نظام فولترا السحابي
    `.trim();

    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  const handleSaveToDatabase = async () => {
    setIsSavingDb(true);
    setSaveSuccessMsg(null);
    try {
      await updateThermalSettingsInDatabase({
        receiptPaperWidth: paperWidth,
        receiptFontSize: fontSize,
        receiptDarknessLevel: darknessLevel,
        receiptCopiesCount: copiesCount,
        receiptShowLogo: showLogo,
        receiptShowStationHeader: showStationHeader,
        receiptShowBarcode: showBarcode,
        receiptShowQrCode: showQrCode,
        receiptShowDigitalStamp: showDigitalStamp,
        receiptShowPreviousCurrentReadings: showReadings,
        receiptShowCollectorName: showCollector,
        receiptShowCustomerPhone: showPhone,
        receiptShowTafqeet: showTafqeet,
        receiptShowWarningNotice: showWarning,
        receiptShowPaymentMethod: showPaymentMethod,
        receiptShowZoneInfo: showZone,
        receiptAutoCut: autoCut,
        receiptWarningNoticeText: warningText,
        receiptCollectorNotice: collectorNotice,
        notes: footerTerms
      }, settings);

      onSaveSettings();
      setSaveSuccessMsg('⚡ تم تعديل وحفظ إعدادات السندات والفواتير الحرارية في قاعدة البيانات السحابية بنجاح!');
      setTimeout(() => setSaveSuccessMsg(null), 4500);
    } catch (err) {
      console.error('Failed to update thermal settings in database:', err);
      alert('حدث خطأ أثناء حفظ إعدادات السندات في قاعدة البيانات.');
    } finally {
      setIsSavingDb(false);
    }
  };

  return (
    <div className="space-y-6 text-right dir-rtl">
      {/* Toast Notification */}
      <AnimatePresence>
        {saveSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-3 text-emerald-400 text-xs font-bold shadow-lg"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
            <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded-full font-mono">Firestore Saved</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Controls */}
      <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20 shadow-inner">
            <Receipt className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white">إعدادات وتخصيص السندات والفواتير الحرارية (Thermal POS Engine)</h3>
              <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold rounded-full">
                قاعدة البيانات السحابية
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              تخصيص كامل لأبعاد السندات، الحقول النشطة، التفقيط المالي، الباركود والـ QR، والشروط والتحذيرات لطباعة البلوتوث والميدان.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            type="button"
            onClick={handleCopyTestReceipt}
            className="flex-1 md:flex-none bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Copy className="w-4 h-4 text-amber-400" />
            <span>{copiedNotification ? 'تم نسخ النص!' : 'نسخ نص تجريبي'}</span>
          </button>
          
          <button
            type="button"
            onClick={handleSaveToDatabase}
            disabled={isSavingDb}
            className="flex-1 md:flex-none bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black py-2.5 px-6 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isSavingDb ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>جاري تعديل إعدادات السندات في قاعدة البيانات...</span>
              </>
            ) : (
              <>
                <Edit3 className="w-4 h-4 text-slate-950" />
                <span>تعديل إعدادات السندات في قاعدة البيانات</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Grid: Left Controls (7 cols) + Right Live Preview (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT CONFIGURATION PANELS (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Sub Navigation Tabs */}
          <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800 gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('paper')}
              className={`flex-1 min-w-[110px] py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'paper' 
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>مقاس الورق والعتاد</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('elements')}
              className={`flex-1 min-w-[110px] py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'elements' 
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>العناصر والحقول النشطة</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('texts')}
              className={`flex-1 min-w-[110px] py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'texts' 
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>النصوص والتحذيرات</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('styling')}
              className={`flex-1 min-w-[110px] py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'styling' 
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>الخطوط والتباين</span>
            </button>
          </div>

          {/* TAB 1: PAPER & HARDWARE */}
          {activeTab === 'paper' && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              {/* Paper Width Selection */}
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-900 pb-2.5">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Paper Width & Type</span>
                  <h4 className="font-bold text-amber-400 flex items-center gap-2">
                    <span>مقاس وعرض ورق السندات الحرارية</span>
                    <Printer className="w-4 h-4" />
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* 80mm Standard */}
                  <div
                    onClick={() => updateSetting('receiptPaperWidth', '80mm')}
                    className={`p-4 rounded-xl border text-center space-y-2 cursor-pointer transition-all ${
                      paperWidth === '80mm'
                        ? 'bg-amber-500/10 border-amber-500 shadow-md shadow-amber-500/10'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="w-10 h-10 mx-auto rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-mono font-black text-xs">
                      80mm
                    </div>
                    <h5 className="font-black text-white text-xs">حراري قياسي 80 مم</h5>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      طابعات سطح المكتب والمحطة الثابتة (Epson, Xprinter, Sunmi).
                    </p>
                    <span className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded ${
                      paperWidth === '80mm' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {paperWidth === '80mm' ? 'المقاس المعتمد' : 'اختيار'}
                    </span>
                  </div>

                  {/* 58mm Pocket */}
                  <div
                    onClick={() => updateSetting('receiptPaperWidth', '58mm')}
                    className={`p-4 rounded-xl border text-center space-y-2 cursor-pointer transition-all ${
                      paperWidth === '58mm'
                        ? 'bg-amber-500/10 border-amber-500 shadow-md shadow-amber-500/10'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="w-10 h-10 mx-auto rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-mono font-black text-xs">
                      58mm
                    </div>
                    <h5 className="font-black text-white text-xs">حراري جيبي 58 مم</h5>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      طابعات البلوتوث المحمولة الميدانية للمحصلين وقراء العدادات.
                    </p>
                    <span className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded ${
                      paperWidth === '58mm' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {paperWidth === '58mm' ? 'المقاس المعتمد' : 'اختيار'}
                    </span>
                  </div>

                  {/* A4 Format */}
                  <div
                    onClick={() => updateSetting('receiptPaperWidth', 'A4')}
                    className={`p-4 rounded-xl border text-center space-y-2 cursor-pointer transition-all ${
                      paperWidth === 'A4'
                        ? 'bg-amber-500/10 border-amber-500 shadow-md shadow-amber-500/10'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="w-10 h-10 mx-auto rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-mono font-black text-xs">
                      A4
                    </div>
                    <h5 className="font-black text-white text-xs">ورق رسمي A4 / A5</h5>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      للمطالبات الرسمية الكبيرة وكشوفات الحسابات المجمعة.
                    </p>
                    <span className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded ${
                      paperWidth === 'A4' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {paperWidth === 'A4' ? 'المقاس المعتمد' : 'اختيار'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Hardware Printing Behaviors */}
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-900 pb-2.5">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Hardware Behavior</span>
                  <h4 className="font-bold text-amber-400 flex items-center gap-2">
                    <span>خصائص الطباعة والقص الآلي</span>
                    <Sliders className="w-4 h-4" />
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Auto-cut */}
                  <div 
                    onClick={() => updateSetting('receiptAutoCut', !autoCut)}
                    className="flex items-center justify-between p-3.5 bg-slate-900 rounded-xl border border-slate-800 hover:border-slate-700 cursor-pointer transition-all"
                  >
                    <div>
                      <h5 className="font-bold text-slate-200 text-xs">أمر قص الورق التلقائي (Auto Cutter)</h5>
                      <p className="text-[10px] text-slate-500 mt-0.5">إرسال إشارة GS V للطابعة لقص الورق عند انتهاء السند.</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold ${
                      autoCut ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {autoCut ? 'مفعّل' : 'معطّل'}
                    </span>
                  </div>

                  {/* Number of Copies */}
                  <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <h5 className="font-bold text-slate-200 text-xs">عدد النسخ المطبوعة تلقائياً</h5>
                      <p className="text-[10px] text-slate-500 mt-0.5">نسخة للمشترك + نسخة للأرشيف المالي.</p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                      {[1, 2, 3].map(num => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => updateSetting('receiptCopiesCount', num)}
                          className={`w-7 h-7 rounded-md font-mono text-xs font-black transition-all cursor-pointer ${
                            copiesCount === num 
                              ? 'bg-amber-500 text-slate-950 font-black' 
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: ACTIVE ELEMENTS & VISIBILITY */}
          {activeTab === 'elements' && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-900 pb-2.5">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Field Visibility</span>
                <h4 className="font-bold text-amber-400 flex items-center gap-2">
                  <span>تفعيل وتعطيل حقول السند الحراري</span>
                  <CheckSquare className="w-4 h-4" />
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Toggle: Logo */}
                <div 
                  onClick={() => updateSetting('receiptShowLogo', !showLogo)}
                  className="flex items-center justify-between p-3.5 bg-slate-900 rounded-xl border border-slate-800 hover:border-slate-700 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-slate-200 font-bold">شعار المحطة الرسومي (Logo)</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold ${
                    showLogo ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {showLogo ? 'إظهار' : 'إخفاء'}
                  </span>
                </div>

                {/* Toggle: Station Header Info */}
                <div 
                  onClick={() => updateSetting('receiptShowStationHeader', !showStationHeader)}
                  className="flex items-center justify-between p-3.5 bg-slate-900 rounded-xl border border-slate-800 hover:border-slate-700 cursor-pointer transition-all"
                >
                  <span className="text-slate-200 font-bold">بيانات المحطة (الهاتف، العنوان، الترخيص)</span>
                  <span className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold ${
                    showStationHeader ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {showStationHeader ? 'إظهار' : 'إخفاء'}
                  </span>
                </div>

                {/* Toggle: Tafqeet (Arabic Words) */}
                <div 
                  onClick={() => updateSetting('receiptShowTafqeet', !showTafqeet)}
                  className="flex items-center justify-between p-3.5 bg-slate-900 rounded-xl border border-slate-800 hover:border-slate-700 cursor-pointer transition-all"
                >
                  <div>
                    <span className="text-slate-200 font-bold block">تفقيط المبلغ بالحروف العربية</span>
                    <span className="text-[10px] text-slate-500">مثال: (فقط سبعة وثلاثون ألفاً...)</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold ${
                    showTafqeet ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {showTafqeet ? 'إظهار' : 'إخفاء'}
                  </span>
                </div>

                {/* Toggle: QR Code */}
                <div 
                  onClick={() => updateSetting('receiptShowQrCode', !showQrCode)}
                  className="flex items-center justify-between p-3.5 bg-slate-900 rounded-xl border border-slate-800 hover:border-slate-700 cursor-pointer transition-all"
                >
                  <span className="text-slate-200 font-bold">رمز QR الذكي للتحقق الفوري</span>
                  <span className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold ${
                    showQrCode ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {showQrCode ? 'إظهار' : 'إخفاء'}
                  </span>
                </div>

                {/* Toggle: Barcode */}
                <div 
                  onClick={() => updateSetting('receiptShowBarcode', !showBarcode)}
                  className="flex items-center justify-between p-3.5 bg-slate-900 rounded-xl border border-slate-800 hover:border-slate-700 cursor-pointer transition-all"
                >
                  <span className="text-slate-200 font-bold">الباركود الشريطي (1D Barcode)</span>
                  <span className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold ${
                    showBarcode ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {showBarcode ? 'إظهار' : 'إخفاء'}
                  </span>
                </div>

                {/* Toggle: Digital Stamp */}
                <div 
                  onClick={() => updateSetting('receiptShowDigitalStamp', !showDigitalStamp)}
                  className="flex items-center justify-between p-3.5 bg-slate-900 rounded-xl border border-slate-800 hover:border-slate-700 cursor-pointer transition-all"
                >
                  <span className="text-slate-200 font-bold">الختم الرقمي للمحطة (Digital Stamp)</span>
                  <span className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold ${
                    showDigitalStamp ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {showDigitalStamp ? 'إظهار' : 'إخفاء'}
                  </span>
                </div>

                {/* Toggle: Previous and Current Readings */}
                <div 
                  onClick={() => updateSetting('receiptShowPreviousCurrentReadings', !showReadings)}
                  className="flex items-center justify-between p-3.5 bg-slate-900 rounded-xl border border-slate-800 hover:border-slate-700 cursor-pointer transition-all"
                >
                  <span className="text-slate-200 font-bold">القراءة السابقة والجديدة وصافي الاستهلاك</span>
                  <span className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold ${
                    showReadings ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {showReadings ? 'إظهار' : 'إخفاء'}
                  </span>
                </div>

                {/* Toggle: Collector Name */}
                <div 
                  onClick={() => updateSetting('receiptShowCollectorName', !showCollector)}
                  className="flex items-center justify-between p-3.5 bg-slate-900 rounded-xl border border-slate-800 hover:border-slate-700 cursor-pointer transition-all"
                >
                  <span className="text-slate-200 font-bold">اسم المحصل الميداني واسم المستخدم</span>
                  <span className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold ${
                    showCollector ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {showCollector ? 'إظهار' : 'إخفاء'}
                  </span>
                </div>

                {/* Toggle: Warning Notice */}
                <div 
                  onClick={() => updateSetting('receiptShowWarningNotice', !showWarning)}
                  className="flex items-center justify-between p-3.5 bg-slate-900 rounded-xl border border-slate-800 hover:border-slate-700 cursor-pointer transition-all"
                >
                  <span className="text-slate-200 font-bold">تنبيه تحذير فصل التيار والسداد</span>
                  <span className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold ${
                    showWarning ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {showWarning ? 'إظهار' : 'إخفاء'}
                  </span>
                </div>

                {/* Toggle: Payment Method */}
                <div 
                  onClick={() => updateSetting('receiptShowPaymentMethod', !showPaymentMethod)}
                  className="flex items-center justify-between p-3.5 bg-slate-900 rounded-xl border border-slate-800 hover:border-slate-700 cursor-pointer transition-all"
                >
                  <span className="text-slate-200 font-bold">طريقة الدفع (نقداً / محفظة / تحويل)</span>
                  <span className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold ${
                    showPaymentMethod ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {showPaymentMethod ? 'إظهار' : 'إخفاء'}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: TEXTS, NOTICES & POLICIES */}
          {activeTab === 'texts' && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-900 pb-2.5">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Receipt Texts & Notices</span>
                <h4 className="font-bold text-amber-400 flex items-center gap-2">
                  <span>تخصيص نصوص وشروط السند الحراري</span>
                  <Type className="w-4 h-4" />
                </h4>
              </div>

              <div className="space-y-4 text-xs">
                {/* Header Code / Subtitle */}
                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">
                    الرمز اللفظي أعلى السند (Header Subtitle):
                  </label>
                  <input
                    type="text"
                    value={settings.logoText || ''}
                    onChange={e => updateSetting('logoText', e.target.value)}
                    placeholder="مثال: VOLTA POWER / كهرباء العاصمة"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 text-right focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Warning Text for disconnection */}
                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">
                    نص تحذير فصل التيار وتراكم المديونية:
                  </label>
                  <textarea
                    rows={2}
                    value={settings.receiptWarningNoticeText || ''}
                    onChange={e => updateSetting('receiptWarningNoticeText', e.target.value)}
                    placeholder="مثال: عزيزي المشترك، نرجو سرعة المبادرة بسداد المبالغ المستحقة لضمان استمرار الخدمة وتفادي فصل التيار."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 text-right focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>

                {/* Footer Notes and Policies */}
                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">
                    شروط وسياسات الفاتورة والسند أسفل الورقة (Footer Notes):
                  </label>
                  <textarea
                    rows={3}
                    value={settings.notes || ''}
                    onChange={e => updateSetting('notes', e.target.value)}
                    placeholder="مثال: المحطة غير مسؤولة عن التمديدات الداخلية الخاطئة. يرجى سداد المبالغ قبل تاريخ 5 من كل شهر."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 text-right focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>

                {/* Digital Stamp Label */}
                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">
                    نص الختم الرقمي المعتمد:
                  </label>
                  <input
                    type="text"
                    value={settings.receiptCollectorNotice || ''}
                    onChange={e => updateSetting('receiptCollectorNotice', e.target.value)}
                    placeholder="مثال: ختم إلكتروني معتمد - نظام فولترا السحابي"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3.5 text-slate-200 text-right focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4: STYLING & FONT DENSITY */}
          {activeTab === 'styling' && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-900 pb-2.5">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Typography & Density</span>
                <h4 className="font-bold text-amber-400 flex items-center gap-2">
                  <span>كثافة الخط ومستوى تباين الطباعة الحرارية</span>
                  <Sliders className="w-4 h-4" />
                </h4>
              </div>

              <div className="space-y-4 text-xs">
                {/* Font Size Mode */}
                <div>
                  <label className="block text-slate-300 mb-2 font-bold">حجم خط الإيصال:</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: 'compact', label: 'مضغوط (صغير)', desc: 'لتوفير الورق في الطابعات الجيبية' },
                      { id: 'normal', label: 'قياسي (متوسط)', desc: 'الخيار الموصى به لمعظم الطابعات' },
                      { id: 'large', label: 'كبير وواضح', desc: 'لقراءة أسهل لكبار السن' }
                    ].map(sizeOpt => (
                      <button
                        key={sizeOpt.id}
                        type="button"
                        onClick={() => updateSetting('receiptFontSize', sizeOpt.id as any)}
                        className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                          fontSize === sizeOpt.id
                            ? 'bg-amber-500/10 border-amber-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <h6 className="font-bold text-xs">{sizeOpt.label}</h6>
                        <p className="text-[9px] text-slate-500 mt-0.5">{sizeOpt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Print Darkness Level */}
                <div>
                  <label className="block text-slate-300 mb-2 font-bold">مستوى تباين وحبر الرأس الحراري (Print Darkness):</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'light', label: 'خفيف (Light)' },
                      { id: 'normal', label: 'عادي (Normal)' },
                      { id: 'dark', label: 'داكن عالي (Dark)' },
                      { id: 'ultra-high-contrast', label: 'فائق التباين (Ultra)' }
                    ].map(darkOpt => (
                      <button
                        key={darkOpt.id}
                        type="button"
                        onClick={() => updateSetting('receiptDarknessLevel', darkOpt.id as any)}
                        className={`py-2.5 px-2 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                          darknessLevel === darkOpt.id
                            ? 'bg-amber-500 text-slate-950 font-black border-amber-400'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {darkOpt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </div>

        {/* RIGHT LIVE THERMAL RECEIPT PREVIEW (5 cols) */}
        <div className="lg:col-span-5 space-y-4 sticky top-6">
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded font-mono text-[10px] font-bold flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5" />
                معاينة حية لسند حراري ({paperWidth})
              </span>
              <span className="text-[10px] font-bold text-slate-400">نموذج فوري</span>
            </div>

            {/* Simulated 3D Thermal Paper */}
            <div 
              className={`bg-[#FAF9F5] text-slate-950 rounded-xl p-5 shadow-2xl border border-slate-300 font-sans mx-auto transition-all ${
                paperWidth === '58mm' ? 'max-w-[280px]' : 'max-w-[340px]'
              }`}
              style={{
                fontSize: fontSize === 'compact' ? '10px' : fontSize === 'large' ? '12px' : '11px'
              }}
            >
              {/* Paper Top Cutter Indicator */}
              <div className="flex items-center justify-between text-slate-400 text-[9px] mb-2 border-b border-dashed border-slate-300 pb-1 font-mono">
                <Scissors className="w-3 h-3 rotate-180 text-slate-400" />
                <span>خط قص الورق ({paperWidth})</span>
                <Scissors className="w-3 h-3 text-slate-400" />
              </div>

              {/* Station Header */}
              {showStationHeader && (
                <div className="text-center space-y-1 border-b border-dashed border-slate-400 pb-3">
                  {showLogo && (
                    <div className="w-12 h-12 mx-auto flex items-center justify-center mb-1">
                      {settings.logoUrl ? (
                        <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center">
                          <Zap className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                  )}
                  <h3 className="font-black text-sm text-slate-950">{settings.stationName || 'محطة الكهرباء'}</h3>
                  {settings.logoText && <p className="text-[10px] font-bold text-slate-700 font-mono">{settings.logoText}</p>}
                  <p className="text-[9px] text-slate-500">{settings.phone || '000000'} | {settings.address || 'الرئيسي'}</p>
                  {settings.commercialRegister && <p className="text-[8px] text-slate-400 font-mono">ترخيص: {settings.commercialRegister}</p>}
                </div>
              )}

              {/* Receipt Title & Meta */}
              <div className="text-right space-y-1 border-b border-dashed border-slate-300 py-2.5 text-[10px]">
                <div className="flex justify-between font-bold text-slate-800">
                  <span className="font-mono text-slate-950">#REC-2026-8841</span>
                  <span>سند قبض استهلاك كهرباء</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span className="font-mono">{new Date().toISOString().substring(0, 10)}</span>
                  <span>التاريخ:</span>
                </div>
                <div className="flex justify-between text-slate-900 font-extrabold">
                  <span>أحمد محمد علي</span>
                  <span className="text-slate-500 font-bold">المشترك:</span>
                </div>
                <div className="flex justify-between text-slate-700 font-mono font-bold">
                  <span>40918</span>
                  <span className="text-slate-500 font-sans font-bold">رقم العداد:</span>
                </div>
                {showPhone && (
                  <div className="flex justify-between text-slate-600 font-mono">
                    <span>777123456</span>
                    <span className="text-slate-500 font-sans">الجوال:</span>
                  </div>
                )}
                {showPaymentMethod && (
                  <div className="flex justify-between text-slate-700 font-bold">
                    <span className="text-emerald-800">نقداً (كاش)</span>
                    <span className="text-slate-500">طريقة الدفع:</span>
                  </div>
                )}
              </div>

              {/* Readings & Consumption Breakdown */}
              {showReadings && (
                <div className="space-y-1 py-2 border-b border-dashed border-slate-300 text-[10px]">
                  <div className="flex justify-between text-slate-700">
                    <span className="font-mono font-bold">12,450 ك.و</span>
                    <span>القراءة الحالية:</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span className="font-mono">12,300 ك.و</span>
                    <span>القراءة السابقة:</span>
                  </div>
                  <div className="flex justify-between text-slate-950 font-black pt-0.5">
                    <span className="font-mono">150 ك.و/س</span>
                    <span>صافي الاستهلاك:</span>
                  </div>
                </div>
              )}

              {/* Financial Totals */}
              <div className="space-y-1 py-2 border-b border-dashed border-slate-300 text-[10px]">
                <div className="flex justify-between text-slate-700">
                  <span className="font-mono font-bold">{sampleEnergyCost.toLocaleString()} {settings.currency}</span>
                  <span>قيمة الطاقة:</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span className="font-mono">{sampleFixedFee.toLocaleString()} {settings.currency}</span>
                  <span>الرسوم الثابتة:</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span className="font-mono">{sampleServiceFee.toLocaleString()} {settings.currency}</span>
                  <span>رسوم الخدمة:</span>
                </div>

                {/* Big Total Box */}
                <div className="bg-white border-2 border-slate-900 p-2.5 rounded-lg text-center my-2">
                  <span className="block text-[9px] font-bold text-slate-600">المبلغ الإجمالي المدفوع</span>
                  <span className="block font-mono font-black text-xl text-slate-950">
                    {sampleTotal.toLocaleString()} <span className="text-xs font-sans">{settings.currency}</span>
                  </span>
                </div>

                {/* Arabic Words (Tafqeet) */}
                {showTafqeet && (
                  <p className="text-[9px] text-slate-700 font-bold text-center bg-slate-100 p-1.5 rounded">
                    {tafqeetArabic(sampleTotal, settings.currency)}
                  </p>
                )}
              </div>

              {/* Warning Notice */}
              {showWarning && (
                <div className="py-2 border-b border-dashed border-slate-300 text-center space-y-1">
                  <p className="text-[9px] font-bold text-rose-700 bg-rose-50 p-1.5 rounded leading-tight">
                    ⚠️ {warningText}
                  </p>
                </div>
              )}

              {/* Footer Terms */}
              <div className="pt-2 text-center space-y-1.5">
                <p className="text-[8px] text-slate-500 leading-tight">
                  {footerTerms}
                </p>

                {/* Barcode representation */}
                {showBarcode && (
                  <div className="font-mono text-xs tracking-[4px] text-slate-950 font-bold py-1 select-none text-center">
                    ||||| | |||| ||| || ||| || |||
                  </div>
                )}

                {/* QR Code and Digital Stamp */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[8px] text-slate-600">
                  {showQrCode ? (
                    <div className="flex items-center gap-1 font-mono">
                      <QrCode className="w-4 h-4 text-slate-900" />
                      <span>QR-VERIFIED</span>
                    </div>
                  ) : <div />}

                  {showDigitalStamp && (
                    <div className="flex items-center gap-1 font-bold text-slate-800">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{collectorNotice}</span>
                    </div>
                  )}
                </div>

                {showCollector && (
                  <p className="text-[8px] font-mono text-slate-400 mt-1">
                    المحصل الميداني: فضل محمد (fadel) | {new Date().toLocaleTimeString('ar-YE')}
                  </p>
                )}
              </div>

              {/* Paper Bottom Cutter Line */}
              <div className="flex items-center justify-between text-slate-400 text-[9px] mt-3 border-t border-dashed border-slate-300 pt-1 font-mono">
                <Scissors className="w-3 h-3 rotate-90 text-slate-400" />
                <span>نهاية السند</span>
                <Scissors className="w-3 h-3 -rotate-90 text-slate-400" />
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
