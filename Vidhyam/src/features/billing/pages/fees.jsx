import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CreditCard, Plus, Users, Search, Filter,
    CheckCircle, AlertTriangle, Loader, User, BookOpen,
    PieChart, Percent, Receipt, X, DollarSign, RefreshCw,
    Trash2, Zap, Calendar, Shield, Target, School
} from 'lucide-react';
import { getClassesByLevel } from '../../../utils/academicUtils';
import { useSelector } from 'react-redux';
import { selectSchoolId } from '../../auth/authSlice';
import { selectPollingInterval } from '../../settings/settingsSlice';
import { 
    useGetFeesQuery, 
    useGetCustomFeesQuery, 
    useCreateCustomFeeMutation, 
    useDeleteCustomFeeMutation,
    useApplyCustomFeeMutation,
    useRecordPaymentMutation
} from '../api/billingApi';
import { useGetStudentsQuery } from '../../students/api/studentApi';
import { FeesListBox, StudentPaymentModal } from '../components/FeesListAndPayment';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';

export default function FeesManagement() {
    const schoolId = useSelector(selectSchoolId) || "";
    const schoolLevel = localStorage.getItem('schoolLevel') || 10;
    const derivedClasses = getClassesByLevel(schoolLevel);

    const [activeTab, setActiveTab] = useState('student');
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('All');
    const [toast, setToast] = useState(null);
    const [showAddCustom, setShowAddCustom] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);

    // RTK Query hooks
    const pollingInterval = useSelector(selectPollingInterval);
    const { data: fees = [], isLoading: loading, refetch: refetchFees } = useGetFeesQuery(schoolId, { pollingInterval });
    const { data: customFeesRaw = [], isLoading: customLoading, refetch: refetchCustom } = useGetCustomFeesQuery(schoolId, { pollingInterval });
    const { data: studentsData = [] } = useGetStudentsQuery(schoolId, { pollingInterval });
    
    // Fallback/Transform custom fees
    const customFees = customFeesRaw.data || customFeesRaw || [];
    const students = studentsData.data || studentsData || [];

    const [createCustomFee] = useCreateCustomFeeMutation();
    const [applyCustomFee] = useApplyCustomFeeMutation();
    const [deleteCustomFeeApi] = useDeleteCustomFeeMutation();
    const [recordPayment] = useRecordPaymentMutation();

    const [newFee, setNewFee] = useState({
        feeName: '', amount: '', feeType: 'one_time',
        scope: 'school', targetClasses: [], targetStudents: [],
        dueDate: '', hasPenalty: false, penaltyPerDay: '', description: ''
    });

    const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); };

    // Derived stats from RTK Query data
    const analytics = useMemo(() => {
        const collected = fees.reduce((a, f) => a + f.paid, 0);
        const pending = fees.reduce((a, f) => a + f.pending, 0);
        const total = collected + pending;
        return {
            collected,
            pending,
            count: fees.length,
            rate: total > 0 ? Math.round((collected / total) * 100) : 0
        };
    }, [fees]);

    const handleCreateCustomFee = async () => {
        if (!newFee.feeName || !newFee.amount) return;
        try {
            const res = await createCustomFee({ 
                schoolId, 
                feeData: { ...newFee, amount: parseFloat(newFee.amount), penaltyPerDay: parseFloat(newFee.penaltyPerDay) || 0 } 
            }).unwrap();
            
            showToast('success', 'Custom fee created');
            setShowAddCustom(false);
            setNewFee({ feeName: '', amount: '', feeType: 'one_time', scope: 'school', targetClasses: [], targetStudents: [], dueDate: '', hasPenalty: false, penaltyPerDay: '', description: '' });
            
            if (res.data?.feeId) {
                await applyCustomFee({ schoolId, feeId: res.data.feeId }).unwrap();
            }
        } catch (e) {
            showToast('error', e.data?.message || 'Failed to create fee');
        }
    };

    const handleDeleteCustomFee = async (feeId) => {
        try {
            await deleteCustomFeeApi({ schoolId, feeId }).unwrap();
            showToast('success', 'Fee deleted');
        } catch {
            showToast('error', 'Delete failed');
        }
    };

    const handlePaymentSubmit = async ({ studentId, paymentData }) => {
        try {
            await recordPayment({ schoolId, paymentData: { ...paymentData, student_id: studentId } }).unwrap();
            showToast('success', 'Payment recorded successfully');
            setSelectedStudent(null);
        } catch (e) {
            showToast('error', e.data?.message || 'Failed to record payment');
        }
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

    const calculatePenalty = (dueDate, penaltyPerDay, alreadyPaid = false) => {
        if (!dueDate || !penaltyPerDay || alreadyPaid) return 0;
        const due = new Date(dueDate);
        const today = new Date();
        if (today <= due) return 0;

        const diffTime = Math.abs(today - due);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays * Number(penaltyPerDay);
    };

    const filtered = fees.filter(f => {
        const matchSearch = f.name.toLowerCase().includes(search.toLowerCase()) || f.studentId.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === 'All' || f.status === filter;
        return matchSearch && matchFilter;
    });

    const scopeLabel = (s) => ({ school: 'Whole School', class: 'Selected Classes', student: 'Selected Students' }[s] || s);
    const scopeColor = (s) => ({ school: 'text-primary bg-primary/15 border-primary/25', class: 'text-secondary bg-secondary/15 border-secondary/25', student: 'text-accent bg-accent/15 border-accent/25' }[s] || '');

    return (
        <div className="min-h-full page-bg text-slate-300">
            <div className="container mx-auto p-6 max-w-[1600px]">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg">
                            <CreditCard size={24} className="text-success" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-white tracking-tight">Fees Ledger</h1>
                            <p className="text-sm font-medium text-slate-500 uppercase tracking-[0.2em] mt-1">{fees.length} active records • {customFees.length} definitions</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => { refetchFees(); refetchCustom(); }} className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-300">
                            <RefreshCw size={18} />
                        </button>
                        {activeTab === 'custom' && (
                            <button onClick={() => setShowAddCustom(true)} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-bold hover:brightness-110 shadow-lg shadow-primary/20 transition-all duration-300 active:scale-95">
                                <Plus size={18} /> Create Fee
                            </button>
                        )}
                    </div>
                </div>

            {/* Content Tabs */}
            <div className="px-6 pt-6 flex gap-2">
                {[
                    { id: 'student', icon: DollarSign, label: 'Collection' },
                    { id: 'custom', icon: Zap, label: 'Custom Fees' }
                ].map(({ id, icon: Icon, label }) => (
                    <button key={id} onClick={() => setActiveTab(id)}
                        className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border
                            ${activeTab === id 
                                ? 'bg-success/10 text-success border-success/25 shadow-lg shadow-success/5' 
                                : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-white/5'}`}>
                        <Icon size={14} />{label}
                    </button>
                ))}
            </div>

            {/* Student Fees View */}
            {activeTab === 'student' && (
                <div className="p-6 space-y-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Collected', value: fmt(analytics.collected), icon: CheckCircle, color: 'text-success', bg: 'bg-success/15' },
                            { label: 'Total Overdue', value: fmt(analytics.pending), icon: AlertTriangle, color: 'text-accent', bg: 'bg-accent/15' },
                            { label: 'Active Students', value: analytics.count, icon: Users, color: 'text-primary', bg: 'bg-primary/15' },
                            { label: 'Fulfillment', value: `${analytics.rate}%`, icon: Percent, color: 'text-secondary', bg: 'bg-secondary/15' },
                        ].map(({ label, value, icon: Icon, color, bg }, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                                className="glass-card p-6 flex flex-col items-center text-center">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border border-white/5 ${bg}`}>
                                    <Icon size={20} className={color} />
                                </div>
                                <p className={`text-2xl font-black ${color}`}>{value}</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">{label}</p>
                            </motion.div>
                        ))}
                    </div>

                    {/* Filter Engine */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-8">
                        <div className="relative flex-1">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input className="input-standard pl-12 h-14 bg-slate-900/50" 
                                placeholder="Search records by student name or ID..." value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <div className="flex gap-2">
                             <select className="input-standard sm:w-48 h-14 bg-slate-900/50 text-xs font-bold uppercase tracking-widest" 
                                value={filter} onChange={e => setFilter(e.target.value)}>
                                <option value="All">All Status</option>
                                <option value="Paid">Fully Paid</option>
                                <option value="Partial">Partial Pay</option>
                                <option value="Pending">Outstanding</option>
                            </select>
                        </div>
                    </div>

                    {/* Unified Ledger Table */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-4">
                            <div className="w-12 h-12 border-4 border-success/20 border-t-success rounded-full animate-spin" />
                            <p className="text-xs font-black text-slate-500 uppercase tracking-[0.25em]">Syncing Ledger Data...</p>
                        </div>
                    ) : (
                        <FeesListBox feesList={filtered} onPaymentClick={(s) => setSelectedStudent(s)} />
                    )}
                </div>
            )}

            {/* Custom Fees Inventory */}
            {activeTab === 'custom' && (
                <div className="p-6 space-y-6">
                    {customLoading ? (
                        <div className="flex flex-col items-center justify-center py-32 space-y-4">
                            <Loader size={32} className="animate-spin text-success" />
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Loading Definitions...</p>
                        </div>
                    ) : customFees.length === 0 ? (
                        <div className="text-center py-20 bg-white/[0.01] rounded-3xl border border-dashed border-white/5">
                            <Zap size={48} className="text-slate-800 mx-auto mb-4" />
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Inventory is empty</p>
                            <button onClick={() => setShowAddCustom(true)} className="btn-primary mt-6 px-10">Configure First Fee</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {customFees.map((cf, i) => (
                                <motion.div key={cf.feeId || i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                                    className="glass-card p-6 border-white/5 bg-white/[0.02] hover:border-success/30 transition-all group relative overflow-hidden">
                                     <div className="absolute top-0 right-0 p-4">
                                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black border uppercase tracking-[0.15em] ${scopeColor(cf.scope)}`}>
                                            {scopeLabel(cf.scope)}
                                        </span>
                                    </div>
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-success/20 to-primary/10 flex items-center justify-center mb-6 border border-success/10 shadow-lg shadow-success/5">
                                        <Zap size={20} className="text-success" />
                                    </div>
                                    <h3 className="text-base font-black text-white uppercase tracking-tight mb-2">{cf.feeName}</h3>
                                    {cf.description && <p className="text-xs text-slate-500 font-medium line-clamp-2 mb-6">{cf.description}</p>}
                                    
                                    <div className="space-y-3 pt-6 border-t border-white/5">
                                        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                                            <div className="p-1.5 rounded-lg bg-success/10 text-success"><DollarSign size={12} /></div>
                                            <span className="uppercase tracking-widest">{fmt(cf.amount)} • {cf.feeType === 'one_time' ? 'One-time' : 'Recurring'}</span>
                                        </div>
                                        {cf.dueDate && (
                                            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                                                <div className="p-1.5 rounded-lg bg-primary/10 text-primary"><Calendar size={12} /></div>
                                                <span className="uppercase tracking-widest">Valid Until: {fmtDate(cf.dueDate)}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-8 pt-6 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                                        <button onClick={() => handleDeleteCustomFee(cf.feeId)} className="w-full py-2.5 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all">
                                            Revoke Definition
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Payment Modal Wrapper */}
            <AnimatePresence>
                {selectedStudent && (
                    <StudentPaymentModal 
                        student={{...selectedStudent, schoolId}} 
                        onClose={() => setSelectedStudent(null)} 
                        onSubmit={handlePaymentSubmit}
                        calculatePenalty={calculatePenalty}
                    />
                )}
            </AnimatePresence>

            {/* Config Modals & Toast */}
            <AnimatePresence>
                {showAddCustom && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setShowAddCustom(false)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="modal-box text-white bg-slate-900 border-none rounded-3xl p-8 max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                             <div className="flex items-center justify-between mb-8">
                                <h3 className="text-lg font-black uppercase tracking-tight">Configure New Fee</h3>
                                <button onClick={() => setShowAddCustom(false)} className="text-slate-500 hover:text-white p-2 hover:bg-white/5 rounded-xl transition-all"><X size={20} /></button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Fee Definition Name</label>
                                    <input className="input-dark h-14 bg-white/5 border-white/5" placeholder="e.g. Annual Sports Meet Fee" value={newFee.feeName} onChange={e => setNewFee(f => ({ ...f, feeName: e.target.value }))} />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Value (₹)</label>
                                        <input type="number" className="input-dark h-14 bg-white/5 border-white/5" placeholder="0.00" value={newFee.amount} onChange={e => setNewFee(f => ({ ...f, amount: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Cycle</label>
                                        <select className="input-dark h-14 bg-white/5 border-white/5 text-[10px] uppercase font-bold" value={newFee.feeType} onChange={e => setNewFee(f => ({ ...f, feeType: e.target.value }))}>
                                            <option value="one_time">One-time</option>
                                            <option value="recurring">Recurring</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block text-center">Implementation Scope</label>
                                    <div className="flex gap-2">
                                        {[['school', 'Global', School], ['class', 'Target Classes', BookOpen], ['student', 'Granular', User]].map(([val, label, Icon]) => (
                                            <button key={val} onClick={() => setNewFee(f => ({ ...f, scope: val, targetClasses: [], targetStudents: [] }))}
                                                className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-2xl text-[10px] font-black border transition-all uppercase tracking-widest
                                                    ${newFee.scope === val ? 'bg-primary border-primary/80 text-white shadow-lg shadow-primary/20' : 'bg-white/5 border-transparent text-slate-500 hover:text-slate-300'}`}>
                                                <Icon size={16} />{label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {newFee.scope === 'class' && (
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Select Classes</label>
                                        <div className="flex flex-wrap gap-2 p-4 bg-white/5 rounded-2xl border border-white/5 max-h-40 overflow-y-auto">
                                            {derivedClasses.map(c => (
                                                <button key={c} onClick={() => toggleClass(c)}
                                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all uppercase tracking-widest
                                                        ${newFee.targetClasses.includes(c) ? 'bg-success/20 border-success/30 text-success' : 'bg-slate-800/50 border-white/5 text-slate-500 hover:text-white'}`}>
                                                    {c}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {newFee.scope === 'student' && (
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Student Selection</label>
                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 max-h-48 overflow-y-auto space-y-2">
                                            {students.length === 0 ? <p className="text-[10px] text-slate-500 font-bold uppercase py-4 text-center">No cohorts found</p> : students.map(s => {
                                                const sid = s.studentId || s.student_id;
                                                const name = s.name || s.studentName || sid;
                                                return (
                                                    <label key={sid} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-white/5">
                                                        <input type="checkbox" checked={newFee.targetStudents.includes(sid)} onChange={() => toggleStudent(sid)} className="w-4 h-4 rounded bg-white/10 border-white/10 checked:bg-primary transition-all opacity-0 peer absolute" />
                                                        <div className="w-4 h-4 border border-white/20 rounded-md flex items-center justify-center transition-all peer-checked:bg-primary peer-checked:border-primary">
                                                            <CheckCircle size={12} className="text-white opacity-0 peer-checked:opacity-100" />
                                                        </div>
                                                        <span className="text-xs font-bold text-white uppercase">{name}</span>
                                                        <span className="text-[9px] text-slate-600 font-mono ml-auto">{sid}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Timeline Expiry</label>
                                    <input type="date" className="input-dark h-14 bg-white/5 border-white/5" value={newFee.dueDate} onChange={e => setNewFee(f => ({ ...f, dueDate: e.target.value }))} />
                                </div>
                            </div>

                            <div className="flex gap-4 justify-end mt-10 pt-8 border-t border-white/5">
                                <button onClick={() => setShowAddCustom(false)} className="px-8 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all bg-white/5 rounded-2xl">
                                    Cancel
                                </button>
                                <button onClick={handleCreateCustomFee} className="px-10 py-3 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all">
                                    Commit Definition
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Global Notify */}
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, scale: 0.9, x: 20 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9, x: 20 }}
                        className={`fixed bottom-8 right-8 z-[200] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-md
                            ${toast.type === 'success' 
                                ? 'bg-success/20 border-success/30 text-success' 
                                : 'bg-accent/20 border-accent/30 text-accent'}`}>
                        {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                        <span className="text-[10px] font-black uppercase tracking-widest">{toast.msg}</span>
                    </motion.div>
                )}
            </AnimatePresence>
            </div>
        </div>
    );
}
