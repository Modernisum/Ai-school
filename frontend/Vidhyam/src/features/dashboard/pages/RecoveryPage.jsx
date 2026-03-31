import React, { useState, useEffect } from 'react';
import { 
  History, RotateCcw, User, Calendar, 
  ChevronRight, ShieldAlert, ArrowRight,
  Search, Filter, RefreshCw, CheckCircle, AlertTriangle,
  Briefcase, CreditCard, Server, Settings, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = window.location.origin.includes('localhost') 
  ? `http://${window.location.hostname}:8080/api` 
  : '/api';

const TABS = [
  { id: 'students', label: 'Students', icon: User },
  { id: 'employees', label: 'Employees', icon: Briefcase },
  { id: 'billing', label: 'Billing & Fees', icon: CreditCard },
  { id: 'infrastructure', label: 'Infrastructure', icon: Server },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'auth', label: 'AuthLogs', icon: Shield },
];

export default function RecoveryPage() {
  const [activeTab, setActiveTab] = useState('students');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUndoModal, setShowUndoModal] = useState(null);
  const [undoing, setUndoing] = useState(false);
  const [toast, setToast] = useState(null);

  const schoolId = localStorage.getItem('schoolId') || 'S1001';

  const fetchHistory = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE}/recovery/history/students/${schoolId}`;
      if (activeTab !== 'students') {
        url = `${API_BASE}/recovery/audit/${schoolId}?module=${activeTab}`;
      }
      
      const r = await fetch(url);
      const d = await r.json();
      if (d.success) {
        // Normalize mapped data so UI doesn't have checks everywhere
        const normalized = (d.data || []).map(item => {
          if (activeTab === 'students') {
            return {
              id: item.id,
              primaryText: item.studentName || 'Unknown Student',
              secondaryText: `ID: ${item.studentId}`,
              badge: `REV ${item.revNo}`,
              delta: item.delta,
              createdAt: item.createdAt,
              original: item
            };
          } else {
            return {
              id: item.id,
              primaryText: `${item.entityType} Log`,
              secondaryText: `ID: ${item.entityId}`,
              badge: (item.actionType || 'UNKNOWN').toUpperCase(),
              delta: item.changedData,
              createdAt: item.createdAt,
              original: item
            };
          }
        });
        setHistory(normalized);
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.error(err);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [schoolId, activeTab]);

  const handleUndo = async (item) => {
    setUndoing(true);
    try {
      let url = `${API_BASE}/recovery/history/undo/${schoolId}/${item.id}`;
      if (activeTab !== 'students') {
        url = `${API_BASE}/recovery/audit/undo/${schoolId}/${item.id}`;
      }

      const r = await fetch(url, { method: 'POST' });
      const d = await r.json();
      if (d.success) {
        setToast({ type: 'success', msg: 'Record reverted successfully!' });
        fetchHistory();
        setShowUndoModal(null);
      } else {
        setToast({ type: 'error', msg: d.message || 'Undo failed' });
      }
    } catch (err) {
      setToast({ type: 'error', msg: 'Network error' });
    } finally {
      setUndoing(false);
    }
  };

  const filtered = history.filter(h => 
    (h.primaryText || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (h.secondaryText || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDelta = (delta) => {
    if (!delta || typeof delta !== 'object') return [];
    return Object.entries(delta).map(([key, val]) => {
      let strVal = val;
      if (typeof val === 'object') strVal = JSON.stringify(val);
      return {
        key,
        label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
        value: strVal
      };
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tight">
            <div className="p-2.5 bg-primary/10 rounded-2xl border border-primary/20">
              <History size={28} className="text-primary" />
            </div>
            Audit Recovery
          </h1>
          <p className="text-slate-400 mt-2 font-medium">Track and revert changes made to student records.</p>
        </div>

        <div className="flex items-center gap-4 bg-slate-900/50 p-2 rounded-2xl border border-white/5 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-x-auto custom-scrollbar">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                  isActive 
                    ? 'bg-primary/20 text-primary border border-primary/20' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon size={16} />
                <span className="font-bold text-sm tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Search records..."
            className="bg-slate-900/50 border border-white/5 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white w-full md:w-80 focus:ring-2 focus:ring-primary/50 transition-all outline-none"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button onClick={fetchHistory} className="p-2.5 bg-slate-900/50 border border-white/5 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-slate-500 font-bold animate-pulse">Scanning history logs...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 bg-slate-900/30 rounded-3xl border border-dashed border-white/10">
          <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-6">
            <History size={40} className="text-slate-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-400">No {TABS.find(t => t.id === activeTab)?.label} Records</h3>
          <p className="text-slate-500 mt-2 text-sm">Audit trail records will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((item, idx) => {
            const ActiveIcon = TABS.find(t => t.id === activeTab)?.icon || User;
            return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={item.id}
              className="group glass-card p-6 flex flex-col md:flex-row md:items-center gap-6 hover:border-primary/30 transition-all border border-white/5 bg-slate-900/40 relative overflow-hidden rounded-2xl"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
              
              <div className="flex items-center gap-4 min-w-[240px]">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-primary border border-white/5">
                  <ActiveIcon size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">{item.primaryText}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-mono text-slate-500">{item.secondaryText}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-700" />
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">{item.badge}</span>
                  </div>
                </div>
              </div>

              <div className="flex-1">
                <div className="flex flex-wrap gap-2">
                  {formatDelta(item.delta).slice(0, 4).map((d, i) => (
                    <div key={i} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/[0.03] flex items-center gap-2">
                       <span className="text-[10px] font-bold text-slate-500 uppercase">{d.label}:</span>
                       <span className="text-[11px] text-emerald-400 font-medium truncate max-w-[120px]">{String(d.value)}</span>
                    </div>
                  ))}
                  {formatDelta(item.delta).length > 4 && (
                    <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/[0.03] text-[11px] text-slate-400 font-medium">
                      +{formatDelta(item.delta).length - 4} more
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-6 min-w-[200px] justify-between md:justify-end">
                <div className="flex flex-col items-end">
                  <p className="text-sm font-bold text-white flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400" />
                    {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                
                <button 
                  onClick={() => setShowUndoModal(item)}
                  title="Revert to this version"
                  className="p-3 rounded-2xl bg-primary/10 hover:bg-primary border border-primary/20 text-primary hover:text-white shadow-lg transition-all group-hover:scale-110 active:scale-95"
                >
                  <RotateCcw size={20} />
                </button>
              </div>
            </motion.div>
            );
          })}
        </div>
      )}

      {/* Undo Confirmation Modal */}
      <AnimatePresence>
        {showUndoModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl p-8"
            >
              <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <ShieldAlert size={32} className="text-amber-500" />
              </div>
              
              <h2 className="text-2xl font-black text-white text-center">Confirm Revert?</h2>
              <p className="text-slate-400 text-center mt-3 leading-relaxed">
                This will restore <span className="text-white font-bold">{showUndoModal.primaryText}</span>'s record 
                to the state in <span className="text-primary font-bold">{showUndoModal.badge}</span>. 
                This action will create a new history record.
              </p>

              <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/[0.03] space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                {formatDelta(showUndoModal.delta).map((d, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{d.label}</span>
                    <div className="flex items-center gap-2">
                      <ArrowRight size={10} className="text-slate-600" />
                      <span className="text-xs text-success font-medium truncate max-w-[150px]">{String(d.value)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 mt-8">
                <button 
                  onClick={() => setShowUndoModal(null)}
                  className="flex-1 py-4 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all border border-white/5"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleUndo(showUndoModal)}
                  disabled={undoing}
                  className="flex-1 py-4 bg-primary hover:brightness-110 disabled:opacity-50 text-white text-sm font-bold rounded-2xl shadow-lg shadow-primary/25 flex items-center justify-center gap-2 transition-all"
                >
                  {undoing ? <RefreshCw className="animate-spin" size={18} /> : <RotateCcw size={18} />}
                  {undoing ? 'Reverting...' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            onAnimationComplete={() => setTimeout(() => setToast(null), 3000)}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[110] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-xl border ${
              toast.type === 'success' ? 'bg-success/20 border-success/30 text-success' : 'bg-accent/20 border-accent/30 text-accent'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            <span className="font-bold text-sm tracking-tight">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
