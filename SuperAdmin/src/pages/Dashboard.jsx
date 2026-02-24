import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { School, Ban, CheckCircle, TrendingUp, CalendarDays, Loader } from 'lucide-react'
import { listSchools } from '../api.js'

export default function Dashboard() {
    const [schools, setSchools] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        listSchools().then(r => {
            setSchools(r.data || [])
            setLoading(false)
        }).catch(() => setLoading(false))
    }, [])

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

    // Group by month
    const byDate = schools.reduce((acc, s) => {
        if (!s.createdAt) return acc
        const d = new Date(s.createdAt)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        acc[key] = (acc[key] || 0) + 1
        return acc
    }, {})

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="page"
        >
            <h1 className="page-title">Dashboard</h1>
            <p className="page-sub">Overview of all registered schools</p>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                    <Loader size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            ) : (
                <>
                    <div className="stats-grid">
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

                    {/* Month breakdown */}
                    {Object.keys(byDate).length > 0 && (
                        <div className="card" style={{ marginBottom: 20 }}>
                            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
                                <CalendarDays size={14} style={{ verticalAlign: 'middle', marginRight: 6, color: 'var(--accent)' }} />
                                Registrations by Month
                            </h3>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                {Object.entries(byDate).sort().map(([month, count]) => (
                                    <div key={month} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '6px 14px', fontSize: 12 }}>
                                        <span style={{ color: 'var(--text2)' }}>{month}</span>
                                        <span style={{ color: 'var(--accent)', fontWeight: 700, marginLeft: 8 }}>{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recent schools */}
                    <div className="card">
                        <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Recently Registered</h3>
                        {schools.slice(0, 8).map(s => (
                            <div key={s.schoolId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--glass-border)' }}>
                                <div>
                                    <span style={{ fontWeight: 600, fontSize: 13 }}>{s.schoolName}</span>
                                    <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8, fontFamily: 'monospace' }}>{s.schoolId}</span>
                                </div>
                                <span className={`badge badge-${s.status}`}>{s.status}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </motion.div>
    )
}
