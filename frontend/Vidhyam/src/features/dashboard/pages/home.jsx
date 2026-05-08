import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap, UserCheck, Banknote,
  CheckSquare, Zap, Sparkles, TrendingUp,
  Clock, Calendar, Users
} from "lucide-react";
import SkeletonLoader from "../../../components/ui/SkeletonLoader";
import GlassCard from "../../../components/ui/GlassCard";
import KPIWidget from "../../../components/ui/KPIWidget";
import StandardButton from "../../../components/ui/StandardButton";
import { useSelector } from "react-redux";
import { selectSchoolId } from "../../auth/authSlice";
import { useGetAdvancedAttendanceQuery } from "../../academics/api/academicApi";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8080/api`;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } },
};

export default function HomePage() {
  const reduxSchoolId = useSelector(selectSchoolId);
  const schoolId = reduxSchoolId || "";

  const [proxyLoading, setProxyLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [proxySuggestions, setProxySuggestions] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [attendancePeriod, setAttendancePeriod] = useState('week');

  const { data: studentAtt, isLoading: studentAttLoading } = useGetAdvancedAttendanceQuery({
    school_id: schoolId, period: attendancePeriod, user_type: 'student',
  }, { skip: !schoolId });

  const { data: employeeAtt, isLoading: employeeAttLoading } = useGetAdvancedAttendanceQuery({
    school_id: schoolId, period: attendancePeriod, user_type: 'employee',
  }, { skip: !schoolId });

  const studentKpi = useMemo(() => {
    const s = studentAtt?.summary;
    if (!s) return { present: 0, total: 0, pct: 0 };
    return { present: s.total_present || 0, total: s.total_users || 0, pct: s.attendance_percentage || 0 };
  }, [studentAtt]);

  const employeeKpi = useMemo(() => {
    const s = employeeAtt?.summary;
    if (!s) return { present: 0, total: 0, pct: 0 };
    return { present: s.total_present || 0, total: s.total_users || 0, pct: s.attendance_percentage || 0 };
  }, [employeeAtt]);

  const studentChartData = useMemo(() => {
    if (!studentAtt?.records?.length) return [];
    const byDate = {};
    studentAtt.records.forEach(r => {
      if (!byDate[r.date]) byDate[r.date] = { label: r.date, present: 0, absent: 0 };
      if (r.status === 'present') byDate[r.date].present += 1;
      else if (r.status === 'absent') byDate[r.date].absent += 1;
    });
    return Object.values(byDate).sort((a, b) => a.label.localeCompare(b.label)).map(d => ({ label: d.label.slice(5), value: d.present }));
  }, [studentAtt]);

  const employeeChartData = useMemo(() => {
    if (!employeeAtt?.records?.length) return [];
    const byDate = {};
    employeeAtt.records.forEach(r => {
      if (!byDate[r.date]) byDate[r.date] = { label: r.date, present: 0, absent: 0 };
      if (r.status === 'present') byDate[r.date].present += 1;
      else if (r.status === 'absent') byDate[r.date].absent += 1;
    });
    return Object.values(byDate).sort((a, b) => a.label.localeCompare(b.label)).map(d => ({ label: d.label.slice(5), value: d.present }));
  }, [employeeAtt]);

  useEffect(() => {
    if (!schoolId) return;
    fetch(`${API_BASE_URL}/dashboard/${schoolId}/leaves/proxy-suggestions?date=${new Date().toISOString().split('T')[0]}&period=1`)
      .then(r => r.json()).then(d => setProxySuggestions(Array.isArray(d) ? d.slice(0, 3) : [])).catch(() => setProxySuggestions([])).finally(() => setProxyLoading(false));
    fetch(`${API_BASE_URL}/task/${schoolId}`)
      .then(r => r.json()).then(d => setTasks(d.success && Array.isArray(d.data) ? d.data.slice(0, 5) : [])).catch(() => setTasks([])).finally(() => setTasksLoading(false));
    fetch(`${API_BASE_URL}/school/${schoolId}/people/employees`)
      .then(r => r.json()).then(d => {
        if (d.success && Array.isArray(d.data)?.length) {
          setEmployees(d.data);
          if (d.data[0].employee_id) setSelectedEmp(d.data[0].employee_id);
        }
      }).catch(() => setEmployees([]));
  }, [schoolId]);

  const handleGenerateTasks = async () => {
    if (!selectedEmp) return;
    setIsGenerating(true);
    try {
      await fetch(`${API_BASE_URL}/task/ai/${schoolId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: selectedEmp }),
      });
      const tRes = await fetch(`${API_BASE_URL}/task/${schoolId}`);
      const tData = await tRes.json();
      if (tData.success && Array.isArray(tData.data)) setTasks(tData.data.slice(0, 5));
    } catch (e) { /* ignore */ }
    finally { setIsGenerating(false); }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="page-bg text-[var(--text-main)] p-4 md:p-6 max-w-[1600px] mx-auto space-y-5"
    >
      {/* ── Page Header ── */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Period:</span>
          {['day', 'week', 'month'].map(p => (
            <button
              key={p}
              onClick={() => setAttendancePeriod(p)}
              className={`text-[11px] font-semibold uppercase tracking-wide px-3 py-1.5 rounded-lg transition-all ${
                attendancePeriod === p
                  ? 'bg-[var(--primary-color)] text-white shadow-md shadow-primary/20'
                  : 'text-slate-400 bg-white/[0.02] border border-white/5 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── KPI Row ── */}
      <motion.div variants={itemVariants}>
        <KPIWidget
          columns={3} gap="gap-3"
          kpis={[
            {
              label: "Student Attendance",
              value: studentAttLoading ? '...' : `${studentKpi.present}/${studentKpi.total}`,
              sub: studentAttLoading ? 'Loading' : `${studentKpi.pct.toFixed(1)}% · ${attendancePeriod}`,
              icon: GraduationCap, color: "primary",
              chart: studentChartData.length > 0 ? {
                type: 'bar', data: studentChartData,
                categories: studentChartData.map(d => d.label),
              } : undefined,
            },
            {
              label: "Staff Attendance",
              value: employeeAttLoading ? '...' : `${employeeKpi.present}/${employeeKpi.total}`,
              sub: employeeAttLoading ? 'Loading' : `${employeeKpi.pct.toFixed(1)}% · ${attendancePeriod}`,
              icon: UserCheck, color: "success",
              chart: employeeChartData.length > 0 ? {
                type: 'bar', data: employeeChartData,
                categories: employeeChartData.map(d => d.label),
              } : undefined,
            },
            {
              label: "Monthly Revenue",
              value: '--',
              sub: 'Revenue sync pending',
              icon: Banknote, color: "warning",
            },
          ]}
        />
      </motion.div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ── Left: Proxy Suggestions ── */}
        <motion.div variants={itemVariants} className="lg:col-span-7">
          <GlassCard className="p-4 h-full min-h-[320px] flex flex-col" glowColor="primary">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles size={15} className="text-[var(--primary-color)]" />
                  Proxy Suggestions
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">AI-ranked availability · Real-time</p>
              </div>
              <span className="text-[10px] font-semibold text-slate-600 bg-white/[0.02] px-2 py-1 rounded-lg border border-white/5">
                {proxySuggestions.length} available
              </span>
            </div>

            <div className="flex-1 space-y-2">
              {proxyLoading ? (
                <SkeletonLoader type="list" count={3} />
              ) : proxySuggestions.length > 0 ? (
                proxySuggestions.map((proxy, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    whileHover={{ x: 2 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.015] border border-white/[0.04] hover:border-primary/20 hover:bg-white/[0.03] transition-all cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0 group-hover:scale-105 transition-transform">
                      {proxy.name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-white truncate">{proxy.name}</h4>
                        <span className="text-xs font-bold text-[var(--primary-color)] ml-2">{proxy.compatibility_score}%</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">{proxy.subject} · Load: {proxy.current_load}</p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
                  <Sparkles size={32} className="mb-3 opacity-30" />
                  <p className="text-xs font-semibold uppercase tracking-widest">No conflicts detected</p>
                  <p className="text-[11px] mt-1 opacity-60">All positions covered</p>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* ── Right: AI Task Engine ── */}
        <motion.div variants={itemVariants} className="lg:col-span-5">
          <GlassCard className="p-4 h-full min-h-[320px] flex flex-col" glowColor="primary">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Zap size={15} className="text-[var(--primary-color)]" />
                  AI Task Engine
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Smart task allocation</p>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 bg-primary/5 px-2 py-1 rounded-lg border border-primary/10">
                {tasks.length} active
              </span>
            </div>

            {/* Employee selector */}
            <div className="flex gap-2 mb-3">
              <select
                value={selectedEmp}
                onChange={(e) => setSelectedEmp(e.target.value)}
                className="flex-1 bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-primary/40 transition-colors font-medium"
              >
                <option value="">Select employee</option>
                {employees.map(e => (
                  <option key={e.employee_id} value={e.employee_id}>{e.name || e.employee_id}</option>
                ))}
              </select>
              <StandardButton
                variant="primary" size="sm"
                onClick={handleGenerateTasks}
                disabled={isGenerating || !selectedEmp}
                loading={isGenerating}
                icon={Zap}
              >
                Generate
              </StandardButton>
            </div>

            {/* Task list */}
            <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
              {tasksLoading ? (
                <SkeletonLoader type="list" count={4} />
              ) : tasks.length > 0 ? (
                tasks.map((t, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-all cursor-pointer group border border-transparent hover:border-white/5"
                  >
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.is_ai_generated ? 'bg-[var(--primary-color)]' : 'bg-slate-600'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-200 truncate">{t.task_name}</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">
                        {t.deadline ? new Date(t.deadline).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : 'No deadline'} · {t.priority || 'Normal'}
                      </p>
                    </div>
                    {t.is_ai_generated && <Zap size={12} className="text-[var(--primary-color)] shrink-0" />}
                  </motion.div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
                  <CheckSquare size={28} className="mb-2 opacity-20" />
                  <p className="text-xs font-semibold uppercase tracking-widest">No tasks yet</p>
                  <p className="text-[11px] mt-1 opacity-50">Generate AI tasks to get started</p>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* ── Quick Stats Row ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Users, label: "Total Students", value: "--", color: "primary" },
          { icon: UserCheck, label: "Total Staff", value: "--", color: "success" },
          { icon: Calendar, label: "Events Today", value: "--", color: "warning" },
          { icon: TrendingUp, label: "Collection Rate", value: "--", color: "purple" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            whileHover={{ y: -2 }}
            className="glass-card rounded-xl p-3 flex items-center gap-3 cursor-pointer"
          >
            <div className={`p-2 rounded-xl bg-${stat.color === 'primary' ? '[var(--primary-color)]/10' : stat.color === 'success' ? 'emerald-500/10' : stat.color === 'warning' ? 'amber-500/10' : 'blue-500/10'} border border-white/5`}>
              <stat.icon size={18} className={stat.color === 'primary' ? 'text-[var(--primary-color)]' : stat.color === 'success' ? 'text-emerald-400' : stat.color === 'warning' ? 'text-amber-400' : 'text-blue-400'} />
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{stat.label}</p>
              <p className="text-lg font-bold text-white">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
