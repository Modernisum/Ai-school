import { useState, useEffect, useContext, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Search, Eye, Edit3, Trash2, Ban, CheckCircle, Clock, Bell,
    Key, Download, RefreshCw, Filter, Loader, X, Send
} from 'lucide-react'
import { ToastCtx } from '../App.jsx'
import {
    listSchools, setStatus, deleteSchool, expireSessions,
    downloadExport, sendNotification, changePassword
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
        const r = await listSchools()
        setSchools(r.data || [])
        setLoading(false)
    }, [])
    useEffect(() => { load() }, [load])

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

    const doDelete = async (s) => {
        if (!confirm(`Delete ALL data for ${s.schoolName}? This cannot be undone.`)) return
        setBusy(true)
        const r = await deleteSchool(s.schoolId)
        if (r.success) { toast('success', 'School deleted'); load() }
        else toast('error', r.message)
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
        if (r.success) { toast('success', 'Password updated'); setModal(null); setPwInput('') }
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
            <h1 className="page-title">Schools</h1>
            <p className="page-sub">{filtered.length} of {schools.length} matching</p>

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
                        <Loader size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
                        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                    </div>
                ) : (
                    <AnimatePresence>
                        {filtered.map((s, i) => (
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
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text)' }}>
                                            {s.schoolName}
                                        </h3>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text3)' }}>
                                            {s.data?.principalName || s.data?.address || 'No details provided'}
                                        </p>
                                    </div>
                                    <span className={`badge badge-${s.status}`} style={{ margin: 0 }}>{s.status}</span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '10px' }}>
                                    <div>
                                        <div style={{ fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>School ID</div>
                                        <code style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: 600 }}>{s.schoolId}</code>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Session Limit</div>
                                        <div style={{ fontSize: '13px', color: 'var(--text2)', fontWeight: 500 }}>{s.sessionDurationHours} hours</div>
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
                                        <button className="action-btn accent" title="Expire All Sessions" onClick={() => doExpire(s)}><Key size={15} /></button>
                                        <button className="action-btn accent" title="Change Admin Password" onClick={() => { setModal({ type: 'pw', school: s }); setPwInput('') }}>
                                            <Edit3 size={15} />
                                        </button>
                                        <button className="action-btn amber" title="Send Global Notification" onClick={() => { setModal({ type: 'notify', school: s }); setNotifForm({ title: '', message: '', type: 'info' }) }}>
                                            <Bell size={15} />
                                        </button>
                                        <button className="action-btn accent" title="Export Backup" onClick={() => downloadExport(s.schoolId)}>
                                            <Download size={15} />
                                        </button>
                                        <button className="action-btn red" title="Delete School" onClick={() => doDelete(s)}>
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>

            {/* Password Modal */}
            <AnimatePresence>
                {modal?.type === 'pw' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-bg">
                        <motion.div initial={{ y: 30 }} animate={{ y: 0 }} exit={{ y: 30 }} className="modal">
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
                                    {busy ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : null} Save
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Notify Modal */}
            <AnimatePresence>
                {modal?.type === 'notify' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-bg">
                        <motion.div initial={{ y: 30 }} animate={{ y: 0 }} exit={{ y: 30 }} className="modal">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <h3><Bell size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Notify — {modal.school.schoolName}</h3>
                                <button className="action-btn" onClick={() => setModal(null)}><X size={16} /></button>
                            </div>
                            <div className="input-group">
                                <label>Title</label>
                                <input value={notifForm.title} onChange={e => setNotifForm(f => ({ ...f, title: e.target.value }))} placeholder="Important Notice" />
                            </div>
                            <div className="input-group">
                                <label>Message</label>
                                <textarea rows={3} value={notifForm.message} onChange={e => setNotifForm(f => ({ ...f, message: e.target.value }))} placeholder="Your message to the school…" style={{ resize: 'vertical' }} />
                            </div>
                            <div className="input-group">
                                <label>Type</label>
                                <select value={notifForm.type} onChange={e => setNotifForm(f => ({ ...f, type: e.target.value }))}>
                                    <option value="info">Info</option>
                                    <option value="warning">Warning</option>
                                    <option value="error">Critical</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                                <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>Cancel</button>
                                <button className="btn btn-primary btn-sm" onClick={doNotify} disabled={busy || !notifForm.message.trim()}>
                                    <Send size={13} /> Send
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
