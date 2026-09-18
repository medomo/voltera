import React, { createContext, useContext } from 'react';
import {
  User, Subscriber, MeterReading, Payment, SystemSettings, AuditLog,
  InventoryItem, InventoryTransaction, SmsTemplate, FailedSmsItem
} from '../types';

export type ActiveSection =
  | 'dashboard'
  | 'subscribers'
  | 'accounting'
  | 'debt'
  | 'zones'
  | 'roles'
  | 'inventory'
  | 'inventory-alerts'
  | 'inventory-catalog'
  | 'inventory-transactions'
  | 'hr-employees'
  | 'hr-payroll'
  | 'operations-requests'
  | 'operations-zones'
  | 'admin-db'
  | 'admin-security'
  | 'admin-settings'
  | 'station-directory'
  | 'admin-postings'
  | 'admin-services'
  | 'service-connections'
  | 'system'
  | 'sms-templates'
  | 'sms-subscriptions'
  | 'sms-send'
  | 'sms-failed'
  | 'sms-outbox'
  | 'sms-gateway'
  | 'treasury-boxes'
  | 'treasury-transfers'
  | 'treasury-statements'
  | 'treasury-performance'
  | 'treasury-daily'
  | 'reporting-subscribers'
  | 'reporting-financial'
  | 'reporting-inventory'
  | 'reporting-hr'
  | 'reporting-executive'
  | 'reporting-consumption'
  | 'reporting-debt'
  | 'reporting-loss'
  | 'reporting-statements'
  | 'partners';

export interface DashboardContextType {
  currentUser: User;
  onLogout: () => void;
  subscribers: Subscriber[];
  readings: MeterReading[];
  payments: Payment[];
  settings: SystemSettings;
  auditLogs: AuditLog[];
  users: User[];
  inventory: InventoryItem[];
  inventoryTransactions: InventoryTransaction[];
  treasuryTransfers: any[];
  expenses: any[];
  purchases: any[];
  manualJournalEntries: any[];
  employees: any[];
  employeeTxs: any[];
  connections: any[];
  techRequests: any[];
  smsTemplates: SmsTemplate[];
  failedSms: FailedSmsItem[];
  partners: any[];
  partnerTransactions: any[];
  profitDistributions: any[];
  
  // Update functions
  onUpdateSubscribers: (subs: Subscriber[]) => void;
  onUpdateReadings: (reads: MeterReading[]) => void;
  onUpdatePayments: (pays: Payment[]) => void;
  onUpdateSettings: (settings: SystemSettings) => void;
  onUpdateUsers: (users: User[]) => void;
  onAddAuditLog: (log: AuditLog) => void;
  onClearAuditLogs?: () => void;
  onResetDatabase: () => void;
  onWipeAllData?: () => void;
  onUpdateInventory: (items: InventoryItem[]) => void;
  onUpdateInventoryTransactions: (txs: InventoryTransaction[]) => void;
  onUpdateTreasuryTransfers?: (trfs: any[]) => void;
  onUpdateExpenses?: (exps: any[]) => void;
  onUpdatePurchases?: (purs: any[]) => void;
  onUpdateManualJournalEntries?: (entries: any[]) => void;
  onUpdateEmployees?: (emps: any[]) => void;
  onUpdateEmployeeTxs?: (txs: any[]) => void;
  onUpdateConnections?: (conns: any[]) => void;
  onUpdateTechRequests?: (reqs: any[]) => void;
  onUpdateSmsTemplates?: (templates: SmsTemplate[]) => void;
  onSaveSmsTemplate?: (template: SmsTemplate) => void;
  onDeleteSmsTemplate?: (id: string) => void;
  onDeleteFailedSms?: (id: string) => void;
  onClearAllFailedSms?: () => void;
  onUpdatePartners?: (partners: any[]) => void;
  onUpdatePartnerTransactions?: (txs: any[]) => void;
  onUpdateProfitDistributions?: (dists: any[]) => void;

  // Active section & navigation
  activeSection: ActiveSection;
  setActiveSection: (section: ActiveSection) => void;
  
  // Helpers
  logAction: (action: string, details: string) => void;
  showToast: (msg: string) => void;
}

export const DashboardContext = createContext<DashboardContextType | null>(null);

export const useDashboard = (): DashboardContextType => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
