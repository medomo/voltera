import React, { useState, useMemo, useRef, useEffect, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Subscriber, MeterReading, Payment, SystemSettings, User, AuditLog, TariffType
} from '../types';
import { 
  Users, Plus, Search, Trash2, Edit2, FileText, UserX, XCircle, Key, FileCode, CheckCircle2,
  ChevronLeft, ChevronRight, BarChart3, AlertTriangle, Send, Download, Upload, Map as MapIcon, List, RefreshCw,
  Calendar, Clock, CheckCircle, AlertCircle, Zap, Activity, Scale, Eye, Phone, MapPin, Sparkles, Building2, Layers, Check,
  X, Filter, ShieldCheck, SlidersHorizontal, ArrowUpRight, Gauge, Printer, History, Command, Hash, Tag, FilterX,
  SearchX, CornerDownLeft
} from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { 
  getExactSubscriberBalance, 
  getSubscriberTotalReadings, 
  getSubscriberTotalPayments, 
  deriveOpeningFromCurrentBalance,
  performBalanceReconciliation
} from '../utils/balanceUtils';
import { syncBulkSubscribersToCloud, fetchSubscribersFromCloud, deduplicateCloudSubscribers, deduplicateSubscribers } from '../lib/database';
import { getDecadalPeriodInfo, getReadingCycleStatus } from '../utils/cycleUtils';
import { matchSubscriberSearch, HighlightMatch, SearchScope, normalizeArabicText } from '../utils/arabicSearchUtils';
import { BalanceReconciliationModal } from './BalanceReconciliationModal';
import { SubscribersImportModal } from './SubscribersImportModal';
import { SubscribersExportModal } from './SubscribersExportModal';
import { DueBalancesReportModal } from './DueBalancesReportModal';

const SubscribersMap = lazy(async () => {
  try {
    const m = await import('./SubscribersMap');
    return { default: m.SubscribersMap || m.default };
  } catch (err) {
    await new Promise(r => setTimeout(r, 300));
    const m = await import('./SubscribersMap');
    return { default: m.SubscribersMap || m.default };
  }
});

const MapLoadingFallback = () => (
  <div className="h-[600px] w-full bg-slate-900 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-slate-300 dir-rtl p-6">
    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl mb-3">
      <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
    </div>
    <h4 className="text-sm font-bold text-white">جاري تحميل خريطة المشتركين والملاحة...</h4>
    <p className="text-xs text-slate-400 mt-1">تم فصل محرك الخرائط لتقليل استهلاك الذاكرة وتعميم السرعة</p>
  </div>
);

interface AdminSubscribersProps {
  subscribers: Subscriber[];
  readings: MeterReading[];
  payments: Payment[];
  settings: SystemSettings;
  currentUser: User;
  onUpdateSubscribers: (subs: Subscriber[]) => void;
  onAddAuditLog: (log: AuditLog) => void;
}

export const AdminSubscribers: React.FC<AdminSubscribersProps> = ({
  subscribers, readings, payments, settings, currentUser, onUpdateSubscribers, onAddAuditLog
}) => {
  // State
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [subSearch, setSubSearch] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope>('all');
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('smart_sub_search_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showRecentDropdown, setShowRecentDropdown] = useState(false);
  const [quickChip, setQuickChip] = useState<'all' | 'debt' | 'critical' | 'credit' | 'cycle_due' | 'no_phone' | 'suspended' | 'no_trans' | 'commercial'>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [filterZone, setFilterZone] = useState('all');
  const [filterTransformer, setFilterTransformer] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDebt, setFilterDebt] = useState('all');
  const [filterTariff, setFilterTariff] = useState('all');
  const [filterCycle, setFilterCycle] = useState<'all' | 'due_decade' | 'completed_decade' | 'overdue'>('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [showAddSubModal, setShowAddSubModal] = useState(false);
  const [showReconciliationModal, setShowReconciliationModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDueBalancesModal, setShowDueBalancesModal] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscriber | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<Subscriber | null>(null);
  const [subToDelete, setSubToDelete] = useState<Subscriber | null>(null);

  // Keyboard shortcut listener (/ or Ctrl+K / Cmd+K to search, Esc to clear)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      
      if ((e.key === '/' || (e.ctrlKey && e.key === 'k') || (e.metaKey && e.key === 'k')) && !isInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        if (subSearch) {
          setSubSearch('');
          setCurrentPage(1);
        } else {
          searchInputRef.current?.blur();
          setShowRecentDropdown(false);
        }
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowRecentDropdown(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [subSearch]);

  const saveSearchToHistory = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed || trimmed.length < 2) return;
    setSearchHistory(prev => {
      const updated = [trimmed, ...prev.filter(item => item !== trimmed)].slice(0, 8);
      try {
        localStorage.setItem('smart_sub_search_history', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const removeSearchFromHistory = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchHistory(prev => {
      const updated = prev.filter(item => item !== term);
      try {
        localStorage.setItem('smart_sub_search_history', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const clearAllSearchHistory = () => {
    setSearchHistory([]);
    try {
      localStorage.removeItem('smart_sub_search_history');
    } catch {}
  };

  // Form states for Add/Edit
  const [newSubName, setNewSubName] = useState('');
  const [newSubPhone, setNewSubPhone] = useState('');
  const [newSubMeter, setNewSubMeter] = useState('');
  const [newSubZone, setNewSubZone] = useState('المنطقة (أ) - وسط المدينة');
  const [newSubTransformer, setNewSubTransformer] = useState("");
  const [newSubTariff, setNewSubTariff] = useState<TariffType>('residential');
  const [newSubInitial, setNewSubInitial] = useState('');
  const [newSubOpeningBalance, setNewSubOpeningBalance] = useState('');
  const [newSubLat, setNewSubLat] = useState('');
  const [newSubLng, setNewSubLng] = useState('');

  // Extract unique zones & transformers
  const uniqueZones = useMemo(() => {
    const zones = new Set(subscribers.map(s => s.zone).filter(Boolean) as string[]);
    return Array.from(zones);
  }, [subscribers]);

  const uniqueTransformers = useMemo(() => {
    const fromSettings = (Array.isArray(settings.transformers) ? settings.transformers : []).map((t: any) => typeof t === 'object' ? t.name : t).filter(Boolean);
    const fromSubs = subscribers.map(s => s.transformer).filter(Boolean) as string[];
    return Array.from(new Set([...fromSettings, ...fromSubs]));
  }, [settings.transformers, subscribers]);

  // Dynamic Ledger-based Calculated Balances
  const calculatedBalancesMap = useMemo(() => {
    const map = new Map<string, { totalReadings: number; totalPayments: number; netBalance: number }>();
    subscribers.forEach(sub => {
      const subReadingsTotal = getSubscriberTotalReadings(sub, readings);
      const subPaymentsTotal = getSubscriberTotalPayments(sub, payments);
      const netBalance = getExactSubscriberBalance(sub, readings, payments);
      map.set(sub.id, {
        totalReadings: subReadingsTotal,
        totalPayments: subPaymentsTotal,
        netBalance
      });
    });
    return map;
  }, [subscribers, readings, payments]);

  // 10-Day Reading Cycle Calculation Engine
  const subLatestReadingMap = useMemo(() => {
    const map = new Map<string, MeterReading | null>();
    const readingsBySub = new Map<string, MeterReading[]>();
    
    readings.forEach(r => {
      if (r.isRejected) return;
      const key = r.subscriberId || r.subscriberName || r.meterNumber;
      if (!key) return;
      if (!readingsBySub.has(key)) readingsBySub.set(key, []);
      readingsBySub.get(key)!.push(r);
    });

    subscribers.forEach(sub => {
      const subReadings = [
        ...(readingsBySub.get(sub.id) || []),
        ...(readingsBySub.get(sub.name) || []),
        ...(sub.meterNumber ? readingsBySub.get(sub.meterNumber) || [] : [])
      ];
      subReadings.sort((a, b) => new Date(b.readingDate).getTime() - new Date(a.readingDate).getTime());
      map.set(sub.id, subReadings[0] || null);
    });
    return map;
  }, [subscribers, readings]);

  const getSubLatestReading = (sub: Subscriber) => {
    return subLatestReadingMap.get(sub.id) || null;
  };

  const decadalInfo = useMemo(() => getDecadalPeriodInfo(), []);

  const subscriberCycleStats = useMemo(() => {
    let dueCount = 0;
    let completedCount = 0;
    let overdueCount = 0;

    subscribers.forEach(sub => {
      const latest = getSubLatestReading(sub);
      const status = getReadingCycleStatus(latest?.readingDate, 10);
      if (status.isDue) {
        dueCount++;
        if (status.daysElapsed !== null && status.daysElapsed > 15) {
          overdueCount++;
        }
      } else {
        completedCount++;
      }
    });

    const total = subscribers.length || 1;
    const completionRate = Math.round((completedCount / total) * 100);

    return { dueCount, completedCount, overdueCount, total: subscribers.length, completionRate };
  }, [subscribers, subLatestReadingMap]);

  const getSubBalance = (sub: Subscriber) => {
    const info = calculatedBalancesMap.get(sub.id);
    return info ? info.netBalance : sub.currentBalance;
  };

  // Real-time balance reconciliation report calculation
  const reconciliationReport = useMemo(() => {
    return performBalanceReconciliation(subscribers, readings, payments);
  }, [subscribers, readings, payments]);

  const [isPushingToDb, setIsPushingToDb] = useState(false);
  const [isFetchingFromDb, setIsFetchingFromDb] = useState(false);
  const [isDeduplicating, setIsDeduplicating] = useState(false);
  const [pushDbStatus, setPushDbStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  const duplicateCountInList = useMemo(() => {
    const seenMeters = new Set<string>();
    let dupes = 0;
    subscribers.forEach(s => {
      const key = (s.meterNumber || '').trim().toLowerCase();
      if (key) {
        if (seenMeters.has(key)) dupes++;
        else seenMeters.add(key);
      }
    });
    return dupes;
  }, [subscribers]);

  const handleDeduplicateSubscribers = async () => {
    setIsDeduplicating(true);
    setPushDbStatus(null);
    try {
      const { cleanedList, removedCount } = await deduplicateCloudSubscribers();
      const localClean = deduplicateSubscribers(cleanedList.length > 0 ? cleanedList : subscribers);
      onUpdateSubscribers(localClean);
      onAddAuditLog({
        id: `log-${Date.now()}`,
        userId: currentUser.id,
        username: currentUser.username,
        action: 'تنظيف المشتركين المكررين',
        details: `تمت عملية فحص وتدقيق المشتركين وإزالة ${removedCount || duplicateCountInList} مشترك مكرر بنجاح.`,
        timestamp: new Date().toISOString()
      });
      const totalRemoved = Math.max(removedCount, duplicateCountInList);
      setPushDbStatus({
        success: true,
        message: totalRemoved > 0
          ? `تم اكتشاف وإزالة ${totalRemoved} مشترك مكرر بنجاح وتحديث قاعدة البيانات!`
          : `القائمة ممتازة ونظيفة تماماً: لا يوجد أي مشتركين مكررين حالياً.`
      });
    } catch (e: any) {
      setPushDbStatus({ success: false, message: e?.message || 'حدث خطأ أثناء تنظيف المشتركين المكررين' });
    } finally {
      setIsDeduplicating(false);
    }
  };

  const handleFetchSubscribersFromDb = async () => {
    setIsFetchingFromDb(true);
    setPushDbStatus(null);
    try {
      const fetched = await fetchSubscribersFromCloud();
      onUpdateSubscribers(fetched);
      setPushDbStatus({ success: true, message: `تم بنجاح جلب وتحديث قائمة المشتركين (${fetched.length} مشترك) من قاعدة بيانات Firebase Firestore!` });
    } catch (e: any) {
      setPushDbStatus({ success: false, message: e?.message || 'تعذر الاتصال بخادم قاعدة البيانات' });
    } finally {
      setIsFetchingFromDb(false);
    }
  };

  const handlePushAllSubscribersToDb = async () => {
    setIsPushingToDb(true);
    setPushDbStatus(null);
    try {
      await syncBulkSubscribersToCloud(subscribers);
      setPushDbStatus({ success: true, message: `تم بنجاح حفظ وتثبيت ${subscribers.length} مشترك في قاعدة بيانات Firebase Firestore!` });
    } catch (e: any) {
      setPushDbStatus({ success: false, message: e?.message || 'تعذر الاتصال بخادم قاعدة البيانات' });
    } finally {
      setIsPushingToDb(false);
    }
  };

  const handleRecalculateAndSyncBalances = () => {
    let updatedCount = 0;
    const recalculated = subscribers.map(sub => {
      const info = calculatedBalancesMap.get(sub.id);
      const exactBalance = info ? info.netBalance : (sub.currentBalance || 0);
      const effectiveOpening = (sub.openingBalance !== undefined && sub.openingBalance !== null)
        ? sub.openingBalance
        : deriveOpeningFromCurrentBalance(sub.currentBalance || 0, sub, readings, payments);

      if (Math.abs((sub.currentBalance || 0) - exactBalance) > 0.01 || sub.openingBalance === undefined || sub.openingBalance === null) {
        updatedCount++;
      }
      return {
        ...sub,
        openingBalance: effectiveOpening,
        currentBalance: exactBalance
      };
    });

    onUpdateSubscribers(recalculated);
    onAddAuditLog({
      id: `log-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'تحديث ومطابقة الأرصدة',
      details: `تمت مطابقة وتحديث الأرصدة المستحقة لـ ${subscribers.length} مشترك مع قاعدة البيانات وتصحيح ${updatedCount} رصيد.`,
      timestamp: new Date().toISOString()
    });

    alert(`تمت مطابقة وتحديث الأرصدة المستحقة بنجاح مع قاعدة البيانات السحابية (Firebase Firestore)!\nتم تدقيق ${subscribers.length} مشترك وتعديل أرصدة ${updatedCount} مشترك لضمان عدم وجود أخطاء في الحسابات.`);
  };

  // Filtering with Smart Search & Score-based Relevance Ranking
  const filteredSubscribers = useMemo(() => {
    const rawQ = subSearch.trim();

    const matchesList = subscribers.filter(sub => {
      if (!sub) return false;

      // 1. Instant Smart Search Matching (Arabic normalized, multi-token, scoped)
      if (rawQ) {
        const searchResult = matchSubscriberSearch(sub, rawQ, searchScope);
        if (!searchResult.isMatch) return false;
      }

      // 2. Quick Filter Chips
      const liveBal = calculatedBalancesMap.get(sub.id)?.netBalance ?? (sub.currentBalance || 0);
      const latestReading = getSubLatestReading(sub);
      const cycleStatus = getReadingCycleStatus(latestReading?.readingDate, 10);

      if (quickChip === 'debt' && liveBal <= 0) return false;
      if (quickChip === 'critical' && liveBal <= 20000) return false;
      if (quickChip === 'credit' && liveBal > 0) return false;
      if (quickChip === 'cycle_due' && !cycleStatus.isDue) return false;
      if (quickChip === 'no_phone' && (sub.phone && sub.phone.trim().length > 0)) return false;
      if (quickChip === 'suspended' && sub.status === 'active') return false;
      if (quickChip === 'no_trans' && (sub.transformer && sub.transformer.trim().length > 0)) return false;
      if (quickChip === 'commercial' && sub.tariffType !== 'commercial') return false;

      // 3. Dropdown Filters
      const matchesZone = filterZone === 'all' || sub.zone === filterZone;
      const matchesTransformer = filterTransformer === 'all' || (filterTransformer === 'none' ? !sub.transformer : sub.transformer === filterTransformer);
      const matchesStatus = filterStatus === 'all' || sub.status === filterStatus;
      const matchesTariff = filterTariff === 'all' || sub.tariffType === filterTariff;
      
      let matchesDebt = true;
      if (filterDebt === 'has_debt') matchesDebt = liveBal > 0;
      if (filterDebt === 'high_debt') matchesDebt = liveBal > 10000;
      if (filterDebt === 'critical_debt') matchesDebt = liveBal > 50000;
      
      let matchesCycle = true;
      if (filterCycle === 'due_decade' || filterCycle === 'due') {
        matchesCycle = cycleStatus.isDue;
      } else if (filterCycle === 'completed_decade' || filterCycle === 'completed') {
        matchesCycle = !cycleStatus.isDue;
      } else if (filterCycle === 'overdue') {
        matchesCycle = cycleStatus.daysElapsed !== null && cycleStatus.daysElapsed > 10;
      }

      return matchesZone && matchesTransformer && matchesStatus && matchesTariff && matchesDebt && matchesCycle;
    });

    // If search is active, rank results by match score (Highest match score first)
    if (rawQ) {
      return [...matchesList].sort((a, b) => {
        const scoreA = matchSubscriberSearch(a, rawQ, searchScope).score;
        const scoreB = matchSubscriberSearch(b, rawQ, searchScope).score;
        return scoreB - scoreA;
      });
    }

    return matchesList;
  }, [subscribers, subSearch, searchScope, quickChip, filterZone, filterTransformer, filterStatus, filterTariff, filterDebt, filterCycle, calculatedBalancesMap, subLatestReadingMap]);

  // Quick Chips Live Counts
  const quickChipCounts = useMemo(() => {
    let debt = 0;
    let critical = 0;
    let credit = 0;
    let cycle_due = 0;
    let no_phone = 0;
    let suspended = 0;
    let no_trans = 0;
    let commercial = 0;

    subscribers.forEach(s => {
      const bal = getSubBalance(s);
      if (bal > 0) debt++;
      if (bal > 20000) critical++;
      if (bal <= 0) credit++;
      const lat = getSubLatestReading(s);
      const st = getReadingCycleStatus(lat?.readingDate, 10);
      if (st.isDue) cycle_due++;
      if (!s.phone || !s.phone.trim()) no_phone++;
      if (s.status !== 'active') suspended++;
      if (!s.transformer || !s.transformer.trim()) no_trans++;
      if (s.tariffType === 'commercial') commercial++;
    });

    return { debt, critical, credit, cycle_due, no_phone, suspended, no_trans, commercial };
  }, [subscribers, calculatedBalancesMap, subLatestReadingMap]);

  // Real-time Search Match Breakdown
  const searchMatchStats = useMemo(() => {
    if (!subSearch.trim()) return null;
    let matchedName = 0;
    let matchedMeter = 0;
    let matchedPhone = 0;
    let matchedZone = 0;
    let matchedCode = 0;

    filteredSubscribers.forEach(sub => {
      const res = matchSubscriberSearch(sub, subSearch.trim(), searchScope);
      if (res.matchedField === 'name') matchedName++;
      else if (res.matchedField === 'meter') matchedMeter++;
      else if (res.matchedField === 'phone') matchedPhone++;
      else if (res.matchedField === 'zone') matchedZone++;
      else if (res.matchedField === 'code') matchedCode++;
    });

    return {
      total: filteredSubscribers.length,
      matchedName,
      matchedMeter,
      matchedPhone,
      matchedZone,
      matchedCode
    };
  }, [filteredSubscribers, subSearch, searchScope]);

  // Pagination
  const totalPages = Math.ceil(filteredSubscribers.length / itemsPerPage);
  const paginatedSubscribers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSubscribers.slice(start, start + itemsPerPage);
  }, [filteredSubscribers, currentPage, itemsPerPage]);

  // Handlers
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };
  const toggleAll = () => {
    if (selectedIds.length === paginatedSubscribers.length && paginatedSubscribers.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedSubscribers.map(s => s.id));
    }
  };

  const handleBulkStatusToggle = (newStatus: 'active' | 'suspended') => {
    if (selectedIds.length === 0) return;
    

    const updated = subscribers.map(s => {
      if (selectedIds.includes(s.id)) return { ...s, status: newStatus };
      return s;
    });
    onUpdateSubscribers(updated);
    onAddAuditLog({
      id: `log-${Date.now()}`,
      userId: currentUser.id,
      username: currentUser.username,
      action: 'تحديث حالة مشتركين',
      details: `تم تغيير حالة ${selectedIds.length} مشترك إلى ${newStatus}`,
      timestamp: new Date().toISOString()
    });
    setSelectedIds([]);
  };

      const handleBulkReminder = () => {
    if (selectedIds.length === 0) {
      alert('يرجى تحديد مشترك واحد على الأقل');
      return;
    }
    
    onAddAuditLog({
      id: `log-${Date.now()}`,
      userId: currentUser.id,
      username: currentUser.username,
      action: 'إرسال تذكير',
      details: `إرسال تذكير بالدفع لـ ${selectedIds.length} مشترك`,
      timestamp: new Date().toISOString()
    });
    
    setSelectedIds([]);
  };

  const handleSubscribersImported = (updatedList: Subscriber[], addedCount: number, updatedCount: number) => {
    onUpdateSubscribers(updatedList);
    setPushDbStatus({
      success: true,
      message: `تم بنجاح استيراد وتحديث المشتركين (${addedCount} جديد، ${updatedCount} تم تحديثه) ومزامنتهم مع Firebase Firestore!`
    });
    // Reset filters to view freshly imported data
    setSubSearch('');
    setFilterStatus('all');
    setFilterTariff('all');
    setFilterZone('all');
    setCurrentPage(1);
  };

  const confirmDeleteSubscriber = () => {
    if (!subToDelete) return;
    const target = subToDelete;
    onUpdateSubscribers(subscribers.filter(s => s.id !== target.id));
    onAddAuditLog({
      id: `log-${Date.now()}`,
      userId: currentUser.id,
      username: currentUser.username,
      action: 'حذف مشترك',
      details: `حذف المشترك: ${target.name} (رقم العداد: ${target.meterNumber})`,
      timestamp: new Date().toISOString()
    });
    setSubToDelete(null);
  };

  const toggleSubStatus = (sub: Subscriber) => {
    const newStatus = sub.status === 'active' ? 'suspended' : 'active';
    onUpdateSubscribers(subscribers.map(s => s.id === sub.id ? { ...s, status: newStatus } : s));
    onAddAuditLog({
      id: `log-${Date.now()}`,
      userId: currentUser.id,
      username: currentUser.username,
      action: 'تحديث حالة مشترك',
      details: `تغيير حالة المشترك ${sub.name} إلى ${newStatus}`,
      timestamp: new Date().toISOString()
    });
  };

  const saveNewSubscriber = () => {
    if (!newSubName.trim() || !newSubMeter.trim()) {
      alert("الاسم ورقم العداد مطلوبان.");
      return;
    }
    const cleanMeter = newSubMeter.trim();
    if (subscribers.some(s => (s.meterNumber || '').trim().toLowerCase() === cleanMeter.toLowerCase())) {
      alert(`خطأ: رقم العداد "${cleanMeter}" مسجل مسبقاً لمشترك آخر! لا يمكن تكرار رقم العداد.`);
      return;
    }
    const openingBal = Number(newSubOpeningBalance) || 0;
    const initRead = Number(newSubInitial) || 0;
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
      initialReading: initRead,
      currentReading: initRead,
      openingBalance: openingBal,
      currentBalance: openingBal,
      status: 'active',
      createdAt: new Date().toISOString(),
      coordinates: newSubLat && newSubLng ? {
        lat: Number(newSubLat),
        lng: Number(newSubLng)
      } : undefined
    };

    // Prepend to list so newest is at the top
    onUpdateSubscribers([newSub, ...subscribers]);

    // Also trigger direct push to Firebase and show status
    syncBulkSubscribersToCloud([newSub, ...subscribers]).then(() => {
      setPushDbStatus({ success: true, message: `تم بنجاح حفظ المشترك الجديد (${newSub.name}) في قاعدة بيانات Firebase Firestore!` });
    }).catch(err => {
      setPushDbStatus({ success: false, message: `تنبيه: تعذر الاتصال بخادم قاعدة البيانات (${err.message || err})` });
    });

    // Reset filters and go to page 1 to ensure instant visibility
    setSubSearch('');
    setFilterStatus('all');
    setFilterTariff('all');
    setFilterZone('all');
    setFilterTransformer('all');
    setFilterDebt('all');
    setFilterCycle('all');
    setCurrentPage(1);

    onAddAuditLog({
      id: `log-${Date.now()}`,
      userId: currentUser.id,
      username: currentUser.username,
      action: 'إضافة مشترك',
      details: `تم إضافة المشترك الجديد: ${newSub.name} (عداد: ${newSub.meterNumber}) وتوثيقه في قاعدة البيانات`,
      timestamp: new Date().toISOString()
    });

    setShowAddSubModal(false);
    setNewSubName(''); setNewSubPhone(''); setNewSubMeter(''); setNewSubInitial(''); setNewSubOpeningBalance('');
    setNewSubLat(''); setNewSubLng('');
  };

  const saveEditingSub = () => {
    if (!editingSub) return;
    const cleanMeter = (editingSub.meterNumber || '').trim();
    if (!editingSub.name || !cleanMeter) {
      alert("الاسم ورقم العداد مطلوبان.");
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
    const updatedList = subscribers.map(s => s.id === editingSub.id ? updatedSub : s);
    onUpdateSubscribers(updatedList);

    // Sync to cloud
    syncBulkSubscribersToCloud(updatedList).catch(err => {
      console.warn("Auto-sync error on edit subscriber:", err);
    });

    onAddAuditLog({
      id: `log-${Date.now()}`,
      userId: currentUser.id,
      username: currentUser.username,
      action: 'تعديل مشترك',
      details: `تعديل بيانات المشترك: ${editingSub.name} (قراءة افتتاحية: ${initReading})`,
      timestamp: new Date().toISOString()
    });
    setEditingSub(null);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (subSearch.trim()) count++;
    if (searchScope !== 'all') count++;
    if (quickChip !== 'all') count++;
    if (filterStatus !== 'all') count++;
    if (filterTariff !== 'all') count++;
    if (filterZone !== 'all') count++;
    if (filterTransformer !== 'all') count++;
    if (filterDebt !== 'all') count++;
    if (filterCycle !== 'all') count++;
    return count;
  }, [subSearch, searchScope, quickChip, filterStatus, filterTariff, filterZone, filterTransformer, filterDebt, filterCycle]);

  const resetAllFilters = () => {
    setSubSearch('');
    setSearchScope('all');
    setQuickChip('all');
    setFilterStatus('all');
    setFilterTariff('all');
    setFilterZone('all');
    setFilterTransformer('all');
    setFilterDebt('all');
    setFilterCycle('all');
    setCurrentPage(1);
  };

  const totalSystemDebt = useMemo(() => {
    return subscribers.reduce((sum, s) => {
      const bal = getSubBalance(s);
      return sum + (bal > 0 ? bal : 0);
    }, 0);
  }, [subscribers, calculatedBalancesMap]);

  const indebtedSubscribersCount = useMemo(() => {
    return subscribers.filter(s => getSubBalance(s) > 0).length;
  }, [subscribers, calculatedBalancesMap]);

  const activeSubscribersCount = useMemo(() => {
    return subscribers.filter(s => s.status === 'active').length;
  }, [subscribers]);

  const suspendedSubscribersCount = useMemo(() => {
    return subscribers.filter(s => s.status !== 'active').length;
  }, [subscribers]);

  return (
    <motion.div
      key="subscribers-sec"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 text-right"
    >
      {/* Page Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800/90 p-5 md:p-6 rounded-3xl shadow-xl relative overflow-hidden backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl shadow-inner">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-white tracking-tight">سجل المشتركين وإدارة الفوترة الميدانية</h2>
                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                    {subscribers.length} مشترك مسجل
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-bold mt-0.5">
                  إدارة العدادات، المربعات الجغرافية، دورات القراءة العشرية، ومطابقة الأرصدة النقدية
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              onClick={() => setShowAddSubModal(true)}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(245,158,11,0.25)] hover:shadow-[0_0_25px_rgba(245,158,11,0.4)] cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة مشترك جديد</span>
            </button>

            <button
              onClick={() => setShowReconciliationModal(true)}
              className={`font-black py-2.5 px-3.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-95 border ${
                reconciliationReport.hasDiscrepancies
                  ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/40 shadow-rose-500/10'
                  : 'bg-slate-900/90 hover:bg-emerald-950/60 text-emerald-400 border-emerald-500/30 hover:border-emerald-500/60'
              }`}
              title="فحص ومطابقة الأرصدة التلقائية ومقارنة [الرصيد الافتتاحي + الفواتير - السندات] مع الرصيد المسجل"
            >
              <Scale className={`w-4 h-4 ${reconciliationReport.hasDiscrepancies ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`} />
              <span>فحص ومطابقة الأرصدة</span>
              {reconciliationReport.hasDiscrepancies ? (
                <span className="px-1.5 py-0.5 bg-rose-600 text-white rounded-full text-[10px] font-mono font-black animate-pulse">
                  {reconciliationReport.mismatchedCount} تفاوت
                </span>
              ) : (
                <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-mono font-bold">
                  100%
                </span>
              )}
            </button>

            <button
              onClick={handleRecalculateAndSyncBalances}
              className="bg-slate-900/90 hover:bg-cyan-950/60 text-cyan-400 border border-cyan-500/30 hover:border-cyan-500/60 font-bold py-2.5 px-3.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
              title="إعادة احتساب ومطابقة كافة الأرصدة المستحقة فوراً مع الفواتير والمقبوضات بقاعدة البيانات"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              <span>مزامنة الأرصدة</span>
            </button>

            <button
              onClick={handleDeduplicateSubscribers}
              disabled={isDeduplicating}
              className={`font-bold py-2.5 px-3.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 border ${
                duplicateCountInList > 0
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/50 shadow-amber-500/10'
                  : 'bg-slate-900/90 hover:bg-purple-950/60 text-purple-400 border-purple-500/30 hover:border-purple-500/60'
              }`}
              title="فحص وحذف المشتركين المكررين من قاعدة البيانات والاحتفاظ بالسجل الفريد المعتمد"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isDeduplicating ? 'animate-spin text-amber-400' : 'text-purple-400'}`} />
              <span>إزالة المكررين</span>
              {duplicateCountInList > 0 && (
                <span className="px-1.5 py-0.5 bg-amber-500 text-slate-950 rounded-full text-[10px] font-mono font-black animate-pulse">
                  {duplicateCountInList}
                </span>
              )}
            </button>

            <button
              onClick={handleFetchSubscribersFromDb}
              disabled={isFetchingFromDb}
              className="bg-slate-900/90 hover:bg-blue-950/60 text-blue-400 border border-blue-500/40 hover:border-blue-500/70 font-bold py-2.5 px-3.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
              title="جلب وتحديث بيانات كافة المشتركين المسجلين في قاعدة البيانات"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isFetchingFromDb ? 'animate-spin' : ''}`} />
              <span>{isFetchingFromDb ? 'جاري السحب...' : 'تحديث'}</span>
            </button>

            <button
              onClick={() => setShowDueBalancesModal(true)}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black py-2.5 px-3.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-amber-500/20 active:scale-95"
              title="كشف المبالغ المستحقة والمحصلة والمتأخرات مع تخصيص الأعمدة والتصدير"
            >
              <Printer className="w-3.5 h-3.5 text-slate-950" />
              <span>كشف المستحقات والمحصل 📑</span>
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              className="bg-slate-900/90 hover:bg-amber-950/60 text-amber-400 border border-amber-500/30 hover:border-amber-500/60 font-bold py-2.5 px-3.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
              title="تصدير سجل المشتركين بتنسيق Excel (.xlsx) أو CSV عربي معتمد"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>تصدير السجل</span>
            </button>

            <button
              onClick={() => setShowImportModal(true)}
              className="bg-slate-900/90 hover:bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/60 font-bold py-2.5 px-3.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
              title="استيراد المشتركين من ملفات Excel (.xlsx / .xls) أو CSV أو لصق الجداول مع التحقق الذكي من التكرار"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>استيراد المشتركين</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Subscribers */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 p-4 rounded-2xl shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-bold">إجمالي المشتركين</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">{subscribers.length}</span>
            <span className="text-xs text-slate-400 font-bold">مشترك</span>
          </div>
          <div className="flex items-center gap-3 mt-2.5 pt-2 border-t border-slate-800/60 text-[11px] font-bold">
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{activeSubscribersCount} نشط</span>
            </span>
            <span className="text-rose-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>{suspendedSubscribersCount} موقوف</span>
            </span>
          </div>
        </div>

        {/* Metric 2: 10-Day Cycle Status */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 p-4 rounded-2xl shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-bold">دورة القراءة العشرية (10 أيام)</span>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-400 font-mono">
              {subscribers.filter(s => {
                const lat = getSubLatestReading(s);
                return getReadingCycleStatus(lat?.readingDate, 10).isDue;
              }).length}
            </span>
            <span className="text-xs text-slate-400 font-bold">مستحق للقراءة اليوم</span>
          </div>
          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-800/60 text-[11px] font-bold">
            <span className="text-slate-400">فترة الدورة الحالية:</span>
            <span className="text-amber-400 font-mono">{getDecadalPeriodInfo().decadeShort}</span>
          </div>
        </div>

        {/* Metric 3: Total Outstanding Debt */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 p-4 rounded-2xl shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-bold">إجمالي المديونية المستحقة</span>
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-rose-400 font-mono">{totalSystemDebt.toLocaleString()}</span>
            <span className="text-xs text-slate-400 font-sans">{settings.currency}</span>
          </div>
          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-800/60 text-[11px] font-bold">
            <span className="text-slate-400">المشتركون المدينون:</span>
            <span className="text-rose-300 font-mono bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
              {indebtedSubscribersCount} مشترك
            </span>
          </div>
        </div>

        {/* Metric 4: Geographic Coverage */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 p-4 rounded-2xl shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-bold">التغطية والمربعات</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400 font-mono">{uniqueZones.length}</span>
            <span className="text-xs text-slate-400 font-bold">مربع جغرافي</span>
          </div>
          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-800/60 text-[11px] font-bold">
            <span className="text-slate-400">المحولات والعدادات:</span>
            <span className="text-emerald-300 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              {uniqueTransformers.length} محول
            </span>
          </div>
        </div>
      </div>

      {/* Database Sync Status Banner */}
      {pushDbStatus && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 border shadow-lg transition-all ${
          pushDbStatus.success
            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
            : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
        }`}>
          <div className="flex items-center gap-2.5">
            {pushDbStatus.success ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{pushDbStatus.message}</span>
          </div>
          <button
            onClick={() => setPushDbStatus(null)}
            className="text-slate-400 hover:text-white text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 cursor-pointer border border-slate-700 transition-colors"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950/90 backdrop-blur-xl p-4 md:p-5 rounded-3xl border border-slate-800/90 shadow-xl space-y-3.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Main Search Input with Scope & History */}
          <div ref={searchContainerRef} className="relative flex-1">
            <div className="relative flex items-center">
              {/* Search Scope Dropdown / Button inside the bar */}
              <div className="absolute right-2 z-10 flex items-center">
                <select
                  value={searchScope}
                  onChange={e => {
                    setSearchScope(e.target.value as SearchScope);
                    setCurrentPage(1);
                  }}
                  className="bg-slate-900 text-amber-400 font-bold text-[11px] rounded-xl px-2.5 py-1.5 border border-amber-500/30 hover:border-amber-500/60 focus:outline-none cursor-pointer shadow-xs transition-colors"
                  title="تحديد نطاق البحث"
                >
                  <option value="all">🔍 بحث شامل</option>
                  <option value="name">👤 بالاسم</option>
                  <option value="meter">🔢 برقم العداد</option>
                  <option value="phone">📱 برقم الهاتف</option>
                  <option value="zone">📍 بالمربع / المحول</option>
                  <option value="code">🏷️ بكود المشترك</option>
                </select>
              </div>

              <input
                ref={searchInputRef}
                type="text"
                placeholder={
                  searchScope === 'name' ? 'البحث بالاسم فقط (يدعم الهمزات وتطبيع الأسماء)...' :
                  searchScope === 'meter' ? 'البحث برقم العداد (أرقام عربية أو لاتينية)...' :
                  searchScope === 'phone' ? 'البحث برقم الجوال (مع أو بدون مفتاح الدولة)...' :
                  searchScope === 'zone' ? 'البحث بالمربع الجغرافي أو اسم المحول...' :
                  searchScope === 'code' ? 'البحث بكود المشترك أو الرقم التعريفي...' :
                  'البحث الفوري الذكي بالاسم، رقم العداد، رقم الجوال، أو المربع...'
                }
                value={subSearch}
                onFocus={() => {
                  if (searchHistory.length > 0) setShowRecentDropdown(true);
                }}
                onChange={e => {
                  setSubSearch(e.target.value);
                  setCurrentPage(1);
                  if (searchHistory.length > 0) setShowRecentDropdown(true);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    saveSearchToHistory(subSearch);
                    setShowRecentDropdown(false);
                  }
                }}
                className="w-full bg-slate-950/90 border border-slate-700/60 rounded-2xl py-3 px-4 pr-32 pl-24 text-slate-100 text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-inner font-medium"
              />

              {/* Right/Left Quick Action Badges (Clear, History, Ctrl+K) */}
              <div className="absolute left-3 flex items-center gap-1.5">
                {subSearch ? (
                  <button
                    onClick={() => { 
                      setSubSearch(''); 
                      setCurrentPage(1); 
                      setShowRecentDropdown(false);
                      searchInputRef.current?.focus();
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 cursor-pointer transition-colors"
                    title="تفريغ البحث (Esc)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 bg-slate-900 border border-slate-800 rounded-md select-none pointer-events-none">
                    <Command className="w-2.5 h-2.5" /> K
                  </kbd>
                )}

                {searchHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowRecentDropdown(prev => !prev)}
                    className={`p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                      showRecentDropdown ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title="سجل البحث الأخير"
                  >
                    <History className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Search History Dropdown */}
            <AnimatePresence>
              {showRecentDropdown && searchHistory.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute z-50 mt-1.5 w-full bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
                >
                  <div className="p-2.5 px-3 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-bold bg-slate-950/60">
                    <span className="flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-amber-500" />
                      <span>عمليات البحث الأخيرة:</span>
                    </span>
                    <button
                      onClick={clearAllSearchHistory}
                      className="text-slate-500 hover:text-rose-400 transition-colors text-[10px] cursor-pointer"
                    >
                      مسح السجل
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/40">
                    {searchHistory.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setSubSearch(item);
                          setCurrentPage(1);
                          setShowRecentDropdown(false);
                        }}
                        className="px-3.5 py-2 hover:bg-slate-800/60 flex items-center justify-between text-xs text-slate-300 hover:text-white cursor-pointer transition-colors group"
                      >
                        <span className="flex items-center gap-2">
                          <Search className="w-3 h-3 text-slate-500 group-hover:text-amber-400 transition-colors" />
                          <span className="font-medium">{item}</span>
                        </span>
                        <button
                          onClick={(e) => removeSearchFromHistory(item, e)}
                          className="text-slate-500 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="حذف من السجل"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* View Mode Segmented Control & Reset Button */}
          <div className="flex items-center gap-2 shrink-0">
            {activeFiltersCount > 0 && (
              <button
                onClick={resetAllFilters}
                className="px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-rose-400 hover:text-rose-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                title="تصفير كافة الفلاتر والبحث"
              >
                <X className="w-3.5 h-3.5" />
                <span>تصفير ({activeFiltersCount})</span>
              </button>
            )}

            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'list' 
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>قائمة</span>
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'map' 
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>خريطة</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Filter Chips Bar (شرائح التصفية الذكية السريعة) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-[11px] font-bold text-slate-500 shrink-0 flex items-center gap-1 pl-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>فلترة سريعة:</span>
          </span>

          <button
            onClick={() => { setQuickChip('all'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border text-xs ${
              quickChip === 'all'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm font-black'
                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800/80 hover:text-slate-200'
            }`}
          >
            <span>الكل</span>
            <span className="text-[10px] opacity-75 font-mono">({subscribers.length})</span>
          </button>

          <button
            onClick={() => { setQuickChip(quickChip === 'debt' ? 'all' : 'debt'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border text-xs ${
              quickChip === 'debt'
                ? 'bg-rose-500 text-white border-rose-400 shadow-sm font-black'
                : 'bg-slate-950/60 text-rose-400/80 border-slate-800 hover:bg-rose-500/10 hover:text-rose-300'
            }`}
          >
            <span>مديونية مستحقة</span>
            <span className="text-[10px] font-mono font-bold">({quickChipCounts.debt})</span>
          </button>

          <button
            onClick={() => { setQuickChip(quickChip === 'critical' ? 'all' : 'critical'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border text-xs ${
              quickChip === 'critical'
                ? 'bg-red-600 text-white border-red-400 shadow-sm font-black ring-2 ring-red-500/30'
                : 'bg-slate-950/60 text-red-400/80 border-slate-800 hover:bg-red-600/10 hover:text-red-300'
            }`}
          >
            <span>متعثر حرِج ({">"} 20 ألف)</span>
            <span className="text-[10px] font-mono font-bold">({quickChipCounts.critical})</span>
          </button>

          <button
            onClick={() => { setQuickChip(quickChip === 'cycle_due' ? 'all' : 'cycle_due'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border text-xs ${
              quickChip === 'cycle_due'
                ? 'bg-indigo-500 text-white border-indigo-400 shadow-sm font-black'
                : 'bg-slate-950/60 text-indigo-400/80 border-slate-800 hover:bg-indigo-500/10 hover:text-indigo-300'
            }`}
          >
            <span>مستحق القراءة (10 أيام)</span>
            <span className="text-[10px] font-mono font-bold">({quickChipCounts.cycle_due})</span>
          </button>

          <button
            onClick={() => { setQuickChip(quickChip === 'credit' ? 'all' : 'credit'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border text-xs ${
              quickChip === 'credit'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm font-black'
                : 'bg-slate-950/60 text-emerald-400/80 border-slate-800 hover:bg-emerald-500/10 hover:text-emerald-300'
            }`}
          >
            <span>خالص / رصيد دائن</span>
            <span className="text-[10px] font-mono font-bold">({quickChipCounts.credit})</span>
          </button>

          <button
            onClick={() => { setQuickChip(quickChip === 'no_phone' ? 'all' : 'no_phone'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border text-xs ${
              quickChip === 'no_phone'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm font-black'
                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800/80 hover:text-slate-200'
            }`}
          >
            <span>بدون رقم هاتف</span>
            <span className="text-[10px] font-mono font-bold">({quickChipCounts.no_phone})</span>
          </button>

          <button
            onClick={() => { setQuickChip(quickChip === 'suspended' ? 'all' : 'suspended'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border text-xs ${
              quickChip === 'suspended'
                ? 'bg-rose-600 text-white border-rose-400 shadow-sm font-black'
                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800/80 hover:text-slate-200'
            }`}
          >
            <span>موقوف عن الخدمة</span>
            <span className="text-[10px] font-mono font-bold">({quickChipCounts.suspended})</span>
          </button>

          <button
            onClick={() => { setQuickChip(quickChip === 'no_trans' ? 'all' : 'no_trans'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border text-xs ${
              quickChip === 'no_trans'
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm font-black'
                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800/80 hover:text-slate-200'
            }`}
          >
            <span>بدون محول</span>
            <span className="text-[10px] font-mono font-bold">({quickChipCounts.no_trans})</span>
          </button>

          <button
            onClick={() => { setQuickChip(quickChip === 'commercial' ? 'all' : 'commercial'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border text-xs ${
              quickChip === 'commercial'
                ? 'bg-amber-600 text-white border-amber-400 shadow-sm font-black'
                : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800/80 hover:text-slate-200'
            }`}
          >
            <span>تجاري</span>
            <span className="text-[10px] font-mono font-bold">({quickChipCounts.commercial})</span>
          </button>
        </div>

        {/* Live Search Match Breakdown Bar */}
        {subSearch.trim() && searchMatchStats && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2.5 text-xs text-slate-300">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <Search className="w-4 h-4" />
                <span>نتائج البحث عن "{subSearch}":</span>
                <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded-md font-black text-xs font-mono">
                  {searchMatchStats.total} مشترك مطابق
                </span>
              </span>

              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                {searchMatchStats.matchedName > 0 && (
                  <span className="bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-800">
                    👤 بالاسم: <strong className="text-amber-300">{searchMatchStats.matchedName}</strong>
                  </span>
                )}
                {searchMatchStats.matchedMeter > 0 && (
                  <span className="bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-800">
                    🔢 برقم العداد: <strong className="text-amber-300">{searchMatchStats.matchedMeter}</strong>
                  </span>
                )}
                {searchMatchStats.matchedPhone > 0 && (
                  <span className="bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-800">
                    📱 بالهاتف: <strong className="text-amber-300">{searchMatchStats.matchedPhone}</strong>
                  </span>
                )}
                {searchMatchStats.matchedZone > 0 && (
                  <span className="bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-800">
                    📍 بالمربع/المحول: <strong className="text-amber-300">{searchMatchStats.matchedZone}</strong>
                  </span>
                )}
                {searchMatchStats.matchedCode > 0 && (
                  <span className="bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-800">
                    🏷️ بالكود: <strong className="text-amber-300">{searchMatchStats.matchedCode}</strong>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const matchingIds = filteredSubscribers.map(s => s.id);
                  setSelectedIds(prev => Array.from(new Set([...prev, ...matchingIds])));
                }}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                title="تحديد كل المشتركين الذين ظهروا في نتيجة البحث الحالية"
              >
                تحديد كافة النتائج ({filteredSubscribers.length})
              </button>
              <button
                onClick={() => {
                  setSubSearch('');
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
              >
                تفريغ البحث
              </button>
            </div>
          </div>
        )}

        {/* Dropdown Filters Grid */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-800/60">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold pl-1">
            <Filter className="w-3.5 h-3.5 text-amber-500" />
            <span>تصفية:</span>
          </div>

          <select 
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            className={`bg-slate-950/90 border text-xs rounded-xl px-3 py-2 outline-none transition-all cursor-pointer font-bold ${
              filterStatus !== 'all' ? 'border-amber-500 text-amber-400 ring-1 ring-amber-500/30' : 'border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <option value="all">كل الحالات (نشط / موقوف)</option>
            <option value="active">نشط فقط</option>
            <option value="suspended">موقوف فقط</option>
          </select>

          <select 
            value={filterTariff}
            onChange={e => { setFilterTariff(e.target.value); setCurrentPage(1); }}
            className={`bg-slate-950/90 border text-xs rounded-xl px-3 py-2 outline-none transition-all cursor-pointer font-bold ${
              filterTariff !== 'all' ? 'border-amber-500 text-amber-400 ring-1 ring-amber-500/30' : 'border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <option value="all">كل أنواع التعرفة</option>
            <option value="residential">سكني</option>
            <option value="commercial">تجاري</option>
            <option value="industrial">صناعي</option>
            <option value="government">حكومي</option>
            <option value="agricultural">زراعي</option>
            <option value="mosque">مساجد وخيري</option>
            <option value="other">أخرى</option>
          </select>

          <select 
            value={filterZone}
            onChange={e => { setFilterZone(e.target.value); setCurrentPage(1); }}
            className={`bg-slate-950/90 border text-xs rounded-xl px-3 py-2 outline-none transition-all cursor-pointer font-bold ${
              filterZone !== 'all' ? 'border-amber-500 text-amber-400 ring-1 ring-amber-500/30' : 'border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <option value="all">كل المناطق والمربعات</option>
            {uniqueZones.map(z => <option key={z} value={z}>{z}</option>)}
          </select>

          <select 
            value={filterTransformer}
            onChange={e => { setFilterTransformer(e.target.value); setCurrentPage(1); }}
            className={`bg-slate-950/90 border text-xs rounded-xl px-3 py-2 outline-none transition-all cursor-pointer font-bold ${
              filterTransformer !== 'all' ? 'border-amber-500 text-amber-400 ring-1 ring-amber-500/30' : 'border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <option value="all">كل المحولات / العدادات المركزية</option>
            <option value="none">بدون محول محدد</option>
            {uniqueTransformers.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select 
            value={filterDebt}
            onChange={e => { setFilterDebt(e.target.value); setCurrentPage(1); }}
            className={`bg-slate-950/90 border text-xs rounded-xl px-3 py-2 outline-none transition-all cursor-pointer font-bold ${
              filterDebt !== 'all' ? 'border-amber-500 text-amber-400 ring-1 ring-amber-500/30' : 'border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <option value="all">جميع الأرصدة</option>
            <option value="has_debt">عليه مديونية ({">"} 0)</option>
            <option value="high_debt">متعثر (أكثر من 10,000)</option>
          </select>

          <select 
            value={filterCycle}
            onChange={e => { setFilterCycle(e.target.value); setCurrentPage(1); }}
            className={`bg-slate-950/90 border text-xs rounded-xl px-3 py-2 outline-none transition-all cursor-pointer font-bold ${
              filterCycle !== 'all' ? 'border-amber-500 text-amber-400 ring-1 ring-amber-500/30' : 'border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <option value="all">كل دورات القراءة</option>
            <option value="due">مستحق القراءة (10 أيام)</option>
            <option value="overdue">متأخر القراءة</option>
            <option value="completed">تمت القراءة حديثاً</option>
          </select>
        </div>

        {/* Batch Actions Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 bg-slate-950/50 p-2.5 rounded-2xl">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-bold px-1">إجراءات مجمعة على المشتركين المحددين:</span>
            <span className={`px-2 py-0.5 rounded-lg text-xs font-mono font-black ${
              selectedIds.length > 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-500'
            }`}>
              {selectedIds.length} محدد
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 items-center">
            <button 
              disabled={selectedIds.length === 0}
              onClick={() => handleBulkStatusToggle('suspended')}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                selectedIds.length === 0 
                  ? 'bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800' 
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 hover:shadow-lg'
              }`}
            >
              <UserX className="w-3.5 h-3.5" />
              <span>إيقاف الخدمة</span>
            </button>
            <button 
              disabled={selectedIds.length === 0}
              onClick={() => handleBulkStatusToggle('active')}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                selectedIds.length === 0 
                  ? 'bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800' 
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 hover:shadow-lg'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>تفعيل الخدمة</span>
            </button>
            <button 
              disabled={selectedIds.length === 0}
              onClick={handleBulkReminder}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                selectedIds.length === 0 
                  ? 'bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800' 
                  : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 hover:shadow-lg'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>رسالة تذكير</span>
            </button>
            <button 
              disabled={selectedIds.length === 0}
              onClick={() => setShowExportModal(true)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                selectedIds.length === 0 
                  ? 'bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800' 
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 hover:shadow-lg'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير المحدد (Excel/CSV)</span>
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'map' ? (
        <Suspense fallback={<MapLoadingFallback />}>
          <SubscribersMap 
            subscribers={filteredSubscribers} 
            allSubscribers={subscribers}
            onUpdateSubscribers={onUpdateSubscribers}
            onAddAuditLog={onAddAuditLog}
            currentUser={currentUser}
            settings={settings}
          />
        </Suspense>
      ) : (
      <>
      <div className="bg-slate-900/70 rounded-2xl border border-slate-800/90 overflow-hidden relative shadow-2xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-slate-200 border-b border-slate-800 font-sans tracking-wide">
                <th className="p-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.length === paginatedSubscribers.length && paginatedSubscribers.length > 0}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900/90 focus:ring-amber-500 text-amber-500 accent-amber-500 cursor-pointer"
                  />
                </th>
                <th className="p-4 font-black text-slate-200">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <span>المشترك ورقم العداد</span>
                  </div>
                </th>
                <th className="p-4 font-black text-slate-200">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-sky-400" />
                    <span>رقم الهاتف والتواصل</span>
                  </div>
                </th>
                <th className="p-4 font-black text-slate-200">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>المربع الجغرافي والمحول</span>
                  </div>
                </th>
                <th className="p-4 font-black text-center text-slate-200">
                  <div className="flex items-center justify-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>دورة القراءة (10 أيام)</span>
                  </div>
                </th>
                <th className="p-4 font-black text-center text-slate-200">
                  <div className="flex items-center justify-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>الرصيد المستحق (المتبقي)</span>
                  </div>
                </th>
                <th className="p-4 font-black text-center text-slate-200">الحالة</th>
                <th className="p-4 font-black text-center text-slate-200">العمليات والتحكم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedSubscribers.map((sub, index) => {
                const liveBal = getSubBalance(sub);
                const isMismatch = Math.abs((sub.currentBalance || 0) - liveBal) > 0.01;
                const latest = getSubLatestReading(sub);
                const cycleStatus = getReadingCycleStatus(latest?.readingDate, 10);
                const isDebtCritical = liveBal > 20000;
                const isDebtModerate = liveBal > 0;
                const isCleanOrCredit = liveBal <= 0;

                const tariffLabel = sub.tariffType === 'commercial' ? 'تجاري' : sub.tariffType === 'industrial' ? 'صناعي' : 'سكني';
                const tariffClass = sub.tariffType === 'commercial' 
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/25' 
                  : sub.tariffType === 'industrial' 
                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/25' 
                  : 'bg-sky-500/10 text-sky-400 border-sky-500/25';

                return (
                <tr 
                  key={sub.id} 
                  className={`transition-colors duration-150 cursor-pointer border-r-4 ${
                    index % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-950/30'
                  } ${
                    isDebtCritical 
                      ? 'border-r-rose-500 hover:bg-rose-950/20' 
                      : isDebtModerate 
                      ? 'border-r-amber-500 hover:bg-amber-950/20' 
                      : 'border-r-emerald-500 hover:bg-slate-800/50'
                  }`}
                >
                  <td className="p-4 text-center">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(sub.id)}
                      onChange={() => toggleSelection(sub.id)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 focus:ring-amber-500 text-amber-500 accent-amber-500 cursor-pointer"
                    />
                  </td>
                  <td className="p-4" onClick={() => setSelectedProfile(sub)}>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-amber-400 hover:text-amber-300 transition-colors text-[13px]">
                        <HighlightMatch text={sub.name} query={subSearch} />
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${tariffClass}`}>
                        {tariffLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-300 font-mono bg-slate-950/80 px-2 py-0.5 rounded-md border border-slate-800">
                        عداد #<HighlightMatch text={sub.meterNumber || ''} query={subSearch} />
                      </span>
                    </div>
                  </td>
                  <td className="p-4 font-mono" onClick={() => setSelectedProfile(sub)}>
                    {sub.phone ? (
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <span className="bg-slate-950/60 px-2 py-1 rounded-lg border border-slate-800/80 font-bold text-xs tracking-wider text-sky-300" dir="ltr">
                          <HighlightMatch text={sub.phone} query={subSearch} />
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-600 text-[11px] italic">غير مسجل</span>
                    )}
                  </td>
                  <td className="p-4" onClick={() => setSelectedProfile(sub)}>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-slate-200 flex items-center gap-1">
                        <span>
                          <HighlightMatch text={(sub.zone || 'المنطقة الرئيسية').replace('المنطقة ', '')} query={subSearch} />
                        </span>
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-500" />
                        <span>
                          <HighlightMatch text={sub.transformer || 'بدون محول محدد'} query={subSearch} />
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-center" onClick={() => setSelectedProfile(sub)}>
                    <div className="flex flex-col items-center justify-center gap-1">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center justify-center gap-1.5 shadow-xs ${cycleStatus.badgeClass}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        <span>{cycleStatus.isDue ? 'مستحق القراءة' : `قبل ${cycleStatus.daysElapsed || 0} يوم`}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono font-medium">
                        {latest ? latest.readingDate.split(' ')[0] : 'لا توجد قراءة'}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-center font-mono" onClick={() => setSelectedProfile(sub)}>
                    <div className="flex flex-col items-center justify-center">
                      <div className={`px-3 py-1 rounded-xl font-black text-xs border ${
                        isDebtCritical 
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' 
                          : isDebtModerate 
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' 
                          : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {liveBal > 0 
                          ? `${liveBal.toLocaleString()} ${settings.currency}`
                          : liveBal < 0 
                          ? `${Math.abs(liveBal).toLocaleString()} ${settings.currency} (دائن)`
                          : `0 ${settings.currency} (خالص)`
                        }
                      </div>
                      {isMismatch && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded mt-1 border border-amber-500/30 font-sans" title="تم تحديث الرصيد ومطابقته مع حركة القراءات والمقبوضات بقاعدة البيانات">
                          محدث من الدفتر
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => toggleSubStatus(sub)}
                      className={`px-3 py-1 rounded-full text-[10px] font-black transition-all cursor-pointer shadow-xs ${
                        sub.status === 'active' 
                           ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40'
                           : 'bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${sub.status === 'active' ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                        <span>{sub.status === 'active' ? 'نشط وموصول' : 'موقف ومفصول'}</span>
                      </div>
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => setSelectedProfile(sub)}
                        className="bg-slate-950 hover:bg-slate-800 text-sky-400 border border-slate-800 hover:border-sky-500/30 p-2 rounded-xl transition-all cursor-pointer"
                        title="كشف حساب المشترك"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingSub(sub)}
                        className="bg-slate-950 hover:bg-slate-800 text-amber-400 border border-slate-800 hover:border-amber-500/30 p-2 rounded-xl transition-all cursor-pointer"
                        title="تعديل بيانات المشترك"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setSubToDelete(sub)}
                        className="bg-slate-950 hover:bg-rose-950/40 text-rose-400 border border-slate-800 hover:border-rose-500/30 p-2 rounded-xl transition-all cursor-pointer"
                        title="حذف المشترك"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
              {paginatedSubscribers.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500">
                        <SearchX className="w-6 h-6 text-amber-500/70" />
                      </div>
                      <div>
                        <p className="font-black text-sm text-slate-300">لم يتم العثور على أي مشترك مطابق</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {subSearch.trim() 
                            ? `لا توجد نتائج لكلمة البحث "${subSearch}" في نطاق ${
                                searchScope === 'all' ? 'البحث الشامل' :
                                searchScope === 'name' ? 'الاسم' :
                                searchScope === 'meter' ? 'رقم العداد' :
                                searchScope === 'phone' ? 'رقم الهاتف' :
                                searchScope === 'zone' ? 'المربع' : 'الكود'
                              }`
                            : 'لا توجد نتائج مطابقة للفلاتر المحددة حالياً'
                          }
                        </p>
                      </div>
                      <button
                        onClick={resetAllFilters}
                        className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-2"
                      >
                        <FilterX className="w-3.5 h-3.5" />
                        <span>تصفير معايير البحث والفلترة</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Live Table Summary Bar */}
        <div className="bg-slate-950/90 border-t border-slate-800/90 p-3 px-5 flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Users className="w-4 h-4 text-amber-400" />
              <span>إجمالي المشتركين المعروضين: <strong className="text-amber-400 font-mono">{filteredSubscribers.length}</strong></span>
            </span>
            <span className="w-px h-4 bg-slate-800 hidden sm:block"></span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span>نشط:</span>
              <strong className="font-mono">{filteredSubscribers.filter(s => s.status === 'active').length}</strong>
            </span>
            <span className="text-rose-400 flex items-center gap-1">
              <span>موقوف:</span>
              <strong className="font-mono">{filteredSubscribers.filter(s => s.status !== 'active').length}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">إجمالي المديونية في الصفحة:</span>
            <span className="text-rose-400 font-mono font-black bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
              {paginatedSubscribers.reduce((acc, s) => acc + (getSubBalance(s) > 0 ? getSubBalance(s) : 0), 0).toLocaleString()} {settings.currency}
            </span>
          </div>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 bg-slate-900/60 backdrop-blur-md border border-slate-800/80 p-4 rounded-2xl shadow-lg">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>إظهار</span>
          <select 
            value={itemsPerPage} 
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={500}>500</option>
          </select>
          <span>مشترك</span>
          <span className="px-2 border-r border-slate-700">إجمالي: {filteredSubscribers.length}</span>
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-300 px-3 font-medium">
              صفحة <span className="text-white">{currentPage}</span> من {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>



</>
      )}
{typeof document !== 'undefined' && createPortal(<>
      {/* Modals and Drawers */}

      {/* Add Subscriber Modal */}
      <AnimatePresence>
        {showAddSubModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-slate-900 rounded-3xl p-6 w-full max-w-2xl text-right border border-slate-800 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <button onClick={() => setShowAddSubModal(false)} className="text-slate-400 hover:text-white">
                  <XCircle className="w-6 h-6" />
                </button>
                <h3 className="text-lg font-black text-white">إضافة مشترك جديد</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">اسم المشترك</label>
                  <input type="text" value={newSubName} onChange={e => setNewSubName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">رقم الهاتف</label>
                  <input type="text" value={newSubPhone} onChange={e => setNewSubPhone(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 outline-none text-left" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">رقم العداد</label>
                  <input type="text" value={newSubMeter} onChange={e => setNewSubMeter(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-amber-400 font-mono text-xs focus:border-amber-500 outline-none text-left" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">التعرفة</label>
                  <select value={newSubTariff} onChange={e => setNewSubTariff(e.target.value as TariffType)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 outline-none">
                    <option value="residential">سكني</option>
                    <option value="commercial">تجاري</option>
                    <option value="industrial">صناعي</option>
                    <option value="government">حكومي</option>
                    <option value="agricultural">زراعي</option>
                    <option value="mosque">مساجد وخيري</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">المنطقة</label>
                  <select value={newSubZone} onChange={e => setNewSubZone(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 outline-none">
                    <option value="">-- اختر المنطقة --</option>
                    {(Array.isArray(settings.zones) ? settings.zones : []).map((z: any) => {
                      const val = typeof z === 'object' ? z.name : z;
                      return val ? <option key={val} value={val}>{val}</option> : null;
                    })}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">المحول (اختياري)</label>
                  <select value={newSubTransformer} onChange={e => setNewSubTransformer(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 outline-none">
                    <option value="">-- اختر المحول --</option>
                    {(Array.isArray(settings.transformers) ? settings.transformers : []).map((t: any) => {
                      const val = typeof t === 'object' ? t.name : t;
                      return val ? <option key={val} value={val}>{val}</option> : null;
                    })}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">القراءة الافتتاحية</label>
                  <input type="number" value={newSubInitial} onChange={e => setNewSubInitial(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 outline-none text-left" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">الرصيد الافتتاحي (ديون سابقة)</label>
                  <input type="number" value={newSubOpeningBalance} onChange={e => setNewSubOpeningBalance(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 outline-none text-left" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">خط العرض (Latitude) - اختياري</label>
                  <input type="number" step="any" value={newSubLat} onChange={e => setNewSubLat(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 outline-none text-left font-mono" placeholder="مثال: 15.3695" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">خط الطول (Longitude) - اختياري</label>
                  <input type="number" step="any" value={newSubLng} onChange={e => setNewSubLng(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 outline-none text-left font-mono" placeholder="مثال: 44.1910" dir="ltr" />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 text-right mt-3">
                💡 تلميح: يمكنك استخدام أداة "منظار تحديد الإحداثيات للمنازل" (المتقاطع) في تبويب الخريطة لتحديد أي موقع على الخريطة بنقرة واحدة، ثم نسخ الإحداثيات ولصقها هنا.
              </p>
              <div className="mt-4">
                <button onClick={saveNewSubscriber} className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3 rounded-xl text-sm transition-colors">
                  إضافة المشترك
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Edit Subscriber Modal */}
        {editingSub && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-slate-900 rounded-3xl p-6 w-full max-w-2xl text-right border border-slate-800 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <button onClick={() => setEditingSub(null)} className="text-slate-400 hover:text-white">
                  <XCircle className="w-6 h-6" />
                </button>
                <h3 className="text-lg font-black text-white">تعديل بيانات المشترك</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">اسم المشترك</label>
                  <input type="text" value={editingSub.name} onChange={e => setEditingSub({ ...editingSub, name: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">رقم الهاتف</label>
                  <input type="text" value={editingSub.phone} onChange={e => setEditingSub({ ...editingSub, phone: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 outline-none text-left" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">رقم العداد</label>
                  <input type="text" value={editingSub.meterNumber} onChange={e => setEditingSub({ ...editingSub, meterNumber: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-amber-400 font-mono text-xs focus:border-amber-500 outline-none text-left" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">التعرفة</label>
                  <select value={editingSub.tariffType} onChange={e => setEditingSub({ ...editingSub, tariffType: e.target.value as TariffType })} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 outline-none">
                    <option value="residential">سكني</option>
                    <option value="commercial">تجاري</option>
                    <option value="industrial">صناعي</option>
                    <option value="government">حكومي</option>
                    <option value="agricultural">زراعي</option>
                    <option value="mosque">مساجد وخيري</option>
                    <option value="other">أخرى</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">المنطقة</label>
                  <select value={editingSub.zone} onChange={e => setEditingSub({ ...editingSub, zone: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 outline-none">
                    <option value="">-- اختر المنطقة --</option>
                    {(Array.isArray(settings.zones) ? settings.zones : []).map((z: any) => {
                      const val = typeof z === 'object' ? z.name : z;
                      return val ? <option key={val} value={val}>{val}</option> : null;
                    })}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">المحول</label>
                  <select value={editingSub.transformer || ''} onChange={e => setEditingSub({ ...editingSub, transformer: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 outline-none">
                    <option value="">-- اختر المحول --</option>
                    {(Array.isArray(settings.transformers) ? settings.transformers : []).map((t: any) => {
                      const val = typeof t === 'object' ? t.name : t;
                      return val ? <option key={val} value={val}>{val}</option> : null;
                    })}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-amber-400 font-bold flex items-center justify-between">
                    <span>القراءة الافتتاحية (بداية الخدمة)</span>
                    <span className="text-[9px] text-slate-400 font-normal">ك.و</span>
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
                    className="w-full bg-slate-950 border border-amber-500/50 rounded-xl p-2.5 text-amber-300 font-mono font-bold text-xs focus:border-amber-500 outline-none text-left" 
                    dir="ltr" 
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">حالة المشترك والخدمة</label>
                  <select 
                    value={editingSub.status || 'active'} 
                    onChange={e => setEditingSub({ ...editingSub, status: e.target.value as any })} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 outline-none"
                  >
                    <option value="active">🟢 نشط (متصل بالخدمة)</option>
                    <option value="suspended">🟡 موقوف مؤقتاً</option>
                    <option value="disconnected">🔴 مفصول نهائياً</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">الرصيد الافتتاحي (السابق)</label>
                  <input 
                    type="number" 
                    value={editingSub.openingBalance ?? 0} 
                    onChange={e => {
                      const newOpening = parseFloat(e.target.value) || 0;
                      const newCurr = getExactSubscriberBalance({ ...editingSub, openingBalance: newOpening }, readings, payments);
                      setEditingSub({ ...editingSub, openingBalance: newOpening, currentBalance: newCurr });
                    }} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-amber-400 font-bold text-xs focus:border-amber-500 outline-none text-left" 
                    dir="ltr" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">الرصيد المستحق الحالي (المبلغ المتبقي على المشترك)</label>
                  <input 
                    type="number" 
                    value={editingSub.currentBalance} 
                    onChange={e => {
                      const newCurr = parseFloat(e.target.value) || 0;
                      const newOpening = deriveOpeningFromCurrentBalance(newCurr, editingSub, readings, payments);
                      setEditingSub({ ...editingSub, currentBalance: newCurr, openingBalance: newOpening });
                    }} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-rose-400 font-bold text-xs focus:border-amber-500 outline-none text-left" 
                    dir="ltr" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">خط العرض (Latitude) - اختياري</label>
                  <input type="number" step="any" value={editingSub.coordinates?.lat ?? ''} onChange={e => setEditingSub({ ...editingSub, coordinates: e.target.value ? { lat: Number(e.target.value), lng: editingSub.coordinates?.lng ?? 0 } : undefined })} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 outline-none text-left font-mono" placeholder="مثال: 15.3695" dir="ltr" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold">خط الطول (Longitude) - اختياري</label>
                  <input type="number" step="any" value={editingSub.coordinates?.lng ?? ''} onChange={e => setEditingSub({ ...editingSub, coordinates: e.target.value ? { lat: editingSub.coordinates?.lat ?? 0, lng: Number(e.target.value) } : undefined })} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 outline-none text-left font-mono" placeholder="مثال: 44.1910" dir="ltr" />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 text-right mt-3">
                💡 تلميح: يمكنك استخدام أداة "منظار تحديد الإحداثيات للمنازل" (المتقاطع) في تبويب الخريطة لتحديد أي موقع على الخريطة بنقرة واحدة، ثم نسخ الإحداثيات ولصقها هنا.
              </p>
              <div className="mt-4">
                <button onClick={saveEditingSub} className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3 rounded-xl text-sm transition-colors">
                  حفظ التعديلات
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comprehensive Subscriber Profile Drawer (ملف شامل) */}
      <AnimatePresence>
        {selectedProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex justify-end bg-slate-950/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-xl bg-gradient-to-b from-slate-900 to-slate-950 h-full overflow-y-auto border-l border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col"
            >
              <div className="p-5 border-b border-slate-800/80 flex justify-between items-center bg-slate-950/80 backdrop-blur-md sticky top-0 z-10">
                <button onClick={() => setSelectedProfile(null)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-white transition-colors">
                  <XCircle className="w-5 h-5" />
                </button>
                <div className="text-right">
                  <h2 className="text-lg font-black text-white">الملف الشامل للمشترك</h2>
                  <p className="text-xs text-slate-400 font-mono">ID: {selectedProfile.id}</p>
                </div>
              </div>

              <div className="p-6 space-y-6 flex-1 text-right">
                {/* Header Info */}
                <div className="flex items-center justify-end gap-4">
                  <div>
                    <h3 className="text-2xl font-black text-amber-500">{selectedProfile.name}</h3>
                    <div className="flex items-center justify-end gap-2 mt-1 text-xs text-slate-400">
                      <span className="font-mono">{selectedProfile.phone}</span>
                      <span>|</span>
                      <span>{selectedProfile.zone} ({selectedProfile.transformer || 'بدون محول'})</span>
                    </div>
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                    <Users className="w-8 h-8" />
                  </div>
                </div>

                {/* Quick Stats & Financial Ledger Breakdown */}
                {(() => {
                  const subInfo = calculatedBalancesMap.get(selectedProfile.id);
                  const subLiveBal = subInfo ? subInfo.netBalance : selectedProfile.currentBalance;
                  const openBal = selectedProfile.openingBalance || 0;
                  const totalRds = subInfo ? subInfo.totalReadings : 0;
                  const totalPays = subInfo ? subInfo.totalPayments : 0;

                  return (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col items-center">
                          <span className="text-[10px] text-slate-500 font-bold mb-1">
                            {subLiveBal < -0.01 ? 'رصيد دائن مسبق الدفع (فائض)' : 'الرصيد المستحق (مديونية)'}
                          </span>
                          <span className={`text-xl font-black font-mono ${subLiveBal > 0.01 ? 'text-rose-500' : subLiveBal < -0.01 ? 'text-emerald-400' : 'text-slate-300'}`}>
                            {subLiveBal < -0.01 ? `${Math.abs(subLiveBal).toLocaleString()} (دائن)` : subLiveBal.toLocaleString()} {settings.currency}
                          </span>
                        </div>
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col items-center">
                          <span className="text-[10px] text-slate-500 font-bold mb-1">الاستهلاك الحالي</span>
                          <span className="text-xl font-black font-mono text-cyan-400">
                            {selectedProfile.currentReading} <span className="text-sm">ك.و</span>
                          </span>
                        </div>
                      </div>

                      {/* Detailed Financial Ledger Card */}
                      <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
                        <h5 className="text-[11px] font-bold text-amber-400 border-b border-slate-800 pb-1.5 flex items-center justify-between">
                          <span>مطابقة كشف الحساب من قاعدة البيانات</span>
                          <span className="text-[9px] font-mono text-slate-500">Live Ledger</span>
                        </h5>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                            <span className="block text-[9px] text-slate-400 font-bold">الرصيد الافتتاحي</span>
                            <span className="block font-mono font-bold text-slate-200 mt-0.5">{openBal.toLocaleString()}</span>
                          </div>
                          <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                            <span className="block text-[9px] text-cyan-400 font-bold">(+) الفواتير والقراءات</span>
                            <span className="block font-mono font-bold text-cyan-300 mt-0.5">{totalRds.toLocaleString()}</span>
                          </div>
                          <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                            <span className="block text-[9px] text-emerald-400 font-bold">(-) المقبوضات والسداد</span>
                            <span className="block font-mono font-bold text-emerald-300 mt-0.5">{totalPays.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Status & Alerts */}
                <div className={`p-4 rounded-xl border flex items-start gap-3 ${selectedProfile.status === 'active' ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-400' : 'bg-rose-950/30 border-rose-900/50 text-rose-400'}`}>
                  {selectedProfile.status === 'active' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
                  <div>
                    <h4 className="font-bold text-sm">{selectedProfile.status === 'active' ? 'حالة الخدمة: نشطة' : 'حالة الخدمة: موقوفة'}</h4>
                    <p className="text-xs opacity-80 mt-1">
                      {selectedProfile.currentBalance > 5000 ? 'تحذير: المديونية مرتفعة، يرجى التوجيه بالسداد لتفادي الإيقاف.' : 'المشترك منتظم ضمن الحدود المسموحة.'}
                    </p>
                  </div>
                </div>

                {/* Chart placeholder (Mocked consumption data) */}
                <div className="bg-slate-950 rounded-xl border border-slate-800 p-4">
                  <h4 className="text-xs font-bold text-slate-300 mb-4 text-right">منحنى الاستهلاك (الأشهر الستة الماضية)</h4>
                  <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[
                        { name: 'يناير', value: 120 },
                        { name: 'فبراير', value: 150 },
                        { name: 'مارس', value: 130 },
                        { name: 'أبريل', value: 180 },
                        { name: 'مايو', value: 210 },
                        { name: 'يونيو', value: 190 },
                      ]}>
                        <defs>
                          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', fontSize: '12px' }}
                          itemStyle={{ color: '#22d3ee' }}
                        />
                        <Area type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                                {/* Subscriber Timeline */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-white border-b border-slate-800 pb-2">سجل الأحداث (الخط الزمني)</h4>
                  <div className="relative border-r border-slate-800 pr-4 space-y-6 before:absolute before:inset-y-0 before:right-0 before:w-px before:bg-slate-800">
                    
                    {/* Latest Status Event */}
                    {selectedProfile.status === 'suspended' && (
                      <div className="relative">
                        <span className="absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-slate-950"></span>
                        <div className="bg-rose-950/20 border border-rose-900/30 rounded-lg p-3">
                          <p className="text-xs font-bold text-rose-400">إيقاف الخدمة</p>
                          <p className="text-[10px] text-slate-400 mt-1">تم إيقاف الخدمة بسبب تجاوز الحد المسموح للمديونية.</p>
                        </div>
                      </div>
                    )}

                    {/* High Debt Warning Event */}
                    {selectedProfile.currentBalance > 10000 && (
                      <div className="relative">
                        <span className="absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-slate-950"></span>
                        <div className="bg-amber-950/20 border border-amber-900/30 rounded-lg p-3">
                          <p className="text-xs font-bold text-amber-400">إنذار مديونية</p>
                          <p className="text-[10px] text-slate-400 mt-1">تجاوز الرصيد المستحق حاجز الـ 10,000 {settings.currency}. النظام يوصي بإرسال إشعار.</p>
                        </div>
                      </div>
                    )}

                    {/* Subscription Event */}
                    <div className="relative">
                      <span className="absolute -right-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-slate-950"></span>
                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                        <p className="text-xs font-bold text-slate-300">إنشاء الاشتراك</p>
                        <p className="text-[10px] text-slate-500 mt-1">تم تسجيل المشترك في النظام وتفعيل الخدمة.</p>
                        <p className="text-[9px] text-slate-600 mt-1 font-mono">{new Date(selectedProfile.createdAt).toLocaleDateString('ar-EG')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transactions Ledger */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-white border-b border-slate-800 pb-2">سجل العمليات الأخير</h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {/* Interleaving latest 3 readings and 3 payments for demo */}
                    {readings.filter(r => r.subscriberId === selectedProfile.id).slice(-3).map(r => (
                      <div key={r.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                        <span className="font-mono text-rose-400 font-bold">-{r.totalAmount.toLocaleString()}</span>
                        <div className="text-right">
                          <p className="font-bold text-slate-300">فاتورة استهلاك ({r.consumption} ك.و)</p>
                          <p className="text-[10px] text-slate-500">{r.readingDate}</p>
                        </div>
                      </div>
                    ))}
                    {payments.filter(p => p.subscriberId === selectedProfile.id).slice(-3).map(p => (
                      <div key={p.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                        <span className="font-mono text-emerald-400 font-bold">+{p.amountPaid.toLocaleString()}</span>
                        <div className="text-right">
                          <p className="font-bold text-slate-300">سداد دفعة (سند: {p.receiptNumber})</p>
                          <p className="text-[10px] text-slate-500">{p.paymentDate}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Delete Subscriber Confirmation Modal */}
        {subToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 rounded-3xl p-6 w-full max-w-md text-right border border-rose-500/30 shadow-2xl shadow-rose-950/40 relative overflow-hidden"
              dir="rtl"
            >
              <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500" />
              
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">تأكيد حذف المشترك</h3>
                    <p className="text-xs text-rose-400 font-medium mt-0.5">عملية تتطلب التأكيد</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSubToDelete(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition-colors"
                  title="إلغاء / إغلاق"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="my-4 bg-slate-950/90 rounded-2xl p-4 border border-slate-800 space-y-3">
                <p className="text-sm font-bold text-slate-100">
                  هل أنت متأكد من حذف هذا المشترك؟
                </p>
                
                <div className="text-xs text-slate-300 space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">اسم المشترك:</span>
                    <span className="font-bold text-white text-sm">{subToDelete.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">رقم العداد:</span>
                    <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">{subToDelete.meterNumber}</span>
                  </div>
                  {subToDelete.zone && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">المنطقة:</span>
                      <span className="text-slate-200">{subToDelete.zone}</span>
                    </div>
                  )}
                  {subToDelete.phone && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">رقم الهاتف:</span>
                      <span className="font-mono text-slate-200" dir="ltr">{subToDelete.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-amber-400/90 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 mb-5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>سيتم حذف هذا المشترك من قاعدة البيانات بشكل نهائي.</span>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={confirmDeleteSubscriber}
                  className="w-full bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>تأكيد الحذف</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSubToDelete(null)}
                  className="w-full bg-slate-800 hover:bg-slate-700 active:bg-slate-850 text-slate-300 hover:text-white font-bold py-2.5 px-4 rounded-xl text-xs border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>إلغاء / إغلاق</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Balance Reconciliation Smart Audit Modal */}
      <BalanceReconciliationModal
        isOpen={showReconciliationModal}
        onClose={() => setShowReconciliationModal(false)}
        subscribers={subscribers}
        readings={readings}
        payments={payments}
        settings={settings}
        currentUser={currentUser}
        onUpdateSubscribers={onUpdateSubscribers}
        onAddAuditLog={onAddAuditLog}
        onViewSubscriberProfile={(sub) => setSelectedProfile(sub)}
      />

      {/* Comprehensive Subscribers Import Modal */}
      <SubscribersImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        existingSubscribers={subscribers}
        currentUser={currentUser}
        onSubscribersImported={handleSubscribersImported}
        onAddAuditLog={onAddAuditLog}
      />

      {/* Comprehensive Subscribers Export Modal */}
      <SubscribersExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        allSubscribers={subscribers}
        filteredSubscribers={filteredSubscribers}
        selectedIds={selectedIds}
      />

      {/* Due & Overdue Balances & Collections Report Modal */}
      <DueBalancesReportModal
        isOpen={showDueBalancesModal}
        onClose={() => setShowDueBalancesModal(false)}
        subscribers={subscribers}
        readings={readings}
        payments={payments}
        settings={settings}
        currentUser={currentUser}
        onOpenSubscriberStatement={(sub) => {
          setSelectedProfile(sub);
          setShowDueBalancesModal(false);
        }}
      />
      </>, document.body)}
    </motion.div>
  );
};

export default AdminSubscribers;
