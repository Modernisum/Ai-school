import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CreditCard, DollarSign, Users, Search, Filter, CheckCircle, AlertTriangle, Loader,
    User, BookOpen, PieChart, Percent, Receipt, X, RefreshCw, Trash2, Zap, Calendar,
    Shield, Target, School, IndianRupee, FileText, Box, Plus, TrendingUp
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
import { useGetEmployeesQuery, useGetSalaryBreakdownQuery, useCloseMonthMutation } from '../../employees/api/employeeApi';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';

// Salary Row Component
const SalaryRow = ({ label, value, type = 'normal', prefix = '' }) => {
    const colorClass = type === 'bonus' ? 'text-green-400' : type === 'deduction' ? 'text-rose-400' : 'text-slate-400';
    const valueClass = type === 'total' ? 'text-white font-bold' : type === 'net' ? 'text-indigo-400 font-black text-lg' : 'text-white font-medium';
    
    return (
        <div className={`flex justify-between text-sm ${type === 'net' ? 'mt-2 pt-2 border-t border-white/10' : ''}`}>
            <span className={colorClass}>{label}</span>
            <span className={valueClass}>
                {prefix} {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(value)}
            </span>
        </div>
    );
};

// Salary Breakdown Modal
const BreakdownModal = ({ employee, onClose, schoolId }) => {
    const { data: breakdownData, isLoading, error } = useGetSalaryBreakdownQuery(
        { schoolId, employeeId: employee.employeeId },
        { skip: !employee }
    );

    const [closeMonth, { isLoading: isClosing }] = useCloseMonthMutation();

    const handleCloseMonth = async () => {
        try {
            await closeMonth({ schoolId, employeeId: employee.employeeId }).unwrap();
            onClose();
        } catch (err) {
            console.error('Failed to close month:', err);
        }
    };

    const breakdown = breakdownData?.data || breakdownData?.breakdown;

    return (
        <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            exit={{ scale: 0.95, opacity: 0 }} 
            className="modal-box max-w-md w-full" 
            onClick={e => e.stopPropagation()}
        >
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h3 className="font-bold text-white text-base">Salary Breakdown</h3>
                    <p className="text-slate-500 text-[10px]">{employee.name} • {employee.employeeId}</p>
                </div>
                <button 
                    onClick={onClose} 
                    className="text-slate-500 hover:text-white p-0.5 hover:bg-white/10 rounded transition-all"
                >
                    <X size={16} />
                </button>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <Loader size={24} className="animate-spin text-indigo-400" />
                    <p className="text-slate-400 text-xs font-medium">Calculating components...</p>
                </div>
            ) : error ? (
                <div className="py-8 text-center">
                    <AlertTriangle size={24} className="text-rose-500 mx-auto mb-2" />
                    <p className="text-slate-400 text-xs">Could not load salary data.</p>
                </div>
            ) : breakdown ? (
                <div className="space-y-4">
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5 space-y-3">
                        <SalaryRow label="Base Salary" value={breakdown.baseSalary} />
                        
                        {breakdown.spacesComponent > 0 && (
                            <SalaryRow label="Responsibilities" value={breakdown.spacesComponent} />
                        )}
                        
                        {breakdown.experienceComponent > 0 && (
                            <SalaryRow label="Experience Pay" value={breakdown.experienceComponent} />
                        )}
                        
                        {breakdown.bonus > 0 && (
                            <SalaryRow label="Bonus" value={breakdown.bonus} type="bonus" prefix="+" />
                        )}
                        
                        {breakdown.aid > 0 && (
                            <SalaryRow label="Financial Aid" value={breakdown.aid} type="bonus" prefix="+" />
                        )}
                        
                        {breakdown.deductions > 0 && (
                            <SalaryRow label="Deductions" value={breakdown.deductions} type="deduction" prefix="-" />
                        )}
                        
                        <SalaryRow label="Total Salary" value={breakdown.totalSalary} type="total" />
                        <SalaryRow label="Net Payable" value={breakdown.netPayable} type="net" />
                    </div>

                    <div className="flex justify-between items-center">
                        <div className="text-[10px] text-slate-500">
                            <p>Month: {breakdown.month || 'Current'}</p>
                            <p>Status: <span className={breakdown.status === 'closed' ? 'text-green-400' : 'text-yellow-400'}>{breakdown.status || 'open'}</span></p>
                        </div>
                        {breakdown.status !== 'closed' && (
                            <button 
                                onClick={handleCloseMonth} 
                                disabled={isClosing}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded disabled:opacity-50"
                            >
                                {isClosing ? 'Closing...' : 'Close Month'}
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="py-8 text-center">
                    <p className="text-slate-400 text-xs">No breakdown data available.</p>
                </div>
            )}
        </motion.div>
    );
};

export default function FinanceManagement() {
    const schoolId = useSelector(selectSchoolId) || "";
    const schoolLevel = localStorage.getItem('schoolLevel') || 10;
    const derivedClasses = getClassesByLevel(schoolLevel);

    const [activeMainTab, setActiveMainTab] = useState('fees');
    const [activeFeesTab, setActiveFeesTab] = useState('student');
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('All');
    const [toast, setToast] = useState(null);
    const [showAddCustom, setShowAddCustom] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    // RTK Query hooks for fees
    const pollingInterval = useSelector(selectPollingInterval);
    const { data: fees = [], isLoading: loading, refetch: refetchFees } = useGetFeesQuery(schoolId, { pollingInterval });
    const { data: customFeesRaw = [], isLoading: customLoading, refetch: refetchCustom } = useGetCustomFeesQuery(schoolId, { pollingInterval });
    const { data: studentsData = [] } = useGetStudentsQuery(schoolId, { pollingInterval });
    
    // RTK Query hooks for payroll
    const { data: employeesData = [], isLoading: employeesLoading, refetch: refetchEmployees } = useGetEmployeesQuery(schoolId, { pollingInterval });
    
    // Fallback/Transform data
    const customFees = Array.isArray(customFeesRaw?.data) ? customFeesRaw.data : (Array.isArray(customFeesRaw) ? customFeesRaw : []);
    const students = Array.isArray(studentsData?.data) ? studentsData.data : (Array.isArray(studentsData) ? studentsData : []);
    
    // Handle employees data with multiple possible structures
    let employees = [];
    if (employeesData) {
        // Case 1: employeesData.data is an array
        if (Array.isArray(employeesData.data)) {
            employees = employeesData.data;
        }
        // Case 2: employeesData is an array directly
        else if (Array.isArray(employeesData)) {
            employees = employeesData;
        }
        // Case 3: employeesData has nested data.data structure
        else if (employeesData.data && Array.isArray(employeesData.data.data)) {
            employees = employeesData.data.data;
        }
        // Case 4: employeesData has success: true and data array
        else if (employeesData.success && Array.isArray(employeesData.data)) {
            employees = employeesData.data;
        }
    }

    // Mutations for fees
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

    // Derived stats from fees data
    const feesAnalytics = useMemo(() => {
        // Ensure fees is always treated as an array
        const safeFees = Array.isArray(fees) ? fees : [];
        const collected = safeFees.reduce((a, f) => a + (f.paid || 0), 0);
        const pending = safeFees.reduce((a, f) => a + (f.pending || 0), 0);
        const total = collected + pending;
        return {
            collected,
            pending,
            count: safeFees.length,
            rate: total > 0 ? Math.round((collected / total) * 100) : 0
        };
    }, [fees]);

    // Derived stats from payroll data
    const payrollAnalytics = useMemo(() => {
        // Ensure employees is always treated as an array
        const safeEmployees = Array.isArray(employees) ? employees : [];
        const totalSalary = safeEmployees.reduce((a, e) => a + (e.baseSalary || 0), 0);
        const activeEmployees = safeEmployees.filter(e => e.status === 'active').length;
        const totalEmployees = safeEmployees.length;
        
        return {
            totalSalary,
            activeEmployees,
            totalEmployees,
            avgSalary: totalEmployees > 0 ? Math.round(totalSalary / totalEmployees) : 0
        };
    }, [employees]);

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

    const filteredFees = fees.filter(f => {
        const matchSearch = f.name.toLowerCase().includes(search.toLowerCase()) || f.studentId.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === 'All' || f.status === filter;
        return matchSearch && matchFilter;
    });

    const filteredEmployees = employees.filter(e => {
        const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.employeeId.toLowerCase().includes(search.toLowerCase());
        return matchSearch;
    });

    const scopeLabel = (s) => ({ school: 'Whole School', class: 'Selected Classes', student: 'Selected Students' }[s] || s);
    const scopeColor = (s) => ({ school: 'text-primary bg-primary/15 border-primary/25', class: 'text-secondary bg-secondary/15 border-secondary/25', student: 'text-accent bg-accent/15 border-accent/25' }[s] || '');

    return (
        <div className="max-w-full p-1 space-y-2 text-slate-400">
                {/* ─── Combined Header with Primary Analytics ─── */}
                <div className="space-y-2">
                    <header className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-white/5 border border-white/10 flex items-center justify-center">
                                <CreditCard size={12} className="text-success" />
                            </div>
                            <div>
                                <h1 className="text-sm font-black text-white tracking-tight uppercase italic leading-none">FINANCE_COMMAND</h1>
                                <p className="text-[7px] font-bold text-slate-700 uppercase tracking-widest mt-0.5 whitespace-nowrap">
                                    {activeMainTab === 'fees' ? `LOAD: ${fees.length} ENTRIES` : `LOAD: ${employees.length} NODES`}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {/* Main Context Switcher */}
                            <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/5">
                                {[
                                    { id: 'fees', label: 'FEES' },
                                    { id: 'salary', label: 'PAYROLL' }
                                ].map(({ id, label }) => (
                                    <button 
                                        key={id} 
                                        onClick={() => setActiveMainTab(id)}
                                        className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${activeMainTab === id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-600 hover:text-slate-400'}`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <StandardButton 
                                variant="ghost" 
                                size="xs" 
                                onClick={() => activeMainTab === 'fees' ? (refetchFees(), refetchCustom()) : refetchEmployees()} 
                                icon={RefreshCw} 
                            />
                        </div>
                    </header>

                    {/* ─── Global Analytics Grid ─── */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                        {activeMainTab === 'fees' ? (
                            <>
                                <KPITile label="Total Collected" value={fmt(feesAnalytics.collected)} sub="L_SYNC_OK" icon={CheckCircle} color="success" dense />
                                <KPITile label="Total Overdue" value={fmt(feesAnalytics.pending)} sub="BACKLOG_ALRT" icon={AlertTriangle} color="warning" dense />
                                <KPITile label="Active Segments" value={feesAnalytics.count} sub="REGISTERD" icon={Users} color="primary" dense />
                                <KPITile label="Fill Velocity" value={`${feesAnalytics.rate}%`} sub="ACCEL_LOAD" icon={TrendingUp} color="accent" dense />
                            </>
                        ) : (
                            <>
                                <KPITile label="Global Payroll" value={fmt(payrollAnalytics.totalSalary)} sub="LOAD_V_PULSE" icon={IndianRupee} color="success" dense />
                                <KPITile label="Active Nodes" value={payrollAnalytics.activeEmployees} sub="V_SYNC_LIVE" icon={Users} color="primary" dense />
                                <KPITile label="Total Nodes" value={payrollAnalytics.totalEmployees} sub="NET_CLUSTER" icon={User} color="secondary" dense />
                                <KPITile label="Avg Allocation" value={fmt(payrollAnalytics.avgSalary)} sub="ALLOC_MEAN" icon={PieChart} color="accent" dense />
                            </>
                        )}
                    </div>
                </div>

                {/* ─── OPERATIONAL VIEWPORT ─── */}
                <div className="space-y-1">
                    {activeMainTab === 'fees' && (
                        <>
                            <div className="flex items-center justify-between gap-1">
                                <div className="flex gap-1 overflow-x-auto custom-scrollbar no-scrollbar">
                                    {[
                                        { id: 'student', label: 'LEDGER_VIEW' },
                                        { id: 'custom', label: 'PROTOCOLS' }
                                    ].map(({ id, label }) => (
                                        <button 
                                            key={id} 
                                            onClick={() => setActiveFeesTab(id)}
                                            className={`px-3 py-1.5 rounded-lg text-micro font-black uppercase tracking-widest border transition-all ${activeFeesTab === id ? 'bg-white/10 text-white border-white/20' : 'text-slate-700 border-transparent hover:text-slate-500'}`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-1 shrink-0">
                                    {activeFeesTab === 'custom' && (
                                        <StandardButton variant="primary" size="xs" onClick={() => setShowAddCustom(true)} icon={Plus}>INITIALIZE</StandardButton>
                                    )}
                                </div>
                            </div>

                            {activeFeesTab === 'student' ? (
                                <div className="space-y-1">
                                    <div className="flex gap-1 items-center">
                                        <div className="relative flex-1 group">
                                            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-700" />
                                            <input 
                                                className="w-full bg-white/[0.02] border border-white/5 rounded-lg py-1.5 pl-8 pr-3 text-micro text-white placeholder:text-slate-800 focus:outline-none focus:border-primary/20 transition-all font-black uppercase tracking-widest" 
                                                placeholder="SCAN_HASH..." value={search} onChange={e => setSearch(e.target.value)} 
                                            />
                                        </div>
                                        <div className="w-32 shrink-0">
                                            <DropdownWidget
                                                dense
                                                options={[
                                                    { label: 'ALL_STATUS', value: 'All' },
                                                    { label: 'PAID', value: 'Paid' },
                                                    { label: 'PENDING', value: 'Pending' }
                                                ]}
                                                value={filter}
                                                onChange={setFilter}
                                            />
                                        </div>
                                    </div>
                                    <GlassCard className="border border-white/5" dense>
                                        {loading ? <div className="py-20 flex justify-center"><RefreshCw size={16} className="animate-spin text-slate-800" /></div> : <FeesListBox feesList={filteredFees} onPaymentClick={setSelectedStudent} />}
                                    </GlassCard>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-1">
                                    {customFees.map((cf, i) => (
                                        <GlassCard key={i} delay={i * 0.01} className="p-1.5 border border-white/5 bg-white/[0.01] hover:border-success/30" dense hover>
                                            <div className="flex items-start justify-between mb-1">
                                                <div className="w-5 h-5 rounded bg-success/10 flex items-center justify-center text-success"><Zap size={10} /></div>
                                                <StandardButton variant="ghost" size="xs" icon={Trash2} onClick={() => handleDeleteCustomFee(cf.feeId)} className="text-rose-500 opacity-0 group-hover:opacity-100" />
                                            </div>
                                            <h3 className="text-[9px] font-black text-white italic truncate uppercase leading-none">{cf.feeName}</h3>
                                            <p className="text-[7px] font-bold text-slate-700 uppercase tracking-widest mt-1">{fmt(cf.amount)} • {cf.feeType}</p>
                                        </GlassCard>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {activeMainTab === 'salary' && (
                        <div className="space-y-1">
                            <div className="flex gap-1 items-center">
                                <div className="relative flex-1 group">
                                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-700" />
                                    <input 
                                        className="w-full bg-white/[0.02] border border-white/5 rounded-lg py-1.5 pl-8 pr-3 text-micro text-white placeholder:text-slate-800 focus:outline-none focus:border-blue-500/20 transition-all font-black uppercase tracking-widest"
                                        placeholder="SCAN_STAFF_NODE..." value={search} onChange={e => setSearch(e.target.value)} 
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-1">
                                {filteredEmployees.map((emp, i) => (
                                    <GlassCard key={i} delay={i * 0.01} className="p-1.5 border border-white/5 bg-white/[0.01]" dense hover>
                                        <div className="flex items-start justify-between mb-1">
                                            <div className="w-5 h-5 rounded bg-blue-500/10 flex items-center justify-center text-blue-400 font-black text-[8px] uppercase">{emp.name?.[0]}</div>
                                            <div className={`px-1 py-0 rounded text-[6px] font-black uppercase tracking-widest border ${emp.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-slate-800 border-white/5 text-slate-500'}`}>
                                                {emp.status}
                                            </div>
                                        </div>
                                        <h3 className="text-[9px] font-black text-white italic truncate uppercase leading-none mt-0.5">{emp.name}</h3>
                                        <p className="text-[7px] font-bold text-slate-700 uppercase tracking-widest truncate mt-0.5">{emp.employeeId}</p>
                                        <div className="mt-1 pt-1 border-t border-white/5 space-y-0.5">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[7px] font-black text-slate-800 uppercase tracking-widest">ALLOC</span>
                                                <span className="text-[8px] font-black text-slate-400 italic">{fmt(emp.baseSalary)}</span>
                                            </div>
                                            <StandardButton variant="ghost" size="xs" onClick={() => setSelectedEmployee(emp)} label="BREAKDOWN" className="w-full py-0 !h-4 text-[7px]" />
                                        </div>
                                    </GlassCard>
                                ))}
                            </div>
                        </div>
                    )}
                </div>    </div>

            {/* Modals */}
            <AnimatePresence>
                {showAddCustom && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setShowAddCustom(false)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} 
                            className="modal-box max-w-md w-full" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="font-bold text-white text-base">Create Custom Fee</h3>
                                    <p className="text-slate-500 text-[10px]">Define a new fee structure for your school</p>
                                </div>
                                <button onClick={() => setShowAddCustom(false)} className="text-slate-500 hover:text-white p-0.5 hover:bg-white/10 rounded transition-all">
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fee Name</label>
                                    <input className="input-standard w-full text-xs" placeholder="e.g., Annual Sports Fee" 
                                        value={newFee.feeName} onChange={e => setNewFee({...newFee, feeName: e.target.value})} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Amount (₹)</label>
                                        <input className="input-standard w-full text-xs" type="number" placeholder="5000" 
                                            value={newFee.amount} onChange={e => setNewFee({...newFee, amount: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fee Type</label>
                                        <select className="input-standard w-full text-xs" value={newFee.feeType} onChange={e => setNewFee({...newFee, feeType: e.target.value})}>
                                            <option value="one_time">One-time</option>
                                            <option value="recurring">Recurring</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Scope</label>
                                    <select className="input-standard w-full text-xs" value={newFee.scope} onChange={e => setNewFee({...newFee, scope: e.target.value})}>
                                        <option value="school">Whole School</option>
                                        <option value="class">Selected Classes</option>
                                        <option value="student">Selected Students</option>
                                    </select>
                                </div>
                                {newFee.scope === 'class' && (
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Target Classes</label>
                                        <div className="flex flex-wrap gap-1">
                                            {derivedClasses.map(cls => (
                                                <button key={cls} type="button" onClick={() => toggleClass(cls)}
                                                    className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${newFee.targetClasses.includes(cls) ? 'bg-primary text-white border-primary' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'}`}>
                                                    {cls}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {newFee.scope === 'student' && (
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Target Students</label>
                                        <div className="max-h-32 overflow-y-auto space-y-0.5">
                                            {students.slice(0, 15).map(s => (
                                                <div key={s.studentId} className="flex items-center gap-2 p-1.5 hover:bg-white/5 rounded">
                                                    <input type="checkbox" id={`student-${s.studentId}`} checked={newFee.targetStudents.includes(s.studentId)} onChange={() => toggleStudent(s.studentId)} className="rounded text-[8px]" />
                                                    <label htmlFor={`student-${s.studentId}`} className="text-[10px] text-slate-300 flex-1">{s.name} ({s.studentId})</label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Due Date (Optional)</label>
                                        <input className="input-standard w-full text-xs h-9" type="date" 
                                            value={newFee.dueDate} onChange={e => setNewFee({...newFee, dueDate: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Penalty/Day (Optional)</label>
                                        <input className="input-standard w-full text-xs h-9" type="number" placeholder="50" 
                                            value={newFee.penaltyPerDay} onChange={e => setNewFee({...newFee, penaltyPerDay: e.target.value})} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Description (Optional)</label>
                                    <textarea className="input-standard w-full h-16 text-xs" placeholder="Describe the purpose of this fee..." 
                                        value={newFee.description} onChange={e => setNewFee({...newFee, description: e.target.value})} />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button onClick={handleCreateCustomFee} className="flex-1 py-2 rounded-lg bg-primary text-white font-bold hover:brightness-110 transition-all text-xs">
                                        Create Fee Definition
                                    </button>
                                    <button onClick={() => setShowAddCustom(false)} className="px-4 py-2 rounded-lg bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 transition-all text-xs">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {selectedStudent && (
                    <StudentPaymentModal 
                        student={selectedStudent} 
                        onClose={() => setSelectedStudent(null)} 
                        onSubmit={handlePaymentSubmit}
                        calculatePenalty={calculatePenalty}
                    />
                )}

                {selectedEmployee && (
                    <BreakdownModal 
                        employee={selectedEmployee} 
                        onClose={() => setSelectedEmployee(null)} 
                        schoolId={schoolId}
                    />
                )}
            </AnimatePresence>

            {/* Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                        className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-xl z-50 flex items-center gap-2 ${toast.type === 'success' ? 'bg-success/20 border border-success/30 text-success' : 'bg-accent/20 border border-accent/30 text-accent'}`}>
                        {toast.type === 'success' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                        <p className="text-xs font-bold">{toast.msg}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}