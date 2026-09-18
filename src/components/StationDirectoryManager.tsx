import React, { useState, useRef } from 'react';
import { 
  Building2, 
  Camera, 
  UploadCloud, 
  Trash2, 
  Link as LinkIcon, 
  FileBadge, 
  Phone, 
  Mail, 
  Globe, 
  MapPin, 
  Compass, 
  Check, 
  ShieldCheck, 
  Award, 
  Sparkles, 
  Zap, 
  CreditCard, 
  Plus, 
  Clock, 
  FileText, 
  Printer, 
  Share2, 
  Copy, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  ChevronRight,
  Layers,
  Map,
  Edit3,
  Palette
} from 'lucide-react';
import { SystemSettings, StationBankAccount, StationBranchOrOffice, AuditLog } from '../types';
import { updateStationDirectoryInDatabase, saveStationDirectoryDirectlyToCloud } from '../lib/database';
import { AppearanceThemeStudio } from './station/AppearanceThemeStudio';
import { AdditionalServicesHub } from './station/AdditionalServicesHub';

interface StationDirectoryManagerProps {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  onAddAuditLog?: ((log: AuditLog) => void) | ((action: string, details: string) => void);
}

// Preset popular Yemeni & regional banks and electronic wallets
const POPULAR_BANKS_WALLETS = [
  'بنك الكريمي للتمويل الأصغر الإسلامي',
  'محفظة جوالي (Jwali)',
  'محفظة كاش (Cash)',
  'محفظة ون كاش (OneCash)',
  'بنك التضامن الإسلامي',
  'بنك اليمن والكويت (YKB)',
  'بنك القطيبي الإسلامي',
  'محفظة بي كاش (PayCash)',
  'محفظة شامل موني (Shamel Money)',
  'محفظة فلوسك (Floosak)',
  'البنك الأهلي اليمني',
  'بنك سبأ الإسلامي',
  'أخرى / تحويل صرافة'
];

export const StationDirectoryManager: React.FC<StationDirectoryManagerProps> = ({
  settings,
  onUpdateSettings,
  onAddAuditLog
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'appearance' | 'services' | 'legal' | 'branding' | 'contact' | 'banking' | 'branches' | 'schedule' | 'policies'>('appearance');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // Modal / Form state for Bank Accounts
  const [showBankModal, setShowBankModal] = useState(false);
  const [editingBank, setEditingBank] = useState<StationBankAccount | null>(null);
  const [bankForm, setBankForm] = useState<Partial<StationBankAccount>>({
    bankName: POPULAR_BANKS_WALLETS[0],
    accountName: '',
    accountNumber: '',
    branchName: '',
    isPrimary: false,
    isActive: true,
    notes: ''
  });

  // Modal / Form state for Branches
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<StationBranchOrOffice | null>(null);
  const [branchForm, setBranchForm] = useState<Partial<StationBranchOrOffice>>({
    name: '',
    code: '',
    managerName: '',
    phone: '',
    address: '',
    workingHours: '',
    isActive: true
  });

  const logoInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  // Image compressor helper
  const compressImage = (file: File, maxWidth = 300, maxHeight = 300, quality = 0.85): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL(file.type || 'image/png', quality));
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 5 ميجابايت');
        return;
      }
      const compressed = await compressImage(file, 280, 280, 0.85);
      onUpdateSettings({ ...settings, logoUrl: compressed });
    }
  };

  const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 5 ميجابايت');
        return;
      }
      const compressed = await compressImage(file, 250, 250, 0.85);
      onUpdateSettings({ ...settings, officialStampUrl: compressed });
    }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 5 ميجابايت');
        return;
      }
      const compressed = await compressImage(file, 250, 150, 0.85);
      onUpdateSettings({ ...settings, managerSignatureUrl: compressed });
    }
  };

  // Get current GPS location helper
  const handleGetGpsLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toFixed(6);
          const lng = position.coords.longitude.toFixed(6);
          onUpdateSettings({
            ...settings,
            gpsCoordinates: `${lat}, ${lng}`
          });
          setSaveStatus({ success: true, message: `تم جلب إحداثيات الموقع بنجاح: ${lat}, ${lng}` });
          setTimeout(() => setSaveStatus(null), 3000);
        },
        (error) => {
          alert('تعذر تحديد الموقع الجغرافي تلقائياً. يرجى التأكد من تفعيل خدمة الموقع في المتصفح أو إدخال الإحداثيات يدوياً.');
        }
      );
    } else {
      alert('خدمة تحديد الموقع غير مدعومة في هذا المتصفح.');
    }
  };

  // Update Station Directory in Cloud Firestore Database (in-place Edit)
  const handleSaveToCloud = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      await updateStationDirectoryInDatabase(settings, settings);
      onUpdateSettings(settings);
      
      if (onAddAuditLog) {
        const actionStr = 'تعديل دليل المحطة وسجل الهوية الرسمية';
        const detailsStr = `تم تعديل وتحديث بيانات دليل المحطة الرسمية (${settings.stationName || 'محطة الكهرباء'}) والتراخيص والحسابات في المستند الثابت بقاعدة البيانات السحابية`;
        try {
          (onAddAuditLog as any)({
            id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            userId: 'admin',
            username: 'مدير النظام',
            action: actionStr,
            details: detailsStr,
            timestamp: new Date().toISOString().substring(0, 16).replace('T', ' ')
          });
        } catch {
          (onAddAuditLog as any)(actionStr, detailsStr);
        }
      }

      setSaveStatus({
        success: true,
        message: '⚡ تم تعديل وتحديث دليل المحطة وسجل الهوية الرسمية في قاعدة البيانات السحابية بنجاح!'
      });
      setTimeout(() => setSaveStatus(null), 5000);
    } catch (err) {
      console.error('Error updating station profile in cloud database:', err);
      setSaveStatus({
        success: false,
        message: 'حدث خطأ أثناء تعديل البيانات في قاعدة البيانات السحابية. تم حفظ التعديلات محلياً وسيتم المزامنة تلقائياً.'
      });
      setTimeout(() => setSaveStatus(null), 6000);
    } finally {
      setIsSaving(false);
    }
  };

  // Bank Account CRUD
  const handleSaveBankAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankForm.bankName || !bankForm.accountNumber) {
      alert('يرجى ملء اسم البنك / المحفظة ورقم الحساب أو المحفظة');
      return;
    }

    const currentAccounts = settings.bankAccounts || [];
    let updatedAccounts: StationBankAccount[];

    if (editingBank) {
      updatedAccounts = currentAccounts.map(b => 
        b.id === editingBank.id ? { ...b, ...bankForm } as StationBankAccount : b
      );
    } else {
      const newAcc: StationBankAccount = {
        id: `bank_${Date.now()}`,
        bankName: bankForm.bankName || POPULAR_BANKS_WALLETS[0],
        accountName: bankForm.accountName || settings.ownerName || settings.stationName,
        accountNumber: bankForm.accountNumber || '',
        branchName: bankForm.branchName || '',
        iban: bankForm.iban || '',
        qrCodeUrl: bankForm.qrCodeUrl || '',
        isPrimary: currentAccounts.length === 0 ? true : !!bankForm.isPrimary,
        isActive: bankForm.isActive !== false,
        notes: bankForm.notes || ''
      };
      updatedAccounts = [...currentAccounts, newAcc];
    }

    // If marked primary, unmark others
    if (bankForm.isPrimary) {
      const targetId = editingBank ? editingBank.id : updatedAccounts[updatedAccounts.length - 1].id;
      updatedAccounts = updatedAccounts.map(b => ({
        ...b,
        isPrimary: b.id === targetId
      }));
    }

    onUpdateSettings({ ...settings, bankAccounts: updatedAccounts });
    setShowBankModal(false);
    setEditingBank(null);
    setBankForm({
      bankName: POPULAR_BANKS_WALLETS[0],
      accountName: '',
      accountNumber: '',
      branchName: '',
      isPrimary: false,
      isActive: true,
      notes: ''
    });
  };

  const handleDeleteBankAccount = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الحساب البنكي / المحفظة من السجل الرسمي؟')) {
      const updated = (settings.bankAccounts || []).filter(b => b.id !== id);
      onUpdateSettings({ ...settings, bankAccounts: updated });
    }
  };

  // Branch CRUD
  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchForm.name) {
      alert('يرجى كتابة اسم الفرع أو مكتب الخدمة');
      return;
    }

    const currentBranches = settings.branches || [];
    let updatedBranches: StationBranchOrOffice[];

    if (editingBranch) {
      updatedBranches = currentBranches.map(b => 
        b.id === editingBranch.id ? { ...b, ...branchForm } as StationBranchOrOffice : b
      );
    } else {
      const newBr: StationBranchOrOffice = {
        id: `branch_${Date.now()}`,
        name: branchForm.name || '',
        code: branchForm.code || `BR-0${currentBranches.length + 1}`,
        managerName: branchForm.managerName || '',
        phone: branchForm.phone || '',
        address: branchForm.address || '',
        workingHours: branchForm.workingHours || '',
        isActive: branchForm.isActive !== false
      };
      updatedBranches = [...currentBranches, newBr];
    }

    onUpdateSettings({ ...settings, branches: updatedBranches });
    setShowBranchModal(false);
    setEditingBranch(null);
    setBranchForm({
      name: '',
      code: '',
      managerName: '',
      phone: '',
      address: '',
      workingHours: '',
      isActive: true
    });
  };

  const handleDeleteBranch = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الفرع من دليل المحطة؟')) {
      const updated = (settings.branches || []).filter(b => b.id !== id);
      onUpdateSettings({ ...settings, branches: updated });
    }
  };

  // Copy Station Directory Summary to Clipboard
  const handleCopyStationProfile = () => {
    const lines = [
      `⚡ ${settings.stationName || 'محطة الكهرباء التجارية'}`,
      settings.stationNameEn ? `English: ${settings.stationNameEn}` : '',
      settings.stationCode ? `رمز المحطة: ${settings.stationCode}` : '',
      settings.ownerName ? `المالك / الإدارة: ${settings.ownerName}` : '',
      settings.commercialRegister ? `السجل التجاري: ${settings.commercialRegister}` : '',
      settings.licenseNumber ? `رقم ترخيص الطاقة: ${settings.licenseNumber}` : '',
      `📞 الهاتف: ${settings.phone || 'غير محدد'}`,
      settings.phone2 ? `🚨 طوارئ 24/7: ${settings.phone2}` : '',
      settings.whatsapp ? `💬 واتساب: ${settings.whatsapp}` : '',
      settings.email ? `✉️ البريد: ${settings.email}` : '',
      `📍 العنوان: ${settings.address || 'اليمن'}`,
      settings.workingHours ? `⏰ ساعات الدوام: ${settings.workingHours}` : '',
      settings.bankAccounts && settings.bankAccounts.length > 0 
        ? `\n💳 الحسابات المعتمدة للسداد:\n` + settings.bankAccounts.map(b => `• ${b.bankName}: ${b.accountNumber} (${b.accountName})`).join('\n')
        : ''
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(lines);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 3000);
  };

  // Print Official ID Certificate
  const handlePrintCertificate = () => {
    window.print();
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Top Banner & Action Header */}
      <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-800 pb-5">
          
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSaveToCloud}
              disabled={isSaving}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 px-6 rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-amber-500/20 flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>جاري تعديل دليل المحطة في قاعدة البيانات...</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-4 h-4" />
                  <span>تعديل دليل المحطة في قاعدة البيانات</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handlePrintCertificate}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer border border-slate-700 flex items-center gap-2"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>طباعة بطاقة الهوية الرسمية</span>
            </button>

            <button
              type="button"
              onClick={handleCopyStationProfile}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer border border-slate-700 flex items-center gap-2"
            >
              {copiedText ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-sky-400" />}
              <span>{copiedText ? 'تم نسخ الدليل!' : 'نسخ الدليل للواتساب'}</span>
            </button>
          </div>

          <div className="text-right">
            <div className="flex items-center justify-end gap-2.5">
              <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg text-[10px] font-mono font-bold">
                {settings.stationCode || 'ST-OFFICIAL'}
              </span>
              <h3 className="text-xl font-black text-white">دليل المحطة وسجل الهوية الرسمية المعتمدة</h3>
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 shadow-inner">
                <Building2 className="w-6 h-6" />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              المرجع الرسمي الشامل: البيانات القانونية، التراخيص، الهوية البصرية، الحسابات البنكية المعتمدة، الفروع، وسجل التواصل.
            </p>
          </div>
        </div>

        {/* Save Status Notification Banner */}
        {saveStatus && (
          <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
            saveStatus.success 
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' 
              : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
          }`}>
            <div className="flex items-center gap-2">
              {saveStatus.success ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
              <span>{saveStatus.message}</span>
            </div>
            <span className="text-[10px] opacity-75 font-mono">Firestore Cloud Synced</span>
          </div>
        )}

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
          {[
            { id: 'appearance', label: 'تخصيص المظهر وسمات الواجهة', icon: Palette },
            { id: 'services', label: 'الخدمات الإضافية والتكاملات', icon: Zap },
            { id: 'legal', label: 'البيانات القانونية والتراخيص', icon: FileBadge },
            { id: 'branding', label: 'الشعار والهوية والأختام', icon: Award },
            { id: 'contact', label: 'دليل التواصل والموقع الجغرافي', icon: Phone },
            { id: 'banking', label: 'الحسابات البنكية ومحافظ السداد', icon: CreditCard, count: settings.bankAccounts?.length },
            { id: 'branches', label: 'فروع ومكاتب الخدمة', icon: Building2, count: settings.branches?.length },
            { id: 'schedule', label: 'ساعات التوليد والعمل', icon: Clock },
            { id: 'policies', label: 'شروط وسياسات المطبوعات', icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                    isActive ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* SUB-TAB 0.1: THEME & APPEARANCE STUDIO */}
      {activeSubTab === 'appearance' && (
        <AppearanceThemeStudio
          settings={settings}
          onUpdateSettings={onUpdateSettings}
        />
      )}

      {/* SUB-TAB 0.2: ADDITIONAL SERVICES & INTEGRATIONS HUB */}
      {activeSubTab === 'services' && (
        <AdditionalServicesHub
          settings={settings}
          onUpdateSettings={onUpdateSettings}
        />
      )}

      {/* Main Layout: 7 Cols Inputs / 5 Cols Live Preview & Certificate (Only for Directory Profile Sub-Tabs) */}
      {activeSubTab !== 'appearance' && activeSubTab !== 'services' && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
        
        {/* Left Side: Active Tab Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* TAB 1: LEGAL & LICENSING */}
          {activeSubTab === 'legal' && (
            <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-slate-500 font-mono text-[10px] uppercase">Legal & Energy Licensing Profile</span>
                <h4 className="font-black text-amber-400 text-sm flex items-center gap-2">
                  <span>البيانات الرسمية وتراخيص التوليد والنشاط</span>
                  <FileBadge className="w-5 h-5" />
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Station Name AR */}
                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">اسم محطة الكهرباء (بالعربية) *</label>
                  <input
                    type="text"
                    required
                    value={settings.stationName || ''}
                    onChange={e => onUpdateSettings({ ...settings, stationName: e.target.value })}
                    placeholder="مثال: محطة العاصمة المركزية للكهرباء التجارية"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-right focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Station Name EN */}
                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">اسم المحطة بالإنجليزية (English Name)</label>
                  <input
                    type="text"
                    value={settings.stationNameEn || ''}
                    onChange={e => onUpdateSettings({ ...settings, stationNameEn: e.target.value })}
                    placeholder="e.g. Al-Asema Central Electric Power Co."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-left font-sans focus:outline-none focus:border-amber-500"
                    dir="ltr"
                  />
                </div>

                {/* Station Code */}
                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">رمز / كود المحطة المعتمد (Station Code)</label>
                  <input
                    type="text"
                    value={settings.stationCode || ''}
                    onChange={e => onUpdateSettings({ ...settings, stationCode: e.target.value })}
                    placeholder="مثال: ST-01 / ELEC-SANAA"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-right font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Station Type */}
                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">نوع المحطة ومصدر التوليد</label>
                  <select
                    value={settings.stationType || 'commercial_diesel'}
                    onChange={e => onUpdateSettings({ ...settings, stationType: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-right font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value="commercial_diesel">تجارية - مولدات ديزل (Diesel Generators)</option>
                    <option value="solar_pv">طاقة شمسية كهروضوئية (Solar PV Station)</option>
                    <option value="hybrid">محطة هجينة (طاقة شمسية + مولدات ديزل)</option>
                    <option value="grid_distribution">محطة نقل وتوزيع فرعية (Distribution Substation)</option>
                    <option value="gas_turbine">توليد توربيني غازي (Gas Turbine)</option>
                    <option value="other">أخرى / مصادر متعددة</option>
                  </select>
                </div>

                {/* Owner Name AR */}
                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">اسم المالك / المدير العام (عربي)</label>
                  <input
                    type="text"
                    value={settings.ownerName || ''}
                    onChange={e => onUpdateSettings({ ...settings, ownerName: e.target.value })}
                    placeholder="مثال: الشيخ / المهندس عبدالكريم العولقي"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-right focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Owner Name EN */}
                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">اسم المالك بالإنجليزية (Owner / General Manager)</label>
                  <input
                    type="text"
                    value={settings.ownerNameEn || ''}
                    onChange={e => onUpdateSettings({ ...settings, ownerNameEn: e.target.value })}
                    placeholder="e.g. Eng. Abdulkarim Al-Awlaqi"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-left font-sans focus:outline-none"
                    dir="ltr"
                  />
                </div>

                {/* Commercial Register */}
                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">رقم السجل التجاري (Commercial Register)</label>
                  <input
                    type="text"
                    value={settings.commercialRegister || ''}
                    onChange={e => onUpdateSettings({ ...settings, commercialRegister: e.target.value })}
                    placeholder="مثال: CR-99824-YE"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-right font-mono focus:outline-none"
                  />
                </div>

                {/* Tax / VAT Number */}
                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">الرقم الضريبي / الرقم المالي (Tax / VAT Number)</label>
                  <input
                    type="text"
                    value={settings.taxNumber || ''}
                    onChange={e => onUpdateSettings({ ...settings, taxNumber: e.target.value })}
                    placeholder="مثال: TAX-4402-991"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-right font-mono focus:outline-none"
                  />
                </div>

                {/* Generation License Number */}
                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">رقم ترخيص وزارة الكهرباء والطاقة</label>
                  <input
                    type="text"
                    value={settings.licenseNumber || ''}
                    onChange={e => onUpdateSettings({ ...settings, licenseNumber: e.target.value })}
                    placeholder="مثال: MOE-LIC-2026-884"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-right font-mono focus:outline-none"
                  />
                </div>

                {/* License Expiry Date */}
                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">تاريخ انتهاء الترخيص المعتمد</label>
                  <input
                    type="date"
                    value={settings.licenseExpiryDate || ''}
                    onChange={e => onUpdateSettings({ ...settings, licenseExpiryDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-right font-mono focus:outline-none"
                  />
                </div>

                {/* Total Capacity kW */}
                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">القدرة التوليدية الإجمالية (kW)</label>
                  <input
                    type="number"
                    value={settings.stationCapacityKw || ''}
                    onChange={e => onUpdateSettings({ ...settings, stationCapacityKw: parseFloat(e.target.value) || 0 })}
                    placeholder="مثال: 1500"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-right font-mono focus:outline-none"
                  />
                </div>

                {/* Transformer Capacity kVA */}
                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">سعة المحولات الإجمالية (kVA)</label>
                  <input
                    type="number"
                    value={settings.transformerCapacityKva || ''}
                    onChange={e => onUpdateSettings({ ...settings, transformerCapacityKva: parseFloat(e.target.value) || 0 })}
                    placeholder="مثال: 2000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-right font-mono focus:outline-none"
                  />
                </div>

                {/* Operational Status */}
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 mb-1.5 font-bold">الحالة التشغيلية للمحطة</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'active', label: 'نشطة ومرخصة رسمياً', color: 'border-emerald-500 text-emerald-400 bg-emerald-500/10' },
                      { id: 'maintenance', label: 'صيانة وتأهيل دوري', color: 'border-amber-500 text-amber-400 bg-amber-500/10' },
                      { id: 'expansion', label: 'توسعة وتطوير شبكات', color: 'border-sky-500 text-sky-400 bg-sky-500/10' },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => onUpdateSettings({ ...settings, operationalStatus: st.id as any })}
                        className={`p-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                          (settings.operationalStatus || 'active') === st.id
                            ? `${st.color} shadow-md`
                            : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: BRANDING & LOGO & SEALS */}
          {activeSubTab === 'branding' && (
            <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-slate-500 font-mono text-[10px] uppercase">Branding & Official Visual Assets</span>
                <h4 className="font-black text-amber-400 text-sm flex items-center gap-2">
                  <span>الشعار، الختم الرقمي المعتمد، والتوقيع</span>
                  <Award className="w-5 h-5" />
                </h4>
              </div>

              {/* 1. Main Station Logo */}
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                <h5 className="font-bold text-slate-200 flex items-center justify-between">
                  <span className="text-slate-500 font-mono text-[10px]">Primary Logo</span>
                  <span className="flex items-center gap-2">
                    <span>شعار المحطة الرئيسي</span>
                    <Camera className="w-4 h-4 text-amber-400" />
                  </span>
                </h5>

                <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <div className="w-24 h-24 bg-white rounded-xl border-2 border-dashed border-amber-500/60 p-2 flex items-center justify-center shrink-0 relative overflow-hidden shadow-md">
                    {settings.logoUrl ? (
                      <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-center text-slate-400">
                        <Zap className="w-8 h-8 text-amber-500 mx-auto fill-current" />
                        <span className="text-[9px] font-bold block text-slate-500 mt-1">بدون شعار</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 text-right w-full">
                    <input type="file" ref={logoInputRef} accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 px-3.5 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <UploadCloud className="w-4 h-4" />
                        <span>تحميل شعار من الجهاز</span>
                      </button>

                      {settings.logoUrl && (
                        <button
                          type="button"
                          onClick={() => onUpdateSettings({ ...settings, logoUrl: '' })}
                          className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold py-2 px-3 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500">يُفضل ملف PNG بخلفية شفافة لضمان الجودة العالية على الفواتير والسندات الحرارية.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-bold">أو أدخل رابط الشعار المباشر (URL):</label>
                  <input
                    type="text"
                    value={settings.logoUrl || ''}
                    onChange={e => onUpdateSettings({ ...settings, logoUrl: e.target.value })}
                    placeholder="https://example.com/station-logo.png"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 text-left font-mono text-xs focus:outline-none"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* 2. Official Round Stamp & Manager Signature Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Official Round Stamp */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <h5 className="font-bold text-slate-200 flex items-center justify-between">
                    <span className="text-slate-500 font-mono text-[10px]">Official Stamp</span>
                    <span className="flex items-center gap-1.5">
                      <span>الختم الرقمي الدائري المعتمد</span>
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    </span>
                  </h5>

                  <div className="flex items-center gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <div className="w-16 h-16 bg-white/90 rounded-full border border-slate-300 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                      {settings.officialStampUrl ? (
                        <img src={settings.officialStampUrl} alt="Stamp" className="w-full h-full object-contain" />
                      ) : (
                        <ShieldCheck className="w-8 h-8 text-emerald-600" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <input type="file" ref={stampInputRef} accept="image/*" onChange={handleStampUpload} className="hidden" />
                      <button
                        type="button"
                        onClick={() => stampInputRef.current?.click()}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-1.5 px-2.5 rounded-lg text-[11px] border border-slate-700 flex items-center justify-center gap-1.5"
                      >
                        <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
                        <span>تحميل صورة الختم</span>
                      </button>
                      {settings.officialStampUrl && (
                        <button
                          type="button"
                          onClick={() => onUpdateSettings({ ...settings, officialStampUrl: '' })}
                          className="text-[10px] text-rose-400 hover:underline block text-center w-full"
                        >
                          إزالة الختم
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500">يظهر تلقائياً على سندات القبض وعقود المشتركين الجديدة.</p>
                </div>

                {/* Manager Signature */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <h5 className="font-bold text-slate-200 flex items-center justify-between">
                    <span className="text-slate-500 font-mono text-[10px]">Manager Signature</span>
                    <span className="flex items-center gap-1.5">
                      <span>توقيع المدير العام / المفوض</span>
                      <FileBadge className="w-4 h-4 text-sky-400" />
                    </span>
                  </h5>

                  <div className="flex items-center gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <div className="w-20 h-14 bg-white/90 rounded-xl border border-slate-300 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                      {settings.managerSignatureUrl ? (
                        <img src={settings.managerSignatureUrl} alt="Signature" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 font-serif italic">توقيع معتمد</span>
                      )}
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <input type="file" ref={signatureInputRef} accept="image/*" onChange={handleSignatureUpload} className="hidden" />
                      <button
                        type="button"
                        onClick={() => signatureInputRef.current?.click()}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-1.5 px-2.5 rounded-lg text-[11px] border border-slate-700 flex items-center justify-center gap-1.5"
                      >
                        <UploadCloud className="w-3.5 h-3.5 text-sky-400" />
                        <span>تحميل التوقيع</span>
                      </button>
                      {settings.managerSignatureUrl && (
                        <button
                          type="button"
                          onClick={() => onUpdateSettings({ ...settings, managerSignatureUrl: '' })}
                          className="text-[10px] text-rose-400 hover:underline block text-center w-full"
                        >
                          إزالة التوقيع
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500">يُطبع إلكترونياً على مطالبات الديون والعقود وسندات الصرف.</p>
                </div>

              </div>

              {/* Slogan and Tagline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">الشعار اللفظي / الرمز الخطي المطبوع (Logo Code)</label>
                  <input
                    type="text"
                    value={settings.logoText || ''}
                    onChange={e => onUpdateSettings({ ...settings, logoText: e.target.value })}
                    placeholder="مثال: VOLTA / طاقة المستقبل"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-right focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">العبارة الرسمية / الرؤية (Tagline / Slogan)</label>
                  <input
                    type="text"
                    value={settings.tagline || ''}
                    onChange={e => onUpdateSettings({ ...settings, tagline: e.target.value })}
                    placeholder="مثال: نضيء دروبكم بخدمة مستمرة وجودة فائقة"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-right focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CONTACT & LOCATION DIRECTORY */}
          {activeSubTab === 'contact' && (
            <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-slate-500 font-mono text-[10px] uppercase">Contact Directory & Geo Location</span>
                <h4 className="font-black text-amber-400 text-sm flex items-center gap-2">
                  <span>دليل أرقام التواصل والعنوان والموقع الجغرافي</span>
                  <Phone className="w-5 h-5" />
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Phone 1 */}
                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">هاتف المحطة الرئيسي والخط الساخن *</label>
                  <input
                    type="text"
                    required
                    value={settings.phone || ''}
                    onChange={e => onUpdateSettings({ ...settings, phone: e.target.value })}
                    placeholder="+967 777 123 456"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-right font-mono focus:outline-none focus:border-amber-500"
                    dir="ltr"
                  />
                </div>

                {/* Phone 2 / Emergency */}
                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">هاتف الطوارئ وبلاغات الأعطال 24/7</label>
                  <input
                    type="text"
                    value={settings.phone2 || ''}
                    onChange={e => onUpdateSettings({ ...settings, phone2: e.target.value })}
                    placeholder="+967 733 987 654"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-right font-mono focus:outline-none focus:border-amber-500"
                    dir="ltr"
                  />
                </div>

                {/* WhatsApp */}
                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">رقم الواتساب الرسمي لخدمة المشتركين</label>
                  <input
                    type="text"
                    value={settings.whatsapp || ''}
                    onChange={e => onUpdateSettings({ ...settings, whatsapp: e.target.value })}
                    placeholder="+967 771 234 567"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-right font-mono focus:outline-none focus:border-amber-500"
                    dir="ltr"
                  />
                </div>

                {/* Official Email */}
                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">البريد الإلكتروني الرسمي للمراسلات</label>
                  <input
                    type="email"
                    value={settings.email || ''}
                    onChange={e => onUpdateSettings({ ...settings, email: e.target.value })}
                    placeholder="info@electric-station.ye"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-left font-mono text-xs focus:outline-none focus:border-amber-500"
                    dir="ltr"
                  />
                </div>

                {/* Website URL */}
                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">الموقع الإلكتروني أو بوابة المشتركين</label>
                  <input
                    type="text"
                    value={settings.websiteUrl || ''}
                    onChange={e => onUpdateSettings({ ...settings, websiteUrl: e.target.value })}
                    placeholder="https://electric-station.ye"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-left font-mono text-xs focus:outline-none focus:border-amber-500"
                    dir="ltr"
                  />
                </div>

                {/* Country */}
                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">الدولة</label>
                  <input
                    type="text"
                    value={settings.country || 'الجمهورية اليمنية'}
                    onChange={e => onUpdateSettings({ ...settings, country: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-right focus:outline-none"
                  />
                </div>

                {/* Governorate / City */}
                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">المحافظة / المدينة</label>
                  <input
                    type="text"
                    value={settings.city || ''}
                    onChange={e => onUpdateSettings({ ...settings, city: e.target.value })}
                    placeholder="مثال: أمانة العاصمة / صنعاء"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-right focus:outline-none"
                  />
                </div>

                {/* District */}
                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">المديرية / المنطقة</label>
                  <input
                    type="text"
                    value={settings.district || ''}
                    onChange={e => onUpdateSettings({ ...settings, district: e.target.value })}
                    placeholder="مثال: مديرية السبعين / حي الصافية"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-right focus:outline-none"
                  />
                </div>

                {/* Detailed Address */}
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 mb-1.5 font-bold">العنوان التفصيلي ومقر المحطة المركزي *</label>
                  <input
                    type="text"
                    required
                    value={settings.address || ''}
                    onChange={e => onUpdateSettings({ ...settings, address: e.target.value })}
                    placeholder="مثال: صنعاء - شارع الخمسين - بجوار جولة بيت بوس - مبنى المحطة المركزية"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-right focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* GPS Coordinates & Google Map Links */}
                <div className="sm:col-span-2 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-mono text-[10px]">Geo Location & Maps</span>
                    <h5 className="font-bold text-slate-200 flex items-center gap-1.5">
                      <span>إحداثيات الموقع الجغرافي (GPS Coordinates)</span>
                      <MapPin className="w-4 h-4 text-rose-400" />
                    </h5>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <input
                      type="text"
                      value={settings.gpsCoordinates || ''}
                      onChange={e => onUpdateSettings({ ...settings, gpsCoordinates: e.target.value })}
                      placeholder="مثال: 15.369445, 44.191006"
                      className="flex-1 w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-left font-mono text-xs focus:outline-none focus:border-amber-500"
                      dir="ltr"
                    />

                    <button
                      type="button"
                      onClick={handleGetGpsLocation}
                      className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 px-4 rounded-xl text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Compass className="w-4 h-4 text-emerald-400" />
                      <span>تحديد موقعي الآن</span>
                    </button>

                    {settings.gpsCoordinates && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.gpsCoordinates)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full sm:w-auto bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>فتح في خرائط Google</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Service Coverage Area */}
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 mb-1.5 font-bold">نطاق التغطية الجغرافية والأحياء والمربعات المخدومة</label>
                  <input
                    type="text"
                    value={settings.coverageArea || ''}
                    onChange={e => onUpdateSettings({ ...settings, coverageArea: e.target.value })}
                    placeholder="مثال: حي الروابي، مربع الأندلس، شارع الثلاثين، حي النور، والمنطقة الصناعية"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-right focus:outline-none"
                  />
                </div>

              </div>
            </div>
          )}

          {/* TAB 4: BANK ACCOUNTS & DIGITAL WALLETS */}
          {activeSubTab === 'banking' && (
            <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-5 shadow-xl">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingBank(null);
                    setBankForm({
                      bankName: POPULAR_BANKS_WALLETS[0],
                      accountName: settings.ownerName || settings.stationName || '',
                      accountNumber: '',
                      branchName: '',
                      isPrimary: (settings.bankAccounts?.length || 0) === 0,
                      isActive: true,
                      notes: ''
                    });
                    setShowBankModal(true);
                  }}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة حساب بنكي / محفظة جديدة</span>
                </button>

                <div className="text-right">
                  <h4 className="font-black text-amber-400 text-sm flex items-center justify-end gap-2">
                    <span>سجل الحسابات البنكية ومحافظ السداد الإلكتروني المعتمدة</span>
                    <CreditCard className="w-5 h-5" />
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">تظهر هذه الحسابات المعتمدة في الفواتير وسندات القبض لإرشاد المشتركين لطرق السداد.</p>
                </div>
              </div>

              {/* Accounts List */}
              {(!settings.bankAccounts || settings.bankAccounts.length === 0) ? (
                <div className="bg-slate-950/80 p-8 rounded-2xl border border-dashed border-slate-800 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <h5 className="font-bold text-slate-300 text-sm">لا توجد حسابات بنكية مضافة حتى الآن</h5>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    أضف حسابات بنك الكريمي، محفظة جوالي، ون كاش، كاش، أو بنك التضامن لتسهيل التحصيل وطباعة أرقام الحسابات في السندات.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBank(null);
                      setBankForm({
                        bankName: POPULAR_BANKS_WALLETS[0],
                        accountName: settings.ownerName || settings.stationName || '',
                        accountNumber: '',
                        branchName: '',
                        isPrimary: true,
                        isActive: true
                      });
                      setShowBankModal(true);
                    }}
                    className="bg-amber-500 text-slate-950 font-bold py-2 px-4 rounded-xl text-xs inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة أول حساب بنكي</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {settings.bankAccounts.map((acc) => (
                    <div 
                      key={acc.id}
                      className={`p-4 rounded-xl border relative transition-all space-y-3 ${
                        acc.isPrimary 
                          ? 'bg-amber-500/5 border-amber-500/40 shadow-md' 
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-1.5">
                          {acc.isPrimary && (
                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-md text-[10px] font-bold">
                              الحساب الرئيسي للفواتير
                            </span>
                          )}
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${acc.isActive !== false ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                            {acc.isActive !== false ? 'نشط' : 'معطّل'}
                          </span>
                        </div>

                        <div className="text-right">
                          <h5 className="font-black text-slate-100 text-xs">{acc.bankName}</h5>
                          {acc.branchName && <p className="text-[10px] text-slate-400">{acc.branchName}</p>}
                        </div>
                      </div>

                      <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-1 font-mono text-xs">
                        <div className="flex justify-between items-center text-slate-400 text-[11px]">
                          <span className="font-bold text-amber-400 text-sm tracking-wider" dir="ltr">{acc.accountNumber}</span>
                          <span>رقم الحساب / المحفظة:</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-300 text-[11px]">
                          <span className="font-bold text-white font-sans">{acc.accountName}</span>
                          <span className="text-slate-500 font-sans">المستفيد:</span>
                        </div>
                      </div>

                      {acc.notes && <p className="text-[10px] text-slate-400">{acc.notes}</p>}

                      <div className="flex items-center justify-between border-t border-slate-800/60 pt-2 text-[11px]">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBank(acc);
                              setBankForm({ ...acc });
                              setShowBankModal(true);
                            }}
                            className="text-amber-400 hover:underline font-bold"
                          >
                            تعديل
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBankAccount(acc.id)}
                            className="text-rose-400 hover:underline font-bold"
                          >
                            حذف
                          </button>
                        </div>

                        {!acc.isPrimary && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (settings.bankAccounts || []).map(b => ({
                                ...b,
                                isPrimary: b.id === acc.id
                              }));
                              onUpdateSettings({ ...settings, bankAccounts: updated });
                            }}
                            className="text-slate-400 hover:text-amber-400 text-[10px] transition-colors"
                          >
                            تعيين كحساب رئيسي
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: BRANCHES & SERVICE CENTERS */}
          {activeSubTab === 'branches' && (
            <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-5 shadow-xl">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingBranch(null);
                    setBranchForm({
                      name: '',
                      code: `BR-0${(settings.branches?.length || 0) + 1}`,
                      managerName: '',
                      phone: '',
                      address: '',
                      workingHours: '8:00 ص - 8:00 م',
                      isActive: true
                    });
                    setShowBranchModal(true);
                  }}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة فرع / مكتب خدمة جديد</span>
                </button>

                <div className="text-right">
                  <h4 className="font-black text-amber-400 text-sm flex items-center justify-end gap-2">
                    <span>دليل فروع ومكاتب خدمة المشتركين التابعة للمحطة</span>
                    <Building2 className="w-5 h-5" />
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">مكاتب الاستقبال، نقاط التحصيل، ومراكز الطوارئ الميدانية.</p>
                </div>
              </div>

              {(!settings.branches || settings.branches.length === 0) ? (
                <div className="bg-slate-950/80 p-8 rounded-2xl border border-dashed border-slate-800 text-center space-y-3">
                  <Building2 className="w-12 h-12 mx-auto text-slate-500" />
                  <h5 className="font-bold text-slate-300 text-sm">لا توجد فروع فرعية مسجلة حالياً</h5>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    يمكنك إضافة مكاتب التحصيل الفرعية، كشك الاستقبال، أو مراكز الصيانة التابعة للمحطة.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {settings.branches.map((branch) => (
                    <div key={branch.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                      <div className="flex items-start justify-between border-b border-slate-800 pb-2">
                        <span className="px-2 py-0.5 bg-slate-900 text-slate-400 border border-slate-800 rounded font-mono text-[10px]">
                          {branch.code}
                        </span>
                        <div className="text-right">
                          <h5 className="font-bold text-white text-xs">{branch.name}</h5>
                          {branch.managerName && <p className="text-[10px] text-slate-400">مسؤول الفرع: {branch.managerName}</p>}
                        </div>
                      </div>

                      <div className="space-y-1 text-[11px] text-slate-300">
                        {branch.phone && (
                          <div className="flex justify-between items-center">
                            <span className="font-mono text-amber-400" dir="ltr">{branch.phone}</span>
                            <span className="text-slate-500">الهاتف:</span>
                          </div>
                        )}
                        {branch.address && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-300 text-[10px]">{branch.address}</span>
                            <span className="text-slate-500">العنوان:</span>
                          </div>
                        )}
                        {branch.workingHours && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-300 text-[10px]">{branch.workingHours}</span>
                            <span className="text-slate-500">الدوام:</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-800/60 pt-2 text-[11px]">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBranch(branch);
                              setBranchForm({ ...branch });
                              setShowBranchModal(true);
                            }}
                            className="text-amber-400 hover:underline font-bold"
                          >
                            تعديل
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBranch(branch.id)}
                            className="text-rose-400 hover:underline font-bold"
                          >
                            حذف
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: SCHEDULES & GENERATION HOURS */}
          {activeSubTab === 'schedule' && (
            <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-slate-500 font-mono text-[10px] uppercase">Operational Schedules</span>
                <h4 className="font-black text-amber-400 text-sm flex items-center gap-2">
                  <span>ساعات الدوام، نوبات التوليد، وجدول الطوارئ</span>
                  <Clock className="w-5 h-5" />
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Working Hours */}
                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">ساعات دوام الإدارة واستقبال المشتركين</label>
                  <input
                    type="text"
                    value={settings.workingHours || ''}
                    onChange={e => onUpdateSettings({ ...settings, workingHours: e.target.value })}
                    placeholder="مثال: يومياً من 8:00 صباحاً حتى 8:00 مساءً"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-right focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Generation Hours */}
                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">ساعات توليد وضخ التيار الكهربائي</label>
                  <input
                    type="text"
                    value={settings.generationHours || ''}
                    onChange={e => onUpdateSettings({ ...settings, generationHours: e.target.value })}
                    placeholder="مثال: تغذية متواصلة 24 ساعة / أو من 4 عصراً حتى 2 صباحاً"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-right focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Emergency Contact Person */}
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 mb-1.5 font-bold">مسؤول نوبة الطوارئ والصيانة الفورية</label>
                  <input
                    type="text"
                    value={settings.emergencyContactPerson || ''}
                    onChange={e => onUpdateSettings({ ...settings, emergencyContactPerson: e.target.value })}
                    placeholder="مثال: المهندس فؤاد الصبري - مشرف نوبة الطوارئ (هاتف: 777112233)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-right focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: POLICIES & RECEIPT FOOTERS */}
          {activeSubTab === 'policies' && (
            <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 space-y-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-slate-500 font-mono text-[10px] uppercase">Terms & Invoice Policies</span>
                <h4 className="font-black text-amber-400 text-sm flex items-center gap-2">
                  <span>شروط وسياسات الفواتير والمطبوعات المعتمدة</span>
                  <FileText className="w-5 h-5" />
                </h4>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">شروط وتنويهات الفاتورة وسند القبض المطبوع:</label>
                  <textarea
                    rows={4}
                    value={settings.notes || ''}
                    onChange={e => onUpdateSettings({ ...settings, notes: e.target.value })}
                    placeholder="مثال: يرجى سداد الفاتورة قبل موعد الاستحقاق لتجنب فصل التيار. المحطة غير مسؤولة عن التمديدات الداخلية بعد القاطع الرئيسي."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 text-right focus:outline-none focus:border-amber-500 leading-relaxed text-xs resize-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">إخلاء المسؤولية والسياسة القانونية (Disclaimer):</label>
                  <textarea
                    rows={3}
                    value={settings.disclaimer || ''}
                    onChange={e => onUpdateSettings({ ...settings, disclaimer: e.target.value })}
                    placeholder="مثال: تخضع هذه الخدمة للائحة تنظيم نشاط التوليد والتوزيع المعتمدة من وزارة الكهرباء والطاقة."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 text-right focus:outline-none focus:border-amber-500 leading-relaxed text-xs resize-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1.5 font-bold">العملة الرسمية المعتمدة بالسندات والمطالبات *</label>
                  <input
                    type="text"
                    required
                    value={settings.currency || 'ر.ي'}
                    onChange={e => onUpdateSettings({ ...settings, currency: e.target.value })}
                    className="w-full sm:w-1/2 bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-right font-bold focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Side: Live Identity Certificate & Document Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="sticky top-20 bg-slate-900/90 p-5 rounded-2xl border border-slate-800 space-y-5 shadow-2xl backdrop-blur-md">
            
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-mono text-[10px] font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                معاينة حية ومباشرة
              </span>
              <h4 className="font-black text-slate-100 text-sm flex items-center gap-1.5">
                <span>بطاقة الهوية الرسمية للمحطة</span>
                <Award className="w-4 h-4 text-amber-400" />
              </h4>
            </div>

            {/* Official Station Identity Card */}
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl p-5 border-2 border-amber-500/30 space-y-4 text-right relative overflow-hidden shadow-2xl">
              
              {/* Background Watermark */}
              <div className="absolute -left-6 -bottom-6 opacity-5 pointer-events-none">
                <Zap className="w-40 h-40 text-amber-400" />
              </div>

              {/* Station Card Header */}
              <div className="flex items-start justify-between border-b border-slate-800/80 pb-3 gap-3">
                <div className="text-left space-y-1 font-mono text-[10px] text-slate-400">
                  <p>Code: <span className="text-amber-400 font-bold">{settings.stationCode || 'ST-01'}</span></p>
                  {settings.commercialRegister && <p>CR: <span className="text-slate-300 font-bold">{settings.commercialRegister}</span></p>}
                  {settings.stationNameEn && <p className="text-[10px] text-slate-400 font-sans">{settings.stationNameEn}</p>}
                </div>

                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="font-black text-sm text-white">{settings.stationName || 'اسم محطة الكهرباء'}</h3>
                    {settings.logoText && <p className="text-[10px] font-bold text-amber-400 font-mono">{settings.logoText}</p>}
                  </div>
                  <div className="w-12 h-12 bg-white border border-amber-500/30 rounded-xl p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                    {settings.logoUrl ? (
                      <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Zap className="w-6 h-6 text-amber-500 fill-current" />
                    )}
                  </div>
                </div>
              </div>

              {/* Card Meta Details */}
              <div className="space-y-2 text-[11px] text-slate-300">
                {settings.ownerName && (
                  <div className="flex justify-between items-center border-b border-slate-800/40 pb-1.5">
                    <span className="font-bold text-white">{settings.ownerName}</span>
                    <span className="text-slate-500">المالك / المدير:</span>
                  </div>
                )}

                <div className="flex justify-between items-center border-b border-slate-800/40 pb-1.5">
                  <span className="font-mono text-amber-400 font-bold" dir="ltr">{settings.phone || 'غير مسجل'}</span>
                  <span className="text-slate-500">الهاتف الرئيسي:</span>
                </div>

                {settings.phone2 && (
                  <div className="flex justify-between items-center border-b border-slate-800/40 pb-1.5">
                    <span className="font-mono text-rose-400 font-bold" dir="ltr">{settings.phone2}</span>
                    <span className="text-slate-500">طوارئ 24/7:</span>
                  </div>
                )}

                {settings.whatsapp && (
                  <div className="flex justify-between items-center border-b border-slate-800/40 pb-1.5">
                    <span className="font-mono text-emerald-400 font-bold" dir="ltr">{settings.whatsapp}</span>
                    <span className="text-slate-500">الواتساب الرسمي:</span>
                  </div>
                )}

                {settings.licenseNumber && (
                  <div className="flex justify-between items-center border-b border-slate-800/40 pb-1.5">
                    <span className="font-mono text-slate-200">{settings.licenseNumber}</span>
                    <span className="text-slate-500">ترخيص الطاقة:</span>
                  </div>
                )}

                {settings.address && (
                  <div className="flex justify-between items-center border-b border-slate-800/40 pb-1.5">
                    <span className="text-slate-200 text-[10px] font-medium max-w-[220px] truncate">{settings.address}</span>
                    <span className="text-slate-500 shrink-0">العنوان:</span>
                  </div>
                )}
              </div>

              {/* Stamp & Verification Section */}
              <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center text-[10px]">
                <div className="flex items-center gap-2">
                  {settings.officialStampUrl && (
                    <div className="w-9 h-9 bg-white/90 rounded-full border border-slate-300 p-0.5 overflow-hidden">
                      <img src={settings.officialStampUrl} alt="Stamp" className="w-full h-full object-contain" />
                    </div>
                  )}
                  {settings.managerSignatureUrl && (
                    <div className="h-7 w-14 bg-white/90 rounded border border-slate-300 p-0.5 overflow-hidden">
                      <img src={settings.managerSignatureUrl} alt="Sig" className="w-full h-full object-contain" />
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded font-mono font-bold">
                    {settings.currency || 'ر.ي'} Currency
                  </span>
                  <span className="text-[9px] text-slate-500 block mt-0.5">الختم الرقمي والتوقيع المعتمد</span>
                </div>
              </div>

            </div>

            {/* Thermal Receipt Header Simulation */}
            <div className="bg-white text-slate-950 p-4 rounded-xl border border-slate-300 text-center space-y-1 shadow-md">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1 mb-2">
                ترويسة سندات وفواتير المشتركين المطبوعة (Thermal 80mm)
              </p>
              
              <div className="w-12 h-12 mx-auto flex items-center justify-center">
                {settings.logoUrl ? (
                  <img src={settings.logoUrl} alt="Thermal Logo" className="w-full h-full object-contain" />
                ) : (
                  <Zap className="w-6 h-6 text-slate-800" />
                )}
              </div>
              
              <h4 className="font-black text-xs text-slate-950">{settings.stationName || 'اسم المحطة'}</h4>
              {settings.logoText && <p className="text-[9px] font-bold text-slate-600 font-mono">{settings.logoText}</p>}
              <p className="text-[9px] text-slate-500">{settings.phone} | {settings.address}</p>

              {/* Primary Bank if available */}
              {settings.bankAccounts && settings.bankAccounts.some(b => b.isPrimary) && (
                <div className="pt-1.5 border-t border-dashed border-slate-300 mt-2 text-[9px] text-slate-700">
                  <span>سداد عبر: {settings.bankAccounts.find(b => b.isPrimary)?.bankName} (حساب: {settings.bankAccounts.find(b => b.isPrimary)?.accountNumber})</span>
                </div>
              )}
            </div>

            {/* Update Station Directory Button */}
            <button
              type="button"
              onClick={handleSaveToCloud}
              disabled={isSaving}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>جاري تعديل دليل المحطة في قاعدة البيانات...</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-4 h-4" />
                  <span>تعديل دليل المحطة في قاعدة البيانات</span>
                </>
              )}
            </button>

          </div>

        </div>

      </div>
      )}

      {/* MODAL: ADD / EDIT BANK ACCOUNT */}
      {showBankModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl text-right">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => setShowBankModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                إلغاء
              </button>
              <h4 className="font-bold text-white text-sm">
                {editingBank ? 'تعديل الحساب البنكي / المحفظة' : 'إضافة حساب بنكي / محفظة جديدة'}
              </h4>
            </div>

            <form onSubmit={handleSaveBankAccount} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-bold">اسم البنك أو المحفظة الإلكترونية *</label>
                <select
                  value={bankForm.bankName}
                  onChange={e => setBankForm({ ...bankForm, bankName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-right font-bold focus:outline-none focus:border-amber-500"
                >
                  {POPULAR_BANKS_WALLETS.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-bold">اسم صاحب الحساب / المستفيد المعتمد *</label>
                <input
                  type="text"
                  required
                  value={bankForm.accountName || ''}
                  onChange={e => setBankForm({ ...bankForm, accountName: e.target.value })}
                  placeholder="مثال: محطة العاصمة للكهرباء"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-right focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-bold">رقم الحساب / رقم المحفظة / الآيبان (IBAN) *</label>
                <input
                  type="text"
                  required
                  value={bankForm.accountNumber || ''}
                  onChange={e => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                  placeholder="مثال: 300456789 أو 777123456"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-right font-mono focus:outline-none focus:border-amber-500"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-bold">اسم الفرع / المدينة (اختياري)</label>
                <input
                  type="text"
                  value={bankForm.branchName || ''}
                  onChange={e => setBankForm({ ...bankForm, branchName: e.target.value })}
                  placeholder="مثال: الفرع الرئيسي - حدة"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-right focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="primaryBankCheck"
                  checked={!!bankForm.isPrimary}
                  onChange={e => setBankForm({ ...bankForm, isPrimary: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
                <label htmlFor="primaryBankCheck" className="text-slate-300 font-bold cursor-pointer">
                  تعيين كحساب رئيسي افتراضي يُطبع في رأسية الفواتير والسندات
                </label>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                >
                  {editingBank ? 'حفظ التعديلات' : 'إضافة الحساب'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBankModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 px-4 rounded-xl text-xs"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT BRANCH */}
      {showBranchModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl text-right">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => setShowBranchModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                إلغاء
              </button>
              <h4 className="font-bold text-white text-sm">
                {editingBranch ? 'تعديل فرع / مكتب خدمة' : 'إضافة فرع / مكتب خدمة جديد'}
              </h4>
            </div>

            <form onSubmit={handleSaveBranch} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-bold">اسم الفرع أو مكتب الخدمة *</label>
                <input
                  type="text"
                  required
                  value={branchForm.name || ''}
                  onChange={e => setBranchForm({ ...branchForm, name: e.target.value })}
                  placeholder="مثال: فرع حي الصافية / مكتب خدمات السوق"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-right focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-bold">كود الفرع</label>
                <input
                  type="text"
                  value={branchForm.code || ''}
                  onChange={e => setBranchForm({ ...branchForm, code: e.target.value })}
                  placeholder="مثال: BR-01"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-right font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-bold">مسؤول الفرع / مدير المكتب</label>
                <input
                  type="text"
                  value={branchForm.managerName || ''}
                  onChange={e => setBranchForm({ ...branchForm, managerName: e.target.value })}
                  placeholder="مثال: الأخ / عادل الحميري"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-right focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-bold">هاتف الفرع</label>
                <input
                  type="text"
                  value={branchForm.phone || ''}
                  onChange={e => setBranchForm({ ...branchForm, phone: e.target.value })}
                  placeholder="+967 777 999 888"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-right font-mono focus:outline-none"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-bold">العنوان وموقع الفرع</label>
                <input
                  type="text"
                  value={branchForm.address || ''}
                  onChange={e => setBranchForm({ ...branchForm, address: e.target.value })}
                  placeholder="مثال: شارع تعز - أمام مجمع المحاكم"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-right focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-bold">ساعات دوام الفرع</label>
                <input
                  type="text"
                  value={branchForm.workingHours || ''}
                  onChange={e => setBranchForm({ ...branchForm, workingHours: e.target.value })}
                  placeholder="مثال: 8:00 ص - 2:00 ظهراً / 4:00 عصراً - 9:00 م"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-slate-100 text-right focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                >
                  {editingBranch ? 'حفظ التعديلات' : 'إضافة الفرع'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBranchModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 px-4 rounded-xl text-xs"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
