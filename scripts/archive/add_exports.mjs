import fs from 'fs';

let content = fs.readFileSync('src/components/AdminAccounting.tsx', 'utf8');

// Expenses
content = content.replace(
  /<button onClick=\{\(\) => setShowAddExpense\(true\)\} className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1\.5 rounded-lg text-xs font-bold flex items-center gap-2">\s*<Plus className="w-4 h-4" \/> إضافة منصرف\s*<\/button>/g,
  `<div className="flex items-center gap-2">
                <button onClick={() => printData('سجل المصروفات التشغيلية', expenses, [{key: 'date', label: 'التاريخ'}, {key: 'category', label: 'التصنيف'}, {key: 'amount', label: 'المبلغ'}, {key: 'description', label: 'البيان'}, {key: 'recordedBy', label: 'الموظف'}])} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors">
                  <Printer className="w-4 h-4" /> طباعة
                </button>
                <button onClick={() => exportToCSV(expenses, 'expenses', [{key: 'date', label: 'التاريخ'}, {key: 'category', label: 'التصنيف'}, {key: 'amount', label: 'المبلغ'}, {key: 'description', label: 'البيان'}, {key: 'recordedBy', label: 'الموظف'}])} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors">
                  <Download className="w-4 h-4" /> CSV
                </button>
                <button onClick={() => setShowAddExpense(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">
                  <Plus className="w-4 h-4" /> إضافة منصرف
                </button>
              </div>`
);

// Employees Txs
content = content.replace(
  /<button onClick=\{\(\) => setShowAddEmployeeTx\(true\)\} className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1\.5 rounded-lg text-xs font-bold flex items-center gap-2">\s*<Plus className="w-4 h-4" \/> إضافة حركة موظف\s*<\/button>/g,
  `<div className="flex items-center gap-2">
                <button onClick={() => printData('السلف والرواتب', employeeTxs, [{key: 'date', label: 'التاريخ'}, {key: 'employeeName', label: 'الموظف'}, {key: 'type', label: 'النوع'}, {key: 'amount', label: 'المبلغ'}, {key: 'description', label: 'البيان'}])} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors">
                  <Printer className="w-4 h-4" /> طباعة
                </button>
                <button onClick={() => exportToCSV(employeeTxs, 'employee_transactions', [{key: 'date', label: 'التاريخ'}, {key: 'employeeName', label: 'الموظف'}, {key: 'type', label: 'النوع'}, {key: 'amount', label: 'المبلغ'}, {key: 'description', label: 'البيان'}])} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors">
                  <Download className="w-4 h-4" /> CSV
                </button>
                <button onClick={() => setShowAddEmployeeTx(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">
                  <Plus className="w-4 h-4" /> إضافة حركة موظف
                </button>
              </div>`
);

// Purchases
content = content.replace(
  /<button onClick=\{\(\) => setShowAddPurchase\(true\)\} className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1\.5 rounded-lg text-xs font-bold flex items-center gap-2">\s*<Plus className="w-4 h-4" \/> فاتورة شراء جديدة\s*<\/button>/g,
  `<div className="flex items-center gap-2">
                <button onClick={() => printData('فواتير المشتريات والموردين', purchases, [{key: 'date', label: 'التاريخ'}, {key: 'supplier', label: 'المورد'}, {key: 'items', label: 'المشتريات'}, {key: 'amount', label: 'إجمالي الفاتورة'}])} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors">
                  <Printer className="w-4 h-4" /> طباعة
                </button>
                <button onClick={() => exportToCSV(purchases, 'purchases', [{key: 'date', label: 'التاريخ'}, {key: 'supplier', label: 'المورد'}, {key: 'items', label: 'المشتريات'}, {key: 'amount', label: 'إجمالي الفاتورة'}])} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors">
                  <Download className="w-4 h-4" /> CSV
                </button>
                <button onClick={() => setShowAddPurchase(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">
                  <Plus className="w-4 h-4" /> فاتورة شراء جديدة
                </button>
              </div>`
);

// Connections
content = content.replace(
  /<button onClick=\{\(\) => setShowAddConnection\(true\)\} className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1\.5 rounded-lg text-xs font-bold flex items-center gap-2">\s*<Plus className="w-4 h-4" \/> إضافة طلب إدخال\s*<\/button>/g,
  `<div className="flex items-center gap-2">
                <button onClick={() => printData('إيرادات إدخال خدمة الكهرباء', connections, [{key: 'date', label: 'التاريخ'}, {key: 'subscriberName', label: 'المشترك'}, {key: 'totalFee', label: 'إجمالي الرسوم'}, {key: 'paidAmount', label: 'المدفوع'}, {key: 'status', label: 'الحالة'}])} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors">
                  <Printer className="w-4 h-4" /> طباعة
                </button>
                <button onClick={() => exportToCSV(connections, 'connections', [{key: 'date', label: 'التاريخ'}, {key: 'subscriberName', label: 'المشترك'}, {key: 'totalFee', label: 'إجمالي الرسوم'}, {key: 'paidAmount', label: 'المدفوع'}, {key: 'status', label: 'الحالة'}])} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors">
                  <Download className="w-4 h-4" /> CSV
                </button>
                <button onClick={() => setShowAddConnection(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">
                  <Plus className="w-4 h-4" /> إضافة طلب إدخال
                </button>
              </div>`
);

fs.writeFileSync('src/components/AdminAccounting.tsx', content);

