import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Wallet, TrendingDown, Users, Zap, Search, Plus, FileText, ChevronLeft, ChevronRight, ChevronDown, Calendar, Download, Printer, ShieldCheck, Scale, ArrowLeftRight, CheckCircle2, DollarSign, BookOpen, Layers, PieChart, TrendingUp, AlertCircle, AlertTriangle, ArrowUpRight, ArrowDownLeft, Landmark, RefreshCw, Eye, Award, Filter, Clock, Building2, Check, ArrowRight, Edit3, Trash2, XCircle, Lock, Unlock, RotateCcw, History, FileCheck, Receipt, CreditCard, Sparkles, UserCheck, MapPin, Phone, Hash, Coins, BadgeCheck, Wrench, CheckSquare, FileSpreadsheet, Package, Boxes, PlusCircle, MinusCircle, Info, ShoppingBag, Truck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  SystemSettings, User, Expense, Purchase, EmployeeTransaction, ServiceConnection, ConnectionMaterialItem, Employee, Subscriber, MeterReading, Payment, ClosedPeriod, AuditLog, InventoryItem, InventoryTransaction
} from '../types';
import { AccountingJournalTable } from './AccountingJournalTable';
import { BalanceReconciliationModal } from './BalanceReconciliationModal';
import { ServiceConnectionManager } from './ServiceConnectionManager';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, BarChart, Bar, Cell } from 'recharts';
import { exportToCSV, printData, safePrint } from '../utils/exportUtils';
import { tafqeetArabic } from '../utils/numberToWords';
import { 
  deleteReadingFromCloud, 
  deletePaymentFromCloud, 
  deleteExpenseFromCloud, 
  deletePurchaseFromCloud, 
  deleteTreasuryTransferFromCloud, 
  syncTreasuryTransferToCloud,
  deleteJournalEntryFromCloud, 
  deleteEmployeeTxFromCloud, 
  deleteConnectionFromCloud,
  syncSettingsToCloud,
  syncJournalEntryToCloud,
  syncAuditLogToCloud
} from '../lib/database';

interface JournalEntry {
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

interface TreasuryTransfer {
  id: string;
  transferNumber: string;
  date: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  notes: string;
  recordedBy: string;
}

interface AdminAccountingProps {
  settings: SystemSettings;
  onUpdateSettings?: (settings: SystemSettings) => void;
  onAddAuditLog?: (log: AuditLog) => void;
  currentUser: User;
  subscribers?: Subscriber[];
  readings?: MeterReading[];
  payments?: Payment[];
  onUpdateSubscribers?: (subs: Subscriber[]) => void;
  onUpdateReadings?: (reads: MeterReading[]) => void;
  onUpdatePayments?: (pays: Payment[]) => void;
  initialTab?: 'summary' | 'journal' | 'trial_balance' | 'treasury' | 'expenses' | 'employees' | 'purchases' | 'connections' | 'closed_periods';
  initialTreasurySubTab?: 'boxes' | 'transfers' | 'statements' | 'performance' | 'daily';
  treasuryTransfers?: TreasuryTransfer[];
  onUpdateTreasuryTransfers?: (trfs: TreasuryTransfer[]) => void;
  expenses?: Expense[];
  onUpdateExpenses?: (exps: Expense[]) => void;
  purchases?: Purchase[];
  onUpdatePurchases?: (purs: Purchase[]) => void;
  manualJournalEntries?: JournalEntry[];
  onUpdateManualJournalEntries?: (entries: JournalEntry[]) => void;
  employees?: Employee[];
  onUpdateEmployees?: (emps: Employee[]) => void;
  employeeTxs?: EmployeeTransaction[];
  onUpdateEmployeeTxs?: (txs: EmployeeTransaction[]) => void;
  connections?: ServiceConnection[];
  onUpdateConnections?: (conns: ServiceConnection[]) => void;
  inventory?: InventoryItem[];
  onUpdateInventory?: (items: InventoryItem[]) => void;
  inventoryTransactions?: InventoryTransaction[];
  onUpdateInventoryTransactions?: (txs: InventoryTransaction[]) => void;
  users?: User[];
}

export const AdminAccounting: React.FC<AdminAccountingProps> = ({
  settings,
  onUpdateSettings,
  onAddAuditLog,
  currentUser,
  subscribers = [],
  readings = [],
  payments = [],
  onUpdateSubscribers,
  onUpdateReadings,
  onUpdatePayments,
  initialTab,
  initialTreasurySubTab,
  treasuryTransfers: treasuryTransfersProp,
  onUpdateTreasuryTransfers,
  expenses: expensesProp,
  onUpdateExpenses,
  purchases: purchasesProp,
  onUpdatePurchases,
  manualJournalEntries: manualJournalEntriesProp,
  onUpdateManualJournalEntries,
  employees: employeesProp,
  onUpdateEmployees,
  employeeTxs: employeeTxsProp,
  onUpdateEmployeeTxs,
  connections: connectionsProp,
  onUpdateConnections,
  inventory: inventoryProp = [],
  onUpdateInventory,
  inventoryTransactions: inventoryTransactionsProp = [],
  onUpdateInventoryTransactions,
  users = []
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'journal' | 'trial_balance' | 'treasury' | 'expenses' | 'employees' | 'purchases' | 'connections' | 'closed_periods'>(initialTab || 'summary');

  // Modals state
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddPurchase, setShowAddPurchase] = useState(false);
  const [showAddConnection, setShowAddConnection] = useState(false);
  const [showAddEmployeeTx, setShowAddEmployeeTx] = useState(false);
  const [showAddManualJournal, setShowAddManualJournal] = useState(false);
  const [editingJournalEntry, setEditingJournalEntry] = useState<JournalEntry | null>(null);
  const [showAddTransfer, setShowAddTransfer] = useState(false);
  const [selectedVoucherForPrint, setSelectedVoucherForPrint] = useState<JournalEntry | null>(null);
  const [showReconciliationModal, setShowReconciliationModal] = useState(false);

  // CLOSED PERIODS & REVERSE ENTRY STATES
  const [showClosePeriodModal, setShowClosePeriodModal] = useState(false);
  const [periodToClose, setPeriodToClose] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [reopenPeriodMonth, setReopenPeriodMonth] = useState<string | null>(null);
  const [reopenReason, setReopenReason] = useState<string>('');
  const [reversingEntry, setReversingEntry] = useState<JournalEntry | null>(null);
  const [reversalReason, setReversalReason] = useState<string>('');
  const [reversalDate, setReversalDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [viewingClosedPeriodReport, setViewingClosedPeriodReport] = useState<ClosedPeriod | null>(null);

  // TREASURY & COLLECTOR FUNDS STATES
  const [treasurySubTab, setTreasurySubTab] = useState<'boxes' | 'transfers' | 'statements' | 'performance' | 'daily'>(initialTreasurySubTab || 'boxes');

  // MONTH FILTER STATES (تحديد الشهر في الخزينة والملخص المالي)
  const [selectedSummaryMonth, setSelectedSummaryMonth] = useState<string>(new Date().toISOString().substring(0, 7));
  const [selectedTreasuryMonth, setSelectedTreasuryMonth] = useState<string>(new Date().toISOString().substring(0, 7));

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (initialTreasurySubTab) {
      setTreasurySubTab(initialTreasurySubTab);
    }
  }, [initialTreasurySubTab]);
  const [handoverTarget, setHandoverTarget] = useState<{
    collectorName: string;
    pendingAmount: number;
    receiptsCount: number;
  } | null>(null);
  const [handoverForm, setHandoverForm] = useState({
    amount: 0,
    toAccount: 'الصندوق الرئيسي (الكاش)',
    notes: '',
    receiverName: currentUser.name || 'مدير النظام'
  });
  const [printableTransferVoucher, setPrintableTransferVoucher] = useState<TreasuryTransfer | null>(null);

  // Purchases & Suppliers state
  const [purchaseSubTab, setPurchaseSubTab] = useState<'invoices' | 'suppliers'>('invoices');
  const [purchaseSearch, setPurchaseSearch] = useState<string>('');
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [printablePurchase, setPrintablePurchase] = useState<Purchase | null>(null);
  const [selectedSupplierStatement, setSelectedSupplierStatement] = useState<string | null>(null);

  // Collector Statement Filters
  const [statementCollector, setStatementCollector] = useState<string>('all');
  const [statementFromDate, setStatementFromDate] = useState<string>('');
  const [statementToDate, setStatementToDate] = useState<string>('');
  const [statementSearch, setStatementSearch] = useState<string>('');
  const [transferSearch, setTransferSearch] = useState<string>('');
  const [dailyFlowDate, setDailyFlowDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Filters
  const [journalSearch, setJournalSearch] = useState('');
  const [journalTypeFilter, setJournalTypeFilter] = useState<string>('all');

  // Service Connections Enhanced States (إيرادات إدخال وتوصيل الخدمة)
  const [editingConnection, setEditingConnection] = useState<ServiceConnection | null>(null);
  const [settlingConnection, setSettlingConnection] = useState<ServiceConnection | null>(null);
  const [settlePaymentAmount, setSettlePaymentAmount] = useState<number | ''>('');
  const [settlePaymentMethod, setSettlePaymentMethod] = useState<'cash' | 'bank_transfer'>('cash');
  const [settleBankAccountId, setSettleBankAccountId] = useState<string>('');
  const [settleNotes, setSettleNotes] = useState<string>('');
  const [selectedConnectionForReceipt, setSelectedConnectionForReceipt] = useState<ServiceConnection | null>(null);
  const [connectionSearchQuery, setConnectionSearchQuery] = useState<string>('');
  const [connectionServiceTypeFilter, setConnectionServiceTypeFilter] = useState<string>('all');
  const [connectionStatusFilter, setConnectionStatusFilter] = useState<string>('all');
  const [connectionMonthFilter, setConnectionMonthFilter] = useState<string>('all');
  const [selectedExistingSubId, setSelectedExistingSubId] = useState<string>('new');

  // New item forms
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({ category: 'وقود (ديزل)', date: new Date().toISOString().split('T')[0] });
  const [newPurchase, setNewPurchase] = useState<Partial<Purchase>>({ date: new Date().toISOString().split('T')[0], paymentType: 'cash' });
  const [newConnection, setNewConnection] = useState<Partial<ServiceConnection>>({
    status: 'completed',
    date: new Date().toISOString().split('T')[0],
    serviceType: 'new_connection',
    tariffType: 'residential',
    connectionFee: settings.serviceFee || 5000,
    meterCost: 0,
    insuranceDeposit: settings.meterInsuranceDeposit || 0,
    installationLaborFee: 0,
    materialsFee: 0,
    otherFees: 0,
    totalFee: settings.serviceFee || 5000,
    paidAmount: settings.serviceFee || 5000,
    paymentMethod: 'cash',
    autoCreatedSubscriber: true
  });
  const [newEmployeeTx, setNewEmployeeTx] = useState<Partial<EmployeeTransaction>>({ type: 'salary', date: new Date().toISOString().split('T')[0] });
  const [newManualJournal, setNewManualJournal] = useState<Partial<JournalEntry>>({
    date: new Date().toISOString().split('T')[0],
    debitAccountCode: '5010',
    debitAccountName: 'مصروفات تشغيلية (وقود وصيانة)',
    creditAccountCode: '1010',
    creditAccountName: 'حـ/ الصندوق الرئيسي',
    type: 'manual',
    typeLabel: 'قيد يدوي'
  });
  const [newTransfer, setNewTransfer] = useState<Partial<TreasuryTransfer>>({
    date: new Date().toISOString().split('T')[0],
    fromAccount: 'صندوق المحصلين الميداني',
    toAccount: 'الصندوق الرئيسي (الكاش)'
  });

  const [employees, setEmployees] = useState<Employee[]>(employeesProp || []);
  const [expenses, setExpenses] = useState<Expense[]>(expensesProp || []);
  const [purchases, setPurchases] = useState<Purchase[]>(purchasesProp || []);
  const [employeeTxs, setEmployeeTxs] = useState<EmployeeTransaction[]>(employeeTxsProp || []);
  const [connections, setConnections] = useState<ServiceConnection[]>(connectionsProp || []);
  const [manualJournalEntries, setManualJournalEntries] = useState<JournalEntry[]>(manualJournalEntriesProp || []);
  const [treasuryTransfers, setTreasuryTransfers] = useState<TreasuryTransfer[]>(treasuryTransfersProp || []);
  const [inventory, setInventory] = useState<InventoryItem[]>(inventoryProp || []);
  const [inventoryTransactions, setInventoryTransactions] = useState<InventoryTransaction[]>(inventoryTransactionsProp || []);

  useEffect(() => { setExpenses(expensesProp || []); }, [expensesProp]);
  useEffect(() => { setPurchases(purchasesProp || []); }, [purchasesProp]);
  useEffect(() => { setEmployeeTxs(employeeTxsProp || []); }, [employeeTxsProp]);
  useEffect(() => { setConnections(connectionsProp || []); }, [connectionsProp]);
  useEffect(() => { setManualJournalEntries(manualJournalEntriesProp || []); }, [manualJournalEntriesProp]);
  useEffect(() => { setTreasuryTransfers(treasuryTransfersProp || []); }, [treasuryTransfersProp]);
  useEffect(() => { setEmployees(employeesProp || []); }, [employeesProp]);
  useEffect(() => { setInventory(inventoryProp || []); }, [inventoryProp]);
  useEffect(() => { setInventoryTransactions(inventoryTransactionsProp || []); }, [inventoryTransactionsProp]);

  // Service Connections Materials & Store Integration
  const [connectionMaterials, setConnectionMaterials] = useState<ConnectionMaterialItem[]>([]);
  const [deductMaterialsFromStore, setDeductMaterialsFromStore] = useState<boolean>(true);
  const [selectedStoreItemId, setSelectedStoreItemId] = useState<string>('');
  const [customMaterialInput, setCustomMaterialInput] = useState({ name: '', quantity: 1, unit: 'متر', unitPrice: 0, notes: '' });

  const [editConnectionMaterials, setEditConnectionMaterials] = useState<ConnectionMaterialItem[]>([]);
  const [editDeductMaterialsFromStore, setEditDeductMaterialsFromStore] = useState<boolean>(false);
  const [editSelectedStoreItemId, setEditSelectedStoreItemId] = useState<string>('');
  const [editCustomMaterialInput, setEditCustomMaterialInput] = useState({ name: '', quantity: 1, unit: 'متر', unitPrice: 0, notes: '' });

  // Common Materials Kit Presets
  const CONNECTION_MATERIAL_PRESETS = useMemo(() => [
    {
      id: 'single_phase_std',
      title: 'طقم منزلي 1-Phase قياسي',
      badge: 'منزلي أحادي',
      items: [
        { id: `mat-${Date.now()}-1`, name: 'كابل ألومنيوم هوائي مجدول 16 ملم', quantity: 20, unit: 'متر', unitPrice: 1200, notes: 'تمديد هوائي من الشبكة' },
        { id: `mat-${Date.now()}-2`, name: 'عداد كهربائي إلكتروني 1-Phase معتمد', quantity: 1, unit: 'حبة', unitPrice: 25000, notes: 'عداد قياسي' },
        { id: `mat-${Date.now()}-3`, name: 'قاطع تيار أوتوماتيك 40 أمبير', quantity: 1, unit: 'حبة', unitPrice: 4500, notes: 'قاطع حماية وتوزيع' },
        { id: `mat-${Date.now()}-4`, name: 'صندوق حماية عداد فايبر عازل', quantity: 1, unit: 'حبة', unitPrice: 6000, notes: 'مقاوم للعوامل الجوية' },
        { id: `mat-${Date.now()}-5`, name: 'مسامير تثبيت وكلبسات تعليق هوائي', quantity: 4, unit: 'طقم', unitPrice: 500, notes: 'تثبيت الجدار والعمود' }
      ]
    },
    {
      id: 'three_phase_comm',
      title: 'طقم تجاري / صناعي 3-Phase',
      badge: 'تجاري ثلاثي',
      items: [
        { id: `mat-${Date.now()}-11`, name: 'كابل ألومنيوم هوائي مجدول 25 ملم', quantity: 35, unit: 'متر', unitPrice: 2800, notes: 'كابل ضغط منخفض 3 فاز' },
        { id: `mat-${Date.now()}-12`, name: 'عداد كهربائي رقمي 3-Phase ثلاثي الطور', quantity: 1, unit: 'حبة', unitPrice: 65000, notes: 'عداد تجاري إلكتروني' },
        { id: `mat-${Date.now()}-13`, name: 'قاطع تيار رئيسي ثلاثي 63 أمبير', quantity: 1, unit: 'حبة', unitPrice: 18000, notes: 'قاطع ثلاثي معتمد' },
        { id: `mat-${Date.now()}-14`, name: 'كابينة حماية حديدية 3-Phase', quantity: 1, unit: 'حبة', unitPrice: 15000, notes: 'صندوق خارجي مصفح' },
        { id: `mat-${Date.now()}-15`, name: 'عوازل شد وصلبات تعليق شبكة', quantity: 6, unit: 'حبة', unitPrice: 1200, notes: 'مرابط وعوازل ضغط' }
      ]
    },
    {
      id: 'extension_kit',
      title: 'طقم تمديد وتوسعة مسافة',
      badge: 'تمديد شبكة',
      items: [
        { id: `mat-${Date.now()}-21`, name: 'كابل ألومنيوم هوائي مجدول 16 ملم', quantity: 50, unit: 'متر', unitPrice: 1200, notes: 'توسعة وتمديد مسافة' },
        { id: `mat-${Date.now()}-22`, name: 'صلبات تعليق شبكة وعوازل هوائية', quantity: 4, unit: 'حبة', unitPrice: 1500, notes: 'عوازل ضغط منخفض' },
        { id: `mat-${Date.now()}-23`, name: 'مرابط توصيل أوتوماتيكية ثنائية', quantity: 2, unit: 'حبة', unitPrice: 1500, notes: 'ربط بالخط الرئيسي' },
        { id: `mat-${Date.now()}-24`, name: 'شريط عازل شطرطون حراري مقاوم', quantity: 1, unit: 'لفة', unitPrice: 800, notes: 'عزل فواصل الكابلات' }
      ]
    }
  ], []);

  // Available unique months list
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    const currentMonth = new Date().toISOString().substring(0, 7);
    monthsSet.add(currentMonth);

    payments.forEach(p => { if (p.paymentDate) monthsSet.add(p.paymentDate.substring(0, 7)); });
    readings.forEach(r => { if (r.readingDate) monthsSet.add(r.readingDate.substring(0, 7)); });
    expenses.forEach(e => { if (e.date) monthsSet.add(e.date.substring(0, 7)); });
    purchases.forEach(p => { if (p.date) monthsSet.add(p.date.substring(0, 7)); });
    employeeTxs.forEach(e => { if (e.date) monthsSet.add(e.date.substring(0, 7)); });
    connections.forEach(c => {
      const d = c.createdAt || (c as any).date;
      if (d) monthsSet.add(d.substring(0, 7));
    });

    return Array.from(monthsSet).sort().reverse();
  }, [payments, readings, expenses, purchases, employeeTxs, connections]);

  const matchMonth = (dateStr: string | undefined | null, targetMonth: string) => {
    if (!targetMonth || targetMonth === 'all') return true;
    if (!dateStr) return false;
    const normalized = dateStr.replace(/\//g, '-');
    return normalized.substring(0, 7) === targetMonth;
  };

  const formatMonthLabel = (monthStr: string) => {
    if (!monthStr || monthStr === 'all') return 'جميع الشهور (التراكمي)';
    const parts = monthStr.split('-');
    if (parts.length < 2) return monthStr;
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('ar-YE', { month: 'long', year: 'numeric' });
  };

  // Form submit handlers
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.amount || !newExpense.category || !newExpense.date) return;
    
    const expense: Expense = {
      id: Date.now().toString(),
      amount: Number(newExpense.amount),
      category: newExpense.category,
      date: newExpense.date,
      description: newExpense.description ?? '',
      recordedBy: currentUser.name
    };
    const updated = [expense, ...expenses];
    setExpenses(updated);
    if (onUpdateExpenses) onUpdateExpenses(updated);
    setShowAddExpense(false);
    setNewExpense({ category: 'وقود (ديزل)', date: new Date().toISOString().split('T')[0] });
  };

  const handleAddPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPurchase.amount || !newPurchase.supplier || !newPurchase.date) return;
    
    const amountVal = Number(newPurchase.amount);
    const pType = newPurchase.paymentType || 'cash';
    const paidVal = newPurchase.paidAmount !== undefined ? Number(newPurchase.paidAmount) : (pType === 'cash' ? amountVal : 0);

    const purchase: Purchase = {
      id: `pur-${Date.now()}`,
      amount: amountVal,
      paidAmount: paidVal,
      paymentType: pType,
      supplier: newPurchase.supplier.trim(),
      date: newPurchase.date,
      items: newPurchase.items ?? '',
      invoiceNumber: newPurchase.invoiceNumber || `PUR-${Date.now().toString().slice(-6)}`,
      notes: newPurchase.notes || '',
      recordedBy: currentUser.name || 'مدير النظام'
    };
    const updated = [purchase, ...purchases];
    setPurchases(updated);
    if (onUpdatePurchases) onUpdatePurchases(updated);
    setShowAddPurchase(false);
    setNewPurchase({ date: new Date().toISOString().split('T')[0], paymentType: 'cash' });
  };

  const handleSaveEditedPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPurchase || !editingPurchase.amount || !editingPurchase.supplier) return;

    const amountVal = Number(editingPurchase.amount);
    const pType = editingPurchase.paymentType || 'cash';
    const paidVal = editingPurchase.paidAmount !== undefined ? Number(editingPurchase.paidAmount) : (pType === 'cash' ? amountVal : 0);

    const updatedPurchase: Purchase = {
      ...editingPurchase,
      amount: amountVal,
      paidAmount: paidVal,
      paymentType: pType,
      supplier: editingPurchase.supplier.trim()
    };

    const updated = purchases.map(p => p.id === updatedPurchase.id ? updatedPurchase : p);
    setPurchases(updated);
    if (onUpdatePurchases) onUpdatePurchases(updated);
    setEditingPurchase(null);
  };

  const handleDeletePurchase = (id: string) => {
    if (confirm('هل أنت متأكد تماماً من حذف فاتورة الشراء هذه؟ لا يمكن التراجع عن ذلك.')) {
      const updated = purchases.filter(p => p.id !== id);
      setPurchases(updated);
      if (onUpdatePurchases) onUpdatePurchases(updated);
    }
  };

  const handleAddConnection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConnection.subscriberName || !newConnection.date) return;
    
    // Check closed period
    const connMonth = (newConnection.date || '').substring(0, 7);
    if ((settings.closedPeriods || []).some(p => p.month === connMonth && p.status === 'closed')) {
      alert(`عذراً، الفترة المالية لشهر (${connMonth}) مقفلة ومرحلة رسمياً. لا يمكن إضافة معاملات جديدة في هذا الشهر.`);
      return;
    }

    const connectionFee = Number(newConnection.connectionFee || 0);
    const meterCost = Number(newConnection.meterCost || 0);
    const insuranceDeposit = Number(newConnection.insuranceDeposit || 0);
    const installationLaborFee = Number(newConnection.installationLaborFee || 0);
    const materialsFee = Number(newConnection.materialsFee || 0);
    const otherFees = Number(newConnection.otherFees || 0);
    
    const calculatedTotal = connectionFee + meterCost + insuranceDeposit + installationLaborFee + materialsFee + otherFees;
    const totalFee = Number(newConnection.totalFee !== undefined && Number(newConnection.totalFee) > 0 ? newConnection.totalFee : calculatedTotal);
    const paidAmount = Number(newConnection.paidAmount || 0);
    const remainingAmount = Math.max(0, totalFee - paidAmount);
    
    const computedStatus = (paidAmount >= totalFee && totalFee > 0) 
      ? 'completed' 
      : (paidAmount > 0 ? 'in_progress' : (newConnection.status || 'pending'));

    const voucherNo = newConnection.voucherNo || `CON-${new Date().getFullYear()}-${String(connections.length + 1).padStart(4, '0')}`;
    const subId = newConnection.subscriberId || Date.now().toString();

    // Format text summary of materials
    const formattedMaterialsText = connectionMaterials.length > 0
      ? connectionMaterials.map(m => `${m.quantity} ${m.unit} ${m.name}${m.unitPrice ? ` (${(m.quantity * m.unitPrice).toLocaleString()} ${settings.currency})` : ''}`).join(' + ')
      : (newConnection.materialsUsed || '');

    const connection: ServiceConnection = {
      id: Date.now().toString(),
      voucherNo,
      subscriberId: subId,
      subscriberName: newConnection.subscriberName.trim(),
      phone: newConnection.phone || '',
      meterNumber: newConnection.meterNumber || '',
      zone: newConnection.zone || '',
      tariffType: newConnection.tariffType || 'residential',
      serviceType: newConnection.serviceType || 'new_connection',
      connectionFee,
      meterCost,
      insuranceDeposit,
      installationLaborFee,
      materialsFee,
      otherFees,
      totalFee,
      paidAmount,
      remainingAmount,
      date: newConnection.date,
      materialsUsed: formattedMaterialsText,
      materialsList: connectionMaterials,
      deductMaterialsFromInventory: deductMaterialsFromStore,
      assignedTechnician: newConnection.assignedTechnician || '',
      paymentMethod: newConnection.paymentMethod || 'cash',
      bankAccountId: newConnection.bankAccountId || '',
      notes: newConnection.notes || '',
      status: computedStatus,
      autoCreatedSubscriber: !!newConnection.autoCreatedSubscriber,
      recordedBy: currentUser.name || 'المحاسب المالي',
      createdAt: new Date().toISOString()
    };

    // If deductMaterialsFromStore is true, deduct warehouse items
    if (deductMaterialsFromStore && connectionMaterials.length > 0) {
      let updatedInv = [...inventory];
      const newTxs: InventoryTransaction[] = [];
      const txDate = connection.date || new Date().toISOString().split('T')[0];

      connectionMaterials.forEach(mat => {
        if (mat.itemId) {
          const invIdx = updatedInv.findIndex(item => item.id === mat.itemId);
          if (invIdx !== -1) {
            const currentItem = updatedInv[invIdx];
            const newQty = Math.max(0, currentItem.quantity - Number(mat.quantity || 0));
            updatedInv[invIdx] = {
              ...currentItem,
              quantity: newQty,
              lastUpdated: new Date().toISOString()
            };

            newTxs.push({
              id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              itemId: currentItem.id,
              itemName: currentItem.name,
              type: 'out',
              quantity: Number(mat.quantity || 0),
              unitPrice: mat.unitPrice || currentItem.unitPrice || currentItem.costPrice || 0,
              totalValue: (Number(mat.quantity || 0)) * (mat.unitPrice || currentItem.unitPrice || currentItem.costPrice || 0),
              date: txDate,
              user: currentUser.name || 'المحاسب',
              notes: `صرف مواد لطلب توصيل خدمة للمشترك (${connection.subscriberName}) - سند (${voucherNo})`,
              refNo: voucherNo
            });
          }
        }
      });

      if (newTxs.length > 0) {
        setInventory(updatedInv);
        if (onUpdateInventory) onUpdateInventory(updatedInv);
        
        const updatedTxs = [...newTxs, ...inventoryTransactions];
        setInventoryTransactions(updatedTxs);
        if (onUpdateInventoryTransactions) onUpdateInventoryTransactions(updatedTxs);
      }
    }

    // Auto-create subscriber if requested and not existing in directory
    if (newConnection.autoCreatedSubscriber && onUpdateSubscribers) {
      const existingSub = subscribers.find(s => s.id === subId || (s.name.trim() === connection.subscriberName && s.phone === connection.phone));
      if (!existingSub) {
        const newSubscriber: Subscriber = {
          id: subId,
          subscriberCode: `SUB-${Math.floor(1000 + Math.random() * 9000)}`,
          name: connection.subscriberName,
          phone: connection.phone || '',
          meterNumber: connection.meterNumber || `MTR-${Math.floor(100000 + Math.random() * 900000)}`,
          tariffType: (connection.tariffType as any) || 'residential',
          zone: connection.zone || 'المنطقة الرئيسية',
          initialReading: 0,
          currentReading: 0,
          currentBalance: remainingAmount > 0 ? remainingAmount : 0,
          openingBalance: 0,
          status: 'active',
          createdAt: connection.date || new Date().toISOString()
        };
        onUpdateSubscribers([newSubscriber, ...subscribers]);
      }
    }

    const updated = [connection, ...connections];
    setConnections(updated);
    if (onUpdateConnections) onUpdateConnections(updated);
    
    if (onAddAuditLog) {
      onAddAuditLog({
        id: Date.now().toString(),
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'create',
        category: 'accounting',
        entityId: connection.id,
        entityName: connection.subscriberName,
        details: `تسجيل إيراد إدخال وتوصيل خدمة رقم (${voucherNo}) للمشترك (${connection.subscriberName}) بقيمة ${totalFee.toLocaleString()} ${settings.currency} (المدفوع: ${paidAmount.toLocaleString()})`,
        timestamp: new Date().toISOString()
      });
    }

    setShowAddConnection(false);
    // Reset
    setNewConnection({
      status: 'completed',
      date: new Date().toISOString().split('T')[0],
      serviceType: 'new_connection',
      tariffType: 'residential',
      connectionFee: settings.serviceFee || 5000,
      meterCost: 0,
      insuranceDeposit: settings.meterInsuranceDeposit || 0,
      installationLaborFee: 0,
      materialsFee: 0,
      otherFees: 0,
      totalFee: settings.serviceFee || 5000,
      paidAmount: settings.serviceFee || 5000,
      paymentMethod: 'cash',
      autoCreatedSubscriber: true
    });
    setSelectedExistingSubId('new');
  };

  const handleUpdateConnection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConnection) return;

    // Check closed period
    const connMonth = (editingConnection.date || '').substring(0, 7);
    if ((settings.closedPeriods || []).some(p => p.month === connMonth && p.status === 'closed')) {
      alert(`عذراً، الفترة المالية لشهر (${connMonth}) مقفلة ومرحلة رسمياً. لا يمكن تعديل هذه المعاملة.`);
      return;
    }

    const connectionFee = Number(editingConnection.connectionFee || 0);
    const meterCost = Number(editingConnection.meterCost || 0);
    const insuranceDeposit = Number(editingConnection.insuranceDeposit || 0);
    const installationLaborFee = Number(editingConnection.installationLaborFee || 0);
    const materialsFee = Number(editingConnection.materialsFee || 0);
    const otherFees = Number(editingConnection.otherFees || 0);
    const calculatedTotal = connectionFee + meterCost + insuranceDeposit + installationLaborFee + materialsFee + otherFees;
    
    const totalFee = Number(editingConnection.totalFee !== undefined && Number(editingConnection.totalFee) > 0 ? editingConnection.totalFee : calculatedTotal);
    const paidAmount = Number(editingConnection.paidAmount || 0);
    const remainingAmount = Math.max(0, totalFee - paidAmount);
    const status = (paidAmount >= totalFee && totalFee > 0) ? 'completed' : (paidAmount > 0 ? 'in_progress' : (editingConnection.status || 'pending'));

    const updatedMaterialsText = editConnectionMaterials.length > 0
      ? editConnectionMaterials.map(m => `${m.quantity} ${m.unit} ${m.name}${m.unitPrice ? ` (${(m.quantity * m.unitPrice).toLocaleString()} ${settings.currency})` : ''}`).join(' + ')
      : (editingConnection.materialsUsed || '');

    const updatedConn: ServiceConnection = {
      ...editingConnection,
      connectionFee,
      meterCost,
      insuranceDeposit,
      installationLaborFee,
      materialsFee,
      otherFees,
      totalFee,
      paidAmount,
      remainingAmount,
      materialsUsed: updatedMaterialsText,
      materialsList: editConnectionMaterials,
      status
    };

    const updated = connections.map(c => c.id === updatedConn.id ? updatedConn : c);
    setConnections(updated);
    if (onUpdateConnections) onUpdateConnections(updated);

    if (onAddAuditLog) {
      onAddAuditLog({
        id: Date.now().toString(),
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'update',
        category: 'accounting',
        entityId: updatedConn.id,
        entityName: updatedConn.subscriberName,
        details: `تعديل بيانات طلب إدخال الخدمة (${updatedConn.voucherNo || updatedConn.id}) للمشترك (${updatedConn.subscriberName})`,
        timestamp: new Date().toISOString()
      });
    }

    setEditingConnection(null);
  };

  const handleSettleConnection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingConnection) return;
    const payment = Number(settlePaymentAmount);
    if (!payment || payment <= 0) return;

    const currentPaid = Number(settlingConnection.paidAmount || 0);
    const newPaid = currentPaid + payment;
    const totalFee = Number(settlingConnection.totalFee || 0);
    const newRemaining = Math.max(0, totalFee - newPaid);
    const newStatus = newPaid >= totalFee ? 'completed' : 'in_progress';

    const settlementNote = `سداد دفعة بقيمة ${payment.toLocaleString()} ${settings.currency} (${settlePaymentMethod === 'cash' ? 'نقداً بالصندوق' : 'تحويل بنكي'}) بتاريخ ${new Date().toISOString().substring(0, 10)}${settleNotes ? ' - ' + settleNotes : ''}`;

    const updatedConn: ServiceConnection = {
      ...settlingConnection,
      paidAmount: newPaid,
      remainingAmount: newRemaining,
      status: newStatus,
      notes: settlingConnection.notes ? `${settlingConnection.notes}\n[${settlementNote}]` : settlementNote
    };

    const updated = connections.map(c => c.id === updatedConn.id ? updatedConn : c);
    setConnections(updated);
    if (onUpdateConnections) onUpdateConnections(updated);

    if (onAddAuditLog) {
      onAddAuditLog({
        id: Date.now().toString(),
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'update',
        category: 'accounting',
        entityId: updatedConn.id,
        entityName: updatedConn.subscriberName,
        details: `تحصيل دفعة متبقية من رسوم إدخال الخدمة بقيمة ${payment.toLocaleString()} ${settings.currency} للسند (${updatedConn.voucherNo || updatedConn.id}) للمشترك (${updatedConn.subscriberName})`,
        timestamp: new Date().toISOString()
      });
    }

    setSettlingConnection(null);
    setSettlePaymentAmount('');
    setSettleNotes('');
  };

  const handleDeleteConnection = async (conn: ServiceConnection) => {
    const connMonth = (conn.date || '').substring(0, 7);
    if ((settings.closedPeriods || []).some(p => p.month === connMonth && p.status === 'closed')) {
      alert(`عذراً، الفترة المالية لشهر (${connMonth}) مقفلة ومرحلة رسمياً. لا يمكن حذف هذه المعاملة.`);
      return;
    }

    if (!confirm(`هل أنت متأكد تماماً من حذف سجل إدخال الخدمة للمشترك (${conn.subscriberName}) برقم السند (${conn.voucherNo || conn.id})؟ لا يمكن التراجع عن ذلك.`)) {
      return;
    }

    const updated = connections.filter(c => c.id !== conn.id);
    setConnections(updated);
    if (onUpdateConnections) onUpdateConnections(updated);

    try {
      await deleteConnectionFromCloud(conn.id);
    } catch (err) {
      console.warn('Error deleting connection from cloud:', err);
    }

    if (onAddAuditLog) {
      onAddAuditLog({
        id: Date.now().toString(),
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'delete',
        category: 'accounting',
        entityId: conn.id,
        entityName: conn.subscriberName,
        details: `حذف سجل إدخال الخدمة (${conn.voucherNo || conn.id}) للمشترك (${conn.subscriberName}) بقيمة ${conn.totalFee.toLocaleString()} ${settings.currency}`,
        timestamp: new Date().toISOString()
      });
    }
  };

  const handleAddEmployeeTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployeeTx.amount || !newEmployeeTx.employeeName || !newEmployeeTx.date) return;
    
    const tx: EmployeeTransaction = {
      id: Date.now().toString(),
      employeeId: Date.now().toString(),
      employeeName: newEmployeeTx.employeeName,
      type: newEmployeeTx.type as 'salary' | 'advance' | 'allowance',
      amount: Number(newEmployeeTx.amount),
      date: newEmployeeTx.date,
      description: newEmployeeTx.description ?? '',
      recordedBy: currentUser.name
    };
    const updated = [tx, ...employeeTxs];
    setEmployeeTxs(updated);
    if (onUpdateEmployeeTxs) onUpdateEmployeeTxs(updated);
    setShowAddEmployeeTx(false);
    setNewEmployeeTx({ type: 'salary', date: new Date().toISOString().split('T')[0] });
  };

  const handleAddManualJournal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newManualJournal.amount || !newManualJournal.debitAccountName || !newManualJournal.creditAccountName) return;

    const entry: JournalEntry = {
      id: Date.now().toString(),
      voucherNumber: `JV-${Math.floor(1000 + Math.random() * 9000)}`,
      date: newManualJournal.date || new Date().toISOString().split('T')[0],
      type: 'manual',
      typeLabel: 'قيد تسوية يدوي',
      debitAccountCode: newManualJournal.debitAccountCode || '5010',
      debitAccountName: newManualJournal.debitAccountName || 'مصروفات متنوعة',
      creditAccountCode: newManualJournal.creditAccountCode || '1010',
      creditAccountName: newManualJournal.creditAccountName || 'الصندوق الرئيسي',
      amount: Number(newManualJournal.amount),
      description: newManualJournal.description || 'قيد تسوية محاسبي',
      recordedBy: currentUser.name
    };

    const updated = [entry, ...manualJournalEntries];
    setManualJournalEntries(updated);
    if (onUpdateManualJournalEntries) onUpdateManualJournalEntries(updated);
    setShowAddManualJournal(false);
    setNewManualJournal({
      date: new Date().toISOString().split('T')[0],
      debitAccountCode: '5010',
      debitAccountName: 'مصروفات تشغيلية (وقود وصيانة)',
      creditAccountCode: '1010',
      creditAccountName: 'حـ/ الصندوق الرئيسي',
      type: 'manual',
      typeLabel: 'قيد يدوي'
    });
  };

  // Helper: check if a month is closed
  const isMonthClosed = (dateOrMonthStr?: string): boolean => {
    if (!dateOrMonthStr) return false;
    const month = dateOrMonthStr.substring(0, 7);
    return (settings.closedPeriods || []).some(cp => cp.month === month);
  };

  // Helper: get closed period details
  const getClosedPeriod = (dateOrMonthStr?: string): ClosedPeriod | undefined => {
    if (!dateOrMonthStr) return undefined;
    const month = dateOrMonthStr.substring(0, 7);
    return (settings.closedPeriods || []).find(cp => cp.month === month);
  };

  // Helper: calculate complete financials for a specific month
  const calculateMonthFinancials = (monthStr: string) => {
    const monthReadings = readings.filter(r => !r.isRejected && (
      r.billingMonth === monthStr || 
      (r.readingDate && r.readingDate.startsWith(monthStr)) ||
      ((r as any).month === monthStr)
    ));
    const electricityBilled = monthReadings.reduce((sum, r) => sum + (r.totalAmount || (r as any).netAmount || (r as any).amount || 0), 0);

    const monthPayments = payments.filter(p => !p.isRejected && (
      (p.paymentDate && p.paymentDate.startsWith(monthStr)) ||
      ((p as any).date && (p as any).date.startsWith(monthStr))
    ));
    const electricityCollected = monthPayments.reduce((sum, p) => sum + (p.amountPaid || (p as any).amount || 0), 0);

    const monthConnections = connections.filter(c => !c.isRejected && (c as any).status !== 'rejected' && (
      (c.date && c.date.startsWith(monthStr)) ||
      ((c as any).createdAt && (c as any).createdAt.startsWith(monthStr))
    ));
    const connectionRevenue = monthConnections.reduce((sum, c) => sum + (c.paidAmount || 0), 0);

    const monthExpenses = expenses.filter(e => !e.isRejected && (e as any).status !== 'rejected' && (
      (e.date && e.date.startsWith(monthStr)) ||
      ((e as any).createdAt && (e as any).createdAt.startsWith(monthStr))
    ));
    const expensesTotal = monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const monthPurchases = purchases.filter(p => !p.isRejected && (p as any).status !== 'rejected' && (
      (p.date && p.date.startsWith(monthStr)) ||
      ((p as any).createdAt && (p as any).createdAt.startsWith(monthStr))
    ));
    const purchasesTotal = monthPurchases.reduce((sum, p) => {
      const amountVal = Number(p.amount) || 0;
      const paidVal = p.paidAmount !== undefined ? Number(p.paidAmount) : (p.paymentType === 'cash' ? amountVal : 0);
      return sum + paidVal;
    }, 0);

    const monthEmpTxs = employeeTxs.filter(t => !t.isRejected && (t as any).status !== 'rejected' && (
      (t.date && t.date.startsWith(monthStr)) ||
      ((t as any).createdAt && (t as any).createdAt.startsWith(monthStr))
    ));
    const empTxsTotal = monthEmpTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const totalRevenues = electricityCollected + connectionRevenue;
    const totalExpenses = expensesTotal + purchasesTotal + empTxsTotal;
    const netProfit = totalRevenues - totalExpenses;

    return {
      month: monthStr,
      electricityBilled,
      electricityCollected,
      connectionRevenue,
      expensesTotal,
      purchasesTotal,
      empTxsTotal,
      totalRevenues,
      totalExpenses,
      netProfit,
      readingsCount: monthReadings.length,
      paymentsCount: monthPayments.length,
      expensesCount: monthExpenses.length,
      connectionsCount: monthConnections.length
    };
  };

  // All distinct historical months with transactions
  const allHistoricalMonths = useMemo(() => {
    const set = new Set<string>();
    const currentMonth = new Date().toISOString().substring(0, 7);
    set.add(currentMonth);

    const now = new Date();
    for (let i = 1; i <= 11; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      set.add(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
    }

    readings.forEach(r => {
      if (r.billingMonth) set.add(r.billingMonth.substring(0, 7));
      if ((r as any).month) set.add((r as any).month.substring(0, 7));
      if (r.readingDate) set.add(r.readingDate.substring(0, 7));
    });
    payments.forEach(p => {
      if (p.paymentDate) set.add(p.paymentDate.substring(0, 7));
      if ((p as any).date) set.add((p as any).date.substring(0, 7));
    });
    expenses.forEach(e => {
      if (e.date) set.add(e.date.substring(0, 7));
    });
    purchases.forEach(p => {
      if (p.date) set.add(p.date.substring(0, 7));
    });
    employeeTxs.forEach(t => {
      if (t.date) set.add(t.date.substring(0, 7));
    });
    connections.forEach(c => {
      if (c.date) set.add(c.date.substring(0, 7));
      if ((c as any).createdAt) set.add((c as any).createdAt.substring(0, 7));
    });
    (settings.closedPeriods || []).forEach(cp => {
      if (cp.month) set.add(cp.month);
    });

    return Array.from(set).sort().reverse();
  }, [readings, payments, expenses, purchases, employeeTxs, connections, settings.closedPeriods]);

  // Handler: Close Accounting Period (إغلاق وترحيل الشهر المالي)
  const handleCloseAccountingPeriod = async (month: string, notes: string = '') => {
    if (!month) return;
    const financials = calculateMonthFinancials(month);
    
    const newPeriod: ClosedPeriod = {
      id: 'cp-' + Date.now(),
      month,
      closedAt: new Date().toISOString(),
      closedBy: currentUser.name || currentUser.username || 'الإدارة العامة',
      notes,
      totalRevenues: financials.totalRevenues,
      totalExpenses: financials.totalExpenses,
      netProfit: financials.netProfit,
      readingsCount: financials.readingsCount,
      paymentsCount: financials.paymentsCount,
    };

    const updatedPeriods = [...(settings.closedPeriods || []).filter(p => p.month !== month), newPeriod];
    const updatedSettings: SystemSettings = {
      ...settings,
      closedPeriods: updatedPeriods
    };

    if (onUpdateSettings) onUpdateSettings(updatedSettings);
    await syncSettingsToCloud(updatedSettings);

    if (onAddAuditLog) {
      onAddAuditLog({
        id: 'log-' + Date.now(),
        userId: currentUser.id || 'admin',
        userName: currentUser.name || currentUser.username || 'الإدارة',
        action: 'إغلاق فترة مالية',
        details: `تم إغلاق وترحيل الفترة المالية لشهر ${month} بنجاح بإجمالي إيرادات ${financials.totalRevenues.toLocaleString()} ${settings.currency} ومصروفات ${financials.totalExpenses.toLocaleString()} ${settings.currency}.`,
        timestamp: new Date().toISOString(),
        category: 'financial'
      });
    }

    setShowClosePeriodModal(false);
    setClosingNotes('');
    alert(`✅ تم إغلاق وترحيل شهر (${month}) بنجاح!\nأصبحت جميع الفواتير وسندات القبض والقيود اليومية الخاصة بهذا الشهر مقفلة نهائياً ومحمية من الحذف والتعديل المباشر وفقاً للأصول المحاسبية.`);
  };

  // Handler: Reopen Accounting Period (إعادة فتح فترة مالية)
  const handleReopenAccountingPeriod = async (month: string, reason: string) => {
    if (!reason.trim()) {
      alert('يرجى كتابة سبب إعادة فتح الفترة المالية للتوثيق في سجل التدقيق.');
      return;
    }
    const updatedPeriods = (settings.closedPeriods || []).filter(p => p.month !== month);
    const updatedSettings: SystemSettings = {
      ...settings,
      closedPeriods: updatedPeriods
    };

    if (onUpdateSettings) onUpdateSettings(updatedSettings);
    await syncSettingsToCloud(updatedSettings);

    if (onAddAuditLog) {
      onAddAuditLog({
        id: 'log-' + Date.now(),
        userId: currentUser.id || 'admin',
        userName: currentUser.name || currentUser.username || 'الإدارة',
        action: 'إعادة فتح فترة مالية',
        details: `تم إلغاء إغلاق وإعادة فتح الفترة المالية لشهر ${month}. السبب: ${reason}`,
        timestamp: new Date().toISOString(),
        category: 'financial'
      });
    }

    setReopenPeriodMonth(null);
    setReopenReason('');
    alert(`🔓 تم إعادة فتح الفترة المالية لشهر (${month}) بنجاح.`);
  };

  // Handler: Execute Reverse Entry (ترحيل قيد تسوية عكسي)
  const handleExecuteReverseEntry = async (originalEntry: JournalEntry, reason: string, customDate: string) => {
    if (!reason.trim()) {
      alert('يرجى تحديد سبب إنشاء قيد التسوية العكسي.');
      return;
    }

    const reverseEntry: JournalEntry = {
      id: `rev-${Date.now()}`,
      voucherNumber: `REV-${Math.floor(100000 + Math.random() * 900000)}`,
      date: customDate || new Date().toISOString().substring(0, 10),
      type: 'manual',
      typeLabel: 'قيد تسوية عكسي',
      debitAccountCode: originalEntry.creditAccountCode,
      debitAccountName: originalEntry.creditAccountName,
      creditAccountCode: originalEntry.debitAccountCode,
      creditAccountName: originalEntry.debitAccountName,
      amount: originalEntry.amount,
      description: `قيد تسوية عكسي لتصحيح القيد (${originalEntry.voucherNumber}) المؤرخ ${originalEntry.date} - السبب: ${reason}`,
      recordedBy: currentUser.name || currentUser.username || 'المحاسب'
    };

    const updatedManual = [reverseEntry, ...manualJournalEntries];
    setManualJournalEntries(updatedManual);
    if (onUpdateManualJournalEntries) onUpdateManualJournalEntries(updatedManual);
    await syncJournalEntryToCloud(reverseEntry);

    if (onAddAuditLog) {
      onAddAuditLog({
        id: 'log-' + Date.now(),
        userId: currentUser.id || 'admin',
        userName: currentUser.name || currentUser.username || 'المحاسب',
        action: 'إنشاء قيد عكسي',
        details: `تم إنشاء قيد تسوية عكسي (${reverseEntry.voucherNumber}) بمبلغ ${reverseEntry.amount.toLocaleString()} ${settings.currency} لتصحيح المعاملة (${originalEntry.voucherNumber}).`,
        timestamp: new Date().toISOString(),
        category: 'financial'
      });
    }

    setReversingEntry(null);
    setReversalReason('');
    alert(`✅ تم ترحيل قيد التسوية العكسي (${reverseEntry.voucherNumber}) بنجاح إلى دفتر القيود اليومية لتسوية الأثر المالي في الفترة المفتوحة الحالية!`);
  };

  const handleSaveEditedJournalEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJournalEntry || !editingJournalEntry.amount) return;

    if (isMonthClosed(editingJournalEntry.date)) {
      alert(`⚠️ لا يمكن تعديل هذا القيد لأن تاريخه (${editingJournalEntry.date}) يقع ضمن فترة محاسبية مقفلة.`);
      return;
    }

    const updatedEntry: JournalEntry = {
      ...editingJournalEntry,
      amount: Number(editingJournalEntry.amount)
    };

    const updated = manualJournalEntries.map(j => j.id === updatedEntry.id ? updatedEntry : j);
    setManualJournalEntries(updated);
    if (onUpdateManualJournalEntries) onUpdateManualJournalEntries(updated);
    setEditingJournalEntry(null);
  };

  const handleDeleteJournalEntry = async (id: string) => {
    const entry = manualJournalEntries.find(j => j.id === id);
    if (entry && isMonthClosed(entry.date)) {
      const wantReverse = confirm(
        `🔒 هذا القيد اليدوي مؤرخ في فترة مقفلة ومرحلة نهائياً (${entry.date.substring(0, 7)}).\nلا يمكن حذفه مباشرة وفقاً للأصول المحاسبية.\n\nهل ترغب في إنشاء قيد تسوية عكسي في الفترة الحالية لإلغاء أثره المالي؟`
      );
      if (wantReverse) {
        setReversingEntry(entry);
        setReversalReason(`تسوية وعكس القيد اليدوي ${entry.voucherNumber}`);
      }
      return;
    }

    if (confirm('هل أنت متأكد من حذف هذا القيد المحاسبي اليدوي؟ سيتم حذفه من قاعدة البيانات والسحابة فوراً.')) {
      const updated = manualJournalEntries.filter(j => j.id !== id);
      setManualJournalEntries(updated);
      if (onUpdateManualJournalEntries) onUpdateManualJournalEntries(updated);
      try {
        await deleteJournalEntryFromCloud(id);
      } catch (err) {
        console.warn('Error deleting journal entry from cloud:', err);
      }
    }
  };

  const handleRejectOrDeleteEntry = async (entry: JournalEntry) => {
    // Check if the entry belongs to a closed accounting period
    if (isMonthClosed(entry.date)) {
      const closedP = getClosedPeriod(entry.date);
      const wantReverse = confirm(
        `🔒 تنبيه محاسبي هام:\nالقيد (${entry.voucherNumber}) يقع ضمن فترة محاسبية مقفلة ومرحلة نهائياً (${entry.date.substring(0, 7)}) تم إغلاقها بتاريخ ${closedP?.closedAt ? new Date(closedP.closedAt).toLocaleDateString('ar-SA') : ''}.\n\nوفقاً للأصول والمعايير المحاسبية المعتمدة، لا يجوز حذف أو تعديل العمليات في الفترات المغلقة مباشرة.\n\nهل ترغب في إنشاء «قيد تسوية عكسي» (Reverse Entry) في الفترة المفتوحة الحالية لتصحيح وإلغاء الأثر المالي؟`
      );
      if (wantReverse) {
        setReversingEntry(entry);
        setReversalReason(`تصحيح وإلغاء أثر المعاملة ${entry.voucherNumber} من الفترة المقفلة ${entry.date.substring(0, 7)}`);
      }
      return;
    }

    if (!confirm(`هل أنت متأكد من رفض وحذف القيد المحاسبي (${entry.voucherNumber})؟\nسيتم حذف المعاملة الأصلية (الفاتورة / سند القبض / المصروف) نهائياً من قواعد البيانات وحذف القيد وإلغاء أثره المالي فوراً.`)) return;

    if (entry.id.startsWith('pay-')) {
      const payId = entry.id.replace('pay-', '');
      const updated = payments.filter(p => p.id !== payId);
      if (onUpdatePayments) onUpdatePayments(updated);
      try {
        await deletePaymentFromCloud(payId);
      } catch (err) {
        console.warn('Error deleting payment from cloud:', err);
      }
    } else if (entry.id.startsWith('rdg-')) {
      const rdgId = entry.id.replace('rdg-', '');
      const updated = readings.filter(r => r.id !== rdgId);
      if (onUpdateReadings) onUpdateReadings(updated);
      try {
        await deleteReadingFromCloud(rdgId);
      } catch (err) {
        console.warn('Error deleting reading from cloud:', err);
      }
    } else if (entry.id.startsWith('exp-')) {
      const expId = entry.id.replace('exp-', '');
      const updated = expenses.filter(e => e.id !== expId);
      setExpenses(updated);
      if (onUpdateExpenses) onUpdateExpenses(updated);
      try {
        await deleteExpenseFromCloud(expId);
      } catch (err) {
        console.warn('Error deleting expense from cloud:', err);
      }
    } else if (entry.id.startsWith('emp-')) {
      const empId = entry.id.replace('emp-', '');
      const updated = employeeTxs.filter(tx => tx.id !== empId);
      setEmployeeTxs(updated);
      if (onUpdateEmployeeTxs) onUpdateEmployeeTxs(updated);
      try {
        await deleteEmployeeTxFromCloud(empId);
      } catch (err) {
        console.warn('Error deleting employee transaction from cloud:', err);
      }
    } else if (entry.id.startsWith('conn-')) {
      const connId = entry.id.replace('conn-', '');
      const updated = connections.filter(c => c.id !== connId);
      setConnections(updated);
      if (onUpdateConnections) onUpdateConnections(updated);
      try {
        await deleteConnectionFromCloud(connId);
      } catch (err) {
        console.warn('Error deleting connection from cloud:', err);
      }
    } else if (entry.id.startsWith('pur-')) {
      const purId = entry.id.replace('pur-', '');
      const updated = purchases.filter(p => p.id !== purId);
      setPurchases(updated);
      if (onUpdatePurchases) onUpdatePurchases(updated);
      try {
        await deletePurchaseFromCloud(purId);
      } catch (err) {
        console.warn('Error deleting purchase from cloud:', err);
      }
    } else if (entry.id.startsWith('trf-')) {
      const trfId = entry.id.replace('trf-', '');
      const updated = treasuryTransfers.filter(t => t.id !== trfId);
      setTreasuryTransfers(updated);
      if (onUpdateTreasuryTransfers) onUpdateTreasuryTransfers(updated);
      try {
        await deleteTreasuryTransferFromCloud(trfId);
      } catch (err) {
        console.warn('Error deleting transfer from cloud:', err);
      }
    } else {
      handleDeleteJournalEntry(entry.id);
    }
  };

  const handleAddTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTransfer.amount || !newTransfer.fromAccount || !newTransfer.toAccount) {
      alert('يرجى تعبئة جميع بيانات السند المطلوبة');
      return;
    }

    if (newTransfer.fromAccount.trim() === newTransfer.toAccount.trim()) {
      alert('لا يمكن التحويل من وإلى نفس الحساب أو الصندوق! يرجى اختيار حسابين مختلفين.');
      return;
    }

    if (Number(newTransfer.amount) <= 0) {
      alert('يجب أن يكون مبلغ التحويل أكبر من الصفر');
      return;
    }

    const trf: TreasuryTransfer = {
      id: Date.now().toString(),
      transferNumber: `TRF-${Math.floor(1000 + Math.random() * 9000)}`,
      date: newTransfer.date || new Date().toISOString().split('T')[0],
      fromAccount: newTransfer.fromAccount,
      toAccount: newTransfer.toAccount,
      amount: Number(newTransfer.amount),
      notes: newTransfer.notes || 'تحويل مالي بين الحسابات',
      recordedBy: currentUser.name || currentUser.username || 'مدير النظام'
    };

    const updated = [trf, ...treasuryTransfers];
    setTreasuryTransfers(updated);
    if (onUpdateTreasuryTransfers) onUpdateTreasuryTransfers(updated);
    try {
      await syncTreasuryTransferToCloud(trf);
    } catch (err) {
      console.warn('Error syncing transfer to cloud:', err);
    }

    if (onAddAuditLog) {
      onAddAuditLog({
        id: `log-trf-${Date.now()}`,
        action: 'تحويل مالي بين الصناديق',
        details: `تحويل مبلغ ${trf.amount} ${settings.currency} من (${trf.fromAccount}) إلى (${trf.toAccount}) - سند رقم ${trf.transferNumber}`,
        performedBy: currentUser.name || currentUser.username,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
      });
    }

    setShowAddTransfer(false);
    setPrintableTransferVoucher(trf);
    setNewTransfer({
      date: new Date().toISOString().split('T')[0],
      fromAccount: 'الصندوق الرئيسي (الكاش)',
      toAccount: 'حساب بنك الكريمي'
    });
  };

  const handleDeleteTransfer = async (trfId: string) => {
    const trf = treasuryTransfers.find(t => t.id === trfId);
    if (!trf) return;
    if (!window.confirm(`هل أنت متأكد من حذف سند التحويل والتوريد رقم (${trf.transferNumber}) بمبلغ ${trf.amount} ${settings.currency}؟ سيتم إعادة المبلغ لذمة الحساب المُسلّم.`)) return;

    const updated = treasuryTransfers.filter(t => t.id !== trfId);
    setTreasuryTransfers(updated);
    if (onUpdateTreasuryTransfers) onUpdateTreasuryTransfers(updated);
    try {
      await deleteTreasuryTransferFromCloud(trfId);
    } catch (err) {
      console.warn('Error deleting transfer from cloud:', err);
    }

    if (onAddAuditLog) {
      onAddAuditLog({
        id: `log-del-trf-${Date.now()}`,
        action: 'إلغاء وحذف سند توريد/تحويل',
        details: `حذف سند رقم (${trf.transferNumber}) بمبلغ ${trf.amount} ${settings.currency} من (${trf.fromAccount}) إلى (${trf.toAccount})`,
        performedBy: currentUser.name || currentUser.username,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
      });
    }
  };

  // --- AUTOMATED FULL JOURNAL (سجل القيود اليومية التلقائي) ---
  const autoGeneratedJournalEntries = useMemo(() => {
    const list: JournalEntry[] = [];

    // 1. Subscriber Cash Collections (سندات القبض)
    payments.forEach((p, idx) => {
      if (!p.isRejected) {
        list.push({
          id: `pay-${p.id}`,
          voucherNumber: `RCV-${p.receiptNumber || (1000 + idx)}`,
          date: p.paymentDate,
          type: 'receipt',
          typeLabel: 'سند قبض مشترك',
          debitAccountCode: '1010',
          debitAccountName: 'حـ/ النقدية والصناديق والبنك',
          creditAccountCode: '1020',
          creditAccountName: 'حـ/ ذمم ومدينو المشتركين',
          amount: p.amountPaid,
          description: `سداد قيمة استهلاك كهرباء - المشترك (${p.subscriberName})`,
          recordedBy: (p as any).collectorName || p.receivedBy || 'المحصل الميداني'
        });
      }
    });

    // 2. Electricity Billing (فواتير قراءات العدادات)
    readings.forEach((r, idx) => {
      if (!r.isRejected) {
        list.push({
          id: `rdg-${r.id}`,
          voucherNumber: `INV-${2000 + idx}`,
          date: r.readingDate,
          type: 'billing',
          typeLabel: 'فاتورة استهلاك كهرباء',
          debitAccountCode: '1020',
          debitAccountName: 'حـ/ ذمم ومدينو المشتركين',
          creditAccountCode: '4010',
          creditAccountName: 'حـ/ إيرادات مبيعات الطاقة الكهربائية',
          amount: r.totalAmount,
          description: `إصدار فاتورة شهر ${r.billingMonth} - المشترك (${r.subscriberName}) - ${r.consumption} ك.و.س`,
          recordedBy: 'نظام الفوترة الآلي'
        });
      }
    });

    // 3. Operational Expenses (المصروفات التشغيلية)
    expenses.forEach((e, idx) => {
      if (!e.isRejected && (e as any).status !== 'rejected') {
        list.push({
          id: `exp-${e.id}`,
          voucherNumber: `EXP-${3000 + idx}`,
          date: e.date,
          type: 'expense',
          typeLabel: 'سند صرف مصروفات',
          debitAccountCode: '5010',
          debitAccountName: `حـ/ مصروفات - ${e.category}`,
          creditAccountCode: '1010',
          creditAccountName: 'حـ/ النقدية والصناديق الرئيسي',
          amount: e.amount,
          description: `${e.description || e.category}`,
          recordedBy: e.recordedBy
        });
      }
    });

    // 4. Employee Transactions (الرواتب والسلف)
    employeeTxs.forEach((tx, idx) => {
      if (!tx.isRejected && (tx as any).status !== 'rejected') {
        list.push({
          id: `emp-${tx.id}`,
          voucherNumber: `PAY-${4000 + idx}`,
          date: tx.date,
          type: 'payroll',
          typeLabel: tx.type === 'salary' ? 'صرف راتب موظف' : 'صرف سلفة موظف',
          debitAccountCode: '5020',
          debitAccountName: 'حـ/ الرواتب والأجور والسلف',
          creditAccountCode: '1010',
          creditAccountName: 'حـ/ النقدية والصناديق',
          amount: tx.amount,
          description: `${tx.description} - الموظف: ${tx.employeeName}`,
          recordedBy: tx.recordedBy
        });
      }
    });

    // 5. Connection Fees (رسوم إدخال الخدمة)
    connections.forEach((c, idx) => {
      if (c.paidAmount > 0 && !c.isRejected && (c as any).status !== 'rejected') {
        list.push({
          id: `conn-${c.id}`,
          voucherNumber: `CON-${5000 + idx}`,
          date: c.date,
          type: 'connection',
          typeLabel: 'إيرادات إدخال خدمة',
          debitAccountCode: '1010',
          debitAccountName: 'حـ/ النقدية والصناديق',
          creditAccountCode: '4020',
          creditAccountName: 'حـ/ إيرادات رسوم الاشتراك والتوصيل',
          amount: c.paidAmount,
          description: `رسوم إدخال خدمة لمشترك جديد: (${c.subscriberName})`,
          recordedBy: 'إدارة المشتركين'
        });
      }
    });

    // 6. Supplier Purchases (فواتير المشتريات)
    purchases.forEach((p, idx) => {
      if (!p.isRejected && (p as any).status !== 'rejected') {
        const amountVal = Number(p.amount) || 0;
        const pType = p.paymentType || 'cash';
        const paidVal = p.paidAmount !== undefined ? Number(p.paidAmount) : (pType === 'cash' ? amountVal : 0);
        const remainingVal = Math.max(0, amountVal - paidVal);

        // Paid Portion (Cash / Treasury / Bank)
        if (paidVal > 0) {
          list.push({
            id: `pur-cash-${p.id}`,
            voucherNumber: `PUR-${6000 + idx}`,
            date: p.date,
            type: 'purchase',
            typeLabel: 'فاتورة مشتريات (مدفوع نقداً)',
            debitAccountCode: '5030',
            debitAccountName: 'حـ/ مشتريات وتجهيزات الشبكة والمحولات',
            creditAccountCode: '1010',
            creditAccountName: 'حـ/ النقدية والصناديق والبنوك',
            amount: paidVal,
            description: `مشتريات مواد ومهمات (سداد نقدي): ${p.items || 'مشتريات'} - المورد: ${p.supplier}`,
            recordedBy: p.recordedBy || 'إدارة المشتريات'
          });
        }

        // Unpaid Credit Portion (Accounts Payable)
        if (remainingVal > 0) {
          list.push({
            id: `pur-credit-${p.id}`,
            voucherNumber: `PUR-${6000 + idx}-AP`,
            date: p.date,
            type: 'purchase',
            typeLabel: 'فاتورة مشتريات (آجل على المورد)',
            debitAccountCode: '5030',
            debitAccountName: 'حـ/ مشتريات وتجهيزات الشبكة والمحولات',
            creditAccountCode: '2010',
            creditAccountName: `حـ/ دائنو الموردين والشركات (${p.supplier})`,
            amount: remainingVal,
            description: `مشتريات مواد ومهمات (آجل): ${p.items || 'مشتريات'} - المورد: ${p.supplier}`,
            recordedBy: p.recordedBy || 'إدارة المشتريات'
          });
        }
      }
    });

    // 7. Treasury Transfers
    treasuryTransfers.forEach((trf, idx) => {
      if (!trf.isRejected && (trf as any).status !== 'rejected') {
        const getAccountCode = (accName: string) => {
          const lower = (accName || '').toLowerCase();
          if (lower.includes('الرئيسي') || lower.includes('الكاش')) return '1010';
          if (lower.includes('الكريمي') || lower.includes('بنك') || lower.includes('جيب') || lower.includes('محفظة') || lower.includes('الأهلي') || lower.includes('الاهلي')) return '1020';
          return '1030';
        };

        list.push({
          id: `trf-${trf.id}`,
          voucherNumber: trf.transferNumber,
          date: trf.date,
          type: 'transfer',
          typeLabel: 'سند تحويل مالي',
          debitAccountCode: getAccountCode(trf.toAccount),
          debitAccountName: `حـ/ ${trf.toAccount}`,
          creditAccountCode: getAccountCode(trf.fromAccount),
          creditAccountName: `حـ/ ${trf.fromAccount}`,
          amount: trf.amount,
          description: trf.notes,
          recordedBy: trf.recordedBy
        });
      }
    });

    // Merge with Manual Entries
    const validManualEntries = manualJournalEntries.filter(m => !m.isRejected && (m as any).status !== 'rejected');
    const merged = [...list, ...validManualEntries];
    return merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, readings, expenses, employeeTxs, connections, purchases, treasuryTransfers, manualJournalEntries]);

  // Filtered Journal Entries
  const filteredJournalEntries = useMemo(() => {
    return autoGeneratedJournalEntries.filter(entry => {
      const matchSearch = journalSearch === '' || 
        entry.voucherNumber.toLowerCase().includes(journalSearch.toLowerCase()) ||
        entry.description.includes(journalSearch) ||
        entry.debitAccountName.includes(journalSearch) ||
        entry.creditAccountName.includes(journalSearch);

      const matchType = journalTypeFilter === 'all' || entry.type === journalTypeFilter;

      return matchSearch && matchType;
    });
  }, [autoGeneratedJournalEntries, journalSearch, journalTypeFilter]);

  // --- TRIAL BALANCE CALCULATION (ميزان المراجعة بالمجاميع والترصيد المحاسبي) ---
  const trialBalanceAccounts = useMemo(() => {
    const defaultAccountsMap = new Map<string, {
      code: string;
      name: string;
      category: string;
      isAssetOrExpense: boolean;
      debit: number;
      credit: number;
    }>();

    const standardChart = [
      { code: '1010', name: 'النقدية والصناديق والبنوك', category: 'أصول متداولة', isAssetOrExpense: true },
      { code: '1020', name: 'ذمم ومدينو المشتركين (الفواتير)', category: 'أصول متداولة', isAssetOrExpense: true },
      { code: '1030', name: 'أصول ومعدات وتجهيزات الشبكة', category: 'أصول غير متداولة', isAssetOrExpense: true },
      { code: '2010', name: 'دائنو الموردين والشركات', category: 'التزامات متداولة', isAssetOrExpense: false },
      { code: '2020', name: 'مستحقات الرواتب والأجور المتبقية', category: 'التزامات متداولة', isAssetOrExpense: false },
      { code: '3010', name: 'رأس المال ورأس المال العامل', category: 'حقوق الملكية', isAssetOrExpense: false },
      { code: '4010', name: 'إيرادات مبيعات الطاقة الكهربائية', category: 'إيرادات تشغيلية', isAssetOrExpense: false },
      { code: '4020', name: 'إيرادات رسوم الاشتراك والتوصيل', category: 'إيرادات تشغيلية', isAssetOrExpense: false },
      { code: '4030', name: 'إيرادات متنوعة وأخرى', category: 'إيرادات غير تشغيلية', isAssetOrExpense: false },
      { code: '5010', name: 'مصروفات تشغيلية ووقود وصيانة', category: 'مصروفات تشغيلية', isAssetOrExpense: true },
      { code: '5020', name: 'الرواتب والأجور والسلف والمكافآت', category: 'مصروفات تشغيلية', isAssetOrExpense: true },
      { code: '5030', name: 'مشتريات وتجهيزات ومستلزمات تشغيل', category: 'مصروفات تشغيلية', isAssetOrExpense: true },
      { code: '5040', name: 'مصروفات إدارية ونثريات', category: 'مصروفات إدارية', isAssetOrExpense: true },
    ];

    standardChart.forEach(acc => {
      defaultAccountsMap.set(acc.code, { ...acc, debit: 0, credit: 0 });
    });

    // Accumulate debits and credits from ALL journal entries
    autoGeneratedJournalEntries.forEach(entry => {
      const amount = Number(entry.amount) || 0;
      if (amount <= 0) return;

      // Debit side
      const dCode = entry.debitAccountCode.slice(0, 4);
      if (defaultAccountsMap.has(dCode)) {
        defaultAccountsMap.get(dCode)!.debit += amount;
      } else {
        defaultAccountsMap.set(entry.debitAccountCode, {
          code: entry.debitAccountCode,
          name: entry.debitAccountName,
          category: entry.debitAccountCode.startsWith('1') ? 'أصول' : entry.debitAccountCode.startsWith('5') ? 'مصروفات' : 'حساب فرعي',
          isAssetOrExpense: entry.debitAccountCode.startsWith('1') || entry.debitAccountCode.startsWith('5'),
          debit: amount,
          credit: 0
        });
      }

      // Credit side
      const cCode = entry.creditAccountCode.slice(0, 4);
      if (defaultAccountsMap.has(cCode)) {
        defaultAccountsMap.get(cCode)!.credit += amount;
      } else {
        const existing = defaultAccountsMap.get(entry.creditAccountCode);
        if (existing) {
          existing.credit += amount;
        } else {
          defaultAccountsMap.set(entry.creditAccountCode, {
            code: entry.creditAccountCode,
            name: entry.creditAccountName,
            category: entry.creditAccountCode.startsWith('2') ? 'التزامات' : entry.creditAccountCode.startsWith('4') ? 'إيرادات' : 'حساب فرعي',
            isAssetOrExpense: entry.creditAccountCode.startsWith('1') || entry.creditAccountCode.startsWith('5'),
            debit: 0,
            credit: amount
          });
        }
      }
    });

    // Compute Net Debit & Net Credit
    return Array.from(defaultAccountsMap.values()).map(acc => {
      let netDebit = 0;
      let netCredit = 0;

      if (acc.isAssetOrExpense) {
        if (acc.debit >= acc.credit) {
          netDebit = acc.debit - acc.credit;
        } else {
          netCredit = acc.credit - acc.debit;
        }
      } else {
        if (acc.credit >= acc.debit) {
          netCredit = acc.credit - acc.debit;
        } else {
          netDebit = acc.debit - acc.credit;
        }
      }

      return {
        ...acc,
        debit: netDebit,
        credit: netCredit
      };
    }).sort((a, b) => a.code.localeCompare(b.code));
  }, [autoGeneratedJournalEntries]);

  const trialBalanceTotals = useMemo(() => {
    const totalDebit = trialBalanceAccounts.reduce((sum, a) => sum + a.debit, 0);
    const totalCredit = trialBalanceAccounts.reduce((sum, a) => sum + a.credit, 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;
    return { totalDebit, totalCredit, isBalanced };
  }, [trialBalanceAccounts]);

  // --- INCOME STATEMENT (قائمة الأرباح والخسائر) ---
  const incomeStatementData = useMemo(() => {
    // 1. Invoiced electricity sales (مبيعات م الطاقة المفوترة حسب القراءات)
    const electricityInvoicedRevenue = readings
      .filter(r => !r.isRejected && matchMonth(r.readingDate || r.billingMonth || (r as any).createdAt, selectedSummaryMonth))
      .reduce((sum, r) => sum + (r.totalAmount || 0), 0);

    // 2. Collected subscriber payments (المبالغ المحصلة فعلياً من المشتركين)
    const electricityCollectedRevenue = payments
      .filter(p => !p.isRejected && matchMonth(p.paymentDate, selectedSummaryMonth))
      .reduce((sum, p) => sum + (p.amountPaid || 0), 0);

    // 3. Connection fees collected
    const connectionRevenue = connections
      .filter(c => !c.isRejected && (c as any).status !== 'rejected' && matchMonth(c.date || (c as any).createdAt, selectedSummaryMonth))
      .reduce((sum, c) => sum + (c.paidAmount || 0), 0);

    // EXPLICIT REQUIREMENT: "إجمالي الإيرادات الكلية: هي المبالغ المحصله لهاذا الشهر"
    const totalRevenues = electricityCollectedRevenue + connectionRevenue;

    const opExpenses = expenses
      .filter(e => !e.isRejected && (e as any).status !== 'rejected' && matchMonth(e.date || (e as any).createdAt, selectedSummaryMonth))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const payrollExpenses = employeeTxs
      .filter(e => !e.isRejected && (e as any).status !== 'rejected' && matchMonth(e.date || (e as any).createdAt, selectedSummaryMonth))
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const purchasesExpenses = purchases
      .filter(p => !p.isRejected && (p as any).status !== 'rejected' && matchMonth(p.date || (p as any).createdAt, selectedSummaryMonth))
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const totalExpenses = opExpenses + payrollExpenses + purchasesExpenses;

    const netProfit = totalRevenues - totalExpenses;
    const profitMargin = totalRevenues > 0 ? (netProfit / totalRevenues) * 100 : 0;

    return {
      electricityInvoicedRevenue,
      electricityCollectedRevenue,
      connectionRevenue,
      totalRevenues, // equal to actual collected payments + connections for the selected month
      opExpenses,
      payrollExpenses,
      purchasesExpenses,
      totalExpenses,
      netProfit,
      profitMargin
    };
  }, [readings, payments, connections, expenses, employeeTxs, purchases, selectedSummaryMonth]);

  // --- CANONICAL COLLECTOR RESOLUTION HELPER ---
  const getCanonicalCollectorName = (rawIdentifier: string | undefined): string => {
    // Find if there is an active primary collector in the station
    const activeEmpCollector = employees.find(e => e.role === 'collector' || e.department?.includes('تحصيل'));
    const activeUserCollector = users.find(u => u.role === 'collector' && u.status !== 'suspended');
    const defaultCollector = activeEmpCollector?.name || activeUserCollector?.name || activeUserCollector?.username || '';

    if (!rawIdentifier) return defaultCollector || 'الصندوق الرئيسي (الكاش)';
    const trimmed = rawIdentifier.trim();
    if (!trimmed || trimmed === 'المحصل الميداني' || trimmed === 'سالم - المحصل الميداني' || trimmed === 'سالم') {
      return defaultCollector || 'الصندوق الرئيسي (الكاش)';
    }

    const normalizedTrimmed = trimmed.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();

    // 1. Direct match by employee name (exact or normalized)
    const empByName = employees.find(e => {
      const eName = (e.name || '').trim();
      const normEName = eName.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
      return eName === trimmed || normEName === normalizedTrimmed;
    });
    if (empByName) return empByName.name;

    // 2. Match by employee username or userId
    const empByAccount = employees.find(e => 
      (e.username && e.username.trim().toLowerCase() === trimmed.toLowerCase()) ||
      (e.userId && e.userId === trimmed)
    );
    if (empByAccount) return empByAccount.name;

    // 3. Match user account linked to employee or name
    const matchedUser = users.find(u => {
      const uName = (u.name || '').trim();
      const normUName = uName.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
      return (
        (u.username && u.username.trim().toLowerCase() === trimmed.toLowerCase()) || 
        u.id === trimmed || 
        uName === trimmed ||
        normUName === normalizedTrimmed
      );
    });

    if (matchedUser) {
      if (matchedUser.employeeName) return matchedUser.employeeName;
      if (matchedUser.employeeId) {
        const linkedEmp = employees.find(e => e.id === matchedUser.employeeId);
        if (linkedEmp) return linkedEmp.name;
      }
      if (matchedUser.name && matchedUser.name.trim()) return matchedUser.name;
    }

    return trimmed;
  };

  // Helper to match a transfer to a collector
  const isTransferFromCollector = (t: TreasuryTransfer, collectorCanonicalName: string): boolean => {
    const from = (t.fromAccount || '').trim();
    if (!from) return false;

    if (from.includes(collectorCanonicalName)) return true;

    // Remove any prefix like "صندوق المحصل: " or "عُهدة المحصل: " or "عهدة المحصل: "
    const cleanedFrom = from.replace(/^(?:صندوق|عُهدة|عهدة)\s*المحصل[:\s]*/i, '').trim();
    if (cleanedFrom && (getCanonicalCollectorName(cleanedFrom) === collectorCanonicalName || cleanedFrom.includes(collectorCanonicalName))) {
      return true;
    }

    const simpleName = (collectorCanonicalName || '').replace(/\s*\([^)]*\)/g, '').trim();
    if (simpleName && (from.includes(simpleName) || cleanedFrom.includes(simpleName))) return true;

    // Check linked user
    const matchedUser = users.find(u => 
      getCanonicalCollectorName(u.name) === collectorCanonicalName || 
      getCanonicalCollectorName(u.username) === collectorCanonicalName
    );
    if (matchedUser) {
      if (matchedUser.username && from.includes(matchedUser.username)) return true;
      if (matchedUser.id && from.includes(matchedUser.id)) return true;
      if (matchedUser.name && from.includes(matchedUser.name)) return true;
    }

    // Check linked employee
    const matchedEmp = employees.find(e => 
      getCanonicalCollectorName(e.name) === collectorCanonicalName ||
      getCanonicalCollectorName(e.username) === collectorCanonicalName
    );
    if (matchedEmp) {
      if (matchedEmp.username && from.includes(matchedEmp.username)) return true;
      if (matchedEmp.id && from.includes(matchedEmp.id)) return true;
      if (matchedEmp.name && from.includes(matchedEmp.name)) return true;
    }

    return false;
  };

  // Helper to match a payment to a collector
  const isPaymentByCollector = (p: Payment, collectorCanonicalName: string): boolean => {
    const raw = p.receivedBy || (p as any).collectorName || (p as any).collectedBy;
    if (!raw) return false;
    return getCanonicalCollectorName(raw) === collectorCanonicalName;
  };

  // --- TREASURIES & COLLECTOR FUNDS BREAKDOWN (وحدة الصناديق وتوريدات المحصلين) ---
  const collectorsList = useMemo(() => {
    const list = new Set<string>();

    // 1. Employees with collector role or department
    employees.filter(e => e.role === 'collector' || e.department?.includes('تحصيل')).forEach(e => {
      if (e.name && e.name.trim()) {
        list.add(getCanonicalCollectorName(e.name));
      }
    });

    // 2. Users with collector role
    users.filter(u => u.role === 'collector' && u.status !== 'suspended').forEach(u => {
      const canonical = getCanonicalCollectorName(u.name || u.username);
      if (canonical && canonical !== 'الصندوق الرئيسي (الكاش)') {
        list.add(canonical);
      }
    });

    // 3. Anyone who has recorded collections
    payments.forEach(p => {
      if (p.isRejected) return;
      const raw = p.receivedBy || (p as any).collectorName || (p as any).collectedBy;
      if (raw) {
        const canonical = getCanonicalCollectorName(raw);
        if (canonical && canonical !== 'الصندوق الرئيسي (الكاش)' && canonical !== 'المحصل الميداني' && canonical !== 'سالم - المحصل الميداني') {
          list.add(canonical);
        }
      }
    });

    // 4. Anyone who has recorded treasury transfers from their box
    treasuryTransfers.forEach(t => {
      if (t.isRejected || (t as any).status === 'rejected') return;
      const from = t.fromAccount || '';
      if (from.includes('المحصل') || from.includes('عهدة')) {
        const extracted = from.replace(/^.*(?:صندوق|عُهدة|عهدة)\s*المحصل[:\s]*/i, '').trim();
        if (extracted && extracted !== 'الميداني' && extracted !== 'سالم') {
          const canonical = getCanonicalCollectorName(extracted);
          if (canonical && canonical !== 'الصندوق الرئيسي (الكاش)') {
            list.add(canonical);
          }
        }
      }
    });

    return Array.from(list).filter(Boolean);
  }, [payments, employees, users, treasuryTransfers]);

  // Unified available accounts list for transfers and vaults
  const availableAccounts = useMemo(() => {
    const list: string[] = [
      'الصندوق الرئيسي (الكاش)'
    ];

    // Bank accounts & wallets defined by user in system settings
    if (settings.bankAccounts && Array.isArray(settings.bankAccounts)) {
      settings.bankAccounts.forEach(acc => {
        const name = acc.accountName ? `${acc.bankName} - ${acc.accountName}` : acc.bankName;
        if (name && !list.includes(name)) {
          list.push(name);
        }
      });
    }

    // Include existing bank/wallet accounts from recorded transfers
    treasuryTransfers.forEach(t => {
      [t.fromAccount, t.toAccount].forEach(acc => {
        if (acc && !list.includes(acc) && !acc.includes('المحصل') && !acc.includes('عهدة')) {
          list.push(acc);
        }
      });
    });

    collectorsList.forEach(col => {
      const boxName = `صندوق المحصل: ${col}`;
      if (!list.includes(boxName)) {
        list.push(boxName);
      }
    });
    return list;
  }, [collectorsList, settings.bankAccounts, treasuryTransfers]);

  const collectorsAccountSummary = useMemo(() => {
    const isAllMonths = selectedTreasuryMonth === 'all';

    // 1. Period flows
    const periodPayments = payments.filter(p => !p.isRejected && (isAllMonths || matchMonth(p.paymentDate, selectedTreasuryMonth)));
    const periodTransfers = treasuryTransfers.filter(t => !t.isRejected && (t as any).status !== 'rejected' && (isAllMonths || matchMonth(t.date || t.createdAt, selectedTreasuryMonth)));

    // 2. Cumulative flows up to the end of selected month (balance sheet logic)
    const cumulativePayments = payments.filter(p => {
      if (p.isRejected) return false;
      if (isAllMonths) return true;
      const pMonth = (p.paymentDate || '').substring(0, 7);
      return pMonth <= selectedTreasuryMonth;
    });

    const cumulativeTransfers = treasuryTransfers.filter(t => {
      if (t.isRejected || (t as any).status === 'rejected') return false;
      if (isAllMonths) return true;
      const tMonth = ((t.date || t.createdAt) || '').substring(0, 7);
      return tMonth <= selectedTreasuryMonth;
    });

    // 3. All-time real-time flows (live custody right now)
    const allTimeActivePayments = payments.filter(p => !p.isRejected);
    const allTimeActiveTransfers = treasuryTransfers.filter(t => !t.isRejected && (t as any).status !== 'rejected');

    return collectorsList.map(collectorName => {
      // Period metrics
      const colPeriodPays = periodPayments.filter(p => isPaymentByCollector(p, collectorName));
      const colPeriodTrfs = periodTransfers.filter(t => isTransferFromCollector(t, collectorName));
      const totalCollected = colPeriodPays.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
      const totalTransferred = colPeriodTrfs.reduce((sum, t) => sum + (t.amount || 0), 0);
      const cashCollected = colPeriodPays.filter(p => (p.paymentMethod || 'cash') === 'cash').reduce((sum, p) => sum + (p.amountPaid || 0), 0);
      const electronicCollected = totalCollected - cashCollected;

      // Period ending balance (closing balance of that month)
      const colCumPays = cumulativePayments.filter(p => isPaymentByCollector(p, collectorName));
      const colCumTrfs = cumulativeTransfers.filter(t => isTransferFromCollector(t, collectorName));
      const cumCollected = colCumPays.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
      const cumTransferred = colCumTrfs.reduce((sum, t) => sum + (t.amount || 0), 0);
      const periodEndingBalance = cumCollected - cumTransferred;

      // Live all-time current pending balance
      const colAllPays = allTimeActivePayments.filter(p => isPaymentByCollector(p, collectorName));
      const colAllTrfs = allTimeActiveTransfers.filter(t => isTransferFromCollector(t, collectorName));
      const allCollected = colAllPays.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
      const allTransferred = colAllTrfs.reduce((sum, t) => sum + (t.amount || 0), 0);
      const currentPendingBalance = allCollected - allTransferred;

      // All-time cash vs electronic breakdown
      const allCashCollected = colAllPays.filter(p => (p.paymentMethod || 'cash') === 'cash').reduce((sum, p) => sum + (p.amountPaid || 0), 0);
      const allElectronicCollected = allCollected - allCashCollected;

      // Sort payments by date descending for last payment date
      const sortedPays = [...colAllPays].sort((a, b) => (b.paymentDate || '').localeCompare(a.paymentDate || ''));

      return {
        collectorName,
        totalCollected,
        totalTransferred,
        cashCollected,
        electronicCollected,
        pendingBalance: isAllMonths ? currentPendingBalance : periodEndingBalance,
        currentPendingBalance,
        allTimeCollected: allCollected,
        allTimeTransferred: allTransferred,
        allCashCollected,
        allElectronicCollected,
        receiptsCount: colPeriodPays.length,
        allTimeReceiptsCount: colAllPays.length,
        transfersCount: colPeriodTrfs.length,
        lastPaymentDate: sortedPays.length > 0 ? (sortedPays[0].paymentDate || '-') : '-'
      };
    });
  }, [collectorsList, payments, treasuryTransfers, selectedTreasuryMonth, employees, users]);

  const treasuriesSummary = useMemo(() => {
    const isAllMonths = selectedTreasuryMonth === 'all';

    // Cumulative filters up to the end of selected month (balance sheet)
    const cumPayments = payments.filter(p => !p.isRejected && (isAllMonths || (p.paymentDate || '').substring(0, 7) <= selectedTreasuryMonth));
    const cumConnections = connections.filter(c => !c.isRejected && (c as any).status !== 'rejected' && (isAllMonths || (c.date || (c as any).createdAt || '').substring(0, 7) <= selectedTreasuryMonth));
    const cumExpenses = expenses.filter(e => !e.isRejected && (e as any).status !== 'rejected' && (isAllMonths || (e.date || (e as any).createdAt || '').substring(0, 7) <= selectedTreasuryMonth));
    const cumEmployeeTxs = employeeTxs.filter(e => !e.isRejected && (e as any).status !== 'rejected' && (isAllMonths || (e.date || (e as any).createdAt || '').substring(0, 7) <= selectedTreasuryMonth));
    const cumPurchases = purchases.filter(p => !p.isRejected && (p as any).status !== 'rejected' && (isAllMonths || (p.date || (p as any).createdAt || '').substring(0, 7) <= selectedTreasuryMonth));
    const cumTransfers = treasuryTransfers.filter(t => !t.isRejected && (t as any).status !== 'rejected' && (isAllMonths || (t.date || t.createdAt || '').substring(0, 7) <= selectedTreasuryMonth));

    // Period specific filters (for income/flow metrics)
    const periodPayments = payments.filter(p => !p.isRejected && (isAllMonths || matchMonth(p.paymentDate, selectedTreasuryMonth)));
    const periodTransfers = treasuryTransfers.filter(t => !t.isRejected && (t as any).status !== 'rejected' && (isAllMonths || matchMonth(t.date || t.createdAt, selectedTreasuryMonth)));
    const periodExpenses = expenses.filter(e => !e.isRejected && (e as any).status !== 'rejected' && (isAllMonths || matchMonth(e.date || (e as any).createdAt, selectedTreasuryMonth)));
    const periodEmployeeTxs = employeeTxs.filter(e => !e.isRejected && (e as any).status !== 'rejected' && (isAllMonths || matchMonth(e.date || (e as any).createdAt, selectedTreasuryMonth)));

    // Outflow calculations cumulative
    const totalExpOut = cumExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalPayOut = cumEmployeeTxs.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalPurchasesCashOut = cumPurchases.reduce((sum, p) => {
      const pd = p.paidAmount !== undefined ? Number(p.paidAmount) : (p.paymentType === 'cash' ? Number(p.amount) : 0);
      return sum + (pd || 0);
    }, 0);

    // Direct office cash collections (payments marked as cash where receivedBy is not a field collector)
    const directOfficeCash = cumPayments
      .filter(p => (p.paymentMethod || 'cash') === 'cash' && !collectorsList.some(col => isPaymentByCollector(p, col)))
      .reduce((sum, p) => sum + (p.amountPaid || 0), 0);

    const totalConnCash = cumConnections
      .filter(c => (c.paymentMethod || 'cash') === 'cash')
      .reduce((sum, c) => sum + (c.paidAmount || 0), 0);

    // Transfers into Main Vault
    const mainVaultTransfersIn = cumTransfers.filter(t => t.toAccount.includes('الرئيسي')).reduce((sum, t) => sum + (t.amount || 0), 0);
    const mainVaultTransfersOut = cumTransfers.filter(t => t.fromAccount.includes('الرئيسي')).reduce((sum, t) => sum + (t.amount || 0), 0);

    // Main vault balance
    const mainVault = Math.max(0, mainVaultTransfersIn + directOfficeCash + totalConnCash - (totalExpOut + totalPayOut + totalPurchasesCashOut + mainVaultTransfersOut));

    // Bank account movements
    const isBankOrWallet = (acc: string) => {
      const a = (acc || '').toLowerCase();
      return a.includes('الكريمي') || a.includes('بنك') || a.includes('جيب') || a.includes('محفظة') || a.includes('الأهلي') || a.includes('الاهلي') || a.includes('حساب');
    };

    const bankTransfersIn = cumTransfers.filter(t => isBankOrWallet(t.toAccount)).reduce((sum, t) => sum + (t.amount || 0), 0);
    const bankTransfersOut = cumTransfers.filter(t => isBankOrWallet(t.fromAccount)).reduce((sum, t) => sum + (t.amount || 0), 0);

    // Direct electronic payments from subscribers
    const directBankPayments = cumPayments
      .filter(p => p.paymentMethod === 'transfer' || p.paymentMethod === 'e-wallet' || p.paymentMethod === 'bank')
      .reduce((sum, p) => sum + (p.amountPaid || 0), 0);

    const directBankConnections = cumConnections
      .filter(c => c.paymentMethod === 'transfer' || c.paymentMethod === 'e-wallet' || c.paymentMethod === 'bank')
      .reduce((sum, c) => sum + (c.paidAmount || 0), 0);

    const bankVault = Math.max(0, bankTransfersIn + directBankPayments + directBankConnections - bankTransfersOut);

    // Sum of collectors boxes (pending custody)
    const collectorsVault = collectorsAccountSummary.reduce((sum, c) => sum + Math.max(0, c.pendingBalance), 0);
    const totalNetTreasury = collectorsVault + mainVault + bankVault;

    // Period metrics
    const periodCollectorTransfers = periodTransfers
      .filter(t => t.fromAccount.includes('المحصل') || t.fromAccount.includes('عهدة') || collectorsList.some(col => isTransferFromCollector(t, col)))
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    return {
      collectorsVault,
      mainVault,
      bankVault,
      totalNetTreasury,
      totalCollectedCash: periodPayments.reduce((sum, p) => sum + (p.amountPaid || 0), 0),
      totalExpOut: periodExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
      totalPayOut: periodEmployeeTxs.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
      totalCollectorTransfers: periodCollectorTransfers
    };
  }, [payments, connections, expenses, employeeTxs, purchases, treasuryTransfers, selectedTreasuryMonth, collectorsAccountSummary, collectorsList]);

  // COLLECTOR DETAILED STATEMENT CALCULATIONS (كشف حساب المحصل تفصيلي)
  const collectorStatementData = useMemo(() => {
    const selectedName = statementCollector;

    // Separate prior transactions (for opening balance) from period transactions
    const hasFromDate = Boolean(statementFromDate);
    const hasToDate = Boolean(statementToDate);

    // Prior transactions for opening balance
    const priorPays = hasFromDate
      ? payments.filter(p => !p.isRejected && (selectedName === 'all' || isPaymentByCollector(p, selectedName)) && (p.paymentDate || '').slice(0, 10) < statementFromDate)
      : [];
    const priorTrfs = hasFromDate
      ? treasuryTransfers.filter(t => !t.isRejected && (t as any).status !== 'rejected' && (selectedName === 'all' || isTransferFromCollector(t, selectedName)) && (t.date || t.createdAt || '').slice(0, 10) < statementFromDate)
      : [];

    const openingBalance = priorPays.reduce((sum, p) => sum + (p.amountPaid || 0), 0) - priorTrfs.reduce((sum, t) => sum + (t.amount || 0), 0);

    let filteredPays = payments.filter(p => !p.isRejected);
    if (selectedName !== 'all') {
      filteredPays = filteredPays.filter(p => isPaymentByCollector(p, selectedName));
    }
    if (hasFromDate) {
      filteredPays = filteredPays.filter(p => (p.paymentDate || '').slice(0, 10) >= statementFromDate);
    }
    if (hasToDate) {
      filteredPays = filteredPays.filter(p => (p.paymentDate || '').slice(0, 10) <= statementToDate);
    }

    let filteredTrfs = treasuryTransfers.filter(t => !t.isRejected && (t as any).status !== 'rejected');
    if (selectedName !== 'all') {
      filteredTrfs = filteredTrfs.filter(t => isTransferFromCollector(t, selectedName));
    }
    if (hasFromDate) {
      filteredTrfs = filteredTrfs.filter(t => (t.date || t.createdAt || '').slice(0, 10) >= statementFromDate);
    }
    if (hasToDate) {
      filteredTrfs = filteredTrfs.filter(t => (t.date || t.createdAt || '').slice(0, 10) <= statementToDate);
    }

    type StatementRow = {
      id: string;
      date: string;
      refNo: string;
      type: 'collection' | 'handover';
      typeLabel: string;
      collectorName: string;
      description: string;
      debit: number;
      credit: number;
      balanceAfter?: number;
    };

    const rows: StatementRow[] = [
      ...filteredPays.map(p => ({
        id: `pay-${p.id}`,
        date: p.paymentDate,
        refNo: `RCV-${p.receiptNumber || p.id.slice(-4)}`,
        type: 'collection' as const,
        typeLabel: 'تحصيل مقبوض من مشترك',
        collectorName: getCanonicalCollectorName(p.receivedBy || (p as any).collectorName || (p as any).collectedBy),
        description: `قبض قيمة استهلاك - المشترك: ${p.subscriberName}`,
        debit: p.amountPaid,
        credit: 0
      })),
      ...filteredTrfs.map(t => ({
        id: `trf-${t.id}`,
        date: t.date || (t.createdAt ? t.createdAt.slice(0, 10) : ''),
        refNo: t.transferNumber,
        type: 'handover' as const,
        typeLabel: 'سند توريد وتسليم خزينة',
        collectorName: getCanonicalCollectorName((t.fromAccount || '').replace(/^.*(?:صندوق|عُهدة|عهدة)\s*المحصل[:\s]*/i, '')),
        description: `تسليم وتوريد مبالغ إلى: ${t.toAccount} (${t.notes || 'توريد كاش'})`,
        debit: 0,
        credit: t.amount
      }))
    ];

    // Sort chronologically ascending to compute running balance
    rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = openingBalance;
    const ledgerWithBalance = rows.map(r => {
      running += (r.debit - r.credit);
      return {
        ...r,
        balanceAfter: running
      };
    });

    let displayLedger = [...ledgerWithBalance].reverse(); // latest on top

    if (statementSearch.trim()) {
      const q = statementSearch.toLowerCase();
      displayLedger = displayLedger.filter(r => 
        r.refNo.toLowerCase().includes(q) || 
        r.description.toLowerCase().includes(q) || 
        r.collectorName.toLowerCase().includes(q)
      );
    }

    const totalDebit = filteredPays.reduce((s, p) => s + (p.amountPaid || 0), 0);
    const totalCredit = filteredTrfs.reduce((s, t) => s + (t.amount || 0), 0);
    const netCustodyBalance = openingBalance + totalDebit - totalCredit;

    return {
      ledger: displayLedger,
      openingBalance,
      totalDebit,
      totalCredit,
      netCustodyBalance,
      totalReceiptsCount: filteredPays.length,
      totalHandoversCount: filteredTrfs.length
    };
  }, [payments, treasuryTransfers, statementCollector, statementFromDate, statementToDate, statementSearch, collectorsList, employees, users]);

  // EXECUTE HANDOVER HANDLER
  const handleConfirmHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handoverTarget || !handoverForm.amount || handoverForm.amount <= 0) {
      alert('يرجى تحديد مبلغ التوريد بشكل صحيح');
      return;
    }

    const { collectorName } = handoverTarget;
    const trfNo = `TRF-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;
    const todayStr = new Date().toISOString().split('T')[0];

    const newTrf: TreasuryTransfer = {
      id: Date.now().toString(),
      transferNumber: trfNo,
      date: todayStr,
      fromAccount: `صندوق المحصل: ${collectorName}`,
      toAccount: handoverForm.toAccount,
      amount: Number(handoverForm.amount),
      notes: handoverForm.notes || `توريد وتصفية مبالغ تحصيل من المحصل (${collectorName}) إلى (${handoverForm.toAccount})`,
      recordedBy: handoverForm.receiverName || currentUser.name
    };

    const updatedTrfs = [newTrf, ...treasuryTransfers];
    setTreasuryTransfers(updatedTrfs);
    if (onUpdateTreasuryTransfers) onUpdateTreasuryTransfers(updatedTrfs);

    try {
      await syncTreasuryTransferToCloud(newTrf);
    } catch (err) {
      console.warn('Error syncing handover to cloud:', err);
    }

    if (onAddAuditLog) {
      onAddAuditLog({
        id: `log-trf-${Date.now()}`,
        action: 'توريد وتسليم عهدة محصل',
        details: `توريد مبلغ ${newTrf.amount} ${settings.currency} من (${newTrf.fromAccount}) إلى (${newTrf.toAccount}) - سند رقم ${newTrf.transferNumber}`,
        performedBy: currentUser.name || currentUser.username,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
      });
    }

    setHandoverTarget(null);
    setPrintableTransferVoucher(newTrf);
  };

  // Chart Monthly/Daily Cash Flow Data
  const monthlyCashFlowChart = useMemo(() => {
    if (!selectedSummaryMonth || selectedSummaryMonth === 'all') {
      return [
        { day: 'السبت', income: (incomeStatementData.totalRevenues * 0.14), expense: (incomeStatementData.totalExpenses * 0.12) },
        { day: 'الأحد', income: (incomeStatementData.totalRevenues * 0.18), expense: (incomeStatementData.totalExpenses * 0.15) },
        { day: 'الإثنين', income: (incomeStatementData.totalRevenues * 0.15), expense: (incomeStatementData.totalExpenses * 0.10) },
        { day: 'الثلاثاء', income: (incomeStatementData.totalRevenues * 0.16), expense: (incomeStatementData.totalExpenses * 0.20) },
        { day: 'الأربعاء', income: (incomeStatementData.totalRevenues * 0.12), expense: (incomeStatementData.totalExpenses * 0.18) },
        { day: 'الخميس', income: (incomeStatementData.totalRevenues * 0.15), expense: (incomeStatementData.totalExpenses * 0.15) },
        { day: 'الجمعة', income: (incomeStatementData.totalRevenues * 0.10), expense: (incomeStatementData.totalExpenses * 0.10) },
      ];
    }

    const [yearStr, monthStr] = selectedSummaryMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();

    const result = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayFormatted = `${selectedSummaryMonth}-${d.toString().padStart(2, '0')}`;
      
      const dayIncome = payments
        .filter(p => !p.isRejected && p.paymentDate && p.paymentDate.startsWith(dayFormatted))
        .reduce((sum, p) => sum + (p.amountPaid || 0), 0)
        + connections
        .filter(c => ((c.createdAt || (c as any).date) || '').startsWith(dayFormatted))
        .reduce((sum, c) => sum + (c.paidAmount || 0), 0);

      const dayExpense = expenses
        .filter(e => ((e.date || e.createdAt) || '').startsWith(dayFormatted))
        .reduce((sum, e) => sum + (e.amount || 0), 0)
        + employeeTxs
        .filter(e => ((e.date || e.createdAt) || '').startsWith(dayFormatted))
        .reduce((sum, e) => sum + (e.amount || 0), 0)
        + purchases
        .filter(p => !p.isRejected && ((p.date || p.createdAt) || '').startsWith(dayFormatted))
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      result.push({
        day: `${d}`,
        income: dayIncome,
        expense: dayExpense
      });
    }

    return result;
  }, [selectedSummaryMonth, payments, connections, expenses, employeeTxs, purchases, incomeStatementData]);

  return (
    <motion.div
      key="accounting-sec"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 text-right"
    >
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800/90 p-5 md:p-6 rounded-3xl shadow-xl backdrop-blur-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl shadow-inner">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white tracking-tight">النظام المحاسبي الشامل والفوترة والتقارير</h2>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                  القيد المزدوج الآلي
                </span>
              </div>
              <p className="text-xs text-slate-400 font-bold mt-1">
                قيود اليومية التلقائية، ميزان المراجعة، الأرباح والخسائر، وحركة الخزينة والصناديق
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowReconciliationModal(true)}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-amber-500/20 active:scale-95"
              title="فحص وتدقيق ومطابقة أرصدة المشتركين مع الفواتير وسندات القبض"
            >
              <Scale className="w-4 h-4" />
              <span>فحص ومطابقة الأرصدة ⚡</span>
            </button>
            <button
              onClick={() => printData('النظام المحاسبي - ميزان المراجعة وقائمة الدخل', trialBalanceAccounts, [{key: 'code', label: 'كود الحساب'}, {key: 'name', label: 'اسم الحساب'}, {key: 'debit', label: 'مدين'}, {key: 'credit', label: 'دائن'}])}
              className="bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-95"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>طباعة الميزان</span>
            </button>
            <button
              onClick={() => exportToCSV(autoGeneratedJournalEntries, 'journal_entries', [{key: 'voucherNumber', label: 'رقم السند'}, {key: 'date', label: 'التاريخ'}, {key: 'typeLabel', label: 'النوع'}, {key: 'debitAccountName', label: 'من حـ (مدين)'}, {key: 'creditAccountName', label: 'إلى حـ (دائن)'}, {key: 'amount', label: 'المبلغ'}, {key: 'description', label: 'البيان'}])}
              className="bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-95"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>تصدير CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-2 rounded-2xl shadow-lg">
        <div className="flex overflow-x-auto gap-1.5 pb-1 scrollbar-hide">
          {[
            { id: 'summary', label: 'الخزينة والملخص المالي', icon: Wallet, badge: null },
            { id: 'journal', label: 'دفتر القيود المحاسبية', icon: BookOpen, badge: autoGeneratedJournalEntries.length },
            { id: 'trial_balance', label: 'ميزان المراجعة والحسابات', icon: Scale, badge: 'متوازن' },
            { id: 'treasury', label: 'الصناديق والتحويلات', icon: Landmark, badge: null },
            { id: 'expenses', label: 'المصروفات التشغيلية', icon: TrendingDown, badge: expenses.length },
            { id: 'employees', label: 'شؤون الموظفين والسلف', icon: Users, badge: employeeTxs.length },
            { id: 'purchases', label: 'المشتريات والموردين', icon: FileText, badge: purchases.length },
            { id: 'connections', label: 'إيرادات إدخال الخدمة', icon: Zap, badge: connections.length },
            { id: 'closed_periods', label: 'إغلاق الفترات والشهور المالية', icon: Lock, badge: (settings.closedPeriods || []).length > 0 ? `${(settings.closedPeriods || []).length} مقفل` : null },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id 
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black' 
                  : 'bg-slate-950/60 border border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== null && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                  activeTab === tab.id ? 'bg-slate-950 text-amber-400 font-bold' : 'bg-slate-800 text-slate-300'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* TAB 1: FINANCIAL SUMMARY & INCOME STATEMENT */}
        {activeTab === 'summary' && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Month Filter Selector Bar */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800/90 p-4 rounded-3xl flex flex-wrap items-center justify-between gap-4 shadow-xl backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl shadow-inner">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-bold block">شهر الملخص المالي والتشغيلي:</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm font-black text-amber-400 font-mono">
                      {formatMonthLabel(selectedSummaryMonth)}
                    </span>
                    {selectedSummaryMonth !== 'all' && (
                      isMonthClosed(selectedSummaryMonth) ? (
                        <span className="px-2.5 py-1 bg-rose-500/15 text-rose-400 border border-rose-500/30 rounded-xl text-[10px] font-black flex items-center gap-1 shadow-sm">
                          <Lock className="w-3.5 h-3.5 text-rose-400" />
                          <span>فترة مقفلة ومرحلة</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setPeriodToClose(selectedSummaryMonth);
                            setShowClosePeriodModal(true);
                          }}
                          className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
                          title="إغلاق وترحيل هذا الشهر محاسبياً"
                        >
                          <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                          <span>فترة مفتوحة (إغلاق وترحيل 🔒)</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    if (selectedSummaryMonth === 'all') {
                      setSelectedSummaryMonth(new Date().toISOString().substring(0, 7));
                      return;
                    }
                    const [y, m] = selectedSummaryMonth.split('-').map(Number);
                    const prevDate = new Date(y, m - 2, 1);
                    const prevStr = `${prevDate.getFullYear()}-${(prevDate.getMonth() + 1).toString().padStart(2, '0')}`;
                    setSelectedSummaryMonth(prevStr);
                  }}
                  className="bg-slate-950/80 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>الشهر السابق</span>
                </button>

                <button
                  onClick={() => setSelectedSummaryMonth(new Date().toISOString().substring(0, 7))}
                  className={`text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer border shadow-sm ${
                    selectedSummaryMonth === new Date().toISOString().substring(0, 7)
                      ? 'bg-amber-500 text-slate-950 font-black border-amber-500 shadow-amber-500/20'
                      : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  الشهر الحالي
                </button>

                <button
                  onClick={() => {
                    if (selectedSummaryMonth === 'all') {
                      setSelectedSummaryMonth(new Date().toISOString().substring(0, 7));
                      return;
                    }
                    const [y, m] = selectedSummaryMonth.split('-').map(Number);
                    const nextDate = new Date(y, m, 1);
                    const nextStr = `${nextDate.getFullYear()}-${(nextDate.getMonth() + 1).toString().padStart(2, '0')}`;
                    setSelectedSummaryMonth(nextStr);
                  }}
                  className="bg-slate-950/80 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                >
                  <span>الشهر التالي</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block" />

                <select
                  value={selectedSummaryMonth}
                  onChange={(e) => setSelectedSummaryMonth(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-amber-400 text-xs font-black rounded-xl px-3.5 py-2 outline-none focus:border-amber-500 cursor-pointer font-mono shadow-sm"
                >
                  <option value="all">جميع الشهور (التراكمي)</option>
                  {availableMonths.map(m => (
                    <option key={m} value={m}>
                      {m} - {formatMonthLabel(m)} {isMonthClosed(m) ? '🔒 (مقفل)' : '🟢 (مفتوح)'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-bold">إجمالي الإيرادات المحصلة</span>
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 shadow-inner">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-emerald-400 font-mono">
                    {incomeStatementData.totalRevenues.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400 font-sans">{settings.currency}</span>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 font-bold">
                  المقبوضات النقدية الفعلية للشهر
                </div>
              </div>

              <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-bold">مبيعات الكهرباء المفوترة</span>
                  <div className="p-2 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400 shadow-inner">
                    <Zap className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-sky-400 font-mono">
                    {incomeStatementData.electricityInvoicedRevenue.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400 font-sans">{settings.currency}</span>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 font-bold">
                  استهلاك العدادات بالقراءات
                </div>
              </div>

              <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-bold">المصروفات والرواتب الكلية</span>
                  <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 shadow-inner">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-rose-400 font-mono">
                    {incomeStatementData.totalExpenses.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400 font-sans">{settings.currency}</span>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 font-bold">
                  وقود + تشغيل + صيانة + رواتب
                </div>
              </div>

              <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 p-5 rounded-2xl shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-bold">صافي الأرباح التشغيلية</span>
                  <div className={`p-2 rounded-xl border shadow-inner ${
                    incomeStatementData.netProfit >= 0 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  }`}>
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-2xl font-black font-mono ${
                    incomeStatementData.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {incomeStatementData.netProfit.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400 font-sans">{settings.currency}</span>
                </div>
                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-800/60 text-[11px] font-bold">
                  <span className="text-slate-400">هامش الربحية:</span>
                  <span className={`font-mono px-2 py-0.5 rounded-md border text-[10px] ${
                    incomeStatementData.profitMargin >= 0 
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' 
                      : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                  }`}>
                    {incomeStatementData.profitMargin.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Income Statement Table & Cash Flow Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Income Statement Card */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-black text-sm text-white flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-amber-500" />
                    <span>قائمة الأرباح والخسائر الشاملة (Income Statement)</span>
                  </h3>
                  <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg">P&L</span>
                </div>

                <div className="space-y-3 text-xs font-bold">
                  <div className="text-amber-400 font-black border-b border-slate-800/80 pb-1 flex justify-between items-center">
                    <span>أولاً: الإيرادات التشغيلية (المبالغ المحصلة)</span>
                    <span className="text-[10px] text-slate-400 font-normal">عن شهر {formatMonthLabel(selectedSummaryMonth)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300 pr-2">
                    <span>إيرادات التحصيل النقدي من المشتركين (المبالغ المحصلة):</span>
                    <span className="font-mono text-white">{incomeStatementData.electricityCollectedRevenue.toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300 pr-2">
                    <span>إيرادات رسوم الاشتراك والتوصيل المحصلة:</span>
                    <span className="font-mono text-white">{incomeStatementData.connectionRevenue.toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="flex justify-between items-center text-emerald-400 font-black bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                    <div>
                      <span className="block text-xs">إجمالي الإيرادات الكلية:</span>
                      <span className="text-[10px] text-emerald-400/80 font-normal block">(المبالغ المحصلة فعلياً لهذا الشهر)</span>
                    </div>
                    <span className="font-mono text-base font-black">{incomeStatementData.totalRevenues.toLocaleString()} {settings.currency}</span>
                  </div>

                  <div className="text-slate-400 text-[11px] bg-slate-950/60 p-2 rounded-xl border border-slate-800/80 flex justify-between items-center">
                    <span>مبيعات الكهرباء المفوترة (حسب القراءات):</span>
                    <span className="font-mono text-slate-300">{incomeStatementData.electricityInvoicedRevenue.toLocaleString()} {settings.currency}</span>
                  </div>

                  <div className="text-rose-400 font-black border-b border-slate-800/80 pb-1 pt-2">ثانياً: المصروفات والتكاليف</div>
                  <div className="flex justify-between items-center text-slate-300 pr-2">
                    <span>المصروفات التشغيلية والوقود (الديزل والصيانة):</span>
                    <span className="font-mono text-rose-400">{incomeStatementData.opExpenses.toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300 pr-2">
                    <span>الرواتب والأجور والسلف والمكافآت:</span>
                    <span className="font-mono text-rose-400">{incomeStatementData.payrollExpenses.toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300 pr-2">
                    <span>المشتريات وتجهيزات المحولات والشبكة:</span>
                    <span className="font-mono text-rose-400">{incomeStatementData.purchasesExpenses.toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="flex justify-between items-center text-rose-400 font-black bg-rose-500/10 p-2.5 rounded-xl">
                    <span>إجمالي التكاليف والمصروفات:</span>
                    <span className="font-mono text-sm">{incomeStatementData.totalExpenses.toLocaleString()} {settings.currency}</span>
                  </div>

                  <div className={`flex justify-between items-center font-black p-3 rounded-xl mt-3 border ${
                    incomeStatementData.netProfit >= 0 
                      ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300' 
                      : 'bg-rose-950/60 border-rose-500/30 text-rose-300'
                  }`}>
                    <span className="text-sm">صافي النتيجة (الربح / الخسارة):</span>
                    <span className="font-mono text-lg">{incomeStatementData.netProfit.toLocaleString()} {settings.currency}</span>
                  </div>
                </div>
              </div>

              {/* Weekly Cash Flow Area Chart */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
                <div>
                  <h3 className="font-black text-sm text-white mb-2">حركة التدفقات النقدية (الإيرادات مقابل المصروفات)</h3>
                  <p className="text-xs text-slate-400 font-bold mb-4">تحليل أداء الخزينة اليومي لقياس السيولة وصافي التدفق</p>
                </div>

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyCashFlowChart}>
                      <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                      <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="income" name="الإيرادات" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                      <Area type="monotone" dataKey="expense" name="المصروفات" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex items-center justify-around border-t border-slate-800 pt-3 text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-slate-300">الواردات والتحصيلات</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <span className="text-slate-300">المنصرفات والتكاليف</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: GENERAL JOURNAL (دفتر القيود المحاسبية التلقائية واليدوية) */}
        {activeTab === 'journal' && (
          <motion.div
            key="journal"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden space-y-4 p-5"
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-black text-white text-sm flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-500" />
                  <span>دفتر اليومية العامة والقيود المحاسبية المزدوجة (General Journal)</span>
                </h3>
                <p className="text-xs text-slate-400 font-bold mt-1">
                  توليد قيود القيد المزدوج تلقائياً لجميع حركات التحصيل والفوترة والمصروفات والسلف
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs">
                  <Search className="w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="بحث برقم السند أو البيان..."
                    value={journalSearch}
                    onChange={e => setJournalSearch(e.target.value)}
                    className="bg-transparent text-white outline-none font-bold w-40"
                  />
                </div>

                <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs">
                  <select
                    value={journalTypeFilter}
                    onChange={e => setJournalTypeFilter(e.target.value)}
                    className="bg-transparent text-slate-300 font-bold outline-none cursor-pointer"
                  >
                    <option value="all">كافة أنواع القيود</option>
                    <option value="receipt">سندات قبض</option>
                    <option value="billing">فواتير الكهرباء</option>
                    <option value="expense">مصروفات</option>
                    <option value="payroll">رواتب وسلف</option>
                    <option value="connection">إدخال خدمة</option>
                    <option value="purchase">مشتريات</option>
                    <option value="manual">قيود يدوية</option>
                  </select>
                </div>

                <button
                  onClick={() => setShowAddManualJournal(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة قيد يدوي</span>
                </button>
              </div>
            </div>

            {/* Journal Entries Table Component */}
            <AccountingJournalTable
              entries={filteredJournalEntries}
              settings={settings}
              manualJournalIds={manualJournalEntries.map(m => m.id)}
              isMonthClosed={isMonthClosed}
              onSelectForPrint={(entry) => setSelectedVoucherForPrint(entry)}
              onReverseEntry={(entry) => {
                setReversingEntry(entry);
                setReversalReason(`تسوية وتصحيح المعاملة (${entry.voucherNumber}) من الفترة المقفلة (${entry.date.substring(0, 7)})`);
              }}
              onEditEntry={(entry) => setEditingJournalEntry(entry)}
              onDeleteEntry={(id) => handleDeleteJournalEntry(id)}
              onRejectOrDeleteEntry={(entry) => handleRejectOrDeleteEntry(entry)}
            />
          </motion.div>
        )}

        {/* TAB 3: TRIAL BALANCE & CHART OF ACCOUNTS (ميزان المراجعة وشجرة الحسابات) */}
        {activeTab === 'trial_balance' && (
          <motion.div
            key="trial_balance"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-6 space-y-6"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-black text-white text-sm flex items-center gap-2">
                  <Scale className="w-5 h-5 text-amber-500" />
                  <span>ميزان المراجعة بالمجاميع والأرصدة (Trial Balance)</span>
                </h3>
                <p className="text-xs text-slate-400 font-bold mt-1">
                  التحقق من التوازن المالي والتساوي التام بين إجمالي الأرصدة المدينة والأرصدة الدائنة
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 ${
                  trialBalanceTotals.isBalanced 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                }`}>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{trialBalanceTotals.isBalanced ? 'الميزان متوازن 100%' : 'تنبيه: خلل في التوازن'}</span>
                </span>
              </div>
            </div>

            {/* Accounts Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3 font-mono text-center">كود الحساب</th>
                    <th className="p-3">اسم الحساب المحاسبي</th>
                    <th className="p-3">تصنيف الحساب</th>
                    <th className="p-3 text-center text-emerald-400">الرصيد المدين ({settings.currency})</th>
                    <th className="p-3 text-center text-rose-400">الرصيد الدائن ({settings.currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-bold text-slate-200">
                  {trialBalanceAccounts.map((account) => (
                    <tr key={account.code} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono font-black text-amber-400 text-center">{account.code}</td>
                      <td className="p-3 font-bold text-white">{account.name}</td>
                      <td className="p-3 text-slate-400 text-[11px]">{account.category}</td>
                      <td className="p-3 text-center font-mono font-black text-emerald-400 text-sm">
                        {account.debit > 0 ? account.debit.toLocaleString() : '-'}
                      </td>
                      <td className="p-3 text-center font-mono font-black text-rose-400 text-sm">
                        {account.credit > 0 ? account.credit.toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-950 font-black text-white text-sm border-t-2 border-slate-700">
                  <tr>
                    <td colSpan={3} className="p-4 text-left font-black">إجمالي ميزان المراجعة:</td>
                    <td className="p-4 text-center font-mono text-emerald-400 text-base">
                      {trialBalanceTotals.totalDebit.toLocaleString()} {settings.currency}
                    </td>
                    <td className="p-4 text-center font-mono text-rose-400 text-base">
                      {trialBalanceTotals.totalCredit.toLocaleString()} {settings.currency}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </motion.div>
        )}

        {/* TAB 4: TREASURY & COLLECTOR FUNDS MANAGEMENT (إدارة الصناديق وتوريدات المحصلين) */}
        {activeTab === 'treasury' && (
          <motion.div
            key="treasury"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Treasury Month Filter Selector Bar */}
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-bold block">تحديد شهر حركة الخزينة والصناديق:</span>
                  <span className="text-sm font-black text-amber-400 font-mono">
                    {formatMonthLabel(selectedTreasuryMonth)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    if (selectedTreasuryMonth === 'all') {
                      setSelectedTreasuryMonth(new Date().toISOString().substring(0, 7));
                      return;
                    }
                    const [y, m] = selectedTreasuryMonth.split('-').map(Number);
                    const prevDate = new Date(y, m - 2, 1);
                    const prevStr = `${prevDate.getFullYear()}-${(prevDate.getMonth() + 1).toString().padStart(2, '0')}`;
                    setSelectedTreasuryMonth(prevStr);
                  }}
                  className="bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>الشهر السابق</span>
                </button>

                <button
                  onClick={() => setSelectedTreasuryMonth(new Date().toISOString().substring(0, 7))}
                  className={`text-xs font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer border ${
                    selectedTreasuryMonth === new Date().toISOString().substring(0, 7)
                      ? 'bg-amber-500 text-slate-950 font-black border-amber-500 shadow-sm'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  الشهر الحالي
                </button>

                <button
                  onClick={() => {
                    if (selectedTreasuryMonth === 'all') {
                      setSelectedTreasuryMonth(new Date().toISOString().substring(0, 7));
                      return;
                    }
                    const [y, m] = selectedTreasuryMonth.split('-').map(Number);
                    const nextDate = new Date(y, m, 1);
                    const nextStr = `${nextDate.getFullYear()}-${(nextDate.getMonth() + 1).toString().padStart(2, '0')}`;
                    setSelectedTreasuryMonth(nextStr);
                  }}
                  className="bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>الشهر التالي</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block" />

                <select
                  value={selectedTreasuryMonth}
                  onChange={(e) => setSelectedTreasuryMonth(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-amber-400 text-xs font-black rounded-xl px-3.5 py-2 outline-none focus:border-amber-500 cursor-pointer font-mono"
                >
                  <option value="all">جميع الشهور (التراكمي)</option>
                  {availableMonths.map(m => (
                    <option key={m} value={m}>
                      {m} - {formatMonthLabel(m)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {/* Treasury Subtabs Navigation */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-2.5 rounded-2xl">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'boxes', label: 'صناديق المحصلين الخزائن', icon: Wallet },
                  { id: 'transfers', label: 'سندات التوريد والتحويلات', icon: ArrowLeftRight },
                  { id: 'statements', label: 'كشف حساب محصل تفصيلي', icon: FileText },
                  { id: 'performance', label: 'تقييم أداء المحصلين', icon: Award },
                  { id: 'daily', label: 'الجرد والتدفقات اليومية', icon: Clock }
                ].map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setTreasurySubTab(sub.id as any)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      treasurySubTab === sub.id
                        ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                        : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <sub.icon className="w-3.5 h-3.5" />
                    <span>{sub.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 pr-2">
                <button
                  onClick={() => setShowAddTransfer(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>تحويل مالي بين الصناديق</span>
                </button>
              </div>
            </div>

            {/* SUBTAB 1: BOXES OVERVIEW & COLLECTORS VIRTUAL CASH BOXES */}
            {treasurySubTab === 'boxes' && (
              <div className="space-y-6">
                {/* Global Treasury Vault Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-400">الصندوق الرئيسي (الكاش)</span>
                      <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl"><Wallet className="w-4 h-4" /></div>
                    </div>
                    <span className="text-2xl font-black text-amber-400 font-mono block">
                      {treasuriesSummary.mainVault.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span>
                    </span>
                    <span className="text-[11px] text-slate-500 font-bold mt-1 block">خزينة الإدارة والمقبوضات الموردة</span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-400">أمانات عهد المحصلين</span>
                      <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl"><Users className="w-4 h-4" /></div>
                    </div>
                    <span className="text-2xl font-black text-sky-400 font-mono block">
                      {treasuriesSummary.collectorsVault.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span>
                    </span>
                    <span className="text-[11px] text-slate-500 font-bold mt-1 block">مبالغ التحصيل القائمة بعهدة المحصلين</span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-400">الحسابات البنكية والمحافظ</span>
                      <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl"><Building2 className="w-4 h-4" /></div>
                    </div>
                    <span className="text-2xl font-black text-purple-400 font-mono block">
                      {treasuriesSummary.bankVault.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span>
                    </span>
                    <span className="text-[11px] text-slate-500 font-bold mt-1 block">السيولة المودعة في الحسابات البنكية</span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-400">إجمالي السيولة النقدية الكلية</span>
                      <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl"><Landmark className="w-4 h-4" /></div>
                    </div>
                    <span className="text-2xl font-black text-emerald-400 font-mono block">
                      {treasuriesSummary.totalNetTreasury.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span>
                    </span>
                    <span className="text-[11px] text-slate-500 font-bold mt-1 block">مجموع أرصدة جميع الصناديق</span>
                  </div>
                </div>

                {/* Collectors Virtual Cash Boxes Section */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
                    <div>
                      <h3 className="font-black text-white text-base flex items-center gap-2">
                        <Users className="w-5 h-5 text-amber-500" />
                        <span>صناديق أمانات المحصلين الميدانيين (Collector Virtual Cash Boxes)</span>
                      </h3>
                      <p className="text-xs text-slate-400 font-bold mt-1">
                        تتبع المبالغ المحصلة ميدانياً والتوريدات المنفذة مع آلية التسليم والتوريد السريعة
                      </p>
                    </div>

                    <span className="text-xs text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
                      عدد المحصلين النشطين: {collectorsAccountSummary.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {collectorsAccountSummary.length === 0 ? (
                      <div className="col-span-full p-8 text-center bg-slate-950/60 border border-slate-800/80 rounded-2xl">
                        <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-sm font-bold text-slate-400">لا توجد صناديق عهد محصلين مسجلة</p>
                        <p className="text-xs text-slate-500 mt-1">يتم احتساب صناديق العهدة تلقائياً عند تسجيل محصلين في النظام أو تسجيل عمليات تحصيل</p>
                      </div>
                    ) : (
                      collectorsAccountSummary.map((col) => (
                      <div
                        key={col.collectorName}
                        className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 transition-all shadow-sm"
                      >
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-black text-amber-400 text-sm">
                              {col.collectorName.slice(0, 2)}
                            </div>
                            <div>
                              <h4 className="font-black text-white text-sm">{col.collectorName}</h4>
                              <span className="text-[11px] text-slate-400 font-bold block">صندوق محصل ميداني</span>
                            </div>
                          </div>

                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${
                            col.pendingBalance > 0 
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                              : 'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {col.pendingBalance > 0 ? 'بانتظار التوريد' : 'مصفى بالكامل'}
                          </span>
                        </div>

                        {/* Pending Cash Held Callout */}
                        <div className="bg-slate-900 border border-slate-800/80 p-3.5 rounded-xl space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-400 font-bold">الرصيد المتبقي بعهدة المحصل (غير مورد):</span>
                            {selectedTreasuryMonth !== 'all' && col.currentPendingBalance !== col.pendingBalance && (
                              <span className="text-[10px] text-amber-300/80 font-bold">
                                (فترة: {selectedTreasuryMonth})
                              </span>
                            )}
                          </div>
                          <div className="flex items-baseline justify-between">
                            <span className="text-2xl font-black text-amber-400 font-mono">
                              {col.pendingBalance.toLocaleString()}
                            </span>
                            <span className="text-xs font-bold text-slate-500">{settings.currency}</span>
                          </div>
                          {selectedTreasuryMonth !== 'all' && col.currentPendingBalance !== col.pendingBalance && (
                            <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                              <span className="text-slate-400 font-bold">العهدة الإجمالية القائمة حالياً:</span>
                              <span className="font-mono font-black text-white">{col.currentPendingBalance.toLocaleString()} {settings.currency}</span>
                            </div>
                          )}
                        </div>

                        {/* Metrics Breakdown */}
                        <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/50">
                            <span className="text-slate-500 text-[10px] block">إجمالي المقبوض:</span>
                            <span className="text-white font-mono">{col.totalCollected.toLocaleString()} {settings.currency}</span>
                          </div>
                          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/50">
                            <span className="text-slate-500 text-[10px] block">إجمالي المورد:</span>
                            <span className="text-emerald-400 font-mono">{col.totalTransferred.toLocaleString()} {settings.currency}</span>
                          </div>
                          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/50">
                            <span className="text-slate-500 text-[10px] block">عدد السندات:</span>
                            <span className="text-sky-400 font-mono">{col.receiptsCount} سند</span>
                          </div>
                          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/50">
                            <span className="text-slate-500 text-[10px] block">آخر حركة:</span>
                            <span className="text-slate-300 font-mono text-[10px]">{col.lastPaymentDate}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-2 flex items-center gap-2">
                          <button
                            onClick={() => {
                              const targetAmount = col.currentPendingBalance > 0 ? col.currentPendingBalance : col.pendingBalance;
                              setHandoverTarget({
                                collectorName: col.collectorName,
                                pendingAmount: targetAmount,
                                receiptsCount: col.allTimeReceiptsCount || col.receiptsCount
                              });
                              setHandoverForm({
                                amount: targetAmount,
                                toAccount: 'الصندوق الرئيسي (الكاش)',
                                notes: `توريد وتصفية مبالغ تحصيل من المحصل (${col.collectorName})`,
                                receiverName: currentUser.name || 'مدير النظام'
                              });
                            }}
                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                            <span>تسليم وتوريد الخزينة</span>
                          </button>

                          <button
                            onClick={() => {
                              setStatementCollector(col.collectorName);
                              setTreasurySubTab('statements');
                            }}
                            className="bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold py-2.5 px-3 rounded-xl text-xs border border-slate-800 flex items-center gap-1 transition-colors"
                            title="عرض كشف حساب المحصل"
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-400" />
                            <span>كشف الحساب</span>
                          </button>
                        </div>
                      </div>
                    ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 2: TRANSFERS & HANDOVER VOUCHERS LIST */}
            {treasurySubTab === 'transfers' && (() => {
              const isAllMonths = selectedTreasuryMonth === 'all';
              const q = transferSearch.trim().toLowerCase();
              const displayedTransfers = treasuryTransfers.filter(trf => {
                if (trf.isRejected || (trf as any).status === 'rejected') return false;
                if (!isAllMonths && !matchMonth(trf.date || trf.createdAt, selectedTreasuryMonth)) return false;
                if (q) {
                  const num = (trf.transferNumber || '').toLowerCase();
                  const from = (trf.fromAccount || '').toLowerCase();
                  const to = (trf.toAccount || '').toLowerCase();
                  const notes = (trf.notes || '').toLowerCase();
                  const rec = (trf.recordedBy || '').toLowerCase();
                  return num.includes(q) || from.includes(q) || to.includes(q) || notes.includes(q) || rec.includes(q);
                }
                return true;
              });

              const totalDisplayed = displayedTransfers.reduce((sum, t) => sum + (t.amount || 0), 0);

              return (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                    <div>
                      <h3 className="font-black text-white text-base flex items-center gap-2">
                        <ArrowLeftRight className="w-5 h-5 text-amber-500" />
                        <span>سجل سندات توريد الخزينة والتحويلات المالية (Treasury Handovers)</span>
                      </h3>
                      <p className="text-xs text-slate-400 font-bold mt-1">
                        توثيق سندات تسليم المبالغ من أمانات المحصلين إلى الصندوق الرئيسي والبنك ومعاينتها للطباعة
                      </p>
                    </div>

                    <button
                      onClick={() => setShowAddTransfer(true)}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>سند توريد / تحويل جديد</span>
                    </button>
                  </div>

                  {/* Search and Summary Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <div className="relative w-full sm:w-80">
                      <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={transferSearch}
                        onChange={e => setTransferSearch(e.target.value)}
                        placeholder="بحث برقم السند، الصندوق، الملاحظات..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pr-9 pl-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-bold text-right"
                      />
                    </div>
                    <div className="text-xs text-slate-400 font-bold flex items-center gap-2">
                      <span>إجمالي المبالغ المعروضة:</span>
                      <span className="text-amber-400 font-mono font-black text-sm">
                        {totalDisplayed.toLocaleString()} {settings.currency}
                      </span>
                      <span className="text-slate-600">|</span>
                      <span>({displayedTransfers.length} سند)</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-xs text-right">
                      <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                        <tr>
                          <th className="p-3 text-center">رقم السند</th>
                          <th className="p-3">تاريخ التوريد</th>
                          <th className="p-3">من حساب (المُسلّم)</th>
                          <th className="p-3">إلى حساب (المستلم)</th>
                          <th className="p-3 text-center">المبلغ المورد</th>
                          <th className="p-3">ملاحظات والتفاصيل</th>
                          <th className="p-3 text-center">المسجل</th>
                          <th className="p-3 text-center">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-bold text-slate-200">
                        {displayedTransfers.map((trf) => (
                          <tr key={trf.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="p-3 font-mono font-black text-amber-400 text-center">{trf.transferNumber}</td>
                            <td className="p-3 font-mono text-slate-400">{trf.date}</td>
                            <td className="p-3 font-bold text-rose-400">{trf.fromAccount}</td>
                            <td className="p-3 font-bold text-emerald-400">{trf.toAccount}</td>
                            <td className="p-3 text-center font-mono font-black text-white text-sm">
                              {trf.amount.toLocaleString()} <span className="text-[10px] text-slate-500">{settings.currency}</span>
                            </td>
                            <td className="p-3 text-slate-300">{trf.notes}</td>
                            <td className="p-3 text-center text-slate-500 text-[11px]">{trf.recordedBy}</td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => setPrintableTransferVoucher(trf)}
                                  className="bg-slate-800 hover:bg-slate-700 text-amber-400 px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                  title="طباعة سند التوريد"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>طباعة</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteTransfer(trf.id)}
                                  className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 p-1.5 rounded-lg transition-colors cursor-pointer"
                                  title="إلغاء وحذف سند التوريد"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}

                        {displayedTransfers.length === 0 && (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-slate-500 font-bold">
                              {treasuryTransfers.length === 0
                                ? 'لا توجد تحويلات بين الصناديق مسجلة حالياً.'
                                : 'لا توجد سندات توريد مطابقة لمعايير البحث أو الشهر المحدد.'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* SUBTAB 3: DETAILED COLLECTOR ACCOUNT STATEMENT (كشف حساب محصل) */}
            {treasurySubTab === 'statements' && (
              <div className="space-y-6">
                {/* Statement Filter Toolbar */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="font-black text-white text-base flex items-center gap-2">
                        <FileText className="w-5 h-5 text-amber-500" />
                        <span>كشف حساب المحصل الميداني التفصيلي (Collector Account Statement)</span>
                      </h3>
                      <p className="text-xs text-slate-400 font-bold mt-1">
                        عرض جميع الحركات المالية (المقبوضات الميدانية مقابل التوريدات المسلمة للإدارة) والرصيد المتبقي
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => printData(`كشف حساب المحصل: ${statementCollector === 'all' ? 'جميع المحصلين' : statementCollector}`, collectorStatementData.ledger, [
                          {key: 'date', label: 'التاريخ'},
                          {key: 'refNo', label: 'رقم السند'},
                          {key: 'typeLabel', label: 'نوع الحركة'},
                          {key: 'collectorName', label: 'اسم المحصل'},
                          {key: 'description', label: 'البيان'},
                          {key: 'debit', label: 'مدين (مقبوضات)'},
                          {key: 'credit', label: 'دائن (توريدات)'},
                          {key: 'balanceAfter', label: 'الرصيد المتبقي'}
                        ])}
                        className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition-colors"
                      >
                        <Printer className="w-4 h-4 text-amber-400" />
                        <span>طباعة كشف الحساب</span>
                      </button>

                      <button
                        onClick={() => exportToCSV(collectorStatementData.ledger, 'collector_statement', [
                          {key: 'date', label: 'التاريخ'},
                          {key: 'refNo', label: 'رقم السند'},
                          {key: 'typeLabel', label: 'نوع الحركة'},
                          {key: 'collectorName', label: 'اسم المحصل'},
                          {key: 'description', label: 'البيان'},
                          {key: 'debit', label: 'مدين'},
                          {key: 'credit', label: 'دائن'},
                          {key: 'balanceAfter', label: 'الرصيد'}
                        ])}
                        className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition-colors"
                      >
                        <Download className="w-4 h-4 text-emerald-400" />
                        <span>تصدير CSV</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1.5">اختر المحصل</label>
                      <select
                        value={statementCollector}
                        onChange={(e) => setStatementCollector(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                      >
                        <option value="all">جميع المحصلين الميدانيين</option>
                        {collectorsList.map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1.5">من تاريخ</label>
                      <input
                        type="date"
                        value={statementFromDate}
                        onChange={(e) => setStatementFromDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1.5">إلى تاريخ</label>
                      <input
                        type="date"
                        value={statementToDate}
                        onChange={(e) => setStatementToDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1.5">بحث في كشف الحساب</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={statementSearch}
                          onChange={(e) => setStatementSearch(e.target.value)}
                          placeholder="رقم السند / اسم المشترك..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                        />
                        <Search className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* KPI Metrics Cards */}
                <div className={`grid grid-cols-1 ${statementFromDate ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'} gap-4`}>
                  {statementFromDate && (
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                      <span className="text-xs text-slate-400 font-bold block mb-1">الرصيد الافتتاحي السابق للفترة:</span>
                      <span className="text-2xl font-black text-violet-400 font-mono block">
                        {collectorStatementData.openingBalance.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span>
                      </span>
                      <span className="text-[11px] text-slate-500 font-bold mt-1 block">رصيد ما قبل {statementFromDate}</span>
                    </div>
                  )}

                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                    <span className="text-xs text-slate-400 font-bold block mb-1">إجمالي المقبوضات (مدين):</span>
                    <span className="text-2xl font-black text-sky-400 font-mono block">
                      {collectorStatementData.totalDebit.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span>
                    </span>
                    <span className="text-[11px] text-slate-500 font-bold mt-1 block">عدد السندات المقبوضة: {collectorStatementData.totalReceiptsCount}</span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                    <span className="text-xs text-slate-400 font-bold block mb-1">إجمالي التوريدات للإدارة (دائن):</span>
                    <span className="text-2xl font-black text-emerald-400 font-mono block">
                      {collectorStatementData.totalCredit.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span>
                    </span>
                    <span className="text-[11px] text-slate-500 font-bold mt-1 block">عدد التوريدات: {collectorStatementData.totalHandoversCount}</span>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                    <span className="text-xs text-slate-400 font-bold block mb-1">الرصيد الختامي المتبقي بعهدته:</span>
                    <span className="text-2xl font-black text-amber-400 font-mono block">
                      {collectorStatementData.netCustodyBalance.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span>
                    </span>
                    <span className="text-[11px] text-slate-500 font-bold mt-1 block">العهدة المتبقية بنهاية الفترة</span>
                  </div>
                </div>

                {/* Detailed Statement Ledger Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <h4 className="font-black text-white text-sm">جدول الحركة اليومية وتفاصيل كشف الحساب</h4>
                  
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-xs text-right">
                      <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                        <tr>
                          <th className="p-3">التاريخ</th>
                          <th className="p-3 text-center">رقم السند</th>
                          <th className="p-3">نوع الحركة</th>
                          <th className="p-3">المحصل</th>
                          <th className="p-3">البيان والشرح</th>
                          <th className="p-3 text-center text-sky-400">مدين (تحصيل)</th>
                          <th className="p-3 text-center text-emerald-400">دائن (توريد)</th>
                          <th className="p-3 text-center text-amber-400">الرصيد المتبقي</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-bold text-slate-200">
                        {collectorStatementData.ledger.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="p-3 font-mono text-slate-400">{row.date}</td>
                            <td className="p-3 font-mono font-black text-amber-400 text-center">{row.refNo}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                row.type === 'collection' ? 'bg-sky-500/10 text-sky-400' : 'bg-emerald-500/10 text-emerald-400'
                              }`}>
                                {row.typeLabel}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-white">{row.collectorName}</td>
                            <td className="p-3 text-slate-300">{row.description}</td>
                            <td className="p-3 text-center font-mono font-black text-sky-400">
                              {row.debit > 0 ? row.debit.toLocaleString() : '-'}
                            </td>
                            <td className="p-3 text-center font-mono font-black text-emerald-400">
                              {row.credit > 0 ? row.credit.toLocaleString() : '-'}
                            </td>
                            <td className="p-3 text-center font-mono font-black text-amber-400 text-sm">
                              {(row as any).balanceAfter !== undefined ? (row as any).balanceAfter.toLocaleString() : '-'}
                            </td>
                          </tr>
                        ))}

                        {collectorStatementData.ledger.length === 0 && (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-slate-500 font-bold">
                              لا توجد حركات مسجلة لهذا المحصل خلال الفترة المحددة.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 4: COLLECTORS PERFORMANCE & COMPARISON */}
            {treasurySubTab === 'performance' && (
              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                  <div className="border-b border-slate-800 pb-4">
                    <h3 className="font-black text-white text-base flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-500" />
                      <span>مقارنة أداء وتنافسية المحصلين الميدانيين (Collectors Performance)</span>
                    </h3>
                    <p className="text-xs text-slate-400 font-bold mt-1">
                      تقييم معدلات التحصيل والتوريد ونسب الإنجاز بين طاقم التحصيل الميداني
                    </p>
                  </div>

                  {/* Performance Chart */}
                  <div className="h-64 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={collectorsAccountSummary}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="collectorName" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} />
                        <Bar dataKey="totalCollected" name="إجمالي التحصيل الميداني" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="totalTransferred" name="إجمالي المورد للإدارة" fill="#10b981" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Ranking Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-xs text-right">
                      <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                        <tr>
                          <th className="p-3 text-center">المرتبة</th>
                          <th className="p-3">اسم المحصل</th>
                          <th className="p-3 text-center">عدد السندات</th>
                          <th className="p-3 text-center text-sky-400">إجمالي التحصيل</th>
                          <th className="p-3 text-center text-emerald-400">إجمالي التوريد</th>
                          <th className="p-3 text-center text-amber-400">المتبقي بعهدته</th>
                          <th className="p-3 text-center">نسبة التوريد %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-bold text-slate-200">
                        {[...collectorsAccountSummary]
                          .sort((a, b) => b.totalCollected - a.totalCollected)
                          .map((col, index) => {
                            const rate = col.totalCollected > 0 ? ((col.totalTransferred / col.totalCollected) * 100).toFixed(1) : '100.0';
                            return (
                              <tr key={col.collectorName} className="hover:bg-slate-800/40 transition-colors">
                                <td className="p-3 text-center">
                                  <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-[10px] font-black ${
                                    index === 0 ? 'bg-amber-500 text-slate-950' : index === 1 ? 'bg-slate-300 text-slate-950' : 'bg-slate-800 text-slate-400'
                                  }`}>
                                    {index + 1}
                                  </span>
                                </td>
                                <td className="p-3 font-bold text-white">{col.collectorName}</td>
                                <td className="p-3 text-center font-mono">{col.receiptsCount}</td>
                                <td className="p-3 text-center font-mono font-black text-sky-400">{col.totalCollected.toLocaleString()} {settings.currency}</td>
                                <td className="p-3 text-center font-mono font-black text-emerald-400">{col.totalTransferred.toLocaleString()} {settings.currency}</td>
                                <td className="p-3 text-center font-mono font-black text-amber-400">{col.pendingBalance.toLocaleString()} {settings.currency}</td>
                                <td className="p-3 text-center">
                                  <span className="font-mono text-emerald-400 font-bold">{rate}%</span>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 5: DAILY CASH FLOW & RECONCILIATION */}
            {treasurySubTab === 'daily' && (() => {
              const dailyData = collectorsList.map(name => {
                const dailyPays = payments.filter(p => !p.isRejected && isPaymentByCollector(p, name) && (p.paymentDate || '').slice(0, 10) === dailyFlowDate);
                const dailyTrfs = treasuryTransfers.filter(t => !t.isRejected && (t as any).status !== 'rejected' && isTransferFromCollector(t, name) && (t.date || t.createdAt || '').slice(0, 10) === dailyFlowDate);

                const dailyIncome = dailyPays.reduce((s, p) => s + (p.amountPaid || 0), 0);
                const dailyOutcome = dailyTrfs.reduce((s, t) => s + (t.amount || 0), 0);
                const netDaily = dailyIncome - dailyOutcome;

                return {
                  name,
                  dailyIncome,
                  dailyOutcome,
                  netDaily,
                  receiptsCount: dailyPays.length,
                  transfersCount: dailyTrfs.length
                };
              });

              const totalDailyCollected = dailyData.reduce((s, d) => s + d.dailyIncome, 0);
              const totalDailyTransferred = dailyData.reduce((s, d) => s + d.dailyOutcome, 0);
              const totalDailyNet = totalDailyCollected - totalDailyTransferred;

              return (
                <div className="space-y-6">
                  {/* Daily KPI summary cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                      <span className="text-xs text-slate-400 font-bold block mb-1">إجمالي تحصيلات يوم ({dailyFlowDate}):</span>
                      <span className="text-2xl font-black text-sky-400 font-mono block">
                        {totalDailyCollected.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span>
                      </span>
                      <span className="text-[11px] text-slate-500 font-bold mt-1 block">مقبوضات كاش من المشتركين</span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                      <span className="text-xs text-slate-400 font-bold block mb-1">إجمالي التوريدات المستلمة لليوم:</span>
                      <span className="text-2xl font-black text-emerald-400 font-mono block">
                        {totalDailyTransferred.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span>
                      </span>
                      <span className="text-[11px] text-slate-500 font-bold mt-1 block">توريدات مودعة بالخزينة/البنك</span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                      <span className="text-xs text-slate-400 font-bold block mb-1">صافي الحركة اليومية المعلقة:</span>
                      <span className="text-2xl font-black text-amber-400 font-mono block">
                        {totalDailyNet.toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span>
                      </span>
                      <span className="text-[11px] text-slate-500 font-bold mt-1 block">
                        {totalDailyNet === 0 ? 'كافة توريدات اليوم مطابقة ومستلمة' : 'متبقي بعهدة المحصلين لم يورد'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
                      <div>
                        <h3 className="font-black text-white text-base flex items-center gap-2">
                          <Clock className="w-5 h-5 text-amber-500" />
                          <span>التدفقات النقدية والجرد اليومي (Daily Cash Reconciliation)</span>
                        </h3>
                        <p className="text-xs text-slate-400 font-bold mt-1">
                          تدقيق ومطابقة المقبوضات والتوريدات اليومية لكل محصل بتاريخ محدد
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-400">تاريخ الجرد:</label>
                        <input
                          type="date"
                          value={dailyFlowDate}
                          onChange={(e) => setDailyFlowDate(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-800">
                      <table className="w-full text-xs text-right">
                        <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                          <tr>
                            <th className="p-3">اسم المحصل</th>
                            <th className="p-3 text-center">عدد الإيصالات</th>
                            <th className="p-3 text-center text-sky-400">تحصيلات اليوم ({dailyFlowDate})</th>
                            <th className="p-3 text-center text-emerald-400">توريدات اليوم للخزينة</th>
                            <th className="p-3 text-center text-amber-400">صافي الحركة اليومية</th>
                            <th className="p-3 text-center">حالة المطابقة</th>
                            <th className="p-3 text-center">إجراء</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-bold text-slate-200">
                          {dailyData.map((d) => (
                            <tr key={d.name} className="hover:bg-slate-800/40 transition-colors">
                              <td className="p-3 font-bold text-white">{d.name}</td>
                              <td className="p-3 text-center font-mono text-slate-400">{d.receiptsCount}</td>
                              <td className="p-3 text-center font-mono font-black text-sky-400">{d.dailyIncome.toLocaleString()} {settings.currency}</td>
                              <td className="p-3 text-center font-mono font-black text-emerald-400">{d.dailyOutcome.toLocaleString()} {settings.currency}</td>
                              <td className="p-3 text-center font-mono font-black text-amber-400">{d.netDaily.toLocaleString()} {settings.currency}</td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                                  d.netDaily === 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                                }`}>
                                  {d.netDaily === 0 ? 'مصفى ومستلم بالكامل' : 'يوجد رصيد بانتظار التوريد'}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                {d.netDaily > 0 && (
                                  <button
                                    onClick={() => {
                                      setHandoverTarget({
                                        collectorName: d.name,
                                        pendingAmount: d.netDaily,
                                        receiptsCount: d.receiptsCount
                                      });
                                      setHandoverForm({
                                        amount: d.netDaily,
                                        toAccount: 'الصندوق الرئيسي (الكاش)',
                                        notes: `توريد حصيلة التحصيل اليومي الميداني ليوم ${dailyFlowDate}`,
                                        receiverName: currentUser.name || currentUser.username || 'مدير النظام'
                                      });
                                    }}
                                    className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                                  >
                                    تسجيل توريد
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}

        {/* TAB 5: OPERATIONAL EXPENSES */}
        {activeTab === 'expenses' && (
          <motion.div
            key="expenses"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-white text-sm">سجل المصروفات التشغيلية والوقود</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => printData('سجل المصروفات التشغيلية', expenses, [{key: 'date', label: 'التاريخ'}, {key: 'category', label: 'التصنيف'}, {key: 'amount', label: 'المبلغ'}, {key: 'description', label: 'البيان'}, {key: 'recordedBy', label: 'الموظف'}])} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors">
                  <Printer className="w-4 h-4" /> طباعة
                </button>
                <button onClick={() => exportToCSV(expenses, 'expenses', [{key: 'date', label: 'التاريخ'}, {key: 'category', label: 'التصنيف'}, {key: 'amount', label: 'المبلغ'}, {key: 'description', label: 'البيان'}, {key: 'recordedBy', label: 'الموظف'}])} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors">
                  <Download className="w-4 h-4" /> CSV
                </button>
                <button onClick={() => setShowAddExpense(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-2">
                  <Plus className="w-4 h-4" /> إضافة سند صرف
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800 font-bold">
                  <tr>
                    <th className="p-3 font-bold">التاريخ</th>
                    <th className="p-3 font-bold">البند / التصنيف</th>
                    <th className="p-3 font-bold">البيان والتفاصيل</th>
                    <th className="p-3 font-bold text-center">المبلغ</th>
                    <th className="p-3 font-bold text-center">المسجل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 font-bold text-slate-200">
                  {expenses.map(exp => (
                    <tr key={exp.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-mono text-slate-400">{exp.date}</td>
                      <td className="p-3 text-amber-400 font-bold">{exp.category}</td>
                      <td className="p-3 text-slate-300">{exp.description}</td>
                      <td className="p-3 text-center font-mono font-black text-rose-400 text-sm">{exp.amount.toLocaleString()} {settings.currency}</td>
                      <td className="p-3 text-center text-slate-500 text-[11px]">{exp.recordedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* TAB 6: EMPLOYEES & PAYROLL */}
        {activeTab === 'employees' && (
          <motion.div
            key="employees"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h3 className="font-bold text-white text-sm">سجل الرواتب والسلف والمكافآت</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => printData('السلف والرواتب', employeeTxs.map(tx => ({...tx, type: tx.type === 'salary' ? 'راتب' : tx.type === 'advance' ? 'سلفة' : 'بدل'})), [{key: 'date', label: 'التاريخ'}, {key: 'employeeName', label: 'الموظف'}, {key: 'type', label: 'النوع'}, {key: 'amount', label: 'المبلغ'}, {key: 'description', label: 'البيان'}])} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors">
                  <Printer className="w-4 h-4" /> طباعة
                </button>
                <button onClick={() => exportToCSV(employeeTxs.map(tx => ({...tx, type: tx.type === 'salary' ? 'راتب' : tx.type === 'advance' ? 'سلفة' : 'بدل'})), 'employee_transactions', [{key: 'date', label: 'التاريخ'}, {key: 'employeeName', label: 'الموظف'}, {key: 'type', label: 'النوع'}, {key: 'amount', label: 'المبلغ'}, {key: 'description', label: 'البيان'}])} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors">
                  <Download className="w-4 h-4" /> CSV
                </button>
                <button onClick={() => setShowAddEmployeeTx(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-2">
                  <Plus className="w-4 h-4" /> إضافة حركة موظف
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800 font-bold">
                  <tr>
                    <th className="p-3 font-bold">التاريخ</th>
                    <th className="p-3 font-bold">الموظف</th>
                    <th className="p-3 font-bold">نوع الحركة</th>
                    <th className="p-3 font-bold">البيان</th>
                    <th className="p-3 font-bold text-center">المبلغ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 font-bold text-slate-200">
                  {employeeTxs.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-mono text-slate-400">{tx.date}</td>
                      <td className="p-3 font-bold text-white">{tx.employeeName}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          tx.type === 'salary' ? 'bg-emerald-500/10 text-emerald-400' :
                          tx.type === 'advance' ? 'bg-rose-500/10 text-rose-400' : 'bg-cyan-500/10 text-cyan-400'
                        }`}>
                          {tx.type === 'salary' ? 'راتب' : tx.type === 'advance' ? 'سلفة' : 'بدل'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300">{tx.description}</td>
                      <td className="p-3 text-center font-mono font-black text-slate-200 text-sm">{tx.amount.toLocaleString()} {settings.currency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* TAB 7: PURCHASES & SUPPLIERS */}
        {activeTab === 'purchases' && (() => {
          const filteredPurchases = purchases.filter(p => {
            if (!purchaseSearch) return true;
            const q = purchaseSearch.toLowerCase();
            return (
              (p.supplier && p.supplier.toLowerCase().includes(q)) ||
              (p.items && p.items.toLowerCase().includes(q)) ||
              (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(q))
            );
          });

          const totalPurchasesSum = purchases.reduce((sum, p) => sum + p.amount, 0);
          const totalPurchasesPaid = purchases.reduce((sum, p) => {
            const pd = p.paidAmount !== undefined ? p.paidAmount : (p.paymentType === 'cash' ? p.amount : 0);
            return sum + pd;
          }, 0);
          const totalPurchasesRemaining = totalPurchasesSum - totalPurchasesPaid;

          // Suppliers list computation
          const suppliersMap = new Map<string, {
            supplier: string;
            invoicesCount: number;
            totalAmount: number;
            totalPaid: number;
            remaining: number;
            invoices: Purchase[];
          }>();

          purchases.forEach(p => {
            const name = (p.supplier || 'مورد غير مسمى').trim();
            const pd = p.paidAmount !== undefined ? p.paidAmount : (p.paymentType === 'cash' ? p.amount : 0);
            const rem = p.amount - pd;
            if (!suppliersMap.has(name)) {
              suppliersMap.set(name, {
                supplier: name,
                invoicesCount: 1,
                totalAmount: p.amount,
                totalPaid: pd,
                remaining: rem,
                invoices: [p]
              });
            } else {
              const existing = suppliersMap.get(name)!;
              existing.invoicesCount += 1;
              existing.totalAmount += p.amount;
              existing.totalPaid += pd;
              existing.remaining += rem;
              existing.invoices.push(p);
            }
          });

          const suppliersList = Array.from(suppliersMap.values());

          return (
            <motion.div
              key="purchases"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Stat Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 font-bold block">إجمالي المشتريات والتجهيزات</span>
                    <span className="text-lg font-black font-mono text-white mt-1 block">
                      {totalPurchasesSum.toLocaleString()} {settings.currency}
                    </span>
                  </div>
                  <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
                    <Building2 className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 font-bold block">إجمالي المسدد للموردين</span>
                    <span className="text-lg font-black font-mono text-emerald-400 mt-1 block">
                      {totalPurchasesPaid.toLocaleString()} {settings.currency}
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 font-bold block">المتبقي والديون للموردين</span>
                    <span className="text-lg font-black font-mono text-rose-400 mt-1 block">
                      {totalPurchasesRemaining.toLocaleString()} {settings.currency}
                    </span>
                  </div>
                  <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 font-bold block">عدد الموردين المسجلين</span>
                    <span className="text-lg font-black font-mono text-cyan-400 mt-1 block">
                      {suppliersList.length} مورد
                    </span>
                  </div>
                  <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Header & SubTabs */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex flex-wrap justify-between items-center gap-4">
                  <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setPurchaseSubTab('invoices')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        purchaseSubTab === 'invoices' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      فواتير المشتريات ({purchases.length})
                    </button>
                    <button
                      onClick={() => setPurchaseSubTab('suppliers')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        purchaseSubTab === 'suppliers' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      دليل الموردين وكشوفات الحساب ({suppliersList.length})
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="بحث عن فاتورة، مورد، أصناف..."
                        value={purchaseSearch}
                        onChange={e => setPurchaseSearch(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 w-48 sm:w-64"
                      />
                    </div>
                    <button onClick={() => printData('فواتير المشتريات والموردين', purchases, [{key: 'date', label: 'التاريخ'}, {key: 'invoiceNumber', label: 'رقم الفاتورة'}, {key: 'supplier', label: 'المورد'}, {key: 'items', label: 'المشتريات'}, {key: 'amount', label: 'إجمالي الفاتورة'}])} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors">
                      <Printer className="w-4 h-4" /> طباعة
                    </button>
                    <button onClick={() => exportToCSV(purchases, 'purchases', [{key: 'date', label: 'التاريخ'}, {key: 'invoiceNumber', label: 'رقم الفاتورة'}, {key: 'supplier', label: 'المورد'}, {key: 'items', label: 'المشتريات'}, {key: 'amount', label: 'إجمالي الفاتورة'}])} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors">
                      <Download className="w-4 h-4" /> CSV
                    </button>
                    <button onClick={() => setShowAddPurchase(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-2">
                      <Plus className="w-4 h-4" /> فاتورة شراء جديدة
                    </button>
                  </div>
                </div>

                {purchaseSubTab === 'invoices' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-right">
                      <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800 font-bold">
                        <tr>
                          <th className="p-3 font-bold">رقم الفاتورة</th>
                          <th className="p-3 font-bold">التاريخ</th>
                          <th className="p-3 font-bold">المورد</th>
                          <th className="p-3 font-bold">الأصناف والتجهيزات</th>
                          <th className="p-3 font-bold text-center">نوع الدفع</th>
                          <th className="p-3 font-bold text-center">إجمالي الفاتورة</th>
                          <th className="p-3 font-bold text-center">المدفوع</th>
                          <th className="p-3 font-bold text-center">المتبقي</th>
                          <th className="p-3 font-bold text-center">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50 font-bold text-slate-200">
                        {filteredPurchases.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="p-8 text-center text-slate-500">لا توجد فواتير مشتريات مطابقة</td>
                          </tr>
                        ) : (
                          filteredPurchases.map(p => {
                            const paid = p.paidAmount !== undefined ? p.paidAmount : (p.paymentType === 'cash' ? p.amount : 0);
                            const rem = p.amount - paid;
                            return (
                              <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                                <td className="p-3 font-mono text-amber-400 font-bold">{p.invoiceNumber || p.id}</td>
                                <td className="p-3 font-mono text-slate-400">{p.date}</td>
                                <td className="p-3 font-bold text-white">{p.supplier}</td>
                                <td className="p-3 text-slate-300 max-w-xs truncate">{p.items}</td>
                                <td className="p-3 text-center">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                    p.paymentType === 'cash' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                                  }`}>
                                    {p.paymentType === 'cash' ? 'نقداً' : 'آجل'}
                                  </span>
                                </td>
                                <td className="p-3 text-center font-mono font-black text-rose-400 text-sm">{p.amount.toLocaleString()} {settings.currency}</td>
                                <td className="p-3 text-center font-mono text-emerald-400">{paid.toLocaleString()} {settings.currency}</td>
                                <td className="p-3 text-center font-mono text-rose-400">{rem > 0 ? rem.toLocaleString() : '0'} {settings.currency}</td>
                                <td className="p-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => setPrintablePurchase(p)}
                                      title="طباعة السند"
                                      className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <Printer className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setEditingPurchase(p)}
                                      title="تعديل الفاتورة"
                                      className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeletePurchase(p.id)}
                                      title="حذف الفاتورة"
                                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
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
                ) : (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {suppliersList.length === 0 ? (
                      <div className="col-span-full p-8 text-center text-slate-500">لا يوجد موردين مسجلين حالياً</div>
                    ) : (
                      suppliersList.map(sup => (
                        <div key={sup.supplier} className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-5 h-5 text-amber-500" />
                              <h4 className="font-bold text-white text-sm">{sup.supplier}</h4>
                            </div>
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-bold">
                              {sup.invoicesCount} فاتورة
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-center text-xs bg-slate-900 p-3 rounded-xl border border-slate-800/80">
                            <div>
                              <span className="text-[10px] text-slate-400 block">المشتريات</span>
                              <span className="font-mono font-bold text-slate-200">{sup.totalAmount.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block">المسدد</span>
                              <span className="font-mono font-bold text-emerald-400">{sup.totalPaid.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block">المتبقي</span>
                              <span className="font-mono font-bold text-rose-400">{sup.remaining.toLocaleString()}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => setSelectedSupplierStatement(sup.supplier)}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/20 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                          >
                            <FileText className="w-4 h-4" />
                            <span>عرض كشف حساب المورد</span>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })()}

        {/* TAB 8: SERVICE CONNECTION REVENUE (إيرادات إدخال وتوصيل الخدمة وتأمين العدادات) */}
        {activeTab === 'connections' && (
          <ServiceConnectionManager
            connections={connections}
            onUpdateConnections={onUpdateConnections}
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            subscribers={subscribers}
            onUpdateSubscribers={onUpdateSubscribers}
            inventory={inventory}
            onUpdateInventory={onUpdateInventory}
            inventoryTransactions={inventoryTransactions}
            onUpdateInventoryTransactions={onUpdateInventoryTransactions}
            employees={employees}
            currentUser={currentUser}
            onAddAuditLog={onAddAuditLog}
            availableMonths={availableMonths}
          />
        )}

        {false && activeTab === 'connections' && (() => {
          // Filters calculation
          const filteredConnections = connections.filter(c => {
            // Search query
            if (connectionSearchQuery) {
              const q = connectionSearchQuery.toLowerCase();
              const matchName = (c.subscriberName || '').toLowerCase().includes(q);
              const matchVoucher = (c.voucherNo || '').toLowerCase().includes(q) || (c.id || '').toLowerCase().includes(q);
              const matchPhone = (c.phone || '').toLowerCase().includes(q);
              const matchMeter = (c.meterNumber || '').toLowerCase().includes(q);
              const matchZone = (c.zone || '').toLowerCase().includes(q);
              const matchTech = (c.assignedTechnician || '').toLowerCase().includes(q);
              const matchMat = (c.materialsUsed || '').toLowerCase().includes(q);
              if (!matchName && !matchVoucher && !matchPhone && !matchMeter && !matchZone && !matchTech && !matchMat) {
                return false;
              }
            }

            // Month filter
            if (connectionMonthFilter !== 'all') {
              const cMonth = (c.date || '').substring(0, 7);
              if (cMonth !== connectionMonthFilter) return false;
            }

            // Service Type filter
            if (connectionServiceTypeFilter !== 'all') {
              if ((c.serviceType || 'new_connection') !== connectionServiceTypeFilter) return false;
            }

            // Status filter
            if (connectionStatusFilter !== 'all') {
              const isCompleted = c.status === 'completed' || (c.paidAmount >= c.totalFee && c.totalFee > 0);
              const hasRemaining = (c.remainingAmount !== undefined ? c.remainingAmount > 0 : (c.totalFee - c.paidAmount) > 0);
              
              if (connectionStatusFilter === 'completed' && !isCompleted) return false;
              if (connectionStatusFilter === 'has_remaining' && (!hasRemaining || isCompleted)) return false;
              if (connectionStatusFilter === 'pending' && c.status !== 'pending') return false;
              if (connectionStatusFilter === 'in_progress' && c.status !== 'in_progress') return false;
            }

            return true;
          });

          // Metrics
          const totalInvoiced = filteredConnections.reduce((sum, c) => sum + (Number(c.totalFee) || 0), 0);
          const totalPaid = filteredConnections.reduce((sum, c) => sum + (Number(c.paidAmount) || 0), 0);
          const totalRemaining = filteredConnections.reduce((sum, c) => {
            const rem = c.remainingAmount !== undefined ? Number(c.remainingAmount) : Math.max(0, Number(c.totalFee || 0) - Number(c.paidAmount || 0));
            return sum + rem;
          }, 0);
          const totalDeposits = filteredConnections.reduce((sum, c) => sum + (Number(c.insuranceDeposit) || 0), 0);
          const totalConnectionFees = filteredConnections.reduce((sum, c) => sum + (Number(c.connectionFee) || 0), 0);
          const collectionRate = totalInvoiced > 0 ? ((totalPaid / totalInvoiced) * 100).toFixed(1) : '100';

          const completedCount = filteredConnections.filter(c => c.status === 'completed' || (c.paidAmount >= c.totalFee && c.totalFee > 0)).length;
          const pendingOrProgressCount = filteredConnections.length - completedCount;

          const serviceTypeLabels: Record<string, { label: string; badge: string }> = {
            new_connection: { label: 'توصيل وعداد جديد', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
            phase_upgrade: { label: 'ترقية 3-Phase', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
            relocation: { label: 'نقل موقع عداد', badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
            reconnect: { label: 'إعادة إطلاق تيار', badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
            meter_replacement: { label: 'استبدال وتغيير عداد', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
            maintenance: { label: 'صيانة وتوسعة شبكة', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20' }
          };

          return (
            <motion.div
              key="connections"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* HEADER ACTIONS */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-white text-base flex items-center gap-2">
                      إيرادات رسوم الاشتراك وتوصيل الخدمة
                      <span className="bg-slate-800 text-amber-400 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold border border-slate-700">
                        {filteredConnections.length} طلب
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      إدارة وتحصيل رسوم إدخال الخدمة، أثمان العدادات، التأمينات المستردة، وأجور التركيب الفني
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => printData(
                      'تقرير إيرادات ورسوم إدخال خدمة الكهرباء',
                      filteredConnections.map(c => {
                        const rem = c.remainingAmount !== undefined ? c.remainingAmount : Math.max(0, c.totalFee - c.paidAmount);
                        return {
                          voucherNo: c.voucherNo || c.id,
                          date: c.date,
                          subscriberName: c.subscriberName,
                          phone: c.phone || '-',
                          serviceType: serviceTypeLabels[c.serviceType || 'new_connection']?.label || c.serviceType,
                          meterNumber: c.meterNumber || '-',
                          totalFee: c.totalFee.toLocaleString() + ' ' + settings.currency,
                          paidAmount: c.paidAmount.toLocaleString() + ' ' + settings.currency,
                          remaining: rem.toLocaleString() + ' ' + settings.currency,
                          status: c.status === 'completed' ? 'مكتمل ومسدد' : 'قيد التنفيذ / آجل',
                          materials: c.materialsUsed || '-'
                        };
                      }),
                      [
                        { key: 'voucherNo', label: 'رقم السند' },
                        { key: 'date', label: 'التاريخ' },
                        { key: 'subscriberName', label: 'المشترك' },
                        { key: 'phone', label: 'الهاتف' },
                        { key: 'serviceType', label: 'نوع الخدمة' },
                        { key: 'meterNumber', label: 'العداد' },
                        { key: 'totalFee', label: 'إجمالي الرسوم' },
                        { key: 'paidAmount', label: 'المقبوض' },
                        { key: 'remaining', label: 'المتبقي' },
                        { key: 'status', label: 'الحالة' }
                      ]
                    )}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer border border-slate-700/80"
                  >
                    <Printer className="w-4 h-4 text-amber-400" />
                    <span>طباعة التقرير</span>
                  </button>

                  <button
                    onClick={() => exportToCSV(
                      filteredConnections.map(c => ({
                        id: c.id,
                        voucherNo: c.voucherNo || c.id,
                        date: c.date,
                        subscriberName: c.subscriberName,
                        phone: c.phone || '',
                        zone: c.zone || '',
                        serviceType: c.serviceType || 'new_connection',
                        meterNumber: c.meterNumber || '',
                        connectionFee: c.connectionFee || 0,
                        meterCost: c.meterCost || 0,
                        insuranceDeposit: c.insuranceDeposit || 0,
                        installationLaborFee: c.installationLaborFee || 0,
                        materialsFee: c.materialsFee || 0,
                        otherFees: c.otherFees || 0,
                        totalFee: c.totalFee,
                        paidAmount: c.paidAmount,
                        remainingAmount: c.remainingAmount || (c.totalFee - c.paidAmount),
                        paymentMethod: c.paymentMethod || 'cash',
                        assignedTechnician: c.assignedTechnician || '',
                        materialsUsed: c.materialsUsed || '',
                        status: c.status
                      })),
                      'service_connections_revenue',
                      [
                        { key: 'voucherNo', label: 'رقم السند' },
                        { key: 'date', label: 'التاريخ' },
                        { key: 'subscriberName', label: 'المشترك' },
                        { key: 'phone', label: 'الهاتف' },
                        { key: 'serviceType', label: 'نوع الخدمة' },
                        { key: 'meterNumber', label: 'رقم العداد' },
                        { key: 'connectionFee', label: 'رسوم التوصيل' },
                        { key: 'meterCost', label: 'ثمن العداد' },
                        { key: 'insuranceDeposit', label: 'تأمين العداد' },
                        { key: 'installationLaborFee', label: 'أجور التركيب' },
                        { key: 'totalFee', label: 'إجمالي الرسوم' },
                        { key: 'paidAmount', label: 'المبلغ المقبوض' },
                        { key: 'remainingAmount', label: 'المبلغ المتبقي' },
                        { key: 'status', label: 'الحالة' }
                      ]
                    )}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer border border-slate-700/80"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>تصدير CSV</span>
                  </button>

                  <button
                    onClick={() => {
                      setNewConnection({
                        voucherNo: `CON-${new Date().getFullYear()}-${String(connections.length + 1).padStart(4, '0')}`,
                        status: 'completed',
                        date: new Date().toISOString().split('T')[0],
                        serviceType: 'new_connection',
                        tariffType: 'residential',
                        connectionFee: settings.serviceFee || 5000,
                        meterCost: 0,
                        insuranceDeposit: settings.meterInsuranceDeposit || 0,
                        installationLaborFee: 0,
                        materialsFee: 0,
                        otherFees: 0,
                        totalFee: (settings.serviceFee || 5000) + (settings.meterInsuranceDeposit || 0),
                        paidAmount: (settings.serviceFee || 5000) + (settings.meterInsuranceDeposit || 0),
                        paymentMethod: 'cash',
                        autoCreatedSubscriber: true
                      });
                      setSelectedExistingSubId('new');
                      setShowAddConnection(true);
                    }}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>تسجيل طلب إدخال خدمة</span>
                  </button>
                </div>
              </div>

              {/* STATS SUMMARY CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total Paid Revenue */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">الإيراد الفعلي المقبوض</span>
                    <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-black font-mono text-emerald-400">
                      {totalPaid.toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-slate-400">{settings.currency}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">نسبة التحصيل:</span>
                    <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      {collectionRate}%
                    </span>
                  </div>
                </div>

                {/* 2. Total Invoiced Fees */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">إجمالي الرسوم المفوترة</span>
                    <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
                      <Receipt className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-black font-mono text-sky-400">
                      {totalInvoiced.toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-slate-400">{settings.currency}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">رسوم التوصيل والاشتراك:</span>
                    <span className="font-mono font-bold text-slate-300">
                      {totalConnectionFees.toLocaleString()} {settings.currency}
                    </span>
                  </div>
                </div>

                {/* 3. Total Remaining / Unpaid */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">المتبقي والآجل (ذمم)</span>
                    <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
                      <Coins className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-black font-mono text-rose-400">
                      {totalRemaining.toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-slate-400">{settings.currency}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">طلبات غير مكتملة السداد:</span>
                    <span className="font-mono font-bold text-amber-400">
                      {pendingOrProgressCount} طلب
                    </span>
                  </div>
                </div>

                {/* 4. Meter Deposits */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">تأمينات العدادات المحصلة</span>
                    <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-black font-mono text-purple-400">
                      {totalDeposits.toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-slate-400">{settings.currency}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">أمانات مستردة للمشتركين</span>
                    <span className="font-mono font-bold text-purple-300">
                      {completedCount} مكتمل
                    </span>
                  </div>
                </div>
              </div>

              {/* SEARCH & FILTERS CONTROLS */}
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {/* Search Bar */}
                  <div className="relative md:col-span-2">
                    <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={connectionSearchQuery}
                      onChange={e => setConnectionSearchQuery(e.target.value)}
                      placeholder="بحث بالمشترك، رقم السند، الهاتف، العداد، الفني، المربع..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 font-bold"
                    />
                    {connectionSearchQuery && (
                      <button
                        onClick={() => setConnectionSearchQuery('')}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Month Filter */}
                  <div>
                    <select
                      value={connectionMonthFilter}
                      onChange={e => setConnectionMonthFilter(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                    >
                      <option value="all">كل الشهور والفترات</option>
                      {availableMonths.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  {/* Service Type Filter */}
                  <div>
                    <select
                      value={connectionServiceTypeFilter}
                      onChange={e => setConnectionServiceTypeFilter(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
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
                </div>

                {/* Second row filters: Status filter tabs */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                    <button
                      onClick={() => setConnectionStatusFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        connectionStatusFilter === 'all'
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      الكل ({connections.length})
                    </button>
                    <button
                      onClick={() => setConnectionStatusFilter('completed')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        connectionStatusFilter === 'completed'
                          ? 'bg-emerald-500 text-slate-950 font-black'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      مكتمل ومسدد بالكامل ({connections.filter(c => c.status === 'completed' || (c.paidAmount >= c.totalFee && c.totalFee > 0)).length})
                    </button>
                    <button
                      onClick={() => setConnectionStatusFilter('has_remaining')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        connectionStatusFilter === 'has_remaining'
                          ? 'bg-rose-500 text-white font-black'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      يوجد متبقي / آجل ({connections.filter(c => (c.remainingAmount !== undefined ? c.remainingAmount > 0 : (c.totalFee - c.paidAmount) > 0)).length})
                    </button>
                    <button
                      onClick={() => setConnectionStatusFilter('pending')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        connectionStatusFilter === 'pending'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      معلق ({connections.filter(c => c.status === 'pending').length})
                    </button>
                  </div>

                  <div className="text-xs text-slate-400 font-bold">
                    عرض <span className="text-white font-mono">{filteredConnections.length}</span> من إجمالي <span className="text-white font-mono">{connections.length}</span>
                  </div>
                </div>
              </div>

              {/* DATA TABLE */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-bold">
                      <tr>
                        <th className="p-3.5 font-bold">رقم السند / التاريخ</th>
                        <th className="p-3.5 font-bold">المشترك والمعلومات</th>
                        <th className="p-3.5 font-bold">نوع الخدمة والعداد</th>
                        <th className="p-3.5 font-bold text-center">إجمالي الرسوم</th>
                        <th className="p-3.5 font-bold text-center">المقبوض</th>
                        <th className="p-3.5 font-bold text-center">المتبقي</th>
                        <th className="p-3.5 font-bold">الفني والمواد المصروفة</th>
                        <th className="p-3.5 font-bold text-center">الحالة</th>
                        <th className="p-3.5 font-bold text-center">الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-bold text-slate-200">
                      {filteredConnections.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-12 text-center text-slate-500">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Zap className="w-8 h-8 text-slate-600 mb-1" />
                              <p className="font-bold text-sm">لا توجد طلبات إدخال خدمة مطابقة لمعايير البحث والفلترة</p>
                              <p className="text-xs text-slate-500">قم بتعديل خيارات البحث أو اضغط على "تسجيل طلب إدخال خدمة" لإضافة طلب جديد.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredConnections.map(c => {
                          const rem = c.remainingAmount !== undefined ? c.remainingAmount : Math.max(0, c.totalFee - c.paidAmount);
                          const isFullyPaid = rem === 0 && c.paidAmount > 0;
                          const sInfo = serviceTypeLabels[c.serviceType || 'new_connection'] || { label: c.serviceType || 'توصيل خدمة', badge: 'bg-slate-800 text-slate-300 border-slate-700' };

                          return (
                            <tr key={c.id} className="hover:bg-slate-800/40 transition-colors group">
                              {/* Voucher & Date */}
                              <td className="p-3.5">
                                <div className="font-mono font-black text-amber-400 text-xs">
                                  {c.voucherNo || `CON-${c.id.slice(-4)}`}
                                </div>
                                <div className="font-mono text-slate-400 text-[11px] mt-0.5">
                                  {c.date}
                                </div>
                              </td>

                              {/* Subscriber info */}
                              <td className="p-3.5">
                                <div className="font-bold text-white text-sm flex items-center gap-1.5">
                                  <span>{c.subscriberName}</span>
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

                              {/* Service Type & Meter */}
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

                              {/* Total Fee & Breakdown */}
                              <td className="p-3.5 text-center">
                                <div className="font-mono font-black text-white text-sm">
                                  {c.totalFee.toLocaleString()}
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                                  {c.insuranceDeposit ? `تأمين: ${c.insuranceDeposit.toLocaleString()}` : 'بدون تأمين'}
                                </div>
                              </td>

                              {/* Paid Amount */}
                              <td className="p-3.5 text-center">
                                <span className="font-mono font-black text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg inline-block">
                                  {c.paidAmount.toLocaleString()}
                                </span>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {c.paymentMethod === 'bank_transfer' ? 'تحويل بنكي' : 'نقداً'}
                                </div>
                              </td>

                              {/* Remaining Amount */}
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

                              {/* Technician & Materials */}
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

                              {/* Status Badge */}
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

                              {/* Actions */}
                              <td className="p-3.5 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {/* Print Voucher */}
                                  <button
                                    onClick={() => setSelectedConnectionForReceipt(c)}
                                    title="طباعة سند القبض والإدخال الرسمي"
                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Settle remaining balance if any */}
                                  {rem > 0 && (
                                    <button
                                      onClick={() => {
                                        setSettlingConnection(c);
                                        setSettlePaymentAmount(rem);
                                        setSettlePaymentMethod('cash');
                                        setSettleBankAccountId('');
                                        setSettleNotes('');
                                      }}
                                      title="تحصيل دفعة من المبلغ المتبقي"
                                      className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 rounded-lg transition-all cursor-pointer font-bold"
                                    >
                                      <DollarSign className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {/* Edit */}
                                  <button
                                    onClick={() => {
                                      setEditingConnection(c);
                                      if (c.materialsList && c.materialsList.length > 0) {
                                        setEditConnectionMaterials([...c.materialsList]);
                                      } else if (c.materialsUsed) {
                                        setEditConnectionMaterials([{
                                          id: `mat-${Date.now()}`,
                                          name: c.materialsUsed,
                                          quantity: 1,
                                          unit: 'طقم',
                                          unitPrice: c.materialsFee || 0,
                                          notes: 'مادة سابقة'
                                        }]);
                                      } else {
                                        setEditConnectionMaterials([]);
                                      }
                                    }}
                                    title="تعديل بيانات طلب الإدخال"
                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Delete */}
                                  <button
                                    onClick={() => handleDeleteConnection(c)}
                                    title="حذف هذا الطلب"
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
          );
        })()}

        {/* TAB 9: CLOSED ACCOUNTING PERIODS (إغلاق الفترات والشهور المالية) */}
        {activeTab === 'closed_periods' && (
          <motion.div
            key="closed_periods"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Header & Stats Banner */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
                <div>
                  <h3 className="font-black text-white text-lg flex items-center gap-2.5">
                    <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-2xl">
                      <Lock className="w-6 h-6" />
                    </div>
                    <span>إدارة وإغلاق الفترات والشهور المالية (Accounting Period Closings)</span>
                  </h3>
                  <p className="text-xs text-slate-400 font-bold mt-1.5 leading-relaxed">
                    قفل الحسابات الشهرية وترحيلها نهائياً لمنع التعديل أو الحذف المباشر للفواتير والسندات، وتطبيق التسويات عبر قيود عكسية نظامية
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const currentM = new Date().toISOString().substring(0, 7);
                      setPeriodToClose(currentM);
                      setShowClosePeriodModal(true);
                    }}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    <span>إغلاق وترحيل شهر مالي جديد</span>
                  </button>
                </div>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl">
                  <span className="text-xs text-slate-400 font-bold block mb-1">الفترات المقفلة رسمياً</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-amber-400 font-mono">
                      {(settings.closedPeriods || []).length}
                    </span>
                    <span className="text-xs text-slate-500 font-bold">شهر مالي مقفل</span>
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl">
                  <span className="text-xs text-slate-400 font-bold block mb-1">الفترة النشطة الحالية</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-emerald-400 font-mono">
                      {new Date().toISOString().substring(0, 7)}
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-500/20">
                      مفتوحة للتسجيل
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl">
                  <span className="text-xs text-slate-400 font-bold block mb-1">إجمالي إيرادات الفترات المقفلة</span>
                  <span className="text-2xl font-black text-emerald-400 font-mono block">
                    {(settings.closedPeriods || []).reduce((sum, p) => sum + (p.totalRevenues || 0), 0).toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span>
                  </span>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl">
                  <span className="text-xs text-slate-400 font-bold block mb-1">صافي أرباح الفترات المقفلة</span>
                  <span className="text-2xl font-black text-sky-400 font-mono block">
                    {(settings.closedPeriods || []).reduce((sum, p) => sum + (p.netProfit || 0), 0).toLocaleString()} <span className="text-xs text-slate-500 font-sans">{settings.currency}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Info Box */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300 font-medium space-y-1">
                <span className="font-bold text-amber-400 block">تعليمات الأمان والامتثال المحاسبي:</span>
                <p>
                  1. عند إغلاق الشهر المالي، يتم قفل جميع القراءات وفواتير الكهرباء وسندات القبض ومصروفات ذلك الشهر فوراً ولا يمكن تعديلها أو حذفها مباشرة.
                </p>
                <p>
                  2. في حال حدوث خطأ أو تسوية في فترة مقفلة، يتم استخدام زر <strong className="text-amber-300">«قيد تسوية عكسي»</strong> من دفتر القيود اليومية لتسوية الفرق في الفترة المفتوحة الحالية دون المساس بالفترة المقفلة.
                </p>
              </div>
            </div>

            {/* Months Periods Ledger Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="p-5 border-b border-slate-800 flex justify-between items-center">
                <div>
                  <h4 className="font-black text-white text-sm flex items-center gap-2">
                    <History className="w-4 h-4 text-amber-500" />
                    <span>سجل الفترات والشهور المالية (Financial Periods Ledger)</span>
                  </h4>
                  <p className="text-xs text-slate-400 font-bold mt-0.5">
                    متابعة حالة الإغلاق والترحيل لكل شهر مالي مع الإجماليات الختامية
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">الشهر المالي</th>
                      <th className="p-3.5 text-center">حالة الفترة</th>
                      <th className="p-3.5 text-center text-sky-400">مبيعات الكهرباء (الفواتير)</th>
                      <th className="p-3.5 text-center text-emerald-400">الإيرادات المحصلة</th>
                      <th className="p-3.5 text-center text-rose-400">المصروفات والتكاليف</th>
                      <th className="p-3.5 text-center text-amber-400">صافي الربح</th>
                      <th className="p-3.5 text-center">العمليات</th>
                      <th className="p-3.5 text-center">إجراءات الفترة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-bold text-slate-200">
                    {allHistoricalMonths.map((m) => {
                      const closedP = getClosedPeriod(m);
                      const isClosed = !!closedP;
                      const fin = isClosed ? {
                        totalRevenues: closedP.totalRevenues,
                        totalExpenses: closedP.totalExpenses,
                        netProfit: closedP.netProfit,
                        electricityBilled: closedP.totalRevenues,
                        readingsCount: closedP.readingsCount || 0,
                        paymentsCount: closedP.paymentsCount || 0,
                      } : calculateMonthFinancials(m);

                      return (
                        <tr key={m} className={`hover:bg-slate-800/40 transition-colors ${isClosed ? 'bg-rose-950/5' : ''}`}>
                          <td className="p-3.5 font-bold">
                            <div className="flex items-center gap-2">
                              {isClosed ? (
                                <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                              ) : (
                                <Unlock className="w-4 h-4 text-emerald-400 shrink-0" />
                              )}
                              <div>
                                <span className="font-mono text-sm font-black text-white">{m}</span>
                                <span className="block text-[11px] text-slate-400">{formatMonthLabel(m)}</span>
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5 text-center">
                            {isClosed ? (
                              <div>
                                <span className="px-2.5 py-1 bg-rose-500/15 text-rose-400 border border-rose-500/30 rounded-xl text-[11px] font-black inline-flex items-center gap-1">
                                  <Lock className="w-3 h-3" />
                                  <span>مقفل ومرحل</span>
                                </span>
                                {closedP.closedAt && (
                                  <span className="block text-[9px] text-slate-500 font-mono mt-1">
                                    {new Date(closedP.closedAt).toLocaleDateString('ar-SA')} ({closedP.closedBy})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl text-[11px] font-black inline-flex items-center gap-1">
                                <Unlock className="w-3 h-3" />
                                <span>فترة مفتوحة</span>
                              </span>
                            )}
                          </td>

                          <td className="p-3.5 text-center font-mono font-black text-sky-400">
                            {fin.electricityBilled.toLocaleString()} <span className="text-[10px] text-slate-500">{settings.currency}</span>
                          </td>

                          <td className="p-3.5 text-center font-mono font-black text-emerald-400">
                            {fin.totalRevenues.toLocaleString()} <span className="text-[10px] text-slate-500">{settings.currency}</span>
                          </td>

                          <td className="p-3.5 text-center font-mono font-black text-rose-400">
                            {fin.totalExpenses.toLocaleString()} <span className="text-[10px] text-slate-500">{settings.currency}</span>
                          </td>

                          <td className="p-3.5 text-center font-mono font-black text-amber-400">
                            <span className={fin.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {fin.netProfit.toLocaleString()} <span className="text-[10px] text-slate-500">{settings.currency}</span>
                            </span>
                          </td>

                          <td className="p-3.5 text-center font-mono text-[11px] text-slate-400">
                            <span>{fin.readingsCount} فاتورة</span>
                            <span className="mx-1">/</span>
                            <span>{fin.paymentsCount} سند قبض</span>
                          </td>

                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {isClosed ? (
                                <>
                                  <button
                                    onClick={() => setViewingClosedPeriodReport(closedP)}
                                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                                    title="معاينة وطباعة بطاقة إغلاق الشهر المالي"
                                  >
                                    <FileCheck className="w-3.5 h-3.5" />
                                    <span>تقرير الإغلاق</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      setReopenPeriodMonth(m);
                                      setReopenReason('');
                                    }}
                                    className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                                    title="إلغاء الإغلاق وإعادة فتح الفترة (للإدارة العليا)"
                                  >
                                    <Unlock className="w-3.5 h-3.5" />
                                    <span>إعادة فتح</span>
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => {
                                    setPeriodToClose(m);
                                    setShowClosePeriodModal(true);
                                  }}
                                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-black shadow-md shadow-amber-500/10"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                  <span>إغلاق وترحيل 🔒</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MODALS --- */}

      {/* 1. ADD EXPENSE MODAL */}
      <AnimatePresence>
        {showAddExpense && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setShowAddExpense(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <button
                  onClick={() => setShowAddExpense(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-amber-500" />
                  سند صرف مصروفات جديد
                </h3>
              </div>
              
              <form onSubmit={handleAddExpense} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">تصنيف المصروف</label>
                    <div className="relative">
                      <select
                        required
                        value={newExpense.category ?? ''}
                        onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 appearance-none font-bold"
                      >
                        <option value="وقود (ديزل)">وقود (ديزل)</option>
                        <option value="صيانة وقطع غيار">صيانة وقطع غيار</option>
                        <option value="زيوت وشحوم">زيوت وشحوم</option>
                        <option value="إيجارات ورسوم">إيجارات ورسوم</option>
                        <option value="نثريات وضيافة">نثريات وضيافة</option>
                        <option value="أخرى">أخرى</option>
                      </select>
                      <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">تاريخ الصرف</label>
                    <input
                      type="date"
                      required
                      value={newExpense.date ?? ''}
                      onChange={e => setNewExpense({...newExpense, date: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 text-right font-bold"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">المبلغ ({settings.currency})</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newExpense.amount ?? ''}
                    onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 text-right font-mono font-bold"
                    placeholder="مثال: 150000"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">البيان والتفاصيل</label>
                  <textarea
                    required
                    value={newExpense.description ?? ''}
                    onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 text-right resize-none min-h-[90px] font-bold"
                    placeholder="سبب الصرف..."
                  />
                </div>
                
                <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddExpense(false)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors"
                  >
                    اعتماد سند الصرف
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. ADD MANUAL JOURNAL MODAL */}
      <AnimatePresence>
        {showAddManualJournal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setShowAddManualJournal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <button
                  onClick={() => setShowAddManualJournal(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-500" />
                  إضافة قيد تسوية محاسبي يدوي (Journal Voucher)
                </h3>
              </div>

              <form onSubmit={handleAddManualJournal} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">من حـ / الحساب المدين</label>
                    <input
                      type="text"
                      required
                      value={newManualJournal.debitAccountName ?? ''}
                      onChange={e => setNewManualJournal({...newManualJournal, debitAccountName: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 text-right font-bold"
                      placeholder="مثال: حـ/ مصروفات الصيانة"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">إلى حـ / الحساب الدائن</label>
                    <input
                      type="text"
                      required
                      value={newManualJournal.creditAccountName ?? ''}
                      onChange={e => setNewManualJournal({...newManualJournal, creditAccountName: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 text-right font-bold"
                      placeholder="مثال: حـ/ الصندوق الرئيسي"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">مبلغ القيد ({settings.currency})</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newManualJournal.amount ?? ''}
                      onChange={e => setNewManualJournal({...newManualJournal, amount: Number(e.target.value)})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 text-right font-mono font-bold"
                      placeholder="المبلغ"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">تاريخ القيد</label>
                    <input
                      type="date"
                      required
                      value={newManualJournal.date ?? ''}
                      onChange={e => setNewManualJournal({...newManualJournal, date: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 text-right font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">البيان والشرح المحاسبي</label>
                  <textarea
                    required
                    value={newManualJournal.description ?? ''}
                    onChange={e => setNewManualJournal({...newManualJournal, description: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 text-right resize-none min-h-[80px] font-bold"
                    placeholder="سبب القيد والبيان التفصيلي..."
                  />
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddManualJournal(false)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors"
                  >
                    اعتماد القيد المحاسبي
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT MANUAL JOURNAL ENTRY MODAL */}
      <AnimatePresence>
        {editingJournalEntry && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setEditingJournalEntry(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <button
                  onClick={() => setEditingJournalEntry(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-cyan-400" />
                  تعديل القيد المحاسبي اليدوي ({editingJournalEntry.voucherNumber})
                </h3>
              </div>

              <form onSubmit={handleSaveEditedJournalEntry} className="p-6 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">رقم السند</label>
                    <input
                      type="text"
                      required
                      value={editingJournalEntry.voucherNumber ?? ''}
                      onChange={e => setEditingJournalEntry({...editingJournalEntry, voucherNumber: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500 text-right font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">تاريخ القيد</label>
                    <input
                      type="date"
                      required
                      value={editingJournalEntry.date ?? ''}
                      onChange={e => setEditingJournalEntry({...editingJournalEntry, date: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500 text-right font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">اسم الحساب المدين (من حـ)</label>
                    <input
                      type="text"
                      required
                      value={editingJournalEntry.debitAccountName ?? ''}
                      onChange={e => setEditingJournalEntry({...editingJournalEntry, debitAccountName: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-emerald-400 focus:outline-none focus:border-cyan-500 text-right font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">كود الحساب المدين</label>
                    <input
                      type="text"
                      value={editingJournalEntry.debitAccountCode ?? ''}
                      onChange={e => setEditingJournalEntry({...editingJournalEntry, debitAccountCode: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500 text-right font-mono font-bold"
                      placeholder="5010"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">اسم الحساب الدائن (إلى حـ)</label>
                    <input
                      type="text"
                      required
                      value={editingJournalEntry.creditAccountName ?? ''}
                      onChange={e => setEditingJournalEntry({...editingJournalEntry, creditAccountName: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-rose-400 focus:outline-none focus:border-cyan-500 text-right font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">كود الحساب الدائن</label>
                    <input
                      type="text"
                      value={editingJournalEntry.creditAccountCode ?? ''}
                      onChange={e => setEditingJournalEntry({...editingJournalEntry, creditAccountCode: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500 text-right font-mono font-bold"
                      placeholder="1010"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">مبلغ القيد ({settings.currency})</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editingJournalEntry.amount ?? ''}
                    onChange={e => setEditingJournalEntry({...editingJournalEntry, amount: Number(e.target.value)})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 text-right font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">البيان والشرح المحاسبي</label>
                  <textarea
                    required
                    value={editingJournalEntry.description ?? ''}
                    onChange={e => setEditingJournalEntry({...editingJournalEntry, description: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500 text-right resize-none min-h-[80px] font-bold"
                  />
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingJournalEntry(null)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-xs font-black bg-cyan-500 hover:bg-cyan-600 text-slate-950 transition-colors"
                  >
                    حفظ تعديلات القيد
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. ADD TREASURY TRANSFER MODAL */}
      <AnimatePresence>
        {showAddTransfer && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setShowAddTransfer(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <button
                  onClick={() => setShowAddTransfer(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5 text-amber-500" />
                  سند تحويل بين الصناديق والمحافظ
                </h3>
              </div>

              <form onSubmit={handleAddTransfer} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">من حساب (المنصرف)</label>
                    <select
                      value={newTransfer.fromAccount}
                      onChange={e => setNewTransfer({...newTransfer, fromAccount: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                    >
                      {availableAccounts.map(acc => (
                        <option key={`from-${acc}`} value={acc}>{acc}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">إلى حساب (المستلم)</label>
                    <select
                      value={newTransfer.toAccount}
                      onChange={e => setNewTransfer({...newTransfer, toAccount: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                    >
                      {availableAccounts.map(acc => (
                        <option key={`to-${acc}`} value={acc}>{acc}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">المبلغ المكتوب ({settings.currency})</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newTransfer.amount ?? ''}
                      onChange={e => setNewTransfer({...newTransfer, amount: Number(e.target.value)})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 text-right font-mono font-bold"
                      placeholder="المبلغ"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">تاريخ التوريد والتحويل</label>
                    <input
                      type="date"
                      required
                      value={newTransfer.date ?? ''}
                      onChange={e => setNewTransfer({...newTransfer, date: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 text-right font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">ملاحظات التحويل والبيان</label>
                  <textarea
                    value={newTransfer.notes ?? ''}
                    onChange={e => setNewTransfer({...newTransfer, notes: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 text-right resize-none min-h-[80px] font-bold"
                    placeholder="مثال: توريد حصيلة التحصيل اليومي الميداني..."
                  />
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddTransfer(false)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors"
                  >
                    اعتماد سند التحويل
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. PRINTABLE JOURNAL VOUCHER MODAL */}
      <AnimatePresence>
        {selectedVoucherForPrint && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setSelectedVoucherForPrint(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white text-slate-900 rounded-3xl shadow-2xl p-6 text-right space-y-4"
            >
              <div className="flex justify-between items-center border-b pb-3">
                <button
                  onClick={() => setSelectedVoucherForPrint(null)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="text-center">
                  <h3 className="font-black text-lg text-slate-900">{settings.companyName || 'شركة الكهرباء التجاري'}</h3>
                  <p className="text-xs text-slate-500 font-bold">سند قيد محاسبي مزدوج (Journal Voucher)</p>
                </div>
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl font-mono font-black text-xs">
                  {selectedVoucherForPrint.voucherNumber}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-bold bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>التاريخ: <span className="font-mono text-slate-700">{selectedVoucherForPrint.date}</span></div>
                <div>نوع السند: <span className="text-amber-700">{selectedVoucherForPrint.typeLabel}</span></div>
                <div>المسجل: <span className="text-slate-700">{selectedVoucherForPrint.recordedBy}</span></div>
                <div>المبلغ: <span className="font-mono text-emerald-700 font-black text-sm">{selectedVoucherForPrint.amount.toLocaleString()} {settings.currency}</span></div>
              </div>

              <div className="space-y-2 text-xs font-bold border rounded-xl overflow-hidden">
                <div className="bg-slate-900 text-white p-2.5 flex justify-between">
                  <span>من حـ/ (الجانب المدين):</span>
                  <span className="font-mono">{selectedVoucherForPrint.debitAccountName} ({selectedVoucherForPrint.debitAccountCode})</span>
                </div>
                <div className="bg-slate-100 text-slate-900 p-2.5 flex justify-between">
                  <span>إلى حـ/ (الجانب الدائن):</span>
                  <span className="font-mono">{selectedVoucherForPrint.creditAccountName} ({selectedVoucherForPrint.creditAccountCode})</span>
                </div>
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs font-bold text-amber-900">
                البيان والشرح المحاسبي: <p className="mt-1 font-normal text-slate-800">{selectedVoucherForPrint.description}</p>
              </div>

              <div className="pt-4 border-t flex justify-between items-center">
                <button
                  onClick={() => printData(`سند قيد ${selectedVoucherForPrint.voucherNumber}`, [selectedVoucherForPrint], [{key: 'voucherNumber', label: 'رقم السند'}, {key: 'date', label: 'التاريخ'}, {key: 'debitAccountName', label: 'من حـ (مدين)'}, {key: 'creditAccountName', label: 'إلى حـ (دائن)'}, {key: 'amount', label: 'المبلغ'}, {key: 'description', label: 'البيان'}])}
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-2 cursor-pointer hover:bg-slate-800"
                >
                  <Printer className="w-4 h-4 text-amber-400" /> طباعة السند
                </button>
                <button
                  onClick={() => setSelectedVoucherForPrint(null)}
                  className="px-5 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. ADD PURCHASE MODAL */}
      <AnimatePresence>
        {showAddPurchase && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setShowAddPurchase(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <button
                  onClick={() => setShowAddPurchase(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-500" />
                  فاتورة مشتريات وتجهيزات جديدة
                </h3>
              </div>
              
              <form onSubmit={handleAddPurchase} className="p-6 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">رقم الفاتورة / السند</label>
                    <input
                      type="text"
                      value={newPurchase.invoiceNumber ?? ''}
                      onChange={e => setNewPurchase({...newPurchase, invoiceNumber: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 text-right font-mono font-bold"
                      placeholder={`PUR-${Date.now().toString().slice(-6)}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">تاريخ الفاتورة</label>
                    <input
                      type="date"
                      required
                      value={newPurchase.date ?? ''}
                      onChange={e => setNewPurchase({...newPurchase, date: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 text-right font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">اسم المورد</label>
                  <input
                    type="text"
                    required
                    value={newPurchase.supplier ?? ''}
                    onChange={e => setNewPurchase({...newPurchase, supplier: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 text-right font-bold"
                    placeholder="مثال: شركة النور للكهربائيات والتجهيزات"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">طريقة السداد</label>
                    <select
                      value={newPurchase.paymentType || 'cash'}
                      onChange={e => {
                        const type = e.target.value as 'cash' | 'credit';
                        setNewPurchase({
                          ...newPurchase,
                          paymentType: type,
                          paidAmount: type === 'cash' ? (newPurchase.amount || 0) : 0
                        });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 text-right font-bold"
                    >
                      <option value="cash">نقداً (نقدي مكتمل)</option>
                      <option value="credit">آجل (على الحساب/دين)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">إجمالي الفاتورة ({settings.currency})</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newPurchase.amount ?? ''}
                      onChange={e => {
                        const amt = Number(e.target.value);
                        setNewPurchase({
                          ...newPurchase,
                          amount: amt,
                          paidAmount: newPurchase.paymentType === 'cash' ? amt : (newPurchase.paidAmount || 0)
                        });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 text-right font-mono font-bold"
                      placeholder="المبلغ الإجمالي"
                    />
                  </div>
                </div>

                {newPurchase.paymentType === 'credit' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">المبلغ المدفوع مقدمًا للمورد ({settings.currency})</label>
                    <input
                      type="number"
                      min="0"
                      max={newPurchase.amount || 0}
                      value={newPurchase.paidAmount ?? 0}
                      onChange={e => setNewPurchase({...newPurchase, paidAmount: Number(e.target.value)})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-emerald-400 focus:outline-none focus:border-amber-500 text-right font-mono font-bold"
                      placeholder="المبلغ المدفوع حالياً"
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">الأصناف والتجهيزات المشتراة</label>
                  <textarea
                    required
                    value={newPurchase.items ?? ''}
                    onChange={e => setNewPurchase({...newPurchase, items: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 text-right resize-none min-h-[70px] font-bold"
                    placeholder="تفاصيل التجهيزات والمعدات..."
                  />
                </div>
                
                <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddPurchase(false)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors"
                  >
                    حفظ الفاتورة
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT PURCHASE MODAL */}
      <AnimatePresence>
        {editingPurchase && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setEditingPurchase(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <button
                  onClick={() => setEditingPurchase(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-cyan-400" />
                  تعديل فاتورة المشتريات
                </h3>
              </div>
              
              <form onSubmit={handleSaveEditedPurchase} className="p-6 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">رقم الفاتورة</label>
                    <input
                      type="text"
                      value={editingPurchase.invoiceNumber ?? ''}
                      onChange={e => setEditingPurchase({...editingPurchase, invoiceNumber: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500 text-right font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">التاريخ</label>
                    <input
                      type="date"
                      required
                      value={editingPurchase.date ?? ''}
                      onChange={e => setEditingPurchase({...editingPurchase, date: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500 text-right font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">اسم المورد</label>
                  <input
                    type="text"
                    required
                    value={editingPurchase.supplier ?? ''}
                    onChange={e => setEditingPurchase({...editingPurchase, supplier: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500 text-right font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">طريقة السداد</label>
                    <select
                      value={editingPurchase.paymentType || 'cash'}
                      onChange={e => {
                        const type = e.target.value as 'cash' | 'credit';
                        setEditingPurchase({
                          ...editingPurchase,
                          paymentType: type,
                          paidAmount: type === 'cash' ? editingPurchase.amount : (editingPurchase.paidAmount || 0)
                        });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500 text-right font-bold"
                    >
                      <option value="cash">نقداً</option>
                      <option value="credit">آجل (دين)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">إجمالي الفاتورة</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editingPurchase.amount ?? ''}
                      onChange={e => setEditingPurchase({...editingPurchase, amount: Number(e.target.value)})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 text-right font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">المبلغ المدفوع للمورد</label>
                  <input
                    type="number"
                    min="0"
                    max={editingPurchase.amount}
                    value={editingPurchase.paidAmount ?? (editingPurchase.paymentType === 'cash' ? editingPurchase.amount : 0)}
                    onChange={e => setEditingPurchase({...editingPurchase, paidAmount: Number(e.target.value)})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-emerald-400 focus:outline-none focus:border-cyan-500 text-right font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">الأصناف والتجهيزات</label>
                  <textarea
                    required
                    value={editingPurchase.items ?? ''}
                    onChange={e => setEditingPurchase({...editingPurchase, items: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500 text-right resize-none min-h-[70px] font-bold"
                  />
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingPurchase(null)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-xs font-black bg-cyan-500 hover:bg-cyan-600 text-slate-950 transition-colors"
                  >
                    حفظ التعديلات
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PRINTABLE PURCHASE VOUCHER MODAL */}
      <AnimatePresence>
        {printablePurchase && (
          <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl bg-white text-slate-900 rounded-3xl p-8 shadow-2xl space-y-6 text-right"
            >
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900">{settings.stationName || 'محطة الكهرباء التجارية'}</h2>
                  <p className="text-xs text-slate-600 font-bold mt-0.5">سند / فاتورة مشتريات وتجهيزات (Purchase Voucher)</p>
                </div>
                <div className="text-left font-mono">
                  <span className="text-sm font-black text-amber-600 block">{printablePurchase.invoiceNumber || printablePurchase.id}</span>
                  <span className="text-xs text-slate-500 font-bold">{printablePurchase.date}</span>
                </div>
              </div>

              <div className="space-y-4 text-sm font-bold text-slate-800">
                <div className="bg-slate-100 p-4 rounded-2xl flex items-center justify-between border border-slate-200">
                  <span>اسم المورد / الشركة:</span>
                  <span className="text-lg font-black text-slate-900">{printablePurchase.supplier}</span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="border border-slate-200 p-3 rounded-xl">
                    <span className="text-slate-500 block text-[10px]">إجمالي الفاتورة:</span>
                    <span className="font-mono font-black text-slate-900 text-sm">{printablePurchase.amount.toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="border border-slate-200 p-3 rounded-xl bg-emerald-50">
                    <span className="text-emerald-700 block text-[10px]">المبلغ المدفوع:</span>
                    <span className="font-mono font-black text-emerald-800 text-sm">
                      {(printablePurchase.paidAmount !== undefined ? printablePurchase.paidAmount : (printablePurchase.paymentType === 'cash' ? printablePurchase.amount : 0)).toLocaleString()} {settings.currency}
                    </span>
                  </div>
                  <div className="border border-slate-200 p-3 rounded-xl bg-rose-50">
                    <span className="text-rose-700 block text-[10px]">المتبقي للمورد:</span>
                    <span className="font-mono font-black text-rose-800 text-sm">
                      {(printablePurchase.amount - (printablePurchase.paidAmount !== undefined ? printablePurchase.paidAmount : (printablePurchase.paymentType === 'cash' ? printablePurchase.amount : 0))).toLocaleString()} {settings.currency}
                    </span>
                  </div>
                </div>

                <div className="border border-slate-200 p-4 rounded-xl text-xs space-y-1">
                  <span className="text-slate-500 block text-[10px]">الأصناف والتجهيزات المشتراة:</span>
                  <p className="text-slate-900 font-bold whitespace-pre-wrap">{printablePurchase.items}</p>
                </div>

                <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
                  <div>
                    <span className="block text-slate-500 mb-8">توقيع المورد:</span>
                    <span className="font-black border-t border-slate-400 pt-1 block w-32 mx-auto">..........................</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 mb-8">اعتماد مسئول المشتريات:</span>
                    <span className="font-black border-t border-slate-400 pt-1 block w-32 mx-auto">{printablePurchase.recordedBy || 'مدير النظام'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 print:hidden">
                <button
                  onClick={() => setPrintablePurchase(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  إغلاق
                </button>
                <button
                  onClick={() => safePrint()}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>طباعة فاتورة الشراء</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SUPPLIER ACCOUNT STATEMENT MODAL */}
      <AnimatePresence>
        {selectedSupplierStatement && (() => {
          const supInvoices = purchases.filter(p => (p.supplier || '').trim() === selectedSupplierStatement);
          const totalAmt = supInvoices.reduce((s, p) => s + p.amount, 0);
          const totalPaid = supInvoices.reduce((s, p) => s + (p.paidAmount !== undefined ? p.paidAmount : (p.paymentType === 'cash' ? p.amount : 0)), 0);
          const totalRem = totalAmt - totalPaid;

          return (
            <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-3xl bg-white text-slate-900 rounded-3xl p-8 shadow-2xl space-y-6 text-right max-h-[90vh] flex flex-col"
              >
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">{settings.stationName || 'محطة الكهرباء التجارية'}</h2>
                    <p className="text-xs text-slate-600 font-bold mt-0.5">كشف حساب مورد تفصيلي (Supplier Account Statement)</p>
                  </div>
                  <div className="text-left font-mono">
                    <span className="text-sm font-black text-amber-600 block">{selectedSupplierStatement}</span>
                    <span className="text-xs text-slate-500 font-bold">تاريخ التقرير: {new Date().toISOString().split('T')[0]}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="border border-slate-200 p-3 rounded-xl bg-slate-50">
                    <span className="text-slate-500 block text-[10px]">إجمالي التعاملات (المشتريات):</span>
                    <span className="font-mono font-black text-slate-900 text-sm">{totalAmt.toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="border border-slate-200 p-3 rounded-xl bg-emerald-50">
                    <span className="text-emerald-700 block text-[10px]">إجمالي المبالغ المسددة:</span>
                    <span className="font-mono font-black text-emerald-800 text-sm">{totalPaid.toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="border border-slate-200 p-3 rounded-xl bg-rose-50">
                    <span className="text-rose-700 block text-[10px]">الرصيد المتبقي للمورد (الدين):</span>
                    <span className="font-mono font-black text-rose-800 text-sm">{totalRem.toLocaleString()} {settings.currency}</span>
                  </div>
                </div>

                <div className="overflow-y-auto max-h-[350px] border border-slate-200 rounded-2xl">
                  <table className="w-full text-xs text-right">
                    <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold sticky top-0">
                      <tr>
                        <th className="p-3">رقم الفاتورة</th>
                        <th className="p-3">التاريخ</th>
                        <th className="p-3">التجهيزات / الأصناف</th>
                        <th className="p-3 text-center">نوع الدفع</th>
                        <th className="p-3 text-center">الإجمالي</th>
                        <th className="p-3 text-center">المدفوع</th>
                        <th className="p-3 text-center">المتبقي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-bold">
                      {supInvoices.map(p => {
                        const paid = p.paidAmount !== undefined ? p.paidAmount : (p.paymentType === 'cash' ? p.amount : 0);
                        const rem = p.amount - paid;
                        return (
                          <tr key={p.id}>
                            <td className="p-3 font-mono text-amber-700">{p.invoiceNumber || p.id}</td>
                            <td className="p-3 font-mono text-slate-600">{p.date}</td>
                            <td className="p-3 text-slate-800">{p.items}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] ${p.paymentType === 'cash' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                {p.paymentType === 'cash' ? 'نقداً' : 'آجل'}
                              </span>
                            </td>
                            <td className="p-3 text-center font-mono font-black text-slate-900">{p.amount.toLocaleString()}</td>
                            <td className="p-3 text-center font-mono text-emerald-700">{paid.toLocaleString()}</td>
                            <td className="p-3 text-center font-mono text-rose-700">{rem > 0 ? rem.toLocaleString() : '0'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
                  <div>
                    <span className="block text-slate-500 mb-6">توقيع المحاسب / المراجعة:</span>
                    <span className="font-black border-t border-slate-400 pt-1 block w-32 mx-auto">..........................</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 mb-6">اعتماد مدير النظام:</span>
                    <span className="font-black border-t border-slate-400 pt-1 block w-32 mx-auto">{currentUser.name || 'مدير النظام'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 print:hidden">
                  <button
                    onClick={() => setSelectedSupplierStatement(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    إغلاق
                  </button>
                  <button
                    onClick={() => safePrint()}
                    className="px-5 py-2 rounded-xl text-xs font-black bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-amber-400" />
                    <span>طباعة كشف حساب المورد</span>
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* 6. ENHANCED ADD CONNECTION MODAL (تسجيل طلب إدخال خدمة جديد) */}
      <AnimatePresence>
        {showAddConnection && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/85 backdrop-blur-md"
              onClick={() => setShowAddConnection(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right my-8 max-h-[92vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
                <button
                  type="button"
                  onClick={() => setShowAddConnection(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <Zap className="w-5 h-5 text-amber-500" />
                      تسجيل طلب إدخال خدمة وتوصيل عداد جديد
                    </h3>
                    <p className="text-[11px] text-slate-400">إثبات الإيرادات المحصلة ورسوم الاشتراك وأثمان العدادات والتأمين</p>
                  </div>
                </div>
              </div>
              
              {/* Form Body */}
              <form onSubmit={handleAddConnection} className="p-6 space-y-6 overflow-y-auto flex-1">
                {/* SECTION 1: SUBSCRIBER & SERVICE TYPE */}
                <div className="space-y-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                    <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4" />
                      1. بيانات المشترك ونوع الخدمة
                    </span>
                    
                    {/* Toggle: Existing vs New */}
                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedExistingSubId('new');
                          setNewConnection(prev => ({
                            ...prev,
                            subscriberId: undefined,
                            subscriberName: '',
                            phone: '',
                            meterNumber: '',
                            zone: '',
                            tariffType: 'residential'
                          }));
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                          selectedExistingSubId === 'new'
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        مشترك جديد كلياً
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (subscribers.length > 0) {
                            setSelectedExistingSubId(subscribers[0].id);
                            const s = subscribers[0];
                            setNewConnection(prev => ({
                              ...prev,
                              subscriberId: s.id,
                              subscriberName: s.name,
                              phone: s.phone || '',
                              meterNumber: s.meterNumber || '',
                              zone: s.zone || '',
                              tariffType: s.tariffType || 'residential'
                            }));
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                          selectedExistingSubId !== 'new'
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        مشترك مسجل بالنظام ({subscribers.length})
                      </button>
                    </div>
                  </div>

                  {/* Existing subscriber dropdown if chosen */}
                  {selectedExistingSubId !== 'new' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">اختر المشترك من السجل العام:</label>
                      <select
                        value={selectedExistingSubId}
                        onChange={e => {
                          const val = e.target.value;
                          setSelectedExistingSubId(val);
                          const sub = subscribers.find(s => s.id === val);
                          if (sub) {
                            setNewConnection(prev => ({
                              ...prev,
                              subscriberId: sub.id,
                              subscriberName: sub.name,
                              phone: sub.phone || '',
                              meterNumber: sub.meterNumber || '',
                              zone: sub.zone || '',
                              tariffType: sub.tariffType || 'residential'
                            }));
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                      >
                        {subscribers.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} - عداد: {s.meterNumber} - {s.phone || 'بدون هاتف'} ({s.zone || 'الرئيسية'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">اسم المشترك *</label>
                      <input
                        type="text"
                        required
                        value={newConnection.subscriberName || ''}
                        onChange={e => setNewConnection({ ...newConnection, subscriberName: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                        placeholder="الاسم الرباعي للمشترك"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">رقم الهاتف / الجوال</label>
                      <input
                        type="text"
                        value={newConnection.phone || ''}
                        onChange={e => setNewConnection({ ...newConnection, phone: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono text-right"
                        placeholder="77XXXXXXXX"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">المنطقة / المربع السكني</label>
                      <input
                        type="text"
                        value={newConnection.zone || ''}
                        onChange={e => setNewConnection({ ...newConnection, zone: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                        placeholder="الحارة / الشارع / المربع"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">نوع الخدمة المطلوبة</label>
                      <select
                        value={newConnection.serviceType || 'new_connection'}
                        onChange={e => setNewConnection({ ...newConnection, serviceType: e.target.value as any })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                      >
                        <option value="new_connection">توصيل وعداد جديد</option>
                        <option value="phase_upgrade">ترقية 3-Phase</option>
                        <option value="relocation">نقل موقع عداد</option>
                        <option value="reconnect">إعادة إطلاق تيار</option>
                        <option value="meter_replacement">استبدال عداد</option>
                        <option value="maintenance">صيانة وتوسعة شبكة</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">رقم العداد المركب</label>
                      <input
                        type="text"
                        value={newConnection.meterNumber || ''}
                        onChange={e => setNewConnection({ ...newConnection, meterNumber: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono text-right"
                        placeholder="MTR-XXXXXX"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">نوع التعرفة</label>
                      <select
                        value={newConnection.tariffType || 'residential'}
                        onChange={e => setNewConnection({ ...newConnection, tariffType: e.target.value as any })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                      >
                        <option value="residential">منزلي</option>
                        <option value="commercial">تجاري</option>
                        <option value="industrial">صناعي</option>
                        <option value="agricultural">زراعي</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">تاريخ المعاملة *</label>
                      <input
                        type="date"
                        required
                        value={newConnection.date || ''}
                        onChange={e => setNewConnection({ ...newConnection, date: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                      />
                    </div>
                  </div>

                  {/* Auto-create in subscriber database checkbox */}
                  {selectedExistingSubId === 'new' && (
                    <label className="flex items-center gap-2 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={!!newConnection.autoCreatedSubscriber}
                        onChange={e => setNewConnection({ ...newConnection, autoCreatedSubscriber: e.target.checked })}
                        className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs text-slate-300 font-bold">
                        إضافة هذا المشترك تلقائياً إلى دليل المشتركين المعتمد بالنظام
                      </span>
                    </label>
                  )}
                </div>

                {/* SECTION 2: DETAILED FINANCIAL COST BREAKDOWN */}
                <div className="space-y-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                    <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4" />
                      2. تفصيل الرسوم والتكاليف المالية ({settings.currency})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const fee = Number(newConnection.connectionFee || 0);
                        const mCost = Number(newConnection.meterCost || 0);
                        const ins = Number(newConnection.insuranceDeposit || 0);
                        const labor = Number(newConnection.installationLaborFee || 0);
                        const mat = Number(newConnection.materialsFee || 0);
                        const other = Number(newConnection.otherFees || 0);
                        const sum = fee + mCost + ins + labor + mat + other;
                        setNewConnection(prev => ({
                          ...prev,
                          totalFee: sum,
                          paidAmount: sum
                        }));
                      }}
                      className="text-[10px] text-amber-400 hover:underline font-bold flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      حساب الإجمالي وسداد الكل تلقائياً
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">رسوم إدخال الخدمة والاشتراك</label>
                      <input
                        type="number"
                        min="0"
                        value={newConnection.connectionFee ?? ''}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setNewConnection(prev => {
                            const newTotal = val + Number(prev.meterCost || 0) + Number(prev.insuranceDeposit || 0) + Number(prev.installationLaborFee || 0) + Number(prev.materialsFee || 0) + Number(prev.otherFees || 0);
                            return { ...prev, connectionFee: val, totalFee: newTotal };
                          });
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono font-bold text-right"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">ثمن العداد والتجهيزات</label>
                      <input
                        type="number"
                        min="0"
                        value={newConnection.meterCost ?? ''}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setNewConnection(prev => {
                            const newTotal = Number(prev.connectionFee || 0) + val + Number(prev.insuranceDeposit || 0) + Number(prev.installationLaborFee || 0) + Number(prev.materialsFee || 0) + Number(prev.otherFees || 0);
                            return { ...prev, meterCost: val, totalFee: newTotal };
                          });
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono font-bold text-right"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-purple-400 mb-1">تأمين العداد المسترد (أمانات)</label>
                      <input
                        type="number"
                        min="0"
                        value={newConnection.insuranceDeposit ?? ''}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setNewConnection(prev => {
                            const newTotal = Number(prev.connectionFee || 0) + Number(prev.meterCost || 0) + val + Number(prev.installationLaborFee || 0) + Number(prev.materialsFee || 0) + Number(prev.otherFees || 0);
                            return { ...prev, insuranceDeposit: val, totalFee: newTotal };
                          });
                        }}
                        className="w-full bg-slate-900 border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400 font-mono font-bold text-right"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">أجور التركيب واليد الفنية</label>
                      <input
                        type="number"
                        min="0"
                        value={newConnection.installationLaborFee ?? ''}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setNewConnection(prev => {
                            const newTotal = Number(prev.connectionFee || 0) + Number(prev.meterCost || 0) + Number(prev.insuranceDeposit || 0) + val + Number(prev.materialsFee || 0) + Number(prev.otherFees || 0);
                            return { ...prev, installationLaborFee: val, totalFee: newTotal };
                          });
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono font-bold text-right"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">قيمة الكابلات والتمديدات</label>
                      <input
                        type="number"
                        min="0"
                        value={newConnection.materialsFee ?? ''}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setNewConnection(prev => {
                            const newTotal = Number(prev.connectionFee || 0) + Number(prev.meterCost || 0) + Number(prev.insuranceDeposit || 0) + Number(prev.installationLaborFee || 0) + val + Number(prev.otherFees || 0);
                            return { ...prev, materialsFee: val, totalFee: newTotal };
                          });
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono font-bold text-right"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">رسوم أخرى / غرامات</label>
                      <input
                        type="number"
                        min="0"
                        value={newConnection.otherFees ?? ''}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setNewConnection(prev => {
                            const newTotal = Number(prev.connectionFee || 0) + Number(prev.meterCost || 0) + Number(prev.insuranceDeposit || 0) + Number(prev.installationLaborFee || 0) + Number(prev.materialsFee || 0) + val;
                            return { ...prev, otherFees: val, totalFee: newTotal };
                          });
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono font-bold text-right"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* TOTAL & PAID SECTION */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800 mt-3">
                    <div>
                      <label className="block text-xs font-black text-amber-400 mb-1">إجمالي الرسوم المستحقة *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={newConnection.totalFee ?? ''}
                        onChange={e => setNewConnection({ ...newConnection, totalFee: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400 font-mono font-black text-right"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-black text-emerald-400">المبلغ المقبوض الآن *</label>
                        <button
                          type="button"
                          onClick={() => setNewConnection(prev => ({ ...prev, paidAmount: prev.totalFee || 0 }))}
                          className="text-[10px] text-emerald-400 hover:underline font-bold"
                        >
                          سداد كامل المبلغ
                        </button>
                      </div>
                      <input
                        type="number"
                        required
                        min="0"
                        value={newConnection.paidAmount ?? ''}
                        onChange={e => setNewConnection({ ...newConnection, paidAmount: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-400 font-mono font-black text-right"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-rose-400 mb-1">المبلغ المتبقي (ذمة مؤجلة)</label>
                      <div className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm font-mono font-black text-right text-rose-400">
                        {Math.max(0, Number(newConnection.totalFee || 0) - Number(newConnection.paidAmount || 0)).toLocaleString()} {settings.currency}
                      </div>
                    </div>
                  </div>

                  {/* Payment method & Bank account */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">طريقة القبض والإيداع</label>
                      <select
                        value={newConnection.paymentMethod || 'cash'}
                        onChange={e => setNewConnection({ ...newConnection, paymentMethod: e.target.value as any })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                      >
                        <option value="cash">نقداً في الصندوق الرئيسي (كاش)</option>
                        <option value="bank_transfer">تحويل بنكي / محفظة إلكترونية</option>
                      </select>
                    </div>

                    {newConnection.paymentMethod === 'bank_transfer' && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 mb-1">الحساب البنكي / المحفظة المودع إليها</label>
                        <select
                          value={newConnection.bankAccountId || ''}
                          onChange={e => setNewConnection({ ...newConnection, bankAccountId: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                        >
                          <option value="">اختر الحساب البنكي</option>
                          {(settings.bankAccounts || []).map(b => (
                            <option key={b.id} value={b.id}>
                              {b.bankName} - {b.accountNumber} ({b.accountHolder})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* SECTION 3: TECHNICAL DETAILS & MATERIALS */}
                <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                  <div className="flex flex-wrap items-center justify-between border-b border-slate-800/60 pb-2 gap-2">
                    <div className="flex items-center gap-1.5">
                      <Wrench className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-black text-amber-400">
                        3. الفني المنفذ والمواد والتجهيزات المصروفة
                      </span>
                    </div>
                    {connectionMaterials.length > 0 && (
                      <span className="text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                        <Package className="w-3.5 h-3.5" />
                        {connectionMaterials.length} أصناف | إجمالي القيمة: {connectionMaterials.reduce((acc, m) => acc + (Number(m.quantity || 0) * Number(m.unitPrice || 0)), 0).toLocaleString()} {settings.currency}
                      </span>
                    )}
                  </div>

                  {/* Technician & Voucher */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">الفني المسؤول عن التركيب</label>
                      <input
                        type="text"
                        list="technicians-list"
                        value={newConnection.assignedTechnician || ''}
                        onChange={e => setNewConnection({ ...newConnection, assignedTechnician: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                        placeholder="اسم الفني أو المهندس"
                      />
                      <datalist id="technicians-list">
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.name} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">رقم السند الدفتري / الإشاري</label>
                      <input
                        type="text"
                        value={newConnection.voucherNo || ''}
                        onChange={e => setNewConnection({ ...newConnection, voucherNo: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono text-right"
                        placeholder="CON-2026-XXXX"
                      />
                    </div>
                  </div>

                  {/* Quick Kit Presets */}
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        أطقم وباقات مواد قياسية جاهزة (إضافة بنقرة واحدة):
                      </span>
                      {connectionMaterials.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setConnectionMaterials([])}
                          className="text-rose-400 hover:underline text-[10px]"
                        >
                          مسح قائمة المواد
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {CONNECTION_MATERIAL_PRESETS.map(preset => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setConnectionMaterials(preset.items.map(item => ({
                              ...item,
                              id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
                            })));
                          }}
                          className="text-right p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 transition-all text-xs group"
                        >
                          <div className="font-bold text-white group-hover:text-amber-400 flex items-center justify-between">
                            <span>{preset.title}</span>
                            <span className="text-[9px] bg-slate-800 group-hover:bg-amber-500/20 text-slate-400 group-hover:text-amber-300 px-1.5 py-0.5 rounded">
                              {preset.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                            {preset.items.map(i => `${i.quantity} ${i.unit} ${i.name}`).join(' + ')}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Materials Adding Controls */}
                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-3">
                    <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <Boxes className="w-3.5 h-3.5 text-amber-400" />
                      إضافة مواد وتجهيزات من المستودع أو مخصصة
                    </div>

                    {/* Row 1: Select from Warehouse */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                      <div className="sm:col-span-8">
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">
                          اختر من أصناف المستودع / المخزن الرئيسي
                        </label>
                        <select
                          value={selectedStoreItemId}
                          onChange={e => setSelectedStoreItemId(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                        >
                          <option value="">-- اختر صنفاً من المستودع --</option>
                          {inventory.map(item => (
                            <option key={item.id} value={item.id}>
                              {item.name} | المتوفر: {item.quantity} {item.unit} | السعر: {(item.unitPrice || item.costPrice || 0).toLocaleString()} {settings.currency}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-4">
                        <button
                          type="button"
                          disabled={!selectedStoreItemId}
                          onClick={() => {
                            const found = inventory.find(i => i.id === selectedStoreItemId);
                            if (found) {
                              setConnectionMaterials(prev => [
                                ...prev,
                                {
                                  id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                                  itemId: found.id,
                                  name: found.name,
                                  quantity: 1,
                                  unit: found.unit || 'حبة',
                                  unitPrice: found.unitPrice || found.costPrice || 0,
                                  notes: `صرف من المستودع (رصيد متاح: ${found.quantity})`
                                }
                              ]);
                              setSelectedStoreItemId('');
                            }
                          }}
                          className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-slate-950 font-black py-1.5 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          إضافة من المستودع
                        </button>
                      </div>
                    </div>

                    {/* Row 2: Custom Material Input */}
                    <div className="pt-2 border-t border-slate-800/80">
                      <span className="block text-[10px] font-bold text-slate-400 mb-1.5">أو إدخال مادة / تجهيز مخصص يدوياً:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                        <div className="sm:col-span-4">
                          <input
                            type="text"
                            placeholder="اسم المادة (مثال: كابل، قاطع، صندوق...)"
                            value={customMaterialInput.name}
                            onChange={e => setCustomMaterialInput({ ...customMaterialInput, name: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            placeholder="الكمية"
                            value={customMaterialInput.quantity || ''}
                            onChange={e => setCustomMaterialInput({ ...customMaterialInput, quantity: Number(e.target.value) })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono text-center font-bold"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <select
                            value={customMaterialInput.unit}
                            onChange={e => setCustomMaterialInput({ ...customMaterialInput, unit: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                          >
                            <option value="متر">متر</option>
                            <option value="حبة">حبة</option>
                            <option value="لفة">لفة</option>
                            <option value="طقم">طقم</option>
                            <option value="كيلو">كيلو</option>
                            <option value="قطعة">قطعة</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            type="number"
                            min="0"
                            placeholder="سعر الوحدة"
                            value={customMaterialInput.unitPrice || ''}
                            onChange={e => setCustomMaterialInput({ ...customMaterialInput, unitPrice: Number(e.target.value) })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono text-right"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <button
                            type="button"
                            disabled={!customMaterialInput.name.trim()}
                            onClick={() => {
                              if (!customMaterialInput.name.trim()) return;
                              setConnectionMaterials(prev => [
                                ...prev,
                                {
                                  id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                                  name: customMaterialInput.name.trim(),
                                  quantity: customMaterialInput.quantity || 1,
                                  unit: customMaterialInput.unit || 'متر',
                                  unitPrice: customMaterialInput.unitPrice || 0,
                                  notes: 'صنف يدوي مخصص'
                                }
                              ]);
                              setCustomMaterialInput({ name: '', quantity: 1, unit: 'متر', unitPrice: 0, notes: '' });
                            }}
                            className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 hover:text-white font-bold py-1.5 px-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            + إضافة
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Materials Items Table */}
                  {connectionMaterials.length > 0 ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
                      <div className="overflow-x-auto max-h-56">
                        <table className="w-full text-xs text-right">
                          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-bold sticky top-0">
                            <tr>
                              <th className="p-2">#</th>
                              <th className="p-2">بيان الصنف / المادة</th>
                              <th className="p-2 text-center">الكمية</th>
                              <th className="p-2 text-center">الوحدة</th>
                              <th className="p-2 text-center">سعر الوحدة</th>
                              <th className="p-2 text-center">إجمالي القيمة</th>
                              <th className="p-2 text-center">حذف</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 font-bold text-slate-200">
                            {connectionMaterials.map((mat, idx) => {
                              const invMatch = mat.itemId ? inventory.find(i => i.id === mat.itemId) : null;
                              const isOverStock = invMatch && Number(mat.quantity || 0) > invMatch.quantity;
                              const totalVal = (Number(mat.quantity || 0)) * (Number(mat.unitPrice || 0));

                              return (
                                <tr key={mat.id || idx} className="hover:bg-slate-800/50 transition-colors">
                                  <td className="p-2 font-mono text-slate-500 text-[11px]">{idx + 1}</td>
                                  <td className="p-2">
                                    <div className="text-white font-bold text-xs">{mat.name}</div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      {invMatch ? (
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${isOverStock ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-slate-800 text-slate-400'}`}>
                                          📦 مستودع (متوفر: {invMatch.quantity} {invMatch.unit})
                                          {isOverStock && ' ⚠️ الكمية تتجاوز الرصيد'}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-slate-500">صنف يدوي</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-2 text-center">
                                    <div className="inline-flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const nQ = Math.max(0.1, Number(mat.quantity || 1) - 1);
                                          setConnectionMaterials(prev => prev.map((m, i) => i === idx ? { ...m, quantity: nQ } : m));
                                        }}
                                        className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-bold"
                                      >
                                        -
                                      </button>
                                      <input
                                        type="number"
                                        min="0.1"
                                        step="any"
                                        value={mat.quantity}
                                        onChange={e => {
                                          const val = Number(e.target.value);
                                          setConnectionMaterials(prev => prev.map((m, i) => i === idx ? { ...m, quantity: val } : m));
                                        }}
                                        className="w-12 bg-transparent text-center text-xs font-mono font-bold text-white focus:outline-none"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const nQ = Number(mat.quantity || 0) + 1;
                                          setConnectionMaterials(prev => prev.map((m, i) => i === idx ? { ...m, quantity: nQ } : m));
                                        }}
                                        className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-bold"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </td>
                                  <td className="p-2 text-center text-slate-400 text-xs font-bold">
                                    {mat.unit}
                                  </td>
                                  <td className="p-2 text-center">
                                    <input
                                      type="number"
                                      min="0"
                                      value={mat.unitPrice ?? 0}
                                      onChange={e => {
                                        const val = Number(e.target.value);
                                        setConnectionMaterials(prev => prev.map((m, i) => i === idx ? { ...m, unitPrice: val } : m));
                                      }}
                                      className="w-16 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-center text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-500"
                                    />
                                  </td>
                                  <td className="p-2 text-center font-mono font-black text-amber-400 text-xs">
                                    {totalVal.toLocaleString()}
                                  </td>
                                  <td className="p-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => setConnectionMaterials(prev => prev.filter((_, i) => i !== idx))}
                                      className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                                      title="حذف الصنف"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Materials Totals & Smart Sync Bar */}
                      <div className="bg-slate-950 p-2.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 font-bold">إجمالي تكلفة المواد:</span>
                          <span className="text-sm font-black font-mono text-amber-400">
                            {connectionMaterials.reduce((acc, m) => acc + (Number(m.quantity || 0) * Number(m.unitPrice || 0)), 0).toLocaleString()} {settings.currency}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const matsTotal = connectionMaterials.reduce((acc, m) => acc + (Number(m.quantity || 0) * Number(m.unitPrice || 0)), 0);
                            setNewConnection(prev => {
                              const connFee = Number(prev.connectionFee || 0);
                              const mCost = Number(prev.meterCost || 0);
                              const ins = Number(prev.insuranceDeposit || 0);
                              const lab = Number(prev.installationLaborFee || 0);
                              const oth = Number(prev.otherFees || 0);
                              const newTot = connFee + mCost + ins + lab + matsTotal + oth;
                              return {
                                ...prev,
                                materialsFee: matsTotal,
                                totalFee: newTot,
                                paidAmount: prev.paidAmount && prev.paidAmount > 0 ? prev.paidAmount : newTot
                              };
                            });
                          }}
                          className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          مزامنة وتحديث حقل (قيمة المواد) في الرسوم أعلاه
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-900/50 border border-dashed border-slate-800 rounded-xl text-center text-slate-500 text-xs">
                      لم يتم إضافة أي مواد بعد. اختر من المستودع أو أضف صنفاً أو استخدم أحد الأطقم الجاهزة أعلاه.
                    </div>
                  )}

                  {/* Warehouse Deduction Option */}
                  <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="deduct-materials-add-checkbox"
                      checked={deductMaterialsFromStore}
                      onChange={e => setDeductMaterialsFromStore(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900 cursor-pointer"
                    />
                    <label htmlFor="deduct-materials-add-checkbox" className="text-xs text-slate-300 font-bold cursor-pointer select-none">
                      <span>خصم المواد المحددة تلقائياً من رصيد المستودع (إصدار سند صرف مخزني آلي)</span>
                      <span className="block text-[10px] text-slate-500 font-normal mt-0.5">
                        عند تفعيل هذا الخيار، سيتم خصم الكميات من المخزن المركزي وتوثيق حركة صرف صادرة برقم سند إدخال الخدمة.
                      </span>
                    </label>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">ملاحظات فنية أو إدارية إضافية</label>
                    <textarea
                      value={newConnection.notes || ''}
                      onChange={e => setNewConnection({ ...newConnection, notes: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 resize-none min-h-[40px] font-bold"
                      placeholder="ملاحظات فنية، تفاصيل الموقع، حالة الشبكة..."
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddConnection(false)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>اعتماد وتسجيل إدخال الخدمة</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6.B. EDIT CONNECTION MODAL (تعديل بيانات طلب إدخال الخدمة) */}
      <AnimatePresence>
        {editingConnection && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/85 backdrop-blur-md"
              onClick={() => setEditingConnection(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right my-8 max-h-[92vh] flex flex-col"
            >
              <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
                <button
                  type="button"
                  onClick={() => setEditingConnection(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-amber-500" />
                  تعديل سجل إدخال الخدمة ({editingConnection.voucherNo || editingConnection.id})
                </h3>
              </div>

              <form onSubmit={handleUpdateConnection} className="p-6 space-y-5 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">اسم المشترك *</label>
                    <input
                      type="text"
                      required
                      value={editingConnection.subscriberName || ''}
                      onChange={e => setEditingConnection({ ...editingConnection, subscriberName: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">الهاتف</label>
                    <input
                      type="text"
                      value={editingConnection.phone || ''}
                      onChange={e => setEditingConnection({ ...editingConnection, phone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">المنطقة / المربع</label>
                    <input
                      type="text"
                      value={editingConnection.zone || ''}
                      onChange={e => setEditingConnection({ ...editingConnection, zone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">نوع الخدمة</label>
                    <select
                      value={editingConnection.serviceType || 'new_connection'}
                      onChange={e => setEditingConnection({ ...editingConnection, serviceType: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                    >
                      <option value="new_connection">توصيل وعداد جديد</option>
                      <option value="phase_upgrade">ترقية 3-Phase</option>
                      <option value="relocation">نقل موقع عداد</option>
                      <option value="reconnect">إعادة إطلاق تيار</option>
                      <option value="meter_replacement">استبدال عداد</option>
                      <option value="maintenance">صيانة وتوسعة شبكة</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">رقم العداد</label>
                    <input
                      type="text"
                      value={editingConnection.meterNumber || ''}
                      onChange={e => setEditingConnection({ ...editingConnection, meterNumber: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">نوع التعرفة</label>
                    <select
                      value={editingConnection.tariffType || 'residential'}
                      onChange={e => setEditingConnection({ ...editingConnection, tariffType: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                    >
                      <option value="residential">منزلي</option>
                      <option value="commercial">تجاري</option>
                      <option value="industrial">صناعي</option>
                      <option value="agricultural">زراعي</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">التاريخ *</label>
                    <input
                      type="date"
                      required
                      value={editingConnection.date || ''}
                      onChange={e => setEditingConnection({ ...editingConnection, date: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                    />
                  </div>
                </div>

                {/* Financial breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">رسوم التوصيل</label>
                    <input
                      type="number"
                      min="0"
                      value={editingConnection.connectionFee ?? ''}
                      onChange={e => setEditingConnection({ ...editingConnection, connectionFee: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">ثمن العداد</label>
                    <input
                      type="number"
                      min="0"
                      value={editingConnection.meterCost ?? ''}
                      onChange={e => setEditingConnection({ ...editingConnection, meterCost: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-purple-400 mb-1">تأمين العداد المسترد</label>
                    <input
                      type="number"
                      min="0"
                      value={editingConnection.insuranceDeposit ?? ''}
                      onChange={e => setEditingConnection({ ...editingConnection, insuranceDeposit: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-white font-mono text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">أجور التركيب</label>
                    <input
                      type="number"
                      min="0"
                      value={editingConnection.installationLaborFee ?? ''}
                      onChange={e => setEditingConnection({ ...editingConnection, installationLaborFee: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-amber-400 mb-1">إجمالي الرسوم *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editingConnection.totalFee ?? ''}
                      onChange={e => setEditingConnection({ ...editingConnection, totalFee: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-400 mb-1">المبلغ المقبوض *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editingConnection.paidAmount ?? ''}
                      onChange={e => setEditingConnection({ ...editingConnection, paidAmount: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-emerald-500/50 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold text-right"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">الفني المسؤول عن التركيب</label>
                    <input
                      type="text"
                      list="technicians-list-edit"
                      value={editingConnection.assignedTechnician || ''}
                      onChange={e => setEditingConnection({ ...editingConnection, assignedTechnician: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold"
                    />
                    <datalist id="technicians-list-edit">
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.name} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">رقم السند</label>
                    <input
                      type="text"
                      value={editingConnection.voucherNo || ''}
                      onChange={e => setEditingConnection({ ...editingConnection, voucherNo: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono text-right"
                    />
                  </div>
                </div>

                {/* Materials Management Section in Edit Modal */}
                <div className="space-y-3 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80">
                  <div className="flex flex-wrap items-center justify-between border-b border-slate-800/60 pb-2 gap-2">
                    <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                      <Boxes className="w-3.5 h-3.5" />
                      المواد والتجهيزات المصروفة
                    </span>
                    {editConnectionMaterials.length > 0 && (
                      <span className="text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                        {editConnectionMaterials.length} أصناف | {editConnectionMaterials.reduce((acc, m) => acc + (Number(m.quantity || 0) * Number(m.unitPrice || 0)), 0).toLocaleString()} {settings.currency}
                      </span>
                    )}
                  </div>

                  {/* Add from store or custom */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                    <div className="sm:col-span-8">
                      <select
                        value={selectedStoreItemId}
                        onChange={e => setSelectedStoreItemId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                      >
                        <option value="">-- اختر من أصناف المستودع --</option>
                        {inventory.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.name} | المتوفر: {item.quantity} {item.unit} | السعر: {(item.unitPrice || item.costPrice || 0).toLocaleString()} {settings.currency}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-4">
                      <button
                        type="button"
                        disabled={!selectedStoreItemId}
                        onClick={() => {
                          const found = inventory.find(i => i.id === selectedStoreItemId);
                          if (found) {
                            setEditConnectionMaterials(prev => [
                              ...prev,
                              {
                                id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                                itemId: found.id,
                                name: found.name,
                                quantity: 1,
                                unit: found.unit || 'حبة',
                                unitPrice: found.unitPrice || found.costPrice || 0,
                                notes: `صرف من المستودع`
                              }
                            ]);
                            setSelectedStoreItemId('');
                          }
                        }}
                        className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black py-1.5 px-2.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        إضافة من المستودع
                      </button>
                    </div>
                  </div>

                  {/* Materials Table in Edit Modal */}
                  {editConnectionMaterials.length > 0 ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
                      <div className="overflow-x-auto max-h-48">
                        <table className="w-full text-xs text-right">
                          <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-bold sticky top-0">
                            <tr>
                              <th className="p-1.5">#</th>
                              <th className="p-1.5">الصنف</th>
                              <th className="p-1.5 text-center">الكمية</th>
                              <th className="p-1.5 text-center">الوحدة</th>
                              <th className="p-1.5 text-center">السعر</th>
                              <th className="p-1.5 text-center">الإجمالي</th>
                              <th className="p-1.5 text-center">حذف</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 text-slate-200">
                            {editConnectionMaterials.map((mat, idx) => {
                              const totalVal = (Number(mat.quantity || 0)) * (Number(mat.unitPrice || 0));
                              return (
                                <tr key={mat.id || idx} className="hover:bg-slate-800/50">
                                  <td className="p-1.5 font-mono text-slate-500">{idx + 1}</td>
                                  <td className="p-1.5 font-bold text-white text-xs">{mat.name}</td>
                                  <td className="p-1.5 text-center">
                                    <input
                                      type="number"
                                      min="0.1"
                                      step="any"
                                      value={mat.quantity}
                                      onChange={e => {
                                        const val = Number(e.target.value);
                                        setEditConnectionMaterials(prev => prev.map((m, i) => i === idx ? { ...m, quantity: val } : m));
                                      }}
                                      className="w-14 bg-slate-950 border border-slate-800 rounded px-1 text-center text-xs font-mono font-bold text-white"
                                    />
                                  </td>
                                  <td className="p-1.5 text-center text-slate-400 text-xs">{mat.unit}</td>
                                  <td className="p-1.5 text-center">
                                    <input
                                      type="number"
                                      min="0"
                                      value={mat.unitPrice ?? 0}
                                      onChange={e => {
                                        const val = Number(e.target.value);
                                        setEditConnectionMaterials(prev => prev.map((m, i) => i === idx ? { ...m, unitPrice: val } : m));
                                      }}
                                      className="w-16 bg-slate-950 border border-slate-800 rounded px-1 text-center text-xs font-mono text-amber-300"
                                    />
                                  </td>
                                  <td className="p-1.5 text-center font-mono font-black text-amber-400 text-xs">
                                    {totalVal.toLocaleString()}
                                  </td>
                                  <td className="p-1.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => setEditConnectionMaterials(prev => prev.filter((_, i) => i !== idx))}
                                      className="p-1 text-slate-500 hover:text-rose-400 rounded"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="bg-slate-950 p-2 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-bold">
                          المجموع: {editConnectionMaterials.reduce((acc, m) => acc + (Number(m.quantity || 0) * Number(m.unitPrice || 0)), 0).toLocaleString()} {settings.currency}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const matsTotal = editConnectionMaterials.reduce((acc, m) => acc + (Number(m.quantity || 0) * Number(m.unitPrice || 0)), 0);
                            setEditingConnection(prev => {
                              if (!prev) return prev;
                              const cFee = Number(prev.connectionFee || 0);
                              const mCost = Number(prev.meterCost || 0);
                              const ins = Number(prev.insuranceDeposit || 0);
                              const lab = Number(prev.installationLaborFee || 0);
                              const oth = Number(prev.otherFees || 0);
                              const newTot = cFee + mCost + ins + lab + matsTotal + oth;
                              return {
                                ...prev,
                                materialsFee: matsTotal,
                                totalFee: newTot
                              };
                            });
                          }}
                          className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/30 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          تحديث قيمة المواد في الرسوم
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-slate-900 border border-dashed border-slate-800 rounded-lg text-center text-slate-500 text-xs">
                      لا توجد مواد مضافة في هذه المعاملة
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">ملاحظات</label>
                  <input
                    type="text"
                    value={editingConnection.notes || ''}
                    onChange={e => setEditingConnection({ ...editingConnection, notes: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingConnection(null)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all cursor-pointer"
                  >
                    حفظ التعديلات
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6.C. SETTLE BALANCE MODAL (تحصيل وتصفية المبلغ المتبقي) */}
      <AnimatePresence>
        {settlingConnection && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/85 backdrop-blur-md"
              onClick={() => setSettlingConnection(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right my-8"
            >
              <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
                <button
                  type="button"
                  onClick={() => setSettlingConnection(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Coins className="w-5 h-5 text-emerald-400" />
                  تحصيل دفعة من رسوم إدخال الخدمة
                </h3>
              </div>

              <form onSubmit={handleSettleConnection} className="p-6 space-y-4">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>المشترك:</span>
                    <span className="font-bold text-white text-sm">{settlingConnection.subscriberName}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>رقم السند:</span>
                    <span className="font-mono text-amber-400 font-bold">{settlingConnection.voucherNo || settlingConnection.id}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400 pt-2 border-t border-slate-800">
                    <span>إجمالي الرسوم:</span>
                    <span className="font-mono font-bold text-slate-200">{settlingConnection.totalFee.toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>المدفوع سابقاً:</span>
                    <span className="font-mono font-bold text-emerald-400">{settlingConnection.paidAmount.toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400 bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
                    <span className="font-bold text-rose-400">المبلغ المتبقي حالياً:</span>
                    <span className="font-mono font-black text-rose-400 text-sm">
                      {Math.max(0, settlingConnection.totalFee - settlingConnection.paidAmount).toLocaleString()} {settings.currency}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-slate-300">مبلغ الدفعة المحصلة الآن ({settings.currency}) *</label>
                    <button
                      type="button"
                      onClick={() => setSettlePaymentAmount(Math.max(0, settlingConnection.totalFee - settlingConnection.paidAmount))}
                      className="text-[10px] text-emerald-400 hover:underline font-bold"
                    >
                      سداد كامل المتبقي
                    </button>
                  </div>
                  <input
                    type="number"
                    required
                    min="1"
                    max={Math.max(0, settlingConnection.totalFee - settlingConnection.paidAmount)}
                    value={settlePaymentAmount}
                    onChange={e => setSettlePaymentAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-emerald-500/40 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-400 font-mono font-black text-right"
                    placeholder="أدخل المبلغ المقبوض..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">طريقة القبض</label>
                    <select
                      value={settlePaymentMethod}
                      onChange={e => setSettlePaymentMethod(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                    >
                      <option value="cash">نقداً بالصندوق الرئيسي</option>
                      <option value="bank_transfer">تحويل بنكي / محفظة</option>
                    </select>
                  </div>

                  {settlePaymentMethod === 'bank_transfer' && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">الحساب البنكي</label>
                      <select
                        value={settleBankAccountId}
                        onChange={e => setSettleBankAccountId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold"
                      >
                        <option value="">اختر الحساب</option>
                        {(settings.bankAccounts || []).map(b => (
                          <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">بيان وملاحظات التحصيل</label>
                  <input
                    type="text"
                    value={settleNotes}
                    onChange={e => setSettleNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold"
                    placeholder="مثال: سداد الدفعة الثانية نقداً..."
                  />
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSettlingConnection(null)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>تأكيد تسجيل القبض</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6.D. OFFICIAL PRINTABLE CONNECTION RECEIPT MODAL (سند قبض ورسوم إدخال وتوصيل خدمة رسمي) */}
      <AnimatePresence>
        {selectedConnectionForReceipt && (() => {
          const c = selectedConnectionForReceipt;
          const rem = c.remainingAmount !== undefined ? c.remainingAmount : Math.max(0, c.totalFee - c.paidAmount);
          const serviceTypeLabels: Record<string, string> = {
            new_connection: 'توصيل وعداد جديد',
            phase_upgrade: 'ترقية 3-Phase',
            relocation: 'نقل موقع عداد',
            reconnect: 'إعادة إطلاق تيار',
            meter_replacement: 'استبدال عداد',
            maintenance: 'صيانة وتوسعة شبكة'
          };

          return (
            <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 overflow-y-auto bg-slate-950/85 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-white text-slate-900 rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 text-right my-8 max-h-[94vh] overflow-y-auto print:p-0 print:m-0 print:shadow-none print:max-h-none"
              >
                {/* TOP BAR / ACTIONS */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-4 print:hidden">
                  <button
                    onClick={() => setSelectedConnectionForReceipt(null)}
                    className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => safePrint()}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer"
                    >
                      <Printer className="w-4 h-4 text-amber-400" />
                      <span>طباعة السند الرسمي</span>
                    </button>
                  </div>
                </div>

                {/* VOUCHER HEADER */}
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                  <div className="text-right">
                    <h2 className="text-lg font-black text-slate-900">{settings.stationName || 'محطة توليد الكهرباء'}</h2>
                    <p className="text-xs text-slate-600 font-bold">{settings.companyName || 'منظومة إدارة الطاقة والفوترة الذكية'}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-slate-500 font-mono">
                      {settings.phone && <span>هاتف: {settings.phone}</span>}
                      {settings.address && <span>| {settings.address}</span>}
                      {settings.taxNumber && <span>| الرقم الضريبي: {settings.taxNumber}</span>}
                    </div>
                  </div>

                  <div className="text-center bg-slate-100 p-3 rounded-2xl border border-slate-200 min-w-[140px]">
                    <span className="text-[10px] font-bold text-slate-500 block">رقم السند</span>
                    <span className="text-sm font-black font-mono text-amber-600 block">{c.voucherNo || `CON-${c.id.slice(-6)}`}</span>
                    <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{c.date}</span>
                  </div>
                </div>

                {/* TITLE */}
                <div className="text-center py-1 bg-amber-50 border border-amber-200 rounded-xl">
                  <h3 className="text-sm font-black text-amber-900">
                    سند قبض ورسوم إدخال وتوصيل خدمة كهرباء
                  </h3>
                  <span className="text-[11px] text-amber-700 font-bold">
                    نوع الخدمة: {serviceTypeLabels[c.serviceType || 'new_connection'] || c.serviceType}
                  </span>
                </div>

                {/* SUBSCRIBER INFO GRID */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">اسم المشترك:</span>
                    <span className="font-black text-slate-900">{c.subscriberName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">رقم الهاتف:</span>
                    <span className="font-mono font-bold text-slate-900">{c.phone || 'غير مسجل'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">المنطقة / المربع:</span>
                    <span className="font-bold text-slate-900">{c.zone || 'الرئيسية'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">رقم العداد المركب:</span>
                    <span className="font-mono font-black text-amber-700">{c.meterNumber || 'قيد التركيب'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">نوع التعرفة:</span>
                    <span className="font-bold text-slate-900">
                      {c.tariffType === 'residential' ? 'منزلي' : c.tariffType === 'commercial' ? 'تجاري' : c.tariffType === 'industrial' ? 'صناعي' : 'زراعي'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">الفني المنفذ:</span>
                    <span className="font-bold text-slate-900">{c.assignedTechnician || 'فريق التركيبات الميداني'}</span>
                  </div>
                </div>

                {/* FINANCIAL ITEMS TABLE */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-right">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">م</th>
                        <th className="p-2.5">بيان الرسم / البند المالي</th>
                        <th className="p-2.5 text-center">المبلغ ({settings.currency})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="p-2.5 font-mono text-slate-400">1</td>
                        <td className="p-2.5 font-bold text-slate-800">رسوم إدخال الخدمة والاشتراك بالشبكة</td>
                        <td className="p-2.5 text-center font-mono font-bold text-slate-900">{(c.connectionFee || 0).toLocaleString()}</td>
                      </tr>
                      {Boolean(c.meterCost && c.meterCost > 0) && (
                        <tr>
                          <td className="p-2.5 font-mono text-slate-400">2</td>
                          <td className="p-2.5 font-bold text-slate-800">قيمة العداد الكهربائي والتجهيزات</td>
                          <td className="p-2.5 text-center font-mono font-bold text-slate-900">{c.meterCost.toLocaleString()}</td>
                        </tr>
                      )}
                      {Boolean(c.insuranceDeposit && c.insuranceDeposit > 0) && (
                        <tr>
                          <td className="p-2.5 font-mono text-slate-400">3</td>
                          <td className="p-2.5 font-bold text-purple-800">مبلغ تأمين العداد المسترد (أمانات)</td>
                          <td className="p-2.5 text-center font-mono font-bold text-purple-800">{c.insuranceDeposit.toLocaleString()}</td>
                        </tr>
                      )}
                      {Boolean(c.installationLaborFee && c.installationLaborFee > 0) && (
                        <tr>
                          <td className="p-2.5 font-mono text-slate-400">4</td>
                          <td className="p-2.5 font-bold text-slate-800">أجور التركيب واليد الفنية</td>
                          <td className="p-2.5 text-center font-mono font-bold text-slate-900">{c.installationLaborFee.toLocaleString()}</td>
                        </tr>
                      )}
                      {Boolean(c.materialsFee && c.materialsFee > 0) && (
                        <tr>
                          <td className="p-2.5 font-mono text-slate-400">5</td>
                          <td className="p-2.5 font-bold text-slate-800">قيمة المواد والكابلات الإضافية</td>
                          <td className="p-2.5 text-center font-mono font-bold text-slate-900">{c.materialsFee.toLocaleString()}</td>
                        </tr>
                      )}
                      {Boolean(c.otherFees && c.otherFees > 0) && (
                        <tr>
                          <td className="p-2.5 font-mono text-slate-400">6</td>
                          <td className="p-2.5 font-bold text-slate-800">رسوم أخرى / غرامات</td>
                          <td className="p-2.5 text-center font-mono font-bold text-slate-900">{c.otherFees.toLocaleString()}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* TOTALS & TAFQEET */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center">
                  <div className="bg-slate-100 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-bold">إجمالي الرسوم</span>
                    <span className="text-base font-black font-mono text-slate-900">{c.totalFee.toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-emerald-700 block font-bold">المبلغ المقبوض</span>
                    <span className="text-base font-black font-mono text-emerald-700">{c.paidAmount.toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className={`p-3 rounded-xl border ${rem > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                    <span className="text-[10px] text-slate-500 block font-bold">المبلغ المتبقي</span>
                    <span className={`text-base font-black font-mono ${rem > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                      {rem.toLocaleString()} {settings.currency}
                    </span>
                  </div>
                </div>

                {/* Tafqeet in Arabic */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                  <span className="text-slate-500">المبلغ المقبوض كتابةً: </span>
                  <span className="font-bold text-slate-900">
                    {tafqeetArabic(c.paidAmount, settings.currency)}
                  </span>
                  <div className="mt-1 text-[11px] text-slate-500">
                    طريقة الدفع: <span className="font-bold text-slate-800">{c.paymentMethod === 'bank_transfer' ? 'تحويل بنكي / محفظة' : 'نقداً في الصندوق الرئيسي'}</span>
                  </div>
                </div>

                {/* Materials Used if any */}
                {c.materialsList && c.materialsList.length > 0 ? (
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-right">
                    <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-amber-600" />
                        كشف المواد والتجهيزات المصروفة لعملية الربط
                      </span>
                      {c.deductMaterialsFromInventory && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                          ✓ تم صرف وخصم المواد من المستودع
                        </span>
                      )}
                    </div>
                    <table className="w-full text-xs text-right">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2 text-center w-8">#</th>
                          <th className="p-2">بيان الصنف / المادة</th>
                          <th className="p-2 text-center">الكمية</th>
                          <th className="p-2 text-center">الوحدة</th>
                          <th className="p-2 text-center">سعر الوحدة</th>
                          <th className="p-2 text-center">الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {c.materialsList.map((mat, idx) => (
                          <tr key={mat.id || idx}>
                            <td className="p-2 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-2 font-bold text-slate-800">
                              {mat.name}
                              {mat.notes && <span className="text-[10px] text-slate-500 mr-1.5 font-normal">({mat.notes})</span>}
                            </td>
                            <td className="p-2 text-center font-mono font-bold text-slate-900">{mat.quantity}</td>
                            <td className="p-2 text-center text-slate-600">{mat.unit}</td>
                            <td className="p-2 text-center font-mono text-slate-700">{(mat.unitPrice || 0).toLocaleString()}</td>
                            <td className="p-2 text-center font-mono font-black text-amber-900">{((mat.quantity || 0) * (mat.unitPrice || 0)).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : c.materialsUsed ? (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                    <span className="text-slate-500 block mb-0.5">المواد والتجهيزات المصروفة:</span>
                    <span className="font-bold text-slate-800">{c.materialsUsed}</span>
                  </div>
                ) : null}

                {/* SIGNATURES */}
                <div className="pt-6 border-t-2 border-slate-200 grid grid-cols-3 gap-4 text-center text-xs">
                  <div>
                    <span className="block text-slate-500 mb-6 font-bold">توقيع المستلم / المشترك:</span>
                    <span className="border-t border-slate-400 pt-1 block w-28 mx-auto font-bold text-slate-700">........................</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 mb-6 font-bold">توقيع الفني المنفذ:</span>
                    <span className="border-t border-slate-400 pt-1 block w-28 mx-auto font-bold text-slate-700">........................</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 mb-6 font-bold">أمين الصندوق / المحاسب:</span>
                    <span className="border-t border-slate-400 pt-1 block w-28 mx-auto font-bold text-slate-900">{c.recordedBy || currentUser.name || 'المحاسب المالي'}</span>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* 7. ADD EMPLOYEE TRANSACTION MODAL */}
      <AnimatePresence>
        {showAddEmployeeTx && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setShowAddEmployeeTx(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <button
                  onClick={() => setShowAddEmployeeTx(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-500" />
                  إضافة حركة موظف (راتب / سلفة / بدل)
                </h3>
              </div>

              <form onSubmit={handleAddEmployeeTx} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">الموظف</label>
                    <select
                      value={newEmployeeTx.employeeName}
                      onChange={e => setNewEmployeeTx({...newEmployeeTx, employeeName: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                    >
                      <option value="">اختر الموظف...</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.name}>{emp.name} ({emp.role})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">نوع الحركة</label>
                    <select
                      value={newEmployeeTx.type}
                      onChange={e => setNewEmployeeTx({...newEmployeeTx, type: e.target.value as any})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                    >
                      <option value="salary">صرف راتب شهري</option>
                      <option value="advance">صرف سلفة مالية</option>
                      <option value="allowance">صرف بدل / مكافأة</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">المبلغ ({settings.currency})</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newEmployeeTx.amount ?? ''}
                      onChange={e => setNewEmployeeTx({...newEmployeeTx, amount: Number(e.target.value)})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 text-right font-mono font-bold"
                      placeholder="المبلغ"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">التاريخ</label>
                    <input
                      type="date"
                      required
                      value={newEmployeeTx.date ?? ''}
                      onChange={e => setNewEmployeeTx({...newEmployeeTx, date: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 text-right font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">البيان والسبب</label>
                  <textarea
                    value={newEmployeeTx.description ?? ''}
                    onChange={e => setNewEmployeeTx({...newEmployeeTx, description: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 text-right resize-none min-h-[70px] font-bold"
                    placeholder="مثال: راتب شهر أكتوبر / سلفة طارئة..."
                  />
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddEmployeeTx(false)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors"
                  >
                    اعتماد الصرف
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. HANDOVER / SETTLEMENT MODAL (سند استلام وتوريد عهدة المحصل) */}
      <AnimatePresence>
        {handoverTarget && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setHandoverTarget(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950">
                <button
                  onClick={() => setHandoverTarget(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5 text-amber-500" />
                  سند تسليم وتوريد صندوق المحصل
                </h3>
              </div>

              <form onSubmit={handleConfirmHandover} className="p-6 space-y-4">
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs text-amber-400 font-bold block">المحصل المسلّم:</span>
                    <span className="text-base font-black text-white">{handoverTarget.collectorName}</span>
                  </div>
                  <div className="text-left">
                    <span className="text-xs text-amber-400 font-bold block">العهد المالية المستحقة:</span>
                    <span className="text-lg font-black text-amber-400 font-mono">
                      {handoverTarget.pendingAmount.toLocaleString()} {settings.currency}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-400">المبلغ المراد توريده وتسليمه ({settings.currency})</label>
                    {handoverTarget.pendingAmount > 0 && (
                      <button
                        type="button"
                        onClick={() => setHandoverForm({ ...handoverForm, amount: handoverTarget.pendingAmount })}
                        className="text-[11px] font-black text-amber-400 hover:text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/20 cursor-pointer"
                      >
                        كامل العهدة ({handoverTarget.pendingAmount.toLocaleString()})
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    required
                    min="1"
                    max={handoverTarget.pendingAmount > 0 ? handoverTarget.pendingAmount : undefined}
                    value={handoverForm.amount || ''}
                    onChange={e => setHandoverForm({...handoverForm, amount: Number(e.target.value)})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-lg text-amber-400 font-mono font-black focus:outline-none focus:border-amber-500 text-right"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">جهة الاستلام (إلى صندوق)</label>
                    <select
                      value={handoverForm.toAccount}
                      onChange={e => setHandoverForm({...handoverForm, toAccount: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
                    >
                      {availableAccounts.filter(acc => !acc.startsWith('صندوق المحصل') && !acc.startsWith('عهدة')).map(acc => (
                        <option key={acc} value={acc}>{acc}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-2">المستلم المباشر</label>
                    <input
                      type="text"
                      required
                      value={handoverForm.receiverName}
                      onChange={e => setHandoverForm({...handoverForm, receiverName: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-xs text-white font-bold focus:outline-none focus:border-amber-500 text-right"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">البيان والملاحظات</label>
                  <textarea
                    value={handoverForm.notes}
                    onChange={e => setHandoverForm({...handoverForm, notes: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-500 text-right resize-none min-h-[70px] font-bold"
                  />
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setHandoverTarget(null)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 transition-colors flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تأكيد واستلام التوريد</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. PRINTABLE TRANSFER VOUCHER MODAL */}
      <AnimatePresence>
        {printableTransferVoucher && (
          <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl bg-white text-slate-900 rounded-3xl p-8 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900">{settings.stationName || 'محطة الكهرباء التجارية'}</h2>
                  <p className="text-xs text-slate-600 font-bold mt-0.5">سند توريد وتسليم خزينة (Treasury Receipt Voucher)</p>
                </div>
                <div className="text-left font-mono">
                  <span className="text-sm font-black text-amber-600 block">{printableTransferVoucher.transferNumber}</span>
                  <span className="text-xs text-slate-500 font-bold">{printableTransferVoucher.date}</span>
                </div>
              </div>

              <div className="space-y-4 text-sm font-bold text-slate-800">
                <div className="bg-slate-100 p-4 rounded-2xl flex items-center justify-between border border-slate-200">
                  <span>المبلغ المورد:</span>
                  <span className="text-2xl font-black font-mono text-emerald-700">
                    {printableTransferVoucher.amount.toLocaleString()} {settings.currency}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="border border-slate-200 p-3 rounded-xl">
                    <span className="text-slate-500 block text-[10px]">سلمنا نحن (من حساب):</span>
                    <span className="font-black text-slate-900 text-sm">{printableTransferVoucher.fromAccount}</span>
                  </div>
                  <div className="border border-slate-200 p-3 rounded-xl">
                    <span className="text-slate-500 block text-[10px]">استلمنا نحن (إلى حساب):</span>
                    <span className="font-black text-slate-900 text-sm">{printableTransferVoucher.toAccount}</span>
                  </div>
                </div>

                <div className="border border-slate-200 p-3 rounded-xl text-xs">
                  <span className="text-slate-500 block text-[10px]">وذلك مقابل / البيان:</span>
                  <p className="text-slate-800 font-bold mt-1">{printableTransferVoucher.notes}</p>
                </div>

                <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
                  <div>
                    <span className="block text-slate-500 mb-8">توقيع المـسلم (المحصل):</span>
                    <span className="font-black border-t border-slate-400 pt-1 block w-32 mx-auto">..........................</span>
                  </div>
                  <div>
                    <span className="block text-slate-500 mb-8">توقيع المستلم (أمين الخزينة):</span>
                    <span className="font-black border-t border-slate-400 pt-1 block w-32 mx-auto">{printableTransferVoucher.recordedBy || 'مدير النظام'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 print:hidden">
                <button
                  onClick={() => setPrintableTransferVoucher(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  إغلاق
                </button>
                <button
                  onClick={() => safePrint()}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-2 active:scale-95 transition-all"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>طباعة السند</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 9. CLOSE ACCOUNTING PERIOD MODAL (نافذة إغلاق وترحيل الشهر المالي) */}
      <AnimatePresence>
        {showClosePeriodModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setShowClosePeriodModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                <button
                  onClick={() => setShowClosePeriodModal(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="font-black text-white text-base flex items-center gap-2">
                  <Lock className="w-5 h-5 text-amber-500" />
                  <span>إغلاق وترحيل الفترة المالية رسمياً</span>
                </h3>
              </div>

              {(() => {
                const targetFin = calculateMonthFinancials(periodToClose);
                const isAlreadyClosed = isMonthClosed(periodToClose);

                return (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleCloseAccountingPeriod(periodToClose, closingNotes);
                    }}
                    className="p-6 space-y-5"
                  >
                    {/* Month selector & warning */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-300 block">حدد الشهر المالي المراد إغلاقه وترحيله:</label>
                      <select
                        value={periodToClose}
                        onChange={(e) => setPeriodToClose(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm font-mono font-bold text-amber-400 outline-none focus:border-amber-500"
                      >
                        {allHistoricalMonths.map(m => (
                          <option key={m} value={m}>
                            {m} - {formatMonthLabel(m)} {isMonthClosed(m) ? '🔒 (مقفل بالفعل)' : '🟢 (مفتوح)'}
                          </option>
                        ))}
                      </select>
                    </div>

                    {isAlreadyClosed && (
                      <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-2.5 text-rose-400 text-xs font-bold">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <span>تنبيه: هذا الشهر مقفل ومرحل بالفعل. سيؤدي المتابعة إلى إعادة قفل الحسابات وتحديث الإجماليات الختامية.</span>
                      </div>
                    )}

                    {/* Calculated Summary Card */}
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <div className="text-xs font-bold text-slate-400 flex items-center justify-between border-b border-slate-800 pb-2">
                        <span>الإجماليات المحاسبية المحسوبة لشهر ({periodToClose}):</span>
                        <span className="font-mono text-amber-400 font-black">{formatMonthLabel(periodToClose)}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800/80">
                          <span className="text-slate-400 block text-[11px]">إجمالي الإيرادات المحصلة:</span>
                          <span className="text-emerald-400 font-mono font-black text-sm">
                            {targetFin.totalRevenues.toLocaleString()} {settings.currency}
                          </span>
                        </div>

                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800/80">
                          <span className="text-slate-400 block text-[11px]">إجمالي المصروفات والتكاليف:</span>
                          <span className="text-rose-400 font-mono font-black text-sm">
                            {targetFin.totalExpenses.toLocaleString()} {settings.currency}
                          </span>
                        </div>

                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800/80">
                          <span className="text-slate-400 block text-[11px]">صافي الربح المحقق:</span>
                          <span className={`font-mono font-black text-sm ${targetFin.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {targetFin.netProfit.toLocaleString()} {settings.currency}
                          </span>
                        </div>

                        <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800/80">
                          <span className="text-slate-400 block text-[11px]">العمليات المشمولة:</span>
                          <span className="text-sky-400 font-mono font-black text-sm">
                            {targetFin.readingsCount} فواتير / {targetFin.paymentsCount} سندات
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Closing Notes */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 block">ملاحظات المحاسب القانوني / الإدارة عند الإغلاق:</label>
                      <textarea
                        value={closingNotes}
                        onChange={(e) => setClosingNotes(e.target.value)}
                        placeholder="مثال: تم تدقيق ومطابقة الصناديق وحسابات الموردين وإقفال الشهر المالي بنجاح..."
                        rows={2}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder:text-slate-600 outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* Terms & Certification checkbox */}
                    <div className="bg-amber-500/5 border border-amber-500/20 p-3.5 rounded-2xl">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          required
                          className="mt-0.5 w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-950 border-slate-700"
                        />
                        <span className="text-xs text-slate-300 font-bold leading-relaxed">
                          أقر بصفتي المحاسب المعتمد بصحة ومطابقة القيود المحاسبية، وأوافق على قفل فواتير وسندات هذا الشهر ومنع التعديل أو الحذف المباشر عليها وترحيلها نهائياً.
                        </span>
                      </label>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowClosePeriodModal(false)}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2.5 rounded-xl text-xs font-black bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                      >
                        <Lock className="w-4 h-4" />
                        <span>تأكيد إغلاق وترحيل الشهر 🔒</span>
                      </button>
                    </div>
                  </form>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 10. REOPEN CLOSED PERIOD MODAL (إعادة فتح فترة مقفلة) */}
      <AnimatePresence>
        {reopenPeriodMonth && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setReopenPeriodMonth(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                <button
                  onClick={() => setReopenPeriodMonth(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="font-black text-rose-400 text-base flex items-center gap-2">
                  <Unlock className="w-5 h-5" />
                  <span>إلغاء إغلاق وإعادة فتح الفترة المالية</span>
                </h3>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (reopenPeriodMonth) {
                    handleReopenAccountingPeriod(reopenPeriodMonth, reopenReason);
                  }
                }}
                className="p-6 space-y-4"
              >
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 space-y-1 font-bold leading-relaxed">
                  <p>⚠️ تحذير: إعادة فتح شهر مالي مقفل ومرحل ({reopenPeriodMonth}) يسمح بالتعديل والحذف المباشر في العمليات السابقة.</p>
                  <p>سيتم تسجيل هذا الإجراء في سجل التدقيق الأمني (Audit Log) للمراجعة الرقابية.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">سبب إعادة فتح الفترة المالية (إلزامي للتوثيق):</label>
                  <textarea
                    value={reopenReason}
                    onChange={(e) => setReopenReason(e.target.value)}
                    required
                    placeholder="اكتب المبرر الرقابي والمحاسبي لفتح الفترة..."
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder:text-slate-600 outline-none focus:border-rose-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setReopenPeriodMonth(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-xs font-black bg-rose-600 text-white hover:bg-rose-500 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>تأكيد إعادة فتح الفترة 🔓</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 11. REVERSE ENTRY MODAL (نافذة إنشاء قيد تسوية عكسي للمعاملات المقفلة) */}
      <AnimatePresence>
        {reversingEntry && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setReversingEntry(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-right"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                <button
                  onClick={() => setReversingEntry(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="font-black text-white text-base flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-amber-500" />
                  <span>إنشاء قيد تسوية عكسي (Reverse Entry)</span>
                </h3>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (reversingEntry) {
                    handleExecuteReverseEntry(reversingEntry, reversalReason, reversalDate);
                  }
                }}
                className="p-6 space-y-4"
              >
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-2 text-xs">
                  <div className="text-slate-400 font-bold border-b border-slate-800 pb-1.5 flex justify-between">
                    <span>بيانات القيد الأصلي المقفل:</span>
                    <span className="font-mono text-amber-400 font-black">{reversingEntry.voucherNumber}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-300 font-bold">
                    <div>التاريخ: <span className="font-mono text-slate-400">{reversingEntry.date}</span></div>
                    <div>المبلغ: <span className="font-mono text-white">{reversingEntry.amount.toLocaleString()} {settings.currency}</span></div>
                    <div className="text-emerald-400">المدين: {reversingEntry.debitAccountName}</div>
                    <div className="text-rose-400">الدائن: {reversingEntry.creditAccountName}</div>
                  </div>
                </div>

                {/* Reverse Entry Preview */}
                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl space-y-2 text-xs">
                  <span className="font-bold text-amber-400 block">معاينة القيد العكسي الجديد (سيتم عكس أطراف القيد):</span>
                  <div className="grid grid-cols-2 gap-2 font-bold">
                    <div className="text-emerald-400">
                      <span className="text-slate-400 block text-[10px]">من حـ (المدين الجديد):</span>
                      <span>{reversingEntry.creditAccountName} ({reversingEntry.creditAccountCode})</span>
                    </div>
                    <div className="text-rose-400">
                      <span className="text-slate-400 block text-[10px]">إلى حـ (الدائن الجديد):</span>
                      <span>{reversingEntry.debitAccountName} ({reversingEntry.debitAccountCode})</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">تاريخ ترحيل القيد العكسي (في الفترة الحالية):</label>
                  <input
                    type="date"
                    value={reversalDate}
                    onChange={(e) => setReversalDate(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">سبب التسوية وعكس القيد:</label>
                  <textarea
                    value={reversalReason}
                    onChange={(e) => setReversalReason(e.target.value)}
                    required
                    placeholder="مثال: تصحيح خطأ إدخال سند قبض مكرر في الفترة المقفلة السابقة..."
                    rows={2}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder:text-slate-600 outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setReversingEntry(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl text-xs font-black bg-amber-500 text-slate-950 hover:bg-amber-400 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>ترحيل قيد التسوية العكسي ↩️</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 12. VIEW CLOSED PERIOD REPORT MODAL (بطاقة وتقرير إغلاق الفترة المالية للطباعة) */}
      <AnimatePresence>
        {viewingClosedPeriodReport && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm print:hidden"
              onClick={() => setViewingClosedPeriodReport(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white text-slate-900 rounded-3xl shadow-2xl p-8 overflow-hidden text-right print:p-0 print:shadow-none print:w-full print:max-w-none"
            >
              {/* Header */}
              <div className="border-b-2 border-slate-900 pb-5 mb-6 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-black text-slate-900">شهادة وتقرير إغلاق الفترة المالية</h2>
                  <p className="text-xs text-slate-600 font-bold mt-1">نظام المحاسبة الشامل - ترحيل الحسابات الختامية</p>
                </div>
                <div className="text-left font-mono text-xs font-bold text-slate-700">
                  <div className="text-base font-black text-amber-600">الشهر: {viewingClosedPeriodReport.month}</div>
                  <div>تاريخ الإغلاق: {new Date(viewingClosedPeriodReport.closedAt).toLocaleDateString('ar-SA')}</div>
                  <div>المسؤول: {viewingClosedPeriodReport.closedBy}</div>
                </div>
              </div>

              {/* Summary Metrics */}
              <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                <div className="border border-slate-300 p-4 rounded-2xl bg-slate-50">
                  <span className="text-xs text-slate-600 font-bold block mb-1">إجمالي الإيرادات</span>
                  <span className="text-lg font-black font-mono text-emerald-700">
                    {viewingClosedPeriodReport.totalRevenues.toLocaleString()} {settings.currency}
                  </span>
                </div>

                <div className="border border-slate-300 p-4 rounded-2xl bg-slate-50">
                  <span className="text-xs text-slate-600 font-bold block mb-1">إجمالي المصروفات</span>
                  <span className="text-lg font-black font-mono text-rose-700">
                    {viewingClosedPeriodReport.totalExpenses.toLocaleString()} {settings.currency}
                  </span>
                </div>

                <div className="border border-slate-300 p-4 rounded-2xl bg-slate-50">
                  <span className="text-xs text-slate-600 font-bold block mb-1">صافي الربح / الخسارة</span>
                  <span className={`text-lg font-black font-mono ${viewingClosedPeriodReport.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {viewingClosedPeriodReport.netProfit.toLocaleString()} {settings.currency}
                  </span>
                </div>
              </div>

              {/* Transactions breakdown */}
              <div className="border border-slate-200 rounded-2xl p-4 mb-6 bg-slate-50 text-xs font-bold space-y-2">
                <div className="text-slate-700 font-black border-b border-slate-200 pb-1">إحصائيات العمليات المقفلة:</div>
                <div className="flex justify-between text-slate-600">
                  <span>عدد فواتير وقراءات الكهرباء:</span>
                  <span className="font-mono text-slate-900">{viewingClosedPeriodReport.readingsCount} فاتورة</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>عدد سندات التحصيل والقبض:</span>
                  <span className="font-mono text-slate-900">{viewingClosedPeriodReport.paymentsCount} سند قبض</span>
                </div>
                {viewingClosedPeriodReport.notes && (
                  <div className="pt-2 border-t border-slate-200 text-slate-800">
                    <span className="text-slate-500 block text-[10px]">ملاحظات الإغلاق:</span>
                    <p className="mt-0.5">{viewingClosedPeriodReport.notes}</p>
                  </div>
                )}
              </div>

              {/* Legal Note & Signatures */}
              <div className="text-[11px] text-slate-500 leading-relaxed mb-8 border-t border-slate-200 pt-3">
                * تم إقفال وترحيل كافة القيود والحسابات الخاصة بالفترة أعلاه وفقاً للمعايير المحاسبية المعتمدة. لا يجوز تعديل أو حذف أي مستند مقفل إلا بموجب قيد تسوية عكسي مؤرخ في الفترة الحالية.
              </div>

              <div className="grid grid-cols-2 gap-8 text-center text-xs pt-4 border-t border-slate-300">
                <div>
                  <span className="block text-slate-600 mb-8 font-bold">المحاسب المسؤول:</span>
                  <span className="font-black border-t border-slate-400 pt-1 block w-36 mx-auto">{viewingClosedPeriodReport.closedBy}</span>
                </div>
                <div>
                  <span className="block text-slate-600 mb-8 font-bold">اعتماد الإدارة العامة:</span>
                  <span className="font-black border-t border-slate-400 pt-1 block w-36 mx-auto">..................................</span>
                </div>
              </div>

              {/* Print Actions */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200 print:hidden mt-6">
                <button
                  onClick={() => setViewingClosedPeriodReport(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  إغلاق
                </button>
                <button
                  onClick={() => safePrint()}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-2 active:scale-95 transition-all shadow-md"
                >
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>طباعة تقرير الإغلاق</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 13. BALANCE RECONCILIATION MODAL (مركز فحص ومطابقة الأرصدة) */}
      <BalanceReconciliationModal
        isOpen={showReconciliationModal}
        onClose={() => setShowReconciliationModal(false)}
        subscribers={subscribers}
        readings={readings}
        payments={payments}
        settings={settings}
        currentUser={currentUser}
        onUpdateSubscribers={(updated) => {
          if (onUpdateSubscribers) onUpdateSubscribers(updated);
        }}
        onAddAuditLog={(log) => {
          if (onAddAuditLog) onAddAuditLog(log);
        }}
      />
    </motion.div>
  );
};

export default AdminAccounting;
