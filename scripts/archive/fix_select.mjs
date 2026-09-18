import fs from 'fs';

let content = fs.readFileSync('src/components/AdminAccounting.tsx', 'utf8');

// Replace select for expenses
content = content.replace(
  /<select\s+required\s+value=\{newExpense\.category \?\? ''\}\s+onChange=\{e => setNewExpense\(\{\.\.\.newExpense, category: e\.target\.value\}\)\}\s+className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 appearance-none"\s*>/g,
  `<div className="relative">
                      <select
                        required
                        value={newExpense.category ?? ''}
                        onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pr-10 text-sm text-white focus:outline-none focus:border-amber-500 appearance-none"
                      >
`
);

// We need to add the chevron after the select. Let's find where </select> is and replace it.
content = content.replace(
  /<\/option>\s*<\/select>\s*<\/div>\s*<div>\s*<label className="block text-xs font-bold text-slate-400 mb-2">تاريخ الصرف<\/label>/g,
  `</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">تاريخ الصرف</label>`
);


// Replace select for employee transactions
content = content.replace(
  /<select\s+required\s+value=\{newEmployeeTx\.type \|\| 'salary'\}\s+onChange=\{e => setNewEmployeeTx\(\{\.\.\.newEmployeeTx, type: e\.target\.value as any\}\)\}\s+className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 appearance-none"\s*>/g,
  `<div className="relative">
                      <select
                        required
                        value={newEmployeeTx.type || 'salary'}
                        onChange={e => setNewEmployeeTx({...newEmployeeTx, type: e.target.value as any})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pr-10 text-sm text-white focus:outline-none focus:border-amber-500 appearance-none"
                      >
`
);

content = content.replace(
  /<\/option>\s*<\/select>\s*<\/div>\s*<\/div>\s*<div className="grid grid-cols-2 gap-4">/g,
  `</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">`
);

fs.writeFileSync('src/components/AdminAccounting.tsx', content);

