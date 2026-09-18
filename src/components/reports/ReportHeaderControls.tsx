import React from 'react';
import { 
  BarChart3, Calendar, Map, Filter, RefreshCw, Download, 
  Printer, FileSpreadsheet, Search, Layers, UserCheck, 
  Sparkles, FileCode, CheckCircle2, ChevronDown, Sliders
} from 'lucide-react';
import { ReportFilterState, ReportTabType } from './types';
import { SystemSettings } from '../../types';
import { safePrint } from '../../utils/exportUtils';

interface ReportHeaderControlsProps {
  activeTab: ReportTabType;
  setActiveTab: (tab: ReportTabType) => void;
  filters: ReportFilterState;
  onUpdateFilters: (filters: Partial<ReportFilterState>) => void;
  settings: SystemSettings;
  onOpenDueBalancesModal: () => void;
  onExportCSV: () => void;
  onExportJSON: () => void;
  collectorsList: string[];
}

export const ReportHeaderControls: React.FC<ReportHeaderControlsProps> = ({
  activeTab,
  setActiveTab,
  filters,
  onUpdateFilters,
  settings,
  onOpenDueBalancesModal,
  onExportCSV,
  onExportJSON,
  collectorsList
}) => {
  const handlePresetSelect = (preset: ReportFilterState['datePreset']) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'all') {
      onUpdateFilters({ datePreset: 'all', fromDate: '', toDate: '' });
      return;
    }

    if (preset === 'today') {
      onUpdateFilters({ datePreset: 'today', fromDate: todayStr, toDate: todayStr });
      return;
    }

    if (preset === 'yesterday') {
      const yest = new Date(today);
      yest.setDate(yest.getDate() - 1);
      const yestStr = yest.toISOString().split('T')[0];
      onUpdateFilters({ datePreset: 'yesterday', fromDate: yestStr, toDate: yestStr });
      return;
    }

    if (preset === 'this_week') {
      const day = today.getDay(); // 0 is Sun, 6 is Sat
      const diff = today.getDate() - day + (day === 6 ? 0 : -1); // Arabic work week approx
      const weekStart = new Date(today.setDate(diff));
      const weekStartStr = weekStart.toISOString().split('T')[0];
      onUpdateFilters({ datePreset: 'this_week', fromDate: weekStartStr, toDate: todayStr });
      return;
    }

    if (preset === 'this_month') {
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      onUpdateFilters({ datePreset: 'this_month', fromDate: `${year}-${month}-01`, toDate: todayStr });
      return;
    }

    if (preset === 'last_month') {
      const last = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const year = last.getFullYear();
      const month = String(last.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
      onUpdateFilters({ datePreset: 'last_month', fromDate: `${year}-${month}-01`, toDate: `${year}-${month}-${lastDay}` });
      return;
    }

    if (preset === 'this_quarter') {
      const currentQuarter = Math.floor(today.getMonth() / 3);
      const qStartMonth = String(currentQuarter * 3 + 1).padStart(2, '0');
      const year = today.getFullYear();
      onUpdateFilters({ datePreset: 'this_quarter', fromDate: `${year}-${qStartMonth}-01`, toDate: todayStr });
      return;
    }

    if (preset === 'this_year') {
      const year = today.getFullYear();
      onUpdateFilters({ datePreset: 'this_year', fromDate: `${year}-01-01`, toDate: todayStr });
      return;
    }
  };

  const hasActiveFilters = Boolean(
    filters.fromDate || 
    filters.toDate || 
    filters.zoneFilter !== 'all' || 
    filters.categoryFilter !== 'all' || 
    filters.collectorFilter !== 'all' || 
    filters.searchQuery ||
    filters.transformerFilter !== 'all'
  );

  const resetAllFilters = () => {
    onUpdateFilters({
      datePreset: 'all',
      fromDate: '',
      toDate: '',
      zoneFilter: 'all',
      categoryFilter: 'all',
      collectorFilter: 'all',
      transformerFilter: 'all',
      searchQuery: ''
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl space-y-5 text-right" dir="rtl">
      {/* 1. TOP TITLE & ACTION BUTTONS */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>وحدة التقارير الشاملة وتحليلات المنظومة</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  ERP Analytics
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-bold mt-0.5">
                مركز المراقبة والتحليلات الاستراتيجية والمؤشرات المالية والتشغيلية لمحطة: <span className="text-amber-300 font-black">{settings.stationName || 'محطة الكهرباء'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-stretch lg:self-auto">
          <button
            type="button"
            onClick={onOpenDueBalancesModal}
            className="flex-1 sm:flex-none bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/20 active:scale-95"
            title="فتح كشف المبالغ المستحقة والمحصلة وإشعارات التحصيل الميداني"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>كشف المستحقات والمحصل الميداني</span>
          </button>

          <button
            type="button"
            onClick={onExportCSV}
            className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:border-emerald-500/50"
            title="تصدير جدول التقرير النشط بتنسيق CSV متوافق مع Microsoft Excel"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>تصدير Excel (CSV)</span>
          </button>

          <button
            type="button"
            onClick={onExportJSON}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            title="تصدير مصفوفة البيانات الخام بتنسيق JSON"
          >
            <FileCode className="w-4 h-4 text-indigo-400" />
            <span>JSON</span>
          </button>

          <button
            type="button"
            onClick={() => safePrint()}
            className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="طباعة التقرير أو حفظه بصيغة PDF"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>طباعة A4 / PDF</span>
          </button>
        </div>
      </div>

      {/* 2. ADVANCED FILTER CONTROLS BAR */}
      <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 space-y-3">
        {/* Row 1: Time Presets & Custom Date Pickers */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => handlePresetSelect('today')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                filters.datePreset === 'today' ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              اليوم
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect('this_week')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                filters.datePreset === 'this_week' ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              هذا الأسبوع
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect('this_month')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                filters.datePreset === 'this_month' ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              هذا الشهر
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect('last_month')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                filters.datePreset === 'last_month' ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              الشهر السابق
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect('this_quarter')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                filters.datePreset === 'this_quarter' ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              الربع الحالي
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect('this_year')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                filters.datePreset === 'this_year' ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              هذا العام
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect('all')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                filters.datePreset === 'all' ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              كافة الفترات
            </button>
          </div>

          {/* Date Pickers */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-300">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span className="text-slate-500">من:</span>
              <input
                type="date"
                value={filters.fromDate}
                onChange={e => onUpdateFilters({ fromDate: e.target.value, datePreset: 'custom' })}
                className="bg-transparent text-white font-mono text-xs outline-none cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-300">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span className="text-slate-500">إلى:</span>
              <input
                type="date"
                value={filters.toDate}
                onChange={e => onUpdateFilters({ toDate: e.target.value, datePreset: 'custom' })}
                className="bg-transparent text-white font-mono text-xs outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Secondary Dropdowns (Zone, Category, Collector, Search, Reset) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs font-bold pt-1 border-t border-slate-900">
          {/* Zone Filter */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-slate-300">
            <Map className="w-4 h-4 text-sky-400 shrink-0" />
            <select
              value={filters.zoneFilter}
              onChange={e => onUpdateFilters({ zoneFilter: e.target.value })}
              className="w-full bg-transparent text-slate-200 outline-none cursor-pointer font-bold"
            >
              <option value="all" className="bg-slate-900 text-white">كافة المناطق الجغرافية</option>
              {(settings.zones || []).map((z, idx) => (
                <option key={idx} value={z} className="bg-slate-900 text-white">{z}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-slate-300">
            <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
            <select
              value={filters.categoryFilter}
              onChange={e => onUpdateFilters({ categoryFilter: e.target.value })}
              className="w-full bg-transparent text-slate-200 outline-none cursor-pointer font-bold"
            >
              <option value="all" className="bg-slate-900 text-white">كافة تصنيفات الاشتراكات</option>
              <option value="commercial" className="bg-slate-900 text-white">تجاري</option>
              <option value="residential" className="bg-slate-900 text-white">سكني</option>
              <option value="industrial" className="bg-slate-900 text-white">صناعي / ورش</option>
              <option value="agricultural" className="bg-slate-900 text-white">زراعي / مضخات</option>
            </select>
          </div>

          {/* Collector Filter */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-slate-300">
            <UserCheck className="w-4 h-4 text-indigo-400 shrink-0" />
            <select
              value={filters.collectorFilter}
              onChange={e => onUpdateFilters({ collectorFilter: e.target.value })}
              className="w-full bg-transparent text-slate-200 outline-none cursor-pointer font-bold"
            >
              <option value="all" className="bg-slate-900 text-white">كافة المحصلين / الصناديق</option>
              {collectorsList.map((col, idx) => (
                <option key={idx} value={col} className="bg-slate-900 text-white">{col}</option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-slate-300">
            <Search className="w-4 h-4 text-slate-500 shrink-0" />
            <input
              type="text"
              placeholder="بحث بالاسم، العداد، الهاتف..."
              value={filters.searchQuery}
              onChange={e => onUpdateFilters({ searchQuery: e.target.value })}
              className="w-full bg-transparent text-white placeholder-slate-500 outline-none font-bold text-xs"
            />
          </div>

          {/* Reset Filters */}
          <div className="flex items-center justify-end">
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={resetAllFilters}
                className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all font-black cursor-pointer active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>إعادة ضبط الفلاتر</span>
              </button>
            ) : (
              <div className="w-full text-center text-slate-500 text-[11px] font-bold py-2 bg-slate-900/50 rounded-xl border border-slate-800/50">
                <span>تطبيق الفلترة العامة تلقائياً ✓</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
