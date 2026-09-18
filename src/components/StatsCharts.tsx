import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';

interface DataPoint {
  label: string;
  billed: number;
  collected: number;
}

interface FinancialAreaChartProps {
  data: DataPoint[];
  height?: number;
  currency?: string;
}

export const FinancialAreaChart: React.FC<FinancialAreaChartProps> = ({ data, height = 240, currency = 'ر.ي' }) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-right">
          <p className="text-slate-300 font-bold mb-2">{label}</p>
          <div className="flex flex-col gap-1">
            <p className="text-sm text-amber-500">
              المفوتر: <span className="font-mono font-bold">{payload[0]?.value?.toLocaleString()}</span> {currency}
            </p>
            <p className="text-sm text-emerald-500">
              المحصل: <span className="font-mono font-bold">{payload[1]?.value?.toLocaleString()}</span> {currency}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden flex flex-col shadow-sm dir-ltr">
      <div className="flex items-center justify-between mb-6 flex-row-reverse relative z-10">
        <h3 className="text-sm font-bold text-slate-200 font-sans">مقارنة الفواتير والمبالغ المحصلة</h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-slate-400 font-sans">المفوتر</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-400 font-sans">المحصل</span>
          </div>
        </div>
      </div>
      <div className="w-full relative z-10" style={{ height: `${height}px` }}>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBilled" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
              <XAxis dataKey="label" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area type="monotone" dataKey="billed" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorBilled)" activeDot={{ r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }} />
              <Area type="monotone" dataKey="collected" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCollected)" activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">لا توجد بيانات كافية</div>
        )}
      </div>
    </div>
  );
};

interface ZoneBarChartProps {
  data: { zone: string; active: number; consumption: number }[];
  height?: number;
}

export const ZoneBarChart: React.FC<ZoneBarChartProps> = ({ data, height = 240 }) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-right">
          <p className="text-slate-300 font-bold mb-2">{label}</p>
          <p className="text-sm text-cyan-400">
            الاستهلاك: <span className="font-mono font-bold">{payload[0]?.value?.toLocaleString()}</span> kWh
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden flex flex-col shadow-sm dir-ltr">
      <div className="flex items-center justify-between mb-6 flex-row-reverse relative z-10">
        <h3 className="text-sm font-bold text-slate-200 font-sans">استهلاك الطاقة حسب المناطق (kWh)</h3>
        <span className="text-xs text-slate-400 font-sans">توزيع الاستهلاك الكلي</span>
      </div>
      <div className="w-full relative z-10" style={{ height: `${height}px` }}>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="barCyan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#0891b2" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
              <XAxis dataKey="zone" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(val) => val.replace('المنطقة ', '')} />
              <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b', opacity: 0.4 }} />
              <Bar dataKey="consumption" fill="url(#barCyan)" radius={[6, 6, 0, 0]} maxBarSize={50}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="url(#barCyan)" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">لا توجد بيانات كافية</div>
        )}
      </div>
    </div>
  );
};

export interface RevExpDataPoint {
  label: string;
  revenue: number;
  expense: number;
}

interface RevenueExpenseChartProps {
  data: RevExpDataPoint[];
  height?: number;
  currency?: string;
}

export const RevenueExpenseChart: React.FC<RevenueExpenseChartProps> = ({ data, height = 240, currency = 'ر.ي' }) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-right">
          <p className="text-slate-300 font-bold mb-2">{label}</p>
          <div className="flex flex-col gap-1">
            <p className="text-sm text-emerald-500">
              الإيرادات: <span className="font-mono font-bold">{payload[0]?.value?.toLocaleString()}</span> {currency}
            </p>
            <p className="text-sm text-rose-500">
              المصروفات: <span className="font-mono font-bold">{payload[1]?.value?.toLocaleString()}</span> {currency}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden flex flex-col shadow-sm dir-ltr">
      <div className="flex justify-between items-center mb-6 flex-row-reverse relative z-10">
        <h3 className="text-sm font-bold text-slate-200 font-sans">الإيرادات مقابل المصروفات</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
            <span className="text-slate-400 font-sans">إيرادات</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
            <span className="text-slate-400 font-sans">مصروفات</span>
          </div>
        </div>
      </div>
      <div className="w-full relative z-10" style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
            <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
