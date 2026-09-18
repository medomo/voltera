import fs from 'fs';
let content = fs.readFileSync('src/components/AdminSubscribers.tsx', 'utf8');

// Header section styling
content = content.replace(
  /className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 px-5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"/g,
  'className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-2.5 px-5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] cursor-pointer"'
);

// Search input
content = content.replace(
  /className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 pr-9 text-slate-200 text-right text-xs placeholder:text-slate-600 focus:outline-none focus:border-amber-500"/,
  'className="w-full bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-xl py-2.5 px-4 pr-10 text-slate-200 text-right text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all shadow-inner"'
);

// Advanced filters container
content = content.replace(
  /className="bg-slate-900\/40 p-4 rounded-xl border border-slate-800\/80 flex flex-col xl:flex-row justify-between gap-4"/,
  'className="bg-gradient-to-br from-slate-900/60 to-slate-900/30 backdrop-blur-md p-4 rounded-2xl border border-slate-800/80 flex flex-col xl:flex-row justify-between gap-4 shadow-xl"'
);

// Table container
content = content.replace(
  /className="bg-slate-900\/30 rounded-2xl border border-slate-800\/80 overflow-x-auto relative"/,
  'className="bg-slate-950/40 rounded-2xl border border-slate-800/80 overflow-x-auto relative shadow-2xl backdrop-blur-xl"'
);

// Table header
content = content.replace(
  /className="bg-slate-950\/60 text-slate-400 border-b border-slate-800 font-sans"/,
  'className="bg-gradient-to-r from-slate-900/80 to-slate-800/50 text-slate-300 border-b border-slate-700/80 font-sans tracking-wide"'
);

// Pagination container
content = content.replace(
  /className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 bg-slate-900 border border-slate-800 p-3 rounded-2xl"/,
  'className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 p-4 rounded-2xl shadow-lg"'
);

fs.writeFileSync('src/components/AdminSubscribers.tsx', content);
