import { useState, useEffect, Suspense, lazy } from 'react';
import { 
  User, Subscriber, MeterReading, Payment, SystemSettings, AuditLog, InventoryItem, InventoryTransaction,
  Expense, Purchase, EmployeeTransaction, ServiceConnection, Employee, TechnicalRequest, SmsTemplate,
  FailedSmsItem, Partner, PartnerTransaction, ProfitDistributionBatch
} from './types';
import { 
  INITIAL_USERS, INITIAL_SUBSCRIBERS, INITIAL_READINGS, 
  INITIAL_PAYMENTS, DEFAULT_SETTINGS, INITIAL_AUDIT_LOGS, INITIAL_INVENTORY, INITIAL_INVENTORY_TRANSACTIONS,
  INITIAL_SMS_TEMPLATES, INITIAL_PARTNERS, INITIAL_PARTNER_TRANSACTIONS, INITIAL_PROFIT_DISTRIBUTIONS
} from './initialData';
import { 
  loadAllCloudData, 
  syncUserToCloud, 
  syncBulkUsersToCloud,
  syncSubscriberToCloud, 
  syncReadingToCloud, 
  syncPaymentToCloud, 
  syncSettingsToCloud, 
  syncAuditLogToCloud,
  clearAuditLogsFromCloud,
  clearAllOperationalDataFromCloud,
  deleteUserFromCloud,
  deleteSubscriberFromCloud,
  deleteReadingFromCloud,
  deletePaymentFromCloud,
  syncBulkReadingsToCloud,
  syncBulkPaymentsToCloud,
  syncTreasuryTransferToCloud,
  deleteTreasuryTransferFromCloud,
  syncExpenseToCloud,
  deleteExpenseFromCloud,
  syncPurchaseToCloud,
  deletePurchaseFromCloud,
  syncJournalEntryToCloud,
  deleteJournalEntryFromCloud,
  syncEmployeeToCloud,
  deleteEmployeeFromCloud,
  syncEmployeeTxToCloud,
  deleteEmployeeTxFromCloud,
  syncConnectionToCloud,
  deleteConnectionFromCloud,
  syncTechRequestToCloud,
  deleteTechRequestFromCloud,
  syncInventoryItemToCloud,
  syncBulkInventoryToCloud,
  deleteInventoryItemFromCloud,
  syncInventoryTxToCloud,
  syncBulkInventoryTxsToCloud,
  deleteInventoryTxFromCloud,
  syncSmsTemplateToCloud,
  deleteSmsTemplateFromCloud,
  clearAllSmsTemplatesFromCloud,
  syncBulkSmsTemplatesToCloud,
  subscribeToSmsTemplatesFromCloud,
  syncFailedSmsToCloud,
  deleteFailedSmsFromCloud,
  syncBulkFailedSmsToCloud,
  clearAllFailedSmsFromCloud,
  subscribeToFailedSmsFromCloud,
  subscribeToSubscribersFromCloud,
  subscribeToTechRequestsFromCloud,
  subscribeToUsersFromCloud,
  subscribeToTreasuryTransfersFromCloud,
  subscribeToExpensesFromCloud,
  subscribeToPurchasesFromCloud,
  subscribeToJournalEntriesFromCloud,
  subscribeToPaymentsFromCloud,
  subscribeToReadingsFromCloud,
  subscribeToConnectionsFromCloud,
  subscribeToInventoryFromCloud,
  subscribeToInventoryTxsFromCloud,
  subscribeToEmployeesFromCloud,
  subscribeToEmployeeTxsFromCloud,
  subscribeToPartnersFromCloud,
  subscribeToPartnerTransactionsFromCloud,
  subscribeToProfitDistributionsFromCloud,
  syncBulkPartnersToCloud,
  syncBulkPartnerTransactionsToCloud,
  syncBulkProfitDistributionsToCloud,
  syncPartnerTransactionToCloud,
  syncProfitDistributionToCloud,
  subscribeToSettingsFromCloud,
  getLocalData,
  setLocalData,
  TreasuryTransfer,
  JournalEntry,
  seedFirestore,
  updateCachedCloudSubscribers,
  deduplicateSubscribers,
  createAutoDatabaseSnapshot
} from './lib/database';
import { Cloud, RefreshCw, CheckCircle, Database } from 'lucide-react';
import { compressBase64Image } from './utils/imageCompressor';
import { getExactSubscriberBalance } from './utils/balanceUtils';
import { processOfflineQueue } from './utils/offlineQueue';
import { AdminDashboard } from './components/AdminDashboard';
import { CollectorDashboard } from './components/CollectorDashboard';
import { Login } from './components/Login';

const PageLoadingFallback = () => (
  <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white font-sans text-center px-4 dir-rtl">
    <div className="bg-slate-800 border border-slate-700 p-8 rounded-3xl shadow-2xl max-w-sm w-full flex flex-col items-center gap-4">
      <div className="p-4 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
      <div>
        <h3 className="text-base font-black text-white">جاري تحميل الصفحة...</h3>
        <p className="text-xs text-slate-400 mt-1">تحميل مستقل وسريع للوحدات والصفحات المنفصلة</p>
      </div>
    </div>
  </div>
);

export default function App() {
  // --- CLOUD STATE ---
  const [cloudLoading, setCloudLoading] = useState(true);
  const [cloudError, setCloudError] = useState<string | null>(null);

  // --- ONLINE & OFFLINE QUEUE STATE ---
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  
  const [pendingSync, setPendingSync] = useState<{
    readings: MeterReading[];
    payments: Payment[];
    auditLogs: AuditLog[];
  }>(() => {
    const saved = localStorage.getItem('voltera_pending_sync');
    return saved ? JSON.parse(saved) : { readings: [], payments: [], auditLogs: [] };
  });

  // Keep localStorage in sync for pending operations
  useEffect(() => {
    localStorage.setItem('voltera_pending_sync', JSON.stringify(pendingSync));
  }, [pendingSync]);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log("Device is online. Triggering IndexedDB pending sync queue...");
      processOfflineQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
      console.log("Device offline.");
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- STATE MANAGERS ---
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('voltera_logged_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [subscribers, setSubscribers] = useState<Subscriber[]>(INITIAL_SUBSCRIBERS);
  const [readings, setReadings] = useState<MeterReading[]>(INITIAL_READINGS);
  const [payments, setPayments] = useState<Payment[]>(INITIAL_PAYMENTS);
  const [settings, setSettings] = useState<SystemSettings>(() => {
    try {
      const localStr = typeof window !== 'undefined' ? localStorage.getItem('voltera_cache_settings') : null;
      if (localStr) {
        const parsed = JSON.parse(localStr);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          tariffs: {
            ...DEFAULT_SETTINGS.tariffs,
            ...(parsed.tariffs || {})
          }
        };
      }
      const cloudCachedStr = typeof window !== 'undefined' ? localStorage.getItem('voltera_cached_cloud_data') : null;
      if (cloudCachedStr) {
        const parsedCloud = JSON.parse(cloudCachedStr);
        if (parsedCloud && parsedCloud.settings) {
          return {
            ...DEFAULT_SETTINGS,
            ...parsedCloud.settings,
            tariffs: {
              ...DEFAULT_SETTINGS.tariffs,
              ...(parsedCloud.settings.tariffs || {})
            }
          };
        }
      }
    } catch (e) {}
    return DEFAULT_SETTINGS;
  });

  // Apply Font Family & Theme settings dynamically across the entire app
  useEffect(() => {
    if (settings.fontFamily) {
      document.body.style.fontFamily = `"${settings.fontFamily}", Cairo, ui-sans-serif, system-ui, sans-serif`;
    }
    if (settings.themeColor) {
      document.documentElement.dataset.themeColor = settings.themeColor;
    }
    if (settings.layoutDensity) {
      document.documentElement.dataset.density = settings.layoutDensity;
    }
  }, [settings.fontFamily, settings.themeColor, settings.layoutDensity]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryTransactions, setInventoryTransactions] = useState<InventoryTransaction[]>(INITIAL_INVENTORY_TRANSACTIONS);
  const [treasuryTransfers, setTreasuryTransfers] = useState<TreasuryTransfer[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [manualJournalEntries, setManualJournalEntries] = useState<JournalEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeTxs, setEmployeeTxs] = useState<EmployeeTransaction[]>([]);
  const [connections, setConnections] = useState<ServiceConnection[]>([]);
  const [techRequests, setTechRequests] = useState<TechnicalRequest[]>([]);
  const [smsTemplates, setSmsTemplates] = useState<SmsTemplate[]>(() => getLocalData('voltera_firestore_sms_templates', []));
  const [failedSms, setFailedSms] = useState<FailedSmsItem[]>(() => getLocalData('voltera_firestore_failed_sms', []));
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerTransactions, setPartnerTransactions] = useState<PartnerTransaction[]>([]);
  const [profitDistributions, setProfitDistributions] = useState<ProfitDistributionBatch[]>([]);

  // --- LOAD FROM FIRESTORE OR LOCAL CACHE ON MOUNT ---
  useEffect(() => {
    async function initDb() {
      let hasLoadedFromCache = false;

      // Clean up legacy heavy snapshot cache from localStorage if present (>200KB indicates full data dump)
      try {
        const snapRaw = localStorage.getItem('voltera_db_snapshots');
        if (snapRaw && snapRaw.length > 200000) {
          localStorage.removeItem('voltera_db_snapshots');
        }
      } catch (_) {}

      // 0. Instant load from local cache if available so startup is instant (0 seconds delay)
      try {
        const cachedCloudStr = localStorage.getItem('voltera_cached_cloud_data');
        if (cachedCloudStr) {
          const cachedData = JSON.parse(cachedCloudStr);
          if (cachedData && Array.isArray(cachedData.users) && cachedData.users.length > 0) {
            setUsers(cachedData.users);
            if (cachedData.subscribers) setSubscribers(cachedData.subscribers);
            if (cachedData.readings) setReadings(cachedData.readings);
            if (cachedData.payments) setPayments(cachedData.payments);
            if (cachedData.auditLogs) setAuditLogs(cachedData.auditLogs);
            if (cachedData.treasuryTransfers) setTreasuryTransfers(cachedData.treasuryTransfers);
            if (cachedData.expenses) setExpenses(cachedData.expenses);
            if (cachedData.purchases) setPurchases(cachedData.purchases);
            if (cachedData.manualJournalEntries) setManualJournalEntries(cachedData.manualJournalEntries);
            if (cachedData.employees) setEmployees(cachedData.employees);
            if (cachedData.employeeTxs) setEmployeeTxs(cachedData.employeeTxs);
            if (cachedData.connections) setConnections(cachedData.connections);
            if (cachedData.techRequests) setTechRequests(cachedData.techRequests);
            if (cachedData.inventory) setInventory(cachedData.inventory);
            if (cachedData.inventoryTransactions) setInventoryTransactions(cachedData.inventoryTransactions);
            if (cachedData.smsTemplates && Array.isArray(cachedData.smsTemplates) && cachedData.smsTemplates.length > 0) {
              setSmsTemplates(cachedData.smsTemplates);
            }
            if (cachedData.failedSms && Array.isArray(cachedData.failedSms)) {
              setFailedSms(cachedData.failedSms);
            }
            if (cachedData.partners && Array.isArray(cachedData.partners)) {
              const purePartners = cachedData.partners.filter((p: any) => !['prt-1', 'prt-2', 'prt-3'].includes(p.id));
              setPartners(purePartners);
            }
            if (cachedData.partnerTransactions && Array.isArray(cachedData.partnerTransactions)) {
              const pureTxs = cachedData.partnerTransactions.filter((t: any) => !['ptx-1', 'ptx-2', 'ptx-3'].includes(t.id));
              setPartnerTransactions(pureTxs);
            }
            if (cachedData.profitDistributions && Array.isArray(cachedData.profitDistributions)) {
              setProfitDistributions(cachedData.profitDistributions);
            }
            if (cachedData.settings) {
              setSettings(prev => ({
                ...prev,
                ...cachedData.settings,
                tariffs: {
                  ...prev.tariffs,
                  ...(cachedData.settings.tariffs || {})
                }
              }));
            }

            hasLoadedFromCache = true;
            setCloudLoading(false); // Hide splash screen immediately!
          }
        }
      } catch (e) {
        console.warn("Failed to load initial cache from localStorage:", e);
      }

      try {
        if (!hasLoadedFromCache) {
          setCloudLoading(true);
        }

        const data = await loadAllCloudData();

        // Save fresh cloud snapshot to localStorage for instant startup next time
        try {
          localStorage.setItem('voltera_cached_cloud_data', JSON.stringify(data));
        } catch (e) {
          console.warn("Could not save cloud cache to localStorage:", e);
        }
        
        // Merge offline pending queues so they aren't lost on reload
        const savedQueue = localStorage.getItem('voltera_pending_sync');
        const queue = savedQueue ? JSON.parse(savedQueue) : { readings: [], payments: [], auditLogs: [] };

        // 1. Merge readings: prepend any pending readings that aren't in the cloud list yet
        const cloudReadings = data.readings;
        const mergedReadings = [
          ...queue.readings.filter((pr: any) => !cloudReadings.some((cr: any) => cr.id === pr.id)),
          ...cloudReadings
        ];

        // 2. Merge payments
        const cloudPayments = data.payments;
        const mergedPayments = [
          ...queue.payments.filter((pp: any) => !cloudPayments.some((cp: any) => cp.id === pp.id)),
          ...cloudPayments
        ];

        // 3. Merge audit logs
        const cloudLogs = data.auditLogs;
        const mergedLogs = [
          ...queue.auditLogs.filter((pl: any) => !cloudLogs.some((cl: any) => cl.id === pl.id)),
          ...cloudLogs
        ];

        // 4. Update local states of subscribers with pending items to make sure local calculations are accurate!
        let updatedSubscribers = [...data.subscribers];
        for (const pendingRd of queue.readings) {
          updatedSubscribers = updatedSubscribers.map(sub => {
            if (sub.id === pendingRd.subscriberId) {
              return {
                ...sub,
                currentReading: pendingRd.currentReading,
                currentBalance: sub.currentBalance + pendingRd.totalAmount
              };
            }
            return sub;
          });
        }
        for (const pendingPay of queue.payments) {
          updatedSubscribers = updatedSubscribers.map(sub => {
            if (sub.id === pendingPay.subscriberId) {
              return {
                ...sub,
                currentBalance: sub.currentBalance - pendingPay.amountPaid
              };
            }
            return sub;
          });
        }

        setUsers(data.users);
        setSubscribers(updatedSubscribers);
        setReadings(mergedReadings);
        setPayments(mergedPayments);
        setSettings(data.settings);
        setAuditLogs(mergedLogs);

        // Populate collections directly from Cloud Firestore data
        const trfs = data.treasuryTransfers || [];
        const exps = data.expenses || [];
        const purs = data.purchases || [];
        const jes = data.manualJournalEntries || [];
        const emps = data.employees || [];
        const etxs = data.employeeTxs || [];
        const conns = data.connections || [];
        const trqs = data.techRequests || [];
        const invs = data.inventory || [];
        const invTxs = data.inventoryTransactions || [];
        const tpls = (data.smsTemplates && data.smsTemplates.length > 0) ? data.smsTemplates : [];
        const failedList = data.failedSms || [];
        const prts = (data.partners && data.partners.length > 0) ? data.partners : INITIAL_PARTNERS;
        const ptxs = (data.partnerTransactions && data.partnerTransactions.length > 0) ? data.partnerTransactions : INITIAL_PARTNER_TRANSACTIONS;
        const pdists = (data.profitDistributions && data.profitDistributions.length > 0) ? data.profitDistributions : INITIAL_PROFIT_DISTRIBUTIONS;

        setTreasuryTransfers(trfs);
        setExpenses(exps);
        setPurchases(purs);
        setManualJournalEntries(jes);
        setEmployees(emps);
        setEmployeeTxs(etxs);
        setConnections(conns);
        setTechRequests(trqs);
        setInventory(invs);
        setInventoryTransactions(invTxs);
        setSmsTemplates(tpls);
        setFailedSms(failedList);
        setPartners(prts);
        setPartnerTransactions(ptxs);
        setProfitDistributions(pdists);

        setCloudError(null);

        // Self-heal oversized logoUrl if present to fix Firestore 1MB document limit
        if (data.settings?.logoUrl && data.settings.logoUrl.startsWith('data:image') && data.settings.logoUrl.length > 150000) {
          compressBase64Image(data.settings.logoUrl, 250, 250, 0.85).then((compressed) => {
            const sanitizedSettings = { ...data.settings, logoUrl: compressed };
            setSettings(sanitizedSettings);
            syncSettingsToCloud(sanitizedSettings);
          });
        }
      } catch (e: any) {
        console.warn("Could not load from Firebase Firestore Database.", e);
        if (!hasLoadedFromCache) {
          setCloudError('حدث خطأ أثناء الاتصال بقاعدة البيانات السحابية (Firebase Firestore).');
        }
      } finally {
        setCloudLoading(false);
      }
    }
    initDb();
  }, []);

  // Track active navigation tab section for lazy/smart Firestore subscriptions
  const [activeSection, setActiveSection] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      return window.location.hash.replace('#', '');
    }
    return 'dashboard';
  });

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      setActiveSection(hash || 'dashboard');
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Continuous real-time subscription to cloud users even before and after login
  useEffect(() => {
    const unsub = subscribeToUsersFromCloud((cloudUsers) => {
      if (cloudUsers && cloudUsers.length > 0) {
        setUsers(cloudUsers);
      }
    });
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // --- REAL-TIME LIVE FIRESTORE DATABASE LISTENERS ---
  useEffect(() => {
    if (!currentUser) return;

    const unsubs: (() => void)[] = [];

    // Helper for merging offline pending subscribers with live subscribers
    const mergePendingSubscribers = (cloudSubs: Subscriber[]) => {
      const savedQueue = localStorage.getItem('voltera_pending_sync');
      const queue = savedQueue ? JSON.parse(savedQueue) : { readings: [], payments: [] };
      if ((!queue.readings || queue.readings.length === 0) && (!queue.payments || queue.payments.length === 0)) {
        return cloudSubs;
      }
      let updated = [...cloudSubs];
      for (const pendingRd of (queue.readings || [])) {
        updated = updated.map(sub => {
          if (sub.id === pendingRd.subscriberId) {
            return {
              ...sub,
              currentReading: Math.max(sub.currentReading, pendingRd.currentReading),
              currentBalance: sub.currentBalance + pendingRd.totalAmount
            };
          }
          return sub;
        });
      }
      for (const pendingPay of (queue.payments || [])) {
        updated = updated.map(sub => {
          if (sub.id === pendingPay.subscriberId) {
            return {
              ...sub,
              currentBalance: sub.currentBalance - pendingPay.amountPaid
            };
          }
          return sub;
        });
      }
      return updated;
    };

    unsubs.push(subscribeToUsersFromCloud((cloudUsers) => {
      if (cloudUsers && cloudUsers.length > 0) setUsers(cloudUsers);
    }));

    unsubs.push(subscribeToSubscribersFromCloud((cloudSubs) => setSubscribers(mergePendingSubscribers(cloudSubs))));
    unsubs.push(subscribeToReadingsFromCloud((cloudReadings) => setReadings(cloudReadings)));
    unsubs.push(subscribeToPaymentsFromCloud((cloudPayments) => setPayments(cloudPayments)));
    unsubs.push(subscribeToSettingsFromCloud((cloudSettings) => setSettings(cloudSettings)));

    unsubs.push(subscribeToInventoryFromCloud((cloudInvs) => setInventory(cloudInvs)));
    unsubs.push(subscribeToInventoryTxsFromCloud((cloudInvsTxs) => setInventoryTransactions(cloudInvsTxs)));

    unsubs.push(subscribeToExpensesFromCloud((cloudExps) => setExpenses(cloudExps)));
    unsubs.push(subscribeToPurchasesFromCloud((cloudPurs) => setPurchases(cloudPurs)));
    unsubs.push(subscribeToJournalEntriesFromCloud((cloudJes) => setManualJournalEntries(cloudJes)));
    unsubs.push(subscribeToTreasuryTransfersFromCloud((cloudTrfs) => setTreasuryTransfers(cloudTrfs)));

    unsubs.push(subscribeToEmployeesFromCloud((cloudEmps) => setEmployees(cloudEmps)));
    unsubs.push(subscribeToEmployeeTxsFromCloud((cloudEmployeeTxs) => setEmployeeTxs(cloudEmployeeTxs)));

    unsubs.push(subscribeToTechRequestsFromCloud((cloudTrqs) => setTechRequests(cloudTrqs)));
    unsubs.push(subscribeToConnectionsFromCloud((cloudConns) => setConnections(cloudConns)));
    unsubs.push(subscribeToSmsTemplatesFromCloud((cloudTpls) => {
      if (cloudTpls) {
        setSmsTemplates(cloudTpls);
      }
    }));
    unsubs.push(subscribeToFailedSmsFromCloud((cloudFailed) => {
      setFailedSms(cloudFailed || []);
    }));
    unsubs.push(subscribeToPartnersFromCloud((cloudPartners) => {
      if (cloudPartners) setPartners(cloudPartners);
    }));
    unsubs.push(subscribeToPartnerTransactionsFromCloud((cloudPartnerTxs) => {
      if (cloudPartnerTxs) setPartnerTransactions(cloudPartnerTxs);
    }));
    unsubs.push(subscribeToProfitDistributionsFromCloud((cloudProfitDists) => {
      if (cloudProfitDists) setProfitDistributions(cloudProfitDists);
    }));

    return () => {
      unsubs.forEach(unsub => {
        if (typeof unsub === 'function') unsub();
      });
    };
  }, [currentUser]);

  // --- PERSIST PARTNERS DATA LOCALLY AND IN SNAPSHOT CACHE ---
  useEffect(() => {
    if (partners) {
      setLocalData('voltera_firestore_partners', partners);
      try {
        const cachedStr = localStorage.getItem('voltera_cached_cloud_data');
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          cached.partners = partners;
          localStorage.setItem('voltera_cached_cloud_data', JSON.stringify(cached));
        }
      } catch (e) {
        console.warn("Error updating cached partners:", e);
      }
    }
  }, [partners]);

  useEffect(() => {
    if (partnerTransactions) {
      setLocalData('voltera_firestore_partner_txs', partnerTransactions);
      try {
        const cachedStr = localStorage.getItem('voltera_cached_cloud_data');
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          cached.partnerTransactions = partnerTransactions;
          localStorage.setItem('voltera_cached_cloud_data', JSON.stringify(cached));
        }
      } catch (e) {
        console.warn("Error updating cached partnerTransactions:", e);
      }
    }
  }, [partnerTransactions]);

  useEffect(() => {
    if (profitDistributions) {
      setLocalData('voltera_firestore_profit_distributions', profitDistributions);
      try {
        const cachedStr = localStorage.getItem('voltera_cached_cloud_data');
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          cached.profitDistributions = profitDistributions;
          localStorage.setItem('voltera_cached_cloud_data', JSON.stringify(cached));
        }
      } catch (e) {
        console.warn("Error updating cached profitDistributions:", e);
      }
    }
  }, [profitDistributions]);

  // --- PERSIST SMS TEMPLATES & FAILED SMS LOCALLY AND IN SNAPSHOT CACHE ---
  useEffect(() => {
    if (smsTemplates && smsTemplates.length > 0) {
      setLocalData('voltera_firestore_sms_templates', smsTemplates);
      try {
        const cachedStr = localStorage.getItem('voltera_cached_cloud_data');
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          cached.smsTemplates = smsTemplates;
          localStorage.setItem('voltera_cached_cloud_data', JSON.stringify(cached));
        }
      } catch (e) {
        console.warn("Error updating cached smsTemplates:", e);
      }
    }
  }, [smsTemplates]);

  useEffect(() => {
    if (failedSms) {
      setLocalData('voltera_firestore_failed_sms', failedSms);
      try {
        const cachedStr = localStorage.getItem('voltera_cached_cloud_data');
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          cached.failedSms = failedSms;
          localStorage.setItem('voltera_cached_cloud_data', JSON.stringify(cached));
        }
      } catch (e) {
        console.warn("Error updating cached failedSms:", e);
      }
    }
  }, [failedSms]);

  // --- PERSIST LOGGED USER ---
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('voltera_logged_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('voltera_logged_user');
    }
  }, [currentUser]);

  // --- PERIODIC CLEAN CLOUD SNAPSHOT SCHEDULER ENGINE (محرك جدولة نقاط الاستعادة السحابية التلقائية) ---
  useEffect(() => {
    // Helper to evaluate and trigger scheduled snapshot
    const checkAndTriggerSnapshot = async () => {
      // Check if auto snapshots are enabled (defaults to true if undefined)
      if (settings.autoSnapshotEnabled === false) return;

      const intervalHours = Math.max(1, settings.autoSnapshotIntervalHours || 2);
      const intervalMs = intervalHours * 60 * 60 * 1000;
      const lastTimeMs = settings.lastAutoSnapshotTime ? new Date(settings.lastAutoSnapshotTime).getTime() : 0;
      const now = Date.now();

      // Only proceed if never run or interval passed
      if (!lastTimeMs || (now - lastTimeMs) >= intervalMs) {
        // Prevent running on empty initial database state
        if (subscribers.length === 0 && readings.length === 0 && payments.length === 0) {
          return;
        }

        console.log(`[Auto-Snapshot Scheduler] Running scheduled cloud snapshot (every ${intervalHours} hours)...`);

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
          backupDate: new Date().toISOString(),
          stationName: settings.stationName
        };

        const maxKeep = settings.maxAutoSnapshotsToKeep || 30;
        const res = await createAutoDatabaseSnapshot(fullDbState, intervalHours, maxKeep);

        if (res) {
          const nowIso = new Date().toISOString();
          const updatedSettings: SystemSettings = {
            ...settings,
            lastAutoSnapshotTime: nowIso
          };
          setSettings(updatedSettings);
          await syncSettingsToCloud(updatedSettings);
          localStorage.setItem('voltera_cache_settings', JSON.stringify(updatedSettings));

          const newLog: AuditLog = {
            id: `log-auto-snap-${Date.now()}`,
            userId: currentUser?.id || 'system-scheduler',
            username: currentUser?.name || 'محرك الجدولة التلقائي',
            action: 'إنشاء نقطة استعادة سحابية دورية',
            details: `تم إنشاء نقطة استعادة سحابية نقية تلقائياً وفق الجدولة (كل ${intervalHours} ساعات). تم تطهير وحفظ البيانات بسحابة Firestore.`,
            timestamp: new Date().toISOString().substring(0, 16).replace('T', ' ')
          };
          setAuditLogs(prev => [newLog, ...prev]);
          syncAuditLogToCloud(newLog);
          console.log(`[Auto-Snapshot Scheduler] Saved snapshot: ${res.name}`);
        }
      }
    };

    // Check on mount or settings change after short delay
    const initTimer = setTimeout(checkAndTriggerSnapshot, 5000);

    // Periodic check every 60 seconds
    const intervalTimer = setInterval(checkAndTriggerSnapshot, 60000);

    return () => {
      clearTimeout(initTimer);
      clearInterval(intervalTimer);
    };
  }, [
    settings, subscribers, readings, payments, users, auditLogs, inventory,
    inventoryTransactions, treasuryTransfers, expenses, purchases,
    manualJournalEntries, employees, employeeTxs, connections, techRequests, currentUser
  ]);

  // --- SYNCED UPDATERS ---
  const handleUpdateSubscribers = async (newSubs: Subscriber[]) => {
    const cleanSubs = deduplicateSubscribers(newSubs);
    // Immediate UI update & Local Storage cache update for instant page refresh preservation
    setSubscribers(cleanSubs);
    setLocalData('voltera_subscribers', cleanSubs);
    updateCachedCloudSubscribers(cleanSubs);

    try {
      // 1. Identify truly deleted subscribers
      const deleted = subscribers.filter(oldS => 
        !newSubs.some(newS => newS.id === oldS.id || (newS.meterNumber && oldS.meterNumber && newS.meterNumber.trim().toLowerCase() === oldS.meterNumber.trim().toLowerCase()))
      );
      for (const sub of deleted) {
        await deleteSubscriberFromCloud(sub.id);
      }

      // 2. Identify added or changed subscribers
      const changed = newSubs.filter(newS => {
        const currentS = subscribers.find(s => s.id === newS.id || (s.meterNumber && newS.meterNumber && s.meterNumber.trim().toLowerCase() === newS.meterNumber.trim().toLowerCase()));
        return !currentS || JSON.stringify(currentS) !== JSON.stringify(newS);
      });

      for (const sub of changed) {
        await syncSubscriberToCloud(sub);
      }
    } catch (err) {
      console.error("Error syncing subscribers to Firebase:", err);
    }
  };

  const handleUpdateUsers = async (newUsers: User[]) => {
    setUsers(newUsers);
    localStorage.setItem('voltera_cache_users', JSON.stringify(newUsers));

    // Update current user if self was edited
    if (currentUser) {
      const updatedSelf = newUsers.find(u => u.id === currentUser.id);
      if (updatedSelf) {
        setCurrentUser(updatedSelf);
        localStorage.setItem('voltera_logged_user', JSON.stringify(updatedSelf));
      }
    }

    try {
      const deleted = users.filter(u => !newUsers.some(newU => newU.id === u.id || newU.username === u.username));
      for (const u of deleted) {
        await deleteUserFromCloud(u.id);
      }

      await syncBulkUsersToCloud(newUsers);
    } catch (err) {
      console.error("Error syncing users to Firestore Database:", err);
    }
  };

  const handleUpdateReadings = async (newReadings: MeterReading[]) => {
    const prevReadings = readings;
    setReadings(newReadings);

    // Auto update subscriber balances
    const updatedSubs = subscribers.map(sub => {
      const exactBal = getExactSubscriberBalance(sub, newReadings, payments);
      if (Math.abs((sub.currentBalance || 0) - exactBal) > 0.01) {
        return { ...sub, currentBalance: exactBal };
      }
      return sub;
    });

    const changedSubs = updatedSubs.filter((s, idx) => s !== subscribers[idx]);
    if (changedSubs.length > 0) {
      setSubscribers(updatedSubs);
      for (const sub of changedSubs) {
        syncSubscriberToCloud(sub);
      }
    }

    try {
      const deleted = prevReadings.filter(oldR => !newReadings.some(nR => nR.id === oldR.id));
      for (const d of deleted) {
        await deleteReadingFromCloud(d.id);
      }

      const changed = newReadings.filter(newR => {
        const currentR = prevReadings.find(r => r.id === newR.id);
        return !currentR || JSON.stringify(currentR) !== JSON.stringify(newR);
      });

      if (changed.length > 5) {
        await syncBulkReadingsToCloud(changed);
      } else {
        for (const rd of changed) {
          await syncReadingToCloud(rd);
        }
      }
    } catch (err) {
      console.error("Error syncing readings to Firestore:", err);
    }
  };

  const handleUpdatePayments = async (newPayments: Payment[]) => {
    const prevPayments = payments;
    setPayments(newPayments);

    // Auto update subscriber balances
    const updatedSubs = subscribers.map(sub => {
      const exactBal = getExactSubscriberBalance(sub, readings, newPayments);
      if (Math.abs((sub.currentBalance || 0) - exactBal) > 0.01) {
        return { ...sub, currentBalance: exactBal };
      }
      return sub;
    });

    const changedSubs = updatedSubs.filter((s, idx) => s !== subscribers[idx]);
    if (changedSubs.length > 0) {
      setSubscribers(updatedSubs);
      for (const sub of changedSubs) {
        syncSubscriberToCloud(sub);
      }
    }

    try {
      const deleted = prevPayments.filter(oldP => !newPayments.some(nP => nP.id === oldP.id));
      for (const d of deleted) {
        await deletePaymentFromCloud(d.id);
      }

      const changed = newPayments.filter(newP => {
        const currentP = prevPayments.find(p => p.id === newP.id);
        return !currentP || JSON.stringify(currentP) !== JSON.stringify(newP);
      });

      if (changed.length > 5) {
        await syncBulkPaymentsToCloud(changed);
      } else {
        for (const pay of changed) {
          await syncPaymentToCloud(pay);
        }
      }
    } catch (err) {
      console.error("Error syncing payments to Firestore:", err);
    }
  };

  const handleUpdateSettings = async (newSettings: SystemSettings) => {
    let settingsToSave = { ...newSettings };
    if (settingsToSave.logoUrl && settingsToSave.logoUrl.startsWith('data:image') && settingsToSave.logoUrl.length > 150000) {
      settingsToSave.logoUrl = await compressBase64Image(settingsToSave.logoUrl, 250, 250, 0.85);
    }
    setSettings(settingsToSave);
    try {
      await syncSettingsToCloud(settingsToSave);
    } catch (err) {
      console.error("Error syncing settings to Firestore:", err);
    }
  };

  const handleUpdateTreasuryTransfers = async (newTrfs: TreasuryTransfer[]) => {
    setTreasuryTransfers(newTrfs);
    try {
      const changed = newTrfs.filter(nT => !treasuryTransfers.some(oT => oT.id === nT.id && JSON.stringify(oT) === JSON.stringify(nT)));
      for (const t of changed) { await syncTreasuryTransferToCloud(t); }
      const deleted = treasuryTransfers.filter(oT => !newTrfs.some(nT => nT.id === oT.id));
      for (const d of deleted) { await deleteTreasuryTransferFromCloud(d.id); }
    } catch (e) {
      console.error("Error syncing treasury transfers to Firestore:", e);
    }
  };

  const handleUpdateExpenses = async (newExps: Expense[]) => {
    setExpenses(newExps);
    try {
      const changed = newExps.filter(nE => !expenses.some(oE => oE.id === nE.id && JSON.stringify(oE) === JSON.stringify(nE)));
      for (const e of changed) { await syncExpenseToCloud(e); }
      const deleted = expenses.filter(oE => !newExps.some(nE => nE.id === oE.id));
      for (const d of deleted) { await deleteExpenseFromCloud(d.id); }
    } catch (e) {
      console.error("Error syncing expenses to Firestore:", e);
    }
  };

  const handleUpdatePurchases = async (newPurs: Purchase[]) => {
    setPurchases(newPurs);
    try {
      const changed = newPurs.filter(nP => !purchases.some(oP => oP.id === nP.id && JSON.stringify(oP) === JSON.stringify(nP)));
      for (const p of changed) { await syncPurchaseToCloud(p); }
      const deleted = purchases.filter(oP => !newPurs.some(nP => nP.id === oP.id));
      for (const d of deleted) { await deletePurchaseFromCloud(d.id); }
    } catch (e) {
      console.error("Error syncing purchases to Firestore:", e);
    }
  };

  const handleUpdateJournalEntries = async (newJes: JournalEntry[]) => {
    setManualJournalEntries(newJes);
    try {
      const changed = newJes.filter(nJ => !manualJournalEntries.some(oJ => oJ.id === nJ.id && JSON.stringify(oJ) === JSON.stringify(nJ)));
      for (const j of changed) { await syncJournalEntryToCloud(j); }
      const deleted = manualJournalEntries.filter(oJ => !newJes.some(nJ => nJ.id === oJ.id));
      for (const d of deleted) { await deleteJournalEntryFromCloud(d.id); }
    } catch (e) {
      console.error("Error syncing journal entries to Firestore:", e);
    }
  };

  const handleUpdateEmployees = async (newEmps: Employee[]) => {
    setEmployees(newEmps);
    try {
      const changed = newEmps.filter(nE => !employees.some(oE => oE.id === nE.id && JSON.stringify(oE) === JSON.stringify(nE)));
      for (const emp of changed) { await syncEmployeeToCloud(emp); }
      const deleted = employees.filter(oE => !newEmps.some(nE => nE.id === oE.id));
      for (const d of deleted) { await deleteEmployeeFromCloud(d.id); }
    } catch (e) {
      console.error("Error syncing employees to Firestore:", e);
    }
  };

  const handleUpdateEmployeeTxs = async (newTxs: EmployeeTransaction[]) => {
    setEmployeeTxs(newTxs);
    try {
      const changed = newTxs.filter(nT => !employeeTxs.some(oT => oT.id === nT.id && JSON.stringify(oT) === JSON.stringify(nT)));
      for (const tx of changed) { await syncEmployeeTxToCloud(tx); }
      const deleted = employeeTxs.filter(oT => !newTxs.some(nT => nT.id === oT.id));
      for (const d of deleted) { await deleteEmployeeTxFromCloud(d.id); }
    } catch (e) {
      console.error("Error syncing employee transactions to Firestore:", e);
    }
  };

  const handleUpdateConnections = async (newConns: ServiceConnection[]) => {
    setConnections(newConns);
    try {
      const changed = newConns.filter(nC => !connections.some(oC => oC.id === nC.id && JSON.stringify(oC) === JSON.stringify(nC)));
      for (const c of changed) { await syncConnectionToCloud(c); }
      const deleted = connections.filter(oC => !newConns.some(nC => nC.id === oC.id));
      for (const d of deleted) { await deleteConnectionFromCloud(d.id); }
    } catch (e) {
      console.error("Error syncing connections to Firestore:", e);
    }
  };

  const handleUpdateTechRequests = async (newTrqs: TechnicalRequest[]) => {
    setTechRequests(newTrqs);
    try {
      const changed = newTrqs.filter(nT => !techRequests.some(oT => oT.id === nT.id && JSON.stringify(oT) === JSON.stringify(nT)));
      for (const trq of changed) { await syncTechRequestToCloud(trq); }
      const deleted = techRequests.filter(oT => !newTrqs.some(nT => nT.id === oT.id));
      for (const d of deleted) { await deleteTechRequestFromCloud(d.id); }
    } catch (e) {
      console.error("Error syncing tech requests to Firestore:", e);
    }
  };

  const handleUpdateInventory = async (newInvs: InventoryItem[]) => {
    setInventory(newInvs);
    setLocalData('voltera_firestore_inventory', newInvs);
    try {
      const cachedStr = localStorage.getItem('voltera_cached_cloud_data');
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        cached.inventory = newInvs;
        localStorage.setItem('voltera_cached_cloud_data', JSON.stringify(cached));
      }
    } catch (e) {
      console.warn("Error updating cached inventory:", e);
    }
    try {
      const changed = newInvs.filter(nI => !inventory.some(oI => oI.id === nI.id && JSON.stringify(oI) === JSON.stringify(nI)));
      if (changed.length > 5) {
        await syncBulkInventoryToCloud(changed);
      } else {
        for (const inv of changed) { await syncInventoryItemToCloud(inv); }
      }
      const deleted = inventory.filter(oI => !newInvs.some(nI => nI.id === oI.id));
      for (const d of deleted) { await deleteInventoryItemFromCloud(d.id); }
    } catch (e) {
      console.error("Error syncing inventory items catalog to Firestore:", e);
    }
  };

  const handleUpdateInventoryTransactions = async (newTxs: InventoryTransaction[]) => {
    setInventoryTransactions(newTxs);
    setLocalData('voltera_firestore_inventory_txs', newTxs);
    try {
      const cachedStr = localStorage.getItem('voltera_cached_cloud_data');
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        cached.inventoryTransactions = newTxs;
        localStorage.setItem('voltera_cached_cloud_data', JSON.stringify(cached));
      }
    } catch (e) {
      console.warn("Error updating cached inventoryTransactions:", e);
    }
    try {
      const changed = newTxs.filter(nT => !inventoryTransactions.some(oT => oT.id === nT.id && JSON.stringify(oT) === JSON.stringify(nT)));
      if (changed.length > 5) {
        await syncBulkInventoryTxsToCloud(changed);
      } else {
        for (const tx of changed) { await syncInventoryTxToCloud(tx); }
      }
      const deleted = inventoryTransactions.filter(oT => !newTxs.some(nT => nT.id === oT.id));
      for (const d of deleted) { await deleteInventoryTxFromCloud(d.id); }
    } catch (e) {
      console.error("Error syncing inventory transactions to Firestore:", e);
    }
  };

  const handleUpdateSmsTemplates = async (newTemplates: SmsTemplate[]) => {
    setSmsTemplates(newTemplates);
    setLocalData('voltera_firestore_sms_templates', newTemplates);
    try {
      const cachedStr = localStorage.getItem('voltera_cached_cloud_data');
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        cached.smsTemplates = newTemplates;
        localStorage.setItem('voltera_cached_cloud_data', JSON.stringify(cached));
      }
    } catch (e) {
      console.warn("Error updating cached smsTemplates:", e);
    }
    try {
      await syncBulkSmsTemplatesToCloud(newTemplates);
      const deleted = smsTemplates.filter(oT => !newTemplates.some(nT => nT.id === oT.id));
      for (const d of deleted) {
        await deleteSmsTemplateFromCloud(d.id);
      }
    } catch (e) {
      console.error("Error syncing SMS templates to Firestore:", e);
    }
  };

  const handleSaveSmsTemplate = async (template: SmsTemplate) => {
    let updatedList: SmsTemplate[] = [];
    setSmsTemplates(prev => {
      const exists = prev.some(t => t.id === template.id);
      updatedList = exists ? prev.map(t => t.id === template.id ? template : t) : [...prev, template];
      return updatedList;
    });
    setLocalData('voltera_firestore_sms_templates', updatedList);
    try {
      const cachedStr = localStorage.getItem('voltera_cached_cloud_data');
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        cached.smsTemplates = updatedList;
        localStorage.setItem('voltera_cached_cloud_data', JSON.stringify(cached));
      }
    } catch (e) {
      console.warn("Error updating cached smsTemplates:", e);
    }
    try {
      await syncSmsTemplateToCloud(template);
    } catch (e) {
      console.error("Error saving SMS template to Firestore:", e);
    }
  };

  const handleDeleteSmsTemplate = async (templateId: string) => {
    let updatedList: SmsTemplate[] = [];
    setSmsTemplates(prev => {
      updatedList = prev.filter(t => t.id !== templateId);
      return updatedList;
    });
    setLocalData('voltera_firestore_sms_templates', updatedList);
    try {
      const cachedStr = localStorage.getItem('voltera_cached_cloud_data');
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        cached.smsTemplates = updatedList;
        localStorage.setItem('voltera_cached_cloud_data', JSON.stringify(cached));
      }
    } catch (e) {
      console.warn("Error updating cached smsTemplates:", e);
    }
    try {
      await deleteSmsTemplateFromCloud(templateId);
    } catch (e) {
      console.error("Error deleting SMS template from Firestore:", e);
    }
  };

  const handleClearAllSmsTemplates = async () => {
    setSmsTemplates([]);
    setLocalData('voltera_firestore_sms_templates', []);
    try {
      const cachedStr = localStorage.getItem('voltera_cached_cloud_data');
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        cached.smsTemplates = [];
        localStorage.setItem('voltera_cached_cloud_data', JSON.stringify(cached));
      }
    } catch (e) {
      console.warn("Error clearing cached smsTemplates:", e);
    }
    try {
      await clearAllSmsTemplatesFromCloud();
    } catch (e) {
      console.error("Error clearing SMS templates in Firestore:", e);
    }
  };

  const syncPendingData = async () => {
    if (!navigator.onLine || isSyncing) return;
    
    const saved = localStorage.getItem('voltera_pending_sync');
    const queue = saved ? JSON.parse(saved) : pendingSync;
    
    if (queue.readings.length === 0 && queue.payments.length === 0 && queue.auditLogs.length === 0) {
      return;
    }

    setIsSyncing(true);
    setSyncMessage('جاري مزامنة البيانات المعلقة مع السحابة...');
    
    try {
      // 1. Sync readings
      const remainingReadings = [...queue.readings];
      for (const rd of queue.readings) {
        try {
          await syncReadingToCloud(rd);
          const idx = remainingReadings.findIndex(r => r.id === rd.id);
          if (idx > -1) remainingReadings.splice(idx, 1);
        } catch (e) {
          console.error("Error syncing reading", rd.id, e);
          break; // Stop if network error occurs
        }
      }

      // 2. Sync payments
      const remainingPayments = [...queue.payments];
      for (const pay of queue.payments) {
        try {
          await syncPaymentToCloud(pay);
          const idx = remainingPayments.findIndex(p => p.id === pay.id);
          if (idx > -1) remainingPayments.splice(idx, 1);
        } catch (e) {
          console.error("Error syncing payment", pay.id, e);
          break;
        }
      }

      // 3. Sync audit logs
      const remainingLogs = [...queue.auditLogs];
      for (const log of queue.auditLogs) {
        try {
          await syncAuditLogToCloud(log);
          const idx = remainingLogs.findIndex(l => l.id === log.id);
          if (idx > -1) remainingLogs.splice(idx, 1);
        } catch (e) {
          console.error("Error syncing audit log", log.id, e);
          break;
        }
      }

      // Update pending sync state
      const updatedQueue = {
        readings: remainingReadings,
        payments: remainingPayments,
        auditLogs: remainingLogs
      };
      setPendingSync(updatedQueue);
      
      if (updatedQueue.readings.length === 0 && updatedQueue.payments.length === 0 && updatedQueue.auditLogs.length === 0) {
        setSyncMessage('تمت مزامنة جميع البيانات بنجاح!');
        setTimeout(() => setSyncMessage(null), 3000);
      } else {
        setSyncMessage('تمت مزامنة بعض البيانات، وبقيت بعض العمليات معلقة.');
      }
    } catch (err) {
      console.error("Failed to complete sync:", err);
      setSyncMessage('فشلت المزامنة التلقائية. سيتم المحاولة لاحقاً.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Automatically sync when online status is restored
  useEffect(() => {
    if (isOnline) {
      syncPendingData();
    }
  }, [isOnline]);

  const handleAddReading = async (newReading: MeterReading) => {
    // 1. Update readings local state
    setReadings(prev => [newReading, ...prev]);

    // 2. Update subscriber state locally (reading & balance)
    setSubscribers(prevSubs => prevSubs.map(sub => {
      if (sub.id === newReading.subscriberId) {
        return {
          ...sub,
          currentReading: newReading.currentReading,
          currentBalance: sub.currentBalance + newReading.totalAmount
        };
      }
      return sub;
    }));

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      userId: currentUser?.id || 'sys',
      username: currentUser?.username || 'collector',
      action: 'إدخل قراءة عداد',
      details: `إدخال قراءة للعداد ${newReading.meterNumber} للمشترك ${newReading.subscriberName}. القراءة: ${newReading.currentReading}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setAuditLogs(prev => [newLog, ...prev]);

    // 3. Try to sync or queue
    if (navigator.onLine) {
      try {
        await syncReadingToCloud(newReading);
        await syncAuditLogToCloud(newLog);

        const updatedSub = subscribers.find(s => s.id === newReading.subscriberId);
        if (updatedSub) {
          await syncSubscriberToCloud({
            ...updatedSub,
            currentReading: newReading.currentReading,
            currentBalance: updatedSub.currentBalance + newReading.totalAmount
          });
        }

        // If SMS was not sent immediately, store in failedSms collection in database
        if (!newReading.smsSent) {
          const failedItem: FailedSmsItem = {
            id: newReading.id,
            type: 'reading',
            referenceId: newReading.id,
            subscriberId: newReading.subscriberId,
            subscriberName: newReading.subscriberName,
            meterNumber: newReading.meterNumber,
            phone: updatedSub?.phone || '',
            amount: newReading.totalAmount,
            messageText: `فاتورة استهلاك: ${newReading.totalAmount} ${settings.currency}`,
            createdAt: newReading.readingDate,
            status: 'pending'
          };
          setFailedSms(prev => [failedItem, ...prev.filter(f => f.id !== failedItem.id)]);
          await syncFailedSmsToCloud(failedItem);
        }
      } catch (err) {
        console.error("Failed online sync, queueing instead:", err);
        setPendingSync(prev => ({
          ...prev,
          readings: [...prev.readings, newReading],
          auditLogs: [...prev.auditLogs, newLog]
        }));
      }
    } else {
      setPendingSync(prev => ({
        ...prev,
        readings: [...prev.readings, newReading],
        auditLogs: [...prev.auditLogs, newLog]
      }));
    }
  };

  const handleAddPayment = async (newPayment: Payment) => {
    // 1. Update payments local state
    setPayments(prev => [newPayment, ...prev]);

    // 2. Update subscriber balance locally
    setSubscribers(prevSubs => prevSubs.map(sub => {
      if (sub.id === newPayment.subscriberId) {
        return {
          ...sub,
          currentBalance: sub.currentBalance - newPayment.amountPaid
        };
      }
      return sub;
    }));

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      userId: currentUser?.id || 'sys',
      username: currentUser?.username || 'collector',
      action: 'تحصيل مبلغ مالي',
      details: `تحصيل مبلغ ${newPayment.amountPaid} ${settings.currency} من المشترك ${newPayment.subscriberName} سند رقم ${newPayment.receiptNumber}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setAuditLogs(prev => [newLog, ...prev]);

    // 3. Try to sync or queue
    if (navigator.onLine) {
      try {
        await syncPaymentToCloud(newPayment);
        await syncAuditLogToCloud(newLog);

        const updatedSub = subscribers.find(s => s.id === newPayment.subscriberId);
        if (updatedSub) {
          await syncSubscriberToCloud({
            ...updatedSub,
            currentBalance: updatedSub.currentBalance - newPayment.amountPaid
          });
        }

        // If SMS was not sent immediately, store in failedSms collection in database
        if (!newPayment.smsSent) {
          const failedItem: FailedSmsItem = {
            id: newPayment.id,
            type: 'payment',
            referenceId: newPayment.id,
            subscriberId: newPayment.subscriberId,
            subscriberName: newPayment.subscriberName,
            receiptNumber: newPayment.receiptNumber,
            phone: updatedSub?.phone || '',
            amount: newPayment.amountPaid,
            messageText: `سند سداد: ${newPayment.amountPaid} ${settings.currency}`,
            createdAt: newPayment.paymentDate,
            status: 'pending'
          };
          setFailedSms(prev => [failedItem, ...prev.filter(f => f.id !== failedItem.id)]);
          await syncFailedSmsToCloud(failedItem);
        }
      } catch (err) {
        console.error("Failed online payment sync, queueing instead:", err);
        setPendingSync(prev => ({
          ...prev,
          payments: [...prev.payments, newPayment],
          auditLogs: [...prev.auditLogs, newLog]
        }));
      }
    } else {
      setPendingSync(prev => ({
        ...prev,
        payments: [...prev.payments, newPayment],
        auditLogs: [...prev.auditLogs, newLog]
      }));
    }
  };

  const handleDeleteReading = async (readingId: string) => {
    const readingToDelete = readings.find(r => r.id === readingId);
    if (!readingToDelete) return;

    // 1. Update readings local state
    setReadings(prev => prev.filter(r => r.id !== readingId));

    // 2. Update subscriber state locally
    setSubscribers(prevSubs => prevSubs.map(sub => {
      if (sub.id === readingToDelete.subscriberId) {
        return {
          ...sub,
          currentReading: readingToDelete.previousReading,
          currentBalance: sub.currentBalance - readingToDelete.totalAmount
        };
      }
      return sub;
    }));

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      userId: currentUser?.id || 'sys',
      username: currentUser?.username || 'collector',
      action: 'حذف قراءة عداد',
      details: `حذف قراءة العداد ${readingToDelete.meterNumber} للمشترك ${readingToDelete.subscriberName}. القراءة المحذوفة: ${readingToDelete.currentReading}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setAuditLogs(prev => [newLog, ...prev]);

    // Remove from pending sync if it was there
    const wasPending = pendingSync.readings.some(r => r.id === readingId);
    if (wasPending) {
      setPendingSync(prev => ({
        ...prev,
        readings: prev.readings.filter(r => r.id !== readingId)
      }));
    }

    // Try cloud sync deletion
    if (navigator.onLine) {
      try {
        await deleteReadingFromCloud(readingId);
        await syncAuditLogToCloud(newLog);

        const updatedSub = subscribers.find(s => s.id === readingToDelete.subscriberId);
        if (updatedSub) {
          await syncSubscriberToCloud({
            ...updatedSub,
            currentReading: readingToDelete.previousReading,
            currentBalance: updatedSub.currentBalance - readingToDelete.totalAmount
          });
        }
      } catch (err) {
        console.error("Failed online delete sync:", err);
      }
    }
  };

  const handleEditReading = async (updatedReading: MeterReading) => {
    const originalReading = readings.find(r => r.id === updatedReading.id);
    if (!originalReading) return;

    const amountDifference = updatedReading.totalAmount - originalReading.totalAmount;

    // 1. Update readings local state
    setReadings(prev => prev.map(r => r.id === updatedReading.id ? updatedReading : r));

    // 2. Update subscriber state locally
    setSubscribers(prevSubs => prevSubs.map(sub => {
      if (sub.id === updatedReading.subscriberId) {
        return {
          ...sub,
          currentReading: updatedReading.currentReading,
          currentBalance: sub.currentBalance + amountDifference
        };
      }
      return sub;
    }));

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      userId: currentUser?.id || 'sys',
      username: currentUser?.username || 'collector',
      action: 'تعديل قراءة عداد',
      details: `تعديل قراءة العداد ${updatedReading.meterNumber} للمشترك ${updatedReading.subscriberName}. من ${originalReading.currentReading} إلى ${updatedReading.currentReading}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setAuditLogs(prev => [newLog, ...prev]);

    // Update pending sync if it was there, or add to pending sync if offline
    const wasPending = pendingSync.readings.some(r => r.id === updatedReading.id);
    if (wasPending) {
      setPendingSync(prev => ({
        ...prev,
        readings: prev.readings.map(r => r.id === updatedReading.id ? updatedReading : r)
      }));
    }

    if (navigator.onLine) {
      try {
        await syncReadingToCloud(updatedReading);
        await syncAuditLogToCloud(newLog);

        const updatedSub = subscribers.find(s => s.id === updatedReading.subscriberId);
        if (updatedSub) {
          await syncSubscriberToCloud({
            ...updatedSub,
            currentReading: updatedReading.currentReading,
            currentBalance: updatedSub.currentBalance + amountDifference
          });
        }
      } catch (err) {
        console.error("Failed online edit sync, queueing instead:", err);
        if (!wasPending) {
          setPendingSync(prev => ({
            ...prev,
            readings: [...prev.readings, updatedReading]
          }));
        }
      }
    } else {
      if (!wasPending) {
        setPendingSync(prev => ({
          ...prev,
          readings: [...prev.readings, updatedReading]
        }));
      }
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    const paymentToDelete = payments.find(p => p.id === paymentId);
    if (!paymentToDelete) return;

    // 1. Update payments local state
    setPayments(prev => prev.filter(p => p.id !== paymentId));

    // 2. Update subscriber balance locally
    setSubscribers(prevSubs => prevSubs.map(sub => {
      if (sub.id === paymentToDelete.subscriberId) {
        return {
          ...sub,
          currentBalance: sub.currentBalance + paymentToDelete.amountPaid
        };
      }
      return sub;
    }));

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      userId: currentUser?.id || 'sys',
      username: currentUser?.username || 'collector',
      action: 'حذف سند قبض',
      details: `حذف سند القبض رقم ${paymentToDelete.receiptNumber} للمشترك ${paymentToDelete.subscriberName}. المبلغ المحذوف: ${paymentToDelete.amountPaid}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setAuditLogs(prev => [newLog, ...prev]);

    // Remove from pending sync if it was there
    const wasPending = pendingSync.payments.some(p => p.id === paymentId);
    if (wasPending) {
      setPendingSync(prev => ({
        ...prev,
        payments: prev.payments.filter(p => p.id !== paymentId)
      }));
    }

    // Try cloud sync deletion
    if (navigator.onLine) {
      try {
        await deletePaymentFromCloud(paymentId);
        await syncAuditLogToCloud(newLog);

        const updatedSub = subscribers.find(s => s.id === paymentToDelete.subscriberId);
        if (updatedSub) {
          await syncSubscriberToCloud({
            ...updatedSub,
            currentBalance: updatedSub.currentBalance + paymentToDelete.amountPaid
          });
        }
      } catch (err) {
        console.error("Failed online delete sync:", err);
      }
    }
  };

  const handleEditPayment = async (updatedPayment: Payment) => {
    const originalPayment = payments.find(p => p.id === updatedPayment.id);
    if (!originalPayment) return;

    const amountDifference = originalPayment.amountPaid - updatedPayment.amountPaid;

    // 1. Update payments local state
    setPayments(prev => prev.map(p => p.id === updatedPayment.id ? updatedPayment : p));

    // 2. Update subscriber balance locally
    setSubscribers(prevSubs => prevSubs.map(sub => {
      if (sub.id === updatedPayment.subscriberId) {
        return {
          ...sub,
          currentBalance: sub.currentBalance + amountDifference
        };
      }
      return sub;
    }));

    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      userId: currentUser?.id || 'sys',
      username: currentUser?.username || 'collector',
      action: 'تعديل سند قبض',
      details: `تعديل سند القبض رقم ${updatedPayment.receiptNumber} للمشترك ${updatedPayment.subscriberName}. من ${originalPayment.amountPaid} إلى ${updatedPayment.amountPaid}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setAuditLogs(prev => [newLog, ...prev]);

    // Update pending sync if it was there, or add to pending sync if offline
    const wasPending = pendingSync.payments.some(p => p.id === updatedPayment.id);
    if (wasPending) {
      setPendingSync(prev => ({
        ...prev,
        payments: prev.payments.map(p => p.id === updatedPayment.id ? updatedPayment : p)
      }));
    }

    if (navigator.onLine) {
      try {
        await syncPaymentToCloud(updatedPayment);
        await syncAuditLogToCloud(newLog);

        const updatedSub = subscribers.find(s => s.id === updatedPayment.subscriberId);
        if (updatedSub) {
          await syncSubscriberToCloud({
            ...updatedSub,
            currentBalance: updatedSub.currentBalance + amountDifference
          });
        }
      } catch (err) {
        console.error("Failed online edit sync, queueing instead:", err);
        if (!wasPending) {
          setPendingSync(prev => ({
            ...prev,
            payments: [...prev.payments, updatedPayment]
          }));
        }
      }
    } else {
      if (!wasPending) {
        setPendingSync(prev => ({
          ...prev,
          payments: [...prev.payments, updatedPayment]
        }));
      }
    }
  };

  const handleAddAuditLog = async (logOrAction: any, maybeDetails?: string) => {
    let sanitizedLog: AuditLog;
    if (typeof logOrAction === 'string') {
      sanitizedLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId: currentUser?.id || 'admin',
        username: currentUser?.name || currentUser?.username || 'admin',
        action: logOrAction,
        details: maybeDetails || '',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
      };
    } else if (logOrAction && typeof logOrAction === 'object') {
      sanitizedLog = {
        ...logOrAction,
        id: (logOrAction.id && typeof logOrAction.id === 'string' && logOrAction.id.trim() !== '' && logOrAction.id !== 'undefined')
          ? logOrAction.id
          : `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId: logOrAction.userId || currentUser?.id || 'admin',
        username: logOrAction.username || currentUser?.name || currentUser?.username || 'admin',
        action: logOrAction.action || 'إجراء نظام',
        details: logOrAction.details || maybeDetails || '',
        timestamp: logOrAction.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 16)
      };
    } else {
      sanitizedLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId: currentUser?.id || 'admin',
        username: currentUser?.name || currentUser?.username || 'admin',
        action: 'إجراء نظام',
        details: maybeDetails || '',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
      };
    }
    setAuditLogs(prev => [sanitizedLog, ...prev]);
    try {
      await syncAuditLogToCloud(sanitizedLog);
    } catch (err) {
      console.warn("Could not sync audit log to cloud:", err);
    }
  };

  const handleClearAuditLogs = async () => {
    const idsToDelete = auditLogs.map(l => l.id);
    setAuditLogs([]);
    localStorage.setItem('voltera_cache_auditLogs', JSON.stringify([]));
    try {
      await clearAuditLogsFromCloud();
    } catch (err) {
      console.error("Error clearing audit logs from cloud:", err);
    }
  };

  const handleLoginSuccess = async (user: User) => {
    setCurrentUser(user);
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      userId: user.id,
      username: user.username,
      action: 'تسجيل دخول ناجح',
      details: `تسجيل دخول إلى النظام بصلاحية ${user.role}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setAuditLogs(prev => [newLog, ...prev]);
    try {
      await syncAuditLogToCloud(newLog);
    } catch (err) {
      console.error("Error syncing login log:", err);
    }
  };

  const handleLogout = async () => {
    if (currentUser) {
      const newLog: AuditLog = {
        id: `log-${Date.now()}`,
        userId: currentUser.id,
        username: currentUser.username,
        action: 'تسجيل خروج',
        details: 'تسجيل خروج آمن من النظام',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
      };
      setAuditLogs(prev => [newLog, ...prev]);
      try {
        await syncAuditLogToCloud(newLog);
      } catch (err) {
        console.error("Error syncing logout log:", err);
      }
    }
    setCurrentUser(null);
  };

  const handleResetDatabase = async () => {
    setCloudLoading(true);
    try {
      await seedFirestore();
      const data = await loadAllCloudData();
      setUsers(data.users);
      setSubscribers(data.subscribers);
      setReadings(data.readings);
      setPayments(data.payments);
      setSettings(data.settings);
      setAuditLogs(data.auditLogs);
      setCurrentUser(null);
      localStorage.removeItem('voltera_logged_user');
    } catch (e) {
      console.error("Error resetting cloud database:", e);
    } finally {
      setCloudLoading(false);
    }
  };

  const handleWipeAllDataForNewStart = async () => {
    setCloudLoading(true);
    try {
      setSubscribers([]);
      setReadings([]);
      setPayments([]);
      setExpenses([]);
      setPurchases([]);
      setTreasuryTransfers([]);
      setManualJournalEntries([]);
      setEmployees([]);
      setEmployeeTxs([]);
      setConnections([]);
      setTechRequests([]);
      setInventory([]);
      setInventoryTransactions([]);
      setAuditLogs([]);
      setFailedSms([]);

      localStorage.removeItem('voltera_cache_subscribers');
      localStorage.removeItem('voltera_cache_readings');
      localStorage.removeItem('voltera_cache_payments');
      localStorage.removeItem('voltera_cache_auditLogs');
      localStorage.removeItem('voltera_cache_failedSms');
      localStorage.removeItem('voltera_db_snapshots');
      localStorage.removeItem('voltera_treasuryTransfers');
      localStorage.removeItem('voltera_expenses');
      localStorage.removeItem('voltera_purchases');
      localStorage.removeItem('voltera_manualJournalEntries');
      localStorage.removeItem('voltera_employees');
      localStorage.removeItem('voltera_employeeTxs');
      localStorage.removeItem('voltera_connections');
      localStorage.removeItem('voltera_tech_requests');
      localStorage.removeItem('voltera_inventory');
      localStorage.removeItem('voltera_inventory_txs');
      localStorage.removeItem('voltera_pending_sync');

      await clearAllOperationalDataFromCloud();

      const wipeLog: AuditLog = {
        id: `log-${Date.now()}`,
        userId: currentUser?.id || 'admin',
        username: currentUser?.username || 'admin',
        action: 'تصفير شامل للنظام لبداية جديدة',
        details: 'إخلاء ومسح كافة بيانات المشتركين، القراءات، الفواتير والمخزون للبدء من الصفر.',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
      };
      setAuditLogs([wipeLog]);
      await syncAuditLogToCloud(wipeLog);
    } catch (e) {
      console.error("Error wiping database for clean start:", e);
    } finally {
      setCloudLoading(false);
    }
  };

  const handleDeleteFailedSms = async (id: string, type?: 'reading' | 'payment') => {
    // 1. Immediately update failedSms state
    setFailedSms(prev => prev.filter(f => f.id !== id && f.referenceId !== id));

    // 2. Mark reading as smsSent in React state & sync to Firestore
    const targetReading = readings.find(r => r.id === id);
    if (targetReading) {
      const updatedReading = { ...targetReading, smsSent: true };
      setReadings(prev => prev.map(r => r.id === id ? updatedReading : r));
      syncReadingToCloud(updatedReading).catch(err => console.error("Error updating reading smsSent to Firestore:", err));
    } else {
      setReadings(prev => prev.map(r => r.id === id ? { ...r, smsSent: true } : r));
    }

    // 3. Mark payment as smsSent in React state & sync to Firestore
    const targetPayment = payments.find(p => p.id === id);
    if (targetPayment) {
      const updatedPayment = { ...targetPayment, smsSent: true };
      setPayments(prev => prev.map(p => p.id === id ? updatedPayment : p));
      syncPaymentToCloud(updatedPayment).catch(err => console.error("Error updating payment smsSent to Firestore:", err));
    } else {
      setPayments(prev => prev.map(p => p.id === id ? { ...p, smsSent: true } : p));
    }

    // 4. Delete from Firestore failedSms collection and update document directly
    try {
      await deleteFailedSmsFromCloud(id, type);
    } catch (e) {
      console.error("Error deleting failed SMS from cloud:", e);
    }
  };

  const handleClearAllFailedSms = async () => {
    // 1. Immediately update all React states
    setFailedSms([]);
    const updatedReadings = readings.map(r => ({ ...r, smsSent: true }));
    const updatedPayments = payments.map(p => ({ ...p, smsSent: true }));
    setReadings(updatedReadings);
    setPayments(updatedPayments);

    // 2. Clear from Firestore database
    try {
      await clearAllFailedSmsFromCloud(failedSms);
    } catch (e) {
      console.error("Error clearing all failed SMS from cloud:", e);
    }
  };

  // --- LOADER VIEW ---
  if (cloudLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white font-sans text-center px-4">
        <div className="bg-slate-800 border border-slate-700 p-8 rounded-3xl shadow-xl max-w-md w-full flex flex-col items-center gap-6">
          <div className="relative">
            <Database className="w-16 h-16 text-amber-500 animate-pulse" />
            <Cloud className="w-8 h-8 text-cyan-400 absolute -top-2 -right-2 animate-bounce" />
          </div>
          <div>
            <h1 className="text-xl font-black mb-2 tracking-wide">نظام فولترا لإدارة محطات الكهرباء</h1>
            <p className="text-sm text-slate-400 font-medium">جاري الاتصال الآمن بقاعدة البيانات السحابية...</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-indigo-400 font-mono bg-slate-950 px-4 py-2 rounded-xl">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Firebase Cloud Firestore Active</span>
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW ROUTING ---
  if (!currentUser) {
    return (
      <Suspense fallback={<PageLoadingFallback />}>
        <Login users={users} settings={settings} onLoginSuccess={handleLoginSuccess} />
      </Suspense>
    );
  }

  if (currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'accountant' || currentUser.role === 'data_entry') {
    return (
      <div className="relative min-h-screen">
        {/* Top Indicator */}
        <div className="bg-emerald-700 text-white text-[10px] sm:text-xs py-1.5 px-4 flex items-center justify-center gap-2 font-bold select-none text-center">
          <Database className="w-4 h-4" />
          <span>قاعدة بيانات Firebase Cloud Firestore السحابية متصلة ونشطة بنجاح</span>
          <CheckCircle className="w-3.5 h-3.5 text-emerald-200" />
        </div>
        <Suspense fallback={<PageLoadingFallback />}>
          <AdminDashboard
            currentUser={currentUser}
            onLogout={handleLogout}
            subscribers={subscribers}
            readings={readings}
            payments={payments}
            settings={settings}
            inventory={inventory}
            inventoryTransactions={inventoryTransactions}
            onUpdateInventory={handleUpdateInventory}
            onUpdateInventoryTransactions={handleUpdateInventoryTransactions}
            treasuryTransfers={treasuryTransfers}
            onUpdateTreasuryTransfers={handleUpdateTreasuryTransfers}
            expenses={expenses}
            onUpdateExpenses={handleUpdateExpenses}
            purchases={purchases}
            onUpdatePurchases={handleUpdatePurchases}
            manualJournalEntries={manualJournalEntries}
            onUpdateManualJournalEntries={handleUpdateJournalEntries}
            employees={employees}
            onUpdateEmployees={handleUpdateEmployees}
            employeeTxs={employeeTxs}
            onUpdateEmployeeTxs={handleUpdateEmployeeTxs}
            connections={connections}
            onUpdateConnections={handleUpdateConnections}
            techRequests={techRequests}
            onUpdateTechRequests={handleUpdateTechRequests}
            auditLogs={auditLogs}
            users={users}
            smsTemplates={smsTemplates}
            onUpdateSmsTemplates={handleUpdateSmsTemplates}
            onSaveSmsTemplate={handleSaveSmsTemplate}
            onDeleteSmsTemplate={handleDeleteSmsTemplate}
            onClearAllSmsTemplates={handleClearAllSmsTemplates}
            onUpdateSubscribers={handleUpdateSubscribers}
            onUpdateReadings={handleUpdateReadings}
            onUpdatePayments={handleUpdatePayments}
            onUpdateSettings={handleUpdateSettings}
            onUpdateUsers={handleUpdateUsers}
            onAddAuditLog={handleAddAuditLog}
            onClearAuditLogs={handleClearAuditLogs}
            onResetDatabase={handleResetDatabase}
            onWipeAllData={handleWipeAllDataForNewStart}
            failedSms={failedSms}
            onDeleteFailedSms={handleDeleteFailedSms}
            onClearAllFailedSms={handleClearAllFailedSms}
            partners={partners}
            onUpdatePartners={(updated) => {
              setPartners(updated);
              setLocalData('voltera_firestore_partners', updated);
              syncBulkPartnersToCloud(updated);
            }}
            partnerTransactions={partnerTransactions}
            onUpdatePartnerTransactions={(updated) => {
              setPartnerTransactions(updated);
              setLocalData('voltera_firestore_partner_txs', updated);
              syncBulkPartnerTransactionsToCloud(updated);
            }}
            profitDistributions={profitDistributions}
            onUpdateProfitDistributions={(updated) => {
              setProfitDistributions(updated);
              setLocalData('voltera_firestore_profit_distributions', updated);
              syncBulkProfitDistributionsToCloud(updated);
            }}
          />
        </Suspense>
      </div>
    );
  }

  // Otherwise, collector dashboard
  return (
    <div className="relative min-h-screen">
      {/* Top Cloud Indicator */}
      <div className={`text-white text-[10px] sm:text-xs py-1.5 px-4 flex items-center justify-center gap-2 font-bold select-none text-center transition-all ${
        isOnline ? 'bg-emerald-600' : 'bg-rose-600 animate-pulse'
      }`}>
        <Cloud className="w-4 h-4" />
        <span>{isOnline ? 'وضع المزامنة السحابية الميدانية المباشرة نشط الآن' : 'أنت تعمل الآن في وضع عدم الاتصال بالشبكة (العمليات تحفظ محلياً)'}</span>
        <CheckCircle className="w-3.5 h-3.5 text-emerald-200" />
      </div>
      <Suspense fallback={<PageLoadingFallback />}>
        <CollectorDashboard
          currentUser={currentUser}
          onLogout={handleLogout}
          subscribers={subscribers}
          readings={readings}
          payments={payments}
          settings={settings}
          onAddReading={handleAddReading}
          onAddPayment={handleAddPayment}
          onDeleteReading={handleDeleteReading}
          onEditReading={handleEditReading}
          onDeletePayment={handleDeletePayment}
          onEditPayment={handleEditPayment}
          onUpdateSettings={handleUpdateSettings}
          onUpdateSubscribers={handleUpdateSubscribers}
          onAddAuditLog={handleAddAuditLog}
          isOnline={isOnline}
          pendingSyncCount={pendingSync.readings.length + pendingSync.payments.length}
          onSync={syncPendingData}
          isSyncing={isSyncing}
          techRequests={techRequests}
          onUpdateTechRequests={handleUpdateTechRequests}
          smsTemplates={smsTemplates}
          failedSms={failedSms}
          onDeleteFailedSms={handleDeleteFailedSms}
        />
      </Suspense>
    </div>
  );
}
