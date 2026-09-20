import React, { useState } from 'react';
import { Building2, Zap, ArrowRight, Percent, Users, Wallet, Filter, UserCheck, ShieldCheck } from 'lucide-react';
import { SubscriberBalanceItem } from './types';
import { SystemSettings } from '../../types';

interface ZoneTransformerCardProps {
  items: SubscriberBalanceItem[];
  selectedZone: string;
  selectedTransformer: string;
  selectedCollector?: string;
  onSelectZone: (zone: string) => void;
  onSelectTransformer: (transformer: string) => void;
  onSelectCollector?: (collector: string) => void;
  settings: SystemSettings;
}

export const ZoneTransformerCard: React.FC<ZoneTransformerCardProps> = ({
  items,
  selectedZone,
  selectedTransformer,
  selectedCollector = 'all',
  onSelectZone,
  onSelectTransformer,
  onSelectCollector,
  settings
}) => {
  const [activeTab, setActiveTab] = useState<'collectors' | 'zones' | 'transformers'>('collectors');
  const currency = settings.currency || 'ريال';

  // Group by collector
  const collectorStats = React.useMemo(() => {
    const map = new Map<string, {
      name: string;
      count: number;
      totalDue: number;
      totalCollected: number;
      totalOverdue: number;
      totalCurrent: number;
      collectionRate: number;
      debtorsCount: number;
    }>();

    items.forEach(item => {
      const cName = item.collectorName || 'غير مسند لمحصل';
      if (!map.has(cName)) {
        map.set(cName, {
          name: cName,
          count: 0,
          totalDue: 0,
          totalCollected: 0,
          totalOverdue: 0,
          totalCurrent: 0,
          collectionRate: 0,
          debtorsCount: 0
        });
      }
      const st = map.get(cName)!;
      st.count += 1;
      st.totalDue += item.totalDue > 0 ? item.totalDue : 0;
      st.totalCollected += item.totalCollected;
      st.totalOverdue += item.overdueAmount;
      st.totalCurrent += item.currentDue;
      if (item.totalDue > 0) {
        st.debtorsCount += 1;
      }
    });

    return Array.from(map.values()).map(st => {
      const obligation = st.totalDue + st.totalCollected;
      st.collectionRate = obligation > 0 ? Math.round((st.totalCollected / obligation) * 100) : 0;
      return st;
    }).sort((a, b) => b.totalCollected - a.totalCollected || b.totalDue - a.totalDue);
  }, [items]);

  // Group by zone
  const zoneStats = React.useMemo(() => {
    const map = new Map<string, {
      name: string;
      count: number;
      totalDue: number;
      totalCollected: number;
      totalOverdue: number;
      totalCurrent: number;
      collectionRate: number;
    }>();

    items.forEach(item => {
      const zName = item.zone || 'غير محدد';
      if (!map.has(zName)) {
        map.set(zName, {
          name: zName,
          count: 0,
          totalDue: 0,
          totalCollected: 0,
          totalOverdue: 0,
          totalCurrent: 0,
          collectionRate: 0
        });
      }
      const st = map.get(zName)!;
      st.count += 1;
      st.totalDue += item.totalDue > 0 ? item.totalDue : 0;
      st.totalCollected += item.totalCollected;
      st.totalOverdue += item.overdueAmount;
      st.totalCurrent += item.currentDue;
    });

    return Array.from(map.values()).map(st => {
      const obligation = st.totalDue + st.totalCollected;
      st.collectionRate = obligation > 0 ? Math.round((st.totalCollected / obligation) * 100) : 0;
      return st;
    }).sort((a, b) => b.totalDue - a.totalDue);
  }, [items]);

  // Group by transformer
  const transformerStats = React.useMemo(() => {
    const map = new Map<string, {
      name: string;
      count: number;
      totalDue: number;
      totalCollected: number;
      totalOverdue: number;
      totalCurrent: number;
      collectionRate: number;
    }>();

    items.forEach(item => {
      const tName = item.transformer || 'غير محدد';
      if (!map.has(tName)) {
        map.set(tName, {
          name: tName,
          count: 0,
          totalDue: 0,
          totalCollected: 0,
          totalOverdue: 0,
          totalCurrent: 0,
          collectionRate: 0
        });
      }
      const st = map.get(tName)!;
      st.count += 1;
      st.totalDue += item.totalDue > 0 ? item.totalDue : 0;
      st.totalCollected += item.totalCollected;
      st.totalOverdue += item.overdueAmount;
      st.totalCurrent += item.currentDue;
    });

    return Array.from(map.values()).map(st => {
      const obligation = st.totalDue + st.totalCollected;
      st.collectionRate = obligation > 0 ? Math.round((st.totalCollected / obligation) * 100) : 0;
      return st;
    }).sort((a, b) => b.totalDue - a.totalDue);
  }, [items]);

  return (
    <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          {activeTab === 'collectors' ? (
            <UserCheck className="w-4 h-4 text-emerald-400" />
          ) : activeTab === 'zones' ? (
            <Building2 className="w-4 h-4 text-amber-400" />
          ) : (
            <Zap className="w-4 h-4 text-sky-400" />
          )}
          <h3 className="text-xs font-black text-white">
            مؤشرات التحصيل والمديونيات حسب المحصلين والمناطق والمحولات
          </h3>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('collectors')}
            className={`px-3 py-1 rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${
              activeTab === 'collectors'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>المحصلين ({collectorStats.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('zones')}
            className={`px-3 py-1 rounded-lg cursor-pointer transition-all ${
              activeTab === 'zones'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            المناطق والمربعات ({zoneStats.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('transformers')}
            className={`px-3 py-1 rounded-lg cursor-pointer transition-all ${
              activeTab === 'transformers'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            المحولات ({transformerStats.length})
          </button>
        </div>
      </div>

      {/* Grid of Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 text-xs max-h-72 overflow-y-auto pr-1">
        {(activeTab === 'collectors' ? collectorStats : activeTab === 'zones' ? zoneStats : transformerStats).map((entry) => {
          const isSelected = activeTab === 'collectors'
            ? selectedCollector === entry.name
            : activeTab === 'zones'
            ? selectedZone === entry.name
            : selectedTransformer === entry.name;

          return (
            <div
              key={entry.name}
              className={`p-3 rounded-xl border transition-all ${
                isSelected
                  ? 'bg-amber-950/40 border-amber-400 ring-1 ring-amber-400/50 text-white'
                  : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-black text-white truncate max-w-[140px]" title={entry.name}>
                  {entry.name}
                </span>
                <span className="text-[10px] font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-400">
                  {entry.count} مشترك
                </span>
              </div>

              <div className="space-y-1 text-[11px] mb-2.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">المطلوب القائم:</span>
                  <span className="font-mono font-black text-sky-400">
                    {entry.totalDue.toLocaleString()} {currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">المحصل:</span>
                  <span className="font-mono font-black text-emerald-400">
                    {entry.totalCollected.toLocaleString()} {currency}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-0.5">
                  <span className="text-slate-400">نسبة التحصيل:</span>
                  <span className={`font-mono font-black ${
                    entry.collectionRate >= 75 ? 'text-emerald-400' : entry.collectionRate >= 45 ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {entry.collectionRate}%
                  </span>
                </div>
              </div>

              {/* Progress mini bar */}
              <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mb-2.5 border border-slate-800">
                <div 
                  className={`h-full rounded-full ${
                    entry.collectionRate >= 75 ? 'bg-emerald-500' : entry.collectionRate >= 45 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, entry.collectionRate))}%` }}
                />
              </div>

              {/* Quick Filter Button */}
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'collectors') {
                    if (onSelectCollector) {
                      onSelectCollector(isSelected ? 'all' : entry.name);
                    }
                  } else if (activeTab === 'zones') {
                    onSelectZone(isSelected ? 'all' : entry.name);
                  } else {
                    onSelectTransformer(isSelected ? 'all' : entry.name);
                  }
                }}
                className={`w-full py-1.5 rounded-lg text-center font-bold text-[11px] cursor-pointer transition-all flex items-center justify-center gap-1 ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                <Filter className="w-3 h-3" />
                <span>{isSelected ? 'إلغاء التصفية' : 'تصفية الكشف لهذه المجموعة'}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
