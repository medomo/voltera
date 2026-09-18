import React from 'react';
import { motion } from 'motion/react';
import { 
  Zap, Activity, Building2, Home, Factory, Sprout, 
  ArrowUpRight, Users, Layers, ExternalLink, ChevronLeft, Award
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { BaseReportProps } from './types';

export const EnergyConsumptionTab: React.FC<BaseReportProps> = ({
  subscribers,
  readings,
  settings,
  onNavigateToTab
}) => {
  const currency = settings.currency || 'ر.ي';

  const totalConsumptionKwh = readings.reduce((sum, r) => sum + (Number(r.consumption) || 0), 0);
  const totalBilledAmount = readings.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
  const avgKwhPerSubscriber = subscribers.length > 0 ? Math.round(totalConsumptionKwh / subscribers.length) : 0;

  // Category Distribution
  const categoryStats = React.useMemo(() => {
    const categories = [
      { key: 'commercial', name: 'تجاري', icon: Building2, color: '#f59e0b' },
      { key: 'residential', name: 'سكني', icon: Home, color: '#38bdf8' },
      { key: 'industrial', name: 'صناعي / ورش', icon: Factory, color: '#a855f7' },
      { key: 'agricultural', name: 'زراعي / مضخات', icon: Sprout, color: '#10b981' }
    ];

    return categories.map(cat => {
      const catSubs = subscribers.filter(s => (s.category || 'residential') === cat.key);
      const catSubIds = new Set(catSubs.map(s => s.id));
      const catReadings = readings.filter(r => catSubIds.has(r.subscriberId));

      const kwh = catReadings.reduce((sum, r) => sum + (Number(r.consumption) || 0), 0);
      const billed = catReadings.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
      const kwhShare = totalConsumptionKwh > 0 ? (kwh / totalConsumptionKwh) * 100 : 0;

      return {
        ...cat,
        subscribersCount: catSubs.length,
        kwh,
        billed,
        kwhShare
      };
    });
  }, [subscribers, readings, totalConsumptionKwh]);

  // Top Consuming Subscribers
  const topConsumers = React.useMemo(() => {
    const subMap: Record<string, { subscriber: any; totalKwh: number; totalBilled: number; readingsCount: number }> = {};
    
    readings.forEach(r => {
      const sub = subscribers.find(s => s.id === r.subscriberId);
      if (!sub) return;

      if (!subMap[sub.id]) {
        subMap[sub.id] = { subscriber: sub, totalKwh: 0, totalBilled: 0, readingsCount: 0 };
      }
      subMap[sub.id].totalKwh += Number(r.consumption) || 0;
      subMap[sub.id].totalBilled += Number(r.totalAmount) || 0;
      subMap[sub.id].readingsCount += 1;
    });

    return Object.values(subMap).sort((a, b) => b.totalKwh - a.totalKwh).slice(0, 25);
  }, [readings, subscribers]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 text-right"
      dir="rtl"
    >
      {/* 1. ENERGY METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <div className="p-2.5 bg-sky-500/10 rounded-2xl text-sky-400">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400">إجمالي الطاقة</span>
          </div>
          <p className="text-xs text-slate-400 font-bold">إجمالي الاستهلاك المفوتر</p>
          <h3 className="text-2xl font-black text-sky-400 font-mono mt-1">
            {totalConsumptionKwh.toLocaleString()} <span className="text-xs font-sans text-slate-400">ك.و.س</span>
          </h3>
          <p className="text-[10px] text-slate-500 font-bold mt-1">طاقة كهربائية مستهلكة عبر العدادات</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <div className="p-2.5 bg-amber-500/10 rounded-2xl text-amber-400">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400">معدل الاستهلاك</span>
          </div>
          <p className="text-xs text-slate-400 font-bold">متوسط الاستهلاك لكل مشترك</p>
          <h3 className="text-2xl font-black text-amber-400 font-mono mt-1">
            {avgKwhPerSubscriber.toLocaleString()} <span className="text-xs font-sans text-slate-400">ك.و.س</span>
          </h3>
          <p className="text-[10px] text-slate-500 font-bold mt-1">لكافة المشتركين المسجلين بالشبكة</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <div className="p-2.5 bg-emerald-500/10 rounded-2xl text-emerald-400">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400">مبيعات الطاقة</span>
          </div>
          <p className="text-xs text-slate-400 font-bold">إجمالي المبيعات المفوترة</p>
          <h3 className="text-2xl font-black text-emerald-400 font-mono mt-1">
            {totalBilledAmount.toLocaleString()} <span className="text-xs font-sans text-slate-400">{currency}</span>
          </h3>
          <p className="text-[10px] text-slate-500 font-bold mt-1">القيمة المالية للطاقة المستهلكة</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <div className="p-2.5 bg-indigo-500/10 rounded-2xl text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400">كبار المستهلكين</span>
          </div>
          <p className="text-xs text-slate-400 font-bold">استهلاك أعلى 25 مشترك</p>
          <h3 className="text-2xl font-black text-indigo-400 font-mono mt-1">
            {topConsumers.reduce((sum, c) => sum + c.totalKwh, 0).toLocaleString()} <span className="text-xs font-sans text-slate-400">ك.و.س</span>
          </h3>
          <p className="text-[10px] text-slate-500 font-bold mt-1">تمثل الشريحة الاستهلاكية الأكبر</p>
        </div>
      </div>

      {/* 2. CATEGORY BREAKDOWN CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {categoryStats.map((cat, idx) => {
          const Icon = cat.icon;
          return (
            <div key={idx} className="bg-slate-900 border border-slate-800 p-4.5 rounded-3xl shadow-lg space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <h4 className="font-black text-white text-sm">{cat.name}</h4>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300">
                  {cat.subscribersCount} مشترك
                </span>
              </div>

              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-xs text-slate-400 font-bold">الاستهلاك:</span>
                  <span className="font-mono text-sm font-black text-white">{cat.kwh.toLocaleString()} ك.و.س</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, cat.kwhShare)}%`, backgroundColor: cat.color }} 
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mt-1">
                  <span>الحصة: {cat.kwhShare.toFixed(1)}%</span>
                  <span className="font-mono text-slate-300">{cat.billed.toLocaleString()} {currency}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. TOP 25 CONSUMING SUBSCRIBERS TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <span>قائمة كبار المشتركين الأكثر استهلاكاً للطاقة الكهربائية (Top 25 Consumers)</span>
            </h3>
            <p className="text-xs text-slate-400 font-bold mt-0.5">ترتيب المشتركين حسب إجمالي الطاقة المستهلكة ك.و.س</p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800 px-3 py-1 rounded-xl">
            {topConsumers.length} مشترك
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th className="p-3 text-center">الترتيب</th>
                <th className="p-3">اسم المشترك</th>
                <th className="p-3 text-center">رقم العداد</th>
                <th className="p-3 text-center">المنطقة</th>
                <th className="p-3 text-center">التصنيف</th>
                <th className="p-3 text-center">إجمالي الاستهلاك (ك.و.س)</th>
                <th className="p-3 text-center">إجمالي الفواتير ({currency})</th>
                <th className="p-3 text-center">الرصيد القائم</th>
                <th className="p-3 text-center">كشف الحساب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-bold text-slate-200">
              {topConsumers.map((item, idx) => (
                <tr key={item.subscriber.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3 text-center font-mono">
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] text-slate-950 font-black ${
                      idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-slate-300' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-700 text-white'
                    }`}>
                      #{idx + 1}
                    </span>
                  </td>
                  <td className="p-3 font-black text-white">{item.subscriber.name}</td>
                  <td className="p-3 text-center font-mono text-slate-400">{item.subscriber.meterNumber}</td>
                  <td className="p-3 text-center text-slate-300">{item.subscriber.zone || 'الرئيسية'}</td>
                  <td className="p-3 text-center">
                    <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-300">
                      {item.subscriber.category === 'commercial' ? 'تجاري' : item.subscriber.category === 'industrial' ? 'صناعي' : item.subscriber.category === 'agricultural' ? 'زراعي' : 'سكني'}
                    </span>
                  </td>
                  <td className="p-3 text-center font-mono text-sky-400 font-black text-sm">{item.totalKwh.toLocaleString()}</td>
                  <td className="p-3 text-center font-mono text-emerald-400 font-black">{item.totalBilled.toLocaleString()}</td>
                  <td className="p-3 text-center font-mono">
                    <span className={item.subscriber.currentBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                      {item.subscriber.currentBalance.toLocaleString()} {currency}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {onNavigateToTab && (
                      <button
                        type="button"
                        onClick={() => onNavigateToTab('statements', item.subscriber.id)}
                        className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>فتح الكشف</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {topConsumers.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    لا توجد قراءات مسجلة للمشتركين بالفترة المحددة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
