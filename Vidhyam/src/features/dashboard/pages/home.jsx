import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users, UserCheck, GraduationCap, DollarSign,
  TrendingUp, Calendar, Bell, Activity, Clock,
  BookOpen, School, Award, ChevronRight, ChevronLeft
} from "lucide-react";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080/api";
const getSchoolId = () => localStorage.getItem("schoolId") || "622079";

const tile = (variants, custom) => ({
  variants,
  custom,
  initial: "hidden",
  animate: "visible",
  exit: "exit"
});

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } }
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } }
};

export default function HomePage() {
  const schoolName = localStorage.getItem("schoolName") || "Vidhyam";
  const schoolId = getSchoolId();
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0, totalEmployees: 0, totalClasses: 0, revenue: 0
  });
  const [holidays, setHolidays] = useState([]);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const notices = [
    { id: 1, date: "Oct 17, 2025", title: "Mid-Term Exams Start", type: "academic", dot: "bg-indigo-400" },
    { id: 2, date: "Oct 20, 2025", title: "Parent-Teacher Meeting", type: "event", dot: "bg-violet-400" },
    { id: 3, date: "Oct 25, 2025", title: "Annual Sports Day", type: "sports", dot: "bg-rose-400" },
    { id: 4, date: "Oct 30, 2025", title: "Monthly Fee Reminders", type: "finance", dot: "bg-amber-400" }
  ];

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    const fetchData = async () => {
      try {
        const [studentsRes, empRes, classRes, holRes] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/students/${schoolId}/students`),
          fetch(`${API_BASE_URL}/employees/${schoolId}/employees`),
          fetch(`${API_BASE_URL}/class/${schoolId}/classes`),
          fetch(`${API_BASE_URL}/operations/attendance/${schoolId}/holidays`)
        ]);

        let sCount = 0, eCount = 0, cCount = 0;
        if (studentsRes.status === "fulfilled" && studentsRes.value.ok) {
          const d = await studentsRes.value.json();
          sCount = (d.data || d || []).length;
        }
        if (empRes.status === "fulfilled" && empRes.value.ok) {
          const d = await empRes.value.json();
          eCount = (d.data || d || []).length;
        }
        if (classRes.status === "fulfilled" && classRes.value.ok) {
          const d = await classRes.value.json();
          cCount = (d.data || d || []).length;
        }
        if (holRes.status === "fulfilled" && holRes.value.ok) {
          const d = await holRes.value.json();
          setHolidays(d.data || []);
        }
        setStats({ totalStudents: sCount, totalEmployees: eCount, totalClasses: cCount, revenue: 0 });
      } catch (e) {
        console.error("Dashboard fetch error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    return () => clearInterval(timer);
  }, [schoolId]);

  const statCards = [
    {
      label: "Total Students", value: loading ? "..." : stats.totalStudents,
      icon: GraduationCap, gradient: "from-indigo-500 to-violet-600",
      bg: "bg-indigo-500/20", text: "text-indigo-400"
    },
    {
      label: "Total Employees", value: loading ? "..." : stats.totalEmployees,
      icon: Users, gradient: "from-violet-500 to-purple-600",
      bg: "bg-violet-500/20", text: "text-violet-400"
    },
    {
      label: "Active Classes", value: loading ? "..." : stats.totalClasses,
      icon: BookOpen, gradient: "from-blue-500 to-indigo-600",
      bg: "bg-blue-500/20", text: "text-blue-400"
    },
    {
      label: "Today's Date", value: currentDateTime.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      icon: Calendar, gradient: "from-emerald-500 to-teal-600",
      bg: "bg-emerald-500/20", text: "text-emerald-400"
    }
  ];

  // Calendar logic
  const holidayDateSet = React.useMemo(() => {
    const set = new Set();
    holidays.forEach(h => {
      let cur = new Date(h.fromDate);
      const end = new Date(h.toDate || h.fromDate);
      while (cur <= end) {
        set.add(cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 1);
      }
    });
    return set;
  }, [holidays]);

  const calDays = React.useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isSun = new Date(dateStr).getDay() === 0;
      const isHoliday = holidayDateSet.has(dateStr) || isSun;
      const isToday = dateStr === new Date().toISOString().split('T')[0];
      cells.push({ d, dateStr, isSun, isHoliday, isToday });
    }
    return cells;
  }, [calYear, calMonth, holidayDateSet]);

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <motion.div {...tile(fadeUp)} className="glass-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="section-label">Dashboard Overview</p>
            <h1 className="text-2xl font-bold text-white">
              Welcome back, <span className="text-gradient">{schoolName}</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {currentDateTime.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              {" · "}
              {currentDateTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge bg-emerald-500/20 border-emerald-500/30 text-emerald-400">
              <Activity size={10} className="inline mr-1" />System Online
            </span>
          </div>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <motion.div
        variants={stagger} initial="hidden" animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {statCards.map((s, i) => (
          <motion.div key={i} variants={fadeUp} className="glass-card p-5 hover-card">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.bg}`}>
              <s.icon size={20} className={s.text} />
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-slate-400 text-xs mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notices */}
        <motion.div {...tile(fadeUp)} className="glass-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <p className="section-label">Upcoming Notices</p>
            <Bell size={16} className="text-slate-500" />
          </div>
          <div className="space-y-3">
            {notices.map(n => (
              <div key={n.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${n.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{n.title}</p>
                  <p className="text-xs text-slate-500">{n.date}</p>
                </div>
                <ChevronRight size={14} className="text-slate-600 flex-shrink-0" />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quick Info */}
        <motion.div {...tile(fadeUp)} className="glass-card p-5">
          <p className="section-label">School ID</p>
          <p className="font-mono text-indigo-400 text-sm font-bold bg-indigo-500/10 px-3 py-2 rounded-lg border border-indigo-500/20 mb-4">
            {schoolId}
          </p>
          <p className="section-label">Live Time</p>
          <p className="text-white text-lg font-bold font-mono">
            {currentDateTime.toLocaleTimeString("en-IN")}
          </p>
          <p className="text-slate-500 text-xs mt-1">All times in IST</p>
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <TrendingUp size={14} />
              <span className="font-medium">System Healthy</span>
            </div>
            <p className="text-slate-500 text-xs mt-1">All services operational</p>
          </div>
        </motion.div>
      </div>

      {/* Calendar Section full width */}
      <motion.div {...tile(fadeUp)} className="glass-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <div>
            <p className="section-label">Academic Calendar &amp; Holidays</p>
            <p className="text-white font-bold text-lg">{MONTHS[calMonth]} {calYear}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { const d = new Date(calYear, calMonth - 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()); }} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => { setCalYear(new Date().getFullYear()); setCalMonth(new Date().getMonth()); }} className="px-3 py-1.5 rounded-lg border border-white/10 text-xs font-medium text-slate-300 hover:bg-white/5 transition-colors">
              Today
            </button>
            <button onClick={() => { const d = new Date(calYear, calMonth + 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()); }} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Grid Headers */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS.map(d => (
            <div key={d} className={`text-center text-xs font-semibold uppercase tracking-wider ${d === 'Sun' ? 'text-rose-400' : 'text-slate-500'}`}>{d}</div>
          ))}
        </div>

        {/* Grid Cells */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calDays.map((cell, i) => {
            if (!cell) return <div key={`e${i}`} className="aspect-square sm:aspect-auto sm:h-20" />;
            return (
              <div key={cell.dateStr}
                className={`flex flex-col p-2 sm:p-3 aspect-square sm:aspect-auto sm:h-20 rounded-xl sm:rounded-2xl border transition-all
                              ${cell.isToday ? 'border-indigo-500 bg-indigo-500/10' : 'border-transparent bg-white/[0.02]'}
                              ${cell.isSun && !cell.isToday ? 'border-rose-500/10 bg-rose-500/5' : ''}
                              ${!cell.isSun && cell.isHoliday && !cell.isToday ? 'border-amber-500/20 bg-amber-500/10' : ''}
                              ${!cell.isHoliday && !cell.isToday ? 'hover:bg-white/5 hover:border-white/10' : ''}
                          `}>
                <span className={`text-sm sm:text-base font-bold ${cell.isToday ? 'text-indigo-400' : cell.isSun ? 'text-rose-400' : cell.isHoliday ? 'text-amber-400' : 'text-slate-300'}`}>
                  {cell.d}
                </span>
                {!cell.isSun && cell.isHoliday && (
                  <div className="hidden sm:block mt-auto">
                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 truncate max-w-full">Holiday</span>
                  </div>
                )}
                {cell.isSun && (
                  <div className="hidden sm:block mt-auto">
                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-400 truncate max-w-full">Sunday</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
