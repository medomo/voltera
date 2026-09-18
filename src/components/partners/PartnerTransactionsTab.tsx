import React, { useState, useMemo } from 'react';
import { 
  DollarSign, Plus, Search, Filter, Printer, Trash2, Download, 
  ArrowUpRight, ArrowDownLeft, FileText, CheckCircle2, Eye, X
} from 'lucide-react';
import { motion } from 'motion/react';
import { Partner, PartnerTransaction, SystemSettings, PartnerTransactionType, User } from '../../types';
import { exportToCSV, safePrint } from '../../utils/exportUtils';
import { getTxTypeLabel } from './PartnerModals';

interface PartnerTransactionsTabProps {
  partners: Partner[];
  partnerTransactions: PartnerTransaction[];
  settings: SystemSettings;
  currentUser: User;
  onOpenAddTx: () => void;
  onDeleteTx: (txId: string) => Promise<void>;
}

export const PartnerTransactionsTab: React.FC<PartnerTransactionsTabProps> = ({
  partners,
  partnerTransactions,
  settings,
  currentUser,
  onOpenAddTx,
  onDeleteTx
}) => {
  const currency = settings.currency || 'ر.ي';

  const [search, setSearch] = useState('');
  const [partnerFilter, setPartnerFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [viewingVoucher, setViewingVoucher] = useState<PartnerTransaction | null>(null);

  // Filtered transactions
  const filteredTxs = useMemo(() => {
    return partnerTransactions.filter(tx => {
      const matchPartner = partnerFilter === 'all' || tx.partnerId === partnerFilter;
      const matchType = typeFilter === 'all' || tx.type === typeFilter;
      const matchSearch = 
        tx.partnerName.toLowerCase().includes(search.toLowerCase()) ||
        tx.voucherNumber.toLowerCase().includes(search.toLowerCase()) ||
        (tx.description && tx.description.toLowerCase().includes(search.toLowerCase()));

      let matchDate = true;
      if (dateFrom && tx.date < dateFrom) matchDate = false;
      if (dateTo && tx.date > dateTo) matchDate = false;

      return matchPartner && matchType && matchSearch && matchDate;
    });
  }, [partnerTransactions, partnerFilter, typeFilter, search, dateFrom, dateTo]);

  // Export
  const handleExport = () => {
    const data = filteredTxs.map(tx => ({
      'رقم السند': tx.voucherNumber,
      'التاريخ': tx.date,
      'الشريك': tx.partnerName,
      'نوع الحركة': getTxTypeLabel(tx.type),
      'المبلغ': tx.amount,
      'طريقة الدفع / الصندوق': tx.treasurySource || tx.paymentMethod,
      'البيان': tx.description,
      'المستخدم': tx.recordedBy
    }));
    exportToCSV(data, `partner_transactions_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="space-y-4">
      {/* Controls & Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                placeholder="البحث برقم السند، اسم الشريك، أو البيان..."
              />
            </div>

            <select
              value={partnerFilter}
              onChange={e => setPartnerFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="all">جميع الشركاء</option>
              {partners.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="all">جميع أنواع السندات</option>
              <option value="drawing">مسحوبات شخصية</option>
              <option value="profit_share">استحقاق توزيع أرباح</option>
              <option value="profit_payout">صرف أرباح فوري</option>
              <option value="capital_deposit">إيداع رأس مال</option>
              <option value="capital_reinvestment">رسملة أرباح</option>
              <option value="loan_to_company">قرض للشركة</option>
              <option value="loan_repayment">سداد قرض</option>
              <option value="partner_expense">مصاريف نيابة عن المحطة</option>
              <option value="share_transfer">تنازل عن حصص</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير Excel</span>
            </button>

            <button
              onClick={onOpenAddTx}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>سند مالي جديد</span>
            </button>
          </div>
        </div>

        {/* Date range filters */}
        <div className="flex items-center gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
          <span>تصفية بالتاريخ:</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
            />
            <span>إلى</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="text-[11px] text-amber-400 hover:underline cursor-pointer"
              >
                إلغاء التصفية
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {filteredTxs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            لا توجد سندات أو حركات تطابق معايير التصفية المحددة.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">رقم السند</th>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">الشريك</th>
                  <th className="p-3">نوع الحركة</th>
                  <th className="p-3">المبلغ ({currency})</th>
                  <th className="p-3">الصندوق / الحساب</th>
                  <th className="p-3">البيان</th>
                  <th className="p-3">المسجل</th>
                  <th className="p-3">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredTxs.map(tx => {
                  const isCredit = ['profit_share', 'capital_deposit', 'loan_to_company', 'partner_expense', 'capital_reinvestment'].includes(tx.type);

                  return (
                    <tr key={tx.id} className="hover:bg-slate-950/40 transition">
                      <td className="p-3 font-bold text-amber-400">{tx.voucherNumber}</td>
                      <td className="p-3 text-slate-300">{tx.date}</td>
                      <td className="p-3 font-sans font-semibold text-white">{tx.partnerName}</td>
                      <td className="p-3 font-sans">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          isCredit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {getTxTypeLabel(tx.type)}
                        </span>
                      </td>
                      <td className={`p-3 font-bold ${isCredit ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isCredit ? '+' : '-'}{tx.amount.toLocaleString()}
                      </td>
                      <td className="p-3 font-sans text-slate-400 text-[11px]">{tx.treasurySource || tx.paymentMethod}</td>
                      <td className="p-3 font-sans text-slate-300 max-w-xs truncate">{tx.description || '-'}</td>
                      <td className="p-3 font-sans text-slate-500 text-[11px]">{tx.recordedBy}</td>
                      <td className="p-3 font-sans">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setViewingVoucher(tx)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg cursor-pointer"
                            title="طباعة السند المالي"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`هل أنت متأكد من حذف السند ${tx.voucherNumber}؟`)) {
                                onDeleteTx(tx.id);
                              }
                            }}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded-lg cursor-pointer"
                            title="حذف السند"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Voucher Print Modal */}
      {viewingVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">سند مالي شريك رسمي ({viewingVoucher.voucherNumber})</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => safePrint('partner-voucher-print')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl cursor-pointer hover:bg-amber-400"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة السند</span>
                </button>
                <button onClick={() => setViewingVoucher(null)} className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div id="partner-voucher-print" className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-4 text-xs">
              {/* Header */}
              <div className="text-center border-b border-slate-800 pb-3 space-y-1">
                <h2 className="text-base font-black text-white">{settings.stationName || 'شركة المحطة الكهربائية'}</h2>
                <p className="text-xs text-amber-400 font-bold">سند صرف / قيد حسابات الشركاء</p>
                <span className="text-[10px] text-slate-400 font-mono">رقم السند: {viewingVoucher.voucherNumber} | التاريخ: {viewingVoucher.date}</span>
              </div>

              <div className="space-y-2 bg-slate-900 p-4 rounded-xl border border-slate-800 font-mono">
                <div className="flex justify-between font-sans">
                  <span className="text-slate-400">اسم الشريك:</span>
                  <strong className="text-white text-sm">{viewingVoucher.partnerName}</strong>
                </div>
                <div className="flex justify-between font-sans">
                  <span className="text-slate-400">نوع السند:</span>
                  <span className="text-amber-400 font-bold">{getTxTypeLabel(viewingVoucher.type)}</span>
                </div>
                <div className="flex justify-between font-sans">
                  <span className="text-slate-400">طريقة الدفع / الحساب:</span>
                  <span className="text-slate-200">{viewingVoucher.treasurySource || viewingVoucher.paymentMethod}</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between text-base font-bold">
                  <span className="font-sans text-white">المبلغ المرقوم:</span>
                  <span className="text-emerald-400">{viewingVoucher.amount.toLocaleString()} {currency}</span>
                </div>
                {viewingVoucher.description && (
                  <div className="pt-2 border-t border-slate-800 text-slate-300 font-sans">
                    <span className="text-slate-500 block text-[10px]">البيان والشرح:</span>
                    <p>{viewingVoucher.description}</p>
                  </div>
                )}
              </div>

              {/* Signatures */}
              <div className="pt-6 border-t border-slate-800 grid grid-cols-3 gap-4 text-center text-slate-400">
                <div>
                  <span className="block font-bold mb-4 text-slate-300">أمين الصندوق</span>
                  <div className="border-t border-dashed border-slate-700 pt-1">التوقيع</div>
                </div>
                <div>
                  <span className="block font-bold mb-4 text-slate-300">المحاسب المالي</span>
                  <div className="border-t border-dashed border-slate-700 pt-1">{viewingVoucher.recordedBy}</div>
                </div>
                <div>
                  <span className="block font-bold mb-4 text-slate-300">المستلم (الشريك)</span>
                  <div className="border-t border-dashed border-slate-700 pt-1">التوقيع والختم</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
