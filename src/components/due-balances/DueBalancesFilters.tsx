import React from 'react';
import { 
  Search, X, RotateCcw, Users, Scale, ArrowDownUp, 
  Filter, Calendar, Sparkles, SlidersHorizontal 
} from 'lucide-react';
import { FilterType } from './types';
import { SearchScope } from '../../utils/arabicSearchUtils';

interface DueBalancesFiltersProps {
  filterType: FilterType;
  onSelectFilterType: (type: FilterType) => void;
  categoryCounts: Record<FilterType, number>;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchScope: SearchScope;
  onSearchScopeChange: (scope: SearchScope) => void;
  selectedZone: string;
  onZoneChange: (zone: string) => void;
  uniqueZones: string[];
  selectedTransformer: string;
  onTransformerChange: (transformer: string) => void;
  uniqueTransformers: string[];
  selectedCollector: string;
  onCollectorChange: (collector: string) => void;
  uniqueCollectors: string[];
  selectedTariff: string;
  onTariffChange: (tariff: string) => void;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  uniqueMonths: string[];
  sortBy: 'totalDue' | 'collected' | 'billed' | 'name' | 'meter' | 'overdue';
  onSortByChange: (sort: 'totalDue' | 'collected' | 'billed' | 'name' | 'meter' | 'overdue') => void;
  sortOrder: 'asc' | 'desc';
  onToggleSortOrder: () => void;
  activeFiltersCount: number;
  onResetFilters: () => void;
  onApplyProfilePreset: (type: 'field' | 'financial') => void;
}

export const DueBalancesFilters: React.FC<DueBalancesFiltersProps> = ({
  filterType,
  onSelectFilterType,
  categoryCounts,
  searchQuery,
  onSearchChange,
  searchScope,
  onSearchScopeChange,
  selectedZone,
  onZoneChange,
  uniqueZones,
  selectedTransformer,
  onTransformerChange,
  uniqueTransformers,
  selectedCollector,
  onCollectorChange,
  uniqueCollectors,
  selectedTariff,
  onTariffChange,
  selectedMonth,
  onMonthChange,
  uniqueMonths,
  sortBy,
  onSortByChange,
  sortOrder,
  onToggleSortOrder,
  activeFiltersCount,
  onResetFilters,
  onApplyProfilePreset
}) => {
  return (
    <div id="due-balances-filters-bar" className="p-3 sm:p-4 border-b border-slate-800 bg-slate-950/70 space-y-2.5 sm:space-y-3 shrink-0 print:hidden">
      {/* 1. Quick Category Pills Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth whitespace-nowrap text-xs font-black">
        {/* Debtors Only (Primary focus) */}
        <button
          type="button"
          onClick={() => onSelectFilterType('debtorsOnly')}
          className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            filterType === 'debtorsOnly'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>المدينين (المطلوب سداده)</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            filterType === 'debtorsOnly' ? 'bg-rose-700 text-white' : 'bg-slate-800 text-slate-400'
          }`}>
            {categoryCounts.debtorsOnly}
          </span>
        </button>

        {/* Unpaid Only */}
        <button
          type="button"
          onClick={() => onSelectFilterType('unpaidOnly')}
          className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            filterType === 'unpaidOnly'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>لم يسددوا إطلاقاً</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            filterType === 'unpaidOnly' ? 'bg-red-800 text-white' : 'bg-slate-800 text-slate-400'
          }`}>
            {categoryCounts.unpaidOnly}
          </span>
        </button>

        {/* Partial Paid */}
        <button
          type="button"
          onClick={() => onSelectFilterType('partialPaid')}
          className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            filterType === 'partialPaid'
              ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>مسدد جزئياً</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            filterType === 'partialPaid' ? 'bg-amber-600 text-slate-950' : 'bg-slate-800 text-slate-400'
          }`}>
            {categoryCounts.partialPaid}
          </span>
        </button>

        {/* Fully Paid */}
        <button
          type="button"
          onClick={() => onSelectFilterType('fullyPaid')}
          className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            filterType === 'fullyPaid'
              ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>مسدد بالكامل</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            filterType === 'fullyPaid' ? 'bg-emerald-600 text-slate-950' : 'bg-slate-800 text-slate-400'
          }`}>
            {categoryCounts.fullyPaid}
          </span>
        </button>

        {/* All Subscribers */}
        <button
          type="button"
          onClick={() => onSelectFilterType('all')}
          className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            filterType === 'all'
              ? 'bg-sky-500 text-slate-950 font-black shadow-md shadow-sky-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>كل المشتركين</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            filterType === 'all' ? 'bg-sky-600 text-slate-950' : 'bg-slate-800 text-slate-400'
          }`}>
            {categoryCounts.all}
          </span>
        </button>

        {/* Creditors */}
        <button
          type="button"
          onClick={() => onSelectFilterType('creditorsOnly')}
          className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            filterType === 'creditorsOnly'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>رصيد دائن (لهم)</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            filterType === 'creditorsOnly' ? 'bg-blue-800 text-white' : 'bg-slate-800 text-slate-400'
          }`}>
            {categoryCounts.creditorsOnly}
          </span>
        </button>

        {/* Aging: Current Month (0-30 days) */}
        <button
          type="button"
          onClick={() => onSelectFilterType('aging_current')}
          className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            filterType === 'aging_current'
              ? 'bg-teal-500 text-slate-950 font-black shadow-md'
              : 'bg-slate-900 text-teal-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>0 - 30 يوم</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            filterType === 'aging_current' ? 'bg-teal-700 text-white' : 'bg-slate-800 text-teal-300'
          }`}>
            {categoryCounts.aging_current}
          </span>
        </button>

        {/* Aging: 31-60 days */}
        <button
          type="button"
          onClick={() => onSelectFilterType('aging_31_60')}
          className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            filterType === 'aging_31_60'
              ? 'bg-amber-600 text-white font-black shadow-md'
              : 'bg-slate-900 text-amber-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>31 - 60 يوم</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            filterType === 'aging_31_60' ? 'bg-amber-800 text-white' : 'bg-slate-800 text-amber-300'
          }`}>
            {categoryCounts.aging_31_60}
          </span>
        </button>

        {/* Aging: 61-90 days */}
        <button
          type="button"
          onClick={() => onSelectFilterType('aging_61_90')}
          className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            filterType === 'aging_61_90'
              ? 'bg-orange-600 text-white font-black shadow-md'
              : 'bg-slate-900 text-orange-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>61 - 90 يوم</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            filterType === 'aging_61_90' ? 'bg-orange-800 text-white' : 'bg-slate-800 text-orange-300'
          }`}>
            {categoryCounts.aging_61_90}
          </span>
        </button>

        {/* Aging: Over 90 days (Critical) */}
        <button
          type="button"
          onClick={() => onSelectFilterType('aging_over90')}
          className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            filterType === 'aging_over90'
              ? 'bg-rose-600 text-white font-black shadow-md'
              : 'bg-slate-900 text-rose-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>+90 يوم (متأخرات حرجة)</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
            filterType === 'aging_over90' ? 'bg-rose-800 text-white' : 'bg-slate-800 text-rose-300'
          }`}>
            {categoryCounts.aging_over90}
          </span>
        </button>
      </div>

      {/* 2. Presets & Reset Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-400 text-[11px] font-bold">تجهيز سريع للكشف:</span>
          
          <button
            type="button"
            onClick={() => onApplyProfilePreset('field')}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-emerald-950/70 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 transition-all cursor-pointer text-xs font-bold flex items-center gap-1.5 shadow-xs"
            title="تفعيل أعمدة كشف المحصل الميداني (سندات، توقيع، تحصيل يدوي)"
          >
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>كشف المحصل الميداني</span>
          </button>

          <button
            type="button"
            onClick={() => onApplyProfilePreset('financial')}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-sky-950/70 text-sky-300 hover:text-sky-200 border border-sky-500/30 transition-all cursor-pointer text-xs font-bold flex items-center gap-1.5 shadow-xs"
            title="تفعيل أعمدة كشف المستحقات والمبالغ المحصلة المالي التحليلي"
          >
            <Scale className="w-3.5 h-3.5 text-sky-400" />
            <span>كشف محاسبي تحليلي</span>
          </button>
        </div>

        {/* Reset Filters Quick Button if Any Filter is Applied */}
        {activeFiltersCount > 0 && (
          <button
            type="button"
            onClick={onResetFilters}
            className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/40 transition-all cursor-pointer shrink-0 flex items-center gap-1 font-bold shadow-xs"
            title="تصفير كافة الفلاتر والبحث"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>تصفير الفلاتر ({activeFiltersCount})</span>
          </button>
        )}
      </div>

      {/* 3. Detailed Filters: Search, Zone, Transformer, Collector, Tariff, Month, Sort */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2 sm:gap-2.5">
        {/* Instant Search with Scope Selector */}
        <div className="relative col-span-1 sm:col-span-2 md:col-span-1 lg:col-span-2 flex items-center bg-slate-900 border border-slate-800 rounded-xl focus-within:border-amber-500 transition-colors">
          <Search className="w-4 h-4 text-slate-500 mr-2.5 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="بحث فوري: الاسم، العداد، الهاتف، المربع..."
            className="w-full bg-transparent pr-2 pl-2 py-2 text-xs text-white placeholder:text-slate-500 outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
              title="مسح البحث"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {/* Search Scope Pill Selector */}
          <select
            value={searchScope}
            onChange={e => onSearchScopeChange(e.target.value as SearchScope)}
            className="bg-slate-950 border-r border-slate-800 text-[10px] text-amber-400 font-bold px-2 py-1.5 rounded-l-xl outline-none cursor-pointer shrink-0"
            title="نطاق البحث"
          >
            <option value="all">🔍 شامل</option>
            <option value="name">👤 الاسم</option>
            <option value="meter">🔢 العداد</option>
            <option value="phone">📱 الهاتف</option>
            <option value="zone">📍 المربع</option>
          </select>
        </div>

        {/* Zones */}
        <div>
          <select
            value={selectedZone}
            onChange={e => onZoneChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="all">كل المناطق / المربعات ({uniqueZones.length})</option>
            {uniqueZones.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
        </div>

        {/* Transformers */}
        <div>
          <select
            value={selectedTransformer}
            onChange={e => onTransformerChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="all">كل المحولات ({uniqueTransformers.length})</option>
            {uniqueTransformers.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Collectors */}
        <div>
          <select
            value={selectedCollector}
            onChange={e => onCollectorChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="all">كل المحصلين ({uniqueCollectors.length})</option>
            {uniqueCollectors.map(c => <option key={c} value={c}>المحصل: {c}</option>)}
          </select>
        </div>

        {/* Tariff */}
        <div>
          <select
            value={selectedTariff}
            onChange={e => onTariffChange(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="all">كل أنواع الاشتراكات</option>
            <option value="منزلي">سكني / منزلي</option>
            <option value="تجاري">تجاري</option>
            <option value="زراعي">زراعي</option>
            <option value="حكومي">حكومي</option>
            <option value="صناعي">صناعي</option>
          </select>
        </div>

        {/* Sort & Order Button */}
        <div className="flex items-center gap-1.5">
          <select
            value={sortBy}
            onChange={e => onSortByChange(e.target.value as any)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-300 outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="totalDue">ترتيب: المبلغ المطلوب</option>
            <option value="collected">ترتيب: المبالغ المحصلة</option>
            <option value="overdue">ترتيب: المتأخرات السابقة</option>
            <option value="billed">ترتيب: إجمالي الفواتير</option>
            <option value="name">ترتيب: اسم المشترك</option>
            <option value="meter">ترتيب: رقم العداد</option>
          </select>

          <button
            type="button"
            onClick={onToggleSortOrder}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
            title={sortOrder === 'desc' ? 'تنازلي (الأعلى أولاً)' : 'تصاعدي (الأقل أولاً)'}
          >
            <ArrowDownUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
