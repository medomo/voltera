import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, SystemSettings } from '../types';
import { ActiveSection } from '../context/DashboardContext';
import {
  LayoutDashboard, Users, Shield, Package, Wrench, BarChart3, MessageSquare,
  Settings, LogOut, Wallet, ChevronDown, XCircle
} from 'lucide-react';

interface AdminSidebarProps {
  currentUser: User;
  settings: SystemSettings;
  activeSection: ActiveSection;
  setActiveSection: (section: ActiveSection) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  onLogout: () => void;
  pendingPostingsCount: number;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentUser,
  settings,
  activeSection,
  setActiveSection,
  sidebarOpen,
  setSidebarOpen,
  onLogout,
  pendingPostingsCount,
}) => {
  // Navigation Accordion State
  const [expandedMenus, setExpandedMenus] = useState<{ [key: string]: boolean }>({
    subscribers: true,
    finance: true,
    treasury: true,
    inventory: false,
    hr: false,
    operations: false,
    reporting: false,
    sms: false,
    system: true,
  });

  const toggleMenu = (menuKey: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  // Role permissions checking
  const userPerms = currentUser.permissions || [];
  const isAdmin = currentUser.role === 'admin';
  const isManager = currentUser.role === 'manager';
  const isAccountant = currentUser.role === 'accountant';

  const canSeeSubscribers = isAdmin || isManager || userPerms.includes('subscribers_view') || userPerms.includes('subscribers_manage');
  const canSeeFinance = isAdmin || isManager || isAccountant || userPerms.includes('readings_post') || userPerms.includes('payments_collect');
  const canSeeInventory = isAdmin || isManager || userPerms.includes('inventory_view') || userPerms.includes('inventory_manage');
  const canSeeHR = isAdmin || isManager || userPerms.includes('hr_view') || userPerms.includes('hr_manage');
  const canSeeOperations = isAdmin || isManager || userPerms.includes('operations_view') || userPerms.includes('operations_manage');
  const canSeeReporting = isAdmin || isManager || isAccountant || userPerms.includes('reports_view');
  const canSeeSMS = isAdmin || isManager || userPerms.includes('sms_manage');
  const canSeeSystemAdmin = isAdmin || isManager || userPerms.includes('system_manage');

  const handleNavClick = (section: ActiveSection) => {
    setActiveSection(section);
    setSidebarOpen(false);
  };

  return (
    <>
      {/* Responsive Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
        />
      )}

      {/* RIGHT SIDEBAR (Control Navigation) */}
      <nav className={`fixed lg:relative inset-y-0 right-0 z-50 lg:z-10 w-72 bg-slate-900 border-l border-slate-800 p-4 transform-gpu transition-transform duration-300 lg:transform-none flex flex-col gap-6 ${
        sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
      } overflow-y-auto overflow-x-hidden custom-scrollbar`}>
        
        <div className="flex items-center justify-between lg:justify-start gap-2 text-right border-b border-slate-800/40 pb-4">
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
            title="إغلاق القائمة">
            <XCircle className="w-4.5 h-4.5" />
          </button>
          <div className="flex flex-col gap-0.5 text-right">
            <h3 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">نظام إدارة موارد المؤسسة</h3>
            <span className="text-white text-sm font-black flex items-center justify-start gap-1.5">
               ERP System <Package className="w-4 h-4 text-amber-500" />
            </span>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-1 pr-1 w-full">
          
          {/* Standalone Link: Dashboard */}
          <button
            onClick={() => handleNavClick('dashboard')}
            className={`flex items-center justify-start gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeSection === 'dashboard'
                ? 'bg-amber-500/15 text-amber-400 font-bold border-r-2 border-amber-400 shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <span>لوحة القيادة والمؤشرات</span>
            <LayoutDashboard className={`w-4.5 h-4.5 shrink-0 ${activeSection === 'dashboard' ? 'text-amber-400' : 'text-slate-400'}`} />
          </button>

          {canSeeSubscribers && (
            <div className="mt-2">
              <button
                onClick={() => toggleMenu('subscribers')}
                className="w-full flex items-center justify-between text-xs text-slate-400 font-bold px-2 py-2 mb-1 hover:text-slate-200 hover:bg-slate-800/30 rounded-lg transition-colors cursor-pointer focus:outline-none"
              >
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-500" />
                  <span>المشتركين والفوترة</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedMenus.subscribers ? '' : 'rotate-90'}`} />
              </button>
              
              <AnimatePresence>
                {expandedMenus.subscribers && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col gap-0.5 pr-3 border-r-2 border-slate-800/60 mr-2 overflow-hidden"
                  >
                    <button
                      onClick={() => handleNavClick('subscribers')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'subscribers'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>إدارة المشتركين</span>
                    </button>
                    <button
                      onClick={() => handleNavClick('debt')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'debt'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>إدارة الديون والمتأخرات</span>
                    </button>
                    <button
                      onClick={() => handleNavClick('zones')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'zones'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>المناطق والمحولات</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {canSeeFinance && (
            <div className="mt-2">
              <button
                onClick={() => toggleMenu('finance')}
                className="w-full flex items-center justify-between text-xs text-slate-400 font-bold px-2 py-2 mb-1 hover:text-slate-200 hover:bg-slate-800/30 rounded-lg transition-colors cursor-pointer focus:outline-none"
              >
                <span className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-blue-500" />
                  <span>المالية والمحاسبة</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedMenus.finance ? '' : 'rotate-90'}`} />
              </button>
              
              <AnimatePresence>
                {expandedMenus.finance && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col gap-0.5 pr-3 border-r-2 border-slate-800/60 mr-2 overflow-hidden"
                  >
                    <button
                      onClick={() => handleNavClick('accounting')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'accounting'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>النظام المحاسبي الشامل</span>
                    </button>
                    <button
                      onClick={() => handleNavClick('service-connections')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'service-connections'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span>إيرادات إدخال الخدمة والاشتراكات</span>
                    </button>
                    <button
                      onClick={() => handleNavClick('admin-postings')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'admin-postings'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      {pendingPostingsCount > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 animate-pulse ml-2" />
                      )}
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>الترحيلات المالية والقيود</span>
                    </button>
                    <button
                      onClick={() => handleNavClick('partners')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'partners'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span>إدارة الشركاء وتوزيع الأرباح</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {canSeeInventory && (
            <div className="mt-2">
              <button
                onClick={() => toggleMenu('inventory')}
                className="w-full flex items-center justify-between text-xs text-slate-400 font-bold px-2 py-2 mb-1 hover:text-slate-200 hover:bg-slate-800/30 rounded-lg transition-colors cursor-pointer focus:outline-none"
              >
                <span className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-purple-500" />
                  <span>المخزون والمستودع</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedMenus.inventory ? '' : 'rotate-90'}`} />
              </button>
              
              <AnimatePresence>
                {expandedMenus.inventory && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col gap-0.5 pr-3 border-r-2 border-slate-800/60 mr-2 overflow-hidden"
                  >
                    <button
                      onClick={() => handleNavClick('inventory-catalog')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'inventory-catalog'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>دليل الأصناف</span>
                    </button>
                    <button
                      onClick={() => handleNavClick('inventory-transactions')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'inventory-transactions'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>حركات المستودع</span>
                    </button>
                    <button
                      onClick={() => handleNavClick('inventory-alerts')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'inventory-alerts'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>الجرد والتنبيهات</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {canSeeFinance && (
            <div className="mt-2">
              <button
                onClick={() => toggleMenu('treasury')}
                className="w-full flex items-center justify-between text-xs text-slate-400 font-bold px-2 py-2 mb-1 hover:text-slate-200 hover:bg-slate-800/30 rounded-lg transition-colors cursor-pointer focus:outline-none"
              >
                <span className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-amber-500" />
                  <span>الصناديق والتحويلات المالية</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedMenus.treasury ? '' : 'rotate-90'}`} />
              </button>
              
              <AnimatePresence>
                {expandedMenus.treasury && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col gap-0.5 pr-3 border-r-2 border-slate-800/60 mr-2 overflow-hidden"
                  >
                    <button
                      onClick={() => handleNavClick('treasury-boxes')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'treasury-boxes'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>صناديق المحصلين والخزائن</span>
                    </button>
                    <button
                      onClick={() => handleNavClick('treasury-transfers')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'treasury-transfers'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>سندات التوريد والتحويلات</span>
                    </button>
                    <button
                      onClick={() => handleNavClick('treasury-statements')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'treasury-statements'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>كشف حساب محصل تفصيلي</span>
                    </button>
                    <button
                      onClick={() => handleNavClick('treasury-performance')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'treasury-performance'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>تقييم أداء المحصلين</span>
                    </button>
                    <button
                      onClick={() => handleNavClick('treasury-daily')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'treasury-daily'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>الجرد والتدفقات اليومية</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {canSeeHR && (
            <div className="mt-2">
              <button
                onClick={() => toggleMenu('hr')}
                className="w-full flex items-center justify-between text-xs text-slate-400 font-bold px-2 py-2 mb-1 hover:text-slate-200 hover:bg-slate-800/30 rounded-lg transition-colors cursor-pointer focus:outline-none"
              >
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-500" />
                  <span>وحدة الموارد البشرية (HR)</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedMenus.hr ? '' : 'rotate-90'}`} />
              </button>
              
              <AnimatePresence>
                {expandedMenus.hr && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col gap-0.5 pr-3 border-r-2 border-slate-800/60 mr-2 overflow-hidden"
                  >
                    <button
                      onClick={() => handleNavClick('hr-employees')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'hr-employees'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>ملفات الموظفين</span>
                    </button>
                    <button
                      onClick={() => handleNavClick('hr-payroll')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'hr-payroll'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>الرواتب والسلف</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {canSeeOperations && (
            <div className="mt-2">
              <button
                onClick={() => toggleMenu('operations')}
                className="w-full flex items-center justify-between text-xs text-slate-400 font-bold px-2 py-2 mb-1 hover:text-slate-200 hover:bg-slate-800/30 rounded-lg transition-colors cursor-pointer focus:outline-none"
              >
                <span className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-orange-500" />
                  <span>العمليات والمناطق</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedMenus.operations ? '' : 'rotate-90'}`} />
              </button>
              
              <AnimatePresence>
                {expandedMenus.operations && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col gap-0.5 pr-3 border-r-2 border-slate-800/60 mr-2 overflow-hidden"
                  >
                    <button
                      onClick={() => handleNavClick('operations-zones')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'operations-zones'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>المناطق والمحولات</span>
                    </button>
                    <button
                      onClick={() => handleNavClick('operations-requests')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'operations-requests'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>الطلبات الفنية</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {canSeeReporting && (
            <div className="mt-2">
              <button
                onClick={() => toggleMenu('reporting')}
                className="w-full flex items-center justify-between text-xs text-slate-400 font-bold px-2 py-2 mb-1 hover:text-slate-200 hover:bg-slate-800/30 rounded-lg transition-colors cursor-pointer focus:outline-none"
              >
                <span className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-pink-500" />
                  <span>وحدة التقارير الشاملة</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedMenus.reporting ? '' : 'rotate-90'}`} />
              </button>
              
              <AnimatePresence>
                {expandedMenus.reporting && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col gap-0.5 pr-3 border-r-2 border-slate-800/60 mr-2 overflow-hidden"
                  >
                    <button
                      onClick={() => handleNavClick('reporting-executive')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'reporting-executive'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span>الملخص التنفيذي الشامل</span>
                    </button>
                    <button
                      onClick={() => handleNavClick('reporting-financial')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'reporting-financial'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>تقارير مالية وأرباح</span>
                    </button>
                    <button
                      onClick={() => handleNavClick('reporting-consumption')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'reporting-consumption'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                      <span>تقارير استهلاك</span>
                    </button>
                    <button
                      onClick={() => handleNavClick('reporting-debt')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'reporting-debt'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                      <span>أعمار الديون والتحصيل</span>
                    </button>
                    <button
                      onClick={() => handleNavClick('reporting-loss')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'reporting-loss'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 animate-pulse" />
                      <span>الفاقد والتحليل الذكي</span>
                    </button>
                    <button
                      onClick={() => handleNavClick('reporting-inventory')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'reporting-inventory'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                      <span>تقارير الجرد والمخزون</span>
                    </button>
                    <button
                      onClick={() => handleNavClick('reporting-hr')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'reporting-hr'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                      <span>تقارير الموظفين والرواتب</span>
                    </button>
                    <button
                      onClick={() => handleNavClick('reporting-statements')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'reporting-statements'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                      <span>كشوف الحسابات الرسمية</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {canSeeSMS && (
            <div className="mt-2">
              <button
                onClick={() => toggleMenu('sms')}
                className="w-full flex items-center justify-between text-xs text-slate-400 font-bold px-2 py-2 mb-1 hover:text-slate-200 hover:bg-slate-800/30 rounded-lg transition-colors cursor-pointer focus:outline-none"
              >
                <span className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-cyan-500" />
                  <span>نظام الرسائل النصية SMS</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedMenus.sms ? '' : 'rotate-90'}`} />
              </button>
              
              <AnimatePresence>
                {expandedMenus.sms && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col gap-0.5 pr-3 border-r-2 border-slate-800/60 mr-2 overflow-hidden"
                  >
                    <button
                      onClick={() => handleNavClick('sms-templates')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'sms-templates'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>قوالب الرسائل</span>
                    </button>
                    <button
                      onClick={() => handleNavClick('sms-subscriptions')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'sms-subscriptions'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>دليل المشتركين</span>
                    </button>
                    <button
                      onClick={() => handleNavClick('sms-send')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'sms-send'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>إرسال رسالة</span>
                    </button>
                    <button
                      onClick={() => handleNavClick('sms-failed')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'sms-failed'
                          ? 'bg-slate-800/80 text-white font-bold text-rose-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      <span className={activeSection === 'sms-failed' ? 'text-rose-400' : ''}>الرسائل المتعثرة</span>
                    </button>
                    <button
                      onClick={() => handleNavClick('sms-outbox')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'sms-outbox'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
                      <span>سجل الرسائل الصادرة</span>
                    </button>
                    <button
                      onClick={() => handleNavClick('sms-gateway')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'sms-gateway'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                      <span>إعدادات بوابات SMS</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {canSeeSystemAdmin && (
            <div className="mt-2">
              <button
                onClick={() => {
                  toggleMenu('system');
                  if (!['roles', 'admin-db', 'admin-security', 'station-directory', 'admin-settings', 'admin-services', 'system'].includes(activeSection)) {
                    setActiveSection('station-directory');
                  }
                }}
                className={`w-full flex items-center justify-between text-xs font-bold px-2 py-2 mb-1 hover:text-slate-200 hover:bg-slate-800/30 rounded-lg transition-colors cursor-pointer focus:outline-none ${
                  ['roles', 'admin-db', 'admin-security', 'station-directory', 'admin-settings', 'admin-services', 'system'].includes(activeSection)
                    ? 'text-amber-400 bg-slate-800/50'
                    : 'text-slate-400'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-rose-500" />
                  <span>إدارة النظام والإعدادات</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedMenus.system ? '' : 'rotate-90'}`} />
              </button>
              
              <AnimatePresence>
                {expandedMenus.system && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="flex flex-col gap-0.5 pr-3 border-r-2 border-slate-800/60 mr-2 overflow-hidden"
                  >
                    <button
                      onClick={() => handleNavClick('station-directory')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'station-directory' || activeSection === 'system'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span>دليل وهوية المحطة</span>
                    </button>
                    <button
                      onClick={() => handleNavClick('admin-settings')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'admin-settings'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>تعرفة الكهرباء والرسوم</span>
                    </button>
                    <button
                      onClick={() => handleNavClick('admin-services')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'admin-services'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>السندات الحرارية والطباعة</span>
                    </button>
                    <button
                      onClick={() => handleNavClick('roles')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'roles'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>المستخدمين والصلاحيات</span>
                    </button>
                    <button
                      onClick={() => handleNavClick('admin-db')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'admin-db'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>قواعد البيانات والنسخ الاحتياطي</span>
                    </button>
                    <button
                      onClick={() => handleNavClick('admin-security')}
                      className={`flex items-center justify-start gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeSection === 'admin-security'
                          ? 'bg-slate-800/80 text-white font-bold text-amber-400'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                      <span>الأمان وسجل التدقيق</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Bottom profile and version */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-col gap-3">
          <button
            onClick={onLogout}
            className="flex items-center justify-start gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 border border-transparent hover:border-rose-900/30 transition-all cursor-pointer w-full"
          >
            <span>تسجيل الخروج من النظام</span>
            <LogOut className="w-4 h-4 shrink-0" />
          </button>
          
          <div className="p-3 bg-slate-800 rounded-xl border border-slate-700/60 flex items-center justify-between gap-3 text-right">
            <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center text-slate-900 font-bold font-mono">
              {currentUser.name.substring(0, 1)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
              <p className="text-[10px] text-slate-400">
                {currentUser.role === 'admin' ? 'مدير عام المحطة' : currentUser.role === 'manager' ? 'مدير فرع / تشغيل' : 'مستخدم نظام'}
              </p>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};
