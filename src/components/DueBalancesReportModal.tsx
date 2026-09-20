import React, { useState, useMemo, useRef, useDeferredValue, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ExcelJS from 'exceljs';
import { 
  Subscriber, MeterReading, Payment, SystemSettings, User 
} from '../types';
import { 
  getSubscriberTotalReadings, 
  getSubscriberTotalPayments, 
  getExactSubscriberBalance,
  isItemForSubscriber
} from '../utils/balanceUtils';
import { 
  Printer, Download, X, Search, Filter, Phone, CheckCircle2, 
  AlertCircle, DollarSign, Users, Scale, ArrowUpDown, Building2,
  FileSpreadsheet, ShieldAlert, Sparkles, Check, Send, Settings2,
  ArrowRight, ArrowLeft, RotateCcw, FileDown,
  LayoutGrid, Eye, EyeOff, FileCheck, Percent, MessageCircle,
  Copy, Clock, Zap, Wallet, BarChart3, ChevronLeft, ChevronRight,
  PhoneCall, Share2, ClipboardCheck, AlignJustify, Smartphone, CreditCard,
  Layers, Table2, SearchX, FilterX, Command
} from 'lucide-react';
import { safePrint, printOrSaveReportPDF, downloadDirectPDF } from '../utils/exportUtils';
import { sendSMSDirectly } from '../utils/smsService';
import { 
  matchSubscriberSearch, 
  SearchScope 
} from '../utils/arabicSearchUtils';

import { 
  ColumnDefinition, SubscriberBalanceItem, SummaryStatistics, 
  FilterType, DueBalancesReportModalProps 
} from './due-balances/types';
import { AgingAnalyticsCard } from './due-balances/AgingAnalyticsCard';
import { ZoneTransformerCard } from './due-balances/ZoneTransformerCard';
import { WhatsAppNoticeModal } from './due-balances/WhatsAppNoticeModal';
import { FieldNoticeModal } from './due-balances/FieldNoticeModal';
import { ColumnSettingsDrawer } from './due-balances/ColumnSettingsDrawer';
import { PrintStudioPanel } from './due-balances/PrintStudioPanel';
import { LiveSheetPreview } from './due-balances/LiveSheetPreview';
import { QuickCollectModal } from './due-balances/QuickCollectModal';
import { DueBalancesFilters } from './due-balances/DueBalancesFilters';
import { DueBalancesTable } from './due-balances/DueBalancesTable';
import { DueBalancesPagination } from './due-balances/DueBalancesPagination';

export const DEFAULT_COLUMNS: ColumnDefinition[] = [
  { id: 'index', label: 'م', visible: true, align: 'center', width: '40px' },
  { id: 'meterNumber', label: 'رقم العداد', visible: true, align: 'center', isNumeric: true },
  { id: 'name', label: 'اسم المشترك', visible: true, align: 'right' },
  { id: 'phone', label: 'رقم الهاتف', visible: true, align: 'left' },
  { id: 'zone', label: 'المنطقة / المربع', visible: true, align: 'right' },
  { id: 'collectorName', label: 'المحصل المسؤول', visible: false, align: 'right' },
  { id: 'overdueAmount', label: 'المبالغ المتأخرة', visible: true, align: 'center', isCurrency: true },
  { id: 'currentDue', label: 'مبلغ آخر فاتورة', visible: true, align: 'center', isCurrency: true },
  { id: 'totalCollected', label: 'المبالغ المحصلة', visible: true, align: 'center', isCurrency: true },
  { id: 'totalDue', label: 'إجمالي المبلغ المطلوب', visible: true, align: 'center', isCurrency: true },
  { id: 'collectionRate', label: 'نسبة التحصيل %', visible: true, align: 'center' },
  { id: 'fieldPaid', label: 'المحصل (يدوي)', visible: false, align: 'center', width: '75px' },
  { id: 'receiptNumber', label: 'رقم السند', visible: false, align: 'center', width: '70px' },
  { id: 'subscriberSignature', label: 'توقيع المشترك', visible: false, align: 'center', width: '85px' },
  { id: 'transformer', label: 'المحول', visible: false, align: 'right' },
  { id: 'tariffType', label: 'نوع الاشتراك', visible: false, align: 'center' },
  { id: 'openingBalance', label: 'الرصيد الافتتاحي', visible: false, align: 'center', isCurrency: true },
  { id: 'totalBilled', label: 'إجمالي الفواتير', visible: false, align: 'center', isCurrency: true },
  { id: 'paymentStatusLabel', label: 'حالة السداد', visible: false, align: 'center' },
  { id: 'lastPaymentDate', label: 'تاريخ آخر سداد', visible: false, align: 'center' },
  { id: 'lastPaymentAmount', label: 'مبلغ آخر سداد', visible: false, align: 'center', isCurrency: true },
  { id: 'lastReadingDate', label: 'تاريخ آخر قراءة', visible: false, align: 'center' },
  { id: 'lastConsumption', label: 'استهلاك آخر دورة (ك.و)', visible: false, align: 'center' },
  { id: 'status', label: 'حالة الحساب', visible: false, align: 'center' },
  { id: 'notes', label: 'ملاحظات', visible: false, align: 'right' }
];

export const DueBalancesReportModal: React.FC<DueBalancesReportModalProps> = ({
  isOpen = true,
  onClose,
  onBack,
  isModal = true,
  subscribers = [],
  readings = [],
  payments = [],
  settings,
  currentUser,
  users = [],
  employees = [],
  collectorsList = [],
  onOpenSubscriberStatement,
  onCollectPayment,
  onAddPayment
}) => {
  const [columns, setColumns] = useState<ColumnDefinition[]>(DEFAULT_COLUMNS);
  const [filterType, setFilterType] = useState<FilterType>('debtorsOnly');
  const [selectedZone, setSelectedZone] = useState('all');
  const [selectedTransformer, setSelectedTransformer] = useState('all');
  const [selectedCollector, setSelectedCollector] = useState('all');
  const [selectedTariff, setSelectedTariff] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [searchScope, setSearchScope] = useState<SearchScope>('all');
  const [minDebtAmount, setMinDebtAmount] = useState<number>(5000);
  const [sortBy, setSortBy] = useState<'totalDue' | 'overdueAmount' | 'currentDue' | 'collected' | 'collectionRate' | 'name' | 'meter' | 'lastPayment'>('totalDue');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  
  // Pagination State for Instant Responsiveness
  const [pageSize, setPageSize] = useState<number | 'all'>(25);
  const [currentPage, setCurrentPage] = useState<number>(0);

  // Reset pagination to first page when any search or filter criteria changes
  useEffect(() => {
    setCurrentPage(0);
  }, [filterType, selectedZone, selectedTransformer, selectedCollector, selectedTariff, selectedMonth, searchQuery, searchScope, sortBy, sortOrder]);

  // Selection state
  const [selectedSubIds, setSelectedSubIds] = useState<string[]>([]);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [smsSendingState, setSmsSendingState] = useState<string | null>(null);

  // Local session payments for instant live updates on quick collection
  const [sessionPayments, setSessionPayments] = useState<Payment[]>([]);

  // View Mode: Interactive Table vs Live Print A4 Sheet Preview vs Analytics
  const [viewMode, setViewMode] = useState<'table' | 'sheet_preview' | 'analytics'>('table');
  const [mobileDisplayMode, setMobileDisplayMode] = useState<'cards' | 'table'>('cards');
  const [sheetPreviewPageIndex, setSheetPreviewPageIndex] = useState<number>(0);

  // Notice, Slip & Quick Collect Modals
  const [activeNoticeItem, setActiveNoticeItem] = useState<SubscriberBalanceItem | null>(null);
  const [activeSlipItem, setActiveSlipItem] = useState<SubscriberBalanceItem | null>(null);
  const [activeQuickCollectItem, setActiveQuickCollectItem] = useState<SubscriberBalanceItem | null>(null);

  // Customization & Display options
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [showPrintStudio, setShowPrintStudio] = useState(false);
  const [showSignatures, setShowSignatures] = useState(true);
  const [showTotalsRow, setShowTotalsRow] = useState(true);
  const [totalsOnLastPageOnly, setTotalsOnLastPageOnly] = useState(true);
  const [rowsPerPage, setRowsPerPage] = useState<number>(14);
  const [isCustomRowsPerPage, setIsCustomRowsPerPage] = useState(false);
  const [customRowsInput, setCustomRowsInput] = useState<string>('14');
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Advanced Print & Typography Customization Options
  const [printFontFamily, setPrintFontFamily] = useState<string>('Cairo');
  const [paperMargin, setPaperMargin] = useState<'compact' | 'standard' | 'spacious'>('standard');
  const [printFontSize, setPrintFontSize] = useState<'xsmall' | 'small' | 'medium' | 'large' | 'xlarge' | 'custom'>('medium');
  const [customFontSizePx, setCustomFontSizePx] = useState<number>(11);
  const [tableDensity, setTableDensity] = useState<'compact' | 'standard' | 'spacious'>('standard');
  const [printTheme, setPrintTheme] = useState<'modern' | 'striped' | 'bordered' | 'minimal'>('modern');
  const [showHeaderInPrint, setShowHeaderInPrint] = useState<boolean>(true);
  const [showFilterBarInPrint, setShowFilterBarInPrint] = useState<boolean>(true);
  const [showPageNumbersInPrint, setShowPageNumbersInPrint] = useState<boolean>(true);
  const [customPrintNote, setCustomPrintNote] = useState<string>('');
  const [signer1, setSigner1] = useState<string>('المحاسب المسؤول');
  const [signer2, setSigner2] = useState<string>('مسؤول التحصيل الميداني');
  const [signer3, setSigner3] = useState<string>('المدير العام / الاعتماد');
  const [screenFontSize, setScreenFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  
  const printableAreaRef = useRef<HTMLDivElement>(null);

  // Extract unique filter items
  const uniqueZones = useMemo(() => {
    const zones = new Set(subscribers.map(s => s.zone).filter(Boolean) as string[]);
    return Array.from(zones);
  }, [subscribers]);

  const uniqueTransformers = useMemo(() => {
    const transformers = new Set(subscribers.map(s => s.transformer).filter(Boolean) as string[]);
    return Array.from(transformers);
  }, [subscribers]);

  const uniqueMonths = useMemo(() => {
    const months = new Set(
      readings.map(r => r.billingMonth || (r as any).readingMonth || (r as any).month).filter(Boolean) as string[]
    );
    return Array.from(months).sort().reverse();
  }, [readings]);

  // Pre-index readings & payments per subscriber with robust identification & deduplication
  const { readingsBySub, paymentsBySub } = useMemo(() => {
    const rMap = new Map<string, MeterReading[]>();
    const pMap = new Map<string, Payment[]>();

    const registerReading = (key: string, r: MeterReading) => {
      if (!key) return;
      const k = key.trim().toLowerCase();
      if (!rMap.has(k)) rMap.set(k, []);
      const arr = rMap.get(k)!;
      if (!arr.some(existing => existing.id === r.id)) {
        arr.push(r);
      }
    };

    const registerPayment = (key: string, p: Payment) => {
      if (!key) return;
      const k = key.trim().toLowerCase();
      if (!pMap.has(k)) pMap.set(k, []);
      const arr = pMap.get(k)!;
      if (!arr.some(existing => existing.id === p.id)) {
        arr.push(p);
      }
    };

    (readings || []).forEach(r => {
      if (!r || r.isRejected || (r as any).status === 'rejected') return;
      if (r.subscriberId) registerReading(r.subscriberId, r);
      if (r.meterNumber) registerReading(`meter_${r.meterNumber}`, r);
      if ((r as any).subscriberMeterNumber) registerReading(`meter_${(r as any).subscriberMeterNumber}`, r);
      if (r.subscriberName) registerReading(`name_${r.subscriberName}`, r);
    });

    const allCombinedPayments = [...payments, ...sessionPayments];
    allCombinedPayments.forEach(p => {
      if (!p || p.isRejected || (p as any).status === 'rejected') return;
      if (p.subscriberId) registerPayment(p.subscriberId, p);
      if ((p as any).meterNumber) registerPayment(`meter_${(p as any).meterNumber}`, p);
      if ((p as any).subscriberMeterNumber) registerPayment(`meter_${(p as any).subscriberMeterNumber}`, p);
      if (p.subscriberName) registerPayment(`name_${p.subscriberName}`, p);
    });

    return { readingsBySub: rMap, paymentsBySub: pMap };
  }, [readings, payments, sessionPayments]);

  // Calculate detailed balance data for all subscribers
  const allSubscriberData = useMemo<SubscriberBalanceItem[]>(() => {
    const now = new Date();

    return subscribers.map(sub => {
      // Collect unique readings and payments for this subscriber
      const readingSet = new Map<string, MeterReading>();
      const paymentSet = new Map<string, Payment>();

      const addReadings = (list?: MeterReading[]) => {
        if (!list) return;
        list.forEach(r => {
          if (r && !readingSet.has(r.id)) readingSet.set(r.id, r);
        });
      };

      const addPayments = (list?: Payment[]) => {
        if (!list) return;
        list.forEach(p => {
          if (p && !paymentSet.has(p.id)) paymentSet.set(p.id, p);
        });
      };

      if (sub.id) {
        addReadings(readingsBySub.get(sub.id.trim().toLowerCase()));
        addPayments(paymentsBySub.get(sub.id.trim().toLowerCase()));
      }
      if (sub.subscriberCode) {
        addReadings(readingsBySub.get(sub.subscriberCode.trim().toLowerCase()));
        addPayments(paymentsBySub.get(sub.subscriberCode.trim().toLowerCase()));
      }
      if (sub.meterNumber) {
        const mKey = `meter_${sub.meterNumber.trim().toLowerCase()}`;
        addReadings(readingsBySub.get(mKey));
        addPayments(paymentsBySub.get(mKey));
      }
      if (sub.name) {
        const nKey = `name_${sub.name.trim().toLowerCase()}`;
        addReadings(readingsBySub.get(nKey));
        addPayments(paymentsBySub.get(nKey));
      }

      const subReadings = Array.from(readingSet.values());
      const subPayments = Array.from(paymentSet.values());

      // Helper for accurate chronological timestamp sorting
      const getTimestamp = (dateStr?: string) => {
        if (!dateStr) return 0;
        const t = new Date(dateStr).getTime();
        return isNaN(t) ? 0 : t;
      };

      // Sort chronological descending
      const sortedReadings = [...subReadings].sort((a, b) => {
        const timeB = getTimestamp(b.readingDate || (b as any).date || (b as any).createdAt);
        const timeA = getTimestamp(a.readingDate || (a as any).date || (a as any).createdAt);
        return timeB - timeA;
      });

      const sortedPayments = [...subPayments].sort((a, b) => {
        const timeB = getTimestamp(b.paymentDate || (b as any).date || (b as any).createdAt);
        const timeA = getTimestamp(a.paymentDate || (a as any).date || (a as any).createdAt);
        return timeB - timeA;
      });

      const lastReading = sortedReadings[0];
      const lastPayment = sortedPayments[0];

      const openingBalance = Number(sub.openingBalance || 0);
      const totalBilled = subReadings.reduce((sum, r) => sum + (Number(r.totalAmount || (r as any).netAmountDue || (r as any).amount || 0)), 0);
      const totalCollected = subPayments.reduce((sum, p) => sum + (Number(p.amountPaid || (p as any).amount || 0)), 0);

      // Exact net ledger balance
      const exactBalance = Number((openingBalance + totalBilled - totalCollected).toFixed(2));
      
      const lastReadingGross = lastReading 
        ? Number(lastReading.totalAmount || (lastReading as any).netAmountDue || (lastReading as any).amount || 0)
        : 0;

      const totalDue = exactBalance > 0 ? exactBalance : 0;
      // Current due cannot exceed the total due obligation
      const currentDue = Math.min(totalDue, lastReadingGross);
      // Overdue balance is the remainder so overdueAmount + currentDue === totalDue
      const overdueAmount = Math.max(0, Number((totalDue - currentDue).toFixed(2)));

      const totalObligation = totalDue + totalCollected;
      const collectionRate = totalObligation > 0 
        ? Math.round((totalCollected / totalObligation) * 100) 
        : (totalDue === 0 ? 100 : 0);

      // Status classification
      let paymentStatus: 'fully_paid' | 'partial' | 'unpaid' | 'creditor' = 'unpaid';
      let paymentStatusLabel = 'غير مسدد';

      if (exactBalance < -0.01) {
        paymentStatus = 'creditor';
        paymentStatusLabel = 'رصيد دائن (فائض)';
      } else if (exactBalance <= 0.01) {
        paymentStatus = 'fully_paid';
        paymentStatusLabel = 'مسدد بالكامل';
      } else if (totalCollected > 0) {
        paymentStatus = 'partial';
        paymentStatusLabel = 'سداد جزئي';
      } else {
        paymentStatus = 'unpaid';
        paymentStatusLabel = 'غير مسدد إطلاقاً';
      }

      // Calculate days since last payment & aging bracket
      let daysSinceLastPayment = 999;
      const lastPayDateStr = lastPayment?.paymentDate || (lastPayment as any)?.date || (lastPayment as any)?.createdAt;
      if (lastPayDateStr) {
        const pDate = new Date(lastPayDateStr);
        if (!isNaN(pDate.getTime())) {
          const diffTime = Math.abs(now.getTime() - pDate.getTime());
          daysSinceLastPayment = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
      }

      let agingBracket: 'current' | 'days31_60' | 'days61_90' | 'over90' = 'current';
      let agingBracketLabel = '0 - 30 يوم (حالي)';

      if (overdueAmount <= 0) {
        agingBracket = 'current';
        agingBracketLabel = '0 - 30 يوم (دورة حالية)';
      } else if (daysSinceLastPayment > 90 || (lastReading && overdueAmount > currentDue * 2)) {
        agingBracket = 'over90';
        agingBracketLabel = 'أكثر من 90 يوم (حرج)';
      } else if (daysSinceLastPayment > 60 || overdueAmount > currentDue) {
        agingBracket = 'days61_90';
        agingBracketLabel = '61 - 90 يوم';
      } else {
        agingBracket = 'days31_60';
        agingBracketLabel = '31 - 60 يوم';
      }

      const lastReadDateStr = lastReading?.readingDate || (lastReading as any)?.date || (lastReading as any)?.createdAt;
      const formattedLastReadingDate = lastReadDateStr && !isNaN(new Date(lastReadDateStr).getTime())
        ? new Date(lastReadDateStr).toLocaleDateString('ar-YE')
        : '-';

      const formattedLastPaymentDate = lastPayDateStr && !isNaN(new Date(lastPayDateStr).getTime())
        ? new Date(lastPayDateStr).toLocaleDateString('ar-YE')
        : '-';

      const lastReadingMonth = lastReading?.billingMonth || (lastReading as any)?.readingMonth || (lastReading as any)?.month || '-';
      const lastConsumption = Number(lastReading?.consumption ?? ((lastReading?.currentReading ?? 0) - (lastReading?.previousReading ?? 0)) ?? 0);

      // Determine assigned or associated collector
      let collectorName = (sub as any).collectorName || (sub as any).collector || (sub as any).assignedCollector || '';
      if (!collectorName && lastPayment) {
        collectorName = (lastPayment as any).collectorName || (lastPayment as any).collectedBy || (lastPayment as any).receivedBy || '';
      }
      if (!collectorName) {
        const paymentWithCollector = sortedPayments.find(p => (p as any).collectorName || (p as any).collectedBy || (p as any).receivedBy);
        if (paymentWithCollector) {
          collectorName = (paymentWithCollector as any).collectorName || (paymentWithCollector as any).collectedBy || (paymentWithCollector as any).receivedBy || '';
        }
      }
      if (!collectorName && sub.zone && users) {
        const zoneCollector = users.find(u => u.role === 'collector' && (u as any).zone === sub.zone);
        if (zoneCollector) collectorName = zoneCollector.name;
      }
      if (!collectorName && sub.zone && employees) {
        const zoneEmp = employees.find(e => (e.role === 'collector' || e.jobTitle?.includes('حصل')) && (e as any).zone === sub.zone);
        if (zoneEmp) collectorName = zoneEmp.name;
      }
      if (!collectorName) {
        collectorName = 'غير محدد';
      }

      return {
        subscriber: sub,
        meterNumber: sub.meterNumber || '-',
        name: sub.name || 'بدون اسم',
        phone: sub.phone || '-',
        zone: sub.zone || 'غير محدد',
        collectorName,
        fieldPaid: '',
        receiptNumber: '',
        subscriberSignature: '',
        transformer: sub.transformer || 'غير محدد',
        tariffType: sub.tariffType === 'commercial' ? 'تجاري' : sub.tariffType === 'residential' ? 'سكني' : (sub.tariffType || 'عادي'),
        rawTariff: sub.tariffType || '',
        status: sub.status === 'active' ? 'نشط' : sub.status === 'inactive' ? 'غير نشط' : (sub.status || 'نشط'),
        openingBalance,
        totalBilled,
        totalCollected,
        collectionRate,
        overdueAmount,
        currentDue,
        totalDue,
        paymentStatus,
        paymentStatusLabel,
        lastPaymentDate: formattedLastPaymentDate,
        lastPaymentAmount: Number(lastPayment?.amountPaid || (lastPayment as any)?.amount || 0),
        lastPaymentDaysAgo: daysSinceLastPayment,
        lastReadingDate: formattedLastReadingDate,
        lastReadingMonth,
        lastConsumption,
        agingBracket,
        agingBracketLabel,
        notes: ''
      };
    });
  }, [subscribers, readingsBySub, paymentsBySub, users, employees]);

  // Extract unique collectors
  const uniqueCollectors = useMemo(() => {
    const set = new Set<string>();
    allSubscriberData.forEach(i => {
      if (i.collectorName && i.collectorName !== 'غير محدد') set.add(i.collectorName);
    });
    (users || []).forEach(u => {
      if (u.role === 'collector' && u.name) set.add(u.name);
    });
    (employees || []).forEach(e => {
      if ((e.role === 'collector' || e.jobTitle?.includes('حصل') || e.department?.includes('حصل')) && e.name) {
        set.add(e.name);
      }
    });
    (collectorsList || []).forEach(c => {
      if (c && c !== 'غير محدد') set.add(c);
    });
    return Array.from(set).sort();
  }, [allSubscriberData, users, employees, collectorsList]);

  // Calculate real-time category counts for filter tabs
  const categoryCounts = useMemo(() => {
    let debtors = 0;
    let unpaid = 0;
    let partial = 0;
    let fullyPaid = 0;
    let highDebtors = 0;
    let creditors = 0;
    let agingCurrent = 0;
    let aging31_60 = 0;
    let aging61_90 = 0;
    let agingOver90 = 0;

    allSubscriberData.forEach(item => {
      if (item.totalDue > 0) debtors++;
      if (item.paymentStatus === 'unpaid' && item.totalDue > 0) unpaid++;
      if (item.paymentStatus === 'partial') partial++;
      if (item.paymentStatus === 'fully_paid') fullyPaid++;
      if (item.totalDue >= minDebtAmount) highDebtors++;
      if (item.paymentStatus === 'creditor') creditors++;
      if (item.agingBracket === 'current') agingCurrent++;
      if (item.agingBracket === 'days31_60') aging31_60++;
      if (item.agingBracket === 'days61_90') aging61_90++;
      if (item.agingBracket === 'over90') agingOver90++;
    });

    return {
      all: allSubscriberData.length,
      debtorsOnly: debtors,
      unpaidOnly: unpaid,
      partialOnly: partial,
      partialPaid: partial,
      fullyPaid,
      highDebtors,
      creditors,
      creditorsOnly: creditors,
      aging_current: agingCurrent,
      aging_31_60: aging31_60,
      aging_61_90: aging61_90,
      aging_over90: agingOver90
    };
  }, [allSubscriberData, minDebtAmount]);

  // Active filters count for quick reset pill
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterType !== 'all') count++;
    if (selectedZone !== 'all') count++;
    if (selectedTransformer !== 'all') count++;
    if (selectedCollector !== 'all') count++;
    if (selectedTariff !== 'all') count++;
    if (selectedMonth !== 'all') count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [filterType, selectedZone, selectedTransformer, selectedCollector, selectedTariff, selectedMonth, searchQuery]);

  const handleResetFilters = () => {
    setFilterType('all');
    setSelectedZone('all');
    setSelectedTransformer('all');
    setSelectedCollector('all');
    setSelectedTariff('all');
    setSelectedMonth('all');
    setSearchQuery('');
    setSearchScope('all');
    setPageSize(25);
    setCurrentPage(0);
  };

  // Filtered & Sorted items with Arabic normalization & multi-token search
  const filteredItems = useMemo(() => {
    const scoredItems = allSubscriberData.map(item => {
      // Filter by type
      if (filterType === 'debtorsOnly' && item.totalDue <= 0) return null;
      if (filterType === 'unpaidOnly' && (item.paymentStatus !== 'unpaid' || item.totalDue <= 0)) return null;
      if ((filterType === 'partialOnly' || filterType === 'partialPaid') && item.paymentStatus !== 'partial') return null;
      if (filterType === 'fullyPaid' && item.paymentStatus !== 'fully_paid') return null;
      if (filterType === 'highDebtors' && item.totalDue < minDebtAmount) return null;
      if ((filterType === 'creditors' || filterType === 'creditorsOnly') && item.paymentStatus !== 'creditor') return null;
      if (filterType === 'aging_current' && item.agingBracket !== 'current') return null;
      if (filterType === 'aging_31_60' && item.agingBracket !== 'days31_60') return null;
      if (filterType === 'aging_61_90' && item.agingBracket !== 'days61_90') return null;
      if (filterType === 'aging_over90' && item.agingBracket !== 'over90') return null;

      // Filter by zone
      if (selectedZone !== 'all' && item.zone !== selectedZone) return null;

      // Filter by transformer
      if (selectedTransformer !== 'all' && item.transformer !== selectedTransformer) return null;

      // Filter by collector
      if (selectedCollector !== 'all' && item.collectorName !== selectedCollector) return null;

      // Filter by tariff
      if (selectedTariff !== 'all') {
        const match = item.tariffType.includes(selectedTariff) || item.rawTariff.includes(selectedTariff);
        if (!match) return null;
      }

      // Filter by billing month
      if (selectedMonth !== 'all' && item.lastReadingMonth !== selectedMonth) return null;

      // Smart Search Match with deferred input
      let searchScore = 0;
      if (deferredSearchQuery.trim()) {
        const res = matchSubscriberSearch(item.subscriber, deferredSearchQuery, searchScope);
        if (!res.isMatch) {
          const normQ = deferredSearchQuery.toLowerCase().trim();
          const zoneMatch = item.zone && item.zone.toLowerCase().includes(normQ);
          const transMatch = item.transformer && item.transformer.toLowerCase().includes(normQ);
          const colMatch = item.collectorName && item.collectorName.toLowerCase().includes(normQ);
          if (zoneMatch || transMatch || colMatch) {
            searchScore = 15;
          } else {
            return null;
          }
        } else {
          searchScore = res.score;
        }
      }

      return { item, searchScore };
    }).filter((x): x is { item: SubscriberBalanceItem; searchScore: number } => x !== null);

    return scoredItems.sort((a, b) => {
      // If user typed search and sorting by name or score
      if (deferredSearchQuery.trim() && a.searchScore !== b.searchScore && sortBy === 'name') {
        return b.searchScore - a.searchScore;
      }

      let comp = 0;
      switch (sortBy) {
        case 'totalDue': comp = a.item.totalDue - b.item.totalDue; break;
        case 'overdueAmount': comp = a.item.overdueAmount - b.item.overdueAmount; break;
        case 'currentDue': comp = a.item.currentDue - b.item.currentDue; break;
        case 'collected': comp = a.item.totalCollected - b.item.totalCollected; break;
        case 'collectionRate': comp = a.item.collectionRate - b.item.collectionRate; break;
        case 'name': comp = a.item.name.localeCompare(b.item.name, 'ar'); break;
        case 'meter': comp = a.item.meterNumber.localeCompare(b.item.meterNumber, undefined, { numeric: true }); break;
        case 'lastPayment': comp = a.item.lastPaymentDaysAgo - b.item.lastPaymentDaysAgo; break;
      }
      return sortOrder === 'desc' ? -comp : comp;
    }).map(x => x.item);
  }, [allSubscriberData, filterType, minDebtAmount, selectedZone, selectedTransformer, selectedCollector, selectedTariff, selectedMonth, deferredSearchQuery, searchScope, sortBy, sortOrder]);

  // Paginated items for ultra-fast table rendering without lag
  const paginatedItems = useMemo(() => {
    if (pageSize === 'all') return filteredItems;
    const start = currentPage * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const startIndex = pageSize === 'all' ? 0 : currentPage * (typeof pageSize === 'number' ? pageSize : 0);

  // Comprehensive summary statistics
  const summaryStats = useMemo<SummaryStatistics>(() => {
    let totalOverdue = 0;
    let totalCurrentDue = 0;
    let totalDueSum = 0;
    let totalCollected = 0;
    let totalBilled = 0;
    let totalOpening = 0;
    let debtorsCount = 0;
    let fullyPaidCount = 0;
    let partialPaidCount = 0;
    let unpaidCount = 0;
    let creditorsCount = 0;
    let totalNetBalance = 0;

    let agingCurrentSum = 0;
    let agingCurrentCount = 0;
    let aging31_60Sum = 0;
    let aging31_60Count = 0;
    let aging61_90Sum = 0;
    let aging61_90Count = 0;
    let agingOver90Sum = 0;
    let agingOver90Count = 0;

    filteredItems.forEach(item => {
      totalOverdue += item.overdueAmount;
      totalCurrentDue += item.currentDue;
      totalDueSum += item.totalDue;
      totalCollected += item.totalCollected;
      totalBilled += item.totalBilled;
      totalOpening += item.openingBalance;

      if (item.totalDue > 0) debtorsCount++;
      if (item.paymentStatus === 'fully_paid') fullyPaidCount++;
      if (item.paymentStatus === 'partial') partialPaidCount++;
      if (item.paymentStatus === 'unpaid' && item.totalDue > 0) unpaidCount++;
      if (item.paymentStatus === 'creditor') creditorsCount++;

      // Aging sums
      if (item.agingBracket === 'current') {
        agingCurrentSum += item.totalDue;
        agingCurrentCount++;
      } else if (item.agingBracket === 'days31_60') {
        aging31_60Sum += item.totalDue;
        aging31_60Count++;
      } else if (item.agingBracket === 'days61_90') {
        aging61_90Sum += item.totalDue;
        aging61_90Count++;
      } else if (item.agingBracket === 'over90') {
        agingOver90Sum += item.totalDue;
        agingOver90Count++;
      }
    });

    const totalObligation = totalDueSum + totalCollected;
    const overallCollectionRate = totalObligation > 0 ? Math.round((totalCollected / totalObligation) * 100) : 0;

    return {
      totalCount: filteredItems.length,
      totalOverdue,
      totalCurrentDue,
      totalDueSum,
      totalCollected,
      totalBilled,
      totalOpening,
      debtorsCount,
      fullyPaidCount,
      partialPaidCount,
      unpaidCount,
      creditorsCount,
      totalNetBalance,
      overallCollectionRate,
      agingCurrentSum,
      agingCurrentCount,
      aging31_60Sum,
      aging31_60Count,
      aging61_90Sum,
      aging61_90Count,
      agingOver90Sum,
      agingOver90Count
    };
  }, [filteredItems]);

  // Selected items vs All filtered
  const effectiveExportItems = useMemo(() => {
    if (selectedSubIds.length === 0) return filteredItems;
    const set = new Set(selectedSubIds);
    return filteredItems.filter(i => set.has(i.subscriber.id));
  }, [filteredItems, selectedSubIds]);

  const visibleColumns = useMemo(() => columns.filter(c => c.visible), [columns]);

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (selectedSubIds.length === filteredItems.length) {
      setSelectedSubIds([]);
    } else {
      setSelectedSubIds(filteredItems.map(i => i.subscriber.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedSubIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Copy phone numbers
  const handleCopyPhones = async () => {
    const phones = effectiveExportItems
      .map(i => i.phone)
      .filter(p => p && p !== '-' && p.trim().length > 5);
    
    if (phones.length === 0) {
      setCopyFeedback('لا توجد أرقام هواتف صالحة للنسخ');
      setTimeout(() => setCopyFeedback(null), 3000);
      return;
    }

    try {
      await navigator.clipboard.writeText(phones.join(', '));
      setCopyFeedback(`تم نسخ (${phones.length}) رقم هاتف بنجاح`);
      setTimeout(() => setCopyFeedback(null), 3000);
    } catch (e) {
      setCopyFeedback('حدث خطأ أثناء النسخ');
      setTimeout(() => setCopyFeedback(null), 3000);
    }
  };

  // Copy Executive Report to Clipboard for WhatsApp / Telegram Management
  const handleCopyExecutiveSummary = async () => {
    const currency = settings.currency || 'ريال';
    const stationName = settings.stationName || settings.companyName || 'محطة الكهرباء';
    const dateStr = new Date().toLocaleDateString('ar-YE', { year: 'numeric', month: 'long', day: 'numeric' });

    const text = `📊 *تقرير ملخص كشف المستحقات والتحصيل الميداني*
🏢 *${stationName}*
📅 التاريخ: ${dateStr}
----------------------------------------
👥 إجمالي المشتركين بالكشف: ${summaryStats.totalCount} مشترك
💰 إجمالي المبالغ المحصلة: ${summaryStats.totalCollected.toLocaleString()} ${currency}
📈 نسبة التحصيل العامة: ${summaryStats.overallCollectionRate}%
⚠️ إجمالي المتأخرات السابقة: ${summaryStats.totalOverdue.toLocaleString()} ${currency}
⚡ فواتير الدورة الأخيرة: ${summaryStats.totalCurrentDue.toLocaleString()} ${currency}
🚨 *إجمالي المطلوب القائم*: ${summaryStats.totalDueSum.toLocaleString()} ${currency}
----------------------------------------
📌 *تصنيف المشتركين:*
• عدد المدينين القائمين: ${summaryStats.debtorsCount} مشترك
• مسددين بالكامل 100%: ${summaryStats.fullyPaidCount} مشترك
• سداد جزئي: ${summaryStats.partialPaidCount} مشترك
• متأخرات حرجة (>90 يوم): ${summaryStats.agingOver90Count} مشترك (${summaryStats.agingOver90Sum.toLocaleString()} ${currency})
----------------------------------------
تم التصدير من نظام إدارة الطاقة والمشتركين`;

    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback('تم نسخ التقرير الملخص للإدارة بنجاح!');
      setTimeout(() => setCopyFeedback(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  // Send batch SMS
  const handleSendBatchSms = async () => {
    const validItems = effectiveExportItems.filter(i => i.phone && i.phone !== '-' && i.totalDue > 0);
    if (validItems.length === 0) {
      setCopyFeedback('لا يوجد مشتركون مدينون بأرقام هواتف صالحة');
      setTimeout(() => setCopyFeedback(null), 3000);
      return;
    }

    setSmsSendingState(`جاري إرسال (${validItems.length}) رسالة...`);
    let successCount = 0;

    for (const item of validItems) {
      const msg = `الأخ المشترك: ${item.name}، يرجى التكرم بسداد المبلغ المطلوب ${item.totalDue.toLocaleString()} ${settings.currency || 'ريال'} لعداد: ${item.meterNumber}. ${settings.stationName || 'إدارة المحطة'}`;
      try {
        const res = await sendSMSDirectly(item.phone, msg, settings);
        if (res.success) successCount++;
      } catch (e) {
        console.error(e);
      }
    }

    setSmsSendingState(null);
    setCopyFeedback(`تم إرسال (${successCount}) رسالة بنجاح من أصل (${validItems.length})`);
    setTimeout(() => setCopyFeedback(null), 4000);
  };

  // Export Excel with real XLSX
  const handleExportExcel = async () => {
    const data = effectiveExportItems.map((item, idx) => {
      const row: any = {};
      visibleColumns.forEach(col => {
        switch (col.id) {
          case 'index': row['م'] = idx + 1; break;
          case 'meterNumber': row['رقم العداد'] = item.meterNumber; break;
          case 'name': row['اسم المشترك'] = item.name; break;
          case 'phone': row['رقم الهاتف'] = item.phone; break;
          case 'zone': row['المنطقة'] = item.zone; break;
          case 'collectorName': row['المحصل المسؤول'] = item.collectorName || '-'; break;
          case 'transformer': row['المحول'] = item.transformer; break;
          case 'tariffType': row['نوع الاشتراك'] = item.tariffType; break;
          case 'openingBalance': row['الرصيد الافتتاحي'] = item.openingBalance; break;
          case 'totalBilled': row['إجمالي الفواتير'] = item.totalBilled; break;
          case 'totalCollected': row['المبالغ المحصلة'] = item.totalCollected; break;
          case 'collectionRate': row['نسبة التحصيل %'] = `${item.collectionRate}%`; break;
          case 'fieldPaid': row['المحصل (يدوي)'] = ''; break;
          case 'receiptNumber': row['رقم السند'] = ''; break;
          case 'subscriberSignature': row['توقيع المشترك'] = ''; break;
          case 'overdueAmount': row['المبالغ المتأخرة'] = item.overdueAmount; break;
          case 'currentDue': row['مبلغ آخر فاتورة'] = item.currentDue; break;
          case 'totalDue': row['إجمالي المطلوب'] = item.totalDue; break;
          case 'paymentStatusLabel': row['حالة السداد'] = item.paymentStatusLabel; break;
          case 'lastPaymentDate': row['تاريخ آخر سداد'] = item.lastPaymentDate; break;
          case 'lastPaymentAmount': row['مبلغ آخر سداد'] = item.lastPaymentAmount; break;
          case 'lastReadingDate': row['تاريخ آخر قراءة'] = item.lastReadingDate; break;
          case 'lastConsumption': row['استهلاك آخر دورة'] = item.lastConsumption; break;
          case 'status': row['حالة الحساب'] = item.status; break;
          case 'notes': row['ملاحظات'] = ''; break;
        }
      });
      return row;
    });

    if (data.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'نظام إدارة المشتركين والعدادات';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('كشف المستحقات', {
      views: [{ rightToLeft: true }]
    });

    const headers = Object.keys(data[0]);
    worksheet.columns = headers.map(key => ({
      header: key,
      key: key,
      width: 20
    }));

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    data.forEach(r => worksheet.addRow(r));

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `كشف_المستحقات_والمحصل_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helper to build PrintableReportConfig
  const getPrintableConfig = () => {
    const tableRows = effectiveExportItems.map((item, idx) => {
      return visibleColumns.map(col => {
        switch (col.id) {
          case 'index': return idx + 1;
          case 'meterNumber': return item.meterNumber;
          case 'name': return item.name;
          case 'phone': return item.phone || '-';
          case 'zone': return item.zone || '-';
          case 'collectorName': return item.collectorName || '-';
          case 'transformer': return item.transformer || '-';
          case 'tariffType': return item.tariffType;
          case 'openingBalance': return item.openingBalance.toLocaleString();
          case 'totalBilled': return item.totalBilled.toLocaleString();
          case 'totalCollected': return item.totalCollected.toLocaleString();
          case 'collectionRate': return `${item.collectionRate}%`;
          case 'fieldPaid': return '';
          case 'receiptNumber': return '';
          case 'subscriberSignature': return '';
          case 'overdueAmount': return item.overdueAmount.toLocaleString();
          case 'currentDue': return item.currentDue.toLocaleString();
          case 'totalDue': return item.totalDue.toLocaleString();
          case 'paymentStatusLabel': return item.paymentStatusLabel;
          case 'lastPaymentDate': return item.lastPaymentDate;
          case 'lastPaymentAmount': return item.lastPaymentAmount.toLocaleString();
          case 'lastReadingDate': return item.lastReadingDate;
          case 'lastConsumption': return item.lastConsumption ? `${item.lastConsumption}` : '-';
          case 'status': return item.status;
          case 'notes': return '';
          default: return '';
        }
      });
    });

    const summaryRow = visibleColumns.map((col, idx) => {
      if (idx === 0) return 'الإجمالي';
      if (col.id === 'openingBalance') return summaryStats.totalOpening.toLocaleString();
      if (col.id === 'totalBilled') return summaryStats.totalBilled.toLocaleString();
      if (col.id === 'totalCollected') return summaryStats.totalCollected.toLocaleString();
      if (col.id === 'collectionRate') return `${summaryStats.overallCollectionRate}%`;
      if (col.id === 'overdueAmount') return summaryStats.totalOverdue.toLocaleString();
      if (col.id === 'currentDue') return summaryStats.totalCurrentDue.toLocaleString();
      if (col.id === 'totalDue') return summaryStats.totalDueSum.toLocaleString();
      return '';
    });

    return {
      title: 'كشف المستحقات والمبالغ المحصلة الشامل',
      companyName: settings.stationName || settings.companyName || 'محطة الكهرباء',
      companyPhone: settings.phone,
      companyAddress: settings.address,
      subtitle: `تاريخ التقرير: ${new Date().toLocaleDateString('ar-YE')} • عدد المشتركين: ${effectiveExportItems.length}`,
      badgeFilters: [
        { label: 'النوع', value: filterType },
        ...(selectedZone !== 'all' ? [{ label: 'المنطقة', value: selectedZone }] : []),
        ...(selectedTransformer !== 'all' ? [{ label: 'المحول', value: selectedTransformer }] : [])
      ],
      columns: visibleColumns.map(c => ({
        id: c.id,
        label: c.label,
        align: c.align,
        width: c.width,
        isCurrency: c.isCurrency
      })),
      rows: tableRows,
      summaryRow,
      orientation: printOrientation,
      showSignatures,
      currency: settings.currency || 'ريال',
      userName: currentUser?.name || 'المسؤول',
      itemsPerPage: rowsPerPage,
      totalsOnLastPageOnly,
      fontSize: printFontSize === 'custom' ? `${customFontSizePx}px` : printFontSize,
      tableDensity,
      printTheme,
      fontFamily: printFontFamily,
      paperMargin,
      showHeader: showHeaderInPrint,
      showFilterBar: showFilterBarInPrint,
      showPageNumbers: showPageNumbersInPrint,
      signers: [signer1, signer2, signer3].filter(Boolean),
      customNote: customPrintNote
    };
  };

  // Direct PDF Download
  const handleExportDirectPDF = async () => {
    setIsExportingPDF(true);
    try {
      const config = getPrintableConfig();
      await downloadDirectPDF(
        config,
        `كشف_المستحقات_والمحصل_${new Date().toISOString().split('T')[0]}`
      );
    } catch (e) {
      console.error(e);
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Print Handler
  const handlePrint = () => {
    const config = getPrintableConfig();
    printOrSaveReportPDF(config);
  };

  // Quick payment confirmation handler
  const handleQuickPaymentConfirm = async (paymentData: any) => {
    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      subscriberId: paymentData.subscriberId,
      subscriberName: paymentData.subscriberName || '',
      amountPaid: paymentData.amountPaid,
      paymentDate: paymentData.paymentDate,
      paymentMethod: paymentData.paymentMethod || 'cash',
      receivedBy: paymentData.collectorName || currentUser?.name || 'المحصل',
      receiptNumber: paymentData.receiptNumber || `REC-${Date.now().toString().slice(-6)}`,
      isPosted: true
    };

    setSessionPayments(prev => [newPayment, ...prev]);

    if (onAddPayment) {
      await onAddPayment(newPayment);
    }
    setCopyFeedback(`تم تسجيل سند تحصيل بمبلغ ${paymentData.amountPaid.toLocaleString()} ${settings.currency || 'ريال'} للمحصل (${paymentData.collectorName}) بنجاح`);
    setTimeout(() => setCopyFeedback(null), 4000);
  };

  // Profile presets handler (Field Collector vs Financial Analysis)
  const handleApplyPresetProfile = (type: 'field' | 'financial') => {
    if (type === 'field') {
      const fieldCols = ['index', 'meterNumber', 'name', 'phone', 'zone', 'collectorName', 'overdueAmount', 'currentDue', 'totalDue', 'fieldPaid', 'receiptNumber', 'subscriberSignature', 'notes'];
      setColumns(prev => prev.map(c => ({
        ...c,
        visible: fieldCols.includes(c.id)
      })));
      setCopyFeedback('تم تفعيل نمط كشف المحصل الميداني (سندات، توقيع، تحصيل يدوي)');
    } else {
      const finCols = ['index', 'meterNumber', 'name', 'zone', 'collectorName', 'openingBalance', 'totalBilled', 'totalCollected', 'overdueAmount', 'currentDue', 'totalDue', 'collectionRate', 'paymentStatusLabel'];
      setColumns(prev => prev.map(c => ({
        ...c,
        visible: finCols.includes(c.id)
      })));
      setCopyFeedback('تم تفعيل نمط كشف المستحقات المحاسبي الشامل');
    }
    setTimeout(() => setCopyFeedback(null), 3500);
  };

  // Main UI Inner Content
  const renderInnerContent = () => (
    <>
      {/* Dynamic Print & Typography Stylesheet */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: ${printOrientation === 'landscape' ? 'A4 landscape' : 'A4 portrait'};
            margin: ${tableDensity === 'compact' ? '6mm 6mm' : tableDensity === 'spacious' ? '12mm 12mm' : '8mm 8mm'};
          }
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-custom-text {
            font-size: ${
              printFontSize === 'xsmall' ? '8.5pt' :
              printFontSize === 'small' ? '9.5pt' :
              printFontSize === 'large' ? '12.5pt' :
              printFontSize === 'xlarge' ? '14pt' :
              printFontSize === 'custom' ? `${customFontSizePx}px` : '11pt'
            } !important;
          }
          .print-custom-table {
            font-size: ${
              printFontSize === 'xsmall' ? '8pt' :
              printFontSize === 'small' ? '9pt' :
              printFontSize === 'large' ? '11.5pt' :
              printFontSize === 'xlarge' ? '13pt' :
              printFontSize === 'custom' ? `${Math.max(8, customFontSizePx - 1)}px` : '10pt'
            } !important;
          }
          .print-custom-cell {
            padding: ${
              tableDensity === 'compact' ? '2px 3px' :
              tableDensity === 'spacious' ? '7px 8px' : '4px 5px'
            } !important;
          }
          .page-break-after {
            page-break-after: always !important;
            break-after: page !important;
          }
        }
      `}} />

      {/* HEADER BAR */}
      <div className="p-3 sm:p-4 md:p-5 border-b border-slate-800 bg-slate-950 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-2.5 bg-gradient-to-tr from-amber-600 to-amber-400 rounded-2xl text-slate-950 shadow-lg shadow-amber-500/20 shrink-0">
            <Scale className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base md:text-lg font-black text-white truncate">كشف المستحقات والمبالغ المحصلة الشامل</h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black shrink-0">
                كشف متطور
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 font-bold truncate">
              تصفية دقيقة للمدينين، تحليل التعتيق الزمني، استوديو تخصيص الطباعة والخطوط، وتصدير التقارير
            </p>
          </div>
        </div>

        {/* Top View Mode Tabs & Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs font-bold shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
                viewMode === 'table'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">الجدول التفاعلي</span>
              <span className="sm:hidden">الجدول</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('sheet_preview')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
                viewMode === 'sheet_preview'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">معاينة A4 حية</span>
              <span className="sm:hidden">معاينة A4</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('analytics')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
                viewMode === 'analytics'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">التحليلات والمناطق</span>
              <span className="sm:hidden">التحليلات</span>
            </button>
          </div>

          {/* Copy Executive Summary to Clipboard */}
          <button
            type="button"
            onClick={handleCopyExecutiveSummary}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-400 border border-slate-800 rounded-xl cursor-pointer shrink-0"
            title="نسخ تقرير ملخص فوري للإدارة والواتساب"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Print Studio Toggle Button */}
          <button
            type="button"
            onClick={() => {
              setShowPrintStudio(prev => !prev);
              if (showColumnSettings) setShowColumnSettings(false);
            }}
            className={`px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border shrink-0 ${
              showPrintStudio
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-md shadow-amber-500/20'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
            }`}
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">استوديو الطباعة</span>
            <span className="sm:hidden">الطباعة</span>
          </button>

          {/* Column Settings Toggle Button */}
          <button
            type="button"
            onClick={() => {
              setShowColumnSettings(prev => !prev);
              if (showPrintStudio) setShowPrintStudio(false);
            }}
            className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
              showColumnSettings
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
            }`}
            title="إدارة وتخصيص الأعمدة"
          >
            <Settings2 className="w-4 h-4" />
          </button>

          {/* Close/Back Button */}
          {(isModal ? onClose : (onBack || onClose)) && (
            <button
              type="button"
              onClick={isModal ? onClose : (onBack || onClose)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
              title="إغلاق / رجوع"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* DRAWERS: PRINT STUDIO & COLUMN SETTINGS */}
      <AnimatePresence>
        {showPrintStudio && (
          <PrintStudioPanel
            isOpen={showPrintStudio}
            onClose={() => setShowPrintStudio(false)}
            printFontFamily={printFontFamily}
            setPrintFontFamily={setPrintFontFamily}
            printFontSize={printFontSize}
            setPrintFontSize={setPrintFontSize}
            customFontSizePx={customFontSizePx}
            setCustomFontSizePx={setCustomFontSizePx}
            tableDensity={tableDensity}
            setTableDensity={setTableDensity}
            printTheme={printTheme}
            setPrintTheme={setPrintTheme}
            printOrientation={printOrientation}
            setPrintOrientation={setPrintOrientation}
            paperMargin={paperMargin}
            setPaperMargin={setPaperMargin}
            rowsPerPage={rowsPerPage}
            setRowsPerPage={setRowsPerPage}
            isCustomRowsPerPage={isCustomRowsPerPage}
            setIsCustomRowsPerPage={setIsCustomRowsPerPage}
            customRowsInput={customRowsInput}
            setCustomRowsInput={setCustomRowsInput}
            showHeaderInPrint={showHeaderInPrint}
            setShowHeaderInPrint={setShowHeaderInPrint}
            showFilterBarInPrint={showFilterBarInPrint}
            setShowFilterBarInPrint={setShowFilterBarInPrint}
            showPageNumbersInPrint={showPageNumbersInPrint}
            setShowPageNumbersInPrint={setShowPageNumbersInPrint}
            totalsOnLastPageOnly={totalsOnLastPageOnly}
            setTotalsOnLastPageOnly={setTotalsOnLastPageOnly}
            showSignatures={showSignatures}
            setShowSignatures={setShowSignatures}
            signer1={signer1}
            setSigner1={setSigner1}
            signer2={signer2}
            setSigner2={setSigner2}
            signer3={signer3}
            setSigner3={setSigner3}
            customPrintNote={customPrintNote}
            setCustomPrintNote={setCustomPrintNote}
            totalItemsCount={filteredItems.length}
            onOpenSheetPreview={() => {
              setViewMode('sheet_preview');
              setShowPrintStudio(false);
            }}
            onExportPDF={handleExportDirectPDF}
            onPrint={handlePrint}
            isExportingPDF={isExportingPDF}
          />
        )}

        {showColumnSettings && (
          <ColumnSettingsDrawer
            isOpen={showColumnSettings}
            onClose={() => setShowColumnSettings(false)}
            columns={columns}
            onChangeColumns={setColumns}
            onResetDefault={() => setColumns(DEFAULT_COLUMNS)}
          />
        )}
      </AnimatePresence>

      {/* FILTERS TOOLBAR */}
      <DueBalancesFilters
        filterType={filterType}
        onSelectFilterType={setFilterType}
        categoryCounts={categoryCounts as any}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchScope={searchScope}
        onSearchScopeChange={setSearchScope}
        selectedZone={selectedZone}
        onZoneChange={setSelectedZone}
        uniqueZones={uniqueZones}
        selectedTransformer={selectedTransformer}
        onTransformerChange={setSelectedTransformer}
        uniqueTransformers={uniqueTransformers}
        selectedCollector={selectedCollector}
        onCollectorChange={setSelectedCollector}
        uniqueCollectors={uniqueCollectors}
        selectedTariff={selectedTariff}
        onTariffChange={setSelectedTariff}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        uniqueMonths={uniqueMonths}
        sortBy={sortBy as any}
        onSortByChange={setSortBy as any}
        sortOrder={sortOrder}
        onToggleSortOrder={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
        activeFiltersCount={activeFiltersCount}
        onResetFilters={handleResetFilters}
        onApplyProfilePreset={handleApplyPresetProfile}
      />

      {/* Custom debt limit input if High Debtors selected */}
      {filterType === 'highDebtors' && (
        <div className="p-3 bg-orange-950/20 border-b border-orange-500/30 flex items-center gap-2 sm:gap-3 text-xs flex-wrap shrink-0 print:hidden">
          <span className="text-orange-400 font-bold">تحديد الحد الأدنى لمديونية كبار المدينين:</span>
          <input
            type="number"
            value={minDebtAmount}
            onChange={e => setMinDebtAmount(Number(e.target.value) || 0)}
            className="w-28 sm:w-32 bg-slate-900 border border-orange-500/50 rounded-lg px-2.5 py-1 text-white font-mono font-bold outline-none"
            placeholder="5000"
          />
          <span className="text-slate-400 font-mono">{settings.currency || 'ريال'}</span>
        </div>
      )}

      {/* Quick Metrics & Financial Summary Bar */}
      <div className="p-2.5 sm:p-4 bg-slate-950/40 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 border-b border-slate-800/80 shrink-0 print:hidden text-xs">
        <div className="bg-slate-900/80 p-2.5 sm:p-3 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-[10px] sm:text-[11px] font-bold mb-1">
            <span className="truncate">المشتركين</span>
            <Users className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-base sm:text-lg font-mono font-black text-white">{summaryStats.totalCount}</span>
            <span className="text-[10px] text-slate-500 font-bold">مشترك</span>
          </div>
          <span className="text-[10px] text-rose-400 font-bold block mt-0.5 truncate">
            {summaryStats.debtorsCount} مدين • {summaryStats.fullyPaidCount} مسدد
          </span>
        </div>

        <div className="bg-slate-900/80 p-2.5 sm:p-3 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-[10px] sm:text-[11px] font-bold mb-1">
            <span className="truncate">نسبة التحصيل</span>
            <Percent className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-base sm:text-lg font-mono font-black ${
              summaryStats.overallCollectionRate >= 80 ? 'text-emerald-400' : summaryStats.overallCollectionRate >= 50 ? 'text-amber-400' : 'text-rose-400'
            }`}>
              {summaryStats.overallCollectionRate}%
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
            <div 
              className={`h-full rounded-full ${
                summaryStats.overallCollectionRate >= 80 ? 'bg-emerald-500' : summaryStats.overallCollectionRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, summaryStats.overallCollectionRate))}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-900/80 p-2.5 sm:p-3 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-[10px] sm:text-[11px] font-bold mb-1">
            <span className="truncate">المبالغ المحصلة</span>
            <Wallet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-sm sm:text-base lg:text-lg font-mono font-black text-emerald-400 truncate">{summaryStats.totalCollected.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 font-bold shrink-0">{settings.currency || 'ريال'}</span>
          </div>
        </div>

        <div className="bg-slate-900/80 p-2.5 sm:p-3 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-[10px] sm:text-[11px] font-bold mb-1">
            <span className="truncate">المتأخرات السابقة</span>
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-sm sm:text-base lg:text-lg font-mono font-black text-rose-400 truncate">{summaryStats.totalOverdue.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 font-bold shrink-0">{settings.currency || 'ريال'}</span>
          </div>
        </div>

        <div className="bg-slate-900/80 p-2.5 sm:p-3 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-[10px] sm:text-[11px] font-bold mb-1">
            <span className="truncate">آخر فاتورة</span>
            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-sm sm:text-base lg:text-lg font-mono font-black text-amber-400 truncate">{summaryStats.totalCurrentDue.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 font-bold shrink-0">{settings.currency || 'ريال'}</span>
          </div>
        </div>

        <div className="bg-slate-900/80 p-2.5 sm:p-3 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-[10px] sm:text-[11px] font-bold mb-1">
            <span className="truncate">المطلوب القائم</span>
            <DollarSign className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-sm sm:text-base lg:text-lg font-mono font-black text-sky-400 truncate">{summaryStats.totalDueSum.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500 font-bold shrink-0">{settings.currency || 'ريال'}</span>
          </div>
        </div>
      </div>

      {/* Floating Selection / Bulk Action Bar */}
      <AnimatePresence>
        {selectedSubIds.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-amber-500 text-slate-950 px-3 sm:px-4 py-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 font-bold text-xs shrink-0 print:hidden shadow-md"
          >
            <div className="flex items-center justify-between sm:justify-start gap-2">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-slate-950 shrink-0" />
                <span>تم تحديد ({selectedSubIds.length}) مشترك من أصل ({filteredItems.length})</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubIds([])}
                className="sm:hidden bg-black/20 hover:bg-black/30 text-slate-950 px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer"
              >
                إلغاء
              </button>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
              <button
                type="button"
                onClick={handleCopyPhones}
                className="bg-slate-950 text-white hover:bg-slate-900 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 shrink-0"
              >
                <Copy className="w-3.5 h-3.5 text-amber-400" />
                <span>نسخ الهواتف</span>
              </button>

              <button
                type="button"
                onClick={handleSendBatchSms}
                disabled={!!smsSendingState}
                className="bg-emerald-700 text-white hover:bg-emerald-600 disabled:opacity-50 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 shrink-0"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-300" />
                <span>{smsSendingState || 'SMS للمحددين'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                className="bg-slate-900 text-amber-300 hover:bg-slate-800 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">تصدير Excel</span>
                <span className="sm:hidden">Excel</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="bg-slate-900 text-white hover:bg-slate-800 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>طباعة</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedSubIds([])}
                className="hidden sm:inline-block bg-black/20 hover:bg-black/30 text-slate-950 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer shrink-0"
              >
                إلغاء التحديد
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Copy Feedback banner */}
      <AnimatePresence>
        {copyFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="bg-emerald-600 text-white px-4 py-2 text-center text-xs font-bold shrink-0 print:hidden shadow-sm"
          >
            {copyFeedback}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN VIEWPORT AREA */}
      <div 
        ref={printableAreaRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 print:p-0 print:overflow-visible print:bg-white print:text-black bg-slate-900/40"
      >
        {/* VIEW MODE 1: LIVE SHEET PREVIEW */}
        {viewMode === 'sheet_preview' && (
          <LiveSheetPreview
            items={filteredItems}
            columns={columns}
            rowsPerPage={rowsPerPage}
            currentPageIndex={sheetPreviewPageIndex}
            onPageChange={setSheetPreviewPageIndex}
            printFontFamily={printFontFamily}
            paperMargin={paperMargin}
            printFontSize={printFontSize}
            customFontSizePx={customFontSizePx}
            tableDensity={tableDensity}
            printTheme={printTheme}
            printOrientation={printOrientation}
            showHeader={showHeaderInPrint}
            showFilterBar={showFilterBarInPrint}
            showPageNumbers={showPageNumbersInPrint}
            totalsOnLastPageOnly={totalsOnLastPageOnly}
            showSignatures={showSignatures}
            signer1={signer1}
            signer2={signer2}
            signer3={signer3}
            customPrintNote={customPrintNote}
            summaryStats={summaryStats}
            settings={settings}
            onExitPreview={() => setViewMode('table')}
            onPrint={handlePrint}
            onExportPDF={handleExportDirectPDF}
            isExportingPDF={isExportingPDF}
            onTogglePrintStudio={() => setShowPrintStudio(prev => !prev)}
          />
        )}

        {/* VIEW MODE 2: ANALYTICS & BREAKDOWNS */}
        {viewMode === 'analytics' && (
          <div className="space-y-6 max-w-7xl mx-auto print:hidden">
            <AgingAnalyticsCard
              stats={summaryStats}
              filterType={filterType}
              onSelectFilter={(f) => {
                setFilterType(f);
                setViewMode('table');
              }}
              settings={settings}
            />

            <ZoneTransformerCard
              items={allSubscriberData}
              selectedZone={selectedZone}
              selectedTransformer={selectedTransformer}
              selectedCollector={selectedCollector}
              onSelectZone={(z) => {
                setSelectedZone(z);
                setViewMode('table');
              }}
              onSelectTransformer={(t) => {
                setSelectedTransformer(t);
                setViewMode('table');
              }}
              onSelectCollector={(c) => {
                setSelectedCollector(c);
                setViewMode('table');
              }}
              settings={settings}
            />
          </div>
        )}

        {/* VIEW MODE 3: STANDARD INTERACTIVE TABLE & RESPONSIVE MOBILE CARDS */}
        {viewMode === 'table' && (
          <div className="space-y-4">
            {/* Printable Report Header */}
            {showHeaderInPrint && (
              <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-xl font-black text-slate-950">{settings.stationName || settings.companyName || 'محطة الكهرباء'}</h1>
                    <p className="text-xs font-bold text-slate-700">كشف المطالبات والمستحقات والمبالغ المحصلة</p>
                    {settings.phone && <p className="text-[10px] text-slate-500">هاتف: {settings.phone}</p>}
                  </div>
                  <div className="text-left text-xs font-bold text-slate-700">
                    <p>تاريخ الكشف: {new Date().toLocaleDateString('ar-YE')}</p>
                    <p>عدد المشتركين: {filteredItems.length} مشترك</p>
                  </div>
                </div>
              </div>
            )}

            {/* High Performance Responsive Table & Mobile Cards */}
            <DueBalancesTable
              items={paginatedItems}
              startIndex={startIndex}
              totalFilteredCount={filteredItems.length}
              columns={columns}
              selectedSubIds={selectedSubIds}
              onToggleSelect={handleToggleSelect}
              onToggleSelectAll={handleToggleSelectAll}
              isAllSelected={filteredItems.length > 0 && selectedSubIds.length === filteredItems.length}
              mobileDisplayMode={mobileDisplayMode}
              onSetMobileDisplayMode={setMobileDisplayMode}
              searchQuery={searchQuery}
              settings={settings}
              currentUser={currentUser}
              onOpenSubscriberStatement={onOpenSubscriberStatement}
              onCollectPayment={onCollectPayment}
              onQuickCollectClick={setActiveQuickCollectItem}
              onNoticeClick={setActiveNoticeItem}
              onSlipClick={setActiveSlipItem}
              summaryStats={summaryStats}
              showTotalsRow={showTotalsRow}
            />

            {/* Pagination Controls */}
            <DueBalancesPagination
              totalItems={filteredItems.length}
              pageSize={pageSize}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(0);
              }}
            />

            {/* Print Signatures */}
            {showSignatures && (
              <div className="hidden print:grid grid-cols-3 gap-8 mt-10 text-center text-xs font-bold text-black border-t border-slate-400 pt-6">
                <div>
                  <p className="mb-8">{signer1 || 'مسؤول التحصيل الميداني'}</p>
                  <p className="border-t border-dotted border-slate-700 pt-1">التوقيع: ................................</p>
                </div>
                <div>
                  <p className="mb-8">{signer2 || 'المحاسب المالي'}</p>
                  <p className="border-t border-dotted border-slate-700 pt-1">التوقيع: ................................</p>
                </div>
                <div>
                  <p className="mb-8">{signer3 || 'مدير الشبكة / الاعتماد'}</p>
                  <p className="border-t border-dotted border-slate-700 pt-1">الختم والتوقيع: ................................</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* BOTTOM FOOTER BAR */}
      <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/90 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 shrink-0 print:hidden text-xs">
        <div className="text-slate-400 font-bold flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] sm:text-xs">
          <span>المحصل: <strong className="text-emerald-400 font-mono">{summaryStats.totalCollected.toLocaleString()} {settings.currency || 'ريال'}</strong> ({summaryStats.overallCollectionRate}%)</span>
          <span>•</span>
          <span>المتأخرات: <strong className="text-rose-400 font-mono">{summaryStats.totalOverdue.toLocaleString()} {settings.currency || 'ريال'}</strong></span>
          <span>•</span>
          <span>آخر فاتورة: <strong className="text-amber-400 font-mono">{summaryStats.totalCurrentDue.toLocaleString()} {settings.currency || 'ريال'}</strong></span>
          <span>•</span>
          <span>المطلوب: <strong className="text-sky-400 font-mono text-sm">{summaryStats.totalDueSum.toLocaleString()} {settings.currency || 'ريال'}</strong></span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex-1 sm:flex-initial px-3 sm:px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportDirectPDF}
            disabled={isExportingPDF}
            className="flex-1 sm:flex-initial px-3 sm:px-3.5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all shrink-0"
          >
            <FileDown className="w-4 h-4" />
            <span>{isExportingPDF ? 'جاري التحميل...' : 'PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 sm:flex-initial px-4 sm:px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer shadow-lg shadow-amber-500/25 active:scale-95 transition-all shrink-0"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة</span>
          </button>

          {(isModal ? onClose : (onBack || onClose)) && (
            <button
              type="button"
              onClick={isModal ? onClose : (onBack || onClose)}
              className="px-3.5 sm:px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer font-bold shrink-0"
            >
              {isModal ? 'إغلاق' : 'رجوع'}
            </button>
          )}
        </div>
      </div>

      {/* MODALS */}
      {activeNoticeItem && (
        <WhatsAppNoticeModal
          item={activeNoticeItem}
          onClose={() => setActiveNoticeItem(null)}
          settings={settings}
          onPrintSlip={(it) => {
            setActiveNoticeItem(null);
            setActiveSlipItem(it);
          }}
        />
      )}

      {activeSlipItem && (
        <FieldNoticeModal
          item={activeSlipItem}
          onClose={() => setActiveSlipItem(null)}
          settings={settings}
          currentUser={currentUser}
        />
      )}

      {activeQuickCollectItem && (
        <QuickCollectModal
          item={activeQuickCollectItem}
          onClose={() => setActiveQuickCollectItem(null)}
          settings={settings}
          currentUser={currentUser}
          collectorsList={uniqueCollectors}
          onConfirmPayment={handleQuickPaymentConfirm}
        />
      )}
    </>
  );

  if (!isOpen) {
    return null;
  }

  if (!isModal) {
    return (
      <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-xl flex flex-col overflow-hidden text-slate-100 font-sans print:static print:max-h-none print:w-full print:shadow-none print:border-none print:bg-white print:text-black print:rounded-none">
        {renderInnerContent()}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-2 sm:p-4 md:p-6 text-right font-sans">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/85 backdrop-blur-md print:hidden"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="relative w-full max-w-7xl max-h-[95vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100 z-10 print:static print:max-h-none print:w-full print:shadow-none print:border-none print:bg-white print:text-black print:rounded-none"
      >
        {renderInnerContent()}
      </motion.div>
    </div>
  );
};

export const DueBalancesReportView = DueBalancesReportModal;
