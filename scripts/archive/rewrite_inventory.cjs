const fs = require('fs');

const fullCode = `import React, { useState } from 'react';
import { InventoryItem, InventoryTransaction, User } from '../types';
import { Package, Plus, Search, ArrowUpRight, ArrowDownRight, AlertTriangle, Filter, LayoutList, ClipboardList } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminInventoryProps {
  inventory: InventoryItem[];
  inventoryTransactions: InventoryTransaction[];
  onUpdateInventory: (items: InventoryItem[]) => void;
  onUpdateInventoryTransactions: (transactions: InventoryTransaction[]) => void;
  currentUser: User;
  logAction: (action: string, details: string) => void;
}

export function AdminInventory({
  inventory,
  inventoryTransactions,
  onUpdateInventory,
  onUpdateInventoryTransactions,
  currentUser,
  logAction
}: AdminInventoryProps) {
  const [activeTab, setActiveTab] = useState<'catalog' | 'transactions' | 'alerts'>('catalog');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [transactionType, setTransactionType] = useState<'in' | 'out' | 'damage'>('in');

  // New item form
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'cables',
    unit: '',
    quantity: '',
    minAlertLevel: ''
  });

  // Transaction form
  const [transactionQty, setTransactionQty] = useState('');
  const [transactionNotes, setTransactionNotes] = useState('');

  const categories = {
    cables: 'كابلات وأسلاك',
    meters: 'عدادات كهربائية',
    breakers: 'قواطع ومفاتيح',
    oil: 'زيوت محولات',
    other: 'أخرى'
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const item: InventoryItem = {
      id: \`inv-\${Date.now()}\`,
      name: newItem.name,
      category: newItem.category as any,
      unit: newItem.unit,
      quantity: parseFloat(newItem.quantity) || 0,
      minAlertLevel: parseFloat(newItem.minAlertLevel) || 0,
      lastUpdated: new Date().toISOString()
    };
    onUpdateInventory([...inventory, item]);
    logAction('إضافة صنف مخزون', \`تمت إضافة صنف جديد: \${item.name}\`);
    setShowAddModal(false);
    setNewItem({ name: '', category: 'cables', unit: '', quantity: '', minAlertLevel: '' });
  };

  const handleTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    const qty = parseFloat(transactionQty);
    if (!qty || qty <= 0) return;

    if ((transactionType === 'out' || transactionType === 'damage') && qty > selectedItem.quantity) {
      alert('الكمية المطلوبة أكبر من المتوفر في المستودع!');
      return;
    }

    const tx: InventoryTransaction = {
      id: \`tx-\${Date.now()}\`,
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      type: transactionType,
      quantity: qty,
      date: new Date().toISOString(),
      user: currentUser.name,
      notes: transactionNotes
    };

    const updatedInventory = inventory.map(item => {
      if (item.id === selectedItem.id) {
        return {
          ...item,
          quantity: transactionType === 'in' ? item.quantity + qty : item.quantity - qty,
          lastUpdated: new Date().toISOString()
        };
      }
      return item;
    });

    onUpdateInventory(updatedInventory);
    onUpdateInventoryTransactions([tx, ...inventoryTransactions]);
    logAction('عملية مخزنية', \`تم تسجيل \${transactionType === 'in' ? 'توريد' : transactionType === 'damage' ? 'تالف' : 'صرف'} \${qty} \${selectedItem.unit} للصنف \${selectedItem.name}\`);

    setShowTransactionModal(false);
    setTransactionQty('');
    setTransactionNotes('');
  };

  return (
    <div className="space-y-6 animate-fade-in text-right">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800">المخزون والمستودع</h2>
          <p className="text-sm text-slate-500 font-medium">إدارة ومراقبة المواد الفنية وقطع الغيار</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-sm"
        >
          <span>إضافة صنف جديد</span>
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
          <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto p-1 bg-slate-100 rounded-xl">
            <button 
              onClick={() => setActiveTab('alerts')}
              className={\`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 \${activeTab === 'alerts' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}\`}
            >
              <span>الجرد والتنبيهات</span>
              <AlertTriangle className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setActiveTab('transactions')}
              className={\`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 \${activeTab === 'transactions' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}\`}
            >
              <span>حركات المستودع</span>
              <LayoutList className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setActiveTab('catalog')}
              className={\`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 \${activeTab === 'catalog' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}\`}
            >
              <span>دليل الأصناف</span>
              <Package className="w-4 h-4" />
            </button>
          </div>
        </div>

        {activeTab === 'catalog' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative w-full sm:w-48 shrink-0">
                <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select 
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-right focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none appearance-none"
                  dir="rtl"
                >
                  <option value="all">جميع التصنيفات</option>
                  {Object.entries(categories).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="ابحث عن صنف..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-2 text-sm text-right focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredInventory.map(item => (
                <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-amber-200 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold">
                      {categories[item.category as keyof typeof categories] || 'أخرى'}
                    </span>
                    {item.quantity <= item.minAlertLevel && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-md border border-rose-100">
                        <span>رصيد منخفض</span>
                        <AlertTriangle className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm mb-1 line-clamp-1">{item.name}</h3>
                  <div className="flex items-baseline gap-1 mb-4 text-slate-500">
                    <span className="text-3xl font-black text-slate-800 tracking-tighter">{item.quantity}</span>
                    <span className="text-xs font-semibold">{item.unit}</span>
                  </div>
                  
                  <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 mt-auto">
                    <button
                      onClick={() => {
                        setSelectedItem(item);
                        setTransactionType('damage');
                        setShowTransactionModal(true);
                      }}
                      className="flex-1 bg-rose-50 text-rose-600 hover:bg-rose-100 py-1.5 rounded-lg text-xs font-bold transition-colors flex justify-center items-center gap-1"
                    >
                      توالف
                      <AlertTriangle className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedItem(item);
                        setTransactionType('out');
                        setShowTransactionModal(true);
                      }}
                      className="flex-1 bg-sky-50 text-sky-600 hover:bg-sky-100 py-1.5 rounded-lg text-xs font-bold transition-colors flex justify-center items-center gap-1"
                    >
                      صرف
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedItem(item);
                        setTransactionType('in');
                        setShowTransactionModal(true);
                      }}
                      className="flex-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 py-1.5 rounded-lg text-xs font-bold transition-colors flex justify-center items-center gap-1"
                    >
                      توريد
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {filteredInventory.length === 0 && (
              <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                لا توجد أصناف مطابقة للبحث
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'transactions' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">سجل الحركات والأذونات</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm text-right">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold">التاريخ</th>
                    <th className="px-4 py-3 font-semibold">الصنف</th>
                    <th className="px-4 py-3 font-semibold">نوع الحركة</th>
                    <th className="px-4 py-3 font-semibold">الكمية</th>
                    <th className="px-4 py-3 font-semibold">بواسطة</th>
                    <th className="px-4 py-3 font-semibold">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inventoryTransactions.length > 0 ? inventoryTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-slate-500 text-xs" dir="ltr">{new Date(tx.date).toLocaleString('ar-SA')}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">{tx.itemName}</td>
                      <td className="px-4 py-3">
                        <span className={\`inline-block px-2 py-1 rounded-md text-[10px] font-bold \${
                          tx.type === 'in' ? 'bg-emerald-100 text-emerald-700' : 
                          tx.type === 'damage' ? 'bg-rose-100 text-rose-700' : 'bg-sky-100 text-sky-700'
                        }\`}>
                          {tx.type === 'in' ? 'توريد / إضافة' : tx.type === 'damage' ? 'تالف / نقص' : 'صرف / إخراج'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{tx.quantity}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{tx.user}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs max-w-[200px] truncate" title={tx.notes}>{tx.notes || '-'}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-500">لا توجد حركات مخزنية سابقة</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'alerts' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">نواقص وتنبيهات المستودع</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {inventory.filter(item => item.quantity <= item.minAlertLevel).map(item => (
                <div key={item.id} className="border border-rose-200 bg-rose-50 rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden shadow-sm">
                  <div className="absolute top-0 right-0 w-1.5 h-full bg-rose-500" />
                  <div className="flex items-center justify-between">
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                    <h4 className="font-bold text-rose-900 text-sm">{item.name}</h4>
                  </div>
                  <div className="flex justify-between items-center text-xs mt-2 bg-white/60 p-2 rounded-lg">
                    <span className="font-bold font-mono text-rose-900 text-base">{item.quantity} {item.unit}</span>
                    <span className="text-rose-700">الرصيد الحالي</span>
                  </div>
                  <div className="flex justify-between items-center text-xs px-2">
                    <span className="font-bold font-mono text-slate-600">{item.minAlertLevel} {item.unit}</span>
                    <span className="text-slate-500">حد التنبيه</span>
                  </div>
                </div>
              ))}
            </div>
            
            {inventory.filter(item => item.quantity <= item.minAlertLevel).length === 0 && (
              <div className="py-16 text-center text-emerald-600 flex flex-col items-center gap-3 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                <Package className="w-10 h-10 opacity-60" />
                <span className="font-bold text-lg">جميع الأرصدة في المستودع طبيعية</span>
                <span className="text-sm opacity-80">لا توجد نواقص تتطلب الطلب حالياً</span>
              </div>
            )}
          </motion.div>
        )}

      </div>

      {/* Add Item Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setShowAddModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md relative z-10 overflow-hidden"
            >
              <div className="bg-slate-900 p-5 text-right">
                <h3 className="text-white font-bold text-lg">إضافة صنف جديد للمستودع</h3>
              </div>
              <form onSubmit={handleAddItem} className="p-5 space-y-4 text-right">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم الصنف</label>
                  <input type="text" required value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm text-right focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">وحدة القياس</label>
                    <input type="text" required placeholder="مثال: متر، حبة" value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm text-right focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">التصنيف</label>
                    <select value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm text-right focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors appearance-none" dir="rtl">
                      {Object.entries(categories).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">حد التنبيه للنواقص</label>
                    <input type="number" min="0" required value={newItem.minAlertLevel} onChange={e => setNewItem({...newItem, minAlertLevel: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm text-right font-mono focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">الرصيد الافتتاحي</label>
                    <input type="number" min="0" required value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm text-right font-mono focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors" />
                  </div>
                </div>
                <div className="flex gap-3 pt-6 mt-2 border-t border-slate-100">
                  <button type="submit" className="flex-1 bg-amber-500 text-slate-900 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors">حفظ الصنف</button>
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors">إلغاء</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transaction Modal */}
      <AnimatePresence>
        {showTransactionModal && selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setShowTransactionModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md relative z-10 overflow-hidden"
            >
              <div className={\`p-5 text-right text-white \${transactionType === 'in' ? 'bg-emerald-600' : transactionType === 'damage' ? 'bg-rose-700' : 'bg-sky-600'}\`}>
                <h3 className="font-bold text-lg">{transactionType === 'in' ? 'سند إدخال (توريد) لمخزن' : transactionType === 'damage' ? 'تسجيل توالف / نقص' : 'سند إخراج (صرف) من مخزن'}</h3>
              </div>
              <form onSubmit={handleTransaction} className="p-6 space-y-5 text-right">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-2">
                    <p className="text-slate-500 text-xs mb-1 font-bold">الصنف المحدد:</p>
                    <p className="font-black text-slate-900 text-base">{selectedItem.name}</p>
                    <div className="mt-3 flex justify-between items-center">
                      <span className="font-bold font-mono text-slate-800 text-lg bg-white px-2 py-0.5 rounded shadow-sm border border-slate-200">{selectedItem.quantity} <span className="text-xs text-slate-500 font-sans">{selectedItem.unit}</span></span>
                      <span className="text-xs text-slate-500 font-bold">الرصيد الحالي</span>
                    </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">الكمية المراد {transactionType === 'in' ? 'إضافتها' : transactionType === 'damage' ? 'إتلافها/خصمها' : 'صرفها'}</label>
                  <input type="number" min="1" max={transactionType === 'out' || transactionType === 'damage' ? selectedItem.quantity : undefined} required value={transactionQty} onChange={e => setTransactionQty(e.target.value)} className="w-full border border-slate-200 rounded-xl p-3 text-sm text-right font-mono focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-colors bg-slate-50 focus:bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">ملاحظات / المستلم</label>
                  <input type="text" value={transactionNotes} onChange={e => setTransactionNotes(e.target.value)} placeholder={transactionType === 'out' ? 'الجهة المستلمة للمواد' : transactionType === 'damage' ? 'سبب الإتلاف أو التلف' : 'رقم فاتورة المورد'} className="w-full border border-slate-200 rounded-xl p-3 text-sm text-right focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-colors bg-slate-50 focus:bg-white" />
                </div>
                <div className="flex gap-3 pt-6 mt-2 border-t border-slate-100">
                  <button type="submit" className={\`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors \${transactionType === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : transactionType === 'damage' ? 'bg-rose-700 hover:bg-rose-800' : 'bg-sky-600 hover:bg-sky-700'}\`}>تأكيد العملية</button>
                  <button type="button" onClick={() => setShowTransactionModal(false)} className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors">إلغاء</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
`;

fs.writeFileSync('src/components/AdminInventory.tsx', fullCode);
