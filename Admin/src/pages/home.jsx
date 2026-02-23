import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users, UserCheck, GraduationCap, DollarSign,
  TrendingUp, Calendar, Bell, Activity, Clock,
  BookOpen, School, Award, ChevronRight
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
  const schoolName = localStorage.getItem("schoolName") || "Modern School";
  const schoolId = getSchoolId();
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0, totalEmployees: 0, totalClasses: 0, revenue: 0
  });

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
        const [studentsRes, empRes, classRes] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/students/${schoolId}/students`),
          fetch(`${API_BASE_URL}/employees/${schoolId}/employees`),
          fetch(`${API_BASE_URL}/class/${schoolId}/classes`)
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
    </div>
  );
}
