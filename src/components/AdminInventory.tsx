import React, { useState, useEffect } from 'react';
import { InventoryItem, InventoryTransaction, SystemSettings } from '../types';
import { 
  Package, RefreshCw, AlertTriangle, Building2, ClipboardCheck, 
  ShieldAlert, Layers, Plus, CloudCheck
} from 'lucide-react';
import { InventoryHeaderAndStats } from './inventory/InventoryHeaderAndStats';
import { InventoryCatalogTab } from './inventory/InventoryCatalogTab';
import { InventoryTransactionsTab } from './inventory/InventoryTransactionsTab';
import { InventoryStockTakingTab } from './inventory/InventoryStockTakingTab';
import { InventoryWarehousesTab } from './inventory/InventoryWarehousesTab';
import { InventoryReorderAlertsTab } from './inventory/InventoryReorderAlertsTab';
import { ItemModal, TransactionModal, BarcodeModal, BulkImportModal } from './inventory/InventoryModals';
import { subscribeToWarehousesFromCloud, syncWarehousesToCloud } from '../lib/database';

interface AdminInventoryProps {
  activeTab?: 'catalog' | 'transactions' | 'alerts' | 'stocktake' | 'warehouses';
  inventory: InventoryItem[];
  inventoryTransactions: InventoryTransaction[];
  onUpdateInventory: (items: InventoryItem[]) => void;
  onUpdateInventoryTransactions: (transactions: InventoryTransaction[]) => void;
  currentUser?: { name: string; username?: string; role?: string };
  logAction?: (action: string, details: string) => void;
  settings?: SystemSettings;
  employees?: any[];
  subscribers?: any[];
}

export const AdminInventory: React.FC<AdminInventoryProps> = ({
  activeTab: initialActiveTab = 'catalog',
  inventory,
  inventoryTransactions,
  onUpdateInventory,
  onUpdateInventoryTransactions,
  currentUser,
  logAction,
  settings,
  employees = [],
  subscribers = []
}) => {
  // Navigation tab state
  const [currentTab, setCurrentTab] = useState<'catalog' | 'transactions' | 'stocktake' | 'warehouses' | 'alerts'>(
    initialActiveTab === 'transactions' ? 'transactions' :
    initialActiveTab === 'alerts' ? 'alerts' : 'catalog'
  );

  // Warehouse selection filter
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [warehouses, setWarehouses] = useState<string[]>([
    'المستودع الرئيسي',
    'مستودع طوارئ الصيانة والميدان',
    'مستودع المحطات والشبكات',
    'مستودع وفحص العدادات'
  ]);

  // Subscribe to real-time warehouses from Cloud Firestore
  useEffect(() => {
    const unsub = subscribeToWarehousesFromCloud((cloudWarehouses) => {
      if (Array.isArray(cloudWarehouses) && cloudWarehouses.length > 0) {
        setWarehouses(cloudWarehouses);
      }
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Categories Dictionary
  const categories: Record<string, { label: string; icon: string }> = {
    cables: { label: 'كابلات وأسلاك شبكة', icon: '🔌' },
    meters: { label: 'عدادات كهربائية وذكية', icon: '📟' },
    breakers: { label: 'قواطع ومفاتيح وتأريض', icon: '⚡' },
    transformers: { label: 'محولات ومحطات توزيع', icon: '🏭' },
    oil: { label: 'زيوت تبريد وعوازل', icon: '🛢️' },
    poles: { label: 'أعمدة وهياكل شبكة', icon: '🗼' },
    insulators: { label: 'عوازل ومشابك شبكة', icon: '🔗' },
    safety: { label: 'معدات سلامة وأدوات فحص', icon: '🦺' },
    tools: { label: 'أدوات وعدد صيانة', icon: '🔧' },
    other: { label: 'تجهيزات ومواد أخرى', icon: '📦' }
  };

  // Modals state
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [activeTxItem, setActiveTxItem] = useState<InventoryItem | null>(null);
  const [activeTxType, setActiveTxType] = useState<'in' | 'out' | 'damage' | 'adjustment' | 'transfer' | 'return'>('in');

  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [barcodeItem, setBarcodeItem] = useState<InventoryItem | null>(null);

  const [showImportModal, setShowImportModal] = useState(false);

  // ----------------------------------------------------
  // Handlers
  // ----------------------------------------------------
  const handleOpenAddItem = () => {
    setEditingItem(null);
    setShowItemModal(true);
  };

  const handleOpenEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setShowItemModal(true);
  };

  const handleSaveItem = (itemData: Partial<InventoryItem>) => {
    if (editingItem) {
      // Update existing item
      const updated = inventory.map(item => item.id === editingItem.id ? { ...item, ...itemData } : item);
      onUpdateInventory(updated);
      logAction?.('تعديل صنف مخزني', `تم تعديل بيانات الصنف: ${itemData.name}`);
    } else {
      // Create new item
      const newItem: InventoryItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: itemData.name || 'صنف جديد',
        code: itemData.code || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        category: itemData.category || 'cables',
        warehouse: itemData.warehouse || 'المستودع الرئيسي',
        quantity: Number(itemData.quantity || 0),
        unit: itemData.unit || 'حبة',
        minAlertLevel: Number(itemData.minAlertLevel || 10),
        reorderQuantity: Number(itemData.reorderQuantity || 50),
        costPrice: Number(itemData.costPrice || 0),
        unitPrice: Number(itemData.unitPrice || itemData.costPrice || 0),
        sellingPrice: Number(itemData.sellingPrice || 0),
        location: itemData.location || '',
        supplier: itemData.supplier || '',
        brand: itemData.brand || '',
        specification: itemData.specification || '',
        notes: itemData.notes || '',
        lastUpdated: new Date().toISOString()
      };
      onUpdateInventory([newItem, ...inventory]);

      // If initial quantity > 0, log an initial inward receipt
      if (newItem.quantity > 0) {
        const initialTx: InventoryTransaction = {
          id: `tx_${Date.now()}`,
          itemId: newItem.id,
          itemName: newItem.name,
          type: 'in',
          quantity: newItem.quantity,
          unitPrice: newItem.costPrice,
          totalValue: newItem.quantity * (newItem.costPrice || 0),
          date: new Date().toISOString(),
          user: currentUser?.name || 'مدير النظام',
          warehouse: newItem.warehouse,
          refNo: `INIT-${Math.floor(1000 + Math.random() * 9000)}`,
          notes: 'رصيد افتتاحي عند إنشاء الصنف'
        };
        onUpdateInventoryTransactions([initialTx, ...inventoryTransactions]);
      }

      logAction?.('إضافة صنف جديد', `تمت إضافة الصنف: ${newItem.name} إلى ${newItem.warehouse}`);
    }
  };

  const handleDeleteItem = (id: string) => {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    if (confirm(`هل أنت متأكد من حذف الصنف "${item.name}"؟`)) {
      const updated = inventory.filter(i => i.id !== id);
      onUpdateInventory(updated);
      logAction?.('حذف صنف مخزني', `تم حذف الصنف: ${item.name}`);
    }
  };

  const handleOpenTransaction = (item: InventoryItem, type: 'in' | 'out' | 'damage' | 'adjustment' | 'transfer' | 'return') => {
    setActiveTxItem(item);
    setActiveTxType(type);
    setShowTransactionModal(true);
  };

  const handleRecordTransaction = (txData: Omit<InventoryTransaction, 'id'>, newQuantity: number) => {
    const newTx: InventoryTransaction = {
      ...txData,
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    };

    // Update item quantity in inventory
    const updatedInventory = inventory.map(item => {
      if (item.id === txData.itemId) {
        return {
          ...item,
          quantity: newQuantity,
          lastUpdated: new Date().toISOString()
        };
      }
      return item;
    });

    onUpdateInventory(updatedInventory);
    onUpdateInventoryTransactions([newTx, ...inventoryTransactions]);
    logAction?.('حركة مخزنية', `سند ${txData.refNo || ''} (${txData.type}) للصنف: ${txData.itemName} كمية: ${txData.quantity}`);
  };

  // Stock Taking adjustment confirmation
  const handleApplyStockAdjustment = (adjustments: Array<{ item: InventoryItem; actualQty: number; diff: number; reason: string }>) => {
    const newTxs: InventoryTransaction[] = [];
    const updatedInv = [...inventory];

    adjustments.forEach(adj => {
      const idx = updatedInv.findIndex(i => i.id === adj.item.id);
      if (idx !== -1) {
        updatedInv[idx] = {
          ...updatedInv[idx],
          quantity: adj.actualQty,
          lastUpdated: new Date().toISOString()
        };

        newTxs.push({
          id: `tx_adj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          itemId: adj.item.id,
          itemName: adj.item.name,
          type: 'adjustment',
          quantity: Math.abs(adj.diff),
          unitPrice: adj.item.costPrice || adj.item.unitPrice || 0,
          totalValue: Math.abs(adj.diff) * (adj.item.costPrice || adj.item.unitPrice || 0),
          date: new Date().toISOString(),
          user: currentUser?.name || 'لجنة الجرد المخزني',
          warehouse: adj.item.warehouse || 'المستودع الرئيسي',
          refNo: `STK-${Math.floor(10000 + Math.random() * 90000)}`,
          notes: `تسوية جردية: الفرق (${adj.diff > 0 ? '+' : ''}${adj.diff}) - ${adj.reason}`
        });
      }
    });

    onUpdateInventory(updatedInv);
    onUpdateInventoryTransactions([...newTxs, ...inventoryTransactions]);
    logAction?.('تسوية جرد دوري', `تم تطبيق تسوية جردية لعدد ${adjustments.length} أصناف`);
  };

  const handleAddWarehouse = async (whName: string) => {
    if (warehouses.includes(whName)) {
      alert('المستودع موجود بالفعل');
      return;
    }
    const updated = [...warehouses, whName];
    setWarehouses(updated);
    try {
      await syncWarehousesToCloud(updated);
    } catch (e) {
      console.error("Error syncing warehouse to cloud:", e);
    }
    logAction?.('إضافة مستودع', `تم إنشاء مستودع/فرع جديد وحفظه في السحابة: ${whName}`);
  };

  const handleBulkImport = (items: InventoryItem[]) => {
    onUpdateInventory([...items, ...inventory]);
    logAction?.('استيراد أصناف بالجملة', `تم استيراد ${items.length} أصناف جديدة إلى المستودع`);
  };

  return (
    <div className="space-y-6 text-right font-sans">
      {/* 1. Header & KPI Cards */}
      <InventoryHeaderAndStats
        inventory={inventory}
        settings={settings}
        selectedWarehouse={selectedWarehouse}
        setSelectedWarehouse={setSelectedWarehouse}
        warehouses={warehouses}
        onOpenAddItem={handleOpenAddItem}
        onOpenStockTake={() => setCurrentTab('stocktake')}
        onOpenTransfer={() => {
          if (inventory.length > 0) {
            handleOpenTransaction(inventory[0], 'transfer');
          }
        }}
        onClearAllItems={() => {}}
        onImportClick={() => setShowImportModal(true)}
      />

      {/* 2. Main Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setCurrentTab('catalog')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            currentTab === 'catalog'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>دليل الأصناف والمواد</span>
          <span className="bg-black/20 px-2 py-0.5 rounded-full text-[10px] font-mono">{inventory.length}</span>
        </button>

        <button
          onClick={() => setCurrentTab('transactions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            currentTab === 'transactions'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>سجل الحركات والأذونات</span>
          <span className="bg-black/20 px-2 py-0.5 rounded-full text-[10px] font-mono">{inventoryTransactions.length}</span>
        </button>

        <button
          onClick={() => setCurrentTab('stocktake')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            currentTab === 'stocktake'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>الجرد المخزني والتسويات</span>
        </button>

        <button
          onClick={() => setCurrentTab('warehouses')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            currentTab === 'warehouses'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>المستودعات والفروع</span>
          <span className="bg-black/20 px-2 py-0.5 rounded-full text-[10px] font-mono">{warehouses.length}</span>
        </button>

        <button
          onClick={() => setCurrentTab('alerts')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            currentTab === 'alerts'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>النواقص وأوامر الشراء</span>
          {inventory.filter(i => i.quantity <= i.minAlertLevel).length > 0 && (
            <span className="bg-rose-500 text-white px-2 py-0.5 rounded-full text-[10px] font-mono font-bold animate-pulse">
              {inventory.filter(i => i.quantity <= i.minAlertLevel).length}
            </span>
          )}
        </button>
      </div>

      {/* 3. Tab Contents */}
      {currentTab === 'catalog' && (
        <InventoryCatalogTab
          inventory={inventory}
          settings={settings}
          categories={categories}
          selectedWarehouse={selectedWarehouse}
          onOpenAddItem={handleOpenAddItem}
          onOpenEditItem={handleOpenEditItem}
          onOpenTransaction={handleOpenTransaction}
          onOpenBarcode={(item) => {
            setBarcodeItem(item);
            setShowBarcodeModal(true);
          }}
          onConfirmDelete={handleDeleteItem}
        />
      )}

      {currentTab === 'transactions' && (
        <InventoryTransactionsTab
          transactions={inventoryTransactions}
          settings={settings}
        />
      )}

      {currentTab === 'stocktake' && (
        <InventoryStockTakingTab
          inventory={inventory}
          settings={settings}
          currentUser={currentUser}
          selectedWarehouse={selectedWarehouse}
          warehouses={warehouses}
          onApplyStockAdjustment={handleApplyStockAdjustment}
        />
      )}

      {currentTab === 'warehouses' && (
        <InventoryWarehousesTab
          inventory={inventory}
          settings={settings}
          warehouses={warehouses}
          onAddWarehouse={handleAddWarehouse}
          onOpenTransferForWarehouse={(fromWh) => {
            const firstItemInWh = inventory.find(i => (i.warehouse || 'المستودع الرئيسي') === fromWh) || inventory[0];
            if (firstItemInWh) {
              handleOpenTransaction(firstItemInWh, 'transfer');
            } else {
              alert('لا توجد أصناف في هذا المستودع لتحويلها.');
            }
          }}
          onSelectWarehouse={(wh) => {
            setSelectedWarehouse(wh);
            setCurrentTab('catalog');
          }}
        />
      )}

      {currentTab === 'alerts' && (
        <InventoryReorderAlertsTab
          inventory={inventory}
          settings={settings}
          onOpenRestockModal={(item) => handleOpenTransaction(item, 'in')}
        />
      )}

      {/* 4. Modals */}
      <ItemModal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        onSave={handleSaveItem}
        initialItem={editingItem}
        categories={categories}
        warehouses={warehouses}
        settings={settings}
      />

      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        item={activeTxItem}
        type={activeTxType}
        warehouses={warehouses}
        employees={employees}
        subscribers={subscribers}
        currentUser={currentUser}
        settings={settings}
        onSubmit={handleRecordTransaction}
      />

      <BarcodeModal
        isOpen={showBarcodeModal}
        onClose={() => setShowBarcodeModal(false)}
        item={barcodeItem}
        settings={settings}
      />

      <BulkImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleBulkImport}
        warehouses={warehouses}
      />
    </div>
  );
};
export default AdminInventory;
