import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CreditCard, Plus, Users, Search, Filter,
    CheckCircle, AlertTriangle, Loader, User, BookOpen,
    PieChart, Percent, Receipt, X, DollarSign, RefreshCw,
    Trash2, Zap, Calendar, Shield, Target, School, TrendingUp
} from 'lucide-react';
import { useForm } from 'react-hook-form';
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
    useRecordPaymentMutation,
    useCreateSchoolFeeMutation
} from '../api/billingApi';
import { useGetStudentsQuery } from '../../students/api/studentApi';
import { FeesListBox, StudentPaymentModal } from '../components/FeesListAndPayment';
import SwitchButton from '../../../components/ui/SwitchButton';
import DropdownWidget from '../../../components/ui/DropdownWidget';
import GlassCard from '../../../components/ui/GlassCard';
import KPITile from '../../../components/ui/KPITile';
import StandardButton from '../../../components/ui/StandardButton';
import FormWidget from '../../../components/ui/FormWidget';

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
    const [createSchoolFee, { isLoading: isCreatingFee }] = useCreateSchoolFeeMutation();
    const [applyCustomFee] = useApplyCustomFeeMutation();
    const [deleteCustomFeeApi] = useDeleteCustomFeeMutation();
    const [recordPayment] = useRecordPaymentMutation();

    const { control, handleSubmit, reset } = useForm({
        defaultValues: {
            feeName: '', amount: '', dueDate: '', feeType: 'regular',
            description: '', applicableClasses: [], discountPercentage: 0
        }
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

    const handleSchoolFeeSubmit = async (data) => {
        try {
            const payload = {
                ...data,
                amount: parseFloat(data.amount) || 0,
                discountPercentage: parseFloat(data.discountPercentage) || 0
            };
            
            await createSchoolFee({ 
                schoolId, 
                feeData: payload
            }).unwrap();
            
            showToast('success', 'School Fee successfully created');
            setShowAddCustom(false);
            reset();
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
        <div className="max-w-full p-1 space-y-2 text-slate-400">
                {/* ─── Combined Header ─── */}
                <header className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-white/5 border border-white/10 flex items-center justify-center">
                            <CreditCard size={12} className="text-success" />
                        </div>
                        <div>
                            <h1 className="text-sm font-black text-white tracking-tight uppercase italic leading-none">FEES_LEDGER</h1>
                            <p className="text-[7px] font-bold text-slate-700 uppercase tracking-widest mt-0.5 whitespace-nowrap">
                                DATASET: {fees.length} RECORDS • {customFees.length} PROTOCOLS
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5">
                            {[
                                { id: 'student', label: 'COLLECTIONS' },
                                { id: 'custom', label: 'PROTOCOLS' }
                            ].map(({ id, label }) => (
                                <button 
                                    key={id} 
                                    onClick={() => setActiveTab(id)}
                                    className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-600 hover:text-slate-400'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        <StandardButton 
                            variant="ghost" 
                            size="xs" 
                            onClick={() => { refetchFees(); refetchCustom(); }} 
                            icon={RefreshCw} 
                            className={loading ? 'animate-spin' : ''}
                        />
                        <StandardButton 
                            variant="primary" 
                            size="xs" 
                            onClick={() => setShowAddCustom(true)} 
                            icon={Plus}
                        >
                            CREATE FEE
                        </StandardButton>
                    </div>
                </header>

                {/* ─── Global Analytics ─── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-1">
                    <KPITile label="Total Collected" value={fmt(analytics.collected)} sub="L_SYNC_OK" icon={CheckCircle} color="success" dense />
                    <KPITile label="Total Overdue" value={fmt(analytics.pending)} sub="BACKLOG_ALRT" icon={AlertTriangle} color="warning" dense />
                    <KPITile label="Active Segments" value={analytics.count} sub="REGISTERD" icon={Users} color="primary" dense />
                    <KPITile label="Fill Velocity" value={`${analytics.rate}%`} sub="ACCEL_LOAD" icon={TrendingUp} color="accent" dense />
                </div>

                {/* ─── OPERATIONAL VIEWPORT ─── */}
                <div className="space-y-1">
                    {activeTab === 'student' ? (
                        <div className="space-y-1">
                            <div className="flex gap-1 items-center">
                                <div className="relative flex-1 group">
                                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-700" />
                                    <input 
                                        className="w-full bg-white/[0.02] border border-white/5 rounded-lg py-1.5 pl-8 pr-3 text-micro text-white placeholder:text-slate-800 focus:outline-none focus:border-primary/20 transition-all font-black uppercase tracking-widest" 
                                        placeholder="SCAN_HASH..." value={search} onChange={e => setSearch(e.target.value)} 
                                    />
                                </div>
                                <div className="w-40 shrink-0">
                                    <DropdownWidget
                                        dense
                                        options={[
                                            { label: 'ALL_STATUS', value: 'All' },
                                            { label: 'PAID', value: 'Paid' },
                                            { label: 'PARTIAL', value: 'Partial' },
                                            { label: 'PENDING', value: 'Pending' }
                                        ]}
                                        value={filter}
                                        onChange={setFilter}
                                    />
                                </div>
                            </div>
                            <div className="border border-white/5 rounded-lg overflow-hidden bg-white/[0.01]">
                                {loading ? (
                                    <div className="py-20 flex flex-col items-center gap-2">
                                        <RefreshCw size={20} className="animate-spin text-slate-800" />
                                        <p className="text-micro font-black text-slate-700 uppercase tracking-widest">SYNCING_LEDGER...</p>
                                    </div>
                                ) : (
                                    <FeesListBox feesList={filtered} onPaymentClick={setSelectedStudent} />
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-1">
                            {customFees.length === 0 ? (
                                <div className="col-span-full py-20 text-center glass-card border-dashed">
                                    <Zap size={24} className="mx-auto mb-2 text-slate-800" />
                                    <p className="text-micro font-black text-slate-700 uppercase tracking-widest">NO_PROTOCOLS_DEFINED</p>
                                </div>
                            ) : (
                                customFees.map((cf, i) => (
                                    <GlassCard key={i} delay={i * 0.01} className="p-2 border border-white/5 bg-white/[0.01] hover:border-success/30" dense hover>
                                        <div className="flex items-start justify-between mb-1">
                                            <div className="w-5 h-5 rounded bg-success/10 flex items-center justify-center text-success"><Zap size={10} /></div>
                                            <StandardButton variant="ghost" size="xs" icon={Trash2} onClick={() => handleDeleteCustomFee(cf.feeId)} className="text-rose-500 opacity-0 group-hover:opacity-100" />
                                        </div>
                                        <h3 className="text-[10px] font-black text-white italic truncate uppercase leading-none">{cf.feeName}</h3>
                                        <div className="mt-2 space-y-0.5">
                                            <p className="text-[8px] font-black text-slate-400 italic">{fmt(cf.amount)}</p>
                                            <p className="text-[6px] font-bold text-slate-700 uppercase tracking-widest">{cf.feeType} • {cf.scope}</p>
                                        </div>
                                    </GlassCard>
                                ))
                            )}
                        </div>
                    )}
                </div>

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
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowAddCustom(false)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="w-full max-w-4xl" onClick={e => e.stopPropagation()}>
                            <FormWidget
                                title="School Fee Definition"
                                description="Define global or class-level fee protocols leveraging the centralized fee distribution matrix."
                                size="small"
                                mode="add"
                                control={control}
                                onSubmit={handleSubmit(handleSchoolFeeSubmit)}
                                onCancel={() => { setShowAddCustom(false); reset(); }}
                                submitLabel="Commit Fee Definition"
                                cancelLabel="Discard"
                                isLoading={isCreatingFee}
                                sections={[
                                    {
                                        id: 'main',
                                        fields: [
                                            { name: 'feeName', label: 'Fee Definition Name', type: 'text', placeholder: 'e.g. Annual Sports Meet Fee', required: true },
                                            { name: 'amount', label: 'Value (₹)', type: 'number', placeholder: '0.00', required: true },
                                            { name: 'dueDate', label: 'Timeline Expiry', type: 'date', required: true },
                                            { name: 'feeType', label: 'Cycle', type: 'select', options: [{label: 'Regular', value: 'regular'}, {label: 'Penalty', value: 'penalty'}, {label: 'Special', value: 'special'}], required: true },
                                            { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Additional fee description conditions...', className: 'md:col-span-2' },
                                            { name: 'applicableClasses', label: 'Target Scope (Applicable Classes)', type: 'checkbox-group', options: derivedClasses.map(c => ({label: c, value: c})), className: 'md:col-span-2' },
                                            { name: 'discountPercentage', label: 'Maximum Subsidy / Discount %', type: 'number', placeholder: '0-100' }
                                        ]
                                    }
                                ]}
                            />
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
    );
}
