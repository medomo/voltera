import React, { useState, useMemo } from 'react';
import { Subscriber, MeterReading, Payment, SystemSettings } from '../../types';
import { isItemForSubscriber } from '../../utils/balanceUtils';
import { safePrint } from '../../utils/exportUtils';
import { PrintableA4Statement, StatementTimelineItem } from './PrintableA4Statement';
import { PrintableThermalStatement } from './PrintableThermalStatement';
import { 
  Printer, CheckSquare, Square, Filter, Users, Layers, 
  Sparkles, Check, AlertCircle, FileText, Download, Calendar
} from 'lucide-react';

interface BatchStatementsHubProps {
  subscribers: Subscriber[];
  readings: MeterReading[];
  payments: Payment[];
  settings: SystemSettings;
}

export const BatchStatementsHub: React.FC<BatchStatementsHubProps> = ({
  subscribers = [],
  readings = [],
  payments = [],
  settings
}) => {
  // Batch Selection State
  const [selectedSubIds, setSelectedSubIds] = useState<string[]>([]);
  const [zoneFilter, setZoneFilter] = useState('all');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'debtors' | 'active'>('debtors');
  const [searchQuery, setSearchQuery] = useState('');

  // Date Range for Batch Statements
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Print Mode & Layout
  const [batchPrintMode, setBatchPrintMode] = useState<'none' | 'a4_full' | 'thermal'>('none');

  // Filtered subscribers eligible for selection
  const filteredSubscribers = useMemo(() => {
    return subscribers.filter(s => {
      if (zoneFilter !== 'all' && s.zone !== zoneFilter) return false;
      if (balanceFilter === 'debtors' && s.currentBalance <= 0.01) return false;
      if (balanceFilter === 'active' && s.status !== 'active') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match = 
          s.name.toLowerCase().includes(q) ||
          s.meterNumber.toLowerCase().includes(q) ||
          (s.subscriberCode && s.subscriberCode.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [subscribers, zoneFilter, balanceFilter, searchQuery]);

  // Selection handlers
  const handleSelectAll = () => {
    setSelectedSubIds(filteredSubscribers.map(s => s.id));
  };

  const handleDeselectAll = () => {
    setSelectedSubIds([]);
  };

  const toggleSub = (id: string) => {
    setSelectedSubIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Helper to compile statement data for a single subscriber
  const getSubStatementData = (sub: Subscriber) => {
    const subReadings = readings
      .filter(r => !r.isRejected && isItemForSubscriber(r, sub))
      .sort((a, b) => (a.readingDate || a.billingMonth).localeCompare(b.readingDate || b.billingMonth));
    
    const subPayments = payments
      .filter(p => !p.isRejected && isItemForSubscriber(p, sub))
      .sort((a, b) => a.paymentDate.localeCompare(b.paymentDate));

    const initialOpening = Number(sub.openingBalance) || 0;
    
    const allMoves: StatementTimelineItem[] = [];

    subReadings.forEach(r => {
      allMoves.push({
        id: 'r_' + r.id,
        date: r.readingDate || (r.billingMonth ? `${r.billingMonth}-01` : '2026-01-01'),
        type: 'reading',
        invoiceNumber: r.invoiceNumber || `INV-${r.id.slice(-5)}`,
        desc: `فاتورة شهر (${r.billingMonth}) [كمية: ${r.consumption} ك.و.س]`,
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

    subPayments.forEach(p => {
      allMoves.push({
        id: 'p_' + p.id,
        date: p.paymentDate || '2026-01-01',
        type: 'payment',
        receiptNumber: p.receiptNumber || `REC-${p.id.slice(-5)}`,
        desc: `سند قبض نقدي (${p.receiptNumber || 'إيصال'})`,
        debit: 0,
        credit: p.amountPaid,
        runningBalance: 0,
        details: {
          receivedBy: p.receivedBy,
          paymentMethod: p.paymentMethod
        }
      });
    });

    allMoves.sort((a, b) => a.date.localeCompare(b.date));

    let openingForPeriod = initialOpening;
    const periodMoves: StatementTimelineItem[] = [];

    allMoves.forEach(item => {
      const isBeforePeriod = fromDate && item.date < fromDate;
      const isAfterPeriod = toDate && item.date > toDate;

      if (isBeforePeriod) {
        openingForPeriod += item.debit - item.credit;
      } else if (!isAfterPeriod) {
        periodMoves.push(item);
      }
    });

    let localRunning = openingForPeriod;
    const timelineWithLocalRunning = periodMoves.map(item => {
      localRunning += item.debit - item.credit;
      return {
        ...item,
        runningBalance: localRunning
      };
    });

    const totalPeriodDebit = periodMoves.reduce((s, i) => s + i.debit, 0);
    const totalPeriodCredit = periodMoves.reduce((s, i) => s + i.credit, 0);
    const totalPeriodConsumptionKwh = periodMoves.reduce((s, i) => s + (i.details?.consumption || 0), 0);
    const closingBalanceForPeriod = fromDate || toDate ? localRunning : sub.currentBalance;

    return {
      timeline: timelineWithLocalRunning,
      openingBalanceForPeriod: openingForPeriod,
      closingBalanceForPeriod,
      totalPeriodDebit,
      totalPeriodCredit,
      totalPeriodConsumptionKwh
    };
  };

  // Selected Subscribers Object List
  const selectedSubscribersList = useMemo(() => {
    return subscribers.filter(s => selectedSubIds.includes(s.id));
  }, [subscribers, selectedSubIds]);

  return (
    <div className="space-y-6 text-right">
      {/* 1. HEADER BANNER */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-500" />
            <span>مركز الطباعة والتوليد المجمع لكشوف الحسابات (Batch Statements Hub)</span>
          </h3>
          <p className="text-xs text-slate-500 font-bold mt-0.5">
            توليد وطباعة كشوفات الحساب لمجموعة من المشتركين أو لمنطقة بالكامل في دفعة واحدة جاهزة للطباعة
          </p>
        </div>

        {/* Selected Count & Print Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl text-xs font-black text-amber-900">
            تم تحديد: <span className="font-mono text-sm">{selectedSubIds.length}</span> مشترك
          </div>

          <button
            onClick={() => setBatchPrintMode('a4_full')}
            disabled={selectedSubIds.length === 0}
            className="bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-amber-400 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة مجمعة A4 ({selectedSubIds.length})</span>
          </button>

          <button
            onClick={() => setBatchPrintMode('thermal')}
            disabled={selectedSubIds.length === 0}
            className="bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-300"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>طباعة حرارية (80mm)</span>
          </button>
        </div>
      </div>

      {/* 2. FILTER & SELECTION BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3 text-xs font-bold">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Zone Filter */}
          <div>
            <label className="block text-slate-600 mb-1">المنطقة / المربع:</label>
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-800 focus:outline-none"
            >
              <option value="all">كافة المناطق</option>
              {(settings.zones || []).map((z, i) => (
                <option key={i} value={z}>{z}</option>
              ))}
            </select>
          </div>

          {/* Balance Filter */}
          <div>
            <label className="block text-slate-600 mb-1">حالة الحساب:</label>
            <select
              value={balanceFilter}
              onChange={(e: any) => setBalanceFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-800 focus:outline-none"
            >
              <option value="debtors">المشتركون المدينون فقط (عليهم مبالغ)</option>
              <option value="all">كافة المشتركين (مدين/دائن/مصفى)</option>
              <option value="active">المشتركون النشطون فقط</option>
            </select>
          </div>

          {/* Date from */}
          <div>
            <label className="block text-slate-600 mb-1">تاريخ بداية الكشف:</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono text-slate-800 focus:outline-none"
            />
          </div>

          {/* Date to */}
          <div>
            <label className="block text-slate-600 mb-1">تاريخ نهاية الكشف:</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono text-slate-800 focus:outline-none"
            />
          </div>
        </div>

        {/* Quick Selection Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
              <span>تحديد الكل ({filteredSubscribers.length})</span>
            </button>
            <button
              onClick={handleDeselectAll}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Square className="w-3.5 h-3.5" />
              <span>إلغاء التحديد</span>
            </button>
          </div>

          <div className="flex-1 max-w-xs">
            <input
              type="text"
              placeholder="تصفية بالاسم، العداد، الكود..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs font-bold text-slate-800 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 3. SUBSCRIBERS CHECKLIST TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 text-xs">
          <span className="font-bold">قائمة المشتركين المرشحين للطباعة</span>
          <span className="text-amber-300 font-mono font-bold">
            المحدد: {selectedSubIds.length} من أصل {filteredSubscribers.length}
          </span>
        </div>

        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-100 text-slate-800 font-black border-b border-slate-200 sticky top-0 text-[11px]">
              <tr>
                <th className="p-3 text-center w-12">
                  <input
                    type="checkbox"
                    checked={filteredSubscribers.length > 0 && selectedSubIds.length === filteredSubscribers.length}
                    onChange={(e) => e.target.checked ? handleSelectAll() : handleDeselectAll()}
                    className="w-4 h-4 rounded text-amber-500 cursor-pointer"
                  />
                </th>
                <th className="p-3 text-right">المشترك</th>
                <th className="p-3 text-center w-28">رقم العداد</th>
                <th className="p-3 text-center w-28">المنطقة</th>
                <th className="p-3 text-center w-28">الهاتف</th>
                <th className="p-3 text-center w-32 text-rose-600">الرصيد المستحق</th>
                <th className="p-3 text-center w-24">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold text-slate-800 text-[11px]">
              {filteredSubscribers.map((sub) => {
                const isSelected = selectedSubIds.includes(sub.id);
                return (
                  <tr 
                    key={sub.id} 
                    onClick={() => toggleSub(sub.id)}
                    className={`hover:bg-amber-50/50 transition-colors cursor-pointer ${
                      isSelected ? 'bg-amber-50/70' : ''
                    }`}
                  >
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSub(sub.id)}
                        className="w-4 h-4 rounded text-amber-500 cursor-pointer"
                      />
                    </td>
                    <td className="p-3 font-black text-slate-900">{sub.name}</td>
                    <td className="p-3 text-center font-mono font-bold text-slate-700">{sub.meterNumber}</td>
                    <td className="p-3 text-center text-slate-600">{sub.zone || 'الرئيسية'}</td>
                    <td className="p-3 text-center font-mono text-slate-600" dir="ltr">{sub.phone || '-'}</td>
                    <td className="p-3 text-center font-mono font-black text-rose-600">
                      {sub.currentBalance.toLocaleString()} {settings.currency}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        sub.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {sub.status === 'active' ? 'نشط' : 'موقف'}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filteredSubscribers.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                    لا يوجد مشتركون مطابقون لخيارات الفلترة المحددة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MODAL: BATCH A4 STATEMENTS PRINT PREVIEW */}
      {batchPrintMode === 'a4_full' && (
        <div className="fixed inset-0 z-[999999] bg-slate-950/85 backdrop-blur-md overflow-y-auto flex flex-col items-center justify-start p-4 md:py-8 print:bg-white print:m-0 print:p-0">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 text-white p-4 rounded-2xl flex justify-between items-center mb-6 shadow-2xl print:hidden">
            <button
              onClick={() => setBatchPrintMode('none')}
              className="text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
            >
              إغلاق المعاينة
            </button>

            <div className="text-center">
              <p className="text-xs font-black text-amber-400">معاينة الطباعة المجمعة للكشوفات (A4 Batch)</p>
              <p className="text-[11px] text-slate-400 font-mono">عدد الكشوفات الجاهزة: {selectedSubscribersList.length} كشف</p>
            </div>

            <button
              onClick={() => safePrint()}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الكل دفعة واحدة</span>
            </button>
          </div>

          {/* Sequence of Printable A4s with page-break */}
          <div className="w-full flex flex-col items-center gap-8 print:gap-0 print:m-0 print:p-0">
            {selectedSubscribersList.map((sub, idx) => {
              const data = getSubStatementData(sub);
              return (
                <div key={sub.id} className="print:break-after-page print:m-0">
                  <PrintableA4Statement
                    subscriber={sub}
                    settings={settings}
                    timeline={data.timeline}
                    fromDate={fromDate}
                    toDate={toDate}
                    openingBalanceForPeriod={data.openingBalanceForPeriod}
                    closingBalanceForPeriod={data.closingBalanceForPeriod}
                    totalPeriodDebit={data.totalPeriodDebit}
                    totalPeriodCredit={data.totalPeriodCredit}
                    totalPeriodConsumptionKwh={data.totalPeriodConsumptionKwh}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. MODAL: BATCH THERMAL RECEIPTS PRINT PREVIEW */}
      {batchPrintMode === 'thermal' && (
        <div className="fixed inset-0 z-[999999] bg-slate-950/85 backdrop-blur-md overflow-y-auto flex flex-col items-center justify-start p-4 md:py-8 print:bg-white print:m-0 print:p-0">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 text-white p-4 rounded-2xl flex justify-between items-center mb-6 shadow-2xl print:hidden">
            <button
              onClick={() => setBatchPrintMode('none')}
              className="text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
            >
              إغلاق
            </button>
            <span className="text-xs font-black text-amber-400">معاينة الكشوفات الحرارية ({selectedSubscribersList.length})</span>
            <button
              onClick={() => safePrint()}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-1.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة</span>
            </button>
          </div>

          <div className="w-full flex flex-col items-center gap-6 print:gap-2 print:m-0 print:p-0">
            {selectedSubscribersList.map((sub) => {
              const data = getSubStatementData(sub);
              return (
                <div key={sub.id} className="print:break-after-page print:m-0">
                  <PrintableThermalStatement
                    subscriber={sub}
                    settings={settings}
                    timeline={data.timeline}
                    fromDate={fromDate}
                    toDate={toDate}
                    openingBalanceForPeriod={data.openingBalanceForPeriod}
                    closingBalanceForPeriod={data.closingBalanceForPeriod}
                    totalPeriodDebit={data.totalPeriodDebit}
                    totalPeriodCredit={data.totalPeriodCredit}
                    totalPeriodConsumptionKwh={data.totalPeriodConsumptionKwh}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
