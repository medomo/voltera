import fs from 'fs';

let content = fs.readFileSync('src/components/AdminOperations.tsx', 'utf8');

content = content.replace(
  /import \{ Map, Zap, Settings, Wrench, AlertTriangle, Power, UserPlus, Clock, CheckCircle, Search, Plus, X, User \} from 'lucide-react';/,
  "import { Map, Zap, Settings, Wrench, AlertTriangle, Power, UserPlus, Clock, CheckCircle, Search, Plus, X, User, Download, Printer } from 'lucide-react';\nimport { exportToCSV, printData } from '../utils/exportUtils';"
);

content = content.replace(
  /<button\s+onClick=\{\(\) => setShowAddRequest\(true\)\}\s+className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"\s*>\s*<Plus className="w-4 h-4" \/>\s*<span>إضافة طلب جديد<\/span>\s*<\/button>/,
  `<div className="flex items-center gap-2">
                <button onClick={() => printData('الطلبات الفنية', requests.map(r => ({...r, type: r.type === 'new_connection' ? 'إدخال جديد' : r.type === 'maintenance' ? 'صيانة' : 'توسعة', status: r.status === 'pending' ? 'قيد الانتظار' : r.status === 'in_progress' ? 'قيد التنفيذ' : 'مكتمل'})), [{key: 'createdAt', label: 'التاريخ'}, {key: 'applicantName', label: 'صاحب الطلب'}, {key: 'phone', label: 'الهاتف'}, {key: 'type', label: 'نوع الطلب'}, {key: 'status', label: 'الحالة'}])} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm">
                  <Printer className="w-4 h-4" /> <span>طباعة</span>
                </button>
                <button onClick={() => exportToCSV(requests.map(r => ({...r, type: r.type === 'new_connection' ? 'إدخال جديد' : r.type === 'maintenance' ? 'صيانة' : 'توسعة', status: r.status === 'pending' ? 'قيد الانتظار' : r.status === 'in_progress' ? 'قيد التنفيذ' : 'مكتمل'})), 'technical_requests', [{key: 'createdAt', label: 'التاريخ'}, {key: 'applicantName', label: 'صاحب الطلب'}, {key: 'phone', label: 'الهاتف'}, {key: 'type', label: 'نوع الطلب'}, {key: 'status', label: 'الحالة'}])} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm">
                  <Download className="w-4 h-4" /> <span>CSV</span>
                </button>
                <button 
                  onClick={() => setShowAddRequest(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة طلب جديد</span>
                </button>
              </div>`
);

fs.writeFileSync('src/components/AdminOperations.tsx', content);

