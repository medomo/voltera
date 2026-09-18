import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SystemSettings, ConsumptionSliceTier, TariffAuditHistoryItem } from '../types';
import { updateTariffInDatabase, fetchTariffsAndSettingsFromDatabase, compressBase64Image } from '../lib/database';
import { calculateDetailedBill } from '../utils/tariffCalculator';
import { TariffSlicesManager } from './tariff/TariffSlicesManager';
import { OfficialTariffScheduleModal } from './tariff/OfficialTariffScheduleModal';
import {
  Sliders, HelpCircle, Calendar, Sparkles, Database, RefreshCw,
  CheckCircle2, ShieldCheck, Activity, CloudDownload, Edit3,
  Layers, DollarSign, Clock, FileText, BookmarkCheck,
  TrendingUp, Percent, AlertTriangle, ShieldAlert, Cpu, Check,
  Zap, ArrowRightLeft, History, BookOpen, Printer, Trash2
} from 'lucide-react';

interface AdminSettingsTariffProps {
  settings: SystemSettings;
  onUpdateSettings: (settings: SystemSettings) => void;
  onAddAuditLog?: (log: any) => void;
  currentUser: { id: string; name: string; username: string };
  setSaveToastMessage: (msg: string | null) => void;
  headerRenderer?: () => React.ReactNode;
}

export const AdminSettingsTariff: React.FC<AdminSettingsTariffProps> = ({
  settings,
  onUpdateSettings,
  onAddAuditLog,
  currentUser,
  setSaveToastMessage,
  headerRenderer,
}) => {
  const [tariffFormData, setTariffFormData] = useState<SystemSettings>(() => settings);
  const [isUpdatingTariffsInDb, setIsUpdatingTariffsInDb] = useState(false);
  const [isFetchingFromDb, setIsFetchingFromDb] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastFetchedFromDb, setLastFetchedFromDb] = useState<string | null>(null);

  // Active Subtab within Tariff Settings
  const [activeSubTab, setActiveSubTab] = useState<'sectors' | 'slices' | 'fees' | 'tou' | 'cycle' | 'simulator' | 'history'>('sectors');

  // Official Schedule Printable Modal State
  const [isOfficialScheduleModalOpen, setIsOfficialScheduleModalOpen] = useState(false);

  // Live Bill Simulator State
  const [simKwh, setSimKwh] = useState<number>(180);
  const [simSector, setSimSector] = useState<string>('residential');
  const [simIsPeak, setSimIsPeak] = useState<boolean>(false);
  const [simHasMeterRental, setSimHasMeterRental] = useState<boolean>(false);
  const [simIncludeCleaning, setSimIncludeCleaning] = useState<boolean>(true);
  const [simIncludeStreetLight, setSimIncludeStreetLight] = useState<boolean>(true);

  useEffect(() => {
    if (!isDirty) {
      setTariffFormData(settings);
    }
  }, [settings, isDirty]);

  // Direct fetch from Firestore Database
  const handleFetchDirectlyFromDatabase = async () => {
    setIsFetchingFromDb(true);
    try {
      const freshDbSettings = await fetchTariffsAndSettingsFromDatabase();
      setTariffFormData(freshDbSettings);
      onUpdateSettings(freshDbSettings);
      setIsDirty(false);
      const timeStr = new Date().toLocaleTimeString('ar-EG');
      setLastFetchedFromDb(timeStr);
      setSaveToastMessage(`✅ تم استدعاء وتحميل أحدث تعرفة ورسوم من قاعدة البيانات السحابية (Firestore) بنجاح!`);
      setTimeout(() => setSaveToastMessage(null), 4000);
    } catch (err: any) {
      console.error('Error fetching tariffs directly from Firestore:', err);
      alert('تعذر جلب البيانات من السحابة: ' + (err?.message || 'يرجى التأكد من الاتصال بالإنترنت'));
    } finally {
      setIsFetchingFromDb(false);
    }
  };

  const handleFieldChange = (updater: (prev: SystemSettings) => SystemSettings) => {
    setIsDirty(true);
    setTariffFormData(updater);
  };

  const handleUpdateTariffInDatabase = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && typeof (e as any).preventDefault === 'function') {
      (e as any).preventDefault();
    }
    setIsUpdatingTariffsInDb(true);
    try {
      let updatedSettings = { ...tariffFormData };
      if (updatedSettings.logoUrl && updatedSettings.logoUrl.startsWith('data:image') && updatedSettings.logoUrl.length > 150000) {
        updatedSettings.logoUrl = await compressBase64Image(updatedSettings.logoUrl, 250, 250, 0.85);
      }

      // Record Audit History Item
      const newHistoryItem: TariffAuditHistoryItem = {
        id: `th-${Date.now()}`,
        date: new Date().toISOString().substring(0, 19).replace('T', ' '),
        user: currentUser.name || currentUser.username,
        action: 'تعديل تعرفة الكهرباء والرسوم',
        previousTariffSummary: `سكني: ${settings.tariffs.residential}، تجاري: ${settings.tariffs.commercial}، ثابت: ${settings.fixedFee}`,
        newTariffSummary: `سكني: ${updatedSettings.tariffs.residential}، تجاري: ${updatedSettings.tariffs.commercial}، ثابت: ${updatedSettings.fixedFee} (${updatedSettings.tariffCalculationMethod || 'flat'})`,
      };

      const auditHistory = [newHistoryItem, ...(updatedSettings.tariffAuditHistory || [])].slice(0, 50);
      updatedSettings.tariffAuditHistory = auditHistory;
      
      // Update single fixed document directly in Firestore database
      await updateTariffInDatabase(updatedSettings, updatedSettings);

      // Trigger app state update
      onUpdateSettings(updatedSettings);
      setIsDirty(false);

      if (onAddAuditLog) {
        onAddAuditLog({
          id: `audit-${Date.now()}`,
          userId: currentUser.id,
          username: currentUser.name || currentUser.username,
          action: 'تعديل وتطوير تعرفة الكهرباء والرسوم',
          details: `تم تحديث تعرفة الكهرباء والرسوم في قاعدة البيانات السحابية (سكني: ${updatedSettings.tariffs.residential}، تجاري: ${updatedSettings.tariffs.commercial}، صناعي: ${updatedSettings.tariffs.industrial}، طريقة الحساب: ${updatedSettings.tariffCalculationMethod || 'flat'})`,
          timestamp: new Date().toISOString().substring(0, 19).replace('T', ' ')
        });
      }

      setSaveToastMessage(`⚡ تم تعديل وتحديث تعرفة الكهرباء والرسوم في قاعدة البيانات السحابية (Firestore) بنجاح!`);
      setTimeout(() => setSaveToastMessage(null), 5000);
    } catch (err: any) {
      console.error('Failed to update tariffs in Firestore database:', err);
      alert('حدث خطأ أثناء تعديل التعرفة في قاعدة البيانات: ' + (err?.message || 'يرجى التحقق من اتصال الإنترنت'));
    } finally {
      setIsUpdatingTariffsInDb(false);
    }
  };

  // Clear and delete all default data and fees
  const handleClearAllDefaultData = () => {
    if (!window.confirm('هل ترغب في حذف وتصفير كافة البيانات الافتراضية والرسوم والشرائح؟ ستصبح جميع الأسعار والرسوم 0 لتتمكن من إدخال تسعيرة محطتك الفعلية مباشرة.')) {
      return;
    }
    handleFieldChange(prev => ({
      ...prev,
      tariffs: {
        residential: 0,
        commercial: 0,
        industrial: 0,
        government: 0,
        agricultural: 0,
        mosque: 0,
        other: 0,
      },
      tariffSlices: [],
      fixedFee: 0,
      serviceFee: 0,
      taxPercent: 0,
      cleaningFee: 0,
      streetLightFee: 0,
      meterRentalFee: 0,
      reconnectionFee: 0,
      latePenaltyPerDay: 0,
      meterInspectionFee: 0,
      nameTransferFee: 0,
      meterReplacementFee: 0,
      meterInsuranceDeposit: 0,
      minMonthlyConsumptionKwh: 0,
      touEnabled: false,
      peakMultiplier: 1.0,
    }));
    setSaveToastMessage('🗑️ تم تصفير وحذف جميع البيانات والرسوم الافتراضية بنجاح! يمكنك الآن كتابة أسعارك والضغط على زر الحفظ.');
    setTimeout(() => setSaveToastMessage(null), 5000);
  };

  // Apply a custom uniform rate to all sectors without hardcoded values
  const handleApplyUniformRate = () => {
    const userInput = window.prompt('أدخل سعر الكيلوواط/ساعة الذي ترغب في تعميمه على كافة القطاعات (مثال: 250):');
    if (!userInput) return;
    const parsed = parseFloat(userInput);
    if (isNaN(parsed) || parsed < 0) {
      alert('يرجى إدخال رقم صحيح وموجب.');
      return;
    }

    handleFieldChange(prev => ({
      ...prev,
      tariffs: {
        residential: parsed,
        commercial: parsed,
        industrial: parsed,
        government: parsed,
        agricultural: parsed,
        mosque: parsed,
        other: parsed,
      }
    }));
    setSaveToastMessage(`⚡ تم تطبيق سعر موحد (${parsed} ${currency}) على كافة القطاعات.`);
    setTimeout(() => setSaveToastMessage(null), 4000);
  };

  // Clear tariff audit history logs
  const handleClearAuditHistory = () => {
    if (window.confirm('هل أنت متأكد من رغبتك في تفريغ وحذف سجل التعديلات التاريخي للتعرفة؟')) {
      handleFieldChange(prev => ({
        ...prev,
        tariffAuditHistory: []
      }));
      setSaveToastMessage('🗑️ تم تفريغ وحذف سجل تعديلات التعرفة.');
      setTimeout(() => setSaveToastMessage(null), 4000);
    }
  };

  // Live simulation calculated breakdown
  const simResult = calculateDetailedBill(simKwh, simSector, tariffFormData, {
    isDuringPeakHours: simIsPeak,
    hasMeterRental: simHasMeterRental,
    includeCleaningFee: simIncludeCleaning,
    includeStreetLightFee: simIncludeStreetLight,
  });

  const currency = tariffFormData.currency || 'ر.ي';

  return (
    <motion.div
      key="settings-tariff-sec"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 text-right font-sans"
    >
      {headerRenderer ? headerRenderer() : null}

      <form onSubmit={handleUpdateTariffInDatabase} className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 space-y-6 shadow-xl">
        {/* Top Header & Actions Bar */}
        <div className="border-b border-slate-800 pb-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={isUpdatingTariffsInDb}
              className="bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-slate-950 font-black py-2.5 px-5 rounded-xl text-xs transition-all cursor-pointer shadow-md flex items-center gap-2"
            >
              {isUpdatingTariffsInDb ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري حفظ وتعديل التعرفة في السحابة...</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-4 h-4" />
                  <span>حفظ وتطبيق تعديل التعرفة والرسوم</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleFetchDirectlyFromDatabase}
              disabled={isFetchingFromDb}
              className="bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800/50 text-slate-200 border border-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-2"
              title="استدعاء وجلب القيم والرسوم مباشرة من قاعدة البيانات Firestore"
            >
              {isFetchingFromDb ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>جاري الاستدعاء من قاعدة البيانات...</span>
                </>
              ) : (
                <>
                  <CloudDownload className="w-3.5 h-3.5 text-cyan-400" />
                  <span>استدعاء مباشر من السحابة</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleClearAllDefaultData}
              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-2"
              title="تصفير وحذف كافة الأسعار والرسوم الافتراضية للبدء ببياناتك الفعلية النظيفة"
            >
              <Trash2 className="w-4 h-4" />
              <span>تصفير وحذف البيانات الافتراضية</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOfficialScheduleModalOpen(true)}
              className="bg-slate-950 hover:bg-slate-800 text-amber-400 border border-amber-500/30 font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-2"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة اللائحة الرسمية المعتمدة</span>
            </button>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                <span>تطوير وإدارة تعرفة الكهرباء والرسوم</span>
                <span className="p-1 rounded-lg bg-amber-500/10 text-amber-400">
                  <Zap className="w-4 h-4" />
                </span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Firestore: tariffs/current</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              التحكم الشامل بأسعار الكيلوواط، الشرائح التصاعدية، الرسوم الثابتة والبلدية، وتعرفة ساعات الذروة.
              {lastFetchedFromDb && <span className="text-emerald-400 font-mono mr-2">آخر استدعاء: {lastFetchedFromDb}</span>}
            </p>
          </div>
        </div>

        {/* System Health / Diagnostic Summary Strip */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${tariffFormData.tariffs?.residential > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-200">السكني المعتمد</div>
              <div className="text-[11px] font-mono text-amber-400 font-bold">
                {tariffFormData.tariffs?.residential || 0} {currency} / ك.و
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${tariffFormData.fixedFee >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-200">الرسوم الثابتة + الصيانة</div>
              <div className="text-[11px] font-mono text-slate-300 font-bold">
                {(tariffFormData.fixedFee || 0) + (tariffFormData.serviceFee || 0)} {currency} شهرياً
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-200">نظام الاحتساب</div>
              <div className="text-[11px] text-indigo-300 font-bold">
                {tariffFormData.tariffCalculationMethod === 'tiered_progressive' 
                  ? 'شرائح تصاعدية' 
                  : tariffFormData.tariffCalculationMethod === 'tiered_total_bracket' 
                  ? 'شريحة إجمالية' 
                  : 'سعر موحد حسب القطاع'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-200">دورة النزول الميداني</div>
              <div className="text-[11px] font-mono text-sky-300 font-bold">
                {tariffFormData.readingCycleIntervalDays || 10} أيام ({tariffFormData.readingCycleMode === 'decadal' ? 'عشرية' : tariffFormData.readingCycleMode === 'weekly' ? 'أسبوعية' : 'شهرية'})
              </div>
            </div>
          </div>
        </div>

        {/* Quick Tariff Management Tools Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-slate-300 font-bold">
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>أدوات الضبط وإدارة التعرفة:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleApplyUniformRate}
              className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold transition-all cursor-pointer text-xs flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>تعميم سعر موحد على كافة القطاعات</span>
            </button>
            <button
              type="button"
              onClick={handleClearAllDefaultData}
              className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold transition-all cursor-pointer text-xs flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>حذف وتصفير كافة البيانات الافتراضية والرسوم</span>
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3 text-xs">
          {[
            { id: 'sectors', label: 'تسعيرة القطاعات وطريقة الاحتساب', icon: Sliders },
            { id: 'slices', label: 'مصفوفة الشرائح التصاعدية', icon: Layers },
            { id: 'fees', label: 'الرسوم الثابتة والبلدية والخدمات', icon: DollarSign },
            { id: 'tou', label: 'تعرفة ساعات الذروة (ToU)', icon: Clock },
            { id: 'cycle', label: 'دورة النزول وسياسة الفوترة', icon: Calendar },
            { id: 'simulator', label: 'محاكي الفواتير المباشر', icon: Sparkles },
            { id: 'history', label: 'سجل التعديلات والاعتمادات', icon: History },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl font-bold transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-sm'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Sector Tariffs & Calculation Mode */}
        {activeSubTab === 'sectors' && (
          <div className="space-y-6">
            {/* Calculation Method Selection */}
            <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
                <span className="p-1 rounded bg-amber-500/10 text-amber-400">
                  <ArrowRightLeft className="w-4 h-4" />
                </span>
                <h4 className="font-bold text-amber-400 text-sm">أسلوب احتساب التعرفة المعتمد للمحطة</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  {
                    id: 'flat',
                    title: '1. نظام السعر الموحد (Flat Rate)',
                    desc: 'سعر ثابت ومحدد لكل كيلوواط حسب قطاع المشترك (سكني، تجاري، صناعي). الأكثر شيوعاً وسهولة.',
                    badge: 'الافتراضي والأنسب',
                  },
                  {
                    id: 'tiered_progressive',
                    title: '2. نظام الشرائح التصاعدية (Tiered Progressive)',
                    desc: 'يتم تجزئة استهلاك المشترك على شرائح تصاعدية (مثلاً أول 100 ك.و بسعر، وما زاد بسعر أعلى).',
                    badge: 'حماية صغار المستهلكين',
                  },
                  {
                    id: 'tiered_total_bracket',
                    title: '3. نظام الشريحة الإجمالية (Total Bracket Tier)',
                    desc: 'يحدد سعر الكيلوواط لكامل الفاتورة بناءً على الشريحة التي وصل إليها إجمالي الاستهلاك.',
                    badge: 'ترشيد الاستهلاك العالي',
                  },
                ].map(opt => (
                  <div
                    key={opt.id}
                    onClick={() => handleFieldChange(prev => ({ ...prev, tariffCalculationMethod: opt.id as any }))}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                      (tariffFormData.tariffCalculationMethod || 'flat') === opt.id
                        ? 'bg-amber-500/10 border-amber-500 shadow-md text-slate-100'
                        : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-xs text-white">{opt.title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        (tariffFormData.tariffCalculationMethod || 'flat') === opt.id
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {opt.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{opt.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Sector Rates Cards Matrix */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-200 text-xs flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>تسعيرة الكيلوواط/ساعة للقطاعات المختلفة ({currency})</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                {/* 1. Residential */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="font-bold flex items-center gap-1.5">
                      <span>🏠 القطاع السكني</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">المنازل والشقق</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={tariffFormData.tariffs.residential}
                      onChange={e => handleFieldChange(prev => ({
                        ...prev,
                        tariffs: { ...prev.tariffs, residential: Math.max(0, parseFloat(e.target.value) || 0) }
                      }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-amber-400 text-right focus:outline-none focus:border-amber-500 font-mono font-bold text-sm"
                    />
                    <span className="text-slate-400 font-bold shrink-0">{currency}</span>
                  </div>
                  <p className="text-[10px] text-slate-500">التعرفة المعتمدة لاشتراكات المنازل والعوائل</p>
                </div>

                {/* 2. Commercial */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="font-bold flex items-center gap-1.5">
                      <span>🏢 القطاع التجاري</span>
                    </span>
                    <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">محلات ومتاجر</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={tariffFormData.tariffs.commercial}
                      onChange={e => handleFieldChange(prev => ({
                        ...prev,
                        tariffs: { ...prev.tariffs, commercial: Math.max(0, parseFloat(e.target.value) || 0) }
                      }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-amber-400 text-right focus:outline-none focus:border-amber-500 font-mono font-bold text-sm"
                    />
                    <span className="text-slate-400 font-bold shrink-0">{currency}</span>
                  </div>
                  <p className="text-[10px] text-slate-500">المحلات التجارية، الأسواق، والمطاعم</p>
                </div>

                {/* 3. Industrial */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="font-bold flex items-center gap-1.5">
                      <span>🏭 القطاع الصناعي</span>
                    </span>
                    <span className="text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">ورش ومصانع</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={tariffFormData.tariffs.industrial}
                      onChange={e => handleFieldChange(prev => ({
                        ...prev,
                        tariffs: { ...prev.tariffs, industrial: Math.max(0, parseFloat(e.target.value) || 0) }
                      }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-amber-400 text-right focus:outline-none focus:border-amber-500 font-mono font-bold text-sm"
                    />
                    <span className="text-slate-400 font-bold shrink-0">{currency}</span>
                  </div>
                  <p className="text-[10px] text-slate-500">الورش، المصانع، والمؤسسات كثيفة الاستهلاك</p>
                </div>

                {/* 4. Government */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="font-bold flex items-center gap-1.5">
                      <span>🏛️ القطاع الحكومي</span>
                    </span>
                    <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">مؤسسات رسمية</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={tariffFormData.tariffs.government ?? 0}
                      onChange={e => handleFieldChange(prev => ({
                        ...prev,
                        tariffs: { ...prev.tariffs, government: Math.max(0, parseFloat(e.target.value) || 0) }
                      }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-amber-400 text-right focus:outline-none focus:border-amber-500 font-mono font-bold text-sm"
                    />
                    <span className="text-slate-400 font-bold shrink-0">{currency}</span>
                  </div>
                  <p className="text-[10px] text-slate-500">المكاتب والمقرات والمرافق الحكومية</p>
                </div>

                {/* 5. Agricultural */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="font-bold flex items-center gap-1.5">
                      <span>🌾 القطاع الزراعي وضخ المياه</span>
                    </span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">مزارع وآبار</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={tariffFormData.tariffs.agricultural ?? 0}
                      onChange={e => handleFieldChange(prev => ({
                        ...prev,
                        tariffs: { ...prev.tariffs, agricultural: Math.max(0, parseFloat(e.target.value) || 0) }
                      }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-amber-400 text-right focus:outline-none focus:border-amber-500 font-mono font-bold text-sm"
                    />
                    <span className="text-slate-400 font-bold shrink-0">{currency}</span>
                  </div>
                  <p className="text-[10px] text-slate-500">آبار مياه الشرب، شبكات الري والمزارع</p>
                </div>

                {/* 6. Mosques & Charity */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="font-bold flex items-center gap-1.5">
                      <span>🕌 دور العبادة والمساجد</span>
                    </span>
                    <span className="text-[10px] text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full">تعرفة مدعومة</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={tariffFormData.tariffs.mosque ?? 0}
                      onChange={e => handleFieldChange(prev => ({
                        ...prev,
                        tariffs: { ...prev.tariffs, mosque: Math.max(0, parseFloat(e.target.value) || 0) }
                      }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-amber-400 text-right focus:outline-none focus:border-amber-500 font-mono font-bold text-sm"
                    />
                    <span className="text-slate-400 font-bold shrink-0">{currency}</span>
                  </div>
                  <p className="text-[10px] text-slate-500">المساجد، الجمعيات الخيرية والمرافق الإنسانية</p>
                </div>

                {/* 7. Other / General */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="font-bold flex items-center gap-1.5">
                      <span>⚡ قطاعات أخرى / عام</span>
                    </span>
                    <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">اشتراكات متنوعة</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={tariffFormData.tariffs.other ?? 0}
                      onChange={e => handleFieldChange(prev => ({
                        ...prev,
                        tariffs: { ...prev.tariffs, other: Math.max(0, parseFloat(e.target.value) || 0) }
                      }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-amber-400 text-right focus:outline-none focus:border-amber-500 font-mono font-bold text-sm"
                    />
                    <span className="text-slate-400 font-bold shrink-0">{currency}</span>
                  </div>
                  <p className="text-[10px] text-slate-500">أي اشتراكات خارج التصنيفات السابقة</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Tiered Progressive Slices */}
        {activeSubTab === 'slices' && (
          <div className="space-y-4">
            <TariffSlicesManager
              slices={tariffFormData.tariffSlices || []}
              onChange={newSlices => handleFieldChange(prev => ({ ...prev, tariffSlices: newSlices }))}
              currency={currency}
            />
          </div>
        )}

        {/* Tab 3: Detailed Itemized Fees & Surcharges */}
        {activeSubTab === 'fees' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
              {/* Group A: Periodic Recurring Fees */}
              <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/80 space-y-4">
                <h4 className="font-bold text-amber-400 border-b border-slate-900 pb-1.5 flex items-center justify-start gap-1.5">
                  <DollarSign className="w-4 h-4" />
                  <span>الرسوم الدورية الشهرية</span>
                </h4>

                <div>
                  <label className="block text-slate-400 mb-1">الرسوم الثابتة لكل اشتراك (شهرياً)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      required
                      value={tariffFormData.fixedFee}
                      onChange={e => handleFieldChange(prev => ({
                        ...prev,
                        fixedFee: Math.max(0, parseFloat(e.target.value) || 0)
                      }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none focus:border-amber-500 font-mono font-bold"
                    />
                    <span className="text-slate-400 font-bold">{currency}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">رسوم الصيانة وخدمة الشبكة (شهرياً)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      required
                      value={tariffFormData.serviceFee}
                      onChange={e => handleFieldChange(prev => ({
                        ...prev,
                        serviceFee: Math.max(0, parseFloat(e.target.value) || 0)
                      }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none focus:border-amber-500 font-mono font-bold"
                    />
                    <span className="text-slate-400 font-bold">{currency}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">رسوم النظافة والتحسين البلدية (شهرياً)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={tariffFormData.cleaningFee ?? 0}
                      onChange={e => handleFieldChange(prev => ({
                        ...prev,
                        cleaningFee: Math.max(0, parseFloat(e.target.value) || 0)
                      }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none focus:border-amber-500 font-mono font-bold"
                    />
                    <span className="text-slate-400 font-bold">{currency}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">رسوم إنارة الشوارع والأماكن العامة</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={tariffFormData.streetLightFee ?? 0}
                      onChange={e => handleFieldChange(prev => ({
                        ...prev,
                        streetLightFee: Math.max(0, parseFloat(e.target.value) || 0)
                      }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none focus:border-amber-500 font-mono font-bold"
                    />
                    <span className="text-slate-400 font-bold">{currency}</span>
                  </div>
                </div>
              </div>

              {/* Group B: Taxes, Deposit & Consumption Controls */}
              <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/80 space-y-4">
                <h4 className="font-bold text-amber-400 border-b border-slate-900 pb-1.5 flex items-center justify-start gap-1.5">
                  <Percent className="w-4 h-4" />
                  <span>الضرائب والتأمين والحد الأدنى</span>
                </h4>

                <div>
                  <label className="block text-slate-400 mb-1">ضريبة المبيعات / القيمة المضافة (%)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      required
                      value={tariffFormData.taxPercent ?? 0}
                      onChange={e => handleFieldChange(prev => ({
                        ...prev,
                        taxPercent: Math.max(0, parseFloat(e.target.value) || 0)
                      }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none focus:border-amber-500 font-mono font-bold"
                    />
                    <span className="text-slate-400 font-bold">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">مبلغ تأمين العداد الافتراضي ({currency})</label>
                  <input
                    type="number"
                    min="0"
                    value={tariffFormData.meterInsuranceDeposit ?? 0}
                    placeholder="0"
                    onChange={e => handleFieldChange(prev => ({
                      ...prev,
                      meterInsuranceDeposit: Math.max(0, parseFloat(e.target.value) || 0)
                    }))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">الحد الأدنى للاستهلاك الشهري (ك.و/س)</label>
                  <input
                    type="number"
                    min="0"
                    value={tariffFormData.minMonthlyConsumptionKwh ?? 0}
                    placeholder="0"
                    onChange={e => handleFieldChange(prev => ({
                      ...prev,
                      minMonthlyConsumptionKwh: Math.max(0, parseFloat(e.target.value) || 0)
                    }))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">في حال قل استهلاك المشترك عن هذا الحد، يُحاسب على الحد الأدنى</span>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">رسوم إيجار العداد (لغير المالكين)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={tariffFormData.meterRentalFee ?? 0}
                      onChange={e => handleFieldChange(prev => ({
                        ...prev,
                        meterRentalFee: Math.max(0, parseFloat(e.target.value) || 0)
                      }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none font-mono"
                    />
                    <span className="text-slate-400 font-bold">{currency}</span>
                  </div>
                </div>
              </div>

              {/* Group C: Administrative Services & Penalties */}
              <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800/80 space-y-4">
                <h4 className="font-bold text-amber-400 border-b border-slate-900 pb-1.5 flex items-center justify-start gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  <span>الخدمات الإدارية والغرامات</span>
                </h4>

                <div>
                  <label className="block text-slate-400 mb-1">رسوم إعادة التوصيل بعد الفصل</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={tariffFormData.reconnectionFee ?? 0}
                      onChange={e => handleFieldChange(prev => ({
                        ...prev,
                        reconnectionFee: Math.max(0, parseFloat(e.target.value) || 0)
                      }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none font-mono"
                    />
                    <span className="text-slate-400 font-bold">{currency}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">غرامة التأخير عن السداد (لكل يوم تأخير)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={tariffFormData.latePenaltyPerDay ?? 0}
                      onChange={e => handleFieldChange(prev => ({
                        ...prev,
                        latePenaltyPerDay: Math.max(0, parseFloat(e.target.value) || 0)
                      }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none font-mono"
                    />
                    <span className="text-slate-400 font-bold">{currency}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">رسوم فحص ومعايرة العداد</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={tariffFormData.meterInspectionFee ?? 0}
                      onChange={e => handleFieldChange(prev => ({
                        ...prev,
                        meterInspectionFee: Math.max(0, parseFloat(e.target.value) || 0)
                      }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none font-mono"
                    />
                    <span className="text-slate-400 font-bold">{currency}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">رسوم نقل ملكية / التنازل عن الاشتراك</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={tariffFormData.nameTransferFee ?? 0}
                      onChange={e => handleFieldChange(prev => ({
                        ...prev,
                        nameTransferFee: Math.max(0, parseFloat(e.target.value) || 0)
                      }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none font-mono"
                    />
                    <span className="text-slate-400 font-bold">{currency}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Time of Use (ToU) / Peak Tariff */}
        {activeSubTab === 'tou' && (
          <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-900 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Clock className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="font-bold text-white text-sm">تعرفة فترات الذروة ووقت الاستخدام (Time-of-Use [ToU] Tariff)</h4>
                  <p className="text-[11px] text-slate-400">تطبيق زيادة على سعر الكيلوواط خلال ساعات الحمل الأقصى لتشجيع ترشيد الاستهلاك</p>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800">
                <input
                  type="checkbox"
                  checked={!!tariffFormData.touEnabled}
                  onChange={e => handleFieldChange(prev => ({ ...prev, touEnabled: e.target.checked }))}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <span className="font-bold text-xs text-amber-400">تفعيل تعرفة ساعات الذروة</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1.5 font-bold">معامل زيادة سعر الذروة (مضاعف السعر)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.05"
                    min="1.0"
                    max="3.0"
                    disabled={!tariffFormData.touEnabled}
                    value={tariffFormData.peakMultiplier ?? 1.25}
                    onChange={e => handleFieldChange(prev => ({
                      ...prev,
                      peakMultiplier: Math.max(1.0, parseFloat(e.target.value) || 1.25)
                    }))}
                    className="w-full bg-slate-900 disabled:opacity-50 border border-slate-800 rounded-lg py-2 px-3 text-amber-400 font-mono font-bold text-right focus:outline-none"
                  />
                  <span className="text-slate-400 font-bold shrink-0">
                    (+{Math.round(((tariffFormData.peakMultiplier ?? 1.25) - 1) * 100)}%)
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">مثال: 1.25 يعني زيادة 25% على سعر الكيلوواط في وقت الذروة</span>
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 font-bold">وقت بداية ساعات الذروة المسائية</label>
                <input
                  type="time"
                  disabled={!tariffFormData.touEnabled}
                  value={tariffFormData.peakHoursStart || '18:00'}
                  onChange={e => handleFieldChange(prev => ({ ...prev, peakHoursStart: e.target.value }))}
                  className="w-full bg-slate-900 disabled:opacity-50 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 font-mono text-right focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5 font-bold">وقت نهاية ساعات الذروة المسائية</label>
                <input
                  type="time"
                  disabled={!tariffFormData.touEnabled}
                  value={tariffFormData.peakHoursEnd || '23:00'}
                  onChange={e => handleFieldChange(prev => ({ ...prev, peakHoursEnd: e.target.value }))}
                  className="w-full bg-slate-900 disabled:opacity-50 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 font-mono text-right focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Reading Cycle & Policy Rules */}
        {activeSubTab === 'cycle' && (
          <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800 space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <Calendar className="w-5 h-5" />
              </span>
              <div>
                <h4 className="font-bold text-white text-sm">دورة النزول الميداني وقراءة العدادات</h4>
                <p className="text-[11px] text-slate-400">تحديد جدول مواعيد النزول للمحصلين لحساب الفواتير الدورية</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-4">
                <div>
                  <label className="block text-slate-400 mb-1.5 font-bold">نظام دورة أخذ القراءات المعتمد</label>
                  <select
                    value={tariffFormData.readingCycleMode || 'decadal'}
                    onChange={e => {
                      const mode = e.target.value as 'decadal' | 'monthly' | 'weekly';
                      const interval = mode === 'decadal' ? 10 : mode === 'weekly' ? 7 : 30;
                      handleFieldChange(prev => ({
                        ...prev,
                        readingCycleMode: mode,
                        readingCycleIntervalDays: interval
                      }));
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 px-3 text-slate-200 text-right focus:outline-none font-bold"
                  >
                    <option value="decadal">نظام العشرية - كل 10 أيام (3 مرات شهرياً)</option>
                    <option value="weekly">نظام أسبوعي - كل 7 أيام (4 مرات شهرياً)</option>
                    <option value="monthly">نظام شهري - كل 30 يوماً (مرة واحدة شهرياً)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1.5 font-bold">عدد الأيام الفاصل بين كل نزول ميداني</label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-xs font-bold">أيام</span>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={tariffFormData.readingCycleIntervalDays || 10}
                      onChange={e => handleFieldChange(prev => ({
                        ...prev,
                        readingCycleIntervalDays: Math.max(1, parseInt(e.target.value) || 10)
                      }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-[11px] text-slate-400">
                <div className="font-bold text-slate-300 text-xs">ملاحظات تشغيلية حول دورة الفوترة:</div>
                <p>• في نظام العشرية، يتم تقسيم الشهر إلى 3 فترات (1-10، 11-20، 21-نهاية الشهر).</p>
                <p>• يتم احتساب الرسوم الثابتة ورسوم الخدمة بالتناسب أو دورياً حسب القواعد المحاسبية المعتمدة للمحطة.</p>
                <p>• تنعكس هذه الدورة مباشرة في تطبيق المحصل الميداني لتنبيهه بمواعيد أخذ القراءات وتصدير الفواتير.</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Interactive Live Bill Simulator */}
        {activeSubTab === 'simulator' && (
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 rounded-2xl border border-amber-500/30 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                  <Sparkles className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="font-black text-sm text-white">حاسبة ومحاكي احتساب الفواتير المباشر (Pro Live Bill Simulator)</h4>
                  <p className="text-[11px] text-slate-400">اختبر احتساب قيمة الفاتورة فورياً بتطبيق كافة القواعد والشرائح والرسوم المحددة أعلاه.</p>
                </div>
              </div>
              
              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-mono text-[10px] font-bold">
                حساب فوري دقيق
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-xs">
              {/* Left Controls (5 cols) */}
              <div className="md:col-span-5 space-y-4 bg-slate-900/80 p-5 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">كمية الاستهلاك للتجربة (كيلوواط/ساعة):</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={simKwh}
                      onChange={e => setSimKwh(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-amber-400 font-mono font-bold text-base text-right focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-slate-400 font-bold shrink-0">ك.و/س</span>
                  </div>

                  {/* Slider Control */}
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    step="10"
                    value={simKwh}
                    onChange={e => setSimKwh(parseFloat(e.target.value) || 0)}
                    className="w-full mt-2 accent-amber-500 cursor-pointer"
                  />

                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[50, 100, 180, 300, 500, 800].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setSimKwh(val)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                          simKwh === val 
                            ? 'bg-amber-500 text-slate-950 font-black' 
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {val} ك.و
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">نوع الاشتراك / القطاع التجريبي:</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'residential', label: 'سكني' },
                      { id: 'commercial', label: 'تجاري' },
                      { id: 'industrial', label: 'صناعي' },
                      { id: 'government', label: 'حكومي' },
                      { id: 'agricultural', label: 'زراعي' },
                      { id: 'mosque', label: 'مساجد' },
                      { id: 'other', label: 'أخرى' },
                    ].map(sec => (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => setSimSector(sec.id)}
                        className={`py-2 px-1 rounded-lg text-xs font-bold transition-all cursor-pointer border text-center ${
                          simSector === sec.id
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-sm'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        {sec.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Additional Option Checkboxes */}
                <div className="space-y-2 border-t border-slate-800 pt-3">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-[11px]">
                    <input
                      type="checkbox"
                      checked={simIsPeak}
                      onChange={e => setSimIsPeak(e.target.checked)}
                      className="w-3.5 h-3.5 accent-amber-500 rounded"
                    />
                    <span>تطبيق ساعات الذروة (+{Math.round(((tariffFormData.peakMultiplier ?? 1.0) - 1) * 100)}%)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-[11px]">
                    <input
                      type="checkbox"
                      checked={simHasMeterRental}
                      onChange={e => setSimHasMeterRental(e.target.checked)}
                      className="w-3.5 h-3.5 accent-amber-500 rounded"
                    />
                    <span>إضافة رسم إيجار العداد ({tariffFormData.meterRentalFee ?? 0} {currency})</span>
                  </label>
                </div>
              </div>

              {/* Right Calculation Output Breakdown (7 cols) */}
              <div className="md:col-span-7 bg-slate-950/90 p-5 rounded-xl border border-slate-800 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-slate-400 border-b border-slate-800 pb-2">
                    <span className="font-bold text-slate-300">طريقة الحساب المطبقة:</span>
                    <span className="font-bold text-amber-400 text-xs">
                      {simResult.calculationMethod === 'tiered_progressive' 
                        ? 'شرائح استهلاكية تصاعدية' 
                        : simResult.calculationMethod === 'tiered_total_bracket' 
                        ? 'شريحة إجمالية' 
                        : 'سعر موحد حسب القطاع'}
                    </span>
                  </div>

                  {/* Slices Breakdown List */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold text-slate-400">تفكيك قيمة الطاقة المستهلكة ({simResult.kwhBilled} ك.و/س):</div>
                    {simResult.slices.map((slice, sIdx) => (
                      <div key={sIdx} className="flex justify-between items-center bg-slate-900/60 p-2 rounded-lg text-xs">
                        <span className="text-slate-300">{slice.sliceName} ({slice.kwhUsed} ك.و × {slice.ratePerKwh} {currency}):</span>
                        <span className="font-mono font-bold text-white">{slice.totalSliceAmount.toLocaleString()} {currency}</span>
                      </div>
                    ))}
                  </div>

                  {/* Itemized Fees Summary */}
                  <div className="space-y-1.5 text-xs text-slate-400 border-t border-slate-800/80 pt-2">
                    <div className="flex justify-between items-center">
                      <span>الرسوم الثابتة + الصيانة:</span>
                      <span className="font-mono text-slate-300 font-bold">
                        {(simResult.fixedFee + simResult.serviceFee).toLocaleString()} {currency}
                      </span>
                    </div>

                    {(simResult.cleaningFee > 0 || simResult.streetLightFee > 0) && (
                      <div className="flex justify-between items-center">
                        <span>رسوم النظافة والإنارة:</span>
                        <span className="font-mono text-slate-300">
                          {(simResult.cleaningFee + simResult.streetLightFee).toLocaleString()} {currency}
                        </span>
                      </div>
                    )}

                    {simResult.meterRentalFee > 0 && (
                      <div className="flex justify-between items-center">
                        <span>إيجار العداد:</span>
                        <span className="font-mono text-slate-300">{simResult.meterRentalFee.toLocaleString()} {currency}</span>
                      </div>
                    )}

                    {simResult.touApplied && (
                      <div className="flex justify-between items-center text-amber-400">
                        <span>إضافة تعرفة الذروة:</span>
                        <span className="font-mono font-bold">+{simResult.peakSurcharge.toLocaleString()} {currency}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span>ضريبة القيمة المضافة ({simResult.taxPercent}%):</span>
                      <span className="font-mono text-amber-300 font-bold">
                        +{simResult.taxAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Final Total Output */}
                <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900/80 p-4 rounded-xl gap-2">
                  <div>
                    <span className="font-black text-amber-400 text-sm block">إجمالي الفاتورة التقديرية:</span>
                    <span className="text-[10px] text-slate-400">
                      متوسط تكلفة الكيلوواط الفعلي: <strong className="font-mono text-slate-200">{simResult.effectiveRatePerKwh.toFixed(1)} {currency}</strong>
                    </span>
                  </div>
                  <span className="font-mono font-black text-emerald-400 text-xl">
                    {simResult.grossTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 7: Tariff Audit & Modification History */}
        {activeSubTab === 'history' && (
          <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-900 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <History className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="font-bold text-white text-sm">سجل التعديلات والاعتمادات التاريخية للتعرفة</h4>
                  <p className="text-[11px] text-slate-400">توثيق كامل لكافة التغييرات التي تمت على تعرفة الكهرباء والرسوم</p>
                </div>
              </div>

              {tariffFormData.tariffAuditHistory && tariffFormData.tariffAuditHistory.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAuditHistory}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold transition-all text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>تفريغ وحذف سجل التعديلات</span>
                </button>
              )}
            </div>

            {tariffFormData.tariffAuditHistory && tariffFormData.tariffAuditHistory.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-xs text-right border-collapse">
                  <thead className="bg-slate-900 text-slate-300 font-bold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4">التاريخ والوقت</th>
                      <th className="py-2.5 px-4">المستخدم</th>
                      <th className="py-2.5 px-4">العملية</th>
                      <th className="py-2.5 px-4">التعرفة السابقة</th>
                      <th className="py-2.5 px-4">التعرفة الجديدة المعتمدة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {tariffFormData.tariffAuditHistory.map(item => (
                      <tr key={item.id} className="bg-slate-950/40 hover:bg-slate-900/40 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-slate-400">{item.date}</td>
                        <td className="py-2.5 px-4 font-bold text-white">{item.user}</td>
                        <td className="py-2.5 px-4 text-amber-400">{item.action}</td>
                        <td className="py-2.5 px-4 text-slate-400 text-[11px]">{item.previousTariffSummary}</td>
                        <td className="py-2.5 px-4 text-emerald-400 text-[11px] font-bold">{item.newTariffSummary}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                لا توجد سجلات تعديل سابقة مسجلة حتى الآن. سيتم تسجيل أي تعديل تقوم به تلقائياً في قاعدة البيانات.
              </div>
            )}
          </div>
        )}
      </form>

      {/* Official Tariff Schedule Printable Modal */}
      <OfficialTariffScheduleModal
        isOpen={isOfficialScheduleModalOpen}
        onClose={() => setIsOfficialScheduleModalOpen(false)}
        settings={tariffFormData}
      />
    </motion.div>
  );
};
