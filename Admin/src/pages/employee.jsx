import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Plus, Search, Eye, Edit3, Trash2, Loader,
    CheckCircle, AlertTriangle, X, User, GraduationCap,
    Star, Building, RefreshCw, Briefcase, Phone, Mail, BookOpen
} from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080/api";
const getSchoolId = () => localStorage.getItem('schoolId') || "622079";

const typeColor = {
    'Teacher': 'bg-indigo-500/15 border-indigo-500/25 text-indigo-400',
    'Principal': 'bg-violet-500/15 border-violet-500/25 text-violet-400',
    'Vice Principal': 'bg-purple-500/15 border-purple-500/25 text-purple-400',
    'Admin Staff': 'bg-slate-500/15 border-slate-500/30 text-slate-400',
    'default': 'bg-blue-500/15 border-blue-500/25 text-blue-400',
};

export default function EmployeeManagement() {
    const schoolId = getSchoolId();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [toast, setToast] = useState(null);
    const [viewEmp, setViewEmp] = useState(null);
    const [addEmpDialog, setAddEmpDialog] = useState(false);
    const [addEmpLoading, setAddEmpLoading] = useState(false);
    const [addEmpForm, setAddEmpForm] = useState({
        name: '', employeeType: 'Teacher', email: '', phone: '', subject: '', department: '', baseSalary: '', address: ''
    });

    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/employees/${schoolId}/employees`);
            const data = await res.json();
            setEmployees(data.data || data.employees || []);
        } catch {
            showToast('error', 'Failed to load employees');
        } finally {
            setLoading(false);
        }
    };

    const addEmployee = async () => {
        if (!addEmpForm.name) return showToast('error', 'Name is required');
        setAddEmpLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/employees/${schoolId}/employees`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...addEmpForm, baseSalary: parseFloat(addEmpForm.baseSalary) || 0 })
            });
            if (!res.ok) throw new Error();
            showToast('success', 'Employee added');
            setAddEmpDialog(false);
            setAddEmpForm({ name: '', employeeType: 'Teacher', email: '', phone: '', subject: '', department: '', baseSalary: '', address: '' });
            fetchEmployees();
        } catch { showToast('error', 'Failed to add employee'); }
        finally { setAddEmpLoading(false); }
    };

    const deleteEmployee = async (emp) => {
        const id = emp.employeeId || emp.employee_id || emp.id;
        if (!id) return;
        try {
            await fetch(`${API_BASE_URL}/employees/${schoolId}/employees/${id}`, { method: 'DELETE' });
            setEmployees(prev => prev.filter(e => (e.employeeId || e.employee_id || e.id) !== id));
            showToast('success', 'Employee removed');
        } catch {
            showToast('error', 'Delete failed');
        }
    };

    useEffect(() => { fetchEmployees(); }, [schoolId]);

    const types = ['All', 'Teacher', 'Principal', 'Vice Principal', 'Admin Staff'];
    const filtered = employees.filter(e => {
        const name = (e.name || e.employeeName || e.employee_name || '').toLowerCase();
        const type = e.employeeType || e.type || e.employee_type || '';

        const matchesSearch = name.includes(search.toLowerCase());
        const matchesType = filterType === 'All' || type === filterType;

        return matchesSearch && matchesType;
    });

    const getTypeClass = (t) => typeColor[t] || typeColor.default;

    return (
        <div className="min-h-full">
            <div className="page-header flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center">
                        <Users size={18} className="text-violet-400" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-white">Employee Management</h1>
                        <p className="text-xs text-slate-500">{employees.length} staff members</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchEmployees} className="btn-secondary p-2"><RefreshCw size={15} /></button>
                    <button onClick={() => setAddEmpDialog(true)} className="btn-primary"><Plus size={15} /> Add Employee</button>
                </div>
            </div>

            <div className="p-6 space-y-5">
                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {types.filter(t => t !== 'All').map(t => {
                        const count = employees.filter(e => (e.employeeType || e.type) === t).length;
                        return (
                            <div key={t} className="glass-card p-4">
                                <p className="text-lg font-bold text-white">{count}</p>
                                <p className="text-slate-500 text-xs">{t}</p>
                            </div>
                        );
                    })}
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input className="input-dark pl-9" placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <select className="input-dark sm:w-44" value={filterType} onChange={e => setFilterType(e.target.value)}>
                        {types.map(t => <option key={t} value={t}>{t === 'All' ? 'All Types' : t}</option>)}
                    </select>
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader size={28} className="animate-spin text-indigo-400" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <Users size={36} className="text-slate-600 mx-auto mb-2" />
                        <p className="text-slate-500">No employees found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.map((emp, i) => {
                            const id = emp.employeeId || emp.employee_id || emp.id;
                            const name = emp.employeeName || emp.employee_name || emp.name || 'Unknown';
                            const type = emp.employeeType || emp.employee_type || emp.type || 'Staff';
                            return (
                                <motion.div
                                    key={id || i}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.04 }}
                                    className="glass-card p-5 hover-card"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/30 to-violet-500/30 flex items-center justify-center">
                                                <span className="text-white font-bold text-base">{name[0]}</span>
                                            </div>
                                            <div>
                                                <p className="font-semibold text-white text-sm">{name}</p>
                                                <p className="font-mono text-xs text-slate-500">{id}</p>
                                            </div>
                                        </div>
                                        <span className={`badge ${getTypeClass(type)}`}>{type}</span>
                                    </div>
                                    {emp.subject && <p className="text-xs text-slate-500 mb-1"><BookOpen size={11} className="inline mr-1" />{emp.subject}</p>}
                                    <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                                        <button onClick={() => setViewEmp(emp)} className="flex-1 btn-secondary py-1.5 text-xs justify-center">
                                            <Eye size={13} /> View
                                        </button>
                                        <button onClick={() => deleteEmployee(emp)} className="btn-danger py-1.5 text-xs">
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Drawer */}
            <AnimatePresence>
                {viewEmp && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                            onClick={() => setViewEmp(null)}
                        />
                        <motion.div
                            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="drawer-panel p-6 space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <h2 className="font-bold text-white">Employee Profile</h2>
                                <button onClick={() => setViewEmp(null)} className="text-slate-500 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition-all">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white">
                                    {(viewEmp.name || viewEmp.employeeName || 'E')[0]}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">{viewEmp.name || viewEmp.employeeName}</h3>
                                    <p className="text-xs text-violet-400">{viewEmp.employeeType || viewEmp.type}</p>
                                    <p className="font-mono text-xs text-slate-500">{viewEmp.employeeId || viewEmp.employee_id}</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {[
                                    ['Email', viewEmp.email],
                                    ['Phone', viewEmp.phone || viewEmp.contact],
                                    ['Department', viewEmp.department],
                                    ['Subject', viewEmp.subject],
                                    ['Salary', viewEmp.baseSalary ? `₹${Number(viewEmp.baseSalary).toLocaleString()}` : null],
                                    ['Address', viewEmp.address],
                                ].map(([k, v]) => v ? (
                                    <div key={k} className="flex justify-between items-start gap-3 py-2 border-b border-white/5">
                                        <span className="text-slate-500 text-xs flex-shrink-0">{k}</span>
                                        <span className="text-white text-xs text-right">{v}</span>
                                    </div>
                                ) : null)}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Add Employee Modal */}
            <AnimatePresence>
                {addEmpDialog && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setAddEmpDialog(false)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="modal-box w-full max-w-lg" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="font-bold text-white text-base">Add New Employee</h3>
                                <button onClick={() => setAddEmpDialog(false)} className="text-slate-500 hover:text-white p-1 hover:bg-white/10 rounded-lg"><X size={18} /></button>
                            </div>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="section-label">Full Name *</label>
                                        <input className="input-dark" placeholder="Employee name" value={addEmpForm.name} onChange={e => setAddEmpForm(p => ({ ...p, name: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="section-label">Type *</label>
                                        <select className="input-dark" value={addEmpForm.employeeType} onChange={e => setAddEmpForm(p => ({ ...p, employeeType: e.target.value }))}>
                                            <option value="Teacher">Teacher</option>
                                            <option value="Principal">Principal</option>
                                            <option value="Vice Principal">Vice Principal</option>
                                            <option value="Admin Staff">Admin Staff</option>
                                            <option value="Peon">Peon</option>
                                            <option value="Security Guard">Security Guard</option>
                                            <option value="Librarian">Librarian</option>
                                            <option value="Lab Assistant">Lab Assistant</option>
                                            <option value="Sports Coach">Sports Coach</option>
                                            <option value="Counselor">Counselor</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="section-label">Email</label>
                                        <input className="input-dark" type="email" placeholder="email@school.com" value={addEmpForm.email} onChange={e => setAddEmpForm(p => ({ ...p, email: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="section-label">Phone</label>
                                        <input className="input-dark" placeholder="Phone number" value={addEmpForm.phone} onChange={e => setAddEmpForm(p => ({ ...p, phone: e.target.value }))} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="section-label">Subject</label>
                                        <input className="input-dark" placeholder="e.g. Mathematics" value={addEmpForm.subject} onChange={e => setAddEmpForm(p => ({ ...p, subject: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="section-label">Department</label>
                                        <input className="input-dark" placeholder="e.g. Science" value={addEmpForm.department} onChange={e => setAddEmpForm(p => ({ ...p, department: e.target.value }))} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="section-label">Base Salary (₹)</label>
                                        <input className="input-dark" type="number" placeholder="Monthly salary" value={addEmpForm.baseSalary} onChange={e => setAddEmpForm(p => ({ ...p, baseSalary: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="section-label">Address</label>
                                        <input className="input-dark" placeholder="Home address" value={addEmpForm.address} onChange={e => setAddEmpForm(p => ({ ...p, address: e.target.value }))} />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 justify-end mt-6">
                                <button onClick={() => setAddEmpDialog(false)} className="btn-secondary">Cancel</button>
                                <button onClick={addEmployee} disabled={addEmpLoading} className="btn-primary">
                                    {addEmpLoading ? <Loader size={15} className="animate-spin" /> : <Plus size={15} />}
                                    {addEmpLoading ? 'Adding...' : 'Add Employee'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

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
