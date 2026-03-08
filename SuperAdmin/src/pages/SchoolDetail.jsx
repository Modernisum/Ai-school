import { useEffect, useState, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Save, Ban, CheckCircle, Key, Clock, Loader, Edit3, X } from 'lucide-react'
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

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="page">
            <button className="btn btn-ghost btn-sm" onClick={() => nav('/schools')} style={{ marginBottom: 20 }}>
                <ArrowLeft size={14} /> Back
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <h1 className="page-title">{school.schoolName}</h1>
                    <code style={{ fontSize: 12, color: 'var(--accent)' }}>{school.schoolId}</code>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <span className={`badge badge-${school.status}`}>{school.status}</span>
                    <button className={`btn btn-sm ${school.status === 'blocked' ? 'btn-primary' : 'btn-danger'}`} onClick={toggleBlock}>
                        {school.status === 'blocked' ? <><CheckCircle size={13} /> Activate</> : <><Ban size={13} /> Block</>}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => nav(`/schools/${schoolId}/sessions`)}>
                        <Clock size={13} /> Sessions
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 20 }}>
                {/* Profile / Edit Card */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                        <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>School Details</h3>
                        {!editing ? (
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
                                <Edit3 size={13} /> Edit
                            </button>
                        ) : (
                            <button className="btn btn-ghost btn-sm" onClick={cancelEdit} style={{ color: 'var(--red)' }}>
                                <X size={13} /> Cancel
                            </button>
                        )}
                    </div>

                    {!editing ? (
                        /* ── Read-only view ── */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                        <>
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
                            <div style={{ marginTop: 'auto', paddingTop: 16, display: 'flex', gap: 10 }}>
                                <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>Cancel</button>
                                <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
                                    {saving ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />} Save Changes
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Session + Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="card">
                        <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}><Clock size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Session Duration</h3>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                            <div className="input-group" style={{ marginBottom: 0, flex: 1 }}>
                                <label>Duration (hours)</label>
                                <input type="number" min={1} max={8760} value={sessionHours} onChange={e => setSessionHours(e.target.value)} />
                            </div>
                            <button className="btn btn-primary btn-sm" onClick={saveSession} style={{ flexShrink: 0 }}>Set</button>
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>1 = 1 hour, 24 = 1 day, 168 = 1 week</p>
                    </div>

                    <div className="card">
                        <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}><Key size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Apply Promo Code</h3>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                            <div className="input-group" style={{ marginBottom: 0, flex: 1 }}>
                                <label>Promo Code</label>
                                <input
                                    type="text"
                                    placeholder="Enter code..."
                                    value={promoCode}
                                    onChange={e => setPromoCode(e.target.value.toUpperCase())}
                                />
                            </div>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={handleApplyPromo}
                                disabled={applyingPromo || !promoCode}
                                style={{ flexShrink: 0 }}
                            >
                                {applyingPromo ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : 'Apply'}
                            </button>
                        </div>
                    </div>

                    <div className="card">
                        <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Info</h3>
                        {[
                            ['School ID', school.schoolId],
                            ['Status', school.status],
                            ['Wallet Balance', `₹${school.walletBalance || 0}`],
                            ['Credit Rate', `₹${school.perStudentRate || 1} / credit (1 student = 1 credit/mo)`],
                            ['Next Billing Date', school.lastBillingDate ? new Date(new Date(school.lastBillingDate).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString() : '—'],
                            ['Blocked', school.isBlocked ? 'Yes' : 'No'],
                            ['Registered', school.createdAt ? new Date(school.createdAt).toLocaleString() : '—'],
                            ['Last Updated', school.updatedAt ? new Date(school.updatedAt).toLocaleString() : '—'],
                        ].map(([k, v]) => (
                            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--glass-border)' }}>
                                <span style={{ color: 'var(--text3)' }}>{k}</span>
                                <span style={{ fontWeight: 500 }}>{v}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
