import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Subscriber, SystemSettings, SmsTemplate, MeterReading } from '../../types';
import { parseSmsTemplate, sendSMSDirectly, calculateSmsSegments, generateWhatsAppLink } from '../../utils/smsService';
import {
  Send, Users, CheckCircle2, AlertCircle, Play, Pause,
  Square, Search, Filter, MessageSquare, Smartphone, Cloud,
  Check, FileText, Sparkles, ChevronRight, Eye, Copy
} from 'lucide-react';

interface SmsBroadcastViewProps {
  subscribers: Subscriber[];
  settings: SystemSettings;
  smsTemplates: SmsTemplate[];
  readings: MeterReading[];
  onAddAuditLog?: (log: any) => void;
}

export const SmsBroadcastView: React.FC<SmsBroadcastViewProps> = ({
  subscribers,
  settings,
  smsTemplates,
  readings,
  onAddAuditLog
}) => {
  // Target Audience Mode
  const [targetAudience, setTargetAudience] = useState<'all' | 'debtors' | 'zone' | 'tariff' | 'manual'>('all');
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [selectedTariff, setSelectedTariff] = useState<string>('residential');
  const [manualSelectedIds, setManualSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Message & Template
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [deliveryChannel, setDeliveryChannel] = useState<'auto' | 'android_native' | 'cloud_gateway'>('auto');

  // Execution Queue State
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [queueIndex, setQueueIndex] = useState<number>(0);
  const [queueLogs, setQueueLogs] = useState<{ id: string; name: string; phone: string; status: 'pending' | 'success' | 'failed'; error?: string }[]>([]);

  // Preview Modal
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);

  // Compute Active Recipients
  const getRecipients = (): Subscriber[] => {
    let list = subscribers.filter(s => s.phone && s.phone.trim().length > 0);

    if (targetAudience === 'debtors') {
      list = list.filter(s => (s.currentBalance || 0) > 0);
    } else if (targetAudience === 'zone' && selectedZone) {
      list = list.filter(s => s.zone === selectedZone);
    } else if (targetAudience === 'tariff') {
      list = list.filter(s => s.tariffType === selectedTariff);
    } else if (targetAudience === 'manual') {
      list = list.filter(s => manualSelectedIds.includes(s.id));
    }

    if (searchQuery.trim() && targetAudience === 'manual') {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.phone.includes(q) || s.meterNumber.toLowerCase().includes(q));
    }

    return list;
  };

  const recipients = getRecipients();
  const sampleSubscriber = recipients[0] || subscribers[0];

  const activeMessageText = selectedTemplateId
    ? (smsTemplates.find(t => t.id === selectedTemplateId)?.content || customMessage)
    : customMessage;

  const segmentStats = calculateSmsSegments(activeMessageText);

  // Sample parsed text
  const sampleParsedMessage = sampleSubscriber
    ? parseSmsTemplate(activeMessageText, sampleSubscriber, '15,000', 'REC-101', undefined, undefined, settings, readings)
    : activeMessageText;

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplateId(id);
    const found = smsTemplates.find(t => t.id === id);
    if (found) {
      setCustomMessage(found.content);
    }
  };

  const handleInsertTag = (tag: string) => {
    setCustomMessage(prev => prev + tag);
  };

  const handleStartBroadcast = () => {
    if (recipients.length === 0) {
      alert('لا يوجد مشتركون لديهم أرقام هواتف مسجلة ضمن الفئة المحددة.');
      return;
    }
    if (!activeMessageText.trim()) {
      alert('يرجى كتابة نص الرسالة أو اختيار قالب.');
      return;
    }

    const initialQueue = recipients.map(sub => ({
      id: sub.id,
      name: sub.name,
      phone: sub.phone,
      status: 'pending' as const
    }));

    setQueueLogs(initialQueue);
    setQueueIndex(0);
    setIsBroadcasting(true);
    setIsPaused(false);

    processNextMessage(0, initialQueue);
  };

  const processNextMessage = async (idx: number, currentLogs: typeof queueLogs) => {
    if (idx >= recipients.length) {
      setIsBroadcasting(false);
      alert(`تم اكتمال إرسال حملة البث إلى ${recipients.length} مشترك بنجاح! 🚀`);
      return;
    }

    const sub = recipients[idx];
    const parsedText = parseSmsTemplate(activeMessageText, sub, undefined, undefined, undefined, undefined, settings, readings);

    let sendStatus: 'success' | 'failed' = 'success';
    let sendError: string | undefined = undefined;

    try {
      const res = await sendSMSDirectly(sub.phone, parsedText, {
        subscriberId: sub.id,
        subscriberName: sub.name,
        meterNumber: sub.meterNumber,
        type: 'broadcast',
        smsGatewayConfig: settings.smsGatewayConfig
      });

      if (!res.success) {
        sendStatus = 'failed';
        sendError = res.message;
      }
    } catch (e: any) {
      sendStatus = 'failed';
      sendError = e.message;
    }

    const updatedLogs = [...currentLogs];
    updatedLogs[idx] = {
      ...updatedLogs[idx],
      status: sendStatus,
      error: sendError
    };
    setQueueLogs(updatedLogs);
    setQueueIndex(idx + 1);

    // Wait delay before next message
    const delay = settings.batchSmsIntervalMs || settings.smsGatewayConfig?.batchDelayMs || 1500;
    setTimeout(() => {
      processNextMessage(idx + 1, updatedLogs);
    }, delay);
  };

  const handleStopBroadcast = () => {
    setIsBroadcasting(false);
    setIsPaused(false);
  };

  const zonesList = Array.from(new Set(subscribers.map(s => s.zone).filter(Boolean)));

  return (
    <div className="space-y-6 text-right font-sans">
      {/* Broadcast Progress Banner if active */}
      {isBroadcasting && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-950 border border-amber-500/60 rounded-2xl p-5 shadow-2xl space-y-4"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl animate-pulse">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-300">
                  جاري إرسال حملة البث الجماعي ({queueIndex} / {recipients.length})
                </h3>
                <p className="text-xs text-slate-400">
                  المشترك الحالي: <strong className="text-slate-200">{recipients[queueIndex]?.name || '...'}</strong> ({recipients[queueIndex]?.phone || ''})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleStopBroadcast}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow"
              >
                <Square className="w-3.5 h-3.5" />
                <span>إيقاف الإرسال</span>
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-l from-amber-400 to-amber-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${Math.round((queueIndex / recipients.length) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>{Math.round((queueIndex / recipients.length) * 100)}% مكتمل</span>
              <span>{queueIndex} من إجمالي {recipients.length} مشترك</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Broadcast Setup */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1 & 2: Audience & Message Composer */}
        <div className="lg:col-span-2 space-y-6">
          {/* Audience Selector Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span>1. تحديد الفئة المستهدفة للإرسال (Target Audience)</span>
              </h3>
              <span className="text-xs bg-amber-500/20 text-amber-300 font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30">
                {recipients.length} مشترك جاهز
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => setTargetAudience('all')}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  targetAudience === 'all'
                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 ring-1 ring-amber-500/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/50'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>جميع المشتركين</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetAudience('debtors')}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  targetAudience === 'debtors'
                    ? 'bg-rose-500/20 border-rose-500/60 text-rose-300 ring-1 ring-rose-500/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/50'
                }`}
              >
                <AlertCircle className="w-4 h-4" />
                <span>أصحاب المديونيات</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetAudience('zone')}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  targetAudience === 'zone'
                    ? 'bg-sky-500/20 border-sky-500/60 text-sky-300 ring-1 ring-sky-500/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/50'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>حسب المنطقة</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetAudience('tariff')}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  targetAudience === 'tariff'
                    ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 ring-1 ring-emerald-500/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/50'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>فئة التعرفة</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetAudience('manual')}
                className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  targetAudience === 'manual'
                    ? 'bg-purple-500/20 border-purple-500/60 text-purple-300 ring-1 ring-purple-500/30'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تحديد يدوي</span>
              </button>
            </div>

            {/* Sub-Filters for Zone / Tariff / Manual */}
            {targetAudience === 'zone' && (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <label className="text-xs font-semibold text-slate-300">اختر المنطقة أو المربع المستهدف:</label>
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- اختر المنطقة --</option>
                  {zonesList.map(z => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>
            )}

            {targetAudience === 'tariff' && (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <label className="text-xs font-semibold text-slate-300">اختر فئة التعرفة المستهدفة:</label>
                <select
                  value={selectedTariff}
                  onChange={(e) => setSelectedTariff(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="residential">منزلية (سكني)</option>
                  <option value="commercial">مؤسسة (تجاري)</option>
                  <option value="industrial">مصنع (صناعي)</option>
                </select>
              </div>
            )}

            {targetAudience === 'manual' && (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="بحث لتحديد المشتركين..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg pr-8 pl-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5" />
                  </div>
                  <div className="mr-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setManualSelectedIds(subscribers.filter(s => s.phone).map(s => s.id))}
                      className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                    >
                      تحديد الكل
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() => setManualSelectedIds([])}
                      className="text-[11px] text-slate-400 hover:underline cursor-pointer"
                    >
                      إلغاء التحديد
                    </button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                  {subscribers.filter(s => s.phone).map(sub => (
                    <label key={sub.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 cursor-pointer">
                      <div className="text-right">
                        <div className="font-bold text-xs text-slate-200">{sub.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{sub.phone} | عداد: {sub.meterNumber}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={manualSelectedIds.includes(sub.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setManualSelectedIds([...manualSelectedIds, sub.id]);
                          } else {
                            setManualSelectedIds(manualSelectedIds.filter(id => id !== sub.id));
                          }
                        }}
                        className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Message Content Composer */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <span>2. صياغة نص الرسالة والقوالب الذكية</span>
              </h3>
            </div>

            {/* Template Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">اختيار قالب جاهز (اختياري):</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleSelectTemplate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="">-- كتابة رسالة مخصصة جديدة --</option>
                {smsTemplates.map(tpl => (
                  <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                ))}
              </select>
            </div>

            {/* Tag Inserters */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>إدراج المتغيرات الذكية بضغطة واحدة:</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { tag: '{اسم_المشترك}', label: 'اسم المشترك' },
                  { tag: '{رقم_العداد}', label: 'رقم العداد' },
                  { tag: '{الرصيد_المتبقي}', label: 'الرصيد/المديونية' },
                  { tag: '{المبلغ}', label: 'المبلغ' },
                  { tag: '{المربع}', label: 'المنطقة' },
                  { tag: '{اسم_المحطة}', label: 'اسم المحطة' },
                  { tag: '{هاتف_المحطة}', label: 'هاتف المحطة' }
                ].map(({ tag, label }) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleInsertTag(tag)}
                    className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-amber-400 hover:text-amber-300 border border-slate-800 rounded-lg text-[11px] font-mono transition-all cursor-pointer"
                  >
                    + {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <div className="space-y-1.5">
              <textarea
                rows={5}
                value={customMessage}
                onChange={(e) => {
                  setCustomMessage(e.target.value);
                  setSelectedTemplateId('');
                }}
                placeholder="اكتب نص الرسالة هنا، يمكنك استخدام المتغيرات مثل {اسم_المشترك} ليتم استبدالها آلياً لكل مشترك..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
              />

              {/* Segment & Character Counter */}
              <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-[11px]">
                <div className="flex items-center gap-3 text-slate-400">
                  <span>الأحرف: <strong className="text-amber-400 font-mono">{segmentStats.charCount}</strong></span>
                  <span>الشرائح (SMS): <strong className="text-emerald-400 font-mono">{segmentStats.segments}</strong></span>
                  <span>الترميز: <strong className="text-sky-400 font-mono">{segmentStats.encoding}</strong></span>
                </div>
                <span className="text-slate-500">
                  متبقي في الشريحة: <strong className="text-slate-300 font-mono">{segmentStats.remainingInCurrentSegment}</strong> حرف
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Col 3: Live Preview & Broadcast Controls */}
        <div className="space-y-6">
          {/* Live Mobile Mockup Preview */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-3">
              <Smartphone className="w-4 h-4 text-indigo-400" />
              <span>معاينة حية لشاشة الهاتف (Live Preview)</span>
            </h3>

            <div className="bg-slate-950 border-2 border-slate-800 rounded-3xl p-4 max-w-xs mx-auto shadow-2xl space-y-3">
              <div className="w-12 h-1 bg-slate-800 rounded-full mx-auto" />
              
              <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-900 pb-2">
                <span>{settings.stationName || 'VOLTERA SMS'}</span>
                <span>الآن</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 text-slate-200 rounded-2xl p-3.5 text-xs whitespace-pre-wrap leading-relaxed shadow select-text">
                {sampleParsedMessage || 'نص المعاينة سيظهر هنا فور الكتابة...'}
              </div>

              <div className="text-[10px] text-slate-500 text-center font-mono">
                المستلم النموذجي: {sampleSubscriber?.name || 'مشترك تجريبي'}
              </div>
            </div>
          </div>

          {/* Action Trigger Card */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/40 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-amber-300">جاهز لإطلاق الحملة؟</h3>
              <p className="text-xs text-slate-400">
                سيتم إرسال الرسالة إلى <strong>{recipients.length}</strong> مشترك مع فاصل زمني <strong>{(settings.batchSmsIntervalMs || 1500) / 1000}</strong> ثانية.
              </p>
            </div>

            <button
              type="button"
              disabled={isBroadcasting || recipients.length === 0 || !activeMessageText.trim()}
              onClick={handleStartBroadcast}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/25 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              <span>إطلاق وبث الرسائل الجماعية الآن 🚀</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
