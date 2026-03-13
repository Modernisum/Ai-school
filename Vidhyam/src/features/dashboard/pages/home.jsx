import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, UserCheck, GraduationCap, DollarSign,
  TrendingUp, Calendar, Bell, Activity, Clock,
  BookOpen, School, Award, ChevronRight, ChevronLeft,
  AlertTriangle, CheckSquare, Layers, Map, MoreVertical, Search, Zap
} from "lucide-react";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';
import { useWebSockets } from "../../../hooks/useWebSockets";

import { useSelector } from "react-redux";
import { selectSchoolId, selectSchoolProfile } from "../../auth/authSlice";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8080/api`;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } }
};

export default function HomePage() {
  const reduxSchoolId = useSelector(selectSchoolId);
  const schoolProfile = useSelector(selectSchoolProfile);
  const schoolName = schoolProfile?.name || "Vidhyam";
  const schoolId = reduxSchoolId || "622079";
  
  const { messages: liveMessages } = useWebSockets(schoolId);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    counts: { totalStudents: 0, totalEmployees: 0, totalClasses: 0, openComplaints: 0, activeTasks: 0, highRiskStudents: 0 },
    attendance: { presentToday: 0, percentage: 0 },
    revenue: { total: 0, paid: 0, pending: 0, discount: 0 }
  });
  const [tasks, setTasks] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());

  // Calculate calendar days for the current view
  const calDays = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const days = [];
    const today = new Date();
    
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(calYear, calMonth, d);
      days.push({
        d,
        isToday: today.toDateString() === date.toDateString(),
        isSun: date.getDay() === 0,
        isHoliday: holidays.some(h => new Date(h.date).toDateString() === date.toDateString()),
        dateStr: date.toISOString().split('T')[0]
      });
    }
    return days;
  }, [calYear, calMonth, holidays]);

  const feeData = [
    { name: 'Paid', value: Number(data.revenue.paid), color: '#10b981' },
    { name: 'Pending', value: Number(data.revenue.pending), color: '#6366f1' },
    { name: 'Discount', value: Number(data.revenue.discount), color: '#f43f5e' },
  ];

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    const fetchData = async () => {
      try {
        const [statsRes, taskRes, remRes, holRes] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/dashboard/${schoolId}/stats`),
          fetch(`${API_BASE_URL}/task/${schoolId}`),
          fetch(`${API_BASE_URL}/reminder/${schoolId}`),
          fetch(`${API_BASE_URL}/operations/attendance/${schoolId}/holidays`)
        ]);

        if (statsRes.status === "fulfilled" && statsRes.value.ok) {
          const d = await statsRes.value.json();
          setData(d.data);
        }
        if (taskRes.status === "fulfilled" && taskRes.value.ok) {
          const d = await taskRes.value.json();
          setTasks(Array.isArray(d.data) ? d.data : []);
        }
        if (remRes.status === "fulfilled" && remRes.value.ok) {
          const d = await remRes.value.json();
          setReminders(Array.isArray(d.data) ? d.data : []);
        }
        if (holRes.status === "fulfilled" && holRes.value.ok) {
          const d = await holRes.value.json();
          setHolidays(Array.isArray(d.data) ? d.data : []);
        }
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
    { label: "Today Attendance", value: `${data.attendance.percentage.toFixed(1)}%`, sub: `${data.attendance.presentToday} Present`, icon: UserCheck, color: "emerald" },
    { label: "Pending Fees", value: `₹${Number(data.revenue.pending).toLocaleString()}`, sub: "Payment Overdue", icon: DollarSign, color: "rose" },
    { label: "Open Complaints", value: data.counts.openComplaints, sub: "Action Required", icon: AlertTriangle, color: "amber" },
    { label: "Risk Profiles", value: data.counts.highRiskStudents, sub: "Low Academic Performance", icon: TrendingUp, color: "indigo" },
  ];

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-[1600px] mx-auto overflow-x-hidden">
      {/* Header - Enterprise Command Style */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
             <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">V</div>
             {schoolName} <span className="text-slate-500 font-medium">Control Center</span>
          </h1>
          <p className="text-slate-400 mt-2 flex items-center gap-4 text-sm font-medium">
            <span className="flex items-center gap-1.5"><Clock size={14} className="text-indigo-400" />{currentDateTime.toLocaleTimeString()}</span>
            <span className="flex items-center gap-1.5"><Calendar size={14} className="text-indigo-400" />{currentDateTime.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass-card px-4 py-2 flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Live Cloud Secure</span>
          </div>
          <button className="p-3 glass-card hover:bg-white/10 transition-colors text-slate-400"><Bell size={20} /></button>
        </div>
      </motion.div>

      {/* KPI Row */}
      <motion.div initial="hidden" animate="visible" variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {statCards.map((card, i) => (
          <motion.div key={i} variants={fadeUp} className="glass-card p-6 relative overflow-hidden group hover:border-white/20 transition-all">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-${card.color}-500/5 blur-3xl -mr-12 -mt-12 group-hover:bg-${card.color}-500/10 transition-all`} />
            <div className="flex justify-between items-start">
              <div>
                <p className="section-label mb-1 opacity-70 tracking-widest">{card.label}</p>
                <h3 className="text-3xl font-black text-white">{loading ? '...' : card.value}</h3>
                <p className={`text-xs mt-2 font-bold flex items-center gap-1 text-${card.color}-400/80`}>
                   <Activity size={10} /> {card.sub}
                </p>
              </div>
              <div className={`p-4 rounded-2xl bg-${card.color}-500/10 text-${card.color}-400 shadow-inner group-hover:scale-110 transition-transform`}>
                <card.icon size={24} />
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Analytics + Action Center Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left: Charts & Stats (8 cols) */}
        <div className="xl:col-span-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Revenue Donut */}
            <motion.div initial="hidden" animate="visible" variants={fadeUp} className="glass-card p-8 min-h-[440px] flex flex-col">
              <div className="flex justify-between items-center mb-8">
                 <div>
                   <p className="section-label">Financial Analytics</p>
                   <h2 className="text-xl font-black text-white">Revenue Distribution</h2>
                 </div>
                 <div className={`p-2 rounded-xl bg-emerald-500/10 text-emerald-400`}>
                    <DollarSign size={20} />
                 </div>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="w-full h-64 relative">
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={feeData} innerRadius={70} outerRadius={90} paddingAngle={8} dataKey="value" animationBegin={200}>
                          {feeData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                        </Pie>
                        <Tooltip 
                           contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', backdropFilter: 'blur(10px)' }}
                           itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                        />
                      </PieChart>
                   </ResponsiveContainer>
                   <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Collection</p>
                      <p className="text-xl font-black text-white">{((data.revenue.paid / (data.revenue.total || 1)) * 100).toFixed(0)}%</p>
                   </div>
                </div>
                <div className="grid grid-cols-3 w-full gap-4 mt-8">
                   {feeData.map(d => (
                     <div key={d.name} className="glass-card p-3 text-center border-none bg-white/5">
                       <p className="text-[10px] uppercase font-black text-slate-500 mb-1">{d.name}</p>
                       <p className="text-sm font-black text-white">₹{Number(d.value / 1000).toFixed(1)}k</p>
                     </div>
                   ))}
                </div>
              </div>
            </motion.div>

            {/* Risk Analysis Bar */}
            <motion.div initial="hidden" animate="visible" variants={fadeUp} className="glass-card p-8 min-h-[440px]">
               <div className="flex justify-between items-center mb-8">
                 <div>
                   <p className="section-label">Predictive Insights</p>
                   <h2 className="text-xl font-black text-white">Student Risk Matrix</h2>
                 </div>
                 <div className={`p-2 rounded-xl bg-indigo-500/10 text-indigo-400`}>
                    <Activity size={20} />
                 </div>
              </div>
              <div className="h-64 mt-4">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={[{ name: 'Low', count: 45 }, { name: 'Medium', count: 12 }, { name: 'High', count: data.counts.highRiskStudents }]}>
                     <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="0%" stopColor="#4f46e5" stopOpacity={1}/>
                           <stop offset="100%" stopColor="#6366f1" stopOpacity={0.6}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} />
                     <Bar dataKey="count" fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={45} />
                     <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }} />
                   </BarChart>
                 </ResponsiveContainer>
              </div>
              <div className="mt-8 p-5 bg-indigo-500/10 rounded-2xl border border-indigo-500/10 flex items-center gap-5">
                 <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20"><Zap size={24} /></div>
                 <div>
                   <p className="text-xs font-black text-indigo-300 uppercase tracking-widest">AI Intervention Active</p>
                   <p className="text-sm text-slate-300 font-medium leading-tight mt-0.5">Automated review requested for {data.counts.highRiskStudents} critical profiles.</p>
                 </div>
              </div>
            </motion.div>
          </div>

          {/* Quick Registry Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
             {[
               { icon: GraduationCap, label: 'Students', value: data.counts.totalStudents, color: 'indigo' },
               { icon: Users, label: 'Faculty', value: data.counts.totalEmployees, color: 'violet' },
               { icon: BookOpen, label: 'Sections', value: data.counts.totalClasses, color: 'blue' },
               { icon: School, label: 'Instance', value: `#${schoolId}`, color: 'slate' }
             ].map((item, i) => (
                <div key={i} className="glass-card p-5 hover:bg-white/[0.07] transition-all cursor-default group border-none bg-white/[0.04]">
                  <item.icon size={18} className="text-slate-500 mb-3 group-hover:text-indigo-400 transition-colors" />
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.label}</p>
                  <p className="text-xl font-black text-white mt-1">{item.value}</p>
                </div>
             ))}
          </div>

          {/* Critical Alerts: AI Risk Defaulters */}
          {data.counts.detailedRisks && data.counts.detailedRisks.length > 0 && (
            <motion.div initial="hidden" animate="visible" variants={fadeUp} className="glass-card p-8 border-rose-500/20 bg-rose-500/5">
              <div className="flex justify-between items-center mb-6">
                 <div className="flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-rose-500/20 text-rose-500 anim-pulse">
                      <AlertTriangle size={20} />
                   </div>
                   <h2 className="text-xl font-black text-white">Critical Performance & Fee Alerts</h2>
                 </div>
                 <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">Action Required</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {data.counts.detailedRisks.map((risk, idx) => (
                   <div key={idx} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-rose-500/30 transition-all flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-rose-400 font-black text-lg">
                            {risk.name.charAt(0)}
                         </div>
                         <div>
                            <p className="text-sm font-bold text-white tracking-wide">{risk.name}</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                               {Array.isArray(risk.factors) && risk.factors.slice(0, 2).map((f, i) => (
                                 <span key={i} className="text-[9px] font-bold text-rose-400/80 uppercase tracking-tighter bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/10">{f}</span>
                               ))}
                            </div>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] font-black text-slate-500 uppercase">Risk Score</p>
                         <p className="text-lg font-black text-rose-500">{risk.score}%</p>
                      </div>
                   </div>
                 ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Right: Real-time Action Center (4 cols) */}
        <div className="xl:col-span-4 space-y-8">
           
           {/* Tasks Center */}
           <motion.div initial="hidden" animate="visible" variants={fadeUp} className="glass-card p-8 flex flex-col h-[480px]">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black text-white flex items-center gap-3">
                  <CheckSquare size={22} className="text-indigo-400" /> Action Center
                </h3>
                <span className="text-[10px] font-black bg-indigo-500/20 text-indigo-400 px-3 py-1.5 rounded-full uppercase tracking-widest">{data.counts.activeTasks} Active</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-3">
                {tasks.length > 0 ? tasks.map((t, idx) => (
                  <div key={idx} className="p-4 bg-white/[0.03] rounded-2xl border border-white/5 hover:bg-white/5 transition-all flex items-start gap-4 group cursor-pointer">
                     <div className="w-6 h-6 rounded-lg border-2 border-slate-700 mt-0.5 group-hover:border-indigo-500 group-hover:bg-indigo-500/10 transition-all flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 scale-0 group-hover:scale-100 transition-transform" />
                     </div>
                     <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white leading-tight">{t.task_name}</p>
                        <div className="flex items-center gap-3 mt-2">
                           <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${t.complete_percentage}%` }} transition={{ duration: 1, delay: 0.5 }} className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" />
                           </div>
                           <span className="text-[10px] font-black text-slate-500">{t.complete_percentage}%</span>
                        </div>
                     </div>
                  </div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-40">
                     <CheckSquare size={48} className="mb-4 text-slate-600" />
                     <p className="text-sm font-bold text-slate-500">Operation Pipeline Clear</p>
                  </div>
                )}
              </div>
           </motion.div>

           {/* Fleet Intelligence */}
           <motion.div initial="hidden" animate="visible" variants={fadeUp} className="glass-card p-8 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-white flex items-center gap-3">
                   <Map size={22} className="text-emerald-400" /> Fleet Radar
                </h3>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                   <span className="text-[10px] font-black text-emerald-500 uppercase">Live</span>
                </div>
              </div>
              <div className="h-32 bg-slate-950/80 rounded-3xl relative overflow-hidden border border-white/5 flex items-center justify-center shadow-inner">
                 <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.15),transparent)] animate-pulse" />
                 <div className="z-10 text-center">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-2">Network Synchronized</p>
                    <p className="text-xs text-slate-400 font-bold">4 Vehicles Active · 100% Signal Strength</p>
                 </div>
                 {/* Sweeping Radar Line */}
                 <div className="absolute top-1/2 left-1/2 w-[200%] h-[1px] bg-emerald-500/20 -translate-x-1/2 -translate-y-1/2 origin-center animate-[spin_4s_linear_infinite]" />
              </div>
           </motion.div>

           {/* Upcoming Notices */}
           <motion.div initial="hidden" animate="visible" variants={fadeUp} className="glass-card p-8 flex flex-col bg-amber-500/5 border-amber-500/10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-white flex items-center gap-3">
                   <Bell size={22} className="text-amber-400" /> Upcoming Notices
                </h3>
                <span className="text-[10px] font-black bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-full uppercase tracking-widest">{reminders.length} Active</span>
              </div>
              <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {reminders.length > 0 ? reminders.map((rem, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/5 transition-all group">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors uppercase tracking-tight">{rem.title}</p>
                      <span className="text-[9px] font-mono text-slate-600">{rem.date}</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">{rem.content}</p>
                  </div>
                )) : (
                  <div className="py-10 text-center opacity-30">
                    <Bell size={32} className="mx-auto mb-2 text-slate-600" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No active notices</p>
                  </div>
                )}
              </div>
           </motion.div>

           {/* Live Neural Feed */}
           <motion.div initial="hidden" animate="visible" variants={fadeUp} className="glass-card p-8 flex-1 border-indigo-500/10">
              <p className="section-label mb-6 tracking-[0.2em]">Neural Activity Link</p>
              <div className="space-y-6">
                <AnimatePresence mode="popLayout">
                  {liveMessages.slice(-2).reverse().map((m, i) => (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} key={i} className="flex gap-4">
                       <div className="w-1.5 h-auto self-stretch bg-indigo-500 rounded-full flex-shrink-0 shadow-[0_0_10px_rgba(79,70,229,0.5)]" />
                       <div className="py-1">
                          <p className="text-sm font-bold text-white leading-tight tracking-tight">{m.content || m.title || "User Connection Established"}</p>
                          <p className="text-[10px] text-slate-500 mt-2 font-black uppercase tracking-wider flex items-center gap-2">
                             <Clock size={10} /> Just Synchronized
                          </p>
                       </div>
                    </motion.div>
                  ))}
                  {liveMessages.length === 0 && (
                     <div className="flex gap-4 opacity-40">
                       <div className="w-1.5 h-10 bg-slate-700 rounded-full" />
                       <div className="py-1">
                          <p className="text-sm font-bold text-white">Observing Network...</p>
                          <p className="text-[10px] text-slate-500 mt-2 font-black uppercase flex items-center gap-2"><Activity size={10} /> Standing By</p>
                       </div>
                    </div>
                  )}
                </AnimatePresence>
              </div>
           </motion.div>

        </div>
      </div>

      {/* Bottom Section: Enterprise Calendar */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="glass-card p-10 mt-8">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
            <div>
               <p className="section-label tracking-[0.2em]">Academic Infrastructure</p>
               <h2 className="text-3xl font-black text-white mt-1">Institutional Roadmap</h2>
            </div>
            <div className="flex items-center gap-4">
               <div className="p-4 glass-card border-none bg-white/5 flex items-center gap-4">
                  <div className="text-right">
                     <p className="text-[10px] font-black text-slate-500 uppercase">Upcoming Events</p>
                     <p className="text-lg font-black text-white">12 Scheduled</p>
                  </div>
                  <Calendar size={28} className="text-indigo-500" />
               </div>
               <button className="px-6 py-3 rounded-2xl bg-indigo-600 text-white text-xs font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 active:scale-95">Configure Schedule</button>
            </div>
         </div>
         
         <div className="grid grid-cols-7 gap-6">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
              <div key={d} className={`text-center text-[11px] font-black tracking-[0.2em] ${d === 'SUN' ? 'text-rose-500' : 'text-slate-600'}`}>{d}</div>
            ))}
            {calDays.map((cell, i) => {
              if (!cell) return <div key={`e${i}`} className="h-24" />;
              return (
                <div key={cell.dateStr} className={`p-4 h-24 rounded-3xl border transition-all relative group
                   ${cell.isToday ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'}
                   ${cell.isSun && !cell.isToday ? 'bg-rose-500/5' : ''}
                   ${!cell.isSun && cell.isHoliday && !cell.isToday ? 'bg-amber-500/5' : ''}
                `}>
                  <p className={`text-sm font-black ${cell.isToday ? 'text-indigo-400' : cell.isSun ? 'text-rose-500' : cell.isHoliday ? 'text-amber-400' : 'text-slate-400'}`}>
                    {cell.d}
                  </p>
                  {cell.isToday && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />}
                  <div className="mt-2 space-y-1">
                     {cell.isHoliday && <div className="h-1 w-full bg-amber-500/20 rounded-full" />}
                     {cell.isSun && <div className="h-1 w-1/2 bg-rose-500/20 rounded-full" />}
                  </div>
                </div>
              );
            })}
         </div>
      </motion.div>
    </div>
  );
}
