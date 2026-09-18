import { User, Subscriber, MeterReading, Payment, SystemSettings, AuditLog, InventoryItem, InventoryTransaction, SmsTemplate, Partner, PartnerTransaction, ProfitDistributionBatch } from './types';

export const INITIAL_USERS: User[] = [
  {
    id: 'u-1',
    username: 'admin',
    passwordHash: 'admin', // Simple passwords for easy demo login
    role: 'admin',
    name: 'المهندس أحمد صالح (مدير النظام)',
    status: 'active',
    permissions: ['all_permissions'],
    createdAt: '2026-01-01 08:00'
  },
  {
    id: 'u-2',
    username: 'coll1',
    passwordHash: '123',
    role: 'collector',
    name: 'محمد علي سالم (المحصل الميداني)',
    status: 'active',
    permissions: ['read_readings', 'write_readings', 'write_payments'],
    createdAt: '2026-01-15 09:30'
  },
  {
    id: 'u-3',
    username: 'coll2',
    passwordHash: '123',
    role: 'collector',
    name: 'خالد عبدالله عوض (المحصل الميداني)',
    status: 'active',
    permissions: ['read_readings', 'write_readings', 'write_payments'],
    createdAt: '2026-02-01 10:00'
  },
  {
    id: 'u-4',
    username: 'coll_sus',
    passwordHash: '123',
    role: 'collector',
    name: 'عمر ياسين سعيد (موقوف مؤقتاً)',
    status: 'suspended',
    permissions: ['read_readings'],
    createdAt: '2026-02-15 11:00'
  },
  {
    id: 'u-5',
    username: 'manager',
    passwordHash: 'manager',
    role: 'manager',
    name: 'عبدالله يحيى (المدير العام)',
    status: 'active',
    permissions: ['all_permissions'],
    createdAt: '2026-02-01 08:00'
  },
  {
    id: 'u-6',
    username: 'account',
    passwordHash: 'account',
    role: 'accountant',
    name: 'خالد سعيد (محاسب)',
    status: 'active',
    permissions: ['finance', 'reporting', 'subscribers'],
    createdAt: '2026-02-15 08:00'
  },
  {
    id: 'u-7',
    username: 'data',
    passwordHash: 'data',
    role: 'data_entry',
    name: 'سالم أحمد (مدخل بيانات)',
    status: 'active',
    permissions: ['subscribers', 'operations', 'inventory'],
    createdAt: '2026-03-01 08:00'
  }
];

export const INITIAL_SUBSCRIBERS: Subscriber[] = [];

export const INITIAL_READINGS: MeterReading[] = [];

export const INITIAL_PAYMENTS: Payment[] = [];

export const DEFAULT_SETTINGS: SystemSettings = {
  stationName: 'محطة الكهرباء التجارية',
  stationNameEn: 'Commercial Electric Station',
  ownerName: 'المدير العام',
  ownerNameEn: 'General Manager',
  commercialRegister: '',
  email: '',
  whatsapp: '',
  logoUrl: '',
  logoText: 'VOLTA',
  phone: '',
  phone2: '',
  address: 'الفرع الرئيسي',
  notes: 'المحطة غير مسؤولة عن الأعطال الناجمة عن التمديدات الداخلية الخاطئة.',
  currency: 'ر.ي',
  readingCycleIntervalDays: 10,
  readingCycleMode: 'decadal',
  autoSnapshotEnabled: true,
  autoSnapshotIntervalHours: 2,
  maxAutoSnapshotsToKeep: 30,
  tariffs: {
    residential: 0,
    commercial: 0,
    industrial: 0,
    government: 0,
    agricultural: 0,
    mosque: 0,
    other: 0
  },
  tariffCalculationMethod: 'flat',
  tariffSlices: [],
  tariffAuditHistory: [],
  fixedFee: 0,
  taxPercent: 0,
  serviceFee: 0,
  cleaningFee: 0,
  streetLightFee: 0,
  meterRentalFee: 0,
  reconnectionFee: 0,
  latePenaltyPerDay: 0,
  meterInspectionFee: 0,
  nameTransferFee: 0,
  meterReplacementFee: 0,
  meterInsuranceDeposit: 0,
  minMonthlyConsumptionKwh: 0,
  touEnabled: false,
  peakMultiplier: 1.0,
  peakHoursStart: '18:00',
  peakHoursEnd: '23:00',
  receiptPaperWidth: '80mm',
  receiptFontSize: 'normal',
  receiptShowLogo: true,
  receiptShowStationHeader: true,
  receiptShowBarcode: true,
  receiptShowQrCode: true,
  receiptShowDigitalStamp: true,
  receiptShowPreviousCurrentReadings: true,
  receiptShowCollectorName: true,
  receiptShowCustomerPhone: true,
  receiptShowTafqeet: true,
  receiptShowWarningNotice: true,
  receiptWarningNoticeText: 'عزيزي المشترك، نرجو سرعة المبادرة بسداد المبالغ المستحقة لضمان استمرار الخدمة الكهربائية وتفادي تراكم المديونية.',
  receiptShowPaymentMethod: true,
  receiptShowZoneInfo: true,
  receiptCopiesCount: 1,
  receiptDarknessLevel: 'dark',
  receiptAutoCut: true,
  zones: ['المنطقة الرئيسية'],
  transformers: [
    {
      id: 'tr-1',
      name: 'المحول الرئيسي 1',
      meterNumber: 'MTR-01',
      capacityKva: 500,
      zone: 'المنطقة الرئيسية',
      previousMasterReading: 0,
      currentMasterReading: 0,
      ctRatio: 1
    }
  ]
};

export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

export const INITIAL_INVENTORY: InventoryItem[] = [];

export const INITIAL_INVENTORY_TRANSACTIONS: InventoryTransaction[] = [];

export const INITIAL_SMS_TEMPLATES: SmsTemplate[] = [];

export const SAMPLE_SMS_TEMPLATES: SmsTemplate[] = [
  { 
    id: 'tpl-reading-1', 
    name: 'إشعار فاتورة استهلاك جديدة', 
    content: 'الأخ المشترك: {اسم_المشترك}\nرقم العداد: {رقم_العداد}\nالقراءة الحالية: {القراءة_الحالية}\nالقراءة السابقة: {القراءة_السابقة}\nالاستهلاك: {الاستهلاك} ك.و\nالمبلغ المستحق: {المبلغ}\nالمتأخرات السابقة: {المبالغ_المتأخره}\nالإجمالي المطلوب للسداد: {الرصيد_المتبقي}\n{اسم_المحطة}',
    type: 'reading',
    description: 'إشعار فواتير الاستهلاك الصادرة دورياً متضمناً القراءات والاستهلاك والمبالغ المطلوبة'
  },
  { 
    id: 'tpl-payment-1', 
    name: 'سند قبض وتأكيد استلام الدفعة', 
    content: 'تم استلام مبلغ {المبلغ} من المشترك: {اسم_المشترك} بموجب سند رقم {رقم_السند}.\nالرصيد المتبقي بذمتكم: {الرصيد_المتبقي}\nشكرًا لالتزامكم بالسداد.\n{اسم_المحطة}',
    type: 'payment',
    description: 'إشعار فوري بعد تحصيل وتسديد المشترك لمبلغ الفاتورة'
  },
  { 
    id: 'tpl-reminder-1', 
    name: 'تذكير بمهلة السداد وإنذار فصل', 
    content: 'الأخ المشترك: {اسم_المشترك}\nرقم العداد: {رقم_العداد}\nنود تذكيركم بضرورة سداد المديونية المتأخرة المستحقة والبالغة {الرصيد_المتبقي} لتفادي فصل الخدمة الكهربائية.\nللاستفسار: {هاتف_المحطة}\n{اسم_المحطة}',
    type: 'reminder',
    description: 'تنبيه للمشتركين المتأخرين عن السداد لتفادي فصل التيار وتطبيق غرامات التأخير'
  },
  {
    id: 'tpl-maintenance-1',
    name: 'إشعار فصل مبرمج وأعمال صيانة',
    content: 'عزيزي المشترك: {اسم_المشترك}\nنحيطكم علماً بأنه سيتم فصل التيار الكهربائي مؤقتاً لأعمال الصيانة الدورية وتطوير الشبكة في مربعكم ({المربع})، نعتذر عن أي إزعاج.\nإدارة التشغيل - {اسم_المحطة}',
    type: 'maintenance',
    description: 'إشعار عام للمشتركين في مربع محدد قبل إجراء أعمال الصيانة والتطوير الميداني'
  },
  {
    id: 'tpl-welcome-1',
    name: 'ترحيب باشتراك جديد وتركيب العداد',
    content: 'مرحباً بك {اسم_المشترك} في شبكة {اسم_المحطة}.\nتم تفعيل اشتراكك بنجاح على عداد رقم: {رقم_العداد} في مربع: {المربع}.\nلأي استفسارات أو طوارئ تواصل معنا: {هاتف_المحطة}',
    type: 'custom',
    description: 'رسالة ترحيبية فورية للمشتركين الجدد بعد تركيب العداد وربط الخدمة'
  }
];

export const INITIAL_PARTNERS: Partner[] = [];

export const INITIAL_PARTNER_TRANSACTIONS: PartnerTransaction[] = [];

export const INITIAL_PROFIT_DISTRIBUTIONS: ProfitDistributionBatch[] = [];


