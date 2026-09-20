import React from 'react';
import { 
  PhoneCall, MessageCircle, FileDown, Eye, Wallet, 
  CheckCircle2, AlertCircle, Clock, Check, ChevronDown, 
  UserCheck, ShieldAlert, Sparkles, MapPin, Zap, User 
} from 'lucide-react';
import { SubscriberBalanceItem, ColumnDefinition, SummaryStatistics } from './types';
import { SystemSettings, User as CurrentUser, Subscriber } from '../../types';
import { HighlightMatch } from '../../utils/arabicSearchUtils';

interface DueBalancesTableProps {
  items: SubscriberBalanceItem[];
  startIndex: number;
  totalFilteredCount: number;
  columns: ColumnDefinition[];
  selectedSubIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  isAllSelected: boolean;
  mobileDisplayMode: 'cards' | 'table';
  onSetMobileDisplayMode: (mode: 'cards' | 'table') => void;
  searchQuery: string;
  settings: SystemSettings;
  currentUser: CurrentUser;
  onOpenSubscriberStatement?: (subscriber: Subscriber) => void;
  onCollectPayment?: (subscriber: Subscriber, defaultAmount?: number) => void;
  onQuickCollectClick: (item: SubscriberBalanceItem) => void;
  onNoticeClick: (item: SubscriberBalanceItem) => void;
  onSlipClick: (item: SubscriberBalanceItem) => void;
  summaryStats: SummaryStatistics;
  showTotalsRow?: boolean;
}

export const DueBalancesTable: React.FC<DueBalancesTableProps> = ({
  items,
  startIndex,
  totalFilteredCount,
  columns,
  selectedSubIds,
  onToggleSelect,
  onToggleSelectAll,
  isAllSelected,
  mobileDisplayMode,
  onSetMobileDisplayMode,
  searchQuery,
  settings,
  currentUser,
  onOpenSubscriberStatement,
  onCollectPayment,
  onQuickCollectClick,
  onNoticeClick,
  onSlipClick,
  summaryStats,
  showTotalsRow = true
}) => {
  const visibleColumns = columns.filter(c => c.visible);
  const currency = settings.currency || 'ريال';

  return (
    <div id="due-balances-table-root" className="space-y-3">
      {/* Mobile Mode Switcher Banner (Visible only on smaller screens) */}
      <div className="flex lg:hidden items-center justify-between p-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs font-bold text-slate-300">
        <span>طريقة عرض الكشف في الجوال:</span>
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => onSetMobileDisplayMode('cards')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              mobileDisplayMode === 'cards'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            بطاقات سريعة
          </button>
          <button
            type="button"
            onClick={() => onSetMobileDisplayMode('table')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              mobileDisplayMode === 'table'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            جدول كامل
          </button>
        </div>
      </div>

      {/* MOBILE CARDS VIEW (Only mounted when mobileDisplayMode === 'cards') */}
      {mobileDisplayMode === 'cards' && (
        <div className="block lg:hidden space-y-2.5 print:hidden">
          {items.map((item, index) => {
            const isSelected = selectedSubIds.includes(item.subscriber.id);
            const isDebtor = item.totalDue > 0;
            const isCreditor = item.paymentStatus === 'creditor';

            return (
              <div
                key={item.subscriber.id}
                className={`p-3.5 rounded-2xl border transition-all text-xs space-y-2.5 ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500/40 shadow-md'
                    : isDebtor
                    ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    : 'bg-slate-950/60 border-slate-800/80'
                }`}
              >
                {/* Card Top Row: Checkbox, Name, Meter, Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(item.subscriber.id)}
                      className="rounded accent-amber-500 w-4 h-4 cursor-pointer shrink-0 mt-0.5"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-white text-sm truncate">
                          <HighlightMatch text={item.name} query={searchQuery} />
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono font-bold">
                          #{startIndex + index + 1}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                        <span>عداد: <strong className="text-amber-400"><HighlightMatch text={item.meterNumber} query={searchQuery} /></strong></span>
                        {item.zone && item.zone !== '-' && (
                          <span className="text-slate-500 truncate">• <HighlightMatch text={item.zone} query={searchQuery} /></span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Payment Status Pill */}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                    item.paymentStatus === 'fully_paid'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : item.paymentStatus === 'partial'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : item.paymentStatus === 'creditor'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    {item.paymentStatusLabel}
                  </span>
                </div>

                {/* Financial 3-Box Grid */}
                <div className="grid grid-cols-3 gap-1.5 text-center pt-1 font-mono">
                  <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-bold font-sans">المتأخرات</span>
                    <span className={`text-xs font-bold ${item.overdueAmount > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                      {item.overdueAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-bold font-sans">آخر فاتورة</span>
                    <span className={`text-xs font-bold ${item.currentDue > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                      {item.currentDue.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-slate-950/90 p-2 rounded-xl border border-sky-500/30">
                    <span className="text-[10px] text-sky-400 block font-black font-sans">إجمالي المطلوب</span>
                    <span className="text-xs font-black text-sky-300">
                      {item.totalDue.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Collector & Aging details */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
                  <div className="flex items-center gap-1.5">
                    <span>المحصل:</span>
                    <strong className="text-slate-300">
                      <HighlightMatch text={item.collectorName || 'غير محدد'} query={searchQuery} />
                    </strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                      {item.agingBracketLabel}
                    </span>
                  </div>
                </div>

                {/* Action Buttons Row */}
                <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      if (onCollectPayment) {
                        onCollectPayment(item.subscriber, item.totalDue);
                      } else {
                        onQuickCollectClick(item);
                      }
                    }}
                    className="flex-1 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
                  >
                    <Wallet className="w-3.5 h-3.5 text-white" />
                    <span>تحصيل سريع</span>
                  </button>

                  {item.phone && item.phone !== '-' && (
                    <a
                      href={`tel:${String(item.phone || '').replace(/[^0-9]/g, '')}`}
                      className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 rounded-xl text-xs font-bold flex items-center justify-center transition-colors"
                      title="اتصال هاتفي"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => onNoticeClick(item)}
                    className="py-2 px-3 bg-emerald-950/60 hover:bg-emerald-850 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center justify-center cursor-pointer transition-colors"
                    title="إرسال إشعار واتساب"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onSlipClick(item)}
                    className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 rounded-xl text-xs font-bold flex items-center justify-center cursor-pointer transition-colors"
                    title="إشعار مطالبة ورقي"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                  </button>

                  {onOpenSubscriberStatement && (
                    <button
                      type="button"
                      onClick={() => onOpenSubscriberStatement(item.subscriber)}
                      className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl text-xs font-bold flex items-center justify-center cursor-pointer transition-colors"
                      title="كشف حساب المشترك"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {items.length === 0 && (
            <div className="p-8 text-center text-slate-500 font-bold bg-slate-950/40 rounded-2xl border border-slate-800">
              لا توجد بيانات مطابقة لمعايير الفلترة المحددة.
            </div>
          )}
        </div>
      )}

      {/* DESKTOP / EXPANDED TABLE VIEW */}
      <div className={`${mobileDisplayMode === 'cards' ? 'hidden lg:block' : 'block'} overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950 shadow-xl print:block print:border-none print:shadow-none print:bg-white print:overflow-visible`}>
        <table className="w-full text-right border-collapse text-xs print:text-black min-w-[720px] lg:min-w-full">
          {/* TABLE HEADER */}
          <thead className="bg-slate-900 text-slate-300 font-bold border-b border-slate-800 select-none print:bg-slate-100 print:text-black print:border-b-2 print:border-black sticky top-0 z-10">
            <tr>
              <th className="p-3 text-center w-10 print:hidden">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onToggleSelectAll}
                  className="rounded accent-amber-500 cursor-pointer"
                  title="تحديد الكل"
                />
              </th>

              {visibleColumns.map(col => (
                <th
                  key={col.id}
                  style={{ width: col.width }}
                  className={`p-3 font-black text-slate-200 print:text-black print:border print:border-black whitespace-nowrap ${
                    col.align === 'center' ? 'text-center' : col.align === 'left' ? 'text-left' : 'text-right'
                  }`}
                >
                  {col.label}
                </th>
              ))}

              <th className="p-3 text-center w-28 print:hidden whitespace-nowrap">إجراءات سريعة</th>
            </tr>
          </thead>

          {/* TABLE BODY */}
          <tbody className="divide-y divide-slate-800/60 print:divide-slate-300">
            {items.map((item, index) => {
              const isSelected = selectedSubIds.includes(item.subscriber.id);
              const isDebtor = item.totalDue > 0;
              const isCreditor = item.paymentStatus === 'creditor';

              return (
                <tr 
                  key={item.subscriber.id}
                  className={`transition-colors ${
                    isSelected
                      ? 'bg-amber-500/10 hover:bg-amber-500/15'
                      : isDebtor
                      ? 'hover:bg-slate-900/80 bg-slate-950'
                      : 'hover:bg-slate-900/60 bg-slate-950/40'
                  } print:bg-white`}
                >
                  {/* Selection Checkbox */}
                  <td className="p-3 text-center print:hidden">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(item.subscriber.id)}
                      className="rounded accent-amber-500 cursor-pointer"
                    />
                  </td>

                  {/* Dynamic Data Cells */}
                  {visibleColumns.map(col => {
                    let val: React.ReactNode = '';
                    switch (col.id) {
                      case 'index':
                        val = startIndex + index + 1;
                        break;
                      case 'meterNumber':
                        val = (
                          <span className="font-mono font-bold text-amber-400 print:text-black">
                            <HighlightMatch text={item.meterNumber} query={searchQuery} />
                          </span>
                        );
                        break;
                      case 'name':
                        val = (
                          <span className="font-bold text-white print:text-black">
                            <HighlightMatch text={item.name} query={searchQuery} />
                          </span>
                        );
                        break;
                      case 'phone':
                        val = (
                          <span className="font-mono text-slate-300 print:text-black flex items-center justify-start gap-1">
                            {item.phone && item.phone !== '-' ? (
                              <a 
                                href={`tel:${String(item.phone || '').replace(/[^0-9]/g, '')}`}
                                className="hover:text-amber-400 transition-colors flex items-center gap-1"
                                title="اتصال هاتفي"
                              >
                                <PhoneCall className="w-3 h-3 text-emerald-400" />
                                <span><HighlightMatch text={item.phone} query={searchQuery} /></span>
                              </a>
                            ) : '-'}
                          </span>
                        );
                        break;
                      case 'zone':
                        val = <HighlightMatch text={item.zone} query={searchQuery} />;
                        break;
                      case 'collectorName':
                        val = (
                          <span className="font-bold text-slate-200 print:text-black">
                            <HighlightMatch text={item.collectorName || 'غير محدد'} query={searchQuery} />
                          </span>
                        );
                        break;
                      case 'fieldPaid':
                        val = <div className="min-w-[65px] h-6 border-b border-dashed border-slate-600 print:border-black mx-auto" />;
                        break;
                      case 'receiptNumber':
                        val = <div className="min-w-[55px] h-6 border-b border-dashed border-slate-600 print:border-black mx-auto" />;
                        break;
                      case 'subscriberSignature':
                        val = <div className="min-w-[75px] h-6 border-b border-dashed border-slate-600 print:border-black mx-auto" />;
                        break;
                      case 'transformer':
                        val = <HighlightMatch text={item.transformer} query={searchQuery} />;
                        break;
                      case 'tariffType':
                        val = <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 print:bg-transparent print:text-black text-[11px]">{item.tariffType}</span>;
                        break;
                      case 'openingBalance':
                        val = <span className="font-mono text-slate-300">{item.openingBalance.toLocaleString()}</span>;
                        break;
                      case 'totalBilled':
                        val = <span className="font-mono text-amber-300">{item.totalBilled.toLocaleString()}</span>;
                        break;
                      case 'totalCollected':
                        val = <span className="font-mono font-black text-emerald-400 print:text-black">{item.totalCollected.toLocaleString()}</span>;
                        break;
                      case 'collectionRate':
                        val = `${item.collectionRate}%`;
                        break;
                      case 'overdueAmount':
                        val = (
                          <span className={`font-mono font-bold ${item.overdueAmount > 0 ? 'text-rose-400 print:text-black' : 'text-slate-500'}`}>
                            {item.overdueAmount.toLocaleString()}
                          </span>
                        );
                        break;
                      case 'currentDue':
                        val = (
                          <span className={`font-mono font-bold ${item.currentDue > 0 ? 'text-amber-400 print:text-black' : 'text-slate-500'}`}>
                            {item.currentDue.toLocaleString()}
                          </span>
                        );
                        break;
                      case 'totalDue':
                        val = (
                          <span className={`font-mono font-black text-sm ${
                            isDebtor ? 'text-sky-300 print:text-black' : isCreditor ? 'text-blue-400' : 'text-emerald-400'
                          }`}>
                            {item.totalDue.toLocaleString()}
                          </span>
                        );
                        break;
                      case 'paymentStatusLabel':
                        val = (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap print:border print:border-black print:text-black ${
                            item.paymentStatus === 'fully_paid'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : item.paymentStatus === 'partial'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : item.paymentStatus === 'creditor'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {item.paymentStatusLabel}
                          </span>
                        );
                        break;
                      case 'lastPaymentDate':
                        val = <span className="font-mono text-slate-400">{item.lastPaymentDate}</span>;
                        break;
                      case 'lastPaymentAmount':
                        val = item.lastPaymentAmount > 0 ? <span className="font-mono text-emerald-400 font-bold">{item.lastPaymentAmount.toLocaleString()}</span> : '-';
                        break;
                      case 'lastReadingDate':
                        val = <span className="font-mono text-slate-400">{item.lastReadingDate}</span>;
                        break;
                      case 'lastConsumption':
                        val = item.lastConsumption > 0 ? <span className="font-mono text-amber-300">{item.lastConsumption}</span> : '-';
                        break;
                      case 'agingBracket':
                        val = (
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold">
                            {item.agingBracketLabel}
                          </span>
                        );
                        break;
                      case 'status':
                        val = (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.status === 'نشط' ? 'bg-emerald-950/60 text-emerald-300' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {item.status}
                          </span>
                        );
                        break;
                      case 'notes':
                        val = <div className="min-w-[80px] h-5 border-b border-dashed border-slate-700 print:border-black" />;
                        break;
                      default:
                        val = '';
                    }

                    return (
                      <td
                        key={col.id}
                        className={`p-3 print:p-1.5 print:border print:border-black whitespace-nowrap ${
                          col.align === 'center' ? 'text-center' : col.align === 'left' ? 'text-left' : 'text-right'
                        }`}
                      >
                        {val}
                      </td>
                    );
                  })}

                  {/* Inline Action Buttons */}
                  <td className="p-3 text-center print:hidden">
                    <div className="flex items-center justify-center gap-1">
                      {/* Quick Collect Payment */}
                      <button
                        type="button"
                        onClick={() => {
                          if (onCollectPayment) {
                            onCollectPayment(item.subscriber, item.totalDue);
                          } else {
                            onQuickCollectClick(item);
                          }
                        }}
                        className="p-1.5 bg-emerald-950/80 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                        title="تسجيل تحصيل وسند فوري"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                      </button>

                      {/* Open Subscriber Statement */}
                      {onOpenSubscriberStatement && (
                        <button
                          type="button"
                          onClick={() => onOpenSubscriberStatement(item.subscriber)}
                          className="p-1.5 bg-slate-900 hover:bg-amber-500 text-slate-300 hover:text-slate-950 rounded-lg transition-colors cursor-pointer"
                          title="كشف حساب المشترك التفصيلي"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* WhatsApp Notice Dialog */}
                      <button
                        type="button"
                        onClick={() => onNoticeClick(item)}
                        className="p-1.5 bg-slate-900 hover:bg-emerald-600 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                        title="إرسال إشعار / رسالة واتساب"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>

                      {/* Print Single Field Demand Slip */}
                      <button
                        type="button"
                        onClick={() => onSlipClick(item)}
                        className="p-1.5 bg-slate-900 hover:bg-amber-500 text-slate-400 hover:text-slate-950 rounded-lg transition-colors cursor-pointer"
                        title="طباعة إشعار مطالبة رسمي ميداني"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {items.length === 0 && (
              <tr>
                <td colSpan={visibleColumns.length + 2} className="p-8 text-center text-slate-500 font-bold print:text-black">
                  لا توجد بيانات مطابقة لمعايير الفلترة والبحث المحددة.
                </td>
              </tr>
            )}
          </tbody>

          {/* TOTALS SUMMARY FOOTER */}
          {showTotalsRow && visibleColumns.length > 0 && (
            <tfoot className="bg-slate-900 font-black border-t-2 border-slate-700 text-white print:bg-slate-200 print:text-black print:border-black">
              <tr>
                <td className="p-3 text-center print:hidden">#</td>
                {visibleColumns.map((col, idx) => {
                  if (idx === 0) return <td key={col.id} className="p-3 text-center font-bold text-slate-300 print:text-black print:border">الإجمالي العام</td>;
                  if (col.id === 'totalCollected') return <td key={col.id} className="p-3 text-center font-mono text-emerald-400 print:text-black print:border">{summaryStats.totalCollected.toLocaleString()}</td>;
                  if (col.id === 'collectionRate') return <td key={col.id} className="p-3 text-center font-mono text-emerald-400 print:text-black print:border">{summaryStats.overallCollectionRate}%</td>;
                  if (col.id === 'overdueAmount') return <td key={col.id} className="p-3 text-center font-mono text-rose-400 print:text-black print:border">{summaryStats.totalOverdue.toLocaleString()}</td>;
                  if (col.id === 'currentDue') return <td key={col.id} className="p-3 text-center font-mono text-amber-400 print:text-black print:border">{summaryStats.totalCurrentDue.toLocaleString()}</td>;
                  if (col.id === 'totalDue') return <td key={col.id} className="p-3 text-center font-mono text-sky-400 print:text-black print:border">{summaryStats.totalDueSum.toLocaleString()}</td>;
                  return <td key={col.id} className="p-3 print:border">{idx === 1 ? `(${totalFilteredCount} مشترك)` : ''}</td>;
                })}
                <td className="p-3 print:hidden" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};
