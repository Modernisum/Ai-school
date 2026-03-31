import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { getSchoolIdFromStorage } from '../../../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { selectPollingInterval } from '../../settings/settingsSlice';
import {
  CalendarDays, Plus, Trash2, Loader, CheckCircle, AlertTriangle,
  ChevronLeft, ChevronRight, Users, GraduationCap, Shield, Info
} from 'lucide-react';
import { useLocation } from 'react-router-dom';

import {
  useGetHolidaysQuery,
  useCreateHolidayMutation,
  useDeleteHolidayMutation,
} from '../api/academicApi';

const API = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8080/api`;
const getSchoolId = () => getSchoolIdFromStorage() || "";

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function isSunday(dateStr) {
  return new Date(dateStr).getDay() === 0;
}

function dateRange(from, to) {
  const dates = [];
  let cur = new Date(from);
  const end = new Date(to);
  while (cur <= end) {
    dates.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export default function AttendancePage() {
  const location = useLocation();
  const schoolId = getSchoolId();

  // RTK Query Hooks for Holidays
  const pollingInterval = useSelector(selectPollingInterval);
  const { data: holidays = [], isLoading: isHolidaysLoading, refetch: refetchHolidays } = useGetHolidaysQuery(schoolId, {
    skip: !schoolId,
    pollingInterval
  });
  const [createHolidayApi] = useCreateHolidayMutation();
  const [deleteHolidayApi] = useDeleteHolidayMutation();

  const [classes, setClasses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(new URLSearchParams(location.search).get('mark') === '1' || new URLSearchParams(location.search).get('add') === '1');

  // Sync showForm with URL search params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('mark') === '1' || params.get('add') === '1') {
      setShowForm(true);
    } else if (params.get('mark') === null && params.get('add') === null && showForm && !params.toString().includes('mark=') && !params.toString().includes('add=')) {
      setShowForm(false);
    }
  }, [location.search]);

  // Calendar state
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  // Form state
  const defaultForm = {
    title: '',
    description: '',
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    classes: ['All'],         // ['All'] or specific class names
    allClasses: true,
    exemptEmployees: [],      // employee IDs
    exemptStudents: [],       // student IDs or class names
    showAdvanced: false,
  };
  const [form, setForm] = useState(defaultForm);

  const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };

  const fetchData = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };
      const [cRes, eRes] = await Promise.allSettled([
        fetch(`${API}/class/${schoolId}/classes`, { headers }),
        fetch(`${API}/employees/${schoolId}/employees`, { headers }),
      ]);
      if (cRes.status === 'fulfilled' && cRes.value.ok) {
        const d = await cRes.value.json(); 
        setClasses((d.data || d.classes || []).map(c => c.name || c.className || (typeof c === 'string' ? c : '')));
      }
      if (eRes.status === 'fulfilled' && eRes.value.ok) {
        const d = await eRes.value.json(); setEmployees(d.data || d.employees || []);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [schoolId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createHoliday = async () => {
    if (!form.title.trim()) return showToast('error', 'Title is required');
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        fromDate: form.fromDate,
        toDate: form.toDate || form.fromDate,
        classes: form.allClasses ? ['All'] : form.classes,
        exemptEmployees: form.exemptEmployees,
        exemptStudents: form.exemptStudents,
      };
      
      const res = await createHolidayApi({ schoolId, body: payload }).unwrap();
      
      showToast('success', 'Holiday created!');
      setForm(defaultForm);
      setShowForm(false);
    } catch (e) { 
      showToast('error', e.data?.message || e.message || 'Failed to create holiday'); 
    } finally { 
      setSaving(false); 
    }
  };

  const deleteHoliday = async (id) => {
    try {
      await deleteHolidayApi({ schoolId, holidayId: id }).unwrap();
      showToast('success', 'Holiday removed');
    } catch(e) {
      showToast('error', e.data?.message || e.message || 'Failed to remove holiday');
    }
  };

  // ── Calendar: compute holiday dates ──────────────────────────────────────
  const holidayDateSet = useMemo(() => {
    const set = new Set();
    holidays.forEach(h => {
      dateRange(h.fromDate, h.toDate || h.fromDate).forEach(d => set.add(d));
    });
    return set;
  }, [holidays]);

  const calDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isSun = new Date(dateStr).getDay() === 0;
      const isHoliday = holidayDateSet.has(dateStr) || isSun;
      const isToday = dateStr === new Date().toISOString().split('T')[0];
      cells.push({ d, dateStr, isSun, isHoliday, isToday });
    }
    return cells;
  }, [calYear, calMonth, holidayDateSet]);

  const toggleClass = (cls) => {
    if (cls === 'All') { setForm(f => ({ ...f, allClasses: true, classes: ['All'] })); return; }
    setForm(f => {
      const next = f.classes.includes(cls) ? f.classes.filter(c => c !== cls) : [...f.classes.filter(c => c !== 'All'), cls];
      return { ...f, allClasses: false, classes: next.length ? next : ['All'], ...(next.length === 0 ? { allClasses: true } : {}) };
    });
  };

  const toggleEmployee = (id) => setForm(f => ({ ...f, exemptEmployees: f.exemptEmployees.includes(id) ? f.exemptEmployees.filter(x => x !== id) : [...f.exemptEmployees, id] }));

  return (
    <div className="min-h-full page-bg text-slate-300">
      <div className="container mx-auto p-6 max-w-[1600px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg">
                    <CalendarDays size={24} className="text-accent" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight">Announcements & Holidays</h1>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-[0.2em] mt-1">Manage school holidays & events</p>
                </div>
            </div>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-slate-900 font-bold hover:brightness-110 shadow-lg shadow-accent/20 transition-all duration-300 active:scale-95">
                <Plus size={18} /> Add Holiday
            </button>
        </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6">
        {/* ── Left: Holiday List ── */}
        <div className="space-y-4">
          {/* Sunday notice */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-accent/5 border border-accent/10 text-xs text-accent/70 backdrop-blur-md">
            <div className="w-6 h-6 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                <Info size={14} className="text-accent" />
            </div>
            <span><strong className="text-accent">Sunday</strong> is automatically a holiday for everyone. No attendance can be marked on Sundays.</span>
          </div>

          {loading || isHolidaysLoading ? (
            <div className="flex items-center justify-center py-16"><Loader size={24} className="animate-spin text-accent" /></div>
          ) : holidays.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <CalendarDays size={32} className="text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No holidays created yet</p>
              <p className="text-slate-600 text-xs mt-1">Click "Add Holiday" to create one</p>
            </div>
          ) : (
            <div className="space-y-2">
              {holidays.map(h => {
                const isSingle = h.fromDate === (h.toDate || h.fromDate);
                const dateLabel = isSingle ? h.fromDate : `${h.fromDate} → ${h.toDate}`;
                const cls = h.classes?.length === 1 && h.classes[0] === 'All' ? 'All Classes' : (h.classes || []).join(', ');
                return (
                  <motion.div key={h.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-4 flex items-start gap-3">
                    <div className="w-1 self-stretch rounded-full bg-accent/60 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{h.title}</p>
                      {h.description && <p className="text-xs text-slate-500 mt-0.5">{h.description}</p>}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                        <span className="text-[10px] text-accent font-mono">{dateLabel}</span>
                        <span className="text-[10px] text-slate-500 flex items-center gap-1"><GraduationCap size={10} />{cls}</span>
                        {h.exemptEmployees?.length > 0 && <span className="text-[10px] text-slate-500 flex items-center gap-1"><Users size={10} />{h.exemptEmployees.length} emp exempt</span>}
                      </div>
                    </div>
                    <button onClick={() => deleteHoliday(h.id)} className="p-1.5 rounded-lg text-slate-600 hover:text-accent hover:bg-accent/10 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Right: Interactive Calendar ── */}
        <div className="glass-card p-5">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => { const d = new Date(calYear, calMonth - 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()); }} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400">
              <ChevronLeft size={16} />
            </button>
            <p className="text-sm font-semibold text-white">{MONTHS[calMonth]} {calYear}</p>
            <button onClick={() => { const d = new Date(calYear, calMonth + 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()); }} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className={`text-center text-[10px] font-semibold pb-1 ${d === 'Sun' ? 'text-accent' : 'text-slate-500'}`}>{d}</div>
            ))}
          </div>

          {/* Cells */}
          <div className="grid grid-cols-7 gap-0.5">
            {calDays.map((cell, i) => {
              if (!cell) return <div key={`e${i}`} />;
              return (
                <div key={cell.dateStr}
                  className={`aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-all
                                        ${cell.isToday ? 'ring-2 ring-indigo-500 bg-indigo-500/20 text-indigo-300' : ''}
                                        ${cell.isSun && !cell.isToday ? 'text-rose-400 bg-rose-500/10' : ''}
                                        ${!cell.isSun && cell.isHoliday && !cell.isToday ? 'bg-amber-500/20 text-amber-300' : ''}
                                        ${!cell.isHoliday && !cell.isToday ? 'text-slate-300 hover:bg-white/5' : ''}
                                    `}>
                  {cell.d}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t border-white/5">
            {[['bg-primary/20 ring-1 ring-primary', 'text-primary', 'Today'], ['bg-accent/20', 'text-accent', 'Holiday'], ['bg-accent/10', 'text-accent', 'Sunday']].map(([cls, txt, lbl]) => (
              <div key={lbl} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded ${cls}`} />
                <span className={`text-[10px] ${txt}`}>{lbl}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Create Holiday Drawer ── */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setShowForm(false)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="drawer-panel p-6 overflow-y-auto space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-white">Create Holiday</h2>
                <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white p-1.5 hover:bg-white/10 rounded-lg">✕</button>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Title *</label>
                <input className="input-dark w-full" placeholder="e.g. Diwali, Annual Sports Day" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Description</label>
                <textarea className="input-dark w-full resize-none" rows={2} placeholder="Why is this a holiday?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">From Date *</label>
                  <input type="date" className="input-dark w-full" value={form.fromDate} onChange={e => setForm(f => ({ ...f, fromDate: e.target.value, toDate: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">To Date</label>
                  <input type="date" className="input-dark w-full" value={form.toDate} min={form.fromDate} onChange={e => setForm(f => ({ ...f, toDate: e.target.value }))} />
                </div>
              </div>

              {/* Classes */}
              <div>
                <label className="text-xs text-slate-400 mb-2 block">Applicable Classes</label>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setForm(f => ({ ...f, allClasses: true, classes: ['All'] }))}
                    className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${form.allClasses ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}>
                    All Classes
                  </button>
                  {classes.map(c => (
                    <button key={c} onClick={() => toggleClass(c)}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${!form.allClasses && form.classes.includes(c) ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced section */}
              <div>
                <button onClick={() => setForm(f => ({ ...f, showAdvanced: !f.showAdvanced }))} className="text-xs text-primary hover:brightness-110 font-medium flex items-center gap-1">
                  <Shield size={12} /> {form.showAdvanced ? '− Hide' : '+ Show'} Advanced Exceptions
                </button>
              </div>

              {form.showAdvanced && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 border border-white/10 rounded-xl p-4 bg-white/[0.02]">
                  <p className="text-xs text-slate-400">Employees listed here will <strong className="text-white">not</strong> get a holiday — they must work.</p>
                  <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                    {employees.length === 0 ? <p className="text-xs text-slate-600">No employees found</p> : employees.map(e => {
                      const id = e.employeeId || e.employee_id || e.id;
                      const name = e.employeeName || e.name || id;
                      const sel = form.exemptEmployees.includes(id);
                      return (
                        <button key={id} onClick={() => toggleEmployee(id)}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left ${sel ? 'bg-accent/20 border border-accent/30 text-accent' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
                          {sel ? <CheckCircle size={11} /> : <div className="w-[11px] h-[11px] rounded-full border border-slate-600" />}
                          {name}
                          {e.category && <span className="ml-auto text-slate-600">{e.category}</span>}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              <button onClick={createHoliday} disabled={saving} className="btn-primary w-full justify-center">
                {saving ? <Loader size={14} className="animate-spin" /> : <CalendarDays size={14} />}
                {saving ? 'Creating…' : 'Create Holiday'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-xl ${toast.type === 'success' ? 'bg-success/20 border border-success/30 text-success' : 'bg-accent/20 border border-accent/30 text-accent'}`}>
            {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
