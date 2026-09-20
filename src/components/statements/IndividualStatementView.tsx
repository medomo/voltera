import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { 
  Subscriber, MeterReading, Payment, SystemSettings, User 
} from '../../types';
import { isItemForSubscriber } from '../../utils/balanceUtils';
import { tafqeetArabic } from '../../utils/numberToWords';
import { safePrint } from '../../utils/exportUtils';
import { PrintableA4Statement, StatementTimelineItem } from './PrintableA4Statement';
import { PrintableThermalStatement } from './PrintableThermalStatement';
import {
  FileText, Search, Printer, Download, Share2, Calendar, Filter, 
  CheckCircle2, AlertTriangle, AlertCircle, RefreshCw, Zap, 
  DollarSign, TrendingUp, TrendingDown, Eye, Check, ChevronDown, 
  MessageSquare, User as UserIcon, Phone, MapPin, Gauge, Layers, Sliders
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';

interface IndividualStatementViewProps {
  subscribers: Subscriber[];
  readings: MeterReading[];
  payments: Payment[];
  settings: SystemSettings;
  currentUser?: User;
  initialSubscriberId?: string;
  onSelectSubscriber?: (sub: Subscriber) => void;
}

export const IndividualStatementView: React.FC<IndividualStatementViewProps> = ({
  subscribers = [],
  readings = [],
  payments = [],
  settings,
  currentUser,
  initialSubscriberId,
  onSelectSubscriber
}) => {
  // 1. Search and Selected Subscriber State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubId, setSelectedSubId] = useState<string>(
    initialSubscriberId || (subscribers.length > 0 ? subscribers[0].id : '')
  );

  // 2. Filters State
  const [datePreset, setDatePreset] = useState<'all' | 'this_month' | 'last_month' | 'last_3_months' | 'this_year' | 'custom'>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [movementFilter, setMovementFilter] = useState<'all' | 'readings' | 'payments'>('all');
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(true);

  // 3. Print and Export Modals State
  const [printMode, setPrintMode] = useState<'none' | 'a4' | 'thermal'>('none');
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedShareText, setCopiedShareText] = useState(false);

  // Active Subscriber
  const selectedSub = useMemo(() => {
    return subscribers.find(s => s.id === selectedSubId) || null;
  }, [subscribers, selectedSubId]);

  // Filtered subscribers list for selector
  const filteredSubscribersList = useMemo(() => {
    if (!searchQuery.trim()) return subscribers.slice(0, 30);
    const q = searchQuery.toLowerCase().trim();
    return subscribers.filter(s => 
      s.name.toLowerCase().includes(q) ||
      s.meterNumber.toLowerCase().includes(q) ||
      (s.phone && s.phone.includes(q)) ||
      (s.subscriberCode && s.subscriberCode.toLowerCase().includes(q)) ||
      (s.zone && s.zone.toLowerCase().includes(q))
    ).slice(0, 40);
  }, [subscribers, searchQuery]);

  // Apply Date Preset
  const handleDatePreset = (preset: 'all' | 'this_month' | 'last_month' | 'last_3_months' | 'this_year' | 'custom') => {
    setDatePreset(preset);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (preset === 'all') {
      setFromDate('');
      setToDate('');
    } else if (preset === 'this_month') {
      const mStr = String(currentMonth).padStart(2, '0');
      const lastDay = new Date(currentYear, currentMonth, 0).getDate();
      setFromDate(`${currentYear}-${mStr}-01`);
      setToDate(`${currentYear}-${mStr}-${String(lastDay).padStart(2, '0')}`);
    } else if (preset === 'last_month') {
      const prevDate = new Date(currentYear, currentMonth - 2, 1);
      const prevYear = prevDate.getFullYear();
      const prevMonth = prevDate.getMonth() + 1;
      const mStr = String(prevMonth).padStart(2, '0');
      const lastDay = new Date(prevYear, prevMonth, 0).getDate();
      setFromDate(`${prevYear}-${mStr}-01`);
      setToDate(`${prevYear}-${mStr}-${String(lastDay).padStart(2, '0')}`);
    } else if (preset === 'last_3_months') {
      const startDate = new Date(currentYear, currentMonth - 3, 1);
      const sYear = startDate.getFullYear();
      const sMonth = String(startDate.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(currentYear, currentMonth, 0).getDate();
      setFromDate(`${sYear}-${sMonth}-01`);
      setToDate(`${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
    } else if (preset === 'this_year') {
      setFromDate(`${currentYear}-01-01`);
      setToDate(`${currentYear}-12-31`);
    }
  };

  // Subscriber Readings & Payments (All history)
  const allSubReadings = useMemo(() => {
    if (!selectedSub) return [];
    return readings
      .filter(r => !r.isRejected && isItemForSubscriber(r, selectedSub))
      .sort((a, b) => (a.readingDate || a.billingMonth).localeCompare(b.readingDate || b.billingMonth));
  }, [selectedSub, readings]);

  const allSubPayments = useMemo(() => {
    if (!selectedSub) return [];
    return payments
      .filter(p => !p.isRejected && isItemForSubscriber(p, selectedSub))
      .sort((a, b) => a.paymentDate.localeCompare(b.paymentDate));
  }, [selectedSub, payments]);

  // Compute Period Ledger & Balances
  const statementData = useMemo(() => {
    if (!selectedSub) {
      return {
        timeline: [] as StatementTimelineItem[],
        openingBalanceForPeriod: 0,
        closingBalanceForPeriod: 0,
        totalPeriodDebit: 0,
        totalPeriodCredit: 0,
        totalPeriodConsumptionKwh: 0,
        totalInvoicedAllTime: 0,
        totalPaidAllTime: 0,
        totalConsumptionAllTime: 0
      };
    }

    const initialOpening = Number(selectedSub.openingBalance) || 0;
    
    // Accumulate all movements in chronological order
    const allChronologicalMoves: StatementTimelineItem[] = [];

    allSubReadings.forEach(r => {
      allChronologicalMoves.push({
        id: 'r_' + r.id,
        date: r.readingDate || (r.billingMonth ? `${r.billingMonth}-01` : '2026-01-01'),
        type: 'reading',
        invoiceNumber: r.invoiceNumber || `INV-${r.id.slice(-5)}`,
        desc: `فاتورة استهلاك كهرباء - شهر (${r.billingMonth}) [كمية: ${r.consumption} ك.و.س]`,
        debit: r.totalAmount,
        credit: 0,
        runningBalance: 0,
        details: {
          prevReading: r.previousReading,
          currReading: r.currentReading,
          consumption: r.consumption,
          ratePerKwh: r.ratePerKwh,
          fixedFee: r.fixedFee,
          taxAmount: r.taxAmount
        }
      });
    });

    allSubPayments.forEach(p => {
      allChronologicalMoves.push({
        id: 'p_' + p.id,
        date: p.paymentDate || '2026-01-01',
        type: 'payment',
        receiptNumber: p.receiptNumber || `REC-${p.id.slice(-5)}`,
        desc: `سند قبض وتوريد نقدي - إيصال رقم (${p.receiptNumber || 'بدون'}) [المحصل: ${p.receivedBy || 'المكتب'}]`,
        debit: 0,
        credit: p.amountPaid,
        runningBalance: 0,
        details: {
          receivedBy: p.receivedBy,
          paymentMethod: p.paymentMethod
        }
      });
    });

    // Sort by Date Ascending
    allChronologicalMoves.sort((a, b) => a.date.localeCompare(b.date));

    // Calculate all-time running balances
    let running = initialOpening;
    const withRunning = allChronologicalMoves.map(item => {
      running += item.debit - item.credit;
      return {
        ...item,
        runningBalance: running
      };
    });

    // Calculate period specific slice
    let openingForPeriod = initialOpening;
    const periodMoves: StatementTimelineItem[] = [];

    withRunning.forEach(item => {
      const isBeforePeriod = fromDate && item.date < fromDate;
      const isAfterPeriod = toDate && item.date > toDate;

      if (isBeforePeriod) {
        openingForPeriod += item.debit - item.credit;
      } else if (!isAfterPeriod) {
        // Filter by movement type if selected
        if (movementFilter === 'readings' && item.type !== 'reading') return;
        if (movementFilter === 'payments' && item.type !== 'payment') return;
        periodMoves.push(item);
      }
    });

    const totalPeriodDebit = periodMoves.reduce((s, i) => s + i.debit, 0);
    const totalPeriodCredit = periodMoves.reduce((s, i) => s + i.credit, 0);
    const totalPeriodConsumptionKwh = periodMoves.reduce((s, i) => s + (i.details?.consumption || 0), 0);
    
    // Recalculate local running balances for the displayed period table starting from openingForPeriod
    let localRunning = openingForPeriod;
    const timelineWithLocalRunning = periodMoves.map(item => {
      localRunning += item.debit - item.credit;
      return {
        ...item,
        runningBalance: localRunning
      };
    });

    const closingBalanceForPeriod = fromDate || toDate ? localRunning : selectedSub.currentBalance;

    const totalInvoicedAllTime = allSubReadings.reduce((s, r) => s + r.totalAmount, 0);
    const totalPaidAllTime = allSubPayments.reduce((s, p) => s + p.amountPaid, 0);
    const totalConsumptionAllTime = allSubReadings.reduce((s, r) => s + r.consumption, 0);

    return {
      timeline: timelineWithLocalRunning,
      openingBalanceForPeriod: openingForPeriod,
      closingBalanceForPeriod,
      totalPeriodDebit,
      totalPeriodCredit,
      totalPeriodConsumptionKwh,
      totalInvoicedAllTime,
      totalPaidAllTime,
      totalConsumptionAllTime
    };
  }, [selectedSub, allSubReadings, allSubPayments, fromDate, toDate, movementFilter]);

  // Monthly Consumption Chart Data
  const monthlyChartData = useMemo(() => {
    if (!selectedSub || allSubReadings.length === 0) return [];
    return allSubReadings.slice(-6).map(r => ({
      month: r.billingMonth,
      consumption: r.consumption,
      amount: r.totalAmount
    }));
  }, [selectedSub, allSubReadings]);

  // Download High-Res Image
  const downloadStatementAsImage = async () => {
    const printEl = document.querySelector('.statement-print-container') as HTMLElement;
    if (!printEl) return;
    try {
      setIsExportingImage(true);
      const canvas = await html2canvas(printEl, {
        scale: 2.5,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `statement_${selectedSub?.meterNumber || 'sub'}_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Image export failed:', err);
    } finally {
      setIsExportingImage(false);
    }
  };

  // Export CSV
  const exportStatementToCSV = () => {
    if (!selectedSub) return;
    const headers = ['التاريخ', 'نوع العملية', 'البيان', 'مدين (مستحق)', 'دائن (مسدد)', 'الرصيد الجاري'];
    const rows = statementData.timeline.map(item => [
      item.date,
      item.type === 'reading' ? 'فاتورة' : 'سند قبض',
      (item.desc || '').replace(/,/g, ' - '),
      item.debit,
      item.credit,
      item.runningBalance
    ]);
    
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `كشف_حساب_${(selectedSub.name || '').replace(/\s+/g, '_')}_${selectedSub.meterNumber || ''}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Share Text Builder
  const buildShareText = () => {
    if (!selectedSub) return '';
    const balanceStatus = selectedSub.currentBalance > 0 ? 'مبلغ مستحق عليك' : selectedSub.currentBalance < 0 ? 'رصيد دائن لك' : 'الحساب مصفى تماماً';
    return `⚡ *كشف حساب واستهلاك كهرباء*
🏢 *${settings.stationName || 'محطة الطاقة الكهربائية'}*
━━━━━━━━━━━━━━━━━
👤 المشترك: *${selectedSub.name}*
🔢 رقم العداد: *${selectedSub.meterNumber}*
📍 المنطقة: *${selectedSub.zone || 'الرئيسية'}*
━━━━━━━━━━━━━━━━━
📊 *ملخص الحساب المالي:*
💰 الرصيد الحالي: *${Math.abs(selectedSub.currentBalance).toLocaleString()} ${settings.currency}* (${balanceStatus})
⚡ إجمالي الاستهلاك: *${statementData.totalConsumptionAllTime.toLocaleString()} ك.و.س*
📥 إجمالي المسدد: *${statementData.totalPaidAllTime.toLocaleString()} ${settings.currency}*
━━━━━━━━━━━━━━━━━
📞 للاستفسار أو السداد: ${settings.phone || ''}
شكراً لتعاملكم وثقتكم بنا.`;
  };

  const handleCopyShare = () => {
    const text = buildShareText();
    navigator.clipboard.writeText(text);
    setCopiedShareText(true);
    setTimeout(() => setCopiedShareText(false), 2500);
  };

  const handleOpenWhatsApp = () => {
    if (!selectedSub?.phone) return;
    const cleanPhone = String(selectedSub.phone || '').replace(/[^0-9]/g, '');
    const fullPhone = cleanPhone.startsWith('967') ? cleanPhone : `967${cleanPhone}`;
    const text = encodeURIComponent(buildShareText());
    window.open(`https://wa.me/${fullPhone}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6 text-right">
      {/* 1. TOP SELECTION & QUICK STATS BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" />
              <span>كشف حساب المشترك الفردي التفصيلي (Individual Ledger)</span>
            </h3>
            <p className="text-xs text-slate-500 font-bold mt-0.5">
              متابعة الحركة المالية، سجل القراءات والفواتير، وسندات القبض والرصيد التراكمي
            </p>
          </div>

          {/* Quick Action Tools */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setPrintMode('a4')}
              disabled={!selectedSub}
              className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-amber-400 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>طباعة كشف A4 رسمي</span>
            </button>

            <button
              onClick={() => setPrintMode('thermal')}
              disabled={!selectedSub}
              className="bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-300"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>إيصال حراري (80mm)</span>
            </button>

            <button
              onClick={exportStatementToCSV}
              disabled={!selectedSub}
              className="bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-emerald-700 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-emerald-200"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير Excel</span>
            </button>

            <button
              onClick={() => setShowShareModal(true)}
              disabled={!selectedSub}
              className="bg-sky-50 hover:bg-sky-100 disabled:opacity-50 text-sky-700 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-sky-200"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>مشاركة واتساب / SMS</span>
            </button>
          </div>
        </div>

        {/* 2. SUBSCRIBER SELECTOR WITH SEARCH AUTOCOMPLETE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <label className="block text-xs font-bold text-slate-600 mb-1">
              بحث واختيار المشترك (بالاسم، رقم العداد، الجوال، أو المنطقة):
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <select
                value={selectedSubId}
                onChange={(e) => {
                  setSelectedSubId(e.target.value);
                  const sub = subscribers.find(s => s.id === e.target.value);
                  if (sub && onSelectSubscriber) onSelectSubscriber(sub);
                }}
                className="w-full bg-slate-50 hover:bg-slate-100/80 border border-slate-300 rounded-xl py-2.5 pr-9 pl-4 text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:border-amber-500 transition-all cursor-pointer"
              >
                <option value="" disabled>-- الرجاء اختيار المشترك لعرض كشف حسابه --</option>
                {filteredSubscribersList.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} | عداد: {s.meterNumber} | رصيد: {s.currentBalance.toLocaleString()} {settings.currency} | {s.zone || 'الرئيسية'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              تصفية القائمة السريعة:
            </label>
            <input
              type="text"
              placeholder="اكتب لتصفية المشتركين..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* 3. DATE RANGE & MOVEMENT FILTERS BAR */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs font-bold">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 font-bold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>فترة الكشف:</span>
            </span>
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => handleDatePreset('all')}
                className={`px-2.5 py-1 rounded text-xs transition-all cursor-pointer ${
                  datePreset === 'all' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                كافة الفترات
              </button>
              <button
                onClick={() => handleDatePreset('this_month')}
                className={`px-2.5 py-1 rounded text-xs transition-all cursor-pointer ${
                  datePreset === 'this_month' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                الشهر الحالي
              </button>
              <button
                onClick={() => handleDatePreset('last_month')}
                className={`px-2.5 py-1 rounded text-xs transition-all cursor-pointer ${
                  datePreset === 'last_month' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                الشهر السابق
              </button>
              <button
                onClick={() => handleDatePreset('last_3_months')}
                className={`px-2.5 py-1 rounded text-xs transition-all cursor-pointer ${
                  datePreset === 'last_3_months' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                آخر 3 أشهر
              </button>
              <button
                onClick={() => handleDatePreset('this_year')}
                className={`px-2.5 py-1 rounded text-xs transition-all cursor-pointer ${
                  datePreset === 'this_year' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                العام الحالي
              </button>
            </div>
          </div>

          {/* Date Pickers */}
          <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
            <span className="text-slate-500">من:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setDatePreset('custom');
              }}
              className="bg-transparent font-mono outline-none text-slate-800 text-xs"
            />
            <span className="text-slate-500">إلى:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setDatePreset('custom');
              }}
              className="bg-transparent font-mono outline-none text-slate-800 text-xs"
            />
          </div>

          {/* Movement Type Filter */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setMovementFilter('all')}
                className={`px-2 py-1 rounded text-xs font-bold cursor-pointer ${
                  movementFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setMovementFilter('readings')}
                className={`px-2 py-1 rounded text-xs font-bold cursor-pointer ${
                  movementFilter === 'readings' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                فواتير فقط
              </button>
              <button
                onClick={() => setMovementFilter('payments')}
                className={`px-2 py-1 rounded text-xs font-bold cursor-pointer ${
                  movementFilter === 'payments' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                سندات قبض فقط
              </button>
            </div>

            {/* Toggle Technical Details */}
            <button
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                showTechnicalDetails ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{showTechnicalDetails ? 'تفاصيل العداد: ظاهرة' : 'تفاصيل العداد: مخفية'}</span>
            </button>
          </div>
        </div>
      </div>

      {selectedSub ? (
        <div className="space-y-6">
          {/* 4. SUBSCRIBER PROFILE & FINANCIAL KPI METRIC CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Card 1: Subscriber Identity */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md">
                    {selectedSub.tariffType === 'residential' ? 'سكني' : selectedSub.tariffType === 'commercial' ? 'تجاري' : 'صناعي'}
                  </span>
                  <span className={`w-2.5 h-2.5 rounded-full ${selectedSub.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                </div>
                <h4 className="font-black text-slate-900 text-sm truncate" title={selectedSub.name}>
                  {selectedSub.name}
                </h4>
                <div className="text-xs text-slate-500 space-y-0.5 mt-1 font-bold">
                  <p>العداد: <span className="font-mono text-slate-900 font-black">{selectedSub.meterNumber}</span></p>
                  <p>المنطقة: <span className="text-slate-800">{selectedSub.zone || 'الرئيسية'}</span></p>
                  {selectedSub.phone && (
                    <p>الجوال: <span className="font-mono text-slate-800" dir="ltr">{selectedSub.phone}</span></p>
                  )}
                </div>
              </div>
            </div>

            {/* Card 2: Period Opening Balance */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold text-slate-500 block mb-1">رصيد أول المدة (السابق)</span>
              <h4 className="text-xl font-black font-mono text-slate-800 mt-1">
                {statementData.openingBalanceForPeriod.toLocaleString()}
                <span className="text-xs font-sans text-slate-400 font-bold mr-1">{settings.currency}</span>
              </h4>
              <span className="text-[10px] text-slate-400 font-bold block mt-2">
                {fromDate ? `حتى تاريخ: ${fromDate}` : 'الرصيد الافتتاحي للنظام'}
              </span>
            </div>

            {/* Card 3: Total Period Invoiced */}
            <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-rose-600">إجمالي الفواتير والمطالبات</span>
                <TrendingUp className="w-4 h-4 text-rose-500" />
              </div>
              <h4 className="text-xl font-black font-mono text-rose-700 mt-1">
                {statementData.totalPeriodDebit.toLocaleString()}
                <span className="text-xs font-sans text-slate-400 font-bold mr-1">{settings.currency}</span>
              </h4>
              <span className="text-[10px] text-slate-500 font-bold block mt-2">
                طاقة: <span className="font-mono font-black text-amber-700">{statementData.totalPeriodConsumptionKwh.toLocaleString()}</span> ك.و.س
              </span>
            </div>

            {/* Card 4: Total Period Collected */}
            <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-emerald-600">إجمالي المسدد والمقبوض</span>
                <TrendingDown className="w-4 h-4 text-emerald-500" />
              </div>
              <h4 className="text-xl font-black font-mono text-emerald-700 mt-1">
                {statementData.totalPeriodCredit.toLocaleString()}
                <span className="text-xs font-sans text-slate-400 font-bold mr-1">{settings.currency}</span>
              </h4>
              <span className="text-[10px] text-slate-500 font-bold block mt-2">
                نسبة التحصيل: <span className="font-mono font-bold text-emerald-600">
                  {statementData.totalPeriodDebit > 0 
                    ? Math.round((statementData.totalPeriodCredit / statementData.totalPeriodDebit) * 100)
                    : 100}%
                </span>
              </span>
            </div>

            {/* Card 5: Final Standing Balance */}
            <div className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between ${
              statementData.closingBalanceForPeriod > 0 
                ? 'bg-gradient-to-br from-rose-50 to-amber-50 border-rose-200' 
                : statementData.closingBalanceForPeriod < 0 
                  ? 'bg-gradient-to-br from-emerald-50 to-sky-50 border-emerald-200' 
                  : 'bg-slate-50 border-slate-200'
            }`}>
              <div>
                <span className="text-[11px] font-black text-slate-700 block mb-1">الرصيد النهائي المستحق</span>
                <h4 className={`text-2xl font-black font-mono mt-1 ${
                  statementData.closingBalanceForPeriod > 0 ? 'text-rose-600' : statementData.closingBalanceForPeriod < 0 ? 'text-emerald-600' : 'text-slate-800'
                }`}>
                  {Math.abs(statementData.closingBalanceForPeriod).toLocaleString()}
                  <span className="text-xs font-sans text-slate-500 font-bold mr-1">{settings.currency}</span>
                </h4>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  statementData.closingBalanceForPeriod > 0 ? 'bg-rose-100 text-rose-800' : statementData.closingBalanceForPeriod < 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-800'
                }`}>
                  {statementData.closingBalanceForPeriod > 0 ? 'مبلغ مدين (مستحق)' : statementData.closingBalanceForPeriod < 0 ? 'رصيد دائن (مسبق)' : 'الحساب مصفى'}
                </span>
              </div>
            </div>
          </div>

          {/* 5. INTERACTIVE TIMELINE STATEMENT TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <h4 className="font-black text-sm text-white">
                  جدول كشف الحساب التفصيلي المتسلسل (Statement Ledger)
                </h4>
                <span className="text-xs text-slate-400 font-mono">
                  ({statementData.timeline.length} حركة مسجلة)
                </span>
              </div>

              <div className="text-xs text-amber-300 font-bold">
                تفقيط الرصيد: <span className="font-bold">{tafqeetArabic(statementData.closingBalanceForPeriod, settings.currency)}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-100 text-slate-800 font-black border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="p-3 text-center w-12">م</th>
                    <th className="p-3 text-center w-28">التاريخ</th>
                    <th className="p-3 text-center w-28">رقم السند/الفاتورة</th>
                    <th className="p-3 text-right">بيان وتفاصيل العملية</th>
                    {showTechnicalDetails && (
                      <>
                        <th className="p-3 text-center w-24">القراءات</th>
                        <th className="p-3 text-center w-24">الاستهلاك (ك.و)</th>
                      </>
                    )}
                    <th className="p-3 text-center w-28 text-rose-600">مدين (+)</th>
                    <th className="p-3 text-center w-28 text-emerald-600">دائن (-)</th>
                    <th className="p-3 text-center w-32 text-slate-900">الرصيد التراكمي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-slate-800 text-[11px]">
                  {/* Period Opening Balance Row */}
                  {statementData.openingBalanceForPeriod !== 0 && (
                    <tr className="bg-amber-50/70">
                      <td className="p-3 text-center font-mono text-slate-400">-</td>
                      <td className="p-3 text-center font-mono text-slate-600">{fromDate || 'رصيد سابق'}</td>
                      <td className="p-3 text-center font-mono text-slate-500">OPEN-BAL</td>
                      <td className="p-3 font-black text-slate-900" colSpan={showTechnicalDetails ? 3 : 1}>
                        رصيد مرحل سابق / رصيد بداية الفترة
                      </td>
                      <td className="p-3 text-center font-mono font-black text-rose-600">
                        {statementData.openingBalanceForPeriod > 0 ? statementData.openingBalanceForPeriod.toLocaleString() : '-'}
                      </td>
                      <td className="p-3 text-center font-mono font-black text-emerald-600">
                        {statementData.openingBalanceForPeriod < 0 ? Math.abs(statementData.openingBalanceForPeriod).toLocaleString() : '-'}
                      </td>
                      <td className="p-3 text-center font-mono font-black text-slate-900">
                        {statementData.openingBalanceForPeriod.toLocaleString()} {settings.currency}
                      </td>
                    </tr>
                  )}

                  {/* Movements Rows */}
                  {statementData.timeline.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-center font-mono text-slate-400">{index + 1}</td>
                      <td className="p-3 text-center font-mono text-slate-600">{item.date}</td>
                      <td className="p-3 text-center font-mono font-bold text-slate-700">
                        {item.type === 'reading' ? (
                          <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200 text-[10px]">
                            {item.invoiceNumber}
                          </span>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                            {item.receiptNumber}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-800 font-bold">
                        <div>{item.desc}</div>
                        {item.details?.paymentMethod && (
                          <span className="text-[10px] text-slate-500 font-normal">
                            طريقة الدفع: {item.details.paymentMethod === 'cash' ? 'نقداً' : item.details.paymentMethod === 'e-wallet' ? 'محفظة إلكترونية' : 'حوالة بنكية'}
                          </span>
                        )}
                      </td>

                      {showTechnicalDetails && (
                        <>
                          <td className="p-3 text-center font-mono text-slate-600 text-[10px]">
                            {item.details?.currReading !== undefined ? `${item.details.prevReading || 0} ← ${item.details.currReading}` : '-'}
                          </td>
                          <td className="p-3 text-center font-mono font-black text-amber-700">
                            {item.details?.consumption !== undefined ? `${item.details.consumption}` : '-'}
                          </td>
                        </>
                      )}

                      <td className="p-3 text-center font-mono font-black text-rose-600">
                        {item.debit > 0 ? `${item.debit.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-3 text-center font-mono font-black text-emerald-600">
                        {item.credit > 0 ? `${item.credit.toLocaleString()}` : '-'}
                      </td>
                      <td className="p-3 text-center font-mono font-black text-slate-900 bg-slate-50/50">
                        {item.runningBalance.toLocaleString()} {settings.currency}
                      </td>
                    </tr>
                  ))}

                  {statementData.timeline.length === 0 && statementData.openingBalanceForPeriod === 0 && (
                    <tr>
                      <td colSpan={showTechnicalDetails ? 9 : 7} className="p-10 text-center text-slate-400 font-bold">
                        <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        لا توجد حركات مسجلة لهذا المشترك خلال الفترة المحددة
                      </td>
                    </tr>
                  )}
                </tbody>

                <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-black text-slate-900 text-xs">
                  <tr>
                    <td colSpan={showTechnicalDetails ? 6 : 4} className="p-3 text-left">
                      إجمالي مبالغ الفترة المحددة:
                    </td>
                    <td className="p-3 text-center font-mono text-rose-600 font-black">
                      {statementData.totalPeriodDebit.toLocaleString()} {settings.currency}
                    </td>
                    <td className="p-3 text-center font-mono text-emerald-600 font-black">
                      {statementData.totalPeriodCredit.toLocaleString()} {settings.currency}
                    </td>
                    <td className="p-3 text-center font-mono font-black text-slate-900 bg-slate-200">
                      {statementData.closingBalanceForPeriod.toLocaleString()} {settings.currency}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 6. MINI RECENT TREND CHART */}
          {monthlyChartData.length > 1 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
              <h4 className="font-bold text-xs text-slate-700 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>الرسم البياني لتطور الاستهلاك وقيمة الفواتير الشهرية للمشترك (آخر الدورات):</span>
              </h4>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" orientation="right" stroke="#f59e0b" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="left" stroke="#f43f5e" tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar yAxisId="left" dataKey="consumption" name="الاستهلاك (ك.و.س)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="amount" name="قيمة الفاتورة" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="py-20 text-center bg-slate-50 rounded-2xl border-2 border-slate-200 border-dashed">
          <FileText className="w-14 h-14 text-slate-300 mx-auto mb-3" />
          <h4 className="font-black text-base text-slate-700 mb-1">الرجاء اختيار المشترك لعرض كشف حسابه</h4>
          <p className="text-xs text-slate-500 font-bold max-w-md mx-auto">
            اختر أحد المشتركين من القائمة المنسدلة بالأعلى لاستعراض كامل الحركات المالية والفوترة والطباعة الفورية
          </p>
        </div>
      )}

      {/* 7. MODAL: PRINT PREVIEW A4 OFFICIAL STATEMENT */}
      <AnimatePresence>
        {printMode === 'a4' && selectedSub && (
          <div className="fixed inset-0 z-[999999] bg-slate-950/80 backdrop-blur-md overflow-y-auto flex flex-col items-center justify-start p-4 md:py-8 print:bg-white print:m-0 print:p-0">
            {/* Top Preview Control Bar */}
            <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 text-white p-4 rounded-2xl flex justify-between items-center mb-6 shadow-2xl print:hidden animate-fade-in">
              <button
                onClick={() => setPrintMode('none')}
                className="text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                إغلاق المعاينة
              </button>

              <div className="text-center">
                <p className="text-xs font-black text-amber-400">معاينة كشف الحساب الرسمي A4</p>
                <p className="text-[11px] text-slate-400 font-mono">{selectedSub.name} - عداد: {selectedSub.meterNumber}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={downloadStatementAsImage}
                  disabled={isExportingImage}
                  className="bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExportingImage ? 'جاري التصدير...' : 'تنزيل كصورة'}</span>
                </button>
                <button
                  onClick={() => safePrint()}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-lg active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة فورية (A4)</span>
                </button>
              </div>
            </div>

            {/* Printable A4 Component */}
            <div className="w-full flex justify-center print:p-0 print:m-0">
              <PrintableA4Statement
                subscriber={selectedSub}
                settings={settings}
                timeline={statementData.timeline}
                fromDate={fromDate}
                toDate={toDate}
                openingBalanceForPeriod={statementData.openingBalanceForPeriod}
                closingBalanceForPeriod={statementData.closingBalanceForPeriod}
                totalPeriodDebit={statementData.totalPeriodDebit}
                totalPeriodCredit={statementData.totalPeriodCredit}
                totalPeriodConsumptionKwh={statementData.totalPeriodConsumptionKwh}
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. MODAL: PRINT PREVIEW THERMAL 80MM */}
      <AnimatePresence>
        {printMode === 'thermal' && selectedSub && (
          <div className="fixed inset-0 z-[999999] bg-slate-950/80 backdrop-blur-md overflow-y-auto flex flex-col items-center justify-start p-4 md:py-8 print:bg-white print:m-0 print:p-0">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 text-white p-4 rounded-2xl flex justify-between items-center mb-6 shadow-2xl print:hidden">
              <button
                onClick={() => setPrintMode('none')}
                className="text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
              >
                إغلاق
              </button>
              <span className="text-xs font-black text-amber-400">معاينة إيصال حراري (80mm)</span>
              <button
                onClick={() => safePrint()}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة</span>
              </button>
            </div>

            <div className="w-full flex justify-center print:p-0 print:m-0">
              <PrintableThermalStatement
                subscriber={selectedSub}
                settings={settings}
                timeline={statementData.timeline}
                fromDate={fromDate}
                toDate={toDate}
                openingBalanceForPeriod={statementData.openingBalanceForPeriod}
                closingBalanceForPeriod={statementData.closingBalanceForPeriod}
                totalPeriodDebit={statementData.totalPeriodDebit}
                totalPeriodCredit={statementData.totalPeriodCredit}
                totalPeriodConsumptionKwh={statementData.totalPeriodConsumptionKwh}
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 9. MODAL: WHATSAPP / SMS STATEMENT SHARE */}
      <AnimatePresence>
        {showShareModal && selectedSub && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden text-right"
            >
              <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-amber-400" />
                  <h4 className="font-black text-sm text-white">مشاركة ملخص كشف الحساب مع المشترك</h4>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-slate-400 hover:text-white text-xs font-bold"
                >
                  إلغاء
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs font-bold">
                <div>
                  <label className="block text-slate-700 mb-1">نص الرسالة المهيأ تلقائياً:</label>
                  <textarea
                    readOnly
                    rows={8}
                    value={buildShareText()}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-800 font-mono text-xs focus:outline-none"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                  <button
                    onClick={handleCopyShare}
                    className="w-full sm:flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    {copiedShareText ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                    <span>{copiedShareText ? 'تم نسخ النص بنجاح!' : 'نسخ نص الرسالة'}</span>
                  </button>

                  <button
                    onClick={handleOpenWhatsApp}
                    disabled={!selectedSub.phone}
                    className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>إرسال واتساب مباشر</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
