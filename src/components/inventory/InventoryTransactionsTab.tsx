import React, { useState, useMemo } from 'react';
import { InventoryTransaction, SystemSettings } from '../../types';
import { 
  RefreshCw, Search, Printer, Download, ArrowUpRight, 
  ArrowDownRight, ArrowRightLeft, AlertTriangle, SlidersHorizontal,
  RotateCcw, FileText, CheckCircle2, User, Building2, Calendar, X
} from 'lucide-react';
import { motion } from 'motion/react';
import { printData, exportToCSV } from '../../utils/exportUtils';

interface InventoryTransactionsTabProps {
  transactions: InventoryTransaction[];
  settings?: SystemSettings;
  onPrintVoucher?: (tx: InventoryTransaction) => void;
}

export const InventoryTransactionsTab: React.FC<InventoryTransactionsTabProps> = ({
  transactions,
  settings,
  onPrintVoucher
}) => {
  const currency = settings?.currency || 'ر.ي';
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedTxForPrint, setSelectedTxForPrint] = useState<InventoryTransaction | null>(null);

  // Filtered transactions
  const filteredTxs = useMemo(() => {
    return transactions.filter(tx => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchItem = tx.itemName.toLowerCase().includes(q);
        const matchRef = (tx.refNo || '').toLowerCase().includes(q);
        const matchUser = (tx.user || '').toLowerCase().includes(q);
        const matchNotes = (tx.notes || '').toLowerCase().includes(q);
        const matchTech = (tx.technician || '').toLowerCase().includes(q);
        const matchSub = (tx.subscriberName || '').toLowerCase().includes(q);
        const matchWh = (tx.warehouse || '').toLowerCase().includes(q);
        return matchItem || matchRef || matchUser || matchNotes || matchTech || matchSub || matchWh;
      }

      return true;
    });
  }, [transactions, typeFilter, searchTerm]);

  // Handle Printable Voucher Modal
  const handleViewVoucher = (tx: InventoryTransaction) => {
    setSelectedTxForPrint(tx);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 text-right">
      {/* Controls Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800/80 pb-3">
          <div>
            <h3 className="font-black text-white text-base flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-amber-400" />
              <span>سجل الحركات والأذونات المخزنية</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              متابعة شاملة لعمليات التوريد، الصرف للفنيين، التحويل بين المستودعات، التسويات، والتوالف
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => printData(
                'سجل الحركات المخزنية المعتمد',
                filteredTxs.map(tx => ({
                  refNo: tx.refNo || '-',
                  date: new Date(tx.date).toLocaleDateString('ar-SA'),
                  item: tx.itemName,
                  type: tx.type === 'in' ? 'إذن توريد' : tx.type === 'out' ? 'إذن صرف' : tx.type === 'transfer' ? 'تحويل' : tx.type === 'damage' ? 'تالف' : tx.type === 'return' ? 'مرتجع' : 'تسوية',
                  qty: tx.quantity,
                  warehouse: tx.warehouse || '-',
                  user: tx.user,
                  notes: tx.notes || '-'
                })),
                [
                  { key: 'refNo', label: 'رقم السند' },
                  { key: 'date', label: 'التاريخ' },
                  { key: 'item', label: 'اسم الصنف' },
                  { key: 'type', label: 'نوع الإذن' },
                  { key: 'qty', label: 'الكمية' },
                  { key: 'warehouse', label: 'المستودع' },
                  { key: 'user', label: 'المسؤول' },
                  { key: 'notes', label: 'البيان' }
                ]
              )}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة السجل</span>
            </button>

            <button
              onClick={() => exportToCSV(
                filteredTxs,
                'inventory_transactions_log',
                [
                  { key: 'refNo', label: 'رقم السند' },
                  { key: 'date', label: 'التاريخ والوقت' },
                  { key: 'itemName', label: 'الصنف' },
                  { key: 'type', label: 'النوع' },
                  { key: 'quantity', label: 'الكمية' },
                  { key: 'warehouse', label: 'المستودع' },
                  { key: 'technician', label: 'الفني المستلم' },
                  { key: 'user', label: 'الموظف المسجل' },
                  { key: 'notes', label: 'البيان' }
                ]
              )}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير Excel</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="بحث برقم الإذن، اسم الصنف، اسم الفني، المستودع، البيان..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-10 pl-4 py-2 text-xs text-right text-white focus:border-amber-500 outline-none font-bold"
            />
          </div>

          <div className="w-full sm:w-56">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 focus:border-amber-500 outline-none cursor-pointer text-right"
            >
              <option value="all">جميع أنواع السندات</option>
              <option value="in">📥 أذونات توريد / إدخال</option>
              <option value="out">📤 أذونات صرف / إخراج</option>
              <option value="transfer">🔄 أذونات تحويل بين المستودعات</option>
              <option value="return">↩️ أذونات إرجاع مواد</option>
              <option value="adjustment">⚙️ تسويات جردية</option>
              <option value="damage">⚠️ توالف وإتلاف</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">رقم الإذن / السند</th>
                <th className="px-4 py-3">التاريخ والوقت</th>
                <th className="px-4 py-3">اسم الصنف</th>
                <th className="px-4 py-3 text-center">نوع الحركة</th>
                <th className="px-4 py-3 text-center">الكمية</th>
                <th className="px-4 py-3">المستودع / الوجهة</th>
                <th className="px-4 py-3">المستلم / الفني</th>
                <th className="px-4 py-3">البيان والملاحظات</th>
                <th className="px-4 py-3 text-center">السند</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {filteredTxs.length > 0 ? (
                filteredTxs.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-amber-400">{tx.refNo || '-'}</td>
                    <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">
                      {new Date(tx.date).toLocaleString('ar-SA')}
                    </td>
                    <td className="px-4 py-3 font-bold text-white">{tx.itemName}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold border ${
                        tx.type === 'in' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        tx.type === 'damage' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                        tx.type === 'adjustment' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                        tx.type === 'transfer' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        tx.type === 'return' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' :
                        'bg-sky-500/10 text-sky-400 border-sky-500/20'
                      }`}>
                        {tx.type === 'in' ? '📥 توريد مخزني' :
                         tx.type === 'damage' ? '⚠️ توالف وإتلاف' :
                         tx.type === 'adjustment' ? '⚙️ تسوية جردية' :
                         tx.type === 'transfer' ? '🔄 تحويل فرعي' :
                         tx.type === 'return' ? '↩️ إرجاع للمخزن' : '📤 صرف مواد'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-black text-white text-sm">{tx.quantity}</td>
                    <td className="px-4 py-3 text-slate-300">
                      <div>{tx.warehouse || 'المستودع الرئيسي'}</div>
                      {tx.toWarehouse && (
                        <div className="text-[10px] text-amber-400 font-bold">إلى: {tx.toWarehouse}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {tx.technician ? (
                        <div className="font-bold text-sky-300 flex items-center gap-1">
                          <User className="w-3 h-3 text-sky-400" />
                          {tx.technician}
                        </div>
                      ) : tx.subscriberName ? (
                        <div className="text-amber-300">{tx.subscriberName}</div>
                      ) : (
                        <span className="text-slate-500">{tx.user}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400 max-w-[200px] truncate" title={tx.notes}>
                      {tx.notes || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleViewVoucher(tx)}
                        className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="عرض وطباعة السند الرسمي"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500 font-bold">
                    لا توجد حركات مخزنية مطابقة للمعايير المحددة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRINTABLE VOUCHER MODAL */}
      {selectedTxForPrint && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white text-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            {/* Header toolbar */}
            <div className="bg-slate-900 p-4 text-white flex justify-between items-center print:hidden">
              <div className="flex items-center gap-2 font-bold text-sm">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>معاينة وطباعة السند المخزني</span>
              </div>
              <button 
                onClick={() => setSelectedTxForPrint(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Content */}
            <div className="p-6 space-y-4 text-right" id="printable-voucher-card">
              <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-center">
                <div>
                  <h2 className="text-base font-black text-slate-900">{settings?.stationName || 'محطة الكهرباء التجارية'}</h2>
                  <p className="text-[11px] text-slate-500">إدارة المستودعات والرقابة المخزنية</p>
                </div>
                <div className="text-left font-mono">
                  <div className="text-xs font-bold text-slate-900">سند رقم: {selectedTxForPrint.refNo || '-'}</div>
                  <div className="text-[10px] text-slate-500">{new Date(selectedTxForPrint.date).toLocaleDateString('ar-SA')}</div>
                </div>
              </div>

              <div className="text-center py-2 bg-slate-100 rounded-xl font-black text-sm text-slate-800">
                {selectedTxForPrint.type === 'in' ? 'سند إدخال وتوريد مخزني (Inward Receipt)' :
                 selectedTxForPrint.type === 'out' ? 'سند صرف مواد وتجهيزات (Material Issue Voucher)' :
                 selectedTxForPrint.type === 'transfer' ? 'سند تحويل مخزني داخلي (Inter-store Transfer)' :
                 selectedTxForPrint.type === 'damage' ? 'محضر إتلاف وتسجيل تالف (Damage Voucher)' : 'سند تسوية جردية (Stock Adjustment)'}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[10px]">المستودع:</span>
                  <span className="font-bold text-slate-800">{selectedTxForPrint.warehouse || 'المستودع الرئيسي'}</span>
                </div>
                {selectedTxForPrint.toWarehouse && (
                  <div>
                    <span className="text-slate-500 block text-[10px]">المستودع المحول إليه:</span>
                    <span className="font-bold text-amber-800">{selectedTxForPrint.toWarehouse}</span>
                  </div>
                )}
                {selectedTxForPrint.technician && (
                  <div>
                    <span className="text-slate-500 block text-[10px]">الفني المستلم:</span>
                    <span className="font-bold text-slate-900">{selectedTxForPrint.technician}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-500 block text-[10px]">المسؤول عن الإدخال:</span>
                  <span className="font-bold text-slate-800">{selectedTxForPrint.user}</span>
                </div>
              </div>

              {/* Items Table in Voucher */}
              <table className="w-full text-xs text-right border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2">بيان الصنف والمادة</th>
                    <th className="p-2 text-center">الكمية</th>
                    <th className="p-2 text-center">سعر الوحدة</th>
                    <th className="p-2 text-center">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-2 font-bold text-slate-900">{selectedTxForPrint.itemName}</td>
                    <td className="p-2 text-center font-mono font-black text-slate-900">{selectedTxForPrint.quantity}</td>
                    <td className="p-2 text-center font-mono text-slate-700">{(selectedTxForPrint.unitPrice || 0).toLocaleString()}</td>
                    <td className="p-2 text-center font-mono font-black text-amber-900">
                      {((selectedTxForPrint.unitPrice || 0) * selectedTxForPrint.quantity).toLocaleString()} {currency}
                    </td>
                  </tr>
                </tbody>
              </table>

              {selectedTxForPrint.notes && (
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                  <span className="text-slate-500 block text-[10px]">البيان والملاحظات:</span>
                  <span className="font-medium text-slate-800">{selectedTxForPrint.notes}</span>
                </div>
              )}

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-3 pt-6 border-t-2 border-slate-200 text-center text-xs">
                <div>
                  <span className="text-slate-500 block mb-6">أمين المستودع:</span>
                  <span className="font-bold border-t border-slate-300 pt-1 block">التوقيع والختم</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-6">المستلم / الفني:</span>
                  <span className="font-bold border-t border-slate-300 pt-1 block">التوقيع</span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-6">المدير المسؤول:</span>
                  <span className="font-bold border-t border-slate-300 pt-1 block">الاعتماد</span>
                </div>
              </div>
            </div>

            {/* Print Buttons */}
            <div className="bg-slate-100 p-4 border-t border-slate-200 flex gap-2 print:hidden">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة السند فوراً</span>
              </button>
              <button
                onClick={() => setSelectedTxForPrint(null)}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
