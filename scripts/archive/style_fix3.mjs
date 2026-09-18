import fs from 'fs';
let content = fs.readFileSync('src/components/AdminSubscribers.tsx', 'utf8');

const oldTrStr = "className={`transition-all cursor-pointer ${sub.currentBalance > 50000 ? 'bg-rose-950/20 hover:bg-rose-950/40 border-r-2 border-r-rose-500' : sub.currentBalance > 10000 ? 'bg-amber-950/10 hover:bg-amber-950/30 border-r-2 border-r-amber-500' : 'hover:bg-slate-900/50 border-r-2 border-r-transparent'}`}";

const newTrStr = "className={`transition-all cursor-pointer border-r-2 ${sub.currentBalance > 50000 ? 'bg-rose-950/20 hover:bg-rose-900/40 border-r-rose-500' : sub.currentBalance > 10000 ? 'bg-amber-950/20 hover:bg-amber-900/40 border-r-amber-500' : 'hover:bg-slate-800/40 border-r-transparent'}`}";

content = content.replace(oldTrStr, newTrStr);

fs.writeFileSync('src/components/AdminSubscribers.tsx', content);
