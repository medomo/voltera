import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Subscriber, SystemSettings } from '../types';
import { Map, Zap, Settings, Users, Plus, Trash2, Eye, XCircle, FileText, CheckCircle2, AlertTriangle, ShieldAlert, Edit3, Activity, Gauge } from 'lucide-react';
import { calculateTransformerLoss } from '../utils/lossEngine';
import { updateZonesAndTransformersInDatabase } from '../lib/database';

interface AdminZonesProps {
  subscribers: Subscriber[];
  settings: SystemSettings;
  onUpdateSettings: (s: SystemSettings) => void;
  onUpdateSubscribers?: (subs: Subscriber[]) => void;
}

export const AdminZones: React.FC<AdminZonesProps> = ({ subscribers, settings, onUpdateSettings, onUpdateSubscribers }) => {
  const [activeTab, setActiveTab] = useState<'zones' | 'transformers'>('zones');
  const [newItemName, setNewItemName] = useState('');
  const [selectedTransformer, setSelectedTransformer] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [zoneToDelete, setZoneToDelete] = useState<{ name: string; count: number } | null>(null);
  const [transformerToDelete, setTransformerToDelete] = useState<{ name: string; count: number } | null>(null);
  const [cloudSavedToast, setCloudSavedToast] = useState<string | null>(null);

  // Editing Central Master Meter State
  const [editingMasterTrans, setEditingMasterTrans] = useState<any | null>(null);
  const [editPrevMaster, setEditPrevMaster] = useState<number>(0);
  const [editCurrMaster, setEditCurrMaster] = useState<number>(0);
  const [editMeterNum, setEditMeterNum] = useState<string>('');
  const [editCtRatio, setEditCtRatio] = useState<number>(1);
  const [editCapacityKva, setEditCapacityKva] = useState<number>(500);
  const [editZone, setEditZone] = useState<string>('المنطقة الرئيسية');

  const zones = settings.zones || [];
  const transformers = settings.transformers || [];

  // Helper to extract transformer name
  const getTransName = (t: any) => typeof t === 'string' ? t : t?.name || 'محول غير مسمى';

  // Aggregate stats by zone - strictly based on configured settings.zones
  const zoneStats = useMemo(() => {
    const stats: Record<string, { count: number, debt: number }> = {};
    zones.forEach(z => { 
      const trimmed = (z || '').trim();
      if (trimmed) stats[trimmed] = { count: 0, debt: 0 }; 
    });

    let unassignedCount = 0;
    let unassignedDebt = 0;

    subscribers.forEach(s => {
      const zone = (s.zone || '').trim();
      if (zone && stats[zone]) {
        stats[zone].count += 1;
        if (s.currentBalance > 0) stats[zone].debt += s.currentBalance;
      } else {
        unassignedCount += 1;
        if (s.currentBalance > 0) unassignedDebt += s.currentBalance;
      }
    });

    const result = Object.entries(stats).map(([name, data]) => ({ name, ...data }));
    
    // Only display 'غير محدد' if there are unassigned subscribers and it's not already in configured zones
    if (unassignedCount > 0 && !stats['غير محدد']) {
      result.push({ name: 'غير محدد', count: unassignedCount, debt: unassignedDebt });
    }

    return result.sort((a, b) => b.count - a.count);
  }, [subscribers, zones]);

  // Transformer Loss Calculations Engine
  const transformerLossData = useMemo(() => {
    return transformers.map(t => {
      const name = getTransName(t);
      const lossAnalysis = calculateTransformerLoss(t, subscribers, settings);
      const linkedSubs = subscribers.filter(s => (s.transformer || '').trim() === name.trim());
      const debt = linkedSubs.reduce((sum, s) => sum + Math.max(0, s.currentBalance), 0);
      
      return {
        raw: t,
        name,
        debt,
        lossAnalysis,
        count: linkedSubs.length
      };
    });
  }, [subscribers, transformers, settings]);

  const triggerCloudSync = async (updatedZones: string[], updatedTransformers: any[]) => {
    try {
      await updateZonesAndTransformersInDatabase({
        zones: updatedZones,
        transformers: updatedTransformers
      }, settings);
      setCloudSavedToast('⚡ تم تحديث المناطق والمحولات في قاعدة البيانات السحابية بنجاح!');
      setTimeout(() => setCloudSavedToast(null), 3000);
    } catch (e) {
      console.warn('Cloud sync for zones:', e);
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newItemName.trim();
    if (!trimmed) return;

    if (activeTab === 'zones') {
      if (!zones.some(z => z.trim() === trimmed)) {
        const nextZones = [...zones, trimmed];
        onUpdateSettings({ ...settings, zones: nextZones });
        triggerCloudSync(nextZones, transformers);
      }
    } else {
      const exists = transformers.some(t => getTransName(t).trim() === trimmed);
      if (!exists) {
        const newTransObj = {
          id: 'tr-' + Date.now(),
          name: trimmed,
          meterNumber: 'MTR-CENTRAL-' + (transformers.length + 1),
          capacityKva: 500,
          zone: zones[0] || 'المنطقة الرئيسية',
          previousMasterReading: 0,
          currentMasterReading: 0,
          ctRatio: 1
        };
        const nextTransformers = [...transformers, newTransObj];
        onUpdateSettings({ ...settings, transformers: nextTransformers });
        triggerCloudSync(zones, nextTransformers);
      }
    }
    setNewItemName('');
  };

  const handleDeleteZone = (zoneName: string) => {
    const trimmed = zoneName.trim();
    const updatedZones = zones.filter(z => z.trim() !== trimmed);
    onUpdateSettings({ ...settings, zones: updatedZones });
    triggerCloudSync(updatedZones, transformers);

    // Update subscribers linked to this zone to 'غير محدد'
    if (onUpdateSubscribers) {
      const updatedSubs = subscribers.map(s => {
        if ((s.zone || '').trim() === trimmed) {
          return { ...s, zone: 'غير محدد' };
        }
        return s;
      });
      onUpdateSubscribers(updatedSubs);
    }

    if (selectedZone === zoneName) setSelectedZone(null);
    setZoneToDelete(null);
  };

  const handleDeleteTransformer = (transName: string) => {
    const trimmed = transName.trim();
    const updatedTransformers = transformers.filter(t => getTransName(t).trim() !== trimmed);
    onUpdateSettings({ ...settings, transformers: updatedTransformers });
    triggerCloudSync(zones, updatedTransformers);

    // Update subscribers linked to this transformer to 'غير محدد'
    if (onUpdateSubscribers) {
      const updatedSubs = subscribers.map(s => {
        if ((s.transformer || '').trim() === trimmed) {
          return { ...s, transformer: 'غير محدد' };
        }
        return s;
      });
      onUpdateSubscribers(updatedSubs);
    }

    if (selectedTransformer === transName) setSelectedTransformer(null);
    setTransformerToDelete(null);
  };

  const openMasterEdit = (tRaw: any) => {
    const isObj = typeof tRaw === 'object';
    setEditingMasterTrans(tRaw);
    setEditMeterNum(isObj ? (tRaw.meterNumber || 'MTR-CENTRAL-01') : 'MTR-CENTRAL-01');
    setEditPrevMaster(isObj ? Number(tRaw.previousMasterReading || 0) : 0);
    setEditCurrMaster(isObj ? Number(tRaw.currentMasterReading || 0) : 0);
    setEditCtRatio(isObj ? Number(tRaw.ctRatio || 1) : 1);
    setEditCapacityKva(isObj ? Number(tRaw.capacityKva || 500) : 500);
    setEditZone(isObj ? (tRaw.zone || (zones[0] || 'المنطقة الرئيسية')) : (zones[0] || 'المنطقة الرئيسية'));
  };

  const saveMasterEdit = () => {
    if (!editingMasterTrans) return;
    const targetName = getTransName(editingMasterTrans);

    const updatedTransformers = transformers.map(t => {
      const name = getTransName(t);
      if (name === targetName) {
        const base = typeof t === 'object' ? t : { id: 'tr-' + Date.now(), name };
        return {
          ...base,
          meterNumber: editMeterNum || 'MTR-CENTRAL-01',
          previousMasterReading: editPrevMaster,
          currentMasterReading: editCurrMaster,
          ctRatio: editCtRatio || 1,
          capacityKva: editCapacityKva || 500,
          zone: editZone || 'المنطقة الرئيسية'
        };
      }
      return t;
    });

    onUpdateSettings({ ...settings, transformers: updatedTransformers });
    triggerCloudSync(zones, updatedTransformers);
    setEditingMasterTrans(null);
  };

  const selectedTransformerSubs = useMemo(() => {
    if (!selectedTransformer) return [];
    return subscribers.filter(s => (s.transformer || 'غير محدد') === selectedTransformer);
  }, [selectedTransformer, subscribers]);

  const selectedZoneSubs = useMemo(() => {
    if (!selectedZone) return [];
    return subscribers.filter(s => (s.zone || 'غير محدد') === selectedZone);
  }, [selectedZone, subscribers]);

  return (
    <motion.div
      key="zones-sec"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 text-right"
    >
      <AnimatePresence>
        {cloudSavedToast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-emerald-400 text-xs font-bold shadow-md"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{cloudSavedToast}</span>
            </div>
            <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded-full font-mono">قاعدة البيانات السحابية</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full font-mono">
              محرك حساب الفاقد الكهربائي (Loss Engine v2.0)
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center justify-end gap-2">
            <span>إدارة المناطق والمحولات (العدادات المركزية)</span>
            <Map className="w-5 h-5 text-amber-500" />
          </h2>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <form onSubmit={handleAddItem} className="flex w-full md:w-auto gap-2">
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg transition-colors shrink-0">
              <Plus className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={`إضافة ${activeTab === 'zones' ? 'منطقة جديدة' : 'محول جديد'}...`}
              className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-200 text-sm text-right focus:outline-none focus:border-amber-500 w-full md:w-64"
            />
          </form>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setActiveTab('transformers')}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${
                activeTab === 'transformers' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              المحولات والعدادات المركزية
              <Zap className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTab('zones')}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${
                activeTab === 'zones' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              المناطق الجغرافية
              <Map className="w-4 h-4" />
            </button>
          </div>
        </div>

        {activeTab === 'zones' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {zoneStats.map((z, idx) => (
              <div 
                key={idx} 
                onClick={() => setSelectedZone(z.name)}
                className="bg-slate-950 border border-slate-800 hover:border-amber-500/50 rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden group cursor-pointer transition-all shadow-md"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    {z.name !== 'غير محدد' && (
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setZoneToDelete({ name: z.name, count: z.count });
                        }}
                        className="p-1.5 bg-slate-900 hover:bg-rose-500/20 rounded-lg text-rose-400/80 hover:text-rose-400 border border-slate-800 hover:border-rose-500/40 transition-all cursor-pointer shadow-xs flex items-center gap-1"
                        title="حذف المنطقة"
                      >
                        <Trash2 className="w-4 h-4 text-rose-500" />
                        <span className="text-[11px] font-bold text-rose-400">حذف</span>
                      </button>
                    )}
                    <button 
                      type="button"
                      onClick={() => setSelectedZone(z.name)}
                      className="p-1.5 bg-slate-900 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-amber-400 border border-slate-800 transition-colors cursor-pointer"
                      title="عرض المشتركين"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="font-bold text-slate-200">{z.name}</h3>
                </div>
                <div className="flex justify-between items-center text-xs mt-2 pt-2 border-t border-slate-800">
                  <div className="flex flex-col gap-1 text-left">
                    <span className="text-slate-500">إجمالي الديون</span>
                    <span className="font-bold text-rose-400 font-mono">{z.debt.toLocaleString()} {settings.currency}</span>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <span className="text-slate-500">عدد المشتركين</span>
                    <div className="flex items-center gap-1 font-bold text-emerald-400 font-mono">
                      <span>{z.count}</span>
                      <Users className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TRANSFORMERS TAB WITH FULL LOSS CALCULATION ENGINE */}
        {activeTab === 'transformers' && (
          <div className="space-y-6">
            {/* Standard Loss Formula Explainer Banner & Traffic Light Rules */}
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-amber-500/30 rounded-2xl p-4 flex flex-col lg:flex-row items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400 border border-amber-500/20 shrink-0">
                  <Gauge className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-100 text-sm mb-0.5">لوحة تحكم المحولات والعدادات المركزية (Master Meters Dashboard)</h4>
                  <p className="text-slate-400 leading-relaxed">
                    حساب ومطابقة الفاقد الكهربائي التلقائي بناءً على الفرق بين قراءة العداد المركزي للمحول ومجموع استهلاكات المشتركين التابعين له.
                  </p>
                </div>
              </div>

              {/* Traffic Light Rules Indicator Legend */}
              <div className="flex items-center gap-2 bg-slate-900/90 p-2 rounded-xl border border-slate-800 text-[11px]">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  <span>🟢 أخضر (&lt; 5% فاقد طبيعي)</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                  <span>🟡 أصفر (5% - 10% تنبيه)</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                  <span>🔴 أحمر (&gt; 10% خطر / نزول تفتيش)</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {transformerLossData.map((item, idx) => {
                const loss = item.lossAnalysis;
                const isRed = loss.trafficLight === 'red';
                const isYellow = loss.trafficLight === 'yellow';

                return (
                  <div 
                    key={idx}
                    className={`bg-slate-950 border rounded-2xl p-5 flex flex-col justify-between gap-4 relative overflow-hidden transition-all shadow-xl ${
                      isRed 
                        ? 'border-rose-500/70 shadow-rose-950/20 ring-1 ring-rose-500/30' 
                        : isYellow 
                          ? 'border-amber-500/60 shadow-amber-950/20' 
                          : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Header: Name, Capacity KVA, Zone */}
                    <div className="flex justify-between items-start border-b border-slate-800/80 pb-3">
                      <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => openMasterEdit(item.raw)}
                          className="p-1.5 bg-slate-900 hover:bg-slate-800 rounded-lg text-amber-400 hover:text-amber-300 border border-slate-800 transition-colors"
                          title="إدخال وتحديث قراءات العداد المركزي"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => setSelectedTransformer(item.name)}
                          className="p-1.5 bg-slate-900 hover:bg-slate-800 rounded-lg text-cyan-400 hover:text-cyan-300 border border-slate-800 transition-colors cursor-pointer"
                          title="عرض العدادات الفرعية المغذاة"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {item.name !== 'غير محدد' && (
                          <button 
                            type="button"
                            onClick={() => setTransformerToDelete({ name: item.name, count: item.count })}
                            className="p-1.5 bg-slate-900 hover:bg-rose-500/20 rounded-lg text-rose-400/80 hover:text-rose-400 border border-slate-800 hover:border-rose-500/40 transition-colors cursor-pointer"
                            title="حذف المحول"
                          >
                            <Trash2 className="w-4 h-4 text-rose-500" />
                          </button>
                        )}
                      </div>

                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-100 text-sm">{item.name}</h3>
                          <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 mt-0.5">
                          <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-amber-300 font-bold">{loss.capacityKva} KVA</span>
                          <span>المنطقة: {loss.zone}</span>
                        </div>
                      </div>
                    </div>

                    {/* Traffic Light Indicator Badge */}
                    <div>
                      <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs mb-3 ${
                        isRed 
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' 
                          : isYellow 
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' 
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm">{loss.totalLossPercent.toFixed(1)}%</span>
                          <span className="text-[10px] text-slate-400 font-sans">نسبة الفاقد</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-bold">
                          <span>{loss.statusText}</span>
                          {isRed ? <ShieldAlert className="w-4.5 h-4.5 text-rose-400 animate-pulse" /> : isYellow ? <AlertTriangle className="w-4.5 h-4.5 text-amber-400" /> : <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />}
                        </div>
                      </div>

                      {/* Central Meter Reading Details */}
                      <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/80 mb-3 space-y-2 text-[11px]">
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="font-mono text-slate-400">{loss.meterNumber}</span>
                          <span className="text-slate-500 font-bold">رقم العداد المركزي:</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-slate-800/60">
                          <div>
                            <span className="text-slate-500 block">القراءة السابقة</span>
                            <span className="font-mono text-slate-200 font-bold">{loss.prevReading.toLocaleString()} ك.و</span>
                          </div>
                          <div className="text-left">
                            <span className="text-slate-500 block">القراءة الحالية</span>
                            <span className="font-mono text-cyan-300 font-bold">{loss.currReading.toLocaleString()} ك.و</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-slate-800/60">
                          <span className="font-mono font-bold text-amber-400">{loss.centralEnergyKwh.toLocaleString()} ك.و.س</span>
                          <span className="text-slate-400">إجمالي الطاقة المستهلكة (المركزي):</span>
                        </div>
                      </div>

                      {/* Sub-meters Total vs Loss & Monetary Value */}
                      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/80 space-y-2 text-xs">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-mono font-bold text-emerald-400">{loss.subMetersEnergyKwh.toLocaleString()} ك.و.س</span>
                          <span className="text-slate-400">مجموع استهلاك المشتركين ({loss.subscribersCount}):</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] pt-1.5 border-t border-slate-800/60">
                          <span className={`font-mono font-black ${isRed ? 'text-rose-400' : isYellow ? 'text-amber-400' : 'text-slate-200'}`}>
                            {loss.totalLossKwh.toLocaleString()} ك.و.س
                          </span>
                          <span className="text-slate-400 font-bold">كمية الفاقد الإجمالية:</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className={`font-mono font-black ${isRed ? 'text-rose-400' : isYellow ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {loss.lossValueCurrency.toLocaleString()} {settings.currency || 'ريال'}
                          </span>
                          <span className="text-slate-400 font-bold">القيمة النقدية للفاقد:</span>
                        </div>
                      </div>
                    </div>

                    {/* Recommendation / Technical Inspection Alert */}
                    {isRed && (
                      <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[11px] text-rose-300 space-y-1">
                        <div className="font-bold flex items-center gap-1 text-rose-400">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>يتطلب نزول فريق تفتيش فني عاجل للمنطقة!</span>
                        </div>
                        <p className="text-[10px] text-rose-300/80 leading-relaxed">
                          تجاوز الفاقد 10% يشير إلى احتمال وجود توصيلات مباشرة غير قانونية أو عطل بالعدادات الفرعية.
                        </p>
                      </div>
                    )}

                    {/* Footer Actions */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <button 
                        onClick={() => setSelectedTransformer(item.name)}
                        className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 text-[11px] transition-colors"
                      >
                        <span>عرض المشتركين ({item.count})</span>
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => openMasterEdit(item.raw)}
                        className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 px-3 py-1.5 rounded-lg border border-amber-500/30 text-[11px] font-bold transition-colors flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>إدخال القراءات المركزية</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* EDIT MASTER METER READING MODAL */}
        <AnimatePresence>
          {editingMasterTrans && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md text-right shadow-2xl space-y-5"
              >
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <button onClick={() => setEditingMasterTrans(null)} className="text-slate-400 hover:text-white">
                    <XCircle className="w-6 h-6" />
                  </button>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-slate-100 text-base">إدخال وتحديث بيانات العداد المركزي</h3>
                    <Gauge className="w-5 h-5 text-amber-500" />
                  </div>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="font-bold text-amber-400">{getTransName(editingMasterTrans)}</span>
                    <span className="text-slate-400">اسم المحول:</span>
                  </div>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1 font-bold">القدرة (KVA)</label>
                      <input 
                        type="number"
                        value={editCapacityKva}
                        onChange={e => setEditCapacityKva(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs font-mono focus:border-amber-500 outline-none"
                        placeholder="500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-bold">المنطقة الجغرافية</label>
                      <select 
                        value={editZone}
                        onChange={e => setEditZone(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs focus:border-amber-500 outline-none"
                      >
                        {zones.map((z, i) => (
                          <option key={i} value={z}>{z}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-bold">رقم العداد المركزي (Master Meter ID)</label>
                    <input 
                      type="text"
                      value={editMeterNum}
                      onChange={e => setEditMeterNum(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs font-mono focus:border-amber-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1 font-bold">القراءة السابقة (ك.و.س)</label>
                      <input 
                        type="number"
                        value={editPrevMaster}
                        onChange={e => setEditPrevMaster(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs font-mono focus:border-amber-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 font-bold">القراءة الحالية (ك.و.س)</label>
                      <input 
                        type="number"
                        value={editCurrMaster}
                        onChange={e => setEditCurrMaster(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs font-mono focus:border-amber-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-bold">معامل الضرب محول التيار (CT Ratio Multiplier)</label>
                    <input 
                      type="number"
                      value={editCtRatio}
                      onChange={e => setEditCtRatio(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-xs font-mono focus:border-amber-500 outline-none"
                      placeholder="1"
                    />
                  </div>

                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex justify-between items-center font-mono font-bold text-amber-300">
                    <span>{Math.max(0, (editCurrMaster - editPrevMaster) * (editCtRatio || 1)).toLocaleString()} ك.و.س</span>
                    <span className="text-xs text-slate-300 font-sans">إجمالي الاستهلاك المركزي المحسوب:</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-slate-800">
                  <button 
                    onClick={saveMasterEdit}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-xl transition-colors text-xs"
                  >
                    حفظ وتطابق الفاقد فوراً
                  </button>
                  <button 
                    onClick={() => setEditingMasterTrans(null)}
                    className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl transition-colors text-xs"
                  >
                    إلغاء
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transformer Sub-meters Modal */}
        <AnimatePresence>
          {selectedTransformer && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-slate-900 rounded-3xl p-6 w-full max-w-3xl text-right border border-slate-800 shadow-2xl overflow-y-auto max-h-[85vh]"
              >
                <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedTransformer(null)} className="text-slate-400 hover:text-white p-1">
                      <XCircle className="w-6 h-6" />
                    </button>
                    {selectedTransformer !== 'غير محدد' && (
                      <button
                        type="button"
                        onClick={() => {
                          setTransformerToDelete({ name: selectedTransformer, count: selectedTransformerSubs.length });
                        }}
                        className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                        title="حذف هذا المحول"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف المحول</span>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-white">تفاصيل العدادات الفرعية المغذاة من: <span className="text-amber-400">{selectedTransformer}</span></h3>
                    <Zap className="w-5 h-5 text-amber-500" />
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-6 flex justify-around text-center text-xs">
                  <div>
                    <span className="text-slate-400 block mb-1">إجمالي العدادات الفرعية المرتبطة</span>
                    <span className="text-lg font-black text-emerald-400 font-mono">{selectedTransformerSubs.length} مشترك</span>
                  </div>
                  <div className="w-px bg-slate-800" />
                  <div>
                    <span className="text-slate-400 block mb-1">إجمالي الديون القائمة</span>
                    <span className="text-lg font-black text-rose-400 font-mono">
                      {selectedTransformerSubs.reduce((sum, s) => sum + Math.max(0, s.currentBalance), 0).toLocaleString()} {settings.currency}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                        <th className="p-3">#</th>
                        <th className="p-3">اسم المشترك</th>
                        <th className="p-3">رقم العداد الفرعي</th>
                        <th className="p-3">المنطقة</th>
                        <th className="p-3">القراءة الحالية</th>
                        <th className="p-3">الرصيد المستحق</th>
                        <th className="p-3 text-center">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {selectedTransformerSubs.map((sub, idx) => (
                        <tr key={sub.id} className="hover:bg-slate-800/40">
                          <td className="p-3 font-mono text-slate-500">{idx + 1}</td>
                          <td className="p-3 font-bold text-amber-400">{sub.name}</td>
                          <td className="p-3 font-mono text-slate-300">{sub.meterNumber}</td>
                          <td className="p-3 text-slate-300">{sub.zone}</td>
                          <td className="p-3 font-mono text-cyan-400">{sub.currentReading} ك.و</td>
                          <td className="p-3 font-mono font-bold">
                            <span className={sub.currentBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                              {sub.currentBalance.toLocaleString()} {settings.currency}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sub.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                              {sub.status === 'active' ? 'نشط' : 'موقف'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {selectedTransformerSubs.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-slate-500 italic">
                            لا يوجد مشتركين مرتبطين بهذا المحول / العداد المركزي حالياً
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Zone Details Modal */}
        <AnimatePresence>
          {selectedZone && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="bg-slate-900 rounded-3xl p-6 w-full max-w-3xl text-right border border-slate-800 shadow-2xl overflow-y-auto max-h-[85vh]"
              >
                <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedZone(null)} className="text-slate-400 hover:text-white p-1">
                      <XCircle className="w-6 h-6" />
                    </button>
                    {selectedZone !== 'غير محدد' && (
                      <button
                        type="button"
                        onClick={() => {
                          setZoneToDelete({ name: selectedZone, count: selectedZoneSubs.length });
                        }}
                        className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                        title="حذف هذه المنطقة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف المنطقة</span>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-white">تفاصيل المشتركين في منطقة: <span className="text-amber-400">{selectedZone}</span></h3>
                    <Map className="w-5 h-5 text-amber-500" />
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-6 flex justify-around text-center text-xs">
                  <div>
                    <span className="text-slate-400 block mb-1">إجمالي المشتركين</span>
                    <span className="text-lg font-black text-emerald-400 font-mono">{selectedZoneSubs.length} مشترك</span>
                  </div>
                  <div className="w-px bg-slate-800" />
                  <div>
                    <span className="text-slate-400 block mb-1">إجمالي الديون القائمة</span>
                    <span className="text-lg font-black text-rose-400 font-mono">
                      {selectedZoneSubs.reduce((sum, s) => sum + Math.max(0, s.currentBalance), 0).toLocaleString()} {settings.currency}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                        <th className="p-3">#</th>
                        <th className="p-3">اسم المشترك</th>
                        <th className="p-3">رقم العداد</th>
                        <th className="p-3">المحول</th>
                        <th className="p-3">الرصيد المستحق</th>
                        <th className="p-3 text-center">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {selectedZoneSubs.map((sub, idx) => (
                        <tr key={sub.id} className="hover:bg-slate-800/40">
                          <td className="p-3 font-mono text-slate-500">{idx + 1}</td>
                          <td className="p-3 font-bold text-amber-400">{sub.name}</td>
                          <td className="p-3 font-mono text-slate-300">{sub.meterNumber}</td>
                          <td className="p-3 text-slate-300">{sub.transformer || 'غير محدد'}</td>
                          <td className="p-3 font-mono font-bold">
                            <span className={sub.currentBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                              {sub.currentBalance.toLocaleString()} {settings.currency}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sub.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                              {sub.status === 'active' ? 'نشط' : 'موقف'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {selectedZoneSubs.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-500 italic">
                            لا يوجد مشتركين مسجلين في هذه المنطقة حالياً
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Zone Deletion Confirmation Modal */}
        <AnimatePresence>
          {zoneToDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md text-right shadow-2xl space-y-4"
                dir="rtl"
              >
                <div className="flex items-center gap-3 text-rose-500 border-b border-slate-800 pb-3">
                  <div className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-100 text-base">تأكيد حذف المنطقة الجغرافية</h3>
                    <p className="text-xs text-slate-400 mt-0.5">المنطقة: <span className="font-bold text-amber-400">{zoneToDelete.name}</span></p>
                  </div>
                </div>

                {zoneToDelete.count > 0 ? (
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold text-amber-400">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>تنبيه: يوجد {zoneToDelete.count} مشترك مرتبط بهذه المنطقة!</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      سيتم حذف المنطقة من إعدادات النظام وقائمة المناطق الجغرافية، ولن يتم حذف المشتركين. هل تود المتابعة وتأكيد الحذف؟
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-300 leading-relaxed">
                    هل أنت متأكد من رغبتك في حذف المنطقة <strong className="text-white font-bold">{zoneToDelete.name}</strong> نهائياً من النظام؟
                  </p>
                )}

                <div className="flex gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleDeleteZone(zoneToDelete.name)}
                    className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl transition-all text-xs cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>نعم، تأكيد الحذف</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoneToDelete(null)}
                    className="px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl transition-all text-xs cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transformer Deletion Confirmation Modal */}
        <AnimatePresence>
          {transformerToDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md text-right shadow-2xl space-y-4"
                dir="rtl"
              >
                <div className="flex items-center gap-3 text-rose-500 border-b border-slate-800 pb-3">
                  <div className="p-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-100 text-base">تأكيد حذف المحول / العداد المركزي</h3>
                    <p className="text-xs text-slate-400 mt-0.5">المحول: <span className="font-bold text-amber-400">{transformerToDelete.name}</span></p>
                  </div>
                </div>

                {transformerToDelete.count > 0 ? (
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold text-amber-400">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>تنبيه: يوجد {transformerToDelete.count} مشترك مرتبط بهذا المحول!</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[11px]">
                      سيتم حذف المحول من إعدادات النظام ومحرك حساب الفاقد. هل تود المتابعة وتأكيد الحذف؟
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-300 leading-relaxed">
                    هل أنت متأكد من رغبتك في حذف المحول <strong className="text-white font-bold">{transformerToDelete.name}</strong> نهائياً؟
                  </p>
                )}

                <div className="flex gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleDeleteTransformer(transformerToDelete.name)}
                    className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl transition-all text-xs cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>نعم، تأكيد الحذف</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransformerToDelete(null)}
                    className="px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl transition-all text-xs cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </motion.div>
  );
};

export default AdminZones;
