import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box, Plus, ChevronDown, ChevronRight, Loader, Search,
  CheckCircle, AlertTriangle, X, RefreshCw, Trash2, Package, Upload
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import BulkImportModal from '../../../components/ui/BulkImportModal';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL + "/spaces";
const getSchoolId = () => {
  const keys = ['schoolId', 'school_id'];
  for (const k of keys) { const v = localStorage.getItem(k); if (v && v !== 'undefined') return v; }
  return "622079";
};

export default function SpaceManagement() {
  const location = useLocation();
  const schoolId = getSchoolId();
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [toast, setToast] = useState(null);
  const [showAdd, setShowAdd] = useState(new URLSearchParams(location.search).get('add') === '1');

  // Sync showAdd with URL search params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('add') === '1') {
      setShowAdd(true);
    } else if (params.get('add') === null && showAdd && !params.toString().includes('add=')) {
      setShowAdd(false);
    }
  }, [location.search]);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState(null);
  const [categories, setCategories] = useState([]);
  const [showCategories, setShowCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [deletingSpace, setDeletingSpace] = useState(null);

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

  const loadCategories = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/${schoolId}/categories`);
      const data = await res.json();
      setCategories(data.data || []);
    } catch { showToast('error', 'Failed to load categories'); }
  };

  const createSpace = async () => {
    if (!newSpaceName.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/${schoolId}/spaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spaceName: newSpaceName.trim() })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Space created');
        setNewSpaceName(''); setShowAdd(false);
        loadSpaces();
      } else {
        showToast('error', data.message || 'Failed to create space');
      }
    } catch { showToast('error', 'Failed to create space'); }
  };

  const updateSpace = async () => {
    if (!editingSpace || !editingSpace.spaceName.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/${schoolId}/${editingSpace.spaceId || editingSpace.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingSpace)
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Space updated');
        setEditingSpace(null);
        loadSpaces();
      } else {
        showToast('error', data.message || 'Failed to update space');
      }
    } catch { showToast('error', 'Failed to update space'); }
  };

  const deleteSpace = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${schoolId}/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Space deleted');
        setDeletingSpace(null);
        loadSpaces();
      } else {
        showToast('error', data.message || 'Failed to delete space');
      }
    } catch { showToast('error', 'Failed to delete space'); }
  };

  const createCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/${schoolId}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() })
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Category added');
        setNewCategoryName('');
        loadCategories();
      }
    } catch { showToast('error', 'Failed to add category'); }
  };

  const deleteCategory = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${schoolId}/categories/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'Category removed');
        loadCategories();
      }
    } catch { showToast('error', 'Failed to remove category'); }
  };

  const handleBulkSpacesImport = async (rows) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${schoolId}/spaces/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spaces: rows }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Bulk import failed');
      showToast('success', 'Bulk import successful');
      loadSpaces();
    } catch (e) { showToast('error', e.message); }
  };

  useEffect(() => {
    loadSpaces();
    loadCategories();
  }, [schoolId]);

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
          <button onClick={() => setShowCategories(true)} className="btn-secondary flex items-center gap-1.5">
            <Package size={15} /> Categories
          </button>
          <button onClick={() => setBulkModalOpen(true)} className="btn-secondary flex items-center gap-1.5">
            <Upload size={15} /> Bulk Import
          </button>
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
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.03] transition-colors">
                    <div className="flex items-center gap-3 flex-1" onClick={() => setExpanded(isOpen ? null : id)}>
                      {isOpen ? <ChevronDown size={16} className="text-violet-400" /> : <ChevronRight size={16} className="text-slate-500" />}
                      <div className="w-8 h-8 rounded-xl bg-violet-500/20 flex items-center justify-center">
                        <Box size={14} className="text-violet-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">{name}</p>
                        <p className="text-xs text-slate-600 font-mono">{id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="badge bg-violet-500/10 border-violet-500/20 text-violet-400">
                        <Package size={10} className="inline mr-1" />{items.length} items
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingSpace(space); }}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <RefreshCw size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeletingSpace(space); }}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-white/5"
                      >
                        <div className="p-4 space-y-4">
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Materials & Items</h4>
                            <button className="text-[10px] btn-secondary py-1 px-2 flex items-center gap-1" onClick={() => showToast('info', 'Material assignment coming soon')}>
                              <Plus size={10} /> Add Item
                            </button>
                          </div>
                          {items.length === 0 ? (
                            <p className="text-slate-600 text-sm text-center py-2">No items in this space</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {items.map((item, idx) => (
                                <div key={idx} className="bg-white/5 border border-white/5 rounded-xl p-3">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-medium text-white text-sm">{item.itemName || item.name || `Item ${idx + 1}`}</p>
                                      <p className="text-slate-600 text-xs mt-0.5 font-mono">{item.id || item.itemId}</p>
                                    </div>
                                    {item.roomNumber && <span className="badge bg-blue-500/10 border-blue-500/20 text-blue-400">Room {item.roomNumber}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between border-b border-white/5 pb-2 pt-2">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assigned Employees</h4>
                            <button className="text-[10px] btn-secondary py-1 px-2 flex items-center gap-1" onClick={() => showToast('info', 'Employee assignment coming soon')}>
                              <Plus size={10} /> Assign
                            </button>
                          </div>
                          <p className="text-slate-600 text-sm text-center py-2">None assigned</p>
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
              <div className="space-y-4">
                <div>
                  <label className="section-label">Space Name</label>
                  <input className="input-dark mt-1" placeholder="e.g. Science Lab..." value={newSpaceName} onChange={e => setNewSpaceName(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
                <button onClick={createSpace} className="btn-primary">Create Space</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingSpace && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setEditingSpace(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="modal-box w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-white">Edit Space</h3>
                <button onClick={() => setEditingSpace(null)} className="text-slate-500 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-all"><X size={18} /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="section-label">Space Name</label>
                  <input className="input-dark mt-1" value={editingSpace.spaceName} onChange={e => setEditingSpace({ ...editingSpace, spaceName: e.target.value })} />
                </div>
                <div>
                  <label className="section-label">Category</label>
                  <select
                    className="input-dark mt-1 w-full"
                    value={editingSpace.spaceCategory || 'classroom'}
                    onChange={e => setEditingSpace({ ...editingSpace, spaceCategory: e.target.value })}
                  >
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="section-label">Capacity</label>
                  <input type="number" className="input-dark mt-1" value={editingSpace.capacity || 0} onChange={e => setEditingSpace({ ...editingSpace, capacity: parseInt(e.target.value) })} />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button onClick={() => setEditingSpace(null)} className="btn-secondary">Cancel</button>
                <button onClick={updateSpace} className="btn-primary">Save Changes</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories Modal */}
      <AnimatePresence>
        {showCategories && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setShowCategories(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="modal-box w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-white">Space Categories</h3>
                <button onClick={() => setShowCategories(false)} className="text-slate-500 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-all"><X size={18} /></button>
              </div>
              <div className="flex gap-2 mb-4">
                <input className="input-dark" placeholder="New category..." value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                <button onClick={createCategory} className="btn-primary p-2"><Plus size={18} /></button>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {categories.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                    <span className="text-sm text-slate-300">{c.name} {c.isDefault && <span className="text-[10px] text-slate-500 ml-1">(Default)</span>}</span>
                    {!c.isDefault && (
                      <button onClick={() => deleteCategory(c.id)} className="text-slate-600 hover:text-rose-400 p-1"><X size={14} /></button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-5">
                <button onClick={() => setShowCategories(false)} className="btn-secondary">Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deletingSpace && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setDeletingSpace(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="modal-box w-full max-w-sm text-center" onClick={e => e.stopPropagation()}>
              <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="text-rose-500" size={24} />
              </div>
              <h3 className="font-bold text-white text-lg">Delete Space?</h3>
              <p className="text-slate-400 text-sm mt-2 mb-6">Are you sure you want to delete "{deletingSpace.spaceName}"? This action cannot be undone.</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setDeletingSpace(null)} className="btn-secondary">Cancel</button>
                <button onClick={() => deleteSpace(deletingSpace.spaceId || deletingSpace.id)} className="btn-primary bg-rose-500 hover:bg-rose-600 border-rose-600">Delete</button>
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

      <BulkImportModal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        title="Bulk Import Spaces"
        expectedHeaders={['Space Name']}
        onImport={handleBulkSpacesImport}
      />
    </div>
  );
}