import React, { useState, useRef, useMemo, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, Subscriber, MeterReading, Payment, SystemSettings, AuditLog, TariffType, UserRole, InventoryItem, InventoryTransaction,
  SmsTemplate, FailedSmsItem
} from '../types';
import { INITIAL_SMS_TEMPLATES, DEFAULT_SETTINGS } from '../initialData';
import { FinancialAreaChart, ZoneBarChart, RevenueExpenseChart } from './StatsCharts';
import { 
  syncNotificationStateToCloud, 
  subscribeNotificationStateFromCloud,
  deleteFailedSmsFromCloud,
  clearAllFailedSmsFromCloud,
  saveTariffsDirectlyToCloud,
  setLocalData
} from '../lib/database';
import { compressBase64Image, compressImageFile } from '../utils/imageCompressor';
import { sendSMSDirectly, parseSmsTemplate } from '../utils/smsService';
import { getExactSubscriberBalance, deriveOpeningFromCurrentBalance } from '../utils/balanceUtils';
import { 
  LayoutDashboard, Users, ShieldAlert, Database, Settings, ArrowRightLeft, 
  LogOut, Plus, Search, Trash2, Edit2, CheckCircle2, XCircle, AlertTriangle, 
  Download, Upload, RefreshCw, Key, Shield, UserPlus, Sliders, Check, HelpCircle, FileText, Calendar,
  Globe, Activity, FileCode, Menu, Lock, Unlock, MessageSquare, Tv, Terminal, UserCheck,
  BookOpen, Sparkles, Clock, Wallet, ChevronLeft, ChevronDown, Layers, Folder, FolderOpen,
  File, Info, AlertCircle, CheckSquare, Send, BarChart3, Map, Printer, Receipt, Banknote, ShieldCheck, UserX, ExternalLink,
  Bell, BellRing, Package, Wrench, Image, Camera, UploadCloud, Link, MapPin, Phone, Mail, Award, FileBadge, Building2, Zap, Volume2, VolumeX, Eye, ArrowLeft, Filter, Palette, Smartphone, X, Copy, RotateCcw 
} from 'lucide-react';
import { PermissionsModal } from './PermissionsModal';
import { AndroidSyncModal } from './AndroidSyncModal';

import { AdminInventory } from './AdminInventory';
import { AdminHR } from './AdminHR';
import { AdminAccounting } from './AdminAccounting';
import { AdminDatabase } from './AdminDatabase';
import { AdminSubscribers } from './AdminSubscribers';
import { AdminReports } from './AdminReports';
import { AdminDashboardOverview } from './AdminDashboardOverview';
import { AdminDebt } from './AdminDebt';
import { AdminOperations } from './AdminOperations';
import { AdminZones } from './AdminZones';
import { AdminRoles } from './AdminRoles';
import { AdminPartners } from './AdminPartners';
import { ThermalSettingsManager } from './ThermalSettingsManager';
import { StationDirectoryManager } from './StationDirectoryManager';
import { AdminSettingsTariff } from './AdminSettingsTariff';
import { AdminPostings } from './AdminPostings';
import { AdminSMSCenter } from './AdminSMSCenter';

const SectionLoadingFallback = () => (
  <div className="flex flex-col items-center justify-center py-20 px-4 text-center dir-rtl">
    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 mb-3 shadow-sm">
      <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
    </div>
    <h4 className="text-sm font-bold text-slate-700">جاري تحميل عناصر الصفحة...</h4>
    <p className="text-xs text-slate-400 mt-1">يتم تحميل بيانات القسم بشكل منفصل لسرعة الفتح والاستجابة</p>
  </div>
);

interface AdminDashboardProps {
  currentUser: User;
  onLogout: () => void;
  subscribers: Subscriber[];
  readings: MeterReading[];
  payments: Payment[];
  settings: SystemSettings;
  auditLogs: AuditLog[];
  inventory: InventoryItem[];
  inventoryTransactions: InventoryTransaction[];
  onUpdateInventory: (items: InventoryItem[]) => void;
  onUpdateInventoryTransactions: (txs: InventoryTransaction[]) => void;
  treasuryTransfers?: any[];
  onUpdateTreasuryTransfers?: (trfs: any[]) => void;
  expenses?: any[];
  onUpdateExpenses?: (exps: any[]) => void;
  purchases?: any[];
  onUpdatePurchases?: (purs: any[]) => void;
  manualJournalEntries?: any[];
  onUpdateManualJournalEntries?: (entries: any[]) => void;
  employees?: any[];
  onUpdateEmployees?: (emps: any[]) => void;
  employeeTxs?: any[];
  onUpdateEmployeeTxs?: (txs: any[]) => void;
  connections?: any[];
  onUpdateConnections?: (conns: any[]) => void;
  techRequests?: any[];
  onUpdateTechRequests?: (reqs: any[]) => void;
  smsTemplates?: SmsTemplate[];
  onUpdateSmsTemplates?: (templates: SmsTemplate[]) => void;
  onSaveSmsTemplate?: (template: SmsTemplate) => void;
  onDeleteSmsTemplate?: (id: string) => void;
  onClearAllSmsTemplates?: () => void;
  users: User[];
  onUpdateSubscribers: (subs: Subscriber[]) => void;
  onUpdateReadings: (reads: MeterReading[]) => void;
  onUpdatePayments: (pays: Payment[]) => void;
  onUpdateSettings: (settings: SystemSettings) => void;
  onUpdateUsers: (users: User[]) => void;
  onAddAuditLog: (log: AuditLog) => void;
  onClearAuditLogs?: () => void;

  onResetDatabase: () => void;
  onWipeAllData?: () => void;
  failedSms?: FailedSmsItem[];
  onDeleteFailedSms?: (id: string, type?: 'reading' | 'payment') => void;
  onClearAllFailedSms?: () => void;
  partners?: any[];
  onUpdatePartners?: (partners: any[]) => void;
  partnerTransactions?: any[];
  onUpdatePartnerTransactions?: (txs: any[]) => void;
  profitDistributions?: any[];
  onUpdateProfitDistributions?: (dists: any[]) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onLogout,
  subscribers,
  readings,
  payments,
  settings,
  auditLogs,
  users,
  onUpdateSubscribers,
  onUpdateReadings,
  onUpdatePayments,
  onUpdateSettings,
  onUpdateUsers,
  onAddAuditLog,
  onClearAuditLogs,
  onResetDatabase,
  onWipeAllData,
  inventory,
  inventoryTransactions,
  onUpdateInventory,
  onUpdateInventoryTransactions,
  treasuryTransfers = [],
  onUpdateTreasuryTransfers,
  expenses = [],
  onUpdateExpenses,
  purchases = [],
  onUpdatePurchases,
  manualJournalEntries = [],
  onUpdateManualJournalEntries,
  employees = [],
  onUpdateEmployees,
  employeeTxs = [],
  onUpdateEmployeeTxs,
  connections = [],
  onUpdateConnections,
  techRequests = [],
  onUpdateTechRequests,
  smsTemplates: propSmsTemplates = [],
  onUpdateSmsTemplates,
  onSaveSmsTemplate,
  onDeleteSmsTemplate,
  onClearAllSmsTemplates,
  failedSms = [],
  onDeleteFailedSms,
  onClearAllFailedSms,
  partners = [],
  onUpdatePartners,
  partnerTransactions = [],
  onUpdatePartnerTransactions,
  profitDistributions = [],
  onUpdateProfitDistributions,
}) => {
  // Main Sections
  type ActiveSection = 'dashboard' | 'subscribers' | 'accounting' | 'debt' | 'zones' | 'roles' | 'inventory' | 'inventory-alerts' | 'inventory-catalog' | 'inventory-transactions' | 'hr-employees' | 'hr-payroll' | 'operations-requests' | 'operations-zones' | 'admin-db' | 'admin-security' | 'admin-settings' | 'station-directory' | 'admin-postings' | 'admin-services' | 'system' | 'sms-templates' | 'sms-subscriptions' | 'sms-send' | 'sms-failed' | 'sms-outbox' | 'sms-gateway' | 'sms-android' | 'android-app' | 'treasury-boxes' | 'treasury-transfers' | 'treasury-statements' | 'treasury-performance' | 'treasury-daily' | 'reporting-subscribers' | 'reporting-financial' | 'reporting-inventory' | 'reporting-hr' | 'reporting-executive' | 'reporting-consumption' | 'reporting-debt' | 'reporting-loss' | 'reporting-statements' | 'reporting-due-balances' | 'partners';
  
  const getInitialSection = (): ActiveSection => {
    const hash = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '';
    return hash ? (hash as ActiveSection) : 'dashboard';
  };

  const [activeSection, setActiveSectionState] = useState<ActiveSection>(getInitialSection);

  const setActiveSection = (section: ActiveSection) => {
    setActiveSectionState(section);
    if (typeof window !== 'undefined') {
      window.location.hash = section;
    }
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        setActiveSectionState(hash as ActiveSection);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showAndroidSyncModal, setShowAndroidSyncModal] = useState(false);
  const [showResetDefaultsModal, setShowResetDefaultsModal] = useState(false);
  const [saveToastMessage, setSaveToastMessage] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Interactive Tariff Simulator State
  const [calcSimKwh, setCalcSimKwh] = useState<number>(100);
  const [calcSimSector, setCalcSimSector] = useState<'residential' | 'commercial' | 'industrial'>('residential');

  // Compute System Configuration Health Score
  const systemHealthScore = useMemo(() => {
    let score = 0;
    const totalChecks = 7;
    if (settings.stationName && settings.stationName.trim().length > 2) score++;
    if (settings.phone && settings.phone.trim().length > 4) score++;
    if (settings.tariffs?.residential > 0) score++;
    if (settings.tariffs?.commercial > 0) score++;
    if (settings.tariffs?.industrial > 0) score++;
    if (settings.fixedFee >= 0 && settings.serviceFee >= 0) score++;
    if (settings.currency && settings.currency.trim().length > 0) score++;
    return Math.round((score / totalChecks) * 100);
  }, [settings]);

  // Render System Admin Header Navigation Tabs
  const renderSystemAdminHeader = (currentSec: string) => {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4 mb-6 text-right">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-amber-400 rounded-2xl border border-amber-500/30 shadow-lg shadow-amber-500/5">
              <Settings className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-white">مركز إدارة النظام والإعدادات العامة</h2>
                <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full text-[10px] font-bold">
                  v2.5 System Admin
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 ${
                  systemHealthScore >= 90 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                    : systemHealthScore >= 60 
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' 
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${systemHealthScore >= 90 ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  جاهزية الإعدادات: {systemHealthScore}%
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                التحكم الشامل في هوية ودليل المحطة، تعرفة الكهرباء والشرائح، المستخدمين، الأمان، والنسخ الاحتياطي.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowResetDefaultsModal(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer border border-slate-700 flex items-center gap-1.5"
              title="استعادة الإعدادات الافتراضية"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>إعادة ضبط المصنع</span>
            </button>

            <button
              type="button"
              onClick={(e) => handleSaveSettings(e)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 px-5 rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-amber-500/20 flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>حفظ وتطبيق التغييرات</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveSection('station-directory')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              currentSec === 'station-directory' || currentSec === 'system'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>تخصيص المظهر وخدمات إضافية</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('admin-settings')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              currentSec === 'admin-settings'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>تعرفة الكهرباء والأسعار</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('roles')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              currentSec === 'roles'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>المستخدمين والصلاحيات</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('admin-db')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              currentSec === 'admin-db'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>قواعد البيانات والنسخ الاحتياطي</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('admin-security')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              currentSec === 'admin-security'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>الأمان وسجل التدقيق</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('admin-services')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              currentSec === 'admin-services'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>إعدادات السندات الحرارية</span>
          </button>
        </div>
      </div>
    );
  };
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    subscribers: false,
    finance: false,
    sms: false,
    system: false,
    inventory: false,
    treasury: false,
    hr: false,
    operations: false,
    reporting: false
  });
  
  const toggleMenu = (menu: string) => {
    setExpandedMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
  };

  // Sidebar responsive toggle
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isManagerOrAdmin = currentUser.role === 'admin' || currentUser.role === 'manager';
  const isAccountant = currentUser.role === 'accountant';
  const isDataEntry = currentUser.role === 'data_entry';
  const canSeeSubscribers = isManagerOrAdmin || isAccountant || isDataEntry;
  const canSeeFinance = isManagerOrAdmin || isAccountant;
  const canSeeInventory = isManagerOrAdmin || isDataEntry;
  const canSeeHR = isManagerOrAdmin;
  const canSeeOperations = isManagerOrAdmin || isDataEntry;
  const canSeeReporting = isManagerOrAdmin || isAccountant;
  const canSeeSMS = isManagerOrAdmin || isAccountant;
  const canSeeSystemAdmin = isManagerOrAdmin;

  const getRoleName = (r: string) => {
    switch(r) {
      case 'admin': return 'مدير نظام';
      case 'manager': return 'مدير عام';
      case 'accountant': return 'محاسب';
      case 'data_entry': return 'مدخل بيانات';
      case 'collector': return 'محصل ميداني';
      default: return r;
    }
  };

  // Search/Filters
  const [subSearch, setSubSearch] = useState('');
  const [selectedSubForLedger, setSelectedSubForLedger] = useState<Subscriber | null>(null);

  // SMS Management State
  const [smsTemplates, setSmsTemplates] = useState<SmsTemplate[]>(() => {
    return propSmsTemplates || [];
  });

  useEffect(() => {
    if (propSmsTemplates) {
      setSmsTemplates(propSmsTemplates);
    }
  }, [propSmsTemplates]);

  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTemplateContent, setEditingTemplateContent] = useState('');
  const [showAddTemplateModal, setShowAddTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');
  const [newTemplateType, setNewTemplateType] = useState<'reading' | 'payment' | 'reminder' | 'custom'>('custom');
  const [smsSaveSuccessNotice, setSmsSaveSuccessNotice] = useState<string | null>(null);
  const [smsSelectedSubs, setSmsSelectedSubs] = useState<string[]>([]);
  const [smsMessage, setSmsMessage] = useState('');
  const [smsSearchQuery, setSmsSearchQuery] = useState('');
  const [isSendingSequence, setIsSendingSequence] = useState(false);
  const [smsQueueIndex, setSmsQueueIndex] = useState(0);

  // Failed SMS Template Controls & Preview State
  const [failedReadingTemplateId, setFailedReadingTemplateId] = useState<string>('1');
  const [failedPaymentTemplateId, setFailedPaymentTemplateId] = useState<string>('2');
  const [previewSmsModal, setPreviewSmsModal] = useState<{
    title: string;
    recipientName: string;
    phone: string;
    content: string;
    templateName: string;
    onSend?: () => void;
  } | null>(null);
  const [failedBatchType, setFailedBatchType] = useState<'reading' | 'payment' | null>(null);
  const [failedBatchIndex, setFailedBatchIndex] = useState(0);
  const [failedReadingSearch, setFailedReadingSearch] = useState('');
  const [failedPaymentSearch, setFailedPaymentSearch] = useState('');

  // Enhanced Postings & Transfers State
  const [postingSubTab, setPostingSubTab] = useState<'pending' | 'posted' | 'rejected' | 'collectors' | 'audit_log'>('pending');
  const [postingSearch, setPostingSearch] = useState('');
  const [postingCollectorFilter, setPostingCollectorFilter] = useState('all');
  const [postingDateFilter, setPostingDateFilter] = useState('');
  const [selectedReadingIds, setSelectedReadingIds] = useState<string[]>([]);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);
  const [rejectModalItem, setRejectModalItem] = useState<{ type: 'reading' | 'payment', id: string, name: string } | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');


  // Advanced Subscribers UI State
  const [subscriberViewMode, setSubscriberViewMode] = useState<'table' | 'grid'>('table');
  const [subscriberFilterZone, setSubscriberFilterZone] = useState<string>('all');
  const [subscriberFilterStatus, setSubscriberFilterStatus] = useState<string>('all');
  const [subscriberFilterTariff, setSubscriberFilterTariff] = useState<string>('all');
  const [selectedSubscribersIds, setSelectedSubscribersIds] = useState<string[]>([]);
  
  // New Subscriber Modal / Form State
  const [showAddSubModal, setShowAddSubModal] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubPhone, setNewSubPhone] = useState('');
  const [newSubMeter, setNewSubMeter] = useState('');
  const [newSubZone, setNewSubZone] = useState('المنطقة (أ) - وسط المدينة');
  const [newSubTransformer, setNewSubTransformer] = useState("");
  const [newSubTariff, setNewSubTariff] = useState<TariffType>('residential');
  const [newSubInitial, setNewSubInitial] = useState('');
  const [newSubOpeningBalance, setNewSubOpeningBalance] = useState('');

  // Editing Subscriber State
  const [editingSub, setEditingSub] = useState<Subscriber | null>(null);

  // New User Form State
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('collector');

  // File Upload Ref for DB Restore
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- SYSTEM MANAGEMENT RICH STATES (إدارة النظام) ---
  const [systemStyle, setSystemStyle] = useState<'amber' | 'emerald' | 'ocean' | 'crimson'>('amber');
  const [selectedSysFolder, setSelectedSysFolder] = useState<string>('db');
  const [selectedSysAction, setSelectedSysAction] = useState<string>('about');
  const [customDbName, setCustomDbName] = useState<string>('');
  const [createdDatabases, setCreatedDatabases] = useState<string[]>(['VOLTERA_MAIN_SQL', 'VOLTERA_DEMO_RECOVERY']);
  const [activeDb, setActiveDb] = useState<string>('VOLTERA_MAIN_SQL');
  const [operationsLocked, setOperationsLocked] = useState<boolean>(false);
  const [printFooterText, setPrintFooterText] = useState<string>('شكراً لكم لتعاملكم معنا. الرجاء السداد خلال 5 أيام لتفادي فصل الخدمة.');
  const [smsGateway, setSmsGateway] = useState<string>('https://api.sms-gateway.yemen/v1/send');
  const [smsApiKey, setSmsApiKey] = useState<string>('voltera_sms_secret_token_12345');
  const [smsTemplate, setSmsTemplate] = useState<string>('عزيزي المشترك {name}، فاتورتك لشهر {month} هي {amount} {currency}، نأمل السداد.');
  const [currentPasswordInput, setCurrentPasswordInput] = useState<string>('');
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('');
  const [dictionary, setDictionary] = useState<Array<{ key: string; ar: string; en: string }>>([
    { key: 'Subscriber', ar: 'مشترك', en: 'Subscriber' },
    { key: 'Balance', ar: 'رصيد', en: 'Balance' },
    { key: 'Active', ar: 'نشط', en: 'Active' },
    { key: 'Suspended', ar: 'موقف', en: 'Suspended' },
    { key: 'Collector', ar: 'محصل', en: 'Collector' },
    { key: 'Invoice', ar: 'فاتورة', en: 'Invoice' }
  ]);
  const [editDictIndex, setEditDictIndex] = useState<number | null>(null);
  const [editDictAr, setEditDictAr] = useState<string>('');
  const [editDictEn, setEditDictEn] = useState<string>('');
  const [integrityErrors, setIntegrityErrors] = useState<string[]>([]);

  // Helper audit log triggers
  const logAction = (action: string, details: string) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      userId: currentUser.id,
      username: currentUser.username,
      action,
      details,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    onAddAuditLog(newLog);
  };

  const [showNotifications, setShowNotifications] = useState(false);
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('voltera_read_notifs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [dismissedNotifIds, setDismissedNotifIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('voltera_dismissed_notifs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Subscribe to cloud notifications state from Cloud Database
  useEffect(() => {
    const unsub = subscribeNotificationStateFromCloud((cloudState) => {
      if (cloudState) {
        if (Array.isArray(cloudState.readIds)) {
          setReadNotifIds(cloudState.readIds);
          localStorage.setItem('voltera_read_notifs', JSON.stringify(cloudState.readIds));
        }
        if (Array.isArray(cloudState.dismissedIds)) {
          setDismissedNotifIds(cloudState.dismissedIds);
          localStorage.setItem('voltera_dismissed_notifs', JSON.stringify(cloudState.dismissedIds));
        }
      }
    });
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const [notifTab, setNotifTab] = useState<'all' | 'unread' | 'urgent'>('all');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('voltera_notif_sound') !== 'disabled';
  });

  const toggleNotifSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('voltera_notif_sound', next ? 'enabled' : 'disabled');
  };

  const playNotifChime = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {
      // Audio context silently handled
    }
  };

  type NotificationType = 'high_consumption' | 'high_payment' | 'pending_readings' | 'pending_payments' | 'low_inventory' | 'suspended_debt' | 'tech_request';

  interface AdminNotification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    time: string;
    priority: 'high' | 'medium' | 'info';
    targetSection: ActiveSection;
    isRead: boolean;
  }

  const allGeneratedNotifications = useMemo(() => {
    const notifs: AdminNotification[] = [];

    // 1. High consumption readings
    const highReadings = readings.filter(r => r.consumption > 1000 && !r.isPosted);
    highReadings.forEach(r => {
      notifs.push({
        id: `notif-read-${r.id}`,
        type: 'high_consumption',
        title: 'استهلاك مرتفع جداً',
        message: `قراءة استهلاك كبرى (${r.consumption} ك.و) للمشترك ${r.subscriberName} بواسطة ${r.enteredBy}`,
        time: r.readingDate || new Date().toISOString().substring(0, 16).replace('T', ' '),
        priority: 'high',
        targetSection: 'admin-postings',
        isRead: readNotifIds.includes(`notif-read-${r.id}`)
      });
    });

    // 2. High payment receipts
    const highPayments = payments.filter(p => p.amountPaid >= 500000 && !p.isPosted);
    highPayments.forEach(p => {
      notifs.push({
        id: `notif-pay-${p.id}`,
        type: 'high_payment',
        title: 'تحصيل مالي ضخم',
        message: `سند قبض نقدي كبير (${p.amountPaid.toLocaleString()} ${settings.currency}) للمشترك ${p.subscriberName} بواسطة ${p.receivedBy}`,
        time: p.paymentDate || new Date().toISOString().substring(0, 16).replace('T', ' '),
        priority: 'high',
        targetSection: 'admin-postings',
        isRead: readNotifIds.includes(`notif-pay-${p.id}`)
      });
    });

    // 3. Pending readings waiting for posting
    const pendingReadsCount = readings.filter(r => !r.isPosted && !r.isRejected).length;
    if (pendingReadsCount > 0) {
      notifs.push({
        id: `notif-pending-readings-summary`,
        type: 'pending_readings',
        title: 'قراءات بانتظار الاعتماد والترحيل',
        message: `يوجد عدد (${pendingReadsCount}) قراءة عداد جديدة مدخلة بانتظار الترحيل المالي وتنزيل الفواتير.`,
        time: new Date().toISOString().substring(0, 16).replace('T', ' '),
        priority: 'medium',
        targetSection: 'admin-postings',
        isRead: readNotifIds.includes(`notif-pending-readings-summary`)
      });
    }

    // 4. Pending payments waiting for posting
    const pendingPaysCount = payments.filter(p => !p.isPosted && !p.isRejected).length;
    if (pendingPaysCount > 0) {
      notifs.push({
        id: `notif-pending-payments-summary`,
        type: 'pending_payments',
        title: 'سندات بانتظار الترحيل والتوريد',
        message: `يوجد عدد (${pendingPaysCount}) سند تحصيل قبض نقدي بانتظار المراجعة والترحيل للخزينة.`,
        time: new Date().toISOString().substring(0, 16).replace('T', ' '),
        priority: 'medium',
        targetSection: 'admin-postings',
        isRead: readNotifIds.includes(`notif-pending-payments-summary`)
      });
    }

    // 5. Low inventory alert
    const lowInventory = inventory.filter(i => i.quantity <= i.minAlertLevel);
    lowInventory.forEach(item => {
      notifs.push({
        id: `notif-inv-${item.id}`,
        type: 'low_inventory',
        title: 'تنبيه المخزون والمعدات',
        message: `الصنف (${item.name}) شارف على النفاذ! المتبقي (${item.quantity} ${item.unit})، حد التنبيه (${item.minAlertLevel}).`,
        time: item.lastUpdated || new Date().toISOString().substring(0, 16).replace('T', ' '),
        priority: 'high',
        targetSection: 'inventory-alerts',
        isRead: readNotifIds.includes(`notif-inv-${item.id}`)
      });
    });

    // 6. High debt & suspended users
    const suspendedWithDebt = subscribers.filter(s => s.status === 'suspended' && s.currentBalance >= 500000);
    suspendedWithDebt.forEach(s => {
      notifs.push({
        id: `notif-susp-${s.id}`,
        type: 'suspended_debt',
        title: 'تجاوز السقف الائتماني',
        message: `المشترك ${s.name} موقوف لتجاوز السقف الائتماني (${s.currentBalance.toLocaleString()} ${settings.currency})`,
        time: new Date().toISOString().substring(0, 16).replace('T', ' '),
        priority: 'high',
        targetSection: 'debt',
        isRead: readNotifIds.includes(`notif-susp-${s.id}`)
      });
    });

    // 7. Pending Technical/Service requests
    const pendingTech = (techRequests || []).filter(t => t.status === 'pending' || t.status === 'قيد الانتظار');
    pendingTech.forEach(tr => {
      notifs.push({
        id: `notif-tech-${tr.id}`,
        type: 'tech_request',
        title: 'طلب صيانة/خدمات جديد',
        message: `طلب خدمات فنية (${tr.requestType || 'صيانة عداد'}) للمشترك (${tr.subscriberName || 'عام'})`,
        time: tr.requestDate || new Date().toISOString().substring(0, 16).replace('T', ' '),
        priority: 'medium',
        targetSection: 'operations-requests',
        isRead: readNotifIds.includes(`notif-tech-${tr.id}`)
      });
    });

    // Exclude dismissed items
    return notifs.filter(n => !dismissedNotifIds.includes(n.id)).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [readings, payments, subscribers, settings.currency, inventory, techRequests, readNotifIds, dismissedNotifIds]);

  const unreadCount = useMemo(() => {
    return allGeneratedNotifications.filter(n => !n.isRead).length;
  }, [allGeneratedNotifications]);

  const adminNotifications = useMemo(() => {
    if (notifTab === 'unread') {
      return allGeneratedNotifications.filter(n => !n.isRead);
    }
    if (notifTab === 'urgent') {
      return allGeneratedNotifications.filter(n => n.priority === 'high');
    }
    return allGeneratedNotifications;
  }, [allGeneratedNotifications, notifTab]);

  const handleMarkAsRead = (id: string) => {
    if (!readNotifIds.includes(id)) {
      const updated = [...readNotifIds, id];
      setReadNotifIds(updated);
      localStorage.setItem('voltera_read_notifs', JSON.stringify(updated));
      syncNotificationStateToCloud({ readIds: updated, dismissedIds: dismissedNotifIds });
    }
  };

  const handleMarkAllAsRead = () => {
    const allIds = Array.from(new Set([...readNotifIds, ...allGeneratedNotifications.map(n => n.id)]));
    setReadNotifIds(allIds);
    localStorage.setItem('voltera_read_notifs', JSON.stringify(allIds));
    syncNotificationStateToCloud({ readIds: allIds, dismissedIds: dismissedNotifIds });
  };

  const handleDismissNotif = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = [...dismissedNotifIds, id];
    setDismissedNotifIds(updated);
    localStorage.setItem('voltera_dismissed_notifs', JSON.stringify(updated));
    syncNotificationStateToCloud({ readIds: readNotifIds, dismissedIds: updated });
  };

  const handleClearAllNotifs = () => {
    const allIds = Array.from(new Set([...dismissedNotifIds, ...allGeneratedNotifications.map(n => n.id)]));
    setDismissedNotifIds(allIds);
    localStorage.setItem('voltera_dismissed_notifs', JSON.stringify(allIds));
    syncNotificationStateToCloud({ readIds: readNotifIds, dismissedIds: allIds });
  };

  const handleNotifClick = (notif: AdminNotification) => {
    handleMarkAsRead(notif.id);
    setShowNotifications(false);
    if (notif.targetSection) {
      setActiveSection(notif.targetSection);
    }
  };

  // --- STATISTICS CALCULATIONS ---
  const activeSubs = subscribers.filter(s => s.status === 'active');
  
  // Gross Total Receivables / Billed Amount (without deducting payments)
  const totalGrossBilled = useMemo(() => {
    const readingsTotal = readings.filter(r => !r.isRejected).reduce((sum, r) => sum + (r.totalAmount || 0), 0);
    const openingTotal = subscribers.reduce((sum, s) => sum + (s.openingBalance || 0), 0);
    return readingsTotal + openingTotal;
  }, [readings, subscribers]);

  const totalBalance = useMemo(() => {
    return subscribers.reduce((sum, sub) => {
      const liveBal = getExactSubscriberBalance(sub, readings, payments);
      return sum + (liveBal > 0 ? liveBal : 0);
    }, 0);
  }, [subscribers, readings, payments]);
  
  // Consumption from posted readings
  const postedReadings = readings.filter(r => r.isPosted);
  const totalPowerConsumed = postedReadings.reduce((sum, r) => sum + r.consumption, 0);

  // Invoicing and Collections
  const totalBilled = readings.reduce((sum, r) => sum + r.totalAmount, 0);
  const totalCollected = payments.reduce((sum, p) => sum + p.amountPaid, 0);
  const collectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;

  // Zone statistics for charts
  const zonesList = Array.from(new Set(subscribers.map(s => s.zone)));
  const zoneChartData = zonesList.map(zone => {
    const zoneSubs = subscribers.filter(s => s.zone === zone);
    const zoneReads = readings.filter(r => r.isPosted && zoneSubs.some(s => s.id === r.subscriberId));
    const totalZoneConsumption = zoneReads.reduce((sum, r) => sum + r.consumption, 0);
    return {
      zone,
      active: zoneSubs.filter(s => s.status === 'active').length,
      consumption: totalZoneConsumption
    };
  });

  // Dynamically compute recent months from Cloud Database records
  const dynamicMonths = useMemo(() => {
    const monthSet = new Set<string>();

    // Collect from readings
    readings.forEach(r => {
      if (r.billingMonth && r.billingMonth.length >= 7) monthSet.add(r.billingMonth.substring(0, 7));
      if (r.readingDate && r.readingDate.length >= 7) monthSet.add(r.readingDate.substring(0, 7));
    });
    // Collect from payments
    payments.forEach(p => {
      if (p.paymentDate && p.paymentDate.length >= 7) monthSet.add(p.paymentDate.substring(0, 7));
    });
    // Collect from expenses
    (expenses || []).forEach(e => {
      if (e.date && e.date.length >= 7) monthSet.add(e.date.substring(0, 7));
    });
    // Collect from purchases
    (purchases || []).forEach(p => {
      if (p.date && p.date.length >= 7) monthSet.add(p.date.substring(0, 7));
    });

    // Ensure at least the last 4 calendar months are present
    const now = new Date();
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      monthSet.add(`${yyyy}-${mm}`);
    }

    // Sort chronologically and take the last 6 months
    return Array.from(monthSet).sort().slice(-6);
  }, [readings, payments, expenses, purchases]);

  const formatMonthLabel = (mStr: string) => {
    const parts = mStr.split('-');
    if (parts.length < 2) return mStr;
    const year = parseInt(parts[0], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    const monthNamesAr = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    return monthNamesAr[monthIdx] ? `${monthNamesAr[monthIdx]} ${year}` : mStr;
  };

  const financialChartData = dynamicMonths.map(m => {
    const monthReads = readings.filter(r => (r.billingMonth === m) || (r.readingDate && r.readingDate.startsWith(m)));
    const monthBilled = monthReads.reduce((sum, r) => sum + r.totalAmount, 0);

    const monthPays = payments.filter(p => p.paymentDate && p.paymentDate.startsWith(m));
    const monthCollected = monthPays.reduce((sum, p) => sum + p.amountPaid, 0);

    return {
      label: formatMonthLabel(m),
      billed: monthBilled,
      collected: monthCollected
    };
  });

  const revExpData = dynamicMonths.map(m => {
    const monthPays = payments.filter(p => p.paymentDate && p.paymentDate.startsWith(m));
    const paysRevenue = monthPays.reduce((sum, p) => sum + p.amountPaid, 0);

    const monthConns = (connections || []).filter(c => c.date && c.date.startsWith(m) && c.status === 'completed');
    const connsRevenue = monthConns.reduce((sum, c) => sum + (c.paidAmount || 0), 0);

    const revenue = paysRevenue + connsRevenue;

    const monthExps = (expenses || []).filter(e => e.date && e.date.startsWith(m));
    const expTotal = monthExps.reduce((sum, e) => sum + e.amount, 0);

    const monthPurchs = (purchases || []).filter(p => p.date && p.date.startsWith(m));
    const purchTotal = monthPurchs.reduce((sum, p) => sum + p.amount, 0);

    const monthEmpTxs = (employeeTxs || []).filter(tx => tx.date && tx.date.startsWith(m));
    const empTotal = monthEmpTxs.reduce((sum, tx) => sum + tx.amount, 0);

    const expense = expTotal + purchTotal + empTotal;

    return {
      label: formatMonthLabel(m),
      revenue,
      expense
    };
  });


  // --- ACTION HANDLERS ---

  // Add Subscriber
  const handleAddSubscriber = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim() || !newSubMeter.trim()) return;

    const cleanMeter = newSubMeter.trim();
    // Check if meter exists
    if (subscribers.some(s => (s.meterNumber || '').trim().toLowerCase() === cleanMeter.toLowerCase())) {
      alert('خطأ: رقم العداد هذا مسجل مسبقاً لمشترك آخر!');
      return;
    }

    const initVal = parseFloat(newSubInitial) || 0;
    const openingBal = parseFloat(newSubOpeningBalance) || 0;
    const nowId = Date.now().toString();
    const newSub: Subscriber = {
      id: nowId,
      subscriberCode: `SUB-${nowId}`,
      name: newSubName.trim(),
      phone: newSubPhone.trim() || '000000000',
      meterNumber: cleanMeter,
      zone: newSubZone || 'المنطقة الرئيسية',
      transformer: newSubTransformer || '',
      tariffType: newSubTariff || 'commercial',
      status: 'active',
      initialReading: initVal,
      currentReading: initVal,
      openingBalance: openingBal,
      currentBalance: openingBal,
      createdAt: new Date().toISOString()
    };

    onUpdateSubscribers([newSub, ...subscribers]);
    logAction('إضافة مشترك جديد', `تم تسجيل المشترك: ${newSub.name}، عداد رقم: ${newSub.meterNumber}`);
    
    // Clear Form & Close
    setNewSubName('');
    setNewSubPhone('');
    setNewSubMeter('');
    setNewSubInitial('');
    setNewSubOpeningBalance('');
    setShowAddSubModal(false);
  };

  // Toggle subscriber status (Active/Suspended)
  const toggleSubStatus = (sub: Subscriber) => {
    const updated = subscribers.map(s => {
      if (s.id === sub.id) {
        const nextStatus = s.status === 'active' ? 'suspended' : 'active';
        logAction('تعديل حالة مشترك', `تغيير حالة المشترك ${s.name} إلى: ${nextStatus === 'active' ? 'نشط' : 'موقف'}`);
        return { ...s, status: nextStatus };
      }
      return s;
    });
    onUpdateSubscribers(updated);
  };

  // Edit subscriber details
  const saveSubEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSub) return;

    const cleanMeter = (editingSub.meterNumber || '').trim();
    if (!editingSub.name || !cleanMeter) {
      alert('الاسم ورقم العداد مطلوبان.');
      return;
    }

    const isDuplicate = subscribers.some(s => s.id !== editingSub.id && s.meterNumber.trim().toLowerCase() === cleanMeter.toLowerCase());
    if (isDuplicate) {
      alert(`خطأ: رقم العداد "${cleanMeter}" مستخدم مسبقاً لمشترك آخر! لا يمكن تكرار رقم العداد.`);
      return;
    }

    const initReading = Number(editingSub.initialReading) || 0;
    const currReading = Number(editingSub.currentReading);
    const updatedSub: Subscriber = { 
      ...editingSub, 
      meterNumber: cleanMeter,
      initialReading: initReading,
      currentReading: !isNaN(currReading) && currReading >= initReading ? currReading : initReading
    };
    const updated = subscribers.map(s => {
      if (s.id === editingSub.id) {
        logAction('تعديل بيانات مشترك', `تعديل بيانات المشترك ${editingSub.name} (قراءة افتتاحية: ${initReading})`);
        return updatedSub;
      }
      return s;
    });
    onUpdateSubscribers(updated);
    setEditingSub(null);
  };

  // Delete/Remove subscriber
  const deleteSubscriber = (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من حذف المشترك "${name}" تماماً من النظام؟ ستفقد كافة بيانات العداد المترابطة.`)) {
      onUpdateSubscribers(subscribers.filter(s => s.id !== id));
      logAction('حذف مشترك', `حذف المشترك ${name} من قاعدة البيانات`);
    }
  };

  // Add User (Collector/Admin)
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword || !newUserFullName) return;

    if (users.some(u => u.username.toLowerCase() === newUsername.toLowerCase().trim())) {
      alert('خطأ: اسم المستخدم هذا مستخدم بالفعل!');
      return;
    }

    const newUser: User = {
      id: `u-${Date.now()}`,
      username: newUsername.trim().toLowerCase(),
      passwordHash: newPassword,
      role: newUserRole,
      name: newUserFullName,
      status: 'active',
      permissions: newUserRole === 'admin' ? ['all_permissions'] : ['read_readings', 'write_readings', 'write_payments'],
      createdAt: new Date().toISOString().substring(0, 16).replace('T', ' ')
    };

    onUpdateUsers([...users, newUser]);
    logAction('إنشاء حساب مستخدم', `إضافة حساب جديد: ${newUserFullName} بصفة ${newUserRole === 'admin' ? 'مدير' : 'محصل'}`);

    setNewUsername('');
    setNewPassword('');
    setNewUserFullName('');
  };

  // Toggle user status (Active/Suspended)
  const toggleUserStatus = (u: User) => {
    if (u.id === currentUser.id) {
      alert('خطأ: لا يمكنك إيقاف حسابك الفعال الذي تسجل به الدخول حالياً!');
      return;
    }
    const updated = users.map(user => {
      if (user.id === u.id) {
        const nextStatus = user.status === 'active' ? 'suspended' : 'active';
        logAction('تغيير حالة مستخدم', `تغيير حالة حساب ${user.name} إلى ${nextStatus === 'active' ? 'فعال' : 'موقف'}`);
        return { ...user, status: nextStatus };
      }
      return user;
    });
    onUpdateUsers(updated);
  };

  // Handle Station Logo File Upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('حجم الصورة كبير جداً. يرجى اختيار ملف صورة بحجم أقل من 10 ميجابايت.');
        return;
      }
      try {
        const compressedBase64 = await compressImageFile(file, 250, 250, 0.80);
        onUpdateSettings({
          ...settings,
          logoUrl: compressedBase64
        });
      } catch (err) {
        console.error('Failed to compress logo image:', err);
      }
    }
  };

  // Electricity Tariffs Form & Database Persistence State
  const [tariffFormData, setTariffFormData] = useState<SystemSettings>(settings);
  const [isSavingTariffsToDb, setIsSavingTariffsToDb] = useState(false);

  useEffect(() => {
    setTariffFormData(settings);
  }, [settings]);

  // Save electricity tariffs directly to Cloud Firestore Database
  const handleSaveTariffsToDatabase = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && typeof (e as any).preventDefault === 'function') {
      (e as any).preventDefault();
    }
    setIsSavingTariffsToDb(true);
    try {
      let updatedSettings = { ...tariffFormData };
      if (updatedSettings.logoUrl && updatedSettings.logoUrl.startsWith('data:image') && updatedSettings.logoUrl.length > 150000) {
        updatedSettings.logoUrl = await compressBase64Image(updatedSettings.logoUrl, 250, 250, 0.85);
      }
      
      // Save directly into Firestore database
      await saveTariffsDirectlyToCloud({
        tariffs: updatedSettings.tariffs,
        fixedFee: updatedSettings.fixedFee,
        serviceFee: updatedSettings.serviceFee,
        taxPercent: updatedSettings.taxPercent,
        meterInsuranceDeposit: updatedSettings.meterInsuranceDeposit,
        readingCycleIntervalDays: updatedSettings.readingCycleIntervalDays,
        readingCycleMode: updatedSettings.readingCycleMode,
        currency: updatedSettings.currency,
        stationName: updatedSettings.stationName,
      }, updatedSettings);

      // Trigger app state update
      onUpdateSettings(updatedSettings);

      logAction('تعديل تعرفة الكهرباء في قاعدة البيانات', `تم حفظ وتثبيت تعرفة الكهرباء مباشرة في قاعدة البيانات السحابية Firestore (سكني: ${updatedSettings.tariffs.residential}، تجاري: ${updatedSettings.tariffs.commercial}، صناعي: ${updatedSettings.tariffs.industrial})`);

      setSaveToastMessage(`⚡ تم حفظ تعرفة الكهرباء ورسوم المحطة مباشرة في قاعدة البيانات السحابية (Firestore) بنجاح!`);
      setTimeout(() => setSaveToastMessage(null), 5000);
    } catch (err: any) {
      console.error('Failed to save tariffs to Firestore database:', err);
      alert('حدث خطأ أثناء الحفظ في قاعدة البيانات: ' + (err?.message || 'يرجى التحقق من اتصال الإنترنت'));
    } finally {
      setIsSavingTariffsToDb(false);
    }
  };

  // Update System Settings
  const handleSaveSettings = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && typeof (e as any).preventDefault === 'function') {
      (e as any).preventDefault();
    }
    let updatedSettings = { ...settings };
    if (updatedSettings.logoUrl && updatedSettings.logoUrl.startsWith('data:image') && updatedSettings.logoUrl.length > 150000) {
      updatedSettings.logoUrl = await compressBase64Image(updatedSettings.logoUrl, 250, 250, 0.85);
    }
    onUpdateSettings(updatedSettings);
    logAction('تعديل دليل وإعدادات المحطة', `تم تحديث البيانات الرسمية للمحطة (${updatedSettings.stationName || 'بدون اسم'}) والشعار والإعدادات العامة بنجاح`);
    setSaveToastMessage(`تم حفظ دليل وإعدادات ${updatedSettings.stationName || 'المحطة'} والتعرفة بنجاح`);
    setTimeout(() => setSaveToastMessage(null), 4000);
  };

  // --- ENHANCED POSTINGS & TRANSFERS HANDLERS ---
  const pendingReadings = readings.filter(r => !r.isPosted && !r.isRejected);
  const pendingPayments = payments.filter(p => !p.isPosted && !p.isRejected);
  const postedPayments = payments.filter(p => p.isPosted);
  const rejectedReadings = readings.filter(r => r.isRejected);
  const rejectedPayments = payments.filter(p => p.isRejected);

  // Single Reading Post
  const postSingleReading = (readingId: string) => {
    const targetReading = readings.find(r => r.id === readingId);
    if (!targetReading) return;

    const postedDate = new Date().toISOString().substring(0, 16).replace('T', ' ');
    const updatedReadings = readings.map(r => 
      r.id === readingId 
        ? { ...r, isPosted: true, postedDate, postedBy: currentUser.name, isRejected: false } 
        : r
    );

    const updatedSubs = subscribers.map(sub => {
      if (sub.id === targetReading.subscriberId) {
        return {
          ...sub,
          currentReading: Math.max(sub.currentReading, targetReading.currentReading),
          currentBalance: sub.currentBalance + targetReading.totalAmount
        };
      }
      return sub;
    });

    onUpdateReadings(updatedReadings);
    onUpdateSubscribers(updatedSubs);
    logAction('ترحيل قراءة عداد', `اعتماد وتطبيق قراءة المشترك (${targetReading.subscriberName}) بقيمة ${targetReading.totalAmount} ${settings.currency}`);
  };

  // Reject Single Reading
  const handleRejectReading = (readingId: string, reason: string) => {
    const targetReading = readings.find(r => r.id === readingId);
    if (!targetReading) return;

    const updatedReadings = readings.map(r => 
      r.id === readingId ? { ...r, isRejected: true, rejectionReason: reason || 'رفض للمراجعة الميدانية' } : r
    );

    onUpdateReadings(updatedReadings);
    logAction('رفض قراءة عداد', `رفض قراءة المشترك (${targetReading.subscriberName}) - السبب: ${reason}`);
    setRejectModalItem(null);
    setRejectionNote('');
  };

  // Unpost Single Reading
  const unpostSingleReading = (readingId: string) => {
    const targetReading = readings.find(r => r.id === readingId);
    if (!targetReading || !targetReading.isPosted) return;

    if (!confirm(`هل أنت متأكد من إلغاء ترحيل قراءة المشترك (${targetReading.subscriberName})؟ سيتم خصم الماليّة المعلقة من رصيده.`)) return;

    const updatedReadings = readings.map(r => 
      r.id === readingId ? { ...r, isPosted: false, postedDate: undefined, postedBy: undefined } : r
    );

    const updatedSubs = subscribers.map(sub => {
      if (sub.id === targetReading.subscriberId) {
        return {
          ...sub,
          currentBalance: Math.max(0, sub.currentBalance - targetReading.totalAmount)
        };
      }
      return sub;
    });

    onUpdateReadings(updatedReadings);
    onUpdateSubscribers(updatedSubs);
    logAction('إلغاء ترحيل قراءة', `إلغاء ترحيل قراءة المشترك (${targetReading.subscriberName}) بقيمة ${targetReading.totalAmount} ${settings.currency}`);
  };

  // Single Payment Post
  const postSinglePayment = (paymentId: string) => {
    const targetPayment = payments.find(p => p.id === paymentId);
    if (!targetPayment) return;

    const postedDate = new Date().toISOString().substring(0, 16).replace('T', ' ');
    const updatedPayments = payments.map(p => 
      p.id === paymentId ? { ...p, isPosted: true, postedDate, postedBy: currentUser.name, isRejected: false } : p
    );

    const updatedSubs = subscribers.map(sub => {
      if (sub.id === targetPayment.subscriberId) {
        return {
          ...sub,
          currentBalance: sub.currentBalance - targetPayment.amountPaid
        };
      }
      return sub;
    });

    onUpdatePayments(updatedPayments);
    onUpdateSubscribers(updatedSubs);
    logAction('ترحيل سند قبض', `اعتماد وترحيل سند رقم (${targetPayment.receiptNumber}) للمشترك (${targetPayment.subscriberName}) بمبلغ ${targetPayment.amountPaid} ${settings.currency}`);
  };

  // Reject Single Payment
  const handleRejectPayment = (paymentId: string, reason: string) => {
    const targetPayment = payments.find(p => p.id === paymentId);
    if (!targetPayment) return;

    const updatedPayments = payments.map(p => 
      p.id === paymentId ? { ...p, isRejected: true, rejectionReason: reason || 'سند مرفوض للتدقيق' } : p
    );

    onUpdatePayments(updatedPayments);
    logAction('رفض سند قبض', `رفض سند رقم (${targetPayment.receiptNumber}) للمشترك (${targetPayment.subscriberName}) - السبب: ${reason}`);
    setRejectModalItem(null);
    setRejectionNote('');
  };

  // Unpost Single Payment
  const unpostSinglePayment = (paymentId: string) => {
    const targetPayment = payments.find(p => p.id === paymentId);
    if (!targetPayment || !targetPayment.isPosted) return;

    if (!confirm(`هل أنت متأكد من إلغاء ترحيل السند رقم (${targetPayment.receiptNumber})؟ سيتم إعادة تسجيل المبلغ كمديونية على المشترك.`)) return;

    const updatedPayments = payments.map(p => 
      p.id === paymentId ? { ...p, isPosted: false, postedDate: undefined, postedBy: undefined } : p
    );

    const updatedSubs = subscribers.map(sub => {
      if (sub.id === targetPayment.subscriberId) {
        return {
          ...sub,
          currentBalance: sub.currentBalance + targetPayment.amountPaid
        };
      }
      return sub;
    });

    onUpdatePayments(updatedPayments);
    onUpdateSubscribers(updatedSubs);
    logAction('إلغاء ترحيل سند قبض', `إلغاء ترحيل سند رقم (${targetPayment.receiptNumber}) للمشترك (${targetPayment.subscriberName})`);
  };

  // Batch Post Selected Readings
  const postBatchReadings = () => {
    if (selectedReadingIds.length === 0) return;
    const targetReads = readings.filter(r => selectedReadingIds.includes(r.id));
    const postedDate = new Date().toISOString().substring(0, 16).replace('T', ' ');

    const updatedReadings = readings.map(r => 
      selectedReadingIds.includes(r.id) ? { ...r, isPosted: true, postedDate, postedBy: currentUser.name, isRejected: false } : r
    );

    const updatedSubs = subscribers.map(sub => {
      const subReads = targetReads.filter(r => r.subscriberId === sub.id);
      if (subReads.length > 0) {
        const total = subReads.reduce((sum, r) => sum + r.totalAmount, 0);
        const maxRead = Math.max(...subReads.map(r => r.currentReading), sub.currentReading);
        return { ...sub, currentReading: maxRead, currentBalance: sub.currentBalance + total };
      }
      return sub;
    });

    onUpdateReadings(updatedReadings);
    onUpdateSubscribers(updatedSubs);
    logAction('ترحيل دُفعة قراءات', `تم ترحيل عدد (${selectedReadingIds.length}) قراءة بنجاح`);
    setSelectedReadingIds([]);
  };

  // Batch Post Selected Payments
  const postBatchPayments = () => {
    if (selectedPaymentIds.length === 0) return;
    const targetPays = payments.filter(p => selectedPaymentIds.includes(p.id));
    const postedDate = new Date().toISOString().substring(0, 16).replace('T', ' ');

    const updatedPayments = payments.map(p => 
      selectedPaymentIds.includes(p.id) ? { ...p, isPosted: true, postedDate, postedBy: currentUser.name, isRejected: false } : p
    );

    const updatedSubs = subscribers.map(sub => {
      const subPays = targetPays.filter(p => p.subscriberId === sub.id);
      if (subPays.length > 0) {
        const total = subPays.reduce((sum, p) => sum + p.amountPaid, 0);
        return { ...sub, currentBalance: sub.currentBalance - total };
      }
      return sub;
    });

    onUpdatePayments(updatedPayments);
    onUpdateSubscribers(updatedSubs);
    logAction('ترحيل دُفعة سندات', `تم ترحيل عدد (${selectedPaymentIds.length}) سند مالي بنجاح`);
    setSelectedPaymentIds([]);
  };

  // Post pending readings (ترحيل كافة القراءات للذمم المدنية)
  const postAllReadings = () => {
    if (pendingReadings.length === 0) {
      alert('لا توجد قراءات معلقة لترحيلها حالياً.');
      return;
    }

    const confirmPost = confirm(`هل أنت متأكد من ترحيل عدد (${pendingReadings.length}) قراءة عداد إلى الحسابات؟ سيتم ترحيل المبالغ لمديونية المشتركين وتحديث قراءاتهم النهائية.`);
    if (!confirmPost) return;

    const postedDate = new Date().toISOString().substring(0, 16).replace('T', ' ');
    const updatedReadings = readings.map(r => {
      if (!r.isPosted && !r.isRejected) {
        return { ...r, isPosted: true, postedDate, postedBy: currentUser.name };
      }
      return r;
    });

    const updatedSubs = subscribers.map(sub => {
      const subPendingReads = pendingReadings.filter(r => r.subscriberId === sub.id);
      if (subPendingReads.length > 0) {
        const totalCharge = subPendingReads.reduce((sum, r) => sum + r.totalAmount, 0);
        const latestReading = Math.max(...subPendingReads.map(r => r.currentReading), sub.currentReading);
        return {
          ...sub,
          currentReading: latestReading,
          currentBalance: sub.currentBalance + totalCharge
        };
      }
      return sub;
    });

    onUpdateReadings(updatedReadings);
    onUpdateSubscribers(updatedSubs);
    logAction('ترحيل القراءات الميدانية', `ترحيل وإقرار عدد ${pendingReadings.length} قراءة، وتحميل المديونيات للمشتركين`);
    alert(`تم بنجاح ترحيل عدد (${pendingReadings.length}) قراءة وتحديث أرصدة المشتركين.`);
  };

  // Post pending payments (ترحيل كافة المقبوضات والسندات)
  const postAllPayments = () => {
    if (pendingPayments.length === 0) {
      alert('لا توجد سندات قبض معلقة لترحيلها حالياً.');
      return;
    }

    const confirmPost = confirm(`هل أنت متأكد من ترحيل عدد (${pendingPayments.length}) سند قبض مالي؟ سيتم خصم هذه المبالغ رسمياً من مديونيات المشتركين.`);
    if (!confirmPost) return;

    const postedDate = new Date().toISOString().substring(0, 16).replace('T', ' ');
    const updatedPayments = payments.map(p => {
      if (!p.isPosted && !p.isRejected) {
        return { ...p, isPosted: true, postedDate, postedBy: currentUser.name };
      }
      return p;
    });

    const updatedSubs = subscribers.map(sub => {
      const subPendingPays = pendingPayments.filter(p => p.subscriberId === sub.id);
      if (subPendingPays.length > 0) {
        const totalCredits = subPendingPays.reduce((sum, p) => sum + p.amountPaid, 0);
        return {
          ...sub,
          currentBalance: sub.currentBalance - totalCredits
        };
      }
      return sub;
    });

    onUpdatePayments(updatedPayments);
    onUpdateSubscribers(updatedSubs);
    logAction('ترحيل السندات والمقبوضات', `ترحيل وإقرار عدد ${pendingPayments.length} سند قبض مالي للدفاتر الختامية`);
    alert(`تم بنجاح ترحيل عدد (${pendingPayments.length}) سند مالي وتنزيل مديونيات المشتركين.`);
  };

  // Settle Collector Cash & Create Treasury Transfer Voucher
  const settleCollectorCash = (collectorName: string, totalAmount: number) => {
    if (totalAmount <= 0) return;
    if (!confirm(`هل ترغب بترحيل وتوريد كاش المحصل (${collectorName}) بمبلغ (${totalAmount.toLocaleString()} ${settings.currency}) للصندوق الرئيسي؟`)) return;

    const collectorPays = payments.filter(p => p.receivedBy === collectorName && !p.isPosted && !p.isRejected);
    const postedDate = new Date().toISOString().substring(0, 16).replace('T', ' ');

    const updatedPayments = payments.map(p => 
      (p.receivedBy === collectorName && !p.isPosted && !p.isRejected) 
        ? { ...p, isPosted: true, postedDate, postedBy: currentUser.name } 
        : p
    );

    const updatedSubs = subscribers.map(sub => {
      const cPays = collectorPays.filter(p => p.subscriberId === sub.id);
      if (cPays.length > 0) {
        const total = cPays.reduce((sum, p) => sum + p.amountPaid, 0);
        return { ...sub, currentBalance: sub.currentBalance - total };
      }
      return sub;
    });

    onUpdatePayments(updatedPayments);
    onUpdateSubscribers(updatedSubs);

    const newTrf = {
      id: Date.now().toString(),
      transferNumber: `TRF-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().split('T')[0],
      fromAccount: `عُهدة المحصل: ${collectorName}`,
      toAccount: 'الصندوق الرئيسي (الكاش)',
      amount: totalAmount,
      notes: `تصفية وتوريد عُهدة التحصيلات الميدانية للمحصل (${collectorName}) - إجمالي ${collectorPays.length} سند`,
      recordedBy: currentUser.name
    };

    const updatedTrfs = [newTrf, ...treasuryTransfers];
    if (onUpdateTreasuryTransfers) {
      onUpdateTreasuryTransfers(updatedTrfs);
    }

    logAction('تصفية عُهدة محصل', `توريد عُهدة المحصل (${collectorName}) بمبلغ ${totalAmount} ${settings.currency} وتوليد سند تحويل رقم (${newTrf.transferNumber})`);
    alert(`تم توريد وتصفية عُهدة المحصل (${collectorName}) بنجاح وتوليد سند تحويل الخزينة (${newTrf.transferNumber}).`);
  };

  const getActiveReadingTemplate = (templateId?: string): SmsTemplate => {
    if (templateId) {
      const found = smsTemplates.find(t => t.id === templateId);
      if (found) return found;
    }
    const currentFailed = smsTemplates.find(t => t.id === failedReadingTemplateId);
    if (currentFailed) return currentFailed;
    const byType = smsTemplates.find(t => t.type === 'reading');
    if (byType) return byType;
    const byId1 = smsTemplates.find(t => t.id === '1');
    if (byId1) return byId1;
    return {
      id: '1',
      name: 'إشعار فاتورة جديدة',
      content: 'الأخ المشترك: {اسم_المشترك}\nرقم العداد: {رقم_العداد}\nالقراءة الحالية: {القراءة_الحالية}\nالقراءة السابقة: {القراءة_السابقة}\nالاستهلاك: {الاستهلاك} ك.و\nمبلغ الفاتورة: {المبلغ}\nالمتأخرات: {المبالغ_المتأخره}\nالإجمالي المطلوب: {الرصيد_المتبقي}',
      type: 'reading'
    };
  };

  const getActivePaymentTemplate = (templateId?: string): SmsTemplate => {
    if (templateId) {
      const found = smsTemplates.find(t => t.id === templateId);
      if (found) return found;
    }
    const currentFailed = smsTemplates.find(t => t.id === failedPaymentTemplateId);
    if (currentFailed) return currentFailed;
    const byType = smsTemplates.find(t => t.type === 'payment');
    if (byType) return byType;
    const byId2 = smsTemplates.find(t => t.id === '2');
    if (byId2) return byId2;
    return {
      id: '2',
      name: 'سند قبض',
      content: 'تم استلام مبلغ {المبلغ} من المشترك: {اسم_المشترك} بموجب سند رقم {رقم_السند}.\nالرصيد المتبقي: {الرصيد_المتبقي}\nشكرًا لتسديدكم.',
      type: 'payment'
    };
  };

  const buildReadingSmsMessage = (r: MeterReading, templateId?: string): { msg: string, template: SmsTemplate, sub?: Subscriber } => {
    const sub = subscribers.find(s => s.id === r.subscriberId);
    const template = getActiveReadingTemplate(templateId);
    const msg = parseSmsTemplate(
      template.content,
      sub,
      r.totalAmount.toLocaleString(),
      undefined,
      r,
      undefined,
      settings,
      readings
    );
    return { msg, template, sub };
  };

  const buildPaymentSmsMessage = (p: Payment, templateId?: string): { msg: string, template: SmsTemplate, sub?: Subscriber } => {
    const sub = subscribers.find(s => s.id === p.subscriberId);
    const template = getActivePaymentTemplate(templateId);
    const msg = parseSmsTemplate(
      template.content,
      sub,
      p.amountPaid.toLocaleString(),
      p.receiptNumber,
      undefined,
      p,
      settings,
      readings
    );
    return { msg, template, sub };
  };

  const handleSendReadingSMS = async (r: MeterReading, forceManual: boolean = false, templateId?: string) => {
    const { msg, sub } = buildReadingSmsMessage(r, templateId);
    const phone = sub?.phone || '';
    if (!phone) {
      alert(`لا يوجد رقم هاتف مسجل للمشترك (${r.subscriberName})`);
      return;
    }
    
    sendSMSDirectly(phone, msg, forceManual ? { forceSmsUri: true, allowExternalApp: true } : undefined);
    
    const updatedReadings = readings.map(reading => 
      reading.id === r.id ? { ...reading, smsSent: true } : reading
    );
    onUpdateReadings(updatedReadings);

    // Delete from failedSms collection in database and state
    if (onDeleteFailedSms) {
      onDeleteFailedSms(r.id);
    } else {
      try {
        await deleteFailedSmsFromCloud(r.id);
      } catch (e) {
        console.error("Error removing failed SMS from cloud:", e);
      }
    }
  };

  const handleSendPaymentSMS = async (p: Payment, forceManual: boolean = false, templateId?: string) => {
    const { msg, sub } = buildPaymentSmsMessage(p, templateId);
    const phone = sub?.phone || '';
    if (!phone) {
      alert(`لا يوجد رقم هاتف مسجل للمشترك (${p.subscriberName})`);
      return;
    }
    
    sendSMSDirectly(phone, msg, forceManual ? { forceSmsUri: true, allowExternalApp: true } : undefined);
    
    const updatedPayments = payments.map(payment => 
      payment.id === p.id ? { ...payment, smsSent: true } : payment
    );
    onUpdatePayments(updatedPayments);

    // Delete from failedSms collection in database and state
    if (onDeleteFailedSms) {
      onDeleteFailedSms(p.id);
    } else {
      try {
        await deleteFailedSmsFromCloud(p.id);
      } catch (e) {
        console.error("Error removing failed SMS from cloud:", e);
      }
    }
  };

  const saveSmsTemplate = (id: string) => {
    const target = smsTemplates.find(t => t.id === id);
    if (!target) return;
    const updatedTemplate: SmsTemplate = { 
      ...target, 
      content: editingTemplateContent, 
      updatedAt: new Date().toISOString() 
    };
    
    const updatedList = smsTemplates.map(t => t.id === id ? updatedTemplate : t);
    setSmsTemplates(updatedList);

    if (onSaveSmsTemplate) {
      onSaveSmsTemplate(updatedTemplate);
    } else if (onUpdateSmsTemplates) {
      onUpdateSmsTemplates(updatedList);
    }

    setEditingTemplateId(null);
    setSmsSaveSuccessNotice(`تم حفظ وتحديث قالب (${target.name}) في قاعدة البيانات بنجاح`);
    setTimeout(() => setSmsSaveSuccessNotice(null), 4000);

    if (onAddAuditLog) {
      onAddAuditLog({
        id: `audit-${Date.now()}`,
        userId: currentUser.id,
        username: currentUser.name || currentUser.username,
        action: 'تعديل قالب رسائل نصية',
        details: `تم تعديل وحفظ قالب (${target.name}) في قاعدة البيانات السحابية`,
        timestamp: new Date().toISOString().substring(0, 19).replace('T', ' ')
      });
    }
  };

  const handleAddNewSmsTemplate = () => {
    if (!newTemplateName.trim() || !newTemplateContent.trim()) {
      alert('يرجى كتابة اسم القالب ومحتواه');
      return;
    }
    const newId = `tpl-${Date.now()}`;
    const newTemplate: SmsTemplate = {
      id: newId,
      name: newTemplateName.trim(),
      content: newTemplateContent.trim(),
      type: newTemplateType,
      updatedAt: new Date().toISOString()
    };
    const updatedList = [...smsTemplates, newTemplate];
    setSmsTemplates(updatedList);
    if (onSaveSmsTemplate) {
      onSaveSmsTemplate(newTemplate);
    } else if (onUpdateSmsTemplates) {
      onUpdateSmsTemplates(updatedList);
    }
    setShowAddTemplateModal(false);
    setNewTemplateName('');
    setNewTemplateContent('');
    setNewTemplateType('custom');
    setSmsSaveSuccessNotice(`تم إضافة القالب الجديد (${newTemplate.name}) وحفظه في قاعدة البيانات بنجاح`);
    setTimeout(() => setSmsSaveSuccessNotice(null), 4000);

    if (onAddAuditLog) {
      onAddAuditLog({
        id: `audit-${Date.now()}`,
        userId: currentUser.id,
        username: currentUser.name || currentUser.username,
        action: 'إضافة قالب رسائل نصية',
        details: `تم إنشاء قالب رسائل نصية جديد (${newTemplate.name}) وتخزينه بقاعدة البيانات`,
        timestamp: new Date().toISOString().substring(0, 19).replace('T', ' ')
      });
    }
  };

  const handleDeleteSmsTemplate = (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف قالب الرسائل (${name}) نهائياً من قاعدة البيانات؟`)) return;
    const updatedList = smsTemplates.filter(t => t.id !== id);
    setSmsTemplates(updatedList);
    if (onDeleteSmsTemplate) {
      onDeleteSmsTemplate(id);
    } else if (onUpdateSmsTemplates) {
      onUpdateSmsTemplates(updatedList);
    }
    setSmsSaveSuccessNotice(`تم حذف القالب (${name}) من قاعدة البيانات`);
    setTimeout(() => setSmsSaveSuccessNotice(null), 4000);
  };

  const handleRestoreDefaultSmsTemplates = () => {
    if (!confirm('هل تريد استعادة قوالب الرسائل النصية الافتراضية وحفظها في قاعدة البيانات؟')) return;
    setSmsTemplates(INITIAL_SMS_TEMPLATES);
    if (onUpdateSmsTemplates) {
      onUpdateSmsTemplates(INITIAL_SMS_TEMPLATES);
    }
    setSmsSaveSuccessNotice('تمت استعادة قوالب الرسائل الافتراضية وحفظها في قاعدة البيانات بنجاح');
    setTimeout(() => setSmsSaveSuccessNotice(null), 4000);
  };

  const handleStartSmsSequence = () => {
    if (smsSelectedSubs.length === 0) {
      alert('يرجى تحديد مشترك واحد على الأقل.');
      return;
    }
    if (!smsMessage) {
      alert('يرجى كتابة نص الرسالة.');
      return;
    }

    const hasPhones = smsSelectedSubs.some(id => subscribers.find(s => s.id === id)?.phone);
    if (!hasPhones) {
      alert('لم يتم العثور على أرقام هواتف صالحة للمشتركين المحددين.');
      return;
    }

    setIsSendingSequence(true);
    setSmsQueueIndex(0);
  };

  const handleSendNextSms = () => {
    if (smsQueueIndex < smsSelectedSubs.length) {
      const subId = smsSelectedSubs[smsQueueIndex];
      const sub = subscribers.find(s => s.id === subId);
      
      if (sub && sub.phone) {
        const msg = parseSmsTemplate(smsMessage, sub, undefined, undefined, undefined, undefined, settings, readings);
        sendSMSDirectly(sub.phone, msg);
      }
      
      setSmsQueueIndex(prev => prev + 1);
    }
    
    if (smsQueueIndex >= smsSelectedSubs.length - 1) {
      setIsSendingSequence(false);
      alert('تم الانتهاء من القائمة المحددة.');
    }
  };

  const handleCancelSequence = () => {
    setIsSendingSequence(false);
    setSmsQueueIndex(0);
  };

  // Close Billing Cycle (إغلاق الدورة المالية وتصفير الشهر)
  const handleCloseFiscalCycle = () => {
    if (pendingReadings.length > 0 || pendingPayments.length > 0) {
      alert('تحذير: لا يمكن إغلاق الدورة المالية وهناك قراءات أو سندات معلقة لم يتم ترحيلها بعد! يرجى ترحيلها أولاً.');
      return;
    }

    const cycleName = prompt('يرجى تحديد مسمى الدورة المالية المغلقة (مثال: يوليو 2026):', 'يوليو 2026');
    if (!cycleName) return;

    logAction('إغلاق الدورة المالية', `إغلاق الدورة المالية رسميًا لشهر [${cycleName}] وأرشفة السجلات`);
    alert(`تم إغلاق الدورة المالية لـ (${cycleName}) وأرشفة البيانات التاريخية للمحطة بنجاح.`);
  };

  // --- DATABASE MANAGEMENT FUNCTIONS (إدارة قاعدة البيانات) ---
  
  // Backup as JSON
  const downloadBackup = () => {
    const fullDbState = {
      subscribers,
      readings,
      payments,
      settings,
      users,
      auditLogs,
      backupDate: new Date().toISOString()
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullDbState, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `voltera_backup_${new Date().toISOString().substring(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    logAction('نسخ احتياطي للبيانات', 'تصدير نسخة كاملة لقاعدة البيانات بصيغة JSON');
  };

  // Restore from JSON File
  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const restoredState = JSON.parse(event.target?.result as string);
        
        if (
          restoredState.subscribers && 
          restoredState.readings && 
          restoredState.payments && 
          restoredState.settings && 
          restoredState.users
        ) {
          onUpdateSubscribers(restoredState.subscribers);
          onUpdateReadings(restoredState.readings);
          onUpdatePayments(restoredState.payments);
          onUpdateSettings(restoredState.settings);
          onUpdateUsers(restoredState.users);
          
          logAction('استعادة قاعدة البيانات', 'استيراد ناجح لملف النسخة الاحتياطية وإعادة بناء الجداول');
          alert('تمت استعادة قاعدة البيانات بالكامل وبنجاح تام!');
        } else {
          alert('خطأ: بنية الملف المرفوع غير صالحة ولا تحتوي على جداول النظام القياسية.');
        }
      } catch (err) {
        alert('حدث خطأ أثناء معالجة ملف JSON المرفوع.');
      }
    };
    reader.readAsText(file);
  };

  // --- FILTERED LISTINGS ---
  const filteredSubscribers = subscribers.filter(sub => {
    const q = subSearch.toLowerCase().trim();
    const matchSearch = sub.name.toLowerCase().includes(q) || sub.meterNumber.toLowerCase().includes(q) || sub.phone.includes(q);
    const matchZone = subscriberFilterZone === 'all' ? true : sub.zone === subscriberFilterZone;
    const matchStatus = subscriberFilterStatus === 'all' ? true : sub.status === subscriberFilterStatus;
    const matchTariff = subscriberFilterTariff === 'all' ? true : sub.tariffType === subscriberFilterTariff;
    return matchSearch && matchZone && matchStatus && matchTariff;
  });

  const handleBulkDelete = () => {
    if (confirm(`هل أنت متأكد من حذف ${selectedSubscribersIds.length} مشتركين؟`)) {
      const remaining = subscribers.filter(s => !selectedSubscribersIds.includes(s.id));
      onUpdateSubscribers(remaining);
      setSelectedSubscribersIds([]);
      logAction('حذف مشتركين بالجملة', `تم حذف ${selectedSubscribersIds.length} مشتركين من النظام`);
    }
  };

  const handleBulkToggleStatus = (targetStatus: 'active' | 'inactive') => {
      const updated = subscribers.map(s => {
          if (selectedSubscribersIds.includes(s.id)) {
              return { ...s, status: targetStatus };
          }
          return s;
      });
      onUpdateSubscribers(updated);
      setSelectedSubscribersIds([]);
      logAction('تغيير حالة مشتركين بالجملة', `تم تغيير حالة ${selectedSubscribersIds.length} مشتركين إلى ${targetStatus === 'active' ? 'نشط' : 'موقف'}`);
  };

  const toggleSubscriberSelection = (id: string) => {
      if (selectedSubscribersIds.includes(id)) {
          setSelectedSubscribersIds(selectedSubscribersIds.filter(i => i !== id));
      } else {
          setSelectedSubscribersIds([...selectedSubscribersIds, id]);
      }
  };
  
  const toggleAllSubscribersSelection = () => {
      if (selectedSubscribersIds.length === filteredSubscribers.length) {
          setSelectedSubscribersIds([]);
      } else {
          setSelectedSubscribersIds(filteredSubscribers.map(s => s.id));
      }
  };


  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans" dir="rtl">
      
      {/* Top Admin Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-3 py-2.5 sm:px-6 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <button 
            onClick={onLogout}
            className="flex items-center gap-1.5 sm:gap-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 text-slate-600 p-2 sm:py-1.5 sm:px-3 rounded-xl text-xs transition-all font-bold cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">خروج</span>
          </button>
          <div className="h-6 w-px bg-slate-200 shrink-0" />
          <div className="text-right min-w-0">
            <span className="block text-[9px] sm:text-[10px] text-amber-600 font-bold uppercase tracking-wider">مدير النظام</span>
            <span className="block text-[11px] sm:text-xs font-bold text-slate-800 truncate max-w-[80px] sm:max-w-[150px] md:max-w-none">{currentUser.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Android App & Cloud Sync Button */}
          <button
            onClick={() => setShowAndroidSyncModal(true)}
            className="p-2 sm:px-3 sm:py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            title="تثبيت تطبيق الأندرويد ومزامنة البيانات السحابية"
          >
            <Smartphone className="w-4 h-4 text-teal-600" />
            <span className="hidden lg:inline font-black">تطبيق الأندرويد والسحابة</span>
          </button>

          {/* Permissions Center Button */}
          <button
            onClick={() => setShowPermissionsModal(true)}
            className="p-2 sm:px-3 sm:py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            title="مركز إدارة صلاحيات وأذونات الجهاز والتطبيق"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="hidden lg:inline font-black">أذونات الجهاز</span>
          </button>

          {/* Real-time Notification Center */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications && unreadCount > 0) {
                  playNotifChime();
                }
              }}
              className="relative p-2 text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer flex items-center justify-center transition-all focus:outline-none shrink-0"
              title="مركز التنبيهات والتنسيق المباشر">
              <Bell className={`w-4.5 h-4.5 ${unreadCount > 0 ? 'text-amber-500 animate-bounce' : 'text-slate-600'}`} />
              {unreadCount > 0 && (
                <>
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full border-2 border-white shadow-md">
                    {unreadCount}
                  </span>
                  <span className="absolute -top-1 -right-1 bg-rose-400 animate-ping w-4 h-4 rounded-full opacity-75" />
                </>
              )}
            </button>

            {/* Dropdown for Notifications */}
            <AnimatePresence>
              {showNotifications && (
                <>
                  {/* Backdrop overlay for focus and closing on click outside */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-slate-950/20 backdrop-blur-[2px] z-[110]"
                    onClick={() => setShowNotifications(false)}
                  />

                  <motion.div
                    initial={{ opacity: 0, y: -12, x: "-50%", scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
                    exit={{ opacity: 0, y: -12, x: "-50%", scale: 0.96 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="fixed top-16 sm:top-20 left-1/2 w-[92vw] sm:w-[440px] max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-[120] text-right font-sans"
                  >
                  {/* Header */}
                  <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleNotifSound}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          soundEnabled 
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30' 
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                        title={soundEnabled ? 'صوت التنبيهات مفعل (انقر للتعطيل)' : 'صوت التنبيهات معطل (انقر للتمكين)'}
                      >
                        {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                        title="إغلاق القائمة"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <h3 className="text-white text-xs font-black flex items-center gap-1.5">
                          <span>مركز التنبيهات المباشرة</span>
                          <BellRing className="w-4 h-4 text-amber-400" />
                        </h3>
                        <p className="text-[10px] text-slate-400 font-medium">متابعة الفوترة والمخزون والتحصيلات</p>
                      </div>
                    </div>
                  </div>

                  {/* Filter Tabs */}
                  <div className="bg-slate-100 p-1.5 flex items-center justify-between gap-1 border-b border-slate-200 text-xs font-bold">
                    <button
                      onClick={() => setNotifTab('all')}
                      className={`flex-1 py-1.5 px-2 rounded-lg transition-all cursor-pointer text-center text-[11px] ${
                        notifTab === 'all'
                          ? 'bg-white text-slate-900 shadow-xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      الكل ({allGeneratedNotifications.length})
                    </button>
                    <button
                      onClick={() => setNotifTab('unread')}
                      className={`flex-1 py-1.5 px-2 rounded-lg transition-all cursor-pointer text-center text-[11px] flex items-center justify-center gap-1 ${
                        notifTab === 'unread'
                          ? 'bg-rose-500 text-white shadow-xs font-bold'
                          : 'text-slate-600 hover:text-rose-600'
                      }`}
                    >
                      <span>غير مقروءة</span>
                      {unreadCount > 0 && <span className="bg-rose-700 text-white px-1.5 py-0.2 rounded-full text-[9px]">{unreadCount}</span>}
                    </button>
                    <button
                      onClick={() => setNotifTab('urgent')}
                      className={`flex-1 py-1.5 px-2 rounded-lg transition-all cursor-pointer text-center text-[11px] ${
                        notifTab === 'urgent'
                          ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                          : 'text-slate-600 hover:text-amber-600'
                      }`}
                    >
                      عاجل ({allGeneratedNotifications.filter(n => n.priority === 'high').length})
                    </button>
                  </div>

                  {/* Bulk Controls */}
                  {allGeneratedNotifications.length > 0 && (
                    <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex justify-between items-center text-[10px]">
                      <button
                        onClick={handleClearAllNotifs}
                        className="text-slate-500 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer font-semibold"
                      >
                        <Trash2 className="w-3 h-3 text-rose-500" />
                        <span>مسح القائمة</span>
                      </button>

                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-amber-600 hover:text-amber-700 flex items-center gap-1 transition-colors cursor-pointer font-bold"
                        >
                          <CheckCircle2 className="w-3 h-3 text-amber-500" />
                          <span>تحديد الكل كمقروء</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Scrollable Notifications List */}
                  <div className="max-h-88 overflow-y-auto p-2 space-y-2 bg-slate-100/60 custom-scrollbar">
                    {adminNotifications.length === 0 ? (
                      <div className="py-10 text-center flex flex-col items-center justify-center gap-2">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400 stroke-[1.5]" />
                        <p className="text-xs font-bold text-slate-700">لا توجد تنبيهات جديدة حالياً</p>
                        <p className="text-[10px] text-slate-500">جميع العمليات والقراءات والمخزون في وضع مستقر</p>
                      </div>
                    ) : (
                      adminNotifications.map(notif => (
                        <div
                          key={notif.id}
                          onClick={() => handleNotifClick(notif)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer shadow-xs flex flex-col gap-2 relative ${
                            !notif.isRead 
                              ? 'bg-white border-amber-300 ring-1 ring-amber-400/20 shadow-sm' 
                              : 'bg-white/80 border-slate-200/80 hover:bg-white opacity-85'
                          }`}
                        >
                          {/* Top Row */}
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => handleDismissNotif(notif.id, e)}
                                className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                title="إخفاء التنبيه"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                              {!notif.isRead && (
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" title="غير مقروء" />
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                                {notif.time.substring(11, 16) || notif.time}
                              </span>

                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                notif.type === 'high_consumption' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                notif.type === 'high_payment' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                notif.type === 'low_inventory' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                                notif.type === 'pending_readings' || notif.type === 'pending_payments' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                notif.type === 'tech_request' ? 'bg-cyan-100 text-cyan-800 border border-cyan-200' :
                                'bg-rose-100 text-rose-800 border border-rose-200'
                              }`}>
                                {notif.type === 'high_consumption' && <Zap className="w-3 h-3 text-amber-600" />}
                                {notif.type === 'high_payment' && <Banknote className="w-3 h-3 text-emerald-600" />}
                                {notif.type === 'low_inventory' && <Package className="w-3 h-3 text-purple-600" />}
                                {(notif.type === 'pending_readings' || notif.type === 'pending_payments') && <Clock className="w-3 h-3 text-blue-600" />}
                                {notif.type === 'tech_request' && <Wrench className="w-3 h-3 text-cyan-600" />}
                                {notif.type === 'suspended_debt' && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                                <span>{notif.title}</span>
                              </span>
                            </div>
                          </div>

                          {/* Message Body */}
                          <p className="text-xs text-slate-800 font-semibold leading-relaxed text-right">
                            {notif.message}
                          </p>

                          {/* Footer Action */}
                          <div className="pt-1 border-t border-slate-100 flex justify-between items-center text-[10px]">
                            <span className="text-amber-600 font-bold flex items-center gap-1 group-hover:translate-x-[-2px] transition-transform">
                              <span>عرض والتنفيذ</span>
                              <ArrowLeft className="w-3 h-3 text-amber-500" />
                            </span>

                            <span className="text-slate-400 font-medium">
                              {notif.priority === 'high' ? '⚠️ عالي الأهمية' : 'ℹ️ تنبيه عادي'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              </>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Sidebar Toggle Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 transition-all focus:outline-none shrink-0"
            aria-label="القائمة"
          >
            <Menu className="w-4 h-4 text-amber-600" />
            <span className="text-[10px] font-bold hidden sm:inline">قائمة النظام</span>
          </button>

          <h1 className="text-xs sm:text-sm md:text-base font-black text-slate-900 hidden sm:block">
            {settings.stationName}
          </h1>
          <div className="p-1.5 sm:p-2 bg-amber-400/10 rounded-xl border border-amber-400/30 shrink-0">
            <Shield className="w-4.5 h-4.5 sm:w-5 h-5 text-amber-600" />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Responsive Mobile Sidebar Backdrop */}
        {sidebarOpen && (
          <div 
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          />
        )}

        {/* RIGHT SIDEBAR (Control Navigation) */}
        <nav className={`fixed lg:relative inset-y-0 right-0 z-50 lg:z-10 w-72 bg-slate-900 border-l border-slate-800 p-4 transform-gpu transition-transform duration-300 lg:transform-none flex flex-col gap-6 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        } overflow-y-auto overflow-x-hidden custom-scrollbar`}>
          
          <div className="flex items-center justify-between lg:justify-start gap-2 text-right border-b border-slate-800/40 pb-4">
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
              title="إغلاق القائمة">
              <XCircle className="w-4.5 h-4.5" />
            </button>
            <div className="flex flex-col gap-0.5 text-right">
              <h3 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">نظام إدارة موارد المؤسسة</h3>
              <span className="text-white text-sm font-black flex items-center justify-start gap-1.5">
                 ERP System <Package className="w-4 h-4 text-amber-500" />
              </span>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-1 pr-1 w-full">
            
            {/* Standalone Link: Dashboard */}
            <button
              onClick={() => { setActiveSection('dashboard'); setSidebarOpen(false); }}
              className={`flex items-center justify-start gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeSection === 'dashboard'
                  ? 'bg-amber-500/15 text-amber-400 font-bold border-r-2 border-amber-400 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>لوحة القيادة والمؤشرات</span>
              <LayoutDashboard className={`w-4.5 h-4.5 shrink-0 ${activeSection === 'dashboard' ? 'text-amber-400' : 'text-slate-400'}`} />
            </button>

            {canSeeSubscribers && (
              <>
                {/* Group 1: Subscribers & Billing */}
            <div className="mt-2">
              <button
                onClick={() => toggleMenu('subscribers')}
                className="w-full flex items-center justify-between text-xs text-slate-400 font-bold px-2 py-2 mb-1 hover:text-slate-200 hover:bg-slate-800/30 rounded-lg transition-colors cursor-pointer focus:outline-none"
              >
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-500" />
                  <span>المشتركين والفوترة</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedMenus.subscribers ? '' : 'rotate-90'}`} />
              </button>
              
              <AnimatePresence>
                {expandedMenus.subscribers && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col gap-0.5 pr-3 border-r-2 border-slate-800/60 mr-2 overflow-hidden"
                  >
                    <button
                      onClick={() => { setActiveSection('subscribers'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'subscribers'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>إدارة المشتركين</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('debt'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'debt'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>إدارة الديون والمتأخرات</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('zones'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'zones'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>المناطق والمحولات</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

              </>
            )}

            {canSeeFinance && (
              <>
                {/* Group 2: Finance & Accounting */}
            <div className="mt-2">
              <button
                onClick={() => toggleMenu('finance')}
                className="w-full flex items-center justify-between text-xs text-slate-400 font-bold px-2 py-2 mb-1 hover:text-slate-200 hover:bg-slate-800/30 rounded-lg transition-colors cursor-pointer focus:outline-none"
              >
                <span className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-blue-500" />
                  <span>المالية والمحاسبة</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedMenus.finance ? '' : 'rotate-90'}`} />
              </button>
              
              <AnimatePresence>
                {expandedMenus.finance && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col gap-0.5 pr-3 border-r-2 border-slate-800/60 mr-2 overflow-hidden"
                  >
                    <button
                      onClick={() => { setActiveSection('accounting'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'accounting'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>النظام المحاسبي الشامل</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('admin-postings'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'admin-postings'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      {pendingReadings.length + pendingPayments.length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 animate-pulse ml-2" />
                      )}
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>الترحيلات المالية والقيود</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('partners'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'partners'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span>إدارة الشركاء وتوزيع الأرباح</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

              </>
            )}

            {canSeeInventory && (
              <>
                {/* Group: Inventory */}
            <div className="mt-2">
              <button
                onClick={() => toggleMenu('inventory')}
                className="w-full flex items-center justify-between text-xs text-slate-400 font-bold px-2 py-2 mb-1 hover:text-slate-200 hover:bg-slate-800/30 rounded-lg transition-colors cursor-pointer focus:outline-none"
              >
                <span className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-purple-500" />
                  <span>المخزون والمستودع</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedMenus.inventory ? '' : 'rotate-90'}`} />
              </button>
              
              <AnimatePresence>
                {expandedMenus.inventory && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col gap-0.5 pr-3 border-r-2 border-slate-800/60 mr-2 overflow-hidden"
                  >
                    <button
                      onClick={() => { setActiveSection('inventory-catalog'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'inventory-catalog'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>دليل الأصناف</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('inventory-transactions'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'inventory-transactions'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>حركات المستودع</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('inventory-alerts'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'inventory-alerts'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>الجرد والتنبيهات</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
              </>
            )}

            {canSeeFinance && (
              <>
                {/* Group: Treasury & Collector Funds */}
            <div className="mt-2">
              <button
                onClick={() => toggleMenu('treasury')}
                className="w-full flex items-center justify-between text-xs text-slate-400 font-bold px-2 py-2 mb-1 hover:text-slate-200 hover:bg-slate-800/30 rounded-lg transition-colors cursor-pointer focus:outline-none"
              >
                <span className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-amber-500" />
                  <span>الصناديق والتحويلات المالية</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedMenus.treasury ? '' : 'rotate-90'}`} />
              </button>
              
              <AnimatePresence>
                {expandedMenus.treasury && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col gap-0.5 pr-3 border-r-2 border-slate-800/60 mr-2 overflow-hidden"
                  >
                    <button
                      onClick={() => { setActiveSection('treasury-boxes'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'treasury-boxes'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>صناديق المحصلين والخزائن</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('treasury-transfers'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'treasury-transfers'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>سندات التوريد والتحويلات</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('treasury-statements'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'treasury-statements'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>كشف حساب محصل تفصيلي</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('treasury-performance'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'treasury-performance'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>تقييم أداء المحصلين</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('treasury-daily'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'treasury-daily'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>الجرد والتدفقات اليومية</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
              </>
            )}

            {canSeeHR && (
              <>
                {/* Group: HR */}
            <div className="mt-2">
              <button
                onClick={() => toggleMenu('hr')}
                className="w-full flex items-center justify-between text-xs text-slate-400 font-bold px-2 py-2 mb-1 hover:text-slate-200 hover:bg-slate-800/30 rounded-lg transition-colors cursor-pointer focus:outline-none"
              >
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-500" />
                  <span>وحدة الموارد البشرية (HR)</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedMenus.hr ? '' : 'rotate-90'}`} />
              </button>
              
              <AnimatePresence>
                {expandedMenus.hr && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col gap-0.5 pr-3 border-r-2 border-slate-800/60 mr-2 overflow-hidden"
                  >
                    <button
                      onClick={() => { setActiveSection('hr-employees'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'hr-employees'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>ملفات الموظفين</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('hr-payroll'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'hr-payroll'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>الرواتب والسلف</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
              </>
            )}

            {canSeeOperations && (
              <>
                {/* Group: Operations */}
            <div className="mt-2">
              <button
                onClick={() => toggleMenu('operations')}
                className="w-full flex items-center justify-between text-xs text-slate-400 font-bold px-2 py-2 mb-1 hover:text-slate-200 hover:bg-slate-800/30 rounded-lg transition-colors cursor-pointer focus:outline-none"
              >
                <span className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-orange-500" />
                  <span>العمليات والمناطق</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedMenus.operations ? '' : 'rotate-90'}`} />
              </button>
              
              <AnimatePresence>
                {expandedMenus.operations && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col gap-0.5 pr-3 border-r-2 border-slate-800/60 mr-2 overflow-hidden"
                  >
                    <button
                      onClick={() => { setActiveSection('operations-zones'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'operations-zones'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>المناطق والمحولات</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('operations-requests'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'operations-requests'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>الطلبات الفنية</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
              </>
            )}

            {canSeeReporting && (
              <>
                {/* Group: Reporting */}
            <div className="mt-2">
              <button
                onClick={() => toggleMenu('reporting')}
                className="w-full flex items-center justify-between text-xs text-slate-400 font-bold px-2 py-2 mb-1 hover:text-slate-200 hover:bg-slate-800/30 rounded-lg transition-colors cursor-pointer focus:outline-none"
              >
                <span className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-pink-500" />
                  <span>وحدة التقارير الشاملة</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedMenus.reporting ? '' : 'rotate-90'}`} />
              </button>
              
              <AnimatePresence>
                {expandedMenus.reporting && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col gap-0.5 pr-3 border-r-2 border-slate-800/60 mr-2 overflow-hidden"
                  >
                    <button
                      onClick={() => { setActiveSection('reporting-executive'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'reporting-executive'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span>الملخص التنفيذي الشامل</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('reporting-financial'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'reporting-financial'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>تقارير مالية وأرباح</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('reporting-consumption'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'reporting-consumption'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                      <span>تقارير استهلاك</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('reporting-debt'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'reporting-debt'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                      <span>أعمار الديون والتحصيل</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('reporting-loss'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'reporting-loss'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 animate-pulse" />
                      <span>الفاقد والتحليل الذكي</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('reporting-inventory'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'reporting-inventory'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                      <span>تقارير الجرد والمخزون</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('reporting-hr'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'reporting-hr'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                      <span>تقارير الموظفين والرواتب</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('reporting-statements'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'reporting-statements'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                      <span>كشوف الحسابات الرسمية</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('reporting-due-balances'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'reporting-due-balances'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span>كشف المستحقات والمحصل</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>



              </>
            )}

            {canSeeSMS && (
              <>
                {/* Group 3: SMS System */}
            <div className="mt-2">
              <button
                onClick={() => toggleMenu('sms')}
                className="w-full flex items-center justify-between text-xs text-slate-400 font-bold px-2 py-2 mb-1 hover:text-slate-200 hover:bg-slate-800/30 rounded-lg transition-colors cursor-pointer focus:outline-none"
              >
                <span className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-cyan-500" />
                  <span>نظام الرسائل النصية SMS</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedMenus.sms ? '' : 'rotate-90'}`} />
              </button>
              
              <AnimatePresence>
                {expandedMenus.sms && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col gap-0.5 pr-3 border-r-2 border-slate-800/60 mr-2 overflow-hidden"
                  >
                    <button
                      onClick={() => { setActiveSection('sms-templates'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'sms-templates'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>قوالب الرسائل</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('sms-subscriptions'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'sms-subscriptions'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>دليل المشتركين</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('sms-send'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'sms-send'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>إرسال رسالة</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('sms-failed'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'sms-failed'
                          ? 'bg-slate-800/80 text-white font-bold text-rose-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <span className={activeSection === 'sms-failed' ? 'text-rose-400' : ''}>الرسائل المتعثرة</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    </button>
                    <button
                      onClick={() => { setActiveSection('sms-android'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'sms-android'
                          ? 'bg-slate-800/80 text-emerald-300 font-bold'
                          : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <span>تطبيق أندرويد وAPK</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

              </>
            )}

            {canSeeSystemAdmin && (
              <>
                {/* Group 4: System Admin */}
            <div className="mt-2">
              <button
                onClick={() => {
                  toggleMenu('system');
                  if (!['roles', 'admin-db', 'admin-security', 'station-directory', 'admin-settings', 'admin-services', 'system'].includes(activeSection)) {
                    setActiveSection('station-directory');
                  }
                }}
                className={`w-full flex items-center justify-between text-xs font-bold px-2 py-2 mb-1 hover:text-slate-200 hover:bg-slate-800/30 rounded-lg transition-colors cursor-pointer focus:outline-none ${
                  ['roles', 'admin-db', 'admin-security', 'station-directory', 'admin-settings', 'admin-services', 'system'].includes(activeSection)
                    ? 'text-amber-400 bg-slate-800/50'
                    : 'text-slate-400'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-rose-500" />
                  <span>إدارة النظام والإعدادات</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedMenus.system ? '' : 'rotate-90'}`} />
              </button>
              
              <AnimatePresence>
                {expandedMenus.system && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col gap-0.5 pr-3 border-r-2 border-slate-800/60 mr-2 overflow-hidden"
                  >
                    <button
                      onClick={() => { setActiveSection('roles'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'roles'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>المستخدمين والصلاحيات</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('admin-db'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'admin-db'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>قواعد البيانات والنسخ الاحتياطي</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('admin-security'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'admin-security'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>الأمان وسجل التدقيق</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('station-directory'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'station-directory'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span>تخصيص المظهر وخدمات إضافية</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('admin-settings'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'admin-settings'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>تعرفة الكهرباء والرسوم</span>
                    </button>
                    <button
                      onClick={() => { setActiveSection('admin-services'); setSidebarOpen(false); }}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'admin-services'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>السندات الحرارية والخدمات المتقدمة</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            </>
          )}
          </div>

          {/* Bottom profile and version */}
          <div className="pt-4 border-t border-slate-800/80 flex flex-col gap-3">
            <button
              onClick={onLogout}
              className="flex items-center justify-start gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 border border-transparent hover:border-rose-900/30 transition-all cursor-pointer w-full"
            >
              <span>تسجيل الخروج من النظام</span>
              <LogOut className="w-4 h-4 shrink-0" />
            </button>
            
            <div className="p-3 bg-slate-800 rounded-xl border border-slate-700/60 flex items-center justify-between gap-3 text-right">
              <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center text-slate-900 font-bold font-mono">
                {currentUser.name.substring(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400">مدير عام المحطة</p>
              </div>
            </div>
          </div>
        </nav>


        {/* MAIN WORKSPACE CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative">
          
          <AnimatePresence mode="wait">
            {/* 1. DASHBOARD VIEW */}
            {activeSection === 'dashboard' && (
              <motion.div
                key="dashboard-sec"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6">
                <AdminDashboardOverview
                  subscribers={subscribers}
                  readings={readings}
                  payments={payments}
                  settings={settings}
                  currentUser={currentUser}
                  users={users}
                  expenses={expenses}
                  purchases={purchases}
                  treasuryTransfers={treasuryTransfers}
                  auditLogs={auditLogs}
                  inventory={inventory}
                  onNavigateSection={(sec) => setActiveSection(sec)}
                />
              </motion.div>
            )}

            {/* 2. SUBSCRIBERS MANAGEMENT */}
            {activeSection === 'subscribers' && (
              <AdminSubscribers 
                subscribers={subscribers}
                readings={readings}
                payments={payments}
                settings={settings}
                currentUser={currentUser}
                onUpdateSubscribers={onUpdateSubscribers}
                onAddAuditLog={onAddAuditLog}
              />
            )}

            {/* 3. DATABASE MANAGEMENT (إدارة قواعد البيانات) */}
        {activeSection === 'inventory-catalog' && (
          <AdminInventory 
            activeTab="catalog"
            inventory={inventory}
            inventoryTransactions={inventoryTransactions}
            onUpdateInventory={onUpdateInventory}
            onUpdateInventoryTransactions={onUpdateInventoryTransactions}
            currentUser={currentUser}
            logAction={logAction}
            settings={settings}
            employees={employees}
            subscribers={subscribers}
          />
        )}
        {activeSection === 'inventory-transactions' && (
          <AdminInventory 
            activeTab="transactions"
            inventory={inventory}
            inventoryTransactions={inventoryTransactions}
            onUpdateInventory={onUpdateInventory}
            onUpdateInventoryTransactions={onUpdateInventoryTransactions}
            currentUser={currentUser}
            logAction={logAction}
            settings={settings}
            employees={employees}
            subscribers={subscribers}
          />
        )}
        {(activeSection === 'inventory-alerts' || activeSection === 'inventory') && (
          <AdminInventory 
            activeTab="alerts"
            inventory={inventory}
            inventoryTransactions={inventoryTransactions}
            onUpdateInventory={onUpdateInventory}
            onUpdateInventoryTransactions={onUpdateInventoryTransactions}
            currentUser={currentUser}
            logAction={logAction}
            settings={settings}
            employees={employees}
            subscribers={subscribers}
          />
        )}
        {activeSection === 'hr-employees' && (
          <AdminHR 
            settings={settings}
            currentUser={currentUser}
            activeTab="employees"
            logAction={logAction}
            employees={employees}
            onUpdateEmployees={onUpdateEmployees}
            employeeTxs={employeeTxs}
            onUpdateEmployeeTxs={onUpdateEmployeeTxs}
            users={users}
            onUpdateUsers={onUpdateUsers}
          />
        )}
        {activeSection === 'hr-payroll' && (
          <AdminHR 
            settings={settings}
            currentUser={currentUser}
            activeTab="payroll"
            logAction={logAction}
            employees={employees}
            onUpdateEmployees={onUpdateEmployees}
            employeeTxs={employeeTxs}
            onUpdateEmployeeTxs={onUpdateEmployeeTxs}
            users={users}
            onUpdateUsers={onUpdateUsers}
          />
        )}
        
        {activeSection === 'accounting' && (
          <AdminAccounting 
            settings={settings} 
            onUpdateSettings={onUpdateSettings}
            onAddAuditLog={onAddAuditLog}
            currentUser={currentUser} 
            subscribers={subscribers} 
            readings={readings} 
            payments={payments}
            onUpdateSubscribers={onUpdateSubscribers}
            onUpdateReadings={onUpdateReadings}
            onUpdatePayments={onUpdatePayments}
            treasuryTransfers={treasuryTransfers}
            onUpdateTreasuryTransfers={onUpdateTreasuryTransfers}
            expenses={expenses}
            onUpdateExpenses={onUpdateExpenses}
            purchases={purchases}
            onUpdatePurchases={onUpdatePurchases}
            manualJournalEntries={manualJournalEntries}
            onUpdateManualJournalEntries={onUpdateManualJournalEntries}
            employees={employees}
            onUpdateEmployees={onUpdateEmployees}
            employeeTxs={employeeTxs}
            onUpdateEmployeeTxs={onUpdateEmployeeTxs}
            connections={connections}
            onUpdateConnections={onUpdateConnections}
            inventory={inventory}
            onUpdateInventory={onUpdateInventory}
            inventoryTransactions={inventoryTransactions}
            onUpdateInventoryTransactions={onUpdateInventoryTransactions}
            users={users}
          />
        )}

        {activeSection === 'partners' && (
          <AdminPartners
            settings={settings}
            currentUser={currentUser}
            partners={partners}
            onUpdatePartners={onUpdatePartners || (() => {})}
            partnerTransactions={partnerTransactions}
            onUpdatePartnerTransactions={onUpdatePartnerTransactions || (() => {})}
            profitDistributions={profitDistributions}
            onUpdateProfitDistributions={onUpdateProfitDistributions || (() => {})}
            readings={readings}
            payments={payments}
            expenses={expenses}
            purchases={purchases}
            onAddAuditLog={onAddAuditLog}
          />
        )}

        {(activeSection === 'treasury-boxes' || 
          activeSection === 'treasury-transfers' || 
          activeSection === 'treasury-statements' || 
          activeSection === 'treasury-performance' || 
          activeSection === 'treasury-daily') && (
          <AdminAccounting 
            settings={settings} 
            onUpdateSettings={onUpdateSettings}
            onAddAuditLog={onAddAuditLog}
            currentUser={currentUser} 
            subscribers={subscribers} 
            readings={readings} 
            payments={payments}
            onUpdateSubscribers={onUpdateSubscribers}
            onUpdateReadings={onUpdateReadings}
            onUpdatePayments={onUpdatePayments}
            initialTab="treasury"
            initialTreasurySubTab={
              activeSection === 'treasury-boxes' ? 'boxes' :
              activeSection === 'treasury-transfers' ? 'transfers' :
              activeSection === 'treasury-statements' ? 'statements' :
              activeSection === 'treasury-performance' ? 'performance' :
              'daily'
            }
            treasuryTransfers={treasuryTransfers}
            onUpdateTreasuryTransfers={onUpdateTreasuryTransfers}
            expenses={expenses}
            onUpdateExpenses={onUpdateExpenses}
            purchases={purchases}
            onUpdatePurchases={onUpdatePurchases}
            manualJournalEntries={manualJournalEntries}
            onUpdateManualJournalEntries={onUpdateManualJournalEntries}
            employees={employees}
            onUpdateEmployees={onUpdateEmployees}
            employeeTxs={employeeTxs}
            onUpdateEmployeeTxs={onUpdateEmployeeTxs}
            connections={connections}
            onUpdateConnections={onUpdateConnections}
            inventory={inventory}
            onUpdateInventory={onUpdateInventory}
            inventoryTransactions={inventoryTransactions}
            onUpdateInventoryTransactions={onUpdateInventoryTransactions}
            users={users}
          />
        )}

        
            {(activeSection === 'reporting-executive' ||
              activeSection === 'reporting-financial' ||
              activeSection === 'reporting-consumption' ||
              activeSection === 'reporting-debt' ||
              activeSection === 'reporting-loss' ||
              activeSection === 'reporting-inventory' ||
              activeSection === 'reporting-hr' ||
              activeSection === 'reporting-statements' ||
              activeSection === 'reporting-due-balances') && (
              <AdminReports
                subscribers={subscribers}
                readings={readings}
                payments={payments}
                settings={settings}
                inventory={inventory}
                inventoryTransactions={inventoryTransactions}
                expenses={expenses}
                purchases={purchases}
                treasuryTransfers={treasuryTransfers}
                employees={employees}
                employeeTxs={employeeTxs}
                connections={connections}
                currentUser={currentUser}
                users={users}
                activeTab={
                  activeSection === 'reporting-executive' ? 'executive' :
                  activeSection === 'reporting-financial' ? 'financial' :
                  activeSection === 'reporting-consumption' ? 'consumption' :
                  activeSection === 'reporting-debt' ? 'debt_aging' :
                  activeSection === 'reporting-loss' ? 'loss' :
                  activeSection === 'reporting-inventory' ? 'inventory' :
                  activeSection === 'reporting-hr' ? 'hr_payroll' :
                  activeSection === 'reporting-due-balances' ? 'due_balances' :
                  'statements'
                }
              />
            )}


            {activeSection === 'debt' && (
              <AdminDebt subscribers={subscribers} readings={readings} payments={payments} settings={settings} />
            )}

            {activeSection === 'zones' && (
              <AdminZones subscribers={subscribers} settings={settings} onUpdateSettings={onUpdateSettings} onUpdateSubscribers={onUpdateSubscribers} />
            )}

            {activeSection === 'operations-zones' && (
              <AdminOperations subscribers={subscribers} settings={settings} currentUser={currentUser} onUpdateSettings={onUpdateSettings} onUpdateSubscribers={onUpdateSubscribers} activeTab="zones" techRequests={techRequests} onUpdateTechRequests={onUpdateTechRequests} employees={employees} />
            )}
            {activeSection === 'operations-requests' && (
              <AdminOperations subscribers={subscribers} settings={settings} currentUser={currentUser} onUpdateSettings={onUpdateSettings} onUpdateSubscribers={onUpdateSubscribers} activeTab="requests" techRequests={techRequests} onUpdateTechRequests={onUpdateTechRequests} employees={employees} />
            )}


            {activeSection === 'roles' && (
              <div>
                {renderSystemAdminHeader('roles')}
                <AdminRoles 
                  users={users} 
                  onUpdateUsers={onUpdateUsers}
                  currentUser={currentUser}
                  onAddAuditLog={onAddAuditLog}
                  auditLogs={auditLogs}
                  onClearAuditLogs={onClearAuditLogs}
                  employees={employees}
                  onUpdateEmployees={onUpdateEmployees}
                  initialTab="roles"
                />
              </div>
            )}
            {activeSection === 'admin-db' && (
              <div>
                {renderSystemAdminHeader('admin-db')}
                <AdminDatabase
                  subscribers={subscribers}
                  readings={readings}
                  payments={payments}
                  settings={settings}
                  users={users}
                  auditLogs={auditLogs}
                  inventory={inventory}
                  inventoryTransactions={inventoryTransactions}
                  treasuryTransfers={treasuryTransfers}
                  expenses={expenses}
                  purchases={purchases}
                  manualJournalEntries={manualJournalEntries}
                  employees={employees}
                  employeeTxs={employeeTxs}
                  connections={connections}
                  techRequests={techRequests}
                  onUpdateSubscribers={onUpdateSubscribers}
                  onUpdateReadings={onUpdateReadings}
                  onUpdatePayments={onUpdatePayments}
                  onUpdateSettings={onUpdateSettings}
                  onUpdateUsers={onUpdateUsers}
                  onAddAuditLog={onAddAuditLog}
                  onResetDatabase={onResetDatabase}
                  onWipeAllData={onWipeAllData}
                  currentUser={currentUser}
                  onUpdateInventory={onUpdateInventory}
                  onUpdateInventoryTransactions={onUpdateInventoryTransactions}
                  onUpdateTreasuryTransfers={onUpdateTreasuryTransfers}
                  onUpdateExpenses={onUpdateExpenses}
                  onUpdatePurchases={onUpdatePurchases}
                  onUpdateManualJournalEntries={onUpdateManualJournalEntries}
                  onUpdateEmployees={onUpdateEmployees}
                  onUpdateEmployeeTxs={onUpdateEmployeeTxs}
                  onUpdateConnections={onUpdateConnections}
                  onUpdateTechRequests={onUpdateTechRequests}
                />
              </div>
            )}

            {/* 4. SECURITY & PERMISSIONS (إدارة الأمان والصلاحيات) */}
            {activeSection === 'admin-security' && (
              <div>
                {renderSystemAdminHeader('admin-security')}
                <AdminRoles 
                  users={users} 
                  onUpdateUsers={onUpdateUsers}
                  currentUser={currentUser}
                  onAddAuditLog={onAddAuditLog}
                  auditLogs={auditLogs}
                  onClearAuditLogs={onClearAuditLogs}
                  employees={employees}
                  onUpdateEmployees={onUpdateEmployees}
                  initialTab="policies"
                />
              </div>
            )}

            {/* 5. STATION DIRECTORY & IDENTITY (دليل وسجل هوية المحطة والشعار) */}
            {(activeSection === 'station-directory' || activeSection === 'system') && (
              <motion.div
                key="station-dir-sec"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 text-right">
                
                {renderSystemAdminHeader(activeSection)}
                
                <StationDirectoryManager
                  settings={settings}
                  onUpdateSettings={onUpdateSettings}
                  onAddAuditLog={onAddAuditLog}
                />
              </motion.div>
            )}

            {/* 5.1 SYSTEM SETTINGS (إدارة إعدادات النظام والتعرفة) */}
            {activeSection === 'admin-settings' && (
              <AdminSettingsTariff
                settings={settings}
                onUpdateSettings={onUpdateSettings}
                onAddAuditLog={onAddAuditLog}
                currentUser={currentUser}
                setSaveToastMessage={setSaveToastMessage}
                headerRenderer={() => renderSystemAdminHeader('admin-settings')}
              />
            )}

            {/* 5.2 THERMAL PRINT & SERVICES SETTINGS (تخصيص السندات الحرارية والطباعة) */}
            {activeSection === 'admin-services' && (
              <motion.div
                key="services-sec"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 text-right">
                
                {renderSystemAdminHeader('admin-services')}

                <ThermalSettingsManager
                  settings={settings}
                  onUpdateSettings={onUpdateSettings}
                  onSaveSettings={handleSaveSettings}
                />
              </motion.div>
            )}

            {/* 6. ENHANCED POSTINGS & TRANSFERS (إدارة الترحيلات والتحويلات المالية) */}
            {activeSection === 'admin-postings' && (
              <AdminPostings
                readings={readings}
                payments={payments}
                subscribers={subscribers}
                settings={settings}
                currentUser={currentUser}
                treasuryTransfers={treasuryTransfers}
                onUpdateReadings={onUpdateReadings}
                onUpdatePayments={onUpdatePayments}
                onUpdateSubscribers={onUpdateSubscribers}
                onUpdateTreasuryTransfers={onUpdateTreasuryTransfers}
                onAddAuditLog={onAddAuditLog}
                onSendReadingSMS={handleSendReadingSMS}
                onSendPaymentSMS={handleSendPaymentSMS}
                onCloseFiscalCycle={handleCloseFiscalCycle}
              />
            )}

            {/* SMS Management Sections & Android Suite */}
            {(activeSection === 'sms-templates' || activeSection === 'sms-subscriptions' || activeSection === 'sms-failed' || activeSection === 'sms-send' || activeSection === 'sms-outbox' || activeSection === 'sms-gateway' || activeSection === 'sms-android' || activeSection === 'android-app') && (
              <AdminSMSCenter
                activeSection={activeSection === 'android-app' ? 'sms-android' : activeSection}
                subscribers={subscribers}
                readings={readings}
                payments={payments}
                settings={settings}
                currentUser={currentUser}
                smsTemplates={smsTemplates}
                onUpdateSettings={onUpdateSettings}
                onUpdateSmsTemplates={(newTpls) => {
                  setSmsTemplates(newTpls);
                  if (onUpdateSmsTemplates) onUpdateSmsTemplates(newTpls);
                }}
                onSaveSmsTemplate={(t) => {
                  setSmsTemplates(prev => {
                    const exists = prev.some(old => old.id === t.id);
                    return exists ? prev.map(old => old.id === t.id ? t : old) : [...prev, t];
                  });
                  if (onSaveSmsTemplate) onSaveSmsTemplate(t);
                }}
                onDeleteSmsTemplate={(id) => {
                  setSmsTemplates(prev => prev.filter(old => old.id !== id));
                  if (onDeleteSmsTemplate) onDeleteSmsTemplate(id);
                }}
                onClearAllSmsTemplates={() => {
                  setSmsTemplates([]);
                  if (onClearAllSmsTemplates) {
                    onClearAllSmsTemplates();
                  } else if (onUpdateSmsTemplates) {
                    onUpdateSmsTemplates([]);
                  }
                }}
                onClearAllFailedSms={onClearAllFailedSms}
                onDeleteFailedSms={onDeleteFailedSms}
                onUpdateReadings={onUpdateReadings}
                onUpdatePayments={onUpdatePayments}
                onUpdateSubscribers={onUpdateSubscribers}
                onAddAuditLog={onAddAuditLog}
                setActiveSection={setActiveSection}
              />
            )}

          </AnimatePresence>
        </main>
      </div>

      {/* NEW SUBSCRIBER MODAL */}
      {showAddSubModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-right space-y-4"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <button 
                onClick={() => setShowAddSubModal(false)}
                className="text-slate-500 hover:text-slate-300">
                إغلاق
              </button>
              <h3 className="font-bold text-slate-200 text-sm">تسجيل مشترك جديد ومقايسة عداد</h3>
            </div>

            <form onSubmit={handleAddSubscriber} className="space-y-4 text-xs text-right">
              <div>
                <label className="block text-slate-400 mb-1">الاسم الكامل للمشترك</label>
                <input
                  type="text"
                  required
                  value={newSubName}
                  onChange={e => setNewSubName(e.target.value)}
                  placeholder="مثال: صالح عمر الجبري"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">رقم الهاتف</label>
                <input
                  type="text"
                  value={newSubPhone}
                  onChange={e => setNewSubPhone(e.target.value)}
                  placeholder="مثال: 777321456"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">رقم تسلسلي للعداد</label>
                  <input
                    type="text"
                    required
                    value={newSubMeter}
                    onChange={e => setNewSubMeter(e.target.value)}
                    placeholder="مثال: M-10905"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">القراءة الأولية للعداد</label>
                  <input
                    type="number"
                    value={newSubInitial}
                    onChange={e => setNewSubInitial(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">المنطقة الجغرافية</label>
                  <select
                    value={newSubZone}
                    onChange={e => setNewSubZone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-300 text-right focus:outline-none focus:border-amber-500">
                    <option value="">-- اختر المنطقة --</option>
                    {(Array.isArray(settings.zones) ? settings.zones : []).map((z: any) => {
                      const val = typeof z === 'object' ? z.name : z;
                      return val ? <option key={val} value={val}>{val}</option> : null;
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">المحول المغذي</label>
                  <select
                    value={newSubTransformer}
                    onChange={e => setNewSubTransformer(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-300 text-right focus:outline-none focus:border-amber-500">
                    <option value="">-- اختر المحول --</option>
                    {(Array.isArray(settings.transformers) ? settings.transformers : []).map((t: any) => {
                      const val = typeof t === 'object' ? t.name : t;
                      return val ? <option key={val} value={val}>{val}</option> : null;
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">فئة التعرفة الكهربائية</label>
                  <select
                    value={newSubTariff}
                    onChange={e => setNewSubTariff(e.target.value as TariffType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-300 text-right focus:outline-none focus:border-amber-500">
                    <option value="residential">منزلية (سكني)</option>
                    <option value="commercial">مؤسسة (تجاري)</option>
                    <option value="industrial">مصنع (صناعي)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">الرصيد الافتتاحي (اختياري)</label>
                <input
                  type="number"
                  value={newSubOpeningBalance}
                  onChange={e => setNewSubOpeningBalance(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-lg text-xs transition-all cursor-pointer">
                اعتماد وتركيب العداد للمشترك
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* EDIT SUBSCRIBER MODAL */}
      {editingSub && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-right space-y-4"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <button 
                onClick={() => setEditingSub(null)}
                className="text-slate-500 hover:text-slate-300">
                إلغاء
              </button>
              <h3 className="font-bold text-slate-200 text-sm">تعديل بيانات العداد والمشترك</h3>
            </div>

            <form onSubmit={saveSubEdit} className="space-y-4 text-xs text-right">
              <div>
                <label className="block text-slate-400 mb-1">الاسم الكامل للمشترك</label>
                <input
                  type="text"
                  required
                  value={editingSub.name}
                  onChange={e => setEditingSub({ ...editingSub, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">رقم الهاتف</label>
                <input
                  type="text"
                  value={editingSub.phone}
                  onChange={e => setEditingSub({ ...editingSub, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">رقم العداد (مغلق للتعديل)</label>
                  <input
                    type="text"
                    disabled
                    value={editingSub.meterNumber}
                    className="w-full bg-slate-950 border border-slate-800/40 rounded-lg py-2 px-3 text-slate-500 text-right cursor-not-allowed font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">تعديل الرصيد المالي المستحق (القائم)</label>
                  <input
                    type="number"
                    value={editingSub.currentBalance}
                    onChange={e => {
                      const newCurr = parseFloat(e.target.value) || 0;
                      const newOpening = deriveOpeningFromCurrentBalance(newCurr, editingSub, readings, payments);
                      setEditingSub({ ...editingSub, currentBalance: newCurr, openingBalance: newOpening });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-rose-400 font-bold text-right focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">المنطقة الجغرافية</label>
                  <select
                    value={editingSub.zone}
                    onChange={e => setEditingSub({ ...editingSub, zone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-300 text-right focus:outline-none focus:border-amber-500">
                    <option value="">-- اختر المنطقة --</option>
                    {(Array.isArray(settings.zones) ? settings.zones : []).map((z: any) => {
                      const val = typeof z === 'object' ? z.name : z;
                      return val ? <option key={val} value={val}>{val}</option> : null;
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">المحول المغذي</label>
                  <select
                    value={editingSub.transformer || ''}
                    onChange={e => setEditingSub({ ...editingSub, transformer: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-300 text-right focus:outline-none focus:border-amber-500">
                    <option value="">-- اختر المحول --</option>
                    {(Array.isArray(settings.transformers) ? settings.transformers : []).map((t: any) => {
                      const val = typeof t === 'object' ? t.name : t;
                      return val ? <option key={val} value={val}>{val}</option> : null;
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">فئة التعرفة الكهربائية</label>
                  <select
                    value={editingSub.tariffType}
                    onChange={e => setEditingSub({ ...editingSub, tariffType: e.target.value as TariffType })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-300 text-right focus:outline-none focus:border-amber-500">
                    <option value="residential">منزلية (سكني)</option>
                    <option value="commercial">مؤسسة (تجاري)</option>
                    <option value="industrial">مصنع (صناعي)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">
                    <span>القراءة الافتتاحية (بداية الخدمة)</span>
                    <span className="text-[10px] text-cyan-400 mr-1">(ك.و)</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editingSub.initialReading ?? 0}
                    onChange={e => {
                      const newInit = parseFloat(e.target.value) || 0;
                      setEditingSub({ 
                        ...editingSub, 
                        initialReading: newInit,
                        currentReading: (editingSub.currentReading === undefined || editingSub.currentReading < newInit) ? newInit : editingSub.currentReading
                      });
                    }}
                    className="w-full bg-slate-950 border border-amber-500/50 rounded-lg py-2 px-3 text-cyan-300 font-mono font-bold text-right focus:outline-none focus:border-amber-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">حالة المشترك والخدمة</label>
                  <select
                    value={editingSub.status || 'active'}
                    onChange={e => setEditingSub({ ...editingSub, status: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-right focus:outline-none focus:border-amber-500"
                  >
                    <option value="active">🟢 نشط (متصل)</option>
                    <option value="suspended">🟡 موقوف مؤقتاً</option>
                    <option value="disconnected">🔴 مفصول نهائياً</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">تعديل الرصيد الافتتاحي (السابق)</label>
                <input
                  type="number"
                  value={editingSub.openingBalance || 0}
                  onChange={e => {
                    const newOpening = parseFloat(e.target.value) || 0;
                    const newCurr = getExactSubscriberBalance({ ...editingSub, openingBalance: newOpening }, readings, payments);
                    setEditingSub({ ...editingSub, openingBalance: newOpening, currentBalance: newCurr });
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-amber-400 font-bold text-right focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-lg text-xs transition-all cursor-pointer">
                حفظ التعديلات المحدثة
              </button>
            </form>
          </motion.div>
        </div>
      )}

      <PermissionsModal 
        isOpen={showPermissionsModal} 
        onClose={() => setShowPermissionsModal(false)} 
      />

      <AndroidSyncModal 
        isOpen={showAndroidSyncModal} 
        onClose={() => setShowAndroidSyncModal(false)} 
      />

      {/* Preview SMS Modal */}
      {previewSmsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 text-right">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <button
                onClick={() => setPreviewSmsModal(null)}
                className="text-slate-500 hover:text-slate-300 p-1">
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-sm">{previewSmsModal.title}</h3>
                <Eye className="w-4 h-4 text-sky-400" />
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <div className="text-left font-mono font-bold text-amber-400">
                  {previewSmsModal.phone}
                </div>
                <div className="text-right">
                  <span className="text-slate-400">المستلم: </span>
                  <span className="font-bold text-slate-200">{previewSmsModal.recipientName}</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-400 px-1">
                <span>القالب المستخدم: <strong className="text-amber-400">{previewSmsModal.templateName}</strong></span>
                <span>نص الرسالة النهائي الذي سيصل للمشترك:</span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 font-sans text-sm whitespace-pre-wrap leading-relaxed min-h-[140px] select-text">
                {previewSmsModal.content}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              {previewSmsModal.onSend && (
                <button
                  type="button"
                  onClick={() => {
                    const sendFn = previewSmsModal.onSend;
                    setPreviewSmsModal(null);
                    if (sendFn) sendFn();
                  }}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-amber-500/20 cursor-pointer">
                  <Send className="w-3.5 h-3.5" />
                  <span>إرسال الرسالة الآن</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(previewSmsModal.content);
                  alert('تم نسخ نص الرسالة إلى الحافظة بنجاح');
                }}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer">
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ النص</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewSmsModal(null)}
                className="px-4 py-2.5 bg-slate-950 hover:bg-slate-900 text-slate-400 font-bold rounded-xl text-xs transition-colors border border-slate-800 cursor-pointer">
                إغلاق
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Floating Save Toast Banner */}
      <AnimatePresence>
        {saveToastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-slate-100 border border-emerald-500/40 shadow-2xl px-5 py-3 rounded-2xl flex items-center gap-3 backdrop-blur-md"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4" />
            </div>
            <div className="text-right">
              <div className="font-bold text-xs text-white">{saveToastMessage}</div>
              <div className="text-[10px] text-emerald-400 font-medium">تمت المزامنة السحابية والحفظ المحلي بنجاح</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset Defaults Confirmation Modal */}
      {showResetDefaultsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-right"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => setShowResetDefaultsModal(false)}
                className="text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 text-amber-400">
                <h3 className="font-bold text-sm">استعادة إعدادات النظام الافتراضية</h3>
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>هل أنت متأكد من رغبتك في إعادة تعيين إعدادات النظام والتعرفة ودليل المحطة إلى القيم الافتراضية؟</p>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-[11px] text-slate-400">
                <div>• سيتم تعيين تعرفة السكني: 200 ر.ي، التجاري: 250 ر.ي، الصناعي: 350 ر.ي.</div>
                <div>• سيتم تعيين الرسوم الثابتة: 1000 ر.ي، والخدمة: 500 ر.ي، والضريبة: 5%.</div>
                <div>• لن يتم التأثير على سجلات المشتركين أو الفواتير المحفوظة.</div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  onUpdateSettings(DEFAULT_SETTINGS);
                  logAction('إعادة ضبط المصنع', 'تمت استعادة إعدادات النظام والتعرفة إلى القيم الافتراضية');
                  setShowResetDefaultsModal(false);
                  setSaveToastMessage('تمت استعادة الإعدادات الافتراضية للنظام بنجاح');
                  setTimeout(() => setSaveToastMessage(null), 3500);
                }}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>تأكيد استعادة الافتراضي</span>
              </button>
              <button
                type="button"
                onClick={() => setShowResetDefaultsModal(false)}
                className="px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-300 font-bold rounded-xl text-xs transition-colors border border-slate-800 cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
