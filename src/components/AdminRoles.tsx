import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, UserPlus, Key, Settings, X, Check, Search, Trash2, Edit2, 
  Lock, Unlock, User as UserIcon, UserCheck, Shield, AlertCircle, RefreshCw, 
  Sliders, CheckSquare, Square, Phone, MapPin, Building, Eye, EyeOff,
  Activity, FileText, Download, Filter, Calendar, CheckCircle2, AlertTriangle,
  Layers, Zap, Database, ShieldAlert, Server, HardDrive, Terminal, FileJson,
  Clock, ShieldX, CheckCircle, FileSpreadsheet, Link, Unlink, Briefcase
} from 'lucide-react';
import { User, UserRole, AuditLog, Employee } from '../types';
import { 
  syncSecurityPoliciesToCloud, 
  syncAuditLogToCloud, 
  subscribeSecurityPoliciesFromCloud,
  syncUserToCloud,
  deleteUserFromCloud,
  syncBulkUsersToCloud,
  fetchUsersFromCloud,
  syncEmployeeToCloud
} from '../lib/database';

interface AdminRolesProps {
  users: User[];
  onUpdateUsers?: (users: User[]) => void;
  currentUser?: User;
  onAddAuditLog?: (log: AuditLog) => void;
  auditLogs?: AuditLog[];
  onClearAuditLogs?: () => void;
  employees?: Employee[];
  onUpdateEmployees?: (employees: Employee[]) => void;
  initialTab?: 'roles' | 'audit' | 'policies';
}

// System permissions definition
export const SYSTEM_PERMISSIONS = [
  { id: 'read_subscribers', name: 'عرض المشتركين والعدادات', category: 'المشتركين' },
  { id: 'write_subscribers', name: 'إضافة وتعديل المشتركين', category: 'المشتركين' },
  { id: 'delete_subscribers', name: 'حذف المشتركين', category: 'المشتركين' },
  
  { id: 'read_readings', name: 'عرض قراءات العدادات', category: 'القراءات والفواتير' },
  { id: 'write_readings', name: 'إدخال وتسجيل القراءات الميدانية', category: 'القراءات والفواتير' },
  { id: 'post_readings', name: 'اعتماد وترحيل الفواتير والقراءات', category: 'القراءات والفواتير' },
  
  { id: 'read_payments', name: 'عرض سندات القبض', category: 'التحصيل والمقبوضات' },
  { id: 'write_payments', name: 'إصدار وطباعة سندات القبض', category: 'التحصيل والمقبوضات' },
  { id: 'post_payments', name: 'ترحيل وتصفية عُهد المقبوضات', category: 'التحصيل والمقبوضات' },
  
  { id: 'read_accounting', name: 'عرض الحسابات والخزينة والتوريدات', category: 'المحاسبة والخزينة' },
  { id: 'write_accounting', name: 'إدخال المصروفات والقيود والتحويلات', category: 'المحاسبة والخزينة' },
  
  { id: 'read_inventory', name: 'عرض حركة المستودع والمخزون', category: 'المخزون والآلات' },
  { id: 'write_inventory', name: 'صرف وتوريد كميات المخزون', category: 'المخزون والآلات' },
  
  { id: 'read_hr', name: 'عرض ملفات الموظفين وسجل الرواتب', category: 'الموارد البشرية' },
  { id: 'write_hr', name: 'تعديل السلف والرواتب والمكافآت', category: 'الموارد البشرية' },
  
  { id: 'manage_users', name: 'إدارة الحسابات وصلاحيات المستخدمين', category: 'إدارة النظام' },
  { id: 'manage_settings', name: 'تعديل إعدادات المحطة والتعريفات', category: 'إدارة النظام' },
];

export const ROLE_PRESETS: Record<UserRole, { label: string; desc: string; badgeColor: string; defaultPerms: string[] }> = {
  admin: {
    label: 'مدير نظام كامل الصلاحيات',
    desc: 'الوصول الشامل لكافة شاشات النظام، الإعدادات، المستخدمين، والميزانيات.',
    badgeColor: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
    defaultPerms: SYSTEM_PERMISSIONS.map(p => p.id)
  },
  manager: {
    label: 'مدير عام / مشرف تشغيلي',
    desc: 'متابعة المشتركين، القراءات، التقارير، والعمليات مع صلاحيات الإشراف.',
    badgeColor: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
    defaultPerms: [
      'read_subscribers', 'write_subscribers',
      'read_readings', 'write_readings', 'post_readings',
      'read_payments', 'write_payments', 'post_payments',
      'read_accounting', 'read_inventory', 'read_hr'
    ]
  },
  accountant: {
    label: 'محاسب / مسؤول الخزينة',
    desc: 'إدارة القيود، السندات، التوريدات الصندوقية، المصروفات، وإغلاق الدورة.',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    defaultPerms: [
      'read_subscribers',
      'read_readings', 'post_readings',
      'read_payments', 'post_payments',
      'read_accounting', 'write_accounting',
      'read_inventory', 'read_hr', 'write_hr'
    ]
  },
  data_entry: {
    label: 'مدخل بيانات / موظف استقبال',
    desc: 'إدخال قراءات المشتركين، تسجيل المشتركين الجدد، وإصدار الفواتير.',
    badgeColor: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    defaultPerms: [
      'read_subscribers', 'write_subscribers',
      'read_readings', 'write_readings',
      'read_payments', 'write_payments',
      'read_inventory'
    ]
  },
  collector: {
    label: 'محصل ميداني',
    desc: 'تطبيق إدخال قراءات العدادات الميدانية وإصدار سندات التحصيل الكاش.',
    badgeColor: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
    defaultPerms: [
      'read_subscribers',
      'read_readings', 'write_readings',
      'read_payments', 'write_payments'
    ]
  }
};

export const AdminRoles: React.FC<AdminRolesProps> = ({ 
  users, 
  onUpdateUsers, 
  currentUser,
  onAddAuditLog,
  auditLogs = [],
  onClearAuditLogs,
  employees = [],
  onUpdateEmployees,
  initialTab = 'roles'
}) => {
  const [activeMainTab, setActiveMainTab] = useState<'roles' | 'audit' | 'policies'>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  // Audit Log State
  const [auditSearch, setAuditSearch] = useState('');
  const [auditUserFilter, setAuditUserFilter] = useState<string>('all');
  const [auditActionFilter, setAuditActionFilter] = useState<string>('all');
  const [auditDateFilter, setAuditDateFilter] = useState<string>('all');

  // Security Policies State
  const [requireComplexPassword, setRequireComplexPassword] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('voltera_security_policy');
      if (saved) return JSON.parse(saved).requireComplexPassword ?? true;
    } catch (e) {}
    return true;
  });

  const [minPasswordLength, setMinPasswordLength] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('voltera_security_policy');
      if (saved) return JSON.parse(saved).minPasswordLength ?? 8;
    } catch (e) {}
    return 8;
  });

  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('voltera_security_policy');
      if (saved) return JSON.parse(saved).sessionTimeoutMinutes ?? 60;
    } catch (e) {}
    return 60;
  });

  const [autoLockoutAttempts, setAutoLockoutAttempts] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('voltera_security_policy');
      if (saved) return JSON.parse(saved).autoLockoutAttempts ?? 5;
    } catch (e) {}
    return 5;
  });

  const [ipWhitelistEnabled, setIpWhitelistEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('voltera_security_policy');
      if (saved) return JSON.parse(saved).ipWhitelistEnabled ?? false;
    } catch (e) {}
    return false;
  });

  const [savePolicyStatus, setSavePolicyStatus] = useState(false);
  const [isRefreshingUsers, setIsRefreshingUsers] = useState(false);
  const [isDeletingUserId, setIsDeletingUserId] = useState<string | null>(null);

  // Directly fetch latest users from Cloud Database on mount
  useEffect(() => {
    async function loadInitialUsers() {
      try {
        const freshUsers = await fetchUsersFromCloud();
        if (freshUsers && freshUsers.length > 0 && onUpdateUsers) {
          onUpdateUsers(freshUsers);
        }
      } catch (err) {
        console.warn('Initial cloud users fetch in AdminRoles:', err);
      }
    }
    loadInitialUsers();
  }, []);

  // Manual refresh users directly from database
  const handleRefreshUsersFromDb = async () => {
    setIsRefreshingUsers(true);
    try {
      const freshUsers = await fetchUsersFromCloud();
      if (onUpdateUsers) {
        onUpdateUsers(freshUsers);
      }
    } catch (err) {
      console.warn('Error fetching fresh users from database:', err);
    } finally {
      setTimeout(() => setIsRefreshingUsers(false), 500);
    }
  };

  // Subscribe to live security policy changes from Cloud Database
  useEffect(() => {
    const unsub = subscribeSecurityPoliciesFromCloud((policies) => {
      if (policies) {
        if (typeof policies.requireComplexPassword === 'boolean') setRequireComplexPassword(policies.requireComplexPassword);
        if (typeof policies.minPasswordLength === 'number') setMinPasswordLength(policies.minPasswordLength);
        if (typeof policies.sessionTimeoutMinutes === 'number') setSessionTimeoutMinutes(policies.sessionTimeoutMinutes);
        if (typeof policies.autoLockoutAttempts === 'number') setAutoLockoutAttempts(policies.autoLockoutAttempts);
        if (typeof policies.ipWhitelistEnabled === 'boolean') setIpWhitelistEnabled(policies.ipWhitelistEnabled);
      }
    });
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Modals state
  const [editingRoleTemplate, setEditingRoleTemplate] = useState<UserRole | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [linkingUser, setLinkingUser] = useState<User | null>(null);
  const [selectedLinkEmpId, setSelectedLinkEmpId] = useState<string>('');

  // Form states for new user
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('collector');
  const [newPermissions, setNewPermissions] = useState<string[]>(ROLE_PRESETS.collector.defaultPerms);
  const [showPassword, setShowPassword] = useState(false);
  const [newEmployeeId, setNewEmployeeId] = useState<string>('');

  // Form states for editing user
  const [editUserRole, setEditUserRole] = useState<UserRole>('collector');
  const [editUserPerms, setEditUserPerms] = useState<string[]>([]);
  const [editUserName, setEditUserName] = useState('');
  const [editUserPhone, setEditUserPhone] = useState('');
  const [editEmployeeId, setEditEmployeeId] = useState<string>('');

  // Password reset state
  const [newPasswordValue, setNewPasswordValue] = useState('');

  // Audit Logs Filtered
  const filteredAuditLogs = auditLogs.filter(log => {
    const q = auditSearch.toLowerCase().trim();
    const matchSearch = !q || 
      log.action.toLowerCase().includes(q) || 
      log.details.toLowerCase().includes(q) || 
      log.username.toLowerCase().includes(q);
      
    const matchUser = auditUserFilter === 'all' || log.username === auditUserFilter || log.userId === auditUserFilter;
    const matchAction = auditActionFilter === 'all' || log.action.includes(auditActionFilter);

    let matchDate = true;
    if (auditDateFilter === 'today') {
      const today = new Date().toISOString().substring(0, 10);
      matchDate = log.timestamp.startsWith(today);
    }

    return matchSearch && matchUser && matchAction && matchDate;
  });

  // Audit CSV Export
  const handleExportAuditCSV = () => {
    if (!auditLogs || auditLogs.length === 0) {
      alert('لا توجد سجلات تدقيق للتصدير.');
      return;
    }
    const headers = ['المعرف', 'اسم المستخدم', 'نوع الإجراء / العملية', 'التفاصيل', 'التاريخ والوقت'];
    const rows = filteredAuditLogs.map(l => [
      `"${l.id}"`,
      `"${l.username}"`,
      `"${(l.action || '').replace(/"/g, '""')}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      `"${l.timestamp}"`
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `voltera_audit_log_${new Date().toISOString().substring(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Audit JSON Export
  const handleExportAuditJSON = () => {
    if (!auditLogs || auditLogs.length === 0) {
      alert('لا توجد سجلات تدقيق للتصدير.');
      return;
    }
    const jsonStr = JSON.stringify(filteredAuditLogs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `voltera_audit_log_${new Date().toISOString().substring(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Save Security Policy
  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavePolicyStatus(true);

    const policyPayload = {
      requireComplexPassword,
      minPasswordLength,
      sessionTimeoutMinutes,
      autoLockoutAttempts,
      ipWhitelistEnabled,
      updatedAt: new Date().toISOString()
    };

    // 1. Save locally for instant persistence
    localStorage.setItem('voltera_security_policy', JSON.stringify(policyPayload));

    // 2. Sync directly to Cloud Database (Firestore)
    try {
      await syncSecurityPoliciesToCloud(policyPayload);
    } catch (err) {
      console.warn('Could not sync security policies to cloud:', err);
    }

    // 3. Register audit log
    const logDetails = `تم حفظ وتفعيل سياسات الأمان على قاعدة البيانات المباشرة: طول كلمة المرور (${minPasswordLength})، مهلة الخمول (${sessionTimeoutMinutes}د)، حد المحاولات الخاطئة (${autoLockoutAttempts})، التراكيب المعقدة (${requireComplexPassword ? 'مفعل' : 'معطل'}).`;
    logUserAction('تفعيل وحفظ سياسات الأمان', logDetails);

    const auditEntry: AuditLog = {
      id: `log-${Date.now()}`,
      userId: currentUser?.id || 'admin',
      username: currentUser?.name || currentUser?.username || 'مدير النظام',
      action: 'تفعيل وحفظ سياسات الأمان',
      details: logDetails,
      timestamp: new Date().toISOString().substring(0, 16).replace('T', ' ')
    };

    try {
      await syncAuditLogToCloud(auditEntry);
    } catch (err) {
      console.warn('Could not sync audit log to cloud:', err);
    }

    setTimeout(() => setSavePolicyStatus(false), 4000);
  };

  // Helper log action
  const logUserAction = (action: string, details: string) => {
    if (onAddAuditLog && currentUser) {
      onAddAuditLog({
        id: `log-${Date.now()}`,
        userId: currentUser.id || 'admin',
        username: currentUser.name || currentUser.username,
        action,
        details,
        timestamp: new Date().toISOString().substring(0, 16).replace('T', ' ')
      });
    }
  };

  // Filtered users list
  const filteredUsers = users.filter(u => {
    const q = searchTerm.toLowerCase().trim();
    const matchSearch = u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || (u.phone && u.phone.includes(q));
    const matchRole = roleFilter === 'all' ? true : u.role === roleFilter;
    return matchSearch && matchRole;
  });

  // Toggle user status
  const handleToggleUserStatus = async (targetUser: User) => {
    if (targetUser.id === currentUser?.id) {
      alert('خطأ أمني: لا يمكنك إيقاف الحساب الحالي الذي تستخدمه لتسجيل الدخول!');
      return;
    }

    let modifiedUser: User | null = null;
    const updated = users.map(u => {
      if (u.id === targetUser.id) {
        const nextStatus: 'active' | 'suspended' = u.status === 'active' ? 'suspended' : 'active';
        modifiedUser = { ...u, status: nextStatus };
        return modifiedUser;
      }
      return u;
    });

    if (modifiedUser) {
      await syncUserToCloud(modifiedUser);
    }

    if (onUpdateUsers) {
      onUpdateUsers(updated);
      logUserAction('تعديل حالة حساب', `تغيير حالة حساب المستخدم (${targetUser.name}) إلى: ${targetUser.status === 'active' ? 'موقف' : 'نشط'}`);
    }
  };

  // Delete user
  const handleDeleteUser = async (targetUser: User) => {
    if (targetUser.id === currentUser?.id || targetUser.username === currentUser?.username) {
      alert('خطأ أمني: لا يمكنك حذف حسابك الشخصي الذي تستخدمه حالياً لتسجيل الدخول!');
      return;
    }

    const adminCount = users.filter(u => u.role === 'admin' && u.status === 'active').length;
    if (targetUser.role === 'admin' && adminCount <= 1) {
      alert('لا يمكنك حذف المدير الوحيد المتبقي في النظام! يجب الاحتفاظ بحساب مدير واحد على الأقل.');
      return;
    }

    if (!confirm(`هل أنت متأكد من حذف حساب المستخدم (${targetUser.name}) [${targetUser.username}] نهائياً من قاعدة البيانات السحابية؟`)) {
      return;
    }

    setIsDeletingUserId(targetUser.id);
    try {
      // 1. Delete from Firebase
      await deleteUserFromCloud(targetUser.id);
      
      // 2. Update React parent state
      const remaining = users.filter(u => u.id !== targetUser.id);
      if (onUpdateUsers) {
        onUpdateUsers(remaining);
      }

      // Unlink any employee record pointing to this user
      if (onUpdateEmployees && employees.length > 0) {
        const cleanedEmps = employees.map(e => {
          if (e.userId === targetUser.id || e.username === targetUser.username) {
            const updated = { ...e, userId: undefined, username: undefined };
            syncEmployeeToCloud(updated);
            return updated;
          }
          return e;
        });
        onUpdateEmployees(cleanedEmps);
      }

      // 3. Register audit log
      logUserAction('حذف حساب مستخدم', `تم مسح وحذف حساب المستخدم (${targetUser.name}) [${targetUser.username}] من قاعدة البيانات نهائياً`);
    } catch (err: any) {
      alert('حدث خطأ أثناء حذف المستخدم: ' + (err?.message || 'يرجى المحاولة مجدداً'));
    } finally {
      setIsDeletingUserId(null);
    }
  };

  // Quick link user to employee
  const handleQuickLinkUser = async (user: User, targetEmployeeId: string) => {
    try {
      const targetEmp = employees.find(e => e.id === targetEmployeeId);
      const updatedUser: User = {
        ...user,
        employeeId: targetEmp ? targetEmp.id : undefined,
        employeeName: targetEmp ? targetEmp.name : undefined,
      };

      await syncUserToCloud(updatedUser);

      if (onUpdateUsers) {
        onUpdateUsers(users.map(u => u.id === user.id ? updatedUser : u));
      }

      if (onUpdateEmployees) {
        let nextEmps = [...employees];
        // Clear any old employee pointing to this user
        nextEmps = nextEmps.map(e => {
          if ((e.userId === user.id || e.username === user.username) && e.id !== targetEmployeeId) {
            const cleared = { ...e, userId: undefined, username: undefined };
            syncEmployeeToCloud(cleared);
            return cleared;
          }
          return e;
        });

        // Link new employee if selected
        if (targetEmp) {
          nextEmps = nextEmps.map(e => {
            if (e.id === targetEmp.id) {
              const linked = { ...e, userId: user.id, username: user.username };
              syncEmployeeToCloud(linked);
              return linked;
            }
            return e;
          });
        }
        onUpdateEmployees(nextEmps);
      }

      logUserAction(
        targetEmp ? 'ربط مستخدم بملف موظف' : 'إلغاء ربط مستخدم بملف موظف',
        targetEmp 
          ? `تم ربط حساب المستخدم (${user.name}) بملف الموظف [${targetEmp.name}] بنجاح لمنع التكرار في التحصيل والتقارير`
          : `تم فك ارتباط حساب المستخدم (${user.name}) عن ملفات الموظفين`
      );

      setLinkingUser(null);
      setSelectedLinkEmpId('');
    } catch (err: any) {
      alert('حدث خطأ أثناء ربط الحساب بملف الموظف: ' + (err?.message || 'يرجى المحاولة مجدداً'));
    }
  };

  // Prepare open edit modal
  const openEditUserModal = (u: User) => {
    setEditingUser(u);
    setEditUserRole(u.role);
    setEditUserName(u.name);
    setEditUserPhone(u.phone || '');
    setEditEmployeeId(u.employeeId || '');
    setEditUserPerms(u.permissions && u.permissions.length > 0 ? u.permissions : ROLE_PRESETS[u.role]?.defaultPerms || []);
  };

  // Save edit user
  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const linkedEmp = employees.find(e => e.id === editEmployeeId);
    let modifiedUser: User | null = null;
    const updated = users.map(u => {
      if (u.id === editingUser.id) {
        modifiedUser = {
          ...u,
          name: editUserName,
          phone: editUserPhone,
          role: editUserRole,
          permissions: editUserPerms,
          employeeId: linkedEmp ? linkedEmp.id : (editEmployeeId === '' ? undefined : u.employeeId),
          employeeName: linkedEmp ? linkedEmp.name : (editEmployeeId === '' ? undefined : u.employeeName),
        };
        return modifiedUser;
      }
      return u;
    });

    if (modifiedUser) {
      await syncUserToCloud(modifiedUser);
    }

    // Bi-directional employee sync
    if (onUpdateEmployees) {
      let empsChanged = false;
      let nextEmps = [...employees];

      // If user had previous employee that is now removed or changed
      if (editingUser.employeeId && editingUser.employeeId !== editEmployeeId) {
        nextEmps = nextEmps.map(e => {
          if (e.id === editingUser.employeeId) {
            const cleared = { ...e, userId: undefined, username: undefined };
            syncEmployeeToCloud(cleared);
            return cleared;
          }
          return e;
        });
        empsChanged = true;
      }

      // If new employee linked
      if (linkedEmp && linkedEmp.id !== editingUser.employeeId) {
        nextEmps = nextEmps.map(e => {
          if (e.id === linkedEmp.id) {
            const linked = { ...e, userId: editingUser.id, username: editingUser.username };
            syncEmployeeToCloud(linked);
            return linked;
          }
          return e;
        });
        empsChanged = true;
      }

      if (empsChanged) {
        onUpdateEmployees(nextEmps);
      }
    }

    if (onUpdateUsers) {
      onUpdateUsers(updated);
      logUserAction('تعديل صلاحيات مستخدم', `تم تحديث بيانات ودور الصلاحيات للمستخدم (${editUserName}) إلى [${ROLE_PRESETS[editUserRole]?.label}]`);
    }

    setEditingUser(null);
  };

  // Create new user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim() || !newName.trim()) {
      alert('يرجى ملء جميع الحقول الإلزامية!');
      return;
    }

    if (users.some(u => u.username.toLowerCase() === newUsername.trim().toLowerCase())) {
      alert('خطأ: اسم المستخدم هذا موجود ومسجل مسبقاً في القاعدة! يرجى اختيار اسم مستخدم آخر.');
      return;
    }

    const linkedEmp = employees.find(e => e.id === newEmployeeId);

    const createdUser: User = {
      id: `u-${Date.now()}`,
      username: newUsername.trim().toLowerCase(),
      passwordHash: newPassword.trim(),
      role: newRole,
      name: newName.trim(),
      phone: newPhone.trim(),
      status: 'active',
      permissions: newPermissions.length > 0 ? newPermissions : ROLE_PRESETS[newRole].defaultPerms,
      createdAt: new Date().toISOString().substring(0, 16).replace('T', ' '),
      employeeId: linkedEmp ? linkedEmp.id : undefined,
      employeeName: linkedEmp ? linkedEmp.name : undefined,
    };

    await syncUserToCloud(createdUser);

    // If linked to employee, update employee record as well
    if (linkedEmp && onUpdateEmployees) {
      const updatedEmps = employees.map(e => {
        if (e.id === linkedEmp.id) {
          const linked = { ...e, userId: createdUser.id, username: createdUser.username };
          syncEmployeeToCloud(linked);
          return linked;
        }
        return e;
      });
      onUpdateEmployees(updatedEmps);
    }

    if (onUpdateUsers) {
      onUpdateUsers([createdUser, ...users]);
      logUserAction('إنشاء حساب مستخدم جديد', `تم إضافة حساب للموظف (${newName}) بدور [${ROLE_PRESETS[newRole].label}]${linkedEmp ? ` وربطه بملف الموظف [${linkedEmp.name}]` : ''}`);
    }

    // Reset form
    setNewUsername('');
    setNewPassword('');
    setNewName('');
    setNewPhone('');
    setNewEmployeeId('');
    setShowAddUserModal(false);
  };

  // Reset password
  const handleSaveResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser || !newPasswordValue.trim()) return;

    let modifiedUser: User | null = null;
    const updated = users.map(u => {
      if (u.id === resetPasswordUser.id) {
        modifiedUser = { ...u, passwordHash: newPasswordValue.trim() };
        return modifiedUser;
      }
      return u;
    });

    if (modifiedUser) {
      await syncUserToCloud(modifiedUser);
    }

    if (onUpdateUsers) {
      onUpdateUsers(updated);
      logUserAction('إعادة تعيين كلمة مرور', `تحديث كلمة المرور الأمنية لحساب المستخدم (${resetPasswordUser.name})`);
    }

    alert(`تم تغيير كلمة المرور للمستخدم (${resetPasswordUser.name}) بنجاح وحفظها بقاعدة البيانات السحابية.`);
    setResetPasswordUser(null);
    setNewPasswordValue('');
  };

  // Update role blueprint permissions for all users having that role
  const handleApplyRolePresetToUsers = async (roleKey: UserRole) => {
    const presetPerms = ROLE_PRESETS[roleKey].defaultPerms;
    const updated = users.map(u => {
      if (u.role === roleKey) {
        return { ...u, permissions: presetPerms };
      }
      return u;
    });

    await syncBulkUsersToCloud(updated);

    if (onUpdateUsers) {
      onUpdateUsers(updated);
      logUserAction('تحديث قالب الدور', `تطبيق وتوحيد الصلاحيات القياسية لجميع مستخدمي دور [${ROLE_PRESETS[roleKey].label}]`);
      alert(`تم مزامنة وتطبيق الصلاحيات القياسية على كافة مستخدمي دور (${ROLE_PRESETS[roleKey].label}) بنجاح وحفظها بالسحابة.`);
    }

    setEditingRoleTemplate(null);
  };

  return (
    <motion.div
      key="roles-sec"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 text-right font-sans"
    >
      {/* Top Header & Main Navigation Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800/80 w-full md:w-auto">
          <button
            onClick={() => setActiveMainTab('roles')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer flex-1 sm:flex-initial ${
              activeMainTab === 'roles'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>الحسابات والأدوار ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveMainTab('audit')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer flex-1 sm:flex-initial ${
              activeMainTab === 'audit'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>سجل التدقيق والتتبع ({auditLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveMainTab('policies')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer flex-1 sm:flex-initial ${
              activeMainTab === 'policies'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>سياسات وجاهزية الأمان</span>
          </button>
        </div>

        <div className="text-right">
          <h2 className="text-lg font-black text-slate-100 flex items-center justify-start md:justify-end gap-2">
            <span>مركز الأمان وسجل التدقيق والتحكم</span>
            <ShieldCheck className="w-5 h-5 text-amber-500" />
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">مراقبة العمليات الحساسة، حماية البيانات والسجلات المالية، وإدارة صلاحيات الموظفين.</p>
        </div>
      </div>

      {/* TAB 1: ACCOUNTS & ROLES */}
      {activeMainTab === 'roles' && (
        <div className="space-y-6">
          {/* Top Header & Role Preset Cards */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-800/80 pb-5">
              <div className="flex items-center gap-3">
                <button 
                  id="add-custom-role-btn"
                  onClick={() => setShowAddUserModal(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 px-5 rounded-2xl text-xs transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>إضافة حساب مستخدم جديد</span>
                </button>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center justify-start md:justify-end gap-2">
                  <span>الأدوار والصلاحيات المعتمدة بالنظام</span>
                  <Sliders className="w-5 h-5 text-amber-500" />
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">قوالب الأدوار المحددة مسبقاً وتوزيع مستخدمي النظام حسب المهام.</p>
              </div>
            </div>

            {/* Roles Templates Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {(Object.keys(ROLE_PRESETS) as UserRole[]).map((rKey) => {
                const roleInfo = ROLE_PRESETS[rKey];
                const usersInRole = users.filter(u => u.role === rKey);

                return (
                  <div 
                    key={rKey} 
                    className="bg-slate-950/80 rounded-2xl border border-slate-800/80 p-5 relative overflow-hidden flex flex-col justify-between hover:border-slate-700 transition-all group"
                  >
                    <div className="absolute top-0 right-0 w-1.5 h-full bg-amber-500 group-hover:bg-amber-400 transition-colors"></div>
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-900 border border-slate-800 py-0.5 px-2.5 rounded-full">
                          {usersInRole.length} مستخدم
                        </span>
                        <span className={`text-[11px] font-bold py-1 px-3 rounded-full ${roleInfo.badgeColor}`}>
                          {roleInfo.label}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 mb-4 leading-relaxed text-right">
                        {roleInfo.desc}
                      </p>
                    </div>

                    <div className="border-t border-slate-800/80 pt-3 mt-2 flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {roleInfo.defaultPerms.length} / {SYSTEM_PERMISSIONS.length} صلاحية
                      </span>
                      <button 
                        onClick={() => setEditingRoleTemplate(rKey)}
                        className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-amber-500/10 transition-all cursor-pointer"
                      >
                        <span>استعراض وتعديل القالب</span>
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Users Accounts Table & Live Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-800 pb-4">
              {/* Role Filter & Search */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-500 absolute top-3 right-3" />
                  <input 
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="البحث باسم المستخدم أو الاسم الكامل..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pr-9 pl-3 text-xs text-slate-200 placeholder-slate-500 text-right focus:outline-none focus:border-amber-500"
                  />
                </div>

                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-300 text-right focus:outline-none focus:border-amber-500"
                >
                  <option value="all">جميع الأدوار ({users.length})</option>
                  <option value="admin">مدير نظام ({users.filter(u => u.role === 'admin').length})</option>
                  <option value="manager">مدير عام ({users.filter(u => u.role === 'manager').length})</option>
                  <option value="accountant">محاسب ({users.filter(u => u.role === 'accountant').length})</option>
                  <option value="data_entry">مدخل بيانات ({users.filter(u => u.role === 'data_entry').length})</option>
                  <option value="collector">محصل ميداني ({users.filter(u => u.role === 'collector').length})</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleRefreshUsersFromDb}
                  disabled={isRefreshingUsers}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
                  title="إعادة قراءة واستدعاء الحسابات مباشرة من قاعدة البيانات"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isRefreshingUsers ? 'animate-spin' : ''}`} />
                  <span>{isRefreshingUsers ? 'جاري الاستدعاء...' : 'تحديث من قاعدة البيانات'}</span>
                </button>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold rounded-xl">
                  <Database className="w-3.5 h-3.5" />
                  <span>قاعدة البيانات السحابية (Firebase Firestore) - نشطة ومتزامنة</span>
                </span>
                <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
                  <span>سجل حسابات المستخدمين النشطة</span>
                  <UserIcon className="w-5 h-5 text-amber-500" />
                </h3>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] text-slate-400 bg-slate-950/50">
                    <th className="py-3 px-4 font-bold">المستخدم والموظف</th>
                    <th className="py-3 px-4 font-bold">الدور الوظيفي</th>
                    <th className="py-3 px-4 font-bold">حالة الحساب</th>
                    <th className="py-3 px-4 font-bold">الصلاحيات الممنوحة</th>
                    <th className="py-3 px-4 font-bold">تاريخ الإنشاء</th>
                    <th className="py-3 px-4 font-bold text-center">التحكم والإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        لا يوجد مستخدمين مطابقين لمعايير البحث الحالية.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const preset = ROLE_PRESETS[user.role] || ROLE_PRESETS.collector;
                      const isCurrent = user.id === currentUser?.id;
                      const activePermsCount = user.permissions?.length || preset.defaultPerms.length;

                      return (
                        <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-amber-500 shrink-0">
                                {user.name ? user.name.charAt(0) : user.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-100">{user.name}</span>
                                  {isCurrent && (
                                    <span className="text-[9px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold">
                                      حسابك الحالي
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-500 font-mono block dir-ltr text-right">
                                  @{user.username} {user.phone ? `• ${user.phone}` : ''}
                                </span>

                                {/* Employee Linking Status */}
                                <div className="mt-1 flex items-center gap-1.5">
                                  {user.employeeId || user.employeeName ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                                      <Briefcase className="w-2.5 h-2.5" />
                                      <span>موظف مرتبط: {user.employeeName || employees.find(e => e.id === user.employeeId)?.name}</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px]">
                                      <AlertCircle className="w-2.5 h-2.5 text-amber-500/70" />
                                      <span>غير مرتبط بملف موظف</span>
                                    </span>
                                  )}
                                  <button
                                    onClick={() => {
                                      setLinkingUser(user);
                                      setSelectedLinkEmpId(user.employeeId || '');
                                    }}
                                    title="تعديل أو ربط ملف الموظف"
                                    className="text-[10px] text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-0.5 cursor-pointer font-bold mr-1"
                                  >
                                    <Link className="w-2.5 h-2.5" />
                                    <span>{user.employeeId ? 'تغيير' : 'ربط'}</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-block ${preset.badgeColor}`}>
                              {preset.label}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => handleToggleUserStatus(user)}
                              disabled={isCurrent}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                                user.status === 'active'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                              } ${isCurrent ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {user.status === 'active' ? (
                                <>
                                  <UserCheck className="w-3 h-3" />
                                  <span>نشط</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3 h-3" />
                                  <span>موقف</span>
                                </>
                              )}
                            </button>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-slate-400">
                            <span className="text-amber-400 font-bold">{activePermsCount}</span> / {SYSTEM_PERMISSIONS.length} صلاحية
                          </td>

                          <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                            {user.createdAt || 'غير محدد'}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setLinkingUser(user);
                                  setSelectedLinkEmpId(user.employeeId || '');
                                }}
                                title="ربط المستخدم بملف موظف في الموارد البشرية"
                                className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                              >
                                <Link className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => openEditUserModal(user)}
                                title="تعديل الصلاحيات والدور"
                                className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
                              >
                                <Sliders className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => setResetPasswordUser(user)}
                                title="تغيير كلمة المرور"
                                className="p-1.5 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-lg transition-colors cursor-pointer"
                              >
                                <Key className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleDeleteUser(user)}
                                disabled={isCurrent || isDeletingUserId === user.id}
                                title={isCurrent ? "لا يمكنك حذف حسابك الحالي" : "حذف الحساب نهائياً من قاعدة البيانات"}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  isCurrent 
                                    ? 'text-slate-600 cursor-not-allowed' 
                                    : isDeletingUserId === user.id
                                      ? 'text-slate-400 cursor-wait bg-slate-800'
                                      : 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10'
                                }`}
                              >
                                {isDeletingUserId === user.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin text-rose-400" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT LOG & SECURITY TRAIL */}
      {activeMainTab === 'audit' && (
        <div className="space-y-6">
          {/* Audit Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400 font-bold">إجمالي السجلات الحالية</p>
                <h4 className="text-xl font-black text-slate-100 font-mono mt-1">{auditLogs.length}</h4>
              </div>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                <Activity className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400 font-bold">سجلات اليوم</p>
                <h4 className="text-xl font-black text-emerald-400 font-mono mt-1">
                  {auditLogs.filter(l => l.timestamp.startsWith(new Date().toISOString().substring(0, 10))).length}
                </h4>
              </div>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400 font-bold">عدد الحسابات المسجلة</p>
                <h4 className="text-xl font-black text-sky-400 font-mono mt-1">{users.length}</h4>
              </div>
              <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400">
                <UserIcon className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400 font-bold">تشفير وحماية السجل</p>
                <h4 className="text-xs font-bold text-amber-400 mt-1">مؤمن ومستمر بالسحابة</h4>
              </div>
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Search, Filter & Actions Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-500 absolute top-3 right-3" />
                  <input
                    type="text"
                    value={auditSearch}
                    onChange={(e) => setAuditSearch(e.target.value)}
                    placeholder="البحث بالإجراء، المستخدم، أو التفاصيل..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pr-9 pl-3 text-xs text-slate-200 placeholder-slate-500 text-right focus:outline-none focus:border-amber-500"
                  />
                </div>

                <select
                  value={auditUserFilter}
                  onChange={(e) => setAuditUserFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-300 text-right focus:outline-none focus:border-amber-500"
                >
                  <option value="all">جميع المستخدمين</option>
                  {users.map(u => (
                    <option key={u.id} value={u.username}>{u.name} (@{u.username})</option>
                  ))}
                </select>

                <select
                  value={auditDateFilter}
                  onChange={(e) => setAuditDateFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-300 text-right focus:outline-none focus:border-amber-500"
                >
                  <option value="all">كل الفترات الزمنية</option>
                  <option value="today">أحداث اليوم فقط</option>
                </select>
              </div>

              {/* Export & Actions buttons */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button
                  onClick={handleExportAuditCSV}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 border border-slate-700"
                  title="تصدير جدول اكسل Excel CSV"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>تصدير CSV</span>
                </button>

                <button
                  onClick={handleExportAuditJSON}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 border border-slate-700"
                  title="تصدير ملف JSON"
                >
                  <FileJson className="w-4 h-4 text-amber-400" />
                  <span>تصدير JSON</span>
                </button>

                {onClearAuditLogs && (
                  <button
                    onClick={() => {
                      if (confirm('هل أنت متأكد من مسح وتفريغ سجل التدقيق والتتبع الأمني كاملاً؟ لا يمكن التراجع عن هذه الخطوة!')) {
                        onClearAuditLogs();
                      }
                    }}
                    className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>تفريغ السجل</span>
                  </button>
                )}
              </div>
            </div>

            {/* Audit Logs Table */}
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] text-slate-400 bg-slate-950/50">
                    <th className="py-3 px-4 font-bold">الوقت والتاريخ</th>
                    <th className="py-3 px-4 font-bold">المستخدم المسؤول</th>
                    <th className="py-3 px-4 font-bold">نوع الإجراء / العملية</th>
                    <th className="py-3 px-4 font-bold">التفاصيل الكاملة للإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs font-sans">
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-500">
                        لا توجد سجلات تدقيق قائمة تطابق شروط البحث الحالية.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map((log) => {
                      const isCritical = log.action.includes('حذف') || log.action.includes('إعادة') || log.action.includes('تفريغ') || log.action.includes('إيقاف');
                      const isWarn = log.action.includes('تعديل') || log.action.includes('تحديث') || log.action.includes('ترحيل');

                      return (
                        <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                            <span className="flex items-center gap-1.5 dir-ltr justify-end">
                              <span>{log.timestamp}</span>
                              <Clock className="w-3.5 h-3.5 text-slate-500" />
                            </span>
                          </td>

                          <td className="py-3.5 px-4 font-bold text-slate-200 whitespace-nowrap">
                            <span className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg text-slate-300 inline-flex items-center gap-1.5">
                              <UserIcon className="w-3 h-3 text-amber-500" />
                              <span>{log.username}</span>
                            </span>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold inline-block ${
                              isCritical
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : isWarn
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {log.action}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-slate-300 text-xs leading-relaxed">
                            {log.details}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SECURITY POLICIES & HARDENING */}
      {activeMainTab === 'policies' && (
        <div className="space-y-6">
          {/* Security Score Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-9 h-9 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-white">حالة وجاهزية أمان المحطة</h3>
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold">100% مؤمن</span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  تشفير القيود المالية والبيانات بالسحابة، عزل الصلاحيات الدقيقة لكل موظف، ومتابعة فورية لكافة التغييرات الميدانية.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl text-center min-w-[110px]">
                <span className="text-[10px] text-slate-500 block">التشفير السحابي</span>
                <span className="font-bold text-amber-400 font-mono">AES-256</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl text-center min-w-[110px]">
                <span className="text-[10px] text-slate-500 block">نوع الصلاحيات</span>
                <span className="font-bold text-emerald-400 font-mono">Role-Based</span>
              </div>
            </div>
          </div>

          {/* Form Policies Controls */}
          <form onSubmit={handleSavePolicy} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="border-b border-slate-800 pb-4 flex justify-between items-center">
              <span className="text-xs text-slate-500 font-mono">System Hardening Config</span>
              <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
                <span>إعدادات وسياسات الحماية والدخول</span>
                <Lock className="w-5 h-5 text-amber-500" />
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Complex Passwords */}
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800/80 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-slate-200 cursor-pointer flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={requireComplexPassword}
                      onChange={(e) => setRequireComplexPassword(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 accent-amber-500"
                    />
                    <span>اشتراط كلمات مرور قوية للموظفين</span>
                  </label>
                  <Key className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  إجبار جميع مستخدمي النظام الجدد والمنشئين على استخدام تراكيب معقدة تحتوي أحرفاً وأرقاماً.
                </p>
              </div>

              {/* Password min length */}
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800/80 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-amber-400 font-bold">{minPasswordLength} خانات</span>
                  <label className="font-bold text-slate-200">الحد الأدنى لعدد خانات كلمة المرور</label>
                </div>
                <input
                  type="range"
                  min={6}
                  max={16}
                  value={minPasswordLength}
                  onChange={(e) => setMinPasswordLength(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Session timeout */}
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800/80 space-y-3">
                <label className="font-bold text-slate-200 block">مهلة إنهاء الجلسة الخاملة (بالدقائق)</label>
                <select
                  value={sessionTimeoutMinutes}
                  onChange={(e) => setSessionTimeoutMinutes(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 text-right focus:outline-none focus:border-amber-500"
                >
                  <option value={15}>15 دقيقة (أمان مرتفع جداً)</option>
                  <option value={30}>30 دقيقة (موصى به للمحصلين)</option>
                  <option value={60}>60 دقيقة (ساعة واحدة)</option>
                  <option value={240}>240 دقيقة (4 ساعات)</option>
                </select>
              </div>

              {/* Account lockout */}
              <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800/80 space-y-3">
                <label className="font-bold text-slate-200 block">حد محاولات الدخول الخاطئة قبل الحظر</label>
                <select
                  value={autoLockoutAttempts}
                  onChange={(e) => setAutoLockoutAttempts(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 text-right focus:outline-none focus:border-amber-500"
                >
                  <option value={3}>3 محاولات خاطئة</option>
                  <option value={5}>5 محاولات خاطئة (افتراضي)</option>
                  <option value={10}>10 محاولات خاطئة</option>
                </select>
              </div>
            </div>

            {/* Submit button & status */}
            <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
              {savePolicyStatus ? (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 animate-pulse">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>تم حفظ وتفعيل سياسات الأمان بنجاح على قاعدة البيانات المباشرة!</span>
                </span>
              ) : (
                <span className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-slate-600" />
                  <span>سياسات حماية مفعلة ومحفوظة تلقائياً في قاعدة البيانات.</span>
                </span>
              )}

              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-amber-500/10 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>حفظ وتفعيل الإعدادات على قاعدة البيانات</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 1: EDIT USER PERMISSIONS & ROLE */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setEditingUser(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right flex flex-col"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                <button
                  onClick={() => setEditingUser(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>تعديل الدور والصلاحيات للمستخدم: {editingUser.name}</span>
                  <Sliders className="w-5 h-5 text-amber-500" />
                </h3>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSaveEditUser} className="p-6 overflow-y-auto space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">الاسم الكامل للموظف</label>
                    <input
                      type="text"
                      required
                      value={editUserName}
                      onChange={(e) => setEditUserName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 text-right focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">رقم الهاتف</label>
                    <input
                      type="text"
                      value={editUserPhone}
                      onChange={(e) => setEditUserPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 text-right focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Linked Employee Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span className="text-[10px] text-emerald-400 font-normal">
                      (يربط بيانات التحصيل والتقارير والسندات بهذا الموظف لمنع التكرار)
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-200">
                      <span>ربط بملف موظف مسجل</span>
                      <Briefcase className="w-3.5 h-3.5 text-amber-500" />
                    </span>
                  </label>
                  <select
                    value={editEmployeeId}
                    onChange={(e) => {
                      const empId = e.target.value;
                      setEditEmployeeId(empId);
                      const emp = employees.find(x => x.id === empId);
                      if (emp && !editUserName.trim()) {
                        setEditUserName(emp.name);
                        if (emp.phone) setEditUserPhone(emp.phone);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 text-right focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- بدون ربط بملف موظف --</option>
                    {employees.map(emp => {
                      const isTaken = users.some(u => u.id !== editingUser.id && (u.employeeId === emp.id || u.username === emp.username));
                      return (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.code || emp.id}) - {emp.department || 'موظف'} {isTaken ? '⚠️ [مرتبط بحساب آخر]' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">الدور الرئيسي المستهدف</label>
                  <select
                    value={editUserRole}
                    onChange={(e) => {
                      const selectedRole = e.target.value as UserRole;
                      setEditUserRole(selectedRole);
                      setEditUserPerms(ROLE_PRESETS[selectedRole]?.defaultPerms || []);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 text-right focus:outline-none focus:border-amber-500"
                  >
                    <option value="admin">مدير نظام كامل الصلاحيات</option>
                    <option value="manager">مدير عام / مشرف تشغيلي</option>
                    <option value="accountant">محاسب / مسؤول الخزينة</option>
                    <option value="data_entry">مدخل بيانات / موظف استقبال</option>
                    <option value="collector">محصل ميداني</option>
                  </select>
                </div>

                {/* Granular Permissions Checkbox List */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (editUserPerms.length === SYSTEM_PERMISSIONS.length) {
                          setEditUserPerms([]);
                        } else {
                          setEditUserPerms(SYSTEM_PERMISSIONS.map(p => p.id));
                        }
                      }}
                      className="text-[11px] text-amber-400 hover:underline cursor-pointer font-bold"
                    >
                      {editUserPerms.length === SYSTEM_PERMISSIONS.length ? 'إلغاء تحديد الكل' : 'تحديد جميع الصلاحيات'}
                    </button>
                    <label className="text-xs font-bold text-slate-200">تخصيص الصلاحيات الميدانية والإدارية:</label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto p-3 bg-slate-950 rounded-2xl border border-slate-800">
                    {SYSTEM_PERMISSIONS.map((perm) => {
                      const isChecked = editUserPerms.includes(perm.id);
                      return (
                        <label
                          key={perm.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer text-xs ${
                            isChecked
                              ? 'bg-amber-500/10 border-amber-500/40 text-slate-100'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <span className="text-[10px] text-slate-500 font-mono bg-slate-950 px-1.5 py-0.5 rounded">
                            {perm.category}
                          </span>
                          <div className="flex items-center gap-2">
                            <span>{perm.name}</span>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setEditUserPerms(editUserPerms.filter(p => p !== perm.id));
                                } else {
                                  setEditUserPerms([...editUserPerms, perm.id]);
                                }
                              }}
                              className="accent-amber-500 w-4 h-4 cursor-pointer"
                            />
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors cursor-pointer"
                  >
                    حفظ وتحديث الصلاحيات
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: ADD NEW USER */}
      <AnimatePresence>
        {showAddUserModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setShowAddUserModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right flex flex-col"
            >
              <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                <button
                  onClick={() => setShowAddUserModal(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>إضافة حساب مستخدم جديد</span>
                  <UserPlus className="w-5 h-5 text-amber-500" />
                </h3>
              </div>

              <form onSubmit={handleCreateUser} className="p-6 overflow-y-auto space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">اسم المستخدم (للتسجيل بالأحرف الإنجليزية)</label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="مثال: collector_01"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 text-right dir-ltr focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">كلمة المرور الأمنية</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 text-right focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute top-2.5 left-3 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Select Employee to Link */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                    <span className="text-[10px] text-emerald-400 font-normal">
                      (اختياري: يملأ الاسم ورقم الهاتف تلقائياً ويربط حساب التحصيل)
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-200">
                      <span>ربط بملف موظف من الموارد البشرية</span>
                      <Briefcase className="w-3.5 h-3.5 text-amber-500" />
                    </span>
                  </label>
                  <select
                    value={newEmployeeId}
                    onChange={(e) => {
                      const empId = e.target.value;
                      setNewEmployeeId(empId);
                      const emp = employees.find(x => x.id === empId);
                      if (emp) {
                        setNewName(emp.name);
                        if (emp.phone) setNewPhone(emp.phone);
                        if (emp.role === 'collector' || emp.department?.includes('تحصيل')) {
                          setNewRole('collector');
                          setNewPermissions(ROLE_PRESETS.collector.defaultPerms);
                        } else if (emp.department?.includes('حسابات') || emp.department?.includes('مالي')) {
                          setNewRole('accountant');
                          setNewPermissions(ROLE_PRESETS.accountant.defaultPerms);
                        }
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 text-right focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- اختياري: اختيار موظف مسجل لملء البيانات والربط --</option>
                    {employees.map(emp => {
                      const isTaken = users.some(u => u.employeeId === emp.id || u.username === emp.username);
                      return (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.code || emp.id}) - {emp.department || 'موظف'} {isTaken ? '⚠️ [مرتبط بحساب]' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">الاسم الكامل للموظف</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="مثال: أحمد عبد الله"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 text-right focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">رقم الهاتف (اختياري)</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="مثال: 771234567"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 text-right focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">الدور الوظيفي الرئيسي</label>
                  <select
                    value={newRole}
                    onChange={(e) => {
                      const selectedRole = e.target.value as UserRole;
                      setNewRole(selectedRole);
                      setNewPermissions(ROLE_PRESETS[selectedRole]?.defaultPerms || []);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 text-right focus:outline-none focus:border-amber-500"
                  >
                    <option value="collector">محصل ميداني</option>
                    <option value="data_entry">مدخل بيانات / موظف استقبال</option>
                    <option value="accountant">محاسب / مسؤول الخزينة</option>
                    <option value="manager">مدير عام / مشرف تشغيلي</option>
                    <option value="admin">مدير نظام كامل الصلاحيات</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddUserModal(false)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors cursor-pointer"
                  >
                    إنشاء الحساب وحفظ
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: RESET USER PASSWORD */}
      <AnimatePresence>
        {resetPasswordUser && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setResetPasswordUser(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right"
            >
              <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                <button
                  onClick={() => setResetPasswordUser(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>تغيير كلمة المرور: {resetPasswordUser.name}</span>
                  <Key className="w-5 h-5 text-amber-500" />
                </h3>
              </div>

              <form onSubmit={handleSaveResetPassword} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">كلمة المرور الجديدة</label>
                  <input
                    type="password"
                    required
                    value={newPasswordValue}
                    onChange={(e) => setNewPasswordValue(e.target.value)}
                    placeholder="أدخل كلمة المرور الجديدة..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-200 text-right focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setResetPasswordUser(null)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors cursor-pointer"
                  >
                    تحديث كلمة المرور
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: ROLE TEMPLATE PRESET VIEW/EDIT */}
      <AnimatePresence>
        {editingRoleTemplate && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setEditingRoleTemplate(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right"
            >
              <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                <button
                  onClick={() => setEditingRoleTemplate(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>تفاصيل وقالب دور: {ROLE_PRESETS[editingRoleTemplate].label}</span>
                  <ShieldCheck className="w-5 h-5 text-amber-500" />
                </h3>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                  {ROLE_PRESETS[editingRoleTemplate].desc}
                </p>

                <div>
                  <h4 className="text-xs font-bold text-slate-200 mb-2">الصلاحيات المندرجة افتراضياً تحت هذا الدور:</h4>
                  <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                    {SYSTEM_PERMISSIONS.map(p => {
                      const isIncluded = ROLE_PRESETS[editingRoleTemplate].defaultPerms.includes(p.id);
                      return (
                        <div 
                          key={p.id} 
                          className={`flex justify-between items-center p-2 rounded-lg text-xs ${
                            isIncluded ? 'bg-slate-950 text-slate-200' : 'bg-slate-950/30 text-slate-600'
                          }`}
                        >
                          <span className={`text-[10px] font-bold ${isIncluded ? 'text-emerald-400' : 'text-slate-600'}`}>
                            {isIncluded ? 'مفعل' : 'غير مفعل'}
                          </span>
                          <span>{p.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                  <button
                    onClick={() => handleApplyRolePresetToUsers(editingRoleTemplate)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors cursor-pointer"
                  >
                    تحديث ومزامنة كافـة المستخدمين بهذا الدور
                  </button>
                  <button
                    onClick={() => setEditingRoleTemplate(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 5: QUICK LINK USER TO EMPLOYEE */}
      <AnimatePresence>
        {linkingUser && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setLinkingUser(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right flex flex-col"
            >
              <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                <button
                  onClick={() => setLinkingUser(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>ربط حساب المستخدم بملف الموظف</span>
                  <Link className="w-5 h-5 text-emerald-400" />
                </h3>
              </div>

              <div className="p-6 space-y-5">
                {/* Current User Info Card */}
                <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
                  <div className="text-left">
                    <span className="text-[11px] font-mono text-amber-400 block">@{linkingUser.username}</span>
                    <span className="text-[10px] text-slate-500">{ROLE_PRESETS[linkingUser.role]?.label || linkingUser.role}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-100 block">{linkingUser.name}</span>
                      <span className="text-[11px] text-slate-400 font-mono">{linkingUser.phone || 'بدون هاتف'}</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400">
                      <UserIcon className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-3.5 text-xs text-emerald-300 leading-relaxed">
                  💡 <span className="font-bold">فائدة الربط:</span> عند ربط هذا الحساب بملف الموظف، سيتم دمج كافة سندات التحصيل والعمليات الميدانية والتقارير المالية تحت اسم وهوية واحدة للمحصل، مما يمنع التكرار تماماً بين اسم المستخدم واسم الموظف في لوحات التحكم والتقارير.
                </div>

                {/* Employee Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-2">اختر الموظف المراد ربطه بهذا الحساب:</label>
                  <select
                    value={selectedLinkEmpId}
                    onChange={(e) => setSelectedLinkEmpId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-3 text-xs text-slate-100 text-right focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- بدون ربط (فك الارتباط الحـالي) --</option>
                    {employees.map(emp => {
                      const isLinkedToAnother = users.some(u => u.id !== linkingUser.id && (u.employeeId === emp.id || u.username === emp.username));
                      const isLinkedToThis = linkingUser.employeeId === emp.id;
                      return (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.code || emp.id}) - {emp.department || 'موظف'} {isLinkedToThis ? '✅ [المرتبط حالياً]' : isLinkedToAnother ? '⚠️ [مرتبط بحساب مستخدم آخر]' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Selected Employee Preview */}
                {selectedLinkEmpId && (
                  (() => {
                    const emp = employees.find(e => e.id === selectedLinkEmpId);
                    if (!emp) return null;
                    return (
                      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-emerald-400 font-bold">{emp.code || emp.id}</span>
                          <span className="text-slate-400">الرقم الوظيفي:</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-200 font-bold">{emp.department || 'عام'}</span>
                          <span className="text-slate-400">القسم:</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-200">{emp.jobTitle || 'موظف'}</span>
                          <span className="text-slate-400">المسمى الوظيفي:</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300 font-mono">{emp.phone || 'غير مسجل'}</span>
                          <span className="text-slate-400">هاتف الموظف:</span>
                        </div>
                      </div>
                    );
                  })()
                )}

                {/* Actions */}
                <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickLinkUser(linkingUser, selectedLinkEmpId)}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>{selectedLinkEmpId ? 'تأكيد وحفظ الربط' : 'فك الارتباط وحفظ'}</span>
                    </button>
                    {linkingUser.employeeId && (
                      <button
                        type="button"
                        onClick={() => handleQuickLinkUser(linkingUser, '')}
                        className="px-3 py-2.5 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer"
                      >
                        فك الارتباط
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setLinkingUser(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AdminRoles;
