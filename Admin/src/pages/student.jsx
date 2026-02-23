import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Users, Plus, Edit3, Eye, Loader, AlertTriangle,
    X, CheckCircle, User, GraduationCap, MoreVertical,
    RefreshCw, ChevronDown
} from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080/api";
const getSchoolId = () => localStorage.getItem('schoolId') || "622079";

const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date._seconds ? new Date(date._seconds * 1000) : new Date(date);
    return isNaN(d) ? 'N/A' : d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
};

const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.35 } })
};

export default function StudentManagement() {
    const schoolId = getSchoolId();
    const [students, setStudents] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterClass, setFilterClass] = useState('All');
    const [toast, setToast] = useState(null);
    const [addDialog, setAddDialog] = useState(false);
    const [addForm, setAddForm] = useState({ name: '', className: '', gender: '', dob: '', parentName: '', contact: '', address: '' });
    const [addLoading, setAddLoading] = useState(false);
    const [viewStudent, setViewStudent] = useState(null);

    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    };

    const addStudent = async () => {
        if (!addForm.name || !addForm.className) return showToast('error', 'Name and Class are required');
        setAddLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/students/${schoolId}/students`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(addForm)
            });
            if (!res.ok) throw new Error();
            showToast('success', 'Student added successfully');
            setAddDialog(false);
            setAddForm({ name: '', className: '', gender: '', dob: '', parentName: '', contact: '', address: '' });
            fetchData();
        } catch { showToast('error', 'Failed to add student'); }
        finally { setAddLoading(false); }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [sRes, cRes] = await Promise.all([
                fetch(`${API_BASE_URL}/students/${schoolId}/students`),
                fetch(`${API_BASE_URL}/class/${schoolId}/classes`)
            ]);
            const sData = await sRes.json();
            const cData = await cRes.json();
            setStudents(sData.data || sData.students || []);
            setClasses((cData.data || cData.classes || []).map(c => c.name || c.className || c));
        } catch (e) {
            showToast('error', 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [schoolId]);

    const filtered = students.filter(s => {
        const name = (s.name || s.studentName || s.student_name || '').toLowerCase();
        const id = (s.studentId || s.student_id || '').toLowerCase();
        const sClass = s.className || s.classId || s.class_id || '';

        const matchesSearch = name.includes(searchTerm.toLowerCase()) || id.includes(searchTerm.toLowerCase());
        const matchesClass = filterClass === 'All' || sClass === filterClass;

        return matchesSearch && matchesClass;
    });

    return (
        <div className="min-h-full">
            {/* Header */}
            <div className="page-header flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                        <Users size={18} className="text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-white">Student Management</h1>
                        <p className="text-xs text-slate-500">{students.length} total students</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchData} className="btn-secondary p-2"><RefreshCw size={15} /></button>
                    <button onClick={() => setAddDialog(true)} className="btn-primary">
                        <Plus size={15} /> Add Student
                    </button>
                </div>
            </div>

            <div className="p-6 space-y-5">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            className="input-dark pl-9"
                            placeholder="Search by name or ID..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="input-dark sm:w-44"
                        value={filterClass}
                        onChange={e => setFilterClass(e.target.value)}
                    >
                        <option value="All">All Classes</option>
                        {classes.map((c, i) => <option key={i} value={c}>{c}</option>)}
                    </select>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'Total', value: students.length, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
                        { label: 'Filtered', value: filtered.length, color: 'text-violet-400', bg: 'bg-violet-500/10' },
                        { label: 'Classes', value: classes.length, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                    ].map((s, i) => (
                        <div key={i} className="glass-card p-4 text-center">
                            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                            <p className="text-slate-500 text-xs mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Table */}
                <div className="glass-card overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader size={28} className="animate-spin text-indigo-400" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-16">
                            <GraduationCap size={36} className="text-slate-600 mx-auto mb-2" />
                            <p className="text-slate-500">No students found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="dark-table">
                                <thead>
                                    <tr>
                                        <th>#</th><th>Name</th><th>ID</th><th>Class</th><th>Joined</th><th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((s, i) => (
                                        <motion.tr
                                            key={s.studentId || s.student_id || i}
                                            custom={i}
                                            variants={fadeUp}
                                            initial="hidden"
                                            animate="visible"
                                        >
                                            <td className="text-slate-500 text-xs">{i + 1}</td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                                        <User size={13} className="text-indigo-400" />
                                                    </div>
                                                    <span className="font-medium text-white">{s.studentName || s.student_name || s.name || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td><span className="font-mono text-xs text-violet-400">{s.studentId || s.student_id || 'N/A'}</span></td>
                                            <td><span className="badge bg-indigo-500/15 border-indigo-500/25 text-indigo-300">{s.classId || s.class_id || s.className || 'N/A'}</span></td>
                                            <td className="text-xs text-slate-500">{formatDate(s.createdAt || s.created_at)}</td>
                                            <td>
                                                <button
                                                    onClick={() => setViewStudent(s)}
                                                    className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                                                >
                                                    <Eye size={14} />
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Drawer: View Student */}
            <AnimatePresence>
                {viewStudent && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                            onClick={() => setViewStudent(null)}
                        />
                        <motion.div
                            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="drawer-panel p-6 space-y-5"
                        >
                            <div className="flex items-center justify-between">
                                <h2 className="font-bold text-white">Student Details</h2>
                                <button onClick={() => setViewStudent(null)} className="text-slate-500 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition-all">
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-2xl font-bold text-white">
                                    {(viewStudent.studentName || viewStudent.name || 'S')[0]}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">{viewStudent.studentName || viewStudent.student_name || viewStudent.name}</h3>
                                    <p className="text-xs text-indigo-400 font-mono">{viewStudent.studentId || viewStudent.student_id}</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {[
                                    ['Class', viewStudent.classId || viewStudent.class_id || viewStudent.className],
                                    ['Gender', viewStudent.gender],
                                    ['Date of Birth', formatDate(viewStudent.dob || viewStudent.date_of_birth)],
                                    ['Parent Name', viewStudent.parentName || viewStudent.parent_name],
                                    ['Contact', viewStudent.contact || viewStudent.phone],
                                    ['Address', viewStudent.address],
                                    ['Joined', formatDate(viewStudent.createdAt || viewStudent.created_at)],
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

            {/* Add Student Modal */}
            <AnimatePresence>
                {addDialog && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setAddDialog(false)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="modal-box w-full max-w-lg" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="font-bold text-white text-base">Add New Student</h3>
                                <button onClick={() => setAddDialog(false)} className="text-slate-500 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-all"><X size={18} /></button>
                            </div>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="section-label">Full Name *</label>
                                        <input className="input-dark" placeholder="Student name" value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="section-label">Class *</label>
                                        <select className="input-dark" value={addForm.className} onChange={e => setAddForm(p => ({ ...p, className: e.target.value }))}>
                                            <option value="">Select class</option>
                                            {classes.map((c, i) => <option key={i} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="section-label">Gender</label>
                                        <select className="input-dark" value={addForm.gender} onChange={e => setAddForm(p => ({ ...p, gender: e.target.value }))}>
                                            <option value="">Select</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="section-label">Date of Birth</label>
                                        <input type="date" className="input-dark" value={addForm.dob} onChange={e => setAddForm(p => ({ ...p, dob: e.target.value }))} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="section-label">Parent Name</label>
                                        <input className="input-dark" placeholder="Parent / Guardian" value={addForm.parentName} onChange={e => setAddForm(p => ({ ...p, parentName: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="section-label">Contact</label>
                                        <input className="input-dark" placeholder="Phone number" value={addForm.contact} onChange={e => setAddForm(p => ({ ...p, contact: e.target.value }))} />
                                    </div>
                                </div>
                                <div>
                                    <label className="section-label">Address</label>
                                    <input className="input-dark" placeholder="Home address" value={addForm.address} onChange={e => setAddForm(p => ({ ...p, address: e.target.value }))} />
                                </div>
                            </div>
                            <div className="flex gap-3 justify-end mt-6">
                                <button onClick={() => setAddDialog(false)} className="btn-secondary">Cancel</button>
                                <button onClick={addStudent} disabled={addLoading} className="btn-primary">
                                    {addLoading ? <Loader size={15} className="animate-spin" /> : <Plus size={15} />}
                                    {addLoading ? 'Adding...' : 'Add Student'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

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
