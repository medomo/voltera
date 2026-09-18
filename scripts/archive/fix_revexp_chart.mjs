import fs from 'fs';

let content = fs.readFileSync('src/components/StatsCharts.tsx', 'utf8');

content = content.replace(
  /<div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">/g,
  '<div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden flex flex-col shadow-sm dir-ltr">'
);

content = content.replace(
  /<div className="flex justify-between items-center mb-6">\s*<h3 className="font-bold text-slate-800">معدل الإيرادات مقابل المصروفات شهرياً<\/h3>\s*<div className="flex items-center gap-3">/g,
  `<div className="flex justify-between items-center mb-6 flex-row-reverse relative z-10">
        <h3 className="text-sm font-bold text-slate-200 font-sans">الإيرادات مقابل المصروفات</h3>
        <div className="flex items-center gap-3">`
);

fs.writeFileSync('src/components/StatsCharts.tsx', content);

