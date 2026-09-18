import { Subscriber, MeterReading, Payment } from '../types';

/**
 * Checks if a reading or payment belongs to a given subscriber.
 * Matches by ID, Subscriber Code, Meter Number, or Exact Name.
 */
export const isItemForSubscriber = (
  item: { subscriberId?: string; subscriberName?: string; meterNumber?: string } | null | undefined,
  sub: Subscriber | null | undefined
): boolean => {
  if (!item || !sub) return false;

  const itemSubId = (item.subscriberId || '').trim();
  const subId = (sub.id || '').trim();
  const subCode = (sub.subscriberCode || '').trim();

  // 1. Primary matching by subscriberId (UUID or subscriberCode):
  if (itemSubId !== '') {
    if (subId !== '' && itemSubId === subId) return true;
    if (subCode !== '' && itemSubId.toLowerCase() === subCode.toLowerCase()) return true;
  }

  // 2. Secondary matching by meter number:
  const subMeter = (sub.meterNumber || '').trim().toLowerCase();
  const itemMeter = (item.meterNumber || '').trim().toLowerCase();
  if (subMeter !== '' && itemMeter !== '' && subMeter === itemMeter) {
    return true;
  }

  // 3. Fallback matching by exact subscriber name (if no ID was specified or mismatched):
  const subName = (sub.name || '').trim().toLowerCase();
  const itemName = (item.subscriberName || '').trim().toLowerCase();
  if (subName !== '' && itemName !== '' && subName === itemName) {
    return true;
  }

  return false;
};

/**
 * Calculates total billed amount (readings) for a subscriber excluding rejected readings.
 */
export const getSubscriberTotalReadings = (
  sub: Subscriber,
  readings: MeterReading[]
): number => {
  if (!Array.isArray(readings) || !sub) return 0;
  return readings
    .filter(r => r && !r.isRejected && (r as any).status !== 'rejected' && isItemForSubscriber(r, sub))
    .reduce((sum, r) => sum + (Number(r.totalAmount) || Number((r as any).netAmount) || Number((r as any).amount) || 0), 0);
};

/**
 * Calculates total payments made by a subscriber excluding rejected payments.
 */
export const getSubscriberTotalPayments = (
  sub: Subscriber,
  payments: Payment[]
): number => {
  if (!Array.isArray(payments) || !sub) return 0;
  return payments
    .filter(p => p && !p.isRejected && (p as any).status !== 'rejected' && isItemForSubscriber(p, sub))
    .reduce((sum, p) => sum + (Number(p.amountPaid) || Number((p as any).amount) || 0), 0);
};

/**
 * Derive opening balance from desired current balance so that:
 * openingBalance + readings - payments = currentBalance
 */
export const deriveOpeningFromCurrentBalance = (
  newCurrentBalance: number,
  sub: Subscriber,
  readings: MeterReading[],
  payments: Payment[]
): number => {
  const totalReadings = getSubscriberTotalReadings(sub, readings);
  const totalPayments = getSubscriberTotalPayments(sub, payments);
  return Number((newCurrentBalance - totalReadings + totalPayments).toFixed(2));
};

/**
 * Calculates exact ledger current balance for a subscriber:
 * currentBalance = openingBalance + totalReadings - totalPayments
 */
export const getExactSubscriberBalance = (
  sub: Subscriber,
  readings: MeterReading[],
  payments: Payment[]
): number => {
  if (!sub) return 0;
  const totalReadings = getSubscriberTotalReadings(sub, readings);
  const totalPayments = getSubscriberTotalPayments(sub, payments);
  const opening = Number(sub.openingBalance ?? 0);

  return Number((opening + totalReadings - totalPayments).toFixed(2));
};

export interface SubscriberLedgerDetails {
  readingsCount: number;
  paymentsCount: number;
  latestReadingDate?: string;
  latestReadingAmount?: number;
  latestPaymentDate?: string;
  latestPaymentAmount?: number;
  latestReceiptNumber?: string;
}

/**
 * Extract ledger transaction details for a subscriber
 */
export const getSubscriberLedgerDetails = (
  sub: Subscriber,
  readings: MeterReading[],
  payments: Payment[]
): SubscriberLedgerDetails => {
  const subReadings = (Array.isArray(readings) ? readings : [])
    .filter(r => r && !r.isRejected && (r as any).status !== 'rejected' && isItemForSubscriber(r, sub))
    .sort((a, b) => (b.readingDate || '').localeCompare(a.readingDate || ''));

  const subPayments = (Array.isArray(payments) ? payments : [])
    .filter(p => p && !p.isRejected && (p as any).status !== 'rejected' && isItemForSubscriber(p, sub))
    .sort((a, b) => (b.paymentDate || '').localeCompare(a.paymentDate || ''));

  const latestR = subReadings[0];
  const latestP = subPayments[0];

  return {
    readingsCount: subReadings.length,
    paymentsCount: subPayments.length,
    latestReadingDate: latestR?.readingDate,
    latestReadingAmount: latestR ? (Number(latestR.totalAmount) || 0) : undefined,
    latestPaymentDate: latestP?.paymentDate,
    latestPaymentAmount: latestP ? (Number(latestP.amountPaid) || 0) : undefined,
    latestReceiptNumber: latestP?.receiptNumber
  };
};

export interface SubscriberReconciliationItem {
  subscriber: Subscriber;
  openingBalance: number;
  totalBilled: number;
  totalCollected: number;
  calculatedBalance: number;
  recordedBalance: number;
  discrepancy: number;
  isMatched: boolean;
  ledgerDetails: SubscriberLedgerDetails;
  statusText: 'متطابق تماماً' | 'عجز مسجل (الرصيد المسجل أقل من الدفتري)' | 'فائض مسجل (الرصيد المسجل أكبر من الدفتري)';
}

export interface BalanceReconciliationReport {
  items: SubscriberReconciliationItem[];
  totalSubscribers: number;
  matchedCount: number;
  mismatchedCount: number;
  debtorsCount: number;
  creditorsCount: number;
  zeroBalanceCount: number;
  totalDebts: number;
  totalCredits: number;
  totalOpeningBalances: number;
  totalBilled: number;
  totalCollected: number;
  totalCalculatedBalance: number;
  totalRecordedBalance: number;
  totalDiscrepancy: number;
  maxDiscrepancy: number;
  matchPercentage: number;
  hasDiscrepancies: boolean;
}

/**
 * Performs a comprehensive audit and balance reconciliation across all subscribers.
 * Compares: (Opening Balance + Total Approved Invoices - Total Collected Payments) vs Recorded Current Balance.
 */
export const performBalanceReconciliation = (
  subscribers: Subscriber[],
  readings: MeterReading[],
  payments: Payment[]
): BalanceReconciliationReport => {
  if (!Array.isArray(subscribers)) {
    return {
      items: [],
      totalSubscribers: 0,
      matchedCount: 0,
      mismatchedCount: 0,
      debtorsCount: 0,
      creditorsCount: 0,
      zeroBalanceCount: 0,
      totalDebts: 0,
      totalCredits: 0,
      totalOpeningBalances: 0,
      totalBilled: 0,
      totalCollected: 0,
      totalCalculatedBalance: 0,
      totalRecordedBalance: 0,
      totalDiscrepancy: 0,
      maxDiscrepancy: 0,
      matchPercentage: 100,
      hasDiscrepancies: false
    };
  }

  let matchedCount = 0;
  let mismatchedCount = 0;
  let debtorsCount = 0;
  let creditorsCount = 0;
  let zeroBalanceCount = 0;
  let totalDebts = 0;
  let totalCredits = 0;
  let totalOpeningBalances = 0;
  let totalBilled = 0;
  let totalCollected = 0;
  let totalCalculatedBalance = 0;
  let totalRecordedBalance = 0;
  let totalDiscrepancy = 0;
  let maxDiscrepancy = 0;

  const items: SubscriberReconciliationItem[] = subscribers.map(sub => {
    const opening = Number(sub.openingBalance ?? 0);
    const billed = getSubscriberTotalReadings(sub, readings);
    const collected = getSubscriberTotalPayments(sub, payments);
    const calculated = Number((opening + billed - collected).toFixed(2));
    const recorded = Number(Number(sub.currentBalance ?? 0).toFixed(2));
    const diff = Number((calculated - recorded).toFixed(2));
    const isMatched = Math.abs(diff) <= 0.01;
    const absDiff = Math.abs(diff);

    if (absDiff > maxDiscrepancy) {
      maxDiscrepancy = absDiff;
    }

    if (calculated > 0.01) {
      debtorsCount++;
      totalDebts += calculated;
    } else if (calculated < -0.01) {
      creditorsCount++;
      totalCredits += Math.abs(calculated);
    } else {
      zeroBalanceCount++;
    }

    totalOpeningBalances += opening;
    totalBilled += billed;
    totalCollected += collected;
    totalCalculatedBalance += calculated;
    totalRecordedBalance += recorded;
    totalDiscrepancy += absDiff;

    if (isMatched) {
      matchedCount++;
    } else {
      mismatchedCount++;
    }

    let statusText: SubscriberReconciliationItem['statusText'] = 'متطابق تماماً';
    if (!isMatched) {
      if (diff > 0) {
        statusText = 'عجز مسجل (الرصيد المسجل أقل من الدفتري)';
      } else {
        statusText = 'فائض مسجل (الرصيد المسجل أكبر من الدفتري)';
      }
    }

    const ledgerDetails = getSubscriberLedgerDetails(sub, readings, payments);

    return {
      subscriber: sub,
      openingBalance: opening,
      totalBilled: billed,
      totalCollected: collected,
      calculatedBalance: calculated,
      recordedBalance: recorded,
      discrepancy: diff,
      isMatched,
      ledgerDetails,
      statusText
    };
  });

  const totalSubscribers = subscribers.length;
  const matchPercentage = totalSubscribers > 0 
    ? Math.round((matchedCount / totalSubscribers) * 100) 
    : 100;

  return {
    items,
    totalSubscribers,
    matchedCount,
    mismatchedCount,
    debtorsCount,
    creditorsCount,
    zeroBalanceCount,
    totalDebts: Number(totalDebts.toFixed(2)),
    totalCredits: Number(totalCredits.toFixed(2)),
    totalOpeningBalances: Number(totalOpeningBalances.toFixed(2)),
    totalBilled: Number(totalBilled.toFixed(2)),
    totalCollected: Number(totalCollected.toFixed(2)),
    totalCalculatedBalance: Number(totalCalculatedBalance.toFixed(2)),
    totalRecordedBalance: Number(totalRecordedBalance.toFixed(2)),
    totalDiscrepancy: Number(totalDiscrepancy.toFixed(2)),
    maxDiscrepancy: Number(maxDiscrepancy.toFixed(2)),
    matchPercentage,
    hasDiscrepancies: mismatchedCount > 0
  };
};
