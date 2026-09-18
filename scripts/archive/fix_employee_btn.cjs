const fs = require('fs');
let code = fs.readFileSync('src/components/AdminAccounting.tsx', 'utf8');

code = code.replace(
  "const [showAddConnection, setShowAddConnection] = useState(false);",
  "const [showAddConnection, setShowAddConnection] = useState(false);\n  const [showAddEmployeeTx, setShowAddEmployeeTx] = useState(false);"
);

code = code.replace(
  "const [newConnection, setNewConnection] = useState<Partial<ServiceConnection>>({ status: 'pending' });",
  "const [newConnection, setNewConnection] = useState<Partial<ServiceConnection>>({ status: 'pending' });\n  const [newEmployeeTx, setNewEmployeeTx] = useState<Partial<EmployeeTransaction>>({ type: 'salary' });"
);

code = code.replace(
  /const handleAddExpense = /g,
  `const handleAddEmployeeTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployeeTx.amount || !newEmployeeTx.employeeName || !newEmployeeTx.date) return;
    
    const tx: EmployeeTransaction = {
      id: Date.now().toString(),
      employeeId: Date.now().toString(),
      employeeName: newEmployeeTx.employeeName,
      type: newEmployeeTx.type as 'salary' | 'advance' | 'allowance',
      amount: Number(newEmployeeTx.amount),
      date: newEmployeeTx.date,
      description: newEmployeeTx.description || '',
      recordedBy: currentUser.name
    };
    setEmployeeTxs([tx, ...employeeTxs]);
    setShowAddEmployeeTx(false);
    setNewEmployeeTx({ type: 'salary' });
  };

  const handleAddExpense = `
);

code = code.replace(
  /<button className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">\s*<Plus className="w-4 h-4" \/> إضافة حركة موظف\s*<\/button>/g,
  `<button onClick={() => setShowAddEmployeeTx(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">
                <Plus className="w-4 h-4" /> إضافة حركة موظف
              </button>`
);

const modalCode = `
      {/* ADD EMPLOYEE TX MODAL */}
      <AnimatePresence>
        {showAddEmployeeTx && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setShowAddEmployeeTx(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <button
                  onClick={() => setShowAddEmployeeTx(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-500" />
                  تسجيل حركة موظف
                </h3>
              </div>
              
              <form onSubmit={handleAddEmployeeTx} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">اسم الموظف</label>
                    <input
                      type="text"
                      required
                      value={newEmployeeTx.employeeName || ''}
                      onChange={e => setNewEmployeeTx({...newEmployeeTx, employeeName: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 text-right"
                      placeholder="اسم الموظف"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">نوع الحركة</label>
                    <select
                      required
                      value={newEmployeeTx.type || 'salary'}
                      onChange={e => setNewEmployeeTx({...newEmployeeTx, type: e.target.value as any})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 appearance-none"
                    >
                      <option value="salary">راتب</option>
                      <option value="advance">سلفة</option>
                      <option value="allowance">بدل</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">التاريخ</label>
                    <input
                      type="date"
                      required
                      value={newEmployeeTx.date || ''}
                      onChange={e => setNewEmployeeTx({...newEmployeeTx, date: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">المبلغ ({settings.currency})</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newEmployeeTx.amount || ''}
                      onChange={e => setNewEmployeeTx({...newEmployeeTx, amount: Number(e.target.value)})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 text-right font-mono"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">البيان والتفاصيل</label>
                  <textarea
                    required
                    value={newEmployeeTx.description || ''}
                    onChange={e => setNewEmployeeTx({...newEmployeeTx, description: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 text-right resize-none min-h-[80px]"
                    placeholder="مثال: سلفة على راتب شهر مايو..."
                  />
                </div>
                
                <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddEmployeeTx(false)}
                    className="px-6 py-3 rounded-xl text-sm font-bold text-slate-400 hover:bg-slate-800 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors"
                  >
                    حفظ الحركة
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
`;

code = code.replace(/    <\/motion.div>\n  \);\n};\n/g, modalCode + "\n    </motion.div>\n  );\n};\n");

fs.writeFileSync('src/components/AdminAccounting.tsx', code);
