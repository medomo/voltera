import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Subscriber, SystemSettings, MeterReading } from '../../types';
import { parseSmsTemplate, sendSMSDirectly, generateWhatsAppLink, formatPhoneNumberForWhatsApp } from '../../utils/smsService';
import {
  Users, Phone, CheckCircle2, AlertCircle, AlertTriangle,
  Search, Filter, Edit2, Check, X, Send, MessageSquare,
  Download, ExternalLink, RefreshCw, Smartphone, ShieldCheck
} from 'lucide-react';

interface SmsPhoneHealthViewProps {
  subscribers: Subscriber[];
  settings: SystemSettings;
  readings: MeterReading[];
  onUpdateSubscribers?: (subs: Subscriber[]) => void;
}

export const SmsPhoneHealthView: React.FC<SmsPhoneHealthViewProps> = ({
  subscribers,
  settings,
  readings,
  onUpdateSubscribers
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterHealth, setFilterHealth] = useState<'all' | 'valid' | 'missing' | 'invalid'>('all');
  const [filterOperator, setFilterOperator] = useState<string>('all');
  const [filterZone, setFilterZone] = useState<string>('all');
  
  // Quick Edit State
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editingPhoneValue, setEditingPhoneValue] = useState<string>('');
  
  // Direct Single SMS Modal
  const [directSmsTarget, setDirectSmsTarget] = useState<Subscriber | null>(null);
  const [directSmsText, setDirectSmsText] = useState<string>('');
  const [isSendingDirect, setIsSendingDirect] = useState<boolean>(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  const getPhoneStatus = (phone?: string): { status: 'valid' | 'missing' | 'invalid'; operator: string; label: string } => {
    if (!phone || !phone.trim()) {
      return { status: 'missing', operator: 'none', label: 'بدون رقم هاتف' };
    }
    const clean = phone.replace(/[^0-9]/g, '');
    
    // Yemen Mobile Format
    if (clean.startsWith('77') || clean.startsWith('78') || (clean.startsWith('96777') || clean.startsWith('96778'))) {
      const isValidLen = clean.length === 9 || clean.length === 12;
      return {
        status: isValidLen ? 'valid' : 'invalid',
        operator: clean.includes('78') ? 'واي Y' : 'يمن موبايل (77)',
        label: isValidLen ? 'صحيح' : 'طول غير مطابق'
      };
    }
    // YOU (73)
    if (clean.startsWith('73') || clean.startsWith('96773')) {
      const isValidLen = clean.length === 9 || clean.length === 12;
      return {
        status: isValidLen ? 'valid' : 'invalid',
        operator: 'يو YOU (73)',
        label: isValidLen ? 'صحيح' : 'طول غير مطابق'
      };
    }
    // Sabafon (71 / 70)
    if (clean.startsWith('71') || clean.startsWith('70') || clean.startsWith('96771') || clean.startsWith('96770')) {
      const isValidLen = clean.length === 9 || clean.length === 12;
      return {
        status: isValidLen ? 'valid' : 'invalid',
        operator: 'سبأفون (71/70)',
        label: isValidLen ? 'صحيح' : 'طول غير مطابق'
      };
    }

    // Generic mobile or international
    if (clean.length >= 8 && clean.length <= 15) {
      return { status: 'valid', operator: 'شبكة أخرى', label: 'صحيح' };
    }

    return { status: 'invalid', operator: 'غير معروف', label: 'صيغة غير صحيحة' };
  };

  const handleStartEdit = (sub: Subscriber) => {
    setEditingSubId(sub.id);
    setEditingPhoneValue(sub.phone || '');
  };

  const handleSavePhone = (subId: string) => {
    if (!onUpdateSubscribers) return;
    const cleanPhone = editingPhoneValue.trim();
    const updated = subscribers.map(s => s.id === subId ? { ...s, phone: cleanPhone } : s);
    onUpdateSubscribers(updated);
    setEditingSubId(null);
    setToastNotice('تم تحديث رقم هاتف المشترك بنجاح');
    setTimeout(() => setToastNotice(null), 3000);
  };

  const handleOpenDirectSms = (sub: Subscriber) => {
    setDirectSmsTarget(sub);
    setDirectSmsText(`الأخ المشترك: ${sub.name}\nنود إحاطتكم بأن رصيد حسابكم الحالي هو ${sub.currentBalance || 0} ${settings.currency || 'ريال'}.\n${settings.stationName || 'إدارة المحطة'}`);
  };

  const handleSendDirectSms = async () => {
    if (!directSmsTarget || !directSmsTarget.phone) return;
    setIsSendingDirect(true);
    try {
      const res = await sendSMSDirectly(directSmsTarget.phone, directSmsText, {
        subscriberId: directSmsTarget.id,
        subscriberName: directSmsTarget.name,
        meterNumber: directSmsTarget.meterNumber,
        type: 'custom',
        smsGatewayConfig: settings.smsGatewayConfig
      });
      setToastNotice(res.message || 'تم إرسال الرسالة بنجاح');
      setDirectSmsTarget(null);
    } catch (e: any) {
      alert(`خطأ: ${e.message}`);
    } finally {
      setIsSendingDirect(false);
      setTimeout(() => setToastNotice(null), 3500);
    }
  };

  const handleExportMissing = () => {
    const missing = subscribers.filter(s => getPhoneStatus(s.phone).status !== 'valid');
    if (missing.length === 0) {
      alert('جميع المشتركين لديهم أرقام هواتف صالحة ومسجلة!');
      return;
    }

    const headers = ['المعرف', 'اسم المشترك', 'رقم العداد', 'المنطقة', 'الرقم الحالي', 'حالة الرقم'];
    const rows = missing.map(s => [
      s.id,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.meterNumber}"`,
      `"${s.zone || ''}"`,
      `"${s.phone || ''}"`,
      getPhoneStatus(s.phone).label
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `subscribers_missing_phones_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Metrics
  const totalSubscribers = subscribers.length;
  const validPhones = subscribers.filter(s => getPhoneStatus(s.phone).status === 'valid').length;
  const missingPhones = subscribers.filter(s => getPhoneStatus(s.phone).status === 'missing').length;
  const invalidPhones = subscribers.filter(s => getPhoneStatus(s.phone).status === 'invalid').length;
  const healthPercent = totalSubscribers > 0 ? Math.round((validPhones / totalSubscribers) * 100) : 0;

  // Filter List
  const filteredSubscribers = subscribers.filter(sub => {
    const phoneHealth = getPhoneStatus(sub.phone);
    if (filterHealth !== 'all' && phoneHealth.status !== filterHealth) return false;
    if (filterOperator !== 'all' && phoneHealth.operator !== filterOperator) return false;
    if (filterZone !== 'all' && sub.zone !== filterZone) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = sub.name.toLowerCase().includes(q);
      const matchPhone = (sub.phone || '').includes(q);
      const matchMeter = sub.meterNumber.toLowerCase().includes(q);
      const matchCode = (sub.subscriberCode || '').toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchMeter && !matchCode) return false;
    }
    return true;
  });

  const zonesList = Array.from(new Set(subscribers.map(s => s.zone).filter(Boolean)));

  return (
    <div className="space-y-6 text-right font-sans">
      {toastNotice && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 p-3.5 rounded-xl text-xs flex items-center justify-between shadow-lg"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold">{toastNotice}</span>
          </div>
        </motion.div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 font-medium">إجمالي المشتركين</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-slate-100 font-mono">{totalSubscribers}</span>
            <Users className="w-5 h-5 text-slate-500" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[11px] text-emerald-400 font-medium">جاهزية الرسائل (أرقام صالحة)</span>
          <div className="flex items-baseline justify-between mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-400 font-mono">{validPhones}</span>
              <span className="text-[11px] text-emerald-400/80 font-bold font-mono">({healthPercent}%)</span>
            </div>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-rose-500/30 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[11px] text-rose-400 font-medium">بدون رقم هاتف (مفقود)</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-rose-400 font-mono">{missingPhones}</span>
            <AlertCircle className="w-5 h-5 text-rose-400" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[11px] text-amber-400 font-medium">أرقام غير مكتملة / خاطئة</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-amber-400 font-mono">{invalidPhones}</span>
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Filters & Export */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم، رقم الهاتف، أو العداد..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={handleExportMissing}
              className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-xl text-xs flex items-center gap-1.5 transition-colors border border-amber-500/30 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير كشف النواقص للمحصلين</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 ml-2">
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            <span>تصفية:</span>
          </div>

          {/* Health Tabs */}
          <div className="inline-flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setFilterHealth('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${filterHealth === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              الكل ({totalSubscribers})
            </button>
            <button
              onClick={() => setFilterHealth('valid')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${filterHealth === 'valid' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              الصحيحة ({validPhones})
            </button>
            <button
              onClick={() => setFilterHealth('missing')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${filterHealth === 'missing' ? 'bg-rose-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              المفقودة ({missingPhones})
            </button>
            <button
              onClick={() => setFilterHealth('invalid')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${filterHealth === 'invalid' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              غير المطابقة ({invalidPhones})
            </button>
          </div>

          {/* Zone Filter */}
          <select
            value={filterZone}
            onChange={(e) => setFilterZone(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-[11px] rounded-lg px-2.5 py-1 focus:outline-none focus:border-amber-500"
          >
            <option value="all">كل المناطق والمربعات</option>
            {zonesList.map(z => (
              <option key={z} value={z}>{z}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-medium">
              <tr>
                <th className="py-3 px-4">المشترك والعداد</th>
                <th className="py-3 px-4">المنطقة والقطاع</th>
                <th className="py-3 px-4">رقم الهاتف المسجل</th>
                <th className="py-3 px-4">المشغل وحالة الرقم</th>
                <th className="py-3 px-4 text-center">إجراءات فورية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredSubscribers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium">لا يوجد مشتركون مطابقون للتصفية الحالية.</p>
                  </td>
                </tr>
              ) : (
                filteredSubscribers.map((sub) => {
                  const phoneHealth = getPhoneStatus(sub.phone);
                  const isEditing = editingSubId === sub.id;
                  const whatsappLink = sub.phone ? generateWhatsAppLink(sub.phone, `مرحباً ${sub.name}، بخصوص اشتراك الكهرباء رقم عداد ${sub.meterNumber}`) : '';

                  return (
                    <tr key={sub.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-200">{sub.name}</div>
                        <div className="text-[10px] text-amber-400 font-mono">عداد: {sub.meterNumber}</div>
                      </td>

                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        <div>{sub.zone || 'الرئيسي'}</div>
                        <div className="text-[10px] text-slate-500">{sub.tariffType === 'residential' ? 'سكني' : sub.tariffType === 'commercial' ? 'تجاري' : 'صناعي'}</div>
                      </td>

                      <td className="py-3 px-4">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              dir="ltr"
                              value={editingPhoneValue}
                              onChange={(e) => setEditingPhoneValue(e.target.value)}
                              placeholder="777123456"
                              className="w-32 bg-slate-950 border border-amber-500 rounded-lg px-2 py-1 text-xs text-amber-300 font-mono focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSavePhone(sub.id)}
                              className="p-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-md cursor-pointer"
                              title="حفظ الرقم"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingSubId(null)}
                              className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-md cursor-pointer"
                              title="إلغاء"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {sub.phone ? (
                              <span className="font-mono text-slate-200 font-bold dir-ltr bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                                {sub.phone}
                              </span>
                            ) : (
                              <span className="text-[11px] text-rose-400/80 italic">غير مسجل</span>
                            )}
                            <button
                              onClick={() => handleStartEdit(sub)}
                              className="text-slate-500 hover:text-amber-400 p-1 cursor-pointer transition-colors"
                              title="تعديل رقم الهاتف"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5 items-start">
                          {phoneHealth.status === 'valid' ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>{phoneHealth.operator}</span>
                            </span>
                          ) : phoneHealth.status === 'missing' ? (
                            <span className="inline-flex items-center gap-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                              <AlertCircle className="w-2.5 h-2.5" />
                              <span>بدون رقم</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span>غير مطابق</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {sub.phone && (
                            <>
                              <button
                                onClick={() => handleOpenDirectSms(sub)}
                                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors border border-amber-500/30 cursor-pointer"
                                title="إرسال رسالة SMS للمشترك"
                              >
                                <Send className="w-3 h-3" />
                                <span>إرسال SMS</span>
                              </button>

                              {whatsappLink && (
                                <a
                                  href={whatsappLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg transition-colors border border-emerald-500/30 cursor-pointer"
                                  title="فتح في واتساب"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </>
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

      {/* Direct SMS Modal */}
      {directSmsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 text-right"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <button
                onClick={() => setDirectSmsTarget(null)}
                className="text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-400" />
                <span>إرسال رسالة مباشرة للمشترك ({directSmsTarget.name})</span>
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800 font-mono">
                <span className="text-amber-400 font-bold">{directSmsTarget.phone}</span>
                <span className="text-slate-400">عداد: {directSmsTarget.meterNumber}</span>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">نص الرسالة:</label>
                <textarea
                  rows={5}
                  value={directSmsText}
                  onChange={(e) => setDirectSmsText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleSendDirectSms}
                disabled={isSendingDirect}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className={`w-3.5 h-3.5 ${isSendingDirect ? 'animate-spin' : ''}`} />
                <span>{isSendingDirect ? 'جاري الإرسال...' : 'إرسال الرسالة الآن'}</span>
              </button>
              <button
                onClick={() => setDirectSmsTarget(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
