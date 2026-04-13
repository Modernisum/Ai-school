import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { getSchoolIdFromStorage } from '../../../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserPlus, FileDown, Search,
  ChevronRight, Filter, MoreVertical, Eye,
  Edit, Trash2, Calendar, CheckCircle, Clock,
  X, UserX, Info, Download, Upload, RefreshCw, UploadCloud,
  Plus, Edit3, Loader, AlertTriangle, GraduationCap,
  TrendingUp, UserCheck, CalendarCheck, ClipboardList,
  DollarSign, Zap, FilterX, Activity, Cpu, ShieldCheck, Database
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from 'recharts';
import AddStudentPage from '../components/addstudent';
import BulkImportModal from '../../../components/ui/BulkImportModal';
import { useGetStudentsQuery, useDeleteStudentMutation, useUpdateStudentMutation } from '../api/studentApi';
import { academicApi } from '../../academics/api/academicApi';
const { useGetClassesQuery } = academicApi;
import { selectPollingInterval } from '../../settings/settingsSlice';
import { setOnline } from "../../settings/settingsSlice";

const API = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8080/api`;
const getSchoolId = () => getSchoolIdFromStorage() || ''; 
const fmtMoney = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const fmtDate = (date) => {
    if (!date) return 'N/A';
    const d = date._seconds ? new Date(date._seconds * 1000) : new Date(date);
    return isNaN(d) ? 'N/A' : d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
};

// ─── Animation Presets ──────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
};

const stagger = {
  visible: { transition: { staggerChildren: 0.05 } }
};

// ─── Premium Glass Card ──────────────────────────────────────────────────────
const GlassCard = ({ children, className = "", glowColor = "primary" }) => {
  const glowStyles = {
    primary: "hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]",
    success: "hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]",
    accent: "hover:shadow-[0_0_20px_rgba(244,63,94,0.15)]",
    warning: "hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]",
  };

  return (
    <div className={`
      relative overflow-hidden
      bg-white/[0.03] backdrop-blur-xl
      border border-white/10
      rounded-3xl transition-all duration-500
      ${glowStyles[glowColor] || ""}
      ${className}
    `}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

// ─── Premium KPI Tile ────────────────────────────────────────────────────────
const KPITile = ({ label, value, sub, icon: Icon, color = "primary", trend = null }) => {
  const colorMap = {
    primary: "from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30",
    success: "from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30",
    accent: "from-rose-500/20 to-pink-500/20 text-rose-400 border-rose-500/30",
    warning: "from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30",
    purple: "from-purple-500/20 to-fuchsia-500/20 text-purple-400 border-purple-500/30",
  };

  return (
    <GlassCard className="p-5 group hover:-translate-y-1" glowColor={color}>
      <div className="flex justify-between items-start">
        <div className={`p-3 rounded-2xl bg-gradient-to-br ${colorMap[color]} border shadow-lg group-hover:scale-110 transition-transform duration-500`}>
          <Icon size={20} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-white/5 border border-white/10 ${trend > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trend > 0 ? <TrendingUp size={10} /> : <Activity size={10} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
        <h3 className="text-2xl font-black text-white mt-1 tracking-tight">{value}</h3>
        <p className="text-[10px] font-medium text-slate-400 mt-1 flex items-center gap-1.5 opacity-70">
           {sub}
        </p>
      </div>
    </GlassCard>
  );
};

// ─── Profile Fee Summary ────────────────────────────────────────────────────
function ProfileFeeSummary({ studentId, schoolId }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!studentId || !schoolId) return;
        setLoading(true);
        fetch(`${API}/students/${schoolId}/students/${studentId}/profile`)
            .then(r => r.json())
            .then(d => { if (d.success) setProfile(d.data); })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [studentId, schoolId]);

    if (loading) return <div className="flex justify-center py-10"><Loader size={24} className="animate-spin text-indigo-500" /></div>;
    if (!profile) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <DollarSign size={16} className="text-emerald-400" /> Financial Pulse
              </h4>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20 font-black uppercase">Verified</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {[
                    ['Subject Fees', fmtMoney(profile.subjectFees), 'text-blue-400', 'bg-blue-500/5', 'border-blue-500/10'],
                    ['Custom Fees', fmtMoney(profile.totalCustomFees), 'text-indigo-400', 'bg-indigo-500/5', 'border-indigo-500/10'],
                    ['Penalties', fmtMoney(profile.totalPenalty), 'text-rose-400', 'bg-rose-500/5', 'border-rose-500/10'],
                    ['Discounts', fmtMoney(profile.discount), 'text-amber-400', 'bg-amber-500/5', 'border-amber-500/10'],
                ].map(([label, val, color, bg, border]) => (
                    <div key={label} className={`${bg} ${border} border rounded-2xl p-4 transition-all hover:scale-105`}>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1">{label}</p>
                        <p className={`text-lg font-black ${color}`}>{val}</p>
                    </div>
                ))}
            </div>

            <GlassCard className="p-5 border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-transparent">
                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Net Liability</p>
                        <p className="text-2xl font-black text-white">{fmtMoney(profile.totalAmount)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Pending</p>
                        <p className="text-xl font-black text-rose-400">{fmtMoney(profile.totalPending)}</p>
                    </div>
                </div>
                <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }} animate={{ width: `${Math.min(100, (profile.totalPaid / (profile.totalAmount || 1)) * 100)}%` }}
                     className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                </div>
                <p className="text-[9px] text-slate-500 mt-2 font-bold uppercase tracking-widest text-center">Settled: {fmtMoney(profile.totalPaid)}</p>
            </GlassCard>
        </div>
    );
}

// ─── Student Management (main) ─────────────────────────────────────────────
export default function StudentManagement() {
    const location = useLocation();
    const dispatch = useDispatch();
    const schoolId = getSchoolId();
    const pollingInterval = useSelector(selectPollingInterval);

    const { data: sData, isLoading: sLoading } = useGetStudentsQuery(schoolId, { pollingInterval });
    const { data: classData = [] } = useGetClassesQuery(schoolId, { skip: !schoolId });
    const [deleteStudent] = useDeleteStudentMutation();
    const [updateStudent] = useUpdateStudentMutation();
    
    const students = useMemo(() => sData?.data || sData?.students || [], [sData]);

    const [activeTab, setActiveTab] = useState('overview'); 
    const [searchTerm, setSearchTerm] = useState('');
    const [filterClass, setFilterClass] = useState('All');
    const [toast, setToast] = useState(null);
    const [showAddForm, setShowAddForm] = useState(new URLSearchParams(location.search).get('add') === '1');
    const [editStudentId, setEditStudentId] = useState(null);
    const [profileDrawer, setProfileDrawer] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null); 

    // Attendance state
    const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
    const [attClass, setAttClass] = useState('All');
    const [attSearch, setAttSearch] = useState('');
    const [presentIds, setPresentIds] = useState(new Set());
    const [attLoading, setAttLoading] = useState(false);
    const [marking, setMarking] = useState({});
    const [holidays, setHolidays] = useState([]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        setShowAddForm(params.get('add') === '1');
    }, [location.search]);

    const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };

    const fetchAttendance = useCallback(async () => {
        setAttLoading(true);
        try {
            const r = await fetch(`${API}/operations/attendance/${schoolId}/student/date/${attDate}`);
            if (r.ok) {
                const d = await r.json();
                setPresentIds(new Set(d.presentIds || []));
            } else { setPresentIds(new Set()); }
        } catch (e) { setPresentIds(new Set()); }
        finally { setAttLoading(false); }
    }, [schoolId, attDate]);

    useEffect(() => { if (activeTab === 'attendance') fetchAttendance(); }, [activeTab, attDate, fetchAttendance]);

    const togglePresent = async (student) => {
        const sid = student.studentId || student.student_id;
        const isPresent = presentIds.has(sid);
        setPresentIds(prev => { const n = new Set(prev); isPresent ? n.delete(sid) : n.add(sid); return n; });
        setMarking(m => ({ ...m, [sid]: true }));
        try {
            const token = localStorage.getItem('accessToken');
            const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
            if (isPresent) {
                await fetch(`${API}/operations/attendance/${schoolId}/student/${sid}/${attDate}`, { method: 'DELETE', headers });
            } else {
                await fetch(`${API}/operations/attendance/${schoolId}/student/${sid}/present`, {
                    method: 'POST', headers, body: JSON.stringify({ date: attDate })
                });
            }
        } catch (e) {
            setPresentIds(prev => { const n = new Set(prev); isPresent ? n.add(sid) : n.delete(sid); return n; });
            showToast('error', 'Communication Error with Node');
        } finally { setMarking(m => { const n = { ...m }; delete n[sid]; return n; }); }
    };

    const handleDeleteStudent = async (sid) => {
        try {
            const res = await deleteStudent({ schoolId, studentId: sid }).unwrap();
            if (res.success) showToast('success', 'Node Decommissioned');
            else throw new Error(res.message);
        } catch (e) { showToast('error', 'Operation Restricted'); }
        finally { setConfirmAction(null); }
    };

    // ── Derived Data ──────────────────────────────────────────────────────────
    const classes = useMemo(() => classData.map(c => c.name || c.className || (typeof c === 'string' ? c : '')), [classData]);
    const regularStudents = students.filter(s => (s.type || s.studentType || '').toLowerCase() !== 'private');
    const privateStudents = students.filter(s => (s.type || s.studentType || '').toLowerCase() === 'private');

    const filtered = useMemo(() => students.filter(s => {
        const name = (s.name || s.studentName || '').toLowerCase();
        const id = (s.studentId || s.student_id || '').toLowerCase();
        const cls = s.className || s.classId || '';
        return (name.includes(searchTerm.toLowerCase()) || id.includes(searchTerm.toLowerCase()))
            && (filterClass === 'All' || cls === filterClass);
    }), [students, searchTerm, filterClass]);

    const attStudents = useMemo(() => students.filter(s => {
        const name = (s.name || s.studentName || '').toLowerCase();
        const cls = s.className || s.classId || '';
        return (attClass === 'All' || cls === attClass)
            && (!attSearch || name.includes(attSearch.toLowerCase()));
    }), [students, attClass, attSearch]);

    const presentCount = attStudents.filter(s => presentIds.has(s.studentId || s.student_id)).length;
    const attPct = attStudents.length > 0 ? Math.round((presentCount / attStudents.length) * 100) : 0;

    if (showAddForm) {
        return (
            <AddStudentPage
                mode={editStudentId ? 'edit' : 'add'}
                studentId={editStudentId}
                onBack={() => { setShowAddForm(false); setEditStudentId(null); }}
                onSuccess={() => { setShowAddForm(false); setEditStudentId(null); showToast('success', 'Profile Synchronized'); }}
            />
        );
    }

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 p-4 lg:p-8 selection:bg-indigo-500/30">
            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* ─── Header Section ─── */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                        <div className="flex items-center gap-3 text-indigo-400 mb-2">
                            <Cpu size={18} className="animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Personnel Management Active</span>
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight">
                            Student <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400">Directory</span>
                        </h1>
                        <p className="text-slate-500 text-sm mt-1 font-medium">Monitoring {students.length} unified intelligence nodes.</p>
                    </motion.div>

                    <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-xl relative min-w-[220px]">
                        <motion.div
                            className="absolute inset-y-1.5 bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20"
                            initial={false}
                            animate={{ x: activeTab === 'overview' ? 0 : 100, width: activeTab === 'overview' ? 100 : 110 }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                        <button onClick={() => setActiveTab('overview')} className={`relative flex-1 z-10 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'overview' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>General</button>
                        <button onClick={() => setActiveTab('attendance')} className={`relative flex-1 z-10 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${activeTab === 'attendance' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}>Attendance</button>
                    </div>
                </header>

                {/* ─── KPI Grid ─── */}
                <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KPITile label="Total Active" value={students.length} sub={`${regularStudents.length} Regular Nodes`} icon={GraduationCap} color="primary" trend={2.4} />
                    <KPITile label="Private Sector" value={privateStudents.length} sub="Independent Study Units" icon={ShieldCheck} color="accent" />
                    <KPITile label="Daily Network Pulse" value={`${attPct}%`} sub={`${presentCount} Nodes Online`} icon={Activity} color="success" />
                    <KPITile label="Cloud Registry" value={classes.length} sub="Categorized Clusters" icon={Database} color="warning" />
                </motion.div>

                {/* ─── MAIN OVERVIEW ─── */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row gap-4 items-center">
                            <div className="relative flex-1 group w-full">
                                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                                <input 
                                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40 focus:bg-white/[0.05] transition-all font-medium" 
                                  placeholder="Scan for student name or serial hash..." 
                                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)} 
                                />
                            </div>
                            <div className="w-full md:w-56 shrink-0">
                                <select 
                                  className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-3.5 px-4 text-xs text-slate-300 font-black uppercase tracking-widest focus:outline-none focus:border-indigo-500/40 transition-all cursor-pointer" 
                                  value={filterClass} onChange={e => setFilterClass(e.target.value)}
                                >
                                    <option value="All">All Clusters</option>
                                    {classes.map((c, i) => <option key={i} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <button 
                              onClick={() => { setEditStudentId(null); setShowAddForm(true); }} 
                              className="w-full md:w-auto shrink-0 bg-indigo-500 hover:bg-indigo-400 text-white px-8 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                            >
                                <Plus size={16} /> New Admission
                            </button>
                        </motion.div>

                        <GlassCard className="overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-white/[0.02] border-b border-white/5">
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Index</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Entity</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Serial ID</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Current Cluster</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Operations</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.02]">
                                        <AnimatePresence>
                                        {filtered.map((s, i) => (
                                            <motion.tr 
                                              key={s.studentId || s.student_id || i}
                                              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                                              className="hover:bg-white/[0.02] transition-colors group"
                                            >
                                                <td className="px-6 py-4 text-xs font-mono text-slate-600">{i + 1}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-600/20 border border-white/10 flex items-center justify-center text-indigo-400 text-sm font-black shadow-inner">
                                                          {s.profileImageUrl ? <img src={s.profileImageUrl} alt="" className="w-full h-full object-cover rounded-xl" /> : (s.studentName || s.name || 'S')[0].toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-white">{s.studentName || s.name || 'N/A'}</p>
                                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{s.gender || 'Unknown'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-black text-indigo-400 font-mono tracking-tighter bg-indigo-500/5 px-2.5 py-1.5 rounded-lg border border-indigo-500/20">
                                                      {s.studentId || s.student_id || 'X-000'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-[10px] font-black text-slate-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm">
                                                      {s.classId || s.className || 'Unassigned'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-2">
                                                        <button onClick={() => setProfileDrawer({ student: s, mode: 'view' })} className="p-2.5 rounded-xl text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"><Eye size={16} /></button>
                                                        <button onClick={() => { setEditStudentId(s.studentId || s.student_id); setShowAddForm(true); }} className="p-2.5 rounded-xl text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"><Edit3 size={16} /></button>
                                                        <button onClick={() => setConfirmAction({ type: 'delete', student: s })} className="p-2.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"><Trash2 size={16} /></button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))}
                                        </AnimatePresence>
                                    </tbody>
                                </table>
                            </div>
                        </GlassCard>
                    </div>
                )}

                {/* ─── ATTENDANCE TAB ─── */}
                {activeTab === 'attendance' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                          
                          {/* Controller Panel */}
                          <div className="xl:col-span-4 space-y-6">
                              <GlassCard className="p-6 border-indigo-500/20">
                                  <h3 className="text-lg font-black text-white mb-6 flex items-center gap-3">
                                    <Clock className="text-indigo-400" /> Temporal Control
                                  </h3>
                                  <div className="space-y-4">
                                      <div>
                                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block">System Date</label>
                                          <input 
                                            type="date" value={attDate} onChange={e => setAttDate(e.target.value)} 
                                            className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:border-indigo-500/50 transition-all font-black" 
                                          />
                                      </div>
                                      <div>
                                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block">Cluster Scan</label>
                                          <select 
                                            value={attClass} onChange={e => setAttClass(e.target.value)} 
                                            className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white uppercase tracking-widest font-black"
                                          >
                                              <option value="All">Full Network</option>
                                              {classes.map((c, i) => <option key={i} value={c}>{c}</option>)}
                                          </select>
                                      </div>
                                      <button 
                                        onClick={fetchAttendance}
                                        className="w-full py-4 mt-6 rounded-2xl bg-white/[0.02] border border-white/10 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-white/[0.05] transition-all"
                                      >
                                        Refresh Registry
                                      </button>
                                  </div>
                              </GlassCard>

                              <GlassCard className="p-6 bg-gradient-to-br from-indigo-500/10 to-transparent">
                                  <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xs font-black text-white uppercase tracking-widest">Network Health</h3>
                                    <Activity size={16} className="text-indigo-400 animate-pulse" />
                                  </div>
                                  <div className="space-y-4">
                                      <div className="flex justify-between items-end">
                                        <p className="text-[10px] font-black text-slate-500 uppercase">Synchronization</p>
                                        <p className="text-xl font-black text-white">{attPct}%</p>
                                      </div>
                                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${attPct}%` }} className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                                      </div>
                                      <p className="text-[9px] text-slate-500 font-bold uppercase text-center mt-2 tracking-widest">
                                        {presentCount} Nodes online • {attStudents.length - presentCount} Signal Interrupts
                                      </p>
                                  </div>
                              </GlassCard>
                          </div>

                          {/* Registry List */}
                          <div className="xl:col-span-8">
                              <GlassCard className="h-[600px] flex flex-col p-6">
                                  <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
                                      <div>
                                        <h3 className="text-xl font-black text-white">Registry Nodes</h3>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Scanning Cluster: {attClass}</p>
                                      </div>
                                      <div className="relative group">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input 
                                          className="bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-indigo-500/30 transition-all font-medium" 
                                          placeholder="Find node..." value={attSearch} onChange={e => setAttSearch(e.target.value)} 
                                        />
                                      </div>
                                  </div>

                                  <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                                      {attLoading ? <div className="flex justify-center py-20"><Loader className="animate-spin text-indigo-500" /></div> : 
                                       attStudents.map((s, i) => {
                                          const sid = s.studentId || s.student_id;
                                          const isPresent = presentIds.has(sid);
                                          const name = s.studentName || s.name || 'N/A';
                                          return (
                                              <motion.div 
                                                key={sid || i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                                                className={`p-4 rounded-3xl border transition-all flex items-center justify-between group ${isPresent ? 'bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]' : 'bg-white/[0.01] border-white/5'}`}
                                              >
                                                  <div className="flex items-center gap-4">
                                                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xs font-black transition-all ${isPresent ? 'bg-emerald-500/20 border-emerald-500/20 text-emerald-400' : 'bg-slate-800 border-white/5 text-slate-500'}`}>
                                                        {name[0].toUpperCase()}
                                                      </div>
                                                      <div>
                                                          <h4 className="text-sm font-black text-white">{name}</h4>
                                                          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{sid}</p>
                                                      </div>
                                                  </div>
                                                  <button onClick={() => togglePresent(s)} disabled={marking[sid]}
                                                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isPresent ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white/5 text-slate-500 hover:text-white hover:bg-white/10'}`}
                                                  >
                                                    {isPresent ? 'Verified' : 'Offline'}
                                                  </button>
                                              </motion.div>
                                          );
                                      })}
                                  </div>
                              </GlassCard>
                          </div>
                      </div>
                  </div>
                )}

                {/* ─── Profile Drawer ─── */}
                <AnimatePresence>
                    {profileDrawer && (
                        <>
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]" onClick={() => setProfileDrawer(null)} />
                            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#0f172a] border-l border-white/10 z-[110] shadow-2xl p-8 overflow-y-auto custom-scrollbar">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3 text-indigo-400">
                                      <Info size={16} />
                                      <span className="text-[10px] font-black uppercase tracking-widest">Intelligence Node Profile</span>
                                    </div>
                                    <button onClick={() => setProfileDrawer(null)} className="text-slate-500 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all"><X size={20} /></button>
                                </div>

                                <div className="flex flex-col items-center text-center mb-10">
                                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500/30 to-violet-600/30 border border-white/10 p-1 mb-6 shadow-2xl">
                                      <div className="w-full h-full rounded-2xl bg-[#0f172a] flex items-center justify-center overflow-hidden">
                                        {profileDrawer.student.profileImageUrl ? <img src={profileDrawer.student.profileImageUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-4xl font-black text-indigo-400">{(profileDrawer.student.studentName || 'S')[0]}</span>}
                                      </div>
                                    </div>
                                    <h2 className="text-2xl font-black text-white tracking-tight">{profileDrawer.student.studentName || 'Unknown Entity'}</h2>
                                    <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mt-2 group cursor-pointer hover:text-indigo-400 transition-colors">{profileDrawer.student.studentId || 'X-000'}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-6 mb-10">
                                    {[
                                      ['Gender', profileDrawer.student.gender, Users],
                                      ['Cluster', profileDrawer.student.className || profileDrawer.student.classId, Layers],
                                      ['Join Date', fmtDate(profileDrawer.student.createdAt || profileDrawer.student.created_at), CalendarCheck],
                                      ['Status', 'Active Integrity', ShieldCheck],
                                    ].map(([label, val, Icon]) => (
                                      <div key={label}>
                                          <div className="flex items-center gap-2 mb-1.5 opacity-50">
                                            <Icon size={12} className="text-slate-500" />
                                            <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
                                          </div>
                                          <p className="text-sm font-bold text-white px-1 whitespace-nowrap overflow-hidden text-ellipsis">{val || 'N/A'}</p>
                                      </div>
                                    ))}
                                </div>

                                {/* Dynamic Fee Summary Section */}
                                <ProfileFeeSummary studentId={profileDrawer.student.studentId || profileDrawer.student.student_id} schoolId={schoolId} />

                                <div className="mt-10 pt-8 border-t border-white/5 grid grid-cols-2 gap-4">
                                  <button onClick={() => { setEditStudentId(profileDrawer.student.studentId); setShowAddForm(true); }} className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-white hover:bg-white/10 transition-all">Deep Edit</button>
                                  <button onClick={() => setConfirmAction({type:'delete', student: profileDrawer.student})} className="px-6 py-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-[10px] font-black uppercase tracking-widest text-rose-400 hover:bg-rose-500/20 transition-all">Deactivate</button>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* Confirmation Modal */}
                <AnimatePresence>
                    {confirmAction && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmAction(null)} className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-sm bg-[#0f172a] border border-white/10 p-8 rounded-[2.5rem] relative z-20 shadow-2xl">
                                <div className="w-16 h-16 rounded-3xl bg-rose-500/20 text-rose-500 flex items-center justify-center mb-6">
                                    <AlertTriangle size={32} />
                                </div>
                                <h3 className="text-xl font-black text-white mb-3">Critical Action Request</h3>
                                <p className="text-sm text-slate-400 mb-8 leading-relaxed font-medium">
                                    {confirmAction.type === 'delete'
                                        ? `Are you sure you wish to permanently terminate node instance [${confirmAction.student.name}]? This operation cannot be reversed.`
                                        : "Warning: Blocking this node will restrict all network access for this personnel."}
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={() => setConfirmAction(null)} className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-300">Abort</button>
                                    <button
                                        onClick={() => handleDeleteStudent(confirmAction.student.studentId || confirmAction.student.student_id)}
                                        className="px-6 py-4 rounded-2xl bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest"
                                    >
                                        Execute
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Toasts */}
                <AnimatePresence>
                    {toast && (
                        <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            className={`fixed bottom-8 right-8 z-[300] flex items-center gap-4 px-6 py-4 rounded-2xl backdrop-blur-2xl shadow-2xl border ${toast.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 border-rose-500/20 text-rose-400'}`}>
                            {toast.type === 'success' ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
                            <div className="flex flex-col">
                              <span className="text-[9px] font-black uppercase tracking-widest opacity-50">{toast.type}</span>
                              <span className="text-xs font-black">{toast.msg}</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>

            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }`}</style>
        </div>
    );
}
l shadow-lg ${confirmAction.type === 'delete' ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-amber-600 hover:bg-amber-500 text-white'}`}
                                >
                                    Yes
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
}
