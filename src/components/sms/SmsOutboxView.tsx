import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { SmsOutboxLog, SystemSettings } from '../../types';
import { getSmsOutboxLogs, clearSmsOutboxLogs, sendSMSDirectly, generateWhatsAppLink } from '../../utils/smsService';
import {
  Send, CheckCircle2, AlertCircle, Clock, RefreshCw, Trash2,
  Search, Filter, Download, Phone, Smartphone, Cloud, MessageSquare,
  Copy, ExternalLink, ShieldCheck, Check, AlertTriangle
} from 'lucide-react';

interface SmsOutboxViewProps {
  settings: SystemSettings;
  onNavigateSection?: (section: string) => void;
}

export const SmsOutboxView: React.FC<SmsOutboxViewProps> = ({ settings }) => {
  const [logs, setLogs] = useState<SmsOutboxLog[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'failed' | 'pending'>('all');
  const [channelFilter, setChannelFilter] = useState<'all' | 'android_native' | 'cloud_gateway' | 'sms_uri' | 'whatsapp'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'reading' | 'payment' | 'reminder' | 'broadcast' | 'maintenance' | 'custom'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const loadLogs = () => {
    const fetched = getSmsOutboxLogs();
    setLogs(fetched);
  };

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 4000);
    return () => clearInterval(interval);
  }, []);

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotice({ message, type });
    setTimeout(() => setNotice(null), 3500);
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showNotification('تم نسخ نص الرسالة إلى الحافظة', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearAll = () => {
    if (logs.length === 0) return;
    if (confirm('هل أنت متأكد من رغبتك في تفريغ سجل الرسائل الصادرة بالكامل؟')) {
      clearSmsOutboxLogs();
      loadLogs();
      showNotification('تم تفريغ سجل الرسائل بنجاح', 'success');
    }
  };

  const handleResend = async (log: SmsOutboxLog) => {
    setResendingId(log.id);
    try {
      const res = await sendSMSDirectly(log.phone, log.message, {
        subscriberId: log.subscriberId,
        subscriberName: log.subscriberName,
        meterNumber: log.meterNumber,
        type: log.type || 'custom',
        smsGatewayConfig: settings.smsGatewayConfig,
      });

      if (res.success) {
        showNotification(res.message || 'تمت إعادة إرسال الرسالة بنجاح', 'success');
      } else {
        showNotification(res.message || 'تعذر إعادة الإرسال', 'error');
      }
      loadLogs();
    } catch (e: any) {
      showNotification(`خطأ في الإرسال: ${e.message}`, 'error');
    } finally {
      setResendingId(null);
    }
  };

  const handleExportCsv = () => {
    if (logs.length === 0) {
      alert('لا توجد بيانات رسائل لتصديرها.');
      return;
    }

    const headers = ['المعرف', 'التاريخ والوقت', 'المستلم', 'رقم الهاتف', 'العداد', 'النوع', 'القناة', 'الحالة', 'الرسالة'];
    const rows = logs.map(l => [
      l.id,
      l.timestamp,
      `"${(l.subscriberName || 'غير محدد').replace(/"/g, '""')}"`,
      `"${l.phone}"`,
      `"${l.meterNumber || ''}"`,
      l.type || 'custom',
      l.method,
      l.status,
      `"${(l.message || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `voltera_sms_outbox_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered list
  const filteredLogs = logs.filter(log => {
    if (statusFilter !== 'all' && log.status !== statusFilter) return false;
    if (channelFilter !== 'all' && log.method !== channelFilter) return false;
    if (typeFilter !== 'all' && log.type !== typeFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = (log.subscriberName || '').toLowerCase().includes(q);
      const matchPhone = (log.phone || '').includes(q);
      const matchMeter = (log.meterNumber || '').toLowerCase().includes(q);
      const matchMsg = log.message.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchMeter && !matchMsg) return false;
    }
    return true;
  });

  // Analytics
  const totalCount = logs.length;
  const sentCount = logs.filter(l => l.status === 'sent').length;
  const failedCount = logs.filter(l => l.status === 'failed').length;
  const nativeCount = logs.filter(l => l.method === 'android_native').length;
  const gatewayCount = logs.filter(l => l.method === 'cloud_gateway').length;
  const whatsappCount = logs.filter(l => l.method === 'whatsapp').length;
  const successRate = totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 100;

  const getTypeBadge = (type?: string) => {
    switch (type) {
      case 'reading':
        return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold">فاتورة قراءة</span>;
      case 'payment':
        return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold">سند قبض</span>;
      case 'reminder':
        return <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded text-[10px] font-bold">تذكير مديونية</span>;
      case 'broadcast':
        return <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded text-[10px] font-bold">بث جماعي</span>;
      case 'maintenance':
        return <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded text-[10px] font-bold">إشعار صيانة</span>;
      default:
        return <span className="bg-slate-700/50 text-slate-300 border border-slate-600/40 px-2 py-0.5 rounded text-[10px]">مخصص</span>;
    }
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'android_native':
        return (
          <span className="flex items-center gap-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded text-[10px] font-medium">
            <Smartphone className="w-3 h-3" />
            <span>جسر أندرويد</span>
          </span>
        );
      case 'cloud_gateway':
        return (
          <span className="flex items-center gap-1 bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded text-[10px] font-medium">
            <Cloud className="w-3 h-3" />
            <span>بوابة سحابية</span>
          </span>
        );
      case 'whatsapp':
        return (
          <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-medium">
            <MessageSquare className="w-3 h-3" />
            <span>واتساب</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded text-[10px]">
            <Send className="w-3 h-3" />
            <span>تطبيق الرسائل</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 text-right font-sans">
      {notice && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 rounded-xl text-xs flex items-center justify-between shadow-lg border ${
            notice.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
              : notice.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
              : 'bg-cyan-950/90 border-cyan-500/40 text-cyan-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {notice.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
            {notice.type === 'info' && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
            <span className="font-bold">{notice.message}</span>
          </div>
        </motion.div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 font-medium">إجمالي الصادر</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-slate-100 font-mono">{totalCount}</span>
            <Send className="w-4 h-4 text-slate-500" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] text-emerald-400 font-medium">مُرسل بنجاح</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-emerald-400 font-mono">{sentCount}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-rose-500/30 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] text-rose-400 font-medium">تعذر الإرسال</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-rose-400 font-mono">{failedCount}</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-indigo-500/30 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] text-indigo-400 font-medium">عبر SIM أندرويد</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-indigo-300 font-mono">{nativeCount}</span>
            <Smartphone className="w-4 h-4 text-indigo-400" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-sky-500/30 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] text-sky-400 font-medium">عبر البوابات API</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-sky-300 font-mono">{gatewayCount}</span>
            <Cloud className="w-4 h-4 text-sky-400" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] text-amber-400 font-medium">نسبة النجاح</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-amber-300 font-mono">{successRate}%</span>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
        </div>
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم، رقم الهاتف، العداد، أو النص..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end overflow-x-auto pb-1">
            <button
              onClick={loadLogs}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer shrink-0"
              title="تحديث السجل"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>تحديث</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center gap-1.5 transition-colors border border-emerald-500/30 cursor-pointer shrink-0"
              title="تصدير CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير Excel/CSV</span>
            </button>

            <button
              onClick={handleClearAll}
              className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-1.5 transition-colors border border-rose-500/30 cursor-pointer shrink-0"
              title="مسح السجل"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>تفريغ السجل</span>
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 ml-2">
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            <span>تصفية:</span>
          </div>

          {/* Status Tabs */}
          <div className="inline-flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${statusFilter === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              الكل ({logs.length})
            </button>
            <button
              onClick={() => setStatusFilter('sent')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${statusFilter === 'sent' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              الناجحة ({sentCount})
            </button>
            <button
              onClick={() => setStatusFilter('failed')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${statusFilter === 'failed' ? 'bg-rose-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              المتعثرة ({failedCount})
            </button>
          </div>

          {/* Channel Select */}
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-[11px] rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-500"
          >
            <option value="all">كل قنوات الإرسال</option>
            <option value="android_native">جسر أندرويد (SIM)</option>
            <option value="cloud_gateway">بوابات API السحابية</option>
            <option value="whatsapp">واتساب مباشر</option>
            <option value="sms_uri">تطبيق الرسائل اليدوي</option>
          </select>

          {/* Type Select */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-[11px] rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-500"
          >
            <option value="all">كل أنواع الرسائل</option>
            <option value="reading">فواتير القراءات</option>
            <option value="payment">سندات القبض</option>
            <option value="reminder">تذكير بالمديونية</option>
            <option value="broadcast">حملات وبث جماعي</option>
            <option value="maintenance">إشعارات الصيانة</option>
            <option value="custom">رسائل مخصصة</option>
          </select>
        </div>
      </div>

      {/* Outbox Table / Cards */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-medium">
              <tr>
                <th className="py-3 px-4">المستلم والاشتراك</th>
                <th className="py-3 px-4">رقم الهاتف</th>
                <th className="py-3 px-4">نوع الإشعار</th>
                <th className="py-3 px-4">القناة والحالة</th>
                <th className="py-3 px-4">نص الرسالة</th>
                <th className="py-3 px-4">التوقيت</th>
                <th className="py-3 px-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Send className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium">لا توجد رسائل مسجلة مطابقة للبحث أو التصفية الحالية.</p>
                    <p className="text-[11px] text-slate-600 mt-1">تظهر هنا جميع الرسائل الصادرة سواء تم إرسالها آلياً عبر الجسر أو يدوياً.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const whatsappLink = generateWhatsAppLink(log.phone, log.message);
                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-200">
                          {log.subscriberName || 'مشترك عام'}
                        </div>
                        {log.meterNumber && (
                          <div className="text-[10px] text-amber-400/80 font-mono">
                            عداد: {log.meterNumber}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono text-slate-300 font-semibold dir-ltr text-[11px] inline-block bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {log.phone}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {getTypeBadge(log.type)}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          {getMethodBadge(log.method)}
                          {log.status === 'sent' ? (
                            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>تم الإرسال</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-rose-400 flex items-center gap-1 font-medium" title={log.errorMessage}>
                              <AlertCircle className="w-2.5 h-2.5" />
                              <span>فشل: {log.errorMessage || 'خطأ غير محدد'}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80 text-[11px] text-slate-300 whitespace-pre-wrap line-clamp-2 select-text font-sans">
                          {log.message}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-[10px] text-slate-400 font-mono whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleDateString('ar-YE', {
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleCopyText(log.id, log.message)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                            title="نسخ نص الرسالة"
                          >
                            {copiedId === log.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={() => handleResend(log)}
                            disabled={resendingId === log.id}
                            className="p-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                            title="إعادة إرسال الرسالة"
                          >
                            <Send className={`w-3.5 h-3.5 ${resendingId === log.id ? 'animate-spin' : ''}`} />
                          </button>

                          {whatsappLink && (
                            <a
                              href={whatsappLink}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg transition-colors cursor-pointer"
                              title="فتح في واتساب"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
