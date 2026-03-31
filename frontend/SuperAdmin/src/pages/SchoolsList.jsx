import { useState, useEffect, useContext, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Search, Eye, Edit3, Trash2, Ban, CheckCircle, Clock, Bell,
    Key, Download, RefreshCw, Filter, Loader, X, Send, AlertCircle, AlertTriangle
} from 'lucide-react'
import { ToastCtx } from '../App.jsx'
import {
    listSchools, setStatus, deleteSchool, expireSessions,
    downloadExport, sendNotification, changePassword,
    listSupportRequests, resolveSupportRequest
} from '../api.js'

const fade = { hidden: { opacity: 0 }, visible: (i) => ({ opacity: 1, transition: { delay: i * 0.03 } }) }

export default function SchoolsList() {
    const [schools, setSchools] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [sortDir, setSortDir] = useState('desc') // newest first
    const [showPw, setShowPw] = useState({})
    const [modal, setModal] = useState(null) // { type, school }
    const [pwInput, setPwInput] = useState('')
    const [notifForm, setNotifForm] = useState({ title: '', message: '', type: 'info' })
    const [busy, setBusy] = useState(false)
    const toast = useContext(ToastCtx)
    const nav = useNavigate()

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const r = await listSchools()
            if (r.success) {
                setSchools(r.data || [])
            } else {
                setSchools([])
                toast('error', r.message || 'Failed to load schools')
                if (r.message && r.message.toLowerCase().includes('token')) {
                    nav('/login')
                }
            }
        } catch (err) {
            toast('error', 'Network error fetching schools')
        }
        setLoading(false)
    }, [toast, nav])
    useEffect(() => { load() }, [load])

    const atRisk = schools.filter(s => s.billingStatus === 'suspended' || s.billingStatus === 'warning');

    const filtered = schools
        .filter(s => {
            const n = (s.schoolName + s.schoolId).toLowerCase()
            return (
                n.includes(search.toLowerCase()) &&
                (filterStatus === 'all' || s.status === filterStatus)
            )
        })
        .sort((a, b) => {
            const da = new Date(a.createdAt || 0), db = new Date(b.createdAt || 0)
            return sortDir === 'desc' ? db - da : da - db
        })

    const doStatus = async (s, status) => {
        setBusy(true)
        const r = await setStatus(s.schoolId, status)
        if (r.success) { toast('success', `${s.schoolName} → ${status}`); load() }
        else toast('error', r.message)
        setBusy(false)
    }

    const doDelete = async () => {
        if (!modal?.school) return
        setBusy(true)
        const r = await deleteSchool(modal.school.schoolId)
        if (r.success) { 
            toast('success', 'School deleted')
            setModal(null)
            load() 
        } else {
            toast('error', r.message)
        }
        setBusy(false)
    }

    const doExpire = async (s) => {
        const r = await expireSessions(s.schoolId)
        toast(r.success ? 'success' : 'error', r.data || r.message)
    }

    const doChangePw = async () => {
        if (!pwInput.trim()) return
        setBusy(true)
        const r = await changePassword(modal.school.schoolId, pwInput)
        if (r.success) { 
            toast('success', 'Password updated')
            setModal(null)
            setPwInput('')
            
            // Auto-resolve pending password-related support requests
            try {
                const supportRes = await listSupportRequests()
                if (supportRes.success && Array.isArray(supportRes.data)) {
                    const pendingForSchool = supportRes.data.filter(req => 
                        req.status === 'pending' && 
                        (req.schoolId === modal.school.schoolId || req.schoolName === modal.school.schoolName)
                    )
                    
                    for (const req of pendingForSchool) {
                        await resolveSupportRequest(req.id)
                    }
                    if (pendingForSchool.length > 0) {
                        toast('success', `Resolved ${pendingForSchool.length} support tickets automatically`)
                    }
                }
            } catch (err) {
                console.error("Support auto-resolve failed:", err)
            }
        }
        else toast('error', r.message)
        setBusy(false)
    }

    const doNotify = async () => {
        if (!notifForm.message.trim()) return
        setBusy(true)
        const r = await sendNotification(modal.school.schoolId, notifForm)
        if (r.success) { toast('success', 'Notification sent'); setModal(null) }
        else toast('error', r.message)
        setBusy(false)
    }

    const daysAgo = (dt) => {
        if (!dt) return '—'
        const d = Math.floor((Date.now() - new Date(dt)) / 86400000)
        return d === 0 ? 'today' : `${d}d ago`
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page">
            <h1 className="page-title">Schools Management</h1>
            <p className="page-sub">{filtered.length} of {schools.length} total schools registered</p>

            {/* Billing Alerts Banner */}
            <AnimatePresence>
                {atRisk.length > 0 && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }} 
                        animate={{ height: 'auto', opacity: 1 }}
                        className="danger-banner"
                        style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '12px',
                            padding: '16px',
                            marginBottom: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}
                    >
                        <div style={{ background: '#ef4444', padding: '8px', borderRadius: '10px' }}>
                            <AlertCircle size={20} color="white" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h4 style={{ margin: 0, fontSize: '14px', color: '#ef4444', fontWeight: 700 }}>Critical Billing Issues</h4>
                            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text2)' }}>
                                {atRisk.length} schools have insufficient wallet funds and face service interruption.
                            </p>
                        </div>
                        <button className="btn btn-sm" onClick={() => nav('/billing')} style={{ background: '#ef4444', color: 'white', border: 'none' }}>
                            Review Wallets
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toolbar */}
            <div className="search-bar">
                <div className="search-input-wrap">
                    <Search size={14} />
                    <input placeholder="Search name or ID…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="blocked">Blocked</option>
                    <option value="inactive">Inactive</option>
                </select>
                <select value={sortDir} onChange={e => setSortDir(e.target.value)}>
                    <option value="desc">Newest First</option>
                    <option value="asc">Oldest First</option>
                </select>
                <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={13} /> Refresh</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px', marginTop: '20px' }}>
                {loading ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 60 }}>
                        <Loader size={28} className="spin" style={{ color: 'var(--accent)' }} />
                    </div>
                ) : (
                    <AnimatePresence>
                        {filtered.map((s, i) => {
                            const isAtRisk = s.billingStatus === 'suspended' || s.billingStatus === 'warning';
                            return (
                                <motion.div
                                    key={s.schoolId}
                                    custom={i}
                                    variants={fade}
                                    initial="hidden"
                                    animate="visible"
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    onClick={() => nav(`/schools/${s.schoolId}`)}
                                    className="elevated-card"
                                    style={{
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '16px',
                                        padding: '24px',
                                        border: isAtRisk ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border)',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {isAtRisk && (
                                        <div style={{ 
                                            position: 'absolute', top: 0, left: 0, right: 0, height: '3px', 
                                            background: s.billingStatus === 'suspended' ? '#ef4444' : '#f59e0b' 
                                        }} />
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text)' }}>
                                                {s.schoolName}
                                            </h3>
                                            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text3)' }}>
                                                {s.data?.principalName || s.data?.address || 'No details provided'}
                                            </p>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                            <span className={`badge badge-${s.status}`} style={{ margin: 0 }}>{s.status}</span>
                                            {isAtRisk && (
                                                <span style={{ 
                                                    fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', 
                                                    color: s.billingStatus === 'suspended' ? '#ef4444' : '#f59e0b',
                                                    display: 'flex', alignItems: 'center', gap: '2px'
                                                }}>
                                                    <AlertTriangle size={10} /> {s.billingStatus}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '10px' }}>
                                        <div>
                                            <div style={{ fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>School ID</div>
                                            <code style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: 600 }}>{s.schoolId}</code>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Wallet</div>
                                            <div style={{ 
                                                fontSize: '13px', fontWeight: 700,
                                                color: Number(s.walletBalance) <= 0 ? '#ef4444' : 'var(--text2)'
                                            }}>₹{Number(s.walletBalance || 0).toLocaleString()}</div>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontSize: '12px', color: 'var(--text3)' }}>
                                            Reg: {daysAgo(s.createdAt)}
                                        </div>
                                        <div className="actions" onClick={e => e.stopPropagation()} style={{ gap: '6px' }}>
                                            <button className="action-btn green" title="View Sessions" onClick={() => nav(`/schools/${s.schoolId}/sessions`)}>
                                                <Clock size={15} />
                                            </button>
                                            {s.status === 'blocked' ? (
                                                <button className="action-btn green" title="Activate School" onClick={() => doStatus(s, 'active')}><CheckCircle size={15} /></button>
                                            ) : (
                                                <button className="action-btn amber" title="Block School" onClick={() => doStatus(s, 'blocked')}><Ban size={15} /></button>
                                            )}
                                            <button className="action-btn accent" title="Change Admin Password" onClick={() => { setModal({ type: 'pw', school: s }); setPwInput('') }}>
                                                <Edit3 size={15} />
                                            </button>
                                            <button className="action-btn red" title="Delete School" onClick={(e) => { e.stopPropagation(); setModal({ type: 'delete', school: s }); }}>
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                )}
            </div>

            {/* Password Modal */}
            <AnimatePresence>
                {modal?.type === 'pw' && (
                    <div className="modal-bg" onClick={() => setModal(null)}>
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="modal" onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <h3><Key size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Change Password — {modal.school.schoolName}</h3>
                                <button className="action-btn" onClick={() => setModal(null)}><X size={16} /></button>
                            </div>
                            <div className="input-group">
                                <label>New Password</label>
                                <input type="password" value={pwInput} onChange={e => setPwInput(e.target.value)} placeholder="Enter new password…" autoFocus />
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                                <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>Cancel</button>
                                <button className="btn btn-primary btn-sm" onClick={doChangePw} disabled={busy || !pwInput.trim()}>
                                    {busy ? <Loader size={13} className="spin" /> : null} Save
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
                
                {modal?.type === 'delete' && (
                    <div className="modal-bg" onClick={() => setModal(null)}>
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                                    <AlertTriangle size={20} /> Delete School
                                </h3>
                                <button className="action-btn" onClick={() => setModal(null)}><X size={16} /></button>
                            </div>
                            <div className="modal-body">
                                <p style={{ marginBottom: '20px', color: 'var(--text)' }}>
                                    Are you absolutely sure you want to delete <strong>{modal.school.schoolName}</strong>?
                                </p>
                                <p style={{ fontSize: '13px', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', marginBottom: '20px' }}>
                                    <strong>Warning:</strong> This will permanently erase ALL data associated with this school. This action <strong>CANNOT</strong> be undone.
                                </p>
                            </div>
                            <div className="modal-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)} disabled={busy} style={{ color: 'var(--text)' }}>Cancel</button>
                                <button className="btn btn-sm" onClick={doDelete} disabled={busy} style={{ background: '#ef4444', color: 'white', border: 'none' }}>
                                    {busy ? <Loader size={13} className="spin" /> : 'Yes, Delete Permanently'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </motion.div>
    )
}
