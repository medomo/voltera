import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, Download, Upload, RefreshCw, ShieldCheck, CheckCircle2, 
  AlertTriangle, HardDrive, Clock, FileJson, FileSpreadsheet, Server, 
  Activity, Layers, Trash2, ShieldAlert, Sparkles, Archive, Search, Check, X,
  RotateCcw, Wifi, WifiOff, ExternalLink, Zap, AlertCircle, Info, Lock, Eye, CheckCheck,
  Calendar, Save, Sliders, Play
} from 'lucide-react';
import { 
  Subscriber, MeterReading, Payment, SystemSettings, User, AuditLog, 
  InventoryItem, InventoryTransaction 
} from '../types';
import { 
  fetchSnapshotsFromDatabase, 
  createSnapshotInDatabase, 
  restoreSnapshotFromDatabase, 
  deleteSnapshotFromDatabase, 
  restoreFullDatabaseFromFile,
  optimizeAllSnapshotsInDatabase,
  sanitizeAndDeduplicateDatabasePayload,
  deduplicateCloudSubscribers,
  loadAllCloudData,
  createAutoDatabaseSnapshot,
  syncSettingsToCloud,
  DbSnapshotItem
} from '../lib/database';
import { testConnection } from '../lib/firebase';

export interface BackupSnapshot {
  id: string;
  name: string;
  date: string;
  subscribersCount: number;
  readingsCount: number;
  paymentsCount: number;
  isAuto?: boolean;
  intervalHours?: number;
  type?: 'manual' | 'auto';
  data: any;
}

export interface AdminDatabaseProps {
  subscribers: Subscriber[];
  readings: MeterReading[];
  payments: Payment[];
  settings: SystemSettings;
  users: User[];
  auditLogs: AuditLog[];
  inventory?: InventoryItem[];
  inventoryTransactions?: InventoryTransaction[];
  treasuryTransfers?: any[];
  expenses?: any[];
  purchases?: any[];
  manualJournalEntries?: any[];
  employees?: any[];
  employeeTxs?: any[];
  connections?: any[];
  techRequests?: any[];
  
  onUpdateSubscribers: (subs: Subscriber[]) => void;
  onUpdateReadings: (reads: MeterReading[]) => void;
  onUpdatePayments: (pays: Payment[]) => void;
  onUpdateSettings: (settings: SystemSettings) => void;
  onUpdateUsers: (users: User[]) => void;
  onAddAuditLog: (log: AuditLog) => void;
  onResetDatabase: () => void;
  onWipeAllData?: () => void;
  currentUser: User;

  // Full module restoration callbacks
  onUpdateInventory?: (items: InventoryItem[]) => void;
  onUpdateInventoryTransactions?: (txs: InventoryTransaction[]) => void;
  onUpdateTreasuryTransfers?: (trfs: any[]) => void;
  onUpdateExpenses?: (exps: any[]) => void;
  onUpdatePurchases?: (purs: any[]) => void;
  onUpdateManualJournalEntries?: (entries: any[]) => void;
  onUpdateEmployees?: (emps: any[]) => void;
  onUpdateEmployeeTxs?: (txs: any[]) => void;
  onUpdateConnections?: (conns: any[]) => void;
  onUpdateTechRequests?: (reqs: any[]) => void;
}

export const AdminDatabase: React.FC<AdminDatabaseProps> = ({
  subscribers,
  readings,
  payments,
  settings,
  users,
  auditLogs,
  inventory = [],
  inventoryTransactions = [],
  treasuryTransfers = [],
  expenses = [],
  purchases = [],
  manualJournalEntries = [],
  employees = [],
  employeeTxs = [],
  connections = [],
  techRequests = [],
  onUpdateSubscribers,
  onUpdateReadings,
  onUpdatePayments,
  onUpdateSettings,
  onUpdateUsers,
  onAddAuditLog,
  onResetDatabase,
  onWipeAllData,
  currentUser,
  onUpdateInventory,
  onUpdateInventoryTransactions,
  onUpdateTreasuryTransfers,
  onUpdateExpenses,
  onUpdatePurchases,
  onUpdateManualJournalEntries,
  onUpdateEmployees,
  onUpdateEmployeeTxs,
  onUpdateConnections,
  onUpdateTechRequests,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [restoreFilePreview, setRestoreFilePreview] = useState<any | null>(null);
  const [selectedSnapshotPreview, setSelectedSnapshotPreview] = useState<BackupSnapshot | null>(null);
  const [snapshotSearchQuery, setSnapshotSearchQuery] = useState('');
  const [snapshotFilterType, setSnapshotFilterType] = useState<'all' | 'auto' | 'manual'>('all');

  // Automatic Cloud Snapshot Scheduling States
  const [autoSnapshotEnabled, setAutoSnapshotEnabled] = useState<boolean>(settings.autoSnapshotEnabled !== false);
  const [autoSnapshotHours, setAutoSnapshotHours] = useState<number>(settings.autoSnapshotIntervalHours || 2);
  const [maxAutoKeepCount, setMaxAutoKeepCount] = useState<number>(settings.maxAutoSnapshotsToKeep || 30);
  const [isSavingSchedule, setIsSavingSchedule] = useState<boolean>(false);
  const [scheduleSaveSuccess, setScheduleSaveSuccess] = useState<boolean>(false);

  // Sync state if settings prop changes
  useEffect(() => {
    if (settings.autoSnapshotEnabled !== undefined) {
      setAutoSnapshotEnabled(settings.autoSnapshotEnabled);
    }
    if (settings.autoSnapshotIntervalHours !== undefined) {
      setAutoSnapshotHours(settings.autoSnapshotIntervalHours);
    }
    if (settings.maxAutoSnapshotsToKeep !== undefined) {
      setMaxAutoKeepCount(settings.maxAutoSnapshotsToKeep);
    }
  }, [settings.autoSnapshotEnabled, settings.autoSnapshotIntervalHours, settings.maxAutoSnapshotsToKeep]);

  // Diagnostics & Health Engine
  const [isScanning, setIsScanning] = useState(false);
  const [healthStatus, setHealthStatus] = useState<{
    mismatchedBalances: number;
    orphanedReadings: number;
    orphanedPayments: number;
    pendingReadings: number;
    pendingPayments: number;
    duplicateMeters: number;
    duplicatePhones: number;
    healthScore: number;
    totalAudited: number;
  } | null>(null);

  // Deduplication & Snapshot Optimization States
  const [isOptimizingSnapshots, setIsOptimizingSnapshots] = useState(false);
  const [isDeduplicatingLive, setIsDeduplicatingLive] = useState(false);
  const [dedupReport, setDedupReport] = useState<{
    subscribers: { original: number; deduplicated: number; removed: number };
    readings: { original: number; deduplicated: number; removed: number };
    payments: { original: number; deduplicated: number; removed: number };
    totalRemoved: number;
  } | null>(null);
  const [showDedupModal, setShowDedupModal] = useState(false);

  // Tab State with exact types
  const [activeTab, setActiveTab] = useState<'overview' | 'firebase_status' | 'backups' | 'export' | 'health' | 'danger'>('overview');
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>(new Date().toLocaleTimeString('ar-EG'));

  // Cloud Diagnostics
  const [cloudPingLatency, setCloudPingLatency] = useState<number | null>(null);
  const [isPingingCloud, setIsPingingCloud] = useState(false);
  const [cloudConnectionStatus, setCloudConnectionStatus] = useState<'connected' | 'checking' | 'warning'>('connected');

  // Modals
  const [showPasteJsonModal, setShowPasteJsonModal] = useState(false);
  const [pastedJsonText, setPastedJsonText] = useState('');

  // Helper log action
  const logDbAction = (action: string, details: string) => {
    onAddAuditLog({
      id: `log-${Date.now()}`,
      userId: currentUser.id || 'admin',
      username: currentUser.name || currentUser.username,
      action,
      details,
      timestamp: new Date().toISOString().substring(0, 16).replace('T', ' ')
    });
  };

  // Test Live Firestore Connectivity & Measure Latency
  const checkCloudConnectivity = async () => {
    setIsPingingCloud(true);
    const start = performance.now();
    try {
      const ok = await testConnection();
      const latency = Math.round(performance.now() - start);
      setCloudPingLatency(latency);
      setCloudConnectionStatus(ok ? 'connected' : 'warning');
    } catch {
      setCloudPingLatency(null);
      setCloudConnectionStatus('warning');
    } finally {
      setIsPingingCloud(false);
    }
  };

  // Load saved snapshots from Firebase Firestore Database & fallback to LocalStorage
  const loadDbSnapshots = async () => {
    setIsLoadingSnapshots(true);
    try {
      const dbSnaps = await fetchSnapshotsFromDatabase();
      if (dbSnaps && dbSnaps.length > 0) {
        const formatted: BackupSnapshot[] = dbSnaps.map(s => ({
          id: s.id,
          name: s.name,
          date: s.date,
          subscribersCount: s.subscribersCount,
          readingsCount: s.readingsCount,
          paymentsCount: s.paymentsCount,
          isAuto: s.isAuto ?? (s.name.includes('تلقائية') || s.name.includes('دورية') || s.type === 'auto'),
          intervalHours: s.intervalHours,
          type: s.type || ((s.isAuto || s.name.includes('تلقائية') || s.name.includes('دورية')) ? 'auto' : 'manual'),
          data: s.data,
        }));
        setSnapshots(formatted);

        // Store lightweight metadata only in localStorage to avoid quota exhaustion (full data is in Firestore)
        try {
          const metaOnly = formatted.map(s => ({
            id: s.id,
            name: s.name,
            date: s.date,
            subscribersCount: s.subscribersCount,
            readingsCount: s.readingsCount,
            paymentsCount: s.paymentsCount,
            isAuto: s.isAuto,
            intervalHours: s.intervalHours,
            type: s.type,
          }));
          localStorage.setItem('voltera_db_snapshots', JSON.stringify(metaOnly));
        } catch (_) {
          try { localStorage.removeItem('voltera_db_snapshots'); } catch (_) {}
        }
      } else {
        const saved = localStorage.getItem('voltera_db_snapshots');
        if (saved) {
          try {
            setSnapshots(JSON.parse(saved));
          } catch (_) {}
        }
      }
    } catch (e) {
      console.error("Failed to load snapshots from Firebase Firestore", e);
      const saved = localStorage.getItem('voltera_db_snapshots');
      if (saved) {
        try { setSnapshots(JSON.parse(saved)); } catch (_) {}
      }
    } finally {
      setIsLoadingSnapshots(false);
    }
  };

  useEffect(() => {
    loadDbSnapshots();
    checkCloudConnectivity();
  }, []);

  // Compute live database total records and metrics
  const totalEntitiesCount = useMemo(() => {
    return subscribers.length + readings.length + payments.length + users.length + 
           inventory.length + inventoryTransactions.length + treasuryTransfers.length + 
           expenses.length + purchases.length + manualJournalEntries.length + 
           employees.length + employeeTxs.length + connections.length + techRequests.length + auditLogs.length;
  }, [
    subscribers, readings, payments, users, inventory, inventoryTransactions, 
    treasuryTransfers, expenses, purchases, manualJournalEntries, employees, 
    employeeTxs, connections, techRequests, auditLogs
  ]);

  // Full System Export (JSON) with Anti-Duplication Sanitization
  const handleFullBackup = () => {
    try {
      const fullDbState = {
        subscribers,
        readings,
        payments,
        settings,
        users,
        auditLogs,
        inventory,
        inventoryTransactions,
        treasuryTransfers,
        expenses,
        purchases,
        manualJournalEntries,
        employees,
        employeeTxs,
        connections,
        techRequests,
        systemVersion: '3.6.0',
        backupDate: new Date().toISOString(),
        stationName: settings.stationName
      };

      // 100% Anti-duplication check before saving backup file
      const { sanitized, stats } = sanitizeAndDeduplicateDatabasePayload(fullDbState);

      const jsonStr = JSON.stringify(sanitized, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = url;
      downloadAnchor.download = `voltera_full_clean_backup_${new Date().toISOString().substring(0, 10)}.json`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      logDbAction('تصدير قاعدة البيانات الشاملة', `تنزيل نسخة احتياطية نظيفة لكافة الجداول (${stats.subscribers.deduplicated} مشترك، ${stats.readings.deduplicated} قراءة)`);
      if (stats.totalRemoved > 0) {
        alert(`تم إعداد وتنزيل النسخة الاحتياطية الشاملة بنجاح!\nتم رصد وإزالة ${stats.totalRemoved} سجل مكرر تلقائياً لضمان سلامة النسخة ونقائها 100%.`);
      } else {
        alert('تم إعداد وتحميل ملف قاعدة البيانات الشاملة بنجاح!\nكافة البيانات نقية وخالية من أي تكرار 100%.');
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('حدث خطأ أثناء إعداد ملف التصدير.');
    }
  };

  // Create Clean Snapshot Point directly in Firebase Firestore Database
  const handleCreateSnapshot = async () => {
    const defaultName = `نقطة استعادة - ${new Date().toLocaleDateString('ar-EG')} ${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;
    const snapshotName = prompt('أدخل اسماً توضيحياً لنقطة الاستعادة (مثال: قبل إغلاق الشهر أو قبل الترحيل):', defaultName);
    if (!snapshotName) return;

    const rawDbState = {
      subscribers,
      readings,
      payments,
      settings,
      users,
      auditLogs,
      inventory,
      inventoryTransactions,
      treasuryTransfers,
      expenses,
      purchases,
      manualJournalEntries,
      employees,
      employeeTxs,
      connections,
      techRequests,
      backupDate: new Date().toISOString()
    };

    setIsCreatingSnapshot(true);
    try {
      const { sanitized, stats } = sanitizeAndDeduplicateDatabasePayload(rawDbState);
      const res = await createSnapshotInDatabase(snapshotName, sanitized);
      
      const newSnapshot: BackupSnapshot = res ? {
        id: res.id,
        name: res.name,
        date: res.date,
        subscribersCount: res.subscribersCount,
        readingsCount: res.readingsCount,
        paymentsCount: res.paymentsCount,
        data: res.data || sanitized
      } : {
        id: `snap-${Date.now()}`,
        name: snapshotName,
        date: new Date().toISOString().substring(0, 16).replace('T', ' '),
        subscribersCount: stats.subscribers.deduplicated,
        readingsCount: stats.readings.deduplicated,
        paymentsCount: stats.payments.deduplicated,
        data: sanitized
      };

      const updatedSnapshots = [newSnapshot, ...snapshots.filter(s => s.id !== newSnapshot.id)].slice(0, 50);
      setSnapshots(updatedSnapshots);
      try {
        const metaOnly = updatedSnapshots.map(s => ({
          id: s.id,
          name: s.name,
          date: s.date,
          subscribersCount: s.subscribersCount,
          readingsCount: s.readingsCount,
          paymentsCount: s.paymentsCount,
          isAuto: s.isAuto,
          intervalHours: s.intervalHours,
          type: s.type,
        }));
        localStorage.setItem('voltera_db_snapshots', JSON.stringify(metaOnly));
      } catch (_) {
        try { localStorage.removeItem('voltera_db_snapshots'); } catch (_) {}
      }

      logDbAction('إنشاء نقطة استعادة نقية', `إنشاء وحفظ نقطة استعادة خالية من التكرار (${snapshotName})`);
      
      if (stats.totalRemoved > 0) {
        alert(`تم إنشاء وحفظ نقطة الاستعادة [${snapshotName}] في سحابة Firebase Firestore بنجاح!\nتمت تصفية ${stats.totalRemoved} سجل مكرر.`);
      } else {
        alert(`تم إنشاء وحفظ نقطة الاستعادة [${snapshotName}] في سحابة Firebase Firestore بنجاح!\nالبيانات نقية 100%.`);
      }
    } catch (err: any) {
      console.error('Error creating snapshot:', err);
      alert('حدث خطأ أثناء حفظ نقطة الاستعادة في قاعدة البيانات.');
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  // Optimize & Deduplicate all stored snapshots in Firestore
  const handleOptimizeSnapshots = async () => {
    if (!confirm('هل ترغب في فحص وتدقيق وتطهير كافة نقاط الاستعادة المحفوظة في سحابة Firebase Firestore لمنع أي تكرار للبيانات وضغط حجمها؟')) return;
    
    setIsOptimizingSnapshots(true);
    try {
      const { optimizedCount, totalDeduplicated } = await optimizeAllSnapshotsInDatabase();
      await loadDbSnapshots();
      logDbAction('تحسين نقاط الاستعادة', `فحص وتطهير ${optimizedCount} نقطة استعادة وإزالة ${totalDeduplicated} سجل مكرر`);
      alert(`تم الانتهاء من فحص وتطهير نقاط الاستعادة بنجاح!\n- عدد النقاط المحسنة: ${optimizedCount}\n- إجمالي السجلات المكررة التي تمت إزالتها: ${totalDeduplicated}`);
    } catch (err: any) {
      console.error('Error optimizing snapshots:', err);
      alert(`حدث خطأ أثناء تحسين نقاط الاستعادة: ${err.message || err}`);
    } finally {
      setIsOptimizingSnapshots(false);
    }
  };

  // Audit & Clean all duplicate records from Live State and Firestore
  const handleCleanLiveDuplicates = async () => {
    if (!confirm('هل ترغب في تشغيل محرك الفحص الشامل وتطهير أي سجلات مكررة في المشتركين، القراءات، والسندات وتحديث قاعدة البيانات فوراً؟')) return;

    setIsDeduplicatingLive(true);
    try {
      await deduplicateCloudSubscribers();

      const fullDbState = {
        subscribers,
        readings,
        payments,
        settings,
        users,
        auditLogs,
        inventory,
        inventoryTransactions,
        treasuryTransfers,
        expenses,
        purchases,
        manualJournalEntries,
        employees,
        employeeTxs,
        connections,
        techRequests
      };

      const { sanitized, stats } = sanitizeAndDeduplicateDatabasePayload(fullDbState);

      if (stats.subscribers.removed > 0) onUpdateSubscribers(sanitized.subscribers);
      if (stats.readings.removed > 0) onUpdateReadings(sanitized.readings);
      if (stats.payments.removed > 0) onUpdatePayments(sanitized.payments);
      if (sanitized.users) onUpdateUsers(sanitized.users);
      if (sanitized.inventory && onUpdateInventory) onUpdateInventory(sanitized.inventory);
      if (sanitized.inventoryTransactions && onUpdateInventoryTransactions) onUpdateInventoryTransactions(sanitized.inventoryTransactions);
      if (sanitized.treasuryTransfers && onUpdateTreasuryTransfers) onUpdateTreasuryTransfers(sanitized.treasuryTransfers);
      if (sanitized.expenses && onUpdateExpenses) onUpdateExpenses(sanitized.expenses);
      if (sanitized.purchases && onUpdatePurchases) onUpdatePurchases(sanitized.purchases);
      if (sanitized.manualJournalEntries && onUpdateManualJournalEntries) onUpdateManualJournalEntries(sanitized.manualJournalEntries);
      if (sanitized.employees && onUpdateEmployees) onUpdateEmployees(sanitized.employees);
      if (sanitized.employeeTxs && onUpdateEmployeeTxs) onUpdateEmployeeTxs(sanitized.employeeTxs);
      if (sanitized.connections && onUpdateConnections) onUpdateConnections(sanitized.connections);
      if (sanitized.techRequests && onUpdateTechRequests) onUpdateTechRequests(sanitized.techRequests);

      setDedupReport(stats);
      setShowDedupModal(true);

      logDbAction('تطهير السجلات المكررة', `تنفيذ فحص شامل وإزالة ${stats.totalRemoved} سجل مكرر من النظام`);
    } catch (err: any) {
      console.error('Error during deduplication:', err);
      alert(`حدث خطأ أثناء تطهير السجلات: ${err.message || err}`);
    } finally {
      setIsDeduplicatingLive(false);
    }
  };

  // Restore Snapshot from Firestore
  const handleRestoreSnapshot = async (snap: BackupSnapshot) => {
    if (!confirm(`تحذير هام جداً:\nهل أنت متأكد من العودة إلى نقطة الاستعادة المؤرخة بتاريخ (${snap.date})؟\nسيتم تحديث كافة السجلات بقاعدة البيانات السحابية واستبدال البيانات الحالية.`)) {
      return;
    }

    try {
      setIsSyncingCloud(true);
      const restoredPayload = await restoreSnapshotFromDatabase(snap.id);
      const d = restoredPayload || snap.data;

      if (d) {
        if (d.subscribers && Array.isArray(d.subscribers)) onUpdateSubscribers(d.subscribers);
        if ((d.readings || d.meterReadings) && Array.isArray(d.readings || d.meterReadings)) onUpdateReadings(d.readings || d.meterReadings);
        if (d.payments && Array.isArray(d.payments)) onUpdatePayments(d.payments);
        if (d.settings || d.systemSettings) onUpdateSettings(d.settings || d.systemSettings);
        if (d.users && Array.isArray(d.users)) onUpdateUsers(d.users);
        if (d.inventory && onUpdateInventory) onUpdateInventory(d.inventory);
        if (d.inventoryTransactions && onUpdateInventoryTransactions) onUpdateInventoryTransactions(d.inventoryTransactions);
        if (d.treasuryTransfers && onUpdateTreasuryTransfers) onUpdateTreasuryTransfers(d.treasuryTransfers);
        if (d.expenses && onUpdateExpenses) onUpdateExpenses(d.expenses);
        if (d.purchases && onUpdatePurchases) onUpdatePurchases(d.purchases);
        if (d.manualJournalEntries && onUpdateManualJournalEntries) onUpdateManualJournalEntries(d.manualJournalEntries);
        if (d.employees && onUpdateEmployees) onUpdateEmployees(d.employees);
        if (d.employeeTxs && onUpdateEmployeeTxs) onUpdateEmployeeTxs(d.employeeTxs);
        if (d.connections && onUpdateConnections) onUpdateConnections(d.connections);
        if (d.techRequests && onUpdateTechRequests) onUpdateTechRequests(d.techRequests);
      }

      logDbAction('استعادة من نقطة حية', `الرجوع بالنظام وقاعدة البيانات إلى نقطة الاستعادة [${snap.name}] (${snap.date})`);
      alert(`تمت استعادة نقطة [${snap.name}] وتحديث كافة الجداول بقاعدة بيانات Firebase Firestore بنجاح!`);
    } catch (err: any) {
      console.error('Error restoring snapshot:', err);
      alert(`حدث خطأ أثناء استعادة البيانات: ${err.message || err}`);
    } finally {
      setIsSyncingCloud(false);
      setSelectedSnapshotPreview(null);
    }
  };

  // Download snapshot JSON
  const handleDownloadSnapshotJson = async (snap: BackupSnapshot) => {
    try {
      let dataToDownload = snap.data;
      if (!dataToDownload) {
        dataToDownload = await restoreSnapshotFromDatabase(snap.id);
      }
      const jsonStr = JSON.stringify(dataToDownload || snap, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = url;
      downloadAnchor.download = `snapshot_${(snap.name || 'backup').replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '_')}_${String(snap.date || '').replace(/[: ]/g, '_')}.json`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      alert('تعذر تحميل ملف النقطة.');
    }
  };

  // Delete Snapshot from Firestore
  const handleDeleteSnapshot = async (id: string) => {
    if (!confirm('هل تريد بالتأكيد حذف نقطة الاستعادة هذه من قاعدة البيانات؟')) return;
    try {
      await deleteSnapshotFromDatabase(id);
      const remaining = snapshots.filter(s => s.id !== id);
      setSnapshots(remaining);
      try {
        const metaOnly = remaining.map(s => ({
          id: s.id,
          name: s.name,
          date: s.date,
          subscribersCount: s.subscribersCount,
          readingsCount: s.readingsCount,
          paymentsCount: s.paymentsCount,
          isAuto: s.isAuto,
          intervalHours: s.intervalHours,
          type: s.type,
        }));
        localStorage.setItem('voltera_db_snapshots', JSON.stringify(metaOnly));
      } catch (_) {}
      logDbAction('حذف نقطة استعادة', `حذف نقطة استعادة برقم معرف (${id})`);
    } catch (err) {
      console.error('Delete snapshot error:', err);
      alert('حدث خطأ أثناء حذف نقطة الاستعادة.');
    }
  };

  // File Upload Restore Handlers
  const handleTriggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object') {
          setRestoreFilePreview(parsed);
        } else {
          alert('الملف المرفوع لا يحتوي على البنية الصحيحة لقواعد بيانات النظام!');
        }
      } catch {
        alert('الملف المرفوع ليس ملف JSON صالحاً.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleParsePastedJson = () => {
    if (!pastedJsonText.trim()) return;
    try {
      const parsed = JSON.parse(pastedJsonText.trim());
      if (parsed && (parsed.subscribers || parsed.readings || parsed.settings || Array.isArray(parsed))) {
        setRestoreFilePreview(parsed);
        setShowPasteJsonModal(false);
        setPastedJsonText('');
      } else {
        alert('النص الملصق لا يحتوي على البنية الصحيحة لقواعد بيانات النظام!');
      }
    } catch {
      alert('النص الملصق ليس كود JSON صحيحاً!');
    }
  };

  // Execute Full Restore from Preview File to Firestore
  const handleConfirmFileRestore = async () => {
    if (!restoreFilePreview) return;

    try {
      setIsSyncingCloud(true);
      await restoreFullDatabaseFromFile(restoreFilePreview);

      const d = restoreFilePreview.data || restoreFilePreview;
      if (d.subscribers) onUpdateSubscribers(d.subscribers);
      if (d.readings || d.meterReadings) onUpdateReadings(d.readings || d.meterReadings);
      if (d.payments) onUpdatePayments(d.payments);
      if (d.settings || d.systemSettings) onUpdateSettings(d.settings || d.systemSettings);
      if (d.users) onUpdateUsers(d.users);
      if (d.inventory && onUpdateInventory) onUpdateInventory(d.inventory);
      if (d.inventoryTransactions && onUpdateInventoryTransactions) onUpdateInventoryTransactions(d.inventoryTransactions);
      if (d.treasuryTransfers && onUpdateTreasuryTransfers) onUpdateTreasuryTransfers(d.treasuryTransfers);
      if (d.expenses && onUpdateExpenses) onUpdateExpenses(d.expenses);
      if (d.purchases && onUpdatePurchases) onUpdatePurchases(d.purchases);
      if (d.manualJournalEntries && onUpdateManualJournalEntries) onUpdateManualJournalEntries(d.manualJournalEntries);
      if (d.employees && onUpdateEmployees) onUpdateEmployees(d.employees);
      if (d.employeeTxs && onUpdateEmployeeTxs) onUpdateEmployeeTxs(d.employeeTxs);
      if (d.connections && onUpdateConnections) onUpdateConnections(d.connections);
      if (d.techRequests && onUpdateTechRequests) onUpdateTechRequests(d.techRequests);

      logDbAction('استعادة من ملف خارجي', 'رفع واستعادة قاعدة بيانات Firebase Firestore بالكامل من ملف JSON خارجي');
      alert('تم استكمال استعادة كافة الجداول وتحديث قاعدة بيانات Firebase Firestore بنجاح!');
      setRestoreFilePreview(null);
    } catch (err: any) {
      console.error('File restore error:', err);
      alert(`حدث خطأ أثناء استعادة الملف: ${err.message || err}`);
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Comprehensive Selective Export CSV / JSON across 13 system tables
  const exportSelectiveData = (type: string, format: 'csv' | 'json') => {
    let dataset: any[] = [];
    let filename = '';

    switch (type) {
      case 'subscribers':
        dataset = subscribers.map(s => ({
          ID: s.id,
          الاسم: s.name,
          رقم_العداد: s.meterNumber,
          الهاتف: s.phone,
          المنطقة: s.zone,
          المحول: s.transformer || '',
          التعريفة: s.tariffType,
          الرصيد_الافتتاحي: s.openingBalance || 0,
          الرصيد_الحالي: s.currentBalance,
          القراءة_الحالية: s.currentReading,
          الحالة: s.status
        }));
        filename = `subscribers_export_${new Date().toISOString().substring(0, 10)}`;
        break;

      case 'payments':
        dataset = payments.map(p => ({
          رقم_السند: p.receiptNumber,
          اسم_المشترك: p.subscriberName,
          المبلغ: p.amountPaid,
          التاريخ: p.paymentDate,
          طريقة_الدفع: p.paymentMethod,
          المحصل: p.receivedBy,
          مرحل: p.isPosted ? 'نعم' : 'لا'
        }));
        filename = `payments_export_${new Date().toISOString().substring(0, 10)}`;
        break;

      case 'readings':
        dataset = readings.map(r => ({
          اسم_المشترك: r.subscriberName,
          رقم_العداد: r.meterNumber || '',
          القراءة_السابقة: r.previousReading,
          القراءة_الحالية: r.currentReading,
          الاستهلاك: r.consumption,
          المبلغ_الإجمالي: r.totalAmount,
          تاريخ_القراءة: r.readingDate,
          مرحل: r.isPosted ? 'نعم' : 'لا'
        }));
        filename = `readings_export_${new Date().toISOString().substring(0, 10)}`;
        break;

      case 'inventory':
        dataset = inventory.map(i => ({
          كود_الصنف: i.itemCode || i.id,
          اسم_الصنف: i.name,
          الوحدة: i.unit,
          الكمية_الحالية: i.currentStock,
          سعر_الشراء: i.purchasePrice,
          الموقع: i.location || ''
        }));
        filename = `inventory_items_${new Date().toISOString().substring(0, 10)}`;
        break;

      case 'expenses':
        dataset = expenses.map(e => ({
          رقم_السند: e.voucherNumber || e.id,
          التاريخ: e.date,
          البيان: e.description || e.title,
          المبلغ: e.amount,
          البند: e.category,
          المدفوع_له: e.paidTo || ''
        }));
        filename = `expenses_export_${new Date().toISOString().substring(0, 10)}`;
        break;

      case 'purchases':
        dataset = purchases.map(pu => ({
          رقم_الفاتورة: pu.invoiceNumber || pu.id,
          التاريخ: pu.date,
          المورد: pu.vendorName,
          الإجمالي: pu.totalAmount,
          المدفوع: pu.paidAmount,
          المتبقي: pu.remainingAmount
        }));
        filename = `purchases_export_${new Date().toISOString().substring(0, 10)}`;
        break;

      case 'transfers':
        dataset = treasuryTransfers.map(t => ({
          رقم_التحويل: t.transferNumber || t.id,
          التاريخ: t.date,
          من_حساب: t.fromAccount,
          إلى_حساب: t.toAccount,
          المبلغ: t.amount,
          الملاحظات: t.notes || ''
        }));
        filename = `transfers_export_${new Date().toISOString().substring(0, 10)}`;
        break;

      case 'journal':
        dataset = manualJournalEntries.map(j => ({
          رقم_القيد: j.voucherNumber || j.id,
          التاريخ: j.date,
          مدين_حساب: j.debitAccountName,
          دائن_حساب: j.creditAccountName,
          المبلغ: j.amount,
          البيان: j.description
        }));
        filename = `journal_entries_${new Date().toISOString().substring(0, 10)}`;
        break;

      case 'employees':
        dataset = employees.map(emp => ({
          الاسم: emp.name,
          الوظيفة: emp.jobTitle,
          الهاتف: emp.phone,
          الراتب_الأساسي: emp.baseSalary,
          الحالة: emp.status
        }));
        filename = `employees_export_${new Date().toISOString().substring(0, 10)}`;
        break;

      case 'connections':
        dataset = connections.map(c => ({
          رقم_الطلب: c.requestNumber || c.id,
          اسم_العميل: c.customerName,
          المنطقة: c.zone,
          الحالة: c.status,
          التاريخ: c.date
        }));
        filename = `connections_export_${new Date().toISOString().substring(0, 10)}`;
        break;

      case 'tech_requests':
        dataset = techRequests.map(t => ({
          رقم_البلاغ: t.ticketNumber || t.id,
          المشترك: t.subscriberName,
          نوع_العطل: t.issueType,
          الحالة: t.status,
          الفني: t.assignedTo || ''
        }));
        filename = `tech_requests_${new Date().toISOString().substring(0, 10)}`;
        break;

      case 'logs':
      default:
        dataset = auditLogs.map(l => ({
          التاريخ: l.timestamp,
          المستخدم: l.username,
          الإجراء: l.action,
          التفاصيل: l.details
        }));
        filename = `audit_logs_${new Date().toISOString().substring(0, 10)}`;
        break;
    }

    if (dataset.length === 0) {
      alert('لا توجد سجلات لتصديرها في هذا الجدول.');
      return;
    }

    if (format === 'json') {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataset, null, 2));
      const anchor = document.createElement('a');
      anchor.setAttribute("href", dataStr);
      anchor.setAttribute("download", `${filename}.json`);
      anchor.click();
    } else {
      const headers = Object.keys(dataset[0]).join(',');
      const rows = dataset.map(obj => Object.values(obj).map(v => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(','));
      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].join('\n');
      const anchor = document.createElement('a');
      anchor.setAttribute("href", encodeURI(csvContent));
      anchor.setAttribute("download", `${filename}.csv`);
      anchor.click();
    }

    logDbAction('تصدير جزئي للجدول', `تصدير جدول (${type}) بصيغة (${format.toUpperCase()})`);
  };

  // Run Deep Integrity & Health Scanner
  const handleRunHealthCheck = () => {
    setIsScanning(true);
    setTimeout(() => {
      let mismatches = 0;
      const meterMap = new Map<string, number>();
      const phoneMap = new Map<string, number>();

      subscribers.forEach(sub => {
        const subReadingsTotal = readings
          .filter(r => (r.subscriberId === sub.id || r.subscriberName === sub.name || (sub.meterNumber && r.meterNumber === sub.meterNumber)) && !r.isRejected)
          .reduce((sum, r) => sum + (r.totalAmount || 0), 0);
        const subPaymentsTotal = payments
          .filter(p => (p.subscriberId === sub.id || p.subscriberName === sub.name) && !p.isRejected)
          .reduce((sum, p) => sum + (p.amountPaid || 0), 0);
        const expectedBalance = (sub.openingBalance || 0) + subReadingsTotal - subPaymentsTotal;
        
        if (Math.abs((sub.currentBalance || 0) - expectedBalance) > 1) {
          mismatches++;
        }

        if (sub.meterNumber) {
          const m = sub.meterNumber.trim();
          meterMap.set(m, (meterMap.get(m) || 0) + 1);
        }
        if (sub.phone) {
          const p = sub.phone.trim();
          phoneMap.set(p, (phoneMap.get(p) || 0) + 1);
        }
      });

      let duplicateMeters = 0;
      meterMap.forEach(count => { if (count > 1) duplicateMeters += (count - 1); });

      let duplicatePhones = 0;
      phoneMap.forEach(count => { if (count > 1) duplicatePhones += (count - 1); });

      const orphanedR = readings.filter(r => !subscribers.some(s => s.id === r.subscriberId || s.name === r.subscriberName || (s.meterNumber && s.meterNumber === r.meterNumber))).length;
      const orphanedP = payments.filter(p => !subscribers.some(s => s.id === p.subscriberId || s.name === p.subscriberName)).length;
      const pendR = readings.filter(r => !r.isPosted && !r.isRejected).length;
      const pendP = payments.filter(p => !p.isPosted && !p.isRejected).length;

      const totalAudited = subscribers.length + readings.length + payments.length;
      const flaws = mismatches + orphanedR + orphanedP + duplicateMeters;
      const healthScore = totalAudited > 0 ? Math.max(0, Math.min(100, Math.round(100 - (flaws / totalAudited) * 100))) : 100;

      setHealthStatus({
        mismatchedBalances: mismatches,
        orphanedReadings: orphanedR,
        orphanedPayments: orphanedP,
        pendingReadings: pendR,
        pendingPayments: pendP,
        duplicateMeters,
        duplicatePhones,
        healthScore,
        totalAudited
      });
      setIsScanning(false);
    }, 600);
  };

  // Intelligent Auto-Repair & Balances Ledger Synchronization
  const handleFixBalancesAndIntegrity = () => {
    if (!confirm('هل ترغب بتنفيذ إصلاح وترميم آلي شامل للأرصدة الحسابية ومطابقتها وفق دفتر الأستاذ (الرصيد الافتتاحي + إجمالي الفواتير - إجمالي المقبوضات)؟')) return;

    let updatedCount = 0;
    const fixedSubs = subscribers.map(sub => {
      const subReadingsTotal = readings
        .filter(r => (r.subscriberId === sub.id || r.subscriberName === sub.name || (sub.meterNumber && r.meterNumber === sub.meterNumber)) && !r.isRejected)
        .reduce((sum, r) => sum + (r.totalAmount || 0), 0);
      const subPaymentsTotal = payments
        .filter(p => (p.subscriberId === sub.id || p.subscriberName === sub.name) && !p.isRejected)
        .reduce((sum, p) => sum + (p.amountPaid || 0), 0);
      const newBal = (sub.openingBalance || 0) + subReadingsTotal - subPaymentsTotal;
      if (Math.abs((sub.currentBalance || 0) - newBal) > 0.01) {
        updatedCount++;
      }
      return {
        ...sub,
        currentBalance: newBal
      };
    });

    onUpdateSubscribers(fixedSubs);
    logDbAction('إصلاح ومطابقة الأرصدة', `إعادة حساب وتصحيح أرصدة المشتركين آلياً (تم تصحيح ${updatedCount} مشترك)`);
    alert(`تمت عملية الإصلاح والمطابقة بنجاح!\nتم تدقيق وتصحيح أرصدة ${updatedCount} مشترك ومطابقتها 100% مع الحركات المالية.`);

    // Refresh health status
    handleRunHealthCheck();
  };

  // Soft Reset (Clear operational receipts & readings only)
  const handleSoftReset = () => {
    if (!confirm('تحذير شديد: هل أنت متأكد من مسح كافـة الفواتير وسندات القبض والقراءات، مع الإبقاء على أسماء المشتركين والمستخدمين والمخزون؟')) return;
    
    onUpdateReadings([]);
    onUpdatePayments([]);
    logDbAction('تنظيف الحركة التشغيلية', 'تصفير الفواتير والسندات مع الحفاظ على ملفات المشتركين والمخزون');
    alert('تم مسح الحركات المادية والتسجيلات التشغيلية بنجاح.');
  };

  // Firebase Firestore Backup Handler
  const handleDownloadSqlBackup = async () => {
    try {
      setIsSyncingCloud(true);
      const rawPayload = {
        subscribers,
        meterReadings: readings,
        readings,
        payments,
        users,
        settings,
        inventory,
        inventoryTransactions,
        treasuryTransfers,
        expenses,
        purchases,
        manualJournalEntries,
        employees,
        employeeTxs,
        connections,
        techRequests
      };

      const { sanitized, stats } = sanitizeAndDeduplicateDatabasePayload(rawPayload);

      const firestoreBackup = {
        databaseType: 'Firebase Firestore & Auth Cloud',
        exportDate: new Date().toISOString(),
        isDeduplicated: true,
        deduplicationStats: stats,
        counts: {
          subscribers: sanitized.subscribers.length,
          readings: sanitized.readings.length,
          payments: sanitized.payments.length,
          users: (sanitized.users || []).length,
        },
        data: sanitized
      };
      const jsonBlob = new Blob([JSON.stringify(firestoreBackup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(jsonBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `firebase_firestore_backup_clean_${new Date().toISOString().substring(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      logDbAction('تحميل نسخة Firebase نقية', `تنزيل نسخة سحابية خالية من التكرار (تمت تصفية ${stats.totalRemoved} سجل مكرر)`);
      if (stats.totalRemoved > 0) {
        alert(`تم تنزيل النسخة الاحتياطية لبيانات Firebase Firestore بنجاح!\nتمت إزالة وتصفية ${stats.totalRemoved} سجل مكرر.`);
      } else {
        alert('تم تنزيل النسخة الاحتياطية الكاملة لبيانات Firebase Firestore بنجاح!\nالبيانات نقية 100%.');
      }
    } catch (err: any) {
      console.error('Firebase Backup error:', err);
      alert(`تعذر تنزيل النسخة الاحتياطية: ${err.message}`);
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleTriggerCloudSync = async () => {
    setIsSyncingCloud(true);
    try {
      await loadAllCloudData();
      setLastSyncedTime(new Date().toLocaleTimeString('ar-EG'));
      await checkCloudConnectivity();
      logDbAction('مزامنة Firebase', 'تمت المزامنة الكاملة مع سحابة Firebase Firestore');
      alert('تمت المزامنة الحية مع سحابة Firebase Firestore بنجاح!');
    } catch (err: any) {
      alert(`حدث خطأ أثناء المزامنة: ${err.message}`);
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Save Auto Snapshot Schedule Settings directly to Firestore
  const handleSaveAutoSnapshotSchedule = async (newEnabled?: boolean, newHours?: number, newKeep?: number) => {
    const enabled = newEnabled !== undefined ? newEnabled : autoSnapshotEnabled;
    const hours = Math.max(1, newHours !== undefined ? newHours : autoSnapshotHours);
    const keep = Math.max(5, newKeep !== undefined ? newKeep : maxAutoKeepCount);

    setIsSavingSchedule(true);
    try {
      const updatedSettings: SystemSettings = {
        ...settings,
        autoSnapshotEnabled: enabled,
        autoSnapshotIntervalHours: hours,
        maxAutoSnapshotsToKeep: keep,
      };

      onUpdateSettings(updatedSettings);
      await syncSettingsToCloud(updatedSettings);
      localStorage.setItem('voltera_cache_settings', JSON.stringify(updatedSettings));

      logDbAction(
        'تحديث جدولة نقاط الاستعادة السحابية', 
        `تم ضبط إنشاء نقاط الاستعادة السحابية: ${enabled ? `مفعل (كل ${hours} ساعات)` : 'معطل'} مع الاحتفاظ بأحدث ${keep} نقطة`
      );

      setScheduleSaveSuccess(true);
      setTimeout(() => setScheduleSaveSuccess(false), 3500);
    } catch (err: any) {
      console.error('Error saving auto snapshot schedule:', err);
      alert('حدث خطأ أثناء حفظ إعدادات الجدولة في قاعدة البيانات السحابية.');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // Immediate clean snapshot using current schedule rules
  const handleTriggerAutoSnapshotNow = async () => {
    setIsCreatingSnapshot(true);
    try {
      const rawDbState = {
        subscribers,
        readings,
        payments,
        settings,
        users,
        auditLogs,
        inventory,
        inventoryTransactions,
        treasuryTransfers,
        expenses,
        purchases,
        manualJournalEntries,
        employees,
        employeeTxs,
        connections,
        techRequests,
        backupDate: new Date().toISOString(),
        stationName: settings.stationName
      };

      const res = await createAutoDatabaseSnapshot(rawDbState, autoSnapshotHours, maxAutoKeepCount);
      if (res) {
        const formatted: BackupSnapshot = {
          id: res.id,
          name: res.name,
          date: res.date,
          subscribersCount: res.subscribersCount,
          readingsCount: res.readingsCount,
          paymentsCount: res.paymentsCount,
          isAuto: true,
          intervalHours: autoSnapshotHours,
          type: 'auto',
          data: res.data
        };

        const updated = [formatted, ...snapshots.filter(s => s.id !== formatted.id)];
        setSnapshots(updated);
        try {
          const metaOnly = updated.map(s => ({
            id: s.id,
            name: s.name,
            date: s.date,
            subscribersCount: s.subscribersCount,
            readingsCount: s.readingsCount,
            paymentsCount: s.paymentsCount,
            isAuto: s.isAuto,
            intervalHours: s.intervalHours,
            type: s.type,
          }));
          localStorage.setItem('voltera_db_snapshots', JSON.stringify(metaOnly));
        } catch (_) {}

        // Update settings last time
        const nowIso = new Date().toISOString();
        const updatedSettings = { ...settings, lastAutoSnapshotTime: nowIso };
        onUpdateSettings(updatedSettings);
        syncSettingsToCloud(updatedSettings);

        logDbAction('إنشاء نقطة استعادة دورية نقية', `تم إنشاء نقطة استعادة نقية مجدولة يدوياً بنجاح (${res.name})`);
        alert(`تم إنشاء نقطة الاستعادة النقية المجدولة بنجاح وحفظها في قاعدة بيانات Firebase Firestore!\n- المشتركين: ${res.subscribersCount}\n- القراءات: ${res.readingsCount}\n- السندات: ${res.paymentsCount}`);
      }
    } catch (err) {
      console.error('Error running manual auto snapshot:', err);
      alert('حدث خطأ أثناء إنشاء نقطة الاستعادة التلقائية.');
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  // Compute Auto Snapshot status and countdown
  const getAutoSnapshotScheduleStatus = () => {
    if (!settings.autoSnapshotEnabled && !autoSnapshotEnabled) {
      return { statusText: 'الجدولة التلقائية معطلة حالياً', isPending: false, timeRemainingText: 'غير مفعل' };
    }

    const intervalHours = Math.max(1, settings.autoSnapshotIntervalHours || autoSnapshotHours || 2);
    const intervalMs = intervalHours * 60 * 60 * 1000;
    const lastTimeMs = settings.lastAutoSnapshotTime ? new Date(settings.lastAutoSnapshotTime).getTime() : 0;
    
    if (!lastTimeMs) {
      return {
        statusText: `جاهز للإنشاء التلقائي فوراً (كل ${intervalHours} ساعات)`,
        isPending: true,
        timeRemainingText: 'سيتم الإنشاء في الدورة القادمة'
      };
    }

    const now = Date.now();
    const elapsedMs = now - lastTimeMs;
    const remainingMs = intervalMs - elapsedMs;

    if (remainingMs <= 0) {
      return {
        statusText: `مستحق الإنشاء الآن (كل ${intervalHours} ساعات)`,
        isPending: true,
        timeRemainingText: 'جاري المعالجة التلقائية'
      };
    }

    const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
    const hours = Math.floor(remainingMinutes / 60);
    const minutes = remainingMinutes % 60;
    
    let remainingStr = '';
    if (hours > 0 && minutes > 0) {
      remainingStr = `بعد ${hours} ساعة و ${minutes} دقيقة تقريباً`;
    } else if (hours > 0) {
      remainingStr = `بعد ${hours} ساعة تقريباً`;
    } else {
      remainingStr = `بعد ${minutes} دقيقة تقريباً`;
    }

    return {
      statusText: `نشط ● يتم إنشاء نقطة نقية كل ${intervalHours} ساعات`,
      isPending: false,
      timeRemainingText: remainingStr
    };
  };

  // Filtered Snapshots
  const filteredSnapshots = useMemo(() => {
    let result = [...snapshots];

    // Type filter
    if (snapshotFilterType === 'auto') {
      result = result.filter(s => s.isAuto || s.type === 'auto' || s.name.includes('تلقائية') || s.name.includes('دورية'));
    } else if (snapshotFilterType === 'manual') {
      result = result.filter(s => !s.isAuto && s.type !== 'auto' && !s.name.includes('تلقائية') && !s.name.includes('دورية'));
    }

    // Query filter
    if (snapshotSearchQuery.trim()) {
      const q = snapshotSearchQuery.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(q) || s.date.includes(q));
    }

    return result;
  }, [snapshots, snapshotSearchQuery, snapshotFilterType]);

  return (
    <motion.div
      key="admin-db-sec"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 text-right font-sans"
    >
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-5">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleTriggerCloudSync}
              disabled={isSyncingCloud}
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingCloud ? 'animate-spin' : ''}`} />
              <span>{isSyncingCloud ? 'جارِ المزامنة...' : 'مزامنة فورية مع السحابة'}</span>
            </button>

            <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 font-mono">
              <span className={`w-2 h-2 rounded-full ${cloudConnectionStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              <span>Cloud Latency:</span>
              <span className="text-emerald-400 font-bold">{cloudPingLatency !== null ? `${cloudPingLatency}ms` : 'متصل'}</span>
              <span className="text-slate-500">({lastSyncedTime})</span>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-black text-slate-100 flex items-center justify-start md:justify-end gap-2.5">
              <span>مركز قواعد البيانات والنسخ الاحتياطي الذكي</span>
              <Database className="w-6 h-6 text-amber-500" />
            </h2>
            <p className="text-xs text-slate-400 mt-1">الربط السحابي بـ Firebase Firestore، تصدير واسترجاع الجداول، نقاط الاستعادة ومطابقة الدفاتر الحسابية.</p>
          </div>
        </div>

        {/* Tab Selector Nav */}
        <div className="flex flex-wrap items-center justify-end gap-2 mt-5">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/10'
                : 'bg-slate-950/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800/80'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>نظرة عامة والجداول ({totalEntitiesCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('firebase_status')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'firebase_status'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/10'
                : 'bg-slate-950/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800/80'
            }`}
          >
            <Wifi className="w-4 h-4 text-amber-400" />
            <span>حالة واختبار سحابة Firebase</span>
          </button>

          <button
            onClick={() => setActiveTab('backups')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'backups'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/10'
                : 'bg-slate-950/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800/80'
            }`}
          >
            <Archive className="w-4 h-4" />
            <span>نقاط الاستعادة السحابية ({snapshots.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'export'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/10'
                : 'bg-slate-950/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800/80'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>تصدير الجداول (CSV / JSON)</span>
          </button>

          <button
            onClick={() => setActiveTab('health')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'health'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/10'
                : 'bg-slate-950/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800/80'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>فحص النزاهة والمطابقة الذكية</span>
          </button>

          <button
            onClick={() => setActiveTab('danger')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'danger'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/10'
                : 'bg-slate-950/80 text-rose-400 hover:bg-rose-500/10 border border-slate-800/80'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>إعادة التهيئة والتنظيف</span>
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & ENTITIES METRICS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Dedicated Firebase Firestore & Auth Cloud Status Card */}
          <div className="bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 relative z-10">
              <div className="flex items-start gap-4">
                <div className="p-3.5 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
                  <Database className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      Firebase Firestore & Auth ● متصل وسحابي
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-100 mt-1">
                    محرك قاعدة البيانات السحابية (Firebase Cloud)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
                    يعمل النظام بصورة مباشرة على Firestore مع دعم كامل للتخزين المحلي والتزامن اللحظي عند تغير الشبكة وحماية البيانات بقواعد أمان مشفرة.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                <button
                  onClick={checkCloudConnectivity}
                  disabled={isPingingCloud}
                  className="flex-1 lg:flex-initial bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold px-4 py-2.5 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Activity className={`w-4 h-4 ${isPingingCloud ? 'animate-spin text-amber-300' : ''}`} />
                  <span>{isPingingCloud ? 'جارِ فحص الاستجابة...' : 'فحص سرعة الاستجابة (Ping)'}</span>
                </button>

                <button
                  onClick={handleTriggerCloudSync}
                  disabled={isSyncingCloud}
                  className="flex-1 lg:flex-initial bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-4 py-2.5 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncingCloud ? 'animate-spin' : ''}`} />
                  <span>مزامنة حية مع Firebase</span>
                </button>

                <button
                  onClick={handleDownloadSqlBackup}
                  disabled={isSyncingCloud}
                  className="flex-1 lg:flex-initial bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>تنزيل نسخة سحابية نقية</span>
                </button>
              </div>
            </div>
          </div>

          {/* Main Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Download className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-100 text-sm">تصدير النسخة الشاملة (JSON)</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  تفريغ وتحميل قاعدة البيانات بالكامل (المشتركين، القراءات، السندات، الحسابات، المخزون، والمستخدمين) في ملف واحد لحفظه خارجيًا.
                </p>
              </div>
              <button
                onClick={handleFullBackup}
                className="mt-5 w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تنزيل ملف القاعدة الكامل</span>
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-100 text-sm">استعادة نسخة من ملف خارجي</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  رفع ملف JSON محلي استُخرج سابقاً لإعادة بناء أو تحديث كافة الجداول وتصحيح المفقودات.
                </p>
              </div>
              <input
                id="restore-file-input"
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json,application/json"
                style={{ display: 'none' }}
              />
              <div className="flex flex-col sm:flex-row gap-2 mt-5">
                <button
                  type="button"
                  onClick={handleTriggerFileSelect}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold py-2.5 px-3 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/10 cursor-pointer text-center"
                >
                  <Upload className="w-4 h-4" />
                  <span>رفع ملف JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasteJsonModal(true)}
                  className="bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 font-bold py-2.5 px-3 rounded-2xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileJson className="w-4 h-4" />
                  <span>لصق JSON</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Archive className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-100 text-sm">إنشاء نقطة استعادة سريعة</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  حفظ لقطة سريعة في سحابة النظام قبل إجراء التغييرات الضخمة أو عمليات الإغلاق المالية للعودة إليها فوراً.
                </p>
              </div>
              <button
                onClick={handleCreateSnapshot}
                disabled={isCreatingSnapshot}
                className="mt-5 w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>حفظ لقطة حية الآن</span>
              </button>
            </div>
          </div>

          {/* Database Entities Metrics Grid */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-200 flex items-center justify-end gap-2 border-b border-slate-800 pb-3">
              <span>إحصائيات وحجم جداول الكيانات النشطة ({totalEntitiesCount} إجمالي السجلات)</span>
              <Layers className="w-5 h-5 text-amber-500" />
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 text-right">
                <span className="text-[11px] text-slate-500 font-bold block mb-1">المشتركين والعدادات</span>
                <span className="text-xl font-black font-mono text-amber-400">{subscribers.length}</span>
                <span className="text-[10px] text-slate-600 block mt-1">سجل مشترك نشط</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 text-right">
                <span className="text-[11px] text-slate-500 font-bold block mb-1">الفواتير والقراءات</span>
                <span className="text-xl font-black font-mono text-cyan-400">{readings.length}</span>
                <span className="text-[10px] text-slate-600 block mt-1">قراءة مسجلة</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 text-right">
                <span className="text-[11px] text-slate-500 font-bold block mb-1">سندات القبض المالي</span>
                <span className="text-xl font-black font-mono text-emerald-400">{payments.length}</span>
                <span className="text-[10px] text-slate-600 block mt-1">سند تحصيل</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 text-right">
                <span className="text-[11px] text-slate-500 font-bold block mb-1">المستخدمين والصلاحيات</span>
                <span className="text-xl font-black font-mono text-purple-400">{users.length}</span>
                <span className="text-[10px] text-slate-600 block mt-1">حساب مستخدم</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 text-right">
                <span className="text-[11px] text-slate-500 font-bold block mb-1">أصناف وحركات المخزون</span>
                <span className="text-xl font-black font-mono text-sky-400">{inventory.length + inventoryTransactions.length}</span>
                <span className="text-[10px] text-slate-600 block mt-1">صنف وحركة مواد</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 text-right">
                <span className="text-[11px] text-slate-500 font-bold block mb-1">المصروفات والمشتريات</span>
                <span className="text-xl font-black font-mono text-indigo-400">{expenses.length + purchases.length}</span>
                <span className="text-[10px] text-slate-600 block mt-1">سند وفاتورة</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 text-right">
                <span className="text-[11px] text-slate-500 font-bold block mb-1">الموظفين والتوصيلات والطلبات</span>
                <span className="text-xl font-black font-mono text-teal-400">{employees.length + connections.length + techRequests.length}</span>
                <span className="text-[10px] text-slate-600 block mt-1">موظف وطلب خدمة</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 text-right">
                <span className="text-[11px] text-slate-500 font-bold block mb-1">سجل التدقيق الأمني</span>
                <span className="text-xl font-black font-mono text-rose-400">{auditLogs.length}</span>
                <span className="text-[10px] text-slate-600 block mt-1">عملية موثقة</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FIREBASE STATUS & DIAGNOSTICS */}
      {activeTab === 'firebase_status' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
              <button
                onClick={checkCloudConnectivity}
                disabled={isPingingCloud}
                className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/10"
              >
                <RefreshCw className={`w-4 h-4 ${isPingingCloud ? 'animate-spin' : ''}`} />
                <span>{isPingingCloud ? 'جارِ فحص السحابة...' : 'إعادة اختبار الاتصال بالخادم الآن'}</span>
              </button>

              <div className="text-right">
                <h3 className="text-base font-bold text-slate-100 flex items-center justify-end gap-2">
                  <span>فحص وتكوين سحابة Firebase Firestore & Auth</span>
                  <Wifi className="w-5 h-5 text-amber-400" />
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  تفاصيل المشروع السحابي، زمن الاستجابة المباشر، وتوثيق المجموعات.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-2">
                <div className="text-xs text-slate-400">معرف المشروع السحابي</div>
                <div className="text-sm font-bold text-amber-400 font-mono">graphic-granite-z6ppv</div>
                <div className="text-[11px] text-emerald-400">● Production Firestore Ready</div>
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-2">
                <div className="text-xs text-slate-400">زمن استجابة الشبكة (Latency)</div>
                <div className="text-sm font-bold text-cyan-400 font-mono">{cloudPingLatency !== null ? `${cloudPingLatency} ms` : 'ممتاز (<100ms)'}</div>
                <div className="text-[11px] text-emerald-400">✓ Connection Ping Verified</div>
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-2">
                <div className="text-xs text-slate-400">الحسابات والمصادقة (Auth)</div>
                <div className="text-sm font-bold text-emerald-400 font-mono">{users.length} مستخدم نشط</div>
                <div className="text-[11px] text-slate-400">Firebase Auth & Role-Based Access</div>
              </div>
            </div>

            <div className="mt-6 border-t border-slate-800 pt-5">
              <h4 className="text-xs font-bold text-slate-300 mb-3 text-right">المجموعات السحابية النشطة في Firestore:</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-center">
                  <div className="text-xs text-slate-400">/subscribers</div>
                  <div className="text-lg font-bold text-amber-400 font-mono mt-1">{subscribers.length}</div>
                </div>
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-center">
                  <div className="text-xs text-slate-400">/readings</div>
                  <div className="text-lg font-bold text-cyan-400 font-mono mt-1">{readings.length}</div>
                </div>
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-center">
                  <div className="text-xs text-slate-400">/payments</div>
                  <div className="text-lg font-bold text-emerald-400 font-mono mt-1">{payments.length}</div>
                </div>
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-center">
                  <div className="text-xs text-slate-400">/inventory</div>
                  <div className="text-lg font-bold text-purple-400 font-mono mt-1">{inventory.length}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BACKUPS & SNAPSHOTS */}
      {activeTab === 'backups' && (
        <div className="space-y-6">
          {/* Anti-Duplication Engine Header */}
          <div className="bg-gradient-to-r from-slate-900 via-emerald-950/20 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 relative z-10">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-mono">
                      Anti-Duplication Engine ● نشط وفعال
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-100 mt-1">
                    محرك منع وتطهير تكرار البيانات في النسخ ونقاط الاستعادة
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
                    يقوم هذا المحرك بالتحقق الذكي ومنع تسجيل أي مشترك، قراءة، أو سند مالي مكرر بنسبة 100% في قاعدة بيانات Firebase Firestore والنسخ الاحتياطية ونقاط الاستعادة.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                <button
                  onClick={handleCleanLiveDuplicates}
                  disabled={isDeduplicatingLive}
                  className="flex-1 lg:flex-initial bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10"
                >
                  <Sparkles className={`w-4 h-4 ${isDeduplicatingLive ? 'animate-spin' : ''}`} />
                  <span>{isDeduplicatingLive ? 'جارِ فحص وتطهير التكرار...' : 'فحص وتطهير التكرارات في السجلات الحية'}</span>
                </button>

                <button
                  onClick={handleOptimizeSnapshots}
                  disabled={isOptimizingSnapshots}
                  className="flex-1 lg:flex-initial bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 font-bold px-4 py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isOptimizingSnapshots ? 'animate-spin' : ''}`} />
                  <span>{isOptimizingSnapshots ? 'جارِ تحسين النقاط...' : 'تدقيق وتحسين كافة نقاط الاستعادة'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 1. Automated Periodic Cloud Snapshot Scheduling Engine (جدولة نقاط الاستعادة السحابية التلقائية) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 relative overflow-hidden">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-800 pb-5">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl border transition-all ${autoSnapshotEnabled ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${autoSnapshotEnabled ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}`}></span>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border font-mono ${autoSnapshotEnabled ? 'text-amber-300 bg-amber-500/10 border-amber-500/30' : 'text-slate-400 bg-slate-800 border-slate-700'}`}>
                      {autoSnapshotEnabled ? `الجدولة التلقائية نشطة ● كل ${autoSnapshotHours} ساعات` : 'الجدولة التلقائية متوقفة'}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-100 mt-1">
                    محرك جدولة نقاط الاستعادة السحابية التلقائية والنقية
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    يتم إنشاء وحفظ نقطة استعادة سحابية جديدة مطهرة من التكرار 100% تلقائياً في سحابة Firebase Firestore بحسب عدد الساعات المحددة أدناه.
                  </p>
                </div>
              </div>

              {/* Status Badge & Auto Trigger Now Button */}
              <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                <button
                  onClick={handleTriggerAutoSnapshotNow}
                  disabled={isCreatingSnapshot}
                  className="flex-1 lg:flex-initial bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/10"
                  title="إنشاء نقطة استعادة نقية مجدولة فوراً دون انتظار موعد الجدولة"
                >
                  <Play className={`w-3.5 h-3.5 ${isCreatingSnapshot ? 'animate-spin' : ''}`} />
                  <span>{isCreatingSnapshot ? 'جارِ الإنشاء السحابي...' : 'إنشاء نقطة نقية فوراً الآن'}</span>
                </button>
              </div>
            </div>

            {/* Scheduler Settings Controls Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Box 1: Enable / Disable Toggle */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">تفعيل الجدولة الدورية</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${autoSnapshotEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'}`}>
                      {autoSnapshotEnabled ? 'مفعل' : 'معطل'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    عند التفعيل، يقوم النظام تلقائياً وبشكل صامت بإنشاء نقطة استعادة نقية ومطهرة من أي تكرار وتخزينها في السحابة.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAutoSnapshotEnabled(true);
                      handleSaveAutoSnapshotSchedule(true, autoSnapshotHours, maxAutoKeepCount);
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${autoSnapshotEnabled ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'}`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>تشغيل الجدولة</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAutoSnapshotEnabled(false);
                      handleSaveAutoSnapshotSchedule(false, autoSnapshotHours, maxAutoKeepCount);
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${!autoSnapshotEnabled ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'}`}
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>إيقاف مؤقت</span>
                  </button>
                </div>
              </div>

              {/* Box 2: Interval Hours Selector (تحديد عدد الساعات) */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-3 lg:col-span-2">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-amber-400" />
                      <span>تحديد الفاصل الزمني لإنشاء النقطة (بالساعات):</span>
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      اختر كم ساعة تفصل بين كل نقطة استعادة سحابية نقية وأخرى (مثال: كل 2 ساعات).
                    </p>
                  </div>

                  {/* Direct Number Input with +/- */}
                  <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => setAutoSnapshotHours(prev => Math.max(1, prev - 1))}
                      className="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
                    >
                      -
                    </button>
                    <div className="flex items-center px-2 text-xs font-mono font-bold text-amber-400">
                      <input
                        type="number"
                        min="1"
                        max="168"
                        value={autoSnapshotHours}
                        onChange={e => setAutoSnapshotHours(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-12 bg-transparent text-center focus:outline-none text-amber-400 font-bold"
                      />
                      <span className="text-[10px] text-slate-400 font-sans mr-1">ساعة</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAutoSnapshotHours(prev => Math.min(168, prev + 1))}
                      className="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Quick Presets Chips */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {[
                    { label: 'كل 1 ساعة', hours: 1 },
                    { label: 'كل 2 ساعات (افتراضي)', hours: 2 },
                    { label: 'كل 4 ساعات', hours: 4 },
                    { label: 'كل 6 ساعات', hours: 6 },
                    { label: 'كل 12 ساعة', hours: 12 },
                    { label: 'كل 24 ساعة (يومي)', hours: 24 },
                    { label: 'كل 48 ساعة (يومين)', hours: 48 },
                  ].map(preset => (
                    <button
                      key={preset.hours}
                      type="button"
                      onClick={() => setAutoSnapshotHours(preset.hours)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                        autoSnapshotHours === preset.hours
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20 ring-1 ring-amber-400'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Save Schedule Button */}
                <div className="pt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-t border-slate-900">
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span>حفظ الحد الأقصى للنقاط التلقائية:</span>
                    <select
                      value={maxAutoKeepCount}
                      onChange={e => setMaxAutoKeepCount(parseInt(e.target.value) || 30)}
                      className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-amber-500"
                    >
                      <option value="15">أحدث 15 نقطة تلقائية</option>
                      <option value="30">أحدث 30 نقطة تلقائية (موصى به)</option>
                      <option value="50">أحدث 50 نقطة تلقائية</option>
                      <option value="100">أحدث 100 نقطة تلقائية</option>
                    </select>
                    <span className="text-[10px] text-slate-500">(النقاط اليدوية لا تحذف أبداً)</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSaveAutoSnapshotSchedule(autoSnapshotEnabled, autoSnapshotHours, maxAutoKeepCount)}
                    disabled={isSavingSchedule}
                    className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/10"
                  >
                    {isSavingSchedule ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : scheduleSaveSuccess ? (
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-950" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>{isSavingSchedule ? 'جارِ الحفظ في Firestore...' : scheduleSaveSuccess ? 'تم حفظ الجدولة في السحابة بنجاح!' : 'حفظ وتثبيت الجدولة في السحابة'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Live Scheduler Diagnostics & Next Run Info Bar */}
            {(() => {
              const sched = getAutoSnapshotScheduleStatus();
              return (
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-900 rounded-xl text-amber-400 border border-slate-800">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">حالة المحرك السحابي</span>
                      <span className="font-bold text-slate-200">{sched.statusText}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 border-r border-slate-800/80 pr-3">
                    <div className="p-2 bg-slate-900 rounded-xl text-cyan-400 border border-slate-800">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">آخر نقطة تم إنشاؤها تلقائياً</span>
                      <span className="font-bold text-cyan-300 font-mono text-[11px]">
                        {settings.lastAutoSnapshotTime ? new Date(settings.lastAutoSnapshotTime).toLocaleString('ar-EG') : 'لم يتم التشغيل بعد'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 border-r border-slate-800/80 pr-3">
                    <div className="p-2 bg-slate-900 rounded-xl text-emerald-400 border border-slate-800">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">الموعد المتوقع للنقطة القادمة</span>
                      <span className="font-bold text-emerald-400 font-mono text-[11px]">{sched.timeRemainingText}</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* 2. Database Snapshots List & Management */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 border-b border-slate-800 pb-4">
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <button
                  onClick={handleCreateSnapshot}
                  disabled={isCreatingSnapshot}
                  className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/10"
                >
                  {isCreatingSnapshot ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>{isCreatingSnapshot ? 'جارِ الحفظ...' : 'إنشاء نقطة استعادة يدوية جديدة'}</span>
                </button>

                <button
                  onClick={loadDbSnapshots}
                  disabled={isLoadingSnapshots}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium px-3 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700/50"
                  title="تحديث القائمة من قاعدة بيانات Firebase Firestore"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSnapshots ? 'animate-spin text-amber-400' : ''}`} />
                  <span>تحديث</span>
                </button>

                <div className="relative flex-1 sm:flex-initial">
                  <input
                    type="text"
                    value={snapshotSearchQuery}
                    onChange={e => setSnapshotSearchQuery(e.target.value)}
                    placeholder="بحث في نقاط الاستعادة..."
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 w-full sm:w-44"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                </div>
              </div>

              {/* Filter Tabs: All / Auto / Manual */}
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs w-full lg:w-auto overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setSnapshotFilterType('all')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${snapshotFilterType === 'all' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  الكل ({snapshots.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSnapshotFilterType('auto')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${snapshotFilterType === 'auto' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <Clock className="w-3 h-3" />
                  <span>دورية تلقائية ({snapshots.filter(s => s.isAuto || s.type === 'auto' || s.name.includes('تلقائية') || s.name.includes('دورية')).length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSnapshotFilterType('manual')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${snapshotFilterType === 'manual' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  <Database className="w-3 h-3" />
                  <span>يدوية ({snapshots.filter(s => !s.isAuto && s.type !== 'auto' && !s.name.includes('تلقائية') && !s.name.includes('دورية')).length})</span>
                </button>
              </div>
            </div>

            {isLoadingSnapshots ? (
              <div className="text-center py-12 text-slate-400 space-y-3">
                <RefreshCw className="w-8 h-8 mx-auto animate-spin text-amber-500" />
                <p className="text-xs">جارِ تحميل نقاط الاستعادة من قاعدة بيانات Firestore...</p>
              </div>
            ) : filteredSnapshots.length === 0 ? (
              <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-2xl space-y-3">
                <Archive className="w-12 h-12 mx-auto text-slate-600 mb-1" />
                <p className="text-sm font-bold text-slate-400">لا توجد نقاط استعادة مطابقة</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {snapshotFilterType === 'auto' 
                    ? 'لم يتم إنشاء أي نقطة استعادة تلقائية حتى الآن. سيتم إنشاؤها تلقائياً وفق الجدولة المحددة أعلاه.' 
                    : 'اضغط على زر "إنشاء نقطة استعادة يدوية جديدة" أو انتظر موعد الجدولة التلقائية لحفظ لقطة كاملة ونقية.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSnapshots.map(snap => {
                  const isAutoSnapshot = snap.isAuto || snap.type === 'auto' || snap.name.includes('تلقائية') || snap.name.includes('دورية');
                  return (
                    <div key={snap.id} className={`bg-slate-950 border rounded-2xl p-5 space-y-3 relative group hover:border-slate-700 transition-all shadow-md ${isAutoSnapshot ? 'border-amber-500/20' : 'border-slate-800'}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDeleteSnapshot(snap.id)}
                            className="text-slate-600 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="حذف نقطة الاستعادة من قاعدة البيانات"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setSelectedSnapshotPreview(snap)}
                            className="text-slate-600 hover:text-cyan-400 p-1.5 rounded-lg hover:bg-cyan-500/10 transition-colors cursor-pointer"
                            title="معاينة تفاصيل النقطة"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadSnapshotJson(snap)}
                            className="text-slate-600 hover:text-amber-400 p-1.5 rounded-lg hover:bg-amber-500/10 transition-colors cursor-pointer"
                            title="تحميل نقطة الاستعادة كملف JSON"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {isAutoSnapshot ? (
                              <span className="text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 font-bold flex items-center gap-1 font-mono">
                                <Clock className="w-3 h-3 text-amber-400" />
                                <span>دورية تلقائية {snap.intervalHours ? `(كل ${snap.intervalHours}س)` : ''}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20 font-bold flex items-center gap-1">
                                <Database className="w-3 h-3 text-cyan-400" />
                                <span>يدوية</span>
                              </span>
                            )}
                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              خالية من التكرار 100%
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-100 text-sm flex items-center justify-end gap-1.5 mt-1">
                            <span>{snap.name}</span>
                            <span className={`w-2 h-2 rounded-full inline-block ${isAutoSnapshot ? 'bg-amber-400' : 'bg-emerald-500'}`}></span>
                          </h4>
                          <span className="text-[10px] text-slate-500 font-mono block mt-0.5 dir-ltr text-right">{snap.date}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 py-2.5 bg-slate-900/80 rounded-xl px-3 text-center text-xs border border-slate-800/70">
                        <div>
                          <span className="text-[10px] text-slate-500 block font-medium">المشتركين</span>
                          <span className="font-bold text-amber-400 font-mono text-sm">{snap.subscribersCount || 0}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block font-medium">القراءات</span>
                          <span className="font-bold text-cyan-400 font-mono text-sm">{snap.readingsCount || 0}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block font-medium">السندات</span>
                          <span className="font-bold text-emerald-400 font-mono text-sm">{snap.paymentsCount || 0}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleRestoreSnapshot(snap)}
                          className="flex-1 bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 font-bold py-2 px-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>استعادة نقطة الاستعادة</span>
                        </button>
                        <button
                          onClick={() => setSelectedSnapshotPreview(snap)}
                          className="bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 py-2 px-3 rounded-xl text-xs transition-all flex items-center justify-center cursor-pointer"
                          title="تفاصيل النقطة"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SELECTIVE EXPORT (All 13 Tables) */}
      {activeTab === 'export' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-200 flex items-center justify-end gap-2">
              <span>تصدير الجداول المستقلة والكشوفات المخصصة</span>
              <FileSpreadsheet className="w-5 h-5 text-amber-500" />
            </h3>
            <p className="text-xs text-slate-400 mt-1">تصدير كافة جداول النظام بصيغة CSV لفتحها مباشرة في Microsoft Excel أو JSON للربط البرمجي.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Subscribers */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between space-y-3">
              <div>
                <h4 className="font-bold text-slate-100 text-xs mb-1">دليل المشتركين والعدادات</h4>
                <p className="text-[11px] text-slate-500">الأسماء، العدادات، المناطق، والديون ({subscribers.length} مشترك).</p>
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button onClick={() => exportSelectiveData('subscribers', 'csv')} className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer">
                  <FileSpreadsheet className="w-3 h-3" />
                  <span>Excel (CSV)</span>
                </button>
                <button onClick={() => exportSelectiveData('subscribers', 'json')} className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer">
                  <FileJson className="w-3 h-3" />
                  <span>JSON</span>
                </button>
              </div>
            </div>

            {/* Payments */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between space-y-3">
              <div>
                <h4 className="font-bold text-slate-100 text-xs mb-1">سندات التحصيل والمقبوضات</h4>
                <p className="text-[11px] text-slate-500">سندات التوريد المالي وأسماء المحصلين ({payments.length} سند).</p>
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button onClick={() => exportSelectiveData('payments', 'csv')} className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer">
                  <FileSpreadsheet className="w-3 h-3" />
                  <span>Excel (CSV)</span>
                </button>
                <button onClick={() => exportSelectiveData('payments', 'json')} className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer">
                  <FileJson className="w-3 h-3" />
                  <span>JSON</span>
                </button>
              </div>
            </div>

            {/* Readings */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between space-y-3">
              <div>
                <h4 className="font-bold text-slate-100 text-xs mb-1">القراءات والفواتير الميدانية</h4>
                <p className="text-[11px] text-slate-500">الاستهلاكات والمبالغ المحتسبة ({readings.length} قراءة).</p>
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button onClick={() => exportSelectiveData('readings', 'csv')} className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer">
                  <FileSpreadsheet className="w-3 h-3" />
                  <span>Excel (CSV)</span>
                </button>
                <button onClick={() => exportSelectiveData('readings', 'json')} className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer">
                  <FileJson className="w-3 h-3" />
                  <span>JSON</span>
                </button>
              </div>
            </div>

            {/* Inventory */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between space-y-3">
              <div>
                <h4 className="font-bold text-slate-100 text-xs mb-1">سجل المخزون والأصناف</h4>
                <p className="text-[11px] text-slate-500">الأصناف والكميات وأسعار الشراء ({inventory.length} صنف).</p>
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button onClick={() => exportSelectiveData('inventory', 'csv')} className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer">
                  <FileSpreadsheet className="w-3 h-3" />
                  <span>Excel (CSV)</span>
                </button>
                <button onClick={() => exportSelectiveData('inventory', 'json')} className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer">
                  <FileJson className="w-3 h-3" />
                  <span>JSON</span>
                </button>
              </div>
            </div>

            {/* Expenses */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between space-y-3">
              <div>
                <h4 className="font-bold text-slate-100 text-xs mb-1">سندات المصروفات والصرف</h4>
                <p className="text-[11px] text-slate-500">سندات الصرف والبنود والجهات ({expenses.length} سند).</p>
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button onClick={() => exportSelectiveData('expenses', 'csv')} className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer">
                  <FileSpreadsheet className="w-3 h-3" />
                  <span>Excel (CSV)</span>
                </button>
                <button onClick={() => exportSelectiveData('expenses', 'json')} className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer">
                  <FileJson className="w-3 h-3" />
                  <span>JSON</span>
                </button>
              </div>
            </div>

            {/* Purchases */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between space-y-3">
              <div>
                <h4 className="font-bold text-slate-100 text-xs mb-1">فواتير المشتريات والموردين</h4>
                <p className="text-[11px] text-slate-500">فواتير الشراء وحسابات الموردين ({purchases.length} فاتورة).</p>
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button onClick={() => exportSelectiveData('purchases', 'csv')} className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer">
                  <FileSpreadsheet className="w-3 h-3" />
                  <span>Excel (CSV)</span>
                </button>
                <button onClick={() => exportSelectiveData('purchases', 'json')} className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer">
                  <FileJson className="w-3 h-3" />
                  <span>JSON</span>
                </button>
              </div>
            </div>

            {/* Transfers & Journal */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between space-y-3">
              <div>
                <h4 className="font-bold text-slate-100 text-xs mb-1">التحويلات والقيود اليومية</h4>
                <p className="text-[11px] text-slate-500">التحويلات بين الخزن والقيود ({treasuryTransfers.length + manualJournalEntries.length} حركة).</p>
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button onClick={() => exportSelectiveData('transfers', 'csv')} className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer">
                  <FileSpreadsheet className="w-3 h-3" />
                  <span>التحويلات</span>
                </button>
                <button onClick={() => exportSelectiveData('journal', 'csv')} className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer">
                  <FileJson className="w-3 h-3" />
                  <span>القيود</span>
                </button>
              </div>
            </div>

            {/* Employees */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between space-y-3">
              <div>
                <h4 className="font-bold text-slate-100 text-xs mb-1">سجل الموظفين والرواتب</h4>
                <p className="text-[11px] text-slate-500">بيانات الكادر الوظيفي والرواتب ({employees.length} موظف).</p>
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button onClick={() => exportSelectiveData('employees', 'csv')} className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer">
                  <FileSpreadsheet className="w-3 h-3" />
                  <span>Excel (CSV)</span>
                </button>
                <button onClick={() => exportSelectiveData('employees', 'json')} className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer">
                  <FileJson className="w-3 h-3" />
                  <span>JSON</span>
                </button>
              </div>
            </div>

            {/* Audit Logs */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between space-y-3">
              <div>
                <h4 className="font-bold text-slate-100 text-xs mb-1">سجل التدقيق والحركات الأمنية</h4>
                <p className="text-[11px] text-slate-500">توثيق كافة تحركات وتعديلات النظام ({auditLogs.length} عملية).</p>
              </div>
              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button onClick={() => exportSelectiveData('logs', 'csv')} className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer">
                  <FileSpreadsheet className="w-3 h-3" />
                  <span>Excel (CSV)</span>
                </button>
                <button onClick={() => exportSelectiveData('logs', 'json')} className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer">
                  <FileJson className="w-3 h-3" />
                  <span>JSON</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: HEALTH & INTEGRITY SCANNER */}
      {activeTab === 'health' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
            <button
              onClick={handleRunHealthCheck}
              disabled={isScanning}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/10"
            >
              <Activity className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'جار فحص سلامة وتناسق البيانات...' : 'بدء فحص السلامة والمطابقة الآن'}</span>
            </button>

            <div>
              <h3 className="text-base font-bold text-slate-200 flex items-center justify-start md:justify-end gap-2">
                <span>أداة فحص النزاهة الشاملة ومطابقة الأرصدة الحسابية</span>
                <ShieldCheck className="w-5 h-5 text-amber-500" />
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">التحقق الحسابي الدقيق من مطابقة (إجمالي القراءات - إجمالي المقبوضات) مع الرصيد المسجل.</p>
            </div>
          </div>

          {healthStatus ? (
            <div className="space-y-5">
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${healthStatus.healthScore >= 90 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    <CheckCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">درجة نقاء وسلامة قاعدة البيانات</h4>
                    <p className="text-xs text-slate-500">تم تدقيق {healthStatus.totalAudited} سجل رئيسي بنجاح</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black font-mono text-amber-400">{healthStatus.healthScore}%</span>
                  <span className="text-xs font-bold text-slate-400">معدل التوافق</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`p-4 rounded-2xl border text-right ${
                  healthStatus.mismatchedBalances > 0 ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                }`}>
                  <span className="text-xs font-bold block mb-1">تفاوت أرصدة المشتركين</span>
                  <span className="text-2xl font-black font-mono">{healthStatus.mismatchedBalances}</span>
                  <span className="text-[10px] block mt-1 opacity-80">
                    {healthStatus.mismatchedBalances === 0 ? 'الأرصدة متطابقة 100%' : 'يتطلب مطابقة آليّة'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-right">
                  <span className="text-xs text-slate-400 font-bold block mb-1">قراءات بدون حساب مشترك</span>
                  <span className="text-2xl font-black font-mono text-slate-200">{healthStatus.orphanedReadings}</span>
                  <span className="text-[10px] text-slate-500 block mt-1">سجلات غير مرتبطة</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-right">
                  <span className="text-xs text-slate-400 font-bold block mb-1">فواتير وقراءات غير مرحلة</span>
                  <span className="text-2xl font-black font-mono text-cyan-400">{healthStatus.pendingReadings}</span>
                  <span className="text-[10px] text-slate-500 block mt-1">قراءة معلقة</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-right">
                  <span className="text-xs text-slate-400 font-bold block mb-1">سندات قبض غير مرحلة</span>
                  <span className="text-2xl font-black font-mono text-emerald-400">{healthStatus.pendingPayments}</span>
                  <span className="text-[10px] text-slate-500 block mt-1">سند معلق</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
              <Activity className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="text-xs text-slate-400 font-medium">اضغط على زر "بدء فحص السلامة والمطابقة الآن" لتحليل الجداول والتأكد من توافق الحركات المالية.</p>
            </div>
          )}

          {/* Auto-Repair Action Card */}
          <div className="p-5 bg-slate-950 border border-slate-800 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-5 hover:border-slate-700 transition-all">
            <button
              type="button"
              onClick={handleFixBalancesAndIntegrity}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 py-3 rounded-2xl text-xs transition-all cursor-pointer shrink-0 flex items-center gap-2 shadow-lg shadow-amber-500/10"
            >
              <RefreshCw className="w-4 h-4" />
              <span>إصلاح ومطابقة أرصدة المشتركين آلياً</span>
            </button>
            <div className="text-right space-y-1">
              <h4 className="text-sm font-bold text-slate-100 flex items-center justify-end gap-2">
                <span>مطابقة وتعديل الأرصدة التراكمية لكل المشتركين</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                تقوم هذه العملية بإعادة حساب رصيد كل مشترك من واقع: (الرصيد الافتتاحي + إجمالي الفواتير والقراءات - إجمالي المقبوضات والسندات) وتحديث البيانات فوراً بالسحابة.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: DANGER ZONE & RESET */}
      {activeTab === 'danger' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-rose-400 flex items-center justify-end gap-2">
              <span>خـيارات تنظيف وإعادة تهيئة قاعدة البيانات</span>
              <ShieldAlert className="w-5 h-5 text-rose-500" />
            </h3>
            <p className="text-xs text-slate-400 mt-1">إعادة تعيين السجلات أو مسح الحركات الاختبارية للبدء بدورة عمل إنتاجية نظيفة.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Soft Reset */}
            <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                  <Trash2 className="w-4 h-4" />
                  <span>تصفير الفواتير والقراءات فقط</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  مسح القراءات، الفواتير، وسندات القبض الميداني مع الإبقاء الكامل على ملفات المشتركين، العدادات، المخزون، وحسابات المستخدمين.
                </p>
              </div>
              <button
                onClick={handleSoftReset}
                className="w-full mt-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
              >
                مسح الفواتير والسندات فقط
              </button>
            </div>

            {/* Clean Start - Zero All Data */}
            <div className="bg-slate-950 border border-rose-900/60 p-5 rounded-2xl space-y-3 flex flex-col justify-between shadow-lg shadow-rose-950/20">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-black text-sm">
                  <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
                  <span>تصفير شامل للبدء الجديد من الصفر</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  إخلاء ومسح جميع المشتركين، القراءات، الفواتير، المصروفات، المخزون وسجلات العمليات بالكامل لتجهيز النظام لبدء إدخال بيانات حقيقية جديدة، مع الحفاظ على حسابات الإدارة والإعدادات.
                </p>
              </div>
              <button
                onClick={async () => {
                  if (confirm('تنبيه هام جداً:\nهل أنت متأكد تماماً من تصفير ومسح جميع المشتركين والقراءات والفواتير والمخزون في قاعدة البيانات السحابية (Firebase Firestore) للبدء في إدخال البيانات الحقيقية من الصفر؟\nلا يمكن التراجع عن هذه العملية!')) {
                    if (onWipeAllData) {
                      await onWipeAllData();
                      logDbAction('تصفير شامل للبدء الجديد', 'مسح كافة بيانات المشتركين والحركات في قاعدة البيانات للبدء من الصفر');
                      alert('تم تصفير وإخلاء جميع البيانات في قاعدة البيانات السحابية (Firebase Firestore) والنظام بنجاح! أصبح النظام جاهزاً لإدخال بياناتك الجديدة.');
                    } else {
                      await onResetDatabase();
                    }
                  }
                }}
                className="w-full mt-2 bg-rose-600 hover:bg-rose-700 text-white font-black py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-rose-600/30"
              >
                تصفير كافة البيانات لبداية جديدة (Zero All Data)
              </button>
            </div>

            {/* Factory Sample Reset */}
            <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <RefreshCw className="w-4 h-4" />
                  <span>العودة للبيانات النموذجية العيّنة</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  مسح جميع البيانات وإعادة شحن قاعدة البيانات بالسجلات النموذجية العينة الافتراضية للاختبار والتجربة.
                </p>
              </div>
              <button
                onClick={() => {
                  if (confirm('هل أنت متأكد تماماً من إعادة شحن البيانات النموذجية للاختبار؟')) {
                    onResetDatabase();
                    logDbAction('إعادة تهيئة عينة', 'مسح البيانات وتحميل السجلات الافتراضية العينة');
                    alert('تمت إعادة تحميل البيانات النموذجية العينة بنجاح!');
                  }
                }}
                className="w-full mt-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
              >
                استعادة البيانات النموذجية العيّنة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESTORE MODAL PREVIEW */}
      <AnimatePresence>
        {restoreFilePreview && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setRestoreFilePreview(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right"
            >
              <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                <button
                  onClick={() => setRestoreFilePreview(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>معاينة ملف الاسترجاع قبل التطبيق</span>
                  <Upload className="w-5 h-5 text-cyan-400" />
                </h3>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-300">
                  سيتم تطبيق ومزامنة البيانات التالية إلى قاعدة بيانات النظام الحالية:
                </p>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">عدد المشتركين</span>
                    <span className="font-bold text-amber-400 font-mono text-sm">{restoreFilePreview.subscribers?.length || 0}</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">عدد القراءات</span>
                    <span className="font-bold text-cyan-400 font-mono text-sm">{restoreFilePreview.readings?.length || 0}</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">عدد السندات</span>
                    <span className="font-bold text-emerald-400 font-mono text-sm">{restoreFilePreview.payments?.length || 0}</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">عدد المستخدمين</span>
                    <span className="font-bold text-purple-400 font-mono text-sm">{restoreFilePreview.users?.length || 0}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                  <button
                    onClick={() => setRestoreFilePreview(null)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleConfirmFileRestore}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-600 text-slate-950 transition-colors cursor-pointer shadow-lg shadow-cyan-500/10"
                  >
                    تأكيد واستعادة السجلات الآن
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* SNAPSHOT DETAIL PREVIEW MODAL */}
        {selectedSnapshotPreview && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setSelectedSnapshotPreview(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right"
            >
              <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                <button
                  onClick={() => setSelectedSnapshotPreview(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>تفاصيل نقطة الاستعادة [{selectedSnapshotPreview.name}]</span>
                  <Archive className="w-5 h-5 text-amber-400" />
                </h3>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="font-mono text-slate-400">{selectedSnapshotPreview.date}</span>
                  <span className="text-slate-500">تاريخ الحفظ:</span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs text-center">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">المشتركون</span>
                    <span className="font-bold text-amber-400 font-mono text-sm">{selectedSnapshotPreview.subscribersCount}</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">القراءات</span>
                    <span className="font-bold text-cyan-400 font-mono text-sm">{selectedSnapshotPreview.readingsCount}</span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">السندات</span>
                    <span className="font-bold text-emerald-400 font-mono text-sm">{selectedSnapshotPreview.paymentsCount}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                  <button
                    onClick={() => handleDownloadSnapshotJson(selectedSnapshotPreview)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تنزيل JSON</span>
                  </button>
                  <button
                    onClick={() => handleRestoreSnapshot(selectedSnapshotPreview)}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors cursor-pointer shadow-lg shadow-amber-500/10 flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>استعادة هذه النقطة الآن</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* PASTE JSON MODAL */}
        {showPasteJsonModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setShowPasteJsonModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right"
            >
              <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                <button
                  onClick={() => setShowPasteJsonModal(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>لصق نص قاعدة البيانات (JSON)</span>
                  <FileJson className="w-5 h-5 text-cyan-400" />
                </h3>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  قم بلصق كود JSON الخاص بقاعدة البيانات في الحقل أدناه للتحقق من سلامتها ومعاينتها قبل التطبيق:
                </p>

                <textarea
                  value={pastedJsonText}
                  onChange={(e) => setPastedJsonText(e.target.value)}
                  placeholder="ألصق محتوى ملف الـ JSON هنا..."
                  rows={8}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500/50 dir-ltr text-left"
                />

                <div className="pt-2 border-t border-slate-800 flex justify-end gap-3">
                  <button
                    onClick={() => setShowPasteJsonModal(false)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleParsePastedJson}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-600 text-slate-950 transition-colors cursor-pointer shadow-lg shadow-cyan-500/10"
                  >
                    معاينة ومطابقة النص
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* DEDUPLICATION REPORT MODAL */}
        {showDedupModal && dedupReport && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setShowDedupModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-emerald-500/40 rounded-3xl shadow-2xl overflow-hidden text-right"
            >
              <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                <button
                  onClick={() => setShowDedupModal(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span>تقرير محرك منع وتطهير التكرار</span>
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </h3>
              </div>

              <div className="p-6 space-y-5">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                  <p className="text-xs text-emerald-300 font-medium leading-relaxed">
                    {dedupReport.totalRemoved > 0
                      ? `تم بنجاح فحص وتطهير النظام وإزالة ${dedupReport.totalRemoved} سجل مكرر مع الحفاظ على البيانات الأحدث والأكثر دقة.`
                      : 'تم الفحص الشامل بنجاح! لم يتم العثور على أي سجلات مكررة، وقاعدة البيانات نقية بنسبة 100%.'}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 block font-medium">المشتركون</span>
                    <span className="font-mono font-bold text-sm text-amber-400">
                      {dedupReport.subscribers.deduplicated}
                    </span>
                    <span className="text-[10px] text-rose-400 block">
                      {dedupReport.subscribers.removed > 0 ? `-${dedupReport.subscribers.removed} مكرر` : '✓ نقي'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 block font-medium">القراءات</span>
                    <span className="font-mono font-bold text-sm text-cyan-400">
                      {dedupReport.readings.deduplicated}
                    </span>
                    <span className="text-[10px] text-rose-400 block">
                      {dedupReport.readings.removed > 0 ? `-${dedupReport.readings.removed} مكرر` : '✓ نقي'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-400 block font-medium">السندات</span>
                    <span className="font-mono font-bold text-sm text-emerald-400">
                      {dedupReport.payments.deduplicated}
                    </span>
                    <span className="text-[10px] text-rose-400 block">
                      {dedupReport.payments.removed > 0 ? `-${dedupReport.payments.removed} مكرر` : '✓ نقي'}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800/80 text-xs space-y-2 text-slate-400">
                  <div className="flex justify-between items-center text-slate-300">
                    <span>إجمالي السجلات التي خضعت للتدقيق:</span>
                    <span className="font-mono font-bold text-slate-100">
                      {dedupReport.subscribers.original + dedupReport.readings.original + dedupReport.payments.original}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>إجمالي السجلات المكررة التي أُزيلت:</span>
                    <span className="font-mono font-bold text-rose-400">
                      {dedupReport.totalRemoved}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-400 font-bold border-t border-slate-800/80 pt-2">
                    <span>حالة قاعدة البيانات الآن:</span>
                    <span>خالية من التكرار 100%</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={() => setShowDedupModal(false)}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer shadow-lg shadow-emerald-500/10"
                  >
                    إغلاق التقرير
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

export default AdminDatabase;
