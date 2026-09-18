import React, { useState, useMemo } from 'react';
import { 
  FileText, Printer, Download, Calendar, Landmark, DollarSign, 
  TrendingUp, ArrowDownLeft, ShieldCheck, Scale, Award, UserCheck
} from 'lucide-react';
import { Partner, PartnerTransaction, SystemSettings } from '../../types';
import { exportToCSV, safePrint } from '../../utils/exportUtils';
import { getRoleLabel, getTxTypeLabel } from './PartnerModals';

interface PartnerStatementTabProps {
  partners: Partner[];
  partnerTransactions: PartnerTransaction[];
  partnerBalances: Record<string, { capital: number; drawings: number; profits: number; currentBalance: number; roi: number }>;
  settings: SystemSettings;
  selectedPartnerId: string;
  setSelectedPartnerId: (id: string) => void;
}

export const PartnerStatementTab: React.FC<PartnerStatementTabProps> = ({
  partners,
  partnerTransactions,
  partnerBalances,
  settings,
  selectedPartnerId,
  setSelectedPartnerId
}) => {
  const currency = settings.currency || 'ر.ي';
  const partner = partners.find(p => p.id === selectedPartnerId) || partners[0];

  const currentYear = new Date().getFullYear();
  const [dateFrom, setDateFrom] = useState(`${currentYear}-01-01`);
  const [dateTo, setDateTo] = useState(`${currentYear}-12-31`);

  // Calculate opening balance, period txs, and running balances
  const statementData = useMemo(() => {
    if (!partner) return { openingBalance: 0, rows: [], closingBalance: 0, totalCredits: 0, totalDebits: 0 };

    const allPartnerTxs = partnerTransactions
      .filter(tx => tx.partnerId === partner.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let openingBalance = 0;
    let periodTxs: PartnerTransaction[] = [];

    allPartnerTxs.forEach(tx => {
      const isCredit = ['profit_share', 'capital_deposit', 'loan_to_company', 'partner_expense', 'capital_reinvestment'].includes(tx.type);
      const val = isCredit ? tx.amount : -tx.amount;

      if (dateFrom && tx.date < dateFrom) {
        openingBalance += val;
      } else if (!dateTo || tx.date <= dateTo) {
        periodTxs.push(tx);
      }
    });

    let running = openingBalance;
    let totalCredits = 0;
    let totalDebits = 0;

    const rows = periodTxs.map(tx => {
      const isCredit = ['profit_share', 'capital_deposit', 'loan_to_company', 'partner_expense', 'capital_reinvestment'].includes(tx.type);
      const credit = isCredit ? tx.amount : 0;
      const debit = !isCredit ? tx.amount : 0;
      totalCredits += credit;
      totalDebits += debit;
      running += (credit - debit);

      return {
        ...tx,
        credit,
        debit,
        runningBalance: running
      };
    });

    return {
      openingBalance,
      rows,
      closingBalance: running,
      totalCredits,
      totalDebits
    };
  }, [partner, partnerTransactions, dateFrom, dateTo]);

  const handleExportStatement = () => {
    if (!partner) return;
    const exportRows = statementData.rows.map(r => ({
      'رقم السند': r.voucherNumber,
      'التاريخ': r.date,
      'نوع الحركة': getTxTypeLabel(r.type),
      'البيان': r.description,
      'له (دائن / مستحق)': r.credit,
      'عليه (مدين / مسحوبات)': r.debit,
      'الرصيد التراكمي': r.runningBalance,
      'الصندوق / طريقة الدفع': r.treasurySource || r.paymentMethod
    }));
    exportToCSV(exportRows, `statement_${partner.code}_${dateFrom}_to_${dateTo}`);
  };

  if (!partner) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
        لم يتم تسجيل أي شركاء في النظام لعرض كشوف الحسابات.
      </div>
    );
  }

  const partnerBal = partnerBalances[partner.id] || {
    capital: partner.capitalContribution,
    drawings: 0,
    profits: 0,
    currentBalance: partner.capitalContribution,
    roi: 0
  };

  return (
    <div className="space-y-4">
      {/* Selector & Date Controls */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs text-slate-400">الشريك:</span>
            <select
              value={selectedPartnerId}
              onChange={e => setSelectedPartnerId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-400 font-bold focus:outline-none focus:border-amber-500 flex-1 max-w-xs"
            >
              {partners.map(p => (
                <option key={p.id} value={p.id}>{p.code} - {p.name} ({p.sharePercentage}%)</option>
              ))}
            </select>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">من:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
              />
              <span className="text-slate-400">إلى:</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportStatement}
              className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير Excel</span>
            </button>
            <button
              onClick={() => safePrint('official-partner-statement-print')}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة كشف الحساب A4</span>
            </button>
          </div>
        </div>
      </div>

      {/* Printable Statement Canvas */}
      <div 
        id="official-partner-statement-print"
        className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6 text-xs text-right"
      >
        {/* Station Official Header */}
        <div className="border-b-2 border-slate-800 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-right space-y-1">
            <h2 className="text-lg font-black text-white">{settings.stationName || 'شركة المحطة الكهربائية'}</h2>
            <p className="text-xs text-amber-400 font-bold">كشف حساب شريك ومساهم رسمي (Statement of Account)</p>
            <div className="text-[11px] text-slate-400">
              الفترة من: <strong className="text-slate-200 font-mono">{dateFrom}</strong> إلى: <strong className="text-slate-200 font-mono">{dateTo}</strong>
            </div>
          </div>

          <div className="text-left font-mono text-[11px] text-slate-400 space-y-0.5">
            <div>تاريخ الاستخراج: {new Date().toISOString().split('T')[0]}</div>
            <div>العملة المعتمدة: {currency}</div>
            <div className="text-emerald-400 font-bold">حالة الحساب: نشط</div>
          </div>
        </div>

        {/* Partner Info Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono">
          <div>
            <span className="text-[10px] text-slate-500 font-sans block">اسم الشريك:</span>
            <strong className="text-white text-sm font-sans">{partner.name}</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-sans block">كود الشريك والصفة:</span>
            <strong className="text-amber-400">{partner.code}</strong> - <span className="font-sans text-slate-300">{getRoleLabel(partner.role)}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-sans block">نسبة الحصة المكتتبة:</span>
            <strong className="text-amber-400 text-sm font-bold">{partner.sharePercentage}%</strong>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-sans block">رأس المال الأساسي:</span>
            <strong className="text-white">{partner.capitalContribution.toLocaleString()} {currency}</strong>
          </div>
        </div>

        {/* Statement Balances Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono">
            <span className="text-[10px] text-slate-400 font-sans block">الرصيد الافتتاحي السابق:</span>
            <strong className="text-slate-200 text-sm">{statementData.openingBalance.toLocaleString()}</strong>
            <span className="text-[10px] text-slate-500 font-sans mr-1">{currency}</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono">
            <span className="text-[10px] text-slate-400 font-sans block">إجمالي المستحق للفترة (له):</span>
            <strong className="text-emerald-400 text-sm">+{statementData.totalCredits.toLocaleString()}</strong>
            <span className="text-[10px] text-emerald-500 font-sans mr-1">{currency}</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono">
            <span className="text-[10px] text-slate-400 font-sans block">إجمالي المسحوبات (عليه):</span>
            <strong className="text-rose-400 text-sm">-{statementData.totalDebits.toLocaleString()}</strong>
            <span className="text-[10px] text-rose-500 font-sans mr-1">{currency}</span>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 font-mono">
            <span className="text-[10px] text-amber-400 font-sans block">الرصيد الختامي القائم:</span>
            <strong className="text-amber-400 text-base">{statementData.closingBalance.toLocaleString()}</strong>
            <span className="text-[10px] text-amber-500 font-sans mr-1">{currency}</span>
          </div>
        </div>

        {/* Statement Detail Table */}
        <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-900 text-slate-300 border-b border-slate-800">
              <tr>
                <th className="p-3">رقم السند</th>
                <th className="p-3">التاريخ</th>
                <th className="p-3">نوع الحركة</th>
                <th className="p-3">البيان والشرح</th>
                <th className="p-3">له (دائن / أرباح)</th>
                <th className="p-3">عليه (مدين / مسحوبات)</th>
                <th className="p-3">الرصيد التراكمي ({currency})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              <tr className="bg-slate-900/30 text-slate-400">
                <td className="p-3 font-sans font-bold" colSpan={4}>الرصيد الافتتاحي ما قبل {dateFrom}</td>
                <td className="p-3">-</td>
                <td className="p-3">-</td>
                <td className="p-3 font-bold text-white">{statementData.openingBalance.toLocaleString()}</td>
              </tr>

              {statementData.rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 font-sans">
                    لا توجد حركات مسجلة خلال الفترة المحددة.
                  </td>
                </tr>
              ) : (
                statementData.rows.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-slate-900/40">
                    <td className="p-3 font-bold text-amber-400">{row.voucherNumber}</td>
                    <td className="p-3 text-slate-300">{row.date}</td>
                    <td className="p-3 font-sans font-medium text-slate-200">{getTxTypeLabel(row.type)}</td>
                    <td className="p-3 font-sans text-slate-400 max-w-xs">{row.description || '-'}</td>
                    <td className="p-3 text-emerald-400 font-bold">
                      {row.credit > 0 ? `+${row.credit.toLocaleString()}` : '-'}
                    </td>
                    <td className="p-3 text-rose-400 font-bold">
                      {row.debit > 0 ? `-${row.debit.toLocaleString()}` : '-'}
                    </td>
                    <td className="p-3 font-bold text-white text-sm">
                      {row.runningBalance.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}

              {/* Total Footer Row */}
              <tr className="bg-slate-900 font-bold text-sm border-t-2 border-slate-700">
                <td className="p-3 font-sans text-white" colSpan={4}>إجمالي حركة الفترة والرصيد الصافي</td>
                <td className="p-3 text-emerald-400">+{statementData.totalCredits.toLocaleString()}</td>
                <td className="p-3 text-rose-400">-{statementData.totalDebits.toLocaleString()}</td>
                <td className="p-3 text-amber-400">{statementData.closingBalance.toLocaleString()} {currency}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Legal Disclaimer & Signatures */}
        <div className="space-y-6 pt-4 border-t border-slate-800">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            * يعتبر هذا الكشف وثيقة مالية رسمية صادرة من النظام المحاسبي للمحطة. في حال وجود أي اعتراض على الأرصدة أو القيود يرجى مراجعة الإدارة المالية خلال 15 يوماً من تاريخ صدوره.
          </p>

          <div className="grid grid-cols-3 gap-6 text-center text-slate-400">
            <div>
              <span className="block font-bold mb-6 text-slate-300">المحاسب المالي</span>
              <div className="border-t border-dashed border-slate-700 pt-1">التوقيع</div>
            </div>
            <div>
              <span className="block font-bold mb-6 text-slate-300">المدير المالي والتدقيق</span>
              <div className="border-t border-dashed border-slate-700 pt-1">المراجعة والاعتماد</div>
            </div>
            <div>
              <span className="block font-bold mb-6 text-slate-300">الشريك المستلم</span>
              <div className="border-t border-dashed border-slate-700 pt-1">المصادقة والتوقيع</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
