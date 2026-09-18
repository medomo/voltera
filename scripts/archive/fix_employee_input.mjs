import fs from 'fs';

let content = fs.readFileSync('src/components/AdminAccounting.tsx', 'utf8');

const targetInput = `                    <input
                      type="text"
                      required
                      value={newEmployeeTx.employeeName ?? ''}
                      onChange={e => setNewEmployeeTx({...newEmployeeTx, employeeName: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 text-right"
                      placeholder="اسم الموظف"
                    />`;

const replacementInput = `                    <input
                      type="text"
                      list="employee-names"
                      required
                      value={newEmployeeTx.employeeName ?? ''}
                      onChange={e => setNewEmployeeTx({...newEmployeeTx, employeeName: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 text-right"
                      placeholder="اختر أو ابحث عن موظف..."
                    />
                    <datalist id="employee-names">
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.name} />
                      ))}
                    </datalist>`;

content = content.replace(targetInput, replacementInput);

fs.writeFileSync('src/components/AdminAccounting.tsx', content);
