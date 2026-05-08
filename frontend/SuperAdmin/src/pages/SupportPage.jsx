import { useState, useEffect, useContext, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, CheckCircle, Clock } from 'lucide-react'
import { ToastCtx } from '../App.jsx'
import { listSupportRequests, resolveSupportRequest } from '../api.js'
import { PageHeader, StatusBadge, GlassCard, StandardButton } from '../components/ui/index.js'

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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page-container">
            <PageHeader title="Support Requests" description="Messages from schools needing assistance (Forgot Password/ID)" />

            <div className="mt-4">
                {loading ? (
                    <GlassCard className="text-center" style={{ padding: 60 }}>
                        <div className="spinner" />
                    </GlassCard>
                ) : requests.length === 0 ? (
                    <GlassCard className="text-center text-tertiary" style={{ padding: 40 }}>
                        <CheckCircle size={32} className="text-success" style={{ margin: '0 auto 12px' }} />
                        <p>No pending support requests. All caught up!</p>
                    </GlassCard>
                ) : (
                    <div className="flex flex-col gap-4">
                        <AnimatePresence>
                            {requests.map(req => (
                                <motion.div
                                    key={req.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="glass-card"
                                    style={{
                                        borderLeft: req.status === 'pending' ? '4px solid var(--color-warning)' : '4px solid var(--border-default)',
                                        opacity: req.status === 'resolved' ? 0.7 : 1
                                    }}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-md font-bold flex items-center gap-2">
                                                <MessageSquare size={16} className="text-primary" />
                                                {req.schoolName}
                                            </h3>
                                            <div className="text-xs text-tertiary mt-1">
                                                Contact Info: <span className="text-secondary">{req.contactInfo}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-xs text-tertiary flex items-center gap-1">
                                                <Clock size={12} /> {timeAgo(req.createdAt)}
                                            </div>
                                            <StatusBadge status={req.status === 'pending' ? 'pending' : 'active'} label={req.status} />
                                        </div>
                                    </div>

                                    <div className="mt-3" style={{ padding: 16, background: 'color-mix(in srgb, black 20%, transparent)', borderRadius: 'var(--radius-md)' }}>
                                        <span className="text-sm">{req.message}</span>
                                    </div>

                                    {req.status === 'pending' && (
                                        <div className="flex justify-end mt-2">
                                            <StandardButton
                                                variant="success"
                                                size="sm"
                                                icon={CheckCircle}
                                                isLoading={busyId === req.id}
                                                onClick={() => handleResolve(req.id)}
                                                disabled={busyId === req.id}
                                            >
                                                Mark as Resolved
                                            </StandardButton>
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
