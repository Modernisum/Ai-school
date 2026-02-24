import { useEffect, useState, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Key, RefreshCw, Clock, Loader } from 'lucide-react'
import { ToastCtx } from '../App.jsx'
import { getSessions, expireSessions } from '../api.js'

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

    const timeRemainingMs = (expiresAt) => {
        return Math.max(0, new Date(expiresAt) - Date.now())
    }

    const formatMs = (ms) => {
        const h = Math.floor(ms / 3600000)
        const m = Math.floor((ms % 3600000) / 60000)
        return `${h}h ${m}m`
    }

    const active = sessions.filter(s => !s.isExpired)
    const expired = sessions.filter(s => s.isExpired)

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="page">
            <button className="btn btn-ghost btn-sm" onClick={() => nav(`/schools/${schoolId}`)} style={{ marginBottom: 20 }}>
                <ArrowLeft size={14} /> Back to School
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 className="page-title"><Clock size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />Session Monitor</h1>
                    <p className="page-sub"><code style={{ color: 'var(--accent)' }}>{schoolId}</code> — {active.length} active, {expired.length} expired</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={13} /> Refresh</button>
                    <button className="btn btn-danger btn-sm" onClick={doExpireAll} disabled={active.length === 0}>
                        <Key size={13} /> Expire All Sessions
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 60 }}>
                    <Loader size={26} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
                    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                </div>
            ) : sessions.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', color: 'var(--text3)', padding: 40 }}>No sessions found.</div>
            ) : (
                <div className="card table-wrap">
                    <table>
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
                                        <td><code style={{ fontSize: 11, color: 'var(--accent)' }}>{s.tokenId}…</code></td>
                                        <td><span style={{ fontSize: 12 }}>{s.userType}</span></td>
                                        <td><span className={`badge badge-${s.isExpired ? 'inactive' : 'active'}`}>{s.isExpired ? 'expired' : 'valid'}</span></td>
                                        <td style={{ fontSize: 11, color: 'var(--text3)' }}>{s.createdAt ? new Date(s.createdAt).toLocaleString() : '—'}</td>
                                        <td style={{ fontSize: 11, color: 'var(--text3)' }}>{s.expiresAt ? new Date(s.expiresAt).toLocaleString() : '—'}</td>
                                        <td style={{ minWidth: 120 }}>
                                            {s.isExpired ? (
                                                <span style={{ fontSize: 11, color: 'var(--text3)' }}>—</span>
                                            ) : (
                                                <div>
                                                    <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>{formatMs(ms)}</div>
                                                    <div className="session-bar"><div className="session-fill" style={{ width: `${pct}%` }} /></div>
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
