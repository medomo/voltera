import * as XLSX from 'xlsx';
import { Subscriber, TariffType } from '../types';

export interface ParsedSubscriberRow {
  rawIndex: number;
  subscriberCode?: string;
  name: string;
  phone: string;
  meterNumber: string;
  zone: string;
  transformer?: string;
  tariffType: TariffType;
  status: 'active' | 'suspended' | 'disconnected';
  initialReading: number;
  openingBalance: number;
  currentBalance: number;
  coordinates?: { lat: number; lng: number };
  isValid: boolean;
  errors: string[];
  isDuplicateInFile: boolean;
  isExistingInDb: boolean;
  existingSubscriber?: Subscriber;
}

export interface ParseResult {
  rows: ParsedSubscriberRow[];
  totalParsed: number;
  validCount: number;
  errorCount: number;
  duplicateInFileCount: number;
  existingInDbCount: number;
}

export interface SubscriberExportOptions {
  filename?: string;
  format: 'xlsx' | 'csv' | 'json';
  currency?: string;
  includeBalances?: boolean;
  includeCoordinates?: boolean;
  customColumns?: string[];
}

export const SUBSCRIBER_EXPORT_COLUMNS = [
  { id: 'subscriberCode', label: 'كود المشترك', default: true },
  { id: 'name', label: 'اسم المشترك', default: true },
  { id: 'meterNumber', label: 'رقم العداد', default: true },
  { id: 'phone', label: 'رقم الهاتف / الجوال', default: true },
  { id: 'zone', label: 'المربع الجغرافي / المنطقة', default: true },
  { id: 'transformer', label: 'المحول / العداد المركزي', default: true },
  { id: 'tariffType', label: 'نوع التعرفة', default: true },
  { id: 'status', label: 'الحالة', default: true },
  { id: 'initialReading', label: 'القراءة الابتدائية', default: true },
  { id: 'currentReading', label: 'القراءة الحالية', default: true },
  { id: 'openingBalance', label: 'الرصيد الافتتاحي', default: true },
  { id: 'currentBalance', label: 'الرصيد المستحق الحالي', default: true },
  { id: 'createdAt', label: 'تاريخ التسجيل', default: true },
  { id: 'coordinates', label: 'إحداثيات GPS', default: false },
];

/**
 * Translates tariff type to friendly Arabic
 */
export const translateTariff = (type?: string): string => {
  switch (type) {
    case 'residential':
    case 'سكني':
      return 'سكني';
    case 'commercial':
    case 'تجاري':
      return 'تجاري';
    case 'industrial':
    case 'صناعي':
      return 'صناعي';
    default:
      return 'سكني';
  }
};

/**
 * Normalizes Arabic tariff text to system TariffType
 */
export const normalizeTariff = (val: string): TariffType => {
  const clean = (val || '').trim().toLowerCase();
  if (clean.includes('تجار') || clean === 'commercial') return 'commercial';
  if (clean.includes('صناع') || clean === 'industrial') return 'industrial';
  return 'residential';
};

/**
 * Translates subscriber status to friendly Arabic
 */
export const translateStatus = (status?: string): string => {
  switch (status) {
    case 'active':
    case 'نشط':
      return 'نشط';
    case 'suspended':
    case 'موقوف':
      return 'موقوف';
    case 'disconnected':
    case 'مفصول':
      return 'مفصول';
    default:
      return 'نشط';
  }
};

/**
 * Normalizes Arabic status text to system status
 */
export const normalizeStatus = (val: string): 'active' | 'suspended' | 'disconnected' => {
  const clean = (val || '').trim().toLowerCase();
  if (clean.includes('موقف') || clean.includes('موقوف') || clean === 'suspended') return 'suspended';
  if (clean.includes('مفصول') || clean.includes('ملغي') || clean === 'disconnected') return 'disconnected';
  return 'active';
};

/**
 * Converts a list of subscribers into formatted export records in correct Arabic order.
 */
export const formatSubscribersForExport = (
  subscribers: Subscriber[],
  columnsToInclude: string[] = SUBSCRIBER_EXPORT_COLUMNS.map(c => c.id)
) => {
  return subscribers.map(sub => {
    const row: Record<string, any> = {};

    if (columnsToInclude.includes('subscriberCode')) {
      row['كود المشترك'] = sub.subscriberCode || `SUB-${sub.id}`;
    }
    if (columnsToInclude.includes('name')) {
      row['اسم المشترك'] = sub.name || '';
    }
    if (columnsToInclude.includes('meterNumber')) {
      row['رقم العداد'] = sub.meterNumber || '';
    }
    if (columnsToInclude.includes('phone')) {
      row['رقم الهاتف / الجوال'] = sub.phone || '';
    }
    if (columnsToInclude.includes('zone')) {
      row['المربع الجغرافي / المنطقة'] = sub.zone || 'غير محدد';
    }
    if (columnsToInclude.includes('transformer')) {
      row['المحول / العداد المركزي'] = sub.transformer || 'بدون محول';
    }
    if (columnsToInclude.includes('tariffType')) {
      row['نوع التعرفة'] = translateTariff(sub.tariffType);
    }
    if (columnsToInclude.includes('status')) {
      row['الحالة'] = translateStatus(sub.status);
    }
    if (columnsToInclude.includes('initialReading')) {
      row['القراءة الابتدائية'] = Number(sub.initialReading) || 0;
    }
    if (columnsToInclude.includes('currentReading')) {
      row['القراءة الحالية'] = Number(sub.currentReading) || 0;
    }
    if (columnsToInclude.includes('openingBalance')) {
      row['الرصيد الافتتاحي'] = Number(sub.openingBalance) || 0;
    }
    if (columnsToInclude.includes('currentBalance')) {
      row['الرصيد المستحق الحالي'] = Number(sub.currentBalance) || 0;
    }
    if (columnsToInclude.includes('createdAt')) {
      row['تاريخ التسجيل'] = sub.createdAt ? new Date(sub.createdAt).toLocaleDateString('ar-EG') : '';
    }
    if (columnsToInclude.includes('coordinates')) {
      row['إحداثيات GPS'] = sub.coordinates ? `${sub.coordinates.lat}, ${sub.coordinates.lng}` : '';
    }

    return row;
  });
};

/**
 * Exports subscribers to native Excel (.xlsx) file with RTL direction and column width sizing.
 */
export const exportSubscribersToExcel = (
  subscribers: Subscriber[],
  options: SubscriberExportOptions = { format: 'xlsx' }
) => {
  const filename = options.filename || `سجل_المشتركين_${new Date().toISOString().split('T')[0]}`;
  const formattedData = formatSubscribersForExport(subscribers, options.customColumns);

  const worksheet = XLSX.utils.json_to_sheet(formattedData);

  // Set Right-To-Left view for Arabic worksheet
  worksheet['!views'] = [{ rightToLeft: true }];

  // Auto-fit column widths based on headers and data
  if (formattedData.length > 0) {
    const keys = Object.keys(formattedData[0]);
    worksheet['!cols'] = keys.map(key => {
      let maxLen = key.length;
      formattedData.forEach(row => {
        const valStr = String(row[key] ?? '');
        if (valStr.length > maxLen) maxLen = valStr.length;
      });
      return { wch: Math.min(Math.max(maxLen + 4, 14), 45) };
    });
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'سجل المشتركين');

  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

/**
 * Exports subscribers to CSV with UTF-8 BOM (Byte Order Mark) for seamless Excel & Arabic support.
 */
export const exportSubscribersToCSV = (
  subscribers: Subscriber[],
  options: SubscriberExportOptions = { format: 'csv' }
) => {
  const filename = options.filename || `سجل_المشتركين_${new Date().toISOString().split('T')[0]}`;
  const formattedData = formatSubscribersForExport(subscribers, options.customColumns);

  if (formattedData.length === 0) {
    alert('لا توجد بيانات مشتركين لتصديرها.');
    return;
  }

  const headers = Object.keys(formattedData[0]);
  let csv = '\uFEFF'; // UTF-8 BOM

  // Header line
  csv += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\r\n';

  // Data rows
  formattedData.forEach(row => {
    const rowLine = headers.map(h => {
      let val = row[h] ?? '';
      val = String(val).replace(/"/g, '""');
      return `"${val}"`;
    }).join(',');
    csv += rowLine + '\r\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Exports subscribers to clean JSON format.
 */
export const exportSubscribersToJSON = (
  subscribers: Subscriber[],
  options: SubscriberExportOptions = { format: 'json' }
) => {
  const filename = options.filename || `سجل_المشتركين_${new Date().toISOString().split('T')[0]}`;
  const payload = {
    appName: 'نظام فواتير الكهرباء وإدارة المشتركين',
    exportDate: new Date().toISOString(),
    totalSubscribers: subscribers.length,
    subscribers
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Downloads a ready-to-use sample template in Excel (.xlsx) or CSV format.
 */
export const downloadSubscribersSampleTemplate = (format: 'xlsx' | 'csv' = 'xlsx') => {
  const sampleData = [
    {
      'كود المشترك': 'SUB-1001',
      'اسم المشترك': 'أحمد محمد علي السلامي',
      'رقم العداد': 'M-1001',
      'رقم الهاتف / الجوال': '771234567',
      'المربع الجغرافي / المنطقة': 'المنطقة (أ) - وسط المدينة',
      'المحول / العداد المركزي': 'محول السوق المركزي',
      'نوع التعرفة': 'سكني',
      'الحالة': 'نشط',
      'القراءة الابتدائية': 150,
      'الرصيد الافتتاحي': 0,
      'ملاحظات': 'مشترك جديد - عداد إلكتروني'
    },
    {
      'كود المشترك': 'SUB-1002',
      'اسم المشترك': 'شركة النور للمقاولات والتجارة',
      'رقم العداد': 'M-1002',
      'رقم الهاتف / الجوال': '777889900',
      'المربع الجغرافي / المنطقة': 'المنطقة (ب) - الشارع العام',
      'المحول / العداد المركزي': 'محول التجاري 1',
      'نوع التعرفة': 'تجاري',
      'الحالة': 'نشط',
      'القراءة الابتدائية': 450,
      'الرصيد الافتتاحي': 5000,
      'ملاحظات': 'رصيد افتتاحي مرحل من الدفتر القديم'
    },
    {
      'كود المشترك': 'SUB-1003',
      'اسم المشترك': 'مؤسسة البركة الصناعية',
      'رقم العداد': 'M-1003',
      'رقم الهاتف / الجوال': '733112233',
      'المربع الجغرافي / المنطقة': 'المنطقة الصناعية',
      'المحول / العداد المركزي': 'محول الصناعية الرئيسي',
      'نوع التعرفة': 'صناعي',
      'الحالة': 'نشط',
      'القراءة الابتدائية': 1200,
      'الرصيد الافتتاحي': 0,
      'ملاحظات': 'جهد عالي 3 فاز'
    }
  ];

  if (format === 'xlsx') {
    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    worksheet['!views'] = [{ rightToLeft: true }];
    worksheet['!cols'] = [
      { wch: 15 }, // كود المشترك
      { wch: 30 }, // اسم المشترك
      { wch: 15 }, // رقم العداد
      { wch: 18 }, // الهاتف
      { wch: 26 }, // المنطقة
      { wch: 24 }, // المحول
      { wch: 12 }, // نوع التعرفة
      { wch: 10 }, // الحالة
      { wch: 18 }, // القراءة الابتدائية
      { wch: 18 }, // الرصيد الافتتاحي
      { wch: 30 }, // ملاحظات
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'قالب استيراد المشتركين');
    XLSX.writeFile(workbook, 'قالب_استيراد_المشتركين_النموذجي.xlsx');
  } else {
    const headers = Object.keys(sampleData[0]);
    let csv = '\uFEFF';
    csv += headers.map(h => `"${h}"`).join(',') + '\r\n';
    sampleData.forEach(row => {
      csv += headers.map(h => `"${(row as any)[h] ?? ''}"`).join(',') + '\r\n';
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'قالب_استيراد_المشتركين_النموذجي.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

/**
 * Universal CSV row tokenizer respecting quotes, escaped characters, and custom delimiters.
 */
function parseCSVLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Detects the most probable delimiter in a raw text file (, or ; or \t or |).
 */
function detectDelimiter(sampleLines: string[]): string {
  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0, '|': 0 };
  for (const line of sampleLines.slice(0, 5)) {
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') inQuotes = !inQuotes;
      else if (!inQuotes && char in counts) {
        counts[char]++;
      }
    }
  }
  let bestDelim = ',';
  let maxCount = -1;
  for (const [delim, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      bestDelim = delim;
    }
  }
  return bestDelim;
}

/**
 * Fuzzy Header Key Matcher for Subscriber fields
 */
function matchHeaderField(header: string): string | null {
  const h = header.trim().toLowerCase().replace(/[\s_\-\/\(\)]+/g, '');

  if (['اسمالمشترك', 'اسم', 'الاسم', 'المشترك', 'العميل', 'المستفيد', 'name', 'fullname', 'subscribername', 'clientname'].some(k => h.includes(k))) {
    return 'name';
  }
  if (['رقمعداد', 'رقمشتركة', 'رقمعدادالمشترك', 'رقمكهر', 'عداد', 'رقم_العداد', 'العداد', 'meternumber', 'meter', 'meterno', 'meterid'].some(k => h.includes(k))) {
    return 'meterNumber';
  }
  if (['رقمكود', 'كودمشترك', 'كودالمشترك', 'كود', 'رقمحساب', 'رقممشترك', 'رقمملف', 'code', 'subscribercode', 'accountno', 'accountnumber'].some(k => h.includes(k))) {
    return 'subscriberCode';
  }
  if (['هاتف', 'جوال', 'تلفون', 'موبايل', 'رقمجوال', 'رقمطوارئ', 'phone', 'mobile', 'tel', 'phonenumber'].some(k => h.includes(k))) {
    return 'phone';
  }
  if (['مربع', 'منطقة', 'المنطقة', 'المربع', 'حي', 'الحي', 'موقع', 'zone', 'area', 'district', 'region'].some(k => h.includes(k))) {
    return 'zone';
  }
  if (['محول', 'المحول', 'مركزي', 'عدادمركزي', 'محطة', 'محولرئيسي', 'transformer', 'substation'].some(k => h.includes(k))) {
    return 'transformer';
  }
  if (['نوعتعرفة', 'تعرفة', 'التعرفة', 'نوعالتعرفة', 'فئة', 'نوعاشتراك', 'tariff', 'tarifftype', 'category'].some(k => h.includes(k))) {
    return 'tariffType';
  }
  if (['حالة', 'الحالة', 'حالةالمشترك', 'وضع', 'status', 'state'].some(k => h.includes(k))) {
    return 'status';
  }
  if (['قراءةابتدائية', 'قراءةإبتدائية', 'قراءةافتتاحية', 'قراءةإفتتاحية', 'القراءةالافتتاحية', 'القراءةالإفتتاحية', 'القراءةالابتدائية', 'القراءةالإبتدائية', 'قراءةبداية', 'قراءةالبداية', 'قراءةاولالمدة', 'قراءةأولالمدة', 'قراءةسابقة', 'قراءةصفر', 'قراءةالعداد', 'قراءةالعدادالابتدائية', 'قراءةالعدادالافتتاحية', 'قراءةالعدادالحالية', 'initialreading', 'openingreading', 'startreading', 'prevreading', 'firstreading', 'meterreading', 'initreading'].some(k => h.includes(k))) {
    return 'initialReading';
  }
  if (['رصيدافتتاحي', 'رصيدإفتتاحي', 'الرصيدالافتتاحي', 'الرصيدالإفتتاحي', 'رصيدسابق', 'رصيدقديم', 'رصيدبداية', 'رصيدأولالمدة', 'openingbalance', 'initialbalance', 'prevbalance', 'startbalance'].some(k => h.includes(k))) {
    return 'openingBalance';
  }
  if (['رصيدحالي', 'رصيد', 'المستحق', 'الرصيد', 'currentbalance', 'balance', 'dueamount'].some(k => h.includes(k))) {
    return 'currentBalance';
  }
  if (['قراءةحالية', 'قراءة', 'القراءة', 'currentreading', 'lastreading'].some(k => h.includes(k))) {
    return 'currentReading';
  }
  if (['خطعرض', 'lat', 'latitude'].some(k => h.includes(k))) {
    return 'lat';
  }
  if (['خططول', 'lng', 'longitude'].some(k => h.includes(k))) {
    return 'lng';
  }
  if (['احداثيات', 'إحداثيات', 'gps', 'coordinates', 'location'].some(k => h.includes(k))) {
    return 'coordinates';
  }

  return null;
}

/**
 * Universal raw objects parser converting any raw JSON/Excel array to validated Subscriber rows.
 */
export function processRawSubscriberRows(
  rawObjects: Record<string, any>[],
  existingSubscribers: Subscriber[]
): ParseResult {
  const existingMeterMap = new Map<string, Subscriber>();
  existingSubscribers.forEach(s => {
    const key = (s.meterNumber || '').trim().toLowerCase();
    if (key) existingMeterMap.set(key, s);
  });

  const seenMetersInFile = new Set<string>();
  const parsedRows: ParsedSubscriberRow[] = [];

  rawObjects.forEach((raw, idx) => {
    // Map headers dynamically
    const mapped: Record<string, any> = {};
    for (const [key, value] of Object.entries(raw)) {
      const matchedField = matchHeaderField(key);
      if (matchedField) {
        mapped[matchedField] = value;
      }
    }

    const name = String(mapped.name ?? raw.name ?? raw.Name ?? raw['اسم المشترك'] ?? raw['الاسم'] ?? '').trim();
    let meterNumber = String(mapped.meterNumber ?? raw.meterNumber ?? raw.meter ?? raw['رقم العداد'] ?? raw['العداد'] ?? '').trim();
    let phone = String(mapped.phone ?? raw.phone ?? raw['رقم الهاتف'] ?? raw['الجوال'] ?? '').trim();
    const zone = String(mapped.zone ?? raw.zone ?? raw['المربع الجغرافي'] ?? raw['المنطقة'] ?? 'المنطقة (أ) - وسط المدينة').trim();
    const transformer = String(mapped.transformer ?? raw.transformer ?? raw['المحول'] ?? '').trim();
    const tariffRaw = String(mapped.tariffType ?? raw.tariffType ?? raw['نوع التعرفة'] ?? 'residential').trim();
    const statusRaw = String(mapped.status ?? raw.status ?? raw['الحالة'] ?? 'active').trim();
    const subscriberCode = String(mapped.subscriberCode ?? raw.subscriberCode ?? raw['كود المشترك'] ?? '').trim();

    const initialReading = Number(mapped.initialReading ?? raw.initialReading ?? raw.openingReading ?? raw['القراءة الافتتاحية'] ?? raw['القراءة الإفتتاحية'] ?? raw['القراءة الابتدائية'] ?? raw['القراءة الإبتدائية'] ?? raw['قراءة البداية'] ?? raw['قراءة أول المدة'] ?? raw['قراءة العداد'] ?? raw['القراءة'] ?? 0) || 0;
    const openingBalance = Number(mapped.openingBalance ?? raw.openingBalance ?? raw.initialBalance ?? raw['الرصيد الافتتاحي'] ?? raw['الرصيد الإفتتاحي'] ?? raw['الرصيد السابق'] ?? raw['رصيد البداية'] ?? raw['الرصيد'] ?? 0) || 0;
    const currentBalance = Number(mapped.currentBalance ?? raw.currentBalance ?? raw['الرصيد المستحق الحالي'] ?? openingBalance) || openingBalance;

    // Handle Coordinates if provided
    let coordinates: { lat: number; lng: number } | undefined;
    if (mapped.lat && mapped.lng) {
      coordinates = { lat: Number(mapped.lat), lng: Number(mapped.lng) };
    } else if (mapped.coordinates) {
      const parts = String(mapped.coordinates).split(/[,;]/);
      if (parts.length >= 2) {
        coordinates = { lat: Number(parts[0].trim()), lng: Number(parts[1].trim()) };
      }
    }

    const errors: string[] = [];
    if (!name) errors.push('اسم المشترك مفقود');
    if (!meterNumber) errors.push('رقم العداد مفقود');

    // Duplicate checks
    const meterLower = meterNumber.toLowerCase();
    const isDuplicateInFile = Boolean(meterLower && seenMetersInFile.has(meterLower));
    if (meterLower) seenMetersInFile.add(meterLower);

    const existingSub = meterLower ? existingMeterMap.get(meterLower) : undefined;
    const isExistingInDb = Boolean(existingSub);

    const isValid = errors.length === 0;

    parsedRows.push({
      rawIndex: idx + 1,
      subscriberCode: subscriberCode || undefined,
      name: name || 'مشترك غير معروف',
      phone: phone || '',
      meterNumber: meterNumber || `M-TEMP-${idx + 1}`,
      zone: zone || 'المنطقة الرئيسية',
      transformer: transformer || '',
      tariffType: normalizeTariff(tariffRaw),
      status: normalizeStatus(statusRaw),
      initialReading,
      openingBalance,
      currentBalance,
      coordinates,
      isValid,
      errors,
      isDuplicateInFile,
      isExistingInDb,
      existingSubscriber: existingSub
    });
  });

  const validCount = parsedRows.filter(r => r.isValid && !r.isDuplicateInFile).length;
  const errorCount = parsedRows.filter(r => !r.isValid).length;
  const duplicateInFileCount = parsedRows.filter(r => r.isDuplicateInFile).length;
  const existingInDbCount = parsedRows.filter(r => r.isExistingInDb).length;

  return {
    rows: parsedRows,
    totalParsed: parsedRows.length,
    validCount,
    errorCount,
    duplicateInFileCount,
    existingInDbCount
  };
}

/**
 * Universal Parser for text/string content (pasted CSV, TSV, JSON, etc.)
 */
export function parseSubscribersFromText(
  text: string,
  existingSubscribers: Subscriber[]
): ParseResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { rows: [], totalParsed: 0, validCount: 0, errorCount: 0, duplicateInFileCount: 0, existingInDbCount: 0 };
  }

  // Try parsing JSON first
  if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
    try {
      const parsed = JSON.parse(trimmed);
      const list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.subscribers) ? parsed.subscribers : []);
      if (list.length > 0) {
        return processRawSubscriberRows(list, existingSubscribers);
      }
    } catch {
      // Continue to CSV / TSV
    }
  }

  // Parse lines
  const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return { rows: [], totalParsed: 0, validCount: 0, errorCount: 0, duplicateInFileCount: 0, existingInDbCount: 0 };
  }

  const delimiter = detectDelimiter(lines);
  const headerTokens = parseCSVLine(lines[0], delimiter);

  const rawObjects: Record<string, any>[] = [];

  // Check if first line is a header
  const hasMatchedHeader = headerTokens.some(t => matchHeaderField(t) !== null);

  const startIndex = hasMatchedHeader ? 1 : 0;
  const headers = hasMatchedHeader ? headerTokens : ['name', 'phone', 'meterNumber', 'zone', 'transformer', 'tariffType', 'initialReading', 'openingBalance'];

  for (let i = startIndex; i < lines.length; i++) {
    const tokens = parseCSVLine(lines[i], delimiter);
    if (tokens.length === 0 || (tokens.length === 1 && !tokens[0])) continue;

    const rowObj: Record<string, any> = {};
    headers.forEach((h, hIdx) => {
      rowObj[h] = tokens[hIdx] ?? '';
    });

    rawObjects.push(rowObj);
  }

  return processRawSubscriberRows(rawObjects, existingSubscribers);
}

/**
 * Universal File Reader and Parser for File objects (.xlsx, .xls, .csv, .tsv, .json, .txt)
 */
export async function parseSubscribersFromFile(
  file: File,
  existingSubscribers: Subscriber[]
): Promise<ParseResult> {
  const fileName = file.name.toLowerCase();

  // Excel binary files (.xlsx, .xls, .ods)
  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.ods')) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawObjects = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
    return processRawSubscriberRows(rawObjects, existingSubscribers);
  }

  // Text/CSV/JSON files
  const text = await file.text();
  return parseSubscribersFromText(text, existingSubscribers);
}
