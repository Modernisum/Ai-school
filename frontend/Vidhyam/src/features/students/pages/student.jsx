import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { getSchoolIdFromStorage } from '../../../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserPlus, FileDown, Search,
  ChevronRight, Filter, MoreVertical, Eye,
  Edit, Trash2, Calendar, CheckCircle, Clock,
  X, UserX, Info, Download, Upload, RefreshCw, UploadCloud,
  Plus, Edit3, Loader, AlertTriangle, GraduationCap,
  TrendingUp, UserCheck, CalendarCheck, ClipboardList,
  DollarSign, Zap, FilterX, Activity, Cpu, ShieldCheck, Database, Layers
} from 'lucide-react';

import BulkImportModal from '../../../components/ui/BulkImportModal';
import AddStudentPage from '../components/addstudent';
import GlassCard from '../../../components/ui/GlassCard';
import KPITile from '../../../components/ui/KPITile';
import KPIWidget from '../../../components/ui/KPIWidget';
import SkeletonLoader from '../../../components/ui/SkeletonLoader';
import { useGetStudentsQuery, useDeleteStudentMutation, useUpdateStudentMutation } from '../api/studentApi';
import { academicApi } from '../../academics/api/academicApi';
const { useGetClassesQuery, useGetAdvancedAttendanceQuery } = academicApi;
import { selectPollingInterval } from '../../settings/settingsSlice';
import { setOnline } from "../../settings/settingsSlice";
import DropdownWidget from '../../../components/ui/DropdownWidget';
import FormWidget from '../../../components/ui/FormWidget';
import StandardButton from '../../../components/ui/StandardButton';
import ChartWidget from '../../../components/ui/ChartWidget';
import DataGrid from '../../../components/ui/DataGrid';

const API = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8080/api`;
const getSchoolId = () => getSchoolIdFromStorage() || ''; 
const fmtMoney = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const fmtDate = (date) => {
    if (!date) return 'N/A';
    const d = date._seconds ? new Date(date._seconds * 1000) : new Date(date);
    return isNaN(d) ? 'N/A' : d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
};

// ─── Animation Presets ──────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
};

const stagger = {
  visible: { transition: { staggerChildren: 0.05 } }
};


// ─── Profile Attendance Pulse ───────────────────────────────────────────────
function AttendancePulse({ userId, schoolId }) {
    const { data: attData, isLoading } = useGetAdvancedAttendanceQuery({
        school_id: schoolId,
        user_ids: userId,
        period: 'month',
        fields: 'date,present'
    }, { skip: !userId || !schoolId });

    if (isLoading) return <SkeletonLoader variant="card" className="h-40" />;

    const trend = (attData?.records || []).map(r => ({
        label: r.date.split('-').slice(2).join('/'),
        value: r.present ? 1 : 0
    }));

    const attendancePct = attData?.summary?.attendance_percentage || 0;

    return (
        <div className="space-y-4 mt-6 pt-6 border-t border-[var(--glass-border)]">
            <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-widest flex items-center gap-2">
                    <Activity size={14} className="text-primary" /> Attendance Pulse
                </h4>
                <span className={`text-[10px] font-black uppercase ${attendancePct >= 75 ? 'text-success' : 'text-accent'}`}>
                    Avg: {attendancePct.toFixed(1)}%
                </span>
            </div>
            
            <ChartWidget
                type="line"
                data={trend}
                categories={trend.map(t => t.label)}
                title=""
                className="!p-0 h-32 border-none bg-transparent"
                options={{ height: 100 }}
                showLegend={false}
                showGrid={false}
            />
        </div>
    );
}

// ─── Profile Fee Summary ────────────────────────────────────────────────────
function ProfileFeeSummary({ studentId, schoolId }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!studentId || !schoolId) return;
        setLoading(true);
        fetch(`${API}/students/${schoolId}/students/${studentId}/profile`)
            .then(r => r.json())
            .then(d => { if (d.success) setProfile(d.data); })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [studentId, schoolId]);

    if (loading) return <SkeletonLoader variant="card" className="h-40" />;
    if (!profile) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-[var(--text-main)] uppercase tracking-widest flex items-center gap-2">
                  <DollarSign size={16} className="text-success" /> Financial Pulse
              </h4>
              <span className="text-[10px] bg-success/10 text-success px-3 py-1 rounded-full border border-success/20 font-black uppercase">Verified</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {[
                    ['Subject Fees', fmtMoney(profile.subjectFees), 'text-primary', 'bg-primary/5', 'border-primary/10'],
                    ['Custom Fees', fmtMoney(profile.totalCustomFees), 'text-secondary', 'bg-secondary/5', 'border-secondary/10'],
                    ['Penalties', fmtMoney(profile.totalPenalty), 'text-accent', 'bg-accent/5', 'border-accent/10'],
                    ['Discounts', fmtMoney(profile.discount), 'text-warning', 'bg-warning/5', 'border-warning/10'],
                ].map(([label, val, color, bg, border]) => (
                    <div key={label} className={`${bg} ${border} border rounded-2xl p-4 transition-all hover:scale-105`}>
                        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-tighter mb-1">{label}</p>
                        <p className={`text-lg font-black ${color}`}>{val}</p>
                    </div>
                ))}
            </div>

            <GlassCard className="p-5 border-primary/20 bg-gradient-to-br from-primary/10 to-transparent">
                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Net Liability</p>
                        <p className="text-2xl font-black text-[var(--text-main)]">{fmtMoney(profile.totalAmount)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-accent uppercase tracking-widest">Pending</p>
                        <p className="text-xl font-black text-accent">{fmtMoney(profile.totalPending)}</p>
                    </div>
                </div>
                <div className="mt-4 h-1.5 w-full bg-[var(--bg-main)] rounded-full overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }} animate={{ width: `${Math.min(100, (profile.totalPaid / (profile.totalAmount || 1)) * 100)}%` }}
                     className="h-full bg-success shadow-[0_0_10px_var(--success-color)]" />
                </div>
                <p className="text-[9px] text-[var(--text-muted)] mt-2 font-bold uppercase tracking-widest text-center">Settled: {fmtMoney(profile.totalPaid)}</p>
            </GlassCard>
        </div>
    );
}

export default function StudentManagement() {
    const location = useLocation();
    const dispatch = useDispatch();
    const schoolId = getSchoolId();
    const pollingInterval = useSelector(selectPollingInterval);

    const { data: sData, isLoading: sLoading } = useGetStudentsQuery(schoolId, { pollingInterval });
    const { data: classData = [] } = useGetClassesQuery(schoolId, { skip: !schoolId });
    const [deleteStudent] = useDeleteStudentMutation();
    const [updateStudent] = useUpdateStudentMutation();
    
    const students = useMemo(() => sData?.data || sData?.students || [], [sData]);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterClass, setFilterClass] = useState('All');
    const [toast, setToast] = useState(null);
    const [editStudentId, setEditStudentId] = useState(null);
    const [profileDrawer, setProfileDrawer] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null); 

    const navigate = useNavigate();

    const showToast = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3500); };

    const handleDeleteStudent = async (sid) => {
        try {
            const res = await deleteStudent({ schoolId, studentId: sid }).unwrap();
            if (res.success) showToast('success', 'Student Deleted');
            else throw new Error(res.message);
        } catch (e) { showToast('error', 'Operation Failed'); }
        finally { setConfirmAction(null); }
    };

    // ── Grid Configurations ───────────────────────────────────────────────────
    const classes = useMemo(() => classData.map(c => c.name || c.className || (typeof c === 'string' ? c : '')), [classData]);
    
    const filtered = useMemo(() => students.filter(s => {
        const name = (s.name || s.studentName || '').toLowerCase();
        const id = (s.studentId || s.student_id || '').toLowerCase();
        const cls = s.className || s.classId || '';
        return (name.includes(searchTerm.toLowerCase()) || id.includes(searchTerm.toLowerCase()))
            && (filterClass === 'All' || cls === filterClass);
    }), [students, searchTerm, filterClass]);

    const privateStudents = students.filter(s => (s.type || s.studentType || '').toLowerCase() === 'private');

    const columns = [
        { 
            header: 'Index', 
            key: 'index', 
            width: '60px',
            render: (_, row) => <span className="text-micro font-mono text-[var(--text-muted)]">{String(students.indexOf(row) + 1).padStart(2, '0')}</span>
        },
        { 
            header: 'Student Name', 
            key: 'name',
            render: (val, row) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--bg-main)] border border-[var(--glass-border)] flex items-center justify-center text-primary text-[10px] font-black shrink-0 shadow-inner group-hover:border-primary/30 transition-all overflow-hidden">
                        {row.profileImageUrl ? <img src={row.profileImageUrl} alt="" className="w-full h-full object-cover" /> : (row.studentName || val || 'S')[0].toUpperCase()}
                    </div>
                    <div className="truncate">
                        <p className="text-[11px] font-black text-[var(--text-main)] leading-none uppercase tracking-tight italic truncate group-hover:text-primary transition-colors">{row.studentName || val || 'UNRESOLVED'}</p>
                        <p className="text-[8px] font-bold text-[var(--text-muted)] uppercase tracking-tighter leading-none mt-1">{row.gender || '???'}</p>
                    </div>
                </div>
            )
        },
        { 
            header: 'Student ID', 
            key: 'studentId',
            render: (val, row) => (
                <span className="text-[10px] font-black text-primary/80 font-mono tracking-tighter bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                    {val || row.student_id || 'X-000'}
                </span>
            )
        },
        { 
            header: 'Class', 
            key: 'className',
            render: (val, row) => (
                <span className="text-[10px] font-black text-[var(--text-muted)] bg-[var(--bg-main)] border border-[var(--glass-border)] px-2 py-1 rounded uppercase tracking-widest">
                    {val || row.classId || 'NULL'}
                </span>
            )
        }
    ];

    const actions = (row) => (
        <div className="flex gap-1 justify-end">
            <StandardButton variant="ghost" size="xs" onClick={() => setProfileDrawer({ student: row, mode: 'view' })} icon={Eye} />
            <StandardButton variant="ghost" size="xs" onClick={() => navigate(`/dashboard/student/add?edit=${row.studentId || row.student_id}`)} icon={Edit3} className="hover:text-primary" />
            <StandardButton variant="ghost" size="xs" onClick={() => setConfirmAction({ type: 'delete', student: row })} icon={Trash2} className="hover:text-accent" />
        </div>
    );

    return (
        <div className="max-w-full p-1 space-y-2 pb-1 text-slate-400">
                
                {/* ─── Combined Header with KPI Grid ─── */}
                <div className="space-y-4">
                    <header className="flex justify-between items-center px-1">
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                            <h1 className="text-sm font-black text-[var(--text-main)] tracking-tight uppercase italic flex items-center gap-2">
                                <Database size={16} className="text-primary" />
                                STUDENT <span className="text-primary">REGISTRY</span>
                            </h1>
                        </motion.div>
                        <div className="flex items-center gap-1.5">
                            <StandardButton
                              variant="ghost"
                              onClick={() => { if(schoolId) sData?.refetch?.(); }}
                              icon={RefreshCw}
                              size="xs"
                            />
                            <StandardButton
                              variant="primary"
                              onClick={() => navigate('/dashboard/student/add')}
                              icon={Plus}
                              size="xs"
                            >
                              ADD STUDENT
                            </StandardButton>
                        </div>
                    </header>

                    <KPIWidget
                        columns={4}
                        gap="gap-1"
                        className="px-0.5"
                        kpis={[
                            { label: "Total Active", value: students.length, icon: GraduationCap, color: "primary" },
                            { label: "Private", value: privateStudents.length, icon: ShieldCheck, color: "accent" },
                            { label: "Classes", value: classes.length, icon: Layers, color: "warning" },
                            { label: "Status", value: "Optimal", icon: ShieldCheck, color: "success" }
                        ]}
                    />
                </div>

                {/* ─── MAIN DATA GRID ─── */}
                <div className="pt-2">
                    <DataGrid 
                        title="Student Registry"
                        columns={columns}
                        rows={filtered}
                        isLoading={sLoading}
                        actions={actions}
                        showSearch
                        searchValue={searchTerm}
                        onSearchChange={setSearchTerm}
                        searchPlaceholder="Search students..."
                        onRefresh={() => sData?.refetch?.()}
                        filters={[
                            <DropdownWidget
                                dense
                                key="class-filter"
                                options={[
                                    { label: 'ALL CLASSES', value: 'All' },
                                    ...classes.map(c => ({ label: c.toUpperCase(), value: c }))
                                ]}
                                value={filterClass}
                                onChange={setFilterClass}
                                className="w-full"
                            />
                        ]}
                    />
                </div>



                {/* ─── Profile Drawer ─── */}
                <AnimatePresence>
                    {profileDrawer && (
                        <>
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]" onClick={() => setProfileDrawer(null)} />
                            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[var(--bg-secondary)] border-l border-[var(--glass-border)] z-[110] shadow-2xl p-8 overflow-y-auto custom-scrollbar">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3 text-primary">
                                      <Info size={16} />
                                      <span className="text-[10px] font-black uppercase tracking-widest">Student Profile</span>
                                    </div>
                                    <button onClick={() => setProfileDrawer(null)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-2 rounded-xl hover:bg-[var(--bg-main)] transition-all"><X size={20} /></button>
                                </div>

                                <div className="flex flex-col items-center text-center mb-10">
                                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/30 to-secondary/30 border border-[var(--glass-border)] p-1 mb-6 shadow-2xl">
                                      <div className="w-full h-full rounded-2xl bg-[var(--bg-main)] flex items-center justify-center overflow-hidden">
                                        {profileDrawer.student.profileImageUrl ? <img src={profileDrawer.student.profileImageUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-4xl font-black text-primary">{(profileDrawer.student.studentName || 'S')[0]}</span>}
                                      </div>
                                    </div>
                                    <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight">{profileDrawer.student.studentName || 'Unknown Entity'}</h2>
                                    <p className="text-xs font-black text-[var(--text-muted)] uppercase tracking-[0.2em] mt-2 group cursor-pointer hover:text-primary transition-colors">{profileDrawer.student.studentId || 'X-000'}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-6 mb-10">
                                    {[
                                      ['Gender', profileDrawer.student.gender, Users],
                                      ['Class', profileDrawer.student.className || profileDrawer.student.classId, Layers],
                                      ['Join Date', fmtDate(profileDrawer.student.createdAt || profileDrawer.student.created_at), CalendarCheck],
                                      ['Status', 'Active', ShieldCheck],
                                    ].map(([label, val, Icon]) => (
                                      <div key={label}>
                                          <div className="flex items-center gap-2 mb-1.5 opacity-50">
                                            <Icon size={12} className="text-[var(--text-muted)]" />
                                            <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
                                          </div>
                                          <p className="text-sm font-bold text-[var(--text-main)] px-1 whitespace-nowrap overflow-hidden text-ellipsis">{val || 'N/A'}</p>
                                      </div>
                                    ))}
                                </div>

                                {/* Dynamic Analytics Sections */}
                                <AttendancePulse userId={profileDrawer.student.studentId || profileDrawer.student.student_id} schoolId={schoolId} />
                                <ProfileFeeSummary studentId={profileDrawer.student.studentId || profileDrawer.student.student_id} schoolId={schoolId} />

                                <div className="mt-10 pt-8 border-t border-[var(--glass-border)] grid grid-cols-2 gap-4">
                                  <StandardButton 
                                    variant="secondary" 
                                    onClick={() => navigate(`/dashboard/student/add?edit=${profileDrawer.student.studentId}`)}
                                    className="!py-4 !text-[10px] uppercase tracking-widest"
                                  >
                                    Edit Student
                                  </StandardButton>
                                  <StandardButton 
                                    variant="danger" 
                                    onClick={() => setConfirmAction({type:'delete', student: profileDrawer.student})}
                                    className="!py-4 !text-[10px] uppercase tracking-widest"
                                  >
                                    Delete
                                  </StandardButton>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* Confirmation Modal */}
                <AnimatePresence>
                    {confirmAction && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmAction(null)} className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-sm bg-[var(--bg-secondary)] border border-[var(--glass-border)] p-8 rounded-[2.5rem] relative z-20 shadow-2xl">
                                <div className="w-16 h-16 rounded-3xl bg-accent/20 text-accent flex items-center justify-center mb-6">
                                    <AlertTriangle size={32} />
                                </div>
                                <h3 className="text-xl font-black text-[var(--text-main)] mb-3">Delete Student</h3>
                                <p className="text-sm text-[var(--text-muted)] mb-8 leading-relaxed font-medium">
                                    {confirmAction.type === 'delete'
                                        ? `Are you sure you want to delete student ${confirmAction.student.studentName || confirmAction.student.name || ''}? This action cannot be undone.`
                                        : "Warning: Deactivating this student will restrict all system access."}
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <StandardButton 
                                      variant="secondary" 
                                      onClick={() => setConfirmAction(null)}
                                      className="!py-4 !text-[10px] uppercase tracking-widest"
                                    >
                                      Cancel
                                    </StandardButton>
                                    <StandardButton
                                        variant="danger"
                                        onClick={() => handleDeleteStudent(confirmAction.student.studentId || confirmAction.student.student_id)}
                                        className="!py-4 !text-[10px] uppercase tracking-widest"
                                    >
                                        Delete
                                    </StandardButton>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Toasts */}
                <AnimatePresence>
                    {toast && (
                        <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            className={`fixed bottom-8 right-8 z-[300] flex items-center gap-4 px-6 py-4 rounded-2xl backdrop-blur-2xl shadow-2xl border ${toast.type === 'success' ? 'bg-success/20 border-success/20 text-success' : 'bg-accent/20 border-accent/20 text-accent'}`}>
                            {toast.type === 'success' ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
                            <div className="flex flex-col">
                              <span className="text-[9px] font-black uppercase tracking-widest opacity-50">{toast.type}</span>
                              <span className="text-xs font-black">{toast.msg}</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
    );
}
