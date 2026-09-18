import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Subscriber, MeterReading, Payment, SystemSettings, User, SmsTemplate } from '../types';
import { parseSmsTemplate, sendSMSDirectly } from '../utils/smsService';
import { deleteFailedSmsFromCloud, clearAllFailedSmsFromCloud, syncSmsTemplateToCloud, deleteSmsTemplateFromCloud, clearAllSmsTemplatesFromCloud, syncBulkSmsTemplatesToCloud, setLocalData } from '../lib/database';
import { SAMPLE_SMS_TEMPLATES } from '../initialData';
import { SmsOutboxView } from './sms/SmsOutboxView';
import { SmsGatewaySettings } from './sms/SmsGatewaySettings';
import { SmsPhoneHealthView } from './sms/SmsPhoneHealthView';
import { SmsBroadcastView } from './sms/SmsBroadcastView';
import { AndroidAppCenter } from './AndroidAppCenter';
import {
  FileText, Database, RefreshCw, Plus, Trash2, CheckCircle2,
  Users, Check, AlertCircle, AlertTriangle, Edit2, Send,
  Search, Eye, ExternalLink, MessageSquare, Info, X, Copy,
  Smartphone, Cloud, Radio, Sliders, History, BookOpen, Clock, Sparkles
} from 'lucide-react';

interface AdminSMSCenterProps {
  activeSection: string;
  subscribers: Subscriber[];
  readings: MeterReading[];
  payments: Payment[];
  settings: SystemSettings;
  currentUser: User;
  smsTemplates: SmsTemplate[];
  onUpdateSettings?: (settings: SystemSettings) => void;
  onUpdateSmsTemplates?: (templates: SmsTemplate[]) => void;
  onSaveSmsTemplate?: (template: SmsTemplate) => void;
  onDeleteSmsTemplate?: (id: string) => void;
  onClearAllSmsTemplates?: () => void;
  onClearAllFailedSms?: () => void;
  onDeleteFailedSms?: (id: string, type?: 'reading' | 'payment') => void;
  onUpdateReadings: (readings: MeterReading[]) => void;
  onUpdatePayments: (payments: Payment[]) => void;
  onUpdateSubscribers?: (subs: Subscriber[]) => void;
  onAddAuditLog?: (log: any) => void;
  setActiveSection: (section: string) => void;
}

export const AdminSMSCenter: React.FC<AdminSMSCenterProps> = ({
  activeSection,
  subscribers,
  readings,
  payments,
  settings,
  currentUser,
  smsTemplates,
  onUpdateSettings,
  onUpdateSmsTemplates,
  onSaveSmsTemplate,
  onDeleteSmsTemplate,
  onClearAllSmsTemplates,
  onClearAllFailedSms,
  onDeleteFailedSms,
  onUpdateReadings,
  onUpdatePayments,
  onUpdateSubscribers,
  onAddAuditLog,
  setActiveSection,
}) => {
  // SMS Template Management State
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTemplateContent, setEditingTemplateContent] = useState<string>('');
  const [showAddTemplateModal, setShowAddTemplateModal] = useState<boolean>(false);
  const [newTemplateName, setNewTemplateName] = useState<string>('');
  const [newTemplateContent, setNewTemplateContent] = useState<string>('');
  const [newTemplateType, setNewTemplateType] = useState<'reading' | 'payment' | 'reminder' | 'custom'>('custom');
  const [smsSaveSuccessNotice, setSmsSaveSuccessNotice] = useState<string | null>(null);

  // Failed SMS State & Batch Sender
  const [failedReadingTemplateId, setFailedReadingTemplateId] = useState<string>('1');
  const [failedPaymentTemplateId, setFailedPaymentTemplateId] = useState<string>('2');
  const [failedReadingSearch, setFailedReadingSearch] = useState<string>('');
  const [failedPaymentSearch, setFailedPaymentSearch] = useState<string>('');
  const [failedBatchType, setFailedBatchType] = useState<'reading' | 'payment' | null>(null);
  const [, setFailedBatchIndex] = useState<number>(0);

  // Custom SMS State
  const [smsMessage, setSmsMessage] = useState<string>('');
  const [smsSelectedSubs, setSmsSelectedSubs] = useState<string[]>([]);
  const [smsSearchQuery, setSmsSearchQuery] = useState<string>('');
  const [isSendingSequence, setIsSendingSequence] = useState<boolean>(false);
  const [smsQueueIndex, setSmsQueueIndex] = useState<number>(0);

  // Preview SMS Modal State
  const [previewSmsModal, setPreviewSmsModal] = useState<{
    title: string;
    recipientName: string;
    phone: string;
    content: string;
    templateName: string;
    onSend?: () => void;
  } | null>(null);

  const logAction = (action: string, details: string) => {
    if (onAddAuditLog) {
      onAddAuditLog({
        id: `audit-${Date.now()}`,
        userId: currentUser.id,
        username: currentUser.name || currentUser.username,
        action,
        details,
        timestamp: new Date().toISOString().substring(0, 19).replace('T', ' ')
      });
    }
  };

  const getActiveReadingTemplate = (templateId?: string): SmsTemplate => {
    if (templateId) {
      const found = smsTemplates.find(t => t.id === templateId);
      if (found) return found;
    }
    const currentFailed = smsTemplates.find(t => t.id === failedReadingTemplateId);
    if (currentFailed) return currentFailed;
    const byType = smsTemplates.find(t => t.type === 'reading');
    if (byType) return byType;
    const byId1 = smsTemplates.find(t => t.id === '1');
    if (byId1) return byId1;
    return {
      id: '1',
      name: 'إشعار فاتورة جديدة',
      content: 'الأخ المشترك: {اسم_المشترك}\nرقم العداد: {رقم_العداد}\nالقراءة الحالية: {القراءة_الحالية}\nالقراءة السابقة: {القراءة_السابقة}\nالاستهلاك: {الاستهلاك} ك.و\nمبلغ الفاتورة: {المبلغ}\nالمتأخرات: {المبالغ_المتأخره}\nالإجمالي المطلوب: {الرصيد_المتبقي}',
      type: 'reading'
    };
  };

  const getActivePaymentTemplate = (templateId?: string): SmsTemplate => {
    if (templateId) {
      const found = smsTemplates.find(t => t.id === templateId);
      if (found) return found;
    }
    const currentFailed = smsTemplates.find(t => t.id === failedPaymentTemplateId);
    if (currentFailed) return currentFailed;
    const byType = smsTemplates.find(t => t.type === 'payment');
    if (byType) return byType;
    const byId2 = smsTemplates.find(t => t.id === '2');
    if (byId2) return byId2;
    return {
      id: '2',
      name: 'سند قبض',
      content: 'تم استلام مبلغ {المبلغ} من المشترك: {اسم_المشترك} بموجب سند رقم {رقم_السند}.\nالرصيد المتبقي: {الرصيد_المتبقي}\nشكرًا لتسديدكم.',
      type: 'payment'
    };
  };

  const buildReadingSmsMessage = (r: MeterReading, templateId?: string): { msg: string, template: SmsTemplate, sub?: Subscriber } => {
    const sub = subscribers.find(s => s.id === r.subscriberId);
    const template = getActiveReadingTemplate(templateId);
    const msg = parseSmsTemplate(
      template.content,
      sub,
      r.totalAmount.toLocaleString(),
      undefined,
      r,
      undefined,
      settings,
      readings
    );
    return { msg, template, sub };
  };

  const buildPaymentSmsMessage = (p: Payment, templateId?: string): { msg: string, template: SmsTemplate, sub?: Subscriber } => {
    const sub = subscribers.find(s => s.id === p.subscriberId);
    const template = getActivePaymentTemplate(templateId);
    const msg = parseSmsTemplate(
      template.content,
      sub,
      p.amountPaid.toLocaleString(),
      p.receiptNumber,
      undefined,
      p,
      settings,
      readings
    );
    return { msg, template, sub };
  };

  const handleSendReadingSMS = async (r: MeterReading, forceManual: boolean = false, templateId?: string) => {
    const { msg, sub } = buildReadingSmsMessage(r, templateId);
    const phone = sub?.phone || '';
    if (!phone) {
      alert(`لا يوجد رقم هاتف مسجل للمشترك (${r.subscriberName})`);
      return;
    }
    
    sendSMSDirectly(phone, msg, forceManual ? { forceSmsUri: true, allowExternalApp: true } : undefined);
    
    const updatedReadings = readings.map(reading => 
      reading.id === r.id ? { ...reading, smsSent: true } : reading
    );
    onUpdateReadings(updatedReadings);

    if (onDeleteFailedSms) {
      onDeleteFailedSms(r.id, 'reading');
    } else {
      try {
        await deleteFailedSmsFromCloud(r.id, 'reading');
      } catch (e) {
        console.error("Error removing failed SMS from cloud:", e);
      }
    }
  };

  const handleSendPaymentSMS = async (p: Payment, forceManual: boolean = false, templateId?: string) => {
    const { msg, sub } = buildPaymentSmsMessage(p, templateId);
    const phone = sub?.phone || '';
    if (!phone) {
      alert(`لا يوجد رقم هاتف مسجل للمشترك (${p.subscriberName})`);
      return;
    }
    
    sendSMSDirectly(phone, msg, forceManual ? { forceSmsUri: true, allowExternalApp: true } : undefined);
    
    const updatedPayments = payments.map(payment => 
      payment.id === p.id ? { ...payment, smsSent: true } : payment
    );
    onUpdatePayments(updatedPayments);

    if (onDeleteFailedSms) {
      onDeleteFailedSms(p.id, 'payment');
    } else {
      try {
        await deleteFailedSmsFromCloud(p.id, 'payment');
      } catch (e) {
        console.error("Error removing failed SMS from cloud:", e);
      }
    }
  };

  const handleDeleteFailedReadingSMS = async (r: MeterReading) => {
    if (confirm(`هل تريد حذف إشعار الفاتورة للمشترك (${r.subscriberName}) من قاعدة البيانات؟`)) {
      const updatedReadings = readings.map(reading => 
        reading.id === r.id ? { ...reading, smsSent: true } : reading
      );
      onUpdateReadings(updatedReadings);

      if (onDeleteFailedSms) {
        onDeleteFailedSms(r.id, 'reading');
      } else {
        await deleteFailedSmsFromCloud(r.id, 'reading');
      }
      logAction('حذف إشعار فاتورة متعثر', `تم حذف إشعار فاتورة المشترك (${r.subscriberName}) من الرسائل المتعثرة في قاعدة البيانات`);
    }
  };

  const handleDeleteFailedPaymentSMS = async (p: Payment) => {
    if (confirm(`هل تريد حذف إشعار سند القبض للمشترك (${p.subscriberName}) من قاعدة البيانات؟`)) {
      const updatedPayments = payments.map(payment => 
        payment.id === p.id ? { ...payment, smsSent: true } : payment
      );
      onUpdatePayments(updatedPayments);

      if (onDeleteFailedSms) {
        onDeleteFailedSms(p.id, 'payment');
      } else {
        await deleteFailedSmsFromCloud(p.id, 'payment');
      }
      logAction('حذف إشعار سند متعثر', `تم حذف إشعار سند قبض المشترك (${p.subscriberName}) من الرسائل المتعثرة في قاعدة البيانات`);
    }
  };

  const handleClearAllFailedSMS = async () => {
    if (confirm('هل أنت متأكد من تفريغ ومسح كافة الرسائل المتعثرة من قاعدة البيانات وتعيين حالتها كمرسلة؟')) {
      const updatedReadings = readings.map(r => ({ ...r, smsSent: true }));
      const updatedPayments = payments.map(p => ({ ...p, smsSent: true }));
      onUpdateReadings(updatedReadings);
      onUpdatePayments(updatedPayments);

      if (onClearAllFailedSms) {
        onClearAllFailedSms();
      } else {
        await clearAllFailedSmsFromCloud();
      }
      logAction('مسح الرسائل المتعثرة', 'تم تفريغ ومسح كافة الرسائل المتعثرة وتحديث حالتها في قاعدة البيانات');
    }
  };

  const saveSmsTemplate = async (id: string) => {
    const target = smsTemplates.find(t => t.id === id);
    if (!target) return;
    const updatedTemplate: SmsTemplate = { 
      ...target, 
      content: editingTemplateContent, 
      updatedAt: new Date().toISOString() 
    };
    
    const updatedList = smsTemplates.map(t => t.id === id ? updatedTemplate : t);

    // 1. Immediately persist locally to browser storage & fast cache
    setLocalData('voltera_firestore_sms_templates', updatedList);
    try {
      const cachedStr = localStorage.getItem('voltera_cached_cloud_data');
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        cached.smsTemplates = updatedList;
        localStorage.setItem('voltera_cached_cloud_data', JSON.stringify(cached));
      }
    } catch (e) {
      console.warn('Error updating local cache for smsTemplates:', e);
    }

    // 2. Update React parent states
    if (onSaveSmsTemplate) {
      onSaveSmsTemplate(updatedTemplate);
    }
    if (onUpdateSmsTemplates) {
      onUpdateSmsTemplates(updatedList);
    }

    // 3. Directly sync document to Cloud Firestore
    try {
      await syncSmsTemplateToCloud(updatedTemplate);
    } catch (err) {
      console.error('Error direct syncing template to Firestore:', err);
    }

    setEditingTemplateId(null);
    setSmsSaveSuccessNotice(`تم حفظ وتحديث قالب (${target.name}) في قاعدة البيانات السحابية (Firestore) بنجاح`);
    setTimeout(() => setSmsSaveSuccessNotice(null), 4000);

    logAction('تعديل قالب رسائل نصية', `تم تعديل وحفظ قالب (${target.name}) في قاعدة البيانات السحابية`);
  };

  const handleAddNewSmsTemplate = async () => {
    if (!newTemplateName.trim() || !newTemplateContent.trim()) {
      alert('يرجى كتابة اسم القالب ومحتواه');
      return;
    }
    const newId = `tpl-${Date.now()}`;
    const newTemplate: SmsTemplate = {
      id: newId,
      name: newTemplateName.trim(),
      content: newTemplateContent.trim(),
      type: newTemplateType,
      updatedAt: new Date().toISOString()
    };
    const updatedList = [...smsTemplates, newTemplate];

    // 1. Persist locally to storage & cache
    setLocalData('voltera_firestore_sms_templates', updatedList);
    try {
      const cachedStr = localStorage.getItem('voltera_cached_cloud_data');
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        cached.smsTemplates = updatedList;
        localStorage.setItem('voltera_cached_cloud_data', JSON.stringify(cached));
      }
    } catch (e) {
      console.warn('Error updating local cache for smsTemplates:', e);
    }

    // 2. React state
    if (onSaveSmsTemplate) {
      onSaveSmsTemplate(newTemplate);
    }
    if (onUpdateSmsTemplates) {
      onUpdateSmsTemplates(updatedList);
    }

    // 3. Firestore sync
    try {
      await syncSmsTemplateToCloud(newTemplate);
    } catch (err) {
      console.error('Error syncing new template to Firestore:', err);
    }

    setShowAddTemplateModal(false);
    setNewTemplateName('');
    setNewTemplateContent('');
    setNewTemplateType('custom');
    setSmsSaveSuccessNotice(`تم إضافة القالب الجديد (${newTemplate.name}) وحفظه في قاعدة البيانات السحابية بنجاح`);
    setTimeout(() => setSmsSaveSuccessNotice(null), 4000);

    logAction('إضافة قالب رسائل نصية', `تم إنشاء قالب رسائل نصية جديد (${newTemplate.name}) وتخزينه بقاعدة البيانات`);
  };

  const handleDeleteSmsTemplate = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف قالب الرسائل (${name}) نهائياً من قاعدة البيانات؟`)) return;
    const updatedList = smsTemplates.filter(t => t.id !== id);

    // 1. Local persistence
    setLocalData('voltera_firestore_sms_templates', updatedList);
    try {
      const cachedStr = localStorage.getItem('voltera_cached_cloud_data');
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        cached.smsTemplates = updatedList;
        localStorage.setItem('voltera_cached_cloud_data', JSON.stringify(cached));
      }
    } catch (e) {
      console.warn('Error updating local cache for smsTemplates:', e);
    }

    // 2. React state
    if (onDeleteSmsTemplate) {
      onDeleteSmsTemplate(id);
    }
    if (onUpdateSmsTemplates) {
      onUpdateSmsTemplates(updatedList);
    }

    // 3. Firestore
    try {
      await deleteSmsTemplateFromCloud(id);
    } catch (err) {
      console.error('Error deleting template from Firestore:', err);
    }

    setSmsSaveSuccessNotice(`تم حذف القالب (${name}) من قاعدة البيانات السحابية بنجاح`);
    setTimeout(() => setSmsSaveSuccessNotice(null), 4000);
  };

  const handleClearAllSmsTemplates = async () => {
    if (!confirm('هل أنت متأكد من حذف وتفريغ كافة قوالب الرسائل نهائياً من قاعدة البيانات السحابية؟')) return;

    // 1. React state
    if (onClearAllSmsTemplates) {
      onClearAllSmsTemplates();
    }
    if (onUpdateSmsTemplates) {
      onUpdateSmsTemplates([]);
    }

    // 2. Local cache cleanup
    setLocalData('voltera_firestore_sms_templates', []);
    try {
      const cachedStr = localStorage.getItem('voltera_cached_cloud_data');
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        cached.smsTemplates = [];
        localStorage.setItem('voltera_cached_cloud_data', JSON.stringify(cached));
      }
    } catch (e) {
      console.warn('Error clearing local cache for smsTemplates:', e);
    }

    // 3. Firestore
    try {
      await clearAllSmsTemplatesFromCloud();
    } catch (err) {
      console.error('Error clearing templates from Firestore:', err);
    }

    setSmsSaveSuccessNotice('تم تفريغ وحذف كافة قوالب الرسائل من قاعدة البيانات السحابية بنجاح');
    setTimeout(() => setSmsSaveSuccessNotice(null), 4000);
    logAction('تفريغ قوالب الرسائل', 'تم تفريغ وحذف كافة قوالب الرسائل من قاعدة البيانات السحابية');
  };

  const handleLoadSampleTemplates = async () => {
    if (!confirm('هل تريد استيراد نماذج قوالب استرشادية جاهزة وحفظها في قاعدة البيانات السحابية؟')) return;

    // 1. React state
    if (onUpdateSmsTemplates) {
      onUpdateSmsTemplates(SAMPLE_SMS_TEMPLATES);
    }

    // 2. Local cache update
    setLocalData('voltera_firestore_sms_templates', SAMPLE_SMS_TEMPLATES);
    try {
      const cachedStr = localStorage.getItem('voltera_cached_cloud_data');
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        cached.smsTemplates = SAMPLE_SMS_TEMPLATES;
        localStorage.setItem('voltera_cached_cloud_data', JSON.stringify(cached));
      }
    } catch (e) {
      console.warn('Error updating local cache for sample smsTemplates:', e);
    }

    // 3. Firestore sync
    try {
      await syncBulkSmsTemplatesToCloud(SAMPLE_SMS_TEMPLATES);
    } catch (err) {
      console.error('Error importing sample templates to Firestore:', err);
    }

    setSmsSaveSuccessNotice('تم استيراد نماذج القوالب الاسترشادية وحفظها في قاعدة البيانات السحابية بنجاح');
    setTimeout(() => setSmsSaveSuccessNotice(null), 4000);
    logAction('استيراد قوالب استرشادية', 'تم استيراد نماذج قوالب رسائل قياسية وتخزينها في قاعدة البيانات السحابية');
  };

  const handleStartSmsSequence = () => {
    if (smsSelectedSubs.length === 0) {
      alert('يرجى تحديد مشترك واحد على الأقل.');
      return;
    }
    if (!smsMessage) {
      alert('يرجى كتابة نص الرسالة.');
      return;
    }

    const hasPhones = smsSelectedSubs.some(id => subscribers.find(s => s.id === id)?.phone);
    if (!hasPhones) {
      alert('لم يتم العثور على أرقام هواتف صالحة للمشتركين المحددين.');
      return;
    }

    setIsSendingSequence(true);
    setSmsQueueIndex(0);
  };

  const handleSendNextSms = () => {
    if (smsQueueIndex < smsSelectedSubs.length) {
      const subId = smsSelectedSubs[smsQueueIndex];
      const sub = subscribers.find(s => s.id === subId);
      
      if (sub && sub.phone) {
        const msg = parseSmsTemplate(smsMessage, sub, undefined, undefined, undefined, undefined, settings, readings);
        sendSMSDirectly(sub.phone, msg);
      }
      
      setSmsQueueIndex(prev => prev + 1);
    }
    
    if (smsQueueIndex >= smsSelectedSubs.length - 1) {
      setIsSendingSequence(false);
      alert('تم الانتهاء من القائمة المحددة.');
    }
  };

  const handleCancelSequence = () => {
    setIsSendingSequence(false);
    setSmsQueueIndex(0);
  };

  return (
    <div className="space-y-6">
      {/* SMS HUB NAVIGATION BAR */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-2.5 shadow-xl sticky top-2 z-20 backdrop-blur-md">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveSection('sms-templates')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
              activeSection === 'sms-templates'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>قوالب الرسائل</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              activeSection === 'sms-templates' ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400'
            }`}>
              {smsTemplates.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('sms-send')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
              activeSection === 'sms-send'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>إرسال وبث الرسائل</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('sms-failed')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
              activeSection === 'sms-failed'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>الرسائل المتعثرة والمعلقة</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('sms-outbox')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
              activeSection === 'sms-outbox'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>سجل الرسائل الصادرة</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('sms-subscriptions')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
              activeSection === 'sms-subscriptions'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>دليل المشتركين والأرقام</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              activeSection === 'sms-subscriptions' ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400'
            }`}>
              {subscribers.filter(s => s.phone).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('sms-gateway')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
              activeSection === 'sms-gateway'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>إعدادات بوابات SMS والربط</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('sms-android')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
              activeSection === 'sms-android'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-emerald-400 hover:text-emerald-300 hover:bg-slate-800/60'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>تطبيق أندرويد وAPK</span>
          </button>
        </div>
      </div>

      {/* 1. SMS TEMPLATES */}
      {activeSection === 'sms-templates' && (
        <motion.div
          key="sms-templates-sec"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-6 text-right font-sans"
        >
          {smsSaveSuccessNotice && (
            <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 p-3.5 rounded-xl text-xs flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold">{smsSaveSuccessNotice}</span>
              </div>
              <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-200 border border-emerald-500/30">
                قاعدة البيانات السحابية (Firestore)
              </span>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                  <FileText className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <span>قوالب الرسائل النصية المحفوظة</span>
                    <span className="text-xs bg-slate-800 text-amber-400 font-mono px-2 py-0.5 rounded-full border border-slate-700">
                      {smsTemplates.length} قوالب
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-emerald-400" />
                    <span>حفظ وتحديث مباشر في قاعدة البيانات السحابية (Firestore) بدون الاعتماد على ذاكرة المتصفح</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                {smsTemplates.length > 0 && (
                  <button
                    onClick={handleClearAllSmsTemplates}
                    className="flex-1 sm:flex-initial text-xs bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 px-3 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 border border-rose-800/50 transition-colors cursor-pointer"
                    title="حذف وتفريغ كافة قوالب الرسائل من قاعدة البيانات"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>حذف كافة القوالب</span>
                  </button>
                )}
                <button
                  onClick={handleLoadSampleTemplates}
                  className="flex-1 sm:flex-initial text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                  title="استيراد نماذج قوالب استرشادية قياسية"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>استيراد نماذج استرشادية</span>
                </button>
                <button
                  onClick={() => setShowAddTemplateModal(true)}
                  className="flex-1 sm:flex-initial text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 px-3.5 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-md transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة قالب مخصص</span>
                </button>
              </div>
            </div>

            {smsTemplates.length === 0 ? (
              <div className="bg-slate-950/60 border border-dashed border-slate-800 rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-3 my-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="max-w-md">
                  <h3 className="text-base font-bold text-slate-200">لا توجد قوالب رسائل محفوظة حالياً</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    تم تفريغ وحذف كافة البيانات الافتراضية. يمكنك إنشاء قوالب جديدة مخصصة لمحطتك وحفظها سحابياً، أو استيراد نماذج استرشادية عند الرغبة.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                  <button
                    onClick={() => setShowAddTemplateModal(true)}
                    className="text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة قالب مخصص جديد</span>
                  </button>
                  <button
                    onClick={handleLoadSampleTemplates}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>استيراد نماذج استرشادية</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {smsTemplates.map(template => (
                  <div key={template.id} className="bg-slate-950 rounded-xl border border-slate-800 p-4 flex flex-col gap-3 relative hover:border-slate-700 transition-all">
                    <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingTemplateId(template.id);
                            setEditingTemplateContent(template.content);
                          }}
                          className="text-amber-400 hover:text-amber-300 text-xs font-bold px-2 py-1 bg-amber-500/10 rounded-lg border border-amber-500/20 transition-colors cursor-pointer"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => handleDeleteSmsTemplate(template.id, template.name)}
                          title="حذف القالب من قاعدة البيانات السحابية"
                          className="text-rose-400 hover:text-rose-300 p-1 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-slate-200 text-sm">{template.name}</h3>
                        {template.type && (
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                            {template.type === 'reading' ? 'فاتورة' : template.type === 'payment' ? 'سند' : template.type === 'reminder' ? 'تذكير' : 'مخصص'}
                          </span>
                        )}
                      </div>
                    </div>

                    {editingTemplateId === template.id ? (
                      <div className="flex flex-col gap-2">
                        <textarea
                          value={editingTemplateContent}
                          onChange={(e) => setEditingTemplateContent(e.target.value)}
                          className="w-full bg-slate-900 border border-amber-500/50 rounded-lg p-2.5 text-xs text-white min-h-[120px] text-right resize-none focus:outline-none focus:ring-1 focus:ring-amber-500 leading-relaxed font-sans"
                          dir="rtl"
                          placeholder="اكتب نص القالب هنا..."
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveSmsTemplate(template.id)}
                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow cursor-pointer"
                          >
                            <Database className="w-3.5 h-3.5" />
                            <span>حفظ في قاعدة البيانات السحابية</span>
                          </button>
                          <button
                            onClick={() => setEditingTemplateId(null)}
                            className="px-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-2 rounded-lg transition-colors cursor-pointer"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-900/90 rounded-lg p-3 text-xs text-slate-300 min-h-[110px] whitespace-pre-wrap leading-relaxed border border-slate-800/80 font-sans">
                        {template.content}
                      </div>
                    )}

                    <div className="mt-1 pt-2 border-t border-slate-800/40">
                      <p className="text-[10px] text-slate-400 font-bold mb-1.5 flex items-center justify-between">
                        <span>المتغيرات المدعومة (انقر للإدراج):</span>
                        <span className="text-[9px] text-amber-400">يدعم القراءة الحالية والسابقة</span>
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {[
                          { label: 'اسم المشترك', val: '{اسم_المشترك}' },
                          { label: 'رقم العداد', val: '{رقم_العداد}' },
                          { label: 'القراءة الحالية', val: '{القراءة_الحالية}' },
                          { label: 'القراءة السابقة', val: '{القراءة_السابقة}' },
                          { label: 'الاستهلاك', val: '{الاستهلاك}' },
                          { label: 'المبلغ', val: '{المبلغ}' },
                          { label: 'خصم المسبق', val: '{خصم_الدفعة_المسبقة}' },
                          { label: 'الرصيد المتبقي', val: '{الرصيد_المتبقي}' },
                          { label: 'المتأخرات', val: '{المبالغ_المتأخره}' },
                          { label: 'رقم السند', val: '{رقم_السند}' },
                          { label: 'اسم المحطة', val: '{اسم_المحطة}' },
                          { label: 'هاتف المحطة', val: '{هاتف_المحطة}' },
                          { label: 'المربع', val: '{المربع}' },
                          { label: 'تاريخ القراءة', val: '{تاريخ_القراءة}' }
                        ].map(item => (
                          <button
                            key={item.val}
                            type="button"
                            onClick={() => {
                              if (editingTemplateId === template.id) {
                                setEditingTemplateContent(prev => prev + (prev.endsWith('\n') || prev === '' ? '' : ' ') + item.val);
                              }
                            }}
                            title={`إدراج المتغير ${item.val}`}
                            className={`text-[9px] px-1.5 py-0.5 rounded border transition-all ${
                              editingTemplateId === template.id 
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20 cursor-pointer active:scale-95' 
                                : 'bg-slate-900 border-slate-800 text-slate-500 cursor-default'
                            }`}
                          >
                            {item.val}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Custom Template Modal */}
          {showAddTemplateModal && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl text-right dir-rtl space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Plus className="w-5 h-5 text-amber-500" />
                    <span>إضافة قالب رسائل نصية جديد</span>
                  </h3>
                  <button
                    onClick={() => setShowAddTemplateModal(false)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">اسم القالب</label>
                    <input
                      type="text"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      placeholder="مثال: إشعار فصل الخدمة، تهنئة العيد..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">نوع القالب</label>
                    <select
                      value={newTemplateType}
                      onChange={(e) => setNewTemplateType(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="custom">مخصص / عام</option>
                      <option value="reading">إشعار قراءة / فاتورة</option>
                      <option value="payment">سند قبض / دفعة</option>
                      <option value="reminder">تذكير بسداد المديونية</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">نص ومحتوى القالب</label>
                    <textarea
                      value={newTemplateContent}
                      onChange={(e) => setNewTemplateContent(e.target.value)}
                      placeholder="اكتب نص القالب هنا واستخدم المتغيرات..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white min-h-[100px] resize-none focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <p className="text-[10px] text-slate-400 font-bold mb-1">انقر لإدراج متغير في النص:</p>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { label: 'اسم المشترك', val: '{اسم_المشترك}' },
                        { label: 'رقم العداد', val: '{رقم_العداد}' },
                        { label: 'القراءة الحالية', val: '{القراءة_الحالية}' },
                        { label: 'القراءة السابقة', val: '{القراءة_السابقة}' },
                        { label: 'الاستهلاك', val: '{الاستهلاك}' },
                        { label: 'المبلغ', val: '{المبلغ}' },
                        { label: 'الرصيد المتبقي', val: '{الرصيد_المتبقي}' },
                        { label: 'المتأخرات', val: '{المبالغ_المتأخره}' },
                        { label: 'رقم السند', val: '{رقم_السند}' }
                      ].map(item => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setNewTemplateContent(prev => prev + (prev.endsWith('\n') || prev === '' ? '' : ' ') + item.val)}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 cursor-pointer"
                        >
                          {item.val}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={handleAddNewSmsTemplate}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>حفظ القالب في قاعدة البيانات</span>
                  </button>
                  <button
                    onClick={() => setShowAddTemplateModal(false)}
                    className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* 2. SMS SUBSCRIPTIONS DIRECTORY */}
      {activeSection === 'sms-subscriptions' && (
        <motion.div
          key="sms-subscriptions-sec"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-6 text-right font-sans"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-slate-100 flex items-center justify-start gap-2 mb-6 border-b border-slate-800 pb-3">
              <span>دليل اشتراك الرسائل القصيرة</span>
              <Users className="w-5 h-5 text-amber-500" />
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right text-slate-400">
                <thead className="text-xs text-slate-500 uppercase bg-slate-950/50 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">حالة الهاتف</th>
                    <th className="px-4 py-3">رقم الهاتف</th>
                    <th className="px-4 py-3">رقم العداد</th>
                    <th className="px-4 py-3 text-slate-200">اسم المشترك</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map(sub => (
                    <tr key={sub.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                      <td className="px-4 py-3">
                        {sub.phone && sub.phone.length >= 9 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                            <Check className="w-3 h-3" />
                            جاهز للاستلام
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-bold">
                            <AlertCircle className="w-3 h-3" />
                            لا يوجد رقم
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono">{sub.phone || '-'}</td>
                      <td className="px-4 py-3 font-mono">{sub.meterNumber}</td>
                      <td className="px-4 py-3 font-bold text-slate-300">{sub.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* 3. FAILED / PENDING SMS QUEUE */}
      {activeSection === 'sms-failed' && (
        <motion.div
          key="sms-failed-sec"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-6 text-right font-sans"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <span>الرسائل المتعثرة وغير المرسلة</span>
                    <span className="text-xs bg-rose-500/20 text-rose-300 font-mono px-2 py-0.5 rounded-full border border-rose-500/30">
                      {readings.filter(r => !r.smsSent).length + payments.filter(p => !p.smsSent).length} رسالة معلقة
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>الرسائل محفوظة بقاعدة البيانات السحابية، ويتم حذف السجل تلقائياً فور إرسال الرسالة للمشترك</span>
                  </p>
                </div>
              </div>

              {(readings.filter(r => !r.smsSent).length + payments.filter(p => !p.smsSent).length > 0) && (
                <button
                  type="button"
                  onClick={handleClearAllFailedSMS}
                  className="text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>مسح وتفريغ كافة المتعثرات من قاعدة البيانات</span>
                </button>
              )}
            </div>

            {/* Active Templates Selector Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-slate-950/80 rounded-xl border border-slate-800">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-amber-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>القالب المعتمد لفواتير القراءات:</span>
                  </label>
                  <button
                    onClick={() => setActiveSection('sms-templates')}
                    className="text-[11px] text-slate-400 hover:text-amber-300 flex items-center gap-1 underline underline-offset-2 cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>إدارة القوالب</span>
                  </button>
                </div>
                <select
                  value={failedReadingTemplateId}
                  onChange={(e) => setFailedReadingTemplateId(e.target.value)}
                  className="w-full bg-slate-900 border border-amber-500/30 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  {smsTemplates.map(tpl => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} {tpl.type ? `(${tpl.type === 'reading' ? 'قالب فواتير' : tpl.type === 'payment' ? 'قالب سندات' : 'مخصص'})` : ''}
                    </option>
                  ))}
                </select>
                <div className="bg-slate-900/90 rounded-lg p-2.5 text-[11px] text-slate-400 border border-slate-800/80 whitespace-pre-wrap line-clamp-2 max-h-16 overflow-hidden">
                  {getActiveReadingTemplate(failedReadingTemplateId).content}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>القالب المعتمد لسندات القبض:</span>
                  </label>
                  <button
                    onClick={() => setActiveSection('sms-templates')}
                    className="text-[11px] text-slate-400 hover:text-emerald-300 flex items-center gap-1 underline underline-offset-2 cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>إدارة القوالب</span>
                  </button>
                </div>
                <select
                  value={failedPaymentTemplateId}
                  onChange={(e) => setFailedPaymentTemplateId(e.target.value)}
                  className="w-full bg-slate-900 border border-emerald-500/30 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  {smsTemplates.map(tpl => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} {tpl.type ? `(${tpl.type === 'payment' ? 'قالب سندات' : tpl.type === 'reading' ? 'قالب فواتير' : 'مخصص'})` : ''}
                    </option>
                  ))}
                </select>
                <div className="bg-slate-900/90 rounded-lg p-2.5 text-[11px] text-slate-400 border border-slate-800/80 whitespace-pre-wrap line-clamp-2 max-h-16 overflow-hidden">
                  {getActivePaymentTemplate(failedPaymentTemplateId).content}
                </div>
              </div>
            </div>

            {/* Batch Sender Status Banner if active */}
            {failedBatchType && (
              <div className="mb-6 bg-slate-950 border border-amber-500/40 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg animate-pulse">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-300">
                      جاري الإرسال المتسلسل {failedBatchType === 'reading' ? 'لفواتير القراءات' : 'لسندات القبض'} بالاعتماد على القالب:
                    </p>
                    <p className="text-[11px] text-slate-400">
                      القالب المستخدم: {failedBatchType === 'reading' ? getActiveReadingTemplate(failedReadingTemplateId).name : getActivePaymentTemplate(failedPaymentTemplateId).name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setFailedBatchType(null)}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 cursor-pointer"
                >
                  إيقاف الإرسال المتسلسل
                </button>
              </div>
            )}

            {/* Main Two Columns: Unsent Readings & Unsent Payments */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Unsent Readings */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 flex flex-col">
                <div className="flex justify-between items-center mb-3 border-b border-slate-800/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded-full border border-amber-500/30">
                      {readings.filter(r => !r.smsSent).length}
                    </span>
                    <h3 className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                      <FileText className="w-4 h-4" />
                      <span>فواتير قراءات لم تُرسل</span>
                    </h3>
                  </div>
                  {readings.filter(r => !r.smsSent).length > 0 && (
                    <button
                      onClick={() => {
                        const unsent = readings.filter(r => !r.smsSent);
                        if (unsent.length === 0) return;
                        setFailedBatchType('reading');
                        setFailedBatchIndex(0);
                        handleSendReadingSMS(unsent[0], true, failedReadingTemplateId);
                      }}
                      className="text-[11px] bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 shadow cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      <span>إرسال متسلسل للكل</span>
                    </button>
                  )}
                </div>

                <div className="mb-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={failedReadingSearch}
                      onChange={(e) => setFailedReadingSearch(e.target.value)}
                      placeholder="بحث باسم المشترك أو رقم العداد..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg pr-8 pl-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5" />
                  </div>
                </div>

                <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
                  {readings.filter(r => !r.smsSent).length === 0 ? (
                    <div className="text-center py-12 text-slate-600 text-xs">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500/20 mx-auto mb-2" />
                      <p>جميع إشعارات فواتير القراءات مُرسلة بنجاح.</p>
                    </div>
                  ) : (
                    readings
                      .filter(r => !r.smsSent)
                      .filter(r => {
                        if (!failedReadingSearch.trim()) return true;
                        const q = failedReadingSearch.toLowerCase();
                        return r.subscriberName.toLowerCase().includes(q) || r.meterNumber.toLowerCase().includes(q);
                      })
                      .sort((a,b) => new Date(b.readingDate).getTime() - new Date(a.readingDate).getTime())
                      .map(r => {
                        const sub = subscribers.find(s => s.id === r.subscriberId);
                        const { msg, template } = buildReadingSmsMessage(r, failedReadingTemplateId);
                        return (
                          <div key={r.id} className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/90 flex flex-col gap-2 hover:border-slate-700 transition-all">
                            <div className="flex justify-between items-start">
                              <div className="text-left font-mono font-bold text-amber-400 text-xs">
                                {r.totalAmount.toLocaleString()} {settings.currency}
                                <div className="text-[10px] text-slate-400 font-sans font-normal">
                                  استهلاك: {r.consumption} ك.و
                                </div>
                              </div>
                              <div className="text-right">
                                <h5 className="font-bold text-slate-200 text-xs">{r.subscriberName}</h5>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  عداد: {r.meterNumber} | {r.readingDate}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => setPreviewSmsModal({
                                  title: `معاينة فاتورة المشترك (${r.subscriberName}) وفق القالب`,
                                  recipientName: r.subscriberName,
                                  phone: sub?.phone || 'لا يوجد هاتف',
                                  content: msg,
                                  templateName: template.name,
                                  onSend: () => handleSendReadingSMS(r, true, failedReadingTemplateId)
                                })}
                                className="text-[11px] text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 bg-sky-500/10 px-2 py-1 rounded-lg border border-sky-500/20 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>معاينة</span>
                              </button>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  title="حذف هذا الإشعار من قاعدة البيانات دون إرسال"
                                  onClick={() => handleDeleteFailedReadingSMS(r)}
                                  className="text-[11px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold p-1 rounded-lg border border-rose-500/30 transition-all cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleSendReadingSMS(r, true, failedReadingTemplateId)}
                                  className="text-[11px] bg-amber-500/10 hover:bg-amber-500 hover:text-slate-950 text-amber-400 font-bold px-2.5 py-1 rounded-lg border border-amber-500/30 transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>إرسال وحذف من السجل</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Unsent Payments */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 flex flex-col">
                <div className="flex justify-between items-center mb-3 border-b border-slate-800/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-500/30">
                      {payments.filter(p => !p.smsSent).length}
                    </span>
                    <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>سندات قبض لم تُرسل</span>
                    </h3>
                  </div>
                  {payments.filter(p => !p.smsSent).length > 0 && (
                    <button
                      onClick={() => {
                        const unsent = payments.filter(p => !p.smsSent);
                        if (unsent.length === 0) return;
                        setFailedBatchType('payment');
                        setFailedBatchIndex(0);
                        handleSendPaymentSMS(unsent[0], true, failedPaymentTemplateId);
                      }}
                      className="text-[11px] bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 shadow cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      <span>إرسال متسلسل للكل</span>
                    </button>
                  )}
                </div>

                <div className="mb-3">
                  <div className="relative">
                    <input
                      type="text"
                      value={failedPaymentSearch}
                      onChange={(e) => setFailedPaymentSearch(e.target.value)}
                      placeholder="بحث باسم المشترك أو رقم السند..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg pr-8 pl-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5" />
                  </div>
                </div>

                <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
                  {payments.filter(p => !p.smsSent).length === 0 ? (
                    <div className="text-center py-12 text-slate-600 text-xs">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500/20 mx-auto mb-2" />
                      <p>جميع إشعارات سندات القبض مُرسلة بنجاح.</p>
                    </div>
                  ) : (
                    payments
                      .filter(p => !p.smsSent)
                      .filter(p => {
                        if (!failedPaymentSearch.trim()) return true;
                        const q = failedPaymentSearch.toLowerCase();
                        return p.subscriberName.toLowerCase().includes(q) || (p.receiptNumber && p.receiptNumber.toLowerCase().includes(q));
                      })
                      .sort((a,b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                      .map(p => {
                        const sub = subscribers.find(s => s.id === p.subscriberId);
                        const { msg, template } = buildPaymentSmsMessage(p, failedPaymentTemplateId);
                        return (
                          <div key={p.id} className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/90 flex flex-col gap-2 hover:border-slate-700 transition-all">
                            <div className="flex justify-between items-start">
                              <div className="text-left font-mono font-bold text-emerald-400 text-xs">
                                {p.amountPaid.toLocaleString()} {settings.currency}
                              </div>
                              <div className="text-right">
                                <h5 className="font-bold text-slate-200 text-xs">{p.subscriberName}</h5>
                                <p className="text-[10px] text-slate-400 font-mono">
                                  سند: {p.receiptNumber} | {p.paymentDate}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => setPreviewSmsModal({
                                  title: `معاينة سند قبض المشترك (${p.subscriberName}) وفق القالب`,
                                  recipientName: p.subscriberName,
                                  phone: sub?.phone || 'لا يوجد هاتف',
                                  content: msg,
                                  templateName: template.name,
                                  onSend: () => handleSendPaymentSMS(p, true, failedPaymentTemplateId)
                                })}
                                className="text-[11px] text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 bg-sky-500/10 px-2 py-1 rounded-lg border border-sky-500/20 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>معاينة</span>
                              </button>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  title="حذف هذا الإشعار من قاعدة البيانات دون إرسال"
                                  onClick={() => handleDeleteFailedPaymentSMS(p)}
                                  className="text-[11px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold p-1 rounded-lg border border-rose-500/30 transition-all cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => handleSendPaymentSMS(p, true, failedPaymentTemplateId)}
                                  className="text-[11px] bg-emerald-500/10 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 font-bold px-2.5 py-1 rounded-lg border border-emerald-500/30 transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>إرسال وحذف من السجل</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 4. CUSTOM SMS SENDER */}
      {activeSection === 'sms-send' && (
        <motion.div
          key="sms-send-sec"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-6 text-right font-sans"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="flex flex-col gap-4 order-2 lg:order-1">
              <h2 className="text-lg font-bold text-slate-100 flex items-center justify-start gap-2 border-b border-slate-800 pb-3">
                <span>إرسال رسالة مخصصة</span>
                <MessageSquare className="w-5 h-5 text-amber-500" />
              </h2>

              <div>
                <label className="text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span>اختر قالباً جاهزاً من قاعدة البيانات (اختياري):</span>
                  <span className="text-[10px] text-amber-400">يملأ النص بالصيغة المعتمدة</span>
                </label>
                <select
                  onChange={(e) => {
                    const selected = smsTemplates.find(t => t.id === e.target.value);
                    if (selected) {
                      setSmsMessage(selected.content);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- اختر قالباً لتحميل محتواه --</option>
                  {smsTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-400">نص الرسالة</label>
                <textarea
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  placeholder="اكتب رسالتك هنا أو اختر قالباً أعلاه..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 min-h-[150px] resize-none focus:outline-none focus:border-amber-500/50 leading-relaxed font-sans"
                  dir="rtl"
                />
                <div className="mt-1">
                  <p className="text-[10px] text-slate-400 font-bold mb-1.5 flex items-center justify-between">
                    <span>المتغيرات المدعومة (انقر للإدراج):</span>
                    <span className="text-[9px] text-sky-400">يدعم القراءة الحالية والسابقة</span>
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { label: 'اسم المشترك', val: '{اسم_المشترك}' },
                      { label: 'رقم العداد', val: '{رقم_العداد}' },
                      { label: 'القراءة الحالية', val: '{القراءة_الحالية}' },
                      { label: 'القراءة السابقة', val: '{القراءة_السابقة}' },
                      { label: 'الاستهلاك', val: '{الاستهلاك}' },
                      { label: 'المبلغ', val: '{المبلغ}' },
                      { label: 'المتأخرات', val: '{المبالغ_المتأخره}' },
                      { label: 'الرصيد المتبقي', val: '{الرصيد_المتبقي}' },
                      { label: 'تاريخ القراءة', val: '{تاريخ_القراءة}' }
                    ].map(item => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => setSmsMessage(prev => prev + (prev.endsWith('\n') || prev === '' ? '' : ' ') + item.val)}
                        title={`إدراج المتغير ${item.val}`}
                        className="text-[9px] px-2 py-0.5 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 transition-colors cursor-pointer"
                      >
                        {item.val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              {!isSendingSequence ? (
                <button
                  onClick={handleStartSmsSequence}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
                >
                  <Send className="w-5 h-5" />
                  <span>بدء إرسال متسلسل ({smsSelectedSubs.length} مستلم)</span>
                </button>
              ) : (
                <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-4 flex flex-col gap-3 mt-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-amber-400">
                      جاري الإرسال المتسلسل... ({Math.min(smsQueueIndex + 1, smsSelectedSubs.length)} / {smsSelectedSubs.length})
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={handleSendNextSms}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>فتح تطبيق الرسائل للتالي</span>
                    </button>
                    
                    <button
                      onClick={handleCancelSequence}
                      className="bg-slate-800 hover:bg-slate-700 text-rose-400 font-bold py-2 px-4 rounded-lg transition-colors cursor-pointer"
                    >
                      إيقاف
                    </button>
                  </div>
                </div>
              )}
              
              <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-4 text-xs text-sky-400 mt-2">
                <p className="flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>سيتم فتح تطبيق المراسلة في هاتفك مع إضافة الرقم الحالي والنص. قم بالإرسال من هاتفك ثم اضغط "التالي" هنا.</span>
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 order-1 lg:order-2 border-b lg:border-b-0 lg:border-l border-slate-800 pb-6 lg:pb-0 lg:pl-6">
              <h2 className="text-sm font-bold text-slate-100 flex items-center justify-start gap-2 border-b border-slate-800 pb-3">
                <span>تحديد المستلمين</span>
                <Users className="w-4 h-4 text-slate-400" />
              </h2>
              
              <div className="flex items-center justify-between bg-slate-950 rounded-lg p-2 border border-slate-800">
                <button
                  onClick={() => setSmsSelectedSubs([])}
                  className="text-xs text-rose-400 hover:text-rose-300 font-bold px-2 py-1 cursor-pointer"
                >
                  إلغاء التحديد
                </button>
                <button
                  onClick={() => {
                    const filtered = subscribers.filter(s => 
                      s.phone && (
                        s.name.includes(smsSearchQuery) || 
                        s.phone.includes(smsSearchQuery)
                      )
                    );
                    setSmsSelectedSubs(filtered.map(s => s.id));
                  }}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-bold px-2 py-1 cursor-pointer"
                >
                  تحديد الكل ({subscribers.filter(s => s.phone && (s.name.includes(smsSearchQuery) || s.phone.includes(smsSearchQuery))).length})
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="البحث بالاسم أو الرقم..."
                  value={smsSearchQuery}
                  onChange={(e) => setSmsSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 pr-8 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
                  dir="rtl"
                />
                <Search className="w-4 h-4 text-slate-500 absolute top-2.5 right-2.5" />
              </div>

              <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
                {subscribers.filter(s => s.phone && (s.name.includes(smsSearchQuery) || s.phone.includes(smsSearchQuery))).map(sub => (
                  <label key={sub.id} className="flex items-center justify-between p-3 border-b border-slate-800 hover:bg-slate-900 cursor-pointer transition-colors">
                    <div className="text-right">
                      <h4 className="text-xs font-bold text-slate-300">{sub.name}</h4>
                      <p className="text-[10px] text-slate-500 font-mono">{sub.phone}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={smsSelectedSubs.includes(sub.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSmsSelectedSubs([...smsSelectedSubs, sub.id]);
                        } else {
                          setSmsSelectedSubs(smsSelectedSubs.filter(id => id !== sub.id));
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-950 cursor-pointer"
                    />
                  </label>
                ))}
                {subscribers.filter(s => s.phone && (s.name.includes(smsSearchQuery) || s.phone.includes(smsSearchQuery))).length === 0 && (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    لا يوجد مشتركون مطابقون للبحث لديهم أرقام هواتف مسجلة.
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 4. SMS OUTBOX LOGS & HISTORY */}
      {activeSection === 'sms-outbox' && (
        <motion.div
          key="sms-outbox-sec"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <SmsOutboxView settings={settings} onNavigateSection={setActiveSection} />
        </motion.div>
      )}

      {/* 5. SMS SUBSCRIBERS DIRECTORY & PHONE HEALTH */}
      {activeSection === 'sms-subscriptions' && (
        <motion.div
          key="sms-subs-sec"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <SmsPhoneHealthView
            subscribers={subscribers}
            settings={settings}
            readings={readings}
            onUpdateSubscribers={onUpdateSubscribers}
          />
        </motion.div>
      )}

      {/* 6. SMS GATEWAY & CLOUD INTEGRATION */}
      {activeSection === 'sms-gateway' && (
        <motion.div
          key="sms-gateway-sec"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <SmsGatewaySettings
            settings={settings}
            currentUser={currentUser}
            onUpdateSettings={onUpdateSettings || (() => {})}
            onAddAuditLog={onAddAuditLog}
          />
        </motion.div>
      )}

      {/* 7. ANDROID & CAPACITOR NATIVE SUITE */}
      {activeSection === 'sms-android' && (
        <motion.div
          key="sms-android-sec"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <AndroidAppCenter />
        </motion.div>
      )}

      {/* Preview SMS Modal */}
      {previewSmsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 text-right"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <button
                onClick={() => setPreviewSmsModal(null)}
                className="text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-sm">{previewSmsModal.title}</h3>
                <Eye className="w-4 h-4 text-sky-400" />
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <div className="text-left font-mono font-bold text-amber-400">
                  {previewSmsModal.phone}
                </div>
                <div className="text-right">
                  <span className="text-slate-400">المستلم: </span>
                  <span className="font-bold text-slate-200">{previewSmsModal.recipientName}</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-400 px-1">
                <span>القالب المستخدم: <strong className="text-amber-400">{previewSmsModal.templateName}</strong></span>
                <span>نص الرسالة النهائي الذي سيصل للمشترك:</span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 font-sans text-sm whitespace-pre-wrap leading-relaxed min-h-[140px] select-text">
                {previewSmsModal.content}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              {previewSmsModal.onSend && (
                <button
                  type="button"
                  onClick={() => {
                    const sendFn = previewSmsModal.onSend;
                    setPreviewSmsModal(null);
                    if (sendFn) sendFn();
                  }}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>إرسال الرسالة الآن</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(previewSmsModal.content);
                  alert('تم نسخ نص الرسالة إلى الحافظة بنجاح');
                }}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>نسخ النص</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewSmsModal(null)}
                className="px-4 py-2.5 bg-slate-950 hover:bg-slate-900 text-slate-400 font-bold rounded-xl text-xs transition-colors border border-slate-800 cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
