import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CreditCard, DollarSign, Users, Search, Filter, CheckCircle, AlertTriangle, Loader,
    User, BookOpen, PieChart, Percent, Receipt, X, RefreshCw, Trash2, Zap, Calendar,
    Shield, Target, School, IndianRupee, FileText, Box, Plus
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
        <div className="min-h-full page-bg text-slate-300">
            <div className="container mx-auto p-3 max-w-[2000px]">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shadow-md">
                            <CreditCard size={16} className="text-success" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-white tracking-tight">Finance Dashboard</h1>
                            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-[0.2em] mt-0.5">
                                {activeMainTab === 'fees' ? `${fees.length} fee records • ${customFees.length} fee definitions` : `${employees.length} employees • ${fmt(payrollAnalytics.totalSalary)} total payroll`}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-1">
                        <button onClick={() => { 
                            if (activeMainTab === 'fees') { refetchFees(); refetchCustom(); } 
                            else { refetchEmployees(); }
                        }} className="p-1.5 rounded-md bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-200 text-xs">
                            <RefreshCw size={14} />
                        </button>
                        {activeMainTab === 'fees' && activeFeesTab === 'custom' && (
                            <button onClick={() => setShowAddCustom(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-white font-bold hover:brightness-110 shadow-md shadow-primary/20 transition-all duration-200 active:scale-95 text-xs">
                                <Plus size={14} /> Create Fee
                            </button>
                        )}
                    </div>
                </div>

                {/* Main Content Tabs */}
                <div className="px-2 pt-2 flex gap-1 mb-2">
                    {[
                        { id: 'fees', icon: DollarSign, label: 'Fees Management' },
                        { id: 'salary', icon: IndianRupee, label: 'Salary & Payroll' }
                    ].map(({ id, icon: Icon, label }) => (
                        <button key={id} onClick={() => setActiveMainTab(id)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-[0.2em] transition-all border
                                ${activeMainTab === id 
                                    ? 'bg-success/10 text-success border-success/25 shadow-md shadow-success/5' 
                                    : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-white/5'}`}>
                            <Icon size={9} />{label}
                        </button>
                    ))}
                </div>

                {/* Fees Management Section */}
                {activeMainTab === 'fees' && (
                    <div className="space-y-3">
                        {/* Fees Sub-tabs */}
                        <div className="px-2 flex gap-1 mb-2">
                            {[
                                { id: 'student', icon: DollarSign, label: 'Collection' },
                                { id: 'custom', icon: Zap, label: 'Custom Fees' }
                            ].map(({ id, icon: Icon, label }) => (
                                <button key={id} onClick={() => setActiveFeesTab(id)}
                                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-[0.2em] transition-all border
                                        ${activeFeesTab === id 
                                            ? 'bg-primary/10 text-primary border-primary/25 shadow-md shadow-primary/5' 
                                            : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-white/5'}`}>
                                    <Icon size={9} />{label}
                                </button>
                            ))}
                        </div>

                        {/* Fees Stats Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 px-2">
                            {[
                                { label: 'Collected', value: fmt(feesAnalytics.collected), icon: CheckCircle, color: 'text-success', bg: 'bg-success/15' },
                                { label: 'Overdue', value: fmt(feesAnalytics.pending), icon: AlertTriangle, color: 'text-accent', bg: 'bg-accent/15' },
                                { label: 'Students', value: feesAnalytics.count, icon: Users, color: 'text-primary', bg: 'bg-primary/15' },
                                { label: 'Fulfillment', value: `${feesAnalytics.rate}%`, icon: Percent, color: 'text-secondary', bg: 'bg-secondary/15' },
                            ].map(({ label, value, icon: Icon, color, bg }, i) => (
                                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                                    className="glass-card p-2 flex flex-col items-center text-center">
                                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center mb-0.5 border border-white/5 ${bg}`}>
                                        <Icon size={10} className={color} />
                                    </div>
                                    <p className={`text-xs font-black ${color}`}>{value}</p>
                                    <p className="text-[7px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{label}</p>
                                </motion.div>
                            ))}
                        </div>

                        {/* Student Fees View */}
                        {activeFeesTab === 'student' && (
                            <div className="p-2 space-y-2">
                                {/* Filter Engine */}
                                <div className="flex flex-col sm:flex-row gap-1 mb-2">
                                    <div className="relative flex-1">
                                        <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input className="input-standard pl-8 h-9 bg-slate-900/50 text-xs" 
                                            placeholder="Search records by student name or ID..." value={search} onChange={e => setSearch(e.target.value)} />
                                    </div>
                                    <div className="flex gap-1">
                                        <select className="input-standard sm:w-32 h-9 bg-slate-900/50 text-[9px] font-bold uppercase tracking-widest" 
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
                                    <div className="flex flex-col items-center justify-center py-12 space-y-2">
                                        <div className="w-8 h-8 border-3 border-success/20 border-t-success rounded-full animate-spin" />
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em]">Syncing Ledger Data...</p>
                                    </div>
                                ) : (
                                    <FeesListBox feesList={filteredFees} onPaymentClick={(s) => setSelectedStudent(s)} />
                                )}
                            </div>
                        )}

                        {/* Custom Fees Inventory */}
                        {activeFeesTab === 'custom' && (
                            <div className="p-3 space-y-3">
                                {customLoading ? (
                                    <div className="flex flex-col items-center justify-center py-12 space-y-2">
                                        <Loader size={20} className="animate-spin text-success" />
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Loading Definitions...</p>
                                    </div>
                                ) : customFees.length === 0 ? (
                                    <div className="text-center py-8 bg-white/[0.01] rounded-xl border border-dashed border-white/5">
                                        <Zap size={24} className="text-slate-800 mx-auto mb-2" />
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Inventory is empty</p>
                                        <button onClick={() => setShowAddCustom(true)} className="btn-primary mt-3 px-4 py-1.5 text-xs">Configure First Fee</button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {customFees.map((cf, i) => (
                                            <motion.div key={cf.feeId || i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                                                className="glass-card p-2 border-white/5 bg-white/[0.02] hover:border-success/30 transition-all group relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-1">
                                                    <span className={`px-0.5 py-0.5 rounded text-[5px] font-black border uppercase tracking-[0.15em] ${scopeColor(cf.scope)}`}>
                                                        {scopeLabel(cf.scope)}
                                                    </span>
                                                </div>
                                                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-success/20 to-primary/10 flex items-center justify-center mb-1 border border-success/10 shadow-lg shadow-success/5">
                                                    <Zap size={12} className="text-success" />
                                                </div>
                                                <h3 className="text-[10px] font-black text-white uppercase tracking-tight mb-0.5">{cf.feeName}</h3>
                                                {cf.description && <p className="text-[9px] text-slate-500 font-medium line-clamp-2 mb-1">{cf.description}</p>}
                                                
                                                <div className="space-y-1 pt-1.5 border-t border-white/5">
                                                    <div className="flex items-center gap-1 text-[7px] font-bold text-slate-400">
                                                        <div className="p-0.5 rounded bg-success/10 text-success"><DollarSign size={8} /></div>
                                                        <span className="uppercase tracking-widest">{fmt(cf.amount)} • {cf.feeType === 'one_time' ? 'One-time' : 'Recurring'}</span>
                                                    </div>
                                                    {cf.dueDate && (
                                                        <div className="flex items-center gap-1 text-[7px] font-bold text-slate-400">
                                                            <div className="p-0.5 rounded bg-primary/10 text-primary"><Calendar size={8} /></div>
                                                            <span className="uppercase tracking-widest">Valid Until: {fmtDate(cf.dueDate)}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mt-2 pt-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                                                    <button onClick={() => handleDeleteCustomFee(cf.feeId)} className="w-full py-0.5 rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[7px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all">
                                                        Revoke Definition
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Salary & Payroll Section */}
                {activeMainTab === 'salary' && (
                    <div className="space-y-3">
                        {/* Payroll Stats Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 px-2">
                            {[
                                { label: 'Total Payroll', value: fmt(payrollAnalytics.totalSalary), icon: IndianRupee, color: 'text-success', bg: 'bg-success/15' },
                                { label: 'Active Staff', value: payrollAnalytics.activeEmployees, icon: Users, color: 'text-primary', bg: 'bg-primary/15' },
                                { label: 'Total Staff', value: payrollAnalytics.totalEmployees, icon: User, color: 'text-secondary', bg: 'bg-secondary/15' },
                                { label: 'Avg Salary', value: fmt(payrollAnalytics.avgSalary), icon: PieChart, color: 'text-accent', bg: 'bg-accent/15' },
                            ].map(({ label, value, icon: Icon, color, bg }, i) => (
                                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                                    className="glass-card p-2 flex flex-col items-center text-center">
                                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center mb-0.5 border border-white/5 ${bg}`}>
                                        <Icon size={10} className={color} />
                                    </div>
                                    <p className={`text-xs font-black ${color}`}>{value}</p>
                                    <p className="text-[7px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{label}</p>
                                </motion.div>
                            ))}
                        </div>

                        {/* Search and Filter */}
                        <div className="p-3">
                            <div className="relative">
                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input className="input-standard pl-9 h-10 bg-slate-900/50 text-xs w-full" 
                                    placeholder="Search employees by name or ID..." value={search} onChange={e => setSearch(e.target.value)} />
                            </div>
                        </div>

                        {/* Employees List */}
                        {employeesLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-2">
                                <Loader size={20} className="animate-spin text-indigo-400" />
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Loading Payroll Data...</p>
                            </div>
                        ) : filteredEmployees.length === 0 ? (
                            <div className="text-center py-8 bg-white/[0.01] rounded-xl border border-dashed border-white/5">
                                <Users size={24} className="text-slate-800 mx-auto mb-2" />
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">No employees found</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-2">
                                {filteredEmployees.map((emp, i) => (
                                    <motion.div key={emp.employeeId || i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                                        className="glass-card p-2 border-white/5 bg-white/[0.02] hover:border-indigo-500/30 transition-all group">
                                        <div className="flex items-start justify-between mb-1">
                                            <div>
                                                <h3 className="text-[10px] font-black text-white uppercase tracking-tight">{emp.name}</h3>
                                                <p className="text-[9px] text-slate-500 font-medium">{emp.employeeId}</p>
                                            </div>
                                            <span className={`px-1 py-0.5 rounded text-[6px] font-black border uppercase tracking-[0.15em] ${emp.status === 'active' ? 'text-green-400 bg-green-400/15 border-green-400/25' : 'text-slate-500 bg-slate-500/15 border-slate-500/25'}`}>
                                                {emp.status || 'unknown'}
                                            </span>
                                        </div>
                                        
                                        <div className="space-y-1 mb-2">
                                            <div className="flex items-center gap-1 text-[7px] font-bold text-slate-400">
                                                <div className="p-0.5 rounded bg-indigo-500/10 text-indigo-400"><IndianRupee size={8} /></div>
                                                <span className="uppercase tracking-widest">Base Salary: {fmt(emp.baseSalary || 0)}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-[7px] font-bold text-slate-400">
                                                <div className="p-0.5 rounded bg-primary/10 text-primary"><User size={8} /></div>
                                                <span className="uppercase tracking-widest">{emp.employeeType || 'Not specified'}</span>
                                            </div>
                                            {emp.subject && (
                                                <div className="flex items-center gap-1 text-[7px] font-bold text-slate-400">
                                                    <div className="p-0.5 rounded bg-secondary/10 text-secondary"><BookOpen size={8} /></div>
                                                    <span className="uppercase tracking-widest">{emp.subject}</span>
                                                </div>
                                            )}
                                        </div>

                                        <button 
                                            onClick={() => setSelectedEmployee(emp)}
                                            className="w-full py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[7px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all"
                                        >
                                            View Salary Breakdown
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

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