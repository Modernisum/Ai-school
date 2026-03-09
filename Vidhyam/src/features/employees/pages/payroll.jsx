import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CreditCard, Search, Loader, Box, RefreshCw, X, AlertTriangle, CheckCircle, IndianRupee, FileText
} from 'lucide-react';
import { useLocation } from 'react-router-dom';

const EMP_API_BASE = import.meta.env.VITE_API_BASE_URL + "/employees";
const PAYROLL_API_BASE = import.meta.env.VITE_API_BASE_URL + "/emppay";

const getSchoolId = () => {
    const keys = ['schoolId', 'school_id'];
    for (const k of keys) { const v = localStorage.getItem(k); if (v && v !== 'undefined') return v; }
    return "622079";
};

export default function PayrollManagement() {
    const schoolId = getSchoolId();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Modals / Details
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [salaryBreakdown, setSalaryBreakdown] = useState(null);
    const [breakdownLoading, setBreakdownLoading] = useState(false);

    const [toast, setToast] = useState(null);

    const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); };

    const loadEmployees = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${EMP_API_BASE}/${schoolId}/employees`);
            const data = await res.json();
            setEmployees(data.data || []);
        } catch { showToast('error', 'Failed to load employees'); }
        finally { setLoading(false); }
    };

    const loadSalaryBreakdown = async (employeeId) => {
        setBreakdownLoading(true);
        setSalaryBreakdown(null);
        try {
            const res = await fetch(`${PAYROLL_API_BASE}/${schoolId}/${employeeId}/breakdown`);
            const data = await res.json();
            if (data.success) {
                setSalaryBreakdown(data.data || data.breakdown);
            } else {
                showToast('error', data.message || 'Failed to load salary breakdown');
            }
        } catch {
            showToast('error', 'Error fetching salary details');
        } finally {
            setBreakdownLoading(false);
        }
    };

    const autoCloseMonth = async (employeeId) => {
        try {
            const res = await fetch(`${PAYROLL_API_BASE}/${schoolId}/${employeeId}/close-month`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (data.success) {
                showToast('success', 'Month closed and salary record generated successfully.');
                setSelectedEmployee(null); // close modal
            } else {
                showToast('error', data.message || 'Failed to close month');
            }
        } catch {
            showToast('error', 'Error generating payroll record');
        }
    };

    useEffect(() => {
        loadEmployees();
    }, [schoolId]);

    const filtered = employees.filter(e =>
        (e.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (e.employeeId || '').toLowerCase().includes(search.toLowerCase())
    );

    const formatCurr = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(val || 0);

    return (
        <div className="min-h-full">
            <div className="page-header flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-500/20 flex items-center justify-center">
                        <CreditCard size={18} className="text-green-400" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-white">Payroll & Salary Automation</h1>
                        <p className="text-xs text-slate-500">Manage monthly salaries and closing</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={loadEmployees} className="btn-secondary p-2"><RefreshCw size={15} /></button>
                </div>
            </div>

            <div className="p-6 space-y-4">
                <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input className="input-dark pl-9" placeholder="Search employees by name or ID..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20"><Loader size={28} className="animate-spin text-indigo-400" /></div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-14">
                        <Box size={36} className="text-slate-600 mx-auto mb-2" />
                        <p className="text-slate-500">No employees found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.map((emp) => (
                            <motion.div
                                key={emp.employeeId}
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                className="glass-card p-4 hover:bg-white/[0.03] transition-colors cursor-pointer group"
                                onClick={() => { setSelectedEmployee(emp); loadSalaryBreakdown(emp.employeeId); }}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="text-white font-medium truncate">{emp.name}</h3>
                                        <p className="text-slate-500 text-xs font-mono">{emp.employeeId}</p>
                                    </div>
                                    <span className="badge bg-green-500/10 border-green-500/20 text-green-400">
                                        {formatCurr(emp.baseSalary || 0)} Base
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mt-4 text-xs font-medium text-slate-400 group-hover:text-white transition-colors">
                                    <FileText size={14} /> View Salary Breakdown
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Salary Breakdown Modal */}
            <AnimatePresence>
                {selectedEmployee && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setSelectedEmployee(null)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="modal-box max-w-lg w-full" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h3 className="font-bold text-white">Salary Breakdown</h3>
                                    <p className="text-slate-500 text-xs">{selectedEmployee.name} ({selectedEmployee.employeeId})</p>
                                </div>
                                <button onClick={() => setSelectedEmployee(null)} className="text-slate-500 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-all"><X size={18} /></button>
                            </div>

                            {breakdownLoading ? (
                                <div className="flex items-center justify-center py-10"><Loader size={24} className="animate-spin text-indigo-400" /></div>
                            ) : salaryBreakdown ? (
                                <div className="space-y-4">
                                    <div className="bg-white/5 rounded-xl p-4 border border-white/5 space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-400">Base Salary</span>
                                            <span className="text-white font-medium">{formatCurr(salaryBreakdown.baseSalary)}</span>
                                        </div>
                                        {salaryBreakdown.spacesComponent > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-400">Responsibilities (Spaces)</span>
                                                <span className="text-white font-medium">{formatCurr(salaryBreakdown.spacesComponent)}</span>
                                            </div>
                                        )}
                                        {salaryBreakdown.experienceComponent > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-400">Experience Component</span>
                                                <span className="text-white font-medium">{formatCurr(salaryBreakdown.experienceComponent)}</span>
                                            </div>
                                        )}
                                        {salaryBreakdown.bonus > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-green-400">Bonus</span>
                                                <span className="text-green-400 font-medium">+ {formatCurr(salaryBreakdown.bonus)}</span>
                                            </div>
                                        )}
                                        {salaryBreakdown.aid > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-green-400">Financial Aid</span>
                                                <span className="text-green-400 font-medium">+ {formatCurr(salaryBreakdown.aid)}</span>
                                            </div>
                                        )}

                                        <div className="border-t border-white/10 pt-2 flex justify-between text-sm">
                                            <span className="text-slate-300 font-medium">Gross Salary</span>
                                            <span className="text-white font-bold">{formatCurr(salaryBreakdown.grossSalary)}</span>
                                        </div>

                                        {salaryBreakdown.absentDays > 0 && (
                                            <div className="flex justify-between text-sm text-rose-400 bg-rose-500/5 p-2 rounded flex-col">
                                                <div className="flex justify-between">
                                                    <span>Absence Deductions ({salaryBreakdown.absentDays} days)</span>
                                                    <span className="font-medium">- {formatCurr(salaryBreakdown.deductions)}</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="border-t border-white/10 pt-2 flex justify-between text-lg">
                                            <span className="text-indigo-300 font-bold">Net Monthly Pay</span>
                                            <span className="text-indigo-400 font-black">{formatCurr(salaryBreakdown.netMonthlySalary)}</span>
                                        </div>
                                    </div>

                                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-3 rounded-lg text-xs flex gap-2">
                                        <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                                        <div>
                                            Closing the month will lock this salary, record a payroll transaction, and mark any unsettled advance balances against the employee.
                                        </div>
                                    </div>

                                    <div className="flex gap-3 justify-end mt-6">
                                        <button onClick={() => autoCloseMonth(selectedEmployee.employeeId)} className="btn-primary w-full">
                                            Generate Salary & Close Month
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-10 text-center text-slate-500 text-sm">Could not load salary data.</div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className={`fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-xl
              ${toast.type === 'success' ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/20 border border-rose-500/30 text-rose-300'}`}>
                        {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
                        {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
