import React from 'react';
import { motion } from 'motion/react';
import { 
  Users, Wallet, CreditCard, Award, Download, 
  CheckCircle2, UserCheck, ShieldCheck, DollarSign
} from 'lucide-react';
import { BaseReportProps } from './types';
import { exportToCSV } from '../../utils/exportUtils';

export const HRPayrollReportsTab: React.FC<BaseReportProps> = ({
  employees = [],
  employeeTxs = [],
  settings
}) => {
  const currency = settings.currency || 'ر.ي';

  const totalBaseSalaries = employees.reduce((sum, e) => sum + (Number(e.salary) || 0), 0);
  const totalAllowances = employees.reduce((sum, e) => sum + (Number(e.allowances) || 0), 0);
  const totalDeductions = employees.reduce((sum, e) => sum + (Number(e.deductions) || 0), 0);
  const totalNetSalaries = totalBaseSalaries + totalAllowances - totalDeductions;

  const totalAdvancesPaid = employeeTxs
    .filter(t => t.type === 'advance')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalSalariesPaid = employeeTxs
    .filter(t => t.type === 'salary')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const handleExportPayroll = () => {
    const rows = employees.map(emp => {
      const net = (emp.salary || 0) + (emp.allowances || 0) - (emp.deductions || 0);
      return {
        name: emp.name,
        role: emp.role || 'موظف',
        phone: emp.phone || '—',
        salary: emp.salary || 0,
        allowances: emp.allowances || 0,
        deductions: emp.deductions || 0,
        net
      };
    });
    exportToCSV(rows, 'hr_payroll_ledger', [
      { key: 'name', label: 'اسم الموظف' },
      { key: 'role', label: 'المسمى الوظيفي' },
      { key: 'phone', label: 'الهاتف' },
      { key: 'salary', label: 'الراتب الأساسي' },
      { key: 'allowances', label: 'البدلات والحوافز' },
      { key: 'deductions', label: 'الخصومات' },
      { key: 'net', label: 'الصافي المستحق' }
    ]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 text-right"
      dir="rtl"
    >
      {/* 1. HR KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <div className="p-2.5 bg-indigo-500/10 rounded-2xl text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400">الكادر البشري</span>
          </div>
          <p className="text-xs text-slate-400 font-bold">إجمالي كادر الموظفين والفنيين</p>
          <h3 className="text-2xl font-black text-white font-mono mt-1">
            {employees.length} <span className="text-xs font-sans text-slate-400">موظف</span>
          </h3>
          <p className="text-[10px] text-slate-500 font-bold mt-1">فنيين ومحصلين وإداريين ومشغلين</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <div className="p-2.5 bg-emerald-500/10 rounded-2xl text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400">مسير الرواتب</span>
          </div>
          <p className="text-xs text-slate-400 font-bold">إجمالي صافي الرواتب الشهرية</p>
          <h3 className="text-2xl font-black text-emerald-400 font-mono mt-1">
            {totalNetSalaries.toLocaleString()} <span className="text-xs font-sans text-slate-400">{currency}</span>
          </h3>
          <p className="text-[10px] text-emerald-400 font-bold mt-1">شاملة البدلات ومطروحاً منها الخصومات</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <div className="p-2.5 bg-amber-500/10 rounded-2xl text-amber-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400">السلف والقروض</span>
          </div>
          <p className="text-xs text-slate-400 font-bold">إجمالي السلف الممنوحة للموظفين</p>
          <h3 className="text-2xl font-black text-amber-400 font-mono mt-1">
            {totalAdvancesPaid.toLocaleString()} <span className="text-xs font-sans text-slate-400">{currency}</span>
          </h3>
          <p className="text-[10px] text-slate-500 font-bold mt-1">سلف قيد الخصم من الرواتب</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <div className="p-2.5 bg-sky-500/10 rounded-2xl text-sky-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-400">الصرف الفعلي</span>
          </div>
          <p className="text-xs text-slate-400 font-bold">إجمالي الرواتب المنصرفة فعلياً</p>
          <h3 className="text-2xl font-black text-sky-400 font-mono mt-1">
            {totalSalariesPaid.toLocaleString()} <span className="text-xs font-sans text-slate-400">{currency}</span>
          </h3>
          <p className="text-[10px] text-slate-500 font-bold mt-1">من واقع سندات الصرف المالي</p>
        </div>
      </div>

      {/* 2. PAYROLL LEDGER TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              <span>كشف مسير رواتب واستحقاقات الموظفين والكادر الفني</span>
            </h3>
            <p className="text-xs text-slate-400 font-bold mt-0.5">تفصيل الرواتب الأساسية والبدلات والخصومات وصافي المستحق لكل موظف</p>
          </div>

          <button
            type="button"
            onClick={handleExportPayroll}
            className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير كشف الرواتب CSV</span>
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th className="p-3">اسم الموظف</th>
                <th className="p-3 text-center">المسمى الوظيفي</th>
                <th className="p-3 text-center">الهاتف</th>
                <th className="p-3 text-center">الراتب الأساسي</th>
                <th className="p-3 text-center">البدلات والحوافز</th>
                <th className="p-3 text-center">الخصومات</th>
                <th className="p-3 text-center">الصافي المستحق</th>
                <th className="p-3 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-bold text-slate-200">
              {employees.map(emp => {
                const net = (Number(emp.salary) || 0) + (Number(emp.allowances) || 0) - (Number(emp.deductions) || 0);
                return (
                  <tr key={emp.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-black text-white">{emp.name}</td>
                    <td className="p-3 text-center text-slate-300">{emp.role || 'فني شبكة'}</td>
                    <td className="p-3 text-center font-mono text-slate-400" dir="ltr">{emp.phone || '—'}</td>
                    <td className="p-3 text-center font-mono text-slate-300">
                      {(Number(emp.salary) || 0).toLocaleString()} {currency}
                    </td>
                    <td className="p-3 text-center font-mono text-emerald-400">
                      +{(Number(emp.allowances) || 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-center font-mono text-rose-400">
                      -{(Number(emp.deductions) || 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-center font-mono font-black text-indigo-300 text-sm">
                      {net.toLocaleString()} {currency}
                    </td>
                    <td className="p-3 text-center">
                      <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-black">
                        على رأس العمل
                      </span>
                    </td>
                  </tr>
                );
              })}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    لا توجد سجلات موظفين مسجلة بالنظام
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
