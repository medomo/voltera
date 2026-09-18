import { Subscriber, SystemSettings, User } from '../../types';

export interface ColumnDefinition {
  id: string;
  label: string;
  visible: boolean;
  align: 'right' | 'center' | 'left';
  width?: string;
  isNumeric?: boolean;
  isCurrency?: boolean;
}

export interface SubscriberBalanceItem {
  subscriber: Subscriber;
  meterNumber: string;
  name: string;
  phone: string;
  zone: string;
  transformer: string;
  tariffType: string;
  rawTariff: string;
  status: string;
  openingBalance: number;
  totalBilled: number;
  totalCollected: number;
  collectionRate: number;
  overdueAmount: number;
  currentDue: number;
  totalDue: number;
  paymentStatus: 'fully_paid' | 'partial' | 'unpaid' | 'creditor';
  paymentStatusLabel: string;
  lastPaymentDate: string;
  lastPaymentAmount: number;
  lastPaymentDaysAgo: number;
  lastReadingDate: string;
  lastReadingMonth: string;
  lastConsumption: number;
  agingBracket: 'current' | 'days31_60' | 'days61_90' | 'over90';
  agingBracketLabel: string;
  notes: string;
}

export interface SummaryStatistics {
  totalCount: number;
  totalOverdue: number;
  totalCurrentDue: number;
  totalDueSum: number;
  totalCollected: number;
  totalBilled: number;
  totalOpening: number;
  debtorsCount: number;
  fullyPaidCount: number;
  partialPaidCount: number;
  unpaidCount: number;
  creditorsCount: number;
  totalNetBalance: number;
  overallCollectionRate: number;
  agingCurrentSum: number;
  agingCurrentCount: number;
  aging31_60Sum: number;
  aging31_60Count: number;
  aging61_90Sum: number;
  aging61_90Count: number;
  agingOver90Sum: number;
  agingOver90Count: number;
}

export type FilterType = 
  | 'debtorsOnly' 
  | 'all' 
  | 'unpaidOnly' 
  | 'partialOnly' 
  | 'fullyPaid' 
  | 'highDebtors' 
  | 'creditors'
  | 'aging_current'
  | 'aging_31_60'
  | 'aging_61_90'
  | 'aging_over90';

export interface DueBalancesReportModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onBack?: () => void;
  isModal?: boolean;
  subscribers: Subscriber[];
  readings: any[];
  payments: any[];
  settings: SystemSettings;
  currentUser: User;
  onOpenSubscriberStatement?: (subscriber: Subscriber) => void;
  onCollectPayment?: (subscriber: Subscriber) => void;
}
