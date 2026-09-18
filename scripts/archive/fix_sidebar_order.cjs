const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

// 1. Fix ChevronDown in group buttons
code = code.replace(
  /<ChevronDown className=\{`w-3\.5 h-3\.5 transition-transform duration-200 \$\{expandedMenus\.([^ ]+) \? '' : '-rotate-90'\}`\} \/>\s+<span className="flex items-center gap-2">\s+<span>([^<]+)<\/span>\s+<([A-Za-z]+) className="w-4 h-4 ([^"]+)" \/>\s+<\/span>/g,
  `<span className="flex items-center gap-2">
                  <$3 className="w-4 h-4 $4" />
                  <span>$2</span>
                </span>
                <ChevronDown className={\`w-3.5 h-3.5 transition-transform duration-200 \${expandedMenus.$1 ? '' : 'rotate-90'}\`} />`
);

// 2. Fix inner items
code = code.replace(
  /<span>([^<]+)<\/span>\s+<div className="w-1\.5 h-1\.5 rounded-full bg-slate-600 shrink-0" \/>/g,
  `<div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>$1</span>`
);

// 3. Fix regular standalone links
code = code.replace(
  /<span>([^<]+)<\/span>\s+<([A-Za-z]+) className=\{`w-4\.5 h-4\.5 shrink-0 \$\{activeSection === '([^']+)' \? 'text-amber-400' : 'text-purple-400'\}`\} \/>/g,
  `<$2 className={\`w-4.5 h-4.5 shrink-0 \${activeSection === '$3' ? 'text-amber-400' : 'text-purple-400'}\`} />
                <span>$1</span>`
);
code = code.replace(
  /<span>([^<]+)<\/span>\s+<([A-Za-z]+) className=\{`w-4\.5 h-4\.5 shrink-0 \$\{activeSection === '([^']+)' \? 'text-amber-400' : 'text-blue-400'\}`\} \/>/g,
  `<$2 className={\`w-4.5 h-4.5 shrink-0 \${activeSection === '$3' ? 'text-amber-400' : 'text-blue-400'}\`} />
                <span>$1</span>`
);

// 4. Fix User/Header Section
code = code.replace(
  /<div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 shrink-0">\s+<User className="w-4 h-4 text-slate-400" \/>\s+<\/div>/,
  `__USER_ICON__`
);
code = code.replace(
  /<div>\s+<h3 className="text-sm font-bold text-white">\{currentUser\.name\}<\/h3>\s+<p className="text-xs text-slate-400">\{currentUser\.role === 'admin' \? 'مدير النظام' : 'موظف'\}<\/p>\s+<\/div>/,
  `__USER_TEXT__`
);
code = code.replace(
  /__USER_TEXT__\s+__USER_ICON__/,
  `__USER_ICON__
            __USER_TEXT__`
);
code = code.replace(/__USER_ICON__/g, `<div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 shrink-0">
              <User className="w-4 h-4 text-slate-400" />
            </div>`);
code = code.replace(/__USER_TEXT__/g, `<div>
              <h3 className="text-sm font-bold text-white">{currentUser.name}</h3>
              <p className="text-xs text-slate-400">{currentUser.role === 'admin' ? 'مدير النظام' : 'موظف'}</p>
            </div>`);

// 5. Fix Top Header of the layout (Main Content Header)
code = code.replace(
  /<div className="flex items-center gap-4">\s+<button onClick=\{handleLogout\} className="px-4 py-2 text-sm font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">\s+تسجيل الخروج\s+<\/button>\s+<\/div>\s+<div className="flex items-center gap-4">\s+<div>\s+<h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">\s+\{activeSection === 'overview' && 'نظرة عامة'\}/,
  `<div className="flex items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                {activeSection === 'overview' && 'نظرة عامة'}`
);

fs.writeFileSync('src/components/AdminDashboard.tsx', code);
