import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  X, Camera, QrCode, AlertCircle, Search, CheckCircle2, 
  FlipHorizontal, RefreshCw, Zap, ShieldCheck 
} from 'lucide-react';
import { Subscriber } from '../types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscribers: Subscriber[];
  onSelectSubscriber: (subscriber: Subscriber) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  subscribers,
  onSelectSubscriber
}) => {
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [matchedSubscriber, setMatchedSubscriber] = useState<Subscriber | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<any>(null);

  // Match code against subscribers
  const findSubscriberByCode = (code: string): Subscriber | null => {
    const clean = code.trim().toLowerCase();
    if (!clean) return null;

    return subscribers.find(s => {
      const meter = (s.meterNumber || '').toLowerCase().trim();
      const account = (s.accountNumber || '').toLowerCase().trim();
      const id = (s.id || '').toLowerCase().trim();
      const phone = (s.phone || '').replace(/[^0-9]/g, '');
      const cleanPhone = clean.replace(/[^0-9]/g, '');

      return (
        meter === clean ||
        account === clean ||
        id === clean ||
        (cleanPhone && phone && (phone === cleanPhone || phone.endsWith(cleanPhone) || cleanPhone.endsWith(phone)))
      );
    }) || null;
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    setHasCamera(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('متصفحك أو بيئة العمل لا تدعم الوصول للكاميرا المباشرة.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setHasCamera(true);
      setIsScanning(true);

      // Start Barcode Detection loop if BarcodeDetector is available
      if ('BarcodeDetector' in window) {
        try {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e']
          });

          scanIntervalRef.current = setInterval(async () => {
            if (!videoRef.current || videoRef.current.readyState < 2) return;
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0) {
                const rawValue = barcodes[0].rawValue;
                if (rawValue) {
                  const match = findSubscriberByCode(rawValue);
                  if (match) {
                    setMatchedSubscriber(match);
                    stopCamera();
                  } else {
                    setManualCode(rawValue);
                  }
                }
              }
            } catch (err) {
              // Non-blocking frame detection failure
            }
          }, 350);
        } catch (e) {
          console.warn('BarcodeDetector format not supported', e);
        }
      }
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      setHasCamera(false);
      setCameraError(
        err?.name === 'NotAllowedError'
          ? 'تم رفض إذن الوصول للكاميرا من قبل المستخدم أو المتصفح.'
          : err?.message || 'تعذر تشغيل كاميرا الهاتف. يمكنك إدخال كود أو باركود العداد يدوياً أدناه.'
      );
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
      setMatchedSubscriber(null);
      setManualCode('');
    }
    return () => stopCamera();
  }, [isOpen, facingMode]);

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const match = findSubscriberByCode(manualCode);
    if (match) {
      setMatchedSubscriber(match);
    } else {
      alert('لم يتم العثور على مشترك يطابق هذا الكود أو رقم العداد.');
    }
  };

  const handleConfirmSelection = (sub: Subscriber) => {
    onSelectSubscriber(sub);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md flex flex-col overflow-hidden text-right"
        dir="rtl"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-400/20 text-amber-400 rounded-xl border border-amber-400/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">مسح باركود العداد أو كود المشترك</h3>
              <p className="text-[11px] text-slate-400">توجيه الكاميرا نحو باركود العداد للاختيار السريع</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4">
          {/* Camera Viewport or Fallback */}
          <div className="relative w-full aspect-video bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-800 flex items-center justify-center">
            {hasCamera ? (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className="w-full h-full object-cover"
                />
                {/* Aiming Reticle overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-32 border-2 border-amber-400/80 rounded-2xl relative shadow-lg">
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-amber-400" />
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-amber-400" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-amber-400" />
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-amber-400" />
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent absolute top-1/2 animate-pulse" />
                  </div>
                </div>

                {/* Flip camera button */}
                <button
                  type="button"
                  onClick={() => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')}
                  className="absolute bottom-2.5 right-2.5 p-2 bg-slate-900/80 text-white rounded-xl border border-slate-700 hover:bg-slate-900 text-xs flex items-center gap-1 cursor-pointer"
                  title="تبديل الكاميرا (الأمامية / الخلفية)"
                >
                  <FlipHorizontal className="w-4 h-4" />
                  <span className="text-[10px] font-bold">تبديل الكاميرا</span>
                </button>
              </>
            ) : (
              <div className="p-6 text-center text-slate-400 space-y-2 flex flex-col items-center">
                <Camera className="w-10 h-10 text-slate-500 stroke-1" />
                <p className="text-xs font-bold text-slate-300">
                  {cameraError || 'جاري تجهيز الكاميرا...'}
                </p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="mt-2 text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5 hover:bg-amber-400/20 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>إعادة المحاولة</span>
                </button>
              </div>
            )}
          </div>

          {/* Matched Subscriber Preview Card */}
          {matchedSubscriber && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-50 border-2 border-emerald-500/50 p-3.5 rounded-2xl space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>تم العثور على المشترك!</span>
                </span>
                <span className="text-xs font-mono font-bold text-slate-600">عداد: {matchedSubscriber.meterNumber}</span>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-emerald-100 flex justify-between items-center">
                <div>
                  <h4 className="font-black text-slate-900 text-sm">{matchedSubscriber.name}</h4>
                  <p className="text-[10px] text-slate-500">منطقة: {matchedSubscriber.zone} | الهاتف: {matchedSubscriber.phone}</p>
                </div>
                <div className="text-left font-mono">
                  <span className="text-[10px] text-slate-400 block font-bold">الرصيد المستحق</span>
                  <span className={`text-xs font-black ${matchedSubscriber.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {matchedSubscriber.currentBalance.toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleConfirmSelection(matchedSubscriber)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Zap className="w-4 h-4 fill-white" />
                <span>اختيار هذا المشترك والبدء بالعملية فوراً</span>
              </button>
            </motion.div>
          )}

          {/* Manual Code Input Form */}
          <form onSubmit={handleManualSearch} className="space-y-2 border-t border-slate-100 pt-3">
            <label className="block text-slate-600 font-bold text-xs">
              أو أدخل رقم العداد / الكود يدوياً:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="أدخل رقم العداد أو كود المشترك..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-mono text-slate-800 outline-none focus:border-slate-900"
              />
              <button
                type="submit"
                className="bg-slate-900 hover:bg-slate-850 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1"
              >
                <Search className="w-3.5 h-3.5" />
                <span>بحث</span>
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
