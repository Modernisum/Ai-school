import React, { useState, useEffect } from 'react';
import { 
  History, RotateCcw, User, Calendar, 
  ChevronRight, ShieldAlert, ArrowRight,
  Search, Filter, RefreshCw, CheckCircle, AlertTriangle,
  Briefcase, CreditCard, Server, Settings, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SwitchButton from '../../../components/ui/SwitchButton';
import StandardButton from '../../../components/ui/StandardButton';

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
    <div className="max-w-full p-1 space-y-1 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <History size={14} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-widest uppercase italic leading-none">AUDIT_RECOVERY</h1>
            <p className="text-micro font-black text-slate-700 uppercase tracking-widest mt-0.5">REVERT_ENGINE • MANUAL_RECOVERY_PROTOCOL</p>
          </div>
        </div>

        <div className="scale-75 origin-right">
          <SwitchButton 
            tabs={TABS.map(t => ({ ...t, label: t.label.toUpperCase() }))}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-1 mb-2">
        <div className="relative flex-1 group">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="SCAN_AUDIT_LOGS..."
            className="w-full bg-white/[0.03] border border-white/10 rounded-lg h-8 pl-9 pr-3 text-micro text-white focus:outline-none focus:border-primary/40 focus:bg-white/[0.05] transition-all placeholder:text-slate-800 font-black uppercase tracking-widest"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <StandardButton 
          variant="ghost" 
          size="xs" 
          onClick={fetchHistory} 
          icon={RefreshCw}
          className={loading ? 'animate-spin' : ''}
        />
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
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.02 }}
              key={item.id}
              className="glass-card p-2 border-white/5 bg-white/[0.02] hover:border-primary/30 transition-all group flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-[200px]">
                <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-primary border border-white/10">
                  <ActiveIcon size={14} />
                </div>
                <div>
                  <h3 className="font-black text-white text-micro uppercase italic leading-none">{item.primaryText}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[8px] font-mono text-slate-700 font-black uppercase tracking-tighter">{item.secondaryText}</span>
                    <span className="text-[8px] bg-primary/5 text-primary/80 px-1 rounded border border-primary/10 font-black uppercase italic tracking-widest">{item.badge}</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 hidden md:block">
                <div className="flex flex-wrap gap-1">
                  {formatDelta(item.delta).slice(0, 3).map((d, i) => (
                    <div key={i} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 flex items-center gap-1.5">
                       <span className="text-[8px] font-black text-slate-700 uppercase italic leading-none">{d.label}:</span>
                       <span className="text-[8px] text-emerald-500 font-black uppercase italic tracking-tighter leading-none truncate max-w-[80px]">{String(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[8px] font-black text-white flex items-center gap-1.5 uppercase italic tracking-widest leading-none">
                    <Calendar size={10} className="text-slate-700" />
                    {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-[8px] text-slate-700 font-black uppercase italic tracking-widest mt-0.5 leading-none">{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                
                <StandardButton 
                  icon={RotateCcw} 
                  size="xs" 
                  onClick={() => setShowUndoModal(item)} 
                  variant="ghost" 
                />
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
