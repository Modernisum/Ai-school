import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { selectPollingInterval } from '../../settings/settingsSlice';
import {
    Users, Plus, Search, Eye, Edit3, Trash2, Loader,
    CheckCircle, AlertTriangle, X, User, GraduationCap,
    Star, Building, RefreshCw, Briefcase, Phone, Mail, BookOpen, UploadCloud, Activity
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import BulkImportModal from '../../../components/ui/BulkImportModal';
import AddEmployeePage from '../components/AddEmployeePage';
import StandardButton from '../../../components/ui/StandardButton';
import DropdownWidget from '../../../components/ui/DropdownWidget';
import ChartWidget from '../../../components/ui/ChartWidget';
import KPIWidget from '../../../components/ui/KPIWidget';
import SkeletonLoader from '../../../components/ui/SkeletonLoader';
import GlassCard from '../../../components/ui/GlassCard';
import { useGetEmployeesQuery, useDeleteEmployeeMutation, useBulkImportEmployeesMutation } from '../api/employeeApi';
import { useGetAdvancedAttendanceQuery } from '../../academics/api/academicApi';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8080/api`;
const getSchoolId = () => localStorage.getItem('schoolId') || "";

const typeColor = {
    'Teacher': 'border-white/10 text-slate-300',
    'Principal': 'border-white/10 text-slate-300',
    'Vice Principal': 'border-white/10 text-slate-300',
    'Admin Staff': 'border-white/10 text-slate-400',
    'default': 'border-white/10 text-slate-400',
};

const getTypeStyle = (t) => {
  const backgrounds = {
    'Teacher': 'var(--primary-glow)',
    'Principal': 'var(--primary-glow)',
    'Vice Principal': 'var(--primary-glow)',
    'Admin Staff': 'rgba(255,255,255,0.05)',
    'default': 'rgba(255,255,255,0.05)',
  };
  return { backgroundColor: backgrounds[t] || backgrounds.default };
};

// ─── Profile Attendance Pulse ───────────────────────────────────────────────
function AttendancePulse({ userId, schoolId }) {
    const { data: attData, isLoading } = useGetAdvancedAttendanceQuery({
        school_id: schoolId,
        user_ids: userId,
        period: 'month',
        fields: 'date,present'
    }, { skip: !userId || !schoolId });

    if (isLoading) return <div className="h-32 bg-white/5 rounded-xl animate-pulse" />;

    const trend = (attData?.records || []).map(r => ({
        label: r.date.split('-').slice(2).join('/'),
        value: r.present ? 1 : 0
    }));

    const attendancePct = attData?.summary?.attendance_percentage || 0;

    return (
        <div className="space-y-3 mt-4 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <Activity size={12} className="text-primary" /> Attendance History
                </h4>
                <span className={`text-[10px] font-black uppercase ${attendancePct >= 90 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    Rate: {attendancePct.toFixed(1)}%
                </span>
            </div>
            
            <ChartWidget
                type="line"
                data={trend}
                categories={trend.map(t => t.label)}
                title=""
                className="!p-0 h-28 border-none bg-transparent"
                options={{ height: 90 }}
                showLegend={false}
                showGrid={false}
            />
        </div>
    );
}

export default function EmployeeManagement() {
    const location = useLocation();
    const schoolId = getSchoolId();
    const pollingInterval = useSelector(selectPollingInterval);

    // RTK Query Hooks replace manual state & fetch
    const { data: empData, isLoading: empLoading, refetch: fetchEmployees } = useGetEmployeesQuery(schoolId, { pollingInterval });
    const employees = empData?.data || empData?.employees || [];
    const [deleteEmployeeMutation] = useDeleteEmployeeMutation();
    const [bulkImportEmployees] = useBulkImportEmployeesMutation();

    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [toast, setToast] = useState(null);
    const [viewEmp, setViewEmp] = useState(null);
    const [bulkModalOpen, setBulkModalOpen] = useState(false);

    // Sync showAddForm with URL search params
    const navigate = useNavigate();

    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3000);
    };

    const deleteEmployee = async (emp) => {
        const id = emp.employeeId || emp.employee_id || emp.id;
        if (!id) return;
        try {
            await deleteEmployeeMutation({ schoolId, employeeId: id }).unwrap();
            showToast('success', 'Employee removed');
        } catch {
            showToast('error', 'Delete failed');
        }
    };

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
        <div className="max-w-full p-1 space-y-1 pb-10">
            <header className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shadow-lg">
                        <Users size={14} className="text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-white tracking-widest uppercase italic leading-none">PERSONNEL_CORE</h1>
                        <p className="text-micro font-black text-slate-700 uppercase tracking-widest mt-0.5">{employees.length}_DATA_NODES</p>
                    </div>
                </div>
                <div className="flex gap-1">
                    <StandardButton
                        variant="ghost"
                        size="xs"
                        onClick={fetchEmployees}
                        icon={RefreshCw}
                    />
                    <StandardButton
                        variant="ghost"
                        size="xs"
                        onClick={() => setBulkModalOpen(true)}
                        icon={UploadCloud}
                        label="IMPORT"
                        className="hidden sm:flex"
                    />
                    <StandardButton
                        variant="primary"
                        size="xs"
                        onClick={() => navigate('/dashboard/employee/add')}
                        icon={Plus}
                        label="ADD_MEMBER"
                    />
                </div>
            </header>

            <div className="space-y-2">
                <KPIWidget 
                    columns={4} 
                    gap="gap-1" 
                    kpis={types.filter(t => t !== 'All').map(t => ({
                        label: t.toUpperCase().replace(' ', '_'),
                        value: employees.filter(e => (e.employeeType || e.type) === t).length,
                        sub: "STAFF_UNITS",
                        icon: t === 'Teacher' ? GraduationCap : Briefcase,
                        color: t === 'Teacher' ? "primary" : "accent"
                    }))}
                />
 
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-1 items-center">
                    <div className="relative flex-1 group w-full">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-primary transition-colors" />
                        <input className="w-full bg-white/[0.03] border border-white/10 rounded-lg h-8 pl-9 pr-3 text-micro text-white focus:outline-none focus:border-primary/40 focus:bg-white/[0.05] transition-all placeholder:text-slate-800 font-black uppercase tracking-widest" 
                            placeholder="SCAN_STAFF_DATABASE..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div className="w-full sm:w-40">
                        <DropdownWidget
                            dense
                            options={types.map(t => ({
                                label: t === 'All' ? 'ALL_TYPES' : t.toUpperCase().replace(' ', '_'),
                                value: t
                            }))}
                            value={filterType}
                            onChange={setFilterType}
                        />
                    </div>
                </div>

                {empLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <SkeletonLoader key={i} variant="card" className="h-24" />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <Users size={36} className="text-slate-600 mx-auto mb-2" />
                        <p className="text-slate-500">No employees found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-1">
                        {filtered.map((emp, i) => {
                            const id = emp.employeeId || emp.employee_id || emp.id;
                            const name = emp.employeeName || emp.employee_name || emp.name || 'Unknown';
                            const type = emp.employeeType || emp.employee_type || emp.type || 'Staff';
                            return (
                                <GlassCard
                                    key={id || i}
                                    className="p-2 bg-white/[0.02] border-white/5 hover:border-primary/30 group"
                                    hover
                                    delay={i * 0.02}
                                    dense
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <div className="w-6 h-6 rounded bg-slate-900 flex items-center justify-center border border-white/5 flex-shrink-0">
                                                <span className="text-white font-black text-[10px] uppercase italic">{name[0]}</span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-black text-white text-[10px] uppercase italic truncate leading-none group-hover:text-primary transition-colors">{name}</p>
                                                <p className="text-[8px] font-black text-slate-700 font-mono tracking-tighter leading-none mt-1">{id}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="px-1 py-0.5 rounded bg-white/5 border border-white/5 text-[8px] font-black uppercase tracking-widest text-slate-700">{type}</span>
                                    </div>
                                    <div className="flex items-center gap-1 pt-2 border-t border-white/5">
                                        <StandardButton 
                                            variant="ghost" 
                                            size="xs" 
                                            onClick={() => setViewEmp(emp)} 
                                            icon={Eye} 
                                            label="VIEW" 
                                            className="flex-1"
                                        />
                                        <StandardButton
                                            variant="ghost"
                                            size="xs"
                                            onClick={() => deleteEmployee(emp)}
                                            icon={Trash2}
                                            className="hover:text-rose-500"
                                        />
                                    </div>
                                </GlassCard>
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
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-2xl font-bold text-white">
                                    {(viewEmp.name || viewEmp.employeeName || 'E')[0]}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">{viewEmp.name || viewEmp.employeeName}</h3>
                                    <p className="text-xs text-secondary">{viewEmp.employeeType || viewEmp.type}</p>
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
                            <AttendancePulse userId={viewEmp.employeeId || viewEmp.employee_id} schoolId={schoolId} />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Add Employee Page renders via showAddForm handling at the top */}

            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className={`fixed bottom-6 right-6 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-xl
              ${toast.type === 'success' ? 'bg-success/20 border border-success/30 text-success' : 'bg-accent/20 border border-accent/30 text-accent'}`}
                    >
                        {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
                        {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>



            <BulkImportModal
                isOpen={bulkModalOpen}
                onClose={() => setBulkModalOpen(false)}
                title="Bulk Import Employees"
                expectedHeaders={['name', 'employeeType', 'email', 'phone', 'subject', 'department', 'baseSalary', 'address']}
                onImport={async (payload) => {
                    await bulkImportEmployees({ schoolId, payload }).unwrap();
                    showToast('success', `Bulk import successful!`);
                    setBulkModalOpen(false);
                }}
            />
        </div>
    );
}
