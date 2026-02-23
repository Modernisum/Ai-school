import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box, Plus, ChevronDown, ChevronRight, Loader, Search,
  CheckCircle, AlertTriangle, X, RefreshCw, Trash2, Package
} from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL + "/spaces";
const getSchoolId = () => {
  const keys = ['schoolId', 'school_id'];
  for (const k of keys) { const v = localStorage.getItem(k); if (v && v !== 'undefined') return v; }
  return "622079";
};

export default function SpaceManagement() {
  const schoolId = getSchoolId();
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [toast, setToast] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); };

  const loadSpaces = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/${schoolId}/spaces`);
      const data = await res.json();
      setSpaces(data.data || data.spaces || []);
    } catch { showToast('error', 'Failed to load spaces'); }
    finally { setLoading(false); }
  };

  const createSpace = async () => {
    if (!newSpaceName.trim()) return;
    try {
      await fetch(`${API_BASE_URL}/${schoolId}/spaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spaceName: newSpaceName.trim() })
      });
      showToast('success', 'Space created');
      setNewSpaceName(''); setShowAdd(false);
      loadSpaces();
    } catch { showToast('error', 'Failed to create space'); }
  };

  useEffect(() => { loadSpaces(); }, [schoolId]);

  const filtered = spaces.filter(s =>
    (s.spaceName || s.space_name || s.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-full">
      <div className="page-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <Box size={18} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Space Management</h1>
            <p className="text-xs text-slate-500">{spaces.length} spaces</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={loadSpaces} className="btn-secondary p-2"><RefreshCw size={15} /></button>
          <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={15} /> New Space</button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input-dark pl-9" placeholder="Search spaces..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader size={28} className="animate-spin text-indigo-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14">
            <Box size={36} className="text-slate-600 mx-auto mb-2" />
            <p className="text-slate-500">No spaces found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((space, i) => {
              const id = space.id || space.spaceId || space.space_id;
              const name = space.spaceName || space.space_name || space.name;
              const items = space.items || space.inventory || [];
              const isOpen = expanded === id;

              return (
                <motion.div
                  key={id || i}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="glass-card overflow-hidden"
                >
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.03] transition-colors"
                    onClick={() => setExpanded(isOpen ? null : id)}
                  >
                    <div className="flex items-center gap-3">
                      {isOpen ? <ChevronDown size={16} className="text-violet-400" /> : <ChevronRight size={16} className="text-slate-500" />}
                      <div className="w-8 h-8 rounded-xl bg-violet-500/20 flex items-center justify-center">
                        <Box size={14} className="text-violet-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">{name}</p>
                        <p className="text-xs text-slate-600 font-mono">{id}</p>
                      </div>
                    </div>
                    <span className="badge bg-violet-500/10 border-violet-500/20 text-violet-400">
                      <Package size={10} className="inline mr-1" />{items.length} items
                    </span>
                  </div>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-white/5"
                      >
                        <div className="p-4">
                          {items.length === 0 ? (
                            <p className="text-slate-600 text-sm text-center py-4">No items in this space</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {items.map((item, idx) => (
                                <div key={idx} className="bg-white/5 border border-white/5 rounded-xl p-3">
                                  <p className="font-medium text-white text-sm">{item.itemName || item.name || `Item ${idx + 1}`}</p>
                                  <p className="text-slate-600 text-xs mt-0.5 font-mono">{item.id || item.itemId}</p>
                                  {item.roomNumber && <span className="badge bg-blue-500/10 border-blue-500/20 text-blue-400 mt-1">Room {item.roomNumber}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setShowAdd(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="modal-box" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-white">Create New Space</h3>
                <button onClick={() => setShowAdd(false)} className="text-slate-500 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-all"><X size={18} /></button>
              </div>
              <label className="section-label">Space Name</label>
              <input className="input-dark mb-5" placeholder="e.g. Science Lab, Library..." value={newSpaceName} onChange={e => setNewSpaceName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createSpace()} />
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
                <button onClick={createSpace} className="btn-primary">Create Space</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-xl
              ${toast.type === 'success' ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/20 border border-rose-500/30 text-rose-300'}`}>
            {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}