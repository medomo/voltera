import fs from 'fs';

let content = fs.readFileSync('src/components/StatsCharts.tsx', 'utf8');

const newChart = `export interface RevExpDataPoint {
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
    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-slate-800">معدل الإيرادات مقابل المصروفات شهرياً</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
            <span className="text-xs text-slate-500 font-medium">إيرادات</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
            <span className="text-xs text-slate-500 font-medium">مصروفات</span>
          </div>
        </div>
      </div>
      <div style={{ height }}>
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
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => v >= 1000 ? \`\${(v/1000).toFixed(0)}k\` : v} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
            <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
`;

content += '\n' + newChart;

fs.writeFileSync('src/components/StatsCharts.tsx', content);

