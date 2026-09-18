import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  CreditCard, Clock, AlertTriangle, ShieldAlert, Phone, 
  Search, Filter, Printer, ExternalLink, MessageCircle, 
  FileSpreadsheet, ArrowUpDown, CheckCircle2, UserX
} from 'lucide-react';
import { BaseReportProps } from './types';

export const DebtAgingTab: React.FC<BaseReportProps> = ({
  subscribers,
  readings,
  payments,
  settings,
  onNavigateToTab
}) => {
  const currency = settings.currency || 'ر.ي';

  const [selectedAgingBracket, setSelectedAgingBracket] = useState<'all' | '30' | '60' | '90' | 'over90'>('all');
  const [debtSearch, setDebtSearch] = useState<string>('');
  const [debtSort, setDebtSort] = useState<'balance_desc' | 'days_desc'>('balance_desc');

  // Compute aging for all subscribers with balance > 0
  const debtAgingAnalysis = React.useMemo(() => {
    const now = new Date();

    let b30 = 0;
    let b60 = 0;
    let b90 = 0;
    let bOver90 = 0;

    const debtorsList = subscribers
      .filter(s => (s.currentBalance || 0) > 0)
      .map(sub => {
        // Find last payment date or oldest unpaid reading
        const subPayments = payments.filter(p => p.subscriberId === sub.id);
        const subReadings = readings.filter(r => r.subscriberId === sub.id);

        let lastActivityDate = sub.createdAt ? new Date(sub.createdAt) : new Date(now.getTime() - 45 * 86400000);
        
        if (subPayments.length > 0) {
          const sortedPayments = [...subPayments].sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
          lastActivityDate = new Date(sortedPayments[0].paymentDate);
        } else if (subReadings.length > 0) {
          const sortedReadings = [...subReadings].sort((a, b) => new Date(a.readingDate || a.billingMonth).getTime() - new Date(b.readingDate || b.billingMonth).getTime());
          lastActivityDate = new Date(sortedReadings[0].readingDate || sortedReadings[0].billingMonth);
        }

        const diffTime = Math.abs(now.getTime() - lastActivityDate.getTime());
        const daysOld = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

        let bracket: '30' | '60' | '90' | 'over90' = '30';
        if (daysOld <= 30) {
          b30 += sub.currentBalance;
          bracket = '30';
        } else if (daysOld <= 60) {
          b60 += sub.currentBalance;
          bracket = '60';
        } else if (daysOld <= 90) {
          b90 += sub.currentBalance;
          bracket = '90';
        } else {
          bOver90 += sub.currentBalance;
          bracket = 'over90';
        }

        return {
          ...sub,
          daysOld,
          bracket,
          lastActivityDate: lastActivityDate.toISOString().split('T')[0]
        };
      });

    return {
      b30,
      b60,
      b90,
      bOver90,
      totalDebt: b30 + b60 + b90 + bOver90,
      debtorsList
    };
  }, [subscribers, payments, readings]);

  // Filter & Sort
  const filteredDebtors = React.useMemo(() => {
    let list = debtAgingAnalysis.debtorsList;

    if (selectedAgingBracket !== 'all') {
      list = list.filter(d => d.bracket === selectedAgingBracket);
    }

    if (debtSearch.trim()) {
      const q = debtSearch.toLowerCase();
      list = list.filter(d => 
        (d.name || '').toLowerCase().includes(q) ||
        (d.meterNumber || '').toLowerCase().includes(q) ||
        (d.phone || '').includes(q) ||
        (d.zone || '').toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (debtSort === 'balance_desc') return b.currentBalance - a.currentBalance;
      if (debtSort === 'days_desc') return b.daysOld - a.daysOld;
      return 0;
    });

    return list;
  }, [debtAgingAnalysis.debtorsList, selectedAgingBracket, debtSearch, debtSort]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 text-right"
      dir="rtl"
    >
      {/* 1. AGING BUCKETS 4-TIER CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Bracket 1: <= 30 Days */}
        <div 
          onClick={() => setSelectedAgingBracket(selectedAgingBracket === '30' ? 'all' : '30')}
          className={`p-5 rounded-3xl border shadow-lg cursor-pointer transition-all ${
            selectedAgingBracket === '30' 
              ? 'bg-emerald-500/20 border-emerald-400 ring-2 ring-emerald-500/40' 
              : 'bg-slate-900 border-slate-800 hover:border-emerald-500/40'
          }`}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg">
              حتى 30 يوماً
            </span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xs text-slate-400 font-bold">ديون جارية حديثة</p>
          <h3 className="text-xl font-black text-white font-mono mt-1">
            {debtAgingAnalysis.b30.toLocaleString()} <span className="text-xs font-sans text-slate-400">{currency}</span>
          </h3>
          <p className="text-[10px] text-slate-500 font-bold mt-1">دورة الفوترة الحالية</p>
        </div>

        {/* Bracket 2: 31-60 Days */}
        <div 
          onClick={() => setSelectedAgingBracket(selectedAgingBracket === '60' ? 'all' : '60')}
          className={`p-5 rounded-3xl border shadow-lg cursor-pointer transition-all ${
            selectedAgingBracket === '60' 
              ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-500/40' 
              : 'bg-slate-900 border-slate-800 hover:border-amber-500/40'
          }`}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg">
              31 - 60 يوماً
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xs text-slate-400 font-bold">ديون متوسطة التأخير</p>
          <h3 className="text-xl font-black text-white font-mono mt-1">
            {debtAgingAnalysis.b60.toLocaleString()} <span className="text-xs font-sans text-slate-400">{currency}</span>
          </h3>
          <p className="text-[10px] text-slate-500 font-bold mt-1">تأخر شهر إلى شهرين</p>
        </div>

        {/* Bracket 3: 61-90 Days */}
        <div 
          onClick={() => setSelectedAgingBracket(selectedAgingBracket === '90' ? 'all' : '90')}
          className={`p-5 rounded-3xl border shadow-lg cursor-pointer transition-all ${
            selectedAgingBracket === '90' 
              ? 'bg-orange-500/20 border-orange-400 ring-2 ring-orange-500/40' 
              : 'bg-slate-900 border-slate-800 hover:border-orange-500/40'
          }`}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black px-2 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg">
              61 - 90 يوماً
            </span>
            <ShieldAlert className="w-4 h-4 text-orange-400" />
          </div>
          <p className="text-xs text-slate-400 font-bold">ديون متأخرة عاجلة</p>
          <h3 className="text-xl font-black text-white font-mono mt-1">
            {debtAgingAnalysis.b90.toLocaleString()} <span className="text-xs font-sans text-slate-400">{currency}</span>
          </h3>
          <p className="text-[10px] text-slate-500 font-bold mt-1">تتطلب إشعاراً عاجلاً بالسداد</p>
        </div>

        {/* Bracket 4: > 90 Days */}
        <div 
          onClick={() => setSelectedAgingBracket(selectedAgingBracket === 'over90' ? 'all' : 'over90')}
          className={`p-5 rounded-3xl border shadow-lg cursor-pointer transition-all ${
            selectedAgingBracket === 'over90' 
              ? 'bg-rose-500/30 border-rose-400 ring-2 ring-rose-500/50' 
              : 'bg-slate-900 border-slate-800 hover:border-rose-500/40'
          }`}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black px-2 py-0.5 bg-rose-600 text-white rounded-lg">
              أكثر من 90 يوماً
            </span>
            <UserX className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-xs text-slate-400 font-bold">ديون حرجة / إنذار فصل</p>
          <h3 className="text-xl font-black text-rose-400 font-mono mt-1">
            {debtAgingAnalysis.bOver90.toLocaleString()} <span className="text-xs font-sans text-slate-400">{currency}</span>
          </h3>
          <p className="text-[10px] text-rose-400 font-bold mt-1">يتعين قطع الخدمة أو جدولتها</p>
        </div>
      </div>

      {/* 2. DEBTORS TABLE & CONTROLS */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-rose-400" />
              <span>قائمة المشتركين المدينين وتفاصيل أعمار المديونيات</span>
            </h3>
            <p className="text-xs text-slate-400 font-bold mt-0.5">
              متابعة المشتركين المتعثرين وإرسال إشعارات التذكير بالسداد مباشرة عبر واتساب
            </p>
          </div>

          {/* Table Filters */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Search */}
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs flex-1 sm:flex-none">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="بحث في المدينين..."
                value={debtSearch}
                onChange={e => setDebtSearch(e.target.value)}
                className="bg-transparent text-white placeholder-slate-500 outline-none text-xs w-28 sm:w-36 font-bold"
              />
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={debtSort}
                onChange={e => setDebtSort(e.target.value as any)}
                className="bg-transparent text-slate-200 font-bold outline-none cursor-pointer"
              >
                <option value="balance_desc" className="bg-slate-900 text-white">المديونية (الأعلى أولاً)</option>
                <option value="days_desc" className="bg-slate-900 text-white">عمر المديونية (الأقدم أولاً)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Debtors Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th className="p-3 text-center">الترتيب</th>
                <th className="p-3">اسم المشترك</th>
                <th className="p-3 text-center">رقم العداد</th>
                <th className="p-3 text-center">الهاتف</th>
                <th className="p-3 text-center">المنطقة</th>
                <th className="p-3 text-center">الرصيد القائم</th>
                <th className="p-3 text-center">عمر المديونية</th>
                <th className="p-3 text-center">تواصل سريع</th>
                <th className="p-3 text-center">كشف الحساب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-bold text-slate-200">
              {filteredDebtors.map((sub, idx) => {
                const isCritical = sub.daysOld > 90;
                const isWarning = sub.daysOld > 60 && sub.daysOld <= 90;
                const cleanPhone = (sub.phone || '').replace(/[^0-9]/g, '');

                const whatsappMsg = `عزيزي المشترك ${sub.name} المحترم،\nنود تذكيركم بأن رصيدكم القائم لخدمة الكهرباء بمحطة (${settings.stationName || 'الكهرباء'}) يبلغ: ${sub.currentBalance.toLocaleString()} ${currency}.\nرقم العداد: ${sub.meterNumber}.\nيرجى التكرم بسرعة السداد لتجنب انقطاع الخدمة. شكراً لتعاونكم.`;

                return (
                  <tr key={sub.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 text-center font-mono text-slate-500 font-bold">#{idx + 1}</td>
                    <td className="p-3 font-black text-white">{sub.name}</td>
                    <td className="p-3 text-center font-mono text-slate-400">{sub.meterNumber}</td>
                    <td className="p-3 text-center font-mono text-slate-300" dir="ltr">{sub.phone || '—'}</td>
                    <td className="p-3 text-center text-slate-300">{sub.zone || 'الرئيسية'}</td>
                    <td className="p-3 text-center font-mono text-rose-400 font-black text-sm">
                      {sub.currentBalance.toLocaleString()} {currency}
                    </td>
                    <td className="p-3 text-center font-mono">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${
                        isCritical 
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' 
                          : isWarning 
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {sub.daysOld} يوم
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {cleanPhone ? (
                        <a
                          href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMsg)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-[10px] font-black transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>تذكير واتساب</span>
                        </a>
                      ) : (
                        <span className="text-slate-600 text-[10px]">لا يوجد هاتف</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {onNavigateToTab && (
                        <button
                          type="button"
                          onClick={() => onNavigateToTab('statements', sub.id)}
                          className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>كشف الحساب</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredDebtors.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    لا توجد مديونيات مطابقة للمعايير المحددة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
