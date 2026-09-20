import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, DollarSign, Activity, CreditCard, ShieldAlert, 
  Package, Users, FileText, FileSpreadsheet, Download, 
  Printer, ArrowUpRight, TrendingUp, Sparkles, SlidersHorizontal
} from 'lucide-react';
import { 
  Subscriber, MeterReading, Payment, SystemSettings, InventoryItem, 
  InventoryTransaction, Expense, Purchase, EmployeeTransaction, 
  ServiceConnection, Employee, User 
} from '../types';
import { ReportTabType, ReportFilterState } from './reports/types';
import { ReportHeaderControls } from './reports/ReportHeaderControls';
import { ExecutiveOverviewTab } from './reports/ExecutiveOverviewTab';
import { FinancialDeepDiveTab } from './reports/FinancialDeepDiveTab';
import { EnergyConsumptionTab } from './reports/EnergyConsumptionTab';
import { TechnicalLossTab } from './reports/TechnicalLossTab';
import { DebtAgingTab } from './reports/DebtAgingTab';
import { InventoryReportsTab } from './reports/InventoryReportsTab';
import { HRPayrollReportsTab } from './reports/HRPayrollReportsTab';
import { SubscribersStatementHub } from './statements/SubscribersStatementHub';
import { DueBalancesReportModal } from './DueBalancesReportModal';
import { exportToCSV } from '../utils/exportUtils';

interface AdminReportsProps {
  subscribers: Subscriber[];
  readings: MeterReading[];
  payments: Payment[];
  settings: SystemSettings;
  inventory?: InventoryItem[];
  inventoryTransactions?: InventoryTransaction[];
  expenses?: Expense[];
  purchases?: Purchase[];
  treasuryTransfers?: any[];
  employees?: Employee[];
  employeeTxs?: EmployeeTransaction[];
  connections?: ServiceConnection[];
  currentUser?: User;
  users?: User[];
  initialTab?: ReportTabType;
  initialSubscriberId?: string;
}

export const AdminReports: React.FC<AdminReportsProps> = ({
  subscribers = [],
  readings = [],
  payments = [],
  settings,
  inventory = [],
  inventoryTransactions = [],
  expenses = [],
  purchases = [],
  treasuryTransfers = [],
  employees = [],
  employeeTxs = [],
  connections = [],
  currentUser,
  users = [],
  initialTab = 'executive',
  initialSubscriberId
}) => {
  const [activeTab, setActiveTab] = useState<ReportTabType>(initialTab);
  const [selectedSubId, setSelectedSubId] = useState<string | undefined>(initialSubscriberId);
  const [showDueBalancesModal, setShowDueBalancesModal] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (initialSubscriberId) {
      setSelectedSubId(initialSubscriberId);
      setActiveTab('statements');
    }
  }, [initialSubscriberId]);

  // Global Report Filter State
  const [filters, setFilters] = useState<ReportFilterState>({
    datePreset: 'all',
    fromDate: '',
    toDate: '',
    zoneFilter: 'all',
    categoryFilter: 'all',
    collectorFilter: 'all',
    transformerFilter: 'all',
    searchQuery: ''
  });

  const handleUpdateFilters = (newFilters: Partial<ReportFilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Helper to get canonical collector name matching linked user/employee
  const getCanonicalCollectorName = (rawIdentifier: string | undefined): string => {
    if (!rawIdentifier) return 'غير محدد';
    const trimmed = rawIdentifier.trim();
    // 1. Direct Employee Name
    const empByName = employees.find(e => e.name.trim() === trimmed);
    if (empByName) return empByName.name;
    // 2. Direct Employee username/userId
    const empByAccount = employees.find(e => 
      (e.username && e.username.trim().toLowerCase() === trimmed.toLowerCase()) ||
      (e.userId && e.userId === trimmed)
    );
    if (empByAccount) return empByAccount.name;
    // 3. User linked to an employee
    const matchedUser = users.find(u => 
      u.username.trim().toLowerCase() === trimmed.toLowerCase() || 
      u.id === trimmed || 
      u.name.trim() === trimmed
    );
    if (matchedUser?.employeeName) return matchedUser.employeeName;
    if (matchedUser?.employeeId) {
      const linkedEmp = employees.find(e => e.id === matchedUser.employeeId);
      if (linkedEmp) return linkedEmp.name;
    }
    return trimmed;
  };

  // Deduplicated Collector List for Filter Dropdown
  const collectorsList = useMemo(() => {
    const list = new Set<string>();
    // Add collectors from employee list
    employees.filter(e => e.role === 'collector' || e.role === 'technician' || e.role === 'accountant' || e.role === 'admin').forEach(e => {
      list.add(e.name);
    });
    // Add collectors from users
    users.filter(u => u.role === 'collector').forEach(u => {
      list.add(getCanonicalCollectorName(u.username));
    });
    // Add collectors from payments
    payments.forEach(p => {
      const col = p.collectedBy || p.collectorName || p.receivedBy;
      if (col) {
        list.add(getCanonicalCollectorName(col));
      }
    });
    return Array.from(list).filter(Boolean);
  }, [payments, employees, users]);

  // Global Filtering Logic for Subscribers, Readings, Payments, Expenses
  const filteredSubscribers = useMemo(() => {
    return subscribers.filter(sub => {
      if (filters.zoneFilter !== 'all' && sub.zone !== filters.zoneFilter) return false;
      if (filters.categoryFilter !== 'all' && sub.category !== filters.categoryFilter) return false;
      if (filters.transformerFilter !== 'all' && sub.transformer !== filters.transformerFilter) return false;
      if (filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase();
        const matches = 
          (sub.name || '').toLowerCase().includes(q) ||
          (sub.meterNumber || '').toLowerCase().includes(q) ||
          (sub.phone || '').includes(q) ||
          (sub.zone || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [subscribers, filters.zoneFilter, filters.categoryFilter, filters.transformerFilter, filters.searchQuery]);

  const filteredSubscriberIds = useMemo(() => {
    return new Set(filteredSubscribers.map(s => s.id));
  }, [filteredSubscribers]);

  const filteredReadings = useMemo(() => {
    return readings.filter(r => {
      if (!filteredSubscriberIds.has(r.subscriberId)) return false;
      const readingDate = r.readingDate || r.billingMonth;
      if (filters.fromDate && readingDate < filters.fromDate) return false;
      if (filters.toDate && readingDate > filters.toDate) return false;
      return true;
    });
  }, [readings, filteredSubscriberIds, filters.fromDate, filters.toDate]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (!filteredSubscriberIds.has(p.subscriberId)) return false;
      if (filters.collectorFilter !== 'all') {
        const rawCol = p.collectedBy || p.collectorName || p.receivedBy;
        const canonical = getCanonicalCollectorName(rawCol);
        if (canonical !== filters.collectorFilter && rawCol !== filters.collectorFilter) {
          return false;
        }
      }
      if (filters.fromDate && p.paymentDate < filters.fromDate) return false;
      if (filters.toDate && p.paymentDate > filters.toDate) return false;
      return true;
    });
  }, [payments, filteredSubscriberIds, filters.collectorFilter, filters.fromDate, filters.toDate, employees, users]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (filters.fromDate && e.date < filters.fromDate) return false;
      if (filters.toDate && e.date > filters.toDate) return false;
      return true;
    });
  }, [expenses, filters.fromDate, filters.toDate]);

  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      if (filters.fromDate && p.date < filters.fromDate) return false;
      if (filters.toDate && p.date > filters.toDate) return false;
      return true;
    });
  }, [purchases, filters.fromDate, filters.toDate]);

  // Export Active Tab Data to CSV
  const handleExportActiveTabCSV = () => {
    const currency = settings.currency || 'ر.ي';

    if (activeTab === 'executive' || activeTab === 'financial') {
      const rows = filteredPayments.map(p => {
        const sub = subscribers.find(s => s.id === p.subscriberId);
        return {
          receiptNumber: p.receiptNumber || '—',
          paymentDate: p.paymentDate,
          name: sub?.name || 'مشترك',
          meterNumber: sub?.meterNumber || '—',
          zone: sub?.zone || '—',
          amountPaid: p.amountPaid,
          currency,
          collector: p.collectedBy || p.collectorName || 'الصندوق',
          notes: p.notes || ''
        };
      });
      exportToCSV(rows, 'financial_collections_report', [
        { key: 'receiptNumber', label: 'رقم الإيصال' },
        { key: 'paymentDate', label: 'تاريخ السداد' },
        { key: 'name', label: 'اسم المشترك' },
        { key: 'meterNumber', label: 'رقم العداد' },
        { key: 'zone', label: 'المنطقة' },
        { key: 'amountPaid', label: 'المبلغ المدفوع' },
        { key: 'currency', label: 'العملة' },
        { key: 'collector', label: 'المحصل' },
        { key: 'notes', label: 'ملاحظات' }
      ]);
    } else if (activeTab === 'consumption') {
      const rows = filteredReadings.map(r => {
        const sub = subscribers.find(s => s.id === r.subscriberId);
        return {
          date: r.readingDate || r.billingMonth,
          name: sub?.name || 'مشترك',
          meterNumber: sub?.meterNumber || '—',
          zone: sub?.zone || '—',
          previousReading: r.previousReading,
          currentReading: r.currentReading,
          consumption: r.consumption,
          unitPrice: r.unitPrice,
          totalAmount: r.totalAmount,
          currency
        };
      });
      exportToCSV(rows, 'energy_consumption_report', [
        { key: 'date', label: 'تاريخ القراءة' },
        { key: 'name', label: 'اسم المشترك' },
        { key: 'meterNumber', label: 'رقم العداد' },
        { key: 'zone', label: 'المنطقة' },
        { key: 'previousReading', label: 'القراءة السابقة' },
        { key: 'currentReading', label: 'القراءة الحالية' },
        { key: 'consumption', label: 'الاستهلاك (ك.و.س)' },
        { key: 'unitPrice', label: 'سعر الوحدة' },
        { key: 'totalAmount', label: 'إجمالي المبلغ' },
        { key: 'currency', label: 'العملة' }
      ]);
    } else if (activeTab === 'debt_aging') {
      const debtors = filteredSubscribers.filter(s => s.currentBalance > 0);
      const rows = debtors.map(sub => ({
        name: sub.name,
        meterNumber: sub.meterNumber,
        phone: sub.phone || '—',
        zone: sub.zone || '—',
        balance: sub.currentBalance,
        currency,
        category: sub.category || 'سكني'
      }));
      exportToCSV(rows, 'debt_aging_report', [
        { key: 'name', label: 'اسم المشترك' },
        { key: 'meterNumber', label: 'رقم العداد' },
        { key: 'phone', label: 'الهاتف' },
        { key: 'zone', label: 'المنطقة' },
        { key: 'balance', label: 'الرصيد القائم' },
        { key: 'currency', label: 'العملة' },
        { key: 'category', label: 'نوع الاشتراك' }
      ]);
    } else {
      const rows = filteredSubscribers.map(sub => ({
        name: sub.name,
        meterNumber: sub.meterNumber,
        phone: sub.phone || '—',
        zone: sub.zone || '—',
        balance: sub.currentBalance,
        currency
      }));
      exportToCSV(rows, 'general_subscribers_report', [
        { key: 'name', label: 'اسم المشترك' },
        { key: 'meterNumber', label: 'رقم العداد' },
        { key: 'phone', label: 'الهاتف' },
        { key: 'zone', label: 'المنطقة' },
        { key: 'balance', label: 'الرصيد القائم' },
        { key: 'currency', label: 'العملة' }
      ]);
    }
  };

  // Export Raw Data as JSON
  const handleExportActiveTabJSON = () => {
    const dataObj = {
      stationName: settings.stationName,
      exportTimestamp: new Date().toISOString(),
      reportTab: activeTab,
      filters,
      subscribersCount: filteredSubscribers.length,
      readingsCount: filteredReadings.length,
      paymentsCount: filteredPayments.length,
      subscribers: filteredSubscribers,
      readings: filteredReadings,
      payments: filteredPayments,
      expenses: filteredExpenses
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataObj, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `report_${activeTab}_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleNavigateToTab = (tab: ReportTabType, subId?: string) => {
    if (subId) {
      setSelectedSubId(subId);
    }
    setActiveTab(tab);
  };

  // Tabs Definitions
  const tabsList: { id: ReportTabType; label: string; icon: React.FC<{ className?: string }>; count?: number }[] = [
    { id: 'executive', label: 'الملخص التنفيذي والاستراتيجي', icon: BarChart3 },
    { id: 'financial', label: 'المالية والأرباح والسيولة', icon: DollarSign },
    { id: 'consumption', label: 'استهلاك وتوزيع الطاقة', icon: Activity },
    { id: 'loss', label: 'الفاقد الفني والتحليل الذكي', icon: ShieldAlert },
    { id: 'debt_aging', label: 'أعمار الديون والائتمان', icon: CreditCard, count: subscribers.filter(s => s.currentBalance > 0).length },
    { id: 'inventory', label: 'المخزون والأصول والمشتريات', icon: Package, count: inventory.length },
    { id: 'hr_payroll', label: 'الرواتب والأجور والكادر', icon: Users, count: employees.length },
    { id: 'statements', label: 'كشوف حسابات المشتركين', icon: FileText },
    { id: 'due_balances', label: 'كشف المستحقات والمحصل', icon: FileSpreadsheet }
  ];

  return (
    <div className="space-y-6 text-right pb-12" dir="rtl">
      {/* 1. REPORT HEADER & GLOBAL CONTROLS */}
      <ReportHeaderControls
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        filters={filters}
        onUpdateFilters={handleUpdateFilters}
        settings={settings}
        onOpenDueBalancesModal={() => setShowDueBalancesModal(true)}
        onExportCSV={handleExportActiveTabCSV}
        onExportJSON={handleExportActiveTabJSON}
        collectorsList={collectorsList}
      />

      {/* 2. SUB-MODULES NAVIGATION TABS */}
      <div className="bg-slate-900 border border-slate-800 p-2 rounded-3xl shadow-xl flex flex-wrap items-center gap-1.5 overflow-x-auto">
        {tabsList.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                isActive
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. DYNAMIC REPORT CONTENT VIEWS */}
      <AnimatePresence mode="wait">
        {/* 1. Executive & Strategic Overview */}
        {activeTab === 'executive' && (
          <ExecutiveOverviewTab
            key="tab-executive"
            subscribers={filteredSubscribers}
            readings={filteredReadings}
            payments={filteredPayments}
            settings={settings}
            expenses={filteredExpenses}
            purchases={filteredPurchases}
            employeeTxs={employeeTxs}
            connections={connections}
            currentUser={currentUser}
            filters={filters}
            onUpdateFilters={handleUpdateFilters}
            onNavigateToTab={handleNavigateToTab}
          />
        )}

        {/* 2. Financial & P&L Deep-Dive */}
        {activeTab === 'financial' && (
          <FinancialDeepDiveTab
            key="tab-financial"
            subscribers={filteredSubscribers}
            readings={filteredReadings}
            payments={filteredPayments}
            settings={settings}
            expenses={filteredExpenses}
            purchases={filteredPurchases}
            employeeTxs={employeeTxs}
            connections={connections}
            currentUser={currentUser}
            filters={filters}
            onUpdateFilters={handleUpdateFilters}
            onNavigateToTab={handleNavigateToTab}
          />
        )}

        {/* 3. Energy Consumption & Load Analytics */}
        {activeTab === 'consumption' && (
          <EnergyConsumptionTab
            key="tab-consumption"
            subscribers={filteredSubscribers}
            readings={filteredReadings}
            payments={filteredPayments}
            settings={settings}
            currentUser={currentUser}
            filters={filters}
            onUpdateFilters={handleUpdateFilters}
            onNavigateToTab={handleNavigateToTab}
          />
        )}

        {/* 4. Technical & Commercial Loss Engine */}
        {activeTab === 'loss' && (
          <TechnicalLossTab
            key="tab-loss"
            subscribers={filteredSubscribers}
            readings={filteredReadings}
            payments={filteredPayments}
            settings={settings}
            currentUser={currentUser}
            filters={filters}
            onUpdateFilters={handleUpdateFilters}
            onNavigateToTab={handleNavigateToTab}
          />
        )}

        {/* 5. Debt Aging & Credit Risk Matrix */}
        {activeTab === 'debt_aging' && (
          <DebtAgingTab
            key="tab-debt_aging"
            subscribers={filteredSubscribers}
            readings={filteredReadings}
            payments={filteredPayments}
            settings={settings}
            currentUser={currentUser}
            filters={filters}
            onUpdateFilters={handleUpdateFilters}
            onNavigateToTab={handleNavigateToTab}
          />
        )}

        {/* 6. Inventory & Procurement Audit */}
        {activeTab === 'inventory' && (
          <InventoryReportsTab
            key="tab-inventory"
            subscribers={filteredSubscribers}
            readings={filteredReadings}
            payments={filteredPayments}
            settings={settings}
            inventory={inventory}
            inventoryTransactions={inventoryTransactions}
            purchases={filteredPurchases}
            currentUser={currentUser}
            filters={filters}
            onUpdateFilters={handleUpdateFilters}
            onNavigateToTab={handleNavigateToTab}
          />
        )}

        {/* 7. HR & Payroll Ledger */}
        {activeTab === 'hr_payroll' && (
          <HRPayrollReportsTab
            key="tab-hr_payroll"
            subscribers={filteredSubscribers}
            readings={filteredReadings}
            payments={filteredPayments}
            settings={settings}
            employees={employees}
            employeeTxs={employeeTxs}
            currentUser={currentUser}
            filters={filters}
            onUpdateFilters={handleUpdateFilters}
            onNavigateToTab={handleNavigateToTab}
          />
        )}

        {/* 8. Subscriber Account Statements Hub */}
        {activeTab === 'statements' && (
          <motion.div
            key="tab-statements"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <SubscribersStatementHub
              subscribers={subscribers}
              readings={readings}
              payments={payments}
              settings={settings}
              currentUser={currentUser}
              initialSubscriberId={selectedSubId}
            />
          </motion.div>
        )}

        {/* 9. Standalone Due Balances & Collections Sheet View */}
        {activeTab === 'due_balances' && (
          <motion.div
            key="tab-due_balances"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full"
          >
            <DueBalancesReportModal
              isOpen={true}
              isModal={false}
              subscribers={subscribers}
              readings={readings}
              payments={payments}
              settings={settings}
              currentUser={currentUser}
              users={users}
              employees={employees}
              collectorsList={collectorsList}
              onOpenSubscriberStatement={(sub) => {
                setSelectedSubId(sub.id);
                setActiveTab('statements');
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Styled Headless A4 Printing Layout Overrides */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
          }

          #root, div[role="dialog"], div[role="dialog"] > div {
            display: block !important;
            visibility: visible !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            position: static !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            border: none !important;
            box-shadow: none !important;
          }

          body * { 
            visibility: hidden !important; 
          }
          
          header, nav, footer, sidebar, .print-hidden, .print\\:hidden, [role="dialog"] > div:first-child, button { 
            display: none !important; 
          }

          .statement-print-container, .statement-print-container * {
            visibility: visible !important;
          }

          .statement-print-container {
            position: relative !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            padding: 2mm 4mm !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            color: #000000 !important;
            zoom: 88% !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-before: avoid !important;
            break-before: avoid !important;
          }

          @page {
            size: A4 portrait;
            margin: 5mm 8mm;
          }
        }
      `}} />

      {/* Due & Overdue Balances & Collections Report Modal */}
      <DueBalancesReportModal
        isOpen={showDueBalancesModal}
        onClose={() => setShowDueBalancesModal(false)}
        subscribers={subscribers}
        readings={readings}
        payments={payments}
        settings={settings}
        currentUser={currentUser}
        users={users}
        employees={employees}
        collectorsList={collectorsList}
        onOpenSubscriberStatement={(sub) => {
          setSelectedSubId(sub.id);
          setActiveTab('statements');
          setShowDueBalancesModal(false);
        }}
      />
    </div>
  );
};

export default AdminReports;
