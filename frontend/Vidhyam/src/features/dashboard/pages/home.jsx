import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, UserCheck, GraduationCap, DollarSign,
  TrendingUp, Calendar, Bell, Activity, Clock,
  BookOpen, School, Award, ChevronRight, AlertTriangle, 
  CheckSquare, Layers, Map, Search, Zap,
  Briefcase, Truck, Database, Cpu, HardDrive, ShieldCheck
} from "lucide-react";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart, Area, Legend
} from 'recharts';
import { useWebSockets } from "../../../hooks/useWebSockets";
import SkeletonLoader from "../../../components/ui/SkeletonLoader";
import NoConnection from "../../../components/ui/NoConnection.jsx";

import { useSelector, useDispatch } from "react-redux";
import { selectSchoolId, selectSchoolProfile } from "../../auth/authSlice";
import { selectTheme, selectIsOnline } from "../../settings/settingsSlice";
import { setOnline } from "../../settings/settingsSlice";

import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8080/api`;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } }
};

// Premium Glass Card Component
const GlassCard = ({ children, className = "", glowColor = "primary" }) => {
  const glowStyles = {
    primary: "hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] focus-within:shadow-[0_0_30px_rgba(99,102,241,0.2)]",
    success: "hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]",
    accent: "hover:shadow-[0_0_20px_rgba(244,63,94,0.15)]",
    warning: "hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]",
  };

  return (
    <div className={`
      relative overflow-hidden
      bg-white/[0.03] backdrop-blur-xl
      border border-white/10
      rounded-3xl transition-all duration-500
      ${glowStyles[glowColor] || ""}
      ${className}
    `}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

// Premium KPi Tile
const KPITile = ({ label, value, sub, icon: Icon, color = "primary", trend = null }) => {
  const colorMap = {
    primary: "from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30",
    success: "from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30",
    accent: "from-rose-500/20 to-pink-500/20 text-rose-400 border-rose-500/30",
    warning: "from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30",
    purple: "from-purple-500/20 to-fuchsia-500/20 text-purple-400 border-purple-500/30",
  };

  return (
    <GlassCard className="p-5 group hover:-translate-y-1" glowColor={color}>
      <div className="flex justify-between items-start">
        <div className={`p-3 rounded-2xl bg-gradient-to-br ${colorMap[color]} border shadow-lg group-hover:scale-110 transition-transform duration-500`}>
          <Icon size={22} strokeWidth={2.5} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-white/5 border border-white/10 ${trend > 0 ? 'text-success' : 'text-rose-400'}`}>
            {trend > 0 ? <TrendingUp size={10} /> : <Activity size={10} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
        <h3 className="text-2xl font-black text-white mt-1 tracking-tight">{value}</h3>
        <p className="text-[10px] font-medium text-slate-400 mt-1 flex items-center gap-1.5 whitespace-nowrap overflow-hidden text-ellipsis">
          <Activity size={10} className="text-slate-600" /> {sub}
        </p>
      </div>
    </GlassCard>
  );
};

export default function HomePage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const reduxSchoolId = useSelector(selectSchoolId);
  const schoolProfile = useSelector(selectSchoolProfile);
  const isOnline = useSelector(selectIsOnline);
  const schoolId = reduxSchoolId || "";
  
  const { messages: liveMessages } = useWebSockets(schoolId);
  const [statsLoading, setStatsLoading] = useState(true);
  const [proxyLoading, setProxyLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  
  const [stats, setStats] = useState({
    total_students: 0,
    total_employees: 0,
    total_classes: 0,
    total_subjects: 0,
    attendance_percentage: 0,
    pending_leaves: 0,
    pending_complaints: 0,
    upcoming_events: 0,
    revenue_today: 0,
    revenue_month: 0,
    active_sessions: 0,
    storage_used_mb: 0,
    ai_queries_today: 0
  });

  const [proxySuggestions, setProxySuggestions] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Fallback charts data
  const attendanceTrend = [
    { name: 'Mon', active: 92, target: 95 },
    { name: 'Tue', active: 88, target: 95 },
    { name: 'Wed', active: 94, target: 95 },
    { name: 'Thu', active: 91, target: 95 },
    { name: 'Fri', active: 95, target: 95 },
    { name: 'Sat', active: 85, target: 95 },
  ];

  useEffect(() => {
    if (!schoolId) return;

    // 1. Fetch Stats
    fetch(`${API_BASE_URL}/dashboard/${schoolId}/stats`)
      .then(res => res.json())
      .then(d => { 
        if (d.success) {
          setStats(prev => ({ ...prev, ...d.data }));
          dispatch(setOnline(true));
        }
      })
      .catch(() => dispatch(setOnline(false)))
      .finally(() => setStatsLoading(false));

    // 2. Fetch Proxy Suggestions (Mocking current day/period for dashboard)
    fetch(`${API_BASE_URL}/dashboard/${schoolId}/leaves/proxy-suggestions?date=${new Date().toISOString().split('T')[0]}&period=1`)
      .then(res => res.json())
      .then(d => { 
        if (Array.isArray(d)) setProxySuggestions(d.slice(0, 3)); 
      })
      .finally(() => setProxyLoading(false));

    // 3. Fetch Tasks
    fetch(`${API_BASE_URL}/task/${schoolId}`)
      .then(res => res.json())
      .then(d => { if (d.success && Array.isArray(d.data)) setTasks(d.data.slice(0, 5)); })
      .finally(() => setTasksLoading(false));

    // 4. Fetch Employees for AI module
    fetch(`${API_BASE_URL}/employees/${schoolId}`)
      .then(res => res.json())
      .then(d => { 
        if (d.success && Array.isArray(d.data) && d.data.length > 0) {
          setEmployees(d.data);
          if (d.data[0].employee_id) setSelectedEmp(d.data[0].employee_id);
        }
      });

  }, [schoolId, dispatch]);

  const handleGenerateTasks = async () => {
    if (!selectedEmp) return;
    setIsGenerating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/task/ai/${schoolId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: selectedEmp })
      });
      if(res.ok) {
        // Refresh tasks
        const tRes = await fetch(`${API_BASE_URL}/task/${schoolId}`);
        const tData = await tRes.json();
        if (tData.success && Array.isArray(tData.data)) {
          setTasks(tData.data.slice(0, 5));
        }
      }
    } catch (e) { console.error(e); }
    finally { setIsGenerating(false); }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-4 lg:p-8 selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Bar: Neural Greeting */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="flex items-center gap-3 text-indigo-400 mb-2">
              <Cpu size={18} className="animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Neural Interface Active</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">
              Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400">Commander</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">System reports {stats.active_sessions} active sessions across the network.</p>
          </motion.div>

          {!isOnline && <NoConnection compact onRetry={() => window.location.reload()} />}
        </header>

        {/* KPI Grid */}
        <motion.div 
          variants={stagger} initial="hidden" animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6"
        >
          <KPITile 
            label="Total Students" value={stats.total_students} sub={`${stats.total_classes} Active Classes`} 
            icon={GraduationCap} color="primary" trend={2.4} 
          />
          <KPITile 
            label="Revenue Today" value={`₹${(stats.revenue_today || 0).toLocaleString()}`} sub={`Monthly: ₹${(stats.revenue_month || 0).toLocaleString()}`} 
            icon={DollarSign} color="success" trend={12} 
          />
          <KPITile 
            label="Attendance" value={`${stats.attendance_percentage.toFixed(1)}%`} sub="Real-time Network Node Pulse" 
            icon={UserCheck} color="purple" 
          />
          <KPITile 
            label="AI Queries" value={stats.ai_queries_today} sub="Optimized Decision Trees" 
            icon={Zap} color="warning" trend={45} 
          />
          <KPITile 
            label="Cloud Storage" value={`${stats.storage_used_mb.toFixed(1)} MB`} sub="Enterprise Vault Integrity" 
            icon={Database} color="accent" 
          />
        </motion.div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* Left: Operations Core (8 cols) */}
          <div className="xl:col-span-8 space-y-8">
            
            {/* Revenue & Attendance Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <GlassCard className="p-6 h-[400px] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-black text-white">Network Pulse</h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Attendance Stability</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold">
                       <div className="w-2 h-2 rounded-full bg-indigo-500" /> Active
                    </div>
                  </div>
                </div>
                <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={attendanceTrend}>
                      <defs>
                        <linearGradient id="colorPulse" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}} />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }}
                      />
                      <Area type="monotone" dataKey="active" stroke="#6366f1" strokeWidth={4} fill="url(#colorPulse)" animationDuration={2000} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>

              <GlassCard className="p-6 h-[400px] flex flex-col" glowColor="success">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-black text-white">Financial Flow</h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Revenue Distribution</p>
                  </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="w-full h-48 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Paid', value: stats.revenue_month },
                            { name: 'Today', value: stats.revenue_today },
                            { name: 'Pending', value: 12500 }, // Placeholder for pending
                          ]}
                          innerRadius={60} outerRadius={80} paddingAngle={10} dataKey="value" stroke="none"
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#3b82f6" />
                          <Cell fill="#f43f5e" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                       <p className="text-[10px] font-black text-slate-500 uppercase">Total</p>
                       <p className="text-xl font-black text-white">₹{((stats.revenue_month || 0) + (stats.revenue_today || 0)).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-6 w-full mt-4">
                     {[
                       { label: 'Today', value: stats.revenue_today, color: 'bg-blue-500' },
                       { label: 'Month', value: stats.revenue_month, color: 'bg-emerald-500' },
                       { label: 'Goal', value: 500000, color: 'bg-rose-500' },
                     ].map((item, i) => (
                       <div key={i} className="text-center">
                          <div className={`w-1.5 h-1.5 rounded-full ${item.color} mx-auto mb-1`} />
                          <p className="text-[8px] font-black text-slate-500 uppercase">{item.label}</p>
                          <p className="text-xs font-black text-white">₹{(item.value || 0).toLocaleString()}</p>
                       </div>
                     ))}
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Middle: Smart Proxy Suggestions */}
            <GlassCard className="p-8 border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 to-transparent">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-3">
                    <Search className="text-indigo-400" /> Smart Proxy Substitutes
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">AI-Ranked teacher availability based on historical subject relevance.</p>
                </div>
                <div className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                  Live Scan Active
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {proxyLoading ? [1,2,3].map(i => <SkeletonLoader key={i} className="h-32 rounded-3xl" />) : 
                 (proxySuggestions && proxySuggestions.length > 0) ? proxySuggestions.map((proxy, i) => (
                  <motion.div 
                    key={i} whileHover={{ scale: 1.02 }} 
                    className="p-5 rounded-3xl bg-slate-900/50 border border-white/5 hover:border-indigo-500/30 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black text-xl">
                        {proxy.name.charAt(0)}
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-500 uppercase">Reliability</p>
                        <p className="text-lg font-black text-indigo-400">{proxy.compatibility_score}%</p>
                      </div>
                    </div>
                    <h4 className="text-sm font-black text-white">{proxy.name}</h4>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mt-1">{proxy.subject} • {proxy.current_load}</p>
                    <div className="mt-3 p-2 rounded-xl bg-white/5 text-[10px] text-slate-400 leading-tight">
                      {proxy.reason}
                    </div>
                    <button className="w-full mt-4 py-2 rounded-xl bg-indigo-500 text-white text-[10px] font-black uppercase opacity-0 group-hover:opacity-100 transition-all shadow-lg shadow-indigo-500/20">
                      Assign Node
                    </button>
                  </motion.div>
                )) : (
                  <div className="col-span-3 py-10 text-center opacity-30">
                    <UserCheck size={32} className="mx-auto mb-2" />
                    <p className="text-xs font-black uppercase tracking-widest">No Leave Conflicts Detected</p>
                  </div>
                )}
              </div>
            </GlassCard>

          </div>

          {/* Right: Intelligence Center (4 cols) */}
          <div className="xl:col-span-4 space-y-8">
            
            {/* AI Task Engine */}
            <GlassCard className="p-6 h-[500px] flex flex-col" glowColor="primary">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <CheckSquare size={20} className="text-indigo-400" /> Task Sequencer
                </h3>
                <span className="text-[10px] font-black bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full uppercase tracking-widest">{(tasks?.length || 0)} Threads</span>
              </div>

              {/* AI Controller */}
              <div className="mb-6 p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Personnel Link</label>
                  <select 
                    value={selectedEmp} onChange={(e) => setSelectedEmp(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-indigo-500/50 transition-all font-bold"
                  >
                    <option value="">Select Employee</option>
                    {employees.map(e => <option key={e.employee_id} value={e.employee_id}>{e.name || e.employee_id}</option>)}
                  </select>
                </div>
                <button 
                  onClick={handleGenerateTasks} disabled={isGenerating || !selectedEmp}
                  className="w-full py-3 rounded-xl bg-indigo-500 text-white font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isGenerating ? <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" /> : <><Zap size={14} /> Calculate Routine</>}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                {tasksLoading ? (
                  <SkeletonLoader type="list" count={4} />
                ) : (tasks && tasks.length > 0) ? (
                  tasks.map((t, i) => (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                      key={i} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="text-xs font-bold text-white leading-tight group-hover:text-indigo-400 transition-colors uppercase tracking-tight line-clamp-1">{t.task_name}</h4>
                        {t.is_ai_generated && <Cpu size={12} className="text-indigo-500" />}
                      </div>
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-500 uppercase">
                          <Clock size={10} /> {t.deadline ? new Date(t.deadline).toLocaleDateString('en-US', {day:'numeric', month:'short'}) : 'Inf'}
                        </div>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase ${t.priority === 'High' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-700/50 text-slate-400'}`}>
                          {t.priority}
                        </span>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 opacity-20">
                     <CheckSquare size={32} />
                     <p className="text-[10px] font-black uppercase tracking-widest mt-4">Task Sequencer Empty</p>
                  </div>
                )}
              </div>
            </GlassCard>

            {/* Neural Event Feed */}
            <GlassCard className="p-6 flex-1 bg-gradient-to-t from-indigo-500/5 to-transparent">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-6">Real-time Feed</p>
              <div className="space-y-6">
                <AnimatePresence mode="popLayout">
                  {liveMessages.slice(-3).reverse().map((m, i) => (
                    <motion.div 
                      key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="flex gap-4 relative"
                    >
                      <div className="w-1 h-auto self-stretch bg-indigo-500 rounded-full flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-white leading-relaxed">{m.content || "System Synchronized"}</p>
                        <p className="text-[9px] font-black text-slate-600 uppercase mt-1">Data Packet Received • Just Now</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {(liveMessages?.length === 0) && (
                  <div className="flex flex-col items-center justify-center py-10 opacity-20">
                    <Activity size={32} />
                    <p className="text-[10px] font-black uppercase tracking-widest mt-4">Monitoring V-Sync...</p>
                  </div>
                )}
              </div>
            </GlassCard>

          </div>
        </div>

        {/* Global Footer Stats */}
        <footer className="grid grid-cols-2 md:grid-cols-4 gap-6">
           {[
             { label: 'Security Status', val: 'Level Alpha', icon: ShieldCheck, color: 'text-emerald-400' },
             { label: 'Network Uptime', val: '99.99%', icon: Activity, color: 'text-blue-400' },
             { label: 'Pending Compliance', val: stats.pending_complaints, icon: AlertTriangle, color: 'text-amber-400' },
             { label: 'Upcoming Events', val: stats.upcoming_events, icon: Calendar, color: 'text-rose-400' },
           ].map((item, i) => (
             <GlassCard key={i} className="p-4 flex items-center gap-4 bg-white/[0.01]">
                <div className={`${item.color} p-2 rounded-xl bg-white/5`}>
                   <item.icon size={18} />
                </div>
                <div>
                   <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{item.label}</p>
                   <p className="text-xs font-black text-white">{item.val}</p>
                </div>
             </GlassCard>
           ))}
        </footer>

      </div>
      
      {/* Dynamic CSS Overrides for Premium Aesthetic */}
      <style>{`
        .glass-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
        @keyframes pulse-soft {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-pulse-slow {
          animation: pulse-soft 3s infinite;
        }
      `}</style>
    </div>
  );
}
