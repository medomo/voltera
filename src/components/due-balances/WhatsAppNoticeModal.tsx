import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, Copy, Check, FileText, Printer, AlertTriangle } from 'lucide-react';
import { SubscriberBalanceItem } from './types';
import { SystemSettings } from '../../types';

interface WhatsAppNoticeModalProps {
  item: SubscriberBalanceItem | null;
  onClose: () => void;
  settings: SystemSettings;
  onPrintSlip: (item: SubscriberBalanceItem) => void;
}

export const WhatsAppNoticeModal: React.FC<WhatsAppNoticeModalProps> = ({
  item,
  onClose,
  settings,
  onPrintSlip
}) => {
  const [templateType, setTemplateType] = useState<'friendly' | 'due_reminder' | 'warning' | 'final_cutoff'>('due_reminder');
  const [copied, setCopied] = useState(false);

  if (!item) return null;

  const currency = settings.currency || 'ريال';
  const stationName = settings.stationName || settings.companyName || 'محطة الكهرباء';

  // Construct message based on template
  const generateMessage = () => {
    switch (templateType) {
      case 'friendly':
        return `مرحباً بالأخ المشترك الكريم: ${item.name}
رقم العداد: ${item.meterNumber}
يسرنا تذكيركم بمستحقات استهلاك الكهرباء لديكم:
• المتأخرات السابقة: ${item.overdueAmount.toLocaleString()} ${currency}
• فاتورة الدورة الحالية: ${item.currentDue.toLocaleString()} ${currency}
• إجمالي المبلغ المطلوب: ${item.totalDue.toLocaleString()} ${currency}
شاكرين لكم حسن تعاونكم واستمراركم معنا.
إدارة ${stationName}`;

      case 'due_reminder':
        return `إشعار استحقاق وسداد فاتورة كهرباء
الأخ المشترك: ${item.name}
رقم العداد: ${item.meterNumber} | المنطقة: ${item.zone || '-'}
نود إحاطتكم بضرورة تسوية المبالغ المستحقة على اشتراككم:
- المتأخرات السابقة: ${item.overdueAmount.toLocaleString()} ${currency}
- فاتورة آخر دورة: ${item.currentDue.toLocaleString()} ${currency}
- الإجمالي الإلزامي سداده: ${item.totalDue.toLocaleString()} ${currency}
يرجى المبادرة بالسداد لتجنب أي رسوم تأخير أو انقطاع في الخدمة.
${stationName}`;

      case 'warning':
        return `⚠️ تنبيه هام وعاجل بضرورة سداد المتأخرات
الأخ المشترك: ${item.name}
رقم العداد: ${item.meterNumber}
نلفت عنايتكم الكريمة بوجود متأخرات مستحقة الدفع بقيمة: ${item.totalDue.toLocaleString()} ${currency}
(منها متأخرات سابقة: ${item.overdueAmount.toLocaleString()} ${currency}).
يرجى التكرم بسرعة مراجعة قسم التحصيل أو السداد لمندوبنا الميداني خلال 48 ساعة.
شاكرين تعاونكم
إدارة ${stationName}`;

      case 'final_cutoff':
        return `🚨 إنذار نهائي وفصل التيار الكهربائي
إلى المشترك: ${item.name}
العداد: ${item.meterNumber} | المحول: ${item.transformer || '-'}
نظراً لتراكم المديونية المستحقة لديكم والتي بلغت: ${item.totalDue.toLocaleString()} ${currency}
وعدم الاستجابة للإشعارات السابقة، نحيطكم علماً بأنه سيتم فصل التيار الكهربائي عن العداد وإيقاف الخدمة في حال عدم السداد الفوري خلال 24 ساعة من تاريخ هذا الإشعار.
إدارة الرقابة والتحصيل - ${stationName}`;
    }
  };

  const messageText = generateMessage();
  const cleanPhone = (item.phone || '').replace(/[^0-9]/g, '');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendWhatsApp = () => {
    if (!cleanPhone) return;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;
    window.open(url, '_blank');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 text-right font-sans">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">إرسال إشعار / رسالة للمشترك</h3>
                <p className="text-[11px] text-slate-400">{item.name} • عداد: {item.meterNumber}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-4 text-xs">
            {/* Template Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300">نوع الإشعار المطلوب:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTemplateType('friendly')}
                  className={`p-2.5 rounded-xl border text-right font-bold transition-all cursor-pointer ${
                    templateType === 'friendly'
                      ? 'bg-sky-500/20 border-sky-400 text-sky-300 font-black'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  🌱 تذكير ودي واستحقاق
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateType('due_reminder')}
                  className={`p-2.5 rounded-xl border text-right font-bold transition-all cursor-pointer ${
                    templateType === 'due_reminder'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-black'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  ⚡ مطالبة بسداد الفاتورة
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateType('warning')}
                  className={`p-2.5 rounded-xl border text-right font-bold transition-all cursor-pointer ${
                    templateType === 'warning'
                      ? 'bg-orange-500/20 border-orange-400 text-orange-300 font-black'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  ⚠️ تنبيه متأخرات ومراجعة
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateType('final_cutoff')}
                  className={`p-2.5 rounded-xl border text-right font-bold transition-all cursor-pointer ${
                    templateType === 'final_cutoff'
                      ? 'bg-rose-500/20 border-rose-400 text-rose-300 font-black'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  🚨 إنذار نهائي وفصل التيار
                </button>
              </div>
            </div>

            {/* Message Preview */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px] font-bold text-slate-400">
                <span>معاينة نص الرسالة:</span>
                <span className="font-mono text-emerald-400">واتساب: {item.phone || 'بدون هاتف'}</span>
              </div>
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl whitespace-pre-wrap font-sans text-slate-200 text-xs leading-relaxed max-h-48 overflow-y-auto">
                {messageText}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onPrintSlip(item);
                }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                title="طباعة إشعار مطالبة ورقي للمحصل"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>طباعة إشعار ورقي</span>
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'تم النسخ' : 'نسخ النص'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={!cleanPhone}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/25"
            >
              <MessageCircle className="w-4 h-4" />
              <span>إرسال عبر واتساب</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
