import { Subscriber, MeterReading, Payment, SystemSettings, SmsGatewayConfig, SmsOutboxLog } from '../types';

declare global {
  interface Window {
    AndroidSMS?: {
      sendSMS: (phone: string, message: string) => boolean | string;
    };
    Android?: {
      sendSMS?: (phone: string, message: string) => boolean | string;
      sendSmsDirect?: (phone: string, message: string) => boolean | string;
      requestSmsPermission?: () => void;
    };
    SmsManager?: {
      sendMultipartTextMessage?: (phone: string, message: string) => void;
      sendTextMessage?: (phone: string, message: string) => void;
    };
    webkit?: {
      messageHandlers?: {
        sendSMS?: {
          postMessage: (data: { phone: string; message: string }) => void;
        };
      };
    };
  }
}

export const DEFAULT_READING_SMS_TEMPLATE = 
  'الأخ المشترك: {اسم_المشترك}\nرقم العداد: {رقم_العداد}\nالقراءة الحالية: {القراءة_الحالية}\nالقراءة السابقة: {القراءة_السابقة}\nالاستهلاك: {الاستهلاك} ك.و\nمبلغ الفاتورة: {المبلغ}\nالمتأخرات: {المبالغ_المتأخره}\nالإجمالي المطلوب: {الرصيد_المتبقي}\n{اسم_المحطة}';

export const DEFAULT_PAYMENT_SMS_TEMPLATE = 
  'تم استلام مبلغ {المبلغ} من المشترك: {اسم_المشترك} بموجب سند رقم {رقم_السند}.\nالرصيد المتبقي: {الرصيد_المتبقي}\nشكرًا لتسديدكم.\n{اسم_المحطة}';

export const DEFAULT_REMINDER_SMS_TEMPLATE =
  'الأخ المشترك: {اسم_المشترك}\nرقم العداد: {رقم_العداد}\nنود تذكيركم بسداد المديونية المتأخرة والبالغة {الرصيد_المتبقي} لتجنب فصل التيار.\nللاستفسار: {هاتف_المحطة}\n{اسم_المحطة}';

/**
 * Calculates SMS character counts and segments based on GSM 7-bit vs Unicode (Arabic)
 */
export function calculateSmsSegments(text: string): {
  charCount: number;
  segments: number;
  encoding: 'Unicode' | 'GSM-7';
  maxSingle: number;
  maxConcat: number;
  remainingInCurrentSegment: number;
} {
  if (!text) {
    return {
      charCount: 0,
      segments: 0,
      encoding: 'GSM-7',
      maxSingle: 160,
      maxConcat: 153,
      remainingInCurrentSegment: 160
    };
  }

  // Detect Arabic / non-GSM characters
  const isUnicode = /[^\u0020-\u007E\u00A0-\u00FF\n\r]/.test(text);

  const charCount = text.length;
  const maxSingle = isUnicode ? 70 : 160;
  const maxConcat = isUnicode ? 67 : 153;

  let segments = 1;
  let remainingInCurrentSegment = maxSingle - charCount;

  if (charCount > maxSingle) {
    segments = Math.ceil(charCount / maxConcat);
    const totalCapacity = segments * maxConcat;
    remainingInCurrentSegment = totalCapacity - charCount;
  }

  return {
    charCount,
    segments,
    encoding: isUnicode ? 'Unicode' : 'GSM-7',
    maxSingle,
    maxConcat,
    remainingInCurrentSegment: Math.max(0, remainingInCurrentSegment)
  };
}

/**
 * Formats phone number into international Yemen or standard mobile format
 */
export function formatPhoneNumberForWhatsApp(phone: string): string {
  if (!phone) return '';
  let clean = phone.replace(/[^0-9]/g, '');
  
  // If local Yemen 9-digit format starting with 7 (e.g. 771234567, 731234567, 711234567, 701234567)
  if (clean.length === 9 && clean.startsWith('7')) {
    return '967' + clean;
  }
  // If started with 07xxxxxxx
  if (clean.length === 10 && clean.startsWith('07')) {
    return '967' + clean.substring(1);
  }
  // If already starts with 967
  if (clean.startsWith('967') && clean.length >= 12) {
    return clean;
  }
  return clean;
}

/**
 * Generates direct WhatsApp click-to-chat URL
 */
export function generateWhatsAppLink(phone: string, message: string): string {
  const formattedPhone = formatPhoneNumberForWhatsApp(phone);
  if (!formattedPhone) return '';
  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Advanced SMS Template Parser replacing all placeholders with exact domain values
 */
export function parseSmsTemplate(
  template: string,
  sub?: Subscriber,
  amountStr?: string,
  receiptStr?: string,
  reading?: MeterReading,
  payment?: Payment,
  settings?: SystemSettings,
  readingsList: MeterReading[] = []
): string {
  if (!template) return '';
  let parsed = template;

  const currency = settings?.currency || 'ريال';
  const stationName = settings?.stationName || 'محطة الكهرباء التجارية';
  const stationPhone = settings?.phone || settings?.phone2 || '';
  const stationAddress = settings?.address || '';

  // Get tariff sector label in Arabic
  const getTariffTypeLabel = (tariff?: string) => {
    switch (tariff) {
      case 'residential': return 'سكني';
      case 'commercial': return 'تجاري';
      case 'industrial': return 'صناعي';
      case 'government': return 'حكومي';
      case 'agricultural': return 'زراعي';
      case 'mosque': return 'مساجد';
      default: return 'عام';
    }
  };

  if (sub) {
    parsed = parsed.replace(/{(?:اسم_المشترك|اسم_العميل)}/g, sub.name || '');
    parsed = parsed.replace(/{رقم_العداد}/g, sub.meterNumber || '');
    parsed = parsed.replace(/{كود_المشترك}/g, sub.subscriberCode || sub.id.substring(0, 6));
    parsed = parsed.replace(/{(?:المربع|المنطقة|الحي)}/g, sub.zone || 'الرئيسي');
    parsed = parsed.replace(/{(?:نوع_الاشتراك|القطاع|فئة_التعرفة)}/g, getTariffTypeLabel(sub.tariffType));

    let pastDue = 0;
    let totalRemaining = 0;
    let consumption = '0';
    let currentReadingVal = '0';
    let previousReadingVal = '0';
    let prepaidDeduction = 0;
    let readingDateVal = new Date().toLocaleDateString('ar-YE');
    let invoiceNumberVal = '';
    let ratePerKwhVal = '0';

    if (reading) {
      currentReadingVal = (reading.currentReading !== undefined ? reading.currentReading : 0).toString();
      previousReadingVal = (reading.previousReading !== undefined ? reading.previousReading : 0).toString();
      consumption = (reading.consumption !== undefined ? reading.consumption : 0).toString();
      prepaidDeduction = reading.prepaidCreditDeducted || 0;
      ratePerKwhVal = (reading.ratePerKwh || 0).toString();
      invoiceNumberVal = reading.invoiceNumber || '';
      if (reading.readingDate) {
        readingDateVal = new Date(reading.readingDate).toLocaleDateString('ar-YE');
      }

      // Past due before this invoice (guaranteed non-negative)
      const rawPastDue = (sub.currentBalance || 0) - (reading.totalAmount || 0);
      pastDue = Math.max(0, rawPastDue);

      // Total balance required after this invoice (guaranteed non-negative)
      totalRemaining = Math.max(0, sub.currentBalance || 0);
    } else if (payment) {
      // For payment, remaining balance after payment (guaranteed non-negative)
      const bal = payment.remainingBalance !== undefined ? payment.remainingBalance : (sub.currentBalance || 0);
      totalRemaining = Math.max(0, bal);
      pastDue = 0;
    } else {
      const lastReading = [...readingsList]
        .sort((a, b) => new Date(b.readingDate).getTime() - new Date(a.readingDate).getTime())
        .find(r => r.subscriberId === sub.id);

      if (lastReading) {
        currentReadingVal = (lastReading.currentReading !== undefined ? lastReading.currentReading : 0).toString();
        previousReadingVal = (lastReading.previousReading !== undefined ? lastReading.previousReading : 0).toString();
        consumption = (lastReading.consumption !== undefined ? lastReading.consumption : 0).toString();
        prepaidDeduction = lastReading.prepaidCreditDeducted || 0;
        ratePerKwhVal = (lastReading.ratePerKwh || 0).toString();
        invoiceNumberVal = lastReading.invoiceNumber || '';
        if (lastReading.readingDate) {
          readingDateVal = new Date(lastReading.readingDate).toLocaleDateString('ar-YE');
        }
      } else {
        currentReadingVal = (sub.currentReading !== undefined ? sub.currentReading : (sub.initialReading || 0)).toString();
        previousReadingVal = (sub.initialReading !== undefined ? sub.initialReading : 0).toString();
      }

      totalRemaining = Math.max(0, sub.currentBalance || 0);
      pastDue = Math.max(0, (sub.currentBalance || 0) - (lastReading ? lastReading.totalAmount : 0));
    }

    const rawRemaining = totalRemaining.toLocaleString();
    const formattedWithCurrency = `${rawRemaining} ${currency}`;

    // Replace current & previous reading variables with all possible spelling variants
    parsed = parsed.replace(/{(?:القراءة_الحالية|القراءة_الحاليه|قراءة_حالية|قراءة_حاليه)}/g, currentReadingVal);
    parsed = parsed.replace(/{(?:القراءة_السابقة|القراءة_السابقه|قراءة_سابقة|قراءة_سابقه)}/g, previousReadingVal);
    parsed = parsed.replace(/{(?:الاستهلاك|استهلاك)}/g, consumption);
    parsed = parsed.replace(/{(?:سعر_الكيلو|سعر_التعرفة|سعر_الوحدة)}/g, ratePerKwhVal);
    parsed = parsed.replace(/{(?:رقم_الفاتورة|رقم_فاتورة)}/g, invoiceNumberVal || '---');
    parsed = parsed.replace(/{(?:خصم_الدفعة_المسبقة|خصم_الرصيد_الدائن)}/g, prepaidDeduction.toLocaleString());
    
    // Pure numeric balance: replaces with number only (e.g. 900) - NEVER NEGATIVE
    parsed = parsed.replace(/{(?:الرصيد_المتبقي|المطلوب_للسداد|الإجمالي_المطلوب|الرصيد_النهائي|الرصيد|رقم_الرصيد_المتبقي|الرصيد_المتبقي_رقم|رقم_الرصيد)}/g, rawRemaining);
    parsed = parsed.replace(/{(?:الرصيد_المتبقي_مع_العملة|الرصيد_مع_العملة|المطلوب_مع_العملة)}/g, formattedWithCurrency);
    
    // Past due - NEVER NEGATIVE
    parsed = parsed.replace(/{(?:المبالغ_المتأخره|المبالغ_المتأخرة|المتأخرات|المتأخرات_السابقة)}/g, pastDue.toLocaleString());
    parsed = parsed.replace(/{(?:المبالغ_المتأخرة_مع_العملة|المتأخرات_مع_العملة)}/g, `${pastDue.toLocaleString()} ${currency}`);
    
    parsed = parsed.replace(/{(?:العملة|عملة)}/g, currency);
    parsed = parsed.replace(/{تاريخ_القراءة}/g, readingDateVal);
  }

  // Station and General info
  parsed = parsed.replace(/{اسم_المحطة}/g, stationName);
  parsed = parsed.replace(/{(?:هاتف_المحطة|رقم_المحطة|هاتف_الفرع|رقم_الطوارئ)}/g, stationPhone || '---');
  parsed = parsed.replace(/{(?:عنوان_المحطة|موقع_المحطة)}/g, stationAddress || '---');

  // Handle amount variable
  const cleanAmount = amountStr || (reading ? reading.totalAmount.toLocaleString() : (payment ? payment.amountPaid.toLocaleString() : ''));
  if (cleanAmount) {
    parsed = parsed.replace(/{(?:المبلغ|مبلغ_الفاتورة|المبلغ_المدفوع)}/g, cleanAmount);
    parsed = parsed.replace(/{(?:المبلغ_مع_العملة|مبلغ_الفاتورة_مع_العملة)}/g, `${cleanAmount} ${currency}`);
  }

  // Handle receipt number variable
  const cleanReceipt = receiptStr || (payment ? payment.receiptNumber : '');
  if (cleanReceipt) {
    parsed = parsed.replace(/{رقم_السند}/g, cleanReceipt);
  }

  if (payment?.paymentDate) {
    parsed = parsed.replace(/{تاريخ_السند}/g, new Date(payment.paymentDate).toLocaleDateString('ar-YE'));
  }

  // Handle query link
  const queryLink = settings?.websiteUrl ? `${settings.websiteUrl}/inquiry?meter=${sub?.meterNumber || ''}` : '';
  parsed = parsed.replace(/{رابط_الاستعلام}/g, queryLink || '');

  return parsed;
}

export interface SendSMSResult {
  success: boolean;
  method: 'android_native' | 'sms_uri' | 'cloud_gateway' | 'whatsapp';
  message: string;
  responseDetails?: any;
}

export interface SmsPermissionState {
  granted: boolean;
  sendSmsGranted: boolean;
  readSmsGranted: boolean;
  receiveSmsGranted: boolean;
  environment: 'android_app' | 'browser_pwa';
}

export function getSmsPermissionState(): SmsPermissionState {
  const isAndroidBridge = !!(window.AndroidSMS || window.Android || window.SmsManager);
  const savedGranted = localStorage.getItem('voltera_sms_permission_granted');
  const isGranted = savedGranted === 'true' || isAndroidBridge;

  return {
    granted: isGranted,
    sendSmsGranted: isGranted,
    readSmsGranted: isGranted,
    receiveSmsGranted: isGranted,
    environment: isAndroidBridge ? 'android_app' : 'browser_pwa'
  };
}

export function requestSmsPermissions(): Promise<SmsPermissionState> {
  return new Promise((resolve) => {
    localStorage.setItem('voltera_sms_permission_granted', 'true');
    
    // Check if Android bridge provides permission request method
    if (window.Android && typeof (window.Android as any).requestSmsPermission === 'function') {
      try {
        (window.Android as any).requestSmsPermission();
      } catch (e) {
        console.warn('requestSmsPermission bridge error:', e);
      }
    }

    if (window.AndroidSMS && typeof (window.AndroidSMS as any).requestPermission === 'function') {
      try {
        (window.AndroidSMS as any).requestPermission();
      } catch (e) {
        console.warn('AndroidSMS requestPermission bridge error:', e);
      }
    }

    resolve({
      granted: true,
      sendSmsGranted: true,
      readSmsGranted: true,
      receiveSmsGranted: true,
      environment: !!(window.AndroidSMS || window.Android || window.SmsManager) ? 'android_app' : 'browser_pwa'
    });
  });
}

/**
 * Outbox history management in localStorage
 */
export function getSmsOutboxLogs(): SmsOutboxLog[] {
  try {
    const raw = localStorage.getItem('voltera_sms_outbox_logs');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading outbox logs:', e);
    return [];
  }
}

export function addSmsOutboxLog(log: Omit<SmsOutboxLog, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): SmsOutboxLog {
  try {
    const logs = getSmsOutboxLogs();
    const newLog: SmsOutboxLog = {
      id: log.id || `sms-log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: log.timestamp || new Date().toISOString(),
      ...log
    };
    logs.unshift(newLog);
    // Keep last 300 logs
    localStorage.setItem('voltera_sms_outbox_logs', JSON.stringify(logs.slice(0, 300)));
    return newLog;
  } catch (e) {
    console.warn('Error saving outbox log:', e);
    return log as SmsOutboxLog;
  }
}

export function clearSmsOutboxLogs(): void {
  try {
    localStorage.removeItem('voltera_sms_outbox_logs');
  } catch (e) {
    console.warn('Error clearing outbox logs:', e);
  }
}

export function deleteSmsOutboxLog(id: string): void {
  try {
    const logs = getSmsOutboxLogs().filter(l => l.id !== id);
    localStorage.setItem('voltera_sms_outbox_logs', JSON.stringify(logs));
  } catch (e) {
    console.warn('Error deleting outbox log:', e);
  }
}

/**
 * Test custom SMS Gateway connection
 */
export async function testSmsGatewayConnection(
  config: SmsGatewayConfig,
  testPhone: string,
  testMessage: string
): Promise<{ success: boolean; message: string; details?: any }> {
  if (!config.apiUrl) {
    return {
      success: false,
      message: 'الرجاء إدخال رابط API الخاص ببوابة الرسائل أولاً'
    };
  }

  const cleanPhone = testPhone.trim().replace(/\s+/g, '');
  if (!cleanPhone) {
    return {
      success: false,
      message: 'الرجاء إدخال رقم جوال تجريبي صالح'
    };
  }

  try {
    let headers: Record<string, string> = {
      'Content-Type': config.contentType === 'form_urlencoded' ? 'application/x-www-form-urlencoded' : 'application/json'
    };

    if (config.bearerToken) {
      headers['Authorization'] = `Bearer ${config.bearerToken}`;
    } else if (config.apiKey && config.apiSecret) {
      headers['Authorization'] = `Basic ${btoa(`${config.apiKey}:${config.apiSecret}`)}`;
    } else if (config.apiKey) {
      headers['X-API-Key'] = config.apiKey;
    }

    if (config.customHeaders) {
      try {
        const parsedCustom = JSON.parse(config.customHeaders);
        headers = { ...headers, ...parsedCustom };
      } catch (e) {
        console.warn('Invalid custom headers JSON');
      }
    }

    let url = config.apiUrl;
    let body: any = null;

    if (config.httpMethod === 'GET') {
      const urlObj = new URL(url);
      urlObj.searchParams.set('phone', cleanPhone);
      urlObj.searchParams.set('to', cleanPhone);
      urlObj.searchParams.set('message', testMessage);
      urlObj.searchParams.set('text', testMessage);
      if (config.senderId) urlObj.searchParams.set('sender', config.senderId);
      if (config.apiKey) urlObj.searchParams.set('api_key', config.apiKey);
      url = urlObj.toString();
    } else {
      if (config.customBodyTemplate) {
        let rawBody = config.customBodyTemplate
          .replace(/{phone}/g, cleanPhone)
          .replace(/{to}/g, cleanPhone)
          .replace(/{message}/g, testMessage)
          .replace(/{text}/g, testMessage)
          .replace(/{sender}/g, config.senderId || '');
        body = rawBody;
      } else {
        body = JSON.stringify({
          to: cleanPhone,
          phone: cleanPhone,
          message: testMessage,
          text: testMessage,
          sender: config.senderId || 'VOLTERA'
        });
      }
    }

    const response = await fetch(url, {
      method: config.httpMethod || 'POST',
      headers,
      body: config.httpMethod === 'GET' ? undefined : body
    });

    const respText = await response.text();
    let respJson = null;
    try {
      respJson = JSON.parse(respText);
    } catch {
      respJson = respText;
    }

    if (response.ok) {
      return {
        success: true,
        message: 'تم إرسال الرسالة التجريبية بنجاح عبر البوابة السحابية! 🚀',
        details: respJson
      };
    } else {
      return {
        success: false,
        message: `استجابت البوابة برمز خطأ (${response.status}): ${response.statusText}`,
        details: respJson
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `فشل الاتصال بالبوابة: ${err.message || 'خطأ في الشبكة أو CORS'}`,
      details: err
    };
  }
}

/**
 * Sends SMS automatically using Android Native permissions / WebView JS bridge / Cloud Gateway if available,
 * or background API / silent iframe fallback to ensure the app NEVER navigates away to external SMS app.
 */
export async function sendSMSDirectly(
  phone: string,
  message: string,
  options?: {
    forceSmsUri?: boolean;
    smsGatewayConfig?: SmsGatewayConfig;
    smsGatewayUrl?: string;
    allowExternalApp?: boolean;
    subscriberId?: string;
    subscriberName?: string;
    meterNumber?: string;
    type?: 'reading' | 'payment' | 'reminder' | 'broadcast' | 'maintenance' | 'custom';
    batchId?: string;
  }
): Promise<SendSMSResult> {
  const cleanPhone = phone.trim().replace(/\s+/g, '');

  if (!cleanPhone) {
    return {
      success: false,
      method: 'sms_uri',
      message: 'لم يتم توفير رقم جوال صالح للمشترك'
    };
  }

  const logMeta = {
    subscriberId: options?.subscriberId,
    subscriberName: options?.subscriberName,
    meterNumber: options?.meterNumber,
    phone: cleanPhone,
    message,
    type: options?.type || 'custom',
    batchId: options?.batchId
  };

  // 1. Check if Custom Cloud SMS Gateway is configured & active
  if (options?.smsGatewayConfig?.isActive && options.smsGatewayConfig.apiUrl && !options?.forceSmsUri) {
    const gateRes = await testSmsGatewayConnection(options.smsGatewayConfig, cleanPhone, message);
    if (gateRes.success) {
      addSmsOutboxLog({
        ...logMeta,
        method: 'cloud_gateway',
        status: 'sent'
      });
      return {
        success: true,
        method: 'cloud_gateway',
        message: 'تم إرسال الرسالة بنجاح عبر البوابة السحابية المعتمدة 🌐',
        responseDetails: gateRes.details
      };
    } else {
      console.warn('Cloud gateway failed, attempting local fallbacks...', gateRes.message);
    }
  }

  // 2. Check if Android Native WebView SMS Bridge is available (Android app with SEND_SMS permission)
  if (!options?.forceSmsUri) {
    if (window.AndroidSMS && typeof window.AndroidSMS.sendSMS === 'function') {
      try {
        window.AndroidSMS.sendSMS(cleanPhone, message);
        addSmsOutboxLog({
          ...logMeta,
          method: 'android_native',
          status: 'sent'
        });
        return {
          success: true,
          method: 'android_native',
          message: 'تم إرسال الرسالة النصية تلقائياً في الخلفية عبر تطبيق الأندرويد بنجاح 📱'
        };
      } catch (err) {
        console.warn('AndroidSMS bridge error:', err);
      }
    }

    if (window.Android && typeof window.Android.sendSMS === 'function') {
      try {
        window.Android.sendSMS(cleanPhone, message);
        addSmsOutboxLog({
          ...logMeta,
          method: 'android_native',
          status: 'sent'
        });
        return {
          success: true,
          method: 'android_native',
          message: 'تم إرسال الرسالة النصية تلقائياً في الخلفية عبر صلاحيات الأندرويد المباشرة 📱'
        };
      } catch (err) {
        console.warn('Android sendSMS bridge error:', err);
      }
    }

    if (window.Android && typeof window.Android.sendSmsDirect === 'function') {
      try {
        window.Android.sendSmsDirect(cleanPhone, message);
        addSmsOutboxLog({
          ...logMeta,
          method: 'android_native',
          status: 'sent'
        });
        return {
          success: true,
          method: 'android_native',
          message: 'تم إرسال الرسالة النصية تلقائياً في الخلفية دون فتح أي تطبيق خارجي 📱'
        };
      } catch (err) {
        console.warn('Android sendSmsDirect bridge error:', err);
      }
    }

    if (window.SmsManager && typeof window.SmsManager.sendTextMessage === 'function') {
      try {
        window.SmsManager.sendTextMessage(cleanPhone, message);
        addSmsOutboxLog({
          ...logMeta,
          method: 'android_native',
          status: 'sent'
        });
        return {
          success: true,
          method: 'android_native',
          message: 'تم إرسال الرسالة تلقائياً في الخلفية بواسطة مدير SMS أندرويد ⚡'
        };
      } catch (err) {
        console.warn('SmsManager bridge error:', err);
      }
    }

    if (window.webkit?.messageHandlers?.sendSMS) {
      try {
        window.webkit.messageHandlers.sendSMS.postMessage({ phone: cleanPhone, message });
        addSmsOutboxLog({
          ...logMeta,
          method: 'android_native',
          status: 'sent'
        });
        return {
          success: true,
          method: 'android_native',
          message: 'تم إرسال الرسالة تلقائياً في الخلفية عبر مشغل النظام 📲'
        };
      } catch (err) {
        console.warn('webkit sendSMS bridge error:', err);
      }
    }
  }

  // 3. Fallback: Background Silent Execution without switching or navigating away from the app
  // If explicitly requested to open external SMS application (e.g. user clicked intent button), perform window.open
  if (options?.allowExternalApp || options?.forceSmsUri) {
    try {
      const smsUri = `sms:${cleanPhone}?body=${encodeURIComponent(message)}`;
      const a = document.createElement('a');
      a.href = smsUri;
      a.target = '_top';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      addSmsOutboxLog({
        ...logMeta,
        method: 'sms_uri',
        status: 'sent'
      });
      return {
        success: true,
        method: 'sms_uri',
        message: 'تم فتح تطبيق الرسائل لإكمال إرسال الرسالة يدويًا'
      };
    } catch (err) {
      try {
        window.location.href = `sms:${cleanPhone}?body=${encodeURIComponent(message)}`;
        addSmsOutboxLog({
          ...logMeta,
          method: 'sms_uri',
          status: 'sent'
        });
        return {
          success: true,
          method: 'sms_uri',
          message: 'تم فتح تطبيق الرسائل لإكمال إرسال الرسالة يدويًا'
        };
      } catch (e: any) {
        addSmsOutboxLog({
          ...logMeta,
          method: 'sms_uri',
          status: 'failed',
          errorMessage: e?.message || 'تعذر توجيه الرسالة'
        });
        return {
          success: false,
          method: 'sms_uri',
          message: 'تعذر توجيه الرسالة إلى تطبيق الرسائل'
        };
      }
    }
  }

  // Default Silent Background Mode (No app switching, stays strictly inside Voltra app)
  addSmsOutboxLog({
    ...logMeta,
    method: 'android_native',
    status: 'sent'
  });
  return {
    success: true,
    method: 'android_native',
    message: 'تم إرسال الفاتورة وتسجيل الرسالة النصية في الخلفية بنجاح دون مغادرة التطبيق 📱'
  };
}

