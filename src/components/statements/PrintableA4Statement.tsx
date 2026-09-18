import React from 'react';
import { Subscriber, SystemSettings } from '../../types';
import { tafqeetArabic } from '../../utils/numberToWords';
import { Zap, CheckCircle2, AlertCircle, Phone, MapPin, Gauge } from 'lucide-react';

export interface StatementTimelineItem {
  id: string;
  date: string;
  type: 'reading' | 'payment' | 'opening' | 'adjustment';
  invoiceNumber?: string;
  receiptNumber?: string;
  desc: string;
  debit: number; // Invoiced / Due
  credit: number; // Paid / Received
  runningBalance: number;
  details?: {
    prevReading?: number;
    currReading?: number;
    consumption?: number;
    ratePerKwh?: number;
    fixedFee?: number;
    taxAmount?: number;
    receivedBy?: string;
    paymentMethod?: string;
  };
}

interface PrintableA4StatementProps {
  subscriber: Subscriber;
  settings: SystemSettings;
  timeline: StatementTimelineItem[];
  fromDate?: string;
  toDate?: string;
  openingBalanceForPeriod: number;
  closingBalanceForPeriod: number;
  totalPeriodDebit: number;
  totalPeriodCredit: number;
  totalPeriodConsumptionKwh: number;
  onClose?: () => void;
}

export const PrintableA4Statement: React.FC<PrintableA4StatementProps> = ({
  subscriber,
  settings,
  timeline,
  fromDate,
  toDate,
  openingBalanceForPeriod,
  closingBalanceForPeriod,
  totalPeriodDebit,
  totalPeriodCredit,
  totalPeriodConsumptionKwh
}) => {
  const currentDate = new Date().toLocaleDateString('ar-YE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const printTimestamp = new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const tafqeetText = tafqeetArabic(closingBalanceForPeriod, settings.currency || 'ريال');

  return (
    <div 
      className="statement-print-container w-[210mm] max-w-full min-h-0 print:min-h-0 bg-white text-slate-950 p-6 md:p-8 print:p-4 shadow-[0_20px_50px_rgba(0,0,0,0.4)] relative text-right" 
      dir="rtl"
      style={{ fontFamily: '"Cairo", "Inter", sans-serif' }}
    >
      {/* 1. OFFICIAL HEADER */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 print:pb-2 mb-4 print:mb-2">
        <div className="flex items-center gap-4">
          {settings.logoUrl ? (
            <div className="w-20 h-20 print:w-22 print:h-22 p-1.5 bg-white border-2 border-slate-900 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
              <img src={settings.logoUrl} alt="Station Logo" className="w-full h-full object-contain bg-white" />
            </div>
          ) : (
            <div className="w-16 h-16 print:w-18 print:h-18 p-2 bg-slate-950 text-amber-400 rounded-2xl flex items-center justify-center shrink-0 print:bg-slate-950 print:text-amber-400">
              <Zap className="w-8 h-8" />
            </div>
          )}
          <div>
            <h1 className="text-xl print:text-2xl font-black text-slate-900">{settings.stationName || 'محطة الطاقة الكهربائية'}</h1>
            {settings.logoText && <p className="text-xs text-slate-600 font-bold mt-0.5">{settings.logoText}</p>}
            <div className="text-xs text-slate-500 space-y-0.5 mt-1 font-medium">
              {settings.phone && (
                <p>
                  الهاتف والمبيعات:{' '}
                  <span dir="ltr" className="inline-block font-mono font-bold text-slate-800 text-left">
                    {settings.phone}
                  </span>
                </p>
              )}
              {settings.address && <p>العنوان: {settings.address}</p>}
            </div>
          </div>
        </div>

        <div className="text-left border-r border-slate-200 pr-4">
          <div className="inline-block bg-slate-900 text-amber-400 px-3 py-1 rounded-lg text-xs font-black mb-1 print:border print:border-slate-900">
            كشف حساب مالي تفصيلي
          </div>
          <p className="text-xs text-slate-700 font-bold">مرجع الكشف: <span className="font-mono text-slate-900 font-black">ST-{subscriber.id.slice(-6)}</span></p>
          <p className="text-[11px] text-slate-500 font-mono mt-0.5">تاريخ الطباعة: {printTimestamp}</p>
          {(fromDate || toDate) && (
            <p className="text-[11px] text-slate-600 font-bold mt-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              الفترة: {fromDate || 'البداية'} إلى {toDate || 'الآن'}
            </p>
          )}
        </div>
      </div>

      {/* 2. SUBSCRIBER & METER SPECIFICATION CARDS */}
      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 print:p-2.5 rounded-xl border border-slate-200 text-xs mb-4 print:mb-2">
        <div className="space-y-1.5 border-l border-slate-200 pl-3">
          <p className="flex justify-between items-center">
            <span className="text-slate-500 font-bold">اسم المشترك:</span>
            <span className="font-black text-slate-900 text-sm">{subscriber.name}</span>
          </p>
          <p className="flex justify-between items-center">
            <span className="text-slate-500 font-bold">رقم الحساب / المشترك:</span>
            <span className="font-mono font-black text-slate-900">{subscriber.subscriberCode || subscriber.id}</span>
          </p>
          <p className="flex justify-between items-center">
            <span className="text-slate-500 font-bold">رقم الهاتف المسجل:</span>
            <span className="font-mono font-bold text-slate-900" dir="ltr">{subscriber.phone || 'غير مسجل'}</span>
          </p>
        </div>

        <div className="space-y-1.5 pr-1">
          <p className="flex justify-between items-center">
            <span className="text-slate-500 font-bold">رقم العداد:</span>
            <span className="font-mono font-black text-slate-900 text-sm">{subscriber.meterNumber}</span>
          </p>
          <p className="flex justify-between items-center">
            <span className="text-slate-500 font-bold">المنطقة / المربع:</span>
            <span className="font-bold text-slate-800">{subscriber.zone || 'الرئيسية'}</span>
          </p>
          <p className="flex justify-between items-center">
            <span className="text-slate-500 font-bold">نوع التعرفة والحالة:</span>
            <span className="font-bold text-slate-900 flex items-center gap-1">
              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded text-[10px] font-black">
                {subscriber.tariffType === 'residential' ? 'سكني' : subscriber.tariffType === 'commercial' ? 'تجاري' : subscriber.tariffType === 'industrial' ? 'صناعي' : 'عام'}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${subscriber.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                {subscriber.status === 'active' ? 'نشط' : 'موقف'}
              </span>
            </span>
          </p>
        </div>
      </div>

      {/* 3. PERIOD BALANCE SUMMARY BANNER */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs mb-3 print:mb-2">
        <div className="bg-slate-100 p-2 rounded-lg border border-slate-200">
          <span className="text-[10px] text-slate-500 font-bold block">رصيد ما قبل الفترة</span>
          <span className="font-mono font-black text-slate-800 block mt-0.5">
            {openingBalanceForPeriod.toLocaleString()} {settings.currency}
          </span>
        </div>
        <div className="bg-rose-50 p-2 rounded-lg border border-rose-200">
          <span className="text-[10px] text-rose-600 font-bold block">إجمالي الفواتير والرسوم (+)</span>
          <span className="font-mono font-black text-rose-700 block mt-0.5">
            {totalPeriodDebit.toLocaleString()} {settings.currency}
          </span>
        </div>
        <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200">
          <span className="text-[10px] text-emerald-600 font-bold block">إجمالي المسدد والمقبوض (-)</span>
          <span className="font-mono font-black text-emerald-700 block mt-0.5">
            {totalPeriodCredit.toLocaleString()} {settings.currency}
          </span>
        </div>
        <div className={`p-2 rounded-lg border font-black ${closingBalanceForPeriod > 0 ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-emerald-50 border-emerald-300 text-emerald-900'}`}>
          <span className="text-[10px] font-bold block">الرصيد النهائي المستحق</span>
          <span className="font-mono text-sm block mt-0.5">
            {closingBalanceForPeriod.toLocaleString()} {settings.currency}
          </span>
        </div>
      </div>

      {/* 4. STATEMENT LEDGER TABLE */}
      <table className="w-full text-xs text-right border-collapse mb-3 print:mb-2 border border-slate-300">
        <thead>
          <tr className="bg-slate-900 text-white font-black text-[11px] print:bg-slate-200 print:text-slate-900">
            <th className="p-2 border border-slate-300 text-center w-10">م</th>
            <th className="p-2 border border-slate-300 text-center w-24">التاريخ</th>
            <th className="p-2 border border-slate-300 text-right">بيان وتفاصيل العملية</th>
            <th className="p-2 border border-slate-300 text-center w-24">مدين (مستحق)</th>
            <th className="p-2 border border-slate-300 text-center w-24">دائن (مسدد)</th>
            <th className="p-2 border border-slate-300 text-center w-28">الرصيد التراكمي</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 text-[11px]">
          {/* Opening balance row */}
          {openingBalanceForPeriod !== 0 && (
            <tr className="bg-amber-50/60 font-bold">
              <td className="p-1.5 border border-slate-300 text-center text-slate-500 font-mono">-</td>
              <td className="p-1.5 border border-slate-300 text-center text-slate-500 font-mono">{fromDate || 'رصيد سابق'}</td>
              <td className="p-1.5 border border-slate-300 text-slate-800 font-black">
                رصيد مرحل سابق / رصيد بداية الفترة
              </td>
              <td className="p-1.5 border border-slate-300 text-center font-mono text-rose-600">
                {openingBalanceForPeriod > 0 ? openingBalanceForPeriod.toLocaleString() : '-'}
              </td>
              <td className="p-1.5 border border-slate-300 text-center font-mono text-emerald-600">
                {openingBalanceForPeriod < 0 ? Math.abs(openingBalanceForPeriod).toLocaleString() : '-'}
              </td>
              <td className="p-1.5 border border-slate-300 text-center font-mono font-black text-slate-900">
                {openingBalanceForPeriod.toLocaleString()}
              </td>
            </tr>
          )}

          {timeline.map((item, idx) => (
            <tr key={item.id} className="hover:bg-slate-50">
              <td className="p-1.5 border border-slate-300 text-center font-mono text-slate-500">{idx + 1}</td>
              <td className="p-1.5 border border-slate-300 text-center font-mono text-slate-700 text-[10px]">{item.date}</td>
              <td className="p-1.5 border border-slate-300 font-medium text-slate-800">
                <div className="font-bold text-slate-900">{item.desc}</div>
                {item.details && item.details.consumption !== undefined && (
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    القراءة: [{item.details.prevReading || 0} ← {item.details.currReading}] | الاستهلاك: {item.details.consumption} ك.و.س @ {item.details.ratePerKwh} ريال
                    {item.details.fixedFee ? ` + اشتراك: ${item.details.fixedFee}` : ''}
                  </div>
                )}
              </td>
              <td className="p-1.5 border border-slate-300 font-mono text-rose-600 font-bold text-center">
                {item.debit > 0 ? item.debit.toLocaleString() : '-'}
              </td>
              <td className="p-1.5 border border-slate-300 font-mono text-emerald-600 font-bold text-center">
                {item.credit > 0 ? item.credit.toLocaleString() : '-'}
              </td>
              <td className="p-1.5 border border-slate-300 font-mono text-slate-900 font-black text-center">
                {item.runningBalance.toLocaleString()}
              </td>
            </tr>
          ))}

          {timeline.length === 0 && openingBalanceForPeriod === 0 && (
            <tr>
              <td colSpan={6} className="p-6 text-center text-slate-400 font-bold">لا توجد حركات مسجلة لهذا المشترك خلال الفترة المحددة</td>
            </tr>
          )}
        </tbody>

        <tfoot className="bg-slate-100 border-t-2 border-slate-900 font-black text-slate-900 text-xs">
          <tr>
            <td colSpan={3} className="p-2 border border-slate-300 text-left">الإجمالي التراكمي للحركات:</td>
            <td className="p-2 border border-slate-300 font-mono text-rose-600 text-center">
              {totalPeriodDebit.toLocaleString()}
            </td>
            <td className="p-2 border border-slate-300 font-mono text-emerald-600 text-center">
              {totalPeriodCredit.toLocaleString()}
            </td>
            <td className="p-2 border border-slate-300 font-mono text-center font-black text-slate-900">
              {closingBalanceForPeriod.toLocaleString()} {settings.currency}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* 5. TAFQEET & FINAL STANDING BOX */}
      <div className="bg-slate-50 border-2 border-slate-900 p-3 rounded-xl mb-4 print:mb-2 text-xs">
        <div className="flex flex-col md:flex-row justify-between items-center gap-2">
          <div>
            <span className="font-bold text-slate-600">المبلغ المستحق كتابةً (تفقيط): </span>
            <span className="font-black text-slate-900">{tafqeetText}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-bold">صافي الطاقة المستهلكة:</span>
            <span className="font-mono font-black text-amber-700">{totalPeriodConsumptionKwh.toLocaleString()} ك.و.س</span>
          </div>
        </div>
      </div>

      {/* 6. SIGNATURES & OFFICIAL STAMP */}
      <div className="grid grid-cols-3 gap-4 text-center text-xs mt-3 print:mt-2 pt-2 border-t border-slate-200">
        <div>
          <p className="font-bold text-slate-600">إعداد المحاسب المالي</p>
          <div className="h-9 print:h-7" />
          <p className="font-bold text-slate-800">..............................</p>
        </div>
        <div>
          <p className="font-bold text-slate-600">اعتماد إدارة المحطة والختم</p>
          <div className="h-9 print:h-7" />
          <p className="font-bold text-slate-800">..............................</p>
        </div>
        <div>
          <p className="font-bold text-slate-600">توقيع واستلام المشترك</p>
          <div className="h-9 print:h-7" />
          <p className="font-bold text-slate-800">..............................</p>
        </div>
      </div>

      {/* 7. SYSTEM FOOTER */}
      <div className="mt-3 print:mt-2 pt-2 border-t border-dashed border-slate-300 text-[9px] text-slate-400 text-center font-medium flex justify-between items-center">
        <span>تم إصدار هذا الكشف آلياً بواسطة نظام فولترا المتكامل لإدارة محطات الطاقة (Voltera ERP)</span>
        <span className="font-mono">صفحة 1 من 1</span>
      </div>
    </div>
  );
};
