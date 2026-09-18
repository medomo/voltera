import { ConnectionTemplate } from '../../types';

export const DEFAULT_CONNECTION_TEMPLATES: ConnectionTemplate[] = [
  {
    id: 'tpl_res_1p',
    title: 'توصيل منزلي قياسي (1 فاز)',
    serviceType: 'new_connection',
    badge: 'منزلي 220V',
    tariffType: 'residential',
    connectionFee: 15000,
    meterCost: 35000,
    insuranceDeposit: 10000,
    installationLaborFee: 5000,
    description: 'باقة اشتراك وتوصيل تيار منزلي عادي مع عداد ديجيتال 1 فاز وتأمين استهلاك',
    icon: 'Home',
    defaultMaterials: [
      { id: 'm1', name: 'عداد رقمي 1-Phase 10/40A', quantity: 1, unit: 'حبة', unitPrice: 35000, notes: 'عداد ديجيتال معتمد' },
      { id: 'm2', name: 'كابل سلك نحاس معزول 10 ملم', quantity: 20, unit: 'متر', unitPrice: 800, notes: 'خط تغذية هوائي' },
      { id: 'm3', name: 'قاطع أوتوماتيكي أحادي 32A', quantity: 1, unit: 'حبة', unitPrice: 3500, notes: 'حماية داخلية' },
      { id: 'm4', name: 'صندوق حماية للعداد مع القفل', quantity: 1, unit: 'حبة', unitPrice: 4000, notes: 'صندوق خارجي مقاوم للعوامل' }
    ]
  },
  {
    id: 'tpl_comm_1p',
    title: 'توصيل تجاري محلات ومكاتب (1 فاز)',
    serviceType: 'new_connection',
    badge: 'تجاري 220V',
    tariffType: 'commercial',
    connectionFee: 25000,
    meterCost: 40000,
    insuranceDeposit: 20000,
    installationLaborFee: 8000,
    description: 'باقة اشتراك محلات تجارية ومكاتب مع تأمين استهلاك تجاري وتجهيز قاطع حماية',
    icon: 'Store',
    defaultMaterials: [
      { id: 'm1', name: 'عداد رقمي تجاري 1-Phase 10/60A', quantity: 1, unit: 'حبة', unitPrice: 40000, notes: 'عداد حمولة تجارية' },
      { id: 'm2', name: 'كابل سلك نحاس معزول 16 ملم', quantity: 25, unit: 'متر', unitPrice: 1200, notes: 'خط رئيسي' },
      { id: 'm3', name: 'قاطع أوتوماتيكي 40A Schneider', quantity: 1, unit: 'حبة', unitPrice: 5500, notes: 'قاطع حماية' },
      { id: 'm4', name: 'صندوق حماية عداد حديد/بلاستيك مقوى', quantity: 1, unit: 'حبة', unitPrice: 5000, notes: 'صندوق معتمد' }
    ]
  },
  {
    id: 'tpl_ind_3p',
    title: 'توصيل 3-Phase صناعي / تجاري كبير',
    serviceType: 'phase_upgrade',
    badge: 'صناعي 380V',
    tariffType: 'industrial',
    connectionFee: 60000,
    meterCost: 95000,
    insuranceDeposit: 50000,
    installationLaborFee: 20000,
    description: 'اشتراك 3 فاز للمصانع، الورش، والمجمعات مع محولات تيار وقواطع ضغط عالي',
    icon: 'Factory',
    defaultMaterials: [
      { id: 'm1', name: 'عداد ثلاثي الفاز 3-Phase 3x220/380V', quantity: 1, unit: 'حبة', unitPrice: 95000, notes: 'عداد ديجيتال متعدد الوظائف' },
      { id: 'm2', name: 'كابل مسلح 4x16 ملم', quantity: 30, unit: 'متر', unitPrice: 2800, notes: 'كابل ضغط ثلاثي' },
      { id: 'm3', name: 'قاطع ثلاثي 3-Pole 63A/100A MCCB', quantity: 1, unit: 'حبة', unitPrice: 18000, notes: 'قاطع رئيسي صناعي' },
      { id: 'm4', name: 'محولات شدة تيار CT 100/5A (طقم 3 حبات)', quantity: 1, unit: 'طقم', unitPrice: 25000, notes: 'طقم محولات قياس' }
    ]
  },
  {
    id: 'tpl_meter_replace',
    title: 'استبدال وتجديد عداد تالف / قديم',
    serviceType: 'meter_replacement',
    badge: 'استبدال عداد',
    tariffType: 'residential',
    connectionFee: 5000,
    meterCost: 35000,
    insuranceDeposit: 0,
    installationLaborFee: 4000,
    description: 'تغيير عداد تالف أو عاطل مع فحص المعايرة وتركيب العداد البديل ونقل الرصيد',
    icon: 'RefreshCw',
    defaultMaterials: [
      { id: 'm1', name: 'عداد رقمي بديل 1-Phase معتمد', quantity: 1, unit: 'حبة', unitPrice: 35000, notes: 'عداد جديد بديل' },
      { id: 'm2', name: 'طقم مرابط وأختام رصاص أمنية', quantity: 1, unit: 'طقم', unitPrice: 1500, notes: 'أختام حماية' }
    ]
  },
  {
    id: 'tpl_meter_relocation',
    title: 'نقل موقع عداد وتعديل مسار الشبكة',
    serviceType: 'relocation',
    badge: 'نقل موقع',
    tariffType: 'residential',
    connectionFee: 10000,
    meterCost: 0,
    insuranceDeposit: 0,
    installationLaborFee: 8000,
    description: 'نقل العداد من موقع لآخر وتمديد كابلات جديدة وتثبيت الصندوق في مكان جديد',
    icon: 'MapPin',
    defaultMaterials: [
      { id: 'm1', name: 'كابل سلك معزول 10 ملم إضافي', quantity: 15, unit: 'متر', unitPrice: 800, notes: 'تمديد مسار جديد' },
      { id: 'm2', name: 'مسامير تثبيت وكلبسات تعليق', quantity: 1, unit: 'طقم', unitPrice: 1200, notes: 'مستلزمات تثبيت' }
    ]
  },
  {
    id: 'tpl_reconnect',
    title: 'إعادة إطلاق وتوصيل تيار مفصول',
    serviceType: 'reconnect',
    badge: 'إعادة تيار',
    tariffType: 'residential',
    connectionFee: 6000,
    meterCost: 0,
    insuranceDeposit: 0,
    installationLaborFee: 2000,
    description: 'إعادة ربط وتوصيل التيار بعد تسوية المديونيات أو طلب المشترك مع فحص العداد',
    icon: 'Zap',
    defaultMaterials: [
      { id: 'm1', name: 'فيوز حماية ومرابط هوائية', quantity: 1, unit: 'طقم', unitPrice: 1500, notes: 'مربط ألمنيوم معزول' }
    ]
  },
  {
    id: 'tpl_agricultural',
    title: 'توصيل اشتراك زراعي / مضخات آبار',
    serviceType: 'new_connection',
    badge: 'زراعي / مضخات',
    tariffType: 'agricultural',
    connectionFee: 45000,
    meterCost: 85000,
    insuranceDeposit: 40000,
    installationLaborFee: 15000,
    description: 'باقة تشغيل مضخات ومزارع بقدرات كهربائية خاصة وحماية ضد الصواعق وتذبذب الجهد',
    icon: 'Sprout',
    defaultMaterials: [
      { id: 'm1', name: 'عداد ثلاثي رقمي زراعي 3-Phase', quantity: 1, unit: 'حبة', unitPrice: 85000, notes: 'عداد قياس زراعي' },
      { id: 'm2', name: 'كابل رئيسي هوائي 4x25 ملم', quantity: 40, unit: 'متر', unitPrice: 3500, notes: 'خط مزارع' },
      { id: 'm3', name: 'جهاز حماية من تتابع الفازات وارتفاع الجهد', quantity: 1, unit: 'حبة', unitPrice: 14000, notes: 'Phase Sequence & Voltage Relay' }
    ]
  }
];

export const SERVICE_TYPE_LABELS: Record<string, { label: string; badge: string }> = {
  new_connection: { label: 'توصيل وعداد جديد', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  phase_upgrade: { label: 'ترقية 3-Phase', badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' },
  relocation: { label: 'نقل موقع عداد', badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' },
  reconnect: { label: 'إعادة إطلاق تيار', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  meter_replacement: { label: 'استبدال وتغيير عداد', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  maintenance: { label: 'صيانة وتوسعة شبكة', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30' }
};
