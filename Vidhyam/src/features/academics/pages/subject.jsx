import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Plus, Search, Loader, X, CheckCircle,
  AlertTriangle, Users, DollarSign, School, RefreshCw, Trash2, Eye,
  Calendar, Clock, Layers, Star
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { getSchoolIdFromStorage } from '../../../utils/api';
import {
  useGetSubjectsQuery,
  useAddSubjectMutation,
  useDeleteSubjectMutation
} from '../api/academicApi';
import { getClassesByLevel } from '../../../utils/academicUtils';

export default function SubjectManagement() {
  const location = useLocation();
  const schoolId = getSchoolIdFromStorage() || "622079";
  const schoolLevel = localStorage.getItem('schoolLevel') || 10;

  const { data: subjects = [], isLoading: loadingSubjects, refetch: refetchSubjects } = useGetSubjectsQuery(schoolId);
  const classes = getClassesByLevel(schoolLevel);

  const loading = loadingSubjects;

  const [addSubjectMutation] = useAddSubjectMutation();
  const [deleteSubjectMutation] = useDeleteSubjectMutation();
  const [toast, setToast] = useState(null);
  const [showAdd, setShowAdd] = useState(new URLSearchParams(location.search).get('add') === '1');

  const [newSubject, setNewSubject] = useState({
    subjectName: '',
    className: '',
    subjectFees: '',
    isCompulsory: true,
    category: '',
    feeType: 'monthly',
    feeInterval: 1,
    scheduleType: 'daily',
    scheduleData: []
  });

  // Sync showAdd with URL search params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('add') === '1') {
      setShowAdd(true);
    } else if (params.get('add') === null && showAdd && !params.toString().includes('add=')) {
      setShowAdd(false);
    }
  }, [location.search]);

  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('All');

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); };

  const loadData = () => {
    refetchSubjects();
  };

  const addSubject = async () => {
    if (!newSubject.subjectName || !newSubject.className) return;
    try {
      await addSubjectMutation({
        schoolId,
        ...newSubject,
        subjectFees: parseFloat(newSubject.subjectFees) || 0
      }).unwrap();
      showToast('success', 'Subject added');
      setShowAdd(false);
      setNewSubject({
        subjectName: '', className: '', subjectFees: '',
        isCompulsory: true, category: '', feeType: 'monthly',
        feeInterval: 1, scheduleType: 'daily', scheduleData: []
      });
    } catch { showToast('error', 'Failed to add subject'); }
  };

  const deleteSubject = async (id) => {
    try {
      await deleteSubjectMutation({ schoolId, subjectId: id }).unwrap();
      showToast('success', 'Subject deleted');
    } catch { showToast('error', 'Delete failed'); }
  };

  const filtered = subjects.filter(s => {
    const name = (s.subjectName || s.subject_name || s.name || '').toLowerCase();
    const cls = s.className || s.class_name || '';
    return name.includes(search.toLowerCase()) && (filterClass === 'All' || cls === filterClass);
  });

  const uniqueClassesInTable = ['All', ...new Set(subjects.map(s => s.className || s.class_name || '').filter(Boolean))];

  return (
    <div className="min-h-full">
      <div className="page-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center">
            <BookOpen size={18} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Subject Management</h1>
            <p className="text-xs text-slate-500">{subjects.length} subjects & activities</p>
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
            {uniqueClassesInTable.map(c => <option key={c} value={c}>{c === 'All' ? 'All Classes' : c}</option>)}
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
              const comp = s.isCompulsory ?? true;
              const cat = s.category || '';
              const fType = s.feeType || 'monthly';
              const fInt = s.feeInterval || 1;
              const sType = s.scheduleType || 'daily';

              return (
                <motion.div
                  key={id || i}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="glass-card p-5 hover-card flex flex-col group relative"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-violet-500/30 flex items-center justify-center">
                      <BookOpen size={17} className="text-indigo-400" />
                    </div>
                    {comp && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                        <Star size={10} /> Compulsory
                      </div>
                    )}
                  </div>

                  <h3 className="font-bold text-white text-sm mb-1 leading-snug">{name}</h3>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="badge bg-blue-500/10 border-blue-500/20 text-blue-400 text-[10px]">{cls}</span>
                    {cat && <span className="badge bg-violet-500/10 border-violet-500/20 text-violet-400 text-[10px]">{cat}</span>}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <DollarSign size={12} className="text-emerald-400" />
                      <span>₹{Number(fees).toLocaleString('en-IN')} / {fInt > 1 ? `${fInt} ${fType}` : fType}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <Calendar size={12} className="text-indigo-400" />
                      <span className="capitalize">{sType} Schedule</span>
                    </div>
                  </div>

                  <div className="mt-auto pt-3 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
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
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="modal-box max-w-lg" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-white">Add New Subject / Activity</h3>
                <button onClick={() => setShowAdd(false)} className="text-slate-500 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-all"><X size={18} /></button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="section-label text-xs mb-1.5 flex items-center gap-2">
                    <BookOpen size={13} className="text-indigo-400" /> Subject/Activity Name
                  </label>
                  <input className="input-dark" placeholder="e.g. Mathematics" value={newSubject.subjectName} onChange={e => setNewSubject(p => ({ ...p, subjectName: e.target.value }))} />
                </div>

                <div>
                  <label className="section-label text-xs mb-1.5 flex items-center gap-2">
                    <School size={13} className="text-indigo-400" /> Target Class
                  </label>
                  <select className="input-dark text-sm" value={newSubject.className} onChange={e => setNewSubject(p => ({ ...p, className: e.target.value }))}>
                    <option value="">Select Class</option>
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="section-label text-xs mb-1.5 flex items-center gap-2">
                    <Layers size={13} className="text-indigo-400" /> Category (Optional)
                  </label>
                  <input className="input-dark text-sm" placeholder="e.g. Science / Section A" value={newSubject.category} onChange={e => setNewSubject(p => ({ ...p, category: e.target.value }))} />
                </div>

                <div className="col-span-2 py-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative inline-flex items-center">
                      <input type="checkbox" className="sr-only peer" checked={newSubject.isCompulsory} onChange={e => setNewSubject(p => ({ ...p, isCompulsory: e.target.checked }))} />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                    </div>
                    <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">Is Compulsory Subject</span>
                  </label>
                </div>

                <div className="col-span-2 flex items-center gap-2 pt-2 pb-1">
                  <DollarSign size={14} className="text-emerald-400" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Fee Structure</span>
                </div>

                <div>
                  <label className="section-label text-xs mb-1.5">Amount (₹)</label>
                  <input type="number" className="input-dark text-sm" placeholder="0" value={newSubject.subjectFees} onChange={e => setNewSubject(p => ({ ...p, subjectFees: e.target.value }))} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="section-label text-xs mb-1.5">Interval</label>
                    <input type="number" className="input-dark text-sm" value={newSubject.feeInterval} onChange={e => setNewSubject(p => ({ ...p, feeInterval: parseInt(e.target.value) || 1 }))} />
                  </div>
                  <div>
                    <label className="section-label text-xs mb-1.5">Frequency</label>
                    <select className="input-dark text-sm" value={newSubject.feeType} onChange={e => setNewSubject(p => ({ ...p, feeType: e.target.value }))}>
                      <option value="monthly">Monthly</option>
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                      <option value="months">Months</option>
                      <option value="years">Years</option>
                    </select>
                  </div>
                </div>

                <div className="col-span-2 flex items-center gap-2 pt-2 pb-1">
                  <Calendar size={14} className="text-indigo-400" />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Schedule Settings</span>
                </div>

                <div className="col-span-2">
                  <select className="input-dark text-sm" value={newSubject.scheduleType} onChange={e => setNewSubject(p => ({ ...p, scheduleType: e.target.value }))}>
                    <option value="daily">Daily (Monday to Saturday)</option>
                    <option value="weekly">Selected Days (Weekly)</option>
                    <option value="monthly">Once a Month</option>
                    <option value="yearly">Once a Year</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-8 pt-4 border-t border-white/5">
                <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
                <button onClick={addSubject} className="btn-primary px-6">Create {newSubject.isCompulsory ? 'Subject' : 'Activity'}</button>
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