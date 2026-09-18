const fs = require('fs');
let code = fs.readFileSync('src/components/AdminInventory.tsx', 'utf8');

// Add activeTab state
const stateAdd = `
  const [activeTab, setActiveTab] = useState<'catalog' | 'transactions' | 'alerts'>('catalog');
`;

code = code.replace(
  "const [searchTerm, setSearchTerm] = useState('');",
  stateAdd + "\n  const [searchTerm, setSearchTerm] = useState('');"
);

// Add missing icon imports if needed
code = code.replace(
  "AlertTriangle, Filter } from 'lucide-react';",
  "AlertTriangle, Filter, ClipboardList, LayoutList } from 'lucide-react';"
);


// Rewrite the render to include tabs
const renderStart = `  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-800">المخزون والمستودع</h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">إدارة ومراقبة المواد الفنية وقطع الغيار</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-sm"
        >
          <span>إضافة صنف جديد</span>
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto p-1 bg-slate-100 rounded-xl">
            <button 
              onClick={() => setActiveTab('catalog')}
              className={\`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 \${activeTab === 'catalog' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}\`}
            >
              <Package className="w-4 h-4" />
              <span>دليل الأصناف</span>
            </button>
            <button 
              onClick={() => setActiveTab('transactions')}
              className={\`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 \${activeTab === 'transactions' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}\`}
            >
              <LayoutList className="w-4 h-4" />
              <span>حركات المستودع</span>
            </button>
            <button 
              onClick={() => setActiveTab('alerts')}
              className={\`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 \${activeTab === 'alerts' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}\`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>الجرد والتنبيهات</span>
            </button>
          </div>
        </div>

        {activeTab === 'catalog' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="ابحث عن صنف..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-right focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>
              <div className="relative w-full sm:w-48 shrink-0">
                <Filter className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select 
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-2 text-sm text-right focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none appearance-none"
                  dir="rtl"
                >
                  <option value="all">جميع التصنيفات</option>
                  {Object.entries(categories).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
`;

// we need to locate where `return (` starts and replace up to `        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">`

// I'll grab the code before doing replacing.
