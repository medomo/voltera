import React from 'react';
import { 
  Landmark, TrendingUp, ArrowDownLeft, PieChart, Percent, Scale, RefreshCw, 
  ArrowLeftRight, CheckCircle2, AlertTriangle, UserCheck
} from 'lucide-react';
import { Partner, PartnerTransaction, SystemSettings } from '../../types';

interface PartnerEquityOverviewProps {
  partners: Partner[];
  partnerBalances: Record<string, { capital: number; drawings: number; profits: number; currentBalance: number; roi: number }>;
  totalCapital: number;
  totalSharePercentage: number;
  totalDrawings: number;
  totalDistributions: number;
  settings: SystemSettings;
  onAutoRebalanceShares: () => void;
  onSelectPartnerForStatement: (partnerId: string) => void;
  onOpenShareTransfer: () => void;
}

export const PartnerEquityOverview: React.FC<PartnerEquityOverviewProps> = ({
  partners,
  partnerBalances,
  totalCapital,
  totalSharePercentage,
  totalDrawings,
  totalDistributions,
  settings,
  onAutoRebalanceShares,
  onSelectPartnerForStatement,
  onOpenShareTransfer
}) => {
  const isSharesBalanced = Math.abs(totalSharePercentage - 100) < 0.01;
  const currency = settings.currency || 'ر.ي';

  // Weighted average ROI
  const avgROI = totalCapital > 0 ? ((totalDistributions / totalCapital) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-4">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-slate-900/90 border border-slate-800/80 p-4.5 rounded-2xl shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">إجمالي رأس المال المكتتب</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {totalCapital.toLocaleString()} <span className="text-xs text-slate-400 font-sans">{currency}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span>تغطية الحصص: <strong className={`font-mono ${isSharesBalanced ? 'text-emerald-400' : 'text-amber-400'}`}>{totalSharePercentage}%</strong></span>
            <span>{partners.length} شركاء ومساهمين</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 p-4.5 rounded-2xl shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">صافي الأرباح الموزعة التراكمية</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {totalDistributions.toLocaleString()} <span className="text-xs text-slate-400 font-sans">{currency}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span>متوسط العائد الرأسمالي (ROI):</span>
            <span className="text-emerald-400 font-bold font-mono">%{avgROI}</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 p-4.5 rounded-2xl shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">إجمالي مسحوبات الشركاء</span>
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono">
            {totalDrawings.toLocaleString()} <span className="text-xs text-slate-400 font-sans">{currency}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span>مسحوبات جارية مخصومة</span>
            <span className="text-rose-400/80 font-mono text-[10px]">
              {totalDistributions > 0 ? `${((totalDrawings / totalDistributions) * 100).toFixed(0)}% من الأرباح` : '0%'}
            </span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 p-4.5 rounded-2xl shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">صافي أرصدة الحسابات الجارية</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            {Object.values(partnerBalances).reduce((s: number, b: { currentBalance: number }) => s + (b.currentBalance || 0), 0).toLocaleString()} <span className="text-xs text-slate-400 font-sans">{currency}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
            <span>حقوق الملكية الصافية للشركاء</span>
            <span className="text-emerald-400 font-bold font-mono">نشط</span>
          </div>
        </div>
      </div>

      {/* Equity Structure Bar & Rebalancing Banner */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-white">هيكل الملكية وحصص الشركاء في رأس المال</h3>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              isSharesBalanced ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
            }`}>
              {isSharesBalanced ? '✓ الحصص مكتملة 100%' : `تنبيه: إجمالي الحصص ${totalSharePercentage}% (المتبقي ${100 - totalSharePercentage}%)`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenShareTransfer}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition cursor-pointer"
              title="توثيق تنازل أو نقل حصص بين الشركاء"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-blue-400" />
              <span>نقل / تنازل عن حصص</span>
            </button>

            {!isSharesBalanced && partners.length > 0 && (
              <button
                onClick={onAutoRebalanceShares}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold rounded-xl border border-amber-500/40 transition cursor-pointer"
                title="موازنة نسب الحصص تلقائياً بالتناسب لتصل 100%"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>موازنة تلقائية 100%</span>
              </button>
            )}
          </div>
        </div>

        {/* Multi-segment Progress Bar */}
        <div className="w-full bg-slate-950 h-3.5 rounded-xl overflow-hidden flex border border-slate-800 p-0.5 gap-0.5">
          {partners.map((partner, idx) => {
            const colors = [
              'bg-amber-500', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 
              'bg-cyan-500', 'bg-rose-500', 'bg-indigo-500', 'bg-teal-500'
            ];
            const colorClass = colors[idx % colors.length];
            return (
              <div
                key={partner.id}
                style={{ width: `${Math.max(1, partner.sharePercentage)}%` }}
                className={`${colorClass} h-full rounded transition-all group relative cursor-pointer`}
                title={`${partner.name}: ${partner.sharePercentage}% (${partner.capitalContribution.toLocaleString()} ${currency})`}
                onClick={() => onSelectPartnerForStatement(partner.id)}
              />
            );
          })}
        </div>

        {/* Partner Share Legend Chips */}
        <div className="flex flex-wrap gap-2 pt-1">
          {partners.map((p, idx) => {
            const dotColors = [
              'bg-amber-400', 'bg-blue-400', 'bg-emerald-400', 'bg-purple-400', 
              'bg-cyan-400', 'bg-rose-400', 'bg-indigo-400', 'bg-teal-400'
            ];
            const dotClass = dotColors[idx % dotColors.length];
            const bal = partnerBalances[p.id] || { capital: p.capitalContribution, currentBalance: p.capitalContribution, roi: 0 };
            return (
              <div 
                key={p.id}
                onClick={() => onSelectPartnerForStatement(p.id)}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800 rounded-lg text-xs cursor-pointer transition"
              >
                <div className={`w-2 h-2 rounded-full ${dotClass}`} />
                <span className="text-slate-300 font-medium">{p.name}</span>
                <span className="font-mono font-bold text-amber-400">{p.sharePercentage}%</span>
                <span className="text-slate-500 font-mono text-[10px]">({(p.capitalContribution || 0).toLocaleString()})</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
