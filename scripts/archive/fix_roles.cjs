const fs = require('fs');
let code = fs.readFileSync('src/components/AdminRoles.tsx', 'utf8');

code = code.replace(
  /<button onClick=\{\(\) => setSelectedRole\(match\.includes\('مدير'\) \? 'مدير النظام' : 'محصل'\)\} className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1">\s*تعديل الصلاحيات\s*<Settings className="w-3\.5 h-3\.5" \/>\s*<\/button>/g,
  (match, p1, offset) => {
    return `<button onClick={() => setSelectedRole('${offset < 2000 ? 'مدير النظام' : 'محصل ميداني'}')} className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1">
                تعديل الصلاحيات
                <Settings className="w-3.5 h-3.5" />
              </button>`;
  }
);

const modalStr = `
      <AnimatePresence>
        {selectedRole && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setSelectedRole(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <button
                  onClick={() => setSelectedRole(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-500" />
                  تعديل صلاحيات: {selectedRole}
                </h3>
              </div>
              
              <div className="p-6 space-y-4">
                <p className="text-sm text-slate-400 mb-4">هذه الميزة غير متاحة في النسخة التجريبية.</p>
                <div className="flex justify-end gap-3 mt-6 border-t border-slate-800 pt-4">
                  <button
                    onClick={() => setSelectedRole(null)}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors"
                  >
                    حسناً
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
`;

code = code.replace(/    <\/motion\.div>\n  \);\n};\n/, modalStr + "\n    </motion.div>\n  );\n};\n");

fs.writeFileSync('src/components/AdminRoles.tsx', code);
