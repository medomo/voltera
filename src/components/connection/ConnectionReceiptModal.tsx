import React, { useState } from 'react';
import { Printer, X, CheckCircle2, Phone, MapPin, Zap, User, Calendar, ShieldCheck, DollarSign, FileText } from 'lucide-react';
import { ServiceConnection, SystemSettings } from '../../types';
import { tafqeetArabic } from '../../utils/numberToWords';
import { SERVICE_TYPE_LABELS } from './connectionTemplates';

interface Props {
  connection: ServiceConnection | null;
  settings: SystemSettings;
  onClose: () => void;
}

export const ConnectionReceiptModal: React.FC<Props> = ({ connection, settings, onClose }) => {
  const [printFormat, setPrintFormat] = useState<'a4' | 'thermal'>('a4');

  if (!connection) return null;

  const rem = connection.remainingAmount !== undefined
    ? connection.remainingAmount
    : Math.max(0, connection.totalFee - connection.paidAmount);

  const isFullyPaid = rem === 0 && connection.paidAmount > 0;
  const sInfo = SERVICE_TYPE_LABELS[connection.serviceType || 'new_connection'] || { label: connection.serviceType || 'توصيل خدمة', badge: 'bg-slate-800 text-slate-300' };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto">
        {/* Modal Toolbar */}
        <div className="bg-slate-950 p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">معاينة وطباعة سند إدخال الخدمة</h3>
              <p className="text-[11px] text-slate-400 font-mono">
                رقم السند: {connection.voucherNo || `CON-${connection.id.slice(-4)}`} | {connection.subscriberName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Format toggle */}
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setPrintFormat('a4')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  printFormat === 'a4'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>سند رسمي (A4)</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('thermal')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  printFormat === 'thermal'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>إيصال حراري (80mm)</span>
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة فورية</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Content Area */}
        <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto bg-slate-950/40 flex justify-center">
          {printFormat === 'a4' ? (
            /* ================= A4 OFFICIAL VOUCHER ================= */
            <div className="bg-white text-slate-900 p-8 rounded-2xl w-full max-w-3xl shadow-xl font-sans print:shadow-none print:p-4 print:w-full border border-slate-200">
              {/* Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5 mb-5">
                <div className="flex items-center gap-4">
                  {settings.logoUrl ? (
                    <img
                      src={settings.logoUrl}
                      alt={settings.stationName || 'شعار المحطة'}
                      className="w-16 h-16 object-contain rounded-lg border border-slate-200 p-1"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-amber-500 text-slate-950 font-black text-2xl flex items-center justify-center rounded-xl">
                      ⚡
                    </div>
                  )}
                  <div>
                    <h1 className="text-xl font-black text-slate-950 tracking-tight">
                      {settings.stationName || 'محطة توليد وتوزيع الطاقة الكهربائية'}
                    </h1>
                    {settings.stationNameEn && (
                      <p className="text-xs text-slate-500 font-mono tracking-wider">
                        {settings.stationNameEn}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-bold mt-1">
                      {settings.phone && <span>هاتف: {settings.phone}</span>}
                      {settings.commercialRegister && <span>س.ت: {settings.commercialRegister}</span>}
                      {settings.taxNumber && <span>ر.ض: {settings.taxNumber}</span>}
                    </div>
                  </div>
                </div>

                <div className="text-left">
                  <div className="inline-block bg-slate-900 text-amber-400 font-mono font-black text-sm px-3 py-1.5 rounded-lg mb-1 shadow-sm">
                    {connection.voucherNo || `CON-${connection.id.slice(-4)}`}
                  </div>
                  <div className="text-xs text-slate-600 font-bold">
                    التاريخ: <span className="font-mono text-slate-900">{connection.date}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    النوع: <span className="font-bold text-slate-900">{sInfo.label}</span>
                  </div>
                </div>
              </div>

              {/* Title Banner */}
              <div className="text-center py-2 bg-slate-100 rounded-xl mb-5 border border-slate-200">
                <h2 className="text-base font-black text-slate-900 tracking-wide">
                  سند قبض وإدخال خدمة كهربائية (Connection Revenue & Work Order)
                </h2>
              </div>

              {/* Subscriber & Service Metadata Box */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs mb-5">
                <div>
                  <span className="text-slate-500 block font-bold text-[11px]">اسم المشترك / المستفيد:</span>
                  <span className="font-black text-slate-900 text-sm">{connection.subscriberName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-bold text-[11px]">رقم الهاتف / الجوال:</span>
                  <span className="font-mono font-bold text-slate-900">{connection.phone || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-bold text-[11px]">رقم العداد المركب:</span>
                  <span className="font-mono font-black text-amber-600 text-sm">{connection.meterNumber || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-bold text-[11px]">المربع / الحي السكني:</span>
                  <span className="font-bold text-slate-900">{connection.zone || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-bold text-[11px]">نوع التعرفة:</span>
                  <span className="font-bold text-slate-900">
                    {connection.tariffType === 'residential' ? 'منزلي' : connection.tariffType === 'commercial' ? 'تجاري' : connection.tariffType === 'industrial' ? 'صناعي' : 'زراعي'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block font-bold text-[11px]">الفني المسؤول:</span>
                  <span className="font-bold text-slate-900">{connection.assignedTechnician || 'الإدارة الفنية'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-bold text-[11px]">طريقة الدفع:</span>
                  <span className="font-bold text-slate-900">
                    {connection.paymentMethod === 'bank_transfer' ? 'تحويل بنكي' : 'نقداً (كاش)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block font-bold text-[11px]">حالة السند:</span>
                  <span className={`font-black ${isFullyPaid ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {isFullyPaid ? 'مسدد بالكامل' : 'يوجد متبقي ذمة'}
                  </span>
                </div>
              </div>

              {/* Financial Breakdown Table */}
              <div className="mb-5">
                <h3 className="text-xs font-black text-slate-900 mb-2 border-b border-slate-200 pb-1 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-amber-600" />
                  بيان وتفصيل الرسوم المالية المستحقة
                </h3>
                <table className="w-full text-xs text-right border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">البند والبيان</th>
                      <th className="p-2.5 text-center">المبلغ المستحق ({settings.currency})</th>
                      <th className="p-2.5 text-center">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {Number(connection.connectionFee || 0) > 0 && (
                      <tr>
                        <td className="p-2.5 font-bold">رسوم التوصيل والاشتراك في الشبكة</td>
                        <td className="p-2.5 text-center font-mono font-bold">{(connection.connectionFee || 0).toLocaleString()}</td>
                        <td className="p-2.5 text-slate-500 text-[11px]">رسوم إدارية</td>
                      </tr>
                    )}
                    {Number(connection.meterCost || 0) > 0 && (
                      <tr>
                        <td className="p-2.5 font-bold">قيمة وتوريد العداد الكهربائي</td>
                        <td className="p-2.5 text-center font-mono font-bold">{(connection.meterCost || 0).toLocaleString()}</td>
                        <td className="p-2.5 text-slate-500 text-[11px]">عداد ديجيتال معتمد</td>
                      </tr>
                    )}
                    {Number(connection.insuranceDeposit || 0) > 0 && (
                      <tr>
                        <td className="p-2.5 font-bold">تأمين استهلاك الكهرباء (مسترد)</td>
                        <td className="p-2.5 text-center font-mono font-bold">{(connection.insuranceDeposit || 0).toLocaleString()}</td>
                        <td className="p-2.5 text-slate-500 text-[11px]">أمانات تأمين عداد</td>
                      </tr>
                    )}
                    {Number(connection.installationLaborFee || 0) > 0 && (
                      <tr>
                        <td className="p-2.5 font-bold">أجور اليد والتركيب الفني الميداني</td>
                        <td className="p-2.5 text-center font-mono font-bold">{(connection.installationLaborFee || 0).toLocaleString()}</td>
                        <td className="p-2.5 text-slate-500 text-[11px]">أجور كادر التمديد</td>
                      </tr>
                    )}
                    {Number(connection.materialsFee || 0) > 0 && (
                      <tr>
                        <td className="p-2.5 font-bold">قيمة المواد والتجهيزات المصروفة</td>
                        <td className="p-2.5 text-center font-mono font-bold">{(connection.materialsFee || 0).toLocaleString()}</td>
                        <td className="p-2.5 text-slate-500 text-[11px]">كابلات وقواطع ومستلزمات</td>
                      </tr>
                    )}
                    {Number(connection.otherFees || 0) > 0 && (
                      <tr>
                        <td className="p-2.5 font-bold">رسوم إضافية / تسويات أخرى</td>
                        <td className="p-2.5 text-center font-mono font-bold">{(connection.otherFees || 0).toLocaleString()}</td>
                        <td className="p-2.5 text-slate-500 text-[11px]">-</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Materials Table if any */}
              {connection.materialsList && connection.materialsList.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-xs font-black text-slate-900 mb-2 border-b border-slate-200 pb-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    المواد والتجهيزات المصروفة للتركيب الميداني
                  </h3>
                  <table className="w-full text-[11px] text-right border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2">#</th>
                        <th className="p-2">اسم المادة / الصنف</th>
                        <th className="p-2 text-center">الكمية</th>
                        <th className="p-2 text-center">سعر الوحدة</th>
                        <th className="p-2 text-center">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {connection.materialsList.map((m, idx) => (
                        <tr key={m.id || idx}>
                          <td className="p-2 font-mono text-slate-500">{idx + 1}</td>
                          <td className="p-2 font-bold">{m.name}</td>
                          <td className="p-2 text-center font-mono">{m.quantity} {m.unit}</td>
                          <td className="p-2 text-center font-mono">{(m.unitPrice || 0).toLocaleString()}</td>
                          <td className="p-2 text-center font-mono font-bold">
                            {(Number(m.quantity || 0) * Number(m.unitPrice || 0)).toLocaleString()} {settings.currency}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Total, Paid, and Remaining Summary Box */}
              <div className="grid grid-cols-3 gap-3 bg-slate-900 text-white p-4 rounded-xl text-center mb-5">
                <div>
                  <span className="text-[11px] text-slate-400 block font-bold">إجمالي المستحق</span>
                  <span className="text-lg font-black font-mono text-amber-400">
                    {connection.totalFee.toLocaleString()} {settings.currency}
                  </span>
                </div>
                <div className="border-x border-slate-800">
                  <span className="text-[11px] text-slate-400 block font-bold">المبلغ المقبوض</span>
                  <span className="text-lg font-black font-mono text-emerald-400">
                    {connection.paidAmount.toLocaleString()} {settings.currency}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-bold">المتبقي (ذمة مؤجلة)</span>
                  <span className={`text-lg font-black font-mono ${rem > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                    {rem.toLocaleString()} {settings.currency}
                  </span>
                </div>
              </div>

              {/* Tafqeet in Arabic */}
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-950 font-bold mb-6">
                المبلغ المقبوض رقماً وكتابةً: <span className="font-black underline">{tafqeetArabic(connection.paidAmount, settings.currency)}</span>
              </div>

              {/* Signatures & Stamp */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t-2 border-slate-900 text-xs text-center">
                <div>
                  <span className="block text-slate-500 font-bold mb-8">المستلم / أمين الصندوق:</span>
                  <span className="font-bold text-slate-900">{connection.recordedBy || 'المحاسب المسؤول'}</span>
                </div>
                <div>
                  <span className="block text-slate-500 font-bold mb-8">توقيع المشترك / المستفيد:</span>
                  <span className="font-bold text-slate-900">........................</span>
                </div>
                <div className="relative">
                  <span className="block text-slate-500 font-bold mb-2">اعتماد الإدارة والختم:</span>
                  {settings.officialStampUrl ? (
                    <img
                      src={settings.officialStampUrl}
                      alt="ختم المحطة"
                      className="w-16 h-16 object-contain mx-auto opacity-80"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-full flex items-center justify-center mx-auto text-[10px] text-slate-400">
                      ختم رسمي
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ================= 80MM POS THERMAL RECEIPT ================= */
            <div className="bg-white text-slate-950 p-4 rounded-xl shadow-xl font-mono text-xs w-[320px] print:w-[80mm] print:shadow-none print:p-2 border border-slate-300 space-y-3">
              {/* Header */}
              <div className="text-center space-y-1 border-b border-dashed border-slate-400 pb-3">
                {settings.logoUrl && (
                  <img
                    src={settings.logoUrl}
                    alt={settings.stationName}
                    className="w-12 h-12 object-contain mx-auto mb-1"
                    referrerPolicy="no-referrer"
                  />
                )}
                <h2 className="font-black text-sm tracking-tight">{settings.stationName || 'محطة الكهرباء'}</h2>
                <p className="text-[10px] text-slate-600">سند قبض إدخال وتوصيل خدمة</p>
                {settings.phone && <p className="text-[10px] text-slate-600">هاتف: {settings.phone}</p>}
              </div>

              {/* Metadata */}
              <div className="space-y-1 text-[11px] border-b border-dashed border-slate-400 pb-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">رقم السند:</span>
                  <span className="font-black">{connection.voucherNo || `CON-${connection.id.slice(-4)}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">التاريخ:</span>
                  <span>{connection.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">المشترك:</span>
                  <span className="font-black text-right truncate max-w-[170px]">{connection.subscriberName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">العداد:</span>
                  <span className="font-black">{connection.meterNumber || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">نوع الخدمة:</span>
                  <span>{sInfo.label}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-1 text-[11px] border-b border-dashed border-slate-400 pb-2">
                <div className="flex justify-between font-bold text-slate-700">
                  <span>البيان</span>
                  <span>المبلغ ({settings.currency})</span>
                </div>
                {Number(connection.connectionFee || 0) > 0 && (
                  <div className="flex justify-between text-slate-800">
                    <span>رسوم توصيل</span>
                    <span>{(connection.connectionFee || 0).toLocaleString()}</span>
                  </div>
                )}
                {Number(connection.meterCost || 0) > 0 && (
                  <div className="flex justify-between text-slate-800">
                    <span>قيمة العداد</span>
                    <span>{(connection.meterCost || 0).toLocaleString()}</span>
                  </div>
                )}
                {Number(connection.insuranceDeposit || 0) > 0 && (
                  <div className="flex justify-between text-slate-800">
                    <span>تأمين استهلاك</span>
                    <span>{(connection.insuranceDeposit || 0).toLocaleString()}</span>
                  </div>
                )}
                {Number(connection.installationLaborFee || 0) > 0 && (
                  <div className="flex justify-between text-slate-800">
                    <span>أجور تركيب</span>
                    <span>{(connection.installationLaborFee || 0).toLocaleString()}</span>
                  </div>
                )}
                {Number(connection.materialsFee || 0) > 0 && (
                  <div className="flex justify-between text-slate-800">
                    <span>قيمة مواد</span>
                    <span>{(connection.materialsFee || 0).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="space-y-1.5 text-xs font-black border-b border-dashed border-slate-400 pb-2">
                <div className="flex justify-between">
                  <span>إجمالي الرسوم:</span>
                  <span>{connection.totalFee.toLocaleString()} {settings.currency}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>المبلغ المقبوض:</span>
                  <span>{connection.paidAmount.toLocaleString()} {settings.currency}</span>
                </div>
                {rem > 0 && (
                  <div className="flex justify-between text-rose-700">
                    <span>المتبقي:</span>
                    <span>{rem.toLocaleString()} {settings.currency}</span>
                  </div>
                )}
              </div>

              {/* Tafqeet */}
              <div className="text-[10px] text-center font-bold text-slate-700 border-b border-dashed border-slate-400 pb-2">
                {tafqeetArabic(connection.paidAmount, settings.currency)}
              </div>

              {/* Barcode & Footer */}
              <div className="text-center space-y-1 pt-1">
                <div className="font-mono text-base font-black tracking-widest">
                  *{(connection.voucherNo || connection.id.slice(-6)).toUpperCase()}*
                </div>
                <p className="text-[9px] text-slate-500">شكراً لاشتراككم معنا</p>
                <p className="text-[8px] text-slate-400">النظام الذكي لإدارة شبكات وتوزيع الكهرباء</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
