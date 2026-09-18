import React, { useState, useMemo, useRef } from 'react';
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
  HighlightMatch, 
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

export const DEFAULT_COLUMNS: ColumnDefinition[] = [
  { id: 'index', label: 'م', visible: true, align: 'center', width: '40px' },
  { id: 'meterNumber', label: 'رقم العداد', visible: true, align: 'center', isNumeric: true },
  { id: 'name', label: 'اسم المشترك', visible: true, align: 'right' },
  { id: 'phone', label: 'رقم الهاتف', visible: true, align: 'left' },
  { id: 'zone', label: 'المنطقة / المربع', visible: true, align: 'right' },
  { id: 'overdueAmount', label: 'المبالغ المتأخرة', visible: true, align: 'center', isCurrency: true },
  { id: 'currentDue', label: 'مبلغ آخر فاتورة', visible: true, align: 'center', isCurrency: true },
  { id: 'totalCollected', label: 'المبالغ المحصلة', visible: true, align: 'center', isCurrency: true },
  { id: 'totalDue', label: 'إجمالي المبلغ المطلوب', visible: true, align: 'center', isCurrency: true },
  { id: 'collectionRate', label: 'نسبة التحصيل %', visible: true, align: 'center' },
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
  { id: 'notes', label: 'ملاحظات / التوقيع', visible: false, align: 'right' }
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
  onOpenSubscriberStatement,
  onCollectPayment
}) => {
  const [columns, setColumns] = useState<ColumnDefinition[]>(DEFAULT_COLUMNS);
  const [filterType, setFilterType] = useState<FilterType>('debtorsOnly');
  const [selectedZone, setSelectedZone] = useState('all');
  const [selectedTransformer, setSelectedTransformer] = useState('all');
  const [selectedTariff, setSelectedTariff] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope>('all');
  const [minDebtAmount, setMinDebtAmount] = useState<number>(5000);
  const [sortBy, setSortBy] = useState<'totalDue' | 'overdueAmount' | 'currentDue' | 'collected' | 'collectionRate' | 'name' | 'meter' | 'lastPayment'>('totalDue');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  
  // Selection state
  const [selectedSubIds, setSelectedSubIds] = useState<string[]>([]);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [smsSendingState, setSmsSendingState] = useState<string | null>(null);

  // View Mode: Interactive Table vs Live Print A4 Sheet Preview vs Analytics
  const [viewMode, setViewMode] = useState<'table' | 'sheet_preview' | 'analytics'>('table');
  const [mobileDisplayMode, setMobileDisplayMode] = useState<'cards' | 'table'>('cards');
  const [sheetPreviewPageIndex, setSheetPreviewPageIndex] = useState<number>(0);

  // Notice & Slip Modals
  const [activeNoticeItem, setActiveNoticeItem] = useState<SubscriberBalanceItem | null>(null);
  const [activeSlipItem, setActiveSlipItem] = useState<SubscriberBalanceItem | null>(null);

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

    (payments || []).forEach(p => {
      if (!p || p.isRejected || (p as any).status === 'rejected') return;
      if (p.subscriberId) registerPayment(p.subscriberId, p);
      if ((p as any).meterNumber) registerPayment(`meter_${(p as any).meterNumber}`, p);
      if ((p as any).subscriberMeterNumber) registerPayment(`meter_${(p as any).subscriberMeterNumber}`, p);
      if (p.subscriberName) registerPayment(`name_${p.subscriberName}`, p);
    });

    return { readingsBySub: rMap, paymentsBySub: pMap };
  }, [readings, payments]);

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

      return {
        subscriber: sub,
        meterNumber: sub.meterNumber || '-',
        name: sub.name || 'بدون اسم',
        phone: sub.phone || '-',
        zone: sub.zone || 'غير محدد',
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
  }, [subscribers, readingsBySub, paymentsBySub]);

  // Calculate real-time category counts for filter tabs
  const categoryCounts = useMemo(() => {
    let debtors = 0;
    let unpaid = 0;
    let partial = 0;
    let fullyPaid = 0;
    let highDebtors = 0;
    let creditors = 0;

    allSubscriberData.forEach(item => {
      if (item.totalDue > 0) debtors++;
      if (item.paymentStatus === 'unpaid' && item.totalDue > 0) unpaid++;
      if (item.paymentStatus === 'partial') partial++;
      if (item.paymentStatus === 'fully_paid') fullyPaid++;
      if (item.totalDue >= minDebtAmount) highDebtors++;
      if (item.paymentStatus === 'creditor') creditors++;
    });

    return {
      all: allSubscriberData.length,
      debtorsOnly: debtors,
      unpaidOnly: unpaid,
      partialOnly: partial,
      fullyPaid,
      highDebtors,
      creditors
    };
  }, [allSubscriberData, minDebtAmount]);

  // Active filters count for quick reset pill
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterType !== 'all') count++;
    if (selectedZone !== 'all') count++;
    if (selectedTransformer !== 'all') count++;
    if (selectedTariff !== 'all') count++;
    if (selectedMonth !== 'all') count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [filterType, selectedZone, selectedTransformer, selectedTariff, selectedMonth, searchQuery]);

  const handleResetFilters = () => {
    setFilterType('all');
    setSelectedZone('all');
    setSelectedTransformer('all');
    setSelectedTariff('all');
    setSelectedMonth('all');
    setSearchQuery('');
    setSearchScope('all');
  };

  // Filtered & Sorted items with Arabic normalization & multi-token search
  const filteredItems = useMemo(() => {
    const scoredItems = allSubscriberData.map(item => {
      // Filter by type
      if (filterType === 'debtorsOnly' && item.totalDue <= 0) return null;
      if (filterType === 'unpaidOnly' && (item.paymentStatus !== 'unpaid' || item.totalDue <= 0)) return null;
      if (filterType === 'partialOnly' && item.paymentStatus !== 'partial') return null;
      if (filterType === 'fullyPaid' && item.paymentStatus !== 'fully_paid') return null;
      if (filterType === 'highDebtors' && item.totalDue < minDebtAmount) return null;
      if (filterType === 'creditors' && item.paymentStatus !== 'creditor') return null;
      if (filterType === 'aging_current' && item.agingBracket !== 'current') return null;
      if (filterType === 'aging_31_60' && item.agingBracket !== 'days31_60') return null;
      if (filterType === 'aging_61_90' && item.agingBracket !== 'days61_90') return null;
      if (filterType === 'aging_over90' && item.agingBracket !== 'over90') return null;

      // Filter by zone
      if (selectedZone !== 'all' && item.zone !== selectedZone) return null;

      // Filter by transformer
      if (selectedTransformer !== 'all' && item.transformer !== selectedTransformer) return null;

      // Filter by tariff
      if (selectedTariff !== 'all') {
        const match = item.tariffType.includes(selectedTariff) || item.rawTariff.includes(selectedTariff);
        if (!match) return null;
      }

      // Filter by billing month
      if (selectedMonth !== 'all' && item.lastReadingMonth !== selectedMonth) return null;

      // Smart Search Match
      let searchScore = 0;
      if (searchQuery.trim()) {
        const res = matchSubscriberSearch(item.subscriber, searchQuery, searchScope);
        if (!res.isMatch) {
          const normQ = searchQuery.toLowerCase().trim();
          const zoneMatch = item.zone && item.zone.toLowerCase().includes(normQ);
          const transMatch = item.transformer && item.transformer.toLowerCase().includes(normQ);
          if (zoneMatch || transMatch) {
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
      if (searchQuery.trim() && a.searchScore !== b.searchScore && sortBy === 'name') {
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
  }, [allSubscriberData, filterType, minDebtAmount, selectedZone, selectedTransformer, selectedTariff, selectedMonth, searchQuery, searchScope, sortBy, sortOrder]);

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
          case 'transformer': row['المحول'] = item.transformer; break;
          case 'tariffType': row['نوع الاشتراك'] = item.tariffType; break;
          case 'openingBalance': row['الرصيد الافتتاحي'] = item.openingBalance; break;
          case 'totalBilled': row['إجمالي الفواتير'] = item.totalBilled; break;
          case 'totalCollected': row['المبالغ المحصلة'] = item.totalCollected; break;
          case 'collectionRate': row['نسبة التحصيل %'] = `${item.collectionRate}%`; break;
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
          case 'transformer': return item.transformer || '-';
          case 'tariffType': return item.tariffType;
          case 'openingBalance': return item.openingBalance.toLocaleString();
          case 'totalBilled': return item.totalBilled.toLocaleString();
          case 'totalCollected': return item.totalCollected.toLocaleString();
          case 'collectionRate': return `${item.collectionRate}%`;
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
      <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-950/70 space-y-2.5 sm:space-y-3 shrink-0 print:hidden">
        {/* Filter Tabs - Horizontal Touch Scroll for Mobile */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth whitespace-nowrap text-xs font-black">
          <button
            type="button"
            onClick={() => setFilterType('debtorsOnly')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              filterType === 'debtorsOnly'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>المدينين (المطلوب سداده)</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              filterType === 'debtorsOnly' ? 'bg-rose-700 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              {categoryCounts.debtorsOnly}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('unpaidOnly')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              filterType === 'unpaidOnly'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>غير مسدد إطلاقاً (0%)</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              filterType === 'unpaidOnly' ? 'bg-red-800 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              {categoryCounts.unpaidOnly}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('partialOnly')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              filterType === 'partialOnly'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>سداد جزئي</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              filterType === 'partialOnly' ? 'bg-amber-600 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
            }`}>
              {categoryCounts.partialOnly}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('fullyPaid')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              filterType === 'fullyPaid'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>مسدد بالكامل (100%)</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              filterType === 'fullyPaid' ? 'bg-emerald-600 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
            }`}>
              {categoryCounts.fullyPaid}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('highDebtors')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              filterType === 'highDebtors'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>كبار المدينين ({minDebtAmount.toLocaleString()}+)</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              filterType === 'highDebtors' ? 'bg-orange-700 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              {categoryCounts.highDebtors}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('creditors')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              filterType === 'creditors'
                ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>أرصدة دائنة (فائض)</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              filterType === 'creditors' ? 'bg-purple-700 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              {categoryCounts.creditors}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
              filterType === 'all'
                ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>كافة المشتركين</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              filterType === 'all' ? 'bg-sky-600 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
            }`}>
              {categoryCounts.all}
            </span>
          </button>

          {/* Reset Filters Quick Button if Any Filter is Applied */}
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/40 transition-all cursor-pointer shrink-0 flex items-center gap-1 font-bold"
              title="تصفير كافة الفلاتر والبحث"
            >
              <RotateCcw className="w-3 h-3" />
              <span>تصفير الفلاتر ({activeFiltersCount})</span>
            </button>
          )}
        </div>

        {/* Sub-Filters: Search with Scope, Zone, Transformer, Tariff, Month, Sort */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
          {/* Smart Search with Scope Selector */}
          <div className="relative col-span-1 sm:col-span-2 md:col-span-1 lg:col-span-2 flex items-center bg-slate-900 border border-slate-800 rounded-xl focus-within:border-amber-500 transition-colors">
            <Search className="w-4 h-4 text-slate-500 mr-2.5 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="بحث ذكي: الاسم، العداد، الهاتف، المربع..."
              className="w-full bg-transparent pr-2 pl-2 py-2 text-xs text-white placeholder:text-slate-500 outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                title="مسح البحث"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {/* Search Scope Pill Selector */}
            <select
              value={searchScope}
              onChange={e => setSearchScope(e.target.value as SearchScope)}
              className="bg-slate-950 border-r border-slate-800 text-[10px] text-amber-400 font-bold px-2 py-1.5 rounded-l-xl outline-none cursor-pointer shrink-0"
              title="نطاق البحث"
            >
              <option value="all">🔍 شامل</option>
              <option value="name">👤 الاسم</option>
              <option value="meter">🔢 العداد</option>
              <option value="phone">📱 الهاتف</option>
              <option value="zone">📍 المربع</option>
            </select>
          </div>

          {/* Zones */}
          <div>
            <select
              value={selectedZone}
              onChange={e => setSelectedZone(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">كل المناطق / المربعات</option>
              {uniqueZones.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>

          {/* Transformers */}
          <div>
            <select
              value={selectedTransformer}
              onChange={e => setSelectedTransformer(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">كل المحولات</option>
              {uniqueTransformers.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Tariff */}
          <div>
            <select
              value={selectedTariff}
              onChange={e => setSelectedTariff(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="all">كل أنواع الاشتراكات</option>
              <option value="منزلي">سكني / منزلي</option>
              <option value="تجاري">تجاري</option>
              <option value="زراعي">زراعي</option>
              <option value="حكومي">حكومي</option>
              <option value="صناعي">صناعي</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1.5">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-300 outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="totalDue">ترتيب: المبلغ المطلوب</option>
              <option value="collected">ترتيب: المبالغ المحصلة</option>
              <option value="collectionRate">ترتيب: نسبة التحصيل %</option>
              <option value="overdueAmount">ترتيب: المتأخرات السابقة</option>
              <option value="currentDue">ترتيب: مبلغ آخر فاتورة</option>
              <option value="name">ترتيب: اسم المشترك</option>
              <option value="meter">ترتيب: رقم العداد</option>
              <option value="lastPayment">ترتيب: تاريخ آخر سداد</option>
            </select>

            <button
              type="button"
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="p-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 hover:text-white cursor-pointer shrink-0"
              title={sortOrder === 'desc' ? 'تنازلي' : 'تصاعدي'}
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Custom debt limit input if High Debtors selected */}
        {filterType === 'highDebtors' && (
          <div className="flex items-center gap-2 sm:gap-3 bg-orange-950/20 border border-orange-500/30 p-2 sm:p-2.5 rounded-xl text-xs flex-wrap">
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
      </div>

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
              onSelectZone={(z) => {
                setSelectedZone(z);
                setViewMode('table');
              }}
              onSelectTransformer={(t) => {
                setSelectedTransformer(t);
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

            {/* Mobile / Tablet Layout Switcher (Cards vs Wide Table) */}
            <div className="flex items-center justify-between gap-2 lg:hidden bg-slate-950 p-2 rounded-2xl border border-slate-800 text-xs font-bold print:hidden">
              <div className="flex items-center gap-2 text-slate-400">
                <Smartphone className="w-4 h-4 text-amber-400" />
                <span>طريقة العرض للجوال:</span>
              </div>
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setMobileDisplayMode('cards')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
                    mobileDisplayMode === 'cards'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>بطاقات</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileDisplayMode('table')}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
                    mobileDisplayMode === 'table'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Table2 className="w-3.5 h-3.5" />
                  <span>جدول</span>
                </button>
              </div>
            </div>

            {/* RESPONSIVE MOBILE CARDS VIEW (When active on phones/tablets) */}
            {mobileDisplayMode === 'cards' && (
              <div className="block lg:hidden space-y-3 print:hidden">
                <div className="flex items-center justify-between px-1 text-xs text-slate-400 font-bold">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filteredItems.length > 0 && selectedSubIds.length === filteredItems.length}
                      onChange={handleToggleSelectAll}
                      className="rounded accent-amber-500 cursor-pointer w-4 h-4"
                    />
                    <span>تحديد كل المشتركين ({filteredItems.length})</span>
                  </label>
                  <span>عرض {filteredItems.length} مشترك</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredItems.map((item, index) => {
                    const isSelected = selectedSubIds.includes(item.subscriber.id);
                    const isDebtor = item.totalDue > 0;

                    return (
                      <div
                        key={`card-${item.subscriber.id}`}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isSelected
                            ? 'bg-slate-900 border-amber-500/80 shadow-md shadow-amber-500/10'
                            : isDebtor
                            ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                            : 'bg-slate-950/40 border-slate-900'
                        }`}
                      >
                        {/* Card Header: Checkbox + Name + Status */}
                        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(item.subscriber.id)}
                              className="rounded accent-amber-500 cursor-pointer w-4 h-4 mt-1 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-mono text-slate-500">#{index + 1}</span>
                                <h4 className="text-sm font-black text-white truncate">
                                  <HighlightMatch text={item.name} query={searchQuery} />
                                </h4>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 flex-wrap font-mono">
                                <span>عداد: <strong className="text-amber-400"><HighlightMatch text={item.meterNumber} query={searchQuery} /></strong></span>
                                {item.zone && item.zone !== '-' && (
                                  <span>• <HighlightMatch text={item.zone} query={searchQuery} /></span>
                                )}
                                {item.transformer && item.transformer !== '-' && (
                                  <span>• <HighlightMatch text={item.transformer} query={searchQuery} /></span>
                                )}
                              </div>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 ${
                            item.paymentStatus === 'fully_paid'
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : item.paymentStatus === 'partial'
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : item.paymentStatus === 'creditor'
                              ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                              : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                          }`}>
                            {item.paymentStatusLabel}
                          </span>
                        </div>

                        {/* Financial Metrics Grid */}
                        <div className="grid grid-cols-2 gap-2 my-2.5 text-xs bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/60">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">المطلوب القائم:</span>
                            <span className={`text-sm font-mono font-black ${item.totalDue > 0 ? 'text-sky-400' : 'text-slate-400'}`}>
                              {item.totalDue.toLocaleString()} {settings.currency || 'ريال'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">المحصل:</span>
                            <span className="text-sm font-mono font-black text-emerald-400">
                              {item.totalCollected.toLocaleString()} {settings.currency || 'ريال'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">المتأخرات السابقة:</span>
                            <span className={`text-xs font-mono font-bold ${item.overdueAmount > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                              {item.overdueAmount.toLocaleString()} {settings.currency || 'ريال'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-bold">آخر فاتورة:</span>
                            <span className="text-xs font-mono font-bold text-amber-400">
                              {item.currentDue.toLocaleString()} {settings.currency || 'ريال'}
                            </span>
                          </div>
                        </div>

                        {/* Collection Rate & Last Payment Details */}
                        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 mb-2.5 font-bold">
                          <div className="flex items-center gap-1.5">
                            <span>نسبة التحصيل:</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-black ${
                              item.collectionRate >= 80 ? 'bg-emerald-500/20 text-emerald-300' : item.collectionRate >= 40 ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'
                            }`}>
                              {item.collectionRate}%
                            </span>
                          </div>
                          {item.lastPaymentDate !== '-' && (
                            <span className="text-[10px] text-slate-500">
                              آخر سداد: {item.lastPaymentDate}
                            </span>
                          )}
                        </div>

                        {/* Card Action Buttons (Touch Friendly) */}
                        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/80">
                          {item.phone && item.phone !== '-' && (
                            <a
                              href={`tel:${item.phone.replace(/[^0-9]/g, '')}`}
                              className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                              <span>اتصال</span>
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => setActiveNoticeItem(item)}
                            className="flex-1 py-2 bg-emerald-950/60 hover:bg-emerald-800 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>واتساب</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveSlipItem(item)}
                            className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            title="إشعار مطالبة"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">إشعار</span>
                          </button>

                          {onOpenSubscriberStatement && (
                            <button
                              type="button"
                              onClick={() => onOpenSubscriberStatement(item.subscriber)}
                              className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                              title="كشف حساب"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {filteredItems.length === 0 && (
                    <div className="p-8 text-center text-slate-500 font-bold col-span-full bg-slate-950/40 rounded-2xl border border-slate-800">
                      لا توجد بيانات مطابقة لمعايير الفلترة المحددة.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* The Main Table Container (Visible on Desktop OR when Table view chosen on mobile) */}
            <div className={`${mobileDisplayMode === 'cards' ? 'hidden lg:block' : 'block'} overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950 shadow-xl print:block print:border-none print:shadow-none print:bg-white print:overflow-visible`}>
              <table className="w-full text-right border-collapse text-xs print:text-black min-w-[700px] lg:min-w-full">
                {/* TABLE HEADER */}
                <thead className="bg-slate-900 text-slate-300 font-bold border-b border-slate-800 select-none print:bg-slate-100 print:text-black print:border-b-2 print:border-black sticky top-0 z-10">
                  <tr>
                    <th className="p-3 text-center w-10 print:hidden">
                      <input
                        type="checkbox"
                        checked={filteredItems.length > 0 && selectedSubIds.length === filteredItems.length}
                        onChange={handleToggleSelectAll}
                        className="rounded accent-amber-500 cursor-pointer"
                        title="تحديد الكل"
                      />
                    </th>

                    {visibleColumns.map(col => (
                      <th
                        key={col.id}
                        style={{ width: col.width }}
                        className={`p-3 font-black text-slate-200 print:text-black print:border print:border-black whitespace-nowrap ${
                          col.align === 'center' ? 'text-center' : col.align === 'left' ? 'text-left' : 'text-right'
                        }`}
                      >
                        {col.label}
                      </th>
                    ))}

                    <th className="p-3 text-center w-24 print:hidden whitespace-nowrap">إجراءات سريعة</th>
                  </tr>
                </thead>

                {/* TABLE BODY */}
                <tbody className="divide-y divide-slate-800/60 print:divide-slate-300">
                  {filteredItems.map((item, index) => {
                    const isSelected = selectedSubIds.includes(item.subscriber.id);
                    const isDebtor = item.totalDue > 0;
                    const isCreditor = item.paymentStatus === 'creditor';

                    return (
                      <React.Fragment key={item.subscriber.id}>
                        <tr 
                          className={`transition-colors ${
                            isSelected
                              ? 'bg-amber-500/10 hover:bg-amber-500/15'
                              : isDebtor
                              ? 'hover:bg-slate-900/80 bg-slate-950'
                              : 'hover:bg-slate-900/60 bg-slate-950/40'
                          } print:bg-white`}
                        >
                          {/* Selection Checkbox */}
                          <td className="p-3 text-center print:hidden">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(item.subscriber.id)}
                              className="rounded accent-amber-500 cursor-pointer"
                            />
                          </td>

                          {/* Dynamic Data Cells */}
                          {visibleColumns.map(col => {
                            let val: React.ReactNode = '';
                            switch (col.id) {
                              case 'index':
                                val = index + 1;
                                break;
                              case 'meterNumber':
                                val = <span className="font-mono font-bold text-amber-400 print:text-black"><HighlightMatch text={item.meterNumber} query={searchQuery} /></span>;
                                break;
                              case 'name':
                                val = <span className="font-bold text-white print:text-black"><HighlightMatch text={item.name} query={searchQuery} /></span>;
                                break;
                              case 'phone':
                                val = (
                                  <span className="font-mono text-slate-300 print:text-black flex items-center justify-start gap-1">
                                    {item.phone && item.phone !== '-' ? (
                                      <a 
                                        href={`tel:${item.phone.replace(/[^0-9]/g, '')}`}
                                        className="hover:text-amber-400 transition-colors flex items-center gap-1"
                                        title="اتصال هاتفي"
                                      >
                                        <PhoneCall className="w-3 h-3 text-emerald-400" />
                                        <span><HighlightMatch text={item.phone} query={searchQuery} /></span>
                                      </a>
                                    ) : '-'}
                                  </span>
                                );
                                break;
                              case 'zone':
                                val = <HighlightMatch text={item.zone} query={searchQuery} />;
                                break;
                              case 'transformer':
                                val = <HighlightMatch text={item.transformer} query={searchQuery} />;
                                break;
                              case 'tariffType':
                                val = <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 print:bg-transparent print:text-black text-[11px]">{item.tariffType}</span>;
                                break;
                              case 'openingBalance':
                                val = <span className="font-mono text-slate-300">{item.openingBalance.toLocaleString()}</span>;
                                break;
                              case 'totalBilled':
                                val = <span className="font-mono text-amber-300">{item.totalBilled.toLocaleString()}</span>;
                                break;
                              case 'totalCollected':
                                val = <span className="font-mono font-black text-emerald-400 print:text-black">{item.totalCollected.toLocaleString()}</span>;
                                break;
                              case 'collectionRate':
                                val = `${item.collectionRate}%`;
                                break;
                              case 'overdueAmount':
                                val = (
                                  <span className={`font-mono font-bold ${item.overdueAmount > 0 ? 'text-rose-400 print:text-black' : 'text-slate-500'}`}>
                                    {item.overdueAmount.toLocaleString()}
                                  </span>
                                );
                                break;
                              case 'currentDue':
                                val = (
                                  <span className={`font-mono font-bold ${item.currentDue > 0 ? 'text-amber-400 print:text-black' : 'text-slate-500'}`}>
                                    {item.currentDue.toLocaleString()}
                                  </span>
                                );
                                break;
                              case 'totalDue':
                                val = (
                                  <span className={`font-mono font-black text-sm ${item.totalDue > 0 ? 'text-sky-400 print:text-black' : 'text-slate-500'}`}>
                                    {item.totalDue.toLocaleString()}
                                  </span>
                                );
                                break;
                              case 'paymentStatusLabel':
                                val = item.paymentStatusLabel;
                                break;
                              case 'lastPaymentDate':
                                val = item.lastPaymentDate;
                                break;
                              case 'lastPaymentAmount':
                                val = item.lastPaymentAmount.toLocaleString();
                                break;
                              case 'lastReadingDate':
                                val = item.lastReadingDate;
                                break;
                              case 'lastConsumption':
                                val = item.lastConsumption ? `${item.lastConsumption} ك.و` : '-';
                                break;
                              case 'status':
                                val = item.status;
                                break;
                              case 'notes':
                                val = <div className="min-w-[100px] h-5 border-b border-dotted border-slate-700 print:border-black" />;
                                break;
                            }

                            return (
                              <td
                                key={col.id}
                                className={`p-3 print:border print:border-black ${
                                  col.align === 'center' ? 'text-center' : col.align === 'left' ? 'text-left' : 'text-right'
                                }`}
                              >
                                {col.id === 'collectionRate' ? (
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-black ${
                                    item.collectionRate >= 80 ? 'bg-emerald-500/20 text-emerald-300' : item.collectionRate >= 40 ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'
                                  }`}>
                                    {item.collectionRate}%
                                  </span>
                                ) : col.id === 'paymentStatusLabel' ? (
                                  <span className={`px-2 py-0.5 rounded-lg text-[10px] ${
                                    item.paymentStatus === 'fully_paid' ? 'bg-emerald-500/15 text-emerald-300' : item.paymentStatus === 'partial' ? 'bg-amber-500/15 text-amber-300' : item.paymentStatus === 'creditor' ? 'bg-purple-500/15 text-purple-300' : 'bg-rose-500/15 text-rose-300'
                                  }`}>
                                    {val}
                                  </span>
                                ) : val}
                              </td>
                            );
                          })}

                          {/* Inline Action Buttons */}
                          <td className="p-3 text-center print:hidden">
                            <div className="flex items-center justify-center gap-1">
                              {/* Open Subscriber Statement */}
                              {onOpenSubscriberStatement && (
                                <button
                                  type="button"
                                  onClick={() => onOpenSubscriberStatement(item.subscriber)}
                                  className="p-1.5 bg-slate-900 hover:bg-amber-500 text-slate-300 hover:text-slate-950 rounded-lg transition-colors cursor-pointer"
                                  title="كشف حساب المشترك التفصيلي"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* WhatsApp Notice Dialog */}
                              <button
                                type="button"
                                onClick={() => setActiveNoticeItem(item)}
                                className="p-1.5 bg-emerald-950/70 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                                title="إرسال إشعار / رسالة واتساب"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </button>

                              {/* Print Single Field Demand Slip */}
                              <button
                                type="button"
                                onClick={() => setActiveSlipItem(item)}
                                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-lg transition-colors cursor-pointer"
                                title="طباعة إشعار مطالبة رسمي ميداني"
                              >
                                <FileDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Page break marker */}
                        {(index + 1) % rowsPerPage === 0 && index + 1 < filteredItems.length && (
                          <tr key={`divider-${index}`} className="bg-slate-900/90 border-y-2 border-dashed border-amber-500/30 print:hidden select-none">
                            <td colSpan={visibleColumns.length + 2} className="py-2 px-4 text-center font-bold text-[11px] text-amber-400">
                              <span>─── فاصل صفحة الطباعة: نهاية صفحة {Math.floor((index + 1) / rowsPerPage)} • بداية صفحة {Math.floor((index + 1) / rowsPerPage) + 1} ───</span>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}

                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={visibleColumns.length + 2} className="p-8 text-center text-slate-500 font-bold print:text-black">
                        لا توجد بيانات مطابقة لمعايير الفلترة المحددة.
                      </td>
                    </tr>
                  )}
                </tbody>

                {/* TOTALS SUMMARY FOOTER */}
                {showTotalsRow && visibleColumns.length > 0 && (
                  <tfoot className="bg-slate-900 font-black border-t-2 border-slate-700 text-white print:bg-slate-200 print:text-black print:border-black">
                    <tr>
                      <td className="p-3 text-center print:hidden">#</td>
                      {visibleColumns.map((col, idx) => {
                        if (idx === 0) return <td key={col.id} className="p-3 text-center font-bold text-slate-300 print:text-black print:border">الإجمالي العام</td>;
                        if (col.id === 'totalCollected') return <td key={col.id} className="p-3 text-center font-mono text-emerald-400 print:text-black print:border">{summaryStats.totalCollected.toLocaleString()}</td>;
                        if (col.id === 'collectionRate') return <td key={col.id} className="p-3 text-center font-mono text-emerald-400 print:text-black print:border">{summaryStats.overallCollectionRate}%</td>;
                        if (col.id === 'overdueAmount') return <td key={col.id} className="p-3 text-center font-mono text-rose-400 print:text-black print:border">{summaryStats.totalOverdue.toLocaleString()}</td>;
                        if (col.id === 'currentDue') return <td key={col.id} className="p-3 text-center font-mono text-amber-400 print:text-black print:border">{summaryStats.totalCurrentDue.toLocaleString()}</td>;
                        if (col.id === 'totalDue') return <td key={col.id} className="p-3 text-center font-mono text-sky-400 print:text-black print:border">{summaryStats.totalDueSum.toLocaleString()}</td>;
                        return <td key={col.id} className="p-3 print:border">{idx === 1 ? `(${filteredItems.length} مشترك)` : ''}</td>;
                      })}
                      <td className="p-3 print:hidden"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

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
