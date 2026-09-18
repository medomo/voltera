import { Payment, MeterReading, Subscriber } from '../types';

/**
 * Generates sequential subscriber code (e.g. SUB-1001, SUB-1002...).
 */
export const getNextSubscriberCode = (subscribers: Subscriber[]): string => {
  let maxSeq = 1000;
  if (Array.isArray(subscribers)) {
    for (const s of subscribers) {
      const code = s.subscriberCode || s.id;
      if (!code) continue;
      const matches = code.match(/\d+/g);
      if (matches && matches.length > 0) {
        for (const numStr of matches) {
          const num = parseInt(numStr, 10);
          if (!isNaN(num) && num > maxSeq && num < 99999999) {
            maxSeq = num;
          }
        }
      }
    }
  }
  return `SUB-${maxSeq + 1}`;
};

/**
 * Ensures gap-free, strictly sequential receipt numbering (أرقام سندات القبض).
 * Inspects all existing payment receipt numbers, identifies the highest sequence index,
 * and increments by 1.
 */
export const getNextReceiptNumber = (payments: Payment[]): string => {
  let maxSeq = 10000;

  if (Array.isArray(payments)) {
    for (const p of payments) {
      if (!p.receiptNumber) continue;
      // Extract all numeric sequences
      const matches = p.receiptNumber.match(/\d+/g);
      if (matches && matches.length > 0) {
        // Use the last group of digits or the largest single numeric value
        for (const numStr of matches) {
          const num = parseInt(numStr, 10);
          if (!isNaN(num) && num > maxSeq && num < 99999999) {
            maxSeq = num;
          }
        }
      }
    }
  }

  return `REC-${maxSeq + 1}`;
};

/**
 * Ensures gap-free, strictly sequential invoice numbering (أرقام الفواتير).
 * Inspects all existing invoice numbers and reading IDs, identifies the highest sequence index,
 * and increments by 1.
 */
export const getNextInvoiceNumber = (readings: MeterReading[]): string => {
  let maxSeq = 10000;

  if (Array.isArray(readings)) {
    for (const r of readings) {
      const ref = r.invoiceNumber || r.id;
      if (!ref) continue;
      const matches = ref.match(/\d+/g);
      if (matches && matches.length > 0) {
        for (const numStr of matches) {
          const num = parseInt(numStr, 10);
          if (!isNaN(num) && num > maxSeq && num < 99999999) {
            maxSeq = num;
          }
        }
      }
    }
  }

  return `INV-${maxSeq + 1}`;
};

/**
 * Format balance text clearly:
 * If balance is negative, it represents a Credit Balance (رصيد دائن / دفعة مسبقة).
 * If balance is positive, it represents an Unpaid Debt (مديونية مستحقة).
 */
export const formatSubscriberBalanceStatus = (
  balance: number, 
  currency: string = 'ر.ي'
): {
  type: 'credit' | 'debt' | 'zero';
  label: string;
  amountText: string;
  badgeClass: string;
} => {
  const rounded = Number(balance.toFixed(2));
  if (rounded < -0.01) {
    const absVal = Math.abs(rounded);
    return {
      type: 'credit',
      label: 'رصيد دائن مسبق الدفع (فائض تحصيل)',
      amountText: `${absVal.toLocaleString()} ${currency} (دائن)`,
      badgeClass: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
    };
  } else if (rounded > 0.01) {
    return {
      type: 'debt',
      label: 'مستحق للسداد (مديونية)',
      amountText: `${rounded.toLocaleString()} ${currency}`,
      badgeClass: 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
    };
  } else {
    return {
      type: 'zero',
      label: 'الحساب متوازن (0.00)',
      amountText: `0.00 ${currency}`,
      badgeClass: 'bg-slate-500/15 text-slate-300 border border-slate-500/30'
    };
  }
};
