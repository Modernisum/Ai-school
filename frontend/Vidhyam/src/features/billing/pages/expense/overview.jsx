import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
    TrendingDown, Users, PieChart, ArrowRight, Download, 
    FileText, IndianRupee, Filter, Calendar, Search, 
    ArrowUpRight, ArrowDownRight, CreditCard, ShoppingBag, Briefcase
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, PieChart as RePieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';

const ExpenseOverview = () => {
    const navigate = useNavigate();
    const [timeRange, setTimeRange] = useState('monthly');

    // Mock Data for Visualization
    const metrics = [
        { label: 'Total Expense', value: '₹22,45,000', change: '+8.2%', icon: IndianRupee, color: 'text-rose-400', bg: 'bg-rose-400/10' },
        { label: 'Payroll Cost', value: '₹14,20,000', change: '+2.5%', icon: Briefcase, color: 'text-blue-400', bg: 'bg-blue-400/10' },
        { label: 'Infra Cost', value: '₹4,85,000', change: '+15.4%', icon: ShoppingBag, color: 'text-amber-400', bg: 'bg-amber-400/10' },
        { label: 'Operational', value: '₹3,40,000', change: '-4.1%', icon: TrendingDown, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    ];

    const monthlyTrend = [
        { name: 'Jan', expense: 180000, target: 200000 },
        { name: 'Feb', expense: 195000, target: 200000 },
        { name: 'Mar', expense: 220000, target: 210000 },
        { name: 'Apr', expense: 250000, target: 230000 },
        { name: 'May', expense: 210000, target: 220000 },
        { name: 'Jun', expense: 280000, target: 250000 },
    ];

    const categoryBreakdown = [
        { name: 'Salary', value: 1420000, color: '#3b82f6', path: '/dashboard/billing/expense/salary' },
        { name: 'Infra', value: 485000, color: '#f59e0b', path: '/dashboard/billing/expense/infra' },
        { name: 'Transport', value: 180000, color: '#10b981', path: '/dashboard/billing/expense/transport' },
        { name: 'Events', value: 160000, color: '#f43f5e', path: '/dashboard/billing/expense/events' },
    ];

    const handlePieClick = (data) => {
        if (data && data.path) navigate(data.path);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
                    {['daily', 'weekly', 'monthly', 'yearly'].map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                                timeRange === range ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-white'
                            }`}
                        >
                            {range}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <button className="btn-secondary py-2 px-4 text-xs flex items-center gap-2">
                        <Download size={14} /> Export Excel
                    </button>
                    <button className="btn-primary py-2 px-4 text-xs flex items-center gap-2">
                        <FileText size={14} /> PDF Report
                    </button>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {metrics.map((m, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="glass-card p-4 border-white/5 bg-white/[0.02] relative overflow-hidden group"
                    >
                        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-3xl opacity-10 transition-opacity group-hover:opacity-20 ${m.bg}`} />
                        <div className="flex items-start justify-between mb-3">
                            <div className={`p-2.5 rounded-xl ${m.bg} ${m.color}`}>
                                <m.icon size={20} />
                            </div>
                            <div className={`flex items-center gap-1 text-[10px] font-bold ${m.change.startsWith('+') ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {m.change.startsWith('+') ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                {m.change}
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-white tracking-tight">{m.value}</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{m.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Monthly Trend Bar Chart */}
                <div className="lg:col-span-2 glass-card p-6 border-white/5 bg-white/[0.02]">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Expense Outflow Trend</h3>
                        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
                            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500" /> Expense</span>
                            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-700" /> Budget</span>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} 
                                    dy={10}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                    tickFormatter={(v) => `₹${v/1000}k`}
                                />
                                <Tooltip 
                                    cursor={{ fill: '#ffffff05' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-slate-900 border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-xl">
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{payload[0].payload.name}</p>
                                                    <p className="text-sm font-black text-white">₹{payload[0].value.toLocaleString('en-IN')}</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={32} />
                                <Bar dataKey="target" fill="#334155" radius={[4, 4, 0, 0]} barSize={8} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Breakdown Pie Chart */}
                <div className="glass-card p-6 border-white/5 bg-white/[0.02]">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 text-center">Expense Allocation</h3>
                    <div className="h-[240px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                                <Pie
                                    data={categoryBreakdown}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={8}
                                    dataKey="value"
                                    onClick={(data) => handlePieClick(data)}
                                    cursor="pointer"
                                >
                                    {categoryBreakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-slate-900 border border-white/10 p-2 rounded-lg shadow-xl">
                                                    <p className="text-[10px] font-bold text-white uppercase">{payload[0].name}: ₹{(payload[0].value/1000).toFixed(1)}k</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                            </RePieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 space-y-2">
                        {categoryBreakdown.map((c, i) => (
                            <button 
                                key={i} 
                                onClick={() => navigate(c.path)}
                                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors group"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-white transition-colors">{c.name}</span>
                                </div>
                                <ArrowRight size={12} className="text-slate-600 group-hover:text-white transition-all transform group-hover:translate-x-1" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExpenseOverview;
