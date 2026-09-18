import { 
  User, Subscriber, MeterReading, Payment, SystemSettings, AuditLog, 
  Expense, Purchase, EmployeeTransaction, ServiceConnection, Employee, TechnicalRequest, InventoryItem, InventoryTransaction,
  SmsTemplate, FailedSmsItem, Partner, PartnerTransaction, ProfitDistributionBatch
} from '../types';
import { 
  DEFAULT_SETTINGS, INITIAL_USERS, INITIAL_SUBSCRIBERS, INITIAL_READINGS, INITIAL_PAYMENTS, INITIAL_AUDIT_LOGS, INITIAL_INVENTORY,
  INITIAL_SMS_TEMPLATES, INITIAL_PARTNERS, INITIAL_PARTNER_TRANSACTIONS, INITIAL_PROFIT_DISTRIBUTIONS
} from '../initialData';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot, writeBatch, query, limit 
} from 'firebase/firestore';

export interface JournalEntry {
  id: string;
  voucherNumber: string;
  date: string;
  type: 'receipt' | 'billing' | 'expense' | 'payroll' | 'purchase' | 'connection' | 'manual' | 'transfer';
  typeLabel: string;
  debitAccountCode: string;
  debitAccountName: string;
  creditAccountCode: string;
  creditAccountName: string;
  amount: number;
  description: string;
  recordedBy: string;
}

export interface TreasuryTransfer {
  id: string;
  transferNumber: string;
  date: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  notes: string;
  recordedBy: string;
}

export interface DbSnapshotItem {
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

// Deduplication and Data Sanitization Helpers
/**
 * Recursively cleans an object or array for Firestore:
 * - Omits keys with `undefined` values
 * - Cleans nested objects and arrays
 * - Returns a clean object safe for Firestore setDoc/updateDoc/batch.set
 */
export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data
      .filter(item => item !== undefined)
      .map(item => cleanForFirestore(item)) as any;
  }
  if (typeof data === 'object') {
    if (data instanceof Date) return data as any;
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        if (typeof value === 'object' && value !== null) {
          cleaned[key] = cleanForFirestore(value);
        } else {
          cleaned[key] = value;
        }
      }
    }
    return cleaned as T;
  }
  return data;
}

/**
 * Utility to compress large base64 images client-side before Firestore upload
 */
export async function compressBase64Image(
  base64Str: string,
  maxWidth: number = 250,
  maxHeight: number = 250,
  quality: number = 0.85
): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !base64Str || !base64Str.startsWith('data:image')) {
      return resolve(base64Str);
    }
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(base64Str);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64Str);
  });
}

export function deduplicateSubscribers(subs: Subscriber[]): Subscriber[] {
  if (!Array.isArray(subs)) return [];
  const seenIds = new Set<string>();
  const seenMeters = new Set<string>();
  const deduplicated: Subscriber[] = [];

  for (const sub of subs) {
    if (!sub) continue;
    const idKey = (sub.id || '').trim();
    const meterKey = (sub.meterNumber || '').trim().toLowerCase();

    if (idKey && seenIds.has(idKey)) continue;
    if (meterKey && seenMeters.has(meterKey)) continue;

    if (idKey) seenIds.add(idKey);
    if (meterKey) seenMeters.add(meterKey);

    deduplicated.push(sub);
  }

  return deduplicated;
}

export function deduplicateReadings(readings: MeterReading[]): MeterReading[] {
  if (!Array.isArray(readings)) return [];
  const seenIds = new Set<string>();
  const seenSignatures = new Set<string>();
  const deduplicated: MeterReading[] = [];

  for (const r of readings) {
    if (!r) continue;
    const idKey = (r.id || '').trim();
    // Unique signature based on subscriber, date, and reading value
    const sig = `${(r.subscriberId || '').trim()}_${(r.readingDate || '').trim()}_${Number(r.currentReading || 0)}`;

    if (idKey && seenIds.has(idKey)) continue;
    if (sig !== '__0' && seenSignatures.has(sig)) continue;

    if (idKey) seenIds.add(idKey);
    if (sig !== '__0') seenSignatures.add(sig);

    deduplicated.push(r);
  }

  return deduplicated;
}

export function deduplicatePayments(payments: Payment[]): Payment[] {
  if (!Array.isArray(payments)) return [];
  const seenIds = new Set<string>();
  const seenReceipts = new Set<string>();
  const seenSignatures = new Set<string>();
  const deduplicated: Payment[] = [];

  for (const p of payments) {
    if (!p) continue;
    const idKey = (p.id || '').trim();
    const receiptKey = (p.receiptNumber || '').trim().toLowerCase();
    const sig = `${(p.subscriberId || '').trim()}_${(p.paymentDate || '').trim()}_${Number(p.amountPaid || 0)}`;

    if (idKey && seenIds.has(idKey)) continue;
    if (receiptKey && seenReceipts.has(receiptKey)) continue;
    if (sig !== '__0' && seenSignatures.has(sig)) continue;

    if (idKey) seenIds.add(idKey);
    if (receiptKey) seenReceipts.add(receiptKey);
    if (sig !== '__0') seenSignatures.add(sig);

    deduplicated.push(p);
  }

  return deduplicated;
}

export function deduplicateGenericList<T extends Record<string, any>>(items: T[], secondaryKey?: (item: T) => string): T[] {
  if (!Array.isArray(items)) return [];
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const deduplicated: T[] = [];

  for (const item of items) {
    if (!item) continue;
    const idKey = ((item.id as string) || '').trim();
    const secKey = secondaryKey ? secondaryKey(item) : '';

    if (idKey && seenIds.has(idKey)) continue;
    if (secKey && seenKeys.has(secKey)) continue;

    if (idKey) seenIds.add(idKey);
    if (secKey) seenKeys.add(secKey);

    deduplicated.push(item);
  }

  return deduplicated;
}

export interface SanitizedBackupResult {
  sanitized: any;
  cleanedPayload: any;
  stats: {
    totalRemoved: number;
    subscribersRemoved: number;
    readingsRemoved: number;
    paymentsRemoved: number;
    usersRemoved: number;
    inventoryRemoved: number;
    expensesRemoved: number;
    purchasesRemoved: number;
    auditLogsRemoved: number;
    otherRemoved: number;
    subscribers: { original: number; deduplicated: number; removed: number };
    readings: { original: number; deduplicated: number; removed: number };
    payments: { original: number; deduplicated: number; removed: number };
  };
}

export function sanitizeAndDeduplicateDatabasePayload(rawPayload: any): SanitizedBackupResult {
  const d = rawPayload.data || rawPayload;
  const originalSubs = Array.isArray(d.subscribers) ? d.subscribers : [];
  const originalReadings = Array.isArray(d.readings || d.meterReadings) ? (d.readings || d.meterReadings) : [];
  const originalPayments = Array.isArray(d.payments) ? d.payments : [];
  const originalUsers = Array.isArray(d.users) ? d.users : [];
  const originalInventory = Array.isArray(d.inventory) ? d.inventory : [];
  const originalInvTxs = Array.isArray(d.inventoryTransactions) ? d.inventoryTransactions : [];
  const originalExpenses = Array.isArray(d.expenses) ? d.expenses : [];
  const originalPurchases = Array.isArray(d.purchases) ? d.purchases : [];
  const originalTransfers = Array.isArray(d.treasuryTransfers) ? d.treasuryTransfers : [];
  const originalJournal = Array.isArray(d.manualJournalEntries) ? d.manualJournalEntries : [];
  const originalEmployees = Array.isArray(d.employees) ? d.employees : [];
  const originalConnections = Array.isArray(d.connections) ? d.connections : [];
  const originalTechRequests = Array.isArray(d.techRequests) ? d.techRequests : [];
  const originalAuditLogs = Array.isArray(d.auditLogs) ? d.auditLogs : [];
  const originalSmsTemplates = Array.isArray(d.smsTemplates) ? d.smsTemplates : [];

  const cleanedSubs = deduplicateSubscribers(originalSubs);
  const cleanedReadings = deduplicateReadings(originalReadings);
  const cleanedPayments = deduplicatePayments(originalPayments);
  const cleanedUsers = deduplicateGenericList(originalUsers, u => (u.username || '').toLowerCase());
  const cleanedInventory = deduplicateGenericList(originalInventory, i => (i.itemCode || i.name || '').toLowerCase());
  const cleanedInvTxs = deduplicateGenericList(originalInvTxs);
  const cleanedExpenses = deduplicateGenericList(originalExpenses);
  const cleanedPurchases = deduplicateGenericList(originalPurchases);
  const cleanedTransfers = deduplicateGenericList(originalTransfers, t => (t.transferNumber || '').toLowerCase());
  const cleanedJournal = deduplicateGenericList(originalJournal, j => (j.voucherNumber || '').toLowerCase());
  const cleanedEmployees = deduplicateGenericList(originalEmployees, e => (e.phone || e.name || '').toLowerCase());
  const cleanedConnections = deduplicateGenericList(originalConnections);
  const cleanedTechRequests = deduplicateGenericList(originalTechRequests);
  const cleanedAuditLogs = deduplicateGenericList(originalAuditLogs);
  const cleanedSmsTemplates = deduplicateGenericList(originalSmsTemplates);

  const subscribersRemoved = originalSubs.length - cleanedSubs.length;
  const readingsRemoved = originalReadings.length - cleanedReadings.length;
  const paymentsRemoved = originalPayments.length - cleanedPayments.length;
  const usersRemoved = originalUsers.length - cleanedUsers.length;
  const inventoryRemoved = originalInventory.length - cleanedInventory.length;
  const expensesRemoved = originalExpenses.length - cleanedExpenses.length;
  const purchasesRemoved = originalPurchases.length - cleanedPurchases.length;
  const auditLogsRemoved = originalAuditLogs.length - cleanedAuditLogs.length;
  const otherRemoved = (originalInvTxs.length - cleanedInvTxs.length) +
                       (originalTransfers.length - cleanedTransfers.length) +
                       (originalJournal.length - cleanedJournal.length) +
                       (originalEmployees.length - cleanedEmployees.length) +
                       (originalConnections.length - cleanedConnections.length) +
                       (originalTechRequests.length - cleanedTechRequests.length);

  const totalRemoved = subscribersRemoved + readingsRemoved + paymentsRemoved + usersRemoved +
                       inventoryRemoved + expensesRemoved + purchasesRemoved + auditLogsRemoved + otherRemoved;

  const cleanedPayload = {
    ...d,
    subscribers: cleanedSubs,
    readings: cleanedReadings,
    payments: cleanedPayments,
    users: cleanedUsers,
    settings: d.settings || d.systemSettings || DEFAULT_SETTINGS,
    inventory: cleanedInventory,
    inventoryTransactions: cleanedInvTxs,
    expenses: cleanedExpenses,
    purchases: cleanedPurchases,
    treasuryTransfers: cleanedTransfers,
    manualJournalEntries: cleanedJournal,
    employees: cleanedEmployees,
    connections: cleanedConnections,
    techRequests: cleanedTechRequests,
    auditLogs: cleanedAuditLogs,
    smsTemplates: cleanedSmsTemplates,
    isDeduplicated: true,
    deduplicatedAt: new Date().toISOString()
  };

  return {
    sanitized: cleanedPayload,
    cleanedPayload,
    stats: {
      totalRemoved,
      subscribersRemoved,
      readingsRemoved,
      paymentsRemoved,
      usersRemoved,
      inventoryRemoved,
      expensesRemoved,
      purchasesRemoved,
      auditLogsRemoved,
      otherRemoved,
      subscribers: { original: originalSubs.length, deduplicated: cleanedSubs.length, removed: subscribersRemoved },
      readings: { original: originalReadings.length, deduplicated: cleanedReadings.length, removed: readingsRemoved },
      payments: { original: originalPayments.length, deduplicated: cleanedPayments.length, removed: paymentsRemoved }
    }
  };
}

export async function deduplicateCloudSubscribers(): Promise<{ cleanedList: Subscriber[]; removedCount: number }> {
  try {
    const snap = await getDocs(collection(db, 'subscribers'));
    const seenMeters = new Map<string, string>();
    const seenIds = new Set<string>();
    const docsToDelete: string[] = [];
    const cleanedList: Subscriber[] = [];

    for (const d of snap.docs) {
      const data = d.data() as Subscriber;
      const docId = d.id;
      const meterKey = (data.meterNumber || '').trim().toLowerCase();

      if (seenIds.has(docId)) {
        docsToDelete.push(docId);
        continue;
      }

      if (meterKey && seenMeters.has(meterKey)) {
        docsToDelete.push(docId);
        continue;
      }

      seenIds.add(docId);
      if (meterKey) seenMeters.set(meterKey, docId);
      cleanedList.push({ id: docId, ...data });
    }

    if (docsToDelete.length > 0) {
      const CHUNK_SIZE = 400;
      for (let i = 0; i < docsToDelete.length; i += CHUNK_SIZE) {
        const chunk = docsToDelete.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(id => batch.delete(doc(db, 'subscribers', id)));
        await batch.commit();
      }
      console.log(`[Firestore Deduplication] Deleted ${docsToDelete.length} duplicate subscriber documents.`);
    }

    return { cleanedList, removedCount: docsToDelete.length };
  } catch (err) {
    console.warn('[Firestore Deduplication Error]:', err);
    return { cleanedList: [], removedCount: 0 };
  }
}

// Local Storage Keys for offline fallback
const LS_KEYS = {
  USERS: 'voltera_firestore_users',
  SETTINGS: 'voltera_firestore_settings',
  AUDIT_LOGS: 'voltera_firestore_audit_logs',
  TRANSFERS: 'voltera_firestore_transfers',
  EXPENSES: 'voltera_firestore_expenses',
  PURCHASES: 'voltera_firestore_purchases',
  JOURNAL: 'voltera_firestore_journal',
  EMPLOYEES: 'voltera_firestore_employees',
  EMPLOYEE_TXS: 'voltera_firestore_employee_txs',
  CONNECTIONS: 'voltera_firestore_connections',
  TECH_REQUESTS: 'voltera_firestore_tech_requests',
  INVENTORY: 'voltera_firestore_inventory',
  INVENTORY_TXS: 'voltera_firestore_inventory_txs',
  SMS_TEMPLATES: 'voltera_firestore_sms_templates',
  FAILED_SMS: 'voltera_firestore_failed_sms',
  PARTNERS: 'voltera_firestore_partners',
  PARTNER_TXS: 'voltera_firestore_partner_txs',
  PROFIT_DISTRIBUTIONS: 'voltera_firestore_profit_distributions',
};

export function getLocalData<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

export function setLocalData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('LocalStorage quota exceeded or unavailable:', e);
  }
}

// Seed Initial Data to Firestore
export async function seedFirestore() {
  console.log('[Firebase Firestore] Seeding initial data template...');
  try {
    const batch = writeBatch(db);

    // Users
    INITIAL_USERS.forEach(u => {
      const uRef = doc(db, 'users', u.id || u.username);
      batch.set(uRef, u, { merge: true });
    });

    // Subscribers
    INITIAL_SUBSCRIBERS.forEach(s => {
      const sRef = doc(db, 'subscribers', s.id);
      batch.set(sRef, s, { merge: true });
    });

    // Readings
    INITIAL_READINGS.forEach(r => {
      const rRef = doc(db, 'readings', r.id);
      batch.set(rRef, r, { merge: true });
    });

    // Payments
    INITIAL_PAYMENTS.forEach(p => {
      const pRef = doc(db, 'payments', p.id);
      batch.set(pRef, p, { merge: true });
    });

    // Settings - Only seed defaults if no settings exist to preserve custom tariffs
    try {
      const setDocRef = await getDoc(doc(db, 'settings', 'global'));
      if (!setDocRef.exists()) {
        const setRef = doc(db, 'settings', 'global');
        batch.set(setRef, cleanForFirestore(DEFAULT_SETTINGS), { merge: true });
      }
    } catch (e) {
      console.warn('Checking existing settings before seeding:', e);
    }

    // Inventory
    INITIAL_INVENTORY.forEach(inv => {
      const invRef = doc(db, 'inventory', inv.id);
      batch.set(invRef, inv, { merge: true });
    });

    // SMS Templates (only if templates exist)
    if (INITIAL_SMS_TEMPLATES.length > 0) {
      INITIAL_SMS_TEMPLATES.forEach(tpl => {
        const tplRef = doc(db, 'smsTemplates', tpl.id);
        batch.set(tplRef, tpl, { merge: true });
      });
    }

    await batch.commit();
    console.log('[Firebase Firestore] Initial data seeded successfully!');
  } catch (err) {
    console.warn('[Firebase Firestore Seeding Error]:', err);
  }
}

// Clear all test data from Firestore
export async function clearAllTestDataFromCloud() {
  try {
    const collectionsToClear = ['subscribers', 'readings', 'payments', 'expenses', 'purchases', 'treasuryTransfers', 'manualJournalEntries', 'inventoryTransactions', 'auditLogs', 'partners', 'partnerTransactions', 'profitDistributions'];
    for (const colName of collectionsToClear) {
      const snap = await getDocs(collection(db, colName));
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    console.log('[Firebase Firestore] All test collections cleared.');
  } catch (err) {
    console.warn('[Firebase Firestore Clear Error]:', err);
  }

  // Clear local storage caches
  localStorage.setItem('voltera_subscribers', JSON.stringify([]));
  localStorage.setItem('voltera_readings', JSON.stringify([]));
  localStorage.setItem('voltera_payments', JSON.stringify([]));
  localStorage.removeItem('voltera_firestore_partners');
  localStorage.removeItem('voltera_firestore_partner_txs');
  localStorage.removeItem('voltera_firestore_profit_distributions');
}

// Load All Data from Firestore
export async function loadAllCloudData() {
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    let usersList = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as User));
    if (usersList.length === 0) {
      await seedFirestore();
      usersList = INITIAL_USERS;
    }

    const subsSnap = await getDocs(collection(db, 'subscribers'));
    const rawSubscribers = subsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Subscriber));
    const subscribers = deduplicateSubscribers(rawSubscribers);

    const readsSnap = await getDocs(collection(db, 'readings'));
    const readings = readsSnap.docs.map(d => ({ id: d.id, ...d.data() } as MeterReading));

    const paysSnap = await getDocs(collection(db, 'payments'));
    const payments = paysSnap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));

    // 1. Read global settings directly from Firestore
    const setDocRef = await getDoc(doc(db, 'settings', 'global'));
    let settingsData: Partial<SystemSettings> = {};
    if (setDocRef.exists()) {
      settingsData = setDocRef.data() as Partial<SystemSettings>;
    }

    // 2. Also check dedicated tariffs document directly from Firestore
    let cloudTariffs: any = {};
    try {
      const tariffsDocRef = await getDoc(doc(db, 'tariffs', 'current'));
      if (tariffsDocRef.exists()) {
        cloudTariffs = tariffsDocRef.data() || {};
      }
    } catch (e) {
      console.warn('Could not read tariffs/current from Firestore:', e);
    }

    // 3. Also check dedicated station profile directly from Firestore
    let cloudProfile: any = {};
    try {
      const profileDocRef = await getDoc(doc(db, 'stationProfile', 'identity'));
      if (profileDocRef.exists()) {
        cloudProfile = profileDocRef.data() || {};
      }
    } catch (e) {
      console.warn('Could not read stationProfile/identity from Firestore:', e);
    }

    // Database is authoritative: Firestore data takes 100% precedence over local or default placeholders
    const mergedTariffs = {
      ...DEFAULT_SETTINGS.tariffs,
      ...(cloudTariffs.tariffs || {}),
      ...(cloudTariffs.residential !== undefined ? {
        residential: cloudTariffs.residential,
        commercial: cloudTariffs.commercial,
        industrial: cloudTariffs.industrial
      } : {}),
      ...(settingsData.tariffs || {}),
    };

    let settings: SystemSettings = {
      ...DEFAULT_SETTINGS,
      ...settingsData,
      ...cloudProfile,
      tariffs: mergedTariffs,
      fixedFee: settingsData.fixedFee ?? (cloudTariffs.fixedFee ?? DEFAULT_SETTINGS.fixedFee),
      serviceFee: settingsData.serviceFee ?? (cloudTariffs.serviceFee ?? DEFAULT_SETTINGS.serviceFee),
      taxPercent: settingsData.taxPercent ?? (cloudTariffs.taxPercent ?? DEFAULT_SETTINGS.taxPercent),
      meterInsuranceDeposit: settingsData.meterInsuranceDeposit ?? (cloudTariffs.meterInsuranceDeposit ?? DEFAULT_SETTINGS.meterInsuranceDeposit),
      readingCycleIntervalDays: settingsData.readingCycleIntervalDays ?? (cloudTariffs.readingCycleIntervalDays ?? DEFAULT_SETTINGS.readingCycleIntervalDays),
      readingCycleMode: settingsData.readingCycleMode ?? (cloudTariffs.readingCycleMode ?? DEFAULT_SETTINGS.readingCycleMode),
    };

    // Ensure dedicated profile fields take absolute precedence if defined
    if (cloudProfile.stationName) settings.stationName = cloudProfile.stationName;
    if (cloudProfile.stationNameEn) settings.stationNameEn = cloudProfile.stationNameEn;
    if (cloudProfile.ownerName) settings.ownerName = cloudProfile.ownerName;
    if (cloudProfile.ownerNameEn) settings.ownerNameEn = cloudProfile.ownerNameEn;
    if (cloudProfile.commercialRegister) settings.commercialRegister = cloudProfile.commercialRegister;
    if (cloudProfile.taxNumber) settings.taxNumber = cloudProfile.taxNumber;
    if (cloudProfile.licenseNumber) settings.licenseNumber = cloudProfile.licenseNumber;
    if (cloudProfile.phone) settings.phone = cloudProfile.phone;
    if (cloudProfile.phone2) settings.phone2 = cloudProfile.phone2;
    if (cloudProfile.whatsapp) settings.whatsapp = cloudProfile.whatsapp;
    if (cloudProfile.address) settings.address = cloudProfile.address;
    if (cloudProfile.city) settings.city = cloudProfile.city;
    if (cloudProfile.district) settings.district = cloudProfile.district;
    if (cloudProfile.logoUrl) settings.logoUrl = cloudProfile.logoUrl;
    if (cloudProfile.officialStampUrl) settings.officialStampUrl = cloudProfile.officialStampUrl;
    if (cloudProfile.managerSignatureUrl) settings.managerSignatureUrl = cloudProfile.managerSignatureUrl;
    if (cloudProfile.logoText) settings.logoText = cloudProfile.logoText;
    if (cloudProfile.notes) settings.notes = cloudProfile.notes;
    if (cloudProfile.disclaimer) settings.disclaimer = cloudProfile.disclaimer;
    if (cloudProfile.currency) settings.currency = cloudProfile.currency;
    if (cloudProfile.bankAccounts) settings.bankAccounts = cloudProfile.bankAccounts;
    if (cloudProfile.branches) settings.branches = cloudProfile.branches;

    if (!setDocRef.exists()) {
      await setDoc(doc(db, 'settings', 'global'), cleanForFirestore(settings), { merge: true }).catch(err => console.warn('Error seeding global settings in Firestore:', err));
    }

    const auditSnap = await getDocs(collection(db, 'auditLogs'));
    const auditLogs = auditSnap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog));

    const invSnap = await getDocs(collection(db, 'inventory'));
    const inventory = invSnap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem));

    const invTxSnap = await getDocs(collection(db, 'inventoryTransactions'));
    const inventoryTransactions = invTxSnap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryTransaction));

    const trfSnap = await getDocs(collection(db, 'treasuryTransfers'));
    const treasuryTransfers = trfSnap.docs.map(d => ({ id: d.id, ...d.data() } as TreasuryTransfer));

    const expSnap = await getDocs(collection(db, 'expenses'));
    const expenses = expSnap.docs.map(d => ({ id: d.id, ...d.data() } as Expense));

    const purSnap = await getDocs(collection(db, 'purchases'));
    const purchases = purSnap.docs.map(d => ({ id: d.id, ...d.data() } as Purchase));

    const jeSnap = await getDocs(collection(db, 'manualJournalEntries'));
    const manualJournalEntries = jeSnap.docs.map(d => ({ id: d.id, ...d.data() } as JournalEntry));

    const empSnap = await getDocs(collection(db, 'employees'));
    const employees = empSnap.docs.map(d => ({ id: d.id, ...d.data() } as Employee));

    const connSnap = await getDocs(collection(db, 'connections'));
    const connections = connSnap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceConnection));

    const reqSnap = await getDocs(collection(db, 'techRequests'));
    const techRequests = reqSnap.docs.map(d => ({ id: d.id, ...d.data() } as TechnicalRequest));

    const smsSnap = await getDocs(collection(db, 'smsTemplates'));
    const smsTemplates = smsSnap.docs.map(d => ({ id: d.id, ...d.data() } as SmsTemplate));

    const failedSmsSnap = await getDocs(collection(db, 'failedSms'));
    const failedSms = failedSmsSnap.docs.map(d => ({ id: d.id, ...d.data() } as FailedSmsItem));

    const partnersSnap = await getDocs(collection(db, 'partners'));
    let partners = partnersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Partner));
    
    // Automatically purge legacy dummy partners from previous template seeds if found in database
    const dummyPartnerIds = ['prt-1', 'prt-2', 'prt-3'];
    const hasDummyPartners = partners.some(p => dummyPartnerIds.includes(p.id));
    if (hasDummyPartners) {
      try {
        const delBatch = writeBatch(db);
        partners.filter(p => dummyPartnerIds.includes(p.id)).forEach(p => {
          delBatch.delete(doc(db, 'partners', p.id));
        });
        await delBatch.commit();
        console.log('[Firestore Database] Cleaned up legacy dummy partner records from database.');
      } catch (e) {
        console.warn('Could not cleanup dummy partners in Firestore:', e);
      }
      partners = partners.filter(p => !dummyPartnerIds.includes(p.id));
    }

    const partnerTxsSnap = await getDocs(collection(db, 'partnerTransactions'));
    let partnerTxs = partnerTxsSnap.docs.map(d => ({ id: d.id, ...d.data() } as PartnerTransaction));
    
    // Automatically purge legacy dummy partner transactions
    const dummyTxIds = ['ptx-1', 'ptx-2', 'ptx-3'];
    const hasDummyTxs = partnerTxs.some(t => dummyTxIds.includes(t.id));
    if (hasDummyTxs) {
      try {
        const delBatch = writeBatch(db);
        partnerTxs.filter(t => dummyTxIds.includes(t.id)).forEach(t => {
          delBatch.delete(doc(db, 'partnerTransactions', t.id));
        });
        await delBatch.commit();
        console.log('[Firestore Database] Cleaned up legacy dummy partner transactions from database.');
      } catch (e) {
        console.warn('Could not cleanup dummy partner txs in Firestore:', e);
      }
      partnerTxs = partnerTxs.filter(t => !dummyTxIds.includes(t.id));
    }

    const distSnap = await getDocs(collection(db, 'profitDistributions'));
    const profitDistributions = distSnap.docs.map(d => ({ id: d.id, ...d.data() } as ProfitDistributionBatch));

    return {
      users: usersList.length > 0 ? usersList : INITIAL_USERS,
      subscribers: subscribers.length > 0 ? subscribers : INITIAL_SUBSCRIBERS,
      readings: readings.length > 0 ? readings : INITIAL_READINGS,
      payments: payments.length > 0 ? payments : INITIAL_PAYMENTS,
      settings,
      auditLogs: auditLogs.length > 0 ? auditLogs : INITIAL_AUDIT_LOGS,
      treasuryTransfers,
      expenses,
      purchases,
      manualJournalEntries,
      employees,
      employeeTxs: [],
      connections,
      techRequests,
      inventory: inventory.length > 0 ? inventory : INITIAL_INVENTORY,
      inventoryTransactions,
      smsTemplates: smsTemplates || [],
      failedSms,
      partners: partners.length > 0 ? partners : INITIAL_PARTNERS,
      partnerTransactions: partnerTxs.length > 0 ? partnerTxs : INITIAL_PARTNER_TRANSACTIONS,
      profitDistributions: profitDistributions.length > 0 ? profitDistributions : INITIAL_PROFIT_DISTRIBUTIONS,
    };
  } catch (err) {
    console.warn('[Firebase Firestore Load Fallback]:', err);
    return {
      users: getLocalData(LS_KEYS.USERS, INITIAL_USERS),
      subscribers: getLocalData('voltera_subscribers', INITIAL_SUBSCRIBERS),
      readings: getLocalData('voltera_readings', INITIAL_READINGS),
      payments: getLocalData('voltera_payments', INITIAL_PAYMENTS),
      settings: getLocalData(LS_KEYS.SETTINGS, DEFAULT_SETTINGS),
      auditLogs: getLocalData(LS_KEYS.AUDIT_LOGS, INITIAL_AUDIT_LOGS),
      treasuryTransfers: [],
      expenses: [],
      purchases: [],
      manualJournalEntries: [],
      employees: [],
      employeeTxs: [],
      connections: [],
      techRequests: [],
      inventory: INITIAL_INVENTORY,
      inventoryTransactions: [],
      smsTemplates: getLocalData(LS_KEYS.SMS_TEMPLATES, []),
      failedSms: getLocalData(LS_KEYS.FAILED_SMS, []),
      partners: getLocalData(LS_KEYS.PARTNERS, INITIAL_PARTNERS),
      partnerTransactions: getLocalData(LS_KEYS.PARTNER_TXS, INITIAL_PARTNER_TRANSACTIONS),
      profitDistributions: getLocalData(LS_KEYS.PROFIT_DISTRIBUTIONS, INITIAL_PROFIT_DISTRIBUTIONS),
    };
  }
}

// Real-time Subscriptions
export function subscribeToUsersFromCloud(callback: (users: User[]) => void) {
  return onSnapshot(collection(db, 'users'), (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as User));
    callback(list.length > 0 ? list : INITIAL_USERS);
  }, (err) => handleFirestoreError(err, OperationType.GET, 'users'));
}

export function subscribeToSubscribersFromCloud(callback: (subs: Subscriber[]) => void) {
  return onSnapshot(collection(db, 'subscribers'), (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Subscriber));
    callback(deduplicateSubscribers(list));
  }, (err) => handleFirestoreError(err, OperationType.GET, 'subscribers'));
}

export function subscribeToReadingsFromCloud(callback: (readings: MeterReading[]) => void) {
  return onSnapshot(collection(db, 'readings'), (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as MeterReading));
    callback(list);
  }, (err) => handleFirestoreError(err, OperationType.GET, 'readings'));
}

export function subscribeToPaymentsFromCloud(callback: (payments: Payment[]) => void) {
  return onSnapshot(collection(db, 'payments'), (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
    callback(list);
  }, (err) => handleFirestoreError(err, OperationType.GET, 'payments'));
}

export async function fetchTariffsAndSettingsFromDatabase(): Promise<SystemSettings> {
  try {
    const setDocRef = await getDoc(doc(db, 'settings', 'global'));
    let settingsData: Partial<SystemSettings> = {};
    if (setDocRef.exists()) {
      settingsData = setDocRef.data() as Partial<SystemSettings>;
    }

    let cloudTariffs: any = {};
    try {
      const tariffsDocRef = await getDoc(doc(db, 'tariffs', 'current'));
      if (tariffsDocRef.exists()) {
        cloudTariffs = tariffsDocRef.data() || {};
      }
    } catch (e) {
      console.warn('Could not read tariffs/current from Firestore:', e);
    }

    const mergedTariffs = {
      ...DEFAULT_SETTINGS.tariffs,
      ...(cloudTariffs.tariffs || {}),
      ...(cloudTariffs.residential !== undefined ? {
        residential: cloudTariffs.residential,
        commercial: cloudTariffs.commercial,
        industrial: cloudTariffs.industrial
      } : {}),
      ...(settingsData.tariffs || {}),
    };

    const finalSettings: SystemSettings = {
      ...DEFAULT_SETTINGS,
      ...settingsData,
      tariffs: mergedTariffs,
      tariffCalculationMethod: settingsData.tariffCalculationMethod || cloudTariffs.tariffCalculationMethod || DEFAULT_SETTINGS.tariffCalculationMethod || 'flat',
      tariffSlices: settingsData.tariffSlices || cloudTariffs.tariffSlices || DEFAULT_SETTINGS.tariffSlices || [],
      tariffAuditHistory: settingsData.tariffAuditHistory || cloudTariffs.tariffAuditHistory || [],
      fixedFee: settingsData.fixedFee ?? (cloudTariffs.fixedFee ?? DEFAULT_SETTINGS.fixedFee),
      serviceFee: settingsData.serviceFee ?? (cloudTariffs.serviceFee ?? DEFAULT_SETTINGS.serviceFee),
      taxPercent: settingsData.taxPercent ?? (cloudTariffs.taxPercent ?? DEFAULT_SETTINGS.taxPercent),
      cleaningFee: settingsData.cleaningFee ?? (cloudTariffs.cleaningFee ?? DEFAULT_SETTINGS.cleaningFee),
      streetLightFee: settingsData.streetLightFee ?? (cloudTariffs.streetLightFee ?? DEFAULT_SETTINGS.streetLightFee),
      meterRentalFee: settingsData.meterRentalFee ?? (cloudTariffs.meterRentalFee ?? DEFAULT_SETTINGS.meterRentalFee),
      reconnectionFee: settingsData.reconnectionFee ?? (cloudTariffs.reconnectionFee ?? DEFAULT_SETTINGS.reconnectionFee),
      latePenaltyPerDay: settingsData.latePenaltyPerDay ?? (cloudTariffs.latePenaltyPerDay ?? DEFAULT_SETTINGS.latePenaltyPerDay),
      meterInspectionFee: settingsData.meterInspectionFee ?? (cloudTariffs.meterInspectionFee ?? DEFAULT_SETTINGS.meterInspectionFee),
      nameTransferFee: settingsData.nameTransferFee ?? (cloudTariffs.nameTransferFee ?? DEFAULT_SETTINGS.nameTransferFee),
      meterReplacementFee: settingsData.meterReplacementFee ?? (cloudTariffs.meterReplacementFee ?? DEFAULT_SETTINGS.meterReplacementFee),
      meterInsuranceDeposit: settingsData.meterInsuranceDeposit ?? (cloudTariffs.meterInsuranceDeposit ?? DEFAULT_SETTINGS.meterInsuranceDeposit),
      minMonthlyConsumptionKwh: settingsData.minMonthlyConsumptionKwh ?? (cloudTariffs.minMonthlyConsumptionKwh ?? DEFAULT_SETTINGS.minMonthlyConsumptionKwh),
      readingCycleIntervalDays: settingsData.readingCycleIntervalDays ?? (cloudTariffs.readingCycleIntervalDays ?? DEFAULT_SETTINGS.readingCycleIntervalDays),
      readingCycleMode: settingsData.readingCycleMode ?? (cloudTariffs.readingCycleMode ?? DEFAULT_SETTINGS.readingCycleMode),
      touEnabled: settingsData.touEnabled ?? (cloudTariffs.touEnabled ?? DEFAULT_SETTINGS.touEnabled),
      peakMultiplier: settingsData.peakMultiplier ?? (cloudTariffs.peakMultiplier ?? DEFAULT_SETTINGS.peakMultiplier),
      peakHoursStart: settingsData.peakHoursStart ?? (cloudTariffs.peakHoursStart ?? DEFAULT_SETTINGS.peakHoursStart),
      peakHoursEnd: settingsData.peakHoursEnd ?? (cloudTariffs.peakHoursEnd ?? DEFAULT_SETTINGS.peakHoursEnd),
    };

    return finalSettings;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'settings/global');
    throw err;
  }
}

export function subscribeToSettingsFromCloud(callback: (settings: SystemSettings) => void) {
  return onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      const merged: SystemSettings = {
        ...DEFAULT_SETTINGS,
        ...data,
        tariffs: {
          ...DEFAULT_SETTINGS.tariffs,
          ...(data.tariffs || {})
        }
      };
      callback(merged);
    }
  }, (err) => handleFirestoreError(err, OperationType.GET, 'settings/global'));
}

export function subscribeToAuditLogsFromCloud(callback: (logs: AuditLog[]) => void) {
  return onSnapshot(collection(db, 'auditLogs'), (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog));
    callback(list);
  }, (err) => handleFirestoreError(err, OperationType.GET, 'auditLogs'));
}

export function subscribeToInventoryFromCloud(callback: (inv: InventoryItem[]) => void) {
  return onSnapshot(collection(db, 'inventory'), (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem));
    callback(list);
  }, (err) => handleFirestoreError(err, OperationType.GET, 'inventory'));
}

export function subscribeToInventoryTxsFromCloud(callback: (txs: InventoryTransaction[]) => void) {
  return onSnapshot(collection(db, 'inventoryTransactions'), (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryTransaction));
    callback(list);
  }, (err) => handleFirestoreError(err, OperationType.GET, 'inventoryTransactions'));
}

export function subscribeToExpensesFromCloud(callback: (exps: Expense[]) => void) {
  return onSnapshot(collection(db, 'expenses'), (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense));
    callback(list);
  }, (err) => handleFirestoreError(err, OperationType.GET, 'expenses'));
}

export function subscribeToPurchasesFromCloud(callback: (purs: Purchase[]) => void) {
  return onSnapshot(collection(db, 'purchases'), (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Purchase));
    callback(list);
  }, (err) => handleFirestoreError(err, OperationType.GET, 'purchases'));
}

export function subscribeToJournalEntriesFromCloud(callback: (jes: JournalEntry[]) => void) {
  return onSnapshot(collection(db, 'manualJournalEntries'), (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as JournalEntry));
    callback(list);
  }, (err) => handleFirestoreError(err, OperationType.GET, 'manualJournalEntries'));
}

export function subscribeToTreasuryTransfersFromCloud(callback: (trfs: TreasuryTransfer[]) => void) {
  return onSnapshot(collection(db, 'treasuryTransfers'), (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as TreasuryTransfer));
    callback(list);
  }, (err) => handleFirestoreError(err, OperationType.GET, 'treasuryTransfers'));
}

export function subscribeToSmsTemplatesFromCloud(callback: (templates: SmsTemplate[]) => void) {
  return onSnapshot(collection(db, 'smsTemplates'), (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as SmsTemplate));
    callback(list);
  }, (err) => handleFirestoreError(err, OperationType.GET, 'smsTemplates'));
}

export function subscribeToFailedSmsFromCloud(callback: (items: FailedSmsItem[]) => void) {
  return onSnapshot(collection(db, 'failedSms'), (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as FailedSmsItem));
    callback(list);
  }, (err) => handleFirestoreError(err, OperationType.GET, 'failedSms'));
}

// Single Document / Collection CRUD Operations in Firestore
export async function syncUserToCloud(user: User) {
  try {
    if (!user) return;
    const uid = user.id || user.username;
    if (!uid || uid === 'undefined') return;
    const uRef = doc(db, 'users', uid);
    await setDoc(uRef, cleanForFirestore(user), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${user?.id || 'unknown'}`);
  }
}

export async function syncBulkUsersToCloud(usersList: User[]) {
  try {
    await commitCollectionInChunks('users', usersList);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'users/bulk');
  }
}

export async function syncSubscriberToCloud(sub: Subscriber) {
  try {
    if (!sub || !sub.id || sub.id === 'undefined') return;
    const sRef = doc(db, 'subscribers', sub.id);
    await setDoc(sRef, cleanForFirestore(sub), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `subscribers/${sub?.id || 'unknown'}`);
  }
}

export async function deleteSubscriberFromCloud(id: string) {
  try {
    if (!id || id === 'undefined') return;
    await deleteDoc(doc(db, 'subscribers', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `subscribers/${id}`);
  }
}

export async function syncReadingToCloud(reading: MeterReading) {
  try {
    if (!reading || !reading.id || reading.id === 'undefined') return;
    const rRef = doc(db, 'readings', reading.id);
    await setDoc(rRef, cleanForFirestore(reading), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `readings/${reading?.id || 'unknown'}`);
  }
}

export async function deleteReadingFromCloud(id: string) {
  try {
    if (!id || id === 'undefined') return;
    await deleteDoc(doc(db, 'readings', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `readings/${id}`);
  }
}

export async function syncPaymentToCloud(payment: Payment) {
  try {
    if (!payment || !payment.id || payment.id === 'undefined') return;
    const pRef = doc(db, 'payments', payment.id);
    await setDoc(pRef, cleanForFirestore(payment), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `payments/${payment?.id || 'unknown'}`);
  }
}

export async function deletePaymentFromCloud(id: string) {
  try {
    if (!id || id === 'undefined') return;
    await deleteDoc(doc(db, 'payments', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `payments/${id}`);
  }
}

export async function syncSettingsToCloud(settings: SystemSettings) {
  try {
    // 1. Immediately cache in localStorage for instant retrieval & offline resilience
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('voltera_cache_settings', JSON.stringify(settings));
        const cachedStr = localStorage.getItem('voltera_cached_cloud_data');
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          cached.settings = settings;
          localStorage.setItem('voltera_cached_cloud_data', JSON.stringify(cached));
        }
      } catch (e) {}
    }

    const sRef = doc(db, 'settings', 'global');
    await setDoc(sRef, cleanForFirestore(settings), { merge: true });
    
    // Also update dedicated station profile & identity document in cloud Firestore
    const pRef = doc(db, 'stationProfile', 'identity');
    await setDoc(pRef, cleanForFirestore({
      stationName: settings.stationName || '',
      stationNameEn: settings.stationNameEn || '',
      stationCode: settings.stationCode || '',
      ownerName: settings.ownerName || '',
      ownerNameEn: settings.ownerNameEn || '',
      commercialRegister: settings.commercialRegister || '',
      taxNumber: settings.taxNumber || '',
      licenseNumber: settings.licenseNumber || '',
      licenseIssueDate: settings.licenseIssueDate || '',
      licenseExpiryDate: settings.licenseExpiryDate || '',
      stationType: settings.stationType || '',
      stationCapacityKw: settings.stationCapacityKw || 0,
      transformerCapacityKva: settings.transformerCapacityKva || 0,
      operationalStatus: settings.operationalStatus || 'active',
      phone: settings.phone || '',
      phone2: settings.phone2 || '',
      whatsapp: settings.whatsapp || '',
      whatsappChannel: settings.whatsappChannel || '',
      email: settings.email || '',
      websiteUrl: settings.websiteUrl || '',
      country: settings.country || 'الجمهورية اليمنية',
      city: settings.city || '',
      district: settings.district || '',
      address: settings.address || '',
      gpsCoordinates: settings.gpsCoordinates || '',
      coverageArea: settings.coverageArea || '',
      workingHours: settings.workingHours || '',
      generationHours: settings.generationHours || '',
      emergencyContactPerson: settings.emergencyContactPerson || '',
      bankAccounts: settings.bankAccounts || [],
      branches: settings.branches || [],
      logoUrl: settings.logoUrl || '',
      officialStampUrl: settings.officialStampUrl || '',
      managerSignatureUrl: settings.managerSignatureUrl || '',
      watermarkUrl: settings.watermarkUrl || '',
      logoText: settings.logoText || '',
      tagline: settings.tagline || '',
      notes: settings.notes || '',
      disclaimer: settings.disclaimer || '',
      currency: settings.currency || 'ر.ي',
      updatedAt: new Date().toISOString()
    }), { merge: true });

    // Also update dedicated tariffs document in cloud Firestore
    if (settings.tariffs) {
      const tRef = doc(db, 'tariffs', 'current');
      await setDoc(tRef, cleanForFirestore({
        tariffs: settings.tariffs,
        tariffCalculationMethod: settings.tariffCalculationMethod || 'flat',
        tariffSlices: settings.tariffSlices || [],
        tariffAuditHistory: settings.tariffAuditHistory || [],
        fixedFee: settings.fixedFee || 0,
        serviceFee: settings.serviceFee || 0,
        taxPercent: settings.taxPercent || 0,
        cleaningFee: settings.cleaningFee || 0,
        streetLightFee: settings.streetLightFee || 0,
        meterRentalFee: settings.meterRentalFee || 0,
        reconnectionFee: settings.reconnectionFee || 0,
        latePenaltyPerDay: settings.latePenaltyPerDay || 0,
        meterInspectionFee: settings.meterInspectionFee || 0,
        nameTransferFee: settings.nameTransferFee || 0,
        meterReplacementFee: settings.meterReplacementFee || 0,
        meterInsuranceDeposit: settings.meterInsuranceDeposit || 0,
        minMonthlyConsumptionKwh: settings.minMonthlyConsumptionKwh || 0,
        readingCycleIntervalDays: settings.readingCycleIntervalDays || 10,
        readingCycleMode: settings.readingCycleMode || 'decadal',
        touEnabled: settings.touEnabled || false,
        peakMultiplier: settings.peakMultiplier || 1.25,
        peakHoursStart: settings.peakHoursStart || '18:00',
        peakHoursEnd: settings.peakHoursEnd || '23:00',
        currency: settings.currency || 'ر.ي',
        stationName: settings.stationName || '',
        updatedAt: new Date().toISOString()
      }), { merge: true });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/global');
  }
}

/**
 * Deletes any extra/redundant station profile documents in Firestore, ensuring that only
 * the single authoritative fixed document `stationProfile/identity` exists.
 */
export async function cleanupExtraneousStationProfileDocuments(): Promise<number> {
  let deletedCount = 0;
  try {
    const profileSnap = await getDocs(collection(db, 'stationProfile'));
    for (const d of profileSnap.docs) {
      if (d.id !== 'identity') {
        await deleteDoc(doc(db, 'stationProfile', d.id));
        deletedCount++;
      }
    }

    try {
      const historySnap = await getDocs(collection(db, 'stationProfileHistory'));
      for (const d of historySnap.docs) {
        await deleteDoc(doc(db, 'stationProfileHistory', d.id));
        deletedCount++;
      }
    } catch (e) {
      // stationProfileHistory might not exist or be empty
    }

    if (deletedCount > 0) {
      console.log(`[Firestore Database] Cleaned up ${deletedCount} redundant station profile documents. Only 'stationProfile/identity' remains.`);
    }
  } catch (err) {
    console.warn('[Firestore Database] Notice while cleaning extraneous station profile documents:', err);
  }
  return deletedCount;
}

/**
 * Updates the single fixed station directory and profile document in Firestore database in-place (Edit operation, not Add).
 */
export async function updateStationDirectoryInDatabase(stationData: Partial<SystemSettings>, fullSettings: SystemSettings) {
  try {
    const batch = writeBatch(db);
    const mergedSettings = { ...fullSettings, ...stationData };

    // 1. Edit the single fixed global settings document in Firestore
    const sRef = doc(db, 'settings', 'global');
    batch.set(sRef, cleanForFirestore(mergedSettings), { merge: true });

    // 2. Edit the single fixed station profile document 'stationProfile/identity' in Firestore (in-place modification)
    const pRef = doc(db, 'stationProfile', 'identity');
    batch.set(pRef, cleanForFirestore({
      stationName: mergedSettings.stationName || '',
      stationNameEn: mergedSettings.stationNameEn || '',
      stationCode: mergedSettings.stationCode || '',
      ownerName: mergedSettings.ownerName || '',
      ownerNameEn: mergedSettings.ownerNameEn || '',
      commercialRegister: mergedSettings.commercialRegister || '',
      taxNumber: mergedSettings.taxNumber || '',
      licenseNumber: mergedSettings.licenseNumber || '',
      licenseIssueDate: mergedSettings.licenseIssueDate || '',
      licenseExpiryDate: mergedSettings.licenseExpiryDate || '',
      stationType: mergedSettings.stationType || '',
      stationCapacityKw: mergedSettings.stationCapacityKw || 0,
      transformerCapacityKva: mergedSettings.transformerCapacityKva || 0,
      operationalStatus: mergedSettings.operationalStatus || 'active',
      phone: mergedSettings.phone || '',
      phone2: mergedSettings.phone2 || '',
      whatsapp: mergedSettings.whatsapp || '',
      whatsappChannel: mergedSettings.whatsappChannel || '',
      email: mergedSettings.email || '',
      websiteUrl: mergedSettings.websiteUrl || '',
      country: mergedSettings.country || 'الجمهورية اليمنية',
      city: mergedSettings.city || '',
      district: mergedSettings.district || '',
      address: mergedSettings.address || '',
      gpsCoordinates: mergedSettings.gpsCoordinates || '',
      coverageArea: mergedSettings.coverageArea || '',
      workingHours: mergedSettings.workingHours || '',
      generationHours: mergedSettings.generationHours || '',
      emergencyContactPerson: mergedSettings.emergencyContactPerson || '',
      bankAccounts: mergedSettings.bankAccounts || [],
      branches: mergedSettings.branches || [],
      logoUrl: mergedSettings.logoUrl || '',
      officialStampUrl: mergedSettings.officialStampUrl || '',
      managerSignatureUrl: mergedSettings.managerSignatureUrl || '',
      watermarkUrl: mergedSettings.watermarkUrl || '',
      logoText: mergedSettings.logoText || '',
      tagline: mergedSettings.tagline || '',
      notes: mergedSettings.notes || '',
      disclaimer: mergedSettings.disclaimer || '',
      currency: mergedSettings.currency || 'ر.ي',
      updatedAt: new Date().toISOString()
    }), { merge: true });

    await batch.commit();
    console.log('[Firestore Database] Single fixed station directory document successfully updated in database!');

    // Clean up any redundant profile docs in background
    cleanupExtraneousStationProfileDocuments().catch(() => {});
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'stationProfile/identity');
    throw err;
  }
}

export const saveStationDirectoryDirectlyToCloud = updateStationDirectoryInDatabase;

/**
 * Deletes any extra/redundant tariff documents in Firestore, ensuring that only
 * the single authoritative fixed document `tariffs/current` exists.
 */
export async function cleanupExtraneousTariffDocuments(): Promise<number> {
  let deletedCount = 0;
  try {
    // 1. Clean extraneous documents in tariffs collection (keep only 'current')
    const tariffsSnap = await getDocs(collection(db, 'tariffs'));
    for (const d of tariffsSnap.docs) {
      if (d.id !== 'current') {
        await deleteDoc(doc(db, 'tariffs', d.id));
        deletedCount++;
      }
    }

    // 2. Clean any historical tariff documents in tariffsHistory
    try {
      const historySnap = await getDocs(collection(db, 'tariffsHistory'));
      for (const d of historySnap.docs) {
        await deleteDoc(doc(db, 'tariffsHistory', d.id));
        deletedCount++;
      }
    } catch (e) {
      // tariffsHistory might not exist or be empty
    }

    if (deletedCount > 0) {
      console.log(`[Firestore Database] Cleaned up ${deletedCount} redundant tariff documents. Only 'tariffs/current' remains.`);
    }
  } catch (err) {
    console.warn('[Firestore Database] Notice while cleaning extraneous tariff documents:', err);
  }
  return deletedCount;
}

/**
 * Updates the single fixed electricity tariffs document in Firestore database in-place (Edit operation, not Add).
 */
export async function updateTariffInDatabase(tariffsData: Partial<SystemSettings>, fullSettings?: SystemSettings) {
  try {
    const batch = writeBatch(db);

    // 1. Edit the single fixed global settings document in Firestore
    const sRef = doc(db, 'settings', 'global');
    if (fullSettings) {
      batch.set(sRef, cleanForFirestore({ ...fullSettings, ...tariffsData }), { merge: true });
    } else {
      batch.set(sRef, cleanForFirestore(tariffsData), { merge: true });
    }

    // 2. Edit the single fixed tariffs document 'tariffs/current' in Firestore (in-place modification)
    const tRef = doc(db, 'tariffs', 'current');
    batch.set(tRef, cleanForFirestore({
      ...tariffsData,
      updatedAt: new Date().toISOString()
    }), { merge: true });

    await batch.commit();
    console.log('[Firestore Database] Single fixed electricity tariffs document successfully updated in database!');

    // 3. Clean up any other redundant tariff documents in background to guarantee single-doc state
    cleanupExtraneousTariffDocuments().catch(() => {});
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'tariffs/current');
    throw err;
  }
}

// Backward compatible alias
export const saveTariffsDirectlyToCloud = updateTariffInDatabase;

/**
 * Updates thermal receipt and invoice printer settings directly in Firestore database in-place (Edit operation).
 */
export async function updateThermalSettingsInDatabase(thermalSettings: Partial<SystemSettings>, fullSettings: SystemSettings) {
  try {
    const mergedSettings = { ...fullSettings, ...thermalSettings };
    const sRef = doc(db, 'settings', 'global');
    await setDoc(sRef, cleanForFirestore(mergedSettings), { merge: true });
    
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('voltera_cache_settings', JSON.stringify(mergedSettings));
        const cachedStr = localStorage.getItem('voltera_cached_cloud_data');
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          cached.settings = mergedSettings;
          localStorage.setItem('voltera_cached_cloud_data', JSON.stringify(cached));
        }
      } catch (e) {}
    }
    console.log('[Firestore Database] Thermal receipt settings successfully updated in database!');
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/global');
    throw err;
  }
}

/**
 * Updates zones and central transformer configurations directly in Firestore database in-place.
 */
export async function updateZonesAndTransformersInDatabase(zonesData: { zones: string[]; transformers: any[] }, fullSettings: SystemSettings) {
  try {
    const mergedSettings = { ...fullSettings, ...zonesData };
    const sRef = doc(db, 'settings', 'global');
    await setDoc(sRef, cleanForFirestore(mergedSettings), { merge: true });

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('voltera_cache_settings', JSON.stringify(mergedSettings));
        const cachedStr = localStorage.getItem('voltera_cached_cloud_data');
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          cached.settings = mergedSettings;
          localStorage.setItem('voltera_cached_cloud_data', JSON.stringify(cached));
        }
      } catch (e) {}
    }
    console.log('[Firestore Database] Zones & Transformers successfully updated in database!');
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/global');
    throw err;
  }
}

export async function syncAuditLogToCloud(log: AuditLog) {
  try {
    if (!log) return;
    const safeId = (log.id && typeof log.id === 'string' && log.id.trim() !== '' && log.id !== 'undefined')
      ? log.id
      : `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    const safeLog: AuditLog = {
      ...log,
      id: safeId,
      userId: log.userId || 'admin',
      username: log.username || 'admin',
      action: log.action || 'إجراء نظام',
      details: log.details || '',
      timestamp: log.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    
    const lRef = doc(db, 'auditLogs', safeId);
    await setDoc(lRef, cleanForFirestore(safeLog), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `auditLogs/${log?.id || 'unknown'}`);
  }
}

export async function syncInventoryItemToCloud(item: InventoryItem) {
  try {
    if (!item || !item.id) return;
    const iRef = doc(db, 'inventory', item.id);
    await setDoc(iRef, cleanForFirestore(item), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `inventory/${item?.id || 'unknown'}`);
  }
}

export async function syncBulkInventoryToCloud(items: InventoryItem[]) {
  try {
    await commitCollectionInChunks('inventory', items);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'inventory/bulk');
  }
}

export async function syncInventoryTxToCloud(tx: InventoryTransaction) {
  try {
    if (!tx || !tx.id) return;
    const txRef = doc(db, 'inventoryTransactions', tx.id);
    await setDoc(txRef, cleanForFirestore(tx), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `inventoryTransactions/${tx?.id || 'unknown'}`);
  }
}

export async function syncBulkInventoryTxsToCloud(txs: InventoryTransaction[]) {
  try {
    await commitCollectionInChunks('inventoryTransactions', txs);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'inventoryTransactions/bulk');
  }
}

export async function syncWarehousesToCloud(warehouses: string[]) {
  try {
    const wRef = doc(db, 'settings', 'warehouses');
    await setDoc(wRef, { list: warehouses, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/warehouses');
  }
}

export function subscribeToWarehousesFromCloud(callback: (warehouses: string[]) => void) {
  return onSnapshot(doc(db, 'settings', 'warehouses'), (snap) => {
    if (snap.exists() && Array.isArray(snap.data().list)) {
      callback(snap.data().list);
    }
  }, (err) => handleFirestoreError(err, OperationType.GET, 'settings/warehouses'));
}

export async function syncExpenseToCloud(exp: Expense) {
  try {
    if (!exp || !exp.id) return;
    const expRef = doc(db, 'expenses', exp.id);
    await setDoc(expRef, cleanForFirestore(exp), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `expenses/${exp?.id || 'unknown'}`);
  }
}

export async function syncPurchaseToCloud(pur: Purchase) {
  try {
    if (!pur || !pur.id) return;
    const purRef = doc(db, 'purchases', pur.id);
    await setDoc(purRef, cleanForFirestore(pur), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `purchases/${pur?.id || 'unknown'}`);
  }
}

export async function syncJournalEntryToCloud(je: JournalEntry) {
  try {
    if (!je || !je.id) return;
    const jeRef = doc(db, 'manualJournalEntries', je.id);
    await setDoc(jeRef, cleanForFirestore(je), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `manualJournalEntries/${je?.id || 'unknown'}`);
  }
}

export async function syncTreasuryTransferToCloud(trf: TreasuryTransfer) {
  try {
    if (!trf || !trf.id) return;
    const trfRef = doc(db, 'treasuryTransfers', trf.id);
    await setDoc(trfRef, cleanForFirestore(trf), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `treasuryTransfers/${trf?.id || 'unknown'}`);
  }
}

export async function syncEmployeeToCloud(emp: Employee) {
  try {
    if (!emp || !emp.id) return;
    const empRef = doc(db, 'employees', emp.id);
    await setDoc(empRef, cleanForFirestore(emp), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `employees/${emp?.id || 'unknown'}`);
  }
}

export async function syncBulkEmployeesToCloud(employeesList: Employee[]) {
  try {
    await commitCollectionInChunks('employees', employeesList);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'employees/bulk');
  }
}

export async function syncEmployeeTxToCloud(tx: EmployeeTransaction) {
  try {
    if (!tx || !tx.id) return;
    const txRef = doc(db, 'employeeTxs', tx.id);
    await setDoc(txRef, cleanForFirestore(tx), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `employeeTxs/${tx?.id || 'unknown'}`);
  }
}

export async function syncSmsTemplateToCloud(template: SmsTemplate) {
  try {
    if (!template || !template.id) return;
    const tRef = doc(db, 'smsTemplates', template.id);
    await setDoc(tRef, cleanForFirestore({
      ...template,
      updatedAt: new Date().toISOString()
    }), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `smsTemplates/${template?.id || 'unknown'}`);
  }
}

export async function syncBulkSmsTemplatesToCloud(templatesList: SmsTemplate[]) {
  try {
    await commitCollectionInChunks('smsTemplates', templatesList);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'smsTemplates/bulk');
  }
}

export async function deleteSmsTemplateFromCloud(id: string) {
  try {
    await deleteDoc(doc(db, 'smsTemplates', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `smsTemplates/${id}`);
  }
}

export async function clearAllSmsTemplatesFromCloud() {
  try {
    const snap = await getDocs(collection(db, 'smsTemplates'));
    if (snap.empty) return;
    const batch = writeBatch(db);
    snap.docs.forEach(d => {
      batch.delete(d.ref);
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'smsTemplates/clearAll');
  }
}

export async function syncFailedSmsToCloud(item: FailedSmsItem) {
  try {
    const sRef = doc(db, 'failedSms', item.id);
    await setDoc(sRef, cleanForFirestore(item), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `failedSms/${item.id}`);
  }
}

export async function syncBulkFailedSmsToCloud(items: FailedSmsItem[]) {
  try {
    await commitCollectionInChunks('failedSms', items);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'failedSms/bulk');
  }
}

export async function deleteFailedSmsFromCloud(id: string, type?: 'reading' | 'payment') {
  try {
    // 1. Delete from failedSms collection if it exists
    try {
      await deleteDoc(doc(db, 'failedSms', id));
    } catch {
      // Document might not be in failedSms collection
    }

    // 2. Mark reading as smsSent: true in Firestore if it's a reading or unspecified
    if (!type || type === 'reading') {
      try {
        await updateDoc(doc(db, 'readings', id), { smsSent: true });
      } catch {
        // Document might not exist in readings (e.g. if it is a payment)
      }
    }

    // 3. Mark payment as smsSent: true in Firestore if it's a payment or unspecified
    if (!type || type === 'payment') {
      try {
        await updateDoc(doc(db, 'payments', id), { smsSent: true });
      } catch {
        // Document might not exist in payments (e.g. if it is a reading)
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `failedSms/${id}`);
  }
}

export async function clearAllFailedSmsFromCloud(items?: FailedSmsItem[]) {
  try {
    // 1. Delete all docs in failedSms collection
    const snap = await getDocs(collection(db, 'failedSms'));
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }

    // 2. Find and update all readings where smsSent is not true
    const readingsSnap = await getDocs(collection(db, 'readings'));
    const unsentReadings = readingsSnap.docs.filter(d => !d.data()?.smsSent);
    if (unsentReadings.length > 0) {
      const CHUNK = 400;
      for (let i = 0; i < unsentReadings.length; i += CHUNK) {
        const batch = writeBatch(db);
        unsentReadings.slice(i, i + CHUNK).forEach(d => {
          batch.update(d.ref, { smsSent: true });
        });
        await batch.commit();
      }
    }

    // 3. Find and update all payments where smsSent is not true
    const paymentsSnap = await getDocs(collection(db, 'payments'));
    const unsentPayments = paymentsSnap.docs.filter(d => !d.data()?.smsSent);
    if (unsentPayments.length > 0) {
      const CHUNK = 400;
      for (let i = 0; i < unsentPayments.length; i += CHUNK) {
        const batch = writeBatch(db);
        unsentPayments.slice(i, i + CHUNK).forEach(d => {
          batch.update(d.ref, { smsSent: true });
        });
        await batch.commit();
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'failedSms/clearAll');
  }
}

export async function deleteExpenseFromCloud(id: string) {
  try {
    await deleteDoc(doc(db, 'expenses', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `expenses/${id}`);
  }
}

export async function deletePurchaseFromCloud(id: string) {
  try {
    await deleteDoc(doc(db, 'purchases', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `purchases/${id}`);
  }
}

export async function deleteTreasuryTransferFromCloud(id: string) {
  try {
    await deleteDoc(doc(db, 'treasuryTransfers', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `treasuryTransfers/${id}`);
  }
}

export async function deleteJournalEntryFromCloud(id: string) {
  try {
    await deleteDoc(doc(db, 'manualJournalEntries', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `manualJournalEntries/${id}`);
  }
}

export async function deleteEmployeeTxFromCloud(id: string) {
  try {
    await deleteDoc(doc(db, 'employeeTxs', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `employeeTxs/${id}`);
  }
}

export async function deleteConnectionFromCloud(id: string) {
  try {
    await deleteDoc(doc(db, 'connections', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `connections/${id}`);
  }
}

export async function deleteEmployeeFromCloud(id: string) {
  try {
    await deleteDoc(doc(db, 'employees', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `employees/${id}`);
  }
}

export async function deleteTechRequestFromCloud(id: string) {
  try {
    await deleteDoc(doc(db, 'techRequests', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `techRequests/${id}`);
  }
}

export async function deleteInventoryItemFromCloud(id: string) {
  try {
    await deleteDoc(doc(db, 'inventory', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `inventory/${id}`);
  }
}

// Helper to commit array of items in Firestore batches (max 400 items per batch)
export async function commitCollectionInChunks<T extends { id?: string }>(collectionName: string, items: T[]) {
  if (!Array.isArray(items) || items.length === 0) return;
  const CHUNK_SIZE = 400;
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const item of chunk) {
      if (!item) continue;
      const docId = item.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const cleaned = cleanForFirestore({ ...item, id: docId });
      batch.set(doc(db, collectionName, docId), cleaned, { merge: true });
    }
    await batch.commit();
  }
}

// Database Snapshot Management in Firestore
export async function fetchSnapshotsFromDatabase(): Promise<DbSnapshotItem[]> {
  try {
    const snap = await getDocs(collection(db, 'databaseSnapshots'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as DbSnapshotItem));
  } catch (err) {
    console.warn('[Firestore Snapshots Fetch Error]:', err);
    return [];
  }
}

export async function createSnapshotInDatabase(
  name: string, 
  payload: any, 
  metadata?: { isAuto?: boolean; intervalHours?: number }
): Promise<DbSnapshotItem | null> {
  try {
    // Sanitize and deduplicate payload before saving snapshot to avoid data bloat
    const { cleanedPayload } = sanitizeAndDeduplicateDatabasePayload(payload);
    
    const snapId = `snap-${Date.now()}`;
    const snapItem: DbSnapshotItem = {
      id: snapId,
      name,
      date: new Date().toISOString().substring(0, 16).replace('T', ' '),
      subscribersCount: cleanedPayload.subscribers?.length || 0,
      readingsCount: cleanedPayload.readings?.length || 0,
      paymentsCount: cleanedPayload.payments?.length || 0,
      isAuto: metadata?.isAuto || false,
      intervalHours: metadata?.intervalHours,
      type: metadata?.isAuto ? 'auto' : 'manual',
      data: cleanedPayload,
    };
    await setDoc(doc(db, 'databaseSnapshots', snapId), cleanForFirestore(snapItem));
    return snapItem;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'databaseSnapshots');
    return null;
  }
}

/**
 * Creates a clean, deduplicated periodic auto-snapshot and safely prunes older auto-snapshots
 */
export async function createAutoDatabaseSnapshot(
  dbState: any, 
  intervalHours: number, 
  keepCount: number = 30
): Promise<DbSnapshotItem | null> {
  try {
    const timestamp = new Date();
    const timeStr = timestamp.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const dateStr = timestamp.toLocaleDateString('ar-EG');
    const name = `نقطة استعادة دورية تلقائية (كل ${intervalHours} س) - ${dateStr} ${timeStr}`;

    const snap = await createSnapshotInDatabase(name, dbState, { isAuto: true, intervalHours });
    if (snap) {
      // Keep only recent auto-snapshots to keep storage optimized and clean
      await pruneOldAutoSnapshotsFromDatabase(keepCount);
    }
    return snap;
  } catch (err) {
    console.error('[Firestore Auto Snapshot Error]:', err);
    return null;
  }
}

/**
 * Prunes older auto-generated snapshots while preserving all manual user-created snapshots
 */
export async function pruneOldAutoSnapshotsFromDatabase(keepCount: number = 30): Promise<number> {
  try {
    const snaps = await fetchSnapshotsFromDatabase();
    const autoSnaps = snaps.filter(s => s.isAuto || s.type === 'auto' || s.name.includes('تلقائية') || s.name.includes('دورية'));
    if (autoSnaps.length > keepCount) {
      // Sort newest first
      autoSnaps.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
      const toDelete = autoSnaps.slice(keepCount);
      let deleted = 0;
      for (const item of toDelete) {
        await deleteDoc(doc(db, 'databaseSnapshots', item.id));
        deleted++;
      }
      return deleted;
    }
    return 0;
  } catch (err) {
    console.warn('[Firestore Auto Snapshots Prune Warning]:', err);
    return 0;
  }
}

export async function restoreSnapshotFromDatabase(snapshotId: string): Promise<any | null> {
  try {
    const docSnap = await getDoc(doc(db, 'databaseSnapshots', snapshotId));
    if (docSnap.exists()) {
      const data = docSnap.data().data;
      if (data) {
        const { cleanedPayload } = sanitizeAndDeduplicateDatabasePayload(data);
        return cleanedPayload;
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `databaseSnapshots/${snapshotId}`);
  }
  return null;
}

export async function deleteSnapshotFromDatabase(snapshotId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'databaseSnapshots', snapshotId));
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `databaseSnapshots/${snapshotId}`);
    return false;
  }
}

export async function optimizeAllSnapshotsInDatabase(): Promise<{ optimizedCount: number; totalDeduplicated: number }> {
  try {
    const snaps = await fetchSnapshotsFromDatabase();
    let optimizedCount = 0;
    let totalDeduplicated = 0;

    for (const snap of snaps) {
      if (snap.data) {
        const { cleanedPayload, stats } = sanitizeAndDeduplicateDatabasePayload(snap.data);
        if (stats.totalRemoved > 0) {
          totalDeduplicated += stats.totalRemoved;
          await setDoc(doc(db, 'databaseSnapshots', snap.id), {
            ...snap,
            subscribersCount: cleanedPayload.subscribers?.length || 0,
            readingsCount: cleanedPayload.readings?.length || 0,
            paymentsCount: cleanedPayload.payments?.length || 0,
            data: cleanedPayload,
          }, { merge: true });
          optimizedCount++;
        }
      }
    }

    return { optimizedCount, totalDeduplicated };
  } catch (err) {
    console.error('[Firestore Snapshots Optimize Error]:', err);
    return { optimizedCount: 0, totalDeduplicated: 0 };
  }
}

export async function restoreFullDatabaseFromFile(payload: any): Promise<{ success: boolean; stats: any }> {
  try {
    // 1. Sanitize & deduplicate all data before restoring to Firestore
    const { cleanedPayload, stats } = sanitizeAndDeduplicateDatabasePayload(payload);

    // 2. Commit all collections in chunks
    if (Array.isArray(cleanedPayload.subscribers)) {
      await commitCollectionInChunks('subscribers', cleanedPayload.subscribers);
    }
    if (Array.isArray(cleanedPayload.readings)) {
      await commitCollectionInChunks('readings', cleanedPayload.readings);
    }
    if (Array.isArray(cleanedPayload.payments)) {
      await commitCollectionInChunks('payments', cleanedPayload.payments);
    }
    if (Array.isArray(cleanedPayload.users)) {
      await commitCollectionInChunks('users', cleanedPayload.users);
    }
    if (Array.isArray(cleanedPayload.inventory)) {
      await commitCollectionInChunks('inventory', cleanedPayload.inventory);
    }
    if (Array.isArray(cleanedPayload.inventoryTransactions)) {
      await commitCollectionInChunks('inventoryTransactions', cleanedPayload.inventoryTransactions);
    }
    if (Array.isArray(cleanedPayload.expenses)) {
      await commitCollectionInChunks('expenses', cleanedPayload.expenses);
    }
    if (Array.isArray(cleanedPayload.purchases)) {
      await commitCollectionInChunks('purchases', cleanedPayload.purchases);
    }
    if (Array.isArray(cleanedPayload.treasuryTransfers)) {
      await commitCollectionInChunks('treasuryTransfers', cleanedPayload.treasuryTransfers);
    }
    if (Array.isArray(cleanedPayload.manualJournalEntries)) {
      await commitCollectionInChunks('manualJournalEntries', cleanedPayload.manualJournalEntries);
    }
    if (Array.isArray(cleanedPayload.employees)) {
      await commitCollectionInChunks('employees', cleanedPayload.employees);
    }
    if (Array.isArray(cleanedPayload.connections)) {
      await commitCollectionInChunks('connections', cleanedPayload.connections);
    }
    if (Array.isArray(cleanedPayload.smsTemplates)) {
      await commitCollectionInChunks('smsTemplates', cleanedPayload.smsTemplates);
    }
    if (Array.isArray(cleanedPayload.techRequests)) {
      await commitCollectionInChunks('techRequests', cleanedPayload.techRequests);
    }
    if (Array.isArray(cleanedPayload.auditLogs)) {
      await commitCollectionInChunks('auditLogs', cleanedPayload.auditLogs);
    }
    if (cleanedPayload.settings) {
      await setDoc(doc(db, 'settings', 'global'), cleanedPayload.settings, { merge: true });
    }

    return { success: true, stats };
  } catch (err) {
    console.error('[Firestore Full Restore Error]:', err);
    return { success: false, stats: null };
  }
}

// Paginated Helper Placeholders
export async function loadPaginatedReadings(pageSize = 100) {
  const data = await loadAllCloudData();
  return { readings: data.readings.slice(0, pageSize), lastDoc: null };
}

export async function loadPaginatedPayments(pageSize = 100) {
  const data = await loadAllCloudData();
  return { payments: data.payments.slice(0, pageSize), lastDoc: null };
}

export async function loadPaginatedAuditLogs(pageSize = 100) {
  const data = await loadAllCloudData();
  return { logs: data.auditLogs.slice(0, pageSize), lastDoc: null };
}

export async function fetchUsersFromCloud(): Promise<User[]> {
  const data = await loadAllCloudData();
  return data.users;
}

export async function fetchSubscribersFromCloud(): Promise<Subscriber[]> {
  const data = await loadAllCloudData();
  return data.subscribers;
}

export async function deleteUserFromCloud(id: string) {
  try {
    await deleteDoc(doc(db, 'users', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${id}`);
  }
}

export async function syncBulkSubscribersToCloud(subscribersList: Subscriber[]) {
  try {
    await commitCollectionInChunks('subscribers', subscribersList);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'subscribers/bulk');
  }
}

export async function updateCachedCloudSubscribers(subscribersList: Subscriber[]) {
  await syncBulkSubscribersToCloud(subscribersList);
}

export async function syncBulkReadingsToCloud(readingsList: MeterReading[]) {
  try {
    await commitCollectionInChunks('readings', readingsList);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'readings/bulk');
  }
}

export async function syncBulkPaymentsToCloud(paymentsList: Payment[]) {
  try {
    await commitCollectionInChunks('payments', paymentsList);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'payments/bulk');
  }
}

export async function syncConnectionToCloud(conn: ServiceConnection) {
  try {
    await setDoc(doc(db, 'connections', conn.id), cleanForFirestore(conn), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `connections/${conn.id}`);
  }
}

export async function syncTechRequestToCloud(req: TechnicalRequest) {
  try {
    await setDoc(doc(db, 'techRequests', req.id), cleanForFirestore(req), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `techRequests/${req.id}`);
  }
}

export async function deleteInventoryTxFromCloud(id: string) {
  try {
    await deleteDoc(doc(db, 'inventoryTransactions', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `inventoryTransactions/${id}`);
  }
}

export async function clearAuditLogsFromCloud() {
  try {
    const snap = await getDocs(collection(db, 'auditLogs'));
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'auditLogs');
  }
}

export async function clearAllOperationalDataFromCloud() {
  await clearAllTestDataFromCloud();
}

export async function syncNotificationStateToCloud(state: any) {
  try {
    await setDoc(doc(db, 'settings', 'notification_state'), state, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/notification_state');
  }
}

export function subscribeNotificationStateFromCloud(callback: (state: any) => void) {
  return onSnapshot(doc(db, 'settings', 'notification_state'), (snap) => {
    if (snap.exists()) callback(snap.data());
  }, (err) => handleFirestoreError(err, OperationType.GET, 'settings/notification_state'));
}

export async function syncSecurityPoliciesToCloud(policies: any) {
  try {
    await setDoc(doc(db, 'settings', 'security_policies'), policies, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/security_policies');
  }
}

export function subscribeSecurityPoliciesFromCloud(callback: (policies: any) => void) {
  return onSnapshot(doc(db, 'settings', 'security_policies'), (snap) => {
    if (snap.exists()) callback(snap.data());
  }, (err) => handleFirestoreError(err, OperationType.GET, 'settings/security_policies'));
}

export function subscribeToTechRequestsFromCloud(callback: (list: TechnicalRequest[]) => void) {
  return onSnapshot(collection(db, 'techRequests'), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as TechnicalRequest)));
  }, (err) => handleFirestoreError(err, OperationType.GET, 'techRequests'));
}

export function subscribeToConnectionsFromCloud(callback: (list: ServiceConnection[]) => void) {
  return onSnapshot(collection(db, 'connections'), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceConnection)));
  }, (err) => handleFirestoreError(err, OperationType.GET, 'connections'));
}

export function subscribeToEmployeesFromCloud(callback: (list: Employee[]) => void) {
  return onSnapshot(collection(db, 'employees'), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Employee)));
  }, (err) => handleFirestoreError(err, OperationType.GET, 'employees'));
}

export function subscribeToEmployeeTxsFromCloud(callback: (list: EmployeeTransaction[]) => void) {
  return onSnapshot(collection(db, 'employeeTxs'), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as EmployeeTransaction)));
  }, (err) => handleFirestoreError(err, OperationType.GET, 'employeeTxs'));
}

export function subscribeToPartnersFromCloud(callback: (list: Partner[]) => void) {
  return onSnapshot(collection(db, 'partners'), (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Partner));
    callback(list);
  }, (err) => handleFirestoreError(err, OperationType.GET, 'partners'));
}

export function subscribeToPartnerTransactionsFromCloud(callback: (list: PartnerTransaction[]) => void) {
  return onSnapshot(collection(db, 'partnerTransactions'), (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as PartnerTransaction));
    callback(list);
  }, (err) => handleFirestoreError(err, OperationType.GET, 'partnerTransactions'));
}

export function subscribeToProfitDistributionsFromCloud(callback: (list: ProfitDistributionBatch[]) => void) {
  return onSnapshot(collection(db, 'profitDistributions'), (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ProfitDistributionBatch));
    callback(list);
  }, (err) => handleFirestoreError(err, OperationType.GET, 'profitDistributions'));
}

export async function syncPartnerToCloud(partner: Partner) {
  try {
    if (!partner || !partner.id) return;
    await setDoc(doc(db, 'partners', partner.id), cleanForFirestore(partner), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `partners/${partner?.id || 'unknown'}`);
  }
}

export async function syncBulkPartnersToCloud(partnersList: Partner[]) {
  try {
    await commitCollectionInChunks('partners', partnersList);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'partners/bulk');
  }
}

export async function syncBulkPartnerTransactionsToCloud(txsList: PartnerTransaction[]) {
  try {
    await commitCollectionInChunks('partnerTransactions', txsList);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'partnerTransactions/bulk');
  }
}

export async function syncBulkProfitDistributionsToCloud(batchesList: ProfitDistributionBatch[]) {
  try {
    await commitCollectionInChunks('profitDistributions', batchesList);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'profitDistributions/bulk');
  }
}

export async function deletePartnerFromCloud(id: string) {
  try {
    if (!id) return;
    await deleteDoc(doc(db, 'partners', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `partners/${id}`);
  }
}

export async function syncPartnerTransactionToCloud(tx: PartnerTransaction) {
  try {
    if (!tx || !tx.id) return;
    await setDoc(doc(db, 'partnerTransactions', tx.id), cleanForFirestore(tx), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `partnerTransactions/${tx?.id || 'unknown'}`);
  }
}

export async function deletePartnerTransactionFromCloud(id: string) {
  try {
    if (!id) return;
    await deleteDoc(doc(db, 'partnerTransactions', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `partnerTransactions/${id}`);
  }
}

export async function syncProfitDistributionToCloud(batch: ProfitDistributionBatch) {
  try {
    if (!batch || !batch.id) return;
    await setDoc(doc(db, 'profitDistributions', batch.id), cleanForFirestore(batch), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `profitDistributions/${batch?.id || 'unknown'}`);
  }
}

export async function deleteProfitDistributionFromCloud(id: string) {
  try {
    if (!id) return;
    await deleteDoc(doc(db, 'profitDistributions', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `profitDistributions/${id}`);
  }
}

