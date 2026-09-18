import fs from 'fs';

let content = fs.readFileSync('src/components/AdminHR.tsx', 'utf8');

// Update imports
content = content.replace(
  /import \{ Users, FileText, UserPlus, Search, DollarSign, Plus, X, Briefcase, Phone, Calendar \} from 'lucide-react';/,
  "import { Users, FileText, UserPlus, Search, DollarSign, Plus, X, Briefcase, Phone, Calendar, Download, Printer } from 'lucide-react';\nimport { exportToCSV, printData } from '../utils/exportUtils';"
);

// Employees button
content = content.replace(
  /<button\s+onClick=\{\(\) => setShowAddEmployee\(true\)\}\s+className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"\s*>\s*<UserPlus className="w-4 h-4" \/>\s*<span>إضافة موظف جديد<\/span>\s*<\/button>/,
  `<div className="flex items-center gap-2">
                <button onClick={() => printData('سجل الموظفين', employees.map(e => ({...e, status: e.status === 'active' ? 'نشط' : 'موقوف', role: e.role === 'engineer' ? 'مهندس' : e.role === 'technician' ? 'فني' : e.role === 'accountant' ? 'محاسب' : 'إداري'})), [{key: 'name', label: 'الاسم'}, {key: 'role', label: 'الوظيفة'}, {key: 'phone', label: 'الهاتف'}, {key: 'salary', label: 'الراتب'}, {key: 'status', label: 'الحالة'}])} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm">
                  <Printer className="w-4 h-4" /> <span>طباعة</span>
                </button>
                <button onClick={() => exportToCSV(employees.map(e => ({...e, status: e.status === 'active' ? 'نشط' : 'موقوف', role: e.role === 'engineer' ? 'مهندس' : e.role === 'technician' ? 'فني' : e.role === 'accountant' ? 'محاسب' : 'إداري'})), 'employees', [{key: 'name', label: 'الاسم'}, {key: 'role', label: 'الوظيفة'}, {key: 'phone', label: 'الهاتف'}, {key: 'salary', label: 'الراتب'}, {key: 'status', label: 'الحالة'}])} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm">
                  <Download className="w-4 h-4" /> <span>CSV</span>
                </button>
                <button 
                  onClick={() => setShowAddEmployee(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>إضافة موظف جديد</span>
                </button>
              </div>`
);

// Employee transactions button
content = content.replace(
  /<button\s+onClick=\{\(\) => setShowAddTx\(true\)\}\s+className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"\s*>\s*<Plus className="w-4 h-4" \/>\s*<span>تسجيل حركة جديدة<\/span>\s*<\/button>/,
  `<div className="flex items-center gap-2">
                <button onClick={() => printData('حركات الرواتب والسلف', employeeTxs.map(tx => ({...tx, type: tx.type === 'salary' ? 'راتب' : tx.type === 'advance' ? 'سلفة' : 'بدل'})), [{key: 'date', label: 'التاريخ'}, {key: 'employeeName', label: 'الموظف'}, {key: 'type', label: 'النوع'}, {key: 'amount', label: 'المبلغ'}, {key: 'description', label: 'البيان'}])} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm">
                  <Printer className="w-4 h-4" /> <span>طباعة</span>
                </button>
                <button onClick={() => exportToCSV(employeeTxs.map(tx => ({...tx, type: tx.type === 'salary' ? 'راتب' : tx.type === 'advance' ? 'سلفة' : 'بدل'})), 'payroll', [{key: 'date', label: 'التاريخ'}, {key: 'employeeName', label: 'الموظف'}, {key: 'type', label: 'النوع'}, {key: 'amount', label: 'المبلغ'}, {key: 'description', label: 'البيان'}])} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm">
                  <Download className="w-4 h-4" /> <span>CSV</span>
                </button>
                <button 
                  onClick={() => setShowAddTx(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>تسجيل حركة جديدة</span>
                </button>
              </div>`
);

fs.writeFileSync('src/components/AdminHR.tsx', content);

