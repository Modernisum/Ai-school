import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { selectPollingInterval } from '../../settings/settingsSlice';
import { Box, Package, Briefcase } from 'lucide-react';
import MaterialPage from './MaterialPage';
import ResponsibilityPage from './ResponsibilityPage';
import SpacePage from './SpacePage';

const getSchoolId = () => {
  const keys = ['schoolId', 'school_id'];
  for (const k of keys) { const v = localStorage.getItem(k); if (v && v !== 'undefined') return v; }
  return null;
};

export default function SpaceManagement() {
  const schoolId = getSchoolId();
  const pollingInterval = useSelector(selectPollingInterval);
  const [activeMainTab, setActiveMainTab] = useState('spaces');
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="min-h-full">
      {/* Top Level Nav */}
      <div className="px-6 py-2.5 flex items-center justify-between border-b border-white/5 bg-black/20">
        <div className="flex gap-6">
          {[
            { id: 'spaces', label: 'Infrastructure Manifest', icon: Box },
            { id: 'materials', label: 'Material Inventory', icon: Package },
            { id: 'responsibilities', label: 'Mission Data (Roles)', icon: Briefcase },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveMainTab(tab.id)}
              className={`flex items-center gap-2 py-1 transition-all group relative ${
                activeMainTab === tab.id ? 'text-primary' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <tab.icon size={14} className={activeMainTab === tab.id ? 'text-primary' : 'text-slate-600 group-hover:text-slate-400'} />
              <span className="text-[11px] font-black uppercase italic tracking-tighter">{tab.label}</span>
              {activeMainTab === tab.id && (
                <motion.div layoutId="mainTab" className="absolute -bottom-[11px] left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-2xl shadow-2xl border ${
            toast.type === 'success' 
              ? 'bg-success/10 border-success/30 text-success' 
              : 'bg-accent/10 border-accent/30 text-accent'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              toast.type === 'success' ? 'bg-success/20' : 'bg-accent/20'
            }`}>
              {toast.type === 'success' ? '✓' : '⚠'}
            </div>
            <p className="text-sm font-black uppercase italic tracking-tight">{toast.message}</p>
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      {activeMainTab === 'spaces' ? (
        <SpacePage 
          schoolId={schoolId} 
          pollingInterval={pollingInterval}
          showToast={showToast}
        />
      ) : activeMainTab === 'materials' ? (
        <MaterialPage 
          schoolId={schoolId} 
          pollingInterval={pollingInterval}
          showToast={showToast}
        />
      ) : (
        <ResponsibilityPage 
          schoolId={schoolId} 
          pollingInterval={pollingInterval}
          showToast={showToast}
        />
      )}
    </div>
  );
}