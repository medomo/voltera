import fs from 'fs';
let content = fs.readFileSync('src/components/AdminSubscribers.tsx', 'utf8');

content = content.replace(
  /\{viewMode === 'map' \? \(\n        <SubscribersMap subscribers=\{filteredSubscribers\} \/>\n      \) : \(\n      <div className="bg-slate-900\/30 rounded-2xl border border-slate-800\/80 overflow-x-auto relative">/,
  "{viewMode === 'map' ? (\n        <SubscribersMap subscribers={filteredSubscribers} />\n      ) : (\n      <>\n      <div className=\"bg-slate-900/30 rounded-2xl border border-slate-800/80 overflow-x-auto relative\">"
);

content = content.replace(
  /        \)\}\n      <\/div>\n      \)\}\n\{typeof document !== 'undefined'/,
  "        )}\n      </div>\n      </>\n      )}\n{typeof document !== 'undefined'"
);

fs.writeFileSync('src/components/AdminSubscribers.tsx', content);
