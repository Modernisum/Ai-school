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
        <div className={`flex justify-between text-micro ${type === 'net' ? 'mt-1.5 pt-1.5 border-t border-white/10' : ''}`}>
            <span className={`${colorClass} uppercase font-black tracking-widest`}>{label}</span>
            <span className={`${valueClass} font-mono italic`}>
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
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h3 className="font-black text-white text-micro uppercase italic tracking-widest">Salary Settlement</h3>
                    <p className="text-slate-700 text-micro font-black uppercase">{employee.name} • {employee.employeeId}</p>
                </div>
                <button 
                    onClick={onClose} 
                    className="text-slate-700 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-all"
                >
                    <X size={16} />
                </button>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <Loader size={24} className="animate-spin text-indigo-400" />
                    <p className="text-slate-700 text-micro font-black uppercase tracking-widest">Loading...</p>
                </div>
            ) : error ? (
                <div className="py-8 text-center">
                    <AlertTriangle size={24} className="text-rose-500 mx-auto mb-2" />
                    <p className="text-slate-700 text-micro font-black uppercase">Failed to load salary breakdown</p>
                </div>
            ) : breakdown ? (
                <div className="space-y-4">
                    <div className="bg-white/5 rounded-xl p-3 border border-white/5 space-y-1.5">
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

                        <div className="pt-1.5 border-t border-white/5">
                            <SalaryRow label="Gross Salary" value={breakdown.grossSalary} type="total" />
                        </div>

                        {breakdown.absentDays > 0 && (
                            <SalaryRow 
                                label={`Absence (${breakdown.absentDays}D)`} 
                                value={breakdown.deductions} 
                                type="deduction" 
                                prefix="-" 
                            />
                        )}

                        <SalaryRow label="Net Pay" value={breakdown.netMonthlySalary} type="net" />
                    </div>

                    <div className="bg-amber-500/5 border border-amber-500/10 text-amber-500/60 p-2 rounded-lg text-micro flex gap-2">
                        <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                        <p className="leading-tight font-bold uppercase">
                            Closing the month will lock the payroll ledger and record the transaction.
                        </p>
                    </div>

                    <StandardButton
                        variant="primary"
                        size="xs"
                        onClick={handleCloseMonth}
                        disabled={isClosing}
                        icon={isClosing ? Loader : RefreshCw}
                        className="w-full"
                    >
                        {isClosing ? 'Processing...' : 'Finalize Monthly Payroll'}
                    </StandardButton>
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
        <div className="max-w-full p-1 space-y-2 text-slate-400">
            <div className="flex items-center justify-between px-2 py-1 bg-white/5 border border-white/10 rounded-xl">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-lg">
                        <CreditCard size={14} className="text-blue-400" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-white leading-none uppercase italic">Payroll Dashboard</h1>
                        <p className="text-micro uppercase tracking-widest font-bold text-slate-600 mt-0.5">Automated settlement system</p>
                    </div>
                </div>
                <button 
                    onClick={refetch} 
                    className="p-1 bg-white/5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-all border border-white/5"
                >
                    <RefreshCw size={12} />
                </button>
            </div>

            <div className="space-y-2">
                <div className="relative group">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-blue-400 transition-colors" />
                    <input 
                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-micro text-white placeholder:text-slate-800 focus:outline-none focus:border-blue-500/30 transition-all"
                        placeholder="Search payroll..." 
                        value={search} 
                        onChange={e => setSearch(e.target.value)} 
                    />
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-2">
                        <Loader size={24} className="animate-spin text-blue-500" />
                        <p className="text-micro text-slate-600 font-medium animate-pulse">Loading payroll...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/5">
                        <Box size={32} className="text-slate-800 mx-auto mb-2" />
                        <p className="text-micro text-slate-500 font-black uppercase tracking-widest">No matching records</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-1">
                        {filtered.map((emp) => (
                            <motion.div
                                key={emp.employeeId}
                                initial={{ opacity: 0, y: 8 }} 
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white/5 border border-white/5 rounded-xl p-2 hover:border-blue-500/30 transition-all cursor-pointer group flex flex-col justify-between"
                                onClick={() => setSelectedEmployee(emp)}
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-blue-400 font-black text-sm border border-white/5">
                                            {emp.name?.charAt(0)}
                                        </div>
                                        <span className="text-micro font-black uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                            {formatCurr(emp.baseSalary)}
                                        </span>
                                    </div>
                                    <h3 className="text-white font-black text-micro uppercase italic truncate max-w-full group-hover:text-blue-300 transition-colors">{emp.name}</h3>
                                    <p className="text-slate-700 text-micro font-mono tracking-tighter uppercase">{emp.employeeId}</p>
                                </div>
                                <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-1.5">
                                    <span className="text-micro font-black text-slate-800 uppercase tracking-widest">{emp.role || 'Staff'}</span>
                                    <div className="flex items-center gap-1 text-micro font-black text-indigo-400">
                                        Settle
                                        <FileText size={10} />
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
