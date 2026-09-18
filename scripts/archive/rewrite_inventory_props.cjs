const fs = require('fs');

const code = fs.readFileSync('src/components/AdminInventory.tsx', 'utf8');

// replace activeTab state with prop
let newCode = code.replace(
  "export function AdminInventory({\n  inventory,",
  "export function AdminInventory({\n  activeTab,\n  inventory,"
);

newCode = newCode.replace(
  "interface AdminInventoryProps {",
  "interface AdminInventoryProps {\n  activeTab: 'catalog' | 'transactions' | 'alerts';"
);

newCode = newCode.replace(
  "  const [activeTab, setActiveTab] = useState<'catalog' | 'transactions' | 'alerts'>('catalog');\n",
  ""
);

// Remove the tab buttons UI
const tabsStart = `        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">`;
const tabsEnd = `        </div>\n\n        {activeTab === 'catalog' && (`;

if (newCode.indexOf(tabsStart) !== -1 && newCode.indexOf(tabsEnd) !== -1) {
  newCode = newCode.substring(0, newCode.indexOf(tabsStart)) + "{activeTab === 'catalog' && (" + newCode.substring(newCode.indexOf(tabsEnd) + tabsEnd.length);
}

fs.writeFileSync('src/components/AdminInventory.tsx', newCode);
