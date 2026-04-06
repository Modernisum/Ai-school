import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { School, Ban, CheckCircle, TrendingUp, CalendarDays, Loader, Search, ArrowRight, Activity } from 'lucide-react'
import { listSchools } from '../api.js'
import ChurnRadar from '../components/ChurnRadar.jsx'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

export default function Dashboard() {
    const [schools, setSchools] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        listSchools().then(r => {
            setSchools(r.data || [])
            setLoading(false)
        }).catch(() => setLoading(false))
    }, [])

    const filteredSchools = useMemo(() => {
        if (!searchQuery) return schools;
        const q = searchQuery.toLowerCase();
        return schools
            .filter(s => 
                s.schoolName.toLowerCase().includes(q) ||
                s.schoolId.toLowerCase().includes(q)
            )
            .sort((a, b) => {
                const aName = a.schoolName.toLowerCase();
                const bName = b.schoolName.toLowerCase();
                const aStarts = aName.startsWith(q);
                const bStarts = bName.startsWith(q);
                
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;
                return aName.localeCompare(bName);
            });
    }, [schools, searchQuery]);

    const now = Date.now()
    const msPerDay = 86400000
    const total = schools.length
    const active = schools.filter(s => s.status === 'active').length
    const blocked = schools.filter(s => s.isBlocked).length
    const thisMonth = schools.filter(s => {
        const created = s.createdAt ? new Date(s.createdAt).getTime() : 0
        return now - created < 30 * msPerDay
    }).length

    const stats = [
        { label: 'Total Schools', value: total, color: '#6366f1', icon: <School size={18} /> },
        { label: 'Active', value: active, color: '#10b981', icon: <CheckCircle size={18} /> },
        { label: 'Blocked', value: blocked, color: '#ef4444', icon: <Ban size={18} /> },
        { label: 'New this Month', value: thisMonth, color: '#f59e0b', icon: <TrendingUp size={18} /> },
    ]

    // Registration & Activity data for chart
    const dailyActivityData = useMemo(() => {
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });

        return last7Days.map(date => {
            // Number of schools registered on this day
            const registrations = schools.filter(s => s.createdAt && s.createdAt.startsWith(date)).length;
            // Number of schools marked as active on this day (if we had history, we'd use it, but for now we'll simulate activity based on status and created date)
            const activeSchools = schools.filter(s => s.status === 'active' && s.createdAt && s.createdAt <= date).length;
            
            return { 
                date: date.split('-').slice(1).join('/'), 
                count: registrations,
                active: activeSchools 
            };
        });
    }, [schools]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="page"
        >
            {/* Daily Registration & Activity Graph - MOVED TO TOP */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="lg:col-span-2 card" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Activity size={18} color="var(--accent)" />
                            Daily Active Schools & Registration
                        </h3>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text3)' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} /> Registrations
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text3)' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} /> Active Schools
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8 }}>Last 7 Days</span>
                        </div>
                    </div>
                    <div style={{ height: 240, width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dailyActivityData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis 
                                    dataKey="date" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} 
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                                />
                                <Tooltip 
                                    contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--glass-border)', borderRadius: 12 }}
                                    itemStyle={{ fontSize: 12, fontWeight: 700 }}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="count" 
                                    stroke="var(--accent)" 
                                    strokeWidth={3} 
                                    name="Registrations"
                                    dot={{ r: 4, fill: 'var(--accent)', strokeWidth: 2, stroke: 'var(--bg)' }} 
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="active" 
                                    stroke="#10b981" 
                                    strokeWidth={3} 
                                    name="Active Schools"
                                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: 'var(--bg)' }} 
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="lg:col-span-1">
                    <ChurnRadar />
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h1 className="page-title">Network Overview</h1>
                    <p className="page-sub">Real-time health and registration analytics</p>
                </div>
                <div style={{ position: 'relative', width: 300 }}>
                    <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} size={16} />
                    <input 
                        type="text" 
                        placeholder="Search schools by name or ID..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            background: 'var(--bg2)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 10,
                            padding: '10px 14px 10px 38px',
                            color: 'var(--text)',
                            fontSize: 13,
                            outline: 'none'
                        }}
                    />
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                    <Loader size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
                </div>
            ) : (
                <>
                    {/* Stats Grid */}
                    <div className="stats-grid" style={{ marginBottom: 24 }}>
                        {stats.map((s, i) => (
                            <motion.div
                                key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.07 }}
                                className="stat-card"
                            >
                                <div style={{ color: s.color, marginBottom: 8 }}>{s.icon}</div>
                                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                                <div className="stat-label">{s.label}</div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Recently Registered with Search Filter */}
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>
                                {searchQuery ? `Search Results (${filteredSchools.length})` : 'Recently Registered Schools'}
                            </h3>
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    Clear Search
                                </button>
                            )}
                        </div>
                        {filteredSchools.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                                <Search size={32} style={{ color: 'var(--text3)', marginBottom: 12, opacity: 0.5 }} />
                                <p style={{ color: 'var(--text3)', fontSize: 13 }}>No schools match "{searchQuery}"</p>
                            </div>
                        ) : (
                            filteredSchools.slice(0, 10).map(s => (
                                <div key={s.schoolId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--glass-border)' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {s.schoolName}
                                            {s.isBlocked && <Ban size={12} color="var(--red)" />}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'monospace', marginTop: 2 }}>{s.schoolId}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <span className={`badge badge-${s.status}`} style={{ fontSize: 10 }}>{s.status}</span>
                                        <button 
                                            className="icon-btn" 
                                            onClick={() => window.location.href = `/schools/${s.schoolId}`}
                                            style={{ padding: 6, borderRadius: 6, background: 'var(--bg2)', border: '1px solid var(--glass-border)', color: 'var(--text2)' }}
                                        >
                                            <ArrowRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}
        </motion.div>
    )
}
