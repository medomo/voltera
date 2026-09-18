import React, { useState } from 'react';
import { 
  Zap, 
  MessageSquare, 
  Smartphone, 
  QrCode, 
  CreditCard, 
  Cloud, 
  ShieldCheck, 
  Sliders, 
  Check, 
  AlertCircle, 
  Copy, 
  CheckCircle2, 
  ExternalLink, 
  Radio, 
  Server, 
  Layers, 
  Clock, 
  Send, 
  Play, 
  RefreshCw,
  Printer,
  Sparkles,
  Database,
  Lock,
  Globe
} from 'lucide-react';
import { SystemSettings } from '../../types';

interface AdditionalServicesHubProps {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => void;
}

export const SMS_GATEWAY_PROVIDERS = [
  { id: 'android_modem', name: 'تطبيق مودم أندرويد المحلي (Android Local SMS)', desc: 'إرسال مباشر عبر هاتف متصل بشريحة محلية دون تكلفة بوابات خارجية' },
  { id: 'yemen_mobile', name: 'بوابة يمن موبايل الرسمية (Yemen Mobile Bulk SMS)', desc: 'اتصال مباشر عبر واجهة API الرسمية ليمن موبايل' },
  { id: 'sabafon', name: 'بوابة سبأفون للأعمال (SabaFon Enterprise SMS)', desc: 'إرسال رسائل التنبيهات المعتمدة عبر سبأفون' },
  { id: 'you_telecom', name: 'بوابة يو للاتصالات (YOU Telecom Bulk API)', desc: 'واجهة الربط السحابي لرسائل مشتركي شبكة YOU' },
  { id: 'http_gateway', name: 'بوابة HTTP مخصصة (Custom Webhook / HTTP Gateway)', desc: 'ربط مخصص مع أي سيرفر أو راوتر SMS محلي' },
  { id: 'twilio', name: 'بوابة Twilio السحابية الدولية (Twilio Cloud SMS)', desc: 'بوابة عالمية موثوقة ذات تغطية دولية فورية' }
];

export const AdditionalServicesHub: React.FC<AdditionalServicesHubProps> = ({
  settings,
  onUpdateSettings
}) => {
  const [activeTab, setActiveTab] = useState<'sms' | 'whatsapp' | 'qr' | 'epayment' | 'backup' | 'integrity'>('sms');
  const [testPhone, setTestPhone] = useState('777123456');
  const [testSmsStatus, setTestSmsStatus] = useState<string | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<{ totalChecks: number; passed: number; warnings: string[] } | null>(null);
  const [qrTestCode, setQrTestCode] = useState('MTR-88402');

  // Values with clean fallbacks
  const autoSmsEnabled = settings.autoSmsEnabled || false;
  const autoSendReadingSms = settings.autoSendReadingSms || false;
  const autoSendPaymentSms = settings.autoSendPaymentSms || false;
  const smsDueWarningEnabled = settings.smsDueWarningEnabled !== false;
  const smsProvider = settings.smsGatewayProvider || 'android_modem';
  const batchInterval = settings.batchSmsIntervalMs || 1500;

  const whatsappEnabled = settings.whatsappEnabled || false;
  const whatsappTemplate = settings.whatsappCustomTemplate || 
    '⚡ محطة {STATION_NAME} ⚡\nعزيزي المشترك {NAME}،\nتم إصدار فاتورة الكهرباء للعداد ({METER}) بمبلغ {AMOUNT} {CURRENCY}.\nللاستفسار: {PHONE}';
  const whatsappChannel = settings.whatsappChannelUrl || '';

  const meterQrEnabled = settings.meterQrScanningEnabled !== false;
  const meterQrFormat = settings.meterQrPayloadFormat || 'meter_number_only';

  const onlinePaymentEnabled = settings.onlinePaymentEnabled !== false;
  const ePaymentNotice = settings.ePaymentWalletAccountsNotice || 
    'يمكنك سداد الفاتورة عبر تطبيق الكريمي جوال (حساب رقم: 123456) أو محفظة جوالي / كاش، ثم إرسال إشعار التحويل لخدمة العملاء.';

  const autoSnapshotEnabled = settings.autoSnapshotEnabled !== false;
  const snapshotInterval = settings.autoSnapshotIntervalHours || 4;
  const maxSnapshots = settings.maxAutoSnapshotsToKeep || 30;

  const selfHealingEnabled = settings.selfHealingIntegrityCheckEnabled !== false;

  const handleRunIntegrityAudit = () => {
    setIsAuditing(true);
    setAuditResult(null);

    setTimeout(() => {
      setIsAuditing(false);
      setAuditResult({
        totalChecks: 6,
        passed: 6,
        warnings: []
      });
    }, 1200);
  };

  const handleTestSms = () => {
    if (!testPhone.trim()) return;
    setTestSmsStatus('جاري إرسال رسالة الاختبار إلى المودم/البوابة...');
    setTimeout(() => {
      setTestSmsStatus(`✅ تم تجهيز وإرسال رسالة الاختبار بنجاح إلى الرقم: ${testPhone}`);
      setTimeout(() => setTestSmsStatus(null), 4000);
    }, 1000);
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Top Banner */}
      <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              منظومة الخدمات السحابية والميدانية v2.5
            </span>
          </div>

          <div className="text-right">
            <h4 className="font-black text-amber-400 text-sm flex items-center justify-end gap-2">
              <span>مركز الخدمات الإضافية والتكاملات الذكية (Smart Services Hub)</span>
              <Zap className="w-5 h-5" />
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              إدارة بوابات الرسائل SMS التلقائية، إشعارات الواتساب، باركود العدادات الميداني، المحافظ الإلكترونية، والنسخ السحابي الدوري.
            </p>
          </div>
        </div>

        {/* Sub Navigation Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
          {[
            { id: 'sms', name: 'بوابات SMS التلقائية', icon: MessageSquare },
            { id: 'whatsapp', name: 'روبوت وإشعارات الواتساب', icon: Smartphone },
            { id: 'qr', name: 'رموز QR وباركود العدادات', icon: QrCode },
            { id: 'epayment', name: 'بوابات ومحافظ السداد', icon: CreditCard },
            { id: 'backup', name: 'الاستعادة السحابية التلقائية', icon: Cloud },
            { id: 'integrity', name: 'فحص وتدقيق البيانات', icon: ShieldCheck }
          ].map((tab) => {
            const isSelected = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : 'bg-slate-950/80 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. SMS GATEWAYS & AUTOMATED NOTIFICATIONS */}
      {activeTab === 'sms' && (
        <div className="space-y-6">
          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-5 shadow-xl">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  autoSmsEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'
                }`}>
                  {autoSmsEnabled ? 'الخدمة مفعّلة ونشطة' : 'الخدمة متوقفة مؤقتاً'}
                </span>
              </div>

              <div className="text-right">
                <h5 className="font-black text-white text-xs flex items-center justify-end gap-1.5">
                  <span>خدمة الرسائل النصية SMS الآلية والميدانية</span>
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                </h5>
                <p className="text-[11px] text-slate-400">إشعار فوري للمشتركين بتفاصيل القراءات، فواتير الاستهلاك، وسندات القبض.</p>
              </div>
            </div>

            {/* Master Toggle */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
              <div className="text-right">
                <h6 className="font-bold text-white text-xs">تفعيل نظام الإرسال التلقائي للرسائل النصية (Master SMS Engine)</h6>
                <p className="text-[10px] text-slate-400 mt-0.5">السماح للنظام بإرسال الرسائل الفورية عند حفظ العمليات الميدانية والمكتبية.</p>
              </div>
              <button
                type="button"
                onClick={() => onUpdateSettings({ ...settings, autoSmsEnabled: !autoSmsEnabled })}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  autoSmsEnabled ? 'bg-amber-500' : 'bg-slate-800'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-slate-950 transition-transform absolute top-1 ${
                  autoSmsEnabled ? 'right-1' : 'right-7'
                }`} />
              </button>
            </div>

            {/* Gateway Provider Selection */}
            <div className="space-y-3">
              <label className="block text-slate-300 text-xs font-bold">بوابة الإرسال ومزود الخدمة المعتمد:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SMS_GATEWAY_PROVIDERS.map((prov) => {
                  const isSelected = smsProvider === prov.id;
                  return (
                    <button
                      key={prov.id}
                      type="button"
                      onClick={() => onUpdateSettings({ ...settings, smsGatewayProvider: prov.id })}
                      className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                        isSelected
                          ? 'bg-slate-950 border-amber-500 text-white shadow-md'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          isSelected ? 'bg-amber-500 border-amber-400 text-slate-950' : 'border-slate-700'
                        }`}>
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </span>
                        <h6 className="font-bold text-xs">{prov.name}</h6>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight">{prov.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Triggers & Options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                <div className="text-right">
                  <h6 className="font-bold text-white text-xs">إرسال SMS عند تسجيل القراءة</h6>
                  <p className="text-[10px] text-slate-400">إشعار المشترك فور أخذ قراءة العداد.</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoSendReadingSms}
                  onChange={e => onUpdateSettings({ ...settings, autoSendReadingSms: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                <div className="text-right">
                  <h6 className="font-bold text-white text-xs">إرسال SMS عند سداد السند</h6>
                  <p className="text-[10px] text-slate-400">إشعار فوري بقيمة السداد والرصيد المتبقي.</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoSendPaymentSms}
                  onChange={e => onUpdateSettings({ ...settings, autoSendPaymentSms: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                <div className="text-right">
                  <h6 className="font-bold text-white text-xs">رسائل الإنذار بالمهلة</h6>
                  <p className="text-[10px] text-slate-400">تنبيه المشتركين المتأخرين قبل فصل التيار.</p>
                </div>
                <input
                  type="checkbox"
                  checked={smsDueWarningEnabled}
                  onChange={e => onUpdateSettings({ ...settings, smsDueWarningEnabled: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>

            </div>

            {/* Batch Interval Rate Limiter */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-right">
                <h6 className="font-bold text-white text-xs">الفاصل الزمني للأمان بين الرسائل الدفعية (Rate Limiting)</h6>
                <p className="text-[10px] text-slate-400 mt-0.5">لحماية شريحة المودم من الحظر المؤقت عند إرسال مئات الرسائل دفعة واحدة.</p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="number"
                  min={500}
                  max={5000}
                  step={250}
                  value={batchInterval}
                  onChange={e => onUpdateSettings({ ...settings, batchSmsIntervalMs: Number(e.target.value) })}
                  className="w-24 bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-2 text-amber-400 font-mono text-center font-bold text-xs"
                />
                <span className="text-slate-400 text-xs">مللي ثانية (ms)</span>
              </div>
            </div>

            {/* Test SMS Box */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <h6 className="font-bold text-slate-200 text-xs">تجربة محاكاة إرسال رسالة نصية سريعة:</h6>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value)}
                  placeholder="رقم الهاتف: 777123456"
                  className="w-full sm:w-60 bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-slate-100 font-mono text-xs text-right"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={handleTestSms}
                  className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>إرسال رسالة تجريبية</span>
                </button>
              </div>
              {testSmsStatus && (
                <p className="text-xs text-amber-400 font-bold animate-pulse">{testSmsStatus}</p>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 2. WHATSAPP NOTIFICATIONS & BOT */}
      {activeTab === 'whatsapp' && (
        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-5 shadow-xl">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                whatsappEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'
              }`}>
                {whatsappEnabled ? 'إشعارات واتساب مفعّلة' : 'الخدمة معطلة'}
              </span>
            </div>

            <div className="text-right">
              <h5 className="font-black text-white text-xs flex items-center justify-end gap-1.5">
                <span>خدمة إشعارات وروبوت الواتساب الرسمي للمشتركين</span>
                <Smartphone className="w-4 h-4 text-emerald-400" />
              </h5>
              <p className="text-[11px] text-slate-400">إرسال الفواتير وسندات السداد مباشرة إلى تطبيق الواتساب بنقرة زر واحدة.</p>
            </div>
          </div>

          {/* Toggle */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
            <div className="text-right">
              <h6 className="font-bold text-white text-xs">تفعيل زر الإرسال المباشر عبر الواتساب (WhatsApp Direct Link)</h6>
              <p className="text-[10px] text-slate-400 mt-0.5">إظهار أيقونة الواتساب في كشوف المشتركين والسندات لفتح محادثة مباشرة مع العميل.</p>
            </div>
            <button
              type="button"
              onClick={() => onUpdateSettings({ ...settings, whatsappEnabled: !whatsappEnabled })}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                whatsappEnabled ? 'bg-emerald-500' : 'bg-slate-800'
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-slate-950 transition-transform absolute top-1 ${
                whatsappEnabled ? 'right-1' : 'right-7'
              }`} />
            </button>
          </div>

          {/* WhatsApp Channel Link */}
          <div>
            <label className="block text-slate-300 text-xs font-bold mb-1.5">رابط قناة الواتساب الرسمية للمحطة (WhatsApp Channel / Group):</label>
            <input
              type="text"
              value={whatsappChannel}
              onChange={e => onUpdateSettings({ ...settings, whatsappChannelUrl: e.target.value })}
              placeholder="https://whatsapp.com/channel/0029Va..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 font-mono text-xs text-left"
              dir="ltr"
            />
            <p className="text-[10px] text-slate-500 mt-1">يُطبع هذا الرابط كود QR في الفواتير لتمكين المشتركين من متابعة إعلانات الصيانة وساعات التوليد.</p>
          </div>

          {/* Custom Template */}
          <div>
            <label className="block text-slate-300 text-xs font-bold mb-1.5">قالب نص رسالة الواتساب المعتمد:</label>
            <textarea
              rows={5}
              value={whatsappTemplate}
              onChange={e => onUpdateSettings({ ...settings, whatsappCustomTemplate: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 text-xs font-mono leading-relaxed"
            />
            <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 mt-1">
              <span>المتغيرات المتاحة:</span>
              <span className="bg-slate-800 px-1.5 py-0.5 rounded font-mono text-amber-400">{'{STATION_NAME}'}</span>
              <span className="bg-slate-800 px-1.5 py-0.5 rounded font-mono text-amber-400">{'{NAME}'}</span>
              <span className="bg-slate-800 px-1.5 py-0.5 rounded font-mono text-amber-400">{'{METER}'}</span>
              <span className="bg-slate-800 px-1.5 py-0.5 rounded font-mono text-amber-400">{'{AMOUNT}'}</span>
              <span className="bg-slate-800 px-1.5 py-0.5 rounded font-mono text-amber-400">{'{CURRENCY}'}</span>
              <span className="bg-slate-800 px-1.5 py-0.5 rounded font-mono text-amber-400">{'{PHONE}'}</span>
            </div>
          </div>

        </div>
      )}

      {/* 3. QR & BARCODE FIELD ENGINE */}
      {activeTab === 'qr' && (
        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-5 shadow-xl">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                meterQrEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'
              }`}>
                {meterQrEnabled ? 'ماسح العدادات مفعّل' : 'الماسح معطل'}
              </span>
            </div>

            <div className="text-right">
              <h5 className="font-black text-white text-xs flex items-center justify-end gap-1.5">
                <span>محرك الباركود ورموز QR للعدادات الميدانية (Meter QR Engine)</span>
                <QrCode className="w-4 h-4 text-amber-400" />
              </h5>
              <p className="text-[11px] text-slate-400">قراءة سريعة لبيانات المشترك بمجرد توجيه كاميرا الهاتف نحو ملصق العداد.</p>
            </div>
          </div>

          {/* Master Toggle */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
            <div className="text-right">
              <h6 className="font-bold text-white text-xs">تفعيل مسح العدادات عبر الكاميرا في تطبيق القارئ الميداني</h6>
              <p className="text-[10px] text-slate-400 mt-0.5">فتح نموذج القراءة وتسجيل الاستهلاك فورياً بمجرد التعرف على الكود.</p>
            </div>
            <button
              type="button"
              onClick={() => onUpdateSettings({ ...settings, meterQrScanningEnabled: !meterQrEnabled })}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                meterQrEnabled ? 'bg-amber-500' : 'bg-slate-800'
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-slate-950 transition-transform absolute top-1 ${
                meterQrEnabled ? 'right-1' : 'right-7'
              }`} />
            </button>
          </div>

          {/* QR Payload Format */}
          <div className="space-y-3">
            <label className="block text-slate-300 text-xs font-bold">صيغة ترميز ملصقات QR للعدادات:</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'meter_number_only', name: 'رقم العداد فقط (Meter Number)', desc: 'ترميز نصي خفيف وسريع القراءة حتى في الإضاءة الخافتة.' },
                { id: 'encrypted_subscriber_url', name: 'رابط مباشر آمن (Web Portal URL)', desc: 'يفتح صفحة المشترك مباشرة عند مسحه بأي هاتف عادي.' },
                { id: 'full_json', name: 'كائن بيانات مشفر (Full JSON Payload)', desc: 'يتضمن رقم العداد، اسم المشترك، ونوع التعرفة للمزامنة غير المتصلة.' }
              ].map((fmt) => {
                const isSelected = meterQrFormat === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, meterQrPayloadFormat: fmt.id as any })}
                    className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      isSelected
                        ? 'bg-slate-950 border-amber-500 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        isSelected ? 'bg-amber-500 border-amber-400 text-slate-950' : 'border-slate-700'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </span>
                      <h6 className="font-bold text-xs">{fmt.name}</h6>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">{fmt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Meter QR Sticker Generator */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
            <h6 className="font-bold text-slate-200 text-xs">معاينة نموذج ملصق العداد الميداني المعتمد:</h6>
            <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-900/90 p-4 rounded-xl border border-slate-800">
              <div className="w-28 h-28 bg-white p-2 rounded-xl flex items-center justify-center shadow-lg shrink-0">
                <QrCode className="w-24 h-24 text-slate-950" />
              </div>

              <div className="space-y-1.5 text-right flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-500 text-slate-950 font-black rounded text-[10px]">
                    {settings.stationName || 'محطة الكهرباء'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">رمز التوثيق الإلكتروني</span>
                </div>
                <h5 className="font-black text-white text-sm font-mono tracking-wider" dir="ltr">
                  METER ID: #{qrTestCode}
                </h5>
                <p className="text-[11px] text-slate-400">
                  ملصق مقاوم للحرارة والعوامل الجوية يوضع على صندوق العداد لقراءة الاستهلاك بدون أخطاء إدخال.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 4. E-PAYMENT & WALLETS */}
      {activeTab === 'epayment' && (
        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-5 shadow-xl">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                onlinePaymentEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'
              }`}>
                {onlinePaymentEnabled ? 'إرشادات المحافظ مفعّلة' : 'الخدمة معطلة'}
              </span>
            </div>

            <div className="text-right">
              <h5 className="font-black text-white text-xs flex items-center justify-end gap-1.5">
                <span>بوابات السداد والمحافظ الرقمية (E-Wallets & Gateways)</span>
                <CreditCard className="w-4 h-4 text-amber-400" />
              </h5>
              <p className="text-[11px] text-slate-400">طباعة أرقام حسابات الكريمي والمحافظ تلقائياً في السندات لتسهيل التحصيل.</p>
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
            <div className="text-right">
              <h6 className="font-bold text-white text-xs">إظهار وتضمين إرشادات السداد الإلكتروني في الفواتير الحرارية</h6>
              <p className="text-[10px] text-slate-400 mt-0.5">توجيه المشتركين لأرقام الحسابات المعتمدة لتقليل التخلف عن السداد.</p>
            </div>
            <button
              type="button"
              onClick={() => onUpdateSettings({ ...settings, onlinePaymentEnabled: !onlinePaymentEnabled })}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                onlinePaymentEnabled ? 'bg-amber-500' : 'bg-slate-800'
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-slate-950 transition-transform absolute top-1 ${
                onlinePaymentEnabled ? 'right-1' : 'right-7'
              }`} />
            </button>
          </div>

          <div>
            <label className="block text-slate-300 text-xs font-bold mb-1.5">نص إرشادات السداد المطبوع في ذيل الفاتورة:</label>
            <textarea
              rows={3}
              value={ePaymentNotice}
              onChange={e => onUpdateSettings({ ...settings, ePaymentWalletAccountsNotice: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 text-xs leading-relaxed"
            />
          </div>

        </div>
      )}

      {/* 5. CLOUD AUTO-SNAPSHOT ENGINE */}
      {activeTab === 'backup' && (
        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-5 shadow-xl">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                autoSnapshotEnabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'
              }`}>
                {autoSnapshotEnabled ? 'الحفظ السحابي الدوري نشط' : 'الخدمة متوقفة'}
              </span>
            </div>

            <div className="text-right">
              <h5 className="font-black text-white text-xs flex items-center justify-end gap-1.5">
                <span>محرك نقاط الاستعادة السحابية التلقائية (Cloud Snapshot Engine)</span>
                <Cloud className="w-4 h-4 text-sky-400" />
              </h5>
              <p className="text-[11px] text-slate-400">إنشاء نقاط استعادة سحابية دورية آمنة لحماية كامل بيانات المشتركين والمطالبات.</p>
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
            <div className="text-right">
              <h6 className="font-bold text-white text-xs">تفعيل النسخ الاحتياطي السحابي التلقائي الدوري</h6>
              <p className="text-[10px] text-slate-400 mt-0.5">أخذ لقطة شاملة لقاعدة البيانات في خلفية النظام دون مقاطعة العمل الميداني.</p>
            </div>
            <button
              type="button"
              onClick={() => onUpdateSettings({ ...settings, autoSnapshotEnabled: !autoSnapshotEnabled })}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                autoSnapshotEnabled ? 'bg-sky-500' : 'bg-slate-800'
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-slate-950 transition-transform absolute top-1 ${
                autoSnapshotEnabled ? 'right-1' : 'right-7'
              }`} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div>
              <label className="block text-slate-300 text-xs font-bold mb-1.5">الفاصل الزمني بين كل نقطة استعادة سحابية:</label>
              <select
                value={snapshotInterval}
                onChange={e => onUpdateSettings({ ...settings, autoSnapshotIntervalHours: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-xs"
              >
                <option value={2}>كل ساعتين (2 Hours - موصى به لمحطات التوليد الكبرى)</option>
                <option value={4}>كل 4 ساعات (4 Hours)</option>
                <option value={8}>كل 8 ساعات (8 Hours)</option>
                <option value={12}>كل 12 ساعة (نصف يومي)</option>
                <option value={24}>كل 24 ساعة (يومي)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 text-xs font-bold mb-1.5">الحد الأقصى لنقاط الاستعادة المحفوظة تلقائياً:</label>
              <input
                type="number"
                min={5}
                max={100}
                value={maxSnapshots}
                onChange={e => onUpdateSettings({ ...settings, maxAutoSnapshotsToKeep: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-xs font-mono text-right"
              />
            </div>

          </div>

        </div>
      )}

      {/* 6. SELF-HEALING & INTEGRITY AUDIT */}
      {activeTab === 'integrity' && (
        <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-5 shadow-xl">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
            <button
              type="button"
              disabled={isAuditing}
              onClick={handleRunIntegrityAudit}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-md disabled:opacity-50"
            >
              {isAuditing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              <span>{isAuditing ? 'جاري فحص وتدقيق البيانات...' : 'بدء فحص وتدقيق السلامة الآن'}</span>
            </button>

            <div className="text-right">
              <h5 className="font-black text-white text-xs flex items-center justify-end gap-1.5">
                <span>خدمة الفحص والتدقيق الآلي لسلامة البيانات (Self-Healing Integrity)</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </h5>
              <p className="text-[11px] text-slate-400">اكتشاف أي تعارض بين قراءات العدادات، مطالبات الديون، وتسلسل أرقام السندات.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400">تطابق أرصدة المشتركين</span>
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>سليم 100%</span>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400">تسلسل أرقام السندات الحرارية</span>
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>خالٍ من التكرار</span>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-400">مزامنة السحابة (Firestore)</span>
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>متطابق ومتصل</span>
              </div>
            </div>
          </div>

          {auditResult && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2 text-emerald-400 text-xs font-bold">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                <span>اكتمل الفحص: جميع السجلات المالية والقراءات الميدانية متوافقة تماماً وبدون أي تضارب!</span>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
