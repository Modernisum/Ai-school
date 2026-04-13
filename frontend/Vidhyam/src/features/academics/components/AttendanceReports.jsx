import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { getSchoolIdFromStorage } from '../../../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, Calendar, Users, TrendingUp, TrendingDown,
  Download, Printer, ChevronDown, ChevronUp, Loader,
  CheckCircle, XCircle, Clock, BookOpen, AlertCircle, Filter
} from 'lucide-react';
import {
  useGetDailySummaryQuery,
  useGetMonthlyStatsQuery,
  useGetStudentReportQuery,
  useGetClassReportQuery,
} from '../api/academicApi';

const getSchoolId = () => getSchoolIdFromStorage() || '';

const today = new Date().toISOString().split('T')[0];
const currentMonth = today.substring(0, 7); // YYYY-MM

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className={`glass-card p-4 border-l-4 ${color}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">{label}</p>
          <p className="text-3xl font-black text-white mt-1">{value ?? '—'}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
          <Icon size={18} className="text-slate-400" />
        </div>
      </div>
    </div>
  );
}

// ── Mini Bar (inline bar chart) ───────────────────────────────────────────────
function MiniBar({ value, max, color }) {
  const width = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
    </div>
  );
}

// ── Progress Ring ─────────────────────────────────────────────────────────────
function ProgressRing({ pct, size = 60, stroke = 6, color = '#6366f1' }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ffffff08" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
        strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        fill="white" fontSize={size * 0.22} fontWeight="bold">
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

// ── Export to CSV ─────────────────────────────────────────────────────────────
function exportCSV(rows, filename) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${r[h] ?? ''}"`).join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = filename; document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ── DAILY REPORT TAB ──────────────────────────────────────────────────────────
function DailyReport({ schoolId }) {
  const [date, setDate] = useState(today);
  const { data, isLoading, isFetching, isError } = useGetDailySummaryQuery(
    { schoolId, date },
    { skip: !schoolId }
  );

  const handlePrint = () => window.print();
  const handleExport = () => {
    if (!data) return;
    const rows = ['student', 'employee'].map(role => ({
      role,
      present: data[role]?.present ?? 0,
      absent: data[role]?.absent ?? 0,
      leave: data[role]?.leave ?? 0,
      holiday: data[role]?.holiday ?? 0,
      total: data[role]?.total ?? 0,
      percentage: `${data[role]?.attendance_percentage ?? 0}%`,
    }));
    exportCSV(rows, `daily-report-${date}.csv`);
  };

  const overallPct = data?.overall?.attendance_percentage ?? 0;
  const studentPct = data?.student?.attendance_percentage ?? 0;
  const employeePct = data?.employee?.attendance_percentage ?? 0;

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Select Date</label>
          <input type="date" className="input-dark" value={date}
            max={today} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 mt-4">
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-colors">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-colors">
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {isLoading || isFetching ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <Loader size={24} className="animate-spin text-primary" />
          <span className="text-slate-400">Loading report…</span>
        </div>
      ) : isError ? (
        <div className="glass-card p-8 text-center">
          <AlertCircle size={40} className="text-rose-400 mx-auto mb-3" />
          <p className="text-slate-400">Failed to load daily report</p>
        </div>
      ) : data ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          {/* Overall */}
          <div className="glass-card p-5 flex flex-col sm:flex-row items-center gap-6">
            <ProgressRing pct={overallPct} size={80} stroke={7} color="#6366f1" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white">Overall Attendance — {date}</h3>
              <p className="text-slate-500 text-sm mt-0.5">
                {data.overall?.present ?? 0} present out of {data.overall?.total ?? 0} total
              </p>
              <div className="grid grid-cols-3 gap-3 mt-4">
                {[['Present', data.overall?.present, 'text-green-400'], ['Absent', data.overall?.absent, 'text-rose-400'], ['Leave', data.overall?.leave, 'text-blue-400']].map(([lbl, val, cls]) => (
                  <div key={lbl} className="text-center">
                    <p className={`text-2xl font-black ${cls}`}>{val ?? 0}</p>
                    <p className="text-xs text-slate-500">{lbl}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Student & Employee */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { role: 'Students', key: 'student', pct: studentPct, color: '#22d3ee' },
              { role: 'Employees', key: 'employee', pct: employeePct, color: '#a855f7' },
            ].map(({ role, key, pct, color }) => (
              <div key={key} className="glass-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-white">{role}</h4>
                  <ProgressRing pct={pct} size={50} stroke={5} color={color} />
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Present', val: data[key]?.present ?? 0, color: 'bg-green-500' },
                    { label: 'Absent', val: data[key]?.absent ?? 0, color: 'bg-rose-500' },
                    { label: 'Leave', val: data[key]?.leave ?? 0, color: 'bg-blue-500' },
                  ].map(s => (
                    <div key={s.label} className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">{s.label}</span>
                      <div className="flex items-center gap-2 w-1/2">
                        <MiniBar value={s.val} max={data[key]?.total ?? 1} color={s.color} />
                        <span className="text-white font-bold w-6 text-right">{s.val}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}

// ── MONTHLY STATS TAB ─────────────────────────────────────────────────────────
function MonthlyStats({ schoolId }) {
  const [month, setMonth] = useState(currentMonth);
  const { data, isLoading, isFetching, isError } = useGetMonthlyStatsQuery(
    { schoolId, month },
    { skip: !schoolId }
  );

  const handleExport = () => {
    if (!data) return;
    const rows = ['student', 'employee', 'overall'].map(role => ({
      role,
      month,
      present: data[role]?.present ?? 0,
      absent: data[role]?.absent ?? 0,
      leave: data[role]?.leave ?? 0,
      total: data[role]?.total ?? 0,
      percentage: `${data[role]?.attendance_percentage ?? 0}%`,
    }));
    exportCSV(rows, `monthly-stats-${month}.csv`);
  };

  const overallPct = data?.overall?.attendance_percentage ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Select Month</label>
          <input type="month" className="input-dark" value={month}
            max={currentMonth} onChange={e => setMonth(e.target.value)} />
        </div>
        <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-colors mt-4">
          <Download size={14} /> Export CSV
        </button>
      </div>

      {isLoading || isFetching ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <Loader size={24} className="animate-spin text-primary" />
        </div>
      ) : isError ? (
        <div className="glass-card p-8 text-center">
          <AlertCircle size={40} className="text-rose-400 mx-auto mb-3" />
          <p className="text-slate-400">Failed to load monthly stats</p>
        </div>
      ) : data ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Overall %" value={`${overallPct}%`} icon={TrendingUp} color="border-primary" />
            <StatCard label="Total Present" value={data.overall?.present ?? 0} icon={CheckCircle} color="border-green-500" />
            <StatCard label="Total Absent" value={data.overall?.absent ?? 0} icon={XCircle} color="border-rose-500" />
            <StatCard label="Total Leave" value={data.overall?.leave ?? 0} icon={Clock} color="border-blue-500" />
          </div>

          {/* Stacked visual bars */}
          <div className="glass-card p-5 space-y-6">
            <h4 className="font-bold text-white">Breakdown by Role</h4>
            {['student', 'employee'].map(role => {
              const d = data[role] || {};
              const total = d.total || 1;
              const pct = d.attendance_percentage ?? 0;
              return (
                <div key={role}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-white capitalize">{role}s</span>
                    <span className={`text-sm font-bold ${pct >= 75 ? 'text-green-400' : 'text-rose-400'}`}>{pct}%</span>
                  </div>
                  {/* Stacked bar */}
                  <div className="h-4 rounded-full overflow-hidden bg-white/5 flex">
                    {[
                      { v: d.present ?? 0, cls: 'bg-green-500' },
                      { v: d.leave ?? 0, cls: 'bg-blue-500' },
                      { v: d.absent ?? 0, cls: 'bg-rose-500' },
                    ].map((s, i) => (
                      <div key={i} className={s.cls} style={{ width: `${(s.v / total) * 100}%` }} />
                    ))}
                  </div>
                  <div className="flex gap-4 mt-1.5 text-xs text-slate-500">
                    <span>Present: {d.present ?? 0}</span>
                    <span>Absent: {d.absent ?? 0}</span>
                    <span>Leave: {d.leave ?? 0}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}

// ── CLASS REPORT TAB ──────────────────────────────────────────────────────────
function ClassReport({ schoolId }) {
  const [className, setClassName] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(today);
  const [query, setQuery] = useState(null);

  const { data, isLoading, isError } = useGetClassReportQuery(
    { schoolId, className: query?.className, startDate: query?.start, endDate: query?.end },
    { skip: !query }
  );

  const handleSearch = () => {
    if (!className.trim()) return;
    setQuery({ className, start: startDate, end: endDate });
  };

  const handleExport = () => {
    if (!data?.student_reports) return;
    exportCSV(data.student_reports, `class-report-${className}-${startDate}-to-${endDate}.csv`);
  };

  return (
    <div className="space-y-5">
      <div className="glass-card p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Class Name</label>
          <input className="input-dark w-full" placeholder="e.g. Class 10A"
            value={className} onChange={e => setClassName(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">From</label>
          <input type="date" className="input-dark w-full" value={startDate}
            onChange={e => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">To</label>
          <input type="date" className="input-dark w-full" value={endDate} max={today}
            onChange={e => setEndDate(e.target.value)} />
        </div>
        <div className="flex items-end gap-2">
          <button onClick={handleSearch} className="btn-primary flex-1 justify-center py-2">
            <Filter size={14} /> Run Report
          </button>
          {data && (
            <button onClick={handleExport} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-colors">
              <Download size={14} />
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 gap-3">
          <Loader size={24} className="animate-spin text-primary" />
        </div>
      ) : isError ? (
        <div className="glass-card p-8 text-center">
          <AlertCircle size={40} className="text-rose-400 mx-auto mb-3" />
          <p className="text-slate-400">Failed to load class report</p>
        </div>
      ) : data ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Students" value={data.summary?.total_students} icon={Users} color="border-primary" />
            <StatCard label="Overall %" value={`${data.summary?.overall_attendance_percentage}%`} icon={TrendingUp} color={data.summary?.overall_attendance_percentage >= 75 ? 'border-green-500' : 'border-rose-500'} />
            <StatCard label="Present Days" value={data.summary?.total_present} icon={CheckCircle} color="border-green-500" />
            <StatCard label="Absent Days" value={data.summary?.total_absent} icon={XCircle} color="border-rose-500" />
          </div>

          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-white/5">
              <h4 className="font-bold text-white">Student-wise Breakdown</h4>
              <p className="text-xs text-slate-500 mt-0.5">{className} · {startDate} to {endDate}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Student', 'Present', 'Absent', 'Leave', 'Total', 'Attendance %'].map(h => (
                      <th key={h} className="text-left p-3 text-xs text-slate-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data.student_reports || []).map((s, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="p-3 text-sm text-white font-medium">{s.student_name || s.student_id}</td>
                      <td className="p-3 text-sm text-green-400">{s.present_days}</td>
                      <td className="p-3 text-sm text-rose-400">{s.absent_days}</td>
                      <td className="p-3 text-sm text-blue-400">{s.leave_days}</td>
                      <td className="p-3 text-sm text-slate-300">{s.total_days}</td>
                      <td className="p-3">
                        <span className={`text-sm font-bold ${s.attendance_percentage >= 75 ? 'text-green-400' : 'text-rose-400'}`}>
                          {s.attendance_percentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!data.student_reports || data.student_reports.length === 0) && (
                <div className="py-10 text-center text-slate-500 text-sm">No records found</div>
              )}
            </div>
          </div>
        </motion.div>
      ) : !query ? (
        <div className="glass-card p-10 text-center">
          <BookOpen size={40} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">Enter class name and date range to run the report</p>
        </div>
      ) : null}
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
const TABS = [
  { id: 'daily', label: 'Daily Report', icon: Calendar },
  { id: 'monthly', label: 'Monthly Stats', icon: BarChart3 },
  { id: 'class', label: 'Class Report', icon: Users },
];

export default function AttendanceReports() {
  const schoolId = getSchoolId();
  const [activeTab, setActiveTab] = useState('daily');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <BarChart3 size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Attendance Reports</h2>
          <p className="text-sm text-slate-500">Analytics, trends and exportable reports</p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b border-white/10">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors relative ${activeTab === id ? 'text-accent border-b-2 border-accent' : 'text-slate-500 hover:text-slate-300'}`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          {activeTab === 'daily' && <DailyReport schoolId={schoolId} />}
          {activeTab === 'monthly' && <MonthlyStats schoolId={schoolId} />}
          {activeTab === 'class' && <ClassReport schoolId={schoolId} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
