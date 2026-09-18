import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Zap, Plus, Search, Filter, Printer, Edit3, Trash2, CheckCircle2,
  Clock, DollarSign, Wrench, Package, Sparkles, Building, ArrowUpRight,
  TrendingUp, Users, ShieldAlert, CreditCard, ChevronRight, FileText,
  Boxes, Phone, MapPin, Receipt, ArrowDownRight, Layers, X
} from 'lucide-react';
import {
  ServiceConnection, ConnectionMaterialItem, InventoryItem,
  InventoryTransaction, Subscriber, Employee, SystemSettings,
  AuditLog, User, ConnectionInstallment
} from '../types';
import { DEFAULT_CONNECTION_TEMPLATES, SERVICE_TYPE_LABELS } from './connection/connectionTemplates';
import { ConnectionReceiptModal } from './connection/ConnectionReceiptModal';
import { ConnectionFormModal } from './connection/ConnectionFormModal';
import { syncConnectionToCloud, deleteConnectionFromCloud, syncSubscriberToCloud, syncInventoryItemToCloud, syncInventoryTxToCloud, syncAuditLogToCloud } from '../lib/database';

interface Props {
  connections: ServiceConnection[];
  onUpdateConnections: (conns: ServiceConnection[]) => void;
  settings: SystemSettings;
  onUpdateSettings?: (settings: SystemSettings) => void;
  subscribers: Subscriber[];
  onUpdateSubscribers: (subs: Subscriber[]) => void;
  inventory: InventoryItem[];
  onUpdateInventory: (items: InventoryItem[]) => void;
  inventoryTransactions: InventoryTransaction[];
  onUpdateInventoryTransactions: (txs: InventoryTransaction[]) => void;
  employees: Employee[];
  currentUser?: User;
  onAddAuditLog: (log: AuditLog) => void;
  availableMonths?: string[];
}

export const ServiceConnectionManager: React.FC<Props> = ({
  connections = [],
  onUpdateConnections,
  settings,
  subscribers = [],
  onUpdateSubscribers,
  inventory = [],
  onUpdateInventory,
  inventoryTransactions = [],
  onUpdateInventoryTransactions,
  employees = [],
  currentUser,
  onAddAuditLog,
  availableMonths = []
}) => {
  // Navigation sub-tab
  const [subTab, setSubTab] = useState<'registry' | 'analytics' | 'packages' | 'receivables'>('registry');

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'has_remaining' | 'pending'>('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingConnection, setEditingConnection] = useState<ServiceConnection | null>(null);
  const [receiptConnection, setReceiptConnection] = useState<ServiceConnection | null>(null);

  // Settlement Modal state
  const [settlingConnection, setSettlingConnection] = useState<ServiceConnection | null>(null);
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settleMethod, setSettleMethod] = useState<'cash' | 'bank_transfer'>('cash');
  const [settleBankId, setSettleBankId] = useState<string>('');
  const [settleNotes, setSettleNotes] = useState<string>('');

  // Extract all unique months from connections
  const connectionMonths = useMemo(() => {
    const set = new Set<string>();
    connections.forEach(c => {
      if (c.date && c.date.length >= 7) {
        set.add(c.date.substring(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [connections]);

  // Filtered connections list
  const filteredConnections = useMemo(() => {
    return connections.filter(c => {
      // Search
      const searchLower = searchTerm.toLowerCase().trim();
      const matchSearch = !searchLower ||
        c.subscriberName.toLowerCase().includes(searchLower) ||
        (c.meterNumber && c.meterNumber.toLowerCase().includes(searchLower)) ||
        (c.phone && c.phone.includes(searchLower)) ||
        (c.voucherNo && c.voucherNo.toLowerCase().includes(searchLower)) ||
        (c.assignedTechnician && c.assignedTechnician.toLowerCase().includes(searchLower));

      // Status
      const rem = c.remainingAmount !== undefined ? c.remainingAmount : Math.max(0, c.totalFee - c.paidAmount);
      let matchStatus = true;
      if (statusFilter === 'completed') {
        matchStatus = rem === 0 && c.paidAmount > 0;
      } else if (statusFilter === 'has_remaining') {
        matchStatus = rem > 0;
      } else if (statusFilter === 'pending') {
        matchStatus = c.status === 'pending';
      }

      // Service Type
      const matchType = serviceTypeFilter === 'all' || c.serviceType === serviceTypeFilter;

      // Month
      const matchMonth = monthFilter === 'all' || (c.date && c.date.startsWith(monthFilter));

      return matchSearch && matchStatus && matchType && matchMonth;
    });
  }, [connections, searchTerm, statusFilter, serviceTypeFilter, monthFilter]);

  // Overall Financial Statistics
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let totalPaid = 0;
    let totalRemaining = 0;
    let totalCash = 0;
    let totalBank = 0;
    let totalConnectionFees = 0;
    let totalMeterCosts = 0;
    let totalInsurance = 0;
    let totalLaborFees = 0;
    let totalMaterialsFees = 0;

    const byServiceType: Record<string, { count: number; total: number; paid: number }> = {};

    connections.forEach(c => {
      const tot = Number(c.totalFee || 0);
      const paid = Number(c.paidAmount || 0);
      const rem = c.remainingAmount !== undefined ? Number(c.remainingAmount) : Math.max(0, tot - paid);

      totalRevenue += tot;
      totalPaid += paid;
      totalRemaining += rem;

      if (c.paymentMethod === 'bank_transfer') {
        totalBank += paid;
      } else {
        totalCash += paid;
      }

      totalConnectionFees += Number(c.connectionFee || 0);
      totalMeterCosts += Number(c.meterCost || 0);
      totalInsurance += Number(c.insuranceDeposit || 0);
      totalLaborFees += Number(c.installationLaborFee || 0);
      totalMaterialsFees += Number(c.materialsFee || 0);

      const st = c.serviceType || 'new_connection';
      if (!byServiceType[st]) {
        byServiceType[st] = { count: 0, total: 0, paid: 0 };
      }
      byServiceType[st].count += 1;
      byServiceType[st].total += tot;
      byServiceType[st].paid += paid;
    });

    return {
      totalRevenue,
      totalPaid,
      totalRemaining,
      totalCash,
      totalBank,
      totalConnectionFees,
      totalMeterCosts,
      totalInsurance,
      totalLaborFees,
      totalMaterialsFees,
      byServiceType,
      count: connections.length,
      pendingCount: connections.filter(c => (c.remainingAmount ?? (c.totalFee - c.paidAmount)) > 0).length
    };
  }, [connections]);

  // Save new or edited connection
  const handleSaveConnection = async (
    data: Partial<ServiceConnection>,
    materialsList: ConnectionMaterialItem[],
    autoCreateSub: boolean
  ) => {
    const isEdit = !!editingConnection;
    const now = new Date();
    const dateStr = data.date || now.toISOString().substring(0, 10);
    const connMonth = dateStr.substring(0, 7);

    // Check closed periods
    if (settings.closedPeriods && settings.closedPeriods.includes(connMonth)) {
      alert(`⚠️ لا يمكن تعديل أو إضافة طلب في الشهر المقفل مالياً (${connMonth}).`);
      return;
    }

    const totFee = Number(data.totalFee || 0);
    const pdAmt = Number(data.paidAmount || 0);
    const remAmt = Math.max(0, totFee - pdAmt);
    const statusVal = pdAmt >= totFee ? 'completed' : 'pending';

    const matSummary = materialsList.map(m => `${m.quantity} ${m.unit} ${m.name}`).join(' + ');

    if (isEdit && editingConnection) {
      const updated: ServiceConnection = {
        ...editingConnection,
        ...data,
        totalFee: totFee,
        paidAmount: pdAmt,
        remainingAmount: remAmt,
        materialsList,
        materialsUsed: matSummary || editingConnection.materialsUsed || '',
        status: statusVal
      };

      const updatedList = connections.map(c => c.id === updated.id ? updated : c);
      onUpdateConnections(updatedList);
      syncConnectionToCloud(updated);

      const log: AuditLog = {
        id: `log-${Date.now()}`,
        userId: currentUser?.id || 'admin',
        username: currentUser?.username || 'الإدارة',
        action: 'تعديل سند إدخال خدمة',
        details: `تم تعديل طلب إدخال الخدمة رقم ${updated.voucherNo || updated.id} للمشترك ${updated.subscriberName}`,
        timestamp: now.toISOString().replace('T', ' ').substring(0, 16)
      };
      onAddAuditLog(log);
      syncAuditLogToCloud(log);

      setEditingConnection(null);
    } else {
      // New Connection
      const newId = `conn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newVoucherNo = data.voucherNo || `CON-${new Date().getFullYear()}-${(connections.length + 1).toString().padStart(4, '0')}`;

      let linkedSubId = data.subscriberId;

      // Auto-create subscriber if requested
      if (autoCreateSub && data.subscriberName) {
        const newSubId = `sub-${Date.now()}`;
        const newSub: Subscriber = {
          id: newSubId,
          name: data.subscriberName.trim(),
          phone: data.phone || '',
          meterNumber: data.meterNumber || `M-${Date.now().toString().slice(-5)}`,
          zone: data.zone || settings.zones?.[0] || 'المنطقة الأولى',
          tariffType: (data.tariffType as any) || 'residential',
          createdAt: dateStr,
          initialReading: 0,
          currentReading: 0,
          currentBalance: remAmt > 0 ? -remAmt : 0,
          status: 'active'
        };

        const updatedSubs = [...subscribers, newSub];
        onUpdateSubscribers(updatedSubs);
        syncSubscriberToCloud(newSub);
        linkedSubId = newSubId;
      }

      // Warehouse auto-deduction
      if (data.deductMaterialsFromInventory && materialsList.length > 0) {
        let updatedInv = [...inventory];
        const newTxs: InventoryTransaction[] = [];

        materialsList.forEach(m => {
          if (m.itemId) {
            const idx = updatedInv.findIndex(i => i.id === m.itemId);
            if (idx !== -1) {
              const prevQty = updatedInv[idx].quantity;
              const deductQty = Number(m.quantity || 0);
              const newQty = Math.max(0, prevQty - deductQty);

              updatedInv[idx] = {
                ...updatedInv[idx],
                quantity: newQty,
                lastUpdated: dateStr
              };

              syncInventoryItemToCloud(updatedInv[idx]);

              const tx: InventoryTransaction = {
                id: `itx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                itemId: m.itemId,
                itemName: updatedInv[idx].name,
                type: 'out',
                quantity: deductQty,
                date: dateStr,
                refNo: `صرف إدخال خدمة (${newVoucherNo})`,
                notes: `صرف للمشترك ${data.subscriberName} - فني: ${data.assignedTechnician || 'غير محدد'}`,
                technician: data.assignedTechnician || '',
                subscriberName: data.subscriberName,
                user: currentUser?.username || 'admin'
              };
              newTxs.push(tx);
              syncInventoryTxToCloud(tx);
            }
          }
        });

        onUpdateInventory(updatedInv);
        onUpdateInventoryTransactions([...inventoryTransactions, ...newTxs]);
      }

      const newConnectionObj: ServiceConnection = {
        id: newId,
        voucherNo: newVoucherNo,
        subscriberId: linkedSubId || `sub-${Date.now()}`,
        subscriberName: data.subscriberName?.trim() || '',
        phone: data.phone || '',
        meterNumber: data.meterNumber || '',
        zone: data.zone || settings.zones?.[0] || 'المنطقة الأولى',
        tariffType: data.tariffType || 'residential',
        serviceType: data.serviceType || 'new_connection',
        connectionFee: Number(data.connectionFee || 0),
        meterCost: Number(data.meterCost || 0),
        insuranceDeposit: Number(data.insuranceDeposit || 0),
        installationLaborFee: Number(data.installationLaborFee || 0),
        materialsFee: Number(data.materialsFee || 0),
        otherFees: Number(data.otherFees || 0),
        totalFee: totFee,
        paidAmount: pdAmt,
        remainingAmount: remAmt,
        date: dateStr,
        materialsUsed: matSummary,
        materialsList: materialsList,
        deductMaterialsFromInventory: !!data.deductMaterialsFromInventory,
        assignedTechnician: data.assignedTechnician || '',
        paymentMethod: data.paymentMethod || 'cash',
        bankAccountId: data.bankAccountId || '',
        notes: data.notes || '',
        status: statusVal,
        autoCreatedSubscriber: autoCreateSub,
        recordedBy: currentUser?.username || 'admin',
        createdAt: now.toISOString()
      };

      const updatedList = [newConnectionObj, ...connections];
      onUpdateConnections(updatedList);
      syncConnectionToCloud(newConnectionObj);

      const log: AuditLog = {
        id: `log-${Date.now()}`,
        userId: currentUser?.id || 'admin',
        username: currentUser?.username || 'الإدارة',
        action: 'تسجيل سند إدخال خدمة جديد',
        details: `تم إنشاء سند إدخال خدمة رقم ${newVoucherNo} بمبلغ ${totFee.toLocaleString()} ${settings.currency} للمشترك ${data.subscriberName}`,
        timestamp: now.toISOString().replace('T', ' ').substring(0, 16)
      };
      onAddAuditLog(log);
      syncAuditLogToCloud(log);

      setShowAddModal(false);
      // Auto open receipt preview
      setReceiptConnection(newConnectionObj);
    }
  };

  // Settle remaining installment
  const handleSettleInstallment = async () => {
    if (!settlingConnection || settleAmount <= 0) return;

    const now = new Date();
    const dateStr = now.toISOString().substring(0, 10);
    const connMonth = settlingConnection.date?.substring(0, 7) || dateStr.substring(0, 7);

    if (settings.closedPeriods && settings.closedPeriods.includes(connMonth)) {
      alert(`⚠️ لا يمكن تعديل أو تحصيل سند في شهر مقفل مالياً (${connMonth}).`);
      return;
    }

    const currentPaid = Number(settlingConnection.paidAmount || 0);
    const total = Number(settlingConnection.totalFee || 0);
    const newPaid = currentPaid + settleAmount;
    const newRemaining = Math.max(0, total - newPaid);

    const installment: ConnectionInstallment = {
      id: `inst-${Date.now()}`,
      date: dateStr,
      amount: settleAmount,
      paymentMethod: settleMethod,
      bankAccountId: settleBankId,
      notes: settleNotes || 'تحصيل دفعة متبقية من رسوم التوصيل',
      recordedBy: currentUser?.username || 'admin',
      receiptNumber: `REC-${Date.now().toString().slice(-5)}`
    };

    const updatedConn: ServiceConnection = {
      ...settlingConnection,
      paidAmount: newPaid,
      remainingAmount: newRemaining,
      status: newRemaining === 0 ? 'completed' : settlingConnection.status,
      installments: [...(settlingConnection.installments || []), installment]
    };

    const updatedList = connections.map(c => c.id === updatedConn.id ? updatedConn : c);
    onUpdateConnections(updatedList);
    syncConnectionToCloud(updatedConn);

    const log: AuditLog = {
      id: `log-${Date.now()}`,
      userId: currentUser?.id || 'admin',
      username: currentUser?.username || 'الإدارة',
      action: 'تحصيل دفعة إدخال خدمة',
      details: `تم تحصيل دفعة بقيمة ${settleAmount.toLocaleString()} ${settings.currency} لسند ${settlingConnection.voucherNo} للمشترك ${settlingConnection.subscriberName}`,
      timestamp: now.toISOString().replace('T', ' ').substring(0, 16)
    };
    onAddAuditLog(log);
    syncAuditLogToCloud(log);

    setSettlingConnection(null);
  };

  // Delete connection
  const handleDeleteConnection = (c: ServiceConnection) => {
    const connMonth = c.date ? c.date.substring(0, 7) : '';
    if (settings.closedPeriods && settings.closedPeriods.includes(connMonth)) {
      alert(`⚠️ لا يمكن حذف طلب إدخال خدمة مسجل في شهر مقفل مالياً (${connMonth}).`);
      return;
    }

    if (confirm(`هل أنت متأكد من حذف سند إدخال الخدمة للمشترك "${c.subscriberName}" بمبلغ ${(c.totalFee || 0).toLocaleString()} ${settings.currency}؟`)) {
      const updatedList = connections.filter(item => item.id !== c.id);
      onUpdateConnections(updatedList);
      deleteConnectionFromCloud(c.id);

      const log: AuditLog = {
        id: `log-${Date.now()}`,
        userId: currentUser?.id || 'admin',
        username: currentUser?.username || 'الإدارة',
        action: 'حذف سند إدخال خدمة',
        details: `تم حذف طلب إدخال الخدمة رقم ${c.voucherNo || c.id} للمشترك ${c.subscriberName}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
      };
      onAddAuditLog(log);
      syncAuditLogToCloud(log);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Main Metrics */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl">
              <Zap className="w-7 h-7" />
            </div>
            <div>
              <h2 className="font-black text-white text-lg sm:text-xl flex items-center gap-2">
                <span>إيرادات ورسوم إدخال الخدمة والتوصيل الجديد</span>
                <span className="text-xs bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded-full border border-amber-500/30">
                  {stats.count} سند
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-bold mt-1">
                إدارة شاملة لطلبات التوصيل، باقات الرسوم القياسية، صرف المواد من المستودع، وسندات القبض الحرارية والرسمية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => {
                setEditingConnection(null);
                setShowAddModal(true);
              }}
              className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-2.5 rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>تسجيل طلب وسند إدخال خدمة</span>
            </button>
          </div>
        </div>

        {/* 4 KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400 font-bold">إجمالي إيرادات الرسوم</span>
              <DollarSign className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
              {stats.totalRevenue.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-bold">
              <span>شامل العدادات والتأمين والمواد</span>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400 font-bold">المحصل فعلياً (النقدية)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
              {stats.totalPaid.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between font-bold">
              <span>كاش: {stats.totalCash.toLocaleString()}</span>
              <span>بنك: {stats.totalBank.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400 font-bold">الذمم والمتبقيات الآجلة</span>
              <Clock className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-400 font-mono">
              {stats.totalRemaining.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-bold">
              <span>{stats.pendingCount} مشترك عليهم متبقيات</span>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400 font-bold">أمانات التأمين المستردة</span>
              <ShieldAlert className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-indigo-400 font-mono">
              {stats.totalInsurance.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-bold">
              <span>تأمينات استهلاك مودعة</span>
            </div>
          </div>
        </div>

        {/* Sub-Tabs Selector */}
        <div className="flex items-center gap-2 border-t border-slate-800/80 pt-4 overflow-x-auto pb-1">
          <button
            onClick={() => setSubTab('registry')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              subTab === 'registry'
                ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>سجل وسندات التوصيل</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/40">{connections.length}</span>
          </button>

          <button
            onClick={() => setSubTab('analytics')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              subTab === 'analytics'
                ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>التحليلات والرسوم البيانية للإيرادات</span>
          </button>

          <button
            onClick={() => setSubTab('packages')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              subTab === 'packages'
                ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>باقات ونماذج الخدمة الجاهزة</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/40">{DEFAULT_CONNECTION_TEMPLATES.length}</span>
          </button>

          <button
            onClick={() => setSubTab('receivables')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              subTab === 'receivables'
                ? 'bg-rose-500 text-white font-black shadow-lg shadow-rose-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>كشف الذمم والمتبقيات الآجلة</span>
            {stats.pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-700 text-white font-mono">
                {stats.pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ================= TAB 1: REGISTRY ================= */}
      {subTab === 'registry' && (
        <motion.div
          key="registry"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Filters Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute right-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="بحث بالمشترك، العداد، الهاتف، السند، الفني..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-bold"
                />
              </div>

              {/* Month filter */}
              <div>
                <select
                  value={monthFilter}
                  onChange={e => setMonthFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                >
                  <option value="all">جميع الشهور المالية</option>
                  {connectionMonths.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Service Type filter */}
              <div>
                <select
                  value={serviceTypeFilter}
                  onChange={e => setServiceTypeFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                >
                  <option value="all">كل أنواع الخدمات</option>
                  <option value="new_connection">توصيل وعداد جديد</option>
                  <option value="phase_upgrade">ترقية 3-Phase</option>
                  <option value="relocation">نقل موقع عداد</option>
                  <option value="reconnect">إعادة إطلاق تيار</option>
                  <option value="meter_replacement">استبدال وتغيير عداد</option>
                  <option value="maintenance">صيانة وتوسعة شبكة</option>
                </select>
              </div>

              {/* Status Tabs */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`flex-1 py-1 rounded-lg transition-colors ${
                    statusFilter === 'all' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  الكل ({connections.length})
                </button>
                <button
                  onClick={() => setStatusFilter('completed')}
                  className={`flex-1 py-1 rounded-lg transition-colors ${
                    statusFilter === 'completed' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  مسدد
                </button>
                <button
                  onClick={() => setStatusFilter('has_remaining')}
                  className={`flex-1 py-1 rounded-lg transition-colors ${
                    statusFilter === 'has_remaining' ? 'bg-rose-500 text-white font-black' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  متبقي
                </button>
              </div>
            </div>
          </div>

          {/* Connections Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-bold">
                  <tr>
                    <th className="p-3.5">رقم السند / التاريخ</th>
                    <th className="p-3.5">المشترك والمعلومات</th>
                    <th className="p-3.5">نوع الخدمة والعداد</th>
                    <th className="p-3.5 text-center">إجمالي الرسوم</th>
                    <th className="p-3.5 text-center">المقبوض</th>
                    <th className="p-3.5 text-center">المتبقي</th>
                    <th className="p-3.5">الفني والمواد المصروفة</th>
                    <th className="p-3.5 text-center">الحالة</th>
                    <th className="p-3.5 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-bold text-slate-200">
                  {filteredConnections.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Zap className="w-8 h-8 text-slate-600 mb-1" />
                          <p className="font-bold text-sm">لا توجد طلبات إدخال خدمة مطابقة لمعايير البحث والفلترة</p>
                          <p className="text-xs text-slate-500">اضغط على "تسجيل طلب وسند إدخال خدمة" لإضافة طلب جديد.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredConnections.map(c => {
                      const rem = c.remainingAmount !== undefined ? c.remainingAmount : Math.max(0, c.totalFee - c.paidAmount);
                      const isFullyPaid = rem === 0 && c.paidAmount > 0;
                      const sInfo = SERVICE_TYPE_LABELS[c.serviceType || 'new_connection'] || { label: c.serviceType || 'توصيل خدمة', badge: 'bg-slate-800 text-slate-300' };

                      return (
                        <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5">
                            <div className="font-mono font-black text-amber-400 text-xs">
                              {c.voucherNo || `CON-${c.id.slice(-4)}`}
                            </div>
                            <div className="font-mono text-slate-400 text-[11px] mt-0.5">
                              {c.date}
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className="font-bold text-white text-sm">
                              {c.subscriberName}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-400">
                              {c.phone && (
                                <span className="flex items-center gap-0.5">
                                  <Phone className="w-3 h-3 text-slate-500" />
                                  <span className="font-mono">{c.phone}</span>
                                </span>
                              )}
                              {c.zone && (
                                <span className="flex items-center gap-0.5">
                                  <MapPin className="w-3 h-3 text-slate-500" />
                                  <span>{c.zone}</span>
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="p-3.5">
                            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${sInfo.badge} mb-1`}>
                              {sInfo.label}
                            </span>
                            <div className="text-[11px] text-slate-300 flex items-center gap-1">
                              <span className="text-slate-500">عداد:</span>
                              <span className="font-mono font-bold text-amber-300">{c.meterNumber || '-'}</span>
                              {c.tariffType && (
                                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded mr-1">
                                  {c.tariffType === 'residential' ? 'منزلي' : c.tariffType === 'commercial' ? 'تجاري' : c.tariffType === 'industrial' ? 'صناعي' : 'زراعي'}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="p-3.5 text-center">
                            <div className="font-mono font-black text-white text-sm">
                              {c.totalFee.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                              {c.insuranceDeposit ? `تأمين: ${c.insuranceDeposit.toLocaleString()}` : 'بدون تأمين'}
                            </div>
                          </td>

                          <td className="p-3.5 text-center">
                            <span className="font-mono font-black text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg inline-block">
                              {c.paidAmount.toLocaleString()}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {c.paymentMethod === 'bank_transfer' ? 'تحويل بنكي' : 'نقداً'}
                            </div>
                          </td>

                          <td className="p-3.5 text-center">
                            {rem > 0 ? (
                              <span className="font-mono font-black text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-lg inline-block">
                                {rem.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-emerald-400 text-xs font-bold flex items-center justify-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> مسدد
                              </span>
                            )}
                          </td>

                          <td className="p-3.5 max-w-[200px]">
                            {c.assignedTechnician && (
                              <div className="text-[11px] text-amber-300 font-bold flex items-center gap-1 mb-0.5">
                                <Wrench className="w-3 h-3 text-slate-500" />
                                <span>{c.assignedTechnician}</span>
                              </div>
                            )}
                            <div className="text-[11px] text-slate-400 truncate" title={c.materialsUsed}>
                              {c.materialsUsed || <span className="text-slate-600">لا توجد مواد مسجلة</span>}
                            </div>
                          </td>

                          <td className="p-3.5 text-center">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black inline-flex items-center gap-1 ${
                              isFullyPaid
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : rem > 0
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {isFullyPaid ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>مكتمل ومسدد</span>
                                </>
                              ) : rem > 0 ? (
                                <>
                                  <Clock className="w-3 h-3" />
                                  <span>متبقي ذمة</span>
                                </>
                              ) : (
                                <span>قيد التنفيذ</span>
                              )}
                            </span>
                          </td>

                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* Print */}
                              <button
                                onClick={() => setReceiptConnection(c)}
                                title="طباعة سند القبض والإدخال (A4 / حراري)"
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg transition-colors cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              {/* Settle Remaining */}
                              {rem > 0 && (
                                <button
                                  onClick={() => {
                                    setSettlingConnection(c);
                                    setSettleAmount(rem);
                                    setSettleMethod('cash');
                                    setSettleBankId('');
                                    setSettleNotes('');
                                  }}
                                  title="تحصيل دفعة أو تسوية المتبقي"
                                  className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 rounded-lg transition-all cursor-pointer font-bold"
                                >
                                  <DollarSign className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Edit */}
                              <button
                                onClick={() => setEditingConnection(c)}
                                title="تعديل بيانات السند"
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => handleDeleteConnection(c)}
                                title="حذف السند"
                                className="p-1.5 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* ================= TAB 2: ANALYTICS & CHARTS ================= */}
      {subTab === 'analytics' && (
        <motion.div
          key="analytics"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Breakdown cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Revenue By Service Type */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4">
              <h3 className="font-black text-white text-sm flex items-center gap-2 border-b border-slate-800 pb-3">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>توزيع الإيرادات حسب نوع الخدمة</span>
              </h3>

              <div className="space-y-3">
                {Object.entries(stats.byServiceType).map(([key, data]: [string, any]) => {
                  const sLabel = SERVICE_TYPE_LABELS[key]?.label || key;
                  const pct = stats.totalRevenue > 0 ? Math.round((data.total / stats.totalRevenue) * 100) : 0;

                  return (
                    <div key={key} className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white">{sLabel}</span>
                        <span className="font-mono text-amber-400 font-black">{data.total.toLocaleString()} {settings.currency}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{data.count} طلبات منفذة</span>
                        <span className="font-mono">{pct}% من الإجمالي</span>
                      </div>
                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Breakdown by Revenue Component */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4">
              <h3 className="font-black text-white text-sm flex items-center gap-2 border-b border-slate-800 pb-3">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>هيكل بنود الإيراد والتكاليف</span>
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                  <span className="text-slate-300 font-bold">رسوم التوصيل والاشتراك</span>
                  <span className="font-mono font-black text-amber-400">{stats.totalConnectionFees.toLocaleString()} {settings.currency}</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                  <span className="text-slate-300 font-bold">مبيعات وقيمة العدادات</span>
                  <span className="font-mono font-black text-cyan-400">{stats.totalMeterCosts.toLocaleString()} {settings.currency}</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                  <span className="text-slate-300 font-bold">أمانات التأمين المستردة</span>
                  <span className="font-mono font-black text-indigo-400">{stats.totalInsurance.toLocaleString()} {settings.currency}</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                  <span className="text-slate-300 font-bold">أجور التركيب واليد الفنية</span>
                  <span className="font-mono font-black text-emerald-400">{stats.totalLaborFees.toLocaleString()} {settings.currency}</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                  <span className="text-slate-300 font-bold">قيمة المواد والكابلات المصروفة</span>
                  <span className="font-mono font-black text-purple-400">{stats.totalMaterialsFees.toLocaleString()} {settings.currency}</span>
                </div>
              </div>
            </div>

            {/* Collection & Settlement Status */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4">
              <h3 className="font-black text-white text-sm flex items-center gap-2 border-b border-slate-800 pb-3">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>حالة التحصيل والسيولة</span>
              </h3>

              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-bold">نسبة التحصيل الفعلي:</span>
                  <span className="font-mono font-black text-emerald-400">
                    {stats.totalRevenue > 0 ? Math.round((stats.totalPaid / stats.totalRevenue) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${stats.totalRevenue > 0 ? (stats.totalPaid / stats.totalRevenue) * 100 : 0}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 text-center">
                  <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <span className="text-[10px] text-emerald-400 block font-bold">المحصل نقداً</span>
                    <span className="text-xs font-mono font-black text-white">{stats.totalCash.toLocaleString()}</span>
                  </div>
                  <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                    <span className="text-[10px] text-indigo-400 block font-bold">المحصل بنكياً</span>
                    <span className="text-xs font-mono font-black text-white">{stats.totalBank.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ================= TAB 3: SERVICE PACKAGES & TEMPLATES ================= */}
      {subTab === 'packages' && (
        <motion.div
          key="packages"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-black text-white text-base flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span>باقات ونماذج رسوم التوصيل وإدخال الخدمة الجاهزة</span>
                </h3>
                <p className="text-xs text-slate-400 font-bold mt-1">
                  اختر أي باقة لتسجيل طلب فوري مع تعبئة آلية لكافة الرسوم والمواد
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {DEFAULT_CONNECTION_TEMPLATES.map(tpl => {
                const totalTplFee = tpl.connectionFee + tpl.meterCost + tpl.insuranceDeposit + tpl.installationLaborFee;

                return (
                  <div
                    key={tpl.id}
                    className="bg-slate-950 border border-slate-800 hover:border-amber-500/50 p-5 rounded-2xl space-y-4 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs bg-amber-500/10 text-amber-400 font-bold px-2.5 py-1 rounded-lg border border-amber-500/20">
                          {tpl.badge}
                        </span>
                        <span className="font-mono text-sm font-black text-white">
                          {totalTplFee.toLocaleString()} {settings.currency}
                        </span>
                      </div>

                      <h4 className="font-black text-white text-sm">{tpl.title}</h4>
                      <p className="text-xs text-slate-400 font-bold leading-relaxed">{tpl.description}</p>

                      <div className="space-y-1.5 text-[11px] pt-2 border-t border-slate-800/80">
                        <div className="flex justify-between text-slate-400">
                          <span>رسوم اشتراك:</span>
                          <span className="font-mono text-white font-bold">{tpl.connectionFee.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>ثمن العداد:</span>
                          <span className="font-mono text-white font-bold">{tpl.meterCost.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>تأمين مسترد:</span>
                          <span className="font-mono text-white font-bold">{tpl.insuranceDeposit.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>أجور يد فنية:</span>
                          <span className="font-mono text-white font-bold">{tpl.installationLaborFee.toLocaleString()}</span>
                        </div>
                      </div>

                      {tpl.defaultMaterials.length > 0 && (
                        <div className="pt-2">
                          <span className="text-[10px] text-slate-500 font-bold block mb-1">المواد المضمنة افتراضياً:</span>
                          <div className="flex flex-wrap gap-1">
                            {tpl.defaultMaterials.map(m => (
                              <span key={m.id} className="text-[10px] bg-slate-900 text-slate-300 px-2 py-0.5 rounded border border-slate-800">
                                {m.quantity} {m.unit} {m.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setShowAddModal(true);
                      }}
                      className="w-full bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-amber-400 font-black py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-800 hover:border-transparent"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      استخدام هذا النموذج لتسجيل طلب
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* ================= TAB 4: RECEIVABLES & INSTALLMENTS ================= */}
      {subTab === 'receivables' && (
        <motion.div
          key="receivables"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-black text-white text-base flex items-center gap-2">
                  <Clock className="w-5 h-5 text-rose-400" />
                  <span>كشف المطالبات والذمم الآجلة لرسوم إدخال الخدمة</span>
                </h3>
                <p className="text-xs text-slate-400 font-bold mt-1">
                  المشتركون الذين عليهم مبالغ مؤجلة أو أقساط متبقية من رسوم التوصيل والاشتراك
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 font-bold block">إجمالي الذمم المعلقة</span>
                <span className="text-lg font-black font-mono text-rose-400">
                  {stats.totalRemaining.toLocaleString()} {settings.currency}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-bold">
                  <tr>
                    <th className="p-3">رقم السند</th>
                    <th className="p-3">المشترك</th>
                    <th className="p-3">الهاتف</th>
                    <th className="p-3">العداد</th>
                    <th className="p-3 text-center">إجمالي الرسوم</th>
                    <th className="p-3 text-center">المسدد</th>
                    <th className="p-3 text-center">المتبقي المطلوب</th>
                    <th className="p-3 text-center">تحصيل دفعة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-bold text-slate-200">
                  {connections.filter(c => (c.remainingAmount ?? (c.totalFee - c.paidAmount)) > 0).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                        <p className="font-bold text-sm text-slate-400">جميع رسوم إدخال الخدمة مسددة بالكامل ولا توجد أي متبقيات معلقة!</p>
                      </td>
                    </tr>
                  ) : (
                    connections
                      .filter(c => (c.remainingAmount ?? (c.totalFee - c.paidAmount)) > 0)
                      .map(c => {
                        const rem = c.remainingAmount ?? (c.totalFee - c.paidAmount);

                        return (
                          <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="p-3 font-mono text-amber-400">{c.voucherNo || `CON-${c.id.slice(-4)}`}</td>
                            <td className="p-3 font-bold text-white">{c.subscriberName}</td>
                            <td className="p-3 font-mono text-slate-400">{c.phone || '-'}</td>
                            <td className="p-3 font-mono text-amber-300">{c.meterNumber || '-'}</td>
                            <td className="p-3 text-center font-mono">{c.totalFee.toLocaleString()}</td>
                            <td className="p-3 text-center font-mono text-emerald-400">{c.paidAmount.toLocaleString()}</td>
                            <td className="p-3 text-center font-mono font-black text-rose-400">{rem.toLocaleString()}</td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => {
                                  setSettlingConnection(c);
                                  setSettleAmount(rem);
                                  setSettleMethod('cash');
                                  setSettleBankId('');
                                  setSettleNotes('');
                                }}
                                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1 mx-auto cursor-pointer shadow-sm"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                تحصيل قسط
                              </button>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* Add / Edit Connection Form Modal */}
      {showAddModal && (
        <ConnectionFormModal
          initialData={null}
          settings={settings}
          subscribers={subscribers}
          inventory={inventory}
          employees={employees}
          onSave={handleSaveConnection}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {editingConnection && (
        <ConnectionFormModal
          initialData={editingConnection}
          settings={settings}
          subscribers={subscribers}
          inventory={inventory}
          employees={employees}
          onSave={handleSaveConnection}
          onClose={() => setEditingConnection(null)}
        />
      )}

      {/* Printable Receipt Modal (A4 / 80mm Thermal) */}
      {receiptConnection && (
        <ConnectionReceiptModal
          connection={receiptConnection}
          settings={settings}
          onClose={() => setReceiptConnection(null)}
        />
      )}

      {/* Settlement Modal */}
      {settlingConnection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-white text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>تحصيل دفعة من المبلغ المتبقي</span>
              </h3>
              <button
                onClick={() => setSettlingConnection(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">المشترك:</span>
                <span className="font-bold text-white">{settlingConnection.subscriberName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">رقم السند:</span>
                <span className="font-mono text-amber-400">{settlingConnection.voucherNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">إجمالي الرسوم:</span>
                <span className="font-mono">{settlingConnection.totalFee.toLocaleString()} {settings.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">المبلغ المسدد سابقاً:</span>
                <span className="font-mono text-emerald-400">{settlingConnection.paidAmount.toLocaleString()} {settings.currency}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800/80 pt-2 font-black">
                <span className="text-rose-400">المتبقي المطلوب:</span>
                <span className="font-mono text-rose-400 text-sm">
                  {(settlingConnection.remainingAmount ?? (settlingConnection.totalFee - settlingConnection.paidAmount)).toLocaleString()} {settings.currency}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">المبلغ المقبوض الآن ({settings.currency}) *</label>
                <input
                  type="number"
                  min="1"
                  max={settlingConnection.remainingAmount ?? (settlingConnection.totalFee - settlingConnection.paidAmount)}
                  value={settleAmount}
                  onChange={e => setSettleAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl px-3 py-2 text-white font-mono font-black text-right text-base focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">طريقة القبض</label>
                <select
                  value={settleMethod}
                  onChange={e => setSettleMethod(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                >
                  <option value="cash">نقداً في الصندوق الرئيسي (كاش)</option>
                  <option value="bank_transfer">تحويل بنكي / محفظة</option>
                </select>
              </div>

              {settleMethod === 'bank_transfer' && (
                <div>
                  <label className="block font-bold text-slate-300 mb-1">الحساب البنكي</label>
                  <select
                    value={settleBankId}
                    onChange={e => setSettleBankId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                  >
                    <option value="">اختر الحساب البنكي</option>
                    {(settings.bankAccounts || []).map(b => (
                      <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-300 mb-1">ملاحظات السداد</label>
                <input
                  type="text"
                  value={settleNotes}
                  onChange={e => setSettleNotes(e.target.value)}
                  placeholder="سداد قسط أو دفعة ثانية..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setSettlingConnection(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs"
              >
                إلغاء
              </button>
              <button
                onClick={handleSettleInstallment}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                تأكيد وقبض المبلغ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
