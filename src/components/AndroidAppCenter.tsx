import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Download,
  Copy,
  ExternalLink,
  Code2,
  Terminal,
  Layers,
  Send,
  Printer,
  WifiOff,
  Camera,
  ShieldCheck,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
  FileCode
} from 'lucide-react';
import { sendSMSDirectly } from '../utils/smsService';

interface AndroidAppCenterProps {
  onClose?: () => void;
}

export const AndroidAppCenter: React.FC<AndroidAppCenterProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'build_guide' | 'native_bridge' | 'source_code'>('overview');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState('770000000');
  const [testMessage, setTestMessage] = useState('تجربة إرسال رسالة نصية SMS من تطبيق فولترا أندرويد Native Bridge');
  const [testStatus, setTestStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [isTestingSms, setIsTestingSms] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('cap_cli');

  // Detect current running runtime
  const [runtimeStatus, setRuntimeStatus] = useState({
    isNativeAndroid: false,
    hasAndroidBridge: false,
    hasCapacitor: false,
    isMobileBrowser: false,
    userAgent: ''
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasBridge = !!(window.AndroidSMS || window.Android);
      const isNative = !!(window.Android?.sendSMS || window.AndroidSMS?.sendSMS);
      const hasCap = !!(window as any).Capacitor?.isNativePlatform?.();
      const ua = navigator.userAgent || '';
      const isMobile = /android|iphone|ipad|ipod/i.test(ua);

      setRuntimeStatus({
        isNativeAndroid: isNative,
        hasAndroidBridge: hasBridge,
        hasCapacitor: hasCap,
        isMobileBrowser: isMobile,
        userAgent: ua
      });
    }
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleTestSms = async () => {
    if (!testPhone) return;
    setIsTestingSms(true);
    setTestStatus(null);
    try {
      const res = await sendSMSDirectly(testPhone, testMessage);
      setTestStatus({
        success: res.success,
        message: res.message
      });
    } catch (err: any) {
      setTestStatus({
        success: false,
        message: err.message || 'تعذر الإرسال عبر جسر الأندرويد'
      });
    } finally {
      setIsTestingSms(false);
    }
  };

  return (
    <div className="space-y-6 dir-rtl text-right">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950/40 border border-slate-700/70 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10">
              <Smartphone className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-white">تطبيق أندرويد المدمج (Android WebView & Capacitor)</h2>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Ready APK Suite
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                مشروع أندرويد أصلي متكامل (Native Android / Capacitor) مهيأ بكافة الصلاحيات والجسور البرمجية للعمل في الميدان للمحصلين مع دعم الإرسال المباشر لرسائل SMS والطباعة الحرارية والعمل بدون إنترنت.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
              runtimeStatus.isNativeAndroid || runtimeStatus.hasCapacitor
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                runtimeStatus.isNativeAndroid || runtimeStatus.hasCapacitor ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`} />
              <span>
                {runtimeStatus.isNativeAndroid
                  ? 'يعمل داخل تطبيق الأندرويد (Bridge Active)'
                  : runtimeStatus.hasCapacitor
                  ? 'يعمل داخل Capacitor Native'
                  : 'متصفح ويب (Web Browser)'}
              </span>
            </div>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-700/50 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>نظرة عامة والميزات الميدانية</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('build_guide')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'build_guide'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>دليل إنشاء ملف APK خطوة بخطوة</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('native_bridge')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'native_bridge'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>فحص جسر الأجهزة والـ SMS</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('source_code')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'source_code'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>ملفات الأكواد والمشروع الأصلي</span>
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Key Advantages Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-amber-500/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3">
                <Send className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">إرسال SMS تلقائي بالخلفية</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                إرسال فوري ومجاني لرسائل الفواتير والسندات عبر شريحة جوال المحصل (SIM) دون مغادرة شاشة النظام.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-emerald-500/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                <WifiOff className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">العمل دون إنترنت (Offline Mode)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                تسجيل القراءات وسندات القبض في الحارات والسراديب المعزولة مع الحفظ المحلي والمزامنة التلقائية عند الاتصال.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-blue-500/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3">
                <Printer className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">طباعة الفواتير بالبلوتوث</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                توافق مباشر مع الطابعات الحرارية المحمولة (ESC/POS Bluetooth & USB) لطباعة الفواتير والإيصالات فورياً.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-purple-500/40 transition-all">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-3">
                <Camera className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">توثيق العدادات بالصور والموقع</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                التقاط صور عدادات المشتركين وحفظ الإحداثيات الجغرافية (GPS) للعدادات لمنع التلاعب وتسهيل المراجعة.
              </p>
            </div>
          </div>

          {/* Architecture Details Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <span>هيكلية التطبيق ومكونات حزمة الأندرويد</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                <h4 className="text-xs font-bold text-amber-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>1. وضع Capacitor Native:</span>
                </h4>
                <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                  <li>معرف التطبيق (Package ID): <code className="font-mono text-amber-300 bg-slate-900 px-1.5 py-0.5 rounded">com.voltra.commercialelectricity</code></li>
                  <li>المجلد المستهدف: <code className="font-mono text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded">android/</code></li>
                  <li>تضمين كامل لمكتبات أندرويد 34 مع دعم AndroidX و Material Design 3.</li>
                  <li>إدارة الإشعارات وشاشات البداية Splash Screen الرسمية.</li>
                </ul>
              </div>

              <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>2. وضع Standalone Native WebView Bridge:</span>
                </h4>
                <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                  <li>جسر جافا المباشر: <code className="font-mono text-emerald-300 bg-slate-900 px-1.5 py-0.5 rounded">@JavascriptInterface AndroidSMS</code></li>
                  <li>إرسال الرسائل عبر <code className="font-mono text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded">SmsManager.sendMultipartTextMessage</code></li>
                  <li>دعم كامل لرفع الصور والمستندات عبر <code className="font-mono text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded">WebChromeClient.onShowFileChooser</code></li>
                  <li>تحكم كامل في زر الرجوع وتحديث الصفحة بالسحب (Swipe-to-Refresh).</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 2: BUILD GUIDE */}
      {activeTab === 'build_guide' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Method 1: Capacitor CLI */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedSection(expandedSection === 'cap_cli' ? null : 'cap_cli')}
              className="w-full p-5 text-right flex items-center justify-between hover:bg-slate-800/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-xs">
                  01
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">الطريقة الأولى: التوليد والتشغيل السريع عبر Capacitor CLI</h3>
                  <p className="text-xs text-slate-400">الطريقة القياسية الموصى بها لتحديث ملفات الويب ومزامنتها مع أندرويد</p>
                </div>
              </div>
              {expandedSection === 'cap_cli' ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>

            {expandedSection === 'cap_cli' && (
              <div className="p-5 pt-0 border-t border-slate-800/80 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>1. بناء حزمة الويب وتحديث مجلد الأندرويد:</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('npm run build && npx cap sync android', 'cmd1')}
                      className="text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-bold"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedCode === 'cmd1' ? 'تم النسخ!' : 'نسخ الأمر'}</span>
                    </button>
                  </div>
                  <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono text-amber-300 overflow-x-auto text-left dir-ltr">
                    npm run build && npx cap sync android
                  </pre>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>2. فتح المشروع داخل Android Studio:</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('npx cap open android', 'cmd2')}
                      className="text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-bold"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedCode === 'cmd2' ? 'تم النسخ!' : 'نسخ الأمر'}</span>
                    </button>
                  </div>
                  <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono text-amber-300 overflow-x-auto text-left dir-ltr">
                    npx cap open android
                  </pre>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>3. استخراج ملف APK الجاهز للتثبيت (Debug APK) مباشرة عبر السطر:</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('cd android && ./gradlew assembleDebug', 'cmd3')}
                      className="text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer font-bold"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedCode === 'cmd3' ? 'تم النسخ!' : 'نسخ الأمر'}</span>
                    </button>
                  </div>
                  <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto text-left dir-ltr">
                    cd android && ./gradlew assembleDebug
                  </pre>
                  <p className="text-[11px] text-slate-400 mt-1">
                    📍 تجد ملف APK الناتج في المسار: <code className="font-mono text-amber-400">android/app/build/outputs/apk/debug/app-debug.apk</code>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Method 2: Direct Android Studio Project */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedSection(expandedSection === 'as_direct' ? null : 'as_direct')}
              className="w-full p-5 text-right flex items-center justify-between hover:bg-slate-800/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-xs">
                  02
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">الطريقة الثانية: فتح مجلد android/ مباشرة في Android Studio</h3>
                  <p className="text-xs text-slate-400">مناسبة لإنشاء ملف APK موقع (Signed Release APK) للنشر على الهواتف</p>
                </div>
              </div>
              {expandedSection === 'as_direct' ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>

            {expandedSection === 'as_direct' && (
              <div className="p-5 pt-0 border-t border-slate-800/80 space-y-3 text-xs text-slate-300">
                <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-amber-400">1.</span>
                    <span>افتح برنامج <strong>Android Studio</strong> واختر <strong>Open Existing Project</strong> ثم حدد مجلد <code className="text-amber-300">android</code> من جذر المشروع.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-amber-400">2.</span>
                    <span>انتظر اكتمال مزامنة Gradle Sync لعدة ثوانٍ.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-amber-400">3.</span>
                    <span>من القائمة العلوية اضغط على <strong>Build</strong> ثم <strong>Build Bundle(s) / APK(s)</strong> ثم <strong>Build APK(s)</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-amber-400">4.</span>
                    <span>اضغط على رابط <strong>locate</strong> الظاهر في الإشعار لفتح مجلد ملف الـ APK وتثبيته مباشرة على هواتف المحصلين عبر كابل USB أو الواتساب.</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* TAB 3: NATIVE BRIDGE TESTER */}
      {activeTab === 'native_bridge' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <span>فحص واختبار جسر إرسال الـ SMS الأصلي (Android Native SMS Bridge)</span>
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              يمكنك من هذه الشاشة تجربة إرسال رسالة نصية SMS مباشرة إلى أي رقم لفحص استجابة واجهة الأندرويد الأصلية.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">رقم هاتف المستلم (للتجربة):</label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="مثال: 770000000"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-hidden focus:border-amber-500"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">نص الرسالة التجريبية:</label>
                <input
                  type="text"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={handleTestSms}
                disabled={isTestingSms || !testPhone}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
              >
                <Send className={`w-4 h-4 ${isTestingSms ? 'animate-spin' : ''}`} />
                <span>{isTestingSms ? 'جاري إرسال التجربة...' : 'إرسال تجربة الآن'}</span>
              </button>
            </div>

            {testStatus && (
              <div className={`mt-4 p-4 rounded-xl border text-xs leading-relaxed flex items-center gap-3 ${
                testStatus.success
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                  : 'bg-amber-950/40 border-amber-800 text-amber-300'
              }`}>
                {testStatus.success ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" /> : <Info className="w-5 h-5 shrink-0 text-amber-400" />}
                <span>{testStatus.message}</span>
              </div>
            )}
          </div>

          {/* Diagnostic Info */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <h4 className="text-xs font-bold text-slate-300 mb-3">معلومات البيئة الحالية المكتشفة في المتصفح:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                <span className="text-slate-400 block text-[11px]">جسر أندرويد (AndroidSMS):</span>
                <span className={`font-bold font-mono ${runtimeStatus.hasAndroidBridge ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {runtimeStatus.hasAndroidBridge ? 'متصل (Available)' : 'غير متصل (Browser)'}
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                <span className="text-slate-400 block text-[11px]">محرك Capacitor:</span>
                <span className={`font-bold font-mono ${runtimeStatus.hasCapacitor ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {runtimeStatus.hasCapacitor ? 'مفعل (Capacitor Native)' : 'غير مفعل (Web)'}
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                <span className="text-slate-400 block text-[11px]">نوع الجهاز:</span>
                <span className="font-bold text-amber-300">
                  {runtimeStatus.isMobileBrowser ? 'هاتف ذكي (Mobile)' : 'كمبيوتر مكتبي (Desktop)'}
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                <span className="text-slate-400 block text-[11px]">حالة الصلاحيات التلقائية:</span>
                <span className="font-bold text-slate-300">
                  SEND_SMS, GPS, Storage
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* TAB 4: SOURCE CODE FILES */}
      {activeTab === 'source_code' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">ملفات كود تطبيق الأندرويد الأصلي المهيأة في المشروع:</h3>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white font-mono">android/app/src/main/java/.../MainActivity.java</div>
                  <div className="text-slate-400 text-[11px]">كلاس النشاط الرئيسي مع جسر الرسائل والـ WebView</div>
                </div>
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded">جاهز</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white font-mono">android/app/src/main/AndroidManifest.xml</div>
                  <div className="text-slate-400 text-[11px]">تصريحات الصلاحيات وإعدادات تشغيل التطبيق</div>
                </div>
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded">جاهز</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white font-mono">capacitor.config.ts</div>
                  <div className="text-slate-400 text-[11px]">إعدادات Capacitor و Scheme ومزامنة الأصول</div>
                </div>
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded">جاهز</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white font-mono">android/app/build.gradle</div>
                  <div className="text-slate-400 text-[11px]">إعدادات البناء وإصدار SDK 34 والتبعيات</div>
                </div>
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded">جاهز</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
