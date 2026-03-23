import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
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
  DollarSign, Zap
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import AddStudentPage from '../components/addstudent';
import BulkImportModal from '../../../components/ui/BulkImportModal';
import { useGetStudentsQuery, useDeleteStudentMutation, useUpdateStudentMutation } from '../api/studentApi';
import { academicApi } from '../../academics/api/academicApi';
const { useGetClassesQuery } = academicApi;
import { selectPollingInterval } from '../../settings/settingsSlice';

const API = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8080/api`;
const getSchoolId = () => getSchoolIdFromStorage() || ''; 
const fmtMoney = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const fmtDate = (date) => {
    if (!date) return 'N/A';
    const d = date._seconds ? new Date(date._seconds * 1000) : new Date(date);
    return isNaN(d) ? 'N/A' : d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
};

const COLORS = { 
    regular: 'var(--primary-color)', 
    private: 'var(--secondary-color)', 
    present: 'var(--success-color)', 
    absent: 'var(--accent-color)' 
};

// ─── Mini Pie Chart Card ──────────────────────────────────────────────────────
function MiniPieCard({ title, subtitle, data, loading, extra }) {
    const total = data.reduce((s, d) => s + (d.value || 0), 0);
    return (
        <div className="glass-card p-4 flex flex-col gap-1 min-w-[220px] flex-1">
            <div className="flex items-center justify-between mb-1">
                <div>
                    <p className="text-xs font-semibold text-white">{title}</p>
                    <p className="text-[10px] text-slate-500">{subtitle}</p>
                </div>
                <div className="text-right">
                    <p className="text-xl font-bold" style={{ color: 'var(--primary-color)' }}>{total}</p>
                    {extra}
                </div>
            </div>
            {loading ? (
                <div className="h-[100px] flex items-center justify-center"><Loader size={18} className="animate-spin" style={{ color: 'var(--primary-color)' }} /></div>
            ) : (
                <>
                    <ResponsiveContainer width="100%" height={100}>
                        <PieChart>
                            <Pie data={data} cx="50%" cy="50%" innerRadius={24} outerRadius={44} paddingAngle={3} dataKey="value" animationBegin={0} animationDuration={700}>
                                {data.map((entry, i) => <Cell key={i} fill={entry.color} opacity={0.9} />)}
                            </Pie>
                            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-0.5">
                        {data.map((d, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                                <span className="text-[10px] text-slate-400">{d.name}</span>
                                <span className="text-[10px] font-medium text-slate-300">{d.value}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Profile Fee Summary (used in profile drawer) ──────────────────────────
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

    if (loading) return <div className="flex justify-center py-4"><Loader size={18} className="animate-spin" style={{ color: 'var(--primary-color)' }} /></div>;
    if (!profile) return null;

    return (
        <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <DollarSign size={13} className="text-success" /> Fee Summary
            </h4>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2">
                {[
                    ['Subjects', profile.totalSubjects, 'text-primary', 'bg-primary/10'],
                    ['Subject Fees', fmtMoney(profile.subjectFees), 'text-secondary', 'bg-violet-500/10'],
                    ['Custom Fees', fmtMoney(profile.totalCustomFees), 'text-teal-400', 'bg-teal-500/10'],
                    ['Penalty', fmtMoney(profile.totalPenalty), 'text-accent', 'bg-rose-500/10'],
                    ['Discount', fmtMoney(profile.discount), 'text-accent', 'bg-amber-500/10'],
                    ['Total Paid', fmtMoney(profile.totalPaid), 'text-success', 'bg-emerald-500/10'],
                ].map(([label, val, color, bg]) => (
                    <div key={label} className={`${bg} rounded-xl px-3 py-2.5 border border-white/5`}>
                        <p className="text-[10px] text-slate-500">{label}</p>
                        <p className={`text-sm font-bold ${color}`}>{val}</p>
                    </div>
                ))}
            </div>

            {/* Grand Total */}
            <div className="bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 rounded-xl p-3 flex justify-between items-center">
                <div>
                    <p className="text-[10px] text-slate-500">Grand Total</p>
                    <p className="text-lg font-bold text-white">{fmtMoney(profile.totalAmount)}</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-slate-500">Pending</p>
                    <p className="text-lg font-bold text-accent">{fmtMoney(profile.totalPending)}</p>
                </div>
            </div>

            {/* Custom Fees List */}
            {profile.customFees && profile.customFees.length > 0 && (
                <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Applied Custom Fees</p>
                    {profile.customFees.map((cf, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5 px-2 bg-slate-800/40 rounded-lg border border-white/5">
                            <div className="flex items-center gap-2 min-w-0">
                                <Zap size={11} className="text-success flex-shrink-0" />
                                <div className="min-w-0">
                                    <p className="text-[11px] text-white truncate">{cf.feeName}</p>
                                    {cf.hasPenalty && cf.penalty > 0 && (
                                        <p className="text-[9px] text-accent">+{fmtMoney(cf.penalty)} penalty</p>
                                    )}
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                                <p className={`text-[11px] font-medium ${cf.status === 'paid' ? 'text-success' : 'text-accent'}`}>{fmtMoney(cf.amount)}</p>
                                <span className={`text-[8px] px-1 py-0.5 rounded ${cf.status === 'paid' ? 'bg-success/15 text-success' : 'bg-accent/15 text-accent'}`}>{cf.status}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Student Management (main) ─────────────────────────────────────────────
export default function StudentManagement() {
    const location = useLocation();
    const schoolId = getSchoolId();
    const pollingInterval = useSelector(selectPollingInterval);

    const { data: sData, isLoading: sLoading } = useGetStudentsQuery(schoolId, { pollingInterval });
    const [deleteStudent] = useDeleteStudentMutation();
    const [updateStudent] = useUpdateStudentMutation();
    const students = useMemo(() => sData?.data || sData?.students || [], [sData]);

    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'attendance'
    const [classes, setClasses] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterClass, setFilterClass] = useState('All');
    const [lineFilter, setLineFilter] = useState('year');
    const [toast, setToast] = useState(null);
    const [showAddForm, setShowAddForm] = useState(new URLSearchParams(location.search).get('add') === '1');
    const [editStudentId, setEditStudentId] = useState(null);
    const [bulkModalOpen, setBulkModalOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null); // { type: 'delete' | 'block', student: any }

    // Sync showAddForm with URL search params
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('add') === '1') {
            setShowAddForm(true);
        } else if (params.get('add') === null && showAddForm && !params.toString().includes('add=')) {
            // Only hide if we specifically came from an 'add' state and now it's gone
            // However, usually we want it to stay if manually toggled, but here 
            // the user specifically complained about sidebar navigation.
            // If they click "All Students" (no ?add=1), we should probably show the list.
            setShowAddForm(false);
        }
    }, [location.search]);
    const [profileDrawer, setProfileDrawer] = useState(null);

    // Attendance state
    const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
    const [attClass, setAttClass] = useState('All');
    const [attSearch, setAttSearch] = useState('');
    const [presentIds, setPresentIds] = useState(new Set());
    const [attLoading, setAttLoading] = useState(false);
    const [marking, setMarking] = useState({});
    const [holidays, setHolidays] = useState([]);

    const isHoliday = useMemo(() => {
        const d = new Date(attDate);
        if (d.getUTCDay() === 0) return { isHoliday: true, reason: 'Sunday' };
        const h = holidays.find(h => attDate >= h.fromDate && attDate <= (h.toDate || h.fromDate));
        if (h) return { isHoliday: true, reason: h.title };
        return { isHoliday: false };
    }, [attDate, holidays]);

    const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };

    // Load classes using RTK Query
    const { data: classData = [] } = useGetClassesQuery(schoolId, { skip: !schoolId });

    useEffect(() => {
        if (classData.length > 0) {
            setClasses(classData.map(c => c.name || c.className || (typeof c === 'string' ? c : '')));
        }
    }, [classData]);

    // Fetch present IDs for selected date
    const fetchAttendance = useCallback(async () => {
        setAttLoading(true);
        try {
            // GET /api/operations/attendance/:schoolId/student/date/:date
            const r = await fetch(`${API}/operations/attendance/${schoolId}/student/date/${attDate}`);
            if (r.ok) {
                const d = await r.json();
                setPresentIds(new Set(d.presentIds || []));
            } else {
                setPresentIds(new Set());
            }
        } catch (e) { setPresentIds(new Set()); }
        finally { setAttLoading(false); }
    }, [schoolId, attDate]);

    const fetchHolidays = useCallback(async () => {
        if (!schoolId) return;
        try {
            const token = localStorage.getItem('accessToken');
            const headers = {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };
            const r = await fetch(`${API}/operations/attendance/${schoolId}/holidays`, { headers });
            const d = await r.json();
            if (d.success) setHolidays(d.data || []);
        } catch (e) { console.error(e); }
    }, [schoolId]);

    useEffect(() => {
        if (!schoolId) return;
        fetchHolidays();
    }, [schoolId, fetchHolidays]);
    useEffect(() => { if (activeTab === 'attendance') fetchAttendance(); }, [activeTab, attDate, fetchAttendance]);

    const togglePresent = async (student) => {
        const sid = student.studentId || student.student_id;
        const isPresent = presentIds.has(sid);
        // Optimistic
        setPresentIds(prev => { const n = new Set(prev); isPresent ? n.delete(sid) : n.add(sid); return n; });
        setMarking(m => ({ ...m, [sid]: true }));
        try {
            const token = localStorage.getItem('accessToken');
            const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
            if (isPresent) {
                // DELETE /api/operations/attendance/:schoolId/:role/:userId/:date
                await fetch(`${API}/operations/attendance/${schoolId}/student/${sid}/${attDate}`, { method: 'DELETE', headers });
            } else {
                // POST /api/operations/attendance/:schoolId/:role/:userId/present
                await fetch(`${API}/operations/attendance/${schoolId}/student/${sid}/present`, {
                    method: 'POST', headers, body: JSON.stringify({ date: attDate })
                });
            }
        } catch (e) {
            // Revert
            setPresentIds(prev => { const n = new Set(prev); isPresent ? n.add(sid) : n.delete(sid); return n; });
            showToast('error', 'Failed to mark attendance');
        } finally {
            setMarking(m => { const n = { ...m }; delete n[sid]; return n; });
        }
    };

    const markAllPresent = async () => {
        const targets = attStudents.filter(s => !presentIds.has(s.studentId || s.student_id));
        if (!targets.length) return;
        const token = localStorage.getItem('accessToken');
        const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
        const newSet = new Set(presentIds);
        targets.forEach(s => newSet.add(s.studentId || s.student_id));
        setPresentIds(newSet);
        await Promise.all(targets.map(s =>
            fetch(`${API}/operations/attendance/${schoolId}/student/${s.studentId || s.student_id}/present`, {
                method: 'POST', headers, body: JSON.stringify({ date: attDate })
            }).catch(() => null)
        ));
        showToast('success', `${targets.length} students marked present`);
    };

    const handleDeleteStudent = async (sid) => {
        try {
            const res = await deleteStudent({ schoolId, studentId: sid }).unwrap();
            if (res.success) {
                showToast('success', 'Student deleted successfully');
            } else {
                throw new Error(res.message);
            }
        } catch (e) {
            showToast('error', e.message || 'Failed to delete student');
        } finally {
            setConfirmAction(null);
        }
    };

    const handleBlockStudent = async (sid) => {
        try {
            const res = await updateStudent({ schoolId, studentId: sid, studentData: { status: 'blocked' } }).unwrap();
            if (res.success) {
                showToast('success', 'Student blocked successfully');
            } else {
                throw new Error(res.message);
            }
        } catch (e) {
            showToast('error', e.message || 'Failed to block student');
        } finally {
            setConfirmAction(null);
        }
    };

    // ── Derived data ──────────────────────────────────────────────────────────
    const regularStudents = useMemo(() => students.filter(s => (s.type || s.studentType || '').toLowerCase() !== 'private'), [students]);
    const privateStudents = useMemo(() => students.filter(s => (s.type || s.studentType || '').toLowerCase() === 'private'), [students]);

    const pieData1 = [
        { name: 'Regular', value: regularStudents.length, color: COLORS.regular },
        { name: 'Private', value: privateStudents.length, color: COLORS.private },
    ];

    const enrollmentData = useMemo(() => {
        const byY = {};
        students.forEach(s => {
            const d = s.createdAt || s.created_at;
            if (!d) return;
            const dt = d._seconds ? new Date(d._seconds * 1000) : new Date(d);
            if (isNaN(dt)) return;
            const y = dt.getMonth() >= 3 ? dt.getFullYear() : dt.getFullYear() - 1;
            const key = `${y}-${String(y + 1).slice(2)}`;
            byY[key] = (byY[key] || 0) + 1;
        });
        return Object.entries(byY).sort().map(([k, v]) => ({ session: k, students: v }));
    }, [students]);

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
    const absentCount = attStudents.length - presentCount;
    const pct = attStudents.length > 0 ? Math.round((presentCount / attStudents.length) * 100) : 0;

    const GRID = { stroke: 'rgba(255,255,255,0.04)' };
    const AXIS = { fill: '#64748b', fontSize: 11 };

    if (showAddForm) {
        return (
            <AddStudentPage
                mode={editStudentId ? 'edit' : 'add'}
                studentId={editStudentId}
                onBack={() => { setShowAddForm(false); setEditStudentId(null); }}
                onSuccess={() => { setShowAddForm(false); setEditStudentId(null); showToast('success', editStudentId ? 'Profile updated!' : 'Student added!'); }}
            />
        );
    }

    return (
        <div className="min-h-full">
            {/* ─── Header ── */}
            <div className="page-header flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg">
                        <Users size={20} style={{ color: 'var(--primary-color)' }} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white tracking-tight">Students</h1>
                        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{students.length} total enrolled</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">

                    <button onClick={() => setBulkModalOpen(true)} className="btn-secondary hidden sm:flex"><UploadCloud size={15} /> Import</button>
                    <button onClick={() => { setEditStudentId(null); setShowAddForm(true); }} className="btn-primary"><Plus size={15} /> Add Student</button>
                </div>
            </div>

            {/* ─── Tabs ── */}
            <div className="px-6 pt-4 flex gap-2">
                {[['overview', <GraduationCap size={14} />, 'General List'], ['attendance', <CalendarCheck size={14} />, 'Daily Attendance']].map(([id, icon, label]) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === id ? 'bg-white/10 text-white border border-white/10 shadow-lg' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                    >
                        {icon}{label}
                    </button>
                ))}
            </div>

            {/* ─── OVERVIEW TAB ── */}
            {activeTab === 'overview' && (
                <div className="p-6 space-y-6 flex-col">
                    {/* Pie charts row */}
                    <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Live Overview</p>
                        <div className="flex gap-4 overflow-x-auto pb-1">
                            <MiniPieCard title="Total Students" data={pieData1} loading={sLoading} />
                            {/* Quick stats */}

                        </div>
                    </div>



                    {/* Student table */}
                    <div className="space-y-3">
                        <div className="flex gap-4">
                            <div className="relative flex-1">
                                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input className="input-standard pl-10 w-full" placeholder="Search by name or ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            </div>
                            <div className="w-48">
                                <select className="input-standard bg-slate-900" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                                    <option value="All">All Classes</option>
                                    {classes.map((c, i) => <option key={i} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="glass-card overflow-hidden">
                            {sLoading ? <div className="flex items-center justify-center py-20"><Loader size={26} className="animate-spin text-primary" /></div>
                                : filtered.length === 0 ? (
                                    <div className="text-center py-16"><GraduationCap size={34} className="text-slate-600 mx-auto mb-2" /><p className="text-slate-500">No students found</p></div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="dark-table">
                                            <thead><tr><th>#</th><th>Name</th><th>ID</th><th>Class</th><th>Type</th><th>Joined</th><th>Actions</th></tr></thead>
                                            <tbody>
                                                {filtered.map((s, i) => (
                                                    <motion.tr key={s.studentId || s.student_id || i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.025, 0.4) }}>
                                                        <td className="text-slate-500 text-xs">{i + 1}</td>
                                                        <td><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">{(s.studentName || s.name || 'S')[0].toUpperCase()}</div><span className="font-medium text-white">{s.studentName || s.student_name || s.name || 'N/A'}</span></div></td>
                                                        <td><span className="font-mono text-xs text-secondary">{s.studentId || s.student_id || 'N/A'}</span></td>
                                                        <td><span className="badge bg-primary/15 border-indigo-500/25 text-indigo-300">{s.classId || s.class_id || s.className || 'N/A'}</span></td>
                                                        <td><span className={`badge ${(s.type || s.studentType || '').toLowerCase() === 'private' ? 'bg-secondary/15 border-violet-500/25 text-violet-300' : 'bg-slate-500/15 border-slate-500/25 text-slate-400'}`}>{s.type || s.studentType || 'Regular'}</span></td>
                                                        <td className="text-xs text-slate-500">{fmtDate(s.createdAt || s.created_at)}</td>
                                                        <td><div className="flex gap-1">
                                                            <button onClick={() => setProfileDrawer({ student: s, mode: 'view' })} title="View Profile" className="p-1.5 rounded-lg text-slate-500 hover:text-primary hover:bg-primary/10 transition-colors"><Eye size={14} /></button>
                                                            <button onClick={() => { setEditStudentId(s.studentId || s.student_id); setShowAddForm(true); }} title="Edit Student" className="p-1.5 rounded-lg text-slate-500 hover:text-success hover:bg-emerald-500/10 transition-colors"><Edit3 size={14} /></button>
                                                            <button onClick={() => setConfirmAction({ type: 'block', student: s })} title="Block Student" className="p-1.5 rounded-lg text-slate-500 hover:text-accent hover:bg-amber-500/10 transition-colors"><UserX size={14} /></button>
                                                            <button onClick={() => setConfirmAction({ type: 'delete', student: s })} title="Delete Student" className="p-1.5 rounded-lg text-slate-500 hover:text-accent hover:bg-rose-500/10 transition-colors"><X size={14} /></button>
                                                        </div></td>
                                                    </motion.tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── ATTENDANCE TAB ── */}
            {activeTab === 'attendance' && (
                <div className="p-6 space-y-4">
                    {/* Controls */}
                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="flex items-center gap-2 bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2">
                            <Calendar size={13} className="text-slate-500" />
                            <input type="date" value={attDate} onChange={e => setAttDate(e.target.value)} className="bg-transparent text-sm text-white focus:outline-none" />
                        </div>
                        <select value={attClass} onChange={e => setAttClass(e.target.value)} className="input-dark sm:w-40">
                            <option value="All">All Classes</option>
                            {classes.map((c, i) => <option key={i} value={c}>{c}</option>)}
                        </select>
                        <div className="relative flex-1 min-w-[160px]">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input className="input-dark pl-8 w-full" placeholder="Search student..." value={attSearch} onChange={e => setAttSearch(e.target.value)} />
                        </div>
                        <button onClick={markAllPresent} disabled={isHoliday.isHoliday} className={`btn-primary ${isHoliday.isHoliday ? 'bg-slate-700 cursor-not-allowed' : 'bg-emerald-600/80 hover:bg-emerald-500/80'} ml-auto`}>
                            <CheckCircle size={14} /> Mark All Present
                        </button>
                    </div>

                    {isHoliday.isHoliday && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center gap-3 text-accent">
                            <AlertTriangle size={18} />
                            <div>
                                <p className="text-sm font-bold">School Closed / Holiday</p>
                                <p className="text-xs opacity-80">Attendance cannot be marked on {isHoliday.reason}.</p>
                            </div>
                        </div>
                    )}

                    {/* Stats */}
                    <div className="flex gap-3 flex-wrap">
                        {[['slate', <Users size={13} />, 'Total', attStudents.length], ['emerald', <UserCheck size={13} />, 'Present', presentCount], ['rose', <UserX size={13} />, 'Absent', absentCount]].map(([color, icon, label, val]) => (
                            <div key={label} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm text-${color}-400 bg-${color}-500/10 border-${color}-500/20`}>
                                {icon}<span className="text-xs text-slate-500">{label}</span><span className="font-bold">{val}</span>
                            </div>
                        ))}
                        <div className="ml-auto flex items-center gap-2">
                            <span className="text-lg font-bold text-success">{pct}%</span>
                            <span className="text-xs text-slate-500">Attendance</span>
                        </div>
                    </div>

                    {/* Student attendance list */}
                    <div className="glass-card overflow-hidden">
                        {(sLoading || attLoading) ? (
                            <div className="flex items-center justify-center py-20"><Loader size={26} className="animate-spin text-success" /></div>
                        ) : attStudents.length === 0 ? (
                            <div className="text-center py-16"><ClipboardList size={34} className="text-slate-600 mx-auto mb-2" /><p className="text-slate-500">No students found</p></div>
                        ) : (
                            <div className="divide-y divide-white/[0.04]">
                                <div className="grid grid-cols-[2rem_1fr_auto_auto] gap-3 px-5 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                                    <span>#</span><span>Student</span><span>Class</span><span>Status</span>
                                </div>
                                {attStudents.map((s, i) => {
                                    const sid = s.studentId || s.student_id;
                                    const isPresent = presentIds.has(sid);
                                    const isLoad = !!marking[sid];
                                    const name = s.studentName || s.name || 'N/A';
                                    const cls = s.className || s.classId || '—';
                                    return (
                                        <motion.div key={sid || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.01, 0.3) }}
                                            className={`grid grid-cols-[2rem_1fr_auto_auto] gap-3 items-center px-5 py-3.5 transition-colors ${isPresent ? 'bg-emerald-500/5' : ''}`}>
                                            <span className="text-xs text-slate-600">{i + 1}</span>
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${isPresent ? 'bg-success/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>{name[0]?.toUpperCase()}</div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-white truncate">{name}</p>
                                                    <p className="text-[10px] text-slate-500 font-mono truncate">{sid}</p>
                                                </div>
                                            </div>
                                            <span className="badge bg-primary/15 border-indigo-500/25 text-indigo-300 text-[10px] whitespace-nowrap">{cls}</span>
                                            <button onClick={() => togglePresent(s)} disabled={isLoad || isHoliday.isHoliday}
                                                className={`w-14 h-7 rounded-full relative transition-all ${isPresent ? 'bg-success/20 border-emerald-500/40' : 'bg-slate-700/50 border-white/5'} border ${(isLoad || isHoliday.isHoliday) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}>
                                                <div className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full transition-all shadow-lg ${isPresent ? 'right-1 bg-emerald-400' : 'left-1 bg-slate-500'}`} />
                                            </button>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )
            }

            {/* ─── Profile Drawer ── */}
            <AnimatePresence>
                {profileDrawer && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setProfileDrawer(null)} />
                        <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="drawer-panel p-6 space-y-5">
                            <div className="flex items-center justify-between">
                                <h2 className="font-bold text-white">Student Profile</h2>
                                <div className="flex gap-2">
                                    <button onClick={() => setProfileDrawer(p => ({ ...p, mode: p.mode === 'view' ? 'edit' : 'view' }))} className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 ${profileDrawer.mode === 'edit' ? 'bg-success/20 text-emerald-300' : 'bg-primary/20 text-indigo-300'}`}>
                                        {profileDrawer.mode === 'edit' ? <><CheckCircle size={12} /> View</> : <><Edit3 size={12} /> Edit</>}
                                    </button>
                                    <button onClick={() => setProfileDrawer(null)} className="text-slate-500 hover:text-white p-1.5 hover:bg-white/10 rounded-lg"><X size={18} /></button>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-2xl font-bold text-white">
                                    {(profileDrawer.student.studentName || profileDrawer.student.name || 'S')[0]}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">{profileDrawer.student.studentName || profileDrawer.student.name}</h3>
                                    <p className="text-xs text-primary font-mono">{profileDrawer.student.studentId || profileDrawer.student.student_id}</p>
                                    <span className="badge bg-primary/15 border-indigo-500/25 text-indigo-300 mt-1">{profileDrawer.student.classId || profileDrawer.student.className || 'N/A'}</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                {[['Gender', profileDrawer.student.gender], ['Date of Birth', fmtDate(profileDrawer.student.dob)], ['Father', profileDrawer.student.fatherName || profileDrawer.student.parentName], ['Mother', profileDrawer.student.motherName], ['Contact', profileDrawer.student.contact || profileDrawer.student.phone], ['Address', profileDrawer.student.permanentAddress || profileDrawer.student.address], ['Type', profileDrawer.student.type || profileDrawer.student.studentType || 'Regular'], ['Joined', fmtDate(profileDrawer.student.createdAt || profileDrawer.student.created_at)]]
                                    .filter(([, v]) => v).map(([k, v]) => (
                                        <div key={k} className="flex justify-between items-start py-2 border-b border-white/5 gap-3">
                                            <span className="text-slate-500 text-xs w-28 flex-shrink-0">{k}</span>
                                            <span className="text-xs text-white text-right">{v}</span>
                                        </div>
                                    ))}
                            </div>

                            {/* Fee Breakdown Section */}
                            <ProfileFeeSummary studentId={profileDrawer.student.studentId || profileDrawer.student.student_id} schoolId={schoolId} />

                            {profileDrawer.mode === 'edit' && (
                                <button onClick={() => { setProfileDrawer(null); setShowAddForm(true); }} className="btn-primary w-full justify-center"><Edit3 size={14} /> Open Full Edit Form</button>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className={`fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-xl ${toast.type === 'success' ? 'bg-success/20 border border-emerald-500/30 text-emerald-300' : 'bg-accent/20 border border-rose-500/30 text-rose-300'}`}>
                        {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
                        {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>

            <BulkImportModal isOpen={bulkModalOpen} onClose={() => setBulkModalOpen(false)} title="Bulk Import Students"
                expectedHeaders={['className', 'name', 'gender', 'dob', 'contact', 'parentName', 'parentContact', 'address']}
                onImport={async (payload) => {
                    const res = await fetch(`${API}/students/${schoolId}/students/bulk`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                    const data = await res.json();
                    if (!data.success) throw new Error(data.message || 'Import failed');
                    showToast('success', `Imported ${data.data?.successful || 0} students!`);
                    setBulkModalOpen(false);
                }}
            />

            {/* Confirmation Modal */}
            <AnimatePresence>
                {confirmAction && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmAction(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="glass-card max-w-sm w-full p-6 relative z-10 border-white/10 shadow-2xl">
                            <div className={`w-12 h-12 rounded-2xl mb-4 flex items-center justify-center ${confirmAction.type === 'delete' ? 'bg-accent/20 text-accent' : 'bg-accent/20 text-accent'}`}>
                                {confirmAction.type === 'delete' ? <AlertTriangle size={24} /> : <UserX size={24} />}
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">
                                {confirmAction.type === 'delete' ? 'Confirm Delete' : 'Confirm Block'}
                            </h3>
                            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                                {confirmAction.type === 'delete'
                                    ? `Are you sure you want to permanently delete ${confirmAction.student.name || 'this student'}? This action cannot be undone.`
                                    : "kya app student ka name or class ko delete karna chate hai?"}
                            </p>
                            <div className="flex gap-3">
                                <button onClick={() => setConfirmAction(null)} className="btn-secondary flex-1 justify-center">No</button>
                                <button
                                    onClick={() => confirmAction.type === 'delete' ? handleDeleteStudent(confirmAction.student.studentId || confirmAction.student.student_id) : handleBlockStudent(confirmAction.student.studentId || confirmAction.student.student_id)}
                                    className={`flex-1 justify-center py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg ${confirmAction.type === 'delete' ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-amber-600 hover:bg-amber-500 text-white'}`}
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
