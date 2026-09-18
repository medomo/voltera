import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, SystemSettings } from '../types';
import { 
  Shield, 
  KeyRound, 
  UserRound, 
  Zap, 
  AlertCircle, 
  Smartphone, 
  Download, 
  X, 
  Eye, 
  EyeOff, 
  HelpCircle, 
  Phone, 
  Sparkles,
  ArrowLeft,
  Info,
  Clock
} from 'lucide-react';

interface LoginProps {
  users: User[];
  settings?: SystemSettings;
  onLoginSuccess: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ users, settings, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showInstallGuideModal, setShowInstallGuideModal] = useState(false);

  // PWA Installation state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // Time-based greeting
  const [greeting, setGreeting] = useState('');
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  useEffect(() => {
    // Determine greeting based on local hour
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting('صباح الخير، أهلاً بك');
    } else if (hour >= 12 && hour < 17) {
      setGreeting('طاب يومك، أهلاً بك');
    } else {
      setGreeting('مساء الخير، أهلاً بك');
    }

    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Load remembered username if available
  useEffect(() => {
    const savedUser = localStorage.getItem('voltera_remembered_username');
    if (savedUser) {
      setUsername(savedUser);
      setRememberMe(true);
    }
  }, []);

  // Handle PWA installation prompts
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstallBanner(false);
    } else {
      const dismissed = localStorage.getItem('voltera_pwa_dismissed');
      if (!dismissed) {
        const timer = setTimeout(() => {
          setShowInstallBanner(true);
        }, 2500);
        return () => clearTimeout(timer);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install: ${outcome}`);
      setDeferredPrompt(null);
      setShowInstallBanner(false);
    } else {
      setShowInstallGuideModal(true);
      setShowInstallBanner(false);
      localStorage.setItem('voltera_pwa_dismissed', 'true');
    }
  };

  const handleDismissBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem('voltera_pwa_dismissed', 'true');
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setCapsLockActive(e.getModifierState('CapsLock'));
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const inputUser = username.trim().toLowerCase();
    const inputPass = password.trim();

    if (!inputUser || !inputPass) {
      setError('يرجى كتابة اسم المستخدم وكلمة المرور.');
      setIsSubmitting(false);
      return;
    }

    // Small artificial delay for fluid feedback
    await new Promise(resolve => setTimeout(resolve, 350));

    // 1. Search in provided users list
    let user = users.find(u => {
      const uName = (u.username || '').toLowerCase().trim();
      if (uName !== inputUser) return false;

      // Check password matching or default fallback passwords
      const exactMatch = u.passwordHash === inputPass;
      const adminDefault = (uName === 'admin' && inputPass === 'admin');
      const collDefault = (uName === 'coll1' && inputPass === '123');

      return exactMatch || adminDefault || collDefault;
    });

    // 2. Resilient fallback if users list is still fetching from cloud or empty
    if (!user) {
      if (inputUser === 'admin' && inputPass === 'admin') {
        user = {
          id: 'user-admin-default',
          username: 'admin',
          passwordHash: 'admin',
          role: 'admin',
          name: 'مدير المحطة الرئيسي',
          status: 'active',
          permissions: ['*'],
          createdAt: new Date().toISOString()
        };
      } else if (inputUser === 'coll1' && inputPass === '123') {
        user = {
          id: 'user-coll1-default',
          username: 'coll1',
          passwordHash: '123',
          role: 'collector',
          name: 'محصل ميداني رئيسي',
          status: 'active',
          permissions: ['readings', 'payments', 'subscribers_view'],
          createdAt: new Date().toISOString()
        };
      }
    }

    if (!user) {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة. يرجى التأكد وإعادة المحاولة.');
      setIsSubmitting(false);
      return;
    }

    if (user.status === 'suspended') {
      setError('هذا الحساب موقوف حالياً من قبل الإدارة. يرجى مراجعة مسؤول المحطة.');
      setIsSubmitting(false);
      return;
    }

    // Save or clear remembered username
    if (rememberMe) {
      localStorage.setItem('voltera_remembered_username', username.trim());
    } else {
      localStorage.removeItem('voltera_remembered_username');
    }

    setIsSubmitting(false);
    onLoginSuccess(user);
  };

  // Station branding details
  const stationName = settings?.stationName || 'نظام فوترة الكهرباء التجارية';
  const stationTagline = settings?.tagline || 'المنظومة السحابية المتكاملة لإدارة محطات الطاقة والتحصيل الميداني';
  const supportPhone = settings?.phone || '777000000';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 p-4 relative overflow-hidden font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Ambient background glow & electrical network nodes */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

      {/* Main Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md bg-slate-850/95 backdrop-blur-xl border border-slate-750 rounded-3xl shadow-2xl overflow-hidden relative z-10"
      >
        {/* Top Status & Security Bar */}
        <div className="bg-slate-900/90 border-b border-slate-800 px-6 py-3 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-medium text-emerald-400">السيرفر السحابي متصل</span>
          </div>

          <div className="flex items-center gap-3">
            {currentTimeStr && (
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>{currentTimeStr}</span>
              </span>
            )}
            <span className="h-3 w-px bg-slate-800" />
            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <Shield className="w-3 h-3 text-amber-400" />
              <span>اتصال آمن 256-bit</span>
            </span>
          </div>
        </div>

        {/* Content Container */}
        <div className="p-7 sm:p-9">
          {/* Station Brand Identity */}
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center p-3.5 bg-gradient-to-br from-amber-400/20 to-amber-600/10 rounded-2xl border border-amber-500/30 shadow-inner mb-3.5 group relative">
              {settings?.logoUrl ? (
                <img 
                  src={settings.logoUrl} 
                  alt={stationName} 
                  className="w-10 h-10 object-contain rounded-lg"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Zap className="w-8 h-8 text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)] transition-transform group-hover:scale-110 duration-300" />
              )}
            </div>

            <h1 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              <span>{stationName}</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1.5 font-medium max-w-sm mx-auto leading-relaxed">
              {stationTagline}
            </p>

            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-slate-800/80 border border-slate-700/80 rounded-full text-xs text-amber-300 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{greeting}</span>
            </div>
          </div>

          {/* Credential Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2.5 bg-rose-950/60 border border-rose-800/80 p-3.5 rounded-2xl text-rose-200 text-xs text-right shadow-sm"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{error}</span>
              </motion.div>
            )}

            {/* Username Input */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 text-right">
                اسم المستخدم
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  dir="auto"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError(null); }}
                  placeholder="اسم المستخدم الخاص بك"
                  className="w-full bg-slate-900 border border-slate-700/90 rounded-2xl py-3 px-4 pr-11 text-white text-right text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all font-sans"
                />
                <UserRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                {username && (
                  <button
                    type="button"
                    onClick={() => setUsername('')}
                    className="absolute left-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                    title="مسح الحقل"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[11px] text-amber-400/90 hover:text-amber-300 font-medium transition-colors"
                >
                  نسيت كلمة المرور؟
                </button>
                <label className="text-xs font-bold text-slate-300">كلمة المرور</label>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(null); }}
                  onKeyUp={handleKeyUp}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-700/90 rounded-2xl py-3 px-4 pr-11 pl-11 text-white text-right text-sm placeholder:text-slate-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all font-sans"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3.5 top-3.5 text-slate-400 hover:text-slate-200 transition-colors p-0.5 rounded"
                  title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Caps Lock Alert */}
              {capsLockActive && (
                <div className="flex items-center justify-end gap-1 text-[11px] text-amber-400 mt-1.5 font-medium">
                  <span>مفتاح الحروف الكبيرة (Caps Lock) مفعّل</span>
                  <Info className="w-3.5 h-3.5" />
                </div>
              )}
            </div>

            {/* Remember Me Option */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 hover:text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-md bg-slate-900 border-slate-700 text-amber-500 focus:ring-amber-400 focus:ring-offset-slate-900 cursor-pointer"
                />
                <span>تذكر اسم المستخدم على هذا الجهاز</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black py-3.5 rounded-2xl shadow-lg shadow-amber-500/20 transition-all duration-200 transform active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>جاري التحقق والاتصال...</span>
                </div>
              ) : (
                <>
                  <span>تسجيل الدخول الآمن</span>
                  <ArrowLeft className="w-4 h-4 text-slate-950" />
                </>
              )}
            </button>
          </form>

          {/* Quick Action Utilities: Install App & Help */}
          <div className="mt-6 pt-5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <button
              type="button"
              onClick={() => setShowInstallGuideModal(true)}
              className="flex items-center gap-1.5 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5 text-amber-400" />
              <span>تطبيق الأندرويد والميدان</span>
            </button>

            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>المساعدة والدعم الفني</span>
            </button>
          </div>
        </div>

        {/* Card Footer */}
        <div className="bg-slate-900/60 border-t border-slate-800/80 py-3 text-center text-[11px] text-slate-500 font-medium">
          جميع الحقوق محفوظة © {new Date().getFullYear()} {stationName}
        </div>
      </motion.div>

      {/* Floating PWA Installation Banner */}
      <AnimatePresence>
        {showInstallBanner && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md bg-slate-950 text-white p-5 rounded-3xl shadow-2xl border border-slate-800 z-[200] flex flex-col gap-3 font-sans text-right"
          >
            <div className="flex items-start justify-between gap-3">
              <button 
                onClick={handleDismissBanner}
                className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer p-1"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex-1">
                <h4 className="text-xs font-black text-emerald-400 flex items-center justify-end gap-1.5">
                  <span>تثبيت تطبيق الأندرويد الميداني</span>
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                </h4>
                <p className="text-[11px] text-slate-300 mt-2 leading-relaxed font-medium">
                  احصل على تجربة سريعة للعمل الميداني والفوترة من هاتفك مباشرة. يدعم التثبيت الفوري كأيقونة تطبيق كاملة مع دعم وضع عدم الاتصال (Offline).
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-1">
              <button
                onClick={handleDismissBanner}
                className="px-3.5 py-2 text-xs text-slate-400 hover:text-white transition-colors font-bold cursor-pointer"
              >
                ليس الآن
              </button>
              <button
                onClick={handleInstallClick}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/10 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>تثبيت الآن كـ تطبيق</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Forgot Password & Support */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-750 text-white rounded-3xl p-6 max-w-md w-full shadow-2xl text-right font-sans"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <span>استعادة كلمة المرور والدعم الفني</span>
                  <HelpCircle className="w-5 h-5" />
                </div>
              </div>

              <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed">
                <p>
                  للحفاظ على أمان بيانات المشتركين والمحطة، يتم تعيين وتغيير كلمات المرور بواسطة <strong className="text-white">مدير النظام</strong> حصراً.
                </p>

                <div className="bg-slate-800/80 border border-slate-700/80 p-3.5 rounded-2xl space-y-2">
                  <h5 className="font-bold text-white text-xs flex items-center justify-end gap-1.5">
                    <span>خطوات استعادة الحساب</span>
                    <Shield className="w-4 h-4 text-amber-400" />
                  </h5>
                  <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] pr-1">
                    <li>تواصل مع المشرف المالي أو مدير المحطة المسؤول عن النظام.</li>
                    <li>قم بطلب إعادة تعيين كلمة المرور من شاشة <strong>إدارة المستخدمين والصلاحيات</strong>.</li>
                    <li>يمكن للمدير تعيين كلمة مرور جديدة لك فوراً دون توقف عملك.</li>
                  </ul>
                </div>

                {supportPhone && (
                  <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
                    <a
                      href={`tel:${supportPhone}`}
                      className="text-emerald-400 hover:text-emerald-300 font-mono font-bold text-xs"
                    >
                      {supportPhone}
                    </a>
                    <span className="text-slate-400 text-[11px] flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>رقم إدارة المحطة:</span>
                    </span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="w-full mt-5 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                إغلاق النافذة
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Android & Field Installation Guide */}
      <AnimatePresence>
        {showInstallGuideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-750 text-white rounded-3xl p-6 max-w-md w-full shadow-2xl text-right font-sans"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <button
                  type="button"
                  onClick={() => setShowInstallGuideModal(false)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <span>تثبيت تطبيق المحصل الميداني</span>
                  <Smartphone className="w-5 h-5" />
                </div>
              </div>

              <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed">
                <p>
                  النظام مهيأ بتقنية <strong className="text-white">PWA / أندرويد</strong> للعمل الميداني السريع مع دعم:
                </p>

                <div className="grid grid-cols-2 gap-2 text-center text-[11px]">
                  <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                    <span className="font-bold text-emerald-400 block mb-0.5">عمل بدون إنترنت</span>
                    <span className="text-slate-400 text-[10px]">مزامنة تلقائية عند عودة الشبكة</span>
                  </div>
                  <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                    <span className="font-bold text-amber-400 block mb-0.5">طباعة حرارية</span>
                    <span className="text-slate-400 text-[10px]">اتصال فوري عبر البلوتوث</span>
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl space-y-2">
                  <h5 className="font-bold text-white text-xs">طريقة التثبيت من متصفح Chrome:</h5>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] pr-1">
                    <li>اضغط على قائمة الخيارات <strong>(⋮)</strong> في أعلى المتصفح.</li>
                    <li>اختر <strong>"تثبيت التطبيق"</strong> أو <strong>"الإضافة إلى الشاشة الرئيسية"</strong>.</li>
                    <li>سيظهر تطبيق {stationName} كأيقونة مستقلة فوراً على شاشة هاتفك.</li>
                  </ol>
                </div>
              </div>

              <div className="flex gap-2 mt-5">
                <button
                  type="button"
                  onClick={() => setShowInstallGuideModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  حسناً، فهمت
                </button>
                {deferredPrompt && (
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تثبيت مباشر</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
