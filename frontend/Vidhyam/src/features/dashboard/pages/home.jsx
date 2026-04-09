import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, UserCheck, GraduationCap, DollarSign,
  TrendingUp, Calendar, Bell, Activity, Clock,
  BookOpen, School, Award, ChevronRight, ChevronLeft,
  AlertTriangle, CheckSquare, Layers, Map, MoreVertical, Search, Zap,
  Briefcase, Truck
} from "lucide-react";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, AreaChart, Area, Legend
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
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } }
};

export default function HomePage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const reduxSchoolId = useSelector(selectSchoolId);
  const schoolProfile = useSelector(selectSchoolProfile);
  const themeColors = useSelector(selectTheme);
  const isOnline = useSelector(selectIsOnline);
  const schoolName = schoolProfile?.name || "Vidhyam";
  const schoolId = reduxSchoolId || "";
  
  const { messages: liveMessages } = useWebSockets(schoolId);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [statsLoading, setStatsLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [remindersLoading, setRemindersLoading] = useState(true);
  const [holidaysLoading, setHolidaysLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReorganizing, setIsReorganizing] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  const [data, setData] = useState({
    counts: { 
      totalStudents: 0, 
      totalEmployees: 0, 
      totalClasses: 0, 
      openComplaints: 0, 
      activeTasks: 0, 
      highRiskStudents: 0,
      students: { regular: 0, private: 0 },
      staff: { teachers: 0, peons: 0, drivers: 0, principal: 0 }
    },
    attendance: { 
      presentToday: 0, 
      percentage: 0,
      byRole: {
        regular: 0, private: 0,
        teachers: 0, peons: 0, drivers: 0, principal: 0
      },
      dailyTrend: [
        { date: '2026-04-01', students: 85, staff: 90 },
        { date: '2026-04-02', students: 88, staff: 92 },
        { date: '2026-04-03', students: 82, staff: 85 },
        { date: '2026-04-04', students: 90, staff: 95 },
        { date: '2026-04-05', students: 92, staff: 94 },
        { date: '2026-04-06', students: 87, staff: 89 },
        { date: '2026-04-07', students: 95, staff: 98 },
      ]
    },
    revenue: { 
      total: 0, 
      paid: 0, 
      pending: 0, 
      discount: 0,
      breakdown: {
        income: { tuition: 0, exam: 0, other: 0 },
        expense: { salary: 0, infra: 0, operations: 0 }
      }
    }
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
    { name: 'Paid Fees', value: Number(data.revenue.paid), color: '#10b981', path: '/dashboard/billing/income/fees' }, // Emerald/Green
    { name: 'Pending Fees', value: Number(data.revenue.pending), color: '#ef4444', path: '/dashboard/billing/income/fees' }, // Rose/Red
    { name: 'Discount Fees', value: Number(data.revenue.discount), color: '#3b82f6', path: '/dashboard/billing/income/fees' }, // Blue
  ];

  const handleFeePieClick = (entry) => {
    if (entry && entry.path) navigate(entry.path);
  };

  const financialTrendData = [
    {
      name: 'Income',
      tuition: data.revenue?.breakdown?.income?.tuition || 50000,
      exam: data.revenue?.breakdown?.income?.exam || 15000,
      other: data.revenue?.breakdown?.income?.other || 10000,
    },
    {
      name: 'Expense',
      salary: data.revenue?.breakdown?.expense?.salary || 35000,
      infra: data.revenue?.breakdown?.expense?.infra || 12000,
      operations: data.revenue?.breakdown?.expense?.operations || 8000,
    }
  ];

  const UserRoleColumn = ({ label, total, present, color, icon: Icon }) => {
    const absent = Math.max(0, total - present);
    const presentPct = total > 0 ? (present / total) * 100 : 0;
    
    return (
      <div className="flex flex-col items-center gap-2 group/col">
        <div className="relative w-full h-32 bg-white/[0.02] border border-white/5 rounded-lg overflow-hidden flex flex-col justify-end">
          {/* Absent Block (Gray) */}
          <motion.div 
            initial={{ height: '100%' }}
            animate={{ height: `${100 - presentPct}%` }}
            className="w-full bg-slate-800/50 relative z-0"
          />
          {/* Present Block (Color) */}
          <motion.div 
            initial={{ height: 0 }}
            animate={{ height: `${presentPct}%` }}
            style={{ backgroundColor: color }}
            className="w-full relative z-10 shadow-[0_-4px_15px_rgba(0,0,0,0.2)]"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </motion.div>

          {/* Hover Overlay */}
          <div className="absolute inset-0 opacity-0 group-hover/col:opacity-100 transition-opacity bg-slate-950/80 z-20 flex flex-col items-center justify-center p-2 text-center backdrop-blur-sm">
             <p className="text-[7px] font-black text-slate-500 uppercase mb-1">{label}</p>
             <p className="text-[10px] font-black text-white">{present} / {total}</p>
             <p className="text-[8px] font-bold text-success mt-1">{presentPct.toFixed(0)}% Present</p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
           <div className={`p-1.5 rounded-md bg-white/5 border border-white/10 text-slate-400 group-hover/col:text-white transition-colors`}>
              <Icon size={10} />
           </div>
           <span className="text-[7px] font-black text-slate-500 uppercase tracking-tighter group-hover/col:text-slate-300 transition-colors">{label}</span>
        </div>
      </div>
    );
  };

  const userCompositionData = [
    {
      name: 'Students',
      regular: data.counts.students?.regular || 0,
      private: data.counts.students?.private || 0,
    },
    {
      name: 'Employees',
      teachers: data.counts.staff?.teachers || 0,
      peons: data.counts.staff?.peons || 0,
      drivers: data.counts.staff?.drivers || 0,
      principal: data.counts.staff?.principal || 0,
    }
  ];

  const attendanceBlocks = useMemo(() => {
    const total = data.counts.totalStudents + data.counts.totalEmployees;
    const present = data.attendance.presentToday;
    const blocks = [];
    for (let i = 0; i < total; i++) {
      blocks.push(i < present ? 'present' : 'absent');
    }
    return blocks;
  }, [data]);

   const netProfit = useMemo(() => {
    const totalIncome = Object.values(financialTrendData[0]).filter(v => typeof v === 'number').reduce((a, b) => a + b, 0);
    const totalExpense = Object.values(financialTrendData[1]).filter(v => typeof v === 'number').reduce((a, b) => a + b, 0);
    return totalIncome - totalExpense;
  }, [data]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setStatsLoading(true);
    setTasksLoading(true);
    setRemindersLoading(true);
    setHolidaysLoading(true);
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    
    if (!schoolId) {
      setStatsLoading(false);
      setTasksLoading(false);
      setRemindersLoading(false);
      setHolidaysLoading(false);
      return;
    }

    const handleError = (err) => {
      if (err.name === 'TypeError' || err.message?.includes('fetch')) {
        dispatch(setOnline(false));
      }
    };

    // Decoupled independent data fetching for perceived speed
    fetch(`${API_BASE_URL}/dashboard/${schoolId}/stats`)
      .then(res => res.json())
      .then(d => { 
        if (d.data) { 
          setData(prev => ({
            ...prev,
            ...d.data,
            counts: { ...prev.counts, ...d.data.counts },
            attendance: { ...prev.attendance, ...d.data.attendance },
            revenue: { ...prev.revenue, ...d.data.revenue }
          })); 
          dispatch(setOnline(true)); 
        } 
      })
      .catch(handleError)
      .finally(() => setStatsLoading(false));

    fetch(`${API_BASE_URL}/task/${schoolId}`)
      .then(res => res.json())
      .then(d => { if (Array.isArray(d.data)) setTasks(d.data); })
      .catch(handleError)
      .finally(() => setTasksLoading(false));

    fetch(`${API_BASE_URL}/reminder/${schoolId}`)
      .then(res => res.json())
      .then(d => { if (Array.isArray(d.data)) setReminders(d.data); })
      .catch(handleError)
      .finally(() => setRemindersLoading(false));

    fetch(`${API_BASE_URL}/operations/attendance/${schoolId}/holidays`)
      .then(res => res.json())
      .then(d => { if (Array.isArray(d.data)) setHolidays(d.data); })
      .catch(handleError)
      .finally(() => setHolidaysLoading(false));

    fetch(`${API_BASE_URL}/employees/${schoolId}`)
      .then(res => res.json())
      .then(d => { 
        if (Array.isArray(d.data) && d.data.length > 0) {
           setEmployees(d.data); 
           setSelectedEmp(d.data[0].employee_id || d.data[0].employeeId || 'EMP-001');
        } 
      })
      .catch(console.error);

    return () => clearInterval(timer);
  }, [schoolId, retryCount, dispatch]);

  const handleGenerateTasks = async () => {
    if (!selectedEmp) return alert("Select an employee first");
    setIsGenerating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/task/ai/${schoolId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: selectedEmp })
      });
      if(res.ok) handleRetry();
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReorganizeTasks = async () => {
    if (!selectedEmp) return alert("Select an employee first");
    setIsReorganizing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/task/ai/${schoolId}/reorganize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: selectedEmp })
      });
      if(res.ok) handleRetry();
    } catch (e) {
      console.error(e);
    } finally {
      setIsReorganizing(false);
    }
  };

  const statCards = [
    { label: "Today Attendance", value: `${(data.attendance?.percentage || 0).toFixed(1)}%`, sub: `${data.attendance?.presentToday || 0} Present`, icon: UserCheck, color: "success" },
    { label: "Pending Fees", value: `₹${Number(data.revenue?.pending || 0).toLocaleString()}`, sub: "Payment Overdue", icon: DollarSign, color: "accent" },
    { label: "Open Complaints", value: data.counts?.openComplaints || 0, sub: "Action Required", icon: AlertTriangle, color: "accent" },
    { label: "Risk Profiles", value: data.counts?.highRiskStudents || 0, sub: "Low Academic Performance", icon: TrendingUp, color: "primary" },
  ];

  return (
    <div className="p-2 lg:p-4 space-y-4 max-w-[1600px] mx-auto overflow-x-hidden">
      {!isOnline && (
        <NoConnection compact onRetry={handleRetry} />
      )}

      {/* KPI Row */}
      <motion.div initial="hidden" animate="visible" variants={stagger} className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Attendance Trend Graph (6 cols) */}
        <motion.div variants={fadeUp} className="xl:col-span-7 glass-card p-4 relative overflow-hidden group border-white/10 transition-all">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="section-label mb-0.5 opacity-70 tracking-widest text-[8px]">Attendance Analytics</p>
              <h3 className="text-base font-black text-white">Daily Presence Curve</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative group/select">
                <Calendar size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="date" 
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded pl-6 pr-2 py-1 text-[9px] text-white outline-none cursor-pointer hover:bg-white/10 transition-colors appearance-none"
                />
              </div>
              <div className="flex items-center gap-2 text-[8px] font-bold">
                <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_5px_rgba(var(--primary-rgb),0.5)]" /> Students</span>
                <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-success shadow-[0_0_5px_#10b981]" /> Staff</span>
              </div>
            </div>
          </div>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.attendance?.dailyTrend || []}>
                <defs>
                  <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary-color)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorStaff" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 8, fontWeight: 700 }}
                  tickFormatter={(val) => {
                    const d = new Date(val);
                    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
                  }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 8, fontWeight: 700 }}
                  tickFormatter={(val) => `${val}%`}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', backdropFilter: 'blur(10px)' }}
                  itemStyle={{ fontSize: '9px', fontWeight: 'bold', padding: '2px 0' }}
                  labelStyle={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px', fontWeight: 'bold' }}
                  formatter={(value, name) => [`${value}% Attendance`, name === 'students' ? 'Students' : 'Staff']}
                />
                <Area 
                  type="monotone" 
                  dataKey="students" 
                  stroke="var(--primary-color)" 
                  fillOpacity={1} 
                  fill="url(#colorStudents)" 
                  strokeWidth={3}
                  animationDuration={1500}
                  dot={{ r: 2, fill: 'var(--primary-color)', strokeWidth: 0 }}
                  activeDot={{ r: 4, strokeWidth: 0, shadow: '0 0 10px var(--primary-color)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="staff" 
                  stroke="#10b981" 
                  fillOpacity={1} 
                  fill="url(#colorStaff)" 
                  strokeWidth={3}
                  animationDuration={1500}
                  dot={{ r: 2, fill: '#10b981', strokeWidth: 0 }}
                  activeDot={{ r: 4, strokeWidth: 0, shadow: '0 0 10px #10b981' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          {/* Real-time Status Indicator */}
          <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
             <div className="flex gap-4">
                <div className="flex items-center gap-2">
                   <div className={`w-2 h-2 rounded-full ${data.attendance.percentage > 80 ? 'bg-success' : 'bg-amber-500'} animate-pulse`} />
                   <span className="text-[9px] font-black text-white uppercase tracking-wider">Live Network Status</span>
                </div>
                <div className="flex items-center gap-3">
                   <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-success" />
                      <span className="text-[8px] font-bold text-slate-400">Present</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                      <span className="text-[8px] font-bold text-slate-400">Absent</span>
                   </div>
                </div>
             </div>
             <div className="text-right">
                <p className="text-[7px] font-black text-slate-500 uppercase">Avg. Daily Sync</p>
                <p className="text-[10px] font-black text-white">
                  {data.attendance?.dailyTrend?.length > 0 
                    ? (data.attendance.dailyTrend.reduce((acc, curr) => acc + curr.students, 0) / data.attendance.dailyTrend.length).toFixed(1) 
                    : "0.0"}%
                </p>
             </div>
          </div>
        </motion.div>

        {/* Comprehensive Column-based User Visualization (5 cols) */}
        <motion.div variants={fadeUp} className="xl:col-span-5 glass-card p-4 border-white/10 transition-all flex flex-col">
          <div className="flex justify-between items-center mb-4">
             <div>
                <p className="section-label mb-0.5 opacity-70 tracking-widest text-[8px]">Network Composition</p>
                <h3 className="text-sm font-black text-white uppercase tracking-tight">Active User Matrix</h3>
             </div>
             <div className="text-right">
                <p className="text-[7px] font-black text-slate-500 uppercase">System Capacity</p>
                <p className="text-[10px] font-black text-white">{data.counts.totalStudents + data.counts.totalEmployees} Nodes</p>
             </div>
          </div>

          {/* Role Columns Grid */}
          <div className="grid grid-cols-6 gap-3 flex-1">
             {/* Students: Regular */}
             <UserRoleColumn 
                label="Regular" 
                total={data.counts.students?.regular || 0} 
                present={data.attendance.byRole?.regular || 0} 
                color="var(--primary-color)" 
                icon={GraduationCap}
             />
             {/* Students: Private */}
             <UserRoleColumn 
                label="Private" 
                total={data.counts.students?.private || 0} 
                present={data.attendance.byRole?.private || 0} 
                color="#818cf8" 
                icon={Users}
             />
             {/* Staff: Teachers */}
             <UserRoleColumn 
                label="Teachers" 
                total={data.counts.staff?.teachers || 0} 
                present={data.attendance.byRole?.teachers || 0} 
                color="#10b981" 
                icon={UserCheck}
             />
             {/* Staff: Peons */}
             <UserRoleColumn 
                label="Peons" 
                total={data.counts.staff?.peons || 0} 
                present={data.attendance.byRole?.peons || 0} 
                color="#f59e0b" 
                icon={Briefcase}
             />
             {/* Staff: Drivers */}
             <UserRoleColumn 
                label="Drivers" 
                total={data.counts.staff?.drivers || 0} 
                present={data.attendance.byRole?.drivers || 0} 
                color="#6366f1" 
                icon={Truck}
             />
             {/* Staff: Principal */}
             <UserRoleColumn 
                label="Principal" 
                total={data.counts.staff?.principal || 0} 
                present={data.attendance.byRole?.principal || 0} 
                color="#f43f5e" 
                icon={Award}
             />
          </div>
          
          {/* Legend / Status Info */}
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-success" />
                   <span className="text-[8px] font-bold text-slate-400 uppercase">Present</span>
                </div>
                <div className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                   <span className="text-[8px] font-bold text-slate-400 uppercase">Absent</span>
                </div>
             </div>
             <div className="flex items-center gap-1">
                <Activity size={10} className="text-primary animate-pulse" />
                <span className="text-[9px] font-black text-white uppercase tracking-widest">Real-time Pulse</span>
             </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left: Financial Analytics (8 cols) */}
        <div className="xl:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Fee Structure Pie Chart */}
            <motion.div variants={fadeUp} className="glass-card p-4 min-h-[320px] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                 <div>
                   <p className="section-label text-[8px]">Fee Management</p>
                   <h2 className="text-base font-black text-white">Revenue Distribution</h2>
                 </div>
                 <div className="p-1.5 rounded-lg bg-success/10 text-success">
                    <DollarSign size={16} />
                 </div>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center pt-2">
                <div className="w-full h-44 relative">
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={feeData} 
                          innerRadius={50} 
                          outerRadius={70} 
                          paddingAngle={6} 
                          dataKey="value" 
                          animationBegin={200}
                          cursor="pointer"
                          labelLine={false}
                          label={({ percent, name }) => `${(percent * 100).toFixed(0)}%`}
                          onClick={handleFeePieClick}
                        >
                          {feeData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                        </Pie>
                        <Tooltip 
                           contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }}
                           itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                           formatter={(value) => `₹${Number(value).toLocaleString()}`}
                        />
                        <Legend iconType="circle" verticalAlign="bottom" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', paddingTop: '15px' }} />
                      </PieChart>
                   </ResponsiveContainer>
                </div>
              </div>
            </motion.div>

            {/* 2. Comprehensive Financial Column View */}
            <motion.div variants={fadeUp} className="glass-card p-4 min-h-[320px] flex flex-col relative overflow-hidden">
               {/* Profit Badge Overlay */}
               <div className={`absolute -right-12 top-6 rotate-45 px-12 py-1 text-[8px] font-black uppercase tracking-widest shadow-xl z-10 ${netProfit >= 0 ? 'bg-success text-white' : 'bg-rose-500 text-white'}`}>
                  {netProfit >= 0 ? 'Surplus' : 'Deficit'}
               </div>

               <div className="flex justify-between items-center mb-4">
                 <div>
                   <p className="section-label text-[8px]">Finance Matrix</p>
                   <h2 className="text-base font-black text-white">Income vs Expense</h2>
                 </div>
                 <div className="flex items-center gap-2 mr-8">
                    <div className="text-right">
                       <p className="text-[7px] font-black text-slate-500 uppercase">Current Balance</p>
                       <p className={`text-base font-black ${netProfit >= 0 ? 'text-success' : 'text-rose-500'} flex items-center gap-1`}>
                          <Award size={14} /> ₹{Number(netProfit).toLocaleString()}
                       </p>
                    </div>
                 </div>
              </div>
              <div className="flex-1 h-44 mt-1">
                 <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={financialTrendData}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9, fontWeight: 'bold' }} />
                     <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 8, fontWeight: 'bold' }} tickFormatter={(v) => `₹${v/1000}k`} />
                     <Tooltip 
                        cursor={{ fill: 'rgba(255,255,255,0.02)' }} 
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px' }}
                        itemStyle={{ fontSize: '9px', fontWeight: 'bold' }}
                     />
                     <Bar dataKey="tuition" stackId="income" fill="#6366f1" radius={[0, 0, 0, 0]} name="Tuition Fee" />
                     <Bar dataKey="exam" stackId="income" fill="#818cf8" radius={[0, 0, 0, 0]} name="Exam Fee" />
                     <Bar dataKey="other" stackId="income" fill="#a5b4fc" radius={[3, 3, 0, 0]} name="Other Sources" />
                     
                     <Bar dataKey="salary" stackId="expense" fill="#ef4444" radius={[0, 0, 0, 0]} name="Salary" />
                     <Bar dataKey="infra" stackId="expense" fill="#f87171" radius={[0, 0, 0, 0]} name="Infrastructure" />
                     <Bar dataKey="operations" stackId="expense" fill="#fca5a5" radius={[3, 3, 0, 0]} name="Operations" />
                   </BarChart>
                 </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* Quick Registry Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             {[
               { icon: GraduationCap, label: 'Students', value: data.counts.totalStudents, color: 'primary' },
               { icon: Users, label: 'Faculty', value: data.counts.totalEmployees, color: 'secondary' },
               { icon: BookOpen, label: 'Sections', value: data.counts.totalClasses, color: 'secondary' },
               { icon: School, label: 'Instance', value: `#${schoolId}`, color: 'slate' }
             ].map((item, i) => (
                <div key={i} className="glass-card p-4 hover:bg-white/[0.07] transition-all cursor-default group border-none bg-white/[0.04]">
                  <item.icon size={16} className="text-slate-500 mb-2 group-hover:text-primary transition-colors" />
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{item.label}</p>
                  <p className="text-lg font-black text-white mt-0.5">{item.value}</p>
                </div>
             ))}
          </div>

          {/* Critical Alerts: AI Risk Defaulters */}
          {data.counts.detailedRisks && data.counts.detailedRisks.length > 0 && (
            <motion.div initial="hidden" animate="visible" variants={fadeUp} className="glass-card p-6 border-accent/20 bg-accent/5">
              <div className="flex justify-between items-center mb-4">
                 <div className="flex items-center gap-2">
                   <div className="p-1.5 rounded-lg bg-accent/20 text-accent anim-pulse">
                      <AlertTriangle size={16} />
                   </div>
                   <h2 className="text-lg font-black text-white">Critical Alerts</h2>
                 </div>
                 <span className="text-[8px] font-black text-accent uppercase tracking-widest bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">Action Required</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 {data.counts.detailedRisks.map((risk, idx) => (
                   <div key={idx} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-rose-500/30 transition-all flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-rose-400 font-black text-base">
                            {risk.name.charAt(0)}
                         </div>
                         <div>
                            <p className="text-xs font-bold text-white tracking-wide">{risk.name}</p>
                            <div className="flex flex-wrap gap-1.5 mt-0.5">
                               {Array.isArray(risk.factors) && risk.factors.slice(0, 2).map((f, i) => (
                                 <span key={i} className="text-[8px] font-bold text-rose-400/80 uppercase tracking-tighter bg-rose-500/5 px-1.5 py-0.5 rounded border border-rose-500/10">{f}</span>
                               ))}
                            </div>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-[8px] font-black text-slate-500 uppercase">Risk Score</p>
                         <p className="text-base font-black text-rose-500">{risk.score}%</p>
                      </div>
                   </div>
                 ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Right: Real-time Action Center (4 cols) */}
        <div className="xl:col-span-4 space-y-6">
           
           {/* Tasks Center */}
           <motion.div initial="hidden" animate="visible" variants={fadeUp} className="glass-card p-6 flex flex-col h-[420px]">
              <div className="flex flex-col mb-4 gap-3 border-b border-white/5 pb-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <CheckSquare size={18} className="text-primary" /> AI To-Do List
                  </h3>
                  <span className="text-[8px] font-black bg-white/10 text-slate-300 px-2 py-1 rounded-full uppercase tracking-widest">{tasks.length} Active</span>
                </div>
                
                {/* AI Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-white/[0.02] p-2 rounded-xl border border-white/5">
                   <select 
                     value={selectedEmp} 
                     onChange={(e) => setSelectedEmp(e.target.value)}
                     className="bg-transparent text-[10px] text-white border-none outline-none cursor-pointer flex-1 min-w-[100px] font-bold"
                   >
                     <option value="" disabled className="bg-slate-900">Select Staff</option>
                     {employees.map(emp => (
                       <option key={emp.employee_id} value={emp.employee_id} className="bg-slate-900">
                         {emp.name || emp.employee_id}
                       </option>
                     ))}
                   </select>

                   <div className="flex items-center gap-1.5">
                     <button 
                         onClick={handleGenerateTasks} disabled={isGenerating || !selectedEmp}
                         className="text-[8px] bg-primary/20 hover:bg-primary text-primary hover:text-white px-2 py-1 rounded-full uppercase tracking-widest transition-colors flex items-center gap-1 font-black"
                     >
                         {isGenerating ? <div className="w-1.5 h-1.5 rounded-full border border-t-transparent animate-spin"/> : <Zap size={8} />}
                         Plan
                     </button>
                     <button 
                         onClick={handleReorganizeTasks} disabled={isReorganizing || !selectedEmp}
                         className="text-[8px] bg-accent/20 hover:bg-accent text-accent hover:text-white px-2 py-1 rounded-full uppercase tracking-widest transition-colors flex items-center gap-1 font-black"
                     >
                         {isReorganizing ? <div className="w-1.5 h-1.5 rounded-full border border-t-transparent animate-spin"/> : <Layers size={8} />}
                         Sync
                     </button>
                   </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                {tasksLoading ? <SkeletonLoader type="list" count={3} className="h-14 rounded-lg" /> : tasks.length > 0 ? tasks.map((t, idx) => (
                  <div key={idx} className="p-3 bg-white/[0.03] rounded-xl border border-white/5 hover:bg-white/5 transition-all flex items-start gap-3 group cursor-pointer">
                     <div className="w-4 h-4 rounded border-2 border-slate-600 mt-0.5 flex items-center justify-center shrink-0">
                        {t.status === 'completed' && <div className="w-full h-full bg-primary rounded-sm" />}
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                           <p className="text-xs font-bold text-white leading-tight">{t.task_name}</p>
                           {t.is_ai_generated && <span className="text-[7px] bg-primary/20 text-primary border border-primary/20 px-1.5 py-0.5 rounded uppercase font-black tracking-widest">AI</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                           <span className="text-[8px] font-black text-slate-500 uppercase flex items-center gap-1">
                              <Calendar size={8} /> 
                              {t.deadline ? new Date(t.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric'}) : 'No Date'}
                           </span>
                           <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded uppercase ${t.priority === 'High' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-700/50 text-slate-400'}`}>
                              {t.priority}
                           </span>
                        </div>
                     </div>
                  </div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-40">
                     <CheckSquare size={24} className="mb-2 text-slate-600" />
                     <p className="text-[10px] font-bold text-slate-500">No pending tasks.</p>
                  </div>
                )}
              </div>
           </motion.div>

           {/* Fleet Intelligence */}
           <motion.div initial="hidden" animate="visible" variants={fadeUp} className="glass-card p-6 bg-gradient-to-br from-success/10 via-transparent to-transparent">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                   <Map size={18} className="text-success" /> Fleet Radar
                </h3>
                <div className="flex items-center gap-1.5">
                   <div className="w-1.5 h-1.5 rounded-full bg-success animate-ping" />
                   <span className="text-[8px] font-black text-success uppercase">Live</span>
                </div>
              </div>
              <div className="h-24 bg-slate-950/80 rounded-2xl relative overflow-hidden border border-white/5 flex items-center justify-center shadow-inner">
                 <div className="z-10 text-center">
                    <p className="text-[8px] font-black text-success uppercase tracking-[0.2em] mb-1">Synchronized</p>
                    <p className="text-[10px] text-slate-400 font-bold">4 Vehicles Active</p>
                 </div>
                 <div className="absolute top-1/2 left-1/2 w-[200%] h-[1px] bg-success/20 -translate-x-1/2 -translate-y-1/2 origin-center animate-[spin_4s_linear_infinite]" />
              </div>
           </motion.div>

           {/* Upcoming Notices */}
           <motion.div initial="hidden" animate="visible" variants={fadeUp} className="glass-card p-6 flex flex-col bg-accent/5 border-accent/10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                   <Bell size={18} className="text-accent" /> Notices
                </h3>
                <span className="text-[8px] font-black bg-accent/20 text-accent px-2 py-1 rounded-full uppercase tracking-widest">{reminders.length}</span>
              </div>
              <div className="space-y-3 max-h-[200px] overflow-y-auto custom-scrollbar pr-1.5">
                {remindersLoading ? <SkeletonLoader type="text" count={2} className="h-14 rounded-lg" /> : reminders.length > 0 ? reminders.map((rem, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/5 transition-all group">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-xs font-bold text-white group-hover:text-accent transition-colors uppercase tracking-tight">{rem.title}</p>
                      <span className="text-[8px] font-mono text-slate-600">{rem.date}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed line-clamp-2">{rem.content}</p>
                  </div>
                )) : (
                  <div className="py-6 text-center opacity-30">
                    <Bell size={24} className="mx-auto mb-1 text-slate-600" />
                    <p className="text-[8px] font-black uppercase tracking-widest">No active notices</p>
                  </div>
                )}
              </div>
           </motion.div>

           {/* Live Neural Feed */}
           <motion.div initial="hidden" animate="visible" variants={fadeUp} className="glass-card p-6 flex-1 border-primary/10">
              <p className="section-label mb-4 tracking-[0.2em] text-[8px]">Neural Activity Link</p>
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {liveMessages.slice(-2).reverse().map((m, i) => (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} key={i} className="flex gap-3">
                       <div className="w-1 h-auto self-stretch bg-primary rounded-full flex-shrink-0" />
                       <div className="py-0.5">
                          <p className="text-xs font-bold text-white leading-tight tracking-tight">{m.content || m.title || "Network Link Active"}</p>
                          <p className="text-[8px] text-slate-500 mt-1 font-black uppercase tracking-wider flex items-center gap-1.5">
                             <Clock size={8} /> Just Now
                          </p>
                       </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
           </motion.div>

        </div>
      </div>

      {/* 1-Week Teacher Timeline View */}
      {selectedEmp && (
      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="glass-card p-5 mt-6 bg-gradient-to-r from-primary/5 to-transparent border-primary/20">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
            <div>
               <p className="section-label tracking-[0.2em] text-primary text-[8px]">AI Scheduler</p>
               <h2 className="text-lg font-black text-white mt-0.5">1-Week Action Timeline</h2>
            </div>
         </div>
         <div className="flex overflow-x-auto custom-scrollbar pb-3 gap-3 snap-x">
             {[...Array(7)].map((_, index) => {
                 const date = new Date();
                 date.setDate(date.getDate() + index);
                 const dateStr = date.toISOString().split('T')[0];
                 const isToday = index === 0;
                 const dayTasks = tasks.filter(t => t.deadline && t.deadline.startsWith(dateStr));
                 
                 return (
                 <div key={index} className={`shrink-0 w-48 p-3.5 rounded-xl border transition-all snap-start
                        ${isToday ? 'bg-primary/10 border-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.1)] relative' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'}
                 `}>
                     {isToday && <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-lg"><Activity size={10} className="text-white animate-pulse" /></div>}
                     <p className={`text-[8px] font-black uppercase tracking-widest ${isToday ? 'text-primary' : 'text-slate-500'}`}>
                         {date.toLocaleDateString('en-US', { weekday: 'long' })}
                     </p>
                     <h4 className="text-sm font-black text-white mb-2.5">{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric'})}</h4>
                     
                     <div className="space-y-1.5">
                         {dayTasks.length > 0 ? dayTasks.map((t, idx) => (
                             <div key={idx} className="p-2 bg-slate-950/40 rounded-lg border border-white/5 relative overflow-hidden group">
                                 <p className="text-[10px] font-bold text-white line-clamp-1">{t.task_name}</p>
                                 <p className="text-[7px] text-slate-500 uppercase tracking-widest mt-1">{t.priority}</p>
                             </div>
                         )) : (
                             <div className="py-3 text-center opacity-30">
                                <Calendar size={16} className="mx-auto mb-1 text-slate-500" />
                                <p className="text-[8px] font-black uppercase tracking-widest">No classes</p>
                             </div>
                         )}
                     </div>
                 </div>
                 );
             })}
         </div>
      </motion.div>
      )}

      {/* Bottom Section: Enterprise Calendar */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="glass-card p-5 mt-6">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-4">
            <div>
               <p className="section-label tracking-[0.2em] text-[8px]">Academic Infrastructure</p>
               <h2 className="text-lg font-black text-white mt-0.5">Institutional Roadmap</h2>
            </div>
            <div className="flex items-center gap-3">
               <div className="p-2 glass-card border-none bg-white/5 flex items-center gap-2.5">
                  <div className="text-right">
                     <p className="text-[7px] font-black text-slate-500 uppercase">Events</p>
                     <p className="text-xs font-black text-white">12 Scheduled</p>
                  </div>
                  <Calendar size={18} className="text-primary" />
               </div>
               <button className="px-3 py-1.5 rounded-lg bg-primary text-white text-[9px] font-black uppercase tracking-widest hover:brightness-110 transition-all active:scale-95">Config</button>
            </div>
         </div>
         
         <div className="grid grid-cols-7 gap-2">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
              <div key={d} className={`text-center text-[8px] font-black tracking-[0.1em] ${d === 'SUN' ? 'text-accent' : 'text-slate-600'}`}>{d}</div>
            ))}
            {calDays.map((cell, i) => {
              if (!cell) return <div key={`e${i}`} className="h-12" />;
              return (
                <div key={cell.dateStr} className={`p-1.5 h-12 rounded-xl border transition-all relative group
                   ${cell.isToday ? 'border-primary bg-primary/10 shadow-lg shadow-primary/5' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'}
                   ${cell.isSun && !cell.isToday ? 'bg-accent/5' : ''}
                   ${!cell.isSun && cell.isHoliday && !cell.isToday ? 'bg-accent/5' : ''}
                `}>
                  <p className={`text-[10px] font-black ${cell.isToday ? 'text-primary' : cell.isSun ? 'text-accent' : cell.isHoliday ? 'text-accent' : 'text-slate-400'}`}>
                    {cell.d}
                  </p>
                  {cell.isToday && <div className="absolute top-1 right-1 w-0.5 h-0.5 rounded-full bg-primary animate-pulse" />}
                </div>
              );
            })}
         </div>
      </motion.div>
    </div>
  );
}
