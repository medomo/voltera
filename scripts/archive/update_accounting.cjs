const fs = require('fs');
let code = fs.readFileSync('src/components/AdminAccounting.tsx', 'utf8');

// Using regex or string replacement carefully
code = code.replace("import React, { useState } from 'react';", "import React, { useState, useEffect } from 'react';\nimport { X } from 'lucide-react';");

code = code.replace(/const \[expenses\] = useState<Expense\[\]>\(\[/, `
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddPurchase, setShowAddPurchase] = useState(false);
  const [showAddConnection, setShowAddConnection] = useState(false);

  const [newExpense, setNewExpense] = useState<Partial<Expense>>({ category: 'وقود (ديزل)' });
  const [newPurchase, setNewPurchase] = useState<Partial<Purchase>>({});
  const [newConnection, setNewConnection] = useState<Partial<ServiceConnection>>({ status: 'pending' });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('voltera_expenses');
    return saved ? JSON.parse(saved) : [`);
    
code = code.replace(/const \[purchases\] = useState<Purchase\[\]>\(\[/, `
  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    const saved = localStorage.getItem('voltera_purchases');
    return saved ? JSON.parse(saved) : [`);

code = code.replace(/const \[employeeTxs\] = useState<EmployeeTransaction\[\]>\(\[/, `
  const [employeeTxs, setEmployeeTxs] = useState<EmployeeTransaction[]>(() => {
    const saved = localStorage.getItem('voltera_employeeTxs');
    return saved ? JSON.parse(saved) : [`);

code = code.replace(/const \[connections\] = useState<ServiceConnection\[\]>\(\[/, `
  const [connections, setConnections] = useState<ServiceConnection[]>(() => {
    const saved = localStorage.getItem('voltera_connections');
    return saved ? JSON.parse(saved) : [`);

// Replace the closing brace of initial states array with effect setup
code = code.replace(/\]\);\n\n  const summaryData/g, `  ]);

  useEffect(() => localStorage.setItem('voltera_expenses', JSON.stringify(expenses)), [expenses]);
  useEffect(() => localStorage.setItem('voltera_purchases', JSON.stringify(purchases)), [purchases]);
  useEffect(() => localStorage.setItem('voltera_employeeTxs', JSON.stringify(employeeTxs)), [employeeTxs]);
  useEffect(() => localStorage.setItem('voltera_connections', JSON.stringify(connections)), [connections]);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.amount || !newExpense.category || !newExpense.date) return;
    
    const expense: Expense = {
      id: Date.now().toString(),
      amount: Number(newExpense.amount),
      category: newExpense.category,
      date: newExpense.date,
      description: newExpense.description || '',
      recordedBy: currentUser.name
    };
    setExpenses([expense, ...expenses]);
    setShowAddExpense(false);
    setNewExpense({ category: 'وقود (ديزل)' });
  };

  const handleAddPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPurchase.amount || !newPurchase.supplier || !newPurchase.date) return;
    
    const purchase: Purchase = {
      id: Date.now().toString(),
      amount: Number(newPurchase.amount),
      supplier: newPurchase.supplier,
      date: newPurchase.date,
      items: newPurchase.items || '',
      recordedBy: currentUser.name
    };
    setPurchases([purchase, ...purchases]);
    setShowAddPurchase(false);
    setNewPurchase({});
  };

  const handleAddConnection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConnection.subscriberName || !newConnection.totalFee || !newConnection.date) return;
    
    const connection: ServiceConnection = {
      id: Date.now().toString(),
      subscriberId: Date.now().toString(),
      subscriberName: newConnection.subscriberName,
      totalFee: Number(newConnection.totalFee),
      paidAmount: Number(newConnection.paidAmount || 0),
      date: newConnection.date,
      materialsUsed: newConnection.materialsUsed || '',
      status: newConnection.status as 'completed' | 'pending'
    };
    setConnections([connection, ...connections]);
    setShowAddConnection(false);
    setNewConnection({ status: 'pending' });
  };

  const summaryData`);

code = code.replace(/<button className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">\s*<Plus className="w-4 h-4" \/> إضافة منصرف\s*<\/button>/, 
  `<button onClick={() => setShowAddExpense(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">
    <Plus className="w-4 h-4" /> إضافة منصرف
  </button>`);

code = code.replace(/<button className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">\s*<Plus className="w-4 h-4" \/> فاتورة شراء جديدة\s*<\/button>/, 
  `<button onClick={() => setShowAddPurchase(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">
    <Plus className="w-4 h-4" /> فاتورة شراء جديدة
  </button>`);

code = code.replace(/<button className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">\s*<Plus className="w-4 h-4" \/> إضافة طلب إدخال\s*<\/button>/, 
  `<button onClick={() => setShowAddConnection(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">
    <Plus className="w-4 h-4" /> إضافة طلب إدخال
  </button>`);

// Insert the modals right before the closing tag of the component
code = code.replace(/    <\/motion.div>\n  \);\n};\n/, `
      {/* ADD EXPENSE MODAL */}
      <AnimatePresence>
        {showAddExpense && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setShowAddExpense(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <button
                  onClick={() => setShowAddExpense(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-rose-500" />
                  تسجيل مصروف جديد
                </h3>
              </div>
              
              <form onSubmit={handleAddExpense} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">التصنيف</label>
                    <select
                      required
                      value={newExpense.category || ''}
                      onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 appearance-none"
                    >
                      <option value="وقود (ديزل)">وقود (ديزل)</option>
                      <option value="صيانة وقطع غيار">صيانة وقطع غيار</option>
                      <option value="زيوت وشحوم">زيوت وشحوم</option>
                      <option value="إيجارات">إيجارات</option>
                      <option value="نثريات وضيافة">نثريات وضيافة</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">تاريخ الصرف</label>
                    <input
                      type="date"
                      required
                      value={newExpense.date || ''}
                      onChange={e => setNewExpense({...newExpense, date: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 text-right"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">المبلغ ({settings.currency})</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newExpense.amount || ''}
                    onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 text-right font-mono"
                    placeholder="مثال: 150000"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">البيان والتفاصيل</label>
                  <textarea
                    required
                    value={newExpense.description || ''}
                    onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 text-right resize-none min-h-[100px]"
                    placeholder="سبب الصرف..."
                  />
                </div>
                
                <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddExpense(false)}
                    className="px-6 py-3 rounded-xl text-sm font-bold text-slate-400 hover:bg-slate-800 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors"
                  >
                    اعتماد سند الصرف
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD PURCHASE MODAL */}
      <AnimatePresence>
        {showAddPurchase && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setShowAddPurchase(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <button
                  onClick={() => setShowAddPurchase(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-500" />
                  فاتورة مشتريات جديدة
                </h3>
              </div>
              
              <form onSubmit={handleAddPurchase} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">اسم المورد</label>
                    <input
                      type="text"
                      required
                      value={newPurchase.supplier || ''}
                      onChange={e => setNewPurchase({...newPurchase, supplier: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 text-right"
                      placeholder="مثال: محطة الشروق للوقود"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">تاريخ الفاتورة</label>
                    <input
                      type="date"
                      required
                      value={newPurchase.date || ''}
                      onChange={e => setNewPurchase({...newPurchase, date: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 text-right"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">إجمالي الفاتورة ({settings.currency})</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newPurchase.amount || ''}
                    onChange={e => setNewPurchase({...newPurchase, amount: Number(e.target.value)})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 text-right font-mono"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">الأصناف المشتراة</label>
                  <textarea
                    required
                    value={newPurchase.items || ''}
                    onChange={e => setNewPurchase({...newPurchase, items: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 text-right resize-none min-h-[80px]"
                    placeholder="براميل زيت، فلاتر، كابلات..."
                  />
                </div>
                
                <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddPurchase(false)}
                    className="px-6 py-3 rounded-xl text-sm font-bold text-slate-400 hover:bg-slate-800 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors"
                  >
                    حفظ الفاتورة
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD CONNECTION MODAL */}
      <AnimatePresence>
        {showAddConnection && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setShowAddConnection(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <button
                  onClick={() => setShowAddConnection(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-500" />
                  تسجيل طلب إدخال خدمة (إيرادات)
                </h3>
              </div>
              
              <form onSubmit={handleAddConnection} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">اسم المشترك / الجهة</label>
                    <input
                      type="text"
                      required
                      value={newConnection.subscriberName || ''}
                      onChange={e => setNewConnection({...newConnection, subscriberName: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">التاريخ</label>
                    <input
                      type="date"
                      required
                      value={newConnection.date || ''}
                      onChange={e => setNewConnection({...newConnection, date: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 text-right"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">إجمالي رسوم الإدخال</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newConnection.totalFee || ''}
                      onChange={e => setNewConnection({...newConnection, totalFee: Number(e.target.value)})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 text-right font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">المبلغ المدفوع (مقبوضات)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newConnection.paidAmount || ''}
                      onChange={e => setNewConnection({...newConnection, paidAmount: Number(e.target.value)})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 text-right font-mono"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">مواد منصرفة للمشترك (عداد، كابلات)</label>
                  <textarea
                    required
                    value={newConnection.materialsUsed || ''}
                    onChange={e => setNewConnection({...newConnection, materialsUsed: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 text-right resize-none min-h-[80px]"
                    placeholder="مثال: عداد 3 فاز، 20 متر كابل 16 ملم..."
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">حالة الطلب</label>
                  <div className="flex gap-4 bg-slate-950 p-2 rounded-xl border border-slate-800">
                    <label className="flex-1 flex items-center justify-center gap-2 cursor-pointer p-2 rounded-lg transition-colors hover:bg-slate-900">
                      <input 
                        type="radio" 
                        name="status" 
                        value="pending"
                        checked={newConnection.status === 'pending'}
                        onChange={() => setNewConnection({...newConnection, status: 'pending'})}
                        className="accent-amber-500"
                      />
                      <span className="text-sm font-bold text-slate-300">قيد التنفيذ (انتظار التركيب)</span>
                    </label>
                    <label className="flex-1 flex items-center justify-center gap-2 cursor-pointer p-2 rounded-lg transition-colors hover:bg-slate-900">
                      <input 
                        type="radio" 
                        name="status" 
                        value="completed"
                        checked={newConnection.status === 'completed'}
                        onChange={() => setNewConnection({...newConnection, status: 'completed'})}
                        className="accent-emerald-500"
                      />
                      <span className="text-sm font-bold text-slate-300">مكتمل (تم التركيب والتشغيل)</span>
                    </label>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddConnection(false)}
                    className="px-6 py-3 rounded-xl text-sm font-bold text-slate-400 hover:bg-slate-800 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors"
                  >
                    حفظ الطلب وتسجيل الإيراد
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
`);

fs.writeFileSync('src/components/AdminAccounting.tsx', code);
