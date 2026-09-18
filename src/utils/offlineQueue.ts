/**
 * Voltera Offline-First Queue Manager (IndexedDB with Self-Healing & LocalStorage Fallback)
 * 
 * Manages field collector operations (meter readings, receipts, subscriber updates)
 * in a local IndexedDB queue when offline or in weak network coverage areas.
 * Automatically handles database closure, tab visibility transitions, and fallback
 * to localStorage if IndexedDB is blocked or in a closing state.
 */

import { 
  syncReadingToCloud, deleteReadingFromCloud, 
  syncPaymentToCloud, deletePaymentFromCloud, 
  syncSubscriberToCloud, deleteSubscriberFromCloud,
  syncExpenseToCloud, deleteExpenseFromCloud,
  syncJournalEntryToCloud, deleteJournalEntryFromCloud,
  syncTreasuryTransferToCloud, deleteTreasuryTransferFromCloud,
  syncEmployeeTxToCloud, syncInventoryItemToCloud 
} from '../lib/database';

export interface QueueItem {
  id: string; // Unique queue identifier
  entityId: string; // ID of the reading, payment, or subscriber
  type: 'reading' | 'payment' | 'subscriber' | 'expense' | 'journal' | 'transfer' | 'employee_tx' | 'inventory';
  action: 'create' | 'update' | 'delete';
  payload: any;
  timestamp: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  retryCount: number;
  lastError?: string;
}

const DB_NAME = 'VolteraOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'operation_queue';
const LS_FALLBACK_KEY = 'voltera_offline_queue_backup';

let dbInstance: IDBDatabase | null = null;
let isOpening = false;
let openPromise: Promise<IDBDatabase | null> | null = null;
let isProcessingQueue = false;
const listeners = new Set<(stats: { pending: number; syncing: number; completed: number; failed: number; items: QueueItem[] }) => void>();

// --- LOCALSTORAGE FALLBACK HELPERS ---
function getLSQueue(): QueueItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LS_FALLBACK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLSQueue(items: QueueItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('[Offline Queue] LocalStorage quota exceeded or unavailable:', e);
  }
}

/**
 * Safely reset and clear the database instance reference
 */
function resetDBInstance() {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {
      // Ignore close errors
    }
    dbInstance = null;
  }
  openPromise = null;
  isOpening = false;
}

/**
 * Initialize or safely get IndexedDB Database Instance with self-healing reconnection
 */
async function getDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return null;
  }

  // If already open and valid, return it immediately without disruptive test transactions
  if (dbInstance) {
    return dbInstance;
  }

  if (openPromise) {
    return openPromise;
  }

  openPromise = new Promise((resolve) => {
    isOpening = true;
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        try {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('status', 'status', { unique: false });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('type', 'type', { unique: false });
          }
        } catch (upgradeErr) {
          console.warn('[IndexedDB] Upgrade notice:', upgradeErr);
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        dbInstance = db;
        isOpening = false;
        openPromise = null;

        // Auto-cleanup on database lifecycle events
        db.onversionchange = () => {
          console.warn('[IndexedDB] Database version change requested. Closing connection.');
          resetDBInstance();
        };

        db.onclose = () => {
          dbInstance = null;
          openPromise = null;
        };

        db.onerror = () => {
          resetDBInstance();
        };

        resolve(db);
      };

      request.onerror = (event) => {
        isOpening = false;
        openPromise = null;
        resolve(null);
      };

      request.onblocked = () => {
        isOpening = false;
        openPromise = null;
        resolve(null);
      };
    } catch {
      isOpening = false;
      openPromise = null;
      resolve(null);
    }
  });

  return openPromise;
}

/**
 * Add a field operation to the offline queue (IndexedDB + LocalStorage fallback)
 */
export async function enqueueOfflineOperation(
  type: QueueItem['type'],
  action: QueueItem['action'],
  payload: any,
  entityId?: string
): Promise<QueueItem> {
  const id = `q-${type}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const itemEntityId = entityId || payload?.id || id;

  const item: QueueItem = {
    id,
    entityId: itemEntityId,
    type,
    action,
    payload,
    timestamp: Date.now(),
    status: 'pending',
    retryCount: 0
  };

  // Always update LocalStorage backup first
  const lsItems = getLSQueue();
  const existingLsIndex = lsItems.findIndex(
    q => q.entityId === itemEntityId && q.type === type && (q.status === 'pending' || q.status === 'failed')
  );
  if (existingLsIndex >= 0) {
    lsItems[existingLsIndex] = { ...lsItems[existingLsIndex], payload, timestamp: Date.now(), status: 'pending', retryCount: 0 };
  } else {
    lsItems.push(item);
  }
  saveLSQueue(lsItems);

  // Try saving to IndexedDB if available
  try {
    const db = await getDB();
    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);

          const index = store.index('timestamp');
          const getAllReq = index.getAll();

          getAllReq.onsuccess = () => {
            try {
              const existing = (getAllReq.result as QueueItem[]).find(
                q => q.entityId === itemEntityId && q.type === type && (q.status === 'pending' || q.status === 'failed')
              );

              if (existing) {
                existing.payload = payload;
                existing.timestamp = Date.now();
                existing.status = 'pending';
                existing.retryCount = 0;
                store.put(existing);
              } else {
                store.add(item);
              }
            } catch {
              // Ignore inner write errors
            }
          };

          tx.oncomplete = () => resolve();
          tx.onerror = () => {
            resetDBInstance();
            resolve();
          };
        } catch {
          resetDBInstance();
          resolve();
        }
      });
    }
  } catch (err) {
    console.warn('[Offline Queue] IndexedDB enqueue notice, used localStorage fallback:', err);
  }

  notifyListeners();

  // If currently online, trigger auto-process
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    processOfflineQueue().catch(() => {});
  }

  return item;
}

/**
 * Get all items stored in the offline queue (combining IndexedDB & LocalStorage fallback)
 */
export async function getOfflineQueueItems(): Promise<QueueItem[]> {
  const lsItems = getLSQueue();
  try {
    const db = await getDB();
    if (!db) {
      return lsItems.sort((a, b) => a.timestamp - b.timestamp);
    }

    const idbItems = await new Promise<QueueItem[]>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();

        req.onsuccess = () => {
          resolve((req.result as QueueItem[]) || []);
        };

        req.onerror = () => {
          resetDBInstance();
          resolve([]);
        };
      } catch {
        resetDBInstance();
        resolve([]);
      }
    });

    // Merge IndexedDB and LocalStorage items by id
    const map = new Map<string, QueueItem>();
    lsItems.forEach(item => map.set(item.id, item));
    idbItems.forEach(item => map.set(item.id, item));

    return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
  } catch (err) {
    console.warn('[Offline Queue] Using LocalStorage items due to IndexedDB notice:', err);
    return lsItems.sort((a, b) => a.timestamp - b.timestamp);
  }
}

/**
 * Get quick count stats for pending/syncing/completed queue items
 */
export async function getOfflineQueueStats() {
  const items = await getOfflineQueueItems();
  const pending = items.filter(i => i.status === 'pending').length;
  const syncing = items.filter(i => i.status === 'syncing').length;
  const completed = items.filter(i => i.status === 'completed').length;
  const failed = items.filter(i => i.status === 'failed').length;
  return { pending, syncing, completed, failed, items };
}

/**
 * Remove an item from the offline queue
 */
export async function removeFromOfflineQueue(id: string): Promise<void> {
  // 1. Remove from LocalStorage
  const lsItems = getLSQueue().filter(i => i.id !== id);
  saveLSQueue(lsItems);

  // 2. Remove from IndexedDB if available
  try {
    const db = await getDB();
    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.delete(id);
          tx.oncomplete = () => resolve();
          tx.onerror = () => {
            resetDBInstance();
            resolve();
          };
        } catch {
          resetDBInstance();
          resolve();
        }
      });
    }
  } catch {
    // Ignore error
  }

  notifyListeners();
}

/**
 * Clear all completed items from the offline queue
 */
export async function clearCompletedOfflineItems(): Promise<void> {
  // 1. Clear from LocalStorage
  const lsItems = getLSQueue().filter(i => i.status !== 'completed');
  saveLSQueue(lsItems);

  // 2. Clear from IndexedDB
  try {
    const db = await getDB();
    if (db) {
      const items = await getOfflineQueueItems();
      const completed = items.filter(i => i.status === 'completed');
      if (completed.length > 0) {
        await new Promise<void>((resolve) => {
          try {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            for (const item of completed) {
              store.delete(item.id);
            }
            tx.oncomplete = () => resolve();
            tx.onerror = () => {
              resetDBInstance();
              resolve();
            };
          } catch {
            resetDBInstance();
            resolve();
          }
        });
      }
    }
  } catch {
    // Ignore error
  }

  notifyListeners();
}

/**
 * Clear the entire offline queue
 */
export async function clearEntireOfflineQueue(): Promise<void> {
  saveLSQueue([]);
  try {
    const db = await getDB();
    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.clear();
          tx.oncomplete = () => resolve();
          tx.onerror = () => {
            resetDBInstance();
            resolve();
          };
        } catch {
          resetDBInstance();
          resolve();
        }
      });
    }
  } catch {
    // Ignore error
  }
  notifyListeners();
}

/**
 * Update an item state inside the queue (LocalStorage + IndexedDB)
 */
async function updateQueueItemState(item: QueueItem): Promise<void> {
  // 1. Update in LocalStorage
  const lsItems = getLSQueue();
  const idx = lsItems.findIndex(i => i.id === item.id);
  if (idx >= 0) {
    lsItems[idx] = item;
  } else {
    lsItems.push(item);
  }
  saveLSQueue(lsItems);

  // 2. Update in IndexedDB if available
  try {
    const db = await getDB();
    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.put(item);
          tx.oncomplete = () => resolve();
          tx.onerror = () => {
            resetDBInstance();
            resolve();
          };
        } catch {
          resetDBInstance();
          resolve();
        }
      });
    }
  } catch {
    // Ignore error
  }
}

/**
 * Send an individual queue item to Firebase Firestore Database
 */
async function sendItemToApi(item: QueueItem): Promise<boolean> {
  try {
    switch (item.type) {
      case 'reading':
        if (item.action === 'delete') {
          await deleteReadingFromCloud(item.entityId);
        } else {
          await syncReadingToCloud(item.payload);
        }
        break;
      case 'payment':
        if (item.action === 'delete') {
          await deletePaymentFromCloud(item.entityId);
        } else {
          await syncPaymentToCloud(item.payload);
        }
        break;
      case 'subscriber':
        if (item.action === 'delete') {
          await deleteSubscriberFromCloud(item.entityId);
        } else {
          await syncSubscriberToCloud(item.payload);
        }
        break;
      case 'expense':
        if (item.action === 'delete') {
          await deleteExpenseFromCloud(item.entityId);
        } else {
          await syncExpenseToCloud(item.payload);
        }
        break;
      case 'journal':
        if (item.action === 'delete') {
          await deleteJournalEntryFromCloud(item.entityId);
        } else {
          await syncJournalEntryToCloud(item.payload);
        }
        break;
      case 'transfer':
        if (item.action === 'delete') {
          await deleteTreasuryTransferFromCloud(item.entityId);
        } else {
          await syncTreasuryTransferToCloud(item.payload);
        }
        break;
      case 'employee_tx':
        await syncEmployeeTxToCloud(item.payload);
        break;
      case 'inventory':
        await syncInventoryItemToCloud(item.payload);
        break;
      default:
        break;
    }
    return true;
  } catch (err) {
    console.error('[Offline Queue] Error syncing item to Firestore:', err);
    return false;
  }
}

/**
 * Main Sequential FIFO Offline Queue Processor
 * Strictly executes queued operations in chronological sequence to avoid race conditions.
 */
export async function processOfflineQueue(): Promise<{ syncedCount: number; remainingCount: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.warn('[Offline Queue] Network is offline. Skipping queue processing.');
    return { syncedCount: 0, remainingCount: (await getOfflineQueueStats()).pending };
  }

  if (isProcessingQueue) {
    return { syncedCount: 0, remainingCount: 0 };
  }

  isProcessingQueue = true;
  let syncedCount = 0;

  try {
    const items = await getOfflineQueueItems();
    const pendingItems = items.filter(i => i.status === 'pending' || (i.status === 'failed' && i.retryCount < 5));

    for (const item of pendingItems) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        console.warn('[Offline Queue] Connection lost during sync loop. Pausing queue.');
        break;
      }

      item.status = 'syncing';
      await updateQueueItemState(item);
      notifyListeners();

      try {
        const success = await sendItemToApi(item);
        if (success) {
          item.status = 'completed';
          await updateQueueItemState(item);
          syncedCount++;
        } else {
          item.retryCount += 1;
          item.status = item.retryCount >= 5 ? 'failed' : 'pending';
          item.lastError = 'Server returned error status response';
          await updateQueueItemState(item);
        }
      } catch (err: any) {
        item.retryCount += 1;
        item.status = item.retryCount >= 5 ? 'failed' : 'pending';
        item.lastError = err?.message || 'Network request failed';
        await updateQueueItemState(item);

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          break;
        }
      }

      notifyListeners();
      // Small throttle between requests to protect bandwidth
      await new Promise(r => setTimeout(r, 100));
    }
  } finally {
    isProcessingQueue = false;
    notifyListeners();
  }

  const finalStats = await getOfflineQueueStats();
  return { syncedCount, remainingCount: finalStats.pending };
}

/**
 * Notify subscribers about changes in queue stats
 */
async function notifyListeners() {
  const stats = await getOfflineQueueStats();
  for (const listener of listeners) {
    try {
      listener(stats);
    } catch (err) {
      console.error('[Offline Queue] Error in queue subscriber listener:', err);
    }
  }
}

/**
 * Subscribe to offline queue stat changes
 */
export function subscribeToQueueChanges(
  callback: (stats: { pending: number; syncing: number; completed: number; failed: number; items: QueueItem[] }) => void
) {
  listeners.add(callback);
  // Emit initial state
  getOfflineQueueStats().then(stats => callback(stats));

  return () => {
    listeners.delete(callback);
  };
}

// Auto-initialize online event listener for seamless auto-synchronization
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[Offline Queue] Network connection restored! Starting automatic FIFO queue synchronization...');
    processOfflineQueue().catch(() => {});
  });
}
