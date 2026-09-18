import fs from 'fs';

let content = fs.readFileSync('src/components/StatsCharts.tsx', 'utf8');

content = content.replace(
  /<span className="text-xs text-slate-500 font-medium">إيرادات<\/span>/g,
  '<span className="text-slate-400 font-sans">إيرادات</span>'
);

content = content.replace(
  /<span className="text-xs text-slate-500 font-medium">مصروفات<\/span>/g,
  '<span className="text-slate-400 font-sans">مصروفات</span>'
);

// also fix the container div height class to match others
content = content.replace(
  /<div style=\{\{ height \}\}>/g,
  '<div className="w-full relative z-10" style={{ height: `${height}px` }}>'
);

// and fix the grid line color in RevenueExpenseChart
content = content.replace(
  /<CartesianGrid strokeDasharray="3 3" vertical=\{false\} stroke="#e2e8f0" \/>/,
  '<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />'
);

fs.writeFileSync('src/components/StatsCharts.tsx', content);

