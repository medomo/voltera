import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Subscriber, MeterReading, Payment, SystemSettings, User 
} from '../../types';
import { IndividualStatementView } from './IndividualStatementView';
import { MasterBalancesStatementView } from './MasterBalancesStatementView';
import { AgingStatementsView } from './AgingStatementsView';
import { BatchStatementsHub } from './BatchStatementsHub';
import { 
  FileText, FileSpreadsheet, Clock, Printer, Sparkles, 
  Layers, ChevronRight, UserCheck, ShieldAlert
} from 'lucide-react';

interface SubscribersStatementHubProps {
  subscribers: Subscriber[];
  readings: MeterReading[];
  payments: Payment[];
  settings: SystemSettings;
  currentUser?: User;
  initialTab?: 'individual' | 'master' | 'aging' | 'batch';
  initialSubscriberId?: string;
}

export const SubscribersStatementHub: React.FC<SubscribersStatementHubProps> = ({
  subscribers = [],
  readings = [],
  payments = [],
  settings,
  currentUser,
  initialTab = 'individual',
  initialSubscriberId
}) => {
  const [activeTab, setActiveTab] = useState<'individual' | 'master' | 'aging' | 'batch'>(initialTab);
  const [selectedSubIdForIndividual, setSelectedSubIdForIndividual] = useState<string | undefined>(initialSubscriberId);

  const handleOpenIndividual = (sub: Subscriber) => {
    setSelectedSubIdForIndividual(sub.id);
    setActiveTab('individual');
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* 1. MODULE SUB-NAVIGATION TABS */}
      <div className="bg-slate-900 p-2 rounded-2xl border border-slate-800 shadow-md flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab('individual')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'individual'
                ? 'bg-amber-500 text-slate-950 shadow-md scale-100'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>كشف حساب المشترك الفردي</span>
          </button>

          <button
            onClick={() => setActiveTab('master')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'master'
                ? 'bg-amber-500 text-slate-950 shadow-md scale-100'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>ميزان الأرصدة والمطابقة الشامل</span>
          </button>

          <button
            onClick={() => setActiveTab('aging')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'aging'
                ? 'bg-amber-500 text-slate-950 shadow-md scale-100'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>تحليل أعمار الديون والمستحقات</span>
          </button>

          <button
            onClick={() => setActiveTab('batch')}
            className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'batch'
                ? 'bg-amber-500 text-slate-950 shadow-md scale-100'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>مركز الطباعة والتوليد المجمع</span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-2 px-3 text-xs text-slate-400 font-bold border-r border-slate-800">
          <span>نظام كشوفات الحسابات المالي الموحد</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>

      {/* 2. TAB CONTENT PANELS */}
      <AnimatePresence mode="wait">
        {activeTab === 'individual' && (
          <motion.div
            key="individual"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <IndividualStatementView
              subscribers={subscribers}
              readings={readings}
              payments={payments}
              settings={settings}
              currentUser={currentUser}
              initialSubscriberId={selectedSubIdForIndividual}
            />
          </motion.div>
        )}

        {activeTab === 'master' && (
          <motion.div
            key="master"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <MasterBalancesStatementView
              subscribers={subscribers}
              readings={readings}
              payments={payments}
              settings={settings}
              onOpenIndividualStatement={handleOpenIndividual}
            />
          </motion.div>
        )}

        {activeTab === 'aging' && (
          <motion.div
            key="aging"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <AgingStatementsView
              subscribers={subscribers}
              readings={readings}
              payments={payments}
              settings={settings}
              onOpenIndividualStatement={handleOpenIndividual}
            />
          </motion.div>
        )}

        {activeTab === 'batch' && (
          <motion.div
            key="batch"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <BatchStatementsHub
              subscribers={subscribers}
              readings={readings}
              payments={payments}
              settings={settings}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
