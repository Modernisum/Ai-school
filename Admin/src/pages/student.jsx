import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, Users, Plus, Edit3, Eye, Loader, AlertTriangle,
    X, CheckCircle, User, GraduationCap, RefreshCw
} from 'lucide-react';
import AddStudentDrawer from '../component/ui/addstudent';
import StudentProfile from '../component/ui/studentprofile';

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

    // Drawer states
    const [addDrawerOpen, setAddDrawerOpen] = useState(false);
    const [profileDrawer, setProfileDrawer] = useState(null); // { student, mode: 'view'|'edit' }

    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
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
                    <button onClick={() => setAddDrawerOpen(true)} className="btn-primary">
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
                            <p className="text-slate-600 text-xs mt-1">Click "Add Student" to enroll your first student</p>
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
                                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
                                                        {(s.studentName || s.name || 'S')[0].toUpperCase()}
                                                    </div>
                                                    <span className="font-medium text-white">{s.studentName || s.student_name || s.name || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td><span className="font-mono text-xs text-violet-400">{s.studentId || s.student_id || 'N/A'}</span></td>
                                            <td><span className="badge bg-indigo-500/15 border-indigo-500/25 text-indigo-300">{s.classId || s.class_id || s.className || 'N/A'}</span></td>
                                            <td className="text-xs text-slate-500">{formatDate(s.createdAt || s.created_at)}</td>
                                            <td>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => setProfileDrawer({ student: s, mode: 'view' })}
                                                        title="View profile"
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                                                    >
                                                        <Eye size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => setAddDrawerOpen({ studentId: s.studentId || s.student_id, mode: 'edit' })}
                                                        title="Edit student"
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                                    >
                                                        <Edit3 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Add / Edit Student Drawer */}
            <AnimatePresence>
                {addDrawerOpen && (
                    <AddStudentDrawer
                        open={true}
                        onClose={() => { setAddDrawerOpen(false); }}
                        onSuccess={() => { setAddDrawerOpen(false); fetchData(); showToast('success', 'Student saved successfully'); }}
                        classes={classes}
                        initialClass={typeof addDrawerOpen === 'object' ? '' : ''}
                        initialStudentId={typeof addDrawerOpen === 'object' ? addDrawerOpen.studentId : ''}
                        initialMode={typeof addDrawerOpen === 'object' ? addDrawerOpen.mode : 'add'}
                    />
                )}
            </AnimatePresence>

            {/* Student Profile Drawer */}
            <AnimatePresence>
                {profileDrawer && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                            onClick={() => setProfileDrawer(null)}
                        />
                        <motion.div
                            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="drawer-panel p-6 space-y-5"
                        >
                            <div className="flex items-center justify-between">
                                <h2 className="font-bold text-white">Student Profile</h2>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setProfileDrawer(p => ({ ...p, mode: p.mode === 'view' ? 'edit' : 'view' }))}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${profileDrawer.mode === 'edit'
                                                ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                                                : 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30'
                                            }`}
                                    >
                                        {profileDrawer.mode === 'edit' ? <><CheckCircle size={13} /> View</> : <><Edit3 size={13} /> Edit</>}
                                    </button>
                                    <button onClick={() => setProfileDrawer(null)} className="text-slate-500 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition-all">
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Student Quick Info */}
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-2xl font-bold text-white">
                                    {(profileDrawer.student.studentName || profileDrawer.student.name || 'S')[0]}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">{profileDrawer.student.studentName || profileDrawer.student.student_name || profileDrawer.student.name}</h3>
                                    <p className="text-xs text-indigo-400 font-mono">{profileDrawer.student.studentId || profileDrawer.student.student_id}</p>
                                    <span className="badge bg-indigo-500/15 border-indigo-500/25 text-indigo-300 mt-1">{profileDrawer.student.classId || profileDrawer.student.className || 'N/A'}</span>
                                </div>
                            </div>

                            {/* Student Details */}
                            <div className="space-y-2">
                                {[
                                    ['Gender', profileDrawer.student.gender],
                                    ['Date of Birth', formatDate(profileDrawer.student.dob || profileDrawer.student.date_of_birth)],
                                    ['Father / Parent', profileDrawer.student.fatherName || profileDrawer.student.parentName || profileDrawer.student.parent_name],
                                    ['Mother', profileDrawer.student.motherName],
                                    ['Contact', profileDrawer.student.contact || profileDrawer.student.phone],
                                    ['Address', profileDrawer.student.permanentAddress || profileDrawer.student.address],
                                    ['Category', profileDrawer.student.category],
                                    ['Joined', formatDate(profileDrawer.student.createdAt || profileDrawer.student.created_at)],
                                ].map(([k, v]) => v ? (
                                    <div key={k} className="flex justify-between items-start gap-3 py-2 border-b border-white/5">
                                        <span className="text-slate-500 text-xs flex-shrink-0 w-28">{k}</span>
                                        <span className={`text-xs text-right ${profileDrawer.mode === 'edit' ? 'text-indigo-300' : 'text-white'}`}>{v}</span>
                                    </div>
                                ) : null)}
                            </div>

                            {profileDrawer.mode === 'edit' && (
                                <div className="pt-2">
                                    <button
                                        onClick={() => {
                                            setProfileDrawer(null);
                                            setAddDrawerOpen({
                                                studentId: profileDrawer.student.studentId || profileDrawer.student.student_id,
                                                mode: 'edit'
                                            });
                                        }}
                                        className="btn-primary w-full justify-center"
                                    >
                                        <Edit3 size={14} /> Open Full Edit Form
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </>
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
