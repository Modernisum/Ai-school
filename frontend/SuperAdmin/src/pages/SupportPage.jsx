import { useState, useEffect, useContext, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, CheckCircle, Clock, Loader } from 'lucide-react'
import { ToastCtx } from '../App.jsx'
import { listSupportRequests, resolveSupportRequest } from '../api.js'

export default function SupportPage() {
    const [requests, setRequests] = useState([])
    const [loading, setLoading] = useState(true)
    const [busyId, setBusyId] = useState(null)
    const toast = useContext(ToastCtx)

    const load = useCallback(async () => {
        setLoading(true)
        const r = await listSupportRequests()
        setRequests(r.data || [])
        setLoading(false)
    }, [])

    useEffect(() => { load() }, [load])

    const handleResolve = async (id) => {
        setBusyId(id)
        const r = await resolveSupportRequest(id)
        if (r.success) {
            toast('success', 'Support request resolved')
            load()
        } else {
            toast('error', r.message)
        }
        setBusyId(null)
    }

    const timeAgo = (dt) => {
        if (!dt) return '—'
        const mins = Math.floor((Date.now() - new Date(dt)) / 60000)
        if (mins < 60) return `${mins}m ago`
        const hrs = Math.floor(mins / 60)
        if (hrs < 24) return `${hrs}h ago`
        return `${Math.floor(hrs / 24)}d ago`
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page">
            <h1 className="page-title">Support Requests</h1>
            <p className="page-sub">Messages from schools needing assistance (Forgot Password/ID)</p>

            <div style={{ marginTop: 24 }}>
                {loading ? (
                    <div className="card" style={{ textAlign: 'center', padding: 60 }}>
                        <Loader size={26} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
                    </div>
                ) : requests.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
                        <CheckCircle size={32} style={{ margin: '0 auto 12px', color: 'var(--green)' }} />
                        <p>No pending support requests. All caught up!</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <AnimatePresence>
                            {requests.map(req => (
                                <motion.div
                                    key={req.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="elevated-card"
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 16,
                                        borderLeft: req.status === 'pending' ? '4px solid var(--amber)' : `4px solid var(--border)`,
                                        opacity: req.status === 'resolved' ? 0.7 : 1
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <MessageSquare size={16} color="var(--accent)" />
                                                {req.schoolName}
                                            </h3>
                                            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                                                Contact Info: <span style={{ color: 'var(--text2)' }}>{req.contactInfo}</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Clock size={12} /> {timeAgo(req.createdAt)}
                                            </div>
                                            <span className={`badge badge-${req.status === 'pending' ? 'warning' : 'active'}`}>
                                                {req.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ padding: 16, background: 'rgba(0,0,0,0.2)', borderRadius: 8, fontSize: 14, color: 'var(--text)' }}>
                                        {req.message}
                                    </div>

                                    {req.status === 'pending' && (
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => handleResolve(req.id)}
                                                disabled={busyId === req.id}
                                                style={{ background: 'var(--green)' }}
                                            >
                                                {busyId === req.id ? (
                                                    <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                                ) : (
                                                    <CheckCircle size={14} />
                                                )}
                                                Mark as Resolved
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </motion.div>
    )
}
