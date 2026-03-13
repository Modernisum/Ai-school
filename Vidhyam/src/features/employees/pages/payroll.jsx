import React, { useState, useEffect, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CreditCard, Search, Loader, Box, RefreshCw, X, AlertTriangle, CheckCircle, IndianRupee, FileText
} from 'lucide-react';
import { getSchoolIdFromStorage, DEFAULT_SCHOOL_ID } from '../../../utils/api';
import { 
    useGetEmployeesQuery, 
    useGetSalaryBreakdownQuery, 
    useCloseMonthMutation 
} from '../api/employeeApi';

// --- Sub-components ---

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

const BreakdownModal = memo(({ employee, onClose, schoolId }) => {
    const { data: breakdownData, isLoading, error } = useGetSalaryBreakdownQuery(
        { schoolId, employeeId: employee.employeeId },
        { skip: !employee }
    );

    const [closeMonth, { isLoading: isClosing }] = useCloseMonthMutation();

    const handleCloseMonth = async () => {
        try {
            await closeMonth({ schoolId, employeeId: employee.employeeId }).unwrap();
            onClose();
            // Success handled by RTK Query cache and optional toast logic in parent
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
            className="modal-box max-w-lg w-full" 
            onClick={e => e.stopPropagation()}
        >
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h3 className="font-bold text-white text-lg">Salary Breakdown</h3>
                    <p className="text-slate-500 text-xs">{employee.name} • {employee.employeeId}</p>
                </div>
                <button 
                    onClick={onClose} 
                    className="text-slate-500 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-all"
                >
                    <X size={20} />
                </button>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader size={32} className="animate-spin text-indigo-400" />
                    <p className="text-slate-400 text-sm font-medium">Calculating components...</p>
                </div>
            ) : error ? (
                <div className="py-10 text-center">
                    <AlertTriangle size={32} className="text-rose-500 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">Could not load salary data.</p>
                </div>
            ) : breakdown ? (
                <div className="space-y-6">
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/5 space-y-4">
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

                        <div className="pt-2 border-t border-white/10">
                            <SalaryRow label="Gross Salary" value={breakdown.grossSalary} type="total" />
                        </div>

                        {breakdown.absentDays > 0 && (
                            <SalaryRow 
                                label={`Absence Deductions (${breakdown.absentDays} days)`} 
                                value={breakdown.deductions} 
                                type="deduction" 
                                prefix="-" 
                            />
                        )}

                        <SalaryRow label="Net Monthly Pay" value={breakdown.netMonthlySalary} type="net" />
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-4 rounded-xl text-xs flex gap-3">
                        <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                        <p className="leading-relaxed">
                            Closing the month will lock this salary, record a payroll transaction, and mark any unsettled advance balances against the employee.
                        </p>
                    </div>

                    <button 
                        onClick={handleCloseMonth} 
                        disabled={isClosing}
                        className="btn-primary w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 group"
                    >
                        {isClosing ? <Loader size={18} className="animate-spin" /> : <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />}
                        Generate Salary & Close Month
                    </button>
                </div>
            ) : null}
        </motion.div>
    );
});

// --- Main Page ---

export default function PayrollManagement() {
    const schoolId = getSchoolIdFromStorage() || DEFAULT_SCHOOL_ID;
    const [search, setSearch] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    const { data: employeesData, isLoading, refetch } = useGetEmployeesQuery(schoolId);

    const filtered = useMemo(() => {
        const list = employeesData?.data || [];
        if (!search) return list;
        const s = search.toLowerCase();
        return list.filter(e => 
            (e.name || '').toLowerCase().includes(s) || 
            (e.employeeId || '').toLowerCase().includes(s)
        );
    }, [employeesData, search]);

    const formatCurr = (val) => new Intl.NumberFormat('en-IN', { 
        style: 'currency', 
        currency: 'INR', 
        minimumFractionDigits: 0 
    }).format(val || 0);

    return (
        <div className="min-h-full">
            <div className="page-header flex items-center justify-between px-6 py-4 bg-slate-900/50 backdrop-blur-md border-b border-white/5 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                        <CreditCard size={20} className="text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-white tracking-tight">Payroll <span className="text-indigo-400">Automation</span></h1>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Monthly closing system</p>
                    </div>
                </div>
                <button 
                    onClick={refetch} 
                    className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all border border-white/5"
                    title="Refresh List"
                >
                    <RefreshCw size={18} />
                </button>
            </div>

            <div className="p-8 space-y-6">
                <div className="relative group">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                    <input 
                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-all shadow-inner" 
                        placeholder="Search employees by name or ID..." 
                        value={search} 
                        onChange={e => setSearch(e.target.value)} 
                    />
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <Loader size={40} className="animate-spin text-indigo-500" />
                        <p className="text-slate-500 font-medium animate-pulse">Syncing employee records...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-24 bg-white/5 rounded-3xl border-2 border-dashed border-white/5">
                        <Box size={48} className="text-slate-700 mx-auto mb-4" />
                        <p className="text-slate-400 font-bold">No employees found matching your search</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filtered.map((emp) => (
                            <motion.div
                                key={emp.employeeId}
                                initial={{ opacity: 0, y: 20 }} 
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{ y: -5 }}
                                className="glass-card p-6 hover:bg-white/5 transition-all cursor-pointer group border-white/5 flex flex-col justify-between"
                                onClick={() => setSelectedEmployee(emp)}
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-indigo-400 font-black text-xl border border-white/5">
                                            {emp.name?.charAt(0)}
                                        </div>
                                        <span className="text-[10px] font-black uppercase px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                            {formatCurr(emp.baseSalary)}
                                        </span>
                                    </div>
                                    <h3 className="text-white font-bold text-lg mb-1 group-hover:text-indigo-300 transition-colors">{emp.name}</h3>
                                    <p className="text-slate-500 text-xs font-mono tracking-tighter uppercase">{emp.employeeId}</p>
                                </div>
                                <div className="mt-6 flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{emp.role || 'Staff'}</span>
                                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 group-hover:gap-3 transition-all">
                                        BROAKDOWN
                                        <FileText size={14} />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Salary Breakdown Modal */}
            <AnimatePresence>
                {selectedEmployee && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        className="modal-overlay backdrop-blur-sm z-[100]" 
                        onClick={() => setSelectedEmployee(null)}
                    >
                        <BreakdownModal 
                            employee={selectedEmployee} 
                            schoolId={schoolId}
                            onClose={() => setSelectedEmployee(null)} 
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
