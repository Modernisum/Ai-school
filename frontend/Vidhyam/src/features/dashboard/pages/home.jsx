import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap, UserCheck, Banknote,
  CheckSquare, Zap, Sparkles, TrendingUp,
  Clock, Calendar, Users, RotateCw
} from "lucide-react";
import SkeletonLoader from "../../../components/ui/SkeletonLoader";
import GlassCard from "../../../components/ui/GlassCard";
import KPIWidget from "../../../components/ui/KPIWidget";
import StandardButton from "../../../components/ui/StandardButton";
import { useSelector } from "react-redux";
import { selectSchoolId } from "../../auth/authSlice";
import { useGetAdvancedAttendanceQuery } from "../../academics/api/academicApi";
import { useGetDashboardOverviewQuery, useGetDashboardStatsQuery } from "../api/dashboardApi";
import { useGetProxySuggestionsQuery } from "../../employees/api/leaveApi";
import { useGetTasksQuery, useAiGenerateTasksMutation } from "../../ai/api/taskApi";
import { useGetEmployeesQuery } from "../../employees/api/employeeApi";
import { useGetEventsQuery } from "../api/notificationApi";

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

  const [attendancePeriod, setAttendancePeriod] = useState('week');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedEmp, setSelectedEmp] = useState('');

  // 1. Overview and Stats Queries
  const { data: overviewRes, isLoading: overviewLoading, isFetching: overviewFetching, refetch: refetchOverview } = useGetDashboardOverviewQuery(schoolId, { skip: !schoolId });
  const { data: statsRes, isLoading: statsLoading, refetch: refetchStats } = useGetDashboardStatsQuery(schoolId, { skip: !schoolId });

  // 2. Attendance Queries (Period-based)
  const { data: studentAtt, isLoading: studentAttLoading, isFetching: studentAttFetching, refetch: refetchStudentAtt } = useGetAdvancedAttendanceQuery({
    school_id: schoolId, period: attendancePeriod, user_type: 'student',
  }, { skip: !schoolId });

  const { data: employeeAtt, isLoading: employeeAttLoading, isFetching: employeeAttFetching, refetch: refetchEmployeeAtt } = useGetAdvancedAttendanceQuery({
    school_id: schoolId, period: attendancePeriod, user_type: 'employee',
  }, { skip: !schoolId });

  // 3. Proxy suggestions
  const { data: proxySuggestionsRes, isLoading: proxyLoading, isFetching: proxyFetching, refetch: refetchProxy } = useGetProxySuggestionsQuery({
    schoolId, date: selectedDate, period: 1
  }, { skip: !schoolId });

  // 4. Tasks Query & Mutation
  const { data: tasksRes, isLoading: tasksLoading, isFetching: tasksFetching, refetch: refetchTasks } = useGetTasksQuery(schoolId, { skip: !schoolId });
  const [aiGenerateTasks, { isLoading: isGenerating }] = useAiGenerateTasksMutation();

  // 5. Employees Query (for selector)
  const { data: employeesRes, refetch: refetchEmployees } = useGetEmployeesQuery(schoolId, { skip: !schoolId });

  // 6. Events Query
  const { data: eventsRes, isLoading: eventsLoading, isFetching: eventsFetching, refetch: refetchEvents } = useGetEventsQuery(schoolId, { skip: !schoolId });

  // Computed data
  const overviewData = overviewRes?.data;
  const proxySuggestions = proxySuggestionsRes?.data || [];
  const tasks = tasksRes?.data || [];
  const employees = employeesRes?.employees || [];
  const events = eventsRes?.data || [];

  useEffect(() => {
    if (employees.length > 0 && !selectedEmp) {
      setSelectedEmp(employees[0].employee_id || employees[0].id || '');
    }
  }, [employees, selectedEmp]);

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

  const revenueKpi = useMemo(() => {
    const rev = overviewData?.revenue;
    if (!rev) return { collected: 0, expected: 0, pct: 0 };
    const collected = rev.totalCollected || 0;
    const expected = rev.totalRevenueExpected || 0;
    const pct = expected > 0 ? (collected / expected) * 100 : 0;
    return { collected, expected, pct };
  }, [overviewData]);

  const isRefreshing = overviewFetching || studentAttFetching || employeeAttFetching || proxyFetching || tasksFetching || eventsFetching;

  const handleRefresh = () => {
    refetchOverview();
    refetchStats();
    refetchStudentAtt();
    refetchEmployeeAtt();
    refetchProxy();
    refetchTasks();
    refetchEmployees();
    refetchEvents();
  };

  const handleGenerateTasks = async () => {
    if (!selectedEmp) return;
    try {
      await aiGenerateTasks({ schoolId, employeeId: selectedEmp }).unwrap();
    } catch (e) { /* ignore */ }
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
          <h1 className="text-2xl font-bold text-[var(--text-main)] tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-[var(--bg-main)] border border-[var(--glass-border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-main)] outline-none focus:border-[var(--primary-color)]/40 transition-colors font-medium cursor-pointer"
            />
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
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center justify-center p-2 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/5 text-slate-400 hover:text-slate-200 transition-all disabled:opacity-50"
              title="Refresh Dashboard Data"
            >
              <RotateCw size={14} className={isRefreshing ? "animate-spin" : ""} />
            </button>
          </div>
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
              value: overviewLoading ? '...' : `₹${revenueKpi.collected.toLocaleString()}`,
              sub: overviewLoading ? 'Loading' : `${revenueKpi.pct.toFixed(1)}% collected`,
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
                <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                  <Sparkles size={15} className="text-[var(--primary-color)]" />
                  Proxy Suggestions
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">AI-ranked availability · Real-time</p>
              </div>
              <span className="text-[10px] font-semibold text-[var(--text-muted)] bg-[var(--bg-main)] px-2 py-1 rounded-lg border border-[var(--glass-border)]">
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
                    className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-main)] border border-[var(--glass-border)] hover:border-[var(--primary-color)]/20 hover:bg-[var(--bg-secondary)] transition-all cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[var(--primary-color)]/10 border border-[var(--primary-color)]/20 flex items-center justify-center text-[var(--primary-color)] font-bold text-sm shrink-0 group-hover:scale-105 transition-transform">
                      {proxy.name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-[var(--text-main)] truncate">{proxy.name}</h4>
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
                <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
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
                className="flex-1 bg-[var(--bg-main)] border border-[var(--glass-border)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] outline-none focus:border-[var(--primary-color)]/40 transition-colors font-medium"
              >
                <option value="" className="bg-[var(--bg-secondary)] text-[var(--text-main)]">Select employee</option>
                {employees.map(e => (
                  <option key={e.employee_id || e.id} value={e.employee_id || e.id} className="bg-[var(--bg-secondary)] text-[var(--text-main)]">{e.name || e.employee_id || e.id}</option>
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
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[var(--bg-main)] transition-all cursor-pointer group border border-transparent hover:border-[var(--glass-border)]"
                  >
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.is_ai_generated ? 'bg-[var(--primary-color)]' : 'bg-[var(--text-muted)]'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[var(--text-main)] truncate">{t.task_name}</p>
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
          { icon: Users, label: "Total Students", value: overviewLoading ? '...' : (overviewData?.totalStudents ?? "--"), color: "primary" },
          { icon: UserCheck, label: "Total Staff", value: overviewLoading ? '...' : (overviewData?.totalEmployees ?? "--"), color: "success" },
          { icon: Calendar, label: "Events Today", value: eventsLoading ? '...' : (events.length ?? "--"), color: "warning" },
          { icon: TrendingUp, label: "Collection Rate", value: overviewLoading ? '...' : `${revenueKpi.pct.toFixed(1)}%`, color: "purple" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            whileHover={{ y: -2 }}
            className="glass-card rounded-xl p-3 flex items-center gap-3 cursor-pointer"
          >
            <div className="p-2 rounded-xl bg-[var(--bg-main)] border border-[var(--glass-border)]">
              <stat.icon size={18} className={stat.color === 'primary' ? 'text-[var(--primary-color)]' : stat.color === 'success' ? 'text-[var(--success-color)]' : stat.color === 'warning' ? 'text-[var(--warning-color)]' : 'text-[var(--accent-color)]'} />
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider">{stat.label}</p>
              <p className="text-lg font-bold text-[var(--text-main)]">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
