import React, { useState, useEffect } from 'react';
import { getSchoolIdFromStorage } from '../../../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, Plus, Trash2, Trash, Settings, RefreshCw, Loader, AlertTriangle, Eye, CheckCircle, Database
} from 'lucide-react';
import { academicApi } from '../api/academicApi';
const { useGetClassesQuery } = academicApi;

const API = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8080/api`;
const getSchoolId = () => getSchoolIdFromStorage() || "";

const DAYS_MAP = {
  1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday'
};

export default function TimetableGeneratorPage() {
  const schoolId = getSchoolId();
  const [timetables, setTimetables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [viewingTimetable, setViewingTimetable] = useState(null);

  // Form State
  const [form, setForm] = useState({
    className: '',
    periodsPerDay: 8,
    workingDays: [1, 2, 3, 4, 5],
    season: 'SUMMER',
    startTime: '09:00',
    endTime: '14:00',
    periodDuration: 40,
    breakDuration: 10,
    requirements: [
      { subject: '', teacher_name: '', required_periods: 5, preferred_slots: [] }
    ]
  });

  const [classes, setClasses] = useState([]);

  useEffect(() => {
    if (schoolId) fetchTimetables();
  }, [schoolId]);

  // Load classes using RTK Query
  const { data: classData = [] } = useGetClassesQuery(schoolId, { skip: !schoolId });

  useEffect(() => {
    if (classData.length > 0) {
      setClasses(classData.map(c => c.name || c.className || (typeof c === 'string' ? c : '')));
    }
  }, [classData]);

  const fetchTimetables = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const headers = { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };
      const res = await fetch(`${API}/school/${schoolId}/timetable`, { headers });
      const data = await res.json();
      if (data.success) {
        setTimetables(Array.isArray(data.data) ? data.data : []);
      } else {
        setError(data.message || 'Failed to load timetables');
      }
    } catch (e) {
      setError('Network error while loading timetables');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (configId) => {
    if (!window.confirm('Delete this timetable?')) return;
    try {
      const token = localStorage.getItem('accessToken');
      const headers = { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };
      const res = await fetch(`${API}/school/${schoolId}/timetable/${configId}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (data.success) {
        fetchTimetables();
        setSuccess('Timetable deleted');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (e) {
      setError('Failed to delete timetable');
    }
  };

  const addRequirement = () => {
    setForm(f => ({
      ...f,
      requirements: [...f.requirements, { subject: '', teacher_name: '', required_periods: 5, preferred_slots: [] }]
    }));
  };

  const updateRequirement = (index, field, value) => {
    const nextReqs = [...form.requirements];
    if (field === 'required_periods') value = parseInt(value, 10) || 1;
    nextReqs[index] = { ...nextReqs[index], [field]: value };
    setForm(f => ({ ...f, requirements: nextReqs }));
  };

  const removeRequirement = (index) => {
    setForm(f => ({
      ...f,
      requirements: f.requirements.filter((_, i) => i !== index)
    }));
  };

  const handleGenerate = async () => {
    if (!form.className) {
      setError('Please select a class');
      return;
    }
    const reqs = form.requirements.filter(r => r.subject && r.teacher_name);
    if (reqs.length === 0) {
      setError('Add at least one complete subject requirement.');
      return;
    }

    setGenerating(true);
    setError(null);

    const payload = {
      class_id: form.className,
      class_name: form.className,
      periods_per_day: parseInt(form.periodsPerDay, 10),
      working_days: form.workingDays,
      requirements: reqs.map(r => ({
        subject: r.subject,
        teacher_id: r.teacher_name.toLowerCase().replace(/\s/g, '_'),
        teacher_name: r.teacher_name,
        required_periods: r.required_periods,
        preferred_slots: r.preferred_slots
      })),
      season: form.season,
      start_time: form.startTime,
      end_time: form.endTime,
      period_duration_minutes: parseInt(form.periodDuration, 10),
      break_duration_minutes: parseInt(form.breakDuration, 10)
    };

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`${API}/school/${schoolId}/timetable/generate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setSuccess(`Successfully generated timetable with ${data.conflicts?.length || 0} conflicts.`);
        setShowGenerateModal(false);
        fetchTimetables();
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError(data.message || 'Engine failed to generate timetable');
      }
    } catch (e) {
      setError('AI Engine generation failed. Please check network.');
    } finally {
      setGenerating(false);
    }
  };

  const approveTimetable = async (configId) => {
    try {
      const token = localStorage.getItem('accessToken');
      const headers = { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}) 
      };
      const res = await fetch(`${API}/school/${schoolId}/timetable/${configId}/approve`, { 
        method: 'POST', 
        headers 
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Timetable approved and users notified!');
        fetchTimetables();
        setTimeout(() => setSuccess(null), 5000);
      }
    } catch (e) {
      setError('Approve failed');
    }
  };

  const viewTimetable = async (config) => {
    try {
      const token = localStorage.getItem('accessToken');
      const headers = { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };
      const res = await fetch(`${API}/school/${schoolId}/timetable/${config.config_id}`, { headers });
      const data = await res.json();
      if (data.success) {
        setViewingTimetable(data.data);
      }
    } catch (e) {
      setError('Could not fetch timetable metadata.');
    }
  };

  // Build grid for viewer
  const renderTimetableGrid = () => {
    if (!viewingTimetable) return null;

    const days = Array.isArray(viewingTimetable.working_days) ? viewingTimetable.working_days : [1, 2, 3, 4, 5];
    const periods = parseInt(viewingTimetable.periods_per_day, 10) || 8;
    const slots = Array.isArray(viewingTimetable.slots) ? viewingTimetable.slots : [];

    return (
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-white/5 text-slate-300">
              <th className="px-4 py-3 border-b border-r border-white/10 font-semibold">Day / Period</th>
              {Array.from({ length: periods }).map((_, i) => (
                <th key={i} className="px-4 py-3 border-b border-r border-white/10 font-semibold text-center">Period {i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map(dayNum => (
              <tr key={dayNum} className="border-b border-white/5">
                <td className="px-4 py-3 border-r border-white/5 font-medium text-slate-300 bg-white/[0.02]">
                  {DAYS_MAP[dayNum] || `Day ${dayNum}`}
                </td>
                {Array.from({ length: periods }).map((_, p) => {
                  const periodNum = p + 1;
                  const slot = slots.find(s => s.day_of_week === dayNum && s.period_number === periodNum);
                  return (
                    <td key={periodNum} className="px-4 py-2 border-r border-white/5 text-center min-w-[120px] align-middle">
                      {slot ? (
                        <div className="bg-primary/10 border border-primary/20 rounded p-1.5 flex flex-col justify-center items-center">
                          <span className="font-bold text-primary text-xs">{slot.subject}</span>
                          <span className="text-[10px] text-slate-400 mt-1 truncate max-w-full">{slot.teacher_name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600 text-[10px] italic">Free</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-full page-bg text-slate-300">
      <div className="container mx-auto p-6 max-w-[1600px]">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg">
                  <Calendar size={24} className="text-primary" />
              </div>
              <div>
                  <h1 className="text-2xl font-black text-white tracking-tight">AI Timetable Generator</h1>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-[0.2em] mt-1">Automated period scheduling engine</p>
              </div>
          </div>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold hover:brightness-110 shadow-lg shadow-primary/20 transition-all duration-300 active:scale-95"
          >
            <Settings size={18} /> Generate Timetable
          </button>
      </div>

      {error && (
        <div className="p-4 bg-accent/10 border border-accent/20 rounded-xl text-accent flex items-center gap-3">
          <AlertTriangle size={18} /> {error}
          <button onClick={() => setError(null)} className="ml-auto hover:text-accent"><Trash2 size={14} /></button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-success/10 border border-success/20 rounded-xl text-success flex items-center gap-3">
          <CheckCircle size={18} /> {success}
        </div>
      )}

      {/* List */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center"><Loader className="animate-spin text-primary" size={30} /></div>
        ) : timetables.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Database size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-lg font-medium text-slate-400 mb-1">No Timetables Found</p>
            <p className="text-sm">Click "Generate Timetable" to build a new schedule.</p>
          </div>
        ) : (
          <table className="dark-table">
            <thead>
              <tr>
                <th className="px-6 py-4">Class</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Season</th>
                <th className="px-6 py-4">Created At</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {timetables.map((t, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4 font-bold text-white">{t.class_name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                      t.status === 'APPROVED' ? 'bg-success/20 text-success' : 'bg-primary/20 text-primary'
                    }`}>
                      {t.status || 'PROPOSAL'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 capitalize">{t.season || 'N/A'}</td>
                  <td className="px-6 py-4 text-slate-400">{new Date(t.created_at || Date.now()).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    {t.status !== 'APPROVED' && (
                      <button
                        onClick={() => approveTimetable(t.config_id)}
                        className="p-2 text-success hover:bg-success/10 rounded-lg transition-colors mr-2"
                        title="Approve & Notify"
                      ><CheckCircle size={16} /></button>
                    )}
                    <button
                      onClick={() => viewTimetable(t)}
                      className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors mr-2"
                      title="View Table"
                    ><Eye size={16} /></button>
                    <button
                      onClick={() => handleDelete(t.config_id)}
                      className="p-2 text-accent hover:bg-accent/10 rounded-lg transition-colors"
                      title="Delete"
                    ><Trash size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal / Slider for generation */}
      <AnimatePresence>
        {showGenerateModal && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowGenerateModal(false)} />
            
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} 
              className="relative w-full max-w-xl bg-slate-900 h-full shadow-2xl overflow-y-auto border-l border-white/10 flex flex-col">
              
              <div className="p-6 border-b border-white/10 bg-slate-800/50 sticky top-0 z-10 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Settings className="text-primary" /> Configure Engine
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Define requirements and constraints</p>
                </div>
                <button onClick={() => setShowGenerateModal(false)} className="text-slate-400 hover:text-white p-2 hover:bg-white/5 rounded-lg"><Trash2 size={18} /></button>
              </div>

              <div className="p-6 flex-1 space-y-6">
                
                {/* Basic Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Class Parameter</label>
                    <select className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary"
                      value={form.className} onChange={e => setForm(f => ({ ...f, className: e.target.value }))}>
                      <option value="">Select Class...</option>
                      {classes.map((c, i) => <option key={i} value={c}>{c}</option>)}
                      {classes.length === 0 && <option value="Class 10-A">Class 10-A (Dummy)</option>}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Periods / Day</label>
                    <input type="number" className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary"
                      value={form.periodsPerDay} min="1" max="15" onChange={e => setForm(f => ({ ...f, periodsPerDay: e.target.value }))} />
                  </div>
                </div>

                {/* Timing Settings */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                    <Clock size={14} className="text-primary" /> Timing & Season
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Season</label>
                      <select className="w-full bg-slate-900 border border-white/5 rounded-lg px-3 py-2 text-sm text-white" 
                        value={form.season} onChange={e => setForm(f => ({ ...f, season: e.target.value }))}>
                        <option value="SUMMER">Summer</option>
                        <option value="WINTER">Winter</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Start Time</label>
                      <input type="time" className="w-full bg-slate-900 border border-white/5 rounded-lg px-3 py-2 text-sm text-white"
                        value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Period Duration (min)</label>
                      <input type="number" className="w-full bg-slate-900 border border-white/5 rounded-lg px-3 py-2 text-sm text-white"
                        value={form.periodDuration} onChange={e => setForm(f => ({ ...f, periodDuration: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Break Duration (min)</label>
                      <input type="number" className="w-full bg-slate-900 border border-white/5 rounded-lg px-3 py-2 text-sm text-white"
                        value={form.breakDuration} onChange={e => setForm(f => ({ ...f, breakDuration: e.target.value }))} />
                    </div>
                  </div>
                </div>

                {/* Requirements */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Subject & Teacher Allocations</label>
                    <button onClick={addRequirement} className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 flex items-center gap-1">
                      <Plus size={12} /> Add Subject
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {form.requirements.map((req, idx) => (
                      <div key={idx} className="bg-slate-800/50 border border-white/5 rounded-xl p-4 relative group">
                        <button onClick={() => removeRequirement(idx)} className="absolute -top-2 -right-2 w-6 h-6 bg-accent/20 text-accent rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash size={12} />
                        </button>
                        <div className="grid grid-cols-3 gap-3">
                          <input placeholder="Subject (e.g. Math)" value={req.subject} onChange={e => updateRequirement(idx, 'subject', e.target.value)}
                            className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-primary" />
                          <input placeholder="Teacher Name" value={req.teacher_name} onChange={e => updateRequirement(idx, 'teacher_name', e.target.value)}
                            className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-primary" />
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 whitespace-nowrap">Periods/wk</span>
                            <input type="number" min="1" value={req.required_periods} onChange={e => updateRequirement(idx, 'required_periods', e.target.value)}
                              className="bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-primary" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Action Bar */}
              <div className="p-6 border-t border-white/10 bg-slate-900 sticky bottom-0 z-10 flex gap-3">
                <button onClick={() => setShowGenerateModal(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleGenerate} disabled={generating}
                  className="flex-1 py-3 bg-primary hover:brightness-110 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {generating ? <Loader className="animate-spin" size={18} /> : <Settings size={18} />}
                  {generating ? 'Processing Engine...' : 'Run Generator'}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Viewer Modal */}
      <AnimatePresence>
        {viewingTimetable && (
          <div className="fixed inset-0 z-50 flex justify-center items-center py-10 px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setViewingTimetable(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="relative w-full max-w-5xl bg-slate-900 rounded-2xl shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-full">
              
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-slate-800/50">
                <div>
                  <h2 className="text-xl font-bold text-white">Timetable: {viewingTimetable.class_name}</h2>
                  <p className="text-xs text-primary mt-1 font-mono">Config ID: {viewingTimetable.config_id}</p>
                </div>
                <button onClick={() => setViewingTimetable(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
              
              <div className="p-1 overflow-auto bg-slate-950 flex-1">
                {renderTimetableGrid()}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      </div>
    </div>
  );
}
