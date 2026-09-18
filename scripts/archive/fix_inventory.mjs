import fs from 'fs';

let content = fs.readFileSync('src/components/AdminInventory.tsx', 'utf8');

// Update imports
content = content.replace(
  /import \{ Package, Plus, Search, ArrowUpRight, ArrowDownRight, AlertTriangle, Filter, LayoutList, ClipboardList \} from 'lucide-react';/,
  "import { Package, Plus, Search, ArrowUpRight, ArrowDownRight, AlertTriangle, Filter, LayoutList, ClipboardList, Download, Printer } from 'lucide-react';\nimport { exportToCSV, printData } from '../utils/exportUtils';"
);

// Catalog Tab header
content = content.replace(
  /<button\s+onClick=\{\(\) => setShowAddModal\(true\)\}\s+className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2\.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-sm"\s*>\s*<span>إضافة صنف جديد<\/span>\s*<Plus className="w-4 h-4" \/>\s*<\/button>/g,
  `<div className="flex items-center gap-2">
          <button onClick={() => printData('المخزون', inventory.map(item => ({...item, category: item.category === 'cables' ? 'كابلات' : item.category === 'transformers' ? 'محولات' : item.category === 'meters' ? 'عدادات' : item.category === 'tools' ? 'أدوات' : 'أخرى'})), [{key: 'name', label: 'اسم الصنف'}, {key: 'category', label: 'التصنيف'}, {key: 'quantity', label: 'الكمية'}, {key: 'unit', label: 'الوحدة'}])} className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm">
            <span>طباعة</span>
            <Printer className="w-4 h-4" />
          </button>
          <button onClick={() => exportToCSV(inventory.map(item => ({...item, category: item.category === 'cables' ? 'كابلات' : item.category === 'transformers' ? 'محولات' : item.category === 'meters' ? 'عدادات' : item.category === 'tools' ? 'أدوات' : 'أخرى'})), 'inventory', [{key: 'name', label: 'اسم الصنف'}, {key: 'category', label: 'التصنيف'}, {key: 'quantity', label: 'الكمية'}, {key: 'unit', label: 'الوحدة'}])} className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm">
            <span>CSV</span>
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-sm"
          >
            <span>إضافة صنف جديد</span>
            <Plus className="w-4 h-4" />
          </button>
        </div>`
);

fs.writeFileSync('src/components/AdminInventory.tsx', content);

