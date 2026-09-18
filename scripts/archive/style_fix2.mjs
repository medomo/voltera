import fs from 'fs';
let content = fs.readFileSync('src/components/AdminSubscribers.tsx', 'utf8');

// Advanced Filters select tags styling
content = content.replace(
  /className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 outline-none focus:border-amber-500"/g,
  'className="bg-slate-900/80 border border-slate-700/60 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 transition-all shadow-inner"'
);

// Profile Drawer
content = content.replace(
  /className="w-full max-w-xl bg-slate-900 h-full overflow-y-auto border-l border-slate-800 shadow-2xl flex flex-col"/,
  'className="w-full max-w-xl bg-gradient-to-b from-slate-900 to-slate-950 h-full overflow-y-auto border-l border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col"'
);

content = content.replace(
  /className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950 sticky top-0 z-10"/,
  'className="p-5 border-b border-slate-800/80 flex justify-between items-center bg-slate-950/80 backdrop-blur-md sticky top-0 z-10"'
);

fs.writeFileSync('src/components/AdminSubscribers.tsx', content);
