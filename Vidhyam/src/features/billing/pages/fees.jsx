import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CreditCard, Plus, Users, Search, Filter,
    CheckCircle, AlertTriangle, Loader, User, BookOpen,
    PieChart, Percent, Receipt, X, DollarSign, RefreshCw,
    Trash2, Zap, Calendar, Shield, Target, School
} from 'lucide-react';
import { getClassesByLevel } from '../../../utils/academicUtils';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080/api";
const getSchoolId = () => localStorage.getItem('schoolId') || "622079";

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';

export default function FeesManagement() {
    const schoolId = getSchoolId();
    const schoolLevel = localStorage.getItem('schoolLevel') || 10;
    const derivedClasses = getClassesByLevel(schoolLevel);

    const [activeTab, setActiveTab] = useState('student'); // 'student' | 'custom'
    const [fees, setFees] = useState([]);
    const [customFees, setCustomFees] = useState([]);
    const [stats, setStats] = useState({ totalCollected: 0, totalPending: 0, totalStudents: 0, rate: 0 });
    const [loading, setLoading] = useState(true);
    const [customLoading, setCustomLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('All');
    const [toast, setToast] = useState(null);
    const [showAddCustom, setShowAddCustom] = useState(false);
    const [students, setStudents] = useState([]);

    const [newFee, setNewFee] = useState({
        feeName: '', amount: '', feeType: 'one_time',
        scope: 'school', targetClasses: [], targetStudents: [],
        dueDate: '', hasPenalty: false, penaltyPerDay: '', description: ''
    });

    const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); };

    const fetchStudentFees = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/fees/${schoolId}`);
            const data = await res.json();
            const list = (data.data || data || []).map((f, i) => ({
                id: f.fee_id || f.id || i,
                name: f.student_name || f.studentName || 'Unknown',
                studentId: f.student_id || f.studentId || `S-${i}`,
                class: f.class_id || f.classId || 'N/A',
                amount: Number(f.total_amount || f.amount || 0),
                paid: Number(f.amount_paid || f.paid || 0),
                pending: Number(f.total_amount || f.amount || 0) - Number(f.amount_paid || f.paid || 0),
                status: (f.amount_paid || f.paid) >= (f.total_amount || f.amount) ? 'Paid' : (f.amount_paid || f.paid) > 0 ? 'Partial' : 'Pending',
                date: f.created_at || f.createdAt,
            }));
            const collected = list.reduce((a, f) => a + f.paid, 0);
            const pending = list.reduce((a, f) => a + f.pending, 0);
            const total = collected + pending;
            setFees(list);
            setStats({ totalCollected: collected, totalPending: pending, totalStudents: list.length, rate: total > 0 ? Math.round((collected / total) * 100) : 0 });
        } catch { showToast('error', 'Could not load fees'); }
        finally { setLoading(false); }
    }, [schoolId]);

    const fetchCustomFees = useCallback(async () => {
        setCustomLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/fees/${schoolId}/custom`);
            const data = await res.json();
            setCustomFees(data.data || []);
        } catch { showToast('error', 'Could not load custom fees'); }
        finally { setCustomLoading(false); }
    }, [schoolId]);

    const fetchStudents = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/students/${schoolId}/students`);
            const data = await res.json();
            setStudents(data.data || data.students || []);
        } catch { }
    }, [schoolId]);

    useEffect(() => { fetchStudentFees(); fetchCustomFees(); fetchStudents(); }, [fetchStudentFees, fetchCustomFees, fetchStudents]);

    const createCustomFee = async () => {
        if (!newFee.feeName || !newFee.amount) return;
        try {
            const res = await fetch(`${API_BASE_URL}/fees/${schoolId}/custom`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newFee, amount: parseFloat(newFee.amount), penaltyPerDay: parseFloat(newFee.penaltyPerDay) || 0 })
            });
            const data = await res.json();
            if (data.success) {
                showToast('success', 'Custom fee created');
                setShowAddCustom(false);
                setNewFee({ feeName: '', amount: '', feeType: 'one_time', scope: 'school', targetClasses: [], targetStudents: [], dueDate: '', hasPenalty: false, penaltyPerDay: '', description: '' });
                // Auto-apply the fee to students
                if (data.data?.feeId) {
                    await fetch(`${API_BASE_URL}/fees/${schoolId}/custom/${data.data.feeId}/apply`, { method: 'POST' });
                }
                fetchCustomFees();
            } else { showToast('error', data.message || 'Failed'); }
        } catch { showToast('error', 'Network error'); }
    };

    const deleteCustomFee = async (feeId) => {
        try {
            await fetch(`${API_BASE_URL}/fees/${schoolId}/custom/${feeId}`, { method: 'DELETE' });
            showToast('success', 'Fee deleted');
            fetchCustomFees();
        } catch { showToast('error', 'Delete failed'); }
    };

    const toggleClass = (cls) => {
        setNewFee(f => ({
            ...f,
            targetClasses: f.targetClasses.includes(cls)
                ? f.targetClasses.filter(c => c !== cls)
                : [...f.targetClasses, cls]
        }));
    };

    const toggleStudent = (sid) => {
        setNewFee(f => ({
            ...f,
            targetStudents: f.targetStudents.includes(sid)
                ? f.targetStudents.filter(s => s !== sid)
                : [...f.targetStudents, sid]
        }));
    };

    const filtered = fees.filter(f => {
        const matchSearch = f.name.toLowerCase().includes(search.toLowerCase()) || f.studentId.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === 'All' || f.status === filter;
        return matchSearch && matchFilter;
    });

    const statusBadge = (s) => ({
        Paid: 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400',
        Partial: 'bg-amber-500/15 border-amber-500/25 text-amber-400',
        Pending: 'bg-rose-500/15 border-rose-500/25 text-rose-400',
    }[s] || '');

    const scopeLabel = (s) => ({ school: 'Whole School', class: 'Selected Classes', student: 'Selected Students' }[s] || s);
    const scopeColor = (s) => ({ school: 'text-indigo-400 bg-indigo-500/15 border-indigo-500/25', class: 'text-violet-400 bg-violet-500/15 border-violet-500/25', student: 'text-amber-400 bg-amber-500/15 border-amber-500/25' }[s] || '');

    return (
        <div className="min-h-full">
            {/* Header */}
            <div className="page-header flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                        <CreditCard size={18} className="text-emerald-400" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-white">Fees Management</h1>
                        <p className="text-xs text-slate-500">{fees.length} student records • {customFees.length} custom fees</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => { fetchStudentFees(); fetchCustomFees(); }} className="btn-secondary p-2"><RefreshCw size={15} /></button>
                    {activeTab === 'custom' && (
                        <button onClick={() => setShowAddCustom(true)} className="btn-primary"><Plus size={15} /> Add Custom Fee</button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="px-6 pt-4 flex gap-1">
                {[['student', <DollarSign size={13} />, 'Student Fees'], ['custom', <Zap size={13} />, 'Custom Fees']].map(([id, icon, label]) => (
                    <button key={id} onClick={() => setActiveTab(id)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === id ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>
                        {icon}{label}
                    </button>
                ))}
            </div>

            {/* ── Student Fees Tab ── */}
            {activeTab === 'student' && (
                <div className="p-6 space-y-5">
                    {/* Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'Collected', value: fmt(stats.totalCollected), icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
                            { label: 'Pending', value: fmt(stats.totalPending), icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/15' },
                            { label: 'Students', value: stats.totalStudents, icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-500/15' },
                            { label: 'Collection Rate', value: `${stats.rate}%`, icon: Percent, color: 'text-violet-400', bg: 'bg-violet-500/15' },
                        ].map(({ label, value, icon: Icon, color, bg }, i) => (
                            <div key={i} className="glass-card p-5">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${bg}`}><Icon size={17} className={color} /></div>
                                <p className={`text-xl font-bold ${color}`}>{value}</p>
                                <p className="text-slate-500 text-xs mt-0.5">{label}</p>
                            </div>
                        ))}
                    </div>
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input className="input-dark pl-9" placeholder="Search student..." value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <select className="input-dark sm:w-40" value={filter} onChange={e => setFilter(e.target.value)}>
                            <option value="All">All Status</option><option value="Paid">Paid</option><option value="Partial">Partial</option><option value="Pending">Pending</option>
                        </select>
                    </div>
                    {/* Table */}
                    <div className="glass-card overflow-hidden">
                        {loading ? (
                            <div className="flex items-center justify-center py-20"><Loader size={28} className="animate-spin text-indigo-400" /></div>
                        ) : filtered.length === 0 ? (
                            <div className="text-center py-14"><CreditCard size={36} className="text-slate-600 mx-auto mb-2" /><p className="text-slate-500">No fee records found</p></div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="dark-table">
                                    <thead><tr><th>Student</th><th>Class</th><th>Total</th><th>Paid</th><th>Pending</th><th>Status</th></tr></thead>
                                    <tbody>
                                        {filtered.map((f) => (
                                            <tr key={f.id}>
                                                <td><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center"><User size={13} className="text-violet-400" /></div><div><p className="text-white text-xs font-medium">{f.name}</p><p className="text-slate-600 text-xs font-mono">{f.studentId}</p></div></div></td>
                                                <td><span className="badge bg-indigo-500/10 border-indigo-500/20 text-indigo-400">{f.class}</span></td>
                                                <td className="text-slate-300 text-xs">{fmt(f.amount)}</td>
                                                <td className="text-emerald-400 text-xs font-medium">{fmt(f.paid)}</td>
                                                <td className="text-rose-400 text-xs font-medium">{fmt(f.pending)}</td>
                                                <td><span className={`badge ${statusBadge(f.status)}`}>{f.status}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Custom Fees Tab ── */}
            {activeTab === 'custom' && (
                <div className="p-6 space-y-4">
                    {customLoading ? (
                        <div className="flex items-center justify-center py-20"><Loader size={28} className="animate-spin text-emerald-400" /></div>
                    ) : customFees.length === 0 ? (
                        <div className="text-center py-14">
                            <Zap size={36} className="text-slate-600 mx-auto mb-2" />
                            <p className="text-slate-500">No custom fees yet</p>
                            <button onClick={() => setShowAddCustom(true)} className="btn-primary mt-4"><Plus size={15} /> Create First Custom Fee</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {customFees.map((cf, i) => (
                                <motion.div key={cf.feeId || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                                    className="glass-card p-5 hover-card flex flex-col group relative">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-teal-500/30 flex items-center justify-center">
                                            <Zap size={17} className="text-emerald-400" />
                                        </div>
                                        <span className={`badge ${scopeColor(cf.scope)}`}>{scopeLabel(cf.scope)}</span>
                                    </div>
                                    <h3 className="font-bold text-white text-sm mb-1">{cf.feeName}</h3>
                                    {cf.description && <p className="text-xs text-slate-500 mb-2 line-clamp-2">{cf.description}</p>}
                                    <div className="space-y-1.5 mb-3">
                                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                            <DollarSign size={12} className="text-emerald-400" />
                                            <span>{fmt(cf.amount)} • {cf.feeType === 'one_time' ? 'One-time' : 'Recurring'}</span>
                                        </div>
                                        {cf.dueDate && (
                                            <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                                <Calendar size={12} className="text-indigo-400" />
                                                <span>Due: {fmtDate(cf.dueDate)}</span>
                                            </div>
                                        )}
                                        {cf.hasPenalty && (
                                            <div className="flex items-center gap-2 text-[11px] text-rose-400">
                                                <AlertTriangle size={12} />
                                                <span>₹{cf.penaltyPerDay}/day late penalty</span>
                                            </div>
                                        )}
                                        {cf.scope === 'class' && cf.targetClasses?.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {cf.targetClasses.map(c => <span key={c} className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">{c}</span>)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-auto pt-3 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => deleteCustomFee(cf.feeId)} className="btn-danger w-full justify-center text-xs py-1.5"><Trash2 size={12} /> Remove</button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Add Custom Fee Modal ── */}
            <AnimatePresence>
                {showAddCustom && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setShowAddCustom(false)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="modal-box max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="font-bold text-white">Add Custom Fee</h3>
                                <button onClick={() => setShowAddCustom(false)} className="text-slate-500 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-all"><X size={18} /></button>
                            </div>

                            <div className="space-y-4">
                                {/* Name */}
                                <div>
                                    <label className="section-label text-xs mb-1.5 flex items-center gap-2"><Zap size={13} className="text-emerald-400" /> Fee Name</label>
                                    <input className="input-dark" placeholder="e.g. Tour Fee, Paper Fee, Fine" value={newFee.feeName} onChange={e => setNewFee(f => ({ ...f, feeName: e.target.value }))} />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {/* Amount */}
                                    <div>
                                        <label className="section-label text-xs mb-1.5">Amount (₹)</label>
                                        <input type="number" className="input-dark" placeholder="0" value={newFee.amount} onChange={e => setNewFee(f => ({ ...f, amount: e.target.value }))} />
                                    </div>
                                    {/* Type */}
                                    <div>
                                        <label className="section-label text-xs mb-1.5">Type</label>
                                        <select className="input-dark" value={newFee.feeType} onChange={e => setNewFee(f => ({ ...f, feeType: e.target.value }))}>
                                            <option value="one_time">One-time</option>
                                            <option value="recurring">Recurring</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Scope */}
                                <div>
                                    <label className="section-label text-xs mb-1.5 flex items-center gap-2"><Target size={13} className="text-indigo-400" /> Apply To</label>
                                    <div className="flex gap-2">
                                        {[['school', 'Whole School', School], ['class', 'Selected Classes', BookOpen], ['student', 'Selected Students', User]].map(([val, label, Icon]) => (
                                            <button key={val} onClick={() => setNewFee(f => ({ ...f, scope: val, targetClasses: [], targetStudents: [] }))}
                                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium border transition-all ${newFee.scope === val ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' : 'bg-slate-800/60 border-white/5 text-slate-500 hover:text-white'}`}>
                                                <Icon size={13} />{label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Class selector */}
                                {newFee.scope === 'class' && (
                                    <div>
                                        <label className="section-label text-xs mb-1.5">Select Classes</label>
                                        <div className="flex flex-wrap gap-1.5 p-3 bg-slate-800/60 rounded-xl border border-white/5 max-h-32 overflow-y-auto">
                                            {derivedClasses.map(c => (
                                                <button key={c} onClick={() => toggleClass(c)}
                                                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${newFee.targetClasses.includes(c) ? 'bg-violet-500/20 border-violet-500/30 text-violet-300' : 'bg-slate-700/50 border-white/5 text-slate-400 hover:text-white'}`}>
                                                    {c}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Student selector */}
                                {newFee.scope === 'student' && (
                                    <div>
                                        <label className="section-label text-xs mb-1.5">Select Students</label>
                                        <div className="p-3 bg-slate-800/60 rounded-xl border border-white/5 max-h-40 overflow-y-auto space-y-1">
                                            {students.length === 0 ? <p className="text-xs text-slate-500">No students loaded</p> : students.map(s => {
                                                const sid = s.studentId || s.student_id;
                                                const name = s.name || s.studentName || sid;
                                                return (
                                                    <label key={sid} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-white/5 rounded px-1">
                                                        <input type="checkbox" checked={newFee.targetStudents.includes(sid)} onChange={() => toggleStudent(sid)} className="accent-indigo-500" />
                                                        <span className="text-xs text-white">{name}</span>
                                                        <span className="text-[10px] text-slate-500 font-mono">{sid}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Due Date */}
                                <div>
                                    <label className="section-label text-xs mb-1.5 flex items-center gap-2"><Calendar size={13} className="text-indigo-400" /> Due Date</label>
                                    <input type="date" className="input-dark" value={newFee.dueDate} onChange={e => setNewFee(f => ({ ...f, dueDate: e.target.value }))} />
                                </div>

                                {/* Penalty */}
                                <div className="p-3 bg-slate-800/40 rounded-xl border border-white/5 space-y-3">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative inline-flex items-center">
                                            <input type="checkbox" className="sr-only peer" checked={newFee.hasPenalty} onChange={e => setNewFee(f => ({ ...f, hasPenalty: e.target.checked }))} />
                                            <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600 peer-checked:after:bg-white"></div>
                                        </div>
                                        <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">Enable Late Penalty</span>
                                    </label>
                                    {newFee.hasPenalty && (
                                        <div>
                                            <label className="section-label text-xs mb-1">Penalty per day (₹)</label>
                                            <input type="number" className="input-dark" placeholder="e.g. 10" value={newFee.penaltyPerDay} onChange={e => setNewFee(f => ({ ...f, penaltyPerDay: e.target.value }))} />
                                        </div>
                                    )}
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="section-label text-xs mb-1.5">Description (Optional)</label>
                                    <textarea className="input-dark h-16 resize-none" placeholder="Short description..." value={newFee.description} onChange={e => setNewFee(f => ({ ...f, description: e.target.value }))} />
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-white/5">
                                <button onClick={() => setShowAddCustom(false)} className="btn-secondary">Cancel</button>
                                <button onClick={createCustomFee} className="btn-primary px-6">Create & Apply</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className={`fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-xl ${toast.type === 'success' ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/20 border border-rose-500/30 text-rose-300'}`}>
                        {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
                        {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
