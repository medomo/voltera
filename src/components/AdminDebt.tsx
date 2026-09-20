import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { Subscriber, SystemSettings, MeterReading, Payment, User } from '../types';
import { isItemForSubscriber } from '../utils/balanceUtils';
import { Banknote, Search, AlertCircle, Phone, Printer, Zap, Scissors, Calendar, User as UserIcon, CreditCard, Download, ExternalLink, FileSpreadsheet, FileText, Building2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { exportToCSV, printData, safePrint } from '../utils/exportUtils';
import { DueBalancesReportModal } from './DueBalancesReportModal';

interface AdminDebtProps {
  subscribers: Subscriber[];
  readings: MeterReading[];
  payments: Payment[];
  settings: SystemSettings;
  currentUser?: User;
}

export const AdminDebt: React.FC<AdminDebtProps> = ({ subscribers, readings, payments, settings, currentUser }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [printingSub, setPrintingSub] = useState<Subscriber | null>(null);
  const [printFormat, setPrintFormat] = useState<'A4' | 'thermal'>('A4');
  const [showDueBalancesModal, setShowDueBalancesModal] = useState(false);

  // Filter and sort debtors by balance descending
  const debtors = useMemo(() => {
    return subscribers
      .filter(s => s.currentBalance > 0)
      .filter(s => s.name.includes(searchQuery) || s.phone.includes(searchQuery) || s.meterNumber.includes(searchQuery))
      .sort((a, b) => b.currentBalance - a.currentBalance);
  }, [subscribers, searchQuery]);

  const totalDebt = debtors.reduce((sum, s) => sum + s.currentBalance, 0);

  // Full subscriber transaction ledger (readings as debit, payments as credit)
  const subscriberOperations = useMemo(() => {
    if (!printingSub) return [];

    const subReadings = readings
      .filter(r => !r.isRejected && isItemForSubscriber(r, printingSub))
      .map(r => ({
        id: r.id,
        date: r.readingDate,
        type: 'فاتورة استهلاك كهرباء',
        debit: r.totalAmount,
        credit: 0,
        details: `شهر ${r.billingMonth} | (${r.previousReading} ⬅️ ${r.currentReading} = ${r.consumption} ك.و)`
      }));

    const subPayments = payments
      .filter(p => !p.isRejected && isItemForSubscriber(p, printingSub))
      .map(p => ({
        id: p.id,
        date: p.paymentDate,
        type: 'سند قبض / سداد',
        debit: 0,
        credit: p.amountPaid,
        details: `سند رقم: ${p.receiptNumber} (${p.paymentMethod === 'cash' ? 'نقداً' : p.paymentMethod === 'e-wallet' ? 'محفظة' : 'تحويل'})`
      }));

    const merged = [...subReadings, ...subPayments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = Number(printingSub.openingBalance) || 0;
    return merged.map(op => {
      runningBalance += (op.debit - op.credit);
      return {
        ...op,
        runningBalance
      };
    });
  }, [printingSub, readings, payments]);

  const totalBilled = subscriberOperations.reduce((sum, op) => sum + op.debit, 0);
  const totalPaid = subscriberOperations.reduce((sum, op) => sum + op.credit, 0);

  // Recent 5 operations for thermal receipt
  const recentOperations = useMemo(() => {
    return [...subscriberOperations].reverse().slice(0, 5).map(op => ({
      id: op.id,
      date: op.date,
      type: op.type,
      amount: op.debit > 0 ? op.debit : op.credit,
      isPositive: op.credit > 0,
      details: op.details
    }));
  }, [subscriberOperations]);

  const [downloadingImage, setDownloadingImage] = useState(false);
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  const downloadReceiptAsImage = () => {
    setDownloadingImage(true);
    const printElement = document.querySelector('.print-container');
    if (!printElement) {
      setDownloadingImage(false);
      return;
    }
    
    html2canvas(printElement as HTMLElement, {
      backgroundColor: '#FAF9F5',
      scale: 2,
      useCORS: true,
      logging: false,
    }).then(canvas => {
      const link = document.createElement('a');
      link.download = `voltera_debt_receipt_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setDownloadingImage(false);
    }).catch(err => {
      console.error("Failed to generate receipt image", err);
      setDownloadingImage(false);
    });
  };

  const printInPopupWindow = () => {
    if (!printingSub) return;
    const isA4 = printFormat === 'A4';
    const printWindow = window.open('', '_blank', isA4 ? 'width=950,height=1000' : 'width=450,height=750');
    if (!printWindow) {
      alert("يرجى السماح بالنوافذ المنبثقة من إعدادات المتصفح لفتح نافذة الطباعة.");
      return;
    }

    const printElement = document.querySelector('.print-container');
    const contentHtml = printElement ? printElement.outerHTML : '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <title>${isA4 ? 'كشف حساب مشترك تفصيلي' : 'سند مطالبة حراري'} - ${printingSub.name}</title>
          <meta charset="utf-8">
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
            body { 
              font-family: 'Cairo', sans-serif; 
              background-color: #ffffff;
              display: flex;
              justify-content: center;
              padding: ${isA4 ? '20px' : '10px'};
              margin: 0;
            }
            .print-hidden { display: none !important; }
            @media print {
              body { padding: 0; background-color: #ffffff; }
              @page { size: ${isA4 ? 'A4 portrait' : '80mm auto'}; margin: ${isA4 ? '10mm' : '0'}; }
            }
          </style>
        </head>
        <body>
          <div style="width: 100%; display: flex; justify-content: center;">
            ${contentHtml}
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
              }, 600);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintFullDebtReport = () => {
    const reportData = debtors.map((s, index) => ({
      index: index + 1,
      name: s.name,
      balance: `${s.currentBalance.toLocaleString()} ${settings.currency}`,
      phone: s.phone,
      meterNumber: s.meterNumber,
      zone: s.zone ? String(s.zone).replace('المنطقة ', '') : '-',
      status: s.currentBalance > 100000 ? 'متعثر حرج' : 'مدين'
    }));

    const columns = [
      { key: 'index', label: '#' },
      { key: 'name', label: 'اسم المشترك' },
      { key: 'balance', label: 'المبلغ المستحق' },
      { key: 'phone', label: 'رقم الهاتف' },
      { key: 'meterNumber', label: 'رقم العداد' },
      { key: 'zone', label: 'المنطقة' },
      { key: 'status', label: 'حالة الدين' }
    ];

    printData(`كشف الديون والمتأخرات - ${settings.stationName}`, reportData, columns);
  };

  const handleExportDebtCSV = () => {
    const csvData = debtors.map((s, index) => ({
      index: index + 1,
      name: s.name,
      balance: s.currentBalance,
      phone: s.phone,
      meterNumber: s.meterNumber,
      zone: s.zone || ''
    }));

    const columns = [
      { key: 'index', label: '#' },
      { key: 'name', label: 'اسم المشترك' },
      { key: 'balance', label: 'المبلغ المستحق' },
      { key: 'phone', label: 'رقم الهاتف' },
      { key: 'meterNumber', label: 'رقم العداد' },
      { key: 'zone', label: 'المنطقة' }
    ];

    exportToCSV(csvData, `كشف_الديون_${new Date().toISOString().split('T')[0]}`, columns);
  };

  useEffect(() => {
    if (printingSub) {
      const timer = setTimeout(() => {
        try {
          window.print();
        } catch (e) {
          console.error("Print failed:", e);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [printingSub]);

  return (
    <>
      <motion.div
        key="debt-sec"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="space-y-6 text-right"
      >
        {/* Main Debtors Dashboard Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 border-b border-slate-800 pb-4">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="bg-slate-950 px-5 py-3 rounded-xl border border-rose-500/20 flex items-center gap-3 shadow-inner">
                <span className="text-2xl font-mono font-black text-rose-400">{totalDebt.toLocaleString()}</span>
                <span className="text-xs text-rose-500 font-black uppercase tracking-wider">{settings.currency}</span>
                <span className="text-sm text-slate-400 mx-2">إجمالي الديون المعلقة</span>
              </div>
              
              {/* Quick Action Print & Export Buttons for the full Debt Report */}
              <button
                onClick={() => setShowDueBalancesModal(true)}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-4 py-3 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-lg shadow-amber-500/20"
                title="كشف المبالغ المستحقة والمحصلة وتخصيص وتصدير الأعمدة"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>كشف المستحقات والمحصل المطور 📑</span>
              </button>

              <button
                onClick={handlePrintFullDebtReport}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 hover:text-amber-300 font-bold px-4 py-3 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-md"
                title="طباعة كشف شامل بجميع المتأخرين"
              >
                <Printer className="w-4 h-4 text-amber-500" />
                <span>طباعة كشف الديون الشامل</span>
              </button>

              <button
                onClick={handleExportDebtCSV}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 hover:text-emerald-300 font-bold px-4 py-3 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-md"
                title="تصدير بيانات الديون إلى ملف CSV/Excel"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                <span>تصدير Excel</span>
              </button>
            </div>

            <h2 className="text-lg font-bold text-slate-100 flex items-center justify-start gap-2">
              <span>إدارة الديون والمتأخرات والمطالبات</span>
              <Banknote className="w-5 h-5 text-amber-500" />
            </h2>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-slate-500" />
            </div>
            <input
              type="text"
              placeholder="بحث في قائمة المدينين بالاسم، الهاتف، أو العداد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pr-10 pl-4 text-slate-200 text-sm text-right focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-slate-600"
            />
          </div>

          <div className="bg-slate-950/40 rounded-xl border border-slate-800 overflow-hidden shadow-2xl backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs border-collapse">
                <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-300 font-bold uppercase tracking-wide">
                  <tr>
                    <th className="py-4 px-5 text-right font-bold">اسم المشترك</th>
                    <th className="py-4 px-5 text-right font-bold">المبلغ المستحق</th>
                    <th className="py-4 px-5 text-right font-bold">رقم الهاتف</th>
                    <th className="py-4 px-5 text-right font-bold">رقم العداد</th>
                    <th className="py-4 px-5 text-center font-bold w-32">إجراءات التحصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {debtors.length > 0 ? (
                    debtors.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-900/60 transition-colors border-r-2 border-r-transparent hover:border-r-amber-500">
                        <td className="py-3 px-5 font-bold text-slate-200">
                          <div className="flex items-center justify-start gap-2">
                            <span>{s.name}</span>
                            {s.currentBalance > 100000 && (
                              <span className="bg-rose-500/10 text-rose-500 text-[9px] font-black px-1.5 py-0.5 rounded border border-rose-500/20 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                متعثر حرج
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-5">
                          <span className="bg-rose-500/10 text-rose-400 py-1 px-2.5 rounded-lg font-bold font-mono text-xs border border-rose-500/20">
                            {s.currentBalance.toLocaleString()} {settings.currency}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-slate-400 font-mono text-xs" dir="ltr">{s.phone}</td>
                        <td className="py-3 px-5 text-slate-400 font-mono text-xs">{s.meterNumber}</td>
                        <td className="py-3 px-5">
                          <div className="flex items-center justify-center gap-2">
                            <a 
                              href={`tel:${s.phone}`} 
                              className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-sky-400 hover:text-white rounded-lg transition-all flex items-center gap-1 cursor-pointer text-[10px] font-bold"
                              title="اتصال بالمشترك"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span className="hidden xl:inline">اتصال</span>
                            </a>
                            <button 
                              onClick={() => {
                                setPrintFormat('A4');
                                setPrintingSub(s);
                              }}
                              className="p-1.5 bg-gradient-to-br from-amber-500/15 to-amber-600/10 hover:from-amber-500 hover:to-amber-600 border border-amber-500/20 hover:border-amber-500 text-amber-400 hover:text-slate-950 rounded-lg transition-all flex items-center gap-1 cursor-pointer text-[10px] font-bold shadow-md active:scale-95" 
                              title="طباعة كشف حساب تفصيلي A4"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>كشف حساب A4</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-slate-500 font-medium">
                        لا يوجد مدينين مطابقين لمعايير البحث الحالية أو لا توجد ديون مستحقة في النظام.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Print Overlay Container */}
      <AnimatePresence>
        {printingSub && (
          <div className="fixed inset-0 z-[999999] bg-slate-950/85 backdrop-blur-md overflow-y-auto flex flex-col items-center justify-start p-3 sm:p-6 md:py-10 print:bg-white print:m-0 print:p-0">
            {/* Top Command Bar (Hidden during printing) */}
            <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 text-white p-4 rounded-2xl flex flex-col md:flex-row justify-between items-center mb-6 shadow-2xl print:hidden animate-fade-in gap-4">
              <button 
                onClick={() => setPrintingSub(null)} 
                className="text-slate-300 hover:text-rose-400 bg-slate-950 hover:bg-rose-500/10 border border-slate-800 hover:border-rose-500/30 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer w-full md:w-auto"
              >
                تراجع وإغلاق
              </button>

              {/* Format Switcher Tabs */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setPrintFormat('A4')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    printFormat === 'A4'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>كشف حساب A4</span>
                </button>
                <button
                  onClick={() => setPrintFormat('thermal')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    printFormat === 'thermal'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>مطالبة حرارية (80mm)</span>
                </button>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button 
                  onClick={printInPopupWindow}
                  className="bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                  title="فتح المستند في نافذة جديدة مستقلة للطباعة"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>نافذة جديدة</span>
                </button>

                <button 
                  onClick={() => safePrint()} 
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.3)] active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة مباشر</span>
                </button>
              </div>
            </div>



            {/* Print Container Wrapper */}
            <div className="print:p-0 print:m-0 print:shadow-none print:border-none w-full flex justify-center">
              {printFormat === 'A4' ? (
                /* --- A4 OFFICIAL ACCOUNT STATEMENT PRINT TEMPLATE --- */
                <div 
                  className="print-container w-full max-w-[210mm] min-h-0 print:min-h-0 bg-white text-slate-900 p-6 md:p-8 print:p-4 shadow-2xl rounded-2xl border border-slate-200 text-right select-text relative"
                  dir="rtl"
                  style={{ fontFamily: '"Cairo", "Inter", sans-serif' }}
                >
                  {/* Header Section */}
                  <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 print:pb-2 mb-4 print:mb-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        {settings.logoUrl ? (
                          <div className="w-20 h-20 print:w-22 print:h-22 p-1.5 bg-white border-2 border-slate-900 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                            <img src={settings.logoUrl} alt="Station Logo" className="w-full h-full object-contain bg-white" />
                          </div>
                        ) : (
                          <div className="p-2 bg-slate-950 text-amber-400 rounded-2xl shrink-0 print:bg-slate-950 print:text-amber-400">
                            <Zap className="w-7 h-7" />
                          </div>
                        )}
                        <div>
                          <h1 className="text-xl font-black text-slate-950 tracking-tight">{settings.stationName}</h1>
                          {settings.logoText && <p className="text-xs font-bold text-slate-600">{settings.logoText}</p>}
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-500 space-y-0.5 pt-1">
                        {settings.address && <p>العنوان: {settings.address}</p>}
                        {settings.phone && (
                          <p>
                            الهاتف:{' '}
                            <span dir="ltr" className="inline-block font-mono font-bold text-slate-800 text-left">
                              {settings.phone}
                            </span>
                            {settings.phone2 && (
                              <>
                                {' - '}
                                <span dir="ltr" className="inline-block font-mono font-bold text-slate-800 text-left">
                                  {settings.phone2}
                                </span>
                              </>
                            )}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-left space-y-1">
                      <div className="inline-block bg-slate-950 text-amber-400 text-xs font-black px-3 py-1 rounded-md mb-1 print:bg-transparent print:text-black print:border print:border-slate-800">
                        كشف حساب رسمي
                      </div>
                      <p className="text-xs font-mono text-slate-600">رقم الكشف: <span className="font-bold text-slate-900">STM-{printingSub.id.substring(0, 6).toUpperCase()}</span></p>
                      <p className="text-xs font-mono text-slate-600">التاريخ: <span className="font-bold text-slate-900">{new Date().toLocaleDateString('ar-YE')}</span></p>
                      <p className="text-xs font-mono text-slate-600">العملة: <span className="font-bold text-slate-900">{settings.currency}</span></p>
                    </div>
                  </div>

                  {/* Document Title Banner */}
                  <div className="bg-slate-100 border border-slate-300 rounded-xl p-2.5 text-center mb-4 print:mb-2">
                    <h2 className="text-sm print:text-base font-black text-slate-950 tracking-wide">كشف حساب مشترك تفصيلي (سجل الحركة المالية والكهربائية)</h2>
                  </div>

                  {/* Subscriber Details Card */}
                  <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3 mb-4 print:mb-2 grid grid-cols-2 md:grid-cols-3 gap-y-2 gap-x-4 text-xs">
                    <div>
                      <span className="text-slate-500 font-bold block mb-0.5">اسم المشترك:</span>
                      <span className="font-black text-slate-950 text-xs print:text-sm">{printingSub.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block mb-0.5">رقم العداد:</span>
                      <span className="font-mono font-bold text-slate-900 text-xs print:text-sm">{printingSub.meterNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block mb-0.5">رقم الاشتراك / الحساب:</span>
                      <span className="font-mono font-bold text-slate-900">{printingSub.id.substring(0, 8)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block mb-0.5">رقم الهاتف:</span>
                      <span className="font-mono font-bold text-slate-900" dir="ltr">{printingSub.phone}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block mb-0.5">المنطقة السكنية:</span>
                      <span className="font-bold text-slate-900">{printingSub.zone || 'المنطقة الرئيسية'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block mb-0.5">حالة الحساب المالية:</span>
                      <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 inline-block">
                        مدين / متأخرات
                      </span>
                    </div>
                  </div>

                  {/* Financial Summary KPI Cards Bar */}
                  <div className="grid grid-cols-3 gap-3 mb-4 print:mb-2">
                    <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center">
                      <span className="text-[10px] font-bold text-slate-500 block mb-0.5">إجمالي الفواتير والخدمات (مدين)</span>
                      <span className="font-mono font-black text-sm print:text-base text-slate-900">
                        {totalBilled.toLocaleString()} <span className="text-xs font-sans">{settings.currency}</span>
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center">
                      <span className="text-[10px] font-bold text-slate-500 block mb-0.5">إجمالي المقبوضات والسدادات (دائن)</span>
                      <span className="font-mono font-black text-sm print:text-base text-emerald-700">
                        {totalPaid.toLocaleString()} <span className="text-xs font-sans">{settings.currency}</span>
                      </span>
                    </div>

                    <div className="bg-rose-50 border border-rose-300 p-2.5 rounded-xl text-center">
                      <span className="text-[10px] font-black text-rose-700 block mb-0.5">صافي الرصيد المستحق الدفع</span>
                      <span className="font-mono font-black text-base print:text-lg text-rose-700">
                        {printingSub.currentBalance.toLocaleString()} <span className="text-xs font-sans">{settings.currency}</span>
                      </span>
                    </div>
                  </div>

                  {/* Transactions Table Header Title */}
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-500" />
                      <span>تفاصيل سجل العمليات وتاريخ الحساب:</span>
                    </h3>
                    <span className="text-[10px] text-slate-500 font-bold">عدد العمليات: {subscriberOperations.length}</span>
                  </div>

                  {/* Transactions Table */}
                  <div className="overflow-hidden border border-slate-300 rounded-xl mb-4 print:mb-2">
                    <table className="w-full text-right text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-white font-bold text-[10px]">
                          <th className="py-2 px-2.5 text-right">#</th>
                          <th className="py-2 px-2.5 text-right">التاريخ</th>
                          <th className="py-2 px-2.5 text-right">نوع الحركة</th>
                          <th className="py-2 px-2.5 text-right">البيان والتفاصيل</th>
                          <th className="py-2 px-2.5 text-left">مدين (فاتورة)</th>
                          <th className="py-2 px-2.5 text-left">دائن (سداد)</th>
                          <th className="py-2 px-2.5 text-left">الرصيد المتبقي</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-[10px]">
                        {subscriberOperations.length > 0 ? (
                          subscriberOperations.map((op, idx) => (
                            <tr key={op.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                              <td className="py-1.5 px-2.5 font-mono font-bold text-slate-500">{idx + 1}</td>
                              <td className="py-1.5 px-2.5 font-mono font-bold text-slate-700 whitespace-nowrap">{op.date}</td>
                              <td className="py-1.5 px-2.5 font-bold text-slate-900">{op.type}</td>
                              <td className="py-1.5 px-2.5 text-slate-600 font-medium text-[10px]">{op.details}</td>
                              <td className="py-1.5 px-2.5 text-left font-mono font-black text-slate-900">
                                {op.debit > 0 ? op.debit.toLocaleString() : '-'}
                              </td>
                              <td className="py-1.5 px-2.5 text-left font-mono font-black text-emerald-700">
                                {op.credit > 0 ? op.credit.toLocaleString() : '-'}
                              </td>
                              <td className="py-1.5 px-2.5 text-left font-mono font-black text-slate-950 bg-slate-100/80">
                                {op.runningBalance.toLocaleString()} {settings.currency}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="py-6 text-center text-slate-500 font-medium">
                              لا يوجد سجل عمليات مسجلة لهذا المشترك حتى الآن.
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 border-t-2 border-slate-400 font-black text-xs text-slate-950">
                          <td colSpan={4} className="py-2 px-2.5 text-right">المجموع التراكمي الشامل:</td>
                          <td className="py-2 px-2.5 text-left font-mono">{totalBilled.toLocaleString()}</td>
                          <td className="py-2 px-2.5 text-left font-mono text-emerald-700">{totalPaid.toLocaleString()}</td>
                          <td className="py-2 px-2.5 text-left font-mono text-rose-700 bg-rose-50 border-r border-rose-200">
                            {printingSub.currentBalance.toLocaleString()} {settings.currency}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Signatures & Accreditation Footer Box */}
                  <div className="mt-4 print:mt-2 pt-3 border-t-2 border-dashed border-slate-300 grid grid-cols-3 gap-4 text-center text-xs">
                    <div className="space-y-4 print:space-y-2">
                      <p className="font-bold text-slate-800">توقيع المحاسب / المسؤول</p>
                      <div className="border-b border-dotted border-slate-400 w-28 mx-auto mt-6" />
                    </div>

                    <div className="space-y-2">
                      <p className="font-bold text-slate-800">ختم ومصادقة إدارة المحطة</p>
                      <div className="w-14 h-14 rounded-full border-2 border-dashed border-slate-300 mx-auto flex items-center justify-center text-[9px] text-slate-400 font-bold">
                        ختم الإدارة
                      </div>
                    </div>

                    <div className="space-y-4 print:space-y-2">
                      <p className="font-bold text-slate-800">توقيع واستلام المشترك</p>
                      <div className="border-b border-dotted border-slate-400 w-28 mx-auto mt-6" />
                    </div>
                  </div>

                  {/* Footer note */}
                  <div className="mt-4 print:mt-2 pt-2 border-t border-slate-200 flex justify-between items-center text-[9px] text-slate-500 font-mono">
                    <p>كشف حساب معتمد آلياً وصادر من نظام فولترا السحابي - Voltera Cloud ERP</p>
                    <p>تاريخ و وقت الطباعة: {new Date().toLocaleString('ar-YE')}</p>
                  </div>
                </div>
              ) : (
                /* --- 80mm THERMAL RECEIPT PRINT TEMPLATE --- */
                <div 
                  className="print-container w-[80mm] min-h-0 print:min-h-0 print:h-auto bg-[#FAF9F5] text-slate-950 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-t-[8px] border-t-amber-500 border-b-[8px] border-b-dashed border-b-slate-300 relative select-text" 
                  dir="rtl"
                  style={{ fontFamily: '"Cairo", "Inter", sans-serif' }}
                >
                  <div className="flex items-center justify-between text-slate-400 text-[10px] my-1 border-b border-dashed border-slate-300 pb-1 font-mono print:hidden select-none">
                    <Scissors className="w-3.5 h-3.5 rotate-180 text-slate-400" />
                    <span>خط قص الورق الحراري (80mm)</span>
                    <Scissors className="w-3.5 h-3.5 text-slate-400" />
                  </div>

                  <div className="text-center mb-4 space-y-1">
                    <div className="flex justify-center mb-1.5">
                      {settings.logoUrl ? (
                        <div className="w-20 h-20 print:w-22 print:h-22 p-1.5 bg-white border-2 border-slate-900 rounded-2xl flex items-center justify-center overflow-hidden mx-auto shadow-sm">
                          <img src={settings.logoUrl} alt="Station Logo" className="w-full h-full object-contain bg-white" />
                        </div>
                      ) : (
                        <div className="p-2 bg-slate-950 text-white rounded-full print:bg-transparent print:text-black">
                          <Zap className="w-7 h-7" />
                        </div>
                      )}
                    </div>
                    <h1 className="text-lg font-black tracking-tight">{settings.stationName}</h1>
                    {settings.logoText && <p className="text-[10px] text-slate-600 font-bold">{settings.logoText}</p>}
                    <div className="text-[9px] text-slate-500 space-y-0.5 pt-1">
                      {settings.phone && (
                        <p>
                          الهاتف:{' '}
                          <span dir="ltr" className="inline-block font-mono font-bold text-slate-800 text-left">
                            {settings.phone}
                          </span>
                          {settings.phone2 && (
                            <>
                              {' - '}
                              <span dir="ltr" className="inline-block font-mono font-bold text-slate-800 text-left">
                                {settings.phone2}
                              </span>
                            </>
                          )}
                        </p>
                      )}
                      {settings.address && <p>العنوان: {settings.address}</p>}
                    </div>
                  </div>

                  <div className="border-t border-dashed border-slate-400 my-3" />

                  <div className="text-center py-1.5 bg-slate-900 text-white rounded-md my-2 print:bg-transparent print:text-black print:border print:border-slate-400">
                    <h2 className="text-xs font-black uppercase tracking-wider">سند مطالبة مالي - متأخرات</h2>
                  </div>

                  <div className="border-t border-dashed border-slate-400 my-3" />

                  <div className="space-y-1.5 text-[11px] mb-4">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">اسم المشترك:</span>
                      <span className="font-extrabold text-slate-900">{printingSub.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">رقم المشترك:</span>
                      <span className="font-mono font-bold">{printingSub.id.substring(0, 8)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">رقم العداد:</span>
                      <span className="font-mono font-bold">{printingSub.meterNumber}</span>
                    </div>
                    {printingSub.phone && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold">رقم الهاتف:</span>
                        <span className="font-mono font-bold text-slate-900 inline-block text-left" dir="ltr">{printingSub.phone}</span>
                      </div>
                    )}
                    {printingSub.zone && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold">المنطقة:</span>
                        <span className="font-bold">{(printingSub.zone || '').replace('المنطقة ', '')}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">تاريخ المطالبة:</span>
                      <span className="font-mono">{new Date().toLocaleDateString('en-GB')}</span>
                    </div>
                  </div>

                  <div className="border-t border-dashed border-slate-400 my-3" />

                  <div className="bg-white border-2 border-slate-900 p-3 rounded-lg text-center my-4">
                    <span className="block text-[10px] font-black text-slate-600 mb-1">الرصيد المستحق الدفع فوراً</span>
                    <span className="block font-mono font-black text-2xl text-slate-950">
                      {printingSub.currentBalance.toLocaleString()} 
                      <span className="text-xs font-sans font-bold mr-1">{settings.currency}</span>
                    </span>
                  </div>

                  <div className="border-t border-dashed border-slate-400 my-3" />

                  <div className="mb-3">
                    <h3 className="text-[10px] font-black text-slate-800 mb-1.5 flex items-center gap-1">
                      <span>كشف حساب مصغر (آخر 5 عمليات)</span>
                    </h3>
                    
                    {recentOperations.length > 0 ? (
                      <div className="overflow-hidden border border-slate-300 rounded-md bg-white">
                        <table className="w-full text-right text-[9px] border-collapse">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-black">
                              <th className="py-1 px-2 text-right">التاريخ</th>
                              <th className="py-1 px-2 text-right">البيان</th>
                              <th className="py-1 px-2 text-left">المبلغ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {recentOperations.map((op) => (
                              <tr key={op.id} className="text-slate-800">
                                <td className="py-1 px-2 font-mono whitespace-nowrap">{op.date}</td>
                                <td className="py-1 px-2">
                                  <span className="block">{op.type}</span>
                                  <span className="block text-[8px] text-slate-500 font-mono">{op.details}</span>
                                </td>
                                <td className="py-1 px-2 text-left font-mono font-bold">
                                  <span className={op.isPositive ? 'text-emerald-700' : 'text-slate-900'}>
                                    {op.isPositive ? '+' : ''}{op.amount.toLocaleString()}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-[9px] text-slate-500 italic text-center py-2 bg-white border border-slate-200 rounded">
                        لا يوجد عمليات مسجلة مؤخراً لهذا المشترك.
                      </p>
                    )}
                  </div>

                  <div className="border-t border-dashed border-slate-400 my-3" />

                  <div className="text-center text-[10px] text-slate-800 space-y-1.5 px-1 py-1 bg-white border border-slate-200 rounded-lg">
                    <p className="font-bold">عزيزي المشترك، نرجو منكم سرعة المبادرة بتسديد المبالغ المستحقة لضمان استمرار الخدمة الكهربائية.</p>
                    <p className="font-black text-rose-600 bg-rose-50 py-1 rounded">⚠️ في حالة عدم السداد خلال 3 أيام سيتم فصل التيار رسمياً.</p>
                  </div>

                  <div className="mt-6 text-center space-y-2">
                    <div className="font-mono text-xs tracking-[4px] text-slate-950 font-bold py-1 select-none">
                      ||||| | |||| ||| || ||| || |||
                    </div>
                    <p className="text-[8px] font-mono text-slate-400">سند مطالبة مالي آلي - معتمد نظامياً</p>
                    <p className="text-[8px] font-mono text-slate-500">تاريخ الطباعة: {new Date().toLocaleString('ar-YE')}</p>
                    <p className="text-[9px] font-bold text-slate-900">نظام فولترا السحابي - Voltera Cloud ERP</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic Native Print CSS Overrides */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
          }

          #root, div[role="dialog"], div[role="dialog"] > div {
            display: block !important;
            visibility: visible !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            position: static !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            border: none !important;
            box-shadow: none !important;
          }

          /* Hide non-print elements */
          body * { 
            visibility: hidden !important; 
          }

          .print-hidden, .print\\:hidden, header, nav, footer, sidebar, button, [role="dialog"] > div:first-child {
            display: none !important;
          }
          
          /* Show only the printable container and children */
          .print-container, .print-container * { 
            visibility: visible !important; 
          }

          .print-container { 
            position: relative !important; 
            left: 0 !important; 
            top: 0 !important; 
            right: 0 !important;
            width: ${printFormat === 'A4' ? '100%' : '80mm'} !important; 
            max-width: ${printFormat === 'A4' ? '100%' : '80mm'} !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            padding: ${printFormat === 'A4' ? '2mm 4mm' : '2mm'} !important; 
            margin: 0 auto !important; 
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            zoom: ${printFormat === 'A4' ? '88%' : '100%'} !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-before: avoid !important;
            break-before: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          @page {
            size: ${printFormat === 'A4' ? 'A4 portrait' : '80mm auto'};
            margin: ${printFormat === 'A4' ? '5mm 8mm' : '0'};
          }
        }
      `}} />
      {/* Due & Overdue Balances & Collections Report Modal */}
      <DueBalancesReportModal
        isOpen={showDueBalancesModal}
        onClose={() => setShowDueBalancesModal(false)}
        subscribers={subscribers}
        readings={readings}
        payments={payments}
        settings={settings}
        currentUser={currentUser || { id: 'admin', username: 'admin', name: 'المدير العام', role: 'admin', permissions: [] } as any}
      />
    </>
  );
};

export default AdminDebt;

