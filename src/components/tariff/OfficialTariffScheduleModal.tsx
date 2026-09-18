import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { SystemSettings } from '../../types';
import { X, Printer, Download, Zap, ShieldCheck, FileText, CheckCircle, Award } from 'lucide-react';

interface OfficialTariffScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SystemSettings;
}

export const OfficialTariffScheduleModal: React.FC<OfficialTariffScheduleModalProps> = ({
  isOpen,
  onClose,
  settings,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const tariffs = settings.tariffs || { residential: 0, commercial: 0, industrial: 0 };
  const currency = settings.currency || 'ر.ي';

  const sectorsList = [
    { key: 'residential', label: 'القطاع السكني (منازل وشقق)', rate: tariffs.residential ?? 0, desc: 'الاشتراكات المنزلية والعائلية' },
    { key: 'commercial', label: 'القطاع التجاري (محلات ومتاجر)', rate: tariffs.commercial ?? 0, desc: 'المحلات التجارية والأنشطة الاقتصادية' },
    { key: 'industrial', label: 'القطاع الصناعي والشركات', rate: tariffs.industrial ?? 0, desc: 'الورش والمصانع والمؤسسات الكبرى' },
    { key: 'government', label: 'المؤسسات الحكومية والرسمية', rate: tariffs.government ?? tariffs.commercial ?? 0, desc: 'المكاتب والمرافق الحكومية' },
    { key: 'agricultural', label: 'القطاع الزراعي وضخ المياه', rate: tariffs.agricultural ?? 0, desc: 'مزارع، آبار مياه، وشبكات الري' },
    { key: 'mosque', label: 'دور العبادة والمساجد', rate: tariffs.mosque ?? 0, desc: 'تعرفة مدعومة للمساجد والجمعيات الخيرية' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden print:border-none print:shadow-none print:max-h-none print:w-full print:bg-white text-slate-100 print:text-black font-sans"
        dir="rtl"
      >
        {/* Modal Top Control Bar (Hidden during printing) */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/80 print:hidden">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-black text-sm text-white">لائحة تعرفة الكهرباء والرسوم الرسمية المعتمدة</h3>
              <p className="text-[11px] text-slate-400">وثيقة إدارية جاهزة للطباعة والنشر للمشتركين</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة اللائحة الرسمية (A4)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div ref={printRef} className="p-8 overflow-y-auto space-y-6 bg-slate-900 print:bg-white print:p-8 print:text-black">
          {/* Header Section */}
          <div className="border-b-2 border-amber-500/50 pb-6 flex justify-between items-start text-right">
            <div className="space-y-1">
              <div className="text-xs font-bold text-amber-400 print:text-amber-700 tracking-wider">الجمهورية اليمنية - وزارة الكهرباء والطاقة</div>
              <h1 className="text-2xl font-black text-white print:text-slate-950">{settings.stationName || 'محطة التوليد والتوزيع الكهربائي'}</h1>
              <div className="text-xs text-slate-400 print:text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                {settings.stationCode && <span>كود المحطة: <strong className="font-mono">{settings.stationCode}</strong></span>}
                {settings.commercialRegister && <span>س.ت: <strong className="font-mono">{settings.commercialRegister}</strong></span>}
                {settings.taxNumber && <span>الرقم الضريبي: <strong className="font-mono">{settings.taxNumber}</strong></span>}
                {settings.phone && <span>الهاتف: <strong className="font-mono">{settings.phone}</strong></span>}
              </div>
            </div>

            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt="Logo"
                className="w-20 h-20 object-contain rounded-xl border border-slate-800 print:border-slate-300"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 print:bg-slate-100 print:text-slate-800">
                <Zap className="w-8 h-8" />
              </div>
            )}
          </div>

          {/* Document Title Banner */}
          <div className="text-center py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/20 border border-amber-500/30 print:bg-slate-100 print:border-slate-300">
            <h2 className="text-lg font-black text-amber-400 print:text-slate-900">جدول تعرفة استهلاك الطاقة الكهربائية والرسوم والخدمات</h2>
            <p className="text-[11px] text-slate-300 print:text-slate-600 mt-0.5">
              سارية ومعتمدة لجميع المشتركين ضمن النطاق الجغرافي للمحطة ({new Date().getFullYear()}م)
            </p>
          </div>

          {/* 1. Sector Rates Table */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white print:text-slate-900 flex items-center gap-1.5 border-r-4 border-amber-500 pr-2">
              <span>أولاً: تعرفة استهلاك الطاقة الكهربائية حسب القطاعات (سعر الكيلوواط / ساعة)</span>
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-800 print:border-slate-300">
              <table className="w-full text-xs text-right border-collapse">
                <thead className="bg-slate-950/80 print:bg-slate-100 text-slate-300 print:text-slate-700 font-bold border-b border-slate-800 print:border-slate-300">
                  <tr>
                    <th className="py-2.5 px-4">م</th>
                    <th className="py-2.5 px-4">تصنيف / نوع الاشتراك</th>
                    <th className="py-2.5 px-4">سعر الكيلوواط ({currency})</th>
                    <th className="py-2.5 px-4">نطاق التطبيق والوصف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
                  {sectorsList.map((sec, idx) => (
                    <tr key={sec.key} className={idx % 2 === 0 ? 'bg-slate-900/40 print:bg-white' : 'bg-slate-950/30 print:bg-slate-50'}>
                      <td className="py-2.5 px-4 font-mono text-slate-400 print:text-slate-600">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-bold text-white print:text-slate-900">{sec.label}</td>
                      <td className="py-2.5 px-4 font-mono font-black text-amber-400 print:text-amber-700 text-sm">
                        {sec.rate.toLocaleString()} {currency}
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 print:text-slate-600 text-[11px]">{sec.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Consumption Slices (if defined) */}
          {settings.tariffSlices && settings.tariffSlices.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-white print:text-slate-900 flex items-center gap-1.5 border-r-4 border-amber-500 pr-2">
                <span>ثانياً: نظام الشرائح الاستهلاكية التصاعدية (في حال تطبيق نظام الشرائح)</span>
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-800 print:border-slate-300">
                <table className="w-full text-xs text-right border-collapse">
                  <thead className="bg-slate-950/80 print:bg-slate-100 text-slate-300 print:text-slate-700 font-bold border-b border-slate-800 print:border-slate-300">
                    <tr>
                      <th className="py-2.5 px-4">م</th>
                      <th className="py-2.5 px-4">اسم الشريحة</th>
                      <th className="py-2.5 px-4">نطاق الاستهلاك (ك.و/س)</th>
                      <th className="py-2.5 px-4">السعر المعتمد ({currency})</th>
                      <th className="py-2.5 px-4">رسم إضافي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
                    {settings.tariffSlices.map((slice, idx) => (
                      <tr key={slice.id} className={idx % 2 === 0 ? 'bg-slate-900/40 print:bg-white' : 'bg-slate-950/30 print:bg-slate-50'}>
                        <td className="py-2.5 px-4 font-mono text-slate-400 print:text-slate-600">{idx + 1}</td>
                        <td className="py-2.5 px-4 font-bold text-white print:text-slate-900">{slice.name}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-300 print:text-slate-700">
                          من {slice.minKwh} {slice.maxKwh !== null ? `إلى ${slice.maxKwh}` : 'فما فوق'} ك.و
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-amber-400 print:text-amber-700">
                          {slice.ratePerKwh.toLocaleString()} {currency}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-400 print:text-slate-600">
                          {(slice.fixedAdditionalFee || 0).toLocaleString()} {currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. Itemized Fees, Surcharges & Fines */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-white print:text-slate-900 flex items-center gap-1.5 border-r-4 border-amber-500 pr-2">
              <span>ثالثاً: جدول الرسوم الثابتة، الخدمات، والجزاءات الإدارية</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950/60 print:bg-slate-50 p-4 rounded-xl border border-slate-800 print:border-slate-300 space-y-2">
                <div className="font-bold text-amber-400 print:text-amber-800 border-b border-slate-800 print:border-slate-200 pb-1">
                  الرسوم الشهرية والخدمية الدورية
                </div>
                <div className="flex justify-between items-center text-slate-300 print:text-slate-800">
                  <span>الرسوم الثابتة للاشتراك (شهرياً):</span>
                  <span className="font-mono font-bold">{(settings.fixedFee || 0).toLocaleString()} {currency}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300 print:text-slate-800">
                  <span>رسوم الصيانة وخدمة الشبكة (شهرياً):</span>
                  <span className="font-mono font-bold">{(settings.serviceFee || 0).toLocaleString()} {currency}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300 print:text-slate-800">
                  <span>رسوم النظافة والتحسين (شهرياً):</span>
                  <span className="font-mono font-bold">{(settings.cleaningFee || 0).toLocaleString()} {currency}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300 print:text-slate-800">
                  <span>رسوم إنارة الشوارع العامة:</span>
                  <span className="font-mono font-bold">{(settings.streetLightFee || 0).toLocaleString()} {currency}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300 print:text-slate-800">
                  <span>ضريبة القيمة المضافة / المبيعات:</span>
                  <span className="font-mono font-bold">{settings.taxPercent || 0}%</span>
                </div>
              </div>

              <div className="bg-slate-950/60 print:bg-slate-50 p-4 rounded-xl border border-slate-800 print:border-slate-300 space-y-2">
                <div className="font-bold text-amber-400 print:text-amber-800 border-b border-slate-800 print:border-slate-200 pb-1">
                  الرسوم الإدارية والتأمينات والغرامات
                </div>
                <div className="flex justify-between items-center text-slate-300 print:text-slate-800">
                  <span>مبلغ تأمين العداد الافتراضي:</span>
                  <span className="font-mono font-bold">{(settings.meterInsuranceDeposit || 0).toLocaleString()} {currency}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300 print:text-slate-800">
                  <span>رسوم إعادة التوصيل بعد الفصل:</span>
                  <span className="font-mono font-bold">{(settings.reconnectionFee ?? 0).toLocaleString()} {currency}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300 print:text-slate-800">
                  <span>رسوم فحص ومعايرة العداد:</span>
                  <span className="font-mono font-bold">{(settings.meterInspectionFee ?? 0).toLocaleString()} {currency}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300 print:text-slate-800">
                  <span>رسوم نقل الملكية / التنازل:</span>
                  <span className="font-mono font-bold">{(settings.nameTransferFee ?? 0).toLocaleString()} {currency}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300 print:text-slate-800">
                  <span>الحد الأدنى للاستهلاك الشهري:</span>
                  <span className="font-mono font-bold">{settings.minMonthlyConsumptionKwh || 0} ك.و/س</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Official Terms & Notes */}
          <div className="p-4 rounded-xl bg-slate-950/40 print:bg-slate-50 border border-slate-800 print:border-slate-200 text-[11px] text-slate-400 print:text-slate-700 space-y-1">
            <div className="font-bold text-slate-300 print:text-slate-900 mb-1">تعليمات وضوابط هامة لجميع المشتركين:</div>
            <p>1. تتم قراءة العدادات وفق دورة النزول الميداني المعتمدة ({settings.readingCycleIntervalDays || 10} أيام - {settings.readingCycleMode === 'decadal' ? 'عشرية' : 'شهرية'}).</p>
            <p>2. يلزم سداد قيمة الفاتورة خلال فترة السماح المحددة لتفادي فرض غرامات التأخير أو فصل الخدمة مؤقتاً.</p>
            <p>3. يمنع منعاً باتاً كسر الختم الرصاصي للعداد أو التلاعب بالتوصيلات قبل العداد تحت طائلة الغرامة والمساءلة القانونية.</p>
          </div>

          {/* Footer Official Seal & Signature */}
          <div className="pt-6 border-t border-slate-800 print:border-slate-300 flex justify-between items-end text-xs">
            <div className="space-y-2">
              <div className="text-slate-400 print:text-slate-600">إدارة الشؤون الفنية والمالية:</div>
              <div className="font-bold text-slate-200 print:text-slate-900">{settings.ownerName || 'إدارة المحطة'}</div>
              <div className="text-[10px] text-slate-500 font-mono">تاريخ الاعتماد: {new Date().toLocaleDateString('ar-EG')}</div>
            </div>

            <div className="text-center space-y-2">
              <div className="text-slate-400 print:text-slate-600">الختم والاعتماد الرسمي:</div>
              {settings.officialStampUrl ? (
                <img
                  src={settings.officialStampUrl}
                  alt="Seal"
                  className="w-20 h-20 object-contain mx-auto print:w-20 print:h-20"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-20 h-20 border-2 border-dashed border-slate-700 print:border-slate-400 rounded-full flex items-center justify-center text-[10px] text-slate-500 mx-auto">
                  الختم الرسمي
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
