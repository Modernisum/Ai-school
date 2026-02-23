import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Plus, Search, Loader, X, CheckCircle,
  AlertTriangle, Users, DollarSign, School, RefreshCw, Trash2, Eye
} from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const getSchoolId = () => localStorage.getItem('schoolId') || "622079";

export default function SubjectManagement() {
  const schoolId = getSchoolId();
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('All');
  const [toast, setToast] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newSubject, setNewSubject] = useState({ subjectName: '', className: '', subjectFees: '' });

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); };

  const loadData = async () => {
    setLoading(true);
    try {
      const [sRes, cRes] = await Promise.all([
        fetch(`${API_BASE_URL}/subjects/${schoolId}`),
        fetch(`${API_BASE_URL}/class/${schoolId}/classes`)
      ]);
      const sData = await sRes.json();
      const cData = await cRes.json();
      setSubjects(sData.data || sData.subjects || []);
      setClasses((cData.data || cData.classes || []).map(c => c.name || c.className || c));
    } catch { showToast('error', 'Failed to load data'); }
    finally { setLoading(false); }
  };

  const addSubject = async () => {
    if (!newSubject.subjectName || !newSubject.className) return;
    try {
      await fetch(`${API_BASE_URL}/subjects/${schoolId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newSubject, subjectFees: parseFloat(newSubject.subjectFees) || 0 })
      });
      showToast('success', 'Subject added');
      setShowAdd(false);
      setNewSubject({ subjectName: '', className: '', subjectFees: '' });
      loadData();
    } catch { showToast('error', 'Failed to add subject'); }
  };

  const deleteSubject = async (id) => {
    try {
      await fetch(`${API_BASE_URL}/subjects/${schoolId}/${id}`, { method: 'DELETE' });
      setSubjects(prev => prev.filter(s => (s.id || s.subjectId) !== id));
      showToast('success', 'Subject deleted');
    } catch { showToast('error', 'Delete failed'); }
  };

  useEffect(() => { loadData(); }, [schoolId]);

  const filtered = subjects.filter(s => {
    const name = (s.subjectName || s.subject_name || s.name || '').toLowerCase();
    const cls = s.className || s.class_name || '';
    return name.includes(search.toLowerCase()) && (filterClass === 'All' || cls === filterClass);
  });

  const uniqueClasses = ['All', ...new Set(subjects.map(s => s.className || s.class_name || '').filter(Boolean))];

  return (
    <div className="min-h-full">
      <div className="page-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center">
            <BookOpen size={18} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Subject Management</h1>
            <p className="text-xs text-slate-500">{subjects.length} subjects</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} className="btn-secondary p-2"><RefreshCw size={15} /></button>
          <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={15} /> Add Subject</button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className="input-dark pl-9" placeholder="Search subjects..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input-dark sm:w-44" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
            {uniqueClasses.map(c => <option key={c} value={c}>{c === 'All' ? 'All Classes' : c}</option>)}
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader size={28} className="animate-spin text-indigo-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14">
            <BookOpen size={36} className="text-slate-600 mx-auto mb-2" />
            <p className="text-slate-500">No subjects found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((s, i) => {
              const id = s.id || s.subjectId || s.subject_id;
              const name = s.subjectName || s.subject_name || s.name;
              const cls = s.className || s.class_name || 'N/A';
              const fees = s.subjectFees ?? s.subject_fees ?? s.fees;

              return (
                <motion.div
                  key={id || i}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="glass-card p-5 hover-card flex flex-col"
                >
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-violet-500/30 flex items-center justify-center mb-3">
                    <BookOpen size={17} className="text-indigo-400" />
                  </div>
                  <h3 className="font-bold text-white text-sm mb-1 leading-snug">{name}</h3>
                  <span className="badge bg-blue-500/10 border-blue-500/20 text-blue-400 mb-2 self-start">{cls}</span>
                  {fees != null && (
                    <p className="text-xs text-slate-400 mb-3">
                      <span className="text-emerald-400 font-semibold">₹{Number(fees).toLocaleString('en-IN')}</span> / year
                    </p>
                  )}
                  <div className="mt-auto pt-3 border-t border-white/5">
                    <button
                      onClick={() => deleteSubject(id)}
                      className="btn-danger w-full justify-center text-xs py-1.5"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>
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
                <h3 className="font-bold text-white">Add New Subject</h3>
                <button onClick={() => setShowAdd(false)} className="text-slate-500 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-all"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="section-label">Subject Name</label>
                  <input className="input-dark" placeholder="e.g. Mathematics" value={newSubject.subjectName} onChange={e => setNewSubject(p => ({ ...p, subjectName: e.target.value }))} />
                </div>
                <div>
                  <label className="section-label">Class</label>
                  <select className="input-dark" value={newSubject.className} onChange={e => setNewSubject(p => ({ ...p, className: e.target.value }))}>
                    <option value="">Select Class</option>
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="section-label">Annual Fees (₹)</label>
                  <input type="number" className="input-dark" placeholder="0" value={newSubject.subjectFees} onChange={e => setNewSubject(p => ({ ...p, subjectFees: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
                <button onClick={addSubject} className="btn-primary">Add Subject</button>
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