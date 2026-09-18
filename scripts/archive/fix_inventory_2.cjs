const fs = require('fs');
let code = fs.readFileSync('src/components/AdminInventory.tsx', 'utf8');

// I will just use string manipulation directly
const startStr = `  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">`;

const endStr = `      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">`;

if(code.indexOf(startStr) !== -1 && code.indexOf(endStr) !== -1) {
  const newStr = `  return (
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
              <ClipboardList className="w-4 h-4" />
              <span>حركات المستودع</span>
            </button>
            <button 
              onClick={() => setActiveTab('alerts')}
              className={\`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 \${activeTab === 'alerts' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}\`}
            >
              <AlertTriangle className="w-4 h-4" />
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">`;

  code = code.substring(0, code.indexOf(startStr)) + newStr + code.substring(code.indexOf(endStr) + endStr.length);
}

// Now we need to close the divs after the list.
// The list ends before {/* Add Item Modal */}
const gridEndStr = `        {filteredInventory.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500">
                لا توجد أصناف مطابقة للبحث
            </div>
        )}
      </div>`;

const extraTabsStr = `        {filteredInventory.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500">
                لا توجد أصناف مطابقة للبحث
            </div>
        )}
      </div>
      </motion.div>
        )}

        {activeTab === 'transactions' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 text-right">
            <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">سجل الحركات والأذونات</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold rounded-r-xl">التاريخ</th>
                    <th className="px-4 py-3 font-semibold">الصنف</th>
                    <th className="px-4 py-3 font-semibold">نوع الحركة</th>
                    <th className="px-4 py-3 font-semibold">الكمية</th>
                    <th className="px-4 py-3 font-semibold">بواسطة</th>
                    <th className="px-4 py-3 font-semibold rounded-l-xl">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inventoryTransactions.length > 0 ? inventoryTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-slate-500">{new Date(tx.date).toLocaleString('ar-SA')}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">{tx.itemName}</td>
                      <td className="px-4 py-3">
                        <span className={\`inline-block px-2 py-1 rounded-md text-xs font-bold \${
                          tx.type === 'in' ? 'bg-emerald-100 text-emerald-700' : 
                          tx.type === 'damage' ? 'bg-rose-100 text-rose-700' : 'bg-sky-100 text-sky-700'
                        }\`}>
                          {tx.type === 'in' ? 'توريد / إضافة' : tx.type === 'damage' ? 'تالف / نقص' : 'صرف / إخراج'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{tx.quantity}</td>
                      <td className="px-4 py-3 text-slate-600">{tx.user}</td>
                      <td className="px-4 py-3 text-slate-500">{tx.notes || '-'}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500">لا توجد حركات مخزنية سابقة</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'alerts' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 text-right">
            <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">نواقص وتنبيهات المستودع</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inventory.filter(item => item.quantity <= item.minAlertLevel).map(item => (
                <div key={item.id} className="border border-rose-200 bg-rose-50 rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-1.5 h-full bg-rose-500" />
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-rose-900">{item.name}</h4>
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-rose-700">الرصيد الحالي:</span>
                    <span className="font-bold font-mono text-rose-900">{item.quantity} {item.unit}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-rose-700">حد التنبيه:</span>
                    <span className="font-bold font-mono text-rose-600">{item.minAlertLevel} {item.unit}</span>
                  </div>
                </div>
              ))}
              {inventory.filter(item => item.quantity <= item.minAlertLevel).length === 0 && (
                <div className="col-span-full py-12 text-center text-emerald-600 flex flex-col items-center gap-2">
                  <Package className="w-8 h-8 opacity-50" />
                  <span>جميع الأرصدة في المستودع طبيعية</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

      </div>`;

code = code.replace(gridEndStr, extraTabsStr);
fs.writeFileSync('src/components/AdminInventory.tsx', code);
