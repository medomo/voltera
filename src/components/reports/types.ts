import { Subscriber, MeterReading, Payment, SystemSettings, InventoryItem, InventoryTransaction, Expense, Purchase, EmployeeTransaction, ServiceConnection, Employee, User } from '../../types';

export type ReportTabType = 
  | 'executive' 
  | 'financial' 
  | 'consumption' 
  | 'debt_aging' 
  | 'loss' 
  | 'inventory' 
  | 'hr_payroll' 
  | 'statements' 
  | 'due_balances';

export interface ReportFilterState {
  datePreset: 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'custom';
  fromDate: string;
  toDate: string;
  zoneFilter: string;
  categoryFilter: string; // 'all' | 'commercial' | 'residential' | 'industrial' | 'agricultural'
  collectorFilter: string; // 'all' | specific collector name
  searchQuery: string;
  transformerFilter: string;
}

export interface BaseReportProps {
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
  filters: ReportFilterState;
  onUpdateFilters: (filters: Partial<ReportFilterState>) => void;
  onNavigateToTab?: (tab: ReportTabType, subId?: string) => void;
}
