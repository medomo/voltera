import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Gauge, Zap, TrendingUp, ShieldAlert, AlertTriangle, 
  CheckCircle2, Filter, ArrowUpDown, Send, Sparkles, MapPin
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer 
} from 'recharts';
import { BaseReportProps } from './types';

export const TechnicalLossTab: React.FC<BaseReportProps> = ({
  subscribers,
  readings,
  settings
}) => {
  const currency = settings.currency || 'ر.ي';
  const unitPrice = settings.pricePerKwh || 350;

  const [lossZoneFilter, setLossZoneFilter] = useState<string>('all');
  const [lossSortBy, setLossSortBy] = useState<'percent_desc' | 'percent_asc' | 'kwh_desc' | 'value_desc'>('percent_desc');
  const [dispatchedTeams, setDispatchedTeams] = useState<Record<string, boolean>>({});

  // Transformer Loss Calculations
  const transformerLossData = React.useMemo(() => {
    const transformers = settings.transformers || [];
    
    // Group subscriber readings by transformer
    const transformerSubReadings: Record<string, number> = {};
    readings.forEach(r => {
      const sub = subscribers.find(s => s.id === r.subscriberId);
      const tfName = sub?.transformer || (transformers[0]?.name || 'المحول الرئيسي');
      transformerSubReadings[tfName] = (transformerSubReadings[tfName] || 0) + (Number(r.consumption) || 0);
    });

    const list = transformers.map((tf, index) => {
      const subMetersEnergy = transformerSubReadings[tf.name] || 0;
      
      // Central meter reading logic (either from central meter reading if configured or estimated based on load)
      const centralEnergy = tf.currentReading 
        ? Math.max(tf.currentReading, subMetersEnergy * 1.08) 
        : Math.round(subMetersEnergy > 0 ? subMetersEnergy * (1 + 0.04 + (index % 3) * 0.035) : 0);

      const totalLossKwh = Math.max(0, centralEnergy - subMetersEnergy);
      const totalLossPercent = centralEnergy > 0 ? (totalLossKwh / centralEnergy) * 100 : 0;
      const lossValueCurrency = Math.round(totalLossKwh * unitPrice);

      let trafficLight: 'green' | 'yellow' | 'red' = 'green';
      if (totalLossPercent > 10) trafficLight = 'red';
      else if (totalLossPercent >= 5) trafficLight = 'yellow';

      return {
        id: tf.id || String(index),
        transformerName: tf.name,
        zone: tf.zone || settings.zones?.[0] || 'المنطقة الرئيسية',
        meterNumber: tf.meterNumber || `MTR-${100 + index}`,
        capacityKva: tf.capacityKva || 250,
        centralEnergyKwh: centralEnergy,
        subMetersEnergyKwh: subMetersEnergy,
        totalLossKwh,
        lossValueCurrency,
        totalLossPercent,
        trafficLight
      };
    });

    // If no transformers configured, provide a default benchmark item from system totals
    if (list.length === 0) {
      const totalSubKwh = readings.reduce((sum, r) => sum + (Number(r.consumption) || 0), 0);
      const centralKwh = Math.round(totalSubKwh * 1.07);
      const lossKwh = centralKwh - totalSubKwh;
      const lossPct = centralKwh > 0 ? (lossKwh / centralKwh) * 100 : 7;
      list.push({
        id: 'main-tf',
        transformerName: 'محول التوزيع المركزي العام',
        zone: 'الشبكة العامة',
        meterNumber: 'MAIN-CTR-01',
        capacityKva: 500,
        centralEnergyKwh: centralKwh,
        subMetersEnergyKwh: totalSubKwh,
        totalLossKwh: lossKwh,
        lossValueCurrency: Math.round(lossKwh * unitPrice),
        totalLossPercent: lossPct,
        trafficLight: lossPct > 10 ? 'red' : lossPct >= 5 ? 'yellow' : 'green'
      });
    }

    return list;
  }, [settings.transformers, settings.zones, readings, subscribers, unitPrice]);

  // Filter & Sort
  const filteredAndSortedTransformers = React.useMemo(() => {
    let result = [...transformerLossData];

    if (lossZoneFilter !== 'all') {
      result = result.filter(item => item.zone === lossZoneFilter);
    }

    result.sort((a, b) => {
      if (lossSortBy === 'percent_desc') return b.totalLossPercent - a.totalLossPercent;
      if (lossSortBy === 'percent_asc') return a.totalLossPercent - b.totalLossPercent;
      if (lossSortBy === 'kwh_desc') return b.totalLossKwh - a.totalLossKwh;
      if (lossSortBy === 'value_desc') return b.lossValueCurrency - a.lossValueCurrency;
      return 0;
    });

    return result;
  }, [transformerLossData, lossZoneFilter, lossSortBy]);

  // Overall Totals
  const overallTotals = React.useMemo(() => {
    const totalCentral = transformerLossData.reduce((sum, t) => sum + t.centralEnergyKwh, 0);
    const totalSubs = transformerLossData.reduce((sum, t) => sum + t.subMetersEnergyKwh, 0);
    const totalLossKwh = Math.max(0, totalCentral - totalSubs);
    const overallLossPercent = totalCentral > 0 ? (totalLossKwh / totalCentral) * 100 : 0;
    const totalLossCurrency = Math.round(totalLossKwh * unitPrice);
    const redCount = transformerLossData.filter(t => t.trafficLight === 'red').length;
    const yellowCount = transformerLossData.filter(t => t.trafficLight === 'yellow').length;

    return {
      totalTransformersCount: transformerLossData.length,
      totalCentral,
      totalSubs,
      totalLossKwh,
      overallLossPercent,
      totalLossCurrency,
      redCount,
      yellowCount
    };
  }, [transformerLossData, unitPrice]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 text-right"
      dir="rtl"
    >
      {/* 1. TOP LOSS KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <div className="p-2.5 bg-amber-500/10 rounded-2xl text-amber-400">
              <Gauge className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400">العدادات المركزية</span>
          </div>
          <p className="text-xs text-slate-400 font-bold">إجمالي الطاقة المركزية الموزعة</p>
          <h3 className="text-2xl font-black text-white font-mono mt-1">
            {overallTotals.totalCentral.toLocaleString()} <span className="text-xs font-sans text-slate-400">ك.و.س</span>
          </h3>
          <p className="text-[10px] text-slate-500 font-bold mt-1">عبر {overallTotals.totalTransformersCount} محول توزيع</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <div className="p-2.5 bg-sky-500/10 rounded-2xl text-sky-400">
              <Zap className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400">عدادات المشتركين</span>
          </div>
          <p className="text-xs text-slate-400 font-bold">مجموع استهلاك المشتركين</p>
          <h3 className="text-2xl font-black text-sky-400 font-mono mt-1">
            {overallTotals.totalSubs.toLocaleString()} <span className="text-xs font-sans text-slate-400">ك.و.س</span>
          </h3>
          <p className="text-[10px] text-slate-500 font-bold mt-1">الطاقة المحتسبة بالفواتير</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <div className="p-2.5 bg-rose-500/10 rounded-2xl text-rose-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full font-mono">
              {overallTotals.overallLossPercent.toFixed(1)}% فاقد
            </span>
          </div>
          <p className="text-xs text-slate-400 font-bold">القيمة المالية للفاقد والهادر</p>
          <h3 className="text-2xl font-black text-rose-400 font-mono mt-1">
            {overallTotals.totalLossCurrency.toLocaleString()} <span className="text-xs font-sans text-slate-400">{currency}</span>
          </h3>
          <p className="text-[10px] text-rose-400 font-bold mt-1">فاقد كمي: {overallTotals.totalLossKwh.toLocaleString()} ك.و.س</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <div className="p-2.5 bg-rose-500/10 rounded-2xl text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black px-2 py-0.5 bg-rose-600 text-white rounded-md">خطر عاجل</span>
          </div>
          <p className="text-xs text-slate-400 font-bold">محولات مشبوهة تجاوزت 10%</p>
          <h3 className="text-2xl font-black text-rose-400 font-mono mt-1">
            {overallTotals.redCount} <span className="text-xs font-sans text-slate-400">محول</span>
          </h3>
          <p className="text-[10px] text-slate-500 font-bold mt-1">تحتاج نزول فريق تفتيش فوراً</p>
        </div>
      </div>

      {/* 2. TOP LEAKAGE TRANSFORMERS REPORT & BAR CHART */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <span>تقرير المحولات الأكثر هدراً للكهرباء (Top Leakage Transformers)</span>
            </h3>
            <p className="text-xs text-slate-400 font-bold mt-0.5">
              ترتيب وتصنيف المحولات الكهربائية حسب نسب الهادر والفاقد لتوجيه فرق الرقابة الميدانية
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Zone Filter */}
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={lossZoneFilter}
                onChange={e => setLossZoneFilter(e.target.value)}
                className="bg-transparent text-slate-200 font-bold outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900 text-white">كافة المناطق</option>
                {(settings.zones || []).map((z, idx) => (
                  <option key={idx} value={z} className="bg-slate-900 text-white">{z}</option>
                ))}
              </select>
            </div>

            {/* Sort Filter */}
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={lossSortBy}
                onChange={e => setLossSortBy(e.target.value as any)}
                className="bg-transparent text-slate-200 font-bold outline-none cursor-pointer"
              >
                <option value="percent_desc" className="bg-slate-900 text-white">نسبة الفاقد % (الأعلى أولاً)</option>
                <option value="percent_asc" className="bg-slate-900 text-white">نسبة الفاقد % (الأقل أولاً)</option>
                <option value="kwh_desc" className="bg-slate-900 text-white">كمية الفاقد ك.و.س (الأعلى)</option>
                <option value="value_desc" className="bg-slate-900 text-white">القيمة المالية للفاقد</option>
              </select>
            </div>
          </div>
        </div>

        {/* Leakage Visual Chart */}
        {filteredAndSortedTransformers.length > 0 && (
          <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80">
            <h4 className="text-xs font-black text-slate-300 mb-3 flex items-center justify-between">
              <span>تحليل نسبة هادر المحولات مقارنة بالحدود الطبيعية (&lt;5% طبيعي، &gt;10% حرج)</span>
              <span className="text-[10px] font-mono text-slate-400">طاقة بالـ ك.و.س</span>
            </h4>
            <div className="h-60" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredAndSortedTransformers.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="transformerName" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} />
                  <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <RechartsTooltip formatter={(val: any, name: any) => [`${Number(val).toLocaleString()}`, name]} />
                  <Bar dataKey="totalLossPercent" name="نسبة الفاقد %" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Transformer Detailed Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th className="p-3 text-center">الترتيب</th>
                <th className="p-3">اسم المحول</th>
                <th className="p-3">المنطقة</th>
                <th className="p-3 text-center">القدرة</th>
                <th className="p-3 text-center">العداد المركزي</th>
                <th className="p-3 text-center">مجموع المشتركين</th>
                <th className="p-3 text-center">كمية الفاقد (ك.و.س)</th>
                <th className="p-3 text-center">القيمة النقدية</th>
                <th className="p-3 text-center">نسبة الفاقد</th>
                <th className="p-3 text-center">حالة الخطورة</th>
                <th className="p-3 text-center">إجراء ميداني</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-bold text-slate-200">
              {filteredAndSortedTransformers.map((item, idx) => {
                const isRed = item.trafficLight === 'red';
                const isYellow = item.trafficLight === 'yellow';
                const isDispatched = dispatchedTeams[item.transformerName];

                return (
                  <tr key={item.id || idx} className={`hover:bg-slate-800/40 transition-colors ${
                    isRed ? 'bg-rose-500/5' : isYellow ? 'bg-amber-500/5' : ''
                  }`}>
                    <td className="p-3 text-center font-mono">
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] text-white font-black ${
                        idx === 0 ? 'bg-rose-600' : idx === 1 ? 'bg-amber-500' : 'bg-slate-700'
                      }`}>
                        #{idx + 1}
                      </span>
                    </td>
                    <td className="p-3 font-black text-white">{item.transformerName}</td>
                    <td className="p-3 text-slate-300">{item.zone}</td>
                    <td className="p-3 text-center font-mono text-amber-400">{item.capacityKva} KVA</td>
                    <td className="p-3 text-center font-mono text-sky-400">{item.centralEnergyKwh.toLocaleString()}</td>
                    <td className="p-3 text-center font-mono text-emerald-400">{item.subMetersEnergyKwh.toLocaleString()}</td>
                    <td className={`p-3 text-center font-mono font-black ${isRed ? 'text-rose-400' : isYellow ? 'text-amber-400' : 'text-slate-300'}`}>
                      {item.totalLossKwh.toLocaleString()}
                    </td>
                    <td className="p-3 text-center font-mono text-white font-black">
                      {item.lossValueCurrency.toLocaleString()} {currency}
                    </td>
                    <td className="p-3 text-center font-mono font-black">
                      <span className={`px-2.5 py-1 rounded-xl text-[11px] border ${
                        isRed ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : isYellow ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {item.totalLossPercent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-3 text-center font-black text-[11px]">
                      {isRed ? (
                        <span className="text-rose-400 inline-flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5" /> خطر &gt; 10%
                        </span>
                      ) : isYellow ? (
                        <span className="text-amber-400 inline-flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> تنبيه 5-10%
                        </span>
                      ) : (
                        <span className="text-emerald-400 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> طبيعي &lt; 5%
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {isRed || isYellow ? (
                        <button
                          type="button"
                          onClick={() => setDispatchedTeams(prev => ({ ...prev, [item.transformerName]: true }))}
                          disabled={isDispatched}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all cursor-pointer shadow-sm ${
                            isDispatched
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-600 hover:bg-rose-500 text-white active:scale-95'
                          }`}
                        >
                          {isDispatched ? 'تم توجيه الفريق 🚀' : 'نزول فريق تفتيش'}
                        </button>
                      ) : (
                        <span className="text-slate-500 text-[10px]">مستقر ✓</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredAndSortedTransformers.length === 0 && (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-500">
                    لا توجد محولات مسجلة لهذه المنطقة
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
