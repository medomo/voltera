import fs from 'fs';

let content = fs.readFileSync('src/components/AdminInventory.tsx', 'utf8');

content = content.replace(
  /<h3 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">سجل الحركات والأذونات<\/h3>/,
  `<div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-4">
              <h3 className="font-bold text-slate-800">سجل الحركات والأذونات</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => printData('سجل الحركات والأذونات', inventoryTransactions.map(tx => ({...tx, type: tx.type === 'in' ? 'توريد' : tx.type === 'out' ? 'صرف' : 'تالف'})), [{key: 'date', label: 'التاريخ'}, {key: 'itemName', label: 'الصنف'}, {key: 'type', label: 'النوع'}, {key: 'quantity', label: 'الكمية'}, {key: 'notes', label: 'البيان'}])} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-sm">
                  <Printer className="w-4 h-4" /> <span>طباعة</span>
                </button>
                <button onClick={() => exportToCSV(inventoryTransactions.map(tx => ({...tx, type: tx.type === 'in' ? 'توريد' : tx.type === 'out' ? 'صرف' : 'تالف'})), 'inventory_transactions', [{key: 'date', label: 'التاريخ'}, {key: 'itemName', label: 'الصنف'}, {key: 'type', label: 'النوع'}, {key: 'quantity', label: 'الكمية'}, {key: 'notes', label: 'البيان'}])} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors shadow-sm">
                  <Download className="w-4 h-4" /> <span>CSV</span>
                </button>
              </div>
            </div>`
);

fs.writeFileSync('src/components/AdminInventory.tsx', content);

