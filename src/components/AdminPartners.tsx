import React, { useState, useMemo } from 'react';
import { 
  Users, Plus, DollarSign, PieChart, TrendingUp, TrendingDown, ArrowUpRight, 
  ArrowDownLeft, Calendar, FileText, Printer, CheckCircle2, ShieldCheck, 
  AlertCircle, Edit3, Trash2, Search, Percent, Landmark, Wallet, Eye, Download, X,
  ArrowLeftRight, Scale, History, Calculator, Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Partner, PartnerTransaction, ProfitDistributionBatch, PartnerRole, PartnerStatus,
  SystemSettings, User, Expense, Purchase, MeterReading, Payment, AuditLog
} from '../types';
import { 
  syncPartnerToCloud, 
  deletePartnerFromCloud,
  syncBulkPartnersToCloud,
  syncPartnerTransactionToCloud,
  deletePartnerTransactionFromCloud,
  syncBulkPartnerTransactionsToCloud,
  syncProfitDistributionToCloud,
  deleteProfitDistributionFromCloud,
  syncAuditLogToCloud
} from '../lib/database';

import { PartnerEquityOverview } from './partners/PartnerEquityOverview';
import { PartnerRegistryTab } from './partners/PartnerRegistryTab';
import { ProfitDistributionWizardTab } from './partners/ProfitDistributionWizardTab';
import { PartnerTransactionsTab } from './partners/PartnerTransactionsTab';
import { PartnerStatementTab } from './partners/PartnerStatementTab';
import { 
  PartnerFormModal, 
  TransactionModal, 
  ShareCertificateModal, 
  ShareTransferModal, 
  PartnerSettlementModal 
} from './partners/PartnerModals';

interface AdminPartnersProps {
  settings: SystemSettings;
  currentUser: User;
  partners: Partner[];
  onUpdatePartners: (partners: Partner[]) => void;
  partnerTransactions: PartnerTransaction[];
  onUpdatePartnerTransactions: (txs: PartnerTransaction[]) => void;
  profitDistributions: ProfitDistributionBatch[];
  onUpdateProfitDistributions: (dists: ProfitDistributionBatch[]) => void;
  readings?: MeterReading[];
  payments?: Payment[];
  expenses?: Expense[];
  purchases?: Purchase[];
  onAddAuditLog?: (log: AuditLog) => void;
}

export const AdminPartners: React.FC<AdminPartnersProps> = ({
  settings,
  currentUser,
  partners = [],
  onUpdatePartners,
  partnerTransactions = [],
  onUpdatePartnerTransactions,
  profitDistributions = [],
  onUpdateProfitDistributions,
  readings = [],
  payments = [],
  expenses = [],
  purchases = [],
  onAddAuditLog
}) => {
  const [activeTab, setActiveTab] = useState<'registry' | 'distribution' | 'transactions' | 'statement'>('registry');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>(partners[0]?.id || '');

  // Modals state
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [defaultTxPartnerId, setDefaultTxPartnerId] = useState<string>('');
  
  const [certificatePartner, setCertificatePartner] = useState<Partner | null>(null);
  const [isShareTransferOpen, setIsShareTransferOpen] = useState(false);
  const [settlementPartner, setSettlementPartner] = useState<Partner | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const currency = settings.currency || 'ر.ي';

  // Total Equity Metrics
  const totalCapital = useMemo(() => {
    return partners.reduce((sum, p) => sum + (p.capitalContribution || 0), 0);
  }, [partners]);

  const totalSharePercentage = useMemo(() => {
    return partners.reduce((sum, p) => sum + (p.sharePercentage || 0), 0);
  }, [partners]);

  const totalDistributions = useMemo(() => {
    return profitDistributions.reduce((sum, d) => sum + (d.netDistributableProfit || 0), 0);
  }, [profitDistributions]);

  const totalDrawings = useMemo(() => {
    return partnerTransactions
      .filter(tx => tx.type === 'drawing' || tx.type === 'capital_reduction')
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
  }, [partnerTransactions]);

  // Derived balances per partner
  const partnerBalances = useMemo(() => {
    const balances: Record<string, { capital: number; drawings: number; profits: number; currentBalance: number; roi: number }> = {};
    
    partners.forEach(partner => {
      balances[partner.id] = {
        capital: partner.capitalContribution || 0,
        drawings: 0,
        profits: 0,
        currentBalance: partner.capitalContribution || 0,
        roi: 0
      };
    });

    partnerTransactions.forEach(tx => {
      if (!balances[tx.partnerId]) {
        balances[tx.partnerId] = { capital: 0, drawings: 0, profits: 0, currentBalance: 0, roi: 0 };
      }

      if (tx.type === 'capital_deposit' || tx.type === 'capital_reinvestment') {
        balances[tx.partnerId].capital += tx.amount;
        balances[tx.partnerId].currentBalance += tx.amount;
      } else if (tx.type === 'capital_reduction') {
        balances[tx.partnerId].capital -= tx.amount;
        balances[tx.partnerId].currentBalance -= tx.amount;
      } else if (tx.type === 'drawing' || tx.type === 'profit_payout') {
        balances[tx.partnerId].drawings += tx.amount;
        balances[tx.partnerId].currentBalance -= tx.amount;
      } else if (tx.type === 'profit_share') {
        balances[tx.partnerId].profits += tx.amount;
        balances[tx.partnerId].currentBalance += tx.amount;
      } else if (tx.type === 'loan_to_company' || tx.type === 'partner_expense') {
        balances[tx.partnerId].currentBalance += tx.amount;
      } else if (tx.type === 'loan_repayment') {
        balances[tx.partnerId].currentBalance -= tx.amount;
      }
    });

    // Compute individual ROI
    Object.keys(balances).forEach(id => {
      const b = balances[id];
      b.roi = b.capital > 0 ? Number(((b.profits / b.capital) * 100).toFixed(1)) : 0;
    });

    return balances;
  }, [partners, partnerTransactions]);

  // Log audit helper
  const logAction = (action: string, details: string) => {
    if (onAddAuditLog) {
      const log: AuditLog = {
        id: 'audit_' + Date.now(),
        timestamp: new Date().toISOString(),
        userId: currentUser.id || 'admin',
        username: currentUser.name || 'المدير',
        action,
        details
      };
      onAddAuditLog(log);
      syncAuditLogToCloud(log);
    }
  };

  /* =========================================================================
     Handlers: Partner CRUD & Actions
     ========================================================================= */
  const handleSavePartner = async (partnerData: any) => {
    setIsSyncingCloud(true);
    try {
      let updatedList: Partner[];
      if (editingPartner) {
        updatedList = partners.map(p => p.id === editingPartner.id ? { ...p, ...partnerData } : p);
        logAction('تعديل بيانات شريك', `تم تعديل بيانات الشريك ${partnerData.name} (${partnerData.code})`);
        await syncPartnerToCloud({ ...editingPartner, ...partnerData });
        showToast(`تم تعديل وحفظ بيانات الشريك "${partnerData.name}" في قاعدة البيانات بنجاح`, 'success');
      } else {
        const newPartner: Partner = {
          id: 'partner_' + Date.now(),
          ...partnerData
        };
        updatedList = [...partners, newPartner];
        logAction('تسجيل شريك جديد', `تم تسجيل الشريك ${newPartner.name} بحصة ${newPartner.sharePercentage}%`);
        await syncPartnerToCloud(newPartner);
        showToast(`تم تسجيل الشريك "${newPartner.name}" وحفظه في قاعدة البيانات السحابية بنجاح`, 'success');
      }
      onUpdatePartners(updatedList);
    } catch (err) {
      console.error('Error saving partner to database:', err);
      showToast('تعذر الحفظ في قاعدة البيانات، يرجى التحقق من الاتصال', 'error');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleDeletePartner = async (partnerId: string) => {
    const p = partners.find(x => x.id === partnerId);
    if (!p) return;
    if (!window.confirm(`هل أنت متأكد من حذف الشريك "${p.name}"؟ سيتم حذف بياناته وسجلاته المرتبطة نهائياً من قاعدة البيانات.`)) {
      return;
    }
    setIsSyncingCloud(true);
    try {
      const updated = partners.filter(x => x.id !== partnerId);
      onUpdatePartners(updated);
      await deletePartnerFromCloud(partnerId);
      logAction('حذف شريك', `تم حذف الشريك ${p.name}`);
      showToast(`تم حذف الشريك "${p.name}" من قاعدة البيانات السحابية`, 'info');
    } catch (err) {
      console.error('Error deleting partner from database:', err);
      showToast('تعذر الحذف من قاعدة البيانات', 'error');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Auto Rebalance Shares to 100%
  const handleAutoRebalanceShares = async () => {
    if (partners.length === 0) return;
    const currentSum = partners.reduce((s, p) => s + (p.sharePercentage || 0), 0);
    if (currentSum === 0) return;

    if (!window.confirm(`إجمالي الحصص الحالي هو ${currentSum}%. هل تريد إعادة توزيع النسب بالتناسب لتصل إلى 100% بالضبط وحفظها في قاعدة البيانات؟`)) {
      return;
    }

    setIsSyncingCloud(true);
    try {
      const rebalanced: Partner[] = partners.map(p => ({
        ...p,
        sharePercentage: Number(((p.sharePercentage / currentSum) * 100).toFixed(2))
      }));

      onUpdatePartners(rebalanced);
      await syncBulkPartnersToCloud(rebalanced);
      logAction('موازنة حصص الشركاء', `تمت إعادة موازنة حصص ${partners.length} شركاء لتصل 100%`);
      showToast('تمت موازنة حصص الشركاء وحفظها في قاعدة البيانات السحابية', 'success');
    } catch (err) {
      showToast('تعذر موازنة الحصص في قاعدة البيانات', 'error');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Share Transfer between partners
  const handleExecuteShareTransfer = async (
    sourceId: string, 
    targetId: string, 
    transferPercent: number, 
    transferAmount: number, 
    notes: string
  ) => {
    const sourcePartner = partners.find(p => p.id === sourceId);
    const targetPartner = partners.find(p => p.id === targetId);
    if (!sourcePartner || !targetPartner) return;

    setIsSyncingCloud(true);
    try {
      const newSourcePercent = Number((sourcePartner.sharePercentage - transferPercent).toFixed(2));
      const newTargetPercent = Number((targetPartner.sharePercentage + transferPercent).toFixed(2));

      const updatedPartners = partners.map(p => {
        if (p.id === sourceId) return { ...p, sharePercentage: newSourcePercent };
        if (p.id === targetId) return { ...p, sharePercentage: newTargetPercent };
        return p;
      });

      // Create a partner transaction record for documentation
      const voucherNumber = `TRF-${Date.now().toString().slice(-6)}`;
      const tx: PartnerTransaction = {
        id: 'tx_' + Date.now(),
        voucherNumber,
        partnerId: sourceId,
        partnerName: sourcePartner.name,
        type: 'share_transfer',
        amount: transferAmount,
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'journal_entry',
        treasurySource: 'قيد دفتري ونقل حصة',
        description: `تنازل عن حصة بنسبة ${transferPercent}% لصالح الشريك ${targetPartner.name}`,
        targetPartnerId: targetId,
        targetPartnerName: targetPartner.name,
        recordedBy: currentUser.name,
        notes: notes || 'محضر تنازل ونقل حصص رسمي'
      };

      const newTxs = [tx, ...partnerTransactions];

      onUpdatePartners(updatedPartners);
      onUpdatePartnerTransactions(newTxs);

      await syncBulkPartnersToCloud(updatedPartners);
      await syncPartnerTransactionToCloud(tx);

      logAction('تنازل ونقل حصص', `تنازل الشريك ${sourcePartner.name} عن ${transferPercent}% لصالح ${targetPartner.name}`);
      showToast(`تم توثيق وحفظ قيد التنازل عن الحصص بين (${sourcePartner.name}) و(${targetPartner.name}) في قاعدة البيانات`, 'success');
    } catch (err) {
      showToast('تعذر حفظ قيد التنازل في قاعدة البيانات', 'error');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Partner Settlement & Exit
  const handleConfirmExit = async (partnerId: string, settlementAmount: number, notes: string) => {
    const p = partners.find(x => x.id === partnerId);
    if (!p) return;

    setIsSyncingCloud(true);
    try {
      const updatedPartners = partners.map(x => x.id === partnerId ? {
        ...x,
        status: 'withdrawn' as PartnerStatus,
        exitDate: new Date().toISOString().split('T')[0],
        exitSettlementAmount: settlementAmount,
        notes: (x.notes ? x.notes + ' | ' : '') + `تخارج وتصفية نهائية بتاريخ ${new Date().toISOString().split('T')[0]}`
      } : x);

      // Create settlement drawing voucher
      const voucherNumber = `SETTLE-${Date.now().toString().slice(-6)}`;
      const tx: PartnerTransaction = {
        id: 'tx_' + Date.now(),
        voucherNumber,
        partnerId: p.id,
        partnerName: p.name,
        type: 'capital_reduction',
        amount: settlementAmount,
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'bank_transfer',
        treasurySource: 'الحساب البنكي الرئيسي / تصفية نهائية',
        description: `سداد مستحقات التخارج والتصفية النهائية للشريك ${p.name}`,
        recordedBy: currentUser.name,
        notes
      };

      const newTxs = [tx, ...partnerTransactions];

      onUpdatePartners(updatedPartners);
      onUpdatePartnerTransactions(newTxs);

      await syncBulkPartnersToCloud(updatedPartners);
      await syncPartnerTransactionToCloud(tx);

      logAction('تخارج وتصفية شريك', `تمت تصفية حقوق وتخارج الشريك ${p.name} بمبلغ ${settlementAmount.toLocaleString()} ${currency}`);
      showToast(`تم حفظ وتوثيق محضر تخارج وتصفية الشريك "${p.name}" في قاعدة البيانات بنجاح`, 'success');
    } catch (err) {
      showToast('تعذر حفظ محضر التخارج في قاعدة البيانات', 'error');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Transaction Save
  const handleSaveTransaction = async (txData: any) => {
    setIsSyncingCloud(true);
    try {
      const partner = partners.find(p => p.id === txData.partnerId);
      const voucherNumber = `TX-${new Date().getFullYear()}-${String(partnerTransactions.length + 1).padStart(4, '0')}`;
      
      const newTx: PartnerTransaction = {
        id: 'tx_' + Date.now(),
        voucherNumber,
        partnerName: partner ? partner.name : '',
        recordedBy: currentUser.name,
        ...txData
      };

      const updatedTxs = [newTx, ...partnerTransactions];
      onUpdatePartnerTransactions(updatedTxs);
      await syncPartnerTransactionToCloud(newTx);
      logAction('تسجيل سند شريك', `سند ${newTx.voucherNumber} للشريك ${newTx.partnerName} بمبلغ ${newTx.amount}`);
      showToast(`تم حفظ السند المالي رقم (${newTx.voucherNumber}) في قاعدة البيانات بنجاح`, 'success');
    } catch (err) {
      showToast('تعذر حفظ السند في قاعدة البيانات', 'error');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    const tx = partnerTransactions.find(t => t.id === txId);
    if (!window.confirm('هل تريد حذف هذا السند نهائياً من قاعدة البيانات؟')) return;
    setIsSyncingCloud(true);
    try {
      const updated = partnerTransactions.filter(t => t.id !== txId);
      onUpdatePartnerTransactions(updated);
      await deletePartnerTransactionFromCloud(txId);
      if (tx) {
        logAction('حذف سند شريك', `تم حذف السند ${tx.voucherNumber}`);
        showToast(`تم حذف السند رقم (${tx.voucherNumber}) من قاعدة البيانات`, 'info');
      }
    } catch (err) {
      showToast('تعذر حذف السند من قاعدة البيانات', 'error');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  // Distribution Execution
  const handleExecuteDistribution = async (batch: ProfitDistributionBatch) => {
    setIsSyncingCloud(true);
    try {
      const updatedBatches = [batch, ...profitDistributions];
      onUpdateProfitDistributions(updatedBatches);
      await syncProfitDistributionToCloud(batch);

      // Automatically generate Partner Transactions for each partner share
      const newTxs: PartnerTransaction[] = [];
      const updatedPartnersList = [...partners];

      batch.partnerShares.forEach((share, idx) => {
        if (share.totalShare > 0) {
          if (batch.payoutChoice === 'reinvested') {
            // Reinvestment: increases capital contribution
            const pIndex = updatedPartnersList.findIndex(p => p.id === share.partnerId);
            if (pIndex !== -1) {
              updatedPartnersList[pIndex] = {
                ...updatedPartnersList[pIndex],
                capitalContribution: (updatedPartnersList[pIndex].capitalContribution || 0) + share.totalShare
              };
            }

            newTxs.push({
              id: `tx_${Date.now()}_${idx}`,
              voucherNumber: `REINV-${batch.batchNumber.replace('DIST-', '')}-${String(idx + 1).padStart(2, '0')}`,
              partnerId: share.partnerId,
              partnerName: share.partnerName,
              type: 'capital_reinvestment',
              amount: share.totalShare,
              date: batch.endDate || new Date().toISOString().split('T')[0],
              paymentMethod: 'capital_credit',
              treasurySource: 'رسملة وإعادة استثمار الأرباح',
              description: `رسملة وزيادة رأس المال من أرباح ${batch.periodLabel}`,
              distributionBatchId: batch.id,
              recordedBy: currentUser.name
            });
          } else if (batch.payoutChoice === 'paid_in_cash') {
            // Direct cash / bank payout
            newTxs.push({
              id: `tx_${Date.now()}_${idx}`,
              voucherNumber: `PAY-${batch.batchNumber.replace('DIST-', '')}-${String(idx + 1).padStart(2, '0')}`,
              partnerId: share.partnerId,
              partnerName: share.partnerName,
              type: 'profit_payout',
              amount: share.totalShare,
              date: batch.endDate || new Date().toISOString().split('T')[0],
              paymentMethod: 'cash',
              treasurySource: 'الصندوق الرئيسي',
              description: `صرف نقدي فوري لأرباح ${batch.periodLabel}`,
              distributionBatchId: batch.id,
              recordedBy: currentUser.name
            });
          } else {
            // Credited to Partner Current Account
            newTxs.push({
              id: `tx_${Date.now()}_${idx}`,
              voucherNumber: `CRD-${batch.batchNumber.replace('DIST-', '')}-${String(idx + 1).padStart(2, '0')}`,
              partnerId: share.partnerId,
              partnerName: share.partnerName,
              type: 'profit_share',
              amount: share.totalShare,
              date: batch.endDate || new Date().toISOString().split('T')[0],
              paymentMethod: 'journal_entry',
              treasurySource: 'الحساب الجاري للشريك',
              description: `استحقاق وقيد أرباح ${batch.periodLabel}`,
              distributionBatchId: batch.id,
              recordedBy: currentUser.name
            });
          }
        }
      });

      if (newTxs.length > 0) {
        const combinedTxs = [...newTxs, ...partnerTransactions];
        onUpdatePartnerTransactions(combinedTxs);
        await syncBulkPartnerTransactionsToCloud(newTxs);
      }

      if (batch.payoutChoice === 'reinvested') {
        onUpdatePartners(updatedPartnersList);
        await syncBulkPartnersToCloud(updatedPartnersList);
      }

      logAction('اعتماد توزيع أرباح', `تم اعتماد وترحيل محضر التوزيع ${batch.batchNumber} بمبلغ ${batch.netDistributableProfit.toLocaleString()} ${currency}`);
      showToast(`تم ترحيل محضر التوزيع رقم (${batch.batchNumber}) وقيد مستحقات كافة الشركاء في قاعدة البيانات بنجاح`, 'success');
    } catch (err) {
      showToast('تعذر اعتماد التوزيع في قاعدة البيانات', 'error');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    const batch = profitDistributions.find(b => b.id === batchId);
    if (!window.confirm(`هل أنت متأكد من حذف محضر التوزيع (${batch?.batchNumber || ''}) نهائياً من قاعدة البيانات؟`)) return;
    setIsSyncingCloud(true);
    try {
      const updatedBatches = profitDistributions.filter(b => b.id !== batchId);
      onUpdateProfitDistributions(updatedBatches);
      await deleteProfitDistributionFromCloud(batchId);

      // Cleanup auto-generated transactions
      const remainingTxs = partnerTransactions.filter(tx => tx.distributionBatchId !== batchId);
      onUpdatePartnerTransactions(remainingTxs);
      
      if (batch) {
        logAction('حذف محضر توزيع', `تم حذف محضر التوزيع ${batch.batchNumber}`);
        showToast(`تم حذف محضر التوزيع (${batch.batchNumber}) وإلغاء قيوده من قاعدة البيانات`, 'info');
      }
    } catch (err) {
      showToast('تعذر حذف محضر التوزيع من قاعدة البيانات', 'error');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between transition-all duration-300 shadow-lg ${
          toastMessage.type === 'success' ? 'bg-emerald-950/80 border border-emerald-500/30 text-emerald-300' :
          toastMessage.type === 'error' ? 'bg-rose-950/80 border border-rose-500/30 text-rose-300' :
          'bg-cyan-950/80 border border-cyan-500/30 text-cyan-300'
        }`}>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-current animate-pulse"></span>
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white text-xs px-2 py-1">
            ✕
          </button>
        </div>
      )}

      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-gradient-to-br from-amber-500/20 to-amber-600/10 text-amber-400 rounded-2xl border border-amber-500/20 shadow-inner">
            <Landmark className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white">إدارة الشركاء ورأس المال وتوزيع الأرباح</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono font-bold text-xs border border-emerald-500/20 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isSyncingCloud ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`}></span>
                {isSyncingCloud ? 'جاري المزامنة مع Firestore...' : 'قاعدة بيانات Firestore السحابية'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              حفظ مباشر في قاعدة البيانات السحابية (Firestore) بدون الاعتماد على ذاكرة المتصفح
            </p>
          </div>
        </div>

        {/* Top Action Tabs */}
        <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 self-stretch sm:self-auto overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('registry')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'registry'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>سجل الشركاء والمساهمين</span>
          </button>

          <button
            onClick={() => setActiveTab('distribution')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'distribution'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>معالج توزيع الأرباح والاحتياطيات</span>
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'transactions'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>دفتر أستاذ وسندات الشركاء</span>
          </button>

          <button
            onClick={() => setActiveTab('statement')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'statement'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>كشف الحساب المالي المفصل</span>
          </button>
        </div>
      </div>

      {/* Global Equity Analytics Header */}
      <PartnerEquityOverview
        partners={partners}
        partnerBalances={partnerBalances}
        totalCapital={totalCapital}
        totalSharePercentage={totalSharePercentage}
        totalDrawings={totalDrawings}
        totalDistributions={totalDistributions}
        settings={settings}
        onAutoRebalanceShares={handleAutoRebalanceShares}
        onSelectPartnerForStatement={partnerId => {
          setSelectedPartnerId(partnerId);
          setActiveTab('statement');
        }}
        onOpenShareTransfer={() => setIsShareTransferOpen(true)}
      />

      {/* Main Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'registry' && (
          <motion.div
            key="registry-tab"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <PartnerRegistryTab
              partners={partners}
              partnerBalances={partnerBalances}
              settings={settings}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onOpenAddPartner={() => {
                setEditingPartner(null);
                setIsPartnerModalOpen(true);
              }}
              onEditPartner={partner => {
                setEditingPartner(partner);
                setIsPartnerModalOpen(true);
              }}
              onDeletePartner={handleDeletePartner}
              onOpenCertificate={partner => setCertificatePartner(partner)}
              onOpenSettlement={partner => setSettlementPartner(partner)}
              onSelectPartnerForStatement={partnerId => {
                setSelectedPartnerId(partnerId);
                setActiveTab('statement');
              }}
              onQuickDrawing={partnerId => {
                setDefaultTxPartnerId(partnerId);
                setIsTxModalOpen(true);
              }}
            />
          </motion.div>
        )}

        {activeTab === 'distribution' && (
          <motion.div
            key="distribution-tab"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <ProfitDistributionWizardTab
              partners={partners}
              profitDistributions={profitDistributions}
              settings={settings}
              readings={readings}
              payments={payments}
              expenses={expenses}
              purchases={purchases}
              currentUser={currentUser}
              onExecuteDistribution={handleExecuteDistribution}
              onDeleteBatch={handleDeleteBatch}
            />
          </motion.div>
        )}

        {activeTab === 'transactions' && (
          <motion.div
            key="transactions-tab"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <PartnerTransactionsTab
              partners={partners}
              partnerTransactions={partnerTransactions}
              settings={settings}
              currentUser={currentUser}
              onOpenAddTx={() => {
                setDefaultTxPartnerId(partners[0]?.id || '');
                setIsTxModalOpen(true);
              }}
              onDeleteTx={handleDeleteTransaction}
            />
          </motion.div>
        )}

        {activeTab === 'statement' && (
          <motion.div
            key="statement-tab"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <PartnerStatementTab
              partners={partners}
              partnerTransactions={partnerTransactions}
              partnerBalances={partnerBalances}
              settings={settings}
              selectedPartnerId={selectedPartnerId}
              setSelectedPartnerId={setSelectedPartnerId}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Modals */}
      {isPartnerModalOpen && (
        <PartnerFormModal
          isOpen={isPartnerModalOpen}
          onClose={() => setIsPartnerModalOpen(false)}
          editingPartner={editingPartner}
          partners={partners}
          totalSharePercentage={totalSharePercentage}
          currency={currency}
          onSave={handleSavePartner}
        />
      )}

      {isTxModalOpen && (
        <TransactionModal
          isOpen={isTxModalOpen}
          onClose={() => setIsTxModalOpen(false)}
          partners={partners}
          currency={currency}
          defaultPartnerId={defaultTxPartnerId}
          currentUser={currentUser}
          onSave={handleSaveTransaction}
        />
      )}

      {certificatePartner && (
        <ShareCertificateModal
          partner={certificatePartner}
          settings={settings}
          totalCapital={totalCapital}
          onClose={() => setCertificatePartner(null)}
        />
      )}

      {isShareTransferOpen && (
        <ShareTransferModal
          isOpen={isShareTransferOpen}
          onClose={() => setIsShareTransferOpen(false)}
          partners={partners}
          currency={currency}
          currentUser={currentUser}
          onExecuteTransfer={handleExecuteShareTransfer}
        />
      )}

      {settlementPartner && (
        <PartnerSettlementModal
          partner={settlementPartner}
          balanceInfo={partnerBalances[settlementPartner.id] || { capital: settlementPartner.capitalContribution, drawings: 0, profits: 0, currentBalance: settlementPartner.capitalContribution }}
          currency={currency}
          onClose={() => setSettlementPartner(null)}
          onConfirmExit={handleConfirmExit}
        />
      )}
    </div>
  );
};
