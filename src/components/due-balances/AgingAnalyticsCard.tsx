import React from 'react';
import { Clock, AlertTriangle, ShieldAlert, CheckCircle2, TrendingUp } from 'lucide-react';
import { SummaryStatistics, FilterType } from './types';
import { SystemSettings } from '../../types';

interface AgingAnalyticsCardProps {
  stats: SummaryStatistics;
  filterType: FilterType;
  onSelectFilter: (filter: FilterType) => void;
  settings: SystemSettings;
}

export const AgingAnalyticsCard: React.FC<AgingAnalyticsCardProps> = ({
  stats,
  filterType,
  onSelectFilter,
  settings
}) => {
  const currency = settings.currency || 'ريال';
  const totalDebt = stats.totalDueSum > 0 ? stats.totalDueSum : 1;

  const currentPct = Math.round((stats.agingCurrentSum / totalDebt) * 100);
  const p31_60Pct = Math.round((stats.aging31_60Sum / totalDebt) * 100);
  const p61_90Pct = Math.round((stats.aging61_90Sum / totalDebt) * 100);
  const pOver90Pct = Math.round((stats.agingOver90Sum / totalDebt) * 100);

  return (
    <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-black text-white">
            تحليل أعمار المديونيات والتعتيق الزمني (Debt Aging Analysis)
          </h3>
        </div>
        <span className="text-[11px] text-slate-400 font-bold">
          انقر على أي شريحة للتصفية الفورية لكشف المشتركين
        </span>
      </div>

      {/* Visual Multi-Segment Aging Progress Bar */}
      <div className="space-y-1.5">
        <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
          <div 
            style={{ width: `${currentPct}%` }} 
            className="bg-emerald-500 hover:opacity-90 transition-all cursor-pointer"
            title={`الشهر الحالي: ${stats.agingCurrentSum.toLocaleString()} ${currency} (${currentPct}%)`}
            onClick={() => onSelectFilter('aging_current')}
          />
          <div 
            style={{ width: `${p31_60Pct}%` }} 
            className="bg-amber-500 hover:opacity-90 transition-all cursor-pointer"
            title={`31 - 60 يوم: ${stats.aging31_60Sum.toLocaleString()} ${currency} (${p31_60Pct}%)`}
            onClick={() => onSelectFilter('aging_31_60')}
          />
          <div 
            style={{ width: `${p61_90Pct}%` }} 
            className="bg-orange-500 hover:opacity-90 transition-all cursor-pointer"
            title={`61 - 90 يوم: ${stats.aging61_90Sum.toLocaleString()} ${currency} (${p61_90Pct}%)`}
            onClick={() => onSelectFilter('aging_61_90')}
          />
          <div 
            style={{ width: `${pOver90Pct}%` }} 
            className="bg-rose-500 hover:opacity-90 transition-all cursor-pointer"
            title={`أكثر من 90 يوم (حرجة): ${stats.agingOver90Sum.toLocaleString()} ${currency} (${pOver90Pct}%)`}
            onClick={() => onSelectFilter('aging_over90')}
          />
        </div>
      </div>

      {/* 4 Interactive Aging Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
        {/* Bracket 1: 0-30 Days */}
        <button
          type="button"
          onClick={() => onSelectFilter('aging_current')}
          className={`p-3 rounded-xl text-right transition-all cursor-pointer border ${
            filterType === 'aging_current'
              ? 'bg-emerald-950/50 border-emerald-400 ring-1 ring-emerald-400/50 text-white'
              : 'bg-slate-900/90 hover:bg-slate-850 border-slate-800 text-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-black text-[11px] text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>0 - 30 يوم (الدورة الحالية)</span>
            </span>
            <span className="font-mono text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
              {stats.agingCurrentCount} مشترك
            </span>
          </div>
          <div className="text-base font-black font-mono text-emerald-400">
            {stats.agingCurrentSum.toLocaleString()} <span className="text-[10px] font-sans text-slate-400">{currency}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            تمثل {currentPct}% من إجمالي المديونية القائمة
          </div>
        </button>

        {/* Bracket 2: 31-60 Days */}
        <button
          type="button"
          onClick={() => onSelectFilter('aging_31_60')}
          className={`p-3 rounded-xl text-right transition-all cursor-pointer border ${
            filterType === 'aging_31_60'
              ? 'bg-amber-950/50 border-amber-400 ring-1 ring-amber-400/50 text-white'
              : 'bg-slate-900/90 hover:bg-slate-850 border-slate-800 text-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-black text-[11px] text-amber-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>31 - 60 يوم (متأخرات عادية)</span>
            </span>
            <span className="font-mono text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
              {stats.aging31_60Count} مشترك
            </span>
          </div>
          <div className="text-base font-black font-mono text-amber-400">
            {stats.aging31_60Sum.toLocaleString()} <span className="text-[10px] font-sans text-slate-400">{currency}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            تمثل {p31_60Pct}% من إجمالي المديونية القائمة
          </div>
        </button>

        {/* Bracket 3: 61-90 Days */}
        <button
          type="button"
          onClick={() => onSelectFilter('aging_61_90')}
          className={`p-3 rounded-xl text-right transition-all cursor-pointer border ${
            filterType === 'aging_61_90'
              ? 'bg-orange-950/50 border-orange-400 ring-1 ring-orange-400/50 text-white'
              : 'bg-slate-900/90 hover:bg-slate-850 border-slate-800 text-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-black text-[11px] text-orange-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>61 - 90 يوم (تنبيه متقدم)</span>
            </span>
            <span className="font-mono text-[10px] bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded">
              {stats.aging61_90Count} مشترك
            </span>
          </div>
          <div className="text-base font-black font-mono text-orange-400">
            {stats.aging61_90Sum.toLocaleString()} <span className="text-[10px] font-sans text-slate-400">{currency}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            تمثل {p61_90Pct}% من إجمالي المديونية القائمة
          </div>
        </button>

        {/* Bracket 4: >90 Days */}
        <button
          type="button"
          onClick={() => onSelectFilter('aging_over90')}
          className={`p-3 rounded-xl text-right transition-all cursor-pointer border ${
            filterType === 'aging_over90'
              ? 'bg-rose-950/50 border-rose-400 ring-1 ring-rose-400/50 text-white'
              : 'bg-slate-900/90 hover:bg-slate-850 border-slate-800 text-slate-300'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-black text-[11px] text-rose-400 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>أكثر من 90 يوم (ديون حرجة / فصل)</span>
            </span>
            <span className="font-mono text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-bold">
              {stats.agingOver90Count} مشترك
            </span>
          </div>
          <div className="text-base font-black font-mono text-rose-400">
            {stats.agingOver90Sum.toLocaleString()} <span className="text-[10px] font-sans text-slate-400">{currency}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            تمثل {pOver90Pct}% من إجمالي المديونية القائمة
          </div>
        </button>
      </div>
    </div>
  );
};
