import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
    TrendingUp, Users, PieChart, ArrowRight, Download, 
    FileText, IndianRupee, Filter, Calendar, Search, 
    ArrowUpRight, ArrowDownRight, CreditCard, Heart, Zap
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, PieChart as RePieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectSchoolId } from '../../../../features/auth/authSlice';
import StandardButton from '../../../../components/ui/StandardButton';
import SkeletonLoader from '../../../../components/ui/SkeletonLoader';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8080/api`;

const IncomeOverview = () => {
    const navigate = useNavigate();
    const schoolId = useSelector(selectSchoolId) || "";
    const [timeRange, setTimeRange] = useState('monthly');
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    
    const [overviewData, setOverviewData] = useState({
        totalRevenue: 0,
        timeline: [],
        sources: []
    });

    useEffect(() => {
        if (!schoolId) return;
        setIsLoading(true);
        setHasError(false);

        fetch(`${API_BASE_URL}/dashboard/${schoolId}/stats?include_chart=all`)
            .then(res => res.json())
            .then(d => {
                if(d.success) {
                    setOverviewData({
                        totalRevenue: d.data.revenue_month || 0,
                        timeline: d.data.revenue_timeline || [],
                        sources: d.data.revenue_sources || []
                    });
                } else {
                    setHasError(true);
                }
            })
            .catch(() => setHasError(true))
            .finally(() => setIsLoading(false));
    }, [schoolId, timeRange]);

    // Derived Metrics for visualization
    const metrics = [
        { label: 'Total Income', value: `₹${(overviewData.totalRevenue).toLocaleString('en-IN')}`, change: '+12.5%', icon: IndianRupee, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
        { label: 'Monthly Growth', value: '₹8,24,000', change: '+5.2%', icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-400/10' },
        { label: 'Total Donors', value: '124', change: '+8', icon: Heart, color: 'text-rose-400', bg: 'bg-rose-400/10' },
        { label: 'Pending Fees', value: '₹12,45,000', change: '-2.1%', icon: Zap, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    ];

    const monthlyTrend = overviewData.timeline.length > 0 ? overviewData.timeline.map(item => ({
        name: item.label,
        income: item.value,
        target: item.value * 1.1 // Target relative to real income
    })) : [];

    const fallbackColors = ['#10b981', '#3b82f6', '#f59e0b', '#6366f1', '#ec4899'];
    const categoryBreakdown = overviewData.sources.length > 0 ? overviewData.sources.map((item, idx) => ({
        name: item.name,
        value: item.value,
        color: fallbackColors[idx % fallbackColors.length],
        path: '/dashboard/billing/income/fees'
    })) : [];

    const handlePieClick = (data) => {
        if (data && data.path) navigate(data.path);
    };

    if (isLoading) return <div className="h-64"><SkeletonLoader /></div>;
    if (hasError) return <div className="h-64 flex items-center justify-center text-red-400 font-bold glass-card">Failed to load Income Overview. Please try again.</div>;

    return (
        <div className="space-y-2 text-slate-400">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-white/[0.02] p-1 rounded-lg border border-white/5">
                <div className="flex items-center gap-0.5">
                    {['daily', 'weekly', 'monthly', 'yearly'].map((range) => (
                        <StandardButton
                            key={range}
                            variant={timeRange === range ? 'primary' : 'ghost'}
                            size="xs"
                            onClick={() => setTimeRange(range)}
                            className={`!py-1 !px-2 font-black uppercase tracking-widest ${timeRange === range ? '' : 'text-slate-700'}`}
                        >
                            {range}
                        </StandardButton>
                    ))}
                </div>
                <div className="flex gap-1">
                    <StandardButton variant="secondary" size="xs" icon={Download} onClick={() => {}} label="EXPORT_XLS" />
                    <StandardButton variant="primary" size="xs" icon={FileText} onClick={() => {}} label="GENERATE_PDF" />
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1">
                {metrics.map((m, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="glass-card p-2 border-white/5 bg-white/[0.01] hover:border-white/10 transition-all flex flex-col justify-between"
                    >
                        <div className="flex items-start justify-between mb-1">
                            <div className={`p-1 rounded bg-white/5 ${m.color}`}>
                                <m.icon size={12} />
                            </div>
                            <div className={`flex items-center gap-0.5 text-[7px] font-black uppercase italic ${m.change.startsWith('+') ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {m.change.startsWith('+') ? <ArrowUpRight size={8} /> : <ArrowDownRight size={8} />}
                                {m.change}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white tracking-tighter leading-none italic">{m.value}</h3>
                            <p className="text-[7px] text-slate-700 font-black uppercase tracking-widest mt-0.5">{m.label.replace(' ', '_')}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-1">
                {/* Monthly Trend Bar Chart */}
                <div className="lg:col-span-2 glass-card p-2 border-white/5 bg-white/[0.01]">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[10px] font-black text-white italic uppercase tracking-tight">GROWTH_TRENDLINE</h3>
                        <div className="flex items-center gap-2 text-[7px] font-black uppercase tracking-widest text-slate-700">
                            <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> REALIZED</span>
                            <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-slate-800" /> TARGET</span>
                        </div>
                    </div>
                    <div className="h-[180px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#334155', fontSize: 8, fontWeight: 900 }} 
                                    dy={5}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#334155', fontSize: 8, fontWeight: 900 }}
                                    tickFormatter={(v) => `₹${v/1000}k`}
                                />
                                <Tooltip 
                                    cursor={{ fill: '#ffffff02' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-slate-950/80 border border-white/10 p-1.5 rounded shadow-2xl backdrop-blur-md">
                                                    <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest mb-0.5">{payload[0].payload.name}_SYNC</p>
                                                    <p className="text-[10px] font-black text-white italic">₹{payload[0].value.toLocaleString('en-IN')}</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar dataKey="income" fill="var(--primary-color)" radius={[2, 2, 0, 0]} barSize={16} />
                                <Bar dataKey="target" fill="#1e293b" radius={[2, 2, 0, 0]} barSize={4} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Breakdown Pie Chart */}
                <div className="glass-card p-2 border-white/5 bg-white/[0.01]">
                    <h3 className="text-[10px] font-black text-white italic uppercase tracking-tight mb-2 text-center">REVENUE_STREAMS</h3>
                    <div className="h-[140px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                                <Pie
                                    data={categoryBreakdown}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={35}
                                    outerRadius={50}
                                    paddingAngle={4}
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
                                                <div className="bg-slate-950/80 border border-white/10 p-1 rounded shadow-xl backdrop-blur-md">
                                                    <p className="text-[8px] font-black text-white italic uppercase">{payload[0].name}: ₹{(payload[0].value/1000).toFixed(1)}k</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                            </RePieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-1 space-y-0.5">
                        {categoryBreakdown.map((c, i) => (
                            <button 
                                key={i} 
                                onClick={() => navigate(c.path)}
                                className="w-full flex items-center justify-between p-1 rounded hover:bg-white/5 transition-colors group"
                            >
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1 h-1 rounded-full" style={{ backgroundColor: c.color }} />
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest group-hover:text-white transition-colors">{c.name}</span>
                                </div>
                                <ArrowRight size={8} className="text-slate-700 group-hover:text-white transition-all transform group-hover:translate-x-0.5" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IncomeOverview;
