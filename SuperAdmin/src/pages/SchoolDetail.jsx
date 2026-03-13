import { useEffect, useState, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Save, Ban, CheckCircle, Key, Clock, Loader, Edit3, X, CreditCard, Users, TrendingUp } from 'lucide-react'
import { ToastCtx } from '../App.jsx'
import { getSchool, updateSchool, setStatus, setSessionDuration, applyPromo } from '../api.js'

const profileFields = [
    { label: 'School Name', field: 'schoolName' },
    { label: 'Principal Name', field: 'principalName' },
    { label: 'Address', field: 'address' },
    { label: 'Phone', field: 'phone' },
    { label: 'Email', field: 'email' },
    { label: 'Affiliated Board', field: 'affiliatedBoard' },
    { label: 'School Type', field: 'schoolType' },
]

export default function SchoolDetail() {
    const { schoolId } = useParams()
    const nav = useNavigate()
    const toast = useContext(ToastCtx)
    const [school, setSchool] = useState(null)
    const [loading, setLoading] = useState(true)
    const [edits, setEdits] = useState({})
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [sessionHours, setSessionHours] = useState(24)
    const [promoCode, setPromoCode] = useState('')
    const [applyingPromo, setApplyingPromo] = useState(false)

    const load = async () => {
        setLoading(true)
        const r = await getSchool(schoolId)
        if (r.data) {
            setSchool(r.data)
            setSessionHours(r.data.sessionDurationHours || 24)
            const d = r.data.data || {}
            setEdits({
                schoolName: r.data.schoolName || d.schoolName || '',
                principalName: d.principalName || '',
                address: d.schoolAddress || d.address || '',
                phone: d.phone || '',
                email: d.email || '',
                affiliatedBoard: d.affiliatedBoard || '',
                schoolType: d.schoolType || '',
            })
        }
        setLoading(false)
    }

    useEffect(() => { load() }, [schoolId])

    const set = (k, v) => setEdits(e => ({ ...e, [k]: v }))

    const save = async () => {
        setSaving(true)
        const r = await updateSchool(schoolId, edits)
        if (r.success) {
            toast('success', 'School updated')
            setEditing(false)
            load()
        } else {
            toast('error', r.message)
        }
        setSaving(false)
    }

    const cancelEdit = () => {
        const d = school?.data || {}
        setEdits({
            schoolName: school?.schoolName || d.schoolName || '',
            principalName: d.principalName || '',
            address: d.schoolAddress || d.address || '',
            phone: d.phone || '',
            email: d.email || '',
            affiliatedBoard: d.affiliatedBoard || '',
            schoolType: d.schoolType || '',
        })
        setEditing(false)
    }

    const toggleBlock = async () => {
        const newStatus = school.status === 'blocked' ? 'active' : 'blocked'
        const r = await setStatus(schoolId, newStatus)
        if (r.success) { toast('success', `Status → ${newStatus}`); load() }
        else toast('error', r.message)
    }

    const saveSession = async () => {
        const r = await setSessionDuration(schoolId, Number(sessionHours))
        if (r.success) toast('success', `Session set to ${sessionHours}h`)
        else toast('error', r.message)
    }

    const handleApplyPromo = async () => {
        if (!promoCode) return
        setApplyingPromo(true)
        const r = await applyPromo(schoolId, promoCode)
        if (r.success) {
            toast('success', r.message)
            setPromoCode('')
            load()
        } else {
            toast('error', r.message)
        }
        setApplyingPromo(false)
    }

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
            <Loader size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    )

    if (!school) return <div className="page" style={{ color: 'var(--text3)' }}>School not found.</div>

    const projected = Number(school.perStudentRate || 1) * (school.activeStudentCount || 0);
    const balance = Number(school.walletBalance || 0);

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="page">
            <button className="btn btn-ghost btn-sm" onClick={() => nav('/schools')} style={{ marginBottom: 20 }}>
                <ArrowLeft size={14} /> Back to List
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <h1 className="page-title">{school.schoolName}</h1>
                    <code style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>ID: {school.schoolId}</code>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <span className={`badge badge-${school.status}`}>{school.status}</span>
                    <span className={`badge ${school.billingStatus || 'active'}`} style={{
                        backgroundColor: school.billingStatus === 'suspended' ? '#991b1b' : school.billingStatus === 'warning' ? '#92400e' : '#065f46',
                        color: 'white',
                        fontWeight: 700,
                        textTransform: 'uppercase'
                    }}>{school.billingStatus || 'active'}</span>
                    <button className={`btn btn-sm ${school.status === 'blocked' ? 'btn-primary' : 'btn-danger'}`} onClick={toggleBlock}>
                        {school.status === 'blocked' ? <><CheckCircle size={13} /> Activate Account</> : <><Ban size={13} /> Block Access</>}
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 24 }}>
                {/* Profile / Edit Card */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>School Profile</h3>
                        {!editing ? (
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
                                <Edit3 size={13} /> Edit Profile
                            </button>
                        ) : (
                            <button className="btn btn-ghost btn-sm" onClick={cancelEdit} style={{ color: 'var(--red)' }}>
                                <X size={13} /> Cancel
                            </button>
                        )}
                    </div>

                    {!editing ? (
                        /* ── Read-only view ── */
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                            {profileFields.map(({ label, field }) => (
                                <div key={field}>
                                    <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{label}</div>
                                    <div style={{ fontSize: 14, color: edits[field] ? 'var(--text)' : 'var(--text3)', fontWeight: 500 }}>
                                        {edits[field] || '—'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* ── Edit mode ── */
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            {profileFields.map(({ label, field }) => (
                                <div className="input-group" key={field}>
                                    <label>{label}</label>
                                    <input
                                        type="text"
                                        value={edits[field] || ''}
                                        onChange={e => set(field, e.target.value)}
                                    />
                                </div>
                            ))}
                            <div style={{ gridColumn: '1 / -1', marginTop: 10, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>Discard</button>
                                <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
                                    {saving ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />} Save Profile
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Billing Snapshot */}
                    <div className="card" style={{ background: 'var(--glass)', border: '1px solid var(--accent-30)' }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <CreditCard size={18} className="text-accent" /> Billing Snapshot
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 12 }}>
                                <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Users size={12} /> Students
                                </div>
                                <div style={{ fontSize: 18, fontWeight: 800 }}>{school.activeStudentCount || 0}</div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 12 }}>
                                <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <TrendingUp size={12} /> Projected
                                </div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>₹{projected.toLocaleString()}</div>
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontSize: 12, color: 'var(--text3)' }}>Wallet Balance</span>
                            <span style={{ fontSize: 16, fontWeight: 800, color: balance < projected ? '#ef4444' : '#10b981' }}>₹{balance.toLocaleString()}</span>
                        </div>
                        <div style={{ w: '100%', height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden', marginBottom: 20 }}>
                            <div style={{ 
                                height: '100%', 
                                width: `${Math.min(100, (balance / Math.max(1, projected)) * 100)}%`, 
                                background: balance < projected ? '#ef4444' : 'var(--accent)' 
                            }} />
                        </div>

                        <button className="btn btn-primary w-full" onClick={() => nav('/billing')}>Manage Wallet</button>
                    </div>

                    <div className="card">
                        <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}><Clock size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Session Policy</h3>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                            <div className="input-group" style={{ marginBottom: 0, flex: 1 }}>
                                <label>Duration (hours)</label>
                                <input type="number" min={1} max={8760} value={sessionHours} onChange={e => setSessionHours(e.target.value)} />
                            </div>
                            <button className="btn btn-primary btn-sm" onClick={saveSession} style={{ flexShrink: 0 }}>Update</button>
                        </div>
                    </div>

                    <div className="card">
                        <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}><Key size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Promotions</h3>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                            <div className="input-group" style={{ marginBottom: 0, flex: 1 }}>
                                <label>Active Promo Code</label>
                                <input
                                    type="text"
                                    placeholder="e.g. FLAT50"
                                    value={promoCode}
                                    onChange={e => setPromoCode(e.target.value.toUpperCase())}
                                />
                            </div>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={handleApplyPromo}
                                disabled={applyingPromo || !promoCode}
                                style={{ flexShrink: 0 }}
                                title="Apply promo code to this school"
                            >
                                {applyingPromo ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : 'Apply'}
                            </button>
                        </div>
                    </div>

                    <div className="card" style={{ padding: 12 }}>
                        <h3 style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, padding: '0 8px' }}>Metadata</h3>
                        {[
                            ['Rate / Credit', `₹${school.perStudentRate || 1}`],
                            ['Bill Status', school.billingStatus || 'active'],
                            ['Last Billing', school.lastBillingDate ? new Date(school.lastBillingDate).toLocaleDateString() : '—'],
                            ['Registered', school.createdAt ? new Date(school.createdAt).toLocaleDateString() : '—'],
                        ].map(([k, v]) => (
                            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '8px', borderBottom: '1px solid var(--glass-border)' }}>
                                <span style={{ color: 'var(--text3)' }}>{k}</span>
                                <span style={{ fontWeight: 600 }}>{v}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <style>{`
                .w-full { width: 100%; }
                @keyframes spin{to{transform:rotate(360deg)}}
            `}</style>
        </motion.div>
    )
}
