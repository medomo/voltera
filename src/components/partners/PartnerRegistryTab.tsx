import React, { useState } from 'react';
import { 
  User, Users, Plus, Search, Filter, Phone, Landmark, DollarSign, Award, 
  ArrowDownLeft, TrendingUp, Edit3, Trash2, FileText, Calculator, 
  ArrowLeftRight, ShieldCheck, CheckCircle2, MoreHorizontal, Eye
} from 'lucide-react';
import { Partner, PartnerTransaction, SystemSettings, PartnerRole } from '../../types';
import { getRoleLabel } from './PartnerModals';

interface PartnerRegistryTabProps {
  partners: Partner[];
  partnerBalances: Record<string, { capital: number; drawings: number; profits: number; currentBalance: number; roi: number }>;
  settings: SystemSettings;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onOpenAddPartner: () => void;
  onEditPartner: (partner: Partner) => void;
  onDeletePartner: (partnerId: string) => void;
  onOpenCertificate: (partner: Partner) => void;
  onOpenSettlement: (partner: Partner) => void;
  onSelectPartnerForStatement: (partnerId: string) => void;
  onQuickDrawing: (partnerId: string) => void;
}

export const PartnerRegistryTab: React.FC<PartnerRegistryTabProps> = ({
  partners,
  partnerBalances,
  settings,
  searchQuery,
  setSearchQuery,
  onOpenAddPartner,
  onEditPartner,
  onDeletePartner,
  onOpenCertificate,
  onOpenSettlement,
  onSelectPartnerForStatement,
  onQuickDrawing
}) => {
  const currency = settings.currency || 'ر.ي';
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const filteredPartners = partners.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.phone && p.phone.includes(searchQuery));
    const matchesRole = roleFilter === 'all' || p.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              placeholder="البحث بالاسم، الكود، أو رقم الهاتف..."
            />
          </div>

          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="all">جميع الرتب والصفات</option>
            <option value="founding_partner">شريك مؤسس</option>
            <option value="managing_partner">شريك مدير ومؤسس</option>
            <option value="silent_partner">شريك موصي / ممول</option>
            <option value="investor">مستثمر</option>
            <option value="shareholder">مساهم</option>
          </select>
        </div>

        <button
          onClick={onOpenAddPartner}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>تسجيل شريك جديد</span>
        </button>
      </div>

      {/* Partners Grid */}
      {filteredPartners.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Users className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-white font-bold text-sm">لم يتم تسجيل أي شركاء في قاعدة البيانات السحابية بعد</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              تم حذف البيانات الافتراضية بنجاح. يمكنك الآن تسجيل شركاء حقيقيين ومساهمين وحفظهم مباشرة في قاعدة البيانات.
            </p>
          </div>
          <button
            onClick={onOpenAddPartner}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل أول شريك الآن</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPartners.map(partner => {
            const bal = partnerBalances[partner.id] || {
              capital: partner.capitalContribution,
              drawings: 0,
              profits: 0,
              currentBalance: partner.capitalContribution,
              roi: 0
            };

            return (
              <div
                key={partner.id}
                className="bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between transition group"
              >
                <div className="space-y-3">
                  {/* Top Row: Avatar, Name, Code, Role */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm font-mono">
                        {partner.code.replace('PRT-', '')}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white group-hover:text-amber-400 transition">
                          {partner.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-slate-400">{getRoleLabel(partner.role)}</span>
                          <span className={`w-1.5 h-1.5 rounded-full ${partner.status === 'active' ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                        </div>
                      </div>
                    </div>

                    <div className="text-left font-mono">
                      <span className="px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-lg font-black text-sm block">
                        {partner.sharePercentage}%
                      </span>
                    </div>
                  </div>

                  {/* Financial Metrics Cards inside partner */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-slate-500 font-sans block">رأس المال المكتتب:</span>
                      <strong className="text-white text-xs">{(partner.capitalContribution || 0).toLocaleString()}</strong>
                      <span className="text-[9px] text-slate-500 font-sans mr-1">{currency}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-sans block">الأرباح المستحقة:</span>
                      <strong className="text-emerald-400 text-xs">{bal.profits.toLocaleString()}</strong>
                      <span className="text-[9px] text-emerald-500 font-sans mr-1">{currency}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-sans block">إجمالي المسحوبات:</span>
                      <strong className="text-rose-400 text-xs">{bal.drawings.toLocaleString()}</strong>
                      <span className="text-[9px] text-rose-500 font-sans mr-1">{currency}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-sans block">صافي الحساب الجاري:</span>
                      <strong className="text-amber-400 text-xs">{bal.currentBalance.toLocaleString()}</strong>
                      <span className="text-[9px] text-amber-500 font-sans mr-1">{currency}</span>
                    </div>
                  </div>

                  {/* Contact & Banking info */}
                  <div className="space-y-1 text-slate-400 text-[11px] bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/40">
                    <div className="flex items-center justify-between">
                      <span>الهاتف:</span>
                      <span className="font-mono text-slate-300">{partner.phone || 'غير مسجل'}</span>
                    </div>
                    {partner.bankAccountDetails && (
                      <div className="flex items-center justify-between">
                        <span>الحساب:</span>
                        <span className="text-slate-300 truncate max-w-[150px]">{partner.bankAccountDetails}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Row */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-1 text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onSelectPartnerForStatement(partner.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg cursor-pointer transition font-medium text-[11px]"
                      title="عرض كشف الحساب التفصيلي"
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      <span>كشف حساب</span>
                    </button>
                    <button
                      onClick={() => onOpenCertificate(partner)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg cursor-pointer transition"
                      title="طباعة شهادة ملكية الحصة"
                    >
                      <Award className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onOpenSettlement(partner)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded-lg cursor-pointer transition"
                      title="حاسبة التصفية والتخارج"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditPartner(partner)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg cursor-pointer transition"
                      title="تعديل البيانات"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeletePartner(partner.id)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded-lg cursor-pointer transition"
                      title="حذف الشريك"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
