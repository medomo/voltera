import React, { useState } from 'react';
import { 
  X, CheckCircle2, Printer, ShieldCheck, FileText, ArrowLeftRight, 
  DollarSign, Calculator, Award, Building2, User, Phone, Landmark, Calendar,
  AlertCircle, ChevronDown, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Partner, PartnerTransaction, ProfitDistributionBatch, PartnerRole, PartnerStatus,
  SystemSettings, User as AppUser, PartnerTransactionType
} from '../../types';
import { safePrint } from '../../utils/exportUtils';

// Helper for labels
export const getRoleLabel = (role: PartnerRole) => {
  switch (role) {
    case 'founding_partner': return 'شريك مؤسس';
    case 'managing_partner': return 'شريك مدير ومؤسس';
    case 'silent_partner': return 'شريك موصي / ممول';
    case 'investor': return 'مستثمر وممول';
    case 'shareholder': return 'مساهم';
    default: return role;
  }
};

export const getTxTypeLabel = (type: PartnerTransactionType) => {
  switch (type) {
    case 'capital_deposit': return 'إيداع وزيادة رأس المال';
    case 'drawing': return 'مسحوبات شخصية دورية';
    case 'profit_share': return 'استحقاق توزيع أرباح';
    case 'profit_payout': return 'صرف نقدي فوري للأرباح';
    case 'capital_reinvestment': return 'رسملة وإعادة استثمار الأرباح';
    case 'loan_to_company': return 'قرض / تمويل من الشريك للشركة';
    case 'loan_repayment': return 'سداد قرض للشريك';
    case 'partner_expense': return 'مصاريف سددها الشريك نيابة عن المحطة';
    case 'share_transfer': return 'تنازل ونقل حصص بين الشركاء';
    case 'capital_reduction': return 'تخفيض / استرداد حصة رأس المال';
    default: return type;
  }
};

/* =========================================================================
   1. Partner Form Modal (Add / Edit)
   ========================================================================= */
interface PartnerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingPartner: Partner | null;
  partners: Partner[];
  totalSharePercentage: number;
  currency: string;
  onSave: (partnerData: any) => Promise<void>;
}

export const PartnerFormModal: React.FC<PartnerFormModalProps> = ({
  isOpen,
  onClose,
  editingPartner,
  partners,
  totalSharePercentage,
  currency,
  onSave
}) => {
  const currentPartnerShare = editingPartner ? editingPartner.sharePercentage : 0;
  const remainingShare = Math.max(0, 100 - (totalSharePercentage - currentPartnerShare));

  const [form, setForm] = useState({
    code: editingPartner ? editingPartner.code : `PRT-${String(partners.length + 1).padStart(2, '0')}`,
    name: editingPartner ? editingPartner.name : '',
    role: (editingPartner ? editingPartner.role : 'founding_partner') as PartnerRole,
    sharePercentage: editingPartner ? editingPartner.sharePercentage : Math.min(10, remainingShare || 10),
    shareCount: editingPartner?.shareCount || 100,
    nominalShareValue: editingPartner?.nominalShareValue || 10000,
    capitalContribution: editingPartner ? editingPartner.capitalContribution : 1000000,
    phone: editingPartner ? editingPartner.phone : '',
    emergencyPhone: editingPartner?.emergencyPhone || '',
    nationalId: editingPartner?.nationalId || '',
    nationalIdType: editingPartner?.nationalIdType || 'بطاقة شخصية',
    email: editingPartner?.email || '',
    address: editingPartner?.address || '',
    bankAccountDetails: editingPartner?.bankAccountDetails || '',
    iban: editingPartner?.iban || '',
    joinDate: editingPartner ? editingPartner.joinDate : new Date().toISOString().split('T')[0],
    status: (editingPartner ? editingPartner.status : 'active') as PartnerStatus,
    notes: editingPartner?.notes || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    await onSave(form);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {editingPartner ? 'تعديل بيانات الشريك / المساهم' : 'تسجيل شريك أو مساهم جديد'}
              </h3>
              <p className="text-xs text-slate-400">إدخال البيانات القانونية والمساهمة الرأسمالية والحسابات البنكية</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">كود الشريك *</label>
              <input
                type="text"
                required
                value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">صفة / نوع الشريك *</label>
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value as PartnerRole })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="founding_partner">شريك مؤسس</option>
                <option value="managing_partner">شريك مدير ومؤسس</option>
                <option value="silent_partner">شريك موصي / ممول</option>
                <option value="investor">مستثمر وممول</option>
                <option value="shareholder">مساهم عام</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">حالة الشريك *</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value as PartnerStatus })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="active">نشط ومستحق للأرباح</option>
                <option value="suspended">موقوف مؤقتاً</option>
                <option value="withdrawn">متخارج / مسدد الحقوق</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">الاسم الكامل للشريك *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-semibold"
              placeholder="مثلاً: المهندس علي محمد القادري"
            />
          </div>

          {/* Capital & Share Percentage */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
            <div>
              <label className="text-xs text-amber-400 font-bold block mb-1">نسبة الحصة (%) *</label>
              <input
                type="number"
                min="0.01"
                max="100"
                step="0.01"
                required
                value={form.sharePercentage}
                onChange={e => setForm({ ...form, sharePercentage: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-300 focus:outline-none focus:border-amber-500 font-mono font-bold"
              />
              <span className="text-[10px] text-slate-500 block mt-0.5">الحصة المتاحة: {remainingShare}%</span>
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1">المساهمة الرأسمالية ({currency}) *</label>
              <input
                type="number"
                required
                min="0"
                value={form.capitalContribution}
                onChange={e => setForm({ ...form, capitalContribution: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1">عدد الحصص / الأسهم</label>
              <input
                type="number"
                min="1"
                value={form.shareCount}
                onChange={e => setForm({ ...form, shareCount: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          {/* Contact & ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">رقم الهاتف الأساسي *</label>
              <input
                type="text"
                required
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                placeholder="77xxxxxxx"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">هاتف الطوارئ / الوكيل</label>
              <input
                type="text"
                value={form.emergencyPhone}
                onChange={e => setForm({ ...form, emergencyPhone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                placeholder="73xxxxxxx"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">الرقم الوطني / السجل المدني</label>
              <input
                type="text"
                value={form.nationalId}
                onChange={e => setForm({ ...form, nationalId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">تاريخ الانضمام والتأسيس</label>
              <input
                type="date"
                value={form.joinDate}
                onChange={e => setForm({ ...form, joinDate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Banking Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">تفاصيل الحساب البنكي / المحفظة</label>
              <input
                type="text"
                value={form.bankAccountDetails}
                onChange={e => setForm({ ...form, bankAccountDetails: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                placeholder="مثلاً: بنك الكريمي - حساب رقم 123456"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">الآيبان الدولي IBAN</label>
              <input
                type="text"
                value={form.iban}
                onChange={e => setForm({ ...form, iban: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                placeholder="YE..."
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">ملاحظات وشروط إضافية</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              placeholder="أي اشتراطات خاصة أو بنود ملحقة..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              {editingPartner ? 'حفظ التعديلات' : 'تسجيل الشريك واعتماد الحصة'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

/* =========================================================================
   2. Transaction Modal (Add Voucher)
   ========================================================================= */
interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  partners: Partner[];
  currency: string;
  defaultPartnerId?: string;
  currentUser: AppUser;
  onSave: (txData: any) => Promise<void>;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  partners,
  currency,
  defaultPartnerId,
  currentUser,
  onSave
}) => {
  const [form, setForm] = useState({
    partnerId: defaultPartnerId || partners[0]?.id || '',
    type: 'drawing' as PartnerTransactionType,
    amount: 50000,
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash' as PartnerTransaction['paymentMethod'],
    treasurySource: 'الصندوق الرئيسي',
    description: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.partnerId || form.amount <= 0) return;
    await onSave(form);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">تسجيل حركة / سند مالي لشريك</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">الشريك المعني *</label>
            <select
              value={form.partnerId}
              onChange={e => setForm({ ...form, partnerId: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-semibold"
            >
              {partners.map(p => (
                <option key={p.id} value={p.id}>{p.code} - {p.name} (حصة: {p.sharePercentage}%)</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">نوع الحركة / السند *</label>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value as PartnerTransactionType })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="drawing">مسحوبات شخصية دورية (خصم من الجاري)</option>
                <option value="capital_deposit">إيداع وزيادة رأس المال</option>
                <option value="profit_payout">صرف نقدي فوري للأرباح</option>
                <option value="capital_reinvestment">رسملة وإعادة استثمار الأرباح</option>
                <option value="loan_to_company">قرض / تمويل من الشريك للشركة</option>
                <option value="loan_repayment">سداد قرض للشريك</option>
                <option value="partner_expense">مصاريف سددها الشريك لصالح المحطة</option>
                <option value="capital_reduction">تخفيض / استرداد رأس المال</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">المبلغ ({currency}) *</label>
              <input
                type="number"
                required
                min="1"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">تاريخ السند</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">طريقة الدفع / الصندوق</label>
              <select
                value={form.treasurySource}
                onChange={e => setForm({ ...form, treasurySource: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="الصندوق الرئيسي">الصندوق الرئيسي (كاش)</option>
                <option value="الحساب البنكي الرئيسي">الحساب البنكي الرئيسي</option>
                <option value="محفظة كاش إلكترونية">محفظة كاش إلكترونية</option>
                <option value="قيد دفتري / حساب جاري">قيد دفتري / حساب جاري</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">البيان والشرح التفصيلي</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              placeholder="مثلاً: مسحوبات نقدية على حساب أرباح الربع الحالي"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">ملاحظات إضافية</label>
            <input
              type="text"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              placeholder="أي رقم مرجعي أو إشعار بنكي..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              حفظ وترحيل السند
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

/* =========================================================================
   3. Share Ownership Certificate Modal (شهادة تملك حصة رسمية)
   ========================================================================= */
interface ShareCertificateModalProps {
  partner: Partner | null;
  settings: SystemSettings;
  totalCapital: number;
  onClose: () => void;
}

export const ShareCertificateModal: React.FC<ShareCertificateModalProps> = ({
  partner,
  settings,
  totalCapital,
  onClose
}) => {
  if (!partner) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">شهادة ملكية حصة ومساهمة رسمية</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => safePrint('share-certificate-print')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl cursor-pointer shadow-md hover:bg-amber-400"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الشهادة الرسمية</span>
            </button>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Certificate Template */}
        <div 
          id="share-certificate-print"
          className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-4 border-amber-500/40 p-8 rounded-2xl text-center space-y-6 relative overflow-hidden"
        >
          {/* Watermark Logo / Icon Background */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <Building2 className="w-96 h-96 text-amber-400" />
          </div>

          {/* Header */}
          <div className="space-y-1 relative z-10 border-b-2 border-amber-500/30 pb-4">
            <span className="text-xs font-mono text-amber-400 tracking-widest uppercase">الجمهورية اليمنية - وزارة الكهرباء والطاقة</span>
            <h2 className="text-2xl font-black text-white">{settings.stationName || 'شركة المحطة الكهربائية التجارية'}</h2>
            <p className="text-xs text-slate-400">سجل الشركات التجارية - وثيقة تأسيس وتملك الحصص الرأسمالية</p>
          </div>

          {/* Certificate Title */}
          <div className="space-y-2 relative z-10">
            <div className="inline-block px-6 py-1.5 bg-amber-500/15 border border-amber-500/40 rounded-full">
              <span className="text-base font-black text-amber-400">شهــادة تملّـــك حصـــة شريـــك</span>
            </div>
            <p className="text-xs text-slate-300 max-w-xl mx-auto leading-relaxed">
              تشهد إدارة الشركة بأن الأخ الشريك المذكور أدناه مساهم مقيّد في السجل الرسمي للشركة بالحصص والحقوق والالتزامات المبينة أدناه:
            </p>
          </div>

          {/* Partner & Share Info Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-right bg-slate-900/90 p-4 rounded-xl border border-amber-500/20 relative z-10 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px]">اسم الشريك:</span>
              <strong className="text-white text-sm font-bold">{partner.name}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">كود وسجل الشريك:</span>
              <strong className="text-amber-400 font-mono text-sm">{partner.code}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">صفة الشريك:</span>
              <strong className="text-slate-200">{getRoleLabel(partner.role)}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">تاريخ الانضمام:</span>
              <strong className="text-slate-200 font-mono">{partner.joinDate}</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/90 p-4 rounded-xl border border-amber-500/20 relative z-10 text-center font-mono">
            <div>
              <span className="text-slate-400 block text-[10px] font-sans">نسبة التملك من رأس المال</span>
              <span className="text-2xl font-black text-amber-400">{partner.sharePercentage}%</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-sans">القيمة الاسمية للمساهمة</span>
              <span className="text-xl font-black text-emerald-400">{(partner.capitalContribution || 0).toLocaleString()} {settings.currency || 'ر.ي'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] font-sans">إجمالي رأس مال الشركة المكتتب</span>
              <span className="text-xl font-bold text-slate-200">{totalCapital.toLocaleString()} {settings.currency || 'ر.ي'}</span>
            </div>
          </div>

          {/* Legal Text */}
          <p className="text-[11px] text-slate-400 text-right leading-relaxed relative z-10">
            تمنح هذه الشهادة حاملها كافة الحقوق القانونية في الأرباح الدورية الموزعة والتصويت وإدارة الشركة بموجب عقد التأسيس واللوائح المنظمة. ولا يجوز التنازل عن هذه الحصة أو نقلها إلا بموافقة مجلس الشركاء المسبقة وتحرير محضر رسمي.
          </p>

          {/* Signatures */}
          <div className="pt-6 border-t border-slate-800 grid grid-cols-3 gap-6 text-center text-xs text-slate-400 relative z-10">
            <div>
              <span className="block font-bold mb-6 text-slate-300">الشريك المالك</span>
              <div className="border-t border-dashed border-slate-700 pt-1">توقيع الشريك</div>
            </div>
            <div>
              <span className="block font-bold mb-6 text-slate-300">المستشار المالي والقانوني</span>
              <div className="border-t border-dashed border-slate-700 pt-1">التدقيق والتوثيق</div>
            </div>
            <div>
              <span className="block font-bold mb-6 text-slate-300">المدير العام والختم الرسمي</span>
              <div className="border-t border-dashed border-slate-700 pt-1">الاعتماد والختم</div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

/* =========================================================================
   4. Share Transfer / Concession Modal (محضر تنازل ونقل حصص)
   ========================================================================= */
interface ShareTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  partners: Partner[];
  currency: string;
  currentUser: AppUser;
  onExecuteTransfer: (sourcePartnerId: string, targetPartnerId: string, transferredPercent: number, transferAmount: number, notes: string) => Promise<void>;
}

export const ShareTransferModal: React.FC<ShareTransferModalProps> = ({
  isOpen,
  onClose,
  partners,
  currency,
  currentUser,
  onExecuteTransfer
}) => {
  const [sourceId, setSourceId] = useState(partners[0]?.id || '');
  const [targetId, setTargetId] = useState(partners[1]?.id || partners[0]?.id || '');
  const [transferPercent, setTransferPercent] = useState<number>(5);
  const [transferAmount, setTransferAmount] = useState<number>(100000);
  const [notes, setNotes] = useState('');

  const sourcePartner = partners.find(p => p.id === sourceId);
  const targetPartner = partners.find(p => p.id === targetId);

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourcePartner || !targetPartner || sourceId === targetId) {
      alert('يرجى اختيار شريكين مختلفين لعملية التنازل!');
      return;
    }
    if (transferPercent <= 0 || transferPercent > sourcePartner.sharePercentage) {
      alert(`النسبة المحولة يجب أن تكون بين 0.1% وحصة الشريك المتنازل (${sourcePartner.sharePercentage}%)`);
      return;
    }
    await onExecuteTransfer(sourceId, targetId, transferPercent, transferAmount, notes);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold text-white">محضر نقل وتنازل عن حصة بين الشركاء</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleExecute} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">الشريك المتنازل (البائع) *</label>
              <select
                value={sourceId}
                onChange={e => setSourceId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                {partners.map(p => (
                  <option key={p.id} value={p.id}>{p.code} - {p.name} (حصة: {p.sharePercentage}%)</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">الشريك المتنازل إليه (المشتري) *</label>
              <select
                value={targetId}
                onChange={e => setTargetId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                {partners.map(p => (
                  <option key={p.id} value={p.id} disabled={p.id === sourceId}>
                    {p.code} - {p.name} (حصة: {p.sharePercentage}%)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
            <div>
              <label className="text-xs text-amber-400 font-bold block mb-1">النسبة المتنازل عنها (%) *</label>
              <input
                type="number"
                min="0.1"
                max={sourcePartner?.sharePercentage || 100}
                step="0.1"
                required
                value={transferPercent}
                onChange={e => setTransferPercent(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-slate-500 block mt-0.5">
                الحصة الحالية للمتنازل: {sourcePartner?.sharePercentage}%
              </span>
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1">مبلغ التنازل / البيع المتفق عليه ({currency})</label>
              <input
                type="number"
                min="0"
                value={transferAmount}
                onChange={e => setTransferAmount(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {sourcePartner && targetPartner && (
            <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl text-xs space-y-1">
              <span className="font-bold text-blue-300 block">معاينة الحصص بعد التنازل:</span>
              <div className="flex justify-between text-slate-300">
                <span>{sourcePartner.name} (المتنازل):</span>
                <span className="font-mono font-bold text-rose-400">
                  {sourcePartner.sharePercentage}% ➔ {(sourcePartner.sharePercentage - transferPercent).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>{targetPartner.name} (المتنازل إليه):</span>
                <span className="font-mono font-bold text-emerald-400">
                  {targetPartner.sharePercentage}% ➔ {(targetPartner.sharePercentage + transferPercent).toFixed(1)}%
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs text-slate-400 block mb-1">ملاحظات ومحضر الاتفاق</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              placeholder="مثلاً: تنازل رسمي بموجب عقد بيع الحصة المصدق..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 cursor-pointer"
            >
              اعتماد نقل الحصة وتحديث السجل
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

/* =========================================================================
   5. Partner Settlement & Exit Calculator (حاسبة تصفية مستحقات وتخارج الشريك)
   ========================================================================= */
interface PartnerSettlementModalProps {
  partner: Partner | null;
  balanceInfo: { capital: number; drawings: number; profits: number; currentBalance: number };
  currency: string;
  onClose: () => void;
  onConfirmExit: (partnerId: string, settlementAmount: number, notes: string) => Promise<void>;
}

export const PartnerSettlementModal: React.FC<PartnerSettlementModalProps> = ({
  partner,
  balanceInfo,
  currency,
  onClose,
  onConfirmExit
}) => {
  const [goodwillBonus, setGoodwillBonus] = useState<number>(0);
  const [settlementNotes, setSettlementNotes] = useState('');

  if (!partner) return null;

  const netSettlement = (balanceInfo.currentBalance || 0) + goodwillBonus;

  const handleConfirm = async () => {
    if (!window.confirm(`هل أنت متأكد من تنفيذ التخارج والتصفية النهائية للشريك "${partner.name}" بمبلغ ${netSettlement.toLocaleString()} ${currency}؟`)) {
      return;
    }
    await onConfirmExit(partner.id, netSettlement, settlementNotes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">حاسبة تصفية المستحقات والتخارج للشريك</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">الشريك:</span>
              <strong className="text-white">{partner.name} ({partner.code})</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">نسبة الحصة في رأس المال:</span>
              <strong className="text-amber-400 font-mono">{partner.sharePercentage}%</strong>
            </div>
          </div>

          {/* Breakdown items */}
          <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono">
            <div className="flex justify-between text-slate-300">
              <span className="font-sans">رأس المال المساهم الأساسي:</span>
              <span className="text-emerald-400">+{partner.capitalContribution.toLocaleString()} {currency}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="font-sans">إجمالي الأرباح المستحقة المقيدة:</span>
              <span className="text-emerald-400">+{balanceInfo.profits.toLocaleString()} {currency}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="font-sans">إجمالي المسحوبات الشخصية المخصومة:</span>
              <span className="text-rose-400">-{balanceInfo.drawings.toLocaleString()} {currency}</span>
            </div>
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-slate-300">
              <span className="font-sans">علاوة شهرة / تقييم أصول إضافي:</span>
              <input
                type="number"
                value={goodwillBonus}
                onChange={e => setGoodwillBonus(Number(e.target.value))}
                className="w-32 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-amber-400 text-right font-mono"
              />
            </div>
            <div className="pt-3 border-t-2 border-slate-800 flex justify-between text-base font-bold">
              <span className="font-sans text-white">صافي مبلغ التصفية المستحق:</span>
              <span className="text-amber-400">{netSettlement.toLocaleString()} {currency}</span>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1">محضر وتفاصيل التخارج</label>
            <input
              type="text"
              value={settlementNotes}
              onChange={e => setSettlementNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              placeholder="مثلاً: تخارج رسمي بالتراضي وسداد المستحقات بشيك بنكي..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 cursor-pointer"
            >
              اعتماد التصفية والتخارج
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
