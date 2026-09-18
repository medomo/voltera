import fs from 'fs';
let content = fs.readFileSync('src/components/AdminSubscribers.tsx', 'utf8');

// Bulk action buttons
content = content.replace(
  /'bg-rose-500\/10 text-rose-400 border border-rose-500\/20 hover:bg-rose-500\/20 hover:shadow-\[0_0_10px_rgba\(244,63,94,0\.2\)\]'/g,
  "'bg-gradient-to-b from-rose-500/10 to-rose-500/5 text-rose-400 border border-rose-500/20 hover:from-rose-500/20 hover:to-rose-500/10 hover:shadow-[0_0_15px_rgba(244,63,94,0.3)]'"
);

content = content.replace(
  /'bg-emerald-500\/10 text-emerald-400 border border-emerald-500\/20 hover:bg-emerald-500\/20 hover:shadow-\[0_0_10px_rgba\(16,185,129,0\.2\)\]'/g,
  "'bg-gradient-to-b from-emerald-500/10 to-emerald-500/5 text-emerald-400 border border-emerald-500/20 hover:from-emerald-500/20 hover:to-emerald-500/10 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]'"
);

content = content.replace(
  /'bg-cyan-500\/10 text-cyan-400 border border-cyan-500\/20 hover:bg-cyan-500\/20 hover:shadow-\[0_0_10px_rgba\(6,182,212,0\.2\)\]'/g,
  "'bg-gradient-to-b from-cyan-500/10 to-cyan-500/5 text-cyan-400 border border-cyan-500/20 hover:from-cyan-500/20 hover:to-cyan-500/10 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]'"
);

content = content.replace(
  /'bg-amber-500\/10 text-amber-400 border border-amber-500\/20 hover:bg-amber-500\/20 hover:shadow-\[0_0_10px_rgba\(245,158,11,0\.2\)\]'/g,
  "'bg-gradient-to-b from-amber-500/10 to-amber-500/5 text-amber-400 border border-amber-500/20 hover:from-amber-500/20 hover:to-amber-500/10 hover:shadow-[0_0_15px_rgba(245,158,11,0.3)]'"
);

// Map guide colors
content = content.replace(
  /bg-emerald-500 shadow-\[0_0_8px_rgba\(16,185,129,0\.5\)\]/g,
  'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]'
);

content = content.replace(
  /bg-amber-500 shadow-\[0_0_8px_rgba\(245,158,11,0\.5\)\]/g,
  'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]'
);

content = content.replace(
  /bg-rose-500 shadow-\[0_0_8px_rgba\(244,63,94,0\.5\)\]/g,
  'bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.8)]'
);

fs.writeFileSync('src/components/AdminSubscribers.tsx', content);
fs.writeFileSync('src/components/SubscribersMap.tsx', content);
