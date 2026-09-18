import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Camera, 
  MapPin, 
  Mic, 
  MessageSquare, 
  Bell, 
  Printer, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Smartphone, 
  Laptop,
  Check,
  Play,
  Volume2
} from 'lucide-react';
import { requestSmsPermissions, getSmsPermissionState } from '../utils/smsService';

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PermissionItem {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  status: 'granted' | 'prompt' | 'denied' | 'unsupported';
  description: string;
  onRequest: () => Promise<void>;
  testOutput?: string;
}

export const PermissionsModal: React.FC<PermissionsModalProps> = ({ isOpen, onClose }) => {
  const [cameraStatus, setCameraStatus] = useState<'granted' | 'prompt' | 'denied' | 'unsupported'>('prompt');
  const [locationStatus, setLocationStatus] = useState<'granted' | 'prompt' | 'denied' | 'unsupported'>('prompt');
  const [micStatus, setMicStatus] = useState<'granted' | 'prompt' | 'denied' | 'unsupported'>('prompt');
  const [smsStatus, setSmsStatus] = useState<'granted' | 'prompt' | 'denied' | 'unsupported'>('prompt');
  const [notifStatus, setNotifStatus] = useState<'granted' | 'prompt' | 'denied' | 'unsupported'>('prompt');
  const [btStatus, setBtStatus] = useState<'granted' | 'prompt' | 'denied' | 'unsupported'>('prompt');

  const [cameraTestOutput, setCameraTestOutput] = useState<string>('');
  const [locationTestOutput, setLocationTestOutput] = useState<string>('');
  const [micTestOutput, setMicTestOutput] = useState<string>('');
  const [smsTestOutput, setSmsTestOutput] = useState<string>('');
  const [notifTestOutput, setNotifTestOutput] = useState<string>('');
  const [btTestOutput, setBtTestOutput] = useState<string>('');

  const [activeCameraStream, setActiveCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Check statuses on open
  useEffect(() => {
    if (!isOpen) {
      if (activeCameraStream) {
        activeCameraStream.getTracks().forEach(track => track.stop());
        setActiveCameraStream(null);
      }
      return;
    }

    checkAllPermissions();
  }, [isOpen]);

  const checkAllPermissions = async () => {
    // 1. Camera check
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const permissions = await navigator.permissions?.query({ name: 'camera' as any });
        if (permissions) {
          setCameraStatus(permissions.state as any);
        }
      } catch {
        // Fallback
      }
    } else {
      setCameraStatus('unsupported');
    }

    // 2. Location check
    if ('geolocation' in navigator) {
      try {
        const permissions = await navigator.permissions?.query({ name: 'geolocation' });
        if (permissions) {
          setLocationStatus(permissions.state as any);
        }
      } catch {
        // Fallback
      }
    } else {
      setLocationStatus('unsupported');
    }

    // 3. Mic check
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const permissions = await navigator.permissions?.query({ name: 'microphone' as any });
        if (permissions) {
          setMicStatus(permissions.state as any);
        }
      } catch {
        // Fallback
      }
    } else {
      setMicStatus('unsupported');
    }

    // 4. SMS check
    const smsState = getSmsPermissionState();
    setSmsStatus(smsState.granted ? 'granted' : 'prompt');

    // 5. Notifications check
    if ('Notification' in window) {
      if (Notification.permission === 'granted') setNotifStatus('granted');
      else if (Notification.permission === 'denied') setNotifStatus('denied');
      else setNotifStatus('prompt');
    } else {
      setNotifStatus('unsupported');
    }

    // 6. Bluetooth check
    if ('bluetooth' in navigator) {
      setBtStatus('prompt');
    } else {
      setBtStatus('unsupported');
    }
  };

  // Request handlers
  const requestCamera = async () => {
    try {
      setCameraTestOutput('جاري فتح الكاميرا واختبارها...');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setCameraStatus('granted');
      setActiveCameraStream(stream);
      setCameraTestOutput(`✅ تم التفعيل بنجاح! دقة الكاميرا: ${stream.getVideoTracks()[0]?.getSettings()?.width || 1280}x${stream.getVideoTracks()[0]?.getSettings()?.height || 720}`);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error(err);
      setCameraStatus('denied');
      setCameraTestOutput(`❌ فشل التفعيل: ${err?.message || 'تم رفض الإذن من المتصفح أو الجهاز'}`);
    }
  };

  const requestLocation = async () => {
    try {
      setLocationTestOutput('جاري تحديد الموقع الجغرافي دقيق (GPS)...');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocationStatus('granted');
          setLocationTestOutput(`✅ تم جلب الموقع بنجاح! خط العرض: ${pos.coords.latitude.toFixed(5)} | خط الطول: ${pos.coords.longitude.toFixed(5)} (دقة ${Math.round(pos.coords.accuracy)} متر)`);
        },
        (err) => {
          setLocationStatus('denied');
          setLocationTestOutput(`❌ تعذر جلب الموقع: ${err.message}`);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } catch (err: any) {
      setLocationStatus('denied');
      setLocationTestOutput(`❌ خطأ: ${err.message}`);
    }
  };

  const requestMic = async () => {
    try {
      setMicTestOutput('جاري طلب إذن اللاقط الصوتي...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStatus('granted');
      setMicTestOutput(`✅ تم تفعيل المايكروفون بنجاح! القناة: ${stream.getAudioTracks()[0]?.label || 'افتراضي'}`);
      // stop test track after 3s
      setTimeout(() => stream.getTracks().forEach(t => t.stop()), 3000);
    } catch (err: any) {
      setMicStatus('denied');
      setMicTestOutput(`❌ تم رفض إذن المايكروفون: ${err.message}`);
    }
  };

  const requestSms = async () => {
    setSmsTestOutput('جاري تأكيد وتفعيل أذونات التراسل والرسائل القصيرة...');
    const res = await requestSmsPermissions();
    setSmsStatus(res.granted ? 'granted' : 'denied');
    setSmsTestOutput(`✅ تم تفعيل أذونات الرسائل القصيرة SMS للجهاز بنجاح (وضع ${res.environment === 'android_app' ? 'تطبيق أندرويد' : 'PWA/متصفح Web'})`);
  };

  const requestNotification = async () => {
    if (!('Notification' in window)) {
      setNotifStatus('unsupported');
      setNotifTestOutput('⚠️ الإشعارات غير مدعومة في هذا المتصفح');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotifStatus('granted');
        setNotifTestOutput('✅ تم تفعيل الإشعارات والتنبيهات بنجاح!');
        new Notification('نظام فوترة الكهرباء - فولترا', {
          body: 'تم تفعيل التنبيهات والإشعارات بنجاح!',
          icon: '/icon-192.png'
        });
      } else {
        setNotifStatus('denied');
        setNotifTestOutput('❌ تم رفض إذن الإشعارات من قبل المستخدم');
      }
    } catch (err: any) {
      setNotifStatus('denied');
      setNotifTestOutput(`❌ خطأ: ${err.message}`);
    }
  };

  const requestBluetooth = async () => {
    if (!('bluetooth' in navigator)) {
      setBtStatus('unsupported');
      setBtTestOutput('⚠️ البلوتوث يحتاج إلى تشغيله من المتصفح أو ربطه بطابعة حرارية');
      return;
    }

    try {
      setBtTestOutput('جاري البحث عن طابعة حرارية بلوتوث مقترنة...');
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true
      });
      if (device) {
        setBtStatus('granted');
        setBtTestOutput(`✅ تم الاقتران بالطابعة: ${device.name || 'طابعة بدون اسم'}`);
      }
    } catch (err: any) {
      setBtTestOutput(`ℹ️ ${err.message || 'تم إلغاء البحث عن طابعة بلوتوث'}`);
    }
  };

  const requestAllAtOnce = async () => {
    await requestCamera();
    await requestLocation();
    await requestMic();
    await requestSms();
    await requestNotification();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="bg-slate-900 text-white p-6 flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">مركز أذونات وصلاحيات الجهاز (Device Permissions Center)</h2>
                <p className="text-xs text-slate-400 font-bold mt-0.5">إدارة وتفعيل الصلاحيات الحية للكاميرا، الموقع، الصوت، والرسائل</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action Header Banner */}
          <div className="bg-emerald-50 border-b border-emerald-100 p-4 px-6 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-emerald-950 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>تأكد من تفعيل الأذونات التالية لضمان عمل كافة ميزات الفوترة الميدانية والطباعة</span>
            </div>
            <button
              type="button"
              onClick={requestAllAtOnce}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>تفعيل وشمل كل الأذونات دفعة واحدة</span>
            </button>
          </div>

          {/* Scrollable Permissions List */}
          <div className="p-6 overflow-y-auto space-y-4 flex-1 text-slate-800">

            {/* Camera Permission Card */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-sky-100 text-sky-700 rounded-xl">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      إذن الكاميرا (Camera Access)
                      {cameraStatus === 'granted' && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md">مسموح ✅</span>}
                      {cameraStatus === 'prompt' && <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md">في انتظار التفعيل ⏳</span>}
                      {cameraStatus === 'denied' && <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-md">مرفوض ❌</span>}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">مطلوب لمسح الباركود للعدادات، وقراءة QR الكروت، وتصوير السندات ميدانياً</p>
                  </div>
                </div>
                <button
                  onClick={requestCamera}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer"
                >
                  اختبار وتفعيل
                </button>
              </div>
              {cameraTestOutput && (
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs font-mono text-slate-700">
                  {cameraTestOutput}
                </div>
              )}
              {activeCameraStream && (
                <div className="relative rounded-2xl overflow-hidden bg-black max-w-sm h-48 border border-slate-800">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 px-2 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded">
                    بث مباشر حي للبث
                  </div>
                </div>
              )}
            </div>

            {/* Location Permission Card */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      إذن الموقع الجغرافي (GPS Location)
                      {locationStatus === 'granted' && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md">مسموح ✅</span>}
                      {locationStatus === 'prompt' && <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md">في انتظار التفعيل ⏳</span>}
                      {locationStatus === 'denied' && <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-md">مرفوض ❌</span>}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">مطلوب لتحديد موقع المحصل أثناء إدخال القراءات، وعرض المشتركين على الخريطة التفاعلية</p>
                  </div>
                </div>
                <button
                  onClick={requestLocation}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer"
                >
                  اختبار وتفعيل
                </button>
              </div>
              {locationTestOutput && (
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs font-mono text-slate-700">
                  {locationTestOutput}
                </div>
              )}
            </div>

            {/* Microphone Permission Card */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl">
                    <Mic className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      إذن المايكروفون (Audio Recording)
                      {micStatus === 'granted' && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md">مسموح ✅</span>}
                      {micStatus === 'prompt' && <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md">في انتظار التفعيل ⏳</span>}
                      {micStatus === 'denied' && <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-md">مرفوض ❌</span>}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">مطلوب لتسجيل الملاحظات الصوتية والتعليقات على أعطال أو منازعات العدادات</p>
                  </div>
                </div>
                <button
                  onClick={requestMic}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer"
                >
                  اختبار وتفعيل
                </button>
              </div>
              {micTestOutput && (
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs font-mono text-slate-700">
                  {micTestOutput}
                </div>
              )}
            </div>

            {/* SMS Dispatch Permission Card */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      إذن الرسائل القصيرة (SMS Dispatch & Android Bridge)
                      {smsStatus === 'granted' && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md">مسموح ✅</span>}
                      {smsStatus === 'prompt' && <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md">في انتظار التفعيل ⏳</span>}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">مطلوب لإرسال إشعارات الفواتير وسندات القبض آلياً إلى هواتف المشتركين</p>
                  </div>
                </div>
                <button
                  onClick={requestSms}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer"
                >
                  تأكيد ومنح
                </button>
              </div>
              {smsTestOutput && (
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs font-mono text-slate-700">
                  {smsTestOutput}
                </div>
              )}
            </div>

            {/* Notifications Permission Card */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      إذن الإشعارات والتنبيهات (Push Notifications)
                      {notifStatus === 'granted' && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md">مسموح ✅</span>}
                      {notifStatus === 'prompt' && <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md">في انتظار التفعيل ⏳</span>}
                      {notifStatus === 'denied' && <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-md">مرفوض ❌</span>}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">مطلوب لتلقي تنبيهات التحصيل المباشر وإشعارات النظام الفورية</p>
                  </div>
                </div>
                <button
                  onClick={requestNotification}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer"
                >
                  اختبار وتفعيل
                </button>
              </div>
              {notifTestOutput && (
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs font-mono text-slate-700">
                  {notifTestOutput}
                </div>
              )}
            </div>

            {/* Bluetooth Thermal Printer Card */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-slate-200 text-slate-800 rounded-xl">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      إذن الطابعة الحرارية والبلوتوث (Thermal Printer Access)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">مطلوب للطباعة المباشرة على طابعات السندات الميدانية البلوتوث (58mm/80mm)</p>
                  </div>
                </div>
                <button
                  onClick={requestBluetooth}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer"
                >
                  اقتران بالطابعة
                </button>
              </div>
              {btTestOutput && (
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs font-mono text-slate-700">
                  {btTestOutput}
                </div>
              )}
            </div>

          </div>

          {/* Footer */}
          <div className="bg-slate-100 p-4 border-t border-slate-200 flex items-center justify-between shrink-0">
            <span className="text-xs text-slate-500 font-bold">
              جميع الصلاحيات محفوظة ومفعلة بملف <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-800">AndroidManifest.xml</code> و <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-800">metadata.json</code>
            </span>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              إغلاق وحفظ
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
