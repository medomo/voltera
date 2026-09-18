export type UserRole = 'admin' | 'collector' | 'manager' | 'accountant' | 'data_entry';

export interface User {
  id: string;
  username: string;
  passwordHash: string; // Storing plain/simple pass for local demo but labeled passwordHash
  role: UserRole;
  name: string;
  status: 'active' | 'suspended';
  permissions: string[];
  createdAt: string;
  phone?: string;
  address?: string;
  notes?: string;
  hasInternet?: boolean;
  employeeId?: string; // معرف سجل الموظف المرتبط بهذا الحساب
  employeeName?: string; // اسم الموظف المرتبط
}

export type TariffType = 'residential' | 'commercial' | 'industrial' | 'government' | 'agricultural' | 'mosque' | 'other';

export interface Subscriber {
  id: string;
  subscriberCode?: string;
  name: string;
  phone: string;
  meterNumber: string;
  zone: string;
  transformer?: string;
  tariffType: TariffType;
  status: 'active' | 'suspended' | 'disconnected';
  initialReading: number;
  currentReading: number; // Updated upon posting/submitting readings
  openingBalance?: number;
  currentBalance: number; // Positive is debt/due, negative is credit
  coordinates?: { lat: number; lng: number };
  createdAt: string;
}

export interface MeterReading {
  id: string;
  invoiceNumber?: string; // Guaranteed sequential invoice number (e.g. INV-10001)
  subscriberId: string;
  subscriberName: string;
  meterNumber: string;
  previousReading: number;
  currentReading: number;
  consumption: number; // currentReading - previousReading
  ratePerKwh: number;
  fixedFee: number;
  taxAmount: number;
  totalAmount: number; // Gross invoice total before credit deductions
  prepaidCreditDeducted?: number; // Auto-deducted prepaid credit balance
  netAmountDue?: number; // Net amount due after credit deduction
  billingMonth: string; // e.g., "2026-07"
  readingDate: string;
  enteredBy: string; // Username of collector
  isPosted: boolean; // Transferred to billing/balance
  postedDate?: string;
  postedBy?: string;
  isRejected?: boolean;
  rejectionReason?: string;
  smsSent?: boolean; // Indicates if an SMS was initiated from admin panel
  notes?: string;
}

export interface Payment {
  id: string;
  subscriberId: string;
  subscriberName: string;
  amountPaid: number;
  previousBalance?: number; // Balance before this payment
  appliedToBill?: number; // Portion applied to current bill/debt
  creditBalanceCarried?: number; // Overpayment/surplus carried over as prepaid credit balance
  remainingBalance?: number; // Final net balance after payment (<0 means credit)
  paymentDate: string;
  paymentMethod: 'cash' | 'transfer' | 'e-wallet';
  receivedBy: string; // Username of collector
  receiptNumber: string; // Guaranteed sequential receipt number (e.g. REC-10001)
  isPosted: boolean; // Transferred to final closing
  postedDate?: string;
  postedBy?: string;
  isRejected?: boolean;
  rejectionReason?: string;
  smsSent?: boolean; // Indicates if an SMS was initiated from admin panel
}

export interface FailedSmsItem {
  id: string;
  type: 'reading' | 'payment' | 'custom';
  referenceId: string; // Reading ID or Payment ID
  subscriberId: string;
  subscriberName: string;
  meterNumber?: string;
  receiptNumber?: string;
  amount: number;
  phone: string;
  messageText: string;
  templateId?: string;
  templateName?: string;
  createdAt: string;
  failedReason?: string;
  status?: 'pending' | 'failed' | 'sent';
}

export interface TransformerConfig {
  id: string;
  name: string;
  meterNumber: string;
  capacityKva?: number;
  zone?: string;
  previousMasterReading: number;
  currentMasterReading: number;
  ctRatio?: number;
  lastReadingDate?: string;
  notes?: string;
}

export interface LossAnalysis {
  transformerName: string;
  meterNumber: string;
  capacityKva: number;
  zone: string;
  prevReading: number;
  currReading: number;
  centralEnergyKwh: number;
  subMetersEnergyKwh: number;
  totalLossKwh: number;
  totalLossPercent: number;
  lossValueCurrency: number;
  technicalLossPercent: number;
  technicalLossKwh: number;
  commercialLossKwh: number;
  commercialLossPercent: number;
  trafficLight: 'green' | 'yellow' | 'red';
  status: 'normal' | 'warning' | 'alert';
  statusText: string;
  subscribersCount: number;
  recommendation: string;
}

export interface StationBankAccount {
  id: string;
  bankName: string; // e.g. بنك الكريمي، محفظة جوالي، محفظة كاش، بنك التضامن، ون كاش، بنك اليمن والكويت، بنك القطيبي، أخرى
  accountName: string; // اسم صاحب الحساب / المستفيد المعتمد
  accountNumber: string; // رقم الحساب / رقم المحفظة / IBAN
  branchName?: string; // اسم الفرع
  iban?: string;
  qrCodeUrl?: string; // رابط أو كود QR للسداد السريع المباشر
  isPrimary?: boolean; // الحساب الافتراضي المعتمد بالفواتير والسندات
  isActive?: boolean;
  notes?: string;
}

export interface StationBranchOrOffice {
  id: string;
  name: string; // اسم الفرع أو مكتب خدمات المشتركين
  code?: string; // كود الفرع
  managerName?: string; // مسؤول الفرع
  phone?: string;
  address?: string;
  workingHours?: string;
  isActive?: boolean;
}

export interface ConsumptionSliceTier {
  id: string;
  name: string; // اسم الشريحة مثل: الشريحة الأولى (0-100 ك.و)
  category: 'all' | 'residential' | 'commercial' | 'industrial' | 'government' | 'agricultural' | 'mosque' | 'other';
  minKwh: number;
  maxKwh: number | null; // null يعني فما فوق (غير محدود)
  ratePerKwh: number; // سعر الكيلوواط في هذه الشريحة
  fixedAdditionalFee?: number; // رسم إضافي للشريحة
  color?: string;
  notes?: string;
}

export interface TariffAuditHistoryItem {
  id: string;
  date: string;
  user: string;
  action: string;
  previousTariffSummary: string;
  newTariffSummary: string;
  reason?: string;
}

export interface SystemSettings {
  stationName: string;
  stationNameEn?: string;
  stationCode?: string; // كود المحطة المعتمد مثل ST-01
  ownerName?: string;
  ownerNameEn?: string;
  commercialRegister?: string;
  taxNumber?: string; // الرقم الضريبي / المالي
  licenseNumber?: string; // رقم ترخيص التوليد من وزارة الكهرباء والطاقة
  licenseIssueDate?: string; // تاريخ إصدار الترخيص
  licenseExpiryDate?: string; // تاريخ انتهاء الترخيص
  stationType?: string; // تجارية ديزل، طاقة شمسية، هجين ديزل وشمس، محطة توزيع، أخرى
  stationCapacityKw?: number; // القدرة التوليدية الإجمالية بالكيلوواط
  transformerCapacityKva?: number; // سعة المحولات الإجمالية بالكيلو فولت أمبير
  operationalStatus?: 'active' | 'maintenance' | 'expansion'; // الحالة التشغيلية
  
  // Official Identity & Visual Branding Assets
  logoUrl?: string;
  officialStampUrl?: string; // الختم الرسمي الدائري المعتمد للمحطة
  managerSignatureUrl?: string; // توقيع المدير العام المعتمد إلكترونياً
  watermarkUrl?: string; // العلامة المائية الرسمية
  logoText: string; // الشعار اللفظي المطبوع
  tagline?: string; // العبارة الرسمية / الرؤية
  
  // Communication & Digital Channels
  phone: string;
  phone2?: string; // هاتف الطوارئ 24/7
  whatsapp?: string;
  whatsappChannel?: string;
  email?: string;
  websiteUrl?: string;
  
  // Geographical Location & Coverage
  country?: string; // الدولة
  city?: string; // المحافظة / المدينة
  district?: string; // المديرية
  address: string; // العنوان ومقر المحطة
  gpsCoordinates?: string; // إحداثيات GPS (خط العرض والطول)
  coverageArea?: string; // نطاق التغطية الجغرافية والأحياء المخدومة
  
  // Operational Schedules
  workingHours?: string; // ساعات دوام الإدارة واستقبال المشتركين
  generationHours?: string; // ساعات التوليد والتشغيل اليومي
  emergencyContactPerson?: string; // مسؤول الطوارئ والمناوبة
  
  // Official Bank Accounts & Digital Payment Wallets
  bankAccounts?: StationBankAccount[];
  
  // Station Branches & Service Centers
  branches?: StationBranchOrOffice[];
  
  notes?: string;
  disclaimer?: string;
  currency: string;

  // Modern Electricity Tariffs Matrix
  tariffs: {
    residential: number; // price per kWh
    commercial: number;
    industrial: number;
    government?: number;
    agricultural?: number;
    mosque?: number;
    other?: number;
  };

  // Tariff Calculation Logic
  tariffCalculationMethod?: 'flat' | 'tiered_progressive' | 'tiered_total_bracket';
  tariffSlices?: ConsumptionSliceTier[];
  tariffAuditHistory?: TariffAuditHistoryItem[];

  // Itemized System Fees & Surcharges
  fixedFee: number; // الرسوم الثابتة الشهرية الأساسية للاشتراك
  taxPercent: number; // ضريبة القيمة المضافة / المبيعات %
  serviceFee: number; // رسوم الصيانة وخدمة الشبكة
  cleaningFee?: number; // رسوم النظافة والتحسين
  streetLightFee?: number; // رسوم إنارة الشوارع
  meterRentalFee?: number; // رسوم إيجار العداد (لغير المالكين)
  reconnectionFee?: number; // رسوم إعادة التوصيل بعد الفصل
  latePenaltyPerDay?: number; // غرامة التأخير عن السداد
  meterInspectionFee?: number; // رسوم فحص ومعايرة العداد
  nameTransferFee?: number; // رسوم نقل ملكية أو تنازل عن الاشتراك
  meterReplacementFee?: number; // رسوم استبدال العداد التالف
  meterInsuranceDeposit?: number; // مبلغ تأمين العداد الافتراضي
  minMonthlyConsumptionKwh?: number; // الحد الأدنى للاستهلاك الشهري بالكيلوواط

  // Time-of-Use / Peak vs Off-Peak Tariff (تعرفة فترات الذروة)
  touEnabled?: boolean;
  peakMultiplier?: number; // معامل الذروة مثل 1.25 أو زيادة مئوية
  peakHoursStart?: string; // e.g. "17:00"
  peakHoursEnd?: string; // e.g. "23:00"

  zones?: any[];
  transformers?: any[];
  centralMeters?: any[];
  squares?: any[];
  routes?: any[];
  contracts?: any[];
  services?: any[];
  fines?: any[];
  generators?: any[];
  openingBalances?: any[];
  tariffConsumption?: any[];
  tariffSubscription?: any[];

  // Reading & Field Visit Cycle (دورة النزول الميداني وقراءة العدادات)
  readingCycleIntervalDays?: number; // e.g. 10
  readingCycleMode?: 'decadal' | 'monthly' | 'weekly'; // 'decadal' = 3 times a month (every 10 days)

  // Theme & Appearance Customization
  themeColor?: 'amber' | 'blue' | 'emerald' | 'purple' | 'slate' | 'cyan' | 'rose';
  fontFamily?: 'Cairo' | 'Tajawal' | 'Readex Pro' | 'IBM Plex Sans Arabic' | 'Almarai';
  sidebarStyle?: 'slate' | 'midnight' | 'glass' | 'navy';
  layoutDensity?: 'standard' | 'compact';
  animationsEnabled?: boolean;
  pulseStatusIndicators?: boolean;
  highContrastFields?: boolean;
  soundEffectsEnabled?: boolean;

  // Additional Services & Gateway Integrations
  whatsappEnabled?: boolean;
  whatsappCustomTemplate?: string;
  whatsappChannelUrl?: string;
  autoSmsEnabled?: boolean;
  smsGatewayProvider?: string;
  smsGatewayConfig?: SmsGatewayConfig;
  autoSendReadingSms?: boolean;
  autoSendPaymentSms?: boolean;
  smsDueWarningEnabled?: boolean;
  batchSmsIntervalMs?: number;
  autoCloudBackup?: boolean;
  onlinePaymentEnabled?: boolean;
  meterQrScanningEnabled?: boolean;
  meterQrPayloadFormat?: 'meter_number_only' | 'encrypted_subscriber_url' | 'full_json';
  ePaymentWalletAccountsNotice?: string;
  selfHealingIntegrityCheckEnabled?: boolean;

  // Cloud Periodic Auto-Snapshot Engine (نقاط الاستعادة السحابية الدورية التلقائية)
  autoSnapshotEnabled?: boolean; // تفعيل إنشاء نقاط الاستعادة السحابية تلقائياً
  autoSnapshotIntervalHours?: number; // عدد الساعات بين كل نقطة استعادة (مثلاً: 2 ساعات، 4 ساعات، 12 ساعة)
  lastAutoSnapshotTime?: string; // تاريخ ووقت آخر نقطة استعادة تم إنشاؤها تلقائياً
  maxAutoSnapshotsToKeep?: number; // الحد الأقصى للنقاط التلقائية المحفوظة في قاعدة البيانات

  // Comprehensive Thermal Receipt Customization (إعدادات السندات والفواتير الحرارية)
  receiptPaperWidth?: '80mm' | '58mm' | 'A4';
  receiptHeaderTemplate?: string;
  receiptFooterTerms?: string;
  receiptCollectorNotice?: string;
  receiptFontSize?: 'compact' | 'normal' | 'large';
  receiptShowLogo?: boolean;
  receiptShowStationHeader?: boolean;
  receiptShowBarcode?: boolean;
  receiptShowQrCode?: boolean;
  receiptShowDigitalStamp?: boolean;
  receiptShowPreviousCurrentReadings?: boolean;
  receiptShowCollectorName?: boolean;
  receiptShowCustomerPhone?: boolean;
  receiptShowTafqeet?: boolean; // كتابة المبلغ بالحروف العربية
  receiptShowWarningNotice?: boolean; // تحذير فصل التيار والسداد
  receiptWarningNoticeText?: string;
  receiptShowPaymentMethod?: boolean;
  receiptShowZoneInfo?: boolean;
  receiptCopiesCount?: number; // عدد النسخ المطبوعة تلقائياً
  receiptDarknessLevel?: 'light' | 'normal' | 'dark' | 'ultra-high-contrast';
  receiptAutoCut?: boolean;

  // Closed Accounting Periods (إغلاق الفترات والشهور المالية)
  closedPeriods?: ClosedPeriod[];
}

export interface ClosedPeriod {
  id: string;
  month: string; // e.g. "2026-07"
  closedAt: string;
  closedBy: string;
  notes?: string;
  totalRevenues: number;
  totalExpenses: number;
  netProfit: number;
  readingsCount: number;
  paymentsCount: number;
}

export interface SmsGatewayConfig {
  provider: 'android_local' | 'android_native' | 'custom_http' | 'yemen_mobile' | 'yemen_sms' | 'you' | 'sabafon' | 'twilio' | 'unifonic' | 'taqnyat' | 'sms_misr' | 'custom' | 'whatsapp_web' | string;
  enabled?: boolean;
  apiUrl?: string;
  httpMethod?: 'POST' | 'GET';
  apiKey?: string;
  apiSecret?: string;
  senderId?: string; // e.g. "VOLTERA-ELEC"
  bearerToken?: string;
  contentType?: 'json' | 'form_urlencoded';
  customHeaders?: string; // JSON string of custom key-value headers
  customBodyTemplate?: string; // JSON string with placeholders like {"to": "{phone}", "text": "{message}"}
  whatsappTemplatePrefix?: string;
  isActive?: boolean;
  batchDelayMs?: number;
  retryAttempts?: number;
}

export interface SmsOutboxLog {
  id: string;
  subscriberId?: string;
  subscriberName?: string;
  meterNumber?: string;
  phone: string;
  message: string;
  type: 'reading' | 'payment' | 'reminder' | 'broadcast' | 'maintenance' | 'custom';
  method: 'android_native' | 'cloud_gateway' | 'sms_uri' | 'whatsapp' | string;
  status: 'sent' | 'failed' | 'pending';
  timestamp: string;
  errorMessage?: string;
  batchId?: string;
}

export interface SmsTemplate {
  id: string;
  name: string;
  content: string;
  type?: 'reading' | 'payment' | 'reminder' | 'broadcast' | 'maintenance' | 'custom' | string;
  description?: string;
  category?: string;
  updatedAt?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface PostingStatus {
  lastReadingPostedDate: string;
  lastPaymentPostedDate: string;
  currentBillingCycle: string; // e.g., "July 2026"
}

export interface InventoryItem {
  id: string;
  code?: string;
  name: string;
  category: 'cables' | 'meters' | 'breakers' | 'oil' | 'transformers' | 'tools' | 'poles' | 'insulators' | 'safety' | 'other' | string;
  quantity: number;
  unit: string;
  minAlertLevel: number;
  minQuantity?: number;
  costPrice?: number;
  unitPrice?: number;
  sellingPrice?: number;
  location?: string;
  warehouse?: string;
  supplier?: string;
  brand?: string;
  specification?: string;
  reorderQuantity?: number;
  batchNumber?: string;
  lastUpdated: string;
  notes?: string;
  barcode?: string;
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  itemName: string;
  type: 'in' | 'out' | 'damage' | 'adjustment' | 'transfer' | 'return' | string;
  quantity: number;
  unitPrice?: number;
  totalValue?: number;
  date: string;
  user: string;
  warehouse?: string;
  toWarehouse?: string;
  technician?: string;
  subscriberId?: string;
  subscriberName?: string;
  supplierName?: string;
  invoiceNo?: string;
  notes?: string;
  refNo?: string;
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  date: string;
  description: string;
  recordedBy: string;
}

export interface Purchase {
  id: string;
  amount: number;
  items: string;
  date: string;
  supplier: string;
  recordedBy: string;
  invoiceNumber?: string;
  paidAmount?: number;
  paymentType?: 'cash' | 'credit';
  notes?: string;
}

export interface JournalEntry {
  id: string;
  voucherNumber: string;
  date: string;
  type: 'receipt' | 'billing' | 'expense' | 'payroll' | 'purchase' | 'connection' | 'manual' | 'transfer';
  typeLabel: string;
  debitAccountCode: string;
  debitAccountName: string;
  creditAccountCode: string;
  creditAccountName: string;
  amount: number;
  description: string;
  recordedBy: string;
}

export interface EmployeeTransaction {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'salary' | 'advance' | 'allowance' | 'deduction' | 'repayment';
  amount: number;
  date: string;
  description: string;
  recordedBy: string;
  month?: string;
  voucherNo?: string;
}

export interface ConnectionMaterialItem {
  id: string;
  itemId?: string; // ID الصنف من المخزن في حال ربطه
  name: string; // اسم المادة أو الصنف
  quantity: number; // الكمية المصروفة
  unit: string; // الوحدة (متر، حبة، طقم، لفة...)
  unitPrice?: number; // سعر الوحدة
  totalPrice?: number; // الإجمالي
  deductFromInventory?: boolean; // هل تم صرفه وخصمه من المخزن
  notes?: string;
}

export interface ServiceConnection {
  id: string;
  voucherNo?: string; // رقم السند / الطلب الرسمي مثل CON-2026-001
  subscriberId: string;
  subscriberName: string;
  phone?: string;
  meterNumber?: string; // رقم العداد
  zone?: string; // المربع أو الحي
  tariffType?: 'residential' | 'commercial' | 'industrial' | 'agricultural' | string;
  serviceType?: 'new_connection' | 'phase_upgrade' | 'relocation' | 'reconnect' | 'meter_replacement' | 'maintenance' | string;
  
  // Cost breakdown
  connectionFee?: number; // رسوم التوصيل والاشتراك
  meterCost?: number; // ثمن العداد
  insuranceDeposit?: number; // مبلغ التأمين المسترد
  installationLaborFee?: number; // أجور التركيب واليد الفنية
  materialsFee?: number; // قيمة المواد والكابلات
  otherFees?: number; // رسوم إضافية أو غرامات سابقة
  
  totalFee: number;
  paidAmount: number;
  remainingAmount?: number;
  date: string;
  materialsUsed: string;
  materialsList?: ConnectionMaterialItem[]; // قائمة تفصيلية بالمواد والتجهيزات المصروفة
  deductMaterialsFromInventory?: boolean; // خيار الخصم المباشر من المخزون
  assignedTechnician?: string; // الفني المنفذ
  paymentMethod?: 'cash' | 'bank_transfer' | 'credit' | string;
  bankAccountId?: string;
  notes?: string;
  status: 'completed' | 'pending' | 'in_progress' | 'cancelled' | string;
  autoCreatedSubscriber?: boolean;
  recordedBy?: string;
  createdAt?: string;
  isRejected?: boolean;
}

export interface Employee {
  id: string;
  code?: string;
  name: string;
  role: 'engineer' | 'technician' | 'admin' | 'accountant' | 'collector' | string;
  phone: string;
  nationalId?: string;
  department?: string;
  salary: number;
  allowances?: number;
  deductions?: number;
  status: 'active' | 'inactive';
  joinDate: string;
  bankAccount?: string;
  address?: string;
  notes?: string;
  userId?: string; // معرف حساب المستخدم في النظام
  username?: string; // اسم المستخدم المرتبط
}

export interface TechnicalRequest {
  id: string;
  type: 'new_connection' | 'maintenance' | 'disconnection' | 'reconnection';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  applicantName: string;
  phone: string;
  address: string;
  description: string;
  createdAt: string;
  assignedTo?: string;
  completedAt?: string;
  subscriberId?: string;
  subscriberCode?: string;
  notes?: string;
  executedBy?: string;
  priority?: 'normal' | 'high' | 'urgent';
}

export interface CustomRoad {
  id: string;
  name: string;
  type: 'alley' | 'dirt_path' | 'side_street' | 'shortcut';
  path: [number, number][]; // Array of [lat, lng]
  createdAt: string;
  createdBy?: string;
  notes?: string;
}

export interface AIAlleyDetected {
  id: string;
  name: string;
  type: 'alley' | 'dirt_path' | 'side_street' | 'shortcut';
  confidence: number;
  description: string;
  path: [number, number][];
}

export type PartnerRole = 'founding_partner' | 'silent_partner' | 'managing_partner' | 'investor' | 'shareholder';
export type PartnerStatus = 'active' | 'inactive' | 'withdrawn' | 'suspended';

export interface Partner {
  id: string;
  code: string; // e.g. PRT-01
  name: string;
  role: PartnerRole;
  sharePercentage: number; // e.g. 25 for 25%
  shareCount?: number; // عدد الحصص / الأسهم
  nominalShareValue?: number; // القيمة الاسمية للحصة
  capitalContribution: number; // رأس المال الأساسي المكتتب به
  phone: string;
  emergencyPhone?: string;
  nationalId?: string;
  nationalIdType?: string;
  email?: string;
  address?: string;
  bankAccountDetails?: string;
  iban?: string;
  joinDate: string;
  exitDate?: string;
  status: PartnerStatus;
  notes?: string;
  currentBalance?: number; // الحساب الجاري للشريك (رأس المال + أرباح مستحقة - مسحوبات)
  exitSettlementAmount?: number;
}

export type PartnerTransactionType = 
  | 'capital_deposit' // إيداع وزيادة رأس المال
  | 'drawing' // مسحوبات شخصية
  | 'profit_share' // استحقاق توزيع أرباح
  | 'profit_payout' // استلام وصرف نقدي للأرباح
  | 'capital_reinvestment' // رسملة وإعادة استثمار الأرباح
  | 'loan_to_company' // قرض من الشريك للشركة
  | 'loan_repayment' // سداد قرض الشريك
  | 'partner_expense' // مصروفات دفعها الشريك لصالح المحطة
  | 'share_transfer' // تنازل ونقل حصص بين الشركاء
  | 'capital_reduction'; // تخفيض حصة رأس المال

export interface PartnerTransaction {
  id: string;
  voucherNumber: string;
  partnerId: string;
  partnerName: string;
  type: PartnerTransactionType;
  amount: number;
  date: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'e_wallet' | 'journal_entry' | 'capital_credit';
  treasurySource?: string; // الصندوق أو الحساب المصرفي المرتبط
  description: string;
  distributionBatchId?: string; // إذا كانت الحركة ناتجة عن معالج توزيع أرباح
  targetPartnerId?: string; // في حال التنازل عن الحصص
  targetPartnerName?: string;
  recordedBy: string;
  notes?: string;
  receiptNumber?: string;
}

export interface PartnerProfitShareItem {
  partnerId: string;
  partnerName: string;
  sharePercentage: number;
  calculatedProfit: number; // المبلغ المحسوب تلقائياً
  managementBonus: number; // مكافأة إدارة إن وجدت
  totalShare: number; // الإجمالي المستحق
  payoutStatus: 'credited_to_account' | 'paid_in_cash' | 'reinvested' | 'pending';
  paidDate?: string;
  notes?: string;
}

export interface ProfitDistributionBatch {
  id: string;
  batchNumber: string; // e.g. DIST-2026-Q1
  periodType: 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'custom';
  periodLabel: string; // e.g. "الربع الأول 2026" أو "شهر يوليو 2026"
  startDate: string;
  endDate: string;
  totalRevenue: number; // إجمالي الإيرادات في الفترة
  billedRevenue?: number; // إيرادات الفواتير الصادرة
  collectedRevenue?: number; // إيرادات المحصل الفعلي
  totalExpenses: number; // إجمالي المصروفات والتشغيل
  operationalExpenses?: number; // نفقات تشغيلية
  purchasesExpenses?: number; // مشتريات وقطع غيار
  fuelExpenses?: number; // ديزل وزيوت
  grossProfit: number; // مجمل الربح
  
  // Deductions & Reserves
  legalReservePercent: number; // نسبة الاحتياطي القانوني/النظامي (مثلا 10%)
  legalReserveAmount: number;
  emergencyReservePercent: number; // احتياطي صيانة وطوارئ المولدات والشبكة
  emergencyReserveAmount: number;
  maintenanceReservePercent?: number; // احتياطي إهلاك وتجديد الأصول
  maintenanceReserveAmount?: number;
  fuelFluctuationReservePercent?: number; // احتياطي تقلبات أسعار الوقود
  fuelFluctuationReserveAmount?: number;
  retainedEarningsAmount: number; // أرباح مبقاة للتوسعة
  totalDeductions: number;
  
  netDistributableProfit: number; // صافي الربح القابل للتوزيع
  partnerShares: PartnerProfitShareItem[];
  payoutChoice?: 'credited_to_account' | 'paid_in_cash' | 'reinvested';
  status: 'draft' | 'approved' | 'executed';
  approvedBy?: string;
  approvedDate?: string;
  notes?: string;
  createdAt: string;
}

export interface TreasuryTransfer {
  id: string;
  transferNumber: string;
  date: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  notes: string;
  recordedBy: string;
}

