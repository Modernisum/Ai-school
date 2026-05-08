import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, Plus, Trash2, Trash, Settings, RefreshCw, Loader, AlertTriangle, Eye, CheckCircle, Database, X
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { getSchoolIdFromStorage } from '../../../utils/api';
import { academicApi } from '../api/academicApi';
import GlassCard from '../../../components/ui/GlassCard';
import FormWidget from '../../../components/ui/FormWidget';
import DropdownWidget from '../../../components/ui/DropdownWidget';
import StandardButton from '../../../components/ui/StandardButton';

const { useGetClassesQuery } = academicApi;
const API = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8080/api`;
const getSchoolId = () => getSchoolIdFromStorage() || "";

const DAYS_MAP = {
  1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday'
};

export default function TimetableGenerator() {
  const { control, handleSubmit, reset } = useForm({
    defaultValues: {
      className: '',
      periodsPerDay: 8,
      season: 'SUMMER',
      startTime: '09:00',
      periodDuration: 40,
      breakDuration: 30
    }
  });
  const [activeTab, setActiveTab] = useState('list'); 
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
            <tr className="bg-white/5 text-slate-500">
              <th className="px-4 py-2 border-b border-white/10 font-bold uppercase tracking-wider text-micro">DAY/PER</th>
              {Array.from({ length: periods }).map((_, i) => (
                <th key={i} className="px-4 py-2 border-b border-white/10 font-bold uppercase tracking-wider text-micro text-center">P{i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map(dayNum => (
              <tr key={dayNum} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors">
                <td className="px-4 py-2 border-r border-white/5 font-black text-slate-600 bg-white/[0.02] text-micro uppercase tracking-widest">
                  {DAYS_MAP[dayNum]?.substring(0, 3) || `DAY ${dayNum}`}
                </td>
                {Array.from({ length: periods }).map((_, p) => {
                  const periodNum = p + 1;
                  const slot = slots.find(s => s.day_of_week === dayNum && s.period_number === periodNum);
                  return (
                    <td key={periodNum} className="px-2 py-1 border-r border-white/5 text-center min-w-[100px] align-middle">
                      {slot ? (
                        <div className="bg-primary/5 border border-primary/10 rounded-lg p-1.5 flex flex-col justify-center items-center">
                          <span className="font-black text-primary text-micro uppercase tracking-wider truncate max-w-full leading-none">{slot.subject}</span>
                          <span className="text-micro font-bold text-slate-700 mt-0.5 truncate max-w-full opacity-80 leading-none">{slot.teacher_name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-900 text-micro font-black uppercase tracking-widest opacity-20">---</span>
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
    <div className="max-w-full p-1 space-y-2 text-slate-400">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg">
                  <Calendar size={18} className="text-primary" />
              </div>
              <div>
                  <h1 className="text-sm font-black text-white tracking-tight uppercase italic">TIMETABLE_ENGINE</h1>
                  <p className="text-micro font-medium text-slate-600 uppercase tracking-[0.2em] mt-0.5">Automated scheduling hub</p>
              </div>
          </div>
          <StandardButton
            onClick={() => setShowGenerateModal(true)}
            icon={Settings}
            size="xs"
          >
            GENERATE_TABLE
          </StandardButton>
      </div>

      {error && (
        <div className="p-4 bg-accent/10 border border-accent/20 rounded-xl text-accent flex items-center gap-3 mb-6 animate-pulse">
          <AlertTriangle size={18} /> {error}
          <button onClick={() => setError(null)} className="ml-auto hover:text-accent"><X size={16} /></button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-success/10 border border-success/20 rounded-xl text-success flex items-center gap-3 mb-6">
          <CheckCircle size={18} /> {success}
        </div>
      )}

      {/* List */}
      <GlassCard className="p-0 overflow-hidden border border-white/5" dense>
        {loading ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <Loader className="animate-spin text-primary" size={32} />
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Accessing Database...</p>
          </div>
        ) : timetables.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Database size={48} className="mx-auto mb-4 opacity-10" />
            <p className="text-lg font-bold text-slate-400 mb-1">No Timetables Found</p>
            <p className="text-sm">Click "Generate Timetable" to build a new schedule.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/5">
                  <th className="px-4 py-2 font-bold uppercase tracking-wider text-micro text-slate-600">CLUSTER</th>
                  <th className="px-4 py-2 font-bold uppercase tracking-wider text-micro text-slate-600">STATUS</th>
                  <th className="px-4 py-2 font-bold uppercase tracking-wider text-micro text-slate-600">SEASON</th>
                  <th className="px-4 py-2 font-bold uppercase tracking-wider text-micro text-slate-600">GEN_DATE</th>
                  <th className="px-4 py-2 font-bold uppercase tracking-wider text-micro text-slate-600 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {timetables.map((t, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-all group">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center text-primary border border-primary/20 text-micro font-black">
                          {t.class_name?.[0]?.toUpperCase() || 'C'}
                        </div>
                        <span className="font-bold text-white tracking-tight text-micro uppercase italic">{t.class_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-micro font-black uppercase tracking-wider border ${
                        t.status === 'APPROVED' ? 'bg-success/10 text-success border-success/20' : 'bg-primary/10 text-primary border-primary/20'
                      }`}>
                        {t.status || 'PROPOSAL'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-micro font-medium text-slate-600 capitalize bg-white/5 px-1.5 py-0.5 rounded border border-white/5">{t.season || 'N/A'}</span>
                    </td>
                    <td className="px-4 py-2 text-micro font-medium text-slate-700">{new Date(t.created_at || Date.now()).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {t.status !== 'APPROVED' && (
                          <StandardButton
                            variant="success"
                            size="xs"
                            onClick={() => approveTimetable(t.config_id)}
                            icon={CheckCircle}
                          />
                        )}
                        <StandardButton
                          variant="primary"
                          size="xs"
                          onClick={() => viewTimetable(t)}
                          icon={Eye}
                        />
                        <StandardButton
                          variant="ghost"
                          size="xs"
                          onClick={() => handleDelete(t.config_id)}
                          icon={Trash}
                          className="text-rose-500"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <AnimatePresence>
        {showGenerateModal && (
          <div className="fixed inset-0 flex justify-end" style={{ zIndex: 9999 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowGenerateModal(false)} />
            
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} 
              className="relative w-full max-w-xl bg-slate-900 h-full shadow-2xl overflow-y-auto border-l border-white/10 flex flex-col">
              
              <div className="p-6 border-b border-white/10 bg-slate-800/50 sticky top-0 z-10 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Settings data-lucide="settings" className="text-primary" size={20} /> Configure Engine
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Define requirements and constraints</p>
                </div>
                <button onClick={() => setShowGenerateModal(false)} className="text-slate-400 hover:text-white p-2 hover:bg-white/5 rounded-lg"><X size={20} /></button>
              </div>

              <div className="p-6 flex-1 space-y-8">
                
                {/* FormWidget for Core Settings */}
                <GlassCard className="p-0 overflow-hidden border border-white/5" dense>
                  <FormWidget
                    title="CORE_PARAMS"
                    sections={[{
                      fields: [
                        { 
                          name: 'className', 
                          label: 'Cluster', 
                          type: 'select', 
                          options: [
                            { label: 'Select...', value: '' },
                            ...classes.map(c => ({ label: c, value: c }))
                          ], 
                          required: true,
                          onChange: (val) => setForm(f => ({ ...f, className: val }))
                        },
                        { 
                          name: 'periodsPerDay', 
                          label: 'Periods/Day', 
                          type: 'number', 
                          min: 1, 
                          max: 15, 
                          required: true,
                          onChange: (val) => setForm(f => ({ ...f, periodsPerDay: parseInt(val) }))
                        },
                      ]
                    },
                    {
                      fields: [
                        { 
                          name: 'season', 
                          label: 'Season', 
                          type: 'select', 
                          options: [
                            { label: 'Summer', value: 'SUMMER' },
                            { label: 'Winter', value: 'WINTER' }
                          ], 
                          required: true,
                          onChange: (val) => setForm(f => ({ ...f, season: val }))
                        },
                        { 
                          name: 'startTime', 
                          label: 'Start', 
                          type: 'time', 
                          required: true,
                          onChange: (val) => setForm(f => ({ ...f, startTime: val }))
                        },
                        { 
                          name: 'periodDuration', 
                          label: 'Period (M)', 
                          type: 'number', 
                          required: true,
                          onChange: (val) => setForm(f => ({ ...f, periodDuration: parseInt(val) }))
                        },
                        { 
                          name: 'breakDuration', 
                          label: 'Break (M)', 
                          type: 'number', 
                          required: true,
                          onChange: (val) => setForm(f => ({ ...f, breakDuration: parseInt(val) }))
                        }
                      ]
                    }]}
                    control={control}
                    showActions={false}
                    dense
                  />
                </GlassCard>

                {/* Requirements (Manual for flexibility) */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-micro font-black text-slate-700 uppercase tracking-[0.2em]">ALLOCATIONS</label>
                    <button 
                      onClick={addRequirement} 
                      className="px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-micro font-black uppercase tracking-widest flex items-center gap-1 transition-all"
                    >
                      <Plus size={10} /> ADD_ALL
                    </button>
                  </div>
                  
                  <div className="space-y-1.5">
                    {form.requirements.map((req, idx) => (
                      <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-xl p-2 relative group hover:border-white/10 transition-all shadow-inner">
                        <button 
                          onClick={() => removeRequirement(idx)} 
                          className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-accent/20 text-accent border border-accent/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-accent hover:text-white"
                        >
                          <Trash size={10} />
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                          <div className="md:col-span-12 lg:col-span-5">
                            <label className="text-micro font-black text-slate-700 uppercase mb-0.5 block tracking-widest flex items-center gap-1">Subject</label>
                            <input 
                              placeholder="e.g. Mathematics" 
                              value={req.subject} 
                              onChange={e => updateRequirement(idx, 'subject', e.target.value)}
                              className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-2 py-1 text-micro text-white focus:outline-none focus:border-primary transition-all placeholder:text-slate-800 font-medium" 
                            />
                          </div>
                          <div className="md:col-span-6 lg:col-span-4">
                            <label className="text-micro font-black text-slate-700 uppercase mb-0.5 block tracking-widest">Teacher</label>
                            <input 
                              placeholder="Name" 
                              value={req.teacher_name} 
                              onChange={e => updateRequirement(idx, 'teacher_name', e.target.value)}
                              className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-2 py-1 text-micro text-white focus:outline-none focus:border-primary transition-all placeholder:text-slate-800 font-medium" 
                            />
                          </div>
                          <div className="md:col-span-6 lg:col-span-3">
                            <label className="text-micro font-black text-slate-700 uppercase mb-0.5 block tracking-widest">Per/wk</label>
                            <input 
                              type="number" 
                              min="1" 
                              value={req.required_periods} 
                              onChange={e => updateRequirement(idx, 'required_periods', e.target.value)}
                              className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-2 py-1 text-micro text-white focus:outline-none focus:border-primary transition-all font-medium" 
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Action Bar */}
              <div className="p-6 border-t border-white/10 bg-slate-900 sticky bottom-0 z-10 flex gap-4">
                <StandardButton 
                  variant="ghost"
                  onClick={() => setShowGenerateModal(false)} 
                  className="flex-1"
                >
                  Cancel
                </StandardButton>
                <StandardButton
                  variant="primary"
                  onClick={handleGenerate} 
                  disabled={generating}
                  isLoading={generating}
                  icon={Settings}
                  className="flex-[2]"
                >
                  Compile Timetable
                </StandardButton>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Viewer Modal */}
      <AnimatePresence>
        {viewingTimetable && (
          <div className="fixed inset-0 z-50 flex justify-center items-center py-10 px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setViewingTimetable(null)} />
            <motion.div initial={{ scale: 0.98, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.98, opacity: 0, y: 10 }} 
              className="relative w-full max-w-7xl bg-slate-900 rounded-2xl shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[95vh]">
              
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-800/50 backdrop-blur-xl">
                <div>
                  <h2 className="text-sm font-black text-white tracking-tight uppercase italic">SYSTEM_PROPOSAL: {viewingTimetable.class_name}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-micro font-black text-primary px-1.5 py-0.5 bg-primary/10 border border-primary/20 rounded uppercase tracking-widest">ID: {viewingTimetable.config_id}</span>
                    <span className="text-micro font-black text-slate-600 uppercase tracking-widest flex items-center gap-1">
                      <Clock size={10} /> {viewingTimetable.season} | {viewingTimetable.start_time} - {viewingTimetable.end_time}
                    </span>
                  </div>
                </div>
                <button onClick={() => setViewingTimetable(null)} className="p-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-slate-500 hover:text-white transition-all">
                  <X size={18} />
                </button>
              </div>
              
              <div className="flex-1 overflow-auto bg-slate-950/50 p-2">
                {renderTimetableGrid()}
              </div>

              <div className="p-3 bg-slate-900/80 border-t border-white/10 flex justify-between items-center">
                <p className="text-micro text-slate-700 font-medium italic">VIDHYAM_AI_SCHEDULER_V2.4</p>
                <div className="flex gap-2">
                   <StandardButton 
                    variant="ghost" 
                    size="xs"
                    onClick={() => setViewingTimetable(null)}
                   >
                     CLOSE
                   </StandardButton>
                   <StandardButton 
                    variant="success"
                    size="xs"
                    onClick={() => { approveTimetable(viewingTimetable.config_id); setViewingTimetable(null); }}
                    className="px-4"
                   >
                     APPROVE_PROPOSAL
                   </StandardButton>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
