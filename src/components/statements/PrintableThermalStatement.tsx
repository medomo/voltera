import React from 'react';
import { Subscriber, SystemSettings } from '../../types';
import { StatementTimelineItem } from './PrintableA4Statement';
import { Zap, Printer } from 'lucide-react';
import { tafqeetArabic } from '../../utils/numberToWords';

interface PrintableThermalStatementProps {
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
}

export const PrintableThermalStatement: React.FC<PrintableThermalStatementProps> = ({
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
  const tafqeetText = tafqeetArabic(closingBalanceForPeriod, settings.currency || 'ريال');
  const printTimestamp = new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div 
      className="thermal-statement-container bg-white text-black p-4 w-[80mm] max-w-[80mm] mx-auto text-right text-[11px] font-mono leading-tight"
      dir="rtl"
      style={{ fontFamily: '"Courier New", Courier, monospace' }}
    >
      {/* Header */}
      <div className="text-center pb-2 border-b border-dashed border-black">
        <h2 className="text-sm font-bold">{settings.stationName || 'محطة الكهرباء'}</h2>
        {settings.logoText && <p className="text-[10px]">{settings.logoText}</p>}
        {settings.phone && <p className="text-[10px]" dir="ltr">هاتف: {settings.phone}</p>}
        <div className="my-1 py-0.5 border-y border-black font-bold text-xs">
          *** كشف حساب مشترك (80mm) ***
        </div>
        <p className="text-[10px]">{printTimestamp}</p>
      </div>

      {/* Subscriber Info */}
      <div className="py-2 border-b border-dashed border-black space-y-0.5 text-[10px]">
        <div>المشترك: <span className="font-bold">{subscriber.name}</span></div>
        <div>رقم الحساب: <span>{subscriber.subscriberCode || subscriber.id}</span></div>
        <div>رقم العداد: <span className="font-bold">{subscriber.meterNumber}</span></div>
        <div>المنطقة: <span>{subscriber.zone || 'الرئيسية'}</span></div>
        {subscriber.phone && <div>الهاتف: <span dir="ltr">{subscriber.phone}</span></div>}
        {(fromDate || toDate) && (
          <div className="font-bold">الفترة: {fromDate || 'البداية'} ← {toDate || 'الآن'}</div>
        )}
      </div>

      {/* Opening balance */}
      <div className="py-1.5 border-b border-black flex justify-between font-bold text-[10px]">
        <span>رصيد سابق / افتتاحي:</span>
        <span>{openingBalanceForPeriod.toLocaleString()} {settings.currency}</span>
      </div>

      {/* Transactions List */}
      <div className="py-1 border-b border-dashed border-black">
        <div className="font-bold text-[10px] pb-1 border-b border-dotted border-gray-400 flex justify-between">
          <span>العملية / التاريخ</span>
          <span>المبلغ (مدين/دائن)</span>
        </div>
        <div className="space-y-1.5 pt-1">
          {timeline.map((item, idx) => (
            <div key={item.id} className="text-[10px] border-b border-dotted border-gray-200 pb-1">
              <div className="flex justify-between font-bold">
                <span>{item.date} - {item.type === 'reading' ? 'فاتورة' : item.type === 'payment' ? 'سند قبض' : 'حركة'}</span>
                <span>
                  {item.debit > 0 ? `+${item.debit.toLocaleString()}` : `-${item.credit.toLocaleString()}`}
                </span>
              </div>
              <div className="text-[9px] text-gray-700">{item.desc}</div>
              <div className="text-[9px] text-left text-gray-800">
                الرصيد: {item.runningBalance.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Totals */}
      <div className="py-2 border-b border-double border-black space-y-1 text-[11px] font-bold">
        <div className="flex justify-between">
          <span>إجمالي الفواتير (+):</span>
          <span>{totalPeriodDebit.toLocaleString()} {settings.currency}</span>
        </div>
        <div className="flex justify-between">
          <span>إجمالي المسدد (-):</span>
          <span>{totalPeriodCredit.toLocaleString()} {settings.currency}</span>
        </div>
        <div className="flex justify-between">
          <span>إجمالي الاستهلاك:</span>
          <span>{totalPeriodConsumptionKwh.toLocaleString()} ك.و.س</span>
        </div>
        <div className="flex justify-between text-xs pt-1 border-t border-black">
          <span>الرصيد القائم المستحق:</span>
          <span className="font-black text-sm">{closingBalanceForPeriod.toLocaleString()} {settings.currency}</span>
        </div>
      </div>

      {/* Tafqeet */}
      <div className="py-1 text-[9px] text-center italic border-b border-dashed border-black">
        المبلغ: {tafqeetText}
      </div>

      {/* Footer & Signature */}
      <div className="pt-2 text-center text-[9px] space-y-2">
        <div className="flex justify-between pt-2">
          <span>توقيع المحاسب/المحصل: ........</span>
          <span>توقيع المشترك: ........</span>
        </div>
        <p className="pt-1">شكراً لتعاملكم معنا - نرجو سرعة السداد</p>
        <p className="text-[8px] text-gray-600">Voltera Power ERP System</p>
      </div>
    </div>
  );
};
