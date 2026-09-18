import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Map, Zap, Settings, Wrench, AlertTriangle, Power, UserPlus, Clock, CheckCircle, Search, Plus, X, User, Download, Printer } from 'lucide-react';
import { exportToCSV, printData } from '../utils/exportUtils';
import { SystemSettings, Subscriber, TechnicalRequest, User as AppUser, Employee } from '../types';
import { AdminZones } from './AdminZones';

interface AdminOperationsProps {
  settings: SystemSettings;
  subscribers: Subscriber[];
  currentUser: AppUser;
  onUpdateSettings: (s: SystemSettings) => void;
  onUpdateSubscribers?: (subs: Subscriber[]) => void;
  activeTab: 'zones' | 'requests';
  techRequests?: TechnicalRequest[];
  onUpdateTechRequests?: (reqs: TechnicalRequest[]) => void;
  employees?: Employee[];
}

export const AdminOperations: React.FC<AdminOperationsProps> = ({
  settings, subscribers, currentUser, onUpdateSettings, onUpdateSubscribers, activeTab: initialTab,
  techRequests: techRequestsProp,
  onUpdateTechRequests,
  employees: employeesProp
}) => {
  const [activeTab, setActiveTab] = useState<'zones' | 'requests'>(initialTab);

  const [requests, setRequests] = useState<TechnicalRequest[]>(techRequestsProp || []);
  const [employees, setEmployees] = useState<Employee[]>(employeesProp || []);

  useEffect(() => { setRequests(techRequestsProp || []); }, [techRequestsProp]);
  useEffect(() => { setEmployees(employeesProp || []); }, [employeesProp]);

  const [showAddRequest, setShowAddRequest] = useState(false);
  const [newReq, setNewReq] = useState<Partial<TechnicalRequest>>({ type: 'new_connection' });

  const handleAddRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReq.applicantName || !newReq.phone) return;

    const req: TechnicalRequest = {
      id: Date.now().toString(),
      type: newReq.type as any,
      status: 'pending',
      applicantName: newReq.applicantName,
      phone: newReq.phone,
      address: newReq.address ?? '',
      description: newReq.description ?? '',
      createdAt: new Date().toISOString().split('T')[0],
      subscriberId: newReq.subscriberId,
      subscriberCode: newReq.subscriberCode,
      assignedTo: newReq.assignedTo,
      priority: newReq.priority || 'normal'
    };
    const updated = [req, ...requests];
    setRequests(updated);
    if (onUpdateTechRequests) onUpdateTechRequests(updated);
    setShowAddRequest(false);
    setNewReq({ type: 'new_connection' });
  };

  const updateRequestStatus = (id: string, status: TechnicalRequest['status'], assignedTo?: string) => {
    const updated = requests.map(r => {
      if (r.id === id) {
        return { ...r, status, assignedTo: assignedTo !== undefined ? assignedTo : r.assignedTo, completedAt: status === 'completed' ? new Date().toISOString().split('T')[0] : r.completedAt };
      }
      return r;
    });
    setRequests(updated);
    if (onUpdateTechRequests) onUpdateTechRequests(updated);
  };

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case 'new_connection': return { label: 'إدخال خدمة', icon: UserPlus, color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
      case 'maintenance': return { label: 'صيانة أعطال', icon: Wrench, color: 'text-amber-500', bg: 'bg-amber-500/10' };
      case 'disconnection': return { label: 'فصل خدمة', icon: Power, color: 'text-rose-500', bg: 'bg-rose-500/10' };
      case 'reconnection': return { label: 'إعادة خدمة', icon: Zap, color: 'text-blue-500', bg: 'bg-blue-500/10' };
      default: return { label: type, icon: Settings, color: 'text-slate-500', bg: 'bg-slate-100' };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'قيد الانتظار';
      case 'in_progress': return 'جاري التنفيذ';
      case 'completed': return 'مكتمل';
      case 'cancelled': return 'ملغي';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-600" />
          وحدة العمليات والمناطق (Operations)
        </h2>
        
        <div className="flex flex-wrap items-center justify-start gap-2 w-full sm:w-auto p-1 bg-slate-100 rounded-xl">
          <button 
            onClick={() => setActiveTab('zones')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'zones' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
          >
            <span>المناطق والمحولات</span>
            <Map className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setActiveTab('requests')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'requests' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
          >
            <span>الطلبات الفنية</span>
            <Wrench className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'zones' && (
          <motion.div
            key="zones"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <AdminZones subscribers={subscribers} settings={settings} onUpdateSettings={onUpdateSettings} onUpdateSubscribers={onUpdateSubscribers} />
          </motion.div>
        )}

        {activeTab === 'requests' && (
          <motion.div
            key="requests"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center">
              <div className="relative flex-1 max-w-md">
                <input 
                  type="text" 
                  placeholder="بحث في الطلبات..."
                  className="w-full bg-white border border-slate-200 rounded-xl py-2 px-4 pr-10 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-right"
                  dir="rtl"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => printData('الطلبات الفنية', requests.map(r => ({...r, type: r.type === 'new_connection' ? 'إدخال جديد' : r.type === 'maintenance' ? 'صيانة' : 'توسعة', status: r.status === 'pending' ? 'قيد الانتظار' : r.status === 'in_progress' ? 'قيد التنفيذ' : 'مكتمل'})), [{key: 'createdAt', label: 'التاريخ'}, {key: 'applicantName', label: 'صاحب الطلب'}, {key: 'phone', label: 'الهاتف'}, {key: 'type', label: 'نوع الطلب'}, {key: 'status', label: 'الحالة'}])} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm">
                  <Printer className="w-4 h-4" /> <span>طباعة</span>
                </button>
                <button onClick={() => exportToCSV(requests.map(r => ({...r, type: r.type === 'new_connection' ? 'إدخال جديد' : r.type === 'maintenance' ? 'صيانة' : 'توسعة', status: r.status === 'pending' ? 'قيد الانتظار' : r.status === 'in_progress' ? 'قيد التنفيذ' : 'مكتمل'})), 'technical_requests', [{key: 'createdAt', label: 'التاريخ'}, {key: 'applicantName', label: 'صاحب الطلب'}, {key: 'phone', label: 'الهاتف'}, {key: 'type', label: 'نوع الطلب'}, {key: 'status', label: 'الحالة'}])} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm">
                  <Download className="w-4 h-4" /> <span>CSV</span>
                </button>
                <button 
                  onClick={() => setShowAddRequest(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة طلب جديد</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {requests.map(req => {
                const typeInfo = getRequestTypeLabel(req.type);
                const TypeIcon = typeInfo.icon;
                
                return (
                  <div key={req.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-colors">
                    <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${typeInfo.bg}`}>
                          <TypeIcon className={`w-5 h-5 ${typeInfo.color}`} />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">{req.applicantName}</h4>
                          <span className="text-xs font-mono text-slate-500">{req.phone}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                        req.status === 'pending' ? 'bg-slate-100 text-slate-600' :
                        req.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                        req.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {getStatusLabel(req.status)}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4 text-sm text-slate-600">
                      <div className="flex items-start gap-2">
                        <Map className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <span>{req.address || 'لم يتم تحديد العنوان'}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <span>{req.description}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                        <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> <span>تاريخ الطلب: {req.createdAt}</span></div>
                        {req.assignedTo && <div className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-indigo-400" /> <span className="text-indigo-600 font-bold">{req.assignedTo}</span></div>}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-100">
                      {req.status === 'pending' && (
                        <div className="flex-1 flex gap-2">
                          <select 
                            className="flex-1 border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-indigo-500"
                            onChange={(e) => updateRequestStatus(req.id, 'in_progress', e.target.value)}
                            defaultValue=""
                          >
                            <option value="" disabled>تحويل التنفيذ إلى...</option>
                            {employees.filter(e => e.role === 'engineer' || e.role === 'technician').map(emp => (
                              <option key={emp.id} value={emp.name}>{emp.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      
                      {req.status === 'in_progress' && (
                        <button 
                          onClick={() => updateRequestStatus(req.id, 'completed')}
                          className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" /> إنجاز الطلب
                        </button>
                      )}

                      {req.status !== 'completed' && req.status !== 'cancelled' && (
                        <button 
                          onClick={() => updateRequestStatus(req.id, 'cancelled')}
                          className="px-3 py-2 text-rose-500 hover:bg-rose-50 rounded-lg text-xs font-bold transition-colors"
                        >
                          إلغاء
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {requests.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-500">
                  <Wrench className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p>لا توجد طلبات فنية حالياً</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
      {showAddRequest && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
              dir="rtl"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-black text-slate-800 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-indigo-600" />
                  إضافة طلب فني
                </h3>
                <button onClick={() => setShowAddRequest(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleAddRequest} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">اختيار مشترك مسجل (اختياري)</label>
                  <select 
                    value={newReq.subscriberId || ''} 
                    onChange={e => {
                      const subId = e.target.value;
                      const sub = subscribers.find(s => s.id === subId);
                      if (sub) {
                        setNewReq({
                          ...newReq,
                          subscriberId: sub.id,
                          subscriberCode: sub.accountNumber || sub.meterNumber,
                          applicantName: sub.name,
                          phone: sub.phone || '',
                          address: sub.address || sub.zone || '',
                          description: newReq.description || (newReq.type === 'disconnection' ? `أمر فصل خدمة للمشترك (${sub.name}) بسبب تراكم المديونية` : newReq.type === 'reconnection' ? `أمر إعادة خدمة للمشترك (${sub.name})` : '')
                        });
                      } else {
                        setNewReq({ ...newReq, subscriberId: '', subscriberCode: '' });
                      }
                    }}
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="">-- أو ادخل بيانات طلب جديد يدوياً --</option>
                    {subscribers.map(sub => (
                      <option key={sub.id} value={sub.id}>
                        {sub.accountNumber ? `[${sub.accountNumber}] ` : ''}{sub.name} - {sub.phone} ({sub.currentBalance > 0 ? `مديونية: ${sub.currentBalance}` : 'سليم'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع الطلب</label>
                    <select required value={newReq.type || 'new_connection'} onChange={e => setNewReq({...newReq, type: e.target.value as any})} className="w-full border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-500 font-bold">
                      <option value="disconnection">🔌 فصل خدمة (توقيف التيار)</option>
                      <option value="reconnection">⚡ إعادة خدمة (توصيل)</option>
                      <option value="new_connection">👤 إدخال خدمة جديدة</option>
                      <option value="maintenance">🛠️ صيانة أعطال</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">تعيين للمحصل / الفني</label>
                    <select 
                      value={newReq.assignedTo || ''} 
                      onChange={e => setNewReq({...newReq, assignedTo: e.target.value})} 
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-indigo-500 font-bold"
                    >
                      <option value="">جميع المحصلين (عام)</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.name}>
                          {emp.name} ({emp.role === 'collector' ? 'محصل' : emp.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">الاسم / الجهة</label>
                    <input type="text" required value={newReq.applicantName ?? ''} onChange={e => setNewReq({...newReq, applicantName: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">رقم الهاتف</label>
                    <input type="tel" required value={newReq.phone ?? ''} onChange={e => setNewReq({...newReq, phone: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500" dir="ltr" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">العنوان / المنطقة</label>
                  <input type="text" value={newReq.address ?? ''} onChange={e => setNewReq({...newReq, address: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">وصف المشكلة / الطلب</label>
                  <textarea rows={3} value={newReq.description ?? ''} onChange={e => setNewReq({...newReq, description: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 resize-none"></textarea>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowAddRequest(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">إلغاء</button>
                  <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm">حفظ الطلب</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminOperations;
