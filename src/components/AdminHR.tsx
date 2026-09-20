import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, FileText, UserPlus, Search, DollarSign, Plus, X, Briefcase, Phone, 
  Calendar, Download, Printer, Edit2, Trash2, ShieldCheck, CheckCircle2, 
  AlertTriangle, CreditCard, Building2, Eye, Filter, SlidersHorizontal, 
  Check, ArrowUpRight, ArrowDownRight, Layers, FileSpreadsheet, RefreshCw, UserCheck,
  Link2, Unlink, Key, ShieldAlert, Sparkles, User as UserIcon, Lock
} from 'lucide-react';
import { exportToCSV, printData } from '../utils/exportUtils';
import { SystemSettings, User, EmployeeTransaction, Employee, UserRole } from '../types';
import { 
  syncEmployeeToCloud, 
  deleteEmployeeFromCloud, 
  syncUserToCloud, 
  syncEmployeeTxToCloud 
} from '../lib/database';

interface AdminHRProps {
  settings: SystemSettings;
  currentUser: User;
  activeTab: 'employees' | 'payroll';
  logAction?: (action: string, details: string) => void;
  employees?: Employee[];
  onUpdateEmployees?: (employees: Employee[]) => void;
  employeeTxs?: EmployeeTransaction[];
  onUpdateEmployeeTxs?: (txs: EmployeeTransaction[]) => void;
  users?: User[];
  onUpdateUsers?: (users: User[]) => void;
}

export const AdminHR: React.FC<AdminHRProps> = ({
  settings, 
  currentUser, 
  activeTab: initialTab,
  logAction,
  employees: employeesProp,
  onUpdateEmployees,
  employeeTxs: employeeTxsProp,
  onUpdateEmployeeTxs,
  users = [],
  onUpdateUsers
}) => {
  const [activeTab, setActiveTab] = useState<'employees' | 'payroll' | 'advances'>(initialTab);
  
  useEffect(() => {
    if (initialTab === 'employees' || initialTab === 'payroll') {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Initial Employees
  const [employees, setEmployees] = useState<Employee[]>(employeesProp || []);
  const [employeeTxs, setEmployeeTxs] = useState<EmployeeTransaction[]>(employeeTxsProp || []);

  useEffect(() => { setEmployees(employeesProp || []); }, [employeesProp]);
  useEffect(() => { setEmployeeTxs(employeeTxsProp || []); }, [employeeTxsProp]);

  // View States
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [accountLinkFilter, setAccountLinkFilter] = useState<'all' | 'linked' | 'unlinked' | 'collector_unlinked'>('all');
  const [selectedMonth, setSelectedMonth] = useState('2026-07');

  // Modals
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  
  const [showAddTx, setShowAddTx] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState<Employee | null>(null);
  const [showVoucherModal, setShowVoucherModal] = useState<EmployeeTransaction | null>(null);
  
  // Quick Link User Modal State
  const [quickLinkTarget, setQuickLinkTarget] = useState<Employee | null>(null);
  const [quickLinkSelectedUserId, setQuickLinkSelectedUserId] = useState<string>('');
  const [quickLinkNewMode, setQuickLinkNewMode] = useState<boolean>(false);
  const [quickLinkNewUsername, setQuickLinkNewUsername] = useState<string>('');
  const [quickLinkNewPassword, setQuickLinkNewPassword] = useState<string>('123456');
  const [quickLinkNewRole, setQuickLinkNewRole] = useState<UserRole>('collector');

  // Form user link state in Employee modal
  const [formUserLinkMode, setFormUserLinkMode] = useState<'none' | 'existing' | 'new'>('none');
  const [formSelectedUserId, setFormSelectedUserId] = useState<string>('');
  const [formNewUsername, setFormNewUsername] = useState<string>('');
  const [formNewPassword, setFormNewPassword] = useState<string>('123456');
  const [formNewUserRole, setFormNewUserRole] = useState<UserRole>('collector');

  // Interactive Salary Disbursement Modal State
  const [salaryModalTarget, setSalaryModalTarget] = useState<{
    emp: Employee;
    currentAdvBalance: number;
    monthlyAllowances: number;
    monthlyDeductions: number;
  } | null>(null);

  const [salaryForm, setSalaryForm] = useState<{
    basicSalary: number;
    allowances: number;
    deductions: number;
    advanceDeduct: number;
    paymentMethod: string;
    notes: string;
  }>({
    basicSalary: 0,
    allowances: 0,
    deductions: 0,
    advanceDeduct: 0,
    paymentMethod: 'نقداً - من الخزينة',
    notes: ''
  });

  // Forms State
  const [employeeForm, setEmployeeForm] = useState<Partial<Employee>>({
    code: '',
    name: '',
    role: 'technician',
    department: 'التشغيل',
    phone: '',
    nationalId: '',
    salary: 100000,
    allowances: 0,
    deductions: 0,
    status: 'active',
    joinDate: new Date().toISOString().split('T')[0],
    bankAccount: '',
    address: '',
    notes: '',
    userId: '',
    username: ''
  });

  const [txForm, setTxForm] = useState<Partial<EmployeeTransaction>>({
    employeeId: '',
    type: 'advance',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    month: selectedMonth,
    description: '',
    voucherNo: ''
  });

  // Helper: Find linked user for an employee
  const getLinkedUserForEmployee = (emp: Employee): User | undefined => {
    if (emp.userId) {
      const u = users.find(user => user.id === emp.userId);
      if (u) return u;
    }
    if (emp.username) {
      const u = users.find(user => user.username.toLowerCase() === emp.username?.toLowerCase());
      if (u) return u;
    }
    return users.find(user => user.employeeId === emp.id);
  };

  // Helper: Find if a user is linked to another employee
  const getLinkedEmployeeForUser = (userId: string): Employee | undefined => {
    return employees.find(e => e.userId === userId || users.find(u => u.id === userId)?.employeeId === e.id);
  };

  // Calculate Employee Financial Balances (Advances balance, Total Paid)
  const employeeBalances = useMemo<Record<string, { totalAdvances: number; totalRepaid: number; remainingAdvances: number; totalSalariesPaid: number }>>(() => {
    const balances: Record<string, { totalAdvances: number; totalRepaid: number; remainingAdvances: number; totalSalariesPaid: number }> = {};
    
    employees.forEach(emp => {
      balances[emp.id] = { totalAdvances: 0, totalRepaid: 0, remainingAdvances: 0, totalSalariesPaid: 0 };
    });

    employeeTxs.forEach(tx => {
      if (!balances[tx.employeeId]) {
        balances[tx.employeeId] = { totalAdvances: 0, totalRepaid: 0, remainingAdvances: 0, totalSalariesPaid: 0 };
      }

      if (tx.type === 'advance') {
        balances[tx.employeeId].totalAdvances += tx.amount;
      } else if (tx.type === 'repayment') {
        balances[tx.employeeId].totalRepaid += tx.amount;
      } else if (tx.type === 'salary') {
        balances[tx.employeeId].totalSalariesPaid += tx.amount;
      }
    });

    Object.keys(balances).forEach(id => {
      balances[id].remainingAdvances = Math.max(0, balances[id].totalAdvances - balances[id].totalRepaid);
    });

    return balances;
  }, [employees, employeeTxs]);

  // Overall HR Stats
  const hrStats = useMemo(() => {
    const totalCount = employees.length;
    const activeCount = employees.filter(e => e.status === 'active').length;
    const totalPayrollMass = employees
      .filter(e => e.status === 'active')
      .reduce((sum, e) => sum + (e.salary + (e.allowances || 0) - (e.deductions || 0)), 0);

    const totalAdvancesBalance = Object.values(employeeBalances)
      .reduce((sum: number, b: { remainingAdvances: number }) => sum + (b?.remainingAdvances || 0), 0);

    const currentMonthPaidSalaries = employeeTxs
      .filter(tx => tx.type === 'salary' && (tx.month === selectedMonth || tx.date.startsWith(selectedMonth)))
      .reduce((sum, tx) => sum + tx.amount, 0);

    return { totalCount, activeCount, totalPayrollMass, totalAdvancesBalance, currentMonthPaidSalaries };
  }, [employees, employeeBalances, employeeTxs, selectedMonth]);

  // Filtered Employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = 
        emp.name.toLowerCase().includes(q) ||
        (emp.code && emp.code.toLowerCase().includes(q)) ||
        emp.phone.includes(q) ||
        (emp.username && emp.username.toLowerCase().includes(q)) ||
        (emp.department && emp.department.toLowerCase().includes(q));

      const matchesRole = roleFilter === 'all' || emp.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;

      let matchesAccountLink = true;
      const isLinked = Boolean(emp.userId || emp.username || users.some(u => u.employeeId === emp.id || (emp.userId && u.id === emp.userId)));
      if (accountLinkFilter === 'linked') {
        matchesAccountLink = isLinked;
      } else if (accountLinkFilter === 'unlinked') {
        matchesAccountLink = !isLinked;
      } else if (accountLinkFilter === 'collector_unlinked') {
        matchesAccountLink = emp.role === 'collector' && !isLinked;
      }

      return matchesSearch && matchesRole && matchesStatus && matchesAccountLink;
    });
  }, [employees, searchTerm, roleFilter, statusFilter, accountLinkFilter, users]);

  // Quick user link/unlink handler
  const handleExecuteQuickLink = (
    emp: Employee, 
    mode: 'unlink' | 'link_existing' | 'create_new', 
    targetUserId?: string,
    newUserData?: { username: string; password?: string; role: UserRole }
  ) => {
    let updatedUsers = [...users];
    let linkedUserId: string | undefined = undefined;
    let linkedUsername: string | undefined = undefined;

    if (mode === 'unlink') {
      // Remove employee reference from users
      updatedUsers = updatedUsers.map(u => {
        if (u.id === emp.userId || u.employeeId === emp.id || (emp.username && u.username === emp.username)) {
          const { employeeId, employeeName, ...rest } = u;
          return { ...rest, employeeId: undefined, employeeName: undefined } as User;
        }
        return u;
      });
      linkedUserId = undefined;
      linkedUsername = undefined;
    } else if (mode === 'link_existing' && targetUserId) {
      const targetUser = users.find(u => u.id === targetUserId);
      if (!targetUser) {
        alert('حساب المستخدم المحدد غير موجود.');
        return;
      }

      // Check if targetUser is already linked to someone else
      const otherEmp = employees.find(e => e.id !== emp.id && (e.userId === targetUserId || targetUser.employeeId === e.id));
      if (otherEmp) {
        if (!confirm(`هذا الحساب (@${targetUser.username}) مرتبط بالفعل بالموظف "${otherEmp.name}". هل تريد نقله وربطه بالموظف "${emp.name}"؟`)) {
          return;
        }
      }

      // Update user records
      updatedUsers = updatedUsers.map(u => {
        // Clear old link if previously linked
        if (u.id === emp.userId || (u.employeeId === emp.id && u.id !== targetUserId)) {
          return { ...u, employeeId: undefined, employeeName: undefined };
        }
        if (u.id === targetUserId) {
          return { ...u, employeeId: emp.id, employeeName: emp.name };
        }
        return u;
      });

      linkedUserId = targetUser.id;
      linkedUsername = targetUser.username;
    } else if (mode === 'create_new' && newUserData) {
      const cleanUsername = newUserData.username.trim().toLowerCase();
      if (!cleanUsername) {
        alert('يرجى كتابة اسم مستخدم صحيح.');
        return;
      }
      if (users.some(u => u.username.toLowerCase() === cleanUsername)) {
        alert(`اسم المستخدم "${cleanUsername}" مستخدم بالفعل بحساب آخر! يرجى اختيار اسم مستخدم مختلف.`);
        return;
      }

      const newUserId = `u-${Date.now()}`;
      const defaultRole = newUserData.role || (emp.role === 'collector' ? 'collector' : 'collector');
      const newUser: User = {
        id: newUserId,
        username: cleanUsername,
        passwordHash: newUserData.password || '123456',
        role: defaultRole,
        name: emp.name,
        status: 'active',
        phone: emp.phone,
        employeeId: emp.id,
        employeeName: emp.name,
        permissions: defaultRole === 'collector' 
          ? ['read_subscribers', 'read_readings', 'write_readings', 'read_payments', 'write_payments']
          : ['all_permissions'],
        createdAt: new Date().toISOString()
      };

      updatedUsers = [...updatedUsers, newUser];
      linkedUserId = newUserId;
      linkedUsername = cleanUsername;
    }

    // Update Employee record
    const updatedEmployees = employees.map(e => {
      if (e.id === emp.id) {
        return {
          ...e,
          userId: linkedUserId,
          username: linkedUsername
        };
      }
      // If another employee had this user, unlink from them
      if (mode === 'link_existing' && targetUserId && e.userId === targetUserId && e.id !== emp.id) {
        return {
          ...e,
          userId: undefined,
          username: undefined
        };
      }
      return e;
    });

    setEmployees(updatedEmployees);
    if (onUpdateEmployees) onUpdateEmployees(updatedEmployees);
    if (onUpdateUsers) onUpdateUsers(updatedUsers);

    // Synchronize modified employees and users to Firestore
    updatedEmployees.forEach(e => {
      syncEmployeeToCloud(e);
    });
    updatedUsers.forEach(u => {
      syncUserToCloud(u);
    });

    if (logAction) {
      if (mode === 'unlink') {
        logAction('فك ارتباط حساب مستخدم', `تم إلغاء ربط حساب المستخدم للموظف ${emp.name}`);
      } else if (mode === 'link_existing') {
        logAction('ربط حساب مستخدم', `تم ربط الموظف ${emp.name} بحساب المستخدم @${linkedUsername}`);
      } else {
        logAction('إنشاء وربط حساب مستخدم', `تم إنشاء حساب مستخدم جديد @${linkedUsername} وربطه بالموظف ${emp.name}`);
      }
    }

    setQuickLinkTarget(null);
  };

  // Handle Save Employee
  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeForm.name || !employeeForm.phone || !employeeForm.salary) {
      alert('يرجى تعبئة كافة الحقول الأساسية (الاسم، الهاتف، الراتب)');
      return;
    }

    const empId = editingEmployee ? editingEmployee.id : `emp-${Date.now()}`;
    let finalUserId = employeeForm.userId;
    let finalUsername = employeeForm.username;
    let updatedUsers = [...users];

    // Process user link based on mode
    if (formUserLinkMode === 'none') {
      finalUserId = undefined;
      finalUsername = undefined;
      // Clear link on users if previously linked
      updatedUsers = updatedUsers.map(u => {
        if (u.employeeId === empId || (editingEmployee && (u.id === editingEmployee.userId || u.username === editingEmployee.username))) {
          return { ...u, employeeId: undefined, employeeName: undefined };
        }
        return u;
      });
    } else if (formUserLinkMode === 'existing') {
      if (!formSelectedUserId) {
        alert('يرجى اختيار حساب المستخدم المراد ربطه.');
        return;
      }
      const targetUser = users.find(u => u.id === formSelectedUserId);
      if (targetUser) {
        finalUserId = targetUser.id;
        finalUsername = targetUser.username;

        updatedUsers = updatedUsers.map(u => {
          if (u.id === formSelectedUserId) {
            return { ...u, employeeId: empId, employeeName: employeeForm.name! };
          }
          if (u.employeeId === empId && u.id !== formSelectedUserId) {
            return { ...u, employeeId: undefined, employeeName: undefined };
          }
          return u;
        });
      }
    } else if (formUserLinkMode === 'new') {
      const cleanUsername = formNewUsername.trim().toLowerCase();
      if (!cleanUsername) {
        alert('يرجى كتابة اسم مستخدم صالح للحساب الجديد.');
        return;
      }
      if (users.some(u => u.username.toLowerCase() === cleanUsername && (!editingEmployee || u.id !== editingEmployee.userId))) {
        alert(`اسم المستخدم "${cleanUsername}" مستخدم بالفعل بحساب آخر! يرجى اختيار اسم مستخدم مختلف.`);
        return;
      }

      const newUserId = `u-${Date.now()}`;
      const newUser: User = {
        id: newUserId,
        username: cleanUsername,
        passwordHash: formNewPassword || '123456',
        role: formNewUserRole,
        name: employeeForm.name!,
        status: 'active',
        phone: employeeForm.phone,
        employeeId: empId,
        employeeName: employeeForm.name!,
        permissions: formNewUserRole === 'collector' 
          ? ['read_subscribers', 'read_readings', 'write_readings', 'read_payments', 'write_payments']
          : ['all_permissions'],
        createdAt: new Date().toISOString()
      };

      updatedUsers = [...updatedUsers, newUser];
      finalUserId = newUserId;
      finalUsername = cleanUsername;
    }

    if (editingEmployee) {
      const updatedList = employees.map(emp => {
        if (emp.id === editingEmployee.id) {
          return {
            ...emp,
            code: employeeForm.code || emp.code,
            name: employeeForm.name!,
            role: employeeForm.role as any,
            department: employeeForm.department || 'عام',
            phone: employeeForm.phone!,
            nationalId: employeeForm.nationalId || '',
            salary: Number(employeeForm.salary),
            allowances: Number(employeeForm.allowances || 0),
            deductions: Number(employeeForm.deductions || 0),
            status: employeeForm.status as any,
            joinDate: employeeForm.joinDate || emp.joinDate,
            bankAccount: employeeForm.bankAccount || '',
            address: employeeForm.address || '',
            notes: employeeForm.notes || '',
            userId: finalUserId,
            username: finalUsername
          };
        }
        return emp;
      });
      setEmployees(updatedList);
      if (onUpdateEmployees) onUpdateEmployees(updatedList);
      if (onUpdateUsers) onUpdateUsers(updatedUsers);

      const modifiedEmp = updatedList.find(e => e.id === editingEmployee.id);
      if (modifiedEmp) syncEmployeeToCloud(modifiedEmp);
      updatedUsers.forEach(u => syncUserToCloud(u));

      if (logAction) logAction('تحديث ملف موظف', `تم تعديل بيانات الموظف: ${employeeForm.name} ${finalUsername ? `(مرتبط بالحساب: @${finalUsername})` : ''}`);
    } else {
      const newEmp: Employee = {
        id: empId,
        code: employeeForm.code || `EMP-${Math.floor(100 + Math.random() * 900)}`,
        name: employeeForm.name!,
        role: employeeForm.role as any,
        department: employeeForm.department || 'عام',
        phone: employeeForm.phone!,
        nationalId: employeeForm.nationalId || '',
        salary: Number(employeeForm.salary),
        allowances: Number(employeeForm.allowances || 0),
        deductions: Number(employeeForm.deductions || 0),
        status: employeeForm.status as any,
        joinDate: employeeForm.joinDate || new Date().toISOString().split('T')[0],
        bankAccount: employeeForm.bankAccount || '',
        address: employeeForm.address || '',
        notes: employeeForm.notes || '',
        userId: finalUserId,
        username: finalUsername
      };
      const updatedList = [newEmp, ...employees];
      setEmployees(updatedList);
      if (onUpdateEmployees) onUpdateEmployees(updatedList);
      if (onUpdateUsers) onUpdateUsers(updatedUsers);

      syncEmployeeToCloud(newEmp);
      updatedUsers.forEach(u => syncUserToCloud(u));

      if (logAction) logAction('إضافة موظف جديد', `تمت إضافة الموظف الجديد: ${newEmp.name} ${finalUsername ? `(مرتبط بالحساب: @${finalUsername})` : ''}`);
    }

    setShowAddEmployee(false);
    setEditingEmployee(null);
  };

  const handleOpenAddModal = () => {
    setEditingEmployee(null);
    setEmployeeForm({
      code: `EMP-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      role: 'technician',
      department: 'الصيانة والشبكات',
      phone: '',
      nationalId: '',
      salary: 100000,
      allowances: 0,
      deductions: 0,
      status: 'active',
      joinDate: new Date().toISOString().split('T')[0],
      bankAccount: '',
      address: '',
      notes: '',
      userId: '',
      username: ''
    });
    setFormUserLinkMode('none');
    setFormSelectedUserId('');
    setFormNewUsername('');
    setFormNewPassword('123456');
    setFormNewUserRole('collector');
    setShowAddEmployee(true);
  };

  const handleOpenEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmployeeForm({
      code: emp.code || '',
      name: emp.name,
      role: emp.role,
      department: emp.department || '',
      phone: emp.phone,
      nationalId: emp.nationalId || '',
      salary: emp.salary,
      allowances: emp.allowances || 0,
      deductions: emp.deductions || 0,
      status: emp.status,
      joinDate: emp.joinDate,
      bankAccount: emp.bankAccount || '',
      address: emp.address || '',
      notes: emp.notes || '',
      userId: emp.userId || '',
      username: emp.username || ''
    });

    const linkedUser = getLinkedUserForEmployee(emp);
    if (linkedUser) {
      setFormUserLinkMode('existing');
      setFormSelectedUserId(linkedUser.id);
      setFormNewUsername(linkedUser.username);
    } else {
      setFormUserLinkMode('none');
      setFormSelectedUserId('');
      setFormNewUsername(emp.name ? `coll_${emp.name.split(' ')[0]}` : '');
    }
    setFormNewPassword('123456');
    setFormNewUserRole(emp.role === 'collector' ? 'collector' : 'collector');
    setShowAddEmployee(true);
  };

  const handleDeleteEmployee = async (id: string) => {
    const target = employees.find(e => e.id === id);
    if (!target) return;
    if (confirm(`هل أنت تأكد من إلغاء/حذف ملف الموظف "${target.name}"؟`)) {
      const updated = employees.filter(e => e.id !== id);
      setEmployees(updated);
      if (onUpdateEmployees) onUpdateEmployees(updated);
      await deleteEmployeeFromCloud(id);
      if (logAction) logAction('حذف موظف', `تم حذف ملف الموظف: ${target.name}`);
    }
  };

  // Handle Save Transaction (Advance, Allowance, Salary, Deduction, Repayment)
  const handleSaveTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txForm.employeeId || !txForm.amount || Number(txForm.amount) <= 0) {
      alert('يرجى اختيار الموظف وإدخال مبلغ صحيح');
      return;
    }

    const emp = employees.find(e => e.id === txForm.employeeId);
    if (!emp) return;

    const txType = txForm.type || 'advance';
    const codePrefix = 
      txType === 'salary' ? 'SAL' :
      txType === 'advance' ? 'ADV' :
      txType === 'allowance' ? 'BON' : 'DED';

    const newTxObj: EmployeeTransaction = {
      id: `tx-${Date.now()}`,
      employeeId: emp.id,
      employeeName: emp.name,
      type: txType as any,
      amount: Number(txForm.amount),
      date: txForm.date || new Date().toISOString().split('T')[0],
      month: txForm.month || selectedMonth,
      description: txForm.description || '',
      recordedBy: currentUser.name,
      voucherNo: txForm.voucherNo || `${codePrefix}-${Math.floor(1000 + Math.random() * 9000)}`
    };

    const updated = [newTxObj, ...employeeTxs];
    setEmployeeTxs(updated);
    if (onUpdateEmployeeTxs) onUpdateEmployeeTxs(updated);
    await syncEmployeeTxToCloud(newTxObj);

    const txNameMap = {
      salary: 'صرف راتب',
      advance: 'صرف سلفة',
      allowance: 'إضافة مكافأة/بدل',
      deduction: 'تسجيل خصم/جزاء',
      repayment: 'سداد سلفة'
    };

    if (logAction) logAction('حركة موارد بشرية', `تم تسجيل ${txNameMap[txType as keyof typeof txNameMap]} للموظف ${emp.name} بمبلغ ${newTxObj.amount}`);

    setShowAddTx(false);
    setTxForm({
      employeeId: '',
      type: 'advance',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      month: selectedMonth,
      description: '',
      voucherNo: ''
    });
  };

  // Dynamic monthly allowances & deductions calculation per employee
  const getMonthlyEmployeeTxsSummary = (empId: string, month: string) => {
    const txsForMonth = employeeTxs.filter(tx => 
      tx.employeeId === empId && (tx.month === month || tx.date.startsWith(month))
    );
    const txAllowances = txsForMonth.filter(tx => tx.type === 'allowance').reduce((sum, tx) => sum + tx.amount, 0);
    const txDeductions = txsForMonth.filter(tx => tx.type === 'deduction').reduce((sum, tx) => sum + tx.amount, 0);
    return { txAllowances, txDeductions };
  };

  // Open Interactive Salary Disbursement Modal
  const openSalaryDisburseModal = (emp: Employee) => {
    const advBal = employeeBalances[emp.id]?.remainingAdvances || 0;
    const { txAllowances, txDeductions } = getMonthlyEmployeeTxsSummary(emp.id, selectedMonth);
    const totalAllow = (emp.allowances || 0) + txAllowances;
    const totalDed = (emp.deductions || 0) + txDeductions;
    const autoAdvDeduct = Math.min(advBal, Math.round(emp.salary * 0.5));

    setSalaryForm({
      basicSalary: emp.salary,
      allowances: totalAllow,
      deductions: totalDed,
      advanceDeduct: autoAdvDeduct,
      paymentMethod: 'نقداً - من الخزينة',
      notes: `راتب شهر ${selectedMonth}`
    });

    setSalaryModalTarget({
      emp,
      currentAdvBalance: advBal,
      monthlyAllowances: totalAllow,
      monthlyDeductions: totalDed
    });
  };

  // Confirm and Execute Interactive Salary Disbursement
  const handleConfirmDisburseSalary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!salaryModalTarget) return;
    const { emp } = salaryModalTarget;

    const baseSal = Number(salaryForm.basicSalary) || 0;
    const allow = Number(salaryForm.allowances) || 0;
    const ded = Number(salaryForm.deductions) || 0;
    const advDeduct = Number(salaryForm.advanceDeduct) || 0;

    const netPayable = Math.max(0, baseSal + allow - ded - advDeduct);

    if (netPayable <= 0) {
      alert('صافي الراتب المستحق يجب أن يكون أكبر من صفر!');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const salVoucherNo = `SAL-${(selectedMonth || '').replace('-', '')}-${emp.code || emp.id.slice(-3)}`;

    const salaryTx: EmployeeTransaction = {
      id: `sal-${Date.now()}`,
      employeeId: emp.id,
      employeeName: emp.name,
      type: 'salary',
      amount: netPayable,
      date: todayStr,
      month: selectedMonth,
      description: `${salaryForm.notes || `راتب شهر ${selectedMonth}`} (الأساسي: ${baseSal.toLocaleString()} + بدلات: ${allow.toLocaleString()} - خصم: ${ded.toLocaleString()}${advDeduct > 0 ? ` - تسوية سلفة: ${advDeduct.toLocaleString()}` : ''})`,
      recordedBy: currentUser.name,
      voucherNo: salVoucherNo
    };

    const newTxs: EmployeeTransaction[] = [salaryTx];

    // If advance was deducted, record a repayment transaction automatically
    if (advDeduct > 0) {
      const repayVoucherNo = `SET-${Math.floor(1000 + Math.random() * 9000)}`;
      newTxs.unshift({
        id: `rep-${Date.now() + 1}`,
        employeeId: emp.id,
        employeeName: emp.name,
        type: 'repayment',
        amount: advDeduct,
        date: todayStr,
        month: selectedMonth,
        description: `تسوية اقتطاع سُلفة من راتب شهر ${selectedMonth}`,
        recordedBy: currentUser.name,
        voucherNo: repayVoucherNo
      });
    }

    const updatedList = [...newTxs, ...employeeTxs];
    setEmployeeTxs(updatedList);
    if (onUpdateEmployeeTxs) onUpdateEmployeeTxs(updatedList);
    newTxs.forEach(tx => syncEmployeeTxToCloud(tx));

    if (logAction) {
      logAction('صرف راتب موظف', `تم صرف راتب شهر ${selectedMonth} للموظف ${emp.name} بصلفي ${netPayable.toLocaleString()} ${settings.currency}`);
    }

    setSalaryModalTarget(null);
    setShowVoucherModal(salaryTx);
  };

  const getRoleLabel = (role: string) => {
    switch(role) {
      case 'engineer': return 'مهندس كهربائي';
      case 'technician': return 'فني صيانة وشبكات';
      case 'admin': return 'إداري / محاسب';
      case 'accountant': return 'محاسب مالي';
      case 'collector': return 'محصل ميداني';
      default: return role;
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-indigo-100 text-indigo-800 rounded-xl">
              <Users className="w-5 h-5" />
            </span>
            <h2 className="text-2xl font-black text-slate-900">شؤون الموظفين والموارد البشرية (HR)</h2>
          </div>
          <p className="text-sm text-slate-500 font-medium">إدارة الكوادر الوظيفية، مسيرات الرواتب الشهرية، متابعة السلف والبدلات والإنهاءات المالية</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => printData('دليل كادر الموظفين', employees.map(e => ({
              code: e.code || '-',
              name: e.name,
              role: getRoleLabel(e.role),
              department: e.department || '-',
              phone: e.phone,
              salary: `${e.salary.toLocaleString()} ${settings.currency}`,
              allowances: `${(e.allowances || 0).toLocaleString()} ${settings.currency}`,
              advancesBal: `${(employeeBalances[e.id]?.remainingAdvances || 0).toLocaleString()} ${settings.currency}`,
              status: e.status === 'active' ? 'نشط' : 'موقوف'
            })), [
              { key: 'code', label: 'الكود' },
              { key: 'name', label: 'اسم الموظف' },
              { key: 'role', label: 'المسمى الوظيفي' },
              { key: 'department', label: 'القسم' },
              { key: 'phone', label: 'الهاتف' },
              { key: 'salary', label: 'الراتب الأساسي' },
              { key: 'advancesBal', label: 'رصيد السلف' },
              { key: 'status', label: 'الحالة' }
            ])}
            className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>طباعة القائمة</span>
          </button>

          <button 
            onClick={() => exportToCSV(employees, 'employees_hr_list', [
              { key: 'code', label: 'الكود' },
              { key: 'name', label: 'الاسم' },
              { key: 'phone', label: 'الهاتف' },
              { key: 'salary', label: 'الراتب' },
              { key: 'status', label: 'الحالة' }
            ])}
            className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>تصدير Excel</span>
          </button>

          <button 
            onClick={handleOpenAddModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة موظف جديد</span>
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">إجمالي الموظفين</p>
            <h3 className="text-2xl font-black text-slate-900 font-mono">{hrStats.totalCount} <span className="text-xs font-normal text-slate-400 font-sans">موظف</span></h3>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
              {hrStats.activeCount} موظف نشط
            </span>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">كتلة الرواتب الشهرية</p>
            <h3 className="text-2xl font-black text-slate-900 font-mono">{hrStats.totalPayrollMass.toLocaleString('ar-SA')} <span className="text-xs font-normal text-slate-400 font-sans">{settings.currency}</span></h3>
            <span className="text-[10px] text-slate-500 font-medium block mt-1">إجمالي الرواتب والبدلات</span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">رصيد السُلف القائمة</p>
            <h3 className="text-2xl font-black text-amber-600 font-mono">{hrStats.totalAdvancesBalance.toLocaleString('ar-SA')} <span className="text-xs font-normal text-slate-400 font-sans">{settings.currency}</span></h3>
            <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full inline-block mt-1">
              مستحقة الخصم من الرواتب
            </span>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-bold">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 mb-1">المصروف من رواتب الشهر</p>
            <h3 className="text-2xl font-black text-sky-600 font-mono">{hrStats.currentMonthPaidSalaries.toLocaleString('ar-SA')} <span className="text-xs font-normal text-slate-400 font-sans">{settings.currency}</span></h3>
            <span className="text-[10px] text-sky-600 font-bold bg-sky-50 px-2 py-0.5 rounded-full inline-block mt-1">
              شهر {selectedMonth}
            </span>
          </div>
          <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 space-x-reverse space-x-4 bg-white px-4 rounded-2xl border shadow-sm">
        <button
          onClick={() => setActiveTab('employees')}
          className={`py-3.5 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'employees'
              ? 'border-indigo-600 text-indigo-600 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>ملفات الكادر والموظفين</span>
          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">{employees.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('payroll')}
          className={`py-3.5 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'payroll'
              ? 'border-indigo-600 text-indigo-600 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>مسير الرواتب المستحق</span>
        </button>

        <button
          onClick={() => setActiveTab('advances')}
          className={`py-3.5 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'advances'
              ? 'border-indigo-600 text-indigo-600 font-black'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4 text-amber-600" />
          <span>سجل السُلف والبدلات والخصومات</span>
          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">{employeeTxs.length}</span>
        </button>
      </div>

      {/* EMPLOYEES TAB CONTENT */}
      {activeTab === 'employees' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          
          {/* Controls bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="ابحث باسم الموظف، الكود الوظيفي، رقم الهاتف، القسم..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-xs text-right focus:border-indigo-500 focus:bg-white outline-none transition-all"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              <select
                value={accountLinkFilter}
                onChange={e => setAccountLinkFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">جميع حالات الربط بالمستخدمين</option>
                <option value="linked">🔗 مرتبط بحساب مستخدم نظام</option>
                <option value="unlinked">غير مرتبط بحساب مستخدم</option>
                <option value="collector_unlinked">⚠️ محصلين غير مرتبطين (تتطلب ربط)</option>
              </select>

              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">جميع التخصصات</option>
                <option value="engineer">مهندسين</option>
                <option value="technician">فنيين</option>
                <option value="admin">إداريين</option>
                <option value="collector">محصلين</option>
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">جميع الحالات</option>
                <option value="active">نشط فقط</option>
                <option value="inactive">موقوف</option>
              </select>

              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  بطاقات
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  جدول
                </button>
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredEmployees.map(emp => {
                const bal = employeeBalances[emp.id] || { remainingAdvances: 0 };
                const netMonthly = emp.salary + (emp.allowances || 0) - (emp.deductions || 0);

                return (
                  <div 
                    key={emp.id} 
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-indigo-300 transition-all flex flex-col justify-between relative group"
                  >
                    <div className={`absolute top-0 right-0 left-0 h-1.5 rounded-t-2xl ${
                      emp.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'
                    }`} />

                    <div>
                      {/* Top Row Header */}
                      <div className="flex justify-between items-start mb-3 pt-1">
                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-mono font-bold text-[11px] rounded-lg border border-indigo-100">
                          {emp.code || `EMP-${emp.id.slice(-3)}`}
                        </span>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          emp.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {emp.status === 'active' ? 'نشط' : 'موقوف'}
                        </span>
                      </div>

                      <h3 className="font-black text-slate-900 text-base mb-1">{emp.name}</h3>
                      <p className="text-xs font-bold text-slate-500 mb-3 flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{getRoleLabel(emp.role)}</span>
                        {emp.department && <span className="text-slate-400 font-normal">({emp.department})</span>}
                      </p>

                      {/* USER ACCOUNT LINK STATUS CARD */}
                      {(() => {
                        const linkedUser = getLinkedUserForEmployee(emp);
                        if (linkedUser) {
                          return (
                            <div className="mb-3 p-2.5 bg-indigo-50/70 border border-indigo-200/80 rounded-xl flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                                  <UserCheck className="w-4 h-4" />
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-slate-500 font-medium">حساب الدخول:</span>
                                    <span className="font-mono font-bold text-indigo-900 text-xs">@{linkedUser.username}</span>
                                  </div>
                                  <span className="text-[10px] text-indigo-700 font-bold block">
                                    {linkedUser.role === 'collector' ? 'محصل ميداني معتمد' : linkedUser.role === 'admin' ? 'مدير نظام' : linkedUser.role}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => setQuickLinkTarget(emp)}
                                className="p-1.5 text-indigo-700 hover:bg-indigo-100 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                                title="إدارة ربط الحساب"
                              >
                                <SlidersHorizontal className="w-3 h-3" />
                                <span>تعديل</span>
                              </button>
                            </div>
                          );
                        } else if (emp.role === 'collector') {
                          return (
                            <div className="mb-3 p-2.5 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                                  <AlertTriangle className="w-4 h-4" />
                                </div>
                                <div className="text-right">
                                  <span className="text-[11px] font-bold text-amber-900 block">غير مرتبط بحساب محصل</span>
                                  <span className="text-[10px] text-amber-700">لتفادي التكرار بالتحصيل</span>
                                </div>
                              </div>
                              <button
                                onClick={() => setQuickLinkTarget(emp)}
                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-all shadow-xs flex items-center gap-1"
                              >
                                <Link2 className="w-3 h-3" />
                                <span>ربط الآن</span>
                              </button>
                            </div>
                          );
                        } else {
                          return (
                            <div className="mb-3 p-2 bg-slate-50 border border-dashed border-slate-200 rounded-xl flex items-center justify-between text-xs">
                              <span className="text-[11px] text-slate-500">لا يوجد حساب مستخدم مرتبط</span>
                              <button
                                onClick={() => setQuickLinkTarget(emp)}
                                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>ربط حساب</span>
                              </button>
                            </div>
                          );
                        }
                      })()}

                      {/* Financial info box */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2 mb-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-medium">الراتب الأساسي:</span>
                          <span className="font-mono font-bold text-slate-800">{emp.salary.toLocaleString('ar-SA')} {settings.currency}</span>
                        </div>

                        {emp.allowances ? (
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-medium">البدلات الثابتة:</span>
                            <span className="font-mono font-bold text-emerald-600">+{emp.allowances.toLocaleString('ar-SA')} {settings.currency}</span>
                          </div>
                        ) : null}

                        <div className="flex justify-between items-center text-xs border-t border-slate-200/60 pt-1.5">
                          <span className="text-slate-700 font-bold">الاستحقاق الشهري:</span>
                          <span className="font-mono font-black text-slate-900">{netMonthly.toLocaleString('ar-SA')} {settings.currency}</span>
                        </div>

                        {bal.remainingAdvances > 0 && (
                          <div className="flex justify-between items-center text-xs bg-amber-100/60 p-1.5 rounded-lg text-amber-900 font-bold">
                            <span>السُلف المتبقية:</span>
                            <span className="font-mono">{bal.remainingAdvances.toLocaleString('ar-SA')} {settings.currency}</span>
                          </div>
                        )}
                      </div>

                      {/* Contact & Date */}
                      <div className="space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span dir="ltr" className="font-mono font-bold text-slate-700">{emp.phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>تاريخ التعيين: {emp.joinDate}</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between">
                      <button
                        onClick={() => setShowProfileModal(emp)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>عرض الملف والبيانات</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setQuickLinkTarget(emp)}
                          className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          title="إدارة ربط حساب المستخدم"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            setTxForm({ employeeId: emp.id, type: 'advance', date: new Date().toISOString().split('T')[0], amount: 0, month: selectedMonth });
                            setShowAddTx(true);
                          }}
                          className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          title="صرف سلفة"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(emp)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title="تعديل البيانات"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteEmployee(emp.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="حذف الموظف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">الكود</th>
                      <th className="px-4 py-3">اسم الموظف</th>
                      <th className="px-4 py-3">المسمى الوظيفي</th>
                      <th className="px-4 py-3">حساب النظام (المحصل)</th>
                      <th className="px-4 py-3">القسم</th>
                      <th className="px-4 py-3">رقم الهاتف</th>
                      <th className="px-4 py-3">الراتب الأساسي</th>
                      <th className="px-4 py-3">البدلات</th>
                      <th className="px-4 py-3">رصيد السُلف</th>
                      <th className="px-4 py-3">الحالة</th>
                      <th className="px-4 py-3 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEmployees.map(emp => {
                      const bal = employeeBalances[emp.id] || { remainingAdvances: 0 };
                      const linkedUser = getLinkedUserForEmployee(emp);
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-indigo-700">{emp.code || '-'}</td>
                          <td className="px-4 py-3 font-bold text-slate-900">{emp.name}</td>
                          <td className="px-4 py-3 text-slate-600">{getRoleLabel(emp.role)}</td>
                          <td className="px-4 py-3">
                            {linkedUser ? (
                              <button
                                onClick={() => setQuickLinkTarget(emp)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-lg text-[11px] font-mono font-bold transition-colors cursor-pointer border border-indigo-200"
                                title="انقر لتعديل حساب الدخول"
                              >
                                <UserCheck className="w-3 h-3 text-indigo-600" />
                                <span>@{linkedUser.username}</span>
                              </button>
                            ) : emp.role === 'collector' ? (
                              <button
                                onClick={() => setQuickLinkTarget(emp)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-md text-[10px] font-bold transition-colors cursor-pointer border border-amber-200"
                              >
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>ربط بحساب محصل</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => setQuickLinkTarget(emp)}
                                className="text-slate-400 hover:text-indigo-600 text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <Link2 className="w-3 h-3" />
                                <span>ربط حساب</span>
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{emp.department || '-'}</td>
                          <td className="px-4 py-3 font-mono dir-ltr">{emp.phone}</td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-900">{emp.salary.toLocaleString('ar-SA')}</td>
                          <td className="px-4 py-3 font-mono text-emerald-600">{(emp.allowances || 0).toLocaleString('ar-SA')}</td>
                          <td className="px-4 py-3 font-mono font-bold text-amber-600">{bal.remainingAdvances.toLocaleString('ar-SA')}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${emp.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                              {emp.status === 'active' ? 'نشط' : 'موقوف'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setQuickLinkTarget(emp)}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg font-bold"
                                title="ربط / تعديل حساب المستخدم"
                              >
                                <Link2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setShowProfileModal(emp)}
                                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-bold"
                                title="عرض الملف"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(emp)}
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg"
                                title="تعديل الموظف"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </motion.div>
      )}

      {/* PAYROLL TAB CONTENT */}
      {activeTab === 'payroll' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">مسير المستحقات والرواتب الشهرية</h3>
              <p className="text-xs text-slate-500">حساب المسحوبات، خصم السلف تلقائياً، وصرف الرواتب المستحقة للموظفين</p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <span className="text-xs font-bold text-slate-600">الشهر المستهدف:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="bg-transparent font-mono text-xs font-bold text-slate-900 outline-none"
                />
              </div>

              <button
                onClick={() => printData(`مسير رواتب شهر ${selectedMonth}`, employees.filter(e => e.status === 'active').map(e => {
                  const bal = employeeBalances[e.id]?.remainingAdvances || 0;
                  const autoDed = Math.min(bal, Math.round(e.salary * 0.5));
                  const net = e.salary + (e.allowances || 0) - (e.deductions || 0) - autoDed;
                  const isPaid = employeeTxs.some(tx => tx.employeeId === e.id && tx.type === 'salary' && (tx.month === selectedMonth || tx.date.startsWith(selectedMonth)));
                  return {
                    code: e.code || '-',
                    name: e.name,
                    role: getRoleLabel(e.role),
                    salary: e.salary,
                    allowances: e.allowances || 0,
                    advanceDeduct: autoDed,
                    netPayable: net,
                    status: isPaid ? 'تم الصرف' : 'مستحق الصرف'
                  };
                }), [
                  { key: 'code', label: 'الكود' },
                  { key: 'name', label: 'الموظف' },
                  { key: 'role', label: 'الوظيفة' },
                  { key: 'salary', label: 'الأساسي' },
                  { key: 'allowances', label: 'البدلات' },
                  { key: 'advanceDeduct', label: 'خصم السلفة' },
                  { key: 'netPayable', label: 'الصافي' },
                  { key: 'status', label: 'الحالة' }
                ])}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة المسير</span>
              </button>
            </div>
          </div>

          {/* Payroll Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5">الكود</th>
                    <th className="px-4 py-3.5">الموظف</th>
                    <th className="px-4 py-3.5">المنصب</th>
                    <th className="px-4 py-3.5">الراتب الأساسي</th>
                    <th className="px-4 py-3.5">البدلات (+)</th>
                    <th className="px-4 py-3.5">الخصومات (-)</th>
                    <th className="px-4 py-3.5">رصيد السُلف</th>
                    <th className="px-4 py-3.5">خصم السُلفة (-)</th>
                    <th className="px-4 py-3.5">الصافي المستحق</th>
                    <th className="px-4 py-3.5">حالة الصرف</th>
                    <th className="px-4 py-3.5 text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.filter(e => e.status === 'active').map(emp => {
                    const bal = employeeBalances[emp.id]?.remainingAdvances || 0;
                    const { txAllowances, txDeductions } = getMonthlyEmployeeTxsSummary(emp.id, selectedMonth);
                    const totalAllowances = (emp.allowances || 0) + txAllowances;
                    const totalDeductions = (emp.deductions || 0) + txDeductions;
                    const autoDed = Math.min(bal, Math.round(emp.salary * 0.5));
                    const netPay = Math.max(0, emp.salary + totalAllowances - totalDeductions - autoDed);
                    
                    const paidTx = employeeTxs.find(tx => 
                      tx.employeeId === emp.id && 
                      tx.type === 'salary' && 
                      (tx.month === selectedMonth || tx.date.startsWith(selectedMonth))
                    );

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3.5 font-mono font-bold text-indigo-700">{emp.code || '-'}</td>
                        <td className="px-4 py-3.5 font-bold text-slate-900">{emp.name}</td>
                        <td className="px-4 py-3.5 text-slate-600">{getRoleLabel(emp.role)}</td>
                        <td className="px-4 py-3.5 font-mono text-slate-800">{emp.salary.toLocaleString('ar-SA')}</td>
                        <td className="px-4 py-3.5 font-mono text-emerald-600">+{totalAllowances.toLocaleString('ar-SA')}</td>
                        <td className="px-4 py-3.5 font-mono text-rose-500">-{totalDeductions.toLocaleString('ar-SA')}</td>
                        <td className="px-4 py-3.5 font-mono text-amber-600 font-bold">{bal.toLocaleString('ar-SA')}</td>
                        <td className="px-4 py-3.5 font-mono text-rose-600">-{autoDed.toLocaleString('ar-SA')}</td>
                        <td className="px-4 py-3.5 font-mono font-black text-slate-900 text-sm">{netPay.toLocaleString('ar-SA')} {settings.currency}</td>
                        <td className="px-4 py-3.5">
                          {paidTx ? (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-md font-bold text-[10px] flex items-center gap-1 w-fit">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>تم الصرف</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-md font-bold text-[10px] flex items-center gap-1 w-fit">
                              <AlertTriangle className="w-3 h-3" />
                              <span>معلق ومستحق</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {paidTx ? (
                            <button
                              onClick={() => setShowVoucherModal(paidTx)}
                              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1 mx-auto"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>سند الصرف</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => openSalaryDisburseModal(emp)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition-all shadow-sm active:scale-95 cursor-pointer flex items-center justify-center gap-1 mx-auto"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>اعتماد الصرف</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </motion.div>
      )}

      {/* ADVANCES & TRANSACTIONS TAB */}
      {activeTab === 'advances' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base">سجل السُلف والبدلات والخصومات</h3>
              <p className="text-xs text-slate-500">متابعة كافة أذونات الصرف والسداد والمكافآت المالية للكادر</p>
            </div>

            <button
              onClick={() => {
                setTxForm({ employeeId: '', type: 'advance', amount: 0, date: new Date().toISOString().split('T')[0], month: selectedMonth });
                setShowAddTx(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>تسجيل حركة مالية جديدة</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">رقم السند</th>
                    <th className="px-4 py-3">التاريخ</th>
                    <th className="px-4 py-3">اسم الموظف</th>
                    <th className="px-4 py-3">نوع الحركة</th>
                    <th className="px-4 py-3">المبلغ</th>
                    <th className="px-4 py-3">البيان والملاحظات</th>
                    <th className="px-4 py-3">المسئول</th>
                    <th className="px-4 py-3 text-center">طباعة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employeeTxs.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-indigo-700">{tx.voucherNo || '-'}</td>
                      <td className="px-4 py-3 font-mono text-slate-500">{tx.date}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">{tx.employeeName}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tx.type === 'salary' ? 'bg-emerald-100 text-emerald-800' :
                          tx.type === 'advance' ? 'bg-amber-100 text-amber-800' :
                          tx.type === 'allowance' ? 'bg-sky-100 text-sky-800' :
                          tx.type === 'repayment' ? 'bg-teal-100 text-teal-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {tx.type === 'salary' ? 'راتب' : tx.type === 'advance' ? 'سلفة' : tx.type === 'allowance' ? 'مكافأة/بدل' : tx.type === 'repayment' ? 'سداد سلفة' : 'خصم'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{tx.amount.toLocaleString('ar-SA')} {settings.currency}</td>
                      <td className="px-4 py-3 text-slate-600">{tx.description}</td>
                      <td className="px-4 py-3 text-slate-500 text-[11px]">{tx.recordedBy}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setShowVoucherModal(tx)}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* ADD / EDIT EMPLOYEE MODAL */}
      <AnimatePresence>
        {showAddEmployee && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl"
              dir="rtl"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-black text-slate-800 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-indigo-600" />
                  <span>{editingEmployee ? 'تعديل بيانات موظف' : 'إضافة موظف جديد'}</span>
                </h3>
                <button onClick={() => setShowAddEmployee(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEmployee} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">الكود الوظيفي</label>
                    <input
                      type="text"
                      value={employeeForm.code || ''}
                      onChange={e => setEmployeeForm({ ...employeeForm, code: e.target.value })}
                      placeholder="EMP-101"
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-right font-mono outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">اسم الموظف الثلاثي/الرباعي *</label>
                    <input
                      type="text"
                      required
                      value={employeeForm.name || ''}
                      onChange={e => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-right outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف *</label>
                    <input
                      type="tel"
                      required
                      value={employeeForm.phone || ''}
                      onChange={e => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-left font-mono outline-none focus:border-indigo-500"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">المسمى الوظيفي</label>
                    <select
                      value={employeeForm.role || 'technician'}
                      onChange={e => setEmployeeForm({ ...employeeForm, role: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-right outline-none focus:border-indigo-500"
                    >
                      <option value="engineer">مهندس كهربائي</option>
                      <option value="technician">فني صيانة وشبكات</option>
                      <option value="admin">إداري / مدير فرع</option>
                      <option value="accountant">محاسب مالي</option>
                      <option value="collector">محصل ميداني</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">القسم / الفرع</label>
                    <input
                      type="text"
                      value={employeeForm.department || ''}
                      onChange={e => setEmployeeForm({ ...employeeForm, department: e.target.value })}
                      placeholder="مثال: الهندسة والتشغيل"
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-right outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهوية الوطنية / الإقامة</label>
                    <input
                      type="text"
                      value={employeeForm.nationalId || ''}
                      onChange={e => setEmployeeForm({ ...employeeForm, nationalId: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-right font-mono outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">الراتب الأساسي ({settings.currency}) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={employeeForm.salary ?? ''}
                      onChange={e => setEmployeeForm({ ...employeeForm, salary: Number(e.target.value) })}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-left font-mono font-bold outline-none focus:border-indigo-500"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">البدلات الشهري الثابتة</label>
                    <input
                      type="number"
                      min="0"
                      value={employeeForm.allowances ?? 0}
                      onChange={e => setEmployeeForm({ ...employeeForm, allowances: Number(e.target.value) })}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-left font-mono outline-none focus:border-indigo-500"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">حالة الموظف</label>
                    <select
                      value={employeeForm.status || 'active'}
                      onChange={e => setEmployeeForm({ ...employeeForm, status: e.target.value as any })}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-right outline-none focus:border-indigo-500"
                    >
                      <option value="active">نشط ومستمر</option>
                      <option value="inactive">موقوف / مجاز</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ المباشرة</label>
                    <input
                      type="date"
                      value={employeeForm.joinDate || ''}
                      onChange={e => setEmployeeForm({ ...employeeForm, joinDate: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-right outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الحساب البنكي / المحفظة الإلكترونية</label>
                  <input
                    type="text"
                    value={employeeForm.bankAccount || ''}
                    onChange={e => setEmployeeForm({ ...employeeForm, bankAccount: e.target.value })}
                    placeholder="مثال: حساب الكريمي / محفظة جيب..."
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-right outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">عنوان السكن والبيانات الإضافية</label>
                  <textarea
                    rows={2}
                    value={employeeForm.address || ''}
                    onChange={e => setEmployeeForm({ ...employeeForm, address: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-right outline-none focus:border-indigo-500"
                  />
                </div>

                {/* USER ACCOUNT LINKING / LOGIN SECTION */}
                <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                        <Link2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">ربط بحساب مستخدم نظام / محصل</h4>
                        <p className="text-[11px] text-slate-500">لتمكين الموظف من تسجيل الدخول والتحصيل دون تكرار اسمه</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-indigo-200 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setFormUserLinkMode('none')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          formUserLinkMode === 'none' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-indigo-600'
                        }`}
                      >
                        بدون ربط
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormUserLinkMode('existing')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          formUserLinkMode === 'existing' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-indigo-600'
                        }`}
                      >
                        حساب قائم
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormUserLinkMode('new');
                          if (!formNewUsername && employeeForm.name) {
                            const cleanName = employeeForm.name.trim().split(' ')[0].toLowerCase();
                            setFormNewUsername(`emp_${cleanName}_${Math.floor(100 + Math.random() * 900)}`);
                          }
                          if (!formNewPassword) setFormNewPassword('123456');
                        }}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          formUserLinkMode === 'new' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-indigo-600'
                        }`}
                      >
                        إنشاء حساب جديد
                      </button>
                    </div>
                  </div>

                  {formUserLinkMode === 'existing' && (
                    <div className="pt-2 border-t border-indigo-100">
                      <label className="block text-xs font-bold text-slate-700 mb-1">اختر حساب المستخدم المراد ربطه بالموظف:</label>
                      <select
                        value={formSelectedUserId}
                        onChange={e => setFormSelectedUserId(e.target.value)}
                        className="w-full border border-indigo-200 rounded-xl p-2.5 text-xs text-right bg-white outline-none focus:border-indigo-600"
                      >
                        <option value="">-- اختر حساب مستخدم من القائمة --</option>
                        {users.map(u => {
                          const isAlreadyLinked = employees.some(e => e.userId === u.id && e.id !== editingEmployee?.id);
                          return (
                            <option key={u.id} value={u.id} disabled={isAlreadyLinked}>
                              @{u.username} ({u.role === 'collector' ? 'محصل' : u.role === 'admin' ? 'مدير' : u.role}) - {u.name} {isAlreadyLinked ? '(مرتبط بموظف آخر)' : ''}
                            </option>
                          );
                        })}
                      </select>
                      <p className="text-[11px] text-indigo-700 mt-1">
                        سيتم ربط تحصيلات هذا المستخدم تلقائياً بهذا الموظف في كافة تقارير التحصيل والعمولات.
                      </p>
                    </div>
                  )}

                  {formUserLinkMode === 'new' && (
                    <div className="pt-2 border-t border-indigo-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">اسم المستخدم (لتسجيل الدخول) *</label>
                        <input
                          type="text"
                          required={formUserLinkMode === 'new'}
                          value={formNewUsername}
                          onChange={e => setFormNewUsername(e.target.value)}
                          placeholder="مثال: coll_ahmed"
                          className="w-full border border-indigo-200 rounded-xl p-2 text-xs text-left font-mono bg-white outline-none focus:border-indigo-600"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور *</label>
                        <input
                          type="text"
                          required={formUserLinkMode === 'new'}
                          value={formNewPassword}
                          onChange={e => setFormNewPassword(e.target.value)}
                          placeholder="123456"
                          className="w-full border border-indigo-200 rounded-xl p-2 text-xs text-left font-mono bg-white outline-none focus:border-indigo-600"
                          dir="ltr"
                        />
                      </div>
                      <div className="col-span-full">
                        <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 block">
                          ✓ سيتم إنشاء حساب مستخدم بصلاحية ({employeeForm.role === 'collector' ? 'محصل ميداني' : 'موظف'}) وربطه بهذا الموظف تلقائياً.
                        </span>
                      </div>
                    </div>
                  )}

                  {formUserLinkMode === 'none' && (
                    <p className="text-[11px] text-slate-500">
                      لن يتم ربط هذا الموظف بحساب مستخدم نظام حالياً. يمكنك ربطه لاحقاً في أي وقت.
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddEmployee(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    إلغاء
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md"
                  >
                    {editingEmployee ? 'تحديث البيانات' : 'حفظ الموظف'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD TRANSACTION MODAL (Advance / Allowance / Salary) */}
      <AnimatePresence>
        {showAddTx && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
              dir="rtl"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-black text-slate-800 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-600" />
                  <span>تسجيل حركة مالية للموظف</span>
                </h3>
                <button onClick={() => setShowAddTx(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveTx} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الموظف المعني *</label>
                  <select
                    required
                    value={txForm.employeeId || ''}
                    onChange={e => setTxForm({ ...txForm, employeeId: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-right outline-none focus:border-emerald-500"
                  >
                    <option value="" disabled>اختر الموظف...</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.name} ({getRoleLabel(e.role)})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">نوع الحركة *</label>
                    <select
                      value={txForm.type || 'advance'}
                      onChange={e => setTxForm({ ...txForm, type: e.target.value as any })}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-right outline-none focus:border-emerald-500"
                    >
                      <option value="advance">سُلفة (مسحوبات)</option>
                      <option value="salary">راتب (اعتماد)</option>
                      <option value="allowance">مكافأة / بدل</option>
                      <option value="deduction">خصم / جزاء</option>
                      <option value="repayment">سداد سُلفة كاش</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">الشهر المستهدف</label>
                    <input
                      type="month"
                      value={txForm.month || selectedMonth}
                      onChange={e => setTxForm({ ...txForm, month: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl p-2 text-xs font-mono outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ ({settings.currency}) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={txForm.amount || ''}
                    onChange={e => setTxForm({ ...txForm, amount: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-left font-mono font-black text-slate-900 outline-none focus:border-emerald-500"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">البيان والتوضيح</label>
                  <input
                    type="text"
                    value={txForm.description || ''}
                    onChange={e => setTxForm({ ...txForm, description: e.target.value })}
                    placeholder="مثال: سلفة طارئة، بدل إضافي، سداد نقدي..."
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-right outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddTx(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    إلغاء
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md"
                  >
                    تسجيل الحركة
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* INTERACTIVE SALARY DISBURSEMENT MODAL */}
      <AnimatePresence>
        {salaryModalTarget && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl"
              dir="rtl"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-emerald-700 text-white">
                <h3 className="font-black text-base flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-200" />
                  <span>اعتماد وصرف الراتب الشهري وتصفية السُلف</span>
                </h3>
                <button onClick={() => setSalaryModalTarget(null)} className="text-emerald-100 hover:text-white transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Employee Summary Card */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-[11px]">
                      {salaryModalTarget.emp.code || 'EMP'}
                    </span>
                    <h4 className="font-black text-slate-900 text-sm">{salaryModalTarget.emp.name}</h4>
                  </div>
                  <p className="text-slate-500 mt-0.5">{getRoleLabel(salaryModalTarget.emp.role)} - {salaryModalTarget.emp.department}</p>
                </div>

                <div className="text-left bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs">
                  <span className="text-[10px] text-slate-500 block font-medium">رصيد السُلف القائم الحالي</span>
                  <span className="font-mono font-black text-amber-600 text-sm">
                    {salaryModalTarget.currentAdvBalance.toLocaleString('ar-SA')} {settings.currency}
                  </span>
                </div>
              </div>

              <form onSubmit={handleConfirmDisburseSalary} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                
                {/* Form fields grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">الراتب الأساسي ({settings.currency})</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={salaryForm.basicSalary}
                      onChange={e => setSalaryForm({ ...salaryForm, basicSalary: Number(e.target.value) })}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-left font-mono font-bold outline-none focus:border-emerald-500 bg-slate-50"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">إجمالي البدلات والمكافآت (+)</label>
                    <input
                      type="number"
                      min="0"
                      value={salaryForm.allowances}
                      onChange={e => setSalaryForm({ ...salaryForm, allowances: Number(e.target.value) })}
                      className="w-full border border-emerald-300 rounded-xl p-2.5 text-xs text-left font-mono font-bold text-emerald-700 outline-none focus:border-emerald-600 bg-emerald-50/50"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">إجمالي الخصومات والجزاءات (-)</label>
                    <input
                      type="number"
                      min="0"
                      value={salaryForm.deductions}
                      onChange={e => setSalaryForm({ ...salaryForm, deductions: Number(e.target.value) })}
                      className="w-full border border-rose-200 rounded-xl p-2.5 text-xs text-left font-mono font-bold text-rose-700 outline-none focus:border-rose-500 bg-rose-50/30"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">خصم اقتطاع السُلفة (-)</label>
                    <input
                      type="number"
                      min="0"
                      max={salaryModalTarget.currentAdvBalance}
                      value={salaryForm.advanceDeduct}
                      onChange={e => setSalaryForm({ ...salaryForm, advanceDeduct: Number(e.target.value) })}
                      className="w-full border border-amber-300 rounded-xl p-2.5 text-xs text-left font-mono font-bold text-amber-800 outline-none focus:border-amber-500 bg-amber-50/50"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Quick Advance Deduct Percentage Buttons */}
                {salaryModalTarget.currentAdvBalance > 0 && (
                  <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-xl space-y-1.5">
                    <div className="flex justify-between items-center text-[11px] text-amber-900 font-bold">
                      <span>اختصارات السداد المباشر من السُلفة:</span>
                      <span className="font-mono">{salaryForm.advanceDeduct.toLocaleString('ar-SA')} / {salaryModalTarget.currentAdvBalance.toLocaleString('ar-SA')} {settings.currency}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSalaryForm({ ...salaryForm, advanceDeduct: 0 })}
                        className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          salaryForm.advanceDeduct === 0 ? 'bg-amber-600 text-white border-amber-600 shadow-xs' : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        بدون خصم (0)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSalaryForm({ ...salaryForm, advanceDeduct: Math.min(salaryModalTarget.currentAdvBalance, Math.round(salaryForm.basicSalary * 0.25)) })}
                        className="flex-1 py-1.5 bg-white hover:bg-amber-100 text-amber-900 rounded-lg text-[11px] font-bold border border-amber-200 transition-all cursor-pointer"
                      >
                        خصم 25% من الراتب
                      </button>
                      <button
                        type="button"
                        onClick={() => setSalaryForm({ ...salaryForm, advanceDeduct: Math.min(salaryModalTarget.currentAdvBalance, Math.round(salaryForm.basicSalary * 0.50)) })}
                        className="flex-1 py-1.5 bg-white hover:bg-amber-100 text-amber-900 rounded-lg text-[11px] font-bold border border-amber-200 transition-all cursor-pointer"
                      >
                        خصم 50% من الراتب
                      </button>
                      <button
                        type="button"
                        onClick={() => setSalaryForm({ ...salaryForm, advanceDeduct: salaryModalTarget.currentAdvBalance })}
                        className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          salaryForm.advanceDeduct === salaryModalTarget.currentAdvBalance ? 'bg-amber-600 text-white border-amber-600 shadow-xs' : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        تصفية السُلفة بالكامل
                      </button>
                    </div>
                  </div>
                )}

                {/* Additional inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">وسيلة / طريقة الصرف</label>
                    <select
                      value={salaryForm.paymentMethod}
                      onChange={e => setSalaryForm({ ...salaryForm, paymentMethod: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-right outline-none focus:border-emerald-500"
                    >
                      <option value="نقداً - من الخزينة">نقداً - من الخزينة الرئيسية</option>
                      <option value="تحويل بنكي - الكريمي">تحويل بنكي - الكريمي</option>
                      <option value="محفظة جيب كاش">محفظة جيب كاش</option>
                      <option value="شيك بنكي">شيك بنكي رسمى</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">البيان والملاحظات</label>
                    <input
                      type="text"
                      value={salaryForm.notes}
                      onChange={e => setSalaryForm({ ...salaryForm, notes: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-xs text-right outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* REALTIME INTERACTIVE RESULT CALCULATOR BOX */}
                <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-inner space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-300">
                    <span>المعادلة المالية المباشرة:</span>
                    <span className="font-mono text-[11px] text-slate-400">
                      ({salaryForm.basicSalary.toLocaleString()}) + ({salaryForm.allowances.toLocaleString()}) - ({salaryForm.deductions.toLocaleString()}) - ({salaryForm.advanceDeduct.toLocaleString()})
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                    <span className="font-black text-sm text-emerald-400">صافي الراتب النقدى المستحق للصرف:</span>
                    <div className="text-left font-mono">
                      <span className="text-2xl font-black text-emerald-400">
                        {Math.max(0, salaryForm.basicSalary + salaryForm.allowances - salaryForm.deductions - salaryForm.advanceDeduct).toLocaleString('ar-SA')}
                      </span>
                      <span className="text-xs text-emerald-200 font-sans mr-1.5">{settings.currency}</span>
                    </div>
                  </div>

                  {salaryForm.advanceDeduct > 0 && (
                    <div className="text-[10px] text-amber-300 bg-amber-950/60 p-2 rounded-lg border border-amber-800/60 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>سوف يتم تسجيل سند تسوية خصم سلفة بقيمة ({salaryForm.advanceDeduct.toLocaleString()} {settings.currency}) وتحديث رصيد الموظف فوراً.</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSalaryModalTarget(null)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    إلغاء
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تأكيد واعتماد صرف الراتب والتسوية</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PRINTABLE VOUCHER SLIP MODAL */}
      <AnimatePresence>
        {showVoucherModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl relative space-y-4"
              dir="rtl"
            >
              <button 
                onClick={() => setShowVoucherModal(null)} 
                className="absolute left-4 top-4 text-slate-400 hover:text-slate-600 print:hidden"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="text-center border-b border-slate-200 pb-3">
                <h3 className="text-lg font-black text-slate-900">{settings.stationName || 'محطة الطاقة الكهربائية'}</h3>
                <p className="text-xs text-slate-500">سند صرف / استلام موارد بشرية</p>
                <span className="inline-block mt-2 font-mono font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full text-xs">
                  {showVoucherModal.voucherNo || 'VOUCHER'}
                </span>
              </div>

              {/* Content Details */}
              <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">اسم الموظف:</span>
                  <span className="font-bold text-slate-900">{showVoucherModal.employeeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">نوع المستند:</span>
                  <span className="font-bold text-indigo-700">
                    {showVoucherModal.type === 'salary' ? 'سند صرف راتب شهري' : 'سند صرف سُلفة / بدل'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">المبلغ المدفوع:</span>
                  <span className="font-mono font-black text-slate-900 text-sm">{showVoucherModal.amount.toLocaleString('ar-SA')} {settings.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">تاريخ الصرف:</span>
                  <span className="font-mono">{showVoucherModal.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">البيان:</span>
                  <span className="font-medium text-slate-800">{showVoucherModal.description || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">منفذ العملية:</span>
                  <span className="font-medium">{showVoucherModal.recordedBy}</span>
                </div>
              </div>

              {/* Signature area */}
              <div className="grid grid-cols-2 gap-4 pt-6 text-center text-[11px] text-slate-600">
                <div>
                  <p className="font-bold mb-6">توقيع الموظف المستلم</p>
                  <p className="border-t border-dashed border-slate-300 pt-1">................................</p>
                </div>
                <div>
                  <p className="font-bold mb-6">توقيع المحاسب والاعتماد</p>
                  <p className="border-t border-dashed border-slate-300 pt-1">................................</p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2 print:hidden">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة السند</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* VIEW PROFILE MODAL */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl"
              dir="rtl"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-black text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <span>الملف الوظيفي الشامل: {showProfileModal.name}</span>
                </h3>
                <button onClick={() => setShowProfileModal(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                {/* Employee card top */}
                <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 rounded-2xl flex justify-between items-center">
                  <div>
                    <span className="px-2.5 py-1 bg-white/10 text-indigo-200 rounded-lg text-xs font-mono font-bold">
                      {showProfileModal.code || 'EMP'}
                    </span>
                    <h2 className="text-xl font-black mt-2">{showProfileModal.name}</h2>
                    <p className="text-xs text-indigo-200 mt-0.5">{getRoleLabel(showProfileModal.role)} - {showProfileModal.department || 'عام'}</p>
                  </div>
                  <div className="text-left font-mono">
                    <p className="text-xs text-slate-400">الراتب المستحق</p>
                    <p className="text-xl font-black text-emerald-400">
                      {(showProfileModal.salary + (showProfileModal.allowances || 0)).toLocaleString('ar-SA')} {settings.currency}
                    </p>
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block">الهاتف:</span>
                    <span className="font-bold text-slate-800 dir-ltr">{showProfileModal.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">رقم الهوية:</span>
                    <span className="font-bold text-slate-800 font-mono">{showProfileModal.nationalId || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">تاريخ المباشرة:</span>
                    <span className="font-bold text-slate-800 font-mono">{showProfileModal.joinDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">الحساب البنكي:</span>
                    <span className="font-bold text-slate-800">{showProfileModal.bankAccount || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">متبقي السُلف:</span>
                    <span className="font-bold text-amber-600 font-mono">
                      {(employeeBalances[showProfileModal.id]?.remainingAdvances || 0).toLocaleString('ar-SA')} {settings.currency}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">حالة الحساب:</span>
                    <span className="font-bold text-emerald-600">{showProfileModal.status === 'active' ? 'نشط' : 'موقوف'}</span>
                  </div>
                </div>

                {/* Linked User Account Info in Profile */}
                {(() => {
                  const linkedUser = getLinkedUserForEmployee(showProfileModal);
                  return (
                    <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                          <UserCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-700">حساب تسجيل الدخول المرتبط:</span>
                            {linkedUser ? (
                              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-900 font-mono font-bold rounded text-xs">
                                @{linkedUser.username}
                              </span>
                            ) : (
                              <span className="text-xs text-rose-600 font-bold">غير مرتبط بحساب مستخدم</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {linkedUser ? `الصلاحية: ${linkedUser.role === 'collector' ? 'محصل ميداني' : linkedUser.role} | الاسم بالنظام: ${linkedUser.name}` : 'اربط هذا الموظف بحساب مستخدم لتفادي تكرار الاسم في كشوفات وسجلات التحصيل'}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          const emp = showProfileModal;
                          setShowProfileModal(null);
                          setQuickLinkTarget(emp);
                        }}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        <span>{linkedUser ? 'تعديل أو فك الربط' : 'ربط بحساب الآن'}</span>
                      </button>
                    </div>
                  );
                })()}

                {/* Individual transaction history */}
                <div>
                  <h4 className="font-bold text-slate-900 text-sm mb-3">سجل السلف والحركات المالية للموظف</h4>
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-right">
                      <thead className="bg-slate-50 text-slate-600 font-bold">
                        <tr>
                          <th className="p-2.5">التاريخ</th>
                          <th className="p-2.5">النوع</th>
                          <th className="p-2.5">المبلغ</th>
                          <th className="p-2.5">البيان</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {employeeTxs.filter(tx => tx.employeeId === showProfileModal.id).map(tx => (
                          <tr key={tx.id}>
                            <td className="p-2.5 font-mono text-slate-500">{tx.date}</td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                tx.type === 'salary' ? 'bg-emerald-100 text-emerald-800' :
                                tx.type === 'advance' ? 'bg-amber-100 text-amber-800' :
                                tx.type === 'allowance' ? 'bg-sky-100 text-sky-800' :
                                tx.type === 'deduction' ? 'bg-rose-100 text-rose-800' :
                                'bg-purple-100 text-purple-800'
                              }`}>
                                {tx.type === 'salary' ? 'صرف راتب' :
                                 tx.type === 'advance' ? 'سلفة مالية' :
                                 tx.type === 'allowance' ? 'بدل / مكافأة' :
                                 tx.type === 'deduction' ? 'خصم / جزاء' : 'سداد سلفة'}
                              </span>
                            </td>
                            <td className="p-2.5 font-mono font-bold text-slate-900">{tx.amount.toLocaleString('ar-SA')}</td>
                            <td className="p-2.5 text-slate-600">{tx.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QUICK USER ACCOUNT LINKING MODAL */}
      <AnimatePresence>
        {quickLinkTarget && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
              dir="rtl"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-black text-slate-800 flex items-center gap-2 text-sm">
                  <Link2 className="w-5 h-5 text-indigo-600" />
                  <span>ربط حساب المستخدم بالنظام: {quickLinkTarget.name}</span>
                </h3>
                <button onClick={() => setQuickLinkTarget(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Employee Info Header */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{quickLinkTarget.name}</span>
                    <span className="text-slate-500 mr-2">({getRoleLabel(quickLinkTarget.role)})</span>
                  </div>
                  <span className="font-mono text-indigo-700 font-bold">{quickLinkTarget.code || `EMP-${quickLinkTarget.id.slice(-3)}`}</span>
                </div>

                {/* Status Notice */}
                {(() => {
                  const currentLinkedUser = getLinkedUserForEmployee(quickLinkTarget);
                  if (currentLinkedUser) {
                    return (
                      <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between">
                        <div className="text-xs">
                          <span className="text-slate-600">مرتبط حالياً بالحساب: </span>
                          <span className="font-mono font-bold text-indigo-900">@{currentLinkedUser.username}</span>
                          <span className="text-indigo-700 mr-1 font-bold">({currentLinkedUser.role === 'collector' ? 'محصل' : currentLinkedUser.role})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            handleExecuteQuickLink(quickLinkTarget, 'unlink');
                            setQuickLinkTarget(null);
                          }}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-rose-200"
                        >
                          فك الارتباط
                        </button>
                      </div>
                    );
                  } else {
                    return (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                        <span className="font-bold">تنبيه: </span>
                        هذا الموظف غير مرتبط بأي حساب دخول للنظام. ربطه بحسابه كمحصل يضمن دمج بيانات التحصيل ومنع تكرار اسمه في القوائم.
                      </div>
                    );
                  }
                })()}

                {/* Option 1: Select existing user */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-800">
                    الخيار 1: اختيار حساب مستخدم نظام موجود مسبقاً
                  </label>
                  <div className="flex gap-2">
                    <select
                      id="quick-link-user-select"
                      defaultValue={quickLinkTarget.userId || ''}
                      className="flex-1 border border-slate-200 rounded-xl p-2.5 text-xs text-right outline-none focus:border-indigo-500 bg-white"
                    >
                      <option value="">-- اختر حساب مستخدم --</option>
                      {users.map(u => {
                        const isLinkedToAnother = employees.some(e => e.userId === u.id && e.id !== quickLinkTarget.id);
                        return (
                          <option key={u.id} value={u.id} disabled={isLinkedToAnother}>
                            @{u.username} ({u.role === 'collector' ? 'محصل' : u.role === 'admin' ? 'مدير' : u.role}) - {u.name} {isLinkedToAnother ? '(مرتبط بموظف آخر)' : ''}
                          </option>
                        );
                      })}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const selectEl = document.getElementById('quick-link-user-select') as HTMLSelectElement;
                        if (selectEl) {
                          if (selectEl.value) {
                            handleExecuteQuickLink(quickLinkTarget, 'link_existing', selectEl.value);
                          } else {
                            handleExecuteQuickLink(quickLinkTarget, 'unlink');
                          }
                          setQuickLinkTarget(null);
                        }
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                    >
                      حفظ الربط
                    </button>
                  </div>
                </div>

                {/* Option 2: Quick Create New User */}
                {!quickLinkTarget.userId && (
                  <div className="space-y-2 pt-3 border-t border-slate-100 bg-slate-50/80 p-3 rounded-xl">
                    <label className="block text-xs font-bold text-slate-800">
                      الخيار 2: إنشاء حساب مستخدم جديد فوري للموظف
                    </label>
                    <p className="text-[11px] text-slate-500">
                      سيتم إنشاء حساب دخول باسم مستخدم تلقائي وكلمة مرور افتراضية (123456) وربطه فوراً.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        const cleanName = quickLinkTarget.name.trim().split(' ')[0].toLowerCase();
                        const newUName = `coll_${cleanName}_${Math.floor(100 + Math.random() * 900)}`;
                        const targetRole: UserRole = quickLinkTarget.role === 'collector' ? 'collector' : 'admin';
                        handleExecuteQuickLink(quickLinkTarget, 'create_new', undefined, {
                          username: newUName,
                          password: '123456',
                          role: targetRole
                        });
                        setQuickLinkTarget(null);
                      }}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>إنشاء حساب دخول فوري وربطه الآن</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => setQuickLinkTarget(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default AdminHR;
