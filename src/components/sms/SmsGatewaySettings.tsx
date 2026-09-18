import React, { useState } from 'react';
import { motion } from 'motion/react';
import { SystemSettings, SmsGatewayConfig, User } from '../../types';
import { testSmsGatewayConnection } from '../../utils/smsService';
import {
  Cloud, Smartphone, ShieldCheck, CheckCircle2, AlertCircle,
  RefreshCw, Send, Sliders, Key, Globe, Zap, Settings,
  MessageSquare, ToggleLeft, ToggleRight, Info, Check, HelpCircle,
  Code, Terminal, Activity
} from 'lucide-react';

interface SmsGatewaySettingsProps {
  settings: SystemSettings;
  currentUser: User;
  onUpdateSettings: (settings: SystemSettings) => void;
  onAddAuditLog?: (log: any) => void;
}

const GATEWAY_PRESETS: { [key: string]: Partial<SmsGatewayConfig> } = {
  yemen_sms: {
    provider: 'yemen_sms',
    apiUrl: 'https://api.yemensms.com/api/send',
    httpMethod: 'POST',
    senderId: 'VOLTERA',
    customBodyTemplate: JSON.stringify({
      recipient: '{phone}',
      message: '{message}',
      sender: '{sender}'
    }, null, 2)
  },
  taqnyat: {
    provider: 'taqnyat',
    apiUrl: 'https://api.taqnyat.sa/v1/messages',
    httpMethod: 'POST',
    senderId: 'VOLTERA',
    customBodyTemplate: JSON.stringify({
      recipients: ['{phone}'],
      body: '{message}',
      sender: '{sender}'
    }, null, 2)
  },
  twilio: {
    provider: 'twilio',
    apiUrl: 'https://api.twilio.com/2010-04-01/Accounts/{ACCOUNT_SID}/Messages.json',
    httpMethod: 'POST',
    senderId: 'VOLTERA'
  },
  sms_misr: {
    provider: 'sms_misr',
    apiUrl: 'https://smsmisr.com/api/webapi',
    httpMethod: 'POST',
    senderId: 'VOLTERA'
  },
  custom: {
    provider: 'custom',
    apiUrl: 'https://api.your-sms-provider.com/v1/send',
    httpMethod: 'POST',
    senderId: 'VOLTERA',
    customBodyTemplate: JSON.stringify({
      phone: '{phone}',
      message: '{message}',
      sender: '{sender}'
    }, null, 2)
  }
};

export const SmsGatewaySettings: React.FC<SmsGatewaySettingsProps> = ({
  settings,
  currentUser,
  onUpdateSettings,
  onAddAuditLog
}) => {
  const currentConfig: SmsGatewayConfig = settings.smsGatewayConfig || {
    enabled: false,
    provider: 'android_native',
    apiUrl: '',
    httpMethod: 'POST',
    apiKey: '',
    senderId: 'VOLTERA',
    batchDelayMs: 1500,
    retryAttempts: 2
  };

  const [config, setConfig] = useState<SmsGatewayConfig>(currentConfig);
  const [autoReading, setAutoReading] = useState<boolean>(settings.autoSendReadingSms ?? true);
  const [autoPayment, setAutoPayment] = useState<boolean>(settings.autoSendPaymentSms ?? true);
  const [autoSmsMaster, setAutoSmsMaster] = useState<boolean>(settings.autoSmsEnabled ?? true);
  const [whatsappEnabled, setWhatsappEnabled] = useState<boolean>(settings.whatsappEnabled ?? true);

  // Tester State
  const [testPhone, setTestPhone] = useState<string>('777000000');
  const [testMessage, setTestMessage] = useState<string>('رسالة تجريبية لاختبار ربط بوابة SMS لنظام الفوترة والتوزيع الكهربائي ⚡');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleApplyPreset = (presetKey: string) => {
    const preset = GATEWAY_PRESETS[presetKey];
    if (preset) {
      setConfig(prev => ({
        ...prev,
        ...preset,
        provider: presetKey as any
      }));
    }
  };

  const handleSave = () => {
    const updatedSettings: SystemSettings = {
      ...settings,
      smsGatewayConfig: config,
      smsGatewayProvider: config.provider,
      autoSmsEnabled: autoSmsMaster,
      autoSendReadingSms: autoReading,
      autoSendPaymentSms: autoPayment,
      whatsappEnabled: whatsappEnabled,
      batchSmsIntervalMs: config.batchDelayMs || 1500
    };

    onUpdateSettings(updatedSettings);

    if (onAddAuditLog) {
      onAddAuditLog({
        id: `audit-${Date.now()}`,
        userId: currentUser.id,
        username: currentUser.name || currentUser.username,
        action: 'تحديث إعدادات بوابات SMS',
        details: `تم تحديث إعدادات بوابة الرسائل (${config.provider}) وحالة الإرسال الآلي.`,
        timestamp: new Date().toISOString().substring(0, 19).replace('T', ' ')
      });
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  const handleTestConnection = async () => {
    if (!testPhone.trim()) {
      alert('يرجى كتابة رقم هاتف تجريبي.');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await testSmsGatewayConnection(config, testPhone, testMessage);
      setTestResult(res);
    } catch (e: any) {
      setTestResult({
        success: false,
        message: `خطأ أثناء الاتصال: ${e.message || 'فشل الاتصال'}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6 text-right font-sans">
      {savedSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 p-3.5 rounded-xl text-xs flex items-center justify-between shadow-lg"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold">تم حفظ وتطبيق إعدادات بوابة SMS والإرسال الآلي بنجاح!</span>
          </div>
          <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-300 font-mono">
            تمت المزامنة
          </span>
        </motion.div>
      )}

      {/* Hero Overview */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                <Cloud className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-slate-100">
                إعدادات بوابات SMS والربط السحابي (SMS Gateway Integration)
              </h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              تتيح لك هذه اللوحة ربط النظام مع بوابات الرسائل القصيرة الدولية والمحلية (API Gateway) أو الاعتماد على جسر هواتف وأجهزة أندرويد المباشر (SIM Direct) لإرسال الفواتير والسندات في الخلفية تلقائياً.
            </p>
          </div>

          <button
            onClick={handleSave}
            className="w-full md:w-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 cursor-pointer shrink-0"
          >
            <Check className="w-4 h-4" />
            <span>حفظ وتطبيق الإعدادات</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Gateway Engine Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Provider Selector */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>طريقة وقناة الإرسال الرئيسية</span>
              </h3>
              <span className="text-[11px] text-slate-400">اختر المزود المناسب لتشغيل الرسائل</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Android Native SIM */}
              <label
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  config.provider === 'android_native'
                    ? 'bg-indigo-950/40 border-indigo-500/60 ring-1 ring-indigo-500/30'
                    : 'bg-slate-950 border-slate-800 hover:bg-slate-800/40'
                }`}
              >
                <input
                  type="radio"
                  name="sms_provider"
                  checked={config.provider === 'android_native'}
                  onChange={() => setConfig({ ...config, provider: 'android_native', enabled: true })}
                  className="mt-1 text-indigo-500 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-indigo-400" />
                    <span className="font-bold text-xs text-slate-200">جسر هواتف وأجهزة أندرويد (SIM)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    إرسال فوري ومجاني عبر شرائح الاتصال المحلية (Yemen Mobile / YOU / Sabafon) في الخلفية دون الحاجة لخدمات وسيطة أو اتصال إنترنت.
                  </p>
                </div>
              </label>

              {/* Option 2: Cloud REST API */}
              <label
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  config.provider !== 'android_native'
                    ? 'bg-amber-950/40 border-amber-500/60 ring-1 ring-amber-500/30'
                    : 'bg-slate-950 border-slate-800 hover:bg-slate-800/40'
                }`}
              >
                <input
                  type="radio"
                  name="sms_provider"
                  checked={config.provider !== 'android_native'}
                  onChange={() => setConfig({ ...config, provider: 'custom', enabled: true })}
                  className="mt-1 text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-xs text-slate-200">بوابة رسائل سحابية (Cloud API)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    الربط مع بوابات SMS ومزودي الخدمة عبر واجهات HTTP REST API باسم مرسل رسمي معتمد للمحطة.
                  </p>
                </div>
              </label>
            </div>

            {/* Cloud Gateway Specific Details if Selected */}
            {config.provider !== 'android_native' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 pt-3 border-t border-slate-800"
              >
                {/* Presets Bar */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400">قوالب وإعدادات المزودين الشائعين (Presets):</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('yemen_sms')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        config.provider === 'yemen_sms'
                          ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      Yemen SMS
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('taqnyat')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        config.provider === 'taqnyat'
                          ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      Taqnyat (تقنيات)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('twilio')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        config.provider === 'twilio'
                          ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      Twilio
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('sms_misr')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        config.provider === 'sms_misr'
                          ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      SMS Misr
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('custom')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        config.provider === 'custom'
                          ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      بوابة مخصصة (Custom API)
                    </button>
                  </div>
                </div>

                {/* API Endpoint & Method */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-sky-400" />
                      <span>رابط بوابة الرسائل (API URL Endpoint):</span>
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={config.apiUrl || ''}
                      onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
                      placeholder="https://api.sms-provider.com/v1/send"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-sky-300 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">طريقة الطلب (Method):</label>
                    <select
                      value={config.httpMethod || 'POST'}
                      onChange={(e) => setConfig({ ...config, httpMethod: e.target.value as 'POST' | 'GET' })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                    >
                      <option value="POST">POST</option>
                      <option value="GET">GET</option>
                    </select>
                  </div>
                </div>

                {/* Sender ID & API Key */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span>اسم المرسل المعتمد (Sender ID):</span>
                    </label>
                    <input
                      type="text"
                      value={config.senderId || ''}
                      onChange={(e) => setConfig({ ...config, senderId: e.target.value })}
                      placeholder="مثال: VOLTERA أو اسم المحطة"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      <span>مفتاح API أو رمز Bearer Token:</span>
                    </label>
                    <input
                      type="password"
                      dir="ltr"
                      value={config.bearerToken || config.apiKey || ''}
                      onChange={(e) => setConfig({ ...config, bearerToken: e.target.value, apiKey: e.target.value })}
                      placeholder="sk_live_..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Custom Body Payload Template */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5 text-indigo-400" />
                      <span>قالب حمولة الطلب (JSON Request Body Template):</span>
                    </label>
                    <span className="text-[10px] text-slate-500">المتغيرات المتاحة: {`{phone}, {message}, {sender}`}</span>
                  </div>
                  <textarea
                    rows={4}
                    dir="ltr"
                    value={config.customBodyTemplate || ''}
                    onChange={(e) => setConfig({ ...config, customBodyTemplate: e.target.value })}
                    placeholder={`{\n  "recipient": "{phone}",\n  "text": "{message}",\n  "sender": "{sender}"\n}`}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-emerald-300 font-mono focus:outline-none focus:border-amber-500 leading-relaxed"
                  />
                </div>
              </motion.div>
            )}
          </div>

          {/* Test Gateway Connection Widget */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>فحص واختبار الاتصال المباشر بالبوابة (Live Tester)</span>
              </h3>
              <span className="text-[11px] text-slate-400">إرسال رسالة حية تجريبية للتحقق</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">رقم الهاتف للتجربة:</label>
                <input
                  type="text"
                  dir="ltr"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="777123456"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-slate-300">نص الرسالة التجريبية:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <Send className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>{isTesting ? 'جاري الفحص...' : 'إرسال الفحص'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Test Result Box */}
            {testResult && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                  testResult.success
                    ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/80 border-rose-500/40 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
                  <span>{testResult.message}</span>
                </div>
                {testResult.details && (
                  <pre dir="ltr" className="bg-slate-950 p-2.5 rounded-lg text-[11px] font-mono overflow-x-auto text-slate-300 border border-slate-800">
                    {typeof testResult.details === 'object' ? JSON.stringify(testResult.details, null, 2) : testResult.details}
                  </pre>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Automated Triggers & Timing */}
        <div className="space-y-6">
          {/* Auto-SMS Master Triggers */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>مشغلات الإرسال الآلي (Auto-Triggers)</span>
              </h3>
            </div>

            <div className="space-y-3">
              {/* Master Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">تفعيل الإرسال التلقائي العام</h4>
                  <p className="text-[10px] text-slate-500">تمكين النظام من إطلاق الرسائل آلياً</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoSmsMaster(!autoSmsMaster)}
                  className="cursor-pointer"
                >
                  {autoSmsMaster ? (
                    <ToggleRight className="w-7 h-7 text-amber-400" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-slate-600" />
                  )}
                </button>
              </div>

              {/* Auto Reading Invoice */}
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                <div>
                  <h4 className="text-xs font-bold text-amber-300">إشعار الفاتورة عند تسجيل القراءة</h4>
                  <p className="text-[10px] text-slate-500">إرسال SMS فور حفظ وترحيل قراءة العداد</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoReading(!autoReading)}
                  disabled={!autoSmsMaster}
                  className="cursor-pointer disabled:opacity-30"
                >
                  {autoReading && autoSmsMaster ? (
                    <ToggleRight className="w-7 h-7 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-slate-600" />
                  )}
                </button>
              </div>

              {/* Auto Payment Receipt */}
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                <div>
                  <h4 className="text-xs font-bold text-emerald-300">إشعار سند القبض عند السداد</h4>
                  <p className="text-[10px] text-slate-500">إرسال SMS فور تسجيل سند القبض والتحصيل</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoPayment(!autoPayment)}
                  disabled={!autoSmsMaster}
                  className="cursor-pointer disabled:opacity-30"
                >
                  {autoPayment && autoSmsMaster ? (
                    <ToggleRight className="w-7 h-7 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-slate-600" />
                  )}
                </button>
              </div>

              {/* WhatsApp Quick Links */}
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                <div>
                  <h4 className="text-xs font-bold text-sky-300">روابط واتساب المباشرة</h4>
                  <p className="text-[10px] text-slate-500">إظهار أزرار المحادثة الفورية مع المشترك</p>
                </div>
                <button
                  type="button"
                  onClick={() => setWhatsappEnabled(!whatsappEnabled)}
                  className="cursor-pointer"
                >
                  {whatsappEnabled ? (
                    <ToggleRight className="w-7 h-7 text-sky-400" />
                  ) : (
                    <ToggleLeft className="w-7 h-7 text-slate-600" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Sequential Batch Timing */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Settings className="w-4 h-4 text-amber-400" />
              <span>الفاصل الزمني للبث المتسلسل</span>
            </h3>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>تأخير بين كل رسالة وأخرى:</span>
                <span className="font-bold text-amber-400 font-mono">{(config.batchDelayMs || 1500) / 1000} ثانية</span>
              </div>
              <input
                type="range"
                min="500"
                max="5000"
                step="250"
                value={config.batchDelayMs || 1500}
                onChange={(e) => setConfig({ ...config, batchDelayMs: parseInt(e.target.value) })}
                className="w-full accent-amber-500 bg-slate-950 h-2 rounded-lg cursor-pointer"
              />
              <p className="text-[10px] text-slate-500 leading-normal">
                يوصى بفاصل لا يقل عن 1.5 ثانية عند البث الجماعي لتفادي قيود الحظر العشوائي من شركات الاتصالات المحلية.
              </p>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs space-y-2 text-slate-400">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Info className="w-4 h-4" />
              <span>ملاحظة فنية هامة</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              إذا كان التطبيق يعمل داخل تطبيق أندرويد الهجين (WebView/Capacitor)، سيعمل الإرسال عبر شرائح SIM مباشرة دون أي تكاليف أو وسيط، مع الحفاظ على بقاء المستخدم داخل النظام دون أي تبديل شاشات.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
