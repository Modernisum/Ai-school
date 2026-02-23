import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  School, Plus, ChevronDown, ChevronRight, Users, Clock,
  Loader, CheckCircle, AlertTriangle, X, Search, RefreshCw,
  Trash2, Edit3, Save
} from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
const getSchoolId = () => {
  const keys = ['schoolId', 'school_id', 'currentSchoolId'];
  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v && v !== 'undefined') return v;
  }
  return "622079";
};

const callApi = async (url, opts = {}) => {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

export default function ClassManagement() {
  const schoolId = getSchoolId();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [toast, setToast] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newClassName, setNewClassName] = useState('');

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); };

  const loadClasses = async () => {
    setLoading(true);
    try {
      const data = await callApi(`${API_BASE_URL}/class/${schoolId}/classes`);
      setClasses(data.data || data.classes || []);
    } catch { showToast('error', 'Failed to load classes'); }
    finally { setLoading(false); }
  };

  const addClass = async () => {
    if (!newClassName.trim()) return;
    try {
      await callApi(`${API_BASE_URL}/class/${schoolId}/classes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ className: newClassName.trim() })
      });
      showToast('success', 'Class created');
      setNewClassName(''); setShowAdd(false);
      loadClasses();
    } catch { showToast('error', 'Failed to create class'); }
  };

  const deleteClass = async (id) => {
    try {
      await fetch(`${API_BASE_URL}/class/${schoolId}/classes/${id}`, { method: 'DELETE' });
      setClasses(prev => prev.filter(c => (c.id || c.classId) !== id));
      showToast('success', 'Class deleted');
    } catch { showToast('error', 'Delete failed'); }
  };

  useEffect(() => { loadClasses(); }, [schoolId]);

  const filtered = classes.filter(c =>
    (c.className || c.class_name || c.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-full">
      <div className="page-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <School size={18} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Class Management</h1>
            <p className="text-xs text-slate-500">{classes.length} classes</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={loadClasses} className="btn-secondary p-2"><RefreshCw size={15} /></button>
          <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus size={15} /> New Class</button>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Classes', value: classes.length, color: 'text-blue-400' },
            { label: 'Total Students', value: classes.reduce((a, c) => a + (c.totalStudents || c.total_students || 0), 0), color: 'text-indigo-400' },
            { label: 'Total Periods', value: classes.reduce((a, c) => a + (c.totalPeriods || c.total_periods || 0), 0), color: 'text-violet-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass-card p-4 text-center">
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-slate-500 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input-dark pl-9" placeholder="Search classes..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Classes List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader size={28} className="animate-spin text-indigo-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14">
            <School size={36} className="text-slate-600 mx-auto mb-2" />
            <p className="text-slate-500">No classes found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((cls, i) => {
              const id = cls.id || cls.classId || cls.class_id;
              const name = cls.className || cls.class_name || cls.name;
              const students = cls.totalStudents || cls.total_students || 0;
              const teachers = cls.totalTeachers || cls.total_teachers || 0;
              const periods = cls.totalPeriods || cls.total_periods || 0;
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
                      {isOpen ? <ChevronDown size={16} className="text-indigo-400" /> : <ChevronRight size={16} className="text-slate-500" />}
                      <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center">
                        <School size={14} className="text-blue-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white text-sm">{name}</p>
                        <p className="font-mono text-xs text-slate-600">{id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:flex items-center gap-3 text-xs">
                        <span className="badge bg-indigo-500/10 border-indigo-500/20 text-indigo-400">
                          <Users size={10} className="inline mr-1" />{students}
                        </span>
                        <span className="badge bg-violet-500/10 border-violet-500/20 text-violet-400">
                          <Clock size={10} className="inline mr-1" />{periods}
                        </span>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); deleteClass(id); }}
                        className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-white/5"
                      >
                        <div className="p-4 grid grid-cols-3 gap-3">
                          {[
                            { label: 'Students', value: students, color: 'text-indigo-400' },
                            { label: 'Teachers', value: teachers, color: 'text-violet-400' },
                            { label: 'Periods', value: periods, color: 'text-blue-400' },
                          ].map(({ label, value, color }) => (
                            <div key={label} className="bg-white/5 rounded-xl p-3 text-center">
                              <p className={`font-bold ${color}`}>{value}</p>
                              <p className="text-slate-500 text-xs">{label}</p>
                            </div>
                          ))}
                        </div>
                        {cls.sections && Array.isArray(cls.sections) && cls.sections.length > 0 && (
                          <div className="px-4 pb-4">
                            <p className="section-label">Sections</p>
                            <div className="flex flex-wrap gap-2">
                              {cls.sections.map((s, idx) => (
                                <span key={idx} className="badge bg-slate-500/10 border-slate-500/20 text-slate-400">
                                  {typeof s === 'string' ? s : s.sectionName || s.name || JSON.stringify(s)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Class Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowAdd(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="modal-box"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-white">Create New Class</h3>
                <button onClick={() => setShowAdd(false)} className="text-slate-500 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-all">
                  <X size={18} />
                </button>
              </div>
              <label className="section-label">Class Name</label>
              <input
                className="input-dark mb-4"
                placeholder="e.g. Class 10, Grade 5..."
                value={newClassName}
                onChange={e => setNewClassName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addClass()}
              />
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
                <button onClick={addClass} className="btn-primary">Create Class</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-xl
              ${toast.type === 'success' ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/20 border border-rose-500/30 text-rose-300'}`}
          >
            {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}