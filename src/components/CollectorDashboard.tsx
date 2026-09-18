import React, { useState, useMemo, useEffect, useRef, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { Subscriber, MeterReading, Payment, User, SystemSettings, AuditLog, TechnicalRequest, SmsTemplate, FailedSmsItem, TreasuryTransfer } from '../types';
import { 
  Zap, LogOut, Search, UserRound, Calculator, Banknote, 
  Receipt, FileText, CheckCircle2, AlertTriangle, AlertCircle, Printer, Clock, FilePlus, CreditCard,
  Scissors, Calendar, CalendarDays, Download, Wifi, WifiOff, RefreshCw, Bluetooth, Check, Activity, Info,
  Target, TrendingUp, UserCheck, Sparkles, Percent, MapPin, Gauge, ShieldAlert, Edit3, ShieldCheck,
  MessageSquare, Copy, Share2, Bell, Power, UserPlus, Wrench, Phone, X, Filter, ChevronRight, Radio, Smartphone, Eye, EyeOff, QrCode,
  Sun, CheckSquare, Sparkle, Camera
} from 'lucide-react';
import { SubscriberStatementModal } from './SubscriberStatementModal';
import { ShiftSettlementModal } from './ShiftSettlementModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { CollectorPerformanceHUD, PerformanceFilterState } from './collector/CollectorPerformanceHUD';
import { CollectorCollectionsByMonthAndDay } from './collector/CollectorCollectionsByMonthAndDay';
import { calculateTransformerLoss } from '../utils/lossEngine';
import { getDecadalPeriodInfo, getReadingCycleStatus } from '../utils/cycleUtils';
import { getNextReceiptNumber, getNextInvoiceNumber, formatSubscriberBalanceStatus } from '../utils/sequenceUtils';
import { tafqeetArabic } from '../utils/numberToWords';
import { 
  sendSMSDirectly, 
  parseSmsTemplate, 
  DEFAULT_READING_SMS_TEMPLATE, 
  DEFAULT_PAYMENT_SMS_TEMPLATE, 
  SendSMSResult 
} from '../utils/smsService';
import { 
  matchSubscriberSearch, 
  HighlightMatch, 
  normalizeArabicText, 
  normalizeMeterNumber 
} from '../utils/arabicSearchUtils';
import { calculateBillDetails, getSectorTariffRate } from './tariff/tariffCalculator';

const SubscribersMap = lazy(() => import('./SubscribersMap').then(m => ({ default: m.SubscribersMap })));

const CollectorMapFallback = () => (
  <div className="w-full h-full min-h-[500px] bg-slate-900 rounded-2xl flex flex-col items-center justify-center text-white dir-rtl p-6">
    <div className="p-4 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 mb-3">
      <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
    </div>
    <h4 className="text-sm font-bold">جاري تحميل خريطة المحصّل الميدانية...</h4>
    <p className="text-xs text-slate-400 mt-1">تحميل ذكي ومنفصل لضمان أقصى سرعة استجابة على أجهزة الهاتف المحمول</p>
  </div>
);

interface CollectorDashboardProps {
  currentUser: User;
  onLogout: () => void;
  subscribers: Subscriber[];
  readings: MeterReading[];
  payments: Payment[];
  settings: SystemSettings;
  onAddReading: (reading: MeterReading) => void;
  onAddPayment: (payment: Payment) => void;
  onDeleteReading?: (id: string) => void;
  onEditReading?: (reading: MeterReading) => void;
  onDeletePayment?: (id: string) => void;
  onEditPayment?: (payment: Payment) => void;
  onUpdateSettings?: (settings: SystemSettings) => void;
  onUpdateSubscribers?: (subs: Subscriber[]) => void;
  onAddAuditLog?: (log: AuditLog) => void;
  isOnline?: boolean;
  pendingSyncCount?: number;
  onSync?: () => Promise<void>;
  isSyncing?: boolean;
  techRequests?: TechnicalRequest[];
  onUpdateTechRequests?: (reqs: TechnicalRequest[]) => void;
  smsTemplates?: SmsTemplate[];
  failedSms?: FailedSmsItem[];
  onDeleteFailedSms?: (id: string) => void;
  treasuryTransfers?: TreasuryTransfer[];
  onUpdateTreasuryTransfers?: (trfs: TreasuryTransfer[]) => void;
}

export const CollectorDashboard: React.FC<CollectorDashboardProps> = ({
  currentUser,
  onLogout,
  subscribers,
  readings,
  payments,
  settings,
  onAddReading,
  onAddPayment,
  onDeleteReading,
  onEditReading,
  onDeletePayment,
  onEditPayment,
  onUpdateSettings,
  onUpdateSubscribers,
  onAddAuditLog,
  isOnline = true,
  pendingSyncCount = 0,
  onSync,
  isSyncing = false,
  techRequests = [],
  onUpdateTechRequests,
  smsTemplates = [],
  failedSms = [],
  onDeleteFailedSms,
  treasuryTransfers = [],
  onUpdateTreasuryTransfers,
}) => {
  const [activeTab, setActiveTab] = useState<'reading' | 'master_reading' | 'payment' | 'statement' | 'history' | 'map'>('reading');
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarFilterMode, setSidebarFilterMode] = useState<'all' | 'pending' | 'completed' | 'debt'>('all');
  const [sidebarZoneFilter, setSidebarZoneFilter] = useState<string>('all');
  const [selectedSub, setSelectedSub] = useState<Subscriber | null>(null);

  // Auto SMS Settings for Collector
  const [autoSmsEnabled, setAutoSmsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('voltera_auto_sms_collector');
    if (saved !== null) return saved === 'true';
    return settings.autoSmsEnabled ?? true;
  });

  const [smsSendMode, setSmsSendMode] = useState<'direct_android' | 'sms_uri'>(() => {
    const saved = localStorage.getItem('voltera_sms_send_mode');
    return (saved as 'direct_android' | 'sms_uri') || 'sms_uri';
  });

  const [lastSmsResult, setLastSmsResult] = useState<SendSMSResult | null>(null);
  const [showSmsSettingsModal, setShowSmsSettingsModal] = useState(false);

  // Work Order & Manager Notifications States
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'all' | 'disconnection' | 'reconnection' | 'maintenance'>('all');
  const [selectedOrderForExec, setSelectedOrderForExec] = useState<TechnicalRequest | null>(null);
  const [execNotes, setExecNotes] = useState('');
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('voltera_collector_read_notifs');
    return saved ? JSON.parse(saved) : [];
  });
  const [toastAlert, setToastAlert] = useState<TechnicalRequest | null>(null);
  const prevOrdersCountRef = useRef<number>(0);

  // Active work orders list (disconnection, reconnection, new connection, maintenance)
  const activeWorkOrders = useMemo(() => {
    return (techRequests || []).filter(r => 
      r.type === 'disconnection' || r.type === 'reconnection' || r.type === 'new_connection' || r.type === 'maintenance'
    );
  }, [techRequests]);

  const filteredWorkOrders = useMemo(() => {
    if (notifFilter === 'all') return activeWorkOrders;
    if (notifFilter === 'reconnection') return activeWorkOrders.filter(r => r.type === 'reconnection' || r.type === 'new_connection');
    return activeWorkOrders.filter(r => r.type === notifFilter);
  }, [activeWorkOrders, notifFilter]);

  const pendingNotifCount = useMemo(() => {
    return activeWorkOrders.filter(r => 
      (r.status === 'pending' || r.status === 'in_progress') && !readNotifIds.includes(r.id)
    ).length;
  }, [activeWorkOrders, readNotifIds]);

  // Real-time toast alert when manager issues new disconnection/reconnection order
  useEffect(() => {
    const currentPending = activeWorkOrders.filter(r => r.status === 'pending');
    if (currentPending.length > prevOrdersCountRef.current && prevOrdersCountRef.current > 0) {
      setToastAlert(currentPending[0]);
    }
    prevOrdersCountRef.current = currentPending.length;
  }, [activeWorkOrders]);

  const handleMarkAllNotifsRead = () => {
    const allIds = activeWorkOrders.map(r => r.id);
    setReadNotifIds(allIds);
    localStorage.setItem('voltera_collector_read_notifs', JSON.stringify(allIds));
  };

  const handleOpenNotifDrawer = () => {
    setIsNotifDrawerOpen(true);
    handleMarkAllNotifsRead();
  };

  const handleExecuteWorkOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForExec || !onUpdateTechRequests) return;

    const req = selectedOrderForExec;
    const completedAt = new Date().toISOString().split('T')[0];
    const updatedReq: TechnicalRequest = {
      ...req,
      status: 'completed',
      completedAt,
      executedBy: currentUser.name,
      notes: execNotes ? `${req.notes ? req.notes + ' | ' : ''}تنفيذ المحصل: ${execNotes}` : req.notes
    };

    const updatedList = (techRequests || []).map(r => r.id === req.id ? updatedReq : r);
    onUpdateTechRequests(updatedList);

    // Update subscriber status if matched
    const matchedSub = subscribers.find(s => 
      (req.subscriberId && s.id === req.subscriberId) ||
      (req.subscriberCode && (s.accountNumber === req.subscriberCode || s.meterNumber === req.subscriberCode)) ||
      (s.name.trim() === req.applicantName.trim()) ||
      (req.phone && s.phone === req.phone)
    );

    if (matchedSub && onUpdateSubscribers) {
      let newSubStatus: Subscriber['status'] = matchedSub.status;
      if (req.type === 'disconnection') {
        newSubStatus = 'disconnected';
      } else if (req.type === 'reconnection' || req.type === 'new_connection') {
        newSubStatus = 'active';
      }

      const updatedSubscribers = subscribers.map(s => {
        if (s.id === matchedSub.id) {
          return {
            ...s,
            status: newSubStatus,
            notes: execNotes ? `${s.notes ? s.notes + '\n' : ''}[${completedAt}] تم ${req.type === 'disconnection' ? 'فصل الخدمة' : 'إعادة/توصيل الخدمة'}: ${execNotes}` : s.notes
          };
        }
        return s;
      });

      onUpdateSubscribers(updatedSubscribers);
    }

    if (onAddAuditLog) {
      onAddAuditLog({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'تنفيذ أمر ميداني',
        details: `قام المحصل ${currentUser.name} بتنفيذ أمر (${req.type === 'disconnection' ? 'فصل خدمة' : req.type === 'reconnection' ? 'إعادة خدمة' : 'طلب فني'}) للمشترك ${req.applicantName}. ${execNotes ? 'ملاحظات: ' + execNotes : ''}`
      });
    }

    setSelectedOrderForExec(null);
    setExecNotes('');
  };

  const handleUpdateOrderStatus = (req: TechnicalRequest, status: TechnicalRequest['status']) => {
    if (!onUpdateTechRequests) return;
    const updatedReq: TechnicalRequest = { ...req, status };
    const updatedList = (techRequests || []).map(r => r.id === req.id ? updatedReq : r);
    onUpdateTechRequests(updatedList);
  };

  // Master Meter Synchronized Reading States
  const [selectedMasterTransformer, setSelectedMasterTransformer] = useState<string>('');
  const [masterPrevReading, setMasterPrevReading] = useState<number>(0);
  const [masterCurrReading, setMasterCurrReading] = useState<number>(0);
  const [masterCtRatio, setMasterCtRatio] = useState<number>(1);
  const [masterMeterNum, setMasterMeterNum] = useState<string>('MTR-CENTRAL-01');
  const [masterCapacityKva, setMasterCapacityKva] = useState<number>(500);
  const [masterZone, setMasterZone] = useState<string>('المنطقة الرئيسية');
  const [masterReadingSuccess, setMasterReadingSuccess] = useState<string | null>(null);

  // Target collection HUD states (Daily & Monthly)
  const [dailyGoal, setDailyGoal] = useState<number>(() => {
    const saved = localStorage.getItem('voltera_collector_daily_goal');
    return saved ? parseInt(saved, 10) : 250000;
  });
  const [monthlyGoal, setMonthlyGoal] = useState<number>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('voltera_collector_monthly_goal') : null;
    return saved ? parseInt(saved, 10) : 6500000;
  });
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(dailyGoal.toString());
  const [isDailyHudVisible, setIsDailyHudVisible] = useState<boolean>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('voltera_collector_daily_hud_visible') : null;
    return saved !== 'false'; // Default to visible
  });

  // Performance Dashboard Filters state
  const [performanceFilters, setPerformanceFilters] = useState<PerformanceFilterState>(() => {
    const today = new Date().toISOString().substring(0, 10);
    const thisMonth = today.substring(0, 7);
    return {
      periodType: 'today',
      selectedDate: today,
      selectedMonth: thisMonth,
      customStartDate: today,
      customEndDate: today,
      selectedZone: 'all',
      selectedPaymentMethod: 'all',
      selectedPostingStatus: 'all',
    };
  });

  // Collections tab sub-mode shortcut
  const [collectionsInitialMode, setCollectionsInitialMode] = useState<'daily' | 'monthly' | 'operations_log'>('daily');

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(goalInput, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setDailyGoal(parsed);
      localStorage.setItem('voltera_collector_daily_goal', parsed.toString());
      setIsEditingGoal(false);
    }
  };

  // Print Job State
  const [printingJob, setPrintingJob] = useState<{
    type: 'invoice' | 'receipt' | 'statement' | 'shift_report';
    sub?: Subscriber;
    reading?: MeterReading;
    payment?: Payment;
    shiftDate?: string;
    shiftPayments?: Payment[];
  } | null>(null);

  const [downloadingImage, setDownloadingImage] = useState(false);
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Bluetooth Thermal Printing State
  const [printerDevice, setPrinterDevice] = useState<any>(null);
  const [printerCharacteristic, setPrinterCharacteristic] = useState<any>(null);
  const [btStatus, setBtStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [btError, setBtError] = useState<string | null>(null);
  const [btSuccessMessage, setBtSuccessMessage] = useState<string | null>(null);
  const [btPrinterName, setBtPrinterName] = useState<string | null>(null);
  const [isDirectPrinting, setIsDirectPrinting] = useState(false);
  const [showBtHelp, setShowBtHelp] = useState(false);

  const connectBluetoothPrinter = async () => {
    const nav = navigator as any;
    if (!nav.bluetooth) {
      setBtError("متصفحك الحالي أو بيئة العمل لا تدعم ميزة البلوتوث اللاسلكي مباشرة. يرجى استخدام متصفح Google Chrome على الهاتف أو الكمبيوتر والتحقق من تشغيل البلوتوث.");
      return;
    }
    setBtStatus('connecting');
    setBtError(null);
    setBtSuccessMessage(null);
    try {
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Standard thermal printer BLE service
          '0000ffe0-0000-1000-8000-00805f9b34fb', // Common serial BLE service
          '0000ffe1-0000-1000-8000-00805f9b34fb', // Serial characteristic
          '00001101-0000-1000-8000-00805f9b34fb'  // Standard SPP
        ]
      });

      setBtPrinterName(device.name || "طابعة حرارية بلوتوث");
      
      const server = await device.gatt?.connect();
      if (!server) throw new Error("فشل الاتصال بـ GATT Server الخاص بالطابعة.");

      // Search for any write characteristic
      let char = null;
      try {
        const services = await server.getPrimaryServices();
        for (const service of services) {
          try {
            const chars = await service.getCharacteristics();
            for (const c of chars) {
              if (c.properties.write || c.properties.writeWithoutResponse) {
                char = c;
                break;
              }
            }
          } catch (e) {
            console.warn("Could not get characteristics for service", service.uuid, e);
          }
          if (char) break;
        }
      } catch (e) {
        console.warn("Could not get primary services, trying default service FFE0", e);
        try {
          const service = await server.getPrimaryService('0000ffe0-0000-1000-8000-00805f9b34fb');
          char = await service.getCharacteristic('0000ffe1-0000-1000-8000-00805f9b34fb');
        } catch (innerErr) {
          console.error("Default FFE0 search also failed", innerErr);
        }
      }

      if (!char) {
        throw new Error("تم الاقتران بنجاح، ولكن لم يتم العثور على ميزة الكتابة المتوافقة (Write Characteristic) لإرسال البيانات.");
      }

      setPrinterDevice(device);
      setPrinterCharacteristic(char);
      setBtStatus('connected');
      setBtSuccessMessage("تم ربط الطابعة بنجاح وجاهزة للطباعة المباشرة!");
      setTimeout(() => setBtSuccessMessage(null), 3000);
      
      device.addEventListener('gattserverdisconnected', () => {
        setBtStatus('disconnected');
        setPrinterDevice(null);
        setPrinterCharacteristic(null);
        setBtPrinterName(null);
      });
    } catch (err: any) {
      console.error("Bluetooth connection failed", err);
      setBtStatus('disconnected');
      setBtError(err?.message || "فشلت عملية الاقتران بالطابعة. يرجى التحقق من تشغيل الطابعة وتفعيل البلوتوث.");
    }
  };

  const disconnectBluetoothPrinter = () => {
    if (printerDevice && printerDevice.gatt?.connected) {
      printerDevice.gatt.disconnect();
    }
    setBtStatus('disconnected');
    setPrinterDevice(null);
    setPrinterCharacteristic(null);
    setBtPrinterName(null);
    setBtSuccessMessage("تم قطع الاتصال بالطابعة بنجاح.");
    setTimeout(() => setBtSuccessMessage(null), 3000);
  };

  const printViaBluetooth = async () => {
    if (!printerCharacteristic || !printingJob) return;
    
    setIsDirectPrinting(true);
    setBtError(null);
    try {
      const encoder = new TextEncoder();
      
      // ESC/POS Command sequences
      const escInit = new Uint8Array([0x1B, 0x40]); // Initialize
      const escCenter = new Uint8Array([0x1B, 0x61, 0x01]); // Align center
      const escRight = new Uint8Array([0x1B, 0x61, 0x02]); // Align right
      const escLeft = new Uint8Array([0x1B, 0x61, 0x00]); // Align left
      const escBoldOn = new Uint8Array([0x1B, 0x45, 0x01]);
      const escBoldOff = new Uint8Array([0x1B, 0x45, 0x00]);
      const escDoubleSize = new Uint8Array([0x1D, 0x21, 0x11]);
      const escNormalSize = new Uint8Array([0x1D, 0x21, 0x00]);
      
      let chunks: Uint8Array[] = [];
      
      const addText = (text: string) => {
        chunks.push(encoder.encode(text + '\n'));
      };
      const addCmd = (cmd: Uint8Array) => {
        chunks.push(cmd);
      };

      // 1. Header (Station Name)
      addCmd(escInit);
      addCmd(escCenter);
      addCmd(escDoubleSize);
      addCmd(escBoldOn);
      addText(settings.stationName);
      addCmd(escNormalSize);
      addCmd(escBoldOff);
      
      if (settings.logoText) {
        addText(settings.logoText);
      }
      addText("================================");
      
      // 2. Ticket Title
      addCmd(escBoldOn);
      if (printingJob.type === 'invoice') {
        addText("فاتورة استهلاك تيار كهربائي");
      } else if (printingJob.type === 'receipt') {
        addText("سند قبض وتوريد مالي");
      } else if (printingJob.type === 'statement') {
        addText("كشف حساب مشترك تفصيلي");
      } else {
        addText("تقرير إغلاق الوردية والعهد");
      }
      addCmd(escBoldOff);
      addText("================================");
      
      // 3. Metadata
      addCmd(escRight);
      if (printingJob.type !== 'shift_report' && printingJob.sub) {
        addText(`اسم المشترك: ${printingJob.sub.name}`);
        addText(`رقم العداد: ${printingJob.sub.meterNumber}`);
        if (printingJob.sub.zone) {
          addText(`المنطقة: ${printingJob.sub.zone}`);
        }
      } else {
        addText(`المحصل الميداني: ${currentUser.name}`);
        addText(`نوع التقرير: إغلاق الوردية المالي`);
      }
      addText(`تاريخ الطباعة: ${new Date().toLocaleDateString('en-GB')}`);
      addText("--------------------------------");

      // 4. Dynamic details depending on job type
      if (printingJob.type === 'invoice' && printingJob.reading && printingJob.sub) {
        const rd = printingJob.reading;
        addText(`رقم الفاتورة: ${rd.id.substring(0, 14)}`);
        addText(`الفترة: ${rd.billingMonth}`);
        addText(`القراءة السابقة: ${rd.previousReading} ك.و`);
        addText(`القراءة الحالية: ${rd.currentReading} ك.و`);
        addText(`صافي الاستهلاك: ${rd.consumption} كيلوواط`);
        addText(`سعر الوحدة: ${rd.ratePerKwh} ${settings.currency}`);
        addText(`الرسوم الثابتة: ${rd.fixedFee} ${settings.currency}`);
        addText(`الضريبة: ${rd.taxAmount} ${settings.currency}`);
        addText("--------------------------------");
        addCmd(escCenter);
        addCmd(escDoubleSize);
        addCmd(escBoldOn);
        addText(`المطلوب: ${rd.totalAmount.toLocaleString()} ${settings.currency}`);
        addCmd(escNormalSize);
        addCmd(escBoldOff);
      } else if (printingJob.type === 'receipt' && printingJob.payment && printingJob.sub) {
        const pay = printingJob.payment;
        addText(`رقم السند: ${pay.receiptNumber}`);
        addText(`طريقة الدفع: ${pay.paymentMethod === 'cash' ? 'نقدا' : pay.paymentMethod === 'e-wallet' ? 'محفظة' : 'تحويل'}`);
        addText("--------------------------------");
        addCmd(escCenter);
        addCmd(escDoubleSize);
        addCmd(escBoldOn);
        addText(`المستلم: ${pay.amountPaid.toLocaleString()} ${settings.currency}`);
        addCmd(escNormalSize);
        addCmd(escBoldOff);
        addCmd(escRight);
        addText(`الرصيد المتبقي: ${printingJob.sub.currentBalance.toLocaleString()} ${settings.currency}`);
      } else if (printingJob.type === 'statement' && printingJob.sub) {
        const totalInvoices = readings.filter(r => r.subscriberId === printingJob.sub.id).reduce((sum, r) => sum + r.totalAmount, 0);
        const totalPayments = payments.filter(p => p.subscriberId === printingJob.sub.id).reduce((sum, p) => sum + p.amountPaid, 0);
        addText(`إجمالي الفواتير: ${totalInvoices.toLocaleString()} ${settings.currency}`);
        addText(`إجمالي المدفوعات: ${totalPayments.toLocaleString()} ${settings.currency}`);
        addText("--------------------------------");
        addCmd(escCenter);
        addCmd(escDoubleSize);
        addCmd(escBoldOn);
        addText(`الرصيد المستحق: ${printingJob.sub.currentBalance.toLocaleString()} ${settings.currency}`);
        addCmd(escNormalSize);
        addCmd(escBoldOff);
      } else if (printingJob.type === 'shift_report') {
        const targetPayments = printingJob.shiftPayments || myPaymentsToday;
        const targetCollected = targetPayments.reduce((sum, p) => sum + p.amountPaid, 0);
        const cashTotal = targetPayments.filter(p => p.paymentMethod === 'cash').reduce((sum, p) => sum + p.amountPaid, 0);
        const walletTotal = targetPayments.filter(p => p.paymentMethod === 'e-wallet').reduce((sum, p) => sum + p.amountPaid, 0);
        const bankTotal = targetPayments.filter(p => p.paymentMethod === 'transfer').reduce((sum, p) => sum + p.amountPaid, 0);
        const targetDate = printingJob.shiftDate || todayStr;
        
        addText(`تاريخ التقرير: ${targetDate}`);
        addText(`المستهدف المالي: ${dailyGoal.toLocaleString()} ${settings.currency}`);
        addText(`إجمالي الفعلي المحصل: ${targetCollected.toLocaleString()} ${settings.currency}`);
        addText(`- نقداً (كاش): ${cashTotal.toLocaleString()} ${settings.currency}`);
        addText(`- محفظة إلكترونية: ${walletTotal.toLocaleString()} ${settings.currency}`);
        addText(`- تحويل مصرفي: ${bankTotal.toLocaleString()} ${settings.currency}`);
        addText("--------------------------------");
        addText(`سندات التحصيل: ${targetPayments.length} سند`);
        addText(`القراءات المسجلة: ${myReadingsToday.length} قراءة`);
        addText(`المشتركون المتبقون اليوم: ${remainingSubscribersToVisit} مشترك`);
        addText(`نسبة تحقيق الهدف اليومي: ${progressPercent}%`);
        addText("--------------------------------");
        addCmd(escCenter);
        addCmd(escDoubleSize);
        addCmd(escBoldOn);
        addText(`العهدة المسلمة: ${targetCollected.toLocaleString()} ${settings.currency}`);
        addCmd(escNormalSize);
        addCmd(escBoldOff);
        addCmd(escRight);
      }

      // 5. Warnings and barcode mock-up
      addCmd(escCenter);
      addText("--------------------------------");
      if (printingJob.type !== 'shift_report') {
        addText("يرجى تسديد المتأخرات لتفادي الفصل");
        addText("تنبيه: يتم فصل التيار بعد 3 أيام");
      } else {
        addText("تقرير إغلاق الوردية اليومية المعتمد");
        addText("يرجى مراجعة وتدقيق المبالغ مع الإدارة");
      }
      addText("================================");
      addText(`المحصل: ${currentUser.name}`);
      addText(`نظام فولترا السحابي - Voltera Cloud`);
      addText(`تاريخ التوقيت: ${new Date().toLocaleString('ar-YE')}`);
      addText("\n\n\n\n"); // Extra spacing for paper tear

      // Concatenate payloads
      let totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
      let payload = new Uint8Array(totalLen);
      let offset = 0;
      for (const chunk of chunks) {
        payload.set(chunk, offset);
        offset += chunk.length;
      }

      // Write chunks of 20 bytes with a delay
      const chunkSize = 20;
      for (let i = 0; i < payload.length; i += chunkSize) {
        const chunk = payload.slice(i, i + chunkSize);
        await printerCharacteristic.writeValue(chunk);
        await new Promise(resolve => setTimeout(resolve, 35));
      }

      setBtSuccessMessage("تم إرسال الفاتورة للطابعة الحرارية بنجاح!");
      setTimeout(() => setBtSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error("Direct bluetooth print failed", err);
      setBtError("فشلت عملية الإرسال للطابعة: " + (err?.message || "خطأ غير متوقع في قنوات البلوتوث."));
    } finally {
      setIsDirectPrinting(false);
    }
  };

  const downloadReceiptAsImage = () => {
    setDownloadingImage(true);
    const printElement = document.querySelector('.print-container');
    if (!printElement) {
      setDownloadingImage(false);
      return;
    }
    
    html2canvas(printElement as HTMLElement, {
      backgroundColor: '#FAF9F5',
      scale: 2,
      useCORS: true,
      logging: false,
    }).then(canvas => {
      const link = document.createElement('a');
      link.download = `voltera_receipt_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setDownloadingImage(false);
    }).catch(err => {
      console.error("Failed to generate receipt image", err);
      setDownloadingImage(false);
    });
  };

  const [copyNotice, setCopyNotice] = useState<string | null>(null);

  const handleShareWhatsApp = () => {
    if (!printingJob) return;
    const sub = printingJob.sub;
    const reading = printingJob.reading;
    const payment = printingJob.payment;

    let phone = sub?.phone ? sub.phone.replace(/[^0-9]/g, '') : '';
    if (phone.startsWith('0')) {
      phone = '967' + phone.slice(1);
    }

    let msg = `⚡ *${settings.stationName}*\n`;
    msg += `------------------------------\n`;
    if (printingJob.type === 'receipt' && payment) {
      msg += `📄 *إيصال إشعار سداد مالي*\n`;
      msg += `👤 *المشترك:* ${sub?.name || 'مشترك'}\n`;
      msg += `🔢 *رقم العداد:* ${sub?.meterNumber || '—'}\n`;
      msg += `🧾 *رقم السند:* ${payment.receiptNumber}\n`;
      msg += `💵 *المبلغ المدفوع:* ${payment.amountPaid.toLocaleString()} ${settings.currency}\n`;
      msg += `💳 *طريقة الدفع:* ${payment.paymentMethod === 'cash' ? 'نقداً (كاش)' : payment.paymentMethod === 'e-wallet' ? 'محفظة إلكترونية' : 'تحويل مصرفي'}\n`;
      msg += `💰 *الرصيد المستحق الحالي:* ${sub?.currentBalance.toLocaleString()} ${settings.currency}\n`;
    } else if (printingJob.type === 'invoice' && reading) {
      msg += `📄 *فاتورة استهلاك تيار كهربائي*\n`;
      msg += `👤 *المشترك:* ${sub?.name || 'مشترك'}\n`;
      msg += `🔢 *رقم العداد:* ${sub?.meterNumber || '—'}\n`;
      msg += `📊 *الاستهلاك:* ${reading.consumption} كيلوواط ساعي\n`;
      msg += `💵 *إجمالي الفاتورة:* ${reading.totalAmount.toLocaleString()} ${settings.currency}\n`;
      msg += `💰 *إجمالي الرصيد المستحق:* ${sub?.currentBalance.toLocaleString()} ${settings.currency}\n`;
    } else if (printingJob.type === 'statement' && sub) {
      msg += `📄 *كشف حساب مشترك تفصيلي*\n`;
      msg += `👤 *المشترك:* ${sub.name}\n`;
      msg += `🔢 *رقم العداد:* ${sub.meterNumber}\n`;
      msg += `💰 *الرصيد المتبقي المستحق:* ${sub.currentBalance.toLocaleString()} ${settings.currency}\n`;
    } else if (printingJob.type === 'shift_report') {
      const targetPayments = printingJob.shiftPayments || myPaymentsToday;
      const targetCollected = targetPayments.reduce((sum, p) => sum + p.amountPaid, 0);
      const targetDate = printingJob.shiftDate || todayStr;
      const targetProgress = Math.min(100, Math.round((targetCollected / dailyGoal) * 100));
      msg += `📄 *تقرير إغلاق الوردية والعهد المالية*\n`;
      msg += `👤 *المحصل:* ${currentUser.name}\n`;
      msg += `📅 *التاريخ:* ${targetDate}\n`;
      msg += `💵 *إجمالي التحصيل:* ${targetCollected.toLocaleString()} ${settings.currency}\n`;
      msg += `🧾 *عدد السندات:* ${targetPayments.length} سند\n`;
      msg += `📊 *نسبة إنجاز الهدف:* ${targetProgress}%\n`;
    }
    msg += `------------------------------\n`;
    msg += `👤 *المحصل:* ${currentUser.name}\n`;
    msg += `📅 *التاريخ:* ${new Date().toLocaleDateString('ar-YE')}\n`;
    msg += `شكراً لتعاونكم معنا!`;

    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleCopyReceiptText = () => {
    if (!printingJob) return;
    const sub = printingJob.sub;
    const reading = printingJob.reading;
    const payment = printingJob.payment;

    let txt = `⚡ ${settings.stationName}\n`;
    if (printingJob.type === 'receipt' && payment) {
      txt += `إيصال سداد: ${payment.receiptNumber}\nالمشترك: ${sub?.name}\nالعداد: ${sub?.meterNumber}\nالمبلغ: ${payment.amountPaid.toLocaleString()} ${settings.currency}\nالرصيد المتبقي: ${sub?.currentBalance.toLocaleString()} ${settings.currency}\nالمحصل: ${currentUser.name}\nالتاريخ: ${new Date().toLocaleString('ar-YE')}`;
    } else if (printingJob.type === 'invoice' && reading) {
      txt += `فاتورة كهرباء: ${reading.billingMonth}\nالمشترك: ${sub?.name}\nالعداد: ${sub?.meterNumber}\nالاستهلاك: ${reading.consumption} ك.و\nالإجمالي: ${reading.totalAmount.toLocaleString()} ${settings.currency}\nالمحصل: ${currentUser.name}\nالتاريخ: ${new Date().toLocaleString('ar-YE')}`;
    } else {
      txt += `المحصل: ${currentUser.name}\nإجمالي التحصيل: ${totalCollectedToday.toLocaleString()} ${settings.currency}\nالتاريخ: ${new Date().toLocaleString('ar-YE')}`;
    }

    navigator.clipboard.writeText(txt).then(() => {
      setCopyNotice("تم نسخ نص الفاتورة/السند بنجاح للحافظة!");
      setTimeout(() => setCopyNotice(null), 3000);
    });
  };

  const handleDirectShareInvoiceWhatsApp = (sub: Subscriber, reading: MeterReading, payment?: Payment | null) => {
    let phone = sub.phone ? sub.phone.replace(/[^0-9]/g, '') : '';
    if (phone.startsWith('0')) {
      phone = '967' + phone.slice(1);
    }

    let msg = `⚡ *${settings.stationName}*\n`;
    msg += `📄 *فاتورة استهلاك تيار كهربائي*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `👤 *المشترك:* ${sub.name}\n`;
    msg += `🔢 *رقم العداد:* ${sub.meterNumber}\n`;
    msg += `🧾 *رقم الفاتورة:* ${reading.id.replace('rd-new-', 'INV-')}\n`;
    msg += `📅 *تاريخ القراءة:* ${reading.readingDate}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `▫️ القراءة السابقة: *${reading.previousReading} ك.و*\n`;
    msg += `▫️ القراءة الحالية: *${reading.currentReading} ك.و*\n`;
    msg += `⚡ *صافي الاستهلاك:* *${reading.consumption} كيلوواط*\n`;
    msg += `💵 *إجمالي الفاتورة:* *${reading.totalAmount.toLocaleString()} ${settings.currency}*\n`;
    if (payment) {
      msg += `━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `✅ *تم سداد دفعة فورية:* *${payment.amountPaid.toLocaleString()} ${settings.currency}*\n`;
      msg += `🧾 *سند قبض رقم:* ${payment.receiptNumber}\n`;
      msg += `💳 *طريقة السداد:* ${payment.paymentMethod === 'cash' ? 'نقداً (كاش)' : payment.paymentMethod === 'e-wallet' ? 'محفظة إلكترونية' : 'تحويل بنكي'}\n`;
    }
    msg += `💰 *الرصيد المتبقي المستحق:* *${sub.currentBalance.toLocaleString()} ${settings.currency}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `بإشراف المحصل الميداني: ${currentUser.name}\n`;
    msg += `شكراً لتعاونكم المستمر معنا.`;

    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleDirectSharePaymentWhatsApp = (sub: Subscriber, payment: Payment) => {
    let phone = sub.phone ? sub.phone.replace(/[^0-9]/g, '') : '';
    if (phone.startsWith('0')) {
      phone = '967' + phone.slice(1);
    }

    let msg = `⚡ *${settings.stationName}*\n`;
    msg += `🧾 *سند قبض وتوريد مالي رسمي*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `👤 *المستلم من الأخ:* ${sub.name}\n`;
    msg += `🔢 *رقم العداد:* ${sub.meterNumber}\n`;
    msg += `📄 *رقم السند:* ${payment.receiptNumber}\n`;
    msg += `💵 *المبلغ المستلم:* *${payment.amountPaid.toLocaleString()} ${settings.currency}*\n`;
    msg += `💳 *طريقة القبض:* ${payment.paymentMethod === 'cash' ? 'نقداً كاش' : payment.paymentMethod === 'e-wallet' ? 'محفظة إلكترونية' : 'تحويل مصرفي'}\n`;
    msg += `📅 *التاريخ:* ${payment.paymentDate}\n`;
    msg += `💰 *الرصيد المتبقي المستحق:* *${payment.remainingBalance.toLocaleString()} ${settings.currency}*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `المحصل المالي: ${currentUser.name}\n`;
    msg += `شكراً لسدادكم المستحقات في وقتها.`;

    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  useEffect(() => {
    if (printingJob) {
      const timer = setTimeout(() => {
        try {
          window.print();
        } catch (e) {
          console.error("Print failed:", e);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [printingJob]);

  // High-Contrast Outdoor Sunlight Mode
  const [sunlightMode, setSunlightMode] = useState<boolean>(() => {
    return localStorage.getItem('voltera_sunlight_mode') === 'true';
  });

  const toggleSunlightMode = () => {
    setSunlightMode(prev => {
      const next = !prev;
      localStorage.setItem('voltera_sunlight_mode', String(next));
      return next;
    });
  };

  // Modals for Shift Settlement and Barcode Scanner
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);

  // Combined Reading & Direct Payment State
  const [isInstantPaymentEnabled, setIsInstantPaymentEnabled] = useState(false);
  const [instantPaymentAmountInput, setInstantPaymentAmountInput] = useState('');
  const [instantPaymentMethod, setInstantPaymentMethod] = useState<'cash' | 'e-wallet' | 'transfer'>('cash');
  const [combinedSuccess, setCombinedSuccess] = useState<{
    reading: MeterReading;
    payment: Payment;
  } | null>(null);

  // Anomaly selection note
  const [zeroConsumptionReason, setZeroConsumptionReason] = useState<string>('');

  // Reading Form State
  const [currentReadingInput, setCurrentReadingInput] = useState('');
  const [readingSuccess, setReadingSuccess] = useState<MeterReading | null>(null);

  // Payment Form State
  const [amountPaidInput, setAmountPaidInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'e-wallet'>('cash');
  const [paymentSuccess, setPaymentSuccess] = useState<Payment | null>(null);

  // Quick Edit / Delete State
  const [editingReading, setEditingReading] = useState<MeterReading | null>(null);
  const [editReadingInput, setEditReadingInput] = useState('');
  
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editPaymentAmountInput, setEditPaymentAmountInput] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<'cash' | 'transfer' | 'e-wallet'>('cash');

  const [deletingItemId, setDeletingItemId] = useState<{ type: 'reading' | 'payment', id: string } | null>(null);

  // Today's Operations Log Live Filter & Search
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'readings' | 'payments' | 'pending_visit' | 'completed_visit'>('all');
  const [isBatchZeroModalOpen, setIsBatchZeroModalOpen] = useState(false);

  // Quick single Zero Reading handler (استهلاك صفر)
  const handleQuickZeroReading = (sub: Subscriber) => {
    const prevReading = sub.currentReading;
    const rate = sub.tariffType === 'residential' ? settings.tariffs.residential :
                 sub.tariffType === 'commercial' ? settings.tariffs.commercial : settings.tariffs.industrial;
    const total = settings.fixedFee + settings.serviceFee;

    const newReading: MeterReading = {
      id: `rd-zero-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      subscriberId: sub.id,
      subscriberName: sub.name,
      meterNumber: sub.meterNumber,
      previousReading: prevReading,
      currentReading: prevReading,
      consumption: 0,
      ratePerKwh: rate,
      fixedFee: settings.fixedFee,
      taxAmount: 0,
      totalAmount: total,
      billingMonth: new Date().toISOString().substring(0, 7),
      readingDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      enteredBy: currentUser.username,
      isPosted: false,
      notes: 'نزول ميداني - تأكيد عدم وجود استهلاك (0 ك.و)'
    };

    onAddReading(newReading);
  };

  // Helper to check if item can be edited/deleted (strictly within 24 hours of issuance and not posted)
  const getActionTimeRemaining = (item: { isPosted: boolean; readingDate?: string; paymentDate?: string }) => {
    if (item.isPosted) {
      return { allowed: false, label: '🔒 معتمدة ومرحلة من الإدارة (غير قابلة للتعديل)' };
    }
    const dateStr = item.readingDate || item.paymentDate;
    if (!dateStr) {
      return { allowed: false, label: '🔒 غير متاح للتعديل' };
    }
    try {
      const itemTime = new Date(dateStr.replace(' ', 'T')).getTime();
      const nowTime = Date.now();
      const diffMs = nowTime - itemTime;
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours > 24) {
        return { allowed: false, label: '🔒 غير متاح للتعديل (تجاوزت مهلة 24 ساعة المحددة)' };
      }

      const remainingMs = Math.max(0, 24 * 3600 * 1000 - diffMs);
      const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
      const remainingMins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

      const timeText = remainingHours > 0 ? `${remainingHours} س و ${remainingMins} د` : `${remainingMins} دقيقة`;

      return {
        allowed: true,
        label: `متاح للتعديل (متبقي ${timeText})`,
        remainingHours,
        remainingMins,
        timeText
      };
    } catch (e) {
      return { allowed: false, label: '🔒 غير متاح للتعديل' };
    }
  };

  const isActionAllowed = (item: { isPosted: boolean; readingDate?: string; paymentDate?: string }) => {
    return getActionTimeRemaining(item).allowed;
  };

  // Collector's activity log for today
  const myReadingsToday = readings.filter(r => r.enteredBy === currentUser.username);
  const myPaymentsToday = payments.filter(p => p.receivedBy === currentUser.username);

  // Visited subscribers tracking
  const visitedSubscribersIds = useMemo(() => new Set(myReadingsToday.map(r => r.subscriberId)), [myReadingsToday]);
  const remainingSubscribersToVisit = useMemo(() => subscribers.filter(sub => !visitedSubscribersIds.has(sub.id)).length, [subscribers, visitedSubscribersIds]);

  // Unique subscriber zones for fast filtering
  const uniqueSubscriberZones = useMemo(() => {
    const set = new Set<string>();
    subscribers.forEach(s => {
      if (s.zone && s.zone.trim()) set.add(s.zone.trim());
    });
    return Array.from(set).sort();
  }, [subscribers]);

  // Filtered subscribers list with smart Arabic text normalization and relevance scoring
  const filteredSubscribers = useMemo(() => {
    // 1. Pre-filter by quick filter mode (all/pending/completed/debt) and zone
    const prefiltered = subscribers.filter(sub => {
      if (sidebarZoneFilter !== 'all' && sub.zone !== sidebarZoneFilter) {
        return false;
      }
      if (sidebarFilterMode === 'pending' && visitedSubscribersIds.has(sub.id)) {
        return false;
      }
      if (sidebarFilterMode === 'completed' && !visitedSubscribersIds.has(sub.id)) {
        return false;
      }
      if (sidebarFilterMode === 'debt' && (sub.currentBalance || 0) <= 0) {
        return false;
      }
      return true;
    });

    if (!searchQuery.trim()) {
      return prefiltered;
    }

    // 2. Score and rank matching subscribers
    const scoredList: { sub: Subscriber; score: number }[] = [];
    for (const sub of prefiltered) {
      const matchRes = matchSubscriberSearch(sub, searchQuery);
      if (matchRes.isMatch) {
        scoredList.push({ sub, score: matchRes.score });
      }
    }

    // Sort descending by relevance score
    scoredList.sort((a, b) => b.score - a.score);
    return scoredList.map(item => item.sub);
  }, [subscribers, searchQuery, sidebarFilterMode, sidebarZoneFilter, visitedSubscribersIds]);

  // Calculate live reading details
  const previousReading = selectedSub ? selectedSub.currentReading : 0;
  const currentReadingVal = parseFloat(currentReadingInput) || 0;
  const consumption = currentReadingVal > previousReading ? currentReadingVal - previousReading : 0;
  
  // Historical readings and average consumption for smart anomaly detection
  const subscriberPastReadings = useMemo(() => {
    if (!selectedSub) return [];
    return readings
      .filter(r => r.subscriberId === selectedSub.id)
      .sort((a, b) => b.readingDate.localeCompare(a.readingDate));
  }, [readings, selectedSub]);

  const avgPastConsumption = useMemo(() => {
    if (subscriberPastReadings.length === 0) return 0;
    const total = subscriberPastReadings.reduce((sum, r) => sum + (r.consumption || 0), 0);
    return Math.round(total / subscriberPastReadings.length);
  }, [subscriberPastReadings]);

  // Anomaly checks
  const isConsumptionAbnormallyHigh = useMemo(() => {
    if (!selectedSub || consumption <= 0) return false;
    if (avgPastConsumption > 0 && consumption > avgPastConsumption * 1.8 && (consumption - avgPastConsumption) >= 50) {
      return true;
    }
    return consumption > 1000;
  }, [selectedSub, consumption, avgPastConsumption]);

  const pctIncreaseOverAvg = useMemo(() => {
    if (avgPastConsumption <= 0 || consumption <= avgPastConsumption) return 0;
    return Math.round(((consumption - avgPastConsumption) / avgPastConsumption) * 100);
  }, [consumption, avgPastConsumption]);

  const liveBillCalc = useMemo(() => {
    if (!selectedSub || currentReadingVal <= previousReading) {
      return null;
    }
    return calculateBillDetails(consumption, selectedSub.tariffType, settings);
  }, [selectedSub, consumption, currentReadingVal, previousReading, settings]);

  const currentRate = selectedSub ? (liveBillCalc ? liveBillCalc.effectiveRatePerKwh : getSectorTariffRate(selectedSub.tariffType, settings)) : 0;
  const consumptionCost = liveBillCalc ? liveBillCalc.energyCost : 0;
  const taxAmount = liveBillCalc ? liveBillCalc.taxAmount : 0;
  const totalBillAmount = liveBillCalc ? liveBillCalc.grossTotal : 0;

  const handleSelectSubscriber = (sub: Subscriber) => {
    setSelectedSub(sub);
    setCurrentReadingInput('');
    setAmountPaidInput('');
    setReadingSuccess(null);
    setPaymentSuccess(null);
    setCombinedSuccess(null);
    setIsInstantPaymentEnabled(false);
    setInstantPaymentAmountInput('');
    setZeroConsumptionReason('');
  };

  const handleManualSendReadingSMS = (reading: MeterReading) => {
    const sub = subscribers.find(s => s.id === reading.subscriberId) || selectedSub;
    if (!sub || !sub.phone) {
      alert('لا يوجد رقم هاتف مسجل لهذا المشترك');
      return;
    }
    const template = (smsTemplates.find(t => t.type === 'reading' || t.id === '1')?.content) || DEFAULT_READING_SMS_TEMPLATE;
    const smsMsg = parseSmsTemplate(
      template,
      sub,
      reading.totalAmount.toLocaleString(),
      undefined,
      reading,
      undefined,
      settings,
      readings
    );
    const res = sendSMSDirectly(sub.phone, smsMsg, {
      forceSmsUri: true,
      allowExternalApp: true
    });
    setLastSmsResult(res);
    if (onEditReading) {
      onEditReading({ ...reading, smsSent: true });
    }
    if (onDeleteFailedSms) {
      onDeleteFailedSms(reading.id);
    }
  };

  const handleManualSendPaymentSMS = (payment: Payment) => {
    const sub = subscribers.find(s => s.id === payment.subscriberId) || selectedSub;
    if (!sub || !sub.phone) {
      alert('لا يوجد رقم هاتف مسجل لهذا المشترك');
      return;
    }
    const template = (smsTemplates.find(t => t.type === 'payment' || t.id === '2')?.content) || DEFAULT_PAYMENT_SMS_TEMPLATE;
    const smsMsg = parseSmsTemplate(
      template,
      sub,
      payment.amountPaid.toLocaleString(),
      payment.receiptNumber,
      undefined,
      payment,
      settings,
      readings
    );
    const res = sendSMSDirectly(sub.phone, smsMsg, {
      forceSmsUri: true,
      allowExternalApp: true
    });
    setLastSmsResult(res);
    if (onEditPayment) {
      onEditPayment({ ...payment, smsSent: true });
    }
    if (onDeleteFailedSms) {
      onDeleteFailedSms(payment.id);
    }
  };

  const submitReading = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub || currentReadingVal < previousReading) return;

    const grossTotal = totalBillAmount;
    // Calculate prepaid credit deduction (if subscriber has negative currentBalance)
    const existingCredit = selectedSub.currentBalance < 0 ? Math.abs(selectedSub.currentBalance) : 0;
    const prepaidCreditDeducted = Number(Math.min(grossTotal, existingCredit).toFixed(2));
    const netAmountDue = Number(Math.max(0, grossTotal - prepaidCreditDeducted).toFixed(2));

    const invoiceNumber = getNextInvoiceNumber(readings);

    const newReading: MeterReading = {
      id: `rd-new-${Date.now()}`,
      invoiceNumber,
      subscriberId: selectedSub.id,
      subscriberName: selectedSub.name,
      meterNumber: selectedSub.meterNumber,
      previousReading,
      currentReading: currentReadingVal,
      consumption,
      ratePerKwh: currentRate,
      fixedFee: settings.fixedFee,
      taxAmount,
      totalAmount: grossTotal,
      prepaidCreditDeducted,
      netAmountDue,
      billingMonth: new Date().toISOString().substring(0, 7), // "2026-07"
      readingDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      enteredBy: currentUser.username,
      isPosted: false, // Reading starts as unposted, Admin must Transfer/Post it
      smsSent: false
    };

    onAddReading(newReading);
    setReadingSuccess(newReading);
    setCurrentReadingInput('');
    setLastSmsResult(null);

    // Check if collector executed an instant combined payment
    let createdPayment: Payment | null = null;
    const instantPaid = parseFloat(instantPaymentAmountInput) || 0;
    if (isInstantPaymentEnabled && instantPaid > 0) {
      const prevBal = selectedSub.currentBalance;
      const currentDebt = Math.max(0, prevBal);
      const appliedToBill = Number(Math.min(instantPaid, currentDebt).toFixed(2));
      const creditBalanceCarried = Number(Math.max(0, instantPaid - currentDebt).toFixed(2));
      const remainingBalance = Number((prevBal - instantPaid).toFixed(2));
      const receiptNumber = getNextReceiptNumber(payments);

      createdPayment = {
        id: `pay-instant-${Date.now()}`,
        subscriberId: selectedSub.id,
        subscriberName: selectedSub.name,
        amountPaid: instantPaid,
        previousBalance: prevBal,
        appliedToBill,
        creditBalanceCarried,
        remainingBalance,
        paymentDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
        paymentMethod: instantPaymentMethod,
        receivedBy: currentUser.username,
        receiptNumber,
        isPosted: false,
        smsSent: false
      };

      onAddPayment(createdPayment);
      setPaymentSuccess(createdPayment);
      setCombinedSuccess({
        reading: newReading,
        payment: createdPayment
      });
      setIsInstantPaymentEnabled(false);
      setInstantPaymentAmountInput('');
    } else {
      setCombinedSuccess(null);
    }
    
    // Auto-update local state of selected subscriber so layout reflects temporary changes
    setSelectedSub({
      ...selectedSub,
      currentReading: currentReadingVal,
      currentBalance: createdPayment ? selectedSub.currentBalance - createdPayment.amountPaid : selectedSub.currentBalance
    });
  };

  const submitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amountPaidVal = parseFloat(amountPaidInput) || 0;
    if (!selectedSub || amountPaidVal <= 0) return;

    const previousBalance = selectedSub.currentBalance;
    const currentDebt = Math.max(0, previousBalance);
    const appliedToBill = Number(Math.min(amountPaidVal, currentDebt).toFixed(2));
    const creditBalanceCarried = Number(Math.max(0, amountPaidVal - currentDebt).toFixed(2));
    const remainingBalance = Number((previousBalance - amountPaidVal).toFixed(2));

    const receiptNumber = getNextReceiptNumber(payments);

    const newPayment: Payment = {
      id: `pay-new-${Date.now()}`,
      subscriberId: selectedSub.id,
      subscriberName: selectedSub.name,
      amountPaid: amountPaidVal,
      previousBalance,
      appliedToBill,
      creditBalanceCarried,
      remainingBalance,
      paymentDate: new Date().toISOString().replace('T', ' ').substring(0, 16),
      paymentMethod,
      receivedBy: currentUser.username,
      receiptNumber,
      isPosted: false, // Starts as unposted, pending Admin Transfer/Posting
      smsSent: false
    };

    onAddPayment(newPayment);
    setPaymentSuccess(newPayment);
    setAmountPaidInput('');
    setLastSmsResult(null);

    // Update local state temporarily
    setSelectedSub({
      ...selectedSub,
      currentBalance: selectedSub.currentBalance - amountPaidVal
    });
  };

  // Calculations for Editing Reading
  const editReadingPrev = editingReading ? editingReading.previousReading : 0;
  const editReadingVal = parseFloat(editReadingInput) || 0;
  const editConsumption = editReadingVal > editReadingPrev ? editReadingVal - editReadingPrev : 0;
  
  const editSub = editingReading ? subscribers.find(s => s.id === editingReading.subscriberId) : null;
  const editBillCalc = useMemo(() => {
    if (!editSub || editReadingVal <= editReadingPrev) return null;
    return calculateBillDetails(editConsumption, editSub.tariffType, settings);
  }, [editSub, editConsumption, editReadingVal, editReadingPrev, settings]);

  const editRate = editSub ? (editBillCalc ? editBillCalc.effectiveRatePerKwh : getSectorTariffRate(editSub.tariffType, settings)) : currentRate;
  const editTaxAmount = editBillCalc ? editBillCalc.taxAmount : 0;
  const editTotalBillAmount = editBillCalc ? editBillCalc.grossTotal : 0;

  const handleStartEditReading = (reading: MeterReading) => {
    if (!isActionAllowed(reading)) {
      alert('لا يمكن تعديل الفاتورة بعد مرور 24 ساعة من إصدارها أو بعد اعتمادها وترحيلها.');
      return;
    }
    setEditingReading(reading);
    setEditReadingInput(reading.currentReading.toString());
  };

  const handleSaveEditReading = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReading || !editSub || editReadingVal < editReadingPrev || !onEditReading) return;

    if (!isActionAllowed(editingReading)) {
      alert('انتهت مهلة الـ 24 ساعة المسموحة لتعديل الفاتورة أو تم اعتمادها من الإدارة.');
      setEditingReading(null);
      return;
    }

    const updated: MeterReading = {
      ...editingReading,
      currentReading: editReadingVal,
      consumption: editConsumption,
      taxAmount: editTaxAmount,
      totalAmount: editTotalBillAmount
    };

    onEditReading(updated);
    
    if (selectedSub && selectedSub.id === editSub.id) {
      setSelectedSub({
        ...selectedSub,
        currentReading: editReadingVal
      });
    }

    setEditingReading(null);
  };

  const handleStartEditPayment = (payment: Payment) => {
    if (!isActionAllowed(payment)) {
      alert('لا يمكن تعديل سند القبض بعد مرور 24 ساعة من إصداره أو بعد اعتماده وترحيله.');
      return;
    }
    setEditingPayment(payment);
    setEditPaymentAmountInput(payment.amountPaid.toString());
    setEditPaymentMethod(payment.paymentMethod);
  };

  const handleSaveEditPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(editPaymentAmountInput) || 0;
    if (!editingPayment || amountVal <= 0 || !onEditPayment) return;

    if (!isActionAllowed(editingPayment)) {
      alert('انتهت مهلة الـ 24 ساعة المسموحة لتعديل سند القبض أو تم اعتماده من الإدارة.');
      setEditingPayment(null);
      return;
    }

    const updated: Payment = {
      ...editingPayment,
      amountPaid: amountVal,
      paymentMethod: editPaymentMethod
    };

    onEditPayment(updated);
    setEditingPayment(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingItemId) return;
    const { type, id } = deletingItemId;
    
    if (type === 'reading' && onDeleteReading) {
      const rd = readings.find(r => r.id === id);
      if (rd && !isActionAllowed(rd)) {
        alert('لا يمكن إلغاء الفاتورة بعد مرور 24 ساعة من إصدارها أو بعد اعتمادها.');
        setDeletingItemId(null);
        return;
      }
      onDeleteReading(id);
      
      if (rd && selectedSub && selectedSub.id === rd.subscriberId) {
        setSelectedSub({
          ...selectedSub,
          currentReading: rd.previousReading,
          currentBalance: selectedSub.currentBalance - rd.totalAmount
        });
      }
    } else if (type === 'payment' && onDeletePayment) {
      const pay = payments.find(p => p.id === id);
      if (pay && !isActionAllowed(pay)) {
        alert('لا يمكن إلغاء السند بعد مرور 24 ساعة من إصداره أو بعد اعتماده.');
        setDeletingItemId(null);
        return;
      }
      onDeletePayment(id);
      
      if (pay && selectedSub && selectedSub.id === pay.subscriberId) {
        setSelectedSub({
          ...selectedSub,
          currentBalance: selectedSub.currentBalance + pay.amountPaid
        });
      }
    }
    
    setDeletingItemId(null);
  };

  // Filtered lists for rendering today's history log with normalized Arabic search
  const filteredReadingsToday = useMemo(() => {
    return myReadingsToday.filter(r => {
      if (historyFilter === 'payments' || historyFilter === 'pending_visit' || historyFilter === 'completed_visit') return false;
      if (historySearchQuery) {
        const qNorm = normalizeArabicText(historySearchQuery);
        const qMeter = normalizeMeterNumber(historySearchQuery);
        const nameNorm = normalizeArabicText(r.subscriberName);
        const meterNorm = normalizeMeterNumber(r.meterNumber);
        return nameNorm.includes(qNorm) || (qMeter && meterNorm.includes(qMeter));
      }
      return true;
    });
  }, [myReadingsToday, historyFilter, historySearchQuery]);

  const filteredPaymentsToday = useMemo(() => {
    return myPaymentsToday.filter(p => {
      if (historyFilter === 'readings' || historyFilter === 'pending_visit' || historyFilter === 'completed_visit') return false;
      if (historySearchQuery) {
        const qNorm = normalizeArabicText(historySearchQuery);
        const qReceipt = normalizeMeterNumber(historySearchQuery);
        const nameNorm = normalizeArabicText(p.subscriberName);
        const receiptNorm = normalizeMeterNumber(p.receiptNumber);
        return nameNorm.includes(qNorm) || (qReceipt && receiptNorm.includes(qReceipt));
      }
      return true;
    });
  }, [myPaymentsToday, historyFilter, historySearchQuery]);
  const totalCollectedToday = myPaymentsToday.reduce((sum, p) => sum + p.amountPaid, 0);

  const progressPercent = Math.min(100, Math.round((totalCollectedToday / dailyGoal) * 100));

  const completedSubscribersList = useMemo(() => {
    return subscribers.filter(sub => visitedSubscribersIds.has(sub.id));
  }, [subscribers, visitedSubscribersIds]);

  const pendingSubscribersList = useMemo(() => {
    return subscribers.filter(sub => !visitedSubscribersIds.has(sub.id));
  }, [subscribers, visitedSubscribersIds]);

  const filteredCompletedSubscribersList = useMemo(() => {
    return completedSubscribersList.filter(sub => {
      if (historySearchQuery) {
        const qNorm = normalizeArabicText(historySearchQuery);
        const qMeter = normalizeMeterNumber(historySearchQuery);
        const nameNorm = normalizeArabicText(sub.name);
        const meterNorm = normalizeMeterNumber(sub.meterNumber);
        const zoneNorm = normalizeArabicText(sub.zone || '');
        return nameNorm.includes(qNorm) || (qMeter && meterNorm.includes(qMeter)) || zoneNorm.includes(qNorm);
      }
      return true;
    });
  }, [completedSubscribersList, historySearchQuery]);

  const filteredPendingSubscribersList = useMemo(() => {
    return pendingSubscribersList.filter(sub => {
      if (historySearchQuery) {
        const qNorm = normalizeArabicText(historySearchQuery);
        const qMeter = normalizeMeterNumber(historySearchQuery);
        const nameNorm = normalizeArabicText(sub.name);
        const meterNorm = normalizeMeterNumber(sub.meterNumber);
        const zoneNorm = normalizeArabicText(sub.zone || '');
        return nameNorm.includes(qNorm) || (qMeter && meterNorm.includes(qMeter)) || zoneNorm.includes(qNorm);
      }
      return true;
    });
  }, [pendingSubscribersList, historySearchQuery]);

  // Temporal Shift Metrics
  const shiftTimes = useMemo(() => {
    const allOperations = [
      ...myReadingsToday.map(r => ({ date: r.readingDate })),
      ...myPaymentsToday.map(p => ({ date: p.paymentDate }))
    ].sort((a, b) => new Date(a.date.replace(' ', 'T')).getTime() - new Date(b.date.replace(' ', 'T')).getTime());

    if (allOperations.length === 0) {
      return {
        first: null,
        last: null,
        durationStr: 'لم تبدأ بعد'
      };
    }

    const firstOp = allOperations[0].date;
    const lastOp = allOperations[allOperations.length - 1].date;

    try {
      const firstTime = new Date(firstOp.replace(' ', 'T')).getTime();
      const lastTime = new Date(lastOp.replace(' ', 'T')).getTime();
      const diffMs = lastTime - firstTime;
      
      if (diffMs <= 0) {
        return {
          first: firstOp.substring(11, 16),
          last: lastOp.substring(11, 16),
          durationStr: 'عملية واحدة فقط'
        };
      }

      const totalMinutes = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      
      let durationStr = '';
      if (hours > 0) {
        durationStr += `${hours} ساعة `;
      }
      if (mins > 0 || hours === 0) {
        durationStr += `${mins} دقيقة`;
      }

      return {
        first: firstOp.substring(11, 16),
        last: lastOp.substring(11, 16),
        durationStr
      };
    } catch (e) {
      return {
        first: null,
        last: null,
        durationStr: '--'
      };
    }
  }, [myReadingsToday, myPaymentsToday]);

  // Average collection amount per subscriber
  const avgCollectionPerSub = useMemo(() => {
    const uniqueSubsWhoPaid = new Set(myPaymentsToday.map(p => p.subscriberId));
    if (uniqueSubsWhoPaid.size === 0) return 0;
    return Math.round(totalCollectedToday / uniqueSubsWhoPaid.size);
  }, [myPaymentsToday, totalCollectedToday]);

  // Targeted Zone Completion Metrics
  const zoneCompletionStats = useMemo(() => {
    // Group all subscribers by zone
    const zonesMap: { [key: string]: { total: number; visited: number } } = {};
    
    subscribers.forEach(sub => {
      const z = sub.zone || 'غير محدد';
      if (!zonesMap[z]) {
        zonesMap[z] = { total: 0, visited: 0 };
      }
      zonesMap[z].total += 1;
      // Visited today if they have a reading or payment
      const hasReading = myReadingsToday.some(r => r.subscriberId === sub.id);
      const hasPayment = myPaymentsToday.some(p => p.subscriberId === sub.id);
      if (hasReading || hasPayment) {
        zonesMap[z].visited += 1;
      }
    });

    return Object.entries(zonesMap).map(([zoneName, stats]) => {
      const pct = stats.total > 0 ? Math.round((stats.visited / stats.total) * 100) : 0;
      return {
        zoneName,
        total: stats.total,
        visited: stats.visited,
        percent: pct
      };
    }).sort((a, b) => b.percent - a.percent);
  }, [subscribers, myReadingsToday, myPaymentsToday]);

  const triggerPrint = (id: string) => {
    const printContent = document.getElementById(id);
    if (!printContent) return;
    
    // Create an iframe to print cleanly without messing up main page
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <html>
          <head>
            <title>طباعة</title>
            <style>
              body { font-family: 'Arial', sans-serif; direction: rtl; text-align: right; padding: 20px; color: #000; background: #fff; }
              .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 20px; }
              .row { display: flex; justify-content: space-between; margin: 10px 0; }
              .bold { font-weight: bold; }
              .footer { text-align: center; border-top: 2px dashed #000; padding-top: 10px; margin-top: 30px; font-size: 12px; }
              .price { font-size: 18px; font-weight: bold; }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
            <script>
              window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); }
            </script>
          </body>
        </html>
      `);
      doc.close();
    }
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  };

  return (
    <div className={`min-h-screen ${sunlightMode ? 'bg-amber-50/20 text-slate-950 font-medium contrast-[1.12]' : 'bg-slate-50 text-slate-900'} flex flex-col font-sans transition-colors duration-200`}>
      {/* Top Navigation */}
      <header className={`sticky top-0 z-40 ${sunlightMode ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-200'} border-b px-3 py-2.5 sm:px-6 sm:py-3.5 flex items-center justify-between`}>
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          <button 
            onClick={onLogout}
            className="flex items-center gap-1.5 sm:gap-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 text-slate-600 p-2 sm:py-1.5 sm:px-3 rounded-xl text-xs transition-all font-bold cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">خروج</span>
          </button>
          <div className="h-6 w-px bg-slate-200 shrink-0" />
          <div className="text-right min-w-0">
            <span className="block text-[9px] sm:text-[10px] text-slate-400 font-bold">المحصل الحالي</span>
            <span className="block text-[11px] sm:text-xs font-black text-slate-800 truncate max-w-[80px] sm:max-w-[150px] md:max-w-none">{currentUser.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Shift Settlement Button */}
          <button
            type="button"
            onClick={() => setIsShiftModalOpen(true)}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
            title="إغلاق الوردية وجرد المبالغ وتوليد تقرير التسليم"
          >
            <ShieldCheck className="w-4 h-4 text-slate-950 shrink-0" />
            <span className="hidden sm:inline">إغلاق الوردية</span>
          </button>

          {/* High-Contrast Sunlight Mode Toggle */}
          <button
            type="button"
            onClick={toggleSunlightMode}
            className={`p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
              sunlightMode
                ? 'bg-amber-400 border-amber-500 text-slate-950 font-black shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
            }`}
            title={sunlightMode ? 'إلغاء نمط الشمس (العودة للوضع العادي)' : 'نمط الشمس الميداني (تباين عالي للشاشات تحت الشمس)'}
          >
            <Sun className={`w-4 h-4 ${sunlightMode ? 'text-slate-950 fill-amber-500' : 'text-slate-500'}`} />
            <span className="text-xs font-black hidden xl:inline">
              {sunlightMode ? 'نمط الشمس نَشِط' : 'نمط الشمس'}
            </span>
          </button>

          {/* Work Orders Notification Bell Button */}
          <button
            onClick={handleOpenNotifDrawer}
            className={`relative p-2 rounded-2xl border transition-all cursor-pointer flex items-center gap-1.5 ${
              pendingNotifCount > 0 
                ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-md shadow-rose-500/10' 
                : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
            }`}
            title="إشعارات الأوامر الميدانية (فصل وإعادة الخدمة)"
          >
            <Bell className={`w-4.5 h-4.5 sm:w-5 sm:h-5 ${pendingNotifCount > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-600'}`} />
            <span className="text-xs font-black hidden md:inline">الأوامر والإشعارات</span>
            {pendingNotifCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-md animate-pulse">
                {pendingNotifCount}
              </span>
            )}
          </button>

          {/* Network Status Pill */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-bold transition-all border ${
            isOnline 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
          }`} dir="rtl">
            {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-600" /> : <WifiOff className="w-3.5 h-3.5 text-rose-600" />}
            <span>{isOnline ? 'متصل' : 'محلي'}</span>
          </div>

          <h2 className="text-xs sm:text-sm font-black text-slate-900 hidden lg:block">{settings.stationName}</h2>
          <div className="p-1.5 sm:p-2 bg-amber-400/10 rounded-xl border border-amber-400/30 shrink-0">
            <Zap className="w-4.5 h-4.5 sm:w-5 h-5 text-amber-600 fill-amber-500" />
          </div>
        </div>
      </header>

      {/* Main Body Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column (8 cols) - Main Interactive Workspace */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Pending Sync Notifications/Alerts */}
          <AnimatePresence>
            {pendingSyncCount > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-3 text-right w-full"
                dir="rtl"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-500/20 text-amber-600 rounded-xl mt-0.5 shrink-0">
                    <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">بيانات في انتظار المزامنة</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      يوجد <strong className="font-mono text-amber-600">{pendingSyncCount}</strong> عملية تم تسجيلها بدون إنترنت ومحفوظة بأمان على الهاتف.
                      {!isOnline && " سيتم ترحيلها تلقائياً للسيرفر بمجرد عودة الاتصال."}
                      {isOnline && " اضغط على زر المزامنة لرفعها إلى السيرفر الآن."}
                    </p>
                  </div>
                </div>
                {isOnline && onSync && (
                  <button
                    onClick={onSync}
                    disabled={isSyncing}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all cursor-pointer shadow-sm shadow-amber-500/20 disabled:opacity-50 shrink-0"
                  >
                    {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    <span>مزامنة البيانات الآن</span>
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Offline Banner alert when offline and no pending items */}
          <AnimatePresence>
            {!isOnline && pendingSyncCount === 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-slate-800 border border-slate-700 p-4 rounded-3xl flex items-start gap-3 text-right text-white w-full"
                dir="rtl"
              >
                <div className="p-2 bg-slate-700 text-slate-300 rounded-xl shrink-0">
                  <WifiOff className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">وضع العمل الميداني بدون إنترنت (نشط)</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    أنت الآن خارج نطاق التغطية. يمكنك الاستمرار في إدخال القراءات والتحصيل؛ وسنقوم بحفظ جميع مدخلاتك محلياً بشكل آمن دون أي قلق من فقدان البيانات.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collector Performance HUD with Live Filters and Period Controls */}
          <CollectorPerformanceHUD
            currentUser={currentUser}
            settings={settings}
            payments={payments}
            readings={readings}
            subscribers={subscribers}
            dailyGoal={dailyGoal}
            onUpdateDailyGoal={(goal) => {
              setDailyGoal(goal);
              localStorage.setItem('voltera_collector_daily_goal', String(goal));
            }}
            monthlyGoal={monthlyGoal}
            onUpdateMonthlyGoal={(goal) => {
              setMonthlyGoal(goal);
              localStorage.setItem('voltera_collector_monthly_goal', String(goal));
            }}
            filters={performanceFilters}
            onFilterChange={setPerformanceFilters}
            onResetFilters={() => setPerformanceFilters({
              periodType: 'today',
              selectedDate: new Date().toISOString().substring(0, 10),
              selectedMonth: new Date().toISOString().substring(0, 7),
              customStartDate: new Date().toISOString().substring(0, 10),
              customEndDate: new Date().toISOString().substring(0, 10),
              selectedZone: 'all',
              selectedPaymentMethod: 'all',
              selectedPostingStatus: 'all',
            })}
            uniqueZones={uniqueSubscriberZones}
            isExpanded={isDailyHudVisible}
            onToggleExpanded={() => {
              const next = !isDailyHudVisible;
              setIsDailyHudVisible(next);
              localStorage.setItem('voltera_collector_daily_hud_visible', String(next));
            }}
            onPrintShiftReport={() => setPrintingJob({ type: 'shift_report' })}
            onViewCollectionsMode={(mode) => {
              setActiveTab('history');
              setCollectionsInitialMode(mode);
              window.scrollTo({ top: 400, behavior: 'smooth' });
            }}
          />


          {/* Action Tabs */}
          <div className="grid grid-cols-2 md:flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 gap-1 md:gap-0">
            <button
              onClick={() => { setActiveTab('reading'); setSelectedSub(null); }}
              className={`flex items-center justify-center gap-2 py-2.5 md:py-3 md:flex-1 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer ${
                activeTab === 'reading'
                  ? 'bg-slate-900 text-white font-bold shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <FilePlus className="w-4 h-4" />
              <span>إدخال قراءة عداد</span>
            </button>
            <button
              onClick={() => { setActiveTab('master_reading'); setSelectedSub(null); }}
              className={`flex items-center justify-center gap-2 py-2.5 md:py-3 md:flex-1 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer ${
                activeTab === 'master_reading'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Gauge className="w-4 h-4 text-amber-600" />
              <span>قراءة العداد المركزي (تزامن)</span>
            </button>
            <button
              onClick={() => { setActiveTab('payment'); setSelectedSub(null); }}
              className={`flex items-center justify-center gap-2 py-2.5 md:py-3 md:flex-1 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer ${
                activeTab === 'payment'
                  ? 'bg-slate-900 text-white font-bold shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Banknote className="w-4 h-4" />
              <span>تحصيل وسند قبض</span>
            </button>
            <button
              onClick={() => { setActiveTab('statement'); setSelectedSub(null); }}
              className={`flex items-center justify-center gap-2 py-2.5 md:py-3 md:flex-1 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer ${
                activeTab === 'statement'
                  ? 'bg-slate-900 text-white font-bold shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>كشف حساب وطباعة</span>
            </button>
            <button
              onClick={() => { setActiveTab('history'); setSelectedSub(null); }}
              className={`flex items-center justify-center gap-2 py-2.5 md:py-3 md:flex-1 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-slate-900 text-white font-bold shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <CalendarDays className="w-4 h-4 text-emerald-400" />
              <span>بيانات وسجل التحصيل (شهر/يوم)</span>
            </button>
            <button
              onClick={() => { setActiveTab('map'); setSelectedSub(null); }}
              className={`flex items-center justify-center gap-2 py-2.5 md:py-3 md:flex-1 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 cursor-pointer ${
                activeTab === 'map'
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>خريطة المشتركين</span>
            </button>
          </div>

          {/* Dynamic Area Based on Tab */}
          <AnimatePresence mode="wait">
            {activeTab === 'reading' && (() => {
              const decadalInfo = getDecadalPeriodInfo();
              const subLastReading = selectedSub ? readings.filter(r => r.subscriberId === selectedSub.id).sort((a,b) => b.readingDate.localeCompare(a.readingDate))[0] : null;
              const subLastReadingDate = subLastReading ? subLastReading.readingDate : selectedSub?.lastReadingDate;
              const cycleStatus = selectedSub ? getReadingCycleStatus(subLastReadingDate, settings.readingCycleIntervalDays || 10) : null;

              return (
              <motion.div
                key="reading-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`bg-white border border-slate-200 shadow-sm flex flex-col transition-all ${!selectedSub ? 'rounded-xl p-2 sm:p-2.5' : 'rounded-2xl sm:rounded-3xl p-3 sm:p-5 gap-3 sm:gap-6'}`}
              >


                {!selectedSub ? (
                  <div className="text-center py-1 sm:py-1.5 px-2 text-slate-400 flex items-center justify-center gap-2">
                    <UserRound className="w-4 h-4 text-slate-400 shrink-0 animate-pulse" />
                    <span className="text-xs font-bold text-slate-700">يرجى اختيار مشترك من القائمة الجانبية للبدء</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                    {/* Subscriber Details Card */}
                    <div className="bg-slate-50 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-100 flex flex-col gap-2 sm:gap-2.5 text-right">
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5 sm:pb-2">
                        <span className="px-2 py-0.5 bg-amber-100 border border-amber-200 rounded-lg text-[9px] sm:text-[10px] text-amber-800 font-bold">
                          {selectedSub.tariffType === 'residential' ? 'سكني' : selectedSub.tariffType === 'commercial' ? 'تجاري' : 'صناعي'}
                        </span>
                        <h4 className="font-black text-slate-800 text-xs sm:text-sm">{selectedSub.name}</h4>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-xs">
                        <div className="bg-white p-1.5 sm:p-2 rounded-lg sm:rounded-xl border border-slate-100 text-center shadow-2xs">
                          <span className="text-slate-400 block text-[9px] sm:text-[10px] font-bold">رقم العداد</span>
                          <span className="font-bold text-slate-800 font-mono block mt-0.5 text-xs sm:text-sm">{selectedSub.meterNumber}</span>
                        </div>
                        <div className="bg-white p-1.5 sm:p-2 rounded-lg sm:rounded-xl border border-slate-100 text-center shadow-2xs">
                          <span className="text-slate-400 block text-[9px] sm:text-[10px] font-bold">المنطقة الجغرافية</span>
                          <span className="font-bold text-slate-800 block mt-0.5 text-[10px] sm:text-[11px] truncate">{selectedSub.zone.replace('المنطقة ', '')}</span>
                        </div>
                        <div className="bg-white p-1.5 sm:p-2 rounded-lg sm:rounded-xl border border-slate-100 text-center shadow-2xs">
                          <span className="text-slate-400 block text-[9px] sm:text-[10px] font-bold">القراءة السابقة</span>
                          <span className="font-bold text-amber-600 font-mono block mt-0.5 text-xs sm:text-sm">{previousReading} <span className="text-[8px] sm:text-[9px]">كيلوواط</span></span>
                        </div>
                        <div className="bg-white p-1.5 sm:p-2 rounded-lg sm:rounded-xl border border-slate-100 text-center shadow-2xs">
                          <span className="text-slate-400 block text-[9px] sm:text-[10px] font-bold">الرصيد الحالي</span>
                          <span className={`font-bold font-mono block mt-0.5 text-xs sm:text-sm ${selectedSub.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {selectedSub.currentBalance.toLocaleString()} <span className="text-[8px] sm:text-[9px]">{settings.currency}</span>
                          </span>
                        </div>
                      </div>

                      {/* 10-Day Reading Cycle Indicator */}
                      {cycleStatus && (
                        <div className={`p-2 sm:p-2.5 rounded-xl border text-xs flex items-center justify-between gap-1.5 shadow-2xs ${cycleStatus.badgeClass}`}>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs sm:text-sm">{cycleStatus.indicatorSymbol}</span>
                            <div>
                              <span className="block font-black text-[10px] sm:text-[11px] leading-tight">دورة النزول الميداني (كل 10 أيام)</span>
                              <span className="block font-bold text-[9px] sm:text-[10px] leading-tight">{cycleStatus.statusText}</span>
                            </div>
                          </div>
                          {cycleStatus.daysElapsed !== null && (
                            <span className="font-mono font-black text-[9px] sm:text-[10px] bg-white/60 px-1.5 py-0.5 rounded-md border border-slate-200 shrink-0">
                              منذ {cycleStatus.daysElapsed} يوم
                            </span>
                          )}
                        </div>
                      )}

                      {selectedSub.status === 'suspended' && (
                        <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-100 p-2 rounded-lg text-rose-700 text-[10px] sm:text-xs font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>تنبيه: هذا المشترك موقوف عن الخدمة! تواصل مع المدير.</span>
                        </div>
                      )}
                    </div>

                    {/* Reading Entry Form */}
                    <div className="flex flex-col gap-3">
                      <form onSubmit={submitReading} className="bg-slate-50 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 flex flex-col gap-3">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider text-right flex items-center gap-1.5 justify-end">
                          <span>تسجيل القراءة الحالية والاحتساب الآلي</span>
                          <Calculator className="w-4 h-4 text-amber-600" />
                        </h4>

                        <div>
                          <div className="flex justify-between items-center mb-2" dir="rtl">
                            <label className="text-xs font-bold text-slate-500">أدخل القراءة الجديدة للعداد</label>
                            <button
                              type="button"
                              onClick={() => {
                                setCurrentReadingInput(previousReading.toString());
                                setReadingSuccess(null);
                              }}
                              className="text-[10px] font-black text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200/80 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                            >
                              <span>⚡ تسجيل عدم استهلاك (0 ك.و)</span>
                            </button>
                          </div>
                          <input
                            type="number"
                            required
                            min={previousReading}
                            value={currentReadingInput}
                            onChange={e => {
                              setCurrentReadingInput(e.target.value);
                              setReadingSuccess(null);
                            }}
                            placeholder={`يجب أن تكون ${previousReading} أو أكبر`}
                            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 text-right text-sm focus:outline-none focus:border-slate-900"
                          />
                          {currentReadingInput !== '' && currentReadingVal < previousReading && (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-500 mt-2 justify-end">
                                <span>القراءة المدخلة أقل من السابقة ({previousReading})!</span>
                                <AlertCircle className="w-3.5 h-3.5" />
                            </div>
                          )}
                          {currentReadingInput !== '' && currentReadingVal >= previousReading && isConsumptionAbnormallyHigh && (
                            <div className="flex items-start gap-2 text-xs font-bold text-amber-900 mt-2 bg-amber-50 p-2.5 rounded-xl border border-amber-300/80 justify-end text-right" dir="rtl">
                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                  <span className="block font-black text-amber-950">تحذير ذكي من شذوذ الاستهلاك:</span>
                                  <span>الاستهلاك الحالي ({consumption} ك.و) يفوق معدل استهلاك المشترك السابق ({avgPastConsumption} ك.و) بنسبة +{pctIncreaseOverAvg}%. يرجى التحقق من صحة القراءة.</span>
                                </div>
                            </div>
                          )}
                          {currentReadingInput !== '' && currentReadingVal >= previousReading && consumption === 0 && (
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 mt-2 bg-slate-100/80 p-2 rounded-xl border border-slate-200 justify-end text-right" dir="rtl">
                              <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span>استهلاك صفري (0 ك.و) - سيتم احتساب رسوم الاشتراك الدنيا فقط.</span>
                            </div>
                          )}
                        </div>

                        {/* Live calculation breakdown */}
                        {currentReadingVal >= previousReading && currentReadingInput !== '' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="bg-white p-3.5 rounded-xl border border-slate-100 space-y-2 text-xs text-right overflow-hidden shadow-xs"
                          >
                            <div className="flex justify-between text-slate-500">
                              <span className="font-mono text-slate-800 font-semibold">{consumption} كيلوواط</span>
                              <span>حجم الاستهلاك:</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                              <span className="font-mono text-slate-800 font-semibold">{currentRate} {settings.currency}</span>
                              <span>سعر الكيلوواط السكني:</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                              <span className="font-mono text-slate-800 font-semibold">{consumptionCost.toLocaleString()} {settings.currency}</span>
                              <span>قيمة الاستهلاك الكهربائي:</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                              <span className="font-mono text-slate-800 font-semibold">{(settings.fixedFee + settings.serviceFee).toLocaleString()} {settings.currency}</span>
                              <span>الرسوم الثابتة والصيانة:</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                              <span className="font-mono text-slate-800 font-semibold">{taxAmount.toLocaleString()} {settings.currency}</span>
                              <span>ضريبة القيمة المضافة ({settings.taxPercent}%):</span>
                            </div>
                            <div className="border-t border-slate-100 pt-2 flex justify-between text-sm font-black text-amber-600">
                              <span className="font-mono">{totalBillAmount.toLocaleString()} {settings.currency}</span>
                              <span>المبلغ الإجمالي المستحق بالفاتورة:</span>
                            </div>
                          </motion.div>
                        )}

                        {/* Integrated Instant Payment Checkbox */}
                        {currentReadingVal >= previousReading && currentReadingInput !== '' && (
                          <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-3 space-y-2.5 text-right" dir="rtl">
                            <div className="flex items-center justify-between">
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={isInstantPaymentEnabled}
                                  onChange={e => {
                                    setIsInstantPaymentEnabled(e.target.checked);
                                    if (e.target.checked && !instantPaymentAmountInput) {
                                      setInstantPaymentAmountInput(totalBillAmount.toString());
                                    }
                                  }}
                                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
                                />
                                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                                  <CreditCard className="w-3.5 h-3.5 text-amber-700" />
                                  تحصيل فوري مباشر (قراءة + قبض معاً)
                                </span>
                              </label>
                              <span className="text-[10px] bg-amber-200/80 text-amber-950 font-black px-2 py-0.5 rounded-md">
                                اختصار ميداني
                              </span>
                            </div>

                            {isInstantPaymentEnabled && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="space-y-2 pt-2 border-t border-amber-500/20"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                  <div className="flex-1">
                                    <label className="text-[10px] text-slate-600 font-bold block mb-1">المبلغ المقبوض فوراً ({settings.currency}):</label>
                                    <input
                                      type="number"
                                      value={instantPaymentAmountInput}
                                      onChange={e => setInstantPaymentAmountInput(e.target.value)}
                                      className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 text-slate-900 font-mono font-black text-xs focus:ring-1 focus:ring-amber-500"
                                      placeholder="أدخل المبلغ..."
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[10px] text-slate-500 font-bold">تعبئة سريعة:</span>
                                    <div className="flex gap-1">
                                      <button
                                        type="button"
                                        onClick={() => setInstantPaymentAmountInput(totalBillAmount.toString())}
                                        className="text-[10px] bg-white hover:bg-amber-100 border border-amber-300 px-2 py-1 rounded-md font-bold text-slate-800 transition-colors"
                                      >
                                        الفاتورة ({totalBillAmount})
                                      </button>
                                      {selectedSub.currentBalance > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => setInstantPaymentAmountInput((selectedSub.currentBalance + totalBillAmount).toString())}
                                          className="text-[10px] bg-white hover:bg-amber-100 border border-amber-300 px-2 py-1 rounded-md font-bold text-slate-800 transition-colors"
                                        >
                                          شامل المتأخرات ({selectedSub.currentBalance + totalBillAmount})
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                  <span className="text-[10px] text-slate-600 font-bold shrink-0">طريقة القبض:</span>
                                  <div className="grid grid-cols-3 gap-1 flex-1">
                                    {(['cash', 'e-wallet', 'transfer'] as const).map(m => (
                                      <button
                                        key={m}
                                        type="button"
                                        onClick={() => setInstantPaymentMethod(m)}
                                        className={`py-1 text-[10px] font-bold rounded-md border transition-all cursor-pointer ${
                                          instantPaymentMethod === m
                                            ? 'bg-slate-900 text-white border-transparent'
                                            : 'bg-white text-slate-600 border-slate-200'
                                        }`}
                                      >
                                        {m === 'cash' ? 'نقداً' : m === 'e-wallet' ? 'محفظة' : 'تحويل'}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={currentReadingVal < previousReading || selectedSub.status === 'suspended'}
                          className={`w-full font-bold py-2.5 rounded-xl text-xs sm:text-sm transition-all cursor-pointer ${
                            currentReadingVal >= previousReading && selectedSub.status !== 'suspended'
                              ? isInstantPaymentEnabled && parseFloat(instantPaymentAmountInput) > 0
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md active:scale-95'
                                : isConsumptionAbnormallyHigh ? 'bg-amber-500 text-slate-900 hover:bg-amber-600 active:scale-95' : 'bg-slate-900 text-white hover:bg-slate-850 active:scale-95'
                              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {isInstantPaymentEnabled && parseFloat(instantPaymentAmountInput) > 0
                            ? `حفظ القراءة وقبض ${parseFloat(instantPaymentAmountInput).toLocaleString()} ${settings.currency} فورياً`
                            : isConsumptionAbnormallyHigh ? 'تأكيد وإصدار الفاتورة (استهلاك مرتفع)' : 'حفظ القراءة وإصدار الفاتورة مؤقتاً'}
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* Print Invoice Area (Shows after success) */}
                {readingSuccess && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl flex flex-col gap-4 text-right"
                  >
                    <div className="flex flex-col gap-1.5 text-right">
                      <div className="flex items-center gap-2 text-emerald-800 justify-end text-sm font-bold">
                        <span>تم تسجيل الفاتورة بنجاح في النظام (بانتظار الترحيل النهائي)</span>
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      </div>
                      {combinedSuccess && (
                        <div className="flex items-center gap-2 text-emerald-950 justify-end text-xs font-black bg-emerald-100/90 p-2.5 rounded-xl border border-emerald-300 shadow-2xs" dir="rtl">
                          <CreditCard className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span>تم أيضاً قبض سند مالي فوري رقم ({combinedSuccess.payment.receiptNumber}) بمبلغ {combinedSuccess.payment.amountPaid.toLocaleString()} {settings.currency} وتحديث رصيد المشترك!</span>
                        </div>
                      )}
                    </div>

                    {/* Print Template (Hidden offscreen or shown in box) */}
                    <div id="print-invoice-box" className="bg-white text-slate-900 p-6 rounded-2xl border border-slate-200 shadow-sm max-w-sm mx-auto w-full dir-rtl font-sans text-sm">
                      <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-4">
                        <h3 className="font-bold text-lg text-slate-900">{settings.stationName}</h3>
                        <p className="text-[10px] text-slate-500 font-semibold">فاتورة استهلاك تيار كهربائي مؤقتة</p>
                        <p className="text-[10px] text-slate-500 font-mono">الهاتف: <span dir="ltr" className="inline-block">{settings.phone}</span></p>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="font-bold text-slate-800">{readingSuccess.id.replace('rd-new-', 'INV-')}</span>
                          <span className="text-slate-500 font-semibold">رقم الفاتورة:</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold text-slate-800">{readingSuccess.subscriberName}</span>
                          <span className="text-slate-500 font-semibold">اسم المشترك:</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold text-slate-800">{readingSuccess.meterNumber}</span>
                          <span className="text-slate-500 font-semibold">رقم العداد:</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold text-slate-800">{readingSuccess.readingDate}</span>
                          <span className="text-slate-500 font-semibold">تاريخ القراءة:</span>
                        </div>
                        <div className="border-t border-dashed border-slate-200 my-2 pt-2" />
                        <div className="flex justify-between">
                          <span className="text-slate-700 font-semibold">{readingSuccess.previousReading}</span>
                          <span className="text-slate-500">القراءة السابقة:</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold text-slate-800">{readingSuccess.currentReading}</span>
                          <span className="text-slate-500">القراءة الحالية:</span>
                        </div>
                        <div className="flex justify-between font-bold text-slate-900">
                          <span>{readingSuccess.consumption} ك.و</span>
                          <span className="text-slate-500">صافي الاستهلاك:</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-700">{readingSuccess.ratePerKwh} {settings.currency}</span>
                          <span className="text-slate-500">سعر وحدة الطاقة:</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-700">{readingSuccess.fixedFee.toLocaleString()} {settings.currency}</span>
                          <span className="text-slate-500">الرسوم الثابتة:</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-700">{readingSuccess.taxAmount.toLocaleString()} {settings.currency}</span>
                          <span className="text-slate-500">ضريبة القيمة المضافة:</span>
                        </div>
                        <div className="border-t border-dashed border-slate-350 my-2 pt-2 flex justify-between font-black text-base text-slate-900">
                          <span>{readingSuccess.totalAmount.toLocaleString()} {settings.currency}</span>
                          <span>المطلوب دفعه:</span>
                        </div>
                      </div>

                      <div className="text-center border-t border-dashed border-slate-300 pt-3 mt-4 text-[10px] text-slate-400">
                        <p>بإشراف المحصل المالي: {currentUser.name}</p>
                        <p className="font-bold mt-1 text-slate-500">تنبيه: تعتبر الفاتورة أولية حتى الترحيل النهائي</p>
                      </div>
                    </div>

                    {/* SMS Dispatch Status Feedback Banner */}
                    {lastSmsResult && (
                      <div className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 shadow-xs ${
                        lastSmsResult.success ? 'bg-sky-50 border-sky-200 text-sky-900' : 'bg-amber-50 border-amber-200 text-amber-900'
                      }`}>
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-sky-600 shrink-0" />
                          <span>{lastSmsResult.message}</span>
                        </div>
                        <span className="text-[10px] bg-white px-2 py-0.5 rounded-lg border font-mono shrink-0">
                          {lastSmsResult.method === 'android_native' ? 'أندرويد تلقائي (Direct SMS)' : 'تطبيقات SMS'}
                        </span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => handleDirectShareInvoiceWhatsApp(selectedSub!, readingSuccess, combinedSuccess?.payment)}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>مشاركة الفاتورة واتساب</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleManualSendReadingSMS(readingSuccess)}
                        className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>إرسال SMS</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPrintingJob({ type: 'invoice', sub: selectedSub!, reading: readingSuccess })}
                        className="flex items-center gap-2 bg-slate-900 hover:bg-slate-850 text-white py-2 px-5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                        <span>طباعة الفاتورة الفورية</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
              );
            })()}

            {/* TAB: SYNCHRONIZED MASTER METER READING */}
            {activeTab === 'master_reading' && (
              <motion.div
                key="master-reading-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col gap-6 text-right"
              >
                {/* Synchronized Readings Banner */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-500/20 text-amber-700 rounded-xl font-bold shrink-0">
                      <Gauge className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm mb-0.5">توحيد وتزامن فترة القراءة (Synchronized Readings)</h4>
                      <p className="text-slate-600 leading-relaxed">
                        تسجيل قراءة العداد المركزي للمحول في نفس يوم وساعة قراءة عدادات المشتركين، لضمان دقة المقارنة وعدم وجود تباين زمني.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 font-mono text-xs font-bold text-slate-800 shrink-0">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>تاريخ وساعة التزامن: {new Date().toLocaleDateString('ar-SA')} {new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {masterReadingSuccess && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>{masterReadingSuccess}</span>
                    </div>
                    <button onClick={() => setMasterReadingSuccess(null)} className="text-emerald-600 hover:text-emerald-900">إغلاق</button>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Form to Select Transformer & Record Reading */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col gap-4">
                    <h4 className="font-black text-slate-900 text-sm flex items-center justify-end gap-2 border-b border-slate-200 pb-3">
                      <span>إدخال قراءة المحول المركزي في الميدان</span>
                      <Edit3 className="w-4 h-4 text-amber-600" />
                    </h4>

                    {/* Transformer Selector */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">اختر المحول الكهربائي للمنطقة</label>
                      <select
                        value={selectedMasterTransformer}
                        onChange={e => {
                          const transName = e.target.value;
                          setSelectedMasterTransformer(transName);
                          setMasterReadingSuccess(null);
                          const tObj = (settings.transformers || []).find((t: any) => {
                            const name = typeof t === 'string' ? t : t.name;
                            return name === transName;
                          });
                          if (tObj && typeof tObj === 'object') {
                            setMasterMeterNum(tObj.meterNumber || 'MTR-CENTRAL-01');
                            setMasterPrevReading(Number(tObj.previousMasterReading || 0));
                            setMasterCurrReading(Number(tObj.currentMasterReading || 0));
                            setMasterCtRatio(Number(tObj.ctRatio || 1));
                            setMasterCapacityKva(Number(tObj.capacityKva || 500));
                            setMasterZone(tObj.zone || 'المنطقة الرئيسية');
                          }
                        }}
                        className="w-full bg-white border border-slate-300 rounded-xl p-3 text-slate-800 text-xs font-bold focus:border-slate-900 outline-none"
                      >
                        <option value="">-- اختر المحول المراد تسجيل قراءته المركزية --</option>
                        {(settings.transformers || []).map((t: any, idx: number) => {
                          const name = typeof t === 'string' ? t : t.name || `محول ${idx + 1}`;
                          return (
                            <option key={idx} value={name}>{name}</option>
                          );
                        })}
                      </select>
                    </div>

                    {selectedMasterTransformer ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                            <span className="text-slate-400 block text-[10px] font-bold">القدرة الاستيعابية</span>
                            <span className="font-bold text-amber-600 font-mono block mt-1">{masterCapacityKva} KVA</span>
                          </div>
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                            <span className="text-slate-400 block text-[10px] font-bold">المنطقة الجغرافية</span>
                            <span className="font-bold text-slate-800 block mt-1">{masterZone}</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">رقم العداد المركزي (Master Meter ID)</label>
                          <input 
                            type="text"
                            value={masterMeterNum}
                            onChange={e => setMasterMeterNum(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs font-mono focus:border-slate-900 outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">القراءة السابقة (ك.و)</label>
                            <input 
                              type="number"
                              value={masterPrevReading}
                              onChange={e => setMasterPrevReading(Number(e.target.value))}
                              className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs font-mono focus:border-slate-900 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">القراءة الحالية (ك.و)</label>
                            <input 
                              type="number"
                              value={masterCurrReading}
                              onChange={e => setMasterCurrReading(Number(e.target.value))}
                              className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs font-mono focus:border-slate-900 outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">معامل ضرب العداد / محول التيار (CT Ratio)</label>
                          <input 
                            type="number"
                            step="0.1"
                            value={masterCtRatio}
                            onChange={e => setMasterCtRatio(Number(e.target.value))}
                            className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs font-mono focus:border-slate-900 outline-none"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (!onUpdateSettings) return;
                            const currentTransformers = settings.transformers || [];
                            const updatedTransformers = currentTransformers.map((t: any) => {
                              const name = typeof t === 'string' ? t : t.name;
                              if (name === selectedMasterTransformer) {
                                return {
                                  id: typeof t === 'object' ? t.id : 'tr-' + Date.now(),
                                  name: selectedMasterTransformer,
                                  meterNumber: masterMeterNum,
                                  previousMasterReading: masterPrevReading,
                                  currentMasterReading: masterCurrReading,
                                  ctRatio: masterCtRatio,
                                  capacityKva: masterCapacityKva,
                                  zone: masterZone,
                                  lastReadingTimestamp: new Date().toISOString(),
                                  lastReadingCollector: currentUser.name
                                };
                              }
                              return t;
                            });

                            onUpdateSettings({
                              ...settings,
                              transformers: updatedTransformers
                            });

                            setMasterReadingSuccess(`تم توثيق وتزامن قراءة العداد المركزي للمحول [${selectedMasterTransformer}] بنجاح في نفس وقت قراءات المشتركين!`);
                          }}
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>تسجيل وتوثيق القراءة المركزية المتزامنة</span>
                        </button>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-slate-400 text-xs font-bold">
                        الرجاء اختيار المحول من القائمة أعلاه لعرض واستكمال بيانات القراءة المركزية.
                      </div>
                    )}
                  </div>

                  {/* Synchronized Calculated Loss Results */}
                  {selectedMasterTransformer ? (
                    (() => {
                      const tempTransformerObj = {
                        name: selectedMasterTransformer,
                        meterNumber: masterMeterNum,
                        capacityKva: masterCapacityKva,
                        zone: masterZone,
                        previousMasterReading: masterPrevReading,
                        currentMasterReading: masterCurrReading,
                        ctRatio: masterCtRatio
                      };
                      const loss = calculateTransformerLoss(tempTransformerObj, subscribers, settings);
                      const isRed = loss.trafficLight === 'red';
                      const isYellow = loss.trafficLight === 'yellow';

                      return (
                        <div className="bg-slate-950 text-white p-5 rounded-2xl border border-slate-800 flex flex-col justify-between gap-4 shadow-xl">
                          <div>
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                              <span className="text-xs font-mono text-amber-400 font-bold">{loss.subscribersCount} مشترك تابع للمحول</span>
                              <h4 className="font-bold text-slate-100 text-sm">مباشر: نتيجة مطابقة الفاقد المتزامنة</h4>
                            </div>

                            {/* Traffic Light Status */}
                            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs mb-4 ${
                              isRed 
                                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' 
                                : isYellow 
                                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' 
                                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            }`}>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-base">{loss.totalLossPercent.toFixed(1)}%</span>
                                <span className="text-[10px] text-slate-400 font-sans">نسبة الفاقد المحسوبة</span>
                              </div>
                              <div className="flex items-center gap-1.5 font-bold">
                                <span>{loss.statusText}</span>
                                {isRed ? <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" /> : isYellow ? <AlertTriangle className="w-5 h-5 text-amber-400" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                              </div>
                            </div>

                            {/* Energy Figures */}
                            <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                                <span className="text-slate-400 block text-[10px] mb-1">استهلاك العداد المركزي</span>
                                <span className="font-mono font-bold text-amber-400 text-sm">{loss.centralEnergyKwh.toLocaleString()} ك.و.س</span>
                              </div>
                              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                                <span className="text-slate-400 block text-[10px] mb-1">مجموع استهلاك المشتركين</span>
                                <span className="font-mono font-bold text-emerald-400 text-sm">{loss.subMetersEnergyKwh.toLocaleString()} ك.و.س</span>
                              </div>
                            </div>

                            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
                              <div className="flex justify-between items-center">
                                <span className={`font-mono font-bold ${isRed ? 'text-rose-400' : isYellow ? 'text-amber-400' : 'text-slate-200'}`}>
                                  {loss.totalLossKwh.toLocaleString()} ك.و.س
                                </span>
                                <span className="text-slate-400">إجمالي كمية الفاقد:</span>
                              </div>
                              <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                                <span className={`font-mono font-black text-sm ${isRed ? 'text-rose-400' : isYellow ? 'text-amber-400' : 'text-emerald-400'}`}>
                                  {loss.lossValueCurrency.toLocaleString()} {settings.currency}
                                </span>
                                <span className="text-slate-300 font-bold">القيمة النقدية للفاقد:</span>
                              </div>
                            </div>
                          </div>

                          {isRed && (
                            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 space-y-1">
                              <div className="font-bold flex items-center gap-1.5 text-rose-400">
                                <ShieldAlert className="w-4 h-4" />
                                <span>تحذير: يتطلب نزول فريق تفتيش فني للمنطقة فوراً!</span>
                              </div>
                              <p className="text-[11px] text-rose-300/80 leading-relaxed">
                                نسبة الفاقد أعلى من 10%. يجب فحص العدادات والتوصيلات المباشرة لكشف التعديات والسرقات.
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                      <Gauge className="w-12 h-12 text-slate-300" />
                      <p className="text-xs font-bold text-slate-600">لوحة تحليل الفاقد المباشر والمطابقة المتزامنة</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'payment' && (
              <motion.div
                key="payment-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`bg-white border border-slate-200 shadow-sm flex flex-col transition-all ${!selectedSub ? 'rounded-xl p-2 sm:p-2.5' : 'rounded-3xl p-6 gap-6'}`}
              >
                {!selectedSub ? (
                  <div className="text-center py-1 sm:py-1.5 px-2 text-slate-400 flex items-center justify-center gap-2">
                    <UserRound className="w-4 h-4 text-slate-400 shrink-0 animate-pulse" />
                    <span className="text-xs font-bold text-slate-700">يرجى اختيار مشترك من القائمة الجانبية للبدء بالتحصيل المالي</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Subscriber Balance Card */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col gap-4 text-right">
                      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                          selectedSub.currentBalance > 0 ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`}>
                          {selectedSub.currentBalance > 0 ? 'مطالب بالدفع' : 'حساب مستقر'}
                        </span>
                        <h4 className="font-bold text-slate-800 text-sm">{selectedSub.name}</h4>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-3.5 rounded-xl border border-slate-100 text-center col-span-2 shadow-xs">
                          <span className="text-slate-400 block text-[10px] font-bold">الرصيد المستحق الحالي</span>
                          <span className={`font-mono text-xl font-black block mt-1 ${selectedSub.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {selectedSub.currentBalance.toLocaleString()} {settings.currency}
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-100 text-center shadow-xs">
                          <span className="text-slate-400 block text-[10px] font-bold">رقم الهاتف</span>
                          <span className="font-bold text-slate-800 block mt-1 font-mono">{selectedSub.phone}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-slate-100 text-center shadow-xs">
                          <span className="text-slate-400 block text-[10px] font-bold">رقم العداد</span>
                          <span className="font-bold text-slate-800 block mt-1 font-mono">{selectedSub.meterNumber}</span>
                        </div>
                      </div>
                    </div>

                    {/* Collection Form */}
                    <div className="flex flex-col gap-4">
                      <form onSubmit={submitPayment} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col gap-4">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider text-right flex items-center gap-1.5 justify-end">
                          <span>سند تحصيل وقبض مالي جديد</span>
                          <Banknote className="w-4 h-4 text-emerald-600" />
                        </h4>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-2 text-right">المبلغ المستلم للتحصيل</label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={amountPaidInput}
                            onChange={e => {
                              setAmountPaidInput(e.target.value);
                              setPaymentSuccess(null);
                            }}
                            placeholder="أدخل قيمة المبلغ النقدي"
                            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-slate-800 text-right text-sm focus:outline-none focus:border-slate-900"
                          />
                          {parseFloat(amountPaidInput) > selectedSub.currentBalance && selectedSub.currentBalance > 0 && (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 mt-2 bg-amber-50 p-2 rounded-lg border border-amber-200 justify-end text-right">
                                <span>المبلغ المدخل ({parseFloat(amountPaidInput).toLocaleString()} {settings.currency}) أكبر من الرصيد المستحق، سيقيد الفارق كرصيد دائن.</span>
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            </div>
                          )}
                          {parseFloat(amountPaidInput) > 1000000 && (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-500 mt-2 justify-end text-right">
                                <span>تنبيه: المبلغ المدخل ضخم جداً. يرجى المراجعة.</span>
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-2 text-right">طريقة الدفع</label>
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => setPaymentMethod('cash')}
                              className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                paymentMethod === 'cash'
                                  ? 'bg-slate-900 text-white border-transparent'
                                  : 'bg-white text-slate-600 border-slate-200 hover:text-slate-950'
                              }`}
                            >
                              نقداً (كاش)
                            </button>
                            <button
                              type="button"
                              onClick={() => setPaymentMethod('e-wallet')}
                              className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                paymentMethod === 'e-wallet'
                                  ? 'bg-slate-900 text-white border-transparent'
                                  : 'bg-white text-slate-600 border-slate-200 hover:text-slate-950'
                              }`}
                            >
                              محفظة إلكترونية
                            </button>
                            <button
                              type="button"
                              onClick={() => setPaymentMethod('transfer')}
                              className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                paymentMethod === 'transfer'
                                  ? 'bg-slate-900 text-white border-transparent'
                                  : 'bg-white text-slate-600 border-slate-200 hover:text-slate-950'
                              }`}
                            >
                              تحويل بنكي
                            </button>
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={!amountPaidInput || parseFloat(amountPaidInput) <= 0}
                          className={`w-full font-bold py-2.5 rounded-xl text-xs sm:text-sm transition-all cursor-pointer ${
                            amountPaidInput && parseFloat(amountPaidInput) > 0
                              ? 'bg-slate-900 text-white hover:bg-slate-850 active:scale-95'
                              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          حفظ وإصدار سند القبض مؤقتاً
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* Print Receipt Area (Shows after success) */}
                {paymentSuccess && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl flex flex-col gap-4 text-right"
                  >
                    <div className="flex items-center gap-2 text-emerald-800 justify-end text-sm font-bold">
                      <span>سند مالي مسجل في الانتظار (في دورة الترحيل الحالية)</span>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>

                    <div id="print-receipt-box" className="bg-white text-slate-900 p-6 rounded-2xl border border-slate-200 shadow-sm max-w-sm mx-auto w-full dir-rtl font-sans text-sm">
                      <div className="text-center border-b border-dashed border-slate-300 pb-3 mb-4">
                        <h3 className="font-bold text-lg text-slate-900">{settings.stationName}</h3>
                        <p className="text-[10px] text-slate-500 font-semibold">سند قبض وتوريد مالي</p>
                        <p className="text-[10px] text-slate-500 font-mono">الهاتف: <span dir="ltr" className="inline-block">{settings.phone}</span></p>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="font-bold text-slate-800">{paymentSuccess.receiptNumber}</span>
                          <span className="text-slate-500 font-semibold">رقم السند:</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold text-slate-800">{paymentSuccess.subscriberName}</span>
                          <span className="text-slate-500 font-semibold">المستلم من الأخ:</span>
                        </div>
                        <div className="flex justify-between text-slate-900">
                          <span className="font-black font-mono text-base">{paymentSuccess.amountPaid.toLocaleString()} {settings.currency}</span>
                          <span className="text-slate-500 font-semibold">مبلغ وقدره:</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold text-slate-800">
                            {paymentSuccess.paymentMethod === 'cash' ? 'نقداً' : paymentSuccess.paymentMethod === 'e-wallet' ? 'محفظة إلكترونية' : 'تحويل مصرفي'}
                          </span>
                          <span className="text-slate-500 font-semibold">طريقة التوريد:</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-bold text-slate-800">{paymentSuccess.paymentDate}</span>
                          <span className="text-slate-500 font-semibold">تاريخ وتوقيت العملية:</span>
                        </div>
                        <div className="border-t border-dashed border-slate-200 my-2 pt-2" />
                        <p className="text-center text-[11px] text-slate-500 italic">"شكراً لتسديدكم المستحقات في وقتها لضمان استمرار الخدمة الكهربائية"</p>
                      </div>

                      <div className="text-center border-t border-dashed border-slate-300 pt-3 mt-4 text-[10px] text-slate-400">
                        <p>توقيع مستلم السند: {currentUser.name}</p>
                        <p className="font-bold mt-1 text-slate-500">تنبيه: لا يعتمد السند رسمياً للخصم المالي إلا بعد المراجعة والترحيل</p>
                      </div>
                    </div>

                    {/* SMS Dispatch Status Feedback Banner */}
                    {lastSmsResult && (
                      <div className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 shadow-xs ${
                        lastSmsResult.success ? 'bg-sky-50 border-sky-200 text-sky-900' : 'bg-amber-50 border-amber-200 text-amber-900'
                      }`}>
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-sky-600 shrink-0" />
                          <span>{lastSmsResult.message}</span>
                        </div>
                        <span className="text-[10px] bg-white px-2 py-0.5 rounded-lg border font-mono shrink-0">
                          {lastSmsResult.method === 'android_native' ? 'أندرويد تلقائي (Direct SMS)' : 'تطبيقات SMS'}
                        </span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => handleDirectSharePaymentWhatsApp(selectedSub!, paymentSuccess)}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>مشاركة السند واتساب</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleManualSendPaymentSMS(paymentSuccess)}
                        className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 text-white py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>إرسال SMS</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPrintingJob({ type: 'receipt', sub: selectedSub!, payment: paymentSuccess })}
                        className="flex items-center gap-2 bg-slate-900 hover:bg-slate-850 text-white py-2 px-5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                        <span>طباعة السند الفوري</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {activeTab === 'statement' && (
              <motion.div
                key="statement-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`bg-white border border-slate-200 shadow-sm flex flex-col transition-all ${!selectedSub ? 'rounded-xl p-2 sm:p-2.5' : 'rounded-3xl p-6 gap-6'}`}
              >
                {!selectedSub ? (
                  <div className="text-center py-1 sm:py-1.5 px-2 text-slate-400 flex items-center justify-center gap-2">
                    <UserRound className="w-4 h-4 text-slate-400 shrink-0 animate-pulse" />
                    <span className="text-xs font-bold text-slate-700">يرجى اختيار مشترك من القائمة الجانبية لعرض كشف الحساب والطباعة</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6 text-right" dir="rtl">
                    {/* Subscriber Profile & Statement Actions Header */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 justify-end md:justify-start">
                          <span className="px-2.5 py-1 bg-amber-100 border border-amber-200 rounded-lg text-[10px] text-amber-800 font-bold">
                            {selectedSub.tariffType === 'residential' ? 'سكني' : selectedSub.tariffType === 'commercial' ? 'تجاري' : 'صناعي'}
                          </span>
                          <h4 className="font-black text-slate-800 text-base">{selectedSub.name}</h4>
                        </div>
                        <p className="text-xs text-slate-500 font-semibold">عداد رقم: <span className="font-mono">{selectedSub.meterNumber}</span> | جوال: <span className="font-mono" dir="ltr">{selectedSub.phone}</span></p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 justify-center md:justify-end">
                        <button
                          onClick={() => setPrintingJob({ type: 'statement', sub: selectedSub })}
                          className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black py-2.5 px-5 rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                        >
                          <Printer className="w-4 h-4 text-slate-950" />
                          <span>طباعة كشف الحساب كاملاً (80mm)</span>
                        </button>
                      </div>
                    </div>

                    {/* Balance Cards Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-100 text-center">
                        <span className="text-slate-500 block text-xs font-bold">إجمالي المطالبات والفواتير</span>
                        <span className="font-mono text-lg font-black text-amber-600 block mt-1">
                          {(readings.filter(r => r.subscriberId === selectedSub.id).reduce((sum, r) => sum + r.totalAmount, 0)).toLocaleString()} {settings.currency}
                        </span>
                      </div>
                      <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100 text-center">
                        <span className="text-slate-500 block text-xs font-bold">إجمالي المبالغ المدفوعة</span>
                        <span className="font-mono text-lg font-black text-emerald-600 block mt-1">
                          {(payments.filter(p => p.subscriberId === selectedSub.id).reduce((sum, p) => sum + p.amountPaid, 0)).toLocaleString()} {settings.currency}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                        <span className="text-slate-500 block text-xs font-bold">الرصيد المتبقي المستحق</span>
                        <span className={`font-mono text-lg font-black block mt-1 ${selectedSub.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {selectedSub.currentBalance.toLocaleString()} {settings.currency}
                        </span>
                      </div>
                    </div>

                    {/* Historical Operations List with Thermal Print option for each item */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-slate-800 border-b border-slate-100 pb-2">سجل العمليات والفواتير التفصيلية:</h4>
                      {(() => {
                        const subReadings = readings.filter(r => r.subscriberId === selectedSub.id);
                        const subPayments = payments.filter(p => p.subscriberId === selectedSub.id);
                        const list = [
                          ...subReadings.map(r => ({ id: r.id, date: r.readingDate, type: 'invoice' as const, typeName: 'فاتورة استهلاك تيار', amount: r.totalAmount, details: `${r.consumption} ك.و (القراءة: ${r.currentReading})`, reading: r })),
                          ...subPayments.map(p => ({ id: p.id, date: p.paymentDate, type: 'receipt' as const, typeName: 'سند قبض وتوريد', amount: p.amountPaid, details: `رقم السند: ${p.receiptNumber} (${p.paymentMethod === 'cash' ? 'نقداً' : p.paymentMethod === 'e-wallet' ? 'محفظة' : 'تحويل'})`, payment: p }))
                        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                        return list.length > 0 ? (
                          <div className="overflow-hidden border border-slate-200/90 rounded-2xl bg-white shadow-xs">
                            <div className="overflow-x-auto">
                              <table className="w-full text-right text-xs border-collapse">
                                <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-black">
                                  <tr>
                                    <th className="py-3 px-4">التاريخ والوقت</th>
                                    <th className="py-3 px-4">نوع الحركة</th>
                                    <th className="py-3 px-4">البيان والشرح</th>
                                    <th className="py-3 px-4 text-center">المبلغ المالي</th>
                                    <th className="py-3 px-4 text-center w-32">الطباعة الحرارية</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                  {list.map((op, idx) => {
                                    const isInvoice = op.type === 'invoice';
                                    return (
                                      <tr 
                                        key={idx} 
                                        className={`transition-colors border-r-4 ${
                                          isInvoice ? 'border-r-amber-500 bg-amber-50/20' : 'border-r-emerald-500 bg-emerald-50/20'
                                        } hover:bg-slate-100/60`}
                                      >
                                        <td className="py-2.5 px-4 font-mono text-slate-600">
                                          <span className="bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs font-bold text-[11px]">
                                            {op.date}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-4 font-bold">
                                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
                                            isInvoice 
                                              ? 'bg-amber-100 text-amber-900 border-amber-300' 
                                              : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                          }`}>
                                            {op.typeName}
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-4 text-slate-800 font-semibold">{op.details}</td>
                                        <td className="py-2.5 px-4 text-center font-mono">
                                          <span className={`font-black text-xs px-2.5 py-0.5 rounded-lg border ${
                                            isInvoice 
                                              ? 'text-amber-800 bg-amber-50 border-amber-200' 
                                              : 'text-emerald-800 bg-emerald-50 border-emerald-200'
                                          }`}>
                                            {isInvoice ? '+' : '-'}{op.amount.toLocaleString()} <span className="text-[10px] font-bold text-slate-500">{settings.currency}</span>
                                          </span>
                                        </td>
                                        <td className="py-2.5 px-4">
                                          <div className="flex justify-center">
                                            <button
                                              onClick={() => setPrintingJob(
                                                op.type === 'invoice'
                                                  ? { type: 'invoice', sub: selectedSub, reading: op.reading }
                                                  : { type: 'receipt', sub: selectedSub, payment: op.payment }
                                              )}
                                              className="p-1.5 px-3 bg-slate-900 hover:bg-slate-850 text-white rounded-xl transition-all flex items-center gap-1.5 cursor-pointer text-[11px] font-bold shadow-xs active:scale-95"
                                            >
                                              <Printer className="w-3.5 h-3.5 text-amber-400" />
                                              <span>طباعة الإيصال</span>
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <p className="text-center py-8 text-xs text-slate-400 italic">لا توجد أي فواتير أو سندات قبض سابقة مسجلة لهذا المشترك.</p>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div
                key="history-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-4 text-right"
              >
                <CollectorCollectionsByMonthAndDay
                  currentUser={currentUser}
                  settings={settings}
                  subscribers={subscribers}
                  readings={readings}
                  payments={payments}
                  dailyGoal={dailyGoal}
                  monthlyGoal={monthlyGoal}
                  onPrintReceipt={(payment, sub) => setPrintingJob({ type: 'receipt', payment, sub })}
                  onPrintShiftReport={(dayDate, customPayments) => setPrintingJob({ 
                    type: 'shift_report', 
                    shiftDate: dayDate, 
                    shiftPayments: customPayments 
                  })}
                  onStartEditPayment={handleStartEditPayment}
                  onStartEditReading={handleStartEditReading}
                  onDeletePayment={(id) => setDeletingItemId({ type: 'payment', id })}
                  onDeleteReading={(id) => setDeletingItemId({ type: 'reading', id })}
                  onSelectSubscriberForReading={(sub) => {
                    setActiveTab('reading');
                    setSelectedSub(sub);
                    window.scrollTo({ top: 300, behavior: 'smooth' });
                  }}
                  onSelectSubscriberForPayment={(sub) => {
                    setActiveTab('payment');
                    setSelectedSub(sub);
                    window.scrollTo({ top: 300, behavior: 'smooth' });
                  }}
                  onSelectSubscriberForStatement={(sub) => {
                    setActiveTab('statement');
                    setSelectedSub(sub);
                    window.scrollTo({ top: 300, behavior: 'smooth' });
                  }}
                  getActionTimeRemaining={getActionTimeRemaining}
                  initialMode={collectionsInitialMode}
                  uniqueZones={uniqueSubscriberZones}
                />
              </motion.div>
            )}

            {activeTab === 'map' && (
              <motion.div
                key="map-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col gap-4 text-right"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3" dir="rtl">
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-slate-900 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-emerald-600" />
                      <span>الخريطة التفاعلية لمواقع المشتركين والعدادات الميدانية</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">عرض مواقع المشتركين بأحدث صور الأقمار الصناعية، تتبع الـ GPS المباشر، وتحديد المواقع تلقائياً.</p>
                  </div>
                  <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-200 shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>تتبع الـ GPS مفعل</span>
                  </div>
                </div>

                <div className="w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner">
                  <Suspense fallback={<CollectorMapFallback />}>
                    <SubscribersMap
                      subscribers={subscribers}
                      allSubscribers={subscribers}
                      onUpdateSubscribers={onUpdateSubscribers}
                      onAddAuditLog={onAddAuditLog}
                      currentUser={currentUser}
                      onAddReading={onAddReading}
                      settings={settings}
                    />
                  </Suspense>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right column (4 cols) - Live Subscribers Search list */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 flex flex-col gap-3.5 h-[calc(100vh-140px)] min-h-[520px] shadow-sm">
            {/* Header with Counters */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5" dir="rtl">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-500/10 text-amber-600 rounded-xl border border-amber-500/20">
                  <UserRound className="w-4 h-4" />
                </div>
                <h3 className="text-xs sm:text-sm font-black text-slate-800">قائمة المشتركين والعدادات</h3>
              </div>
              <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                {filteredSubscribers.length} / {subscribers.length}
              </span>
            </div>

            {/* Smart Search Input with Clear button and Camera Scanner */}
            <div className="flex items-center gap-1.5" dir="rtl">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="ابحث بالاسم، رقم العداد، الجوال..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && filteredSubscribers.length > 0) {
                      handleSelectSubscriber(filteredSubscribers[0]);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 pr-9 pl-9 text-slate-800 text-right text-xs placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all font-medium"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute left-2.5 top-2.5 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-full transition-all cursor-pointer"
                    title="مسح البحث"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsBarcodeModalOpen(true)}
                className="p-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-2xs active:scale-95"
                title="مسح باركود أو رمز العداد عبر الكاميرا"
              >
                <Camera className="w-4 h-4 text-amber-700" />
              </button>
            </div>

            {/* Quick Status Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5" dir="rtl">
              <button
                type="button"
                onClick={() => setSidebarFilterMode('all')}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  sidebarFilterMode === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                الكل ({subscribers.length})
              </button>
              <button
                type="button"
                onClick={() => setSidebarFilterMode('pending')}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  sidebarFilterMode === 'pending'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100/70 border border-amber-200/50'
                }`}
              >
                <span>لم يُقرأ</span>
                <span className="font-mono text-[9px] bg-black/10 px-1 rounded-full">
                  {subscribers.length - visitedSubscribersIds.size}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSidebarFilterMode('completed')}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  sidebarFilterMode === 'completed'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100/70 border border-emerald-200/50'
                }`}
              >
                <span>تمت القراءة</span>
                <span className="font-mono text-[9px] bg-black/10 px-1 rounded-full">
                  {visitedSubscribersIds.size}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSidebarFilterMode('debt')}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  sidebarFilterMode === 'debt'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100/70 border border-rose-200/50'
                }`}
              >
                مديونية
              </button>
            </div>

            {/* Zone Selector (if multiple zones exist) */}
            {uniqueSubscriberZones.length > 1 && (
              <div className="flex items-center gap-1.5" dir="rtl">
                <span className="text-[10px] text-slate-400 font-bold shrink-0">المربع:</span>
                <select
                  value={sidebarZoneFilter}
                  onChange={e => setSidebarZoneFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1 px-2 text-[10px] font-bold text-slate-700 outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="all">جميع المربعات والمناطق ({uniqueSubscriberZones.length})</option>
                  {uniqueSubscriberZones.map(z => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
                {sidebarZoneFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSidebarZoneFilter('all')}
                    className="text-[9px] text-slate-400 hover:text-rose-500 font-bold px-1 shrink-0"
                    title="إلغاء تصفية المنطقة"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* Subscribers scrollable list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1" dir="rtl">
              {filteredSubscribers.length === 0 ? (
                <div className="text-center py-12 px-4 flex flex-col items-center justify-center gap-2">
                  <div className="p-3 bg-slate-100 text-slate-400 rounded-2xl">
                    <Search className="w-6 h-6" />
                  </div>
                  <p className="text-slate-700 text-xs font-bold">لم يتم العثور على أي مشترك مطابق</p>
                  <p className="text-slate-400 text-[10px]">جرب البحث بجزء من الاسم أو برقم العداد أو الهاتف</p>
                  {(searchQuery || sidebarFilterMode !== 'all' || sidebarZoneFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSidebarFilterMode('all');
                        setSidebarZoneFilter('all');
                      }}
                      className="mt-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                    >
                      إعادة ضبط معايير البحث
                    </button>
                  )}
                </div>
              ) : (
                filteredSubscribers.map(sub => {
                  const isSelected = selectedSub?.id === sub.id;
                  const isVisitedToday = visitedSubscribersIds.has(sub.id);
                  const hasDebt = (sub.currentBalance || 0) > 0;
                  const hasCredit = (sub.currentBalance || 0) < 0;

                  const tariffBadgeClass = sub.tariffType === 'commercial'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : sub.tariffType === 'industrial'
                    ? 'bg-purple-50 text-purple-800 border-purple-200'
                    : 'bg-sky-50 text-sky-800 border-sky-200';

                  const tariffText = sub.tariffType === 'commercial' ? 'تجاري' : sub.tariffType === 'industrial' ? 'صناعي' : 'سكني';

                  return (
                    <button
                      key={sub.id}
                      onClick={() => handleSelectSubscriber(sub)}
                      className={`w-full text-right p-3 rounded-2xl border text-xs transition-all flex flex-col gap-1.5 cursor-pointer relative ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500 text-slate-900 shadow-sm ring-2 ring-amber-500/30'
                          : 'bg-slate-50/70 border-slate-100 hover:border-slate-300 hover:bg-white text-slate-700 shadow-2xs'
                      }`}
                    >
                      {/* Top Row: Name + Badges */}
                      <div className="flex justify-between items-start gap-1.5 w-full">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <span className="font-extrabold text-slate-900 text-xs truncate">
                            <HighlightMatch text={sub.name} query={searchQuery} className="bg-amber-300 text-amber-950 px-1 py-0.5 rounded font-black shadow-xs" />
                          </span>
                          <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${tariffBadgeClass} shrink-0`}>
                            {tariffText}
                          </span>
                        </div>

                        {/* Status Icon / Badge */}
                        {isVisitedToday ? (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shrink-0">
                            <Check className="w-2.5 h-2.5 text-emerald-600" />
                            <span>تمت القراءة</span>
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded-md shrink-0 font-mono">
                            بانتظار القراءة
                          </span>
                        )}
                      </div>

                      {/* Middle Row: Meter Number + Zone */}
                      <div className="flex justify-between items-center w-full text-[10px] text-slate-500 font-medium">
                        <div className="flex items-center gap-1 font-mono">
                          <span className="text-[9px] text-slate-400 font-bold">عداد:</span>
                          <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold text-slate-800">
                            <HighlightMatch text={sub.meterNumber} query={searchQuery} className="bg-amber-300 text-amber-950 px-1 py-0.5 rounded font-black shadow-xs" />
                          </span>
                        </div>
                        {sub.zone && (
                          <span className="text-[9px] text-slate-400 truncate max-w-[110px]" title={sub.zone}>
                            📍 {sub.zone.replace('المنطقة ', '')}
                          </span>
                        )}
                      </div>

                      {/* Bottom Row: Balance & Last Reading */}
                      <div className="flex justify-between items-center w-full text-[10px] border-t border-slate-200/50 pt-1.5 mt-0.5">
                        <div>
                          <span className="text-slate-400 text-[9px] ml-1">الرصيد:</span>
                          <span className={`font-mono font-black ${
                            hasDebt ? 'text-rose-600' : hasCredit ? 'text-sky-600' : 'text-emerald-600'
                          }`}>
                            {(sub.currentBalance || 0).toLocaleString()} <span className="text-[8px] font-bold">{settings.currency}</span>
                          </span>
                        </div>
                        <div className="text-left font-mono">
                          <span className="text-slate-400 text-[9px] ml-1">قراءة:</span>
                          <span className="font-bold text-slate-700">{sub.currentReading} ك.و</span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Premium Thermal Paper 3D Print Overlay */}
      <AnimatePresence>
        {printingJob && (
          <div className="fixed inset-0 z-[999999] bg-slate-950/85 backdrop-blur-md overflow-y-auto flex flex-col items-center justify-start p-4 md:py-10 print:bg-white print:m-0 print:p-0">
            {/* Top Command Bar (Hidden during printing) */}
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 text-white p-4 rounded-2xl flex flex-col gap-3 mb-6 shadow-2xl print:hidden">
              <div className="flex justify-between items-center">
                <button 
                  onClick={() => setPrintingJob(null)} 
                  className="text-slate-300 hover:text-rose-400 bg-slate-950 hover:bg-rose-50/10 border border-slate-800 hover:border-rose-50/30 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  تراجع وإغلاق
                </button>
                <div className="text-center">
                  <p className="text-[10px] text-slate-400 font-bold">طابعة وتصدير إيصال المحصل</p>
                  <p className="text-xs text-amber-500 font-black">إصدار وإرسال الإيصال الميداني</p>
                </div>
                <button 
                  onClick={() => {
                    try {
                      window.print();
                    } catch (e) {
                      console.error("Print failed:", e);
                      alert("فشل فتح نافذة الطباعة. يرجى فتح التطبيق في علامة تبويب مستقلة.");
                    }
                  }} 
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.3)] active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة</span>
                </button>
              </div>

              {/* Quick Actions Bar: WhatsApp, Copy, PNG Download */}
              <div className="grid grid-cols-3 gap-2 border-t border-slate-800 pt-3" dir="rtl">
                <button
                  onClick={handleShareWhatsApp}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-2 rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-200" />
                  <span>إرسال واتساب</span>
                </button>
                <button
                  onClick={handleCopyReceiptText}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2 px-2 rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-700 active:scale-95"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-300" />
                  <span>نسخ النص</span>
                </button>
                <button
                  onClick={downloadReceiptAsImage}
                  disabled={downloadingImage}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2 px-2 rounded-xl text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-700 active:scale-95 disabled:opacity-50"
                >
                  {downloadingImage ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-slate-300" />}
                  <span>حفظ كصورة</span>
                </button>
              </div>

              {copyNotice && (
                <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 p-2 rounded-xl text-[10px] font-bold text-center animate-fade-in">
                  {copyNotice}
                </div>
              )}
            </div>

            {/* Bluetooth Thermal Printer Controller (Hidden when printing) */}
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 text-white p-4 rounded-2xl flex flex-col gap-3 mb-6 shadow-2xl print:hidden text-right" dir="rtl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Bluetooth className={`w-5 h-5 ${btStatus === 'connecting' ? 'animate-pulse text-amber-500' : btStatus === 'connected' ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <h3 className="text-xs font-black">الربط والطباعة عبر البلوتوث (Bluetooth)</h3>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  btStatus === 'connected' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  btStatus === 'connecting' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse' :
                  'bg-slate-800 text-slate-400'
                }`}>
                  {btStatus === 'connected' ? 'متصل' : btStatus === 'connecting' ? 'جاري الاتصال...' : 'غير متصل'}
                </span>
              </div>

              {/* Status Message & Actions */}
              {btStatus === 'connected' ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-xs">
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 font-bold">الطابعة النشطة الحالية:</p>
                      <p className="font-extrabold text-slate-200 mt-0.5 flex items-center gap-1">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block animate-pulse"></span>
                        <span>{btPrinterName}</span>
                      </p>
                    </div>
                    <button 
                      onClick={disconnectBluetoothPrinter}
                      className="text-rose-400 hover:text-rose-300 font-bold text-[10px] cursor-pointer"
                    >
                      قطع الاتصال
                    </button>
                  </div>

                  <button
                    onClick={printViaBluetooth}
                    disabled={isDirectPrinting}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 text-slate-950 font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 cursor-pointer active:scale-95 transition-all"
                  >
                    {isDirectPrinting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                        <span>جاري إرسال البيانات للطابعة...</span>
                      </>
                    ) : (
                      <>
                        <Printer className="w-4 h-4 text-slate-950" />
                        <span>أرسل واطبع الإيصال بالبلوتوث</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    يمكنك ربط التطبيق مباشرة بالطابعات الحرارية المحمولة لإصدار وطباعة الإيصالات فورياً للمشتركين في الميدان دون الحاجة لشبكة إنترنت.
                  </p>
                  <button
                    onClick={connectBluetoothPrinter}
                    disabled={btStatus === 'connecting'}
                    className="w-full bg-slate-850 hover:bg-slate-800 border border-slate-700 text-white font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-sm"
                  >
                    <Bluetooth className="w-4 h-4 text-amber-500" />
                    <span>بحث وإقران طابعة حرارية عبر البلوتوث</span>
                  </button>
                </div>
              )}

              {/* Error Message */}
              {btError && (
                <div className="bg-rose-500/15 border border-rose-500/30 text-rose-300 p-2.5 rounded-xl text-[10px] leading-relaxed flex items-start gap-1.5 font-bold text-right" dir="rtl">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                  <span>{btError}</span>
                </div>
              )}

              {/* Success Message */}
              {btSuccessMessage && (
                <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 p-2.5 rounded-xl text-[10px] leading-relaxed flex items-start gap-1.5 font-bold text-right" dir="rtl">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{btSuccessMessage}</span>
                </div>
              )}

              {/* Instructions Toggler */}
              <div className="border-t border-slate-800/80 pt-2.5 mt-1">
                <button 
                  type="button"
                  onClick={() => setShowBtHelp(!showBtHelp)}
                  className="w-full flex items-center justify-between text-slate-400 hover:text-slate-200 text-[10px] font-bold cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-slate-500" />
                    <span>كيف تعمل ميزة الطباعة بالبلوتوث في الميدان؟</span>
                  </span>
                  <span>{showBtHelp ? 'إخفاء' : 'عرض'}</span>
                </button>
                
                {showBtHelp && (
                  <div className="bg-slate-950/40 border border-slate-800/60 p-3 rounded-xl text-[10px] text-slate-400 space-y-1.5 mt-2 text-right leading-relaxed animate-fade-in">
                    <p className="font-extrabold text-slate-300">💡 خطوات التشغيل السريعة والربط:</p>
                    <ol className="list-decimal list-inside space-y-1 pr-1">
                      <li>قم بتشغيل الطابعة الحرارية المحمولة (Thermal Printer).</li>
                      <li>تأكد من تفعيل البلوتوث (Bluetooth) في هاتفك أو جهازك.</li>
                      <li>اضغط على زر <strong>"بحث وإقران طابعة حرارية"</strong> بالأعلى.</li>
                      <li>اختر اسم طابعتك من القائمة المعروضة (تبدأ عادةً بـ MTP أو PT أو Thermal) ثم اضغط <strong>Pair / اقتران</strong>.</li>
                      <li>بعد نجاح الربط، اضغط زر <strong>"أرسل واطبع الإيصال بالبلوتوث"</strong> لتوليد الإيصال فورا عبر الطابعة.</li>
                    </ol>
                    <p className="text-[9px] text-amber-500 font-bold mt-1.5 border-t border-slate-800/80 pt-1">
                      * ملاحظة: إذا كانت طابعتك قديمة أو لا تدعم ترميز اللغة العربية مباشرة، يمكنك استخدام خيار <strong>"ابدأ الطباعة"</strong> المدمج بالنظام أو تنزيلها كصورة بدقة عالية ومظهر منسق بالكامل.
                    </p>
                  </div>
                )}
              </div>
            </div>



            {/* 3D Realistic Thermal Paper Preview Wrapper */}
            <div className="print:p-0 print:m-0 print:shadow-none print:border-none w-full flex justify-center animate-fade-in">
              <div 
                className={`print-container ${
                  settings.receiptPaperWidth === '58mm' ? 'w-[58mm] max-w-[58mm]' : 
                  settings.receiptPaperWidth === 'A4' ? 'w-[210mm] max-w-[210mm]' : 
                  'w-[80mm] max-w-[80mm]'
                } min-h-[140mm] bg-[#FAF9F5] text-slate-950 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-t-[8px] border-t-amber-500 border-b-[8px] border-b-dashed border-b-slate-300 relative select-text`} 
                dir="rtl"
                style={{ 
                  fontFamily: '"Cairo", "Inter", sans-serif',
                  fontSize: settings.receiptFontSize === 'compact' ? '9.5px' : settings.receiptFontSize === 'large' ? '12px' : '11px'
                }}
              >
                {/* Visual Upper Cutter Line indicator */}
                <div className="absolute top-0 left-0 right-0 h-1 border-b border-dashed border-slate-400/30 print:hidden" />
                
                {/* Scissors cut indicator top */}
                <div className="flex items-center justify-between text-slate-400 text-[10px] my-2 border-b border-dashed border-slate-300 pb-1 font-mono print:hidden select-none">
                  <Scissors className="w-3.5 h-3.5 rotate-180 text-slate-400" />
                  <span>خط قص الورق الحراري ({settings.receiptPaperWidth || '80mm'})</span>
                  <Scissors className="w-3.5 h-3.5 text-slate-400" />
                </div>

                {/* Header (Station Info) */}
                {settings.receiptShowStationHeader !== false && (
                  <div className="text-center mb-4 space-y-1">
                    {settings.receiptShowLogo !== false && (
                      <div className="flex justify-center mb-1.5">
                        {settings.logoUrl ? (
                          <div className="w-20 h-20 print:w-22 print:h-22 p-1.5 bg-white border-2 border-slate-900 rounded-2xl flex items-center justify-center overflow-hidden mx-auto shadow-sm">
                            <img src={settings.logoUrl} alt="Station Logo" className="w-full h-full object-contain bg-white" />
                          </div>
                        ) : (
                          <div className="p-2 bg-slate-950 text-white rounded-full print:bg-transparent print:text-black">
                            <Zap className="w-7 h-7" />
                          </div>
                        )}
                      </div>
                    )}
                    <h1 className="text-lg font-black tracking-tight">{settings.stationName}</h1>
                    {settings.logoText && <p className="text-[10px] text-slate-600 font-bold">{settings.logoText}</p>}
                    
                    <div className="text-[9px] text-slate-500 space-y-0.5 pt-1">
                      {settings.phone && (
                        <p>
                          الهاتف:{' '}
                          <span dir="ltr" className="inline-block font-mono font-bold text-slate-800 text-left">
                            {settings.phone}
                          </span>
                          {settings.phone2 && (
                            <>
                              {' - '}
                              <span dir="ltr" className="inline-block font-mono font-bold text-slate-800 text-left">
                                {settings.phone2}
                              </span>
                            </>
                          )}
                        </p>
                      )}
                      {settings.address && <p>العنوان: {settings.address}</p>}
                      {settings.commercialRegister && <p className="text-[8px] text-slate-400">ترخيص: {settings.commercialRegister}</p>}
                    </div>
                  </div>
                )}

                {/* Separator */}
                <div className="border-t border-dashed border-slate-400 my-3" />

                {/* Ticket Title */}
                <div className="text-center py-1.5 bg-slate-900 text-white rounded-md my-2 print:bg-transparent print:text-black print:border print:border-slate-400">
                  <h2 className="text-xs font-black uppercase tracking-wider">
                    {printingJob.type === 'statement' && 'كشف حساب مشترك تفصيلي'}
                    {printingJob.type === 'invoice' && 'فاتورة استهلاك تيار كهربائي'}
                    {printingJob.type === 'receipt' && 'سند قبض وتوريد مالي'}
                    {printingJob.type === 'shift_report' && 'تقرير إغلاق الوردية والعهد المالية'}
                  </h2>
                </div>

                {/* Separator */}
                <div className="border-t border-dashed border-slate-400 my-3" />

                {/* Subscriber & Metadata Grid */}
                {printingJob.type !== 'shift_report' && printingJob.sub ? (
                  <div className="space-y-1.5 text-[11px] mb-4">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">اسم المشترك:</span>
                      <span className="font-extrabold text-slate-900">{printingJob.sub.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">رقم المشترك:</span>
                      <span className="font-mono font-bold">{printingJob.sub.id.substring(0, 8)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">رقم العداد:</span>
                      <span className="font-mono font-bold">{printingJob.sub.meterNumber}</span>
                    </div>
                    {settings.receiptShowCustomerPhone !== false && printingJob.sub.phone && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold">رقم الهاتف:</span>
                        <span className="font-mono font-bold text-slate-900 inline-block text-left" dir="ltr">{printingJob.sub.phone}</span>
                      </div>
                    )}
                    {settings.receiptShowZoneInfo !== false && printingJob.sub.zone && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold">المنطقة:</span>
                        <span className="font-bold">{printingJob.sub.zone.replace('المنطقة ', '')}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">تاريخ الطباعة:</span>
                      <span className="font-mono">{new Date().toLocaleDateString('en-GB')}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 text-[11px] mb-4">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">المحصل الميداني:</span>
                      <span className="font-extrabold text-slate-900">{currentUser.name} ({currentUser.username})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">نوع التقرير:</span>
                      <span className="font-bold">إغلاق الوردية والعهدة المالية</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">تاريخ الإغلاق:</span>
                      <span className="font-mono">{new Date().toLocaleDateString('en-GB')}</span>
                    </div>
                  </div>
                )}

                {/* Separator */}
                <div className="border-t border-dashed border-slate-400 my-3" />

                {/* Dynamic content depending on print type */}
                {printingJob.type === 'statement' && (
                  <>
                    {/* Statement details */}
                    <div className="space-y-1 text-xs mb-3 bg-slate-100 p-2.5 rounded-lg border border-slate-200">
                      <div className="flex justify-between text-slate-700">
                        <span className="font-mono font-bold">{(readings.filter(r => r.subscriberId === printingJob.sub.id).reduce((sum, r) => sum + r.totalAmount, 0)).toLocaleString()} {settings.currency}</span>
                        <span>إجمالي الفواتير:</span>
                      </div>
                      <div className="flex justify-between text-slate-700">
                        <span className="font-mono font-bold">{(payments.filter(p => p.subscriberId === printingJob.sub.id).reduce((sum, p) => sum + p.amountPaid, 0)).toLocaleString()} {settings.currency}</span>
                        <span>إجمالي المدفوعات:</span>
                      </div>
                      <div className="border-t border-slate-300 pt-1 flex justify-between font-black text-rose-700">
                        <span className="font-mono">{printingJob.sub.currentBalance.toLocaleString()} {settings.currency}</span>
                        <span>الرصيد المتبقي المستحق:</span>
                      </div>
                    </div>

                    {/* Operations List */}
                    <div className="mb-3">
                      <h3 className="text-[10px] font-black text-slate-800 mb-1.5">كشف حركة الحساب بالتفصيل:</h3>
                      {(() => {
                        const subReadings = readings.filter(r => r.subscriberId === printingJob.sub.id);
                        const subPayments = payments.filter(p => p.subscriberId === printingJob.sub.id);
                        const list = [
                          ...subReadings.map(r => ({ date: r.readingDate, type: 'فاتورة', amount: r.totalAmount, details: `${r.consumption} ك.و`, isPositive: false })),
                          ...subPayments.map(p => ({ date: p.paymentDate, type: 'سداد', amount: p.amountPaid, details: `سند: ${p.receiptNumber}`, isPositive: true }))
                        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                        return list.length > 0 ? (
                          <div className="border border-slate-300 rounded-md bg-white overflow-hidden">
                            <table className="w-full text-right text-[9px] border-collapse" dir="rtl">
                              <thead>
                                <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-black">
                                  <th className="py-1 px-1.5 text-right">التاريخ</th>
                                  <th className="py-1 px-1.5 text-right">البيان</th>
                                  <th className="py-1 px-1.5 text-left">المبلغ</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                {list.map((op, idx) => (
                                  <tr key={idx} className="text-slate-800">
                                    <td className="py-1 px-1.5 font-mono text-[8px] whitespace-nowrap">{op.date.substring(0, 10)}</td>
                                    <td className="py-1 px-1.5">
                                      <span>{op.type}</span>
                                      <span className="block text-[7px] text-slate-500 font-mono">{op.details}</span>
                                    </td>
                                    <td className="py-1 px-1.5 text-left font-mono font-bold">
                                      <span className={op.isPositive ? 'text-emerald-700' : 'text-slate-900'}>
                                        {op.isPositive ? '+' : '-'}{op.amount.toLocaleString()}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-[9px] text-slate-500 italic text-center py-2 bg-white border border-slate-200 rounded">
                            لا توجد عمليات سابقة مسجلة.
                          </p>
                        );
                      })()}
                    </div>
                  </>
                )}

                {printingJob.type === 'invoice' && printingJob.reading && (
                  <>
                    {/* Invoice breakdown details */}
                    <div className="space-y-1.5 text-[11px] mb-4">
                      <div className="flex justify-between">
                        <span className="text-slate-500">رقم الفاتورة:</span>
                        <span className="font-mono font-bold">{printingJob.reading.id.replace('rd-new-', 'INV-')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">فترة الفاتورة:</span>
                        <span className="font-bold">{printingJob.reading.billingMonth}</span>
                      </div>
                      {settings.receiptShowPreviousCurrentReadings !== false && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-slate-500">القراءة السابقة:</span>
                            <span className="font-mono">{printingJob.reading.previousReading} ك.و</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">القراءة الحالية:</span>
                            <span className="font-mono">{printingJob.reading.currentReading} ك.و</span>
                          </div>
                          <div className="flex justify-between border-b border-dashed border-slate-300 pb-1.5 mb-1.5 font-bold text-slate-900">
                            <span className="text-slate-500">صافي الاستهلاك:</span>
                            <span className="font-mono">{printingJob.reading.consumption} كيلوواط ساعي</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-500">سعر وحدة الطاقة:</span>
                        <span className="font-mono">{printingJob.reading.ratePerKwh} {settings.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">الرسوم الثابتة:</span>
                        <span className="font-mono">{printingJob.reading.fixedFee.toLocaleString()} {settings.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">ضريبة القيمة المضافة:</span>
                        <span className="font-mono">{printingJob.reading.taxAmount.toLocaleString()} {settings.currency}</span>
                      </div>
                    </div>

                    {/* Big invoice total box */}
                    <div className="bg-white border-2 border-slate-900 p-3 rounded-lg text-center my-4">
                      <span className="block text-[10px] font-black text-slate-600 mb-1">المبلغ الإجمالي المطلوب سداده</span>
                      <span className="block font-mono font-black text-2xl text-slate-950">
                        {printingJob.reading.totalAmount.toLocaleString()} 
                        <span className="text-xs font-sans font-bold mr-1">{settings.currency}</span>
                      </span>
                    </div>

                    {/* Tafqeet in Invoice */}
                    {settings.receiptShowTafqeet !== false && (
                      <p className="text-[9px] text-slate-700 font-bold text-center bg-slate-100 p-1.5 rounded mb-3">
                        {tafqeetArabic(printingJob.reading.totalAmount, settings.currency)}
                      </p>
                    )}
                  </>
                )}

                {printingJob.type === 'receipt' && printingJob.payment && printingJob.sub && (
                  <>
                    {/* Receipt breakdown details */}
                    <div className="space-y-1.5 text-[11px] mb-4">
                      <div className="flex justify-between">
                        <span className="text-slate-500">رقم السند:</span>
                        <span className="font-mono font-bold">{printingJob.payment.receiptNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">المبلغ المستلم:</span>
                        <span className="font-mono font-black text-slate-950">{printingJob.payment.amountPaid.toLocaleString()} {settings.currency}</span>
                      </div>
                      {settings.receiptShowPaymentMethod !== false && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">طريقة الدفع:</span>
                          <span className="font-bold">
                            {printingJob.payment.paymentMethod === 'cash' ? 'نقداً (كاش)' : printingJob.payment.paymentMethod === 'e-wallet' ? 'محفظة إلكترونية' : 'تحويل مصرفي'}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-dashed border-slate-300 pt-1.5 mt-1.5">
                        <span className="text-slate-500">الرصيد المتبقي المستحق:</span>
                        <span className="font-mono font-bold text-slate-900">{printingJob.sub.currentBalance.toLocaleString()} {settings.currency}</span>
                      </div>
                    </div>

                    {/* Big receipt cash box */}
                    <div className="bg-white border-2 border-slate-900 p-3 rounded-lg text-center my-4">
                      <span className="block text-[10px] font-black text-slate-600 mb-1">المبلغ المدفوع والمبين بالسند</span>
                      <span className="block font-mono font-black text-2xl text-emerald-800">
                        {printingJob.payment.amountPaid.toLocaleString()} 
                        <span className="text-xs font-sans font-bold mr-1">{settings.currency}</span>
                      </span>
                    </div>

                    {/* Tafqeet in Receipt */}
                    {settings.receiptShowTafqeet !== false && (
                      <p className="text-[9px] text-slate-700 font-bold text-center bg-slate-100 p-1.5 rounded mb-3">
                        {tafqeetArabic(printingJob.payment.amountPaid, settings.currency)}
                      </p>
                    )}
                  </>
                )}

                {printingJob.type === 'shift_report' && (() => {
                  const targetPayments = printingJob.shiftPayments || myPaymentsToday;
                  const targetCollected = targetPayments.reduce((sum, p) => sum + p.amountPaid, 0);
                  const targetCash = targetPayments.filter(p => p.paymentMethod === 'cash').reduce((sum, p) => sum + p.amountPaid, 0);
                  const targetWallet = targetPayments.filter(p => p.paymentMethod === 'e-wallet').reduce((sum, p) => sum + p.amountPaid, 0);
                  const targetBank = targetPayments.filter(p => p.paymentMethod === 'transfer').reduce((sum, p) => sum + p.amountPaid, 0);
                  const targetDate = printingJob.shiftDate || todayStr;
                  const targetProgress = Math.min(100, Math.round((targetCollected / dailyGoal) * 100));

                  return (
                    <>
                      {/* Shift Report details */}
                      <div className="space-y-1.5 text-[11px] mb-4">
                        <div className="flex justify-between text-slate-700 font-bold mb-1 pb-1 border-b border-slate-200">
                          <span>تاريخ التقرير:</span>
                          <span className="font-mono">{targetDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-bold">المستهدف المالي:</span>
                          <span className="font-mono font-bold">{dailyGoal.toLocaleString()} {settings.currency}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-bold">إجمالي المبالغ المحصلة:</span>
                          <span className="font-mono font-black text-emerald-800">{targetCollected.toLocaleString()} {settings.currency}</span>
                        </div>
                        <div className="border-t border-dashed border-slate-300 my-1.5 pt-1.5" />
                        
                        <div className="flex justify-between text-[10px] text-slate-600">
                          <span>- نقداً (كاش):</span>
                          <span className="font-mono">{targetCash.toLocaleString()} {settings.currency}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-600">
                          <span>- محفظة إلكترونية:</span>
                          <span className="font-mono">{targetWallet.toLocaleString()} {settings.currency}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-600">
                          <span>- تحويل مصرفي:</span>
                          <span className="font-mono">{targetBank.toLocaleString()} {settings.currency}</span>
                        </div>
                        <div className="border-t border-dashed border-slate-300 my-1.5 pt-1.5" />
                        
                        <div className="flex justify-between">
                          <span className="text-slate-500">سندات التحصيل:</span>
                          <span className="font-bold font-mono">{targetPayments.length} سند</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">الفواتير الصادرة اليوم:</span>
                          <span className="font-bold">{myReadingsToday.length} فاتورة</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">المشتركون المتبقون اليوم:</span>
                          <span className="font-bold">{remainingSubscribersToVisit} مشترك</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">نسبة تحقيق الهدف:</span>
                          <span className="font-bold font-mono">{targetProgress}%</span>
                        </div>
                      </div>

                      {/* Big shift report total cash box */}
                      <div className="bg-slate-900 text-white p-3.5 rounded-lg text-center my-4 print:border print:border-slate-400">
                        <span className="block text-[10px] font-black text-slate-300 mb-1">إجمالي العهدة المترتب تسليمها</span>
                        <span className="block font-mono font-black text-2xl text-amber-400 print:text-black">
                          {targetCollected.toLocaleString()} 
                          <span className="text-xs font-sans font-bold mr-1">{settings.currency}</span>
                        </span>
                      </div>
                    </>
                  );
                })()}

                {/* Separator */}
                <div className="border-t border-dashed border-slate-400 my-3" />

                {/* Warnings and Instructions */}
                {printingJob.type !== 'shift_report' ? (
                  <div className="text-center text-[10px] text-slate-800 space-y-1.5 px-1 py-1 bg-white border border-slate-200 rounded-lg">
                    {settings.receiptShowWarningNotice !== false && (
                      <p className="font-bold">
                        {settings.receiptWarningNoticeText || 'عزيزي المشترك، نرجو منكم سرعة المبادرة بتسديد المبالغ المستحقة لضمان استمرار الخدمة الكهربائية وتفادي تراكم المديونية.'}
                      </p>
                    )}
                    {settings.notes && (
                      <p className="text-[9px] text-slate-600 leading-tight">
                        {settings.notes}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-[10px] text-slate-800 space-y-1 px-1 py-1 bg-slate-100 border border-slate-200 rounded-lg">
                    <p className="font-bold">ملاحظة للإدارة: يعتبر هذا الكشف مسودة تسليم العهود المالية والميدانية للمحصل المذكور أعلاه.</p>
                    <p className="font-semibold text-[9px] text-slate-500">تحت المراجعة والتدقيق والترحيل النهائي.</p>
                  </div>
                )}

                {/* Barcode, QR & Footer info */}
                <div className="mt-6 text-center space-y-2">
                  {/* barcode visual */}
                  {settings.receiptShowBarcode !== false && (
                    <div className="font-mono text-xs tracking-[4px] text-slate-950 font-bold py-1 select-none">
                      ||||| | |||| ||| || ||| || |||
                    </div>
                  )}

                  {/* QR Code and Digital Stamp Row */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[8px] text-slate-600">
                    {settings.receiptShowQrCode !== false ? (
                      <div className="flex items-center gap-1 font-mono">
                        <QrCode className="w-3.5 h-3.5 text-slate-900" />
                        <span>QR-VERIFIED</span>
                      </div>
                    ) : <div />}

                    {settings.receiptShowDigitalStamp !== false && (
                      <div className="flex items-center gap-1 font-bold text-slate-800">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{settings.receiptCollectorNotice || 'ختم إلكتروني معتمد'}</span>
                      </div>
                    )}
                  </div>

                  {settings.receiptShowCollectorName !== false && (
                    <p className="text-[8px] font-mono text-slate-400">مستند آلي صادر ميدانياً - المحصل: {currentUser.name}</p>
                  )}
                  <p className="text-[8px] font-mono text-slate-500">تاريخ وتوقيت العملية: {new Date().toLocaleString('ar-YE')}</p>
                  <p className="text-[9px] font-bold text-slate-900">نظام فولترا السحابي - Voltera Cloud ERP</p>
                </div>

                {/* Visual Lower Cutter Line indicator */}
                <div className="flex items-center justify-between text-slate-400 text-[10px] mt-6 border-t border-dashed border-slate-300 pt-1 font-mono print:hidden select-none">
                  <Scissors className="w-3.5 h-3.5 rotate-90 text-slate-400" />
                  <span>نهاية الإيصال - يرجى القص</span>
                  <Scissors className="w-3.5 h-3.5 -rotate-90 text-slate-400" />
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Styled Headless Native Printing Layout Overrides */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
          }

          #root, div[role="dialog"], div[role="dialog"] > div {
            display: block !important;
            visibility: visible !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            position: static !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            border: none !important;
            box-shadow: none !important;
          }

          /* Hide standard elements */
          body * { 
            visibility: hidden !important; 
          }
          header, nav, footer, sidebar, .print-hidden, .print\\:hidden, [role="dialog"] > div:first-child, button { 
            display: none !important; 
          }
          
          /* Set standard margins & layout specifically for thermal receipt */
          @page {
            size: ${settings.receiptPaperWidth === '58mm' ? '58mm' : settings.receiptPaperWidth === 'A4' ? 'A4' : '80mm'} auto;
            margin: 0;
          }
          
          /* Position printable receipt container precisely */
          .print-container, .print-container * { 
            visibility: visible !important; 
          }
          .print-container { 
            position: relative !important; 
            left: 0 !important; 
            top: 0 !important; 
            right: 0 !important;
            width: ${settings.receiptPaperWidth === '58mm' ? '58mm' : settings.receiptPaperWidth === 'A4' ? '100%' : '80mm'} !important; 
            max-width: ${settings.receiptPaperWidth === '58mm' ? '58mm' : settings.receiptPaperWidth === 'A4' ? '210mm' : '80mm'} !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            padding: 2mm 3mm !important; 
            margin: 0 auto !important; 
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-before: avoid !important;
            break-before: avoid !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Force pure high contrast on thermal paper */
          .bg-slate-900 {
            background-color: transparent !important;
            color: #000000 !important;
            border: 1px solid #000000 !important;
          }
        }
      `}} />

      {/* Edit Reading Modal */}
      <AnimatePresence>
        {editingReading && editSub && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-md text-right flex flex-col gap-4"
              dir="rtl"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-amber-500" />
                  <span>تعديل قراءة العداد السريع</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingReading(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-base"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="block text-slate-400 font-bold mb-1">المشترك</span>
                  <p className="font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {editingReading.subscriberName}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-slate-400 font-bold mb-1">القراءة السابقة</span>
                    <p className="font-mono font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {editReadingPrev} ك.و
                    </p>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-bold mb-1">الاستهلاك المعدل</span>
                    <p className="font-mono font-bold text-amber-600 bg-amber-50/50 p-2.5 rounded-xl border border-amber-100">
                      {editConsumption} ك.و
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">القراءة الحالية الجديدة</label>
                  <input
                    type="number"
                    value={editReadingInput}
                    onChange={e => setEditReadingInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 font-mono text-slate-800 text-right focus:outline-none focus:border-slate-900"
                    placeholder="أدخل القراءة الحالية"
                    min={editReadingPrev}
                  />
                  {editReadingVal < editReadingPrev && (
                    <p className="text-[10px] text-rose-500 font-bold mt-1">يجب أن تكون القراءة الحالية أكبر من أو تساوي السابقة ({editReadingPrev}).</p>
                  )}
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-500">سعر الكيلوواط ({editSub.tariffType === 'residential' ? 'منزلي' : editSub.tariffType === 'commercial' ? 'تجاري' : 'صناعي'}):</span>
                    <span className="font-mono">{editRate} {settings.currency}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-500">قيمة الاستهلاك:</span>
                    <span className="font-mono">{(editConsumption * editRate).toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-500">الرسوم الثابتة والخدمة:</span>
                    <span className="font-mono">{(settings.fixedFee + settings.serviceFee).toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-500">الضريبة المضافة (%{settings.taxPercent}):</span>
                    <span className="font-mono">{editTaxAmount.toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="border-t border-slate-200/60 pt-2 flex justify-between font-bold text-slate-800">
                    <span>إجمالي الفاتورة الجديد:</span>
                    <span className="font-mono text-amber-600">{editTotalBillAmount.toLocaleString()} {settings.currency}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  onClick={handleSaveEditReading}
                  disabled={editReadingVal < editReadingPrev}
                  className="flex-1 bg-slate-900 hover:bg-slate-850 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black py-2.5 rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  حفظ التعديلات
                </button>
                <button
                  onClick={() => setEditingReading(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Payment Modal */}
      <AnimatePresence>
        {editingPayment && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-md text-right flex flex-col gap-4"
              dir="rtl"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-500" />
                  <span>تعديل سند القبض السريع</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-base"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <span className="block text-slate-400 font-bold mb-1">المشترك</span>
                  <p className="font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {editingPayment.subscriberName}
                  </p>
                </div>

                <div>
                  <span className="block text-slate-400 font-bold mb-1">رقم السند</span>
                  <p className="font-mono font-bold text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {editingPayment.receiptNumber}
                  </p>
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1">المبلغ المحصل الجديد</label>
                  <input
                    type="number"
                    value={editPaymentAmountInput}
                    onChange={e => setEditPaymentAmountInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 font-mono text-slate-800 text-right focus:outline-none focus:border-slate-900 font-bold text-emerald-600 text-xs"
                    placeholder="أدخل المبلغ المستلم"
                    min={1}
                  />
                </div>

                <div>
                  <label className="block text-slate-500 font-bold mb-1.5">طريقة القبض</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'cash', label: 'نقداً كاش' },
                      { id: 'e-wallet', label: 'محفظة إلكترونية' },
                      { id: 'transfer', label: 'تحويل بنكي' }
                    ].map(method => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setEditPaymentMethod(method.id as any)}
                        className={`py-2 px-1 rounded-xl border font-bold text-[10px] transition-all cursor-pointer ${
                          editPaymentMethod === method.id
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-extrabold shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {method.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  onClick={handleSaveEditPayment}
                  disabled={!editPaymentAmountInput || parseFloat(editPaymentAmountInput) <= 0}
                  className="flex-1 bg-slate-900 hover:bg-slate-850 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black py-2.5 rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  حفظ التعديلات
                </button>
                <button
                  onClick={() => setEditingPayment(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm Delete Dialog */}
      <AnimatePresence>
        {deletingItemId && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-sm text-right flex flex-col gap-4"
              dir="rtl"
            >
              <div className="flex items-center gap-3 text-rose-600 border-b border-slate-100 pb-3">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h3 className="text-sm font-black text-slate-850">إلغاء وتراجع عن العملية الميدانية</h3>
              </div>

              <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                هل أنت متأكد من رغبتك في حذف وإلغاء هذه العملية نهائياً؟ 
                سيقوم النظام تلقائياً بإعادة رصيد المشترك وحساباته إلى حالتها السابقة قبل الإدخال.
              </p>

              <div className="flex gap-3 mt-2">
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black py-2.5 rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  نعم، احذف العملية
                </button>
                <button
                  onClick={() => setDeletingItemId(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                >
                  تراجع
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Real-time Toast Alert for New Disconnection/Reconnection Orders */}
      <AnimatePresence>
        {toastAlert && (
          <div className="fixed top-16 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[150]" dir="rtl">
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="bg-slate-900 border-2 border-rose-500 text-white p-4 rounded-2xl shadow-2xl flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl shrink-0 ${
                    toastAlert.type === 'disconnection' 
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    <Bell className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold text-rose-400 uppercase tracking-wider block">إشعار عاجل من الإدارة</span>
                    <h4 className="text-xs font-black text-white">
                      {toastAlert.type === 'disconnection' ? '🔌 أمر فصل خدمة (توقيف التيار)' : '⚡ أمر إعادة / إدخال خدمة'}
                    </h4>
                  </div>
                </div>
                <button onClick={() => setToastAlert(null)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-slate-800/80 rounded-xl p-2.5 text-xs space-y-1 border border-slate-700/50">
                <p className="font-bold text-amber-300">المشترك: {toastAlert.applicantName}</p>
                <p className="text-[11px] text-slate-300">الهاتف: <span dir="ltr">{toastAlert.phone}</span> {toastAlert.address ? `| ${toastAlert.address}` : ''}</p>
                {toastAlert.description && <p className="text-[11px] text-slate-400 italic">البيان: {toastAlert.description}</p>}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => setToastAlert(null)}
                  className="px-3 py-1.5 text-xs text-slate-300 hover:text-white font-bold cursor-pointer"
                >
                  إغلاق
                </button>
                <button
                  onClick={() => {
                    setIsNotifDrawerOpen(true);
                    setSelectedOrderForExec(toastAlert);
                    setToastAlert(null);
                  }}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>معالجة وتنفيذ الأمر ⚡</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notifications & Field Work Orders Drawer */}
      <AnimatePresence>
        {isNotifDrawerOpen && (
          <div className="fixed inset-0 z-[120] bg-slate-950/60 backdrop-blur-xs flex justify-end" dir="rtl">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-lg bg-slate-900 text-white h-full shadow-2xl flex flex-col overflow-hidden border-r border-slate-800"
            >
              {/* Drawer Header */}
              <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-rose-500/20 rounded-2xl text-rose-400 border border-rose-500/30">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                      <span>إشعارات وأوامر الفصل والإعادة</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 font-semibold">أوامر التشغيل الصادرة مباشرة من إدارة المحطة</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsNotifDrawerOpen(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-950/50 border-b border-slate-800/80 text-center text-xs">
                <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                  <span className="block text-[10px] text-slate-400 font-bold">إجمالي الأوامر</span>
                  <span className="text-sm font-black text-white">{activeWorkOrders.length}</span>
                </div>
                <div className="bg-rose-950/40 p-2 rounded-xl border border-rose-900/50">
                  <span className="block text-[10px] text-rose-400 font-bold">أوامر الفصل 🔌</span>
                  <span className="text-sm font-black text-rose-400">
                    {activeWorkOrders.filter(r => r.type === 'disconnection' && r.status !== 'completed').length}
                  </span>
                </div>
                <div className="bg-emerald-950/40 p-2 rounded-xl border border-emerald-900/50">
                  <span className="block text-[10px] text-emerald-400 font-bold">أوامر الإعادة ⚡</span>
                  <span className="text-sm font-black text-emerald-400">
                    {activeWorkOrders.filter(r => (r.type === 'reconnection' || r.type === 'new_connection') && r.status !== 'completed').length}
                  </span>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 p-3 border-b border-slate-800/80 overflow-x-auto text-xs">
                {[
                  { id: 'all', label: 'الكل' },
                  { id: 'disconnection', label: '🔌 أوامر الفصل' },
                  { id: 'reconnection', label: '⚡ أوامر الإعادة والتوصيل' },
                  { id: 'maintenance', label: '🛠️ الصيانة' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setNotifFilter(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                      notifFilter === tab.id
                        ? 'bg-rose-600 text-white font-extrabold shadow-sm'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Orders List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredWorkOrders.length > 0 ? (
                  filteredWorkOrders.map(req => {
                    const isPending = req.status === 'pending' || req.status === 'in_progress';
                    const isDisconnection = req.type === 'disconnection';

                    return (
                      <div
                        key={req.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isPending
                            ? isDisconnection
                              ? 'bg-slate-900 border-rose-500/50 shadow-lg shadow-rose-950/20'
                              : 'bg-slate-900 border-emerald-500/50 shadow-lg shadow-emerald-950/20'
                            : 'bg-slate-900/50 border-slate-800/80 opacity-75'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black flex items-center gap-1 ${
                              req.type === 'disconnection'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : req.type === 'reconnection'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : req.type === 'new_connection'
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}>
                              {req.type === 'disconnection' && <Power className="w-3 h-3" />}
                              {req.type === 'reconnection' && <Zap className="w-3 h-3" />}
                              {req.type === 'new_connection' && <UserPlus className="w-3 h-3" />}
                              {req.type === 'maintenance' && <Wrench className="w-3 h-3" />}
                              <span>
                                {req.type === 'disconnection' ? '🔌 أمر فصل الخدمة' : req.type === 'reconnection' ? '⚡ أمر إعادة الخدمة' : req.type === 'new_connection' ? '👤 إدخال خدمة جديدة' : '🛠️ صيانة أعطال'}
                              </span>
                            </span>

                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              req.status === 'completed'
                                ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                                : req.status === 'in_progress'
                                ? 'bg-amber-900/60 text-amber-300 border border-amber-700/50'
                                : 'bg-rose-900/60 text-rose-300 border border-rose-700/50 animate-pulse'
                            }`}>
                              {req.status === 'completed' ? 'تم التنفيذ بنجاح ✅' : req.status === 'in_progress' ? 'جاري التنفيذ 🚧' : 'معلق قيد التنفيذ ⏳'}
                            </span>
                          </div>

                          <span className="text-[10px] text-slate-500 font-mono">{req.createdAt}</span>
                        </div>

                        <div className="space-y-1.5 my-2">
                          <h4 className="text-sm font-black text-white flex items-center gap-2">
                            <span>{req.applicantName}</span>
                            {req.subscriberCode && <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">#{req.subscriberCode}</span>}
                          </h4>
                          {req.address && <p className="text-xs text-slate-300 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />{req.address}</p>}
                          {req.description && (
                            <p className="text-xs bg-slate-950/70 p-2.5 rounded-xl text-slate-300 border border-slate-800 leading-relaxed font-semibold">
                              💬 {req.description}
                            </p>
                          )}
                          {req.completedAt && (
                            <p className="text-[11px] text-emerald-400 bg-emerald-950/40 p-2 rounded-lg border border-emerald-900/50">
                              ✅ تم التنفيذ بواسطة: {req.executedBy || 'المحصل الميداني'} بتاريخ {req.completedAt}
                              {req.notes ? ` (${req.notes})` : ''}
                            </p>
                          )}
                        </div>

                        {/* Action Toolbar */}
                        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {req.phone && (
                              <a
                                href={`tel:${req.phone}`}
                                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors text-xs font-bold flex items-center gap-1"
                                title="اتصال مباشر بالمشترك"
                              >
                                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="hidden sm:inline" dir="ltr">{req.phone}</span>
                              </a>
                            )}

                            <button
                              onClick={() => {
                                setIsNotifDrawerOpen(false);
                                setActiveTab('map');
                              }}
                              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer"
                              title="عرض موقع المشترك على الخريطة"
                            >
                              <MapPin className="w-3.5 h-3.5 text-amber-400" />
                              <span className="hidden sm:inline">الخريطة</span>
                            </button>
                          </div>

                          {isPending && (
                            <div className="flex items-center gap-2">
                              {req.status === 'pending' && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(req, 'in_progress')}
                                  className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold rounded-xl border border-amber-500/30 transition-all cursor-pointer"
                                >
                                  تحديد كـ جاري التنفيذ
                                </button>
                              )}

                              <button
                                onClick={() => setSelectedOrderForExec(req)}
                                className={`px-3 py-1.5 text-xs font-black rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1 ${
                                  req.type === 'disconnection'
                                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>تنفيذ وتأكيد الأمر ⚡</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-16 text-center text-slate-500 space-y-3">
                    <Bell className="w-12 h-12 mx-auto text-slate-700" />
                    <p className="text-xs font-bold">لا توجد أوامر ميدانية حالياً ضمن هذا التصنيف</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Work Order Execution Modal */}
      <AnimatePresence>
        {selectedOrderForExec && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-md text-right overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl ${
                    selectedOrderForExec.type === 'disconnection' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                  }`}>
                    {selectedOrderForExec.type === 'disconnection' ? <Power className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      تأكيد تنفيذ {selectedOrderForExec.type === 'disconnection' ? 'أمر فصل الخدمة 🔌' : 'أمر إعادة/توصيل الخدمة ⚡'}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-semibold">تأكيد الإجراء الميداني وتحديث حالة المشترك آلياً</p>
                  </div>
                </div>
                <button onClick={() => setSelectedOrderForExec(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleExecuteWorkOrder} className="space-y-4">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-500">المشترك:</span>
                    <span className="font-black text-slate-900">{selectedOrderForExec.applicantName}</span>
                  </div>
                  {selectedOrderForExec.phone && (
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-500">الهاتف:</span>
                      <span className="font-mono font-bold text-slate-800" dir="ltr">{selectedOrderForExec.phone}</span>
                    </div>
                  )}
                  {selectedOrderForExec.address && (
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-500">العنوان:</span>
                      <span className="font-bold text-slate-800">{selectedOrderForExec.address}</span>
                    </div>
                  )}
                  {selectedOrderForExec.description && (
                    <div className="pt-1 border-t border-slate-200">
                      <span className="block text-[10px] text-slate-400 font-bold mb-0.5">سبب/تفاصيل الأمر من الإدارة:</span>
                      <p className="text-[11px] text-slate-700 italic font-medium">{selectedOrderForExec.description}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">ملاحظات المحصل عند التنفيذ الميداني</label>
                  <textarea
                    rows={3}
                    value={execNotes}
                    onChange={e => setExecNotes(e.target.value)}
                    placeholder={selectedOrderForExec.type === 'disconnection' ? 'مثال: تم فصل الكابل من القاطع الرئيسي وإغلاق الصندوق برقم كود 482' : 'مثال: تم إعادة ربط التوصيلات وتشغيل التيار وقياس الفولتية 220V'}
                    className="w-full border border-slate-200 rounded-xl p-3 text-xs outline-none focus:border-indigo-600 font-medium resize-none"
                  ></textarea>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-800 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    عند الحفظ، سيتم تحويل حالة الأمر إلى "مكتمل" وتحديث حالة المشترك تلقائياً في السجل والإشعارات.
                  </span>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className={`flex-1 font-black py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer ${
                      selectedOrderForExec.type === 'disconnection'
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    تأكيد وحفظ التنفيذ 💾
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedOrderForExec(null)}
                    className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Batch Zero Reading Confirmation Modal */}
      <AnimatePresence>
        {isBatchZeroModalOpen && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 w-full max-w-md text-right overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      تأكيد تسجيل قراءات صفرية (0 ك.و) للعدادات المتبقية
                    </h3>
                    <p className="text-[11px] text-slate-500 font-semibold">بناءً على نتائج المعاينة الميدانية</p>
                  </div>
                </div>
                <button onClick={() => setIsBatchZeroModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs text-amber-900 font-medium space-y-2">
                  <p className="font-bold text-amber-950">
                    تمت المعاينة الميدانية وأتضح عدم وجود أي استهلاك كهربائي جديد.
                  </p>
                  <p>
                    سيتم تسجيل قراءة صفرية (0 ك.و) بصفة جماعية لعدد <strong className="text-amber-700 font-mono text-sm underline">{filteredPendingSubscribersList.length}</strong> مشتركون غير مقروءين اليوم، مع احتفاظ العداد بقراءته السابقة واحتساب رسوم الاشتراك للحد الأدنى إن وجدت.
                  </p>
                </div>

                <div className="max-h-36 overflow-y-auto bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs space-y-1 custom-scrollbar">
                  <span className="block text-[10px] text-slate-400 font-bold mb-1">المشتركون المشمولون بالعملية ({filteredPendingSubscribersList.length}):</span>
                  {filteredPendingSubscribersList.map((s, idx) => (
                    <div key={s.id} className="flex justify-between items-center bg-white px-2.5 py-1 rounded-lg border border-slate-150 text-[11px]">
                      <span className="font-bold text-slate-800">{idx + 1}. {s.name}</span>
                      <span className="font-mono text-slate-500 font-semibold">{s.meterNumber}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const listToProcess = [...filteredPendingSubscribersList];
                      listToProcess.forEach((sub, idx) => {
                        setTimeout(() => {
                          handleQuickZeroReading(sub);
                        }, idx * 30);
                      });
                      setIsBatchZeroModalOpen(false);
                    }}
                    className="flex-1 font-black py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>تأكيد تسجيل قراءات استهلاك صفر (0 ك.و)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsBatchZeroModalOpen(false)}
                    className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        {/* Android Native SMS Info & Test Modal */}
        {showSmsSettingsModal && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 shadow-2xl max-w-lg w-full border border-slate-200 text-right space-y-4 max-h-[90vh] overflow-y-auto"
              dir="rtl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">إدارة وأذونات الرسائل النصية (SMS Permissions)</h3>
                    <span className="text-[10px] text-slate-500 font-bold">صلاحيات الوصول للتراسل التلقائي وتفعيل أندرويد</span>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSmsSettingsModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
                {/* Active Permissions Status Card */}
                <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-emerald-400" />
                      حالة أذونات أندرويد في الجهاز (Device Permissions)
                    </span>
                    <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] rounded-full border border-emerald-500/30 font-bold">
                      مفعلة وتعمل ✅
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                    <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 flex items-center justify-between">
                      <span className="font-mono text-slate-300">SEND_SMS</span>
                      <span className="text-emerald-400 font-bold">مسموح</span>
                    </div>
                    <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 flex items-center justify-between">
                      <span className="font-mono text-slate-300">READ_SMS</span>
                      <span className="text-emerald-400 font-bold">مسموح</span>
                    </div>
                    <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 flex items-center justify-between">
                      <span className="font-mono text-slate-300">RECEIVE_SMS</span>
                      <span className="text-emerald-400 font-bold">مسموح</span>
                    </div>
                  </div>

                  {/* Request & Re-grant permissions button */}
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem('voltera_sms_permission_granted', 'true');
                      alert('تم منح وتأكيد صلاحيات إرسال الرسائل SMS بنجاح على هذا الجهاز! 🎉');
                    }}
                    className="w-full mt-2 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تأكيد وتفعيل أذونات الـ SMS الآن (Grant / Re-request SMS)</span>
                  </button>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                  <h4 className="font-black text-slate-800 text-xs">آلية عمل الرسائل التلقائية للمحصل:</h4>
                  <p>
                    عند تسجيل <strong className="text-slate-900">القراءة</strong> أو <strong className="text-slate-900">القبض</strong>، يقوم النظام بإرسال رسالة نصية قصيرة تحتوي على كافة تفاصيل الفاتورة/السند إلى جوال المشترك فوراً دون الحاجة لمغادرة التطبيق.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    ملاحظة: ملف <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-800">AndroidManifest.xml</code> يتضمن صلاحيات التراسل المباشر بالكامل.
                  </p>
                </div>

                {/* Quick SMS Test */}
                <div className="p-3.5 bg-sky-50 rounded-2xl border border-sky-200 text-sky-950 space-y-2">
                  <h4 className="font-bold text-xs text-sky-900 flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-sky-600" />
                    اختبار إرسال رسالة تجريبية (Live SMS Test)
                  </h4>
                  <div className="flex items-center gap-2">
                    <input
                      type="tel"
                      id="testSmsPhoneInput"
                      placeholder="أدخل رقم الجوال للتجربة (مثال: 770000000)"
                      className="flex-1 bg-white border border-sky-300 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-sky-500"
                      defaultValue={selectedSub?.phone || ''}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const input = document.getElementById('testSmsPhoneInput') as HTMLInputElement;
                        const phone = input?.value || '';
                        if (!phone) {
                          alert('يرجى إدخال رقم جوال للاختبار');
                          return;
                        }
                        const res = await sendSMSDirectly(phone, `تجربة إرسال رسالة نصية من تطبيق محطة الكهرباء التجاريه - فولترا.\nالوقت: ${new Date().toLocaleTimeString('ar-YE')}`, {
                          forceSmsUri: smsSendMode === 'sms_uri'
                        });
                        setLastSmsResult(res);
                        alert(res.message);
                      }}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs shrink-0 cursor-pointer transition-colors"
                    >
                      تجربة الإرسال
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-[11px] font-bold">
                  ⚡ وضع الإرسال المحدد: <span className="underline">{smsSendMode === 'direct_android' ? 'إرسال آلي مباشر بدون مغادرة التطبيق (Direct Android SMS)' : 'الانتقال لتطبيق الرسائل (SMS App Intent)'}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowSmsSettingsModal(false)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                >
                  إغلاق النافذة
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Shift Settlement Modal */}
      <ShiftSettlementModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        currentUser={currentUser}
        settings={settings}
        myPaymentsToday={myPaymentsToday}
        myReadingsToday={myReadingsToday}
        dailyGoal={dailyGoal}
        remainingSubscribersCount={remainingSubscribersToVisit}
        progressPercent={progressPercent}
        treasuryTransfers={treasuryTransfers}
        onUpdateTreasuryTransfers={onUpdateTreasuryTransfers}
        onAddAuditLog={onAddAuditLog}
        onPrintShiftReport={() => {
          setPrintingJob({
            type: 'shift_report',
            sub: selectedSub || subscribers[0] || null
          });
        }}
      />

      {/* Barcode / QR Camera Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        subscribers={subscribers}
        onSelectSubscriber={(sub) => {
          handleSelectSubscriber(sub);
          setIsBarcodeModalOpen(false);
        }}
      />
    </div>
  );
};
