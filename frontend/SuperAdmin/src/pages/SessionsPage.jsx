import { useEffect, useState, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Key, RefreshCw, Clock } from 'lucide-react'
import { ToastCtx } from '../App.jsx'
import { getSessions, expireSessions } from '../api.js'
import { PageHeader, StatusBadge } from '../components/ui/index.js'

export default function SessionsPage() {
    const { schoolId } = useParams()
    const nav = useNavigate()
    const toast = useContext(ToastCtx)
    const [sessions, setSessions] = useState([])
    const [loading, setLoading] = useState(true)

    const load = async () => {
        setLoading(true)
        const r = await getSessions(schoolId)
        setSessions(r.data || [])
        setLoading(false)
    }

    useEffect(() => { load() }, [schoolId])

    const doExpireAll = async () => {
        const r = await expireSessions(schoolId)
        toast(r.success ? 'success' : 'error', r.data || r.message)
        load()
    }

    const timeRemainingMs = (expiresAt) => Math.max(0, new Date(expiresAt) - Date.now())

    const formatMs = (ms) => {
        const h = Math.floor(ms / 3600000)
        const m = Math.floor((ms % 3600000) / 60000)
        return `${h}h ${m}m`
    }

    const active = sessions.filter(s => !s.isExpired)
    const expired = sessions.filter(s => s.isExpired)

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="page-container">
            <button className="btn btn-ghost btn-sm mb-4" onClick={() => nav(`/schools/${schoolId}`)}>
                <ArrowLeft size={14} /> Back to School
            </button>

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="page-title"><Clock size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />Session Monitor</h1>
                    <p className="page-sub"><code className="text-primary">{schoolId}</code> — {active.length} active, {expired.length} expired</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={13} /> Refresh</button>
                    <button className="btn btn-danger btn-sm" onClick={doExpireAll} disabled={active.length === 0}>
                        <Key size={13} /> Expire All Sessions
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="glass-card text-center" style={{ padding: 60 }}>
                    <div className="spinner" />
                </div>
            ) : sessions.length === 0 ? (
                <div className="glass-card text-center text-tertiary" style={{ padding: 40 }}>No sessions found.</div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Token (prefix)</th><th>User Type</th><th>Status</th>
                                <th>Created</th><th>Expires</th><th>Time Left</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map((s, i) => {
                                const ms = timeRemainingMs(s.expiresAt)
                                const pct = s.isExpired ? 0 : Math.min(100, (ms / (24 * 3600000)) * 100)
                                return (
                                    <tr key={i} style={{ opacity: s.isExpired ? 0.5 : 1 }}>
                                        <td><code className="text-xs text-primary">{s.tokenId}…</code></td>
                                        <td className="text-xs">{s.userType}</td>
                                        <td><StatusBadge status={s.isExpired ? 'inactive' : 'active'} label={s.isExpired ? 'expired' : 'valid'} /></td>
                                        <td className="text-xs text-tertiary">{s.createdAt ? new Date(s.createdAt).toLocaleString() : '—'}</td>
                                        <td className="text-xs text-tertiary">{s.expiresAt ? new Date(s.expiresAt).toLocaleString() : '—'}</td>
                                        <td style={{ minWidth: 120 }}>
                                            {s.isExpired ? (
                                                <span className="text-xs text-tertiary">—</span>
                                            ) : (
                                                <div>
                                                    <div className="text-xs text-secondary mb-1">{formatMs(ms)}</div>
                                                    <div className="progress-bar-track"><div className="progress-bar-fill" style={{ width: `${pct}%` }} /></div>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </motion.div>
    )
}
