import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CreditCard, Plus, Users, Search, Filter,
    CheckCircle, AlertTriangle, Loader, User, BookOpen,
    PieChart, Percent, Receipt, X, DollarSign, RefreshCw
} from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080/api";
const getSchoolId = () => localStorage.getItem('schoolId') || "622079";

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';

export default function FeesManagement() {
    const schoolId = getSchoolId();
    const [fees, setFees] = useState([]);
    const [stats, setStats] = useState({ totalCollected: 0, totalPending: 0, totalStudents: 0, rate: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('All');
    const [toast, setToast] = useState(null);

    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchFees = async () => {
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
            setStats({
                totalCollected: collected,
                totalPending: pending,
                totalStudents: list.length,
                rate: total > 0 ? Math.round((collected / total) * 100) : 0
            });
        } catch (e) {
            showToast('error', 'Could not load fees');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchFees(); }, [schoolId]);

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
                        <p className="text-xs text-slate-500">{fees.length} records</p>
                    </div>
                </div>
                <button onClick={fetchFees} className="btn-secondary p-2"><RefreshCw size={15} /></button>
            </div>

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
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${bg}`}>
                                <Icon size={17} className={color} />
                            </div>
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
                        <option value="All">All Status</option>
                        <option value="Paid">Paid</option>
                        <option value="Partial">Partial</option>
                        <option value="Pending">Pending</option>
                    </select>
                </div>

                {/* Table */}
                <div className="glass-card overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader size={28} className="animate-spin text-indigo-400" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-14">
                            <CreditCard size={36} className="text-slate-600 mx-auto mb-2" />
                            <p className="text-slate-500">No fee records found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="dark-table">
                                <thead>
                                    <tr>
                                        <th>Student</th><th>Class</th><th>Total</th><th>Paid</th><th>Pending</th><th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((f, i) => (
                                        <tr key={f.id}>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center">
                                                        <User size={13} className="text-violet-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-white text-xs font-medium">{f.name}</p>
                                                        <p className="text-slate-600 text-xs font-mono">{f.studentId}</p>
                                                    </div>
                                                </div>
                                            </td>
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

            {/* Toast */}
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
